import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { existsSync, readFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import type { TaskPayload } from '../../src/artifact/types.js'

const SCALE_DIR = '.scale-test-phase-commands'

describe('phasePlan skill integration', () => {
  beforeEach(async () => {
    process.env.SCALE_DIR = SCALE_DIR
    if (existsSync(SCALE_DIR)) rmSync(SCALE_DIR, { recursive: true, force: true })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    if (existsSync(SCALE_DIR)) rmSync(SCALE_DIR, { recursive: true, force: true })
    delete process.env.SCALE_DIR
  })

  it('includes recommended skills in plan payload and markdown', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const { phaseDefine, phasePlan } = await import('../../src/cli/phaseCommands.js')
    const { SQLiteArtifactStore } = await import('../../src/artifact/sqliteStore.js')
    const { EventBus } = await import('../../src/core/eventBus.js')

    await phaseDefine.run?.({ args: {
      title: 'UI redesign',
      description: 'Design a better UI and UX flow for the dashboard',
      'success-criteria': 'Improved layout,Accessible interactions',
      json: false,
    } as never })

    const eventBus = new EventBus({ eventsDir: join(SCALE_DIR, 'events') })
    const store = new SQLiteArtifactStore(eventBus, {
      dbPath: join(SCALE_DIR, 'scale.db'),
      artifactsDir: join(SCALE_DIR, 'artifacts'),
    })

    const specs = await store.query({ type: 'Spec', limit: 10 })
    expect(specs.length).toBeGreaterThan(0)

    await phasePlan.run?.({ args: {
      'spec-id': specs[0].id,
      approach: 'Use a governed design plan',
      rollback: 'Revert the plan artifact only',
      json: false,
    } as never })

    const plans = await store.query({ type: 'Plan', limit: 10 })
    expect(plans.length).toBeGreaterThan(0)

    const payload = plans[0].payload as {
      recommendedSkills?: Array<{ skillId: string; domain: string; installed: true; advisoryOnly: boolean }>
    }
    expect(payload.recommendedSkills).toBeDefined()
    expect(payload.recommendedSkills?.length).toBeGreaterThan(0)
    expect(payload.recommendedSkills?.some(skill => skill.domain === 'planning')).toBe(true)
    expect(payload.recommendedSkills?.every(skill => skill.installed)).toBe(true)
    expect(payload.recommendedSkills?.every(skill => skill.advisoryOnly)).toBe(true)

    const planPath = join(SCALE_DIR, 'plans', `${plans[0].id}.md`)
    const markdown = readFileSync(planPath, 'utf-8')
    expect(markdown).toContain('## Recommended Skills')
    expect(markdown).toContain('[advisory]')

    logSpy.mockRestore()
  })

  it('orchestrates DEFINE -> PLAN -> BUILD and returns created artifact ids without creating code changes', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const { phaseStart } = await import('../../src/cli/phaseCommands.js')
    const { SQLiteArtifactStore } = await import('../../src/artifact/sqliteStore.js')
    const { EventBus } = await import('../../src/core/eventBus.js')

    await phaseStart.run?.({
      args: {
        title: 'Add scale start',
        description: 'Route generic coding work through DEFINE, PLAN, and BUILD without applying code changes',
        'success-criteria': 'Creates spec,Creates plan,Creates task',
        approach: 'Use phase orchestration only',
        rollback: 'Delete generated artifacts if abandoned',
        json: true,
      } as never,
    })

    const result = JSON.parse(String(logSpy.mock.calls.at(-1)?.[0])) as {
      phase: string
      specId: string
      planId: string
      taskId: string
      next: string
    }

    expect(result).toMatchObject({
      phase: 'START',
      specId: expect.any(String),
      planId: expect.any(String),
      taskId: expect.any(String),
    })
    expect(result.next).toContain(`scale verify ${result.taskId}`)

    const eventBus = new EventBus({ eventsDir: join(SCALE_DIR, 'events') })
    const store = new SQLiteArtifactStore(eventBus, {
      dbPath: join(SCALE_DIR, 'scale.db'),
      artifactsDir: join(SCALE_DIR, 'artifacts'),
    })

    const spec = await store.get(result.specId)
    const plan = await store.get(result.planId)
    const task = await store.get(result.taskId)

    expect(spec?.type).toBe('Spec')
    expect(spec?.status).toBe('FROZEN')

    expect(plan?.type).toBe('Plan')
    expect(plan?.status).toBe('IMPLEMENTING')
    expect(plan?.parents).toEqual([result.specId])

    expect(task?.type).toBe('Task')
    expect(task?.status).toBe('RUNNING')
    expect(task?.parents).toEqual([result.planId])

    const need = spec?.parents[0] ? await store.get(spec.parents[0]) : null
    expect(need?.type).toBe('Need')
    expect(need?.status).toBe('DRAFT')

    const taskPayload = task?.payload as TaskPayload
    expect(taskPayload.buildStatus).toBe('pending')
    expect(taskPayload.lintStatus).toBe('pending')
    expect(taskPayload.testPassed).toBeUndefined()

    const changes = await store.query({ type: 'Change', limit: 10 })
    expect(changes).toHaveLength(0)

    logSpy.mockRestore()
  })

  it('does not recommend UI design skills for architecture design specs', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const { phaseDefine, phasePlan } = await import('../../src/cli/phaseCommands.js')
    const { SQLiteArtifactStore } = await import('../../src/artifact/sqliteStore.js')
    const { EventBus } = await import('../../src/core/eventBus.js')

    await phaseDefine.run?.({ args: {
      title: 'Architecture design diagram',
      description: 'Design a system architecture diagram for the event pipeline',
      'success-criteria': 'Architecture diagram generated,Service boundaries documented',
      json: false,
    } as never })

    const eventBus = new EventBus({ eventsDir: join(SCALE_DIR, 'events') })
    const store = new SQLiteArtifactStore(eventBus, {
      dbPath: join(SCALE_DIR, 'scale.db'),
      artifactsDir: join(SCALE_DIR, 'artifacts'),
    })

    const specs = await store.query({ type: 'Spec', limit: 10 })
    expect(specs.length).toBeGreaterThan(0)

    await phasePlan.run?.({ args: {
      'spec-id': specs[0].id,
      approach: 'Create an architecture-focused plan',
      rollback: 'Revert the plan artifact only',
      json: false,
    } as never })

    const plans = await store.query({ type: 'Plan', limit: 10 })
    expect(plans.length).toBeGreaterThan(0)

    const payload = plans[0].payload as {
      recommendedSkills?: Array<{ skillId: string }>
      skillHints?: Array<{ skillId: string; installed: boolean; advisoryOnly: boolean; source?: string }>
    }

    const skillIds = payload.recommendedSkills?.map(skill => skill.skillId) ?? []
    const hintIds = payload.skillHints?.map(skill => skill.skillId) ?? []
    const architectureHint = payload.skillHints?.find(skill => skill.skillId === 'architecture-diagram-generator')

    expect(skillIds).not.toContain('awesome-design-md')
    expect(skillIds).not.toContain('ui-ux-pro-max')
    expect(skillIds).not.toContain('architecture-diagram-generator')
    expect(hintIds).toContain('architecture-diagram-generator')
    expect(architectureHint).toMatchObject({
      installed: false,
      advisoryOnly: true,
      source: 'https://github.com/Cocoon-AI/architecture-diagram-generator',
    })

    const planPath = join(SCALE_DIR, 'plans', `${plans[0].id}.md`)
    const markdown = readFileSync(planPath, 'utf-8')
    expect(markdown).not.toContain('`awesome-design-md`')
    expect(markdown).not.toContain('`ui-ux-pro-max`')
    expect(markdown).toContain('## Skill Hints')
    expect(markdown).toContain('`architecture-diagram-generator`')
    expect(markdown).toContain('https://github.com/Cocoon-AI/architecture-diagram-generator')

    logSpy.mockRestore()
  })
})
