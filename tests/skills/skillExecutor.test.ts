import { beforeEach, describe, expect, it } from 'vitest'
import { EventBus } from '../../src/core/eventBus.js'
import { SkillRegistry, type SkillDefinition } from '../../src/skills/SkillRegistry.js'
import { SkillExecutor } from '../../src/skills/SkillExecutor.js'

describe('SkillExecutor governance', () => {
  let eventBus: EventBus
  let registry: SkillRegistry
  let executor: SkillExecutor

  beforeEach(() => {
    eventBus = new EventBus()
    registry = new SkillRegistry(eventBus)
    executor = new SkillExecutor(registry, eventBus)

    const planningSkill: SkillDefinition = {
      id: 'planning-skill',
      name: 'Planning Skill',
      description: 'Advisory planning skill',
      domain: 'planning',
      triggers: [{ type: 'phase', value: 'plan', weight: 1 }],
      execution: { type: 'skill-file', config: { skillPath: '~/.claude/skills/planning/SKILL.md' } },
      priority: 90,
      installed: true,
    }

    const executionSkill: SkillDefinition = {
      id: 'execution-skill',
      name: 'Execution Skill',
      description: 'Implementation skill',
      domain: 'execution',
      triggers: [{ type: 'phase', value: 'implement', weight: 1 }],
      execution: { type: 'builtin-function', config: { functionName: 'verify_status' } },
      priority: 80,
      installed: true,
    }

    registry.register(planningSkill)
    registry.register(executionSkill)
  })

  it('blocks planning skills outside the plan phase', async () => {
    const result = await executor.execute('planning-skill', {}, { phase: 'implement' })
    expect(result.success).toBe(false)
    expect(result.error).toContain('only allowed during plan phase')
  })

  it('keeps planning skill files advisory-only by default', async () => {
    const result = await executor.execute('planning-skill', {}, { phase: 'plan' })
    expect(result.success).toBe(false)
    expect(result.error).toContain('advisory-only')
  })

  it('blocks execution skills during the plan phase', async () => {
    const result = await executor.execute('execution-skill', {}, { phase: 'plan' })
    expect(result.success).toBe(false)
    expect(result.error).toContain('cannot run during plan phase')
  })

  it('allows execution skills during implement phase', async () => {
    const result = await executor.execute('execution-skill', {}, { phase: 'implement' })
    expect(result.success).toBe(true)
  })
})
