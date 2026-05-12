import { describe, it, expect } from 'vitest'
import { WorkflowExecutor } from '../../src/workflows/WorkflowExecutor.js'
import { InMemoryArtifactStore } from '../../src/artifact/store.js'
import { EventBus } from '../../src/core/eventBus.js'
import { WORKFLOW_PRESETS } from '../../src/workflows/presets.js'
import type { SpecPayload, WorkflowPreset } from '../../src/artifact/types.js'

function withPreset<T>(preset: WorkflowPreset, run: () => Promise<T>): Promise<T> {
  const previous = WORKFLOW_PRESETS[preset.id]
  WORKFLOW_PRESETS[preset.id] = preset

  return run().finally(() => {
    if (previous) WORKFLOW_PRESETS[preset.id] = previous
    else delete WORKFLOW_PRESETS[preset.id]
  })
}

describe('WorkflowExecutor', () => {
  it('uses registered preset steps when evaluating gates', async () => {
    const bus = new EventBus()
    const store = new InMemoryArtifactStore(bus)
    const executor = new WorkflowExecutor(bus, store)

    const preset: WorkflowPreset = {
      id: 'workflow-executor-registered-gate',
      name: 'Registered Gate',
      nameZh: '注册门控',
      description: 'Uses preset registry for gate lookup',
      scenarioMode: 'standard',
      requiredArtifacts: [],
      steps: [
        { stepId: 'check-gate', action: 'noop', isMandatory: true, verificationGate: 'spec.status == FROZEN' },
      ],
    }

    await withPreset(preset, async () => {
      const session = await executor.start(preset, {})
      const result = await executor.runAll(session.id)

      expect(result.status).toBe('blocked')
      expect(result.blockingReason).toBe('No artifact')
      expect(result.stepHistory[0].gateResult?.reason).toBe('No artifact')
    })
  })

  it('uses the real FSM for invalid transitions', async () => {
    const bus = new EventBus()
    const store = new InMemoryArtifactStore(bus)
    const executor = new WorkflowExecutor(bus, store)

    const specPayload: SpecPayload = {
      what: 'spec',
      successCriteria: ['works'],
      outOfScope: [],
      edgeCases: [],
      northStar: 'value',
      ambiguityScore: 0.1,
    }

    const spec = await store.create({
      type: 'Spec',
      title: 'Spec',
      payload: specPayload,
      initialStatus: 'DRAFT',
    })

    const preset: WorkflowPreset = {
      id: 'workflow-executor-invalid-transition',
      name: 'Invalid Transition',
      nameZh: '非法迁移',
      description: 'Approve from an invalid state should fail',
      scenarioMode: 'standard',
      requiredArtifacts: [],
      steps: [
        { stepId: 'approve-spec', action: 'scale transition SPEC-xxx approve', isMandatory: true },
      ],
    }

    await withPreset(preset, async () => {
      const session = await executor.start(preset, { specId: spec.id })

      await expect(executor.runAll(session.id)).rejects.toThrow("State 'DRAFT' does not support action 'approve'")

      const updatedSpec = await store.get(spec.id)
      expect(updatedSpec?.status).toBe('DRAFT')
    })
  })

  it('does not mark command gates as passed without a runner', async () => {
    const bus = new EventBus()
    const store = new InMemoryArtifactStore(bus)
    const executor = new WorkflowExecutor(bus, store)

    const preset: WorkflowPreset = {
      id: 'workflow-executor-command-gate',
      name: 'Command Gate',
      nameZh: '命令门控',
      description: 'Command gates require a real runner',
      scenarioMode: 'standard',
      requiredArtifacts: [],
      steps: [
        { stepId: 'implement', action: 'implement', isMandatory: true, verificationGate: 'build passes' },
      ],
    }

    await withPreset(preset, async () => {
      const session = await executor.start(preset, {})
      const result = await executor.runAll(session.id)

      expect(result.status).toBe('blocked')
      expect(result.blockingReason).toBe('No runner')
      expect(result.stepHistory[0].gateResult?.reason).toBe('No runner')
    })
  })

  it('fails when a transition token cannot be resolved from context', async () => {
    const bus = new EventBus()
    const store = new InMemoryArtifactStore(bus)
    const executor = new WorkflowExecutor(bus, store)

    const preset: WorkflowPreset = {
      id: 'workflow-executor-missing-token',
      name: 'Missing Token',
      nameZh: '缺失 token',
      description: 'Placeholder tokens must resolve to real artifacts',
      scenarioMode: 'standard',
      requiredArtifacts: [],
      steps: [
        { stepId: 'complete-task', action: 'scale transition TASK-xxx complete', isMandatory: true },
      ],
    }

    await withPreset(preset, async () => {
      const session = await executor.start(preset, {})
      await expect(executor.runAll(session.id)).rejects.toThrow("Unable to resolve artifact token 'TASK-xxx'")
    })
  })

  it('creates default spec payloads that satisfy spec gate prerequisites', async () => {
    const bus = new EventBus()
    const store = new InMemoryArtifactStore(bus)
    const executor = new WorkflowExecutor(bus, store)

    const preset: WorkflowPreset = {
      id: 'workflow-executor-create-spec-payload',
      name: 'Create Spec Payload',
      nameZh: '创建 Spec 载荷',
      description: 'Workflow-created specs should use FSM-compatible payload fields',
      scenarioMode: 'standard',
      requiredArtifacts: [],
      steps: [
        { stepId: 'create-spec', action: 'scale create Spec', isMandatory: true },
      ],
    }

    await withPreset(preset, async () => {
      const session = await executor.start(preset, {})
      const result = await executor.runAll(session.id)

      expect(result.status).toBe('completed')

      const specId = session.context.specId as string
      const spec = await store.get(specId)
      expect(spec?.status).toBe('DRAFT')
      expect(spec?.payload).toMatchObject({
        ambiguityScore: 0,
        successCriteria: ['defined'],
      })
    })
  })

  it('blocks create-spec followed by approve without an intermediate refine step', async () => {
    const bus = new EventBus()
    const store = new InMemoryArtifactStore(bus)
    const executor = new WorkflowExecutor(bus, store)

    const preset: WorkflowPreset = {
      id: 'workflow-executor-create-then-approve-spec',
      name: 'Create Then Approve Spec',
      nameZh: '创建后直接批准 Spec',
      description: 'Spec approval must respect FSM ordering',
      scenarioMode: 'standard',
      requiredArtifacts: [],
      steps: [
        { stepId: 'create-spec', action: 'scale create Spec', isMandatory: true },
        { stepId: 'approve-spec', action: 'scale transition SPEC-xxx approve', isMandatory: true },
      ],
    }

    await withPreset(preset, async () => {
      const session = await executor.start(preset, {})
      await expect(executor.runAll(session.id)).rejects.toThrow("State 'DRAFT' does not support action 'approve'")

      const specId = session.context.specId as string
      const spec = await store.get(specId)
      expect(spec?.status).toBe('DRAFT')
      expect(spec?.payload).toMatchObject({
        ambiguityScore: 0,
        successCriteria: ['defined'],
      })
    })
  })
})
