// SCALE Engine — Context Builder (v0.5.0 完整实现)
// 分层上下文加载 + Token 预算 + SCALE v10.0 哲学 P1 层 + 场景模式感知
// 设计参考：docs/03-CORE-MODULES.md §3.6

import type { ArtifactId, SessionId, ScenarioMode, KnowledgeEntry } from '../artifact/types.js'
import type { IArtifactStore } from '../artifact/store.js'
import type { IKnowledgeBase } from '../knowledge/KnowledgeBase.js'
import type { IEventBus } from '../core/eventBus.js'

export interface ContextLayer {
  name: string
  content: string
  priority: number
  estimatedTokens: number
}

export interface BuiltContext {
  system: string
  metadata: { totalTokens: number; layers: string[]; scenarioMode?: ScenarioMode }
}

export interface ContextStatus {
  sessionId: SessionId
  role: string
  allowedTools: string[]
  deniedTools: string[]
  activeArtifacts: Array<{ id: ArtifactId; type: string; status: string; current?: boolean }>
  constraints: string[]
  scenarioMode?: ScenarioMode
}

export interface IContextBuilder {
  build(opts: { roleId?: string; currentArtifactId?: ArtifactId; sessionId: SessionId; scenarioMode?: ScenarioMode }): Promise<BuiltContext>
  getStatus(sessionId: SessionId, roleGate: { getRole(): { id: string; allowedTools: string[]; deniedTools?: string[] } }): Promise<ContextStatus>
}

// ============================================================================
// SCALE v10.0 Philosophy — P1 system_rules layer content
// ============================================================================

const SCALE_V10_PHILOSOPHY = `## SCALE Engine v10.0 — System Rules

You are operating under SCALE Engine governance. These rules are PHYSICALLY ENFORCED — you cannot bypass them by choice.

### Core Philosophy
- **S**caffold — Every action is scaffolded by artifacts (Spec→Plan→Task→Change→Evidence)
- **C**ontrol — Guardrails physically block dangerous actions; no "soft" suggestions
- **A**rtifact — All work products are tracked artifacts with FSM state machines
- **L**earn — Defects auto-extract to Lessons → Rules → Hooks (evolution loop)
- **E**volve — The system improves itself from mistakes

### Physical Constraints (cannot be bypassed)
🔴 **Dangerous commands** (rm -rf, DROP TABLE, format) are BLOCKED at the gate
🔴 **Hardcoded secrets** (AWS keys, passwords, tokens) are BLOCKED on Edit/Write
🔴 **Unapproved code** — Cannot implement until Spec is FROZEN and Plan is APPROVED
🟡 **Brute retry** — 3+ identical retries detected → forced pause + context injection
🟡 **Premature completion** — Cannot claim "done" without running tests
🟡 **Blame shift** — Detected when AI blames environment without evidence

### Mandatory Workflow
1. **Explore** (role: explorer) — Read/Grep only, no edits
2. **Plan** (role: planner) — Create Spec → refine → approve (guard: ambiguity ≤ 0.2)
3. **Implement** (role: implementer) — Edit/Write/Bash unlocked only after Plan APPROVED
4. **Verify** — Must run build+lint+test before marking task complete
5. **Learn** — Defects auto-extract → lessons → rules → hooks

### Artifact Lifecycle
- Every piece of work is an Artifact with typed FSM transitions
- Guards check quality gates at each transition (ambiguity score, test coverage, etc.)
- Artifacts form a DAG: Need→Insight→Spec→Plan→Task→Change→Evidence
- Challenging a FROZEN Spec invalidates downstream Plans and Tasks

### Self-Evolution
- Defect → Lesson (auto-extracted from root cause)
- Lesson → Rule (promoted by access count + verification)
- Rule → Hook (auto-generated enforcement code)
- The system gets stricter over time, not weaker`

// ============================================================================
// Scenario Mode Context Additions
// ============================================================================

const SCENARIO_CONTEXT: Record<ScenarioMode, string> = {
  sandbox: `### Scenario Mode: SANDBOX 🏖️
- Lower detector sensitivity — exploratory work allowed
- Verification NOT required before completion
- Human confirmation NOT required
- Audit trail disabled (lighter weight)
- Max retries: 10 (freedom to experiment)
- Use for: prototyping, exploration, learning`,

  standard: `### Scenario Mode: STANDARD ⚙️
- Medium detector sensitivity — production-quality required
- Verification REQUIRED before completion
- Human confirmation NOT required (trust the process)
- Audit trail ENABLED
- Max retries: 5 (balanced)
- Use for: feature development, bug fixes, regular work`,

  critical: `### Scenario Mode: CRITICAL 🔒
- Maximum detector sensitivity — zero tolerance for errors
- Verification REQUIRED before completion
- Human confirmation REQUIRED for key transitions
- Audit trail ENABLED (comprehensive)
- Max retries: 3 (fail fast, escalate)
- Use for: security changes, production deployments, data migrations`,
}

// ============================================================================
// ContextBuilder
// ============================================================================

export class ContextBuilder implements IContextBuilder {
  private budget = { total: 200_000, reserved: 30_000 }

  constructor(
    private store: IArtifactStore,
    private kb: IKnowledgeBase,
    private eventBus: IEventBus
  ) {}

  async build(opts: { roleId?: string; currentArtifactId?: ArtifactId; sessionId: SessionId; scenarioMode?: ScenarioMode }): Promise<BuiltContext> {
    const scenarioMode = opts.scenarioMode ?? 'standard'
    const layers: ContextLayer[] = []

    // P1: System Rules — SCALE v10.0 Philosophy (always present, highest priority)
    layers.push({
      name: 'system_rules',
      content: SCALE_V10_PHILOSOPHY,
      priority: 1,
      estimatedTokens: 3500,
    })

    // P1.5: Scenario Mode awareness
    layers.push({
      name: 'scenario_mode',
      content: SCENARIO_CONTEXT[scenarioMode],
      priority: 1,
      estimatedTokens: 800,
    })

    // P2: Role prompt
    if (opts.roleId) {
      layers.push({ name: 'role_prompt', content: `## Active Role: ${opts.roleId}\n...`, priority: 2, estimatedTokens: 1500 })
    }

    // P3: Current artifact context
    if (opts.currentArtifactId) {
      const artifact = await this.store.get(opts.currentArtifactId)
      if (artifact) {
        layers.push({ name: 'current_artifact', content: `## ${artifact.title}\n${JSON.stringify(artifact.payload, null, 2)}`, priority: 3, estimatedTokens: 5000 })
      }
    }

    // P5: 召回 lessons (W7 集成)
    // Enhanced: Always recall relevant lessons based on tags or artifact context
    const lessons = await this.recallRelevantLessons(opts.currentArtifactId, opts.roleId)
    if (lessons.length > 0) {
      const content = '## 相关历史经验\n' + lessons.map((l) => `- ${l.title} (${l.tags.join(', ')})`).join('\n')
      layers.push({ name: 'recalled_lessons', content, priority: 5, estimatedTokens: 1500 })
    }

    const available = this.budget.total - this.budget.reserved
    const selected: ContextLayer[] = []
    let used = 0
    for (const layer of layers.sort((a, b) => a.priority - b.priority)) {
      if (used + layer.estimatedTokens > available) break
      selected.push(layer)
      used += layer.estimatedTokens
    }

    this.eventBus.emit('context.built', { layers: selected.map((l) => l.name), totalTokens: used, scenarioMode }, { sessionId: opts.sessionId })

    return {
      system: selected.map((l) => l.content).join('\n\n---\n\n'),
      metadata: { totalTokens: used, layers: selected.map((l) => l.name), scenarioMode },
    }
  }

  /**
   * Enhanced lesson recall: based on artifact tags + role context
   */
  private async recallRelevantLessons(currentArtifactId?: ArtifactId, roleId?: string): Promise<KnowledgeEntry[]> {
    const tagsToMatch: string[] = []

    // 1. Extract tags from current artifact
    if (currentArtifactId) {
      const artifact = await this.store.get(currentArtifactId)
      if (artifact?.tags) {
        tagsToMatch.push(...artifact.tags)
      }
      // Also match on artifact type
      if (artifact?.type) {
        tagsToMatch.push(artifact.type)
      }
    }

    // 2. Add role-specific tags
    if (roleId) {
      tagsToMatch.push(`role:${roleId}`)
    }

    // 3. Query verified lessons
    const allLessons = await this.kb.recall({ type: 'lesson', verifiedOnly: true, limit: 10 })

    // 4. If we have tags to match, try to filter by tag overlap
    if (tagsToMatch.length > 0) {
      const scored = allLessons.map(l => ({
        lesson: l,
        score: l.tags.filter(t => tagsToMatch.includes(t)).length
      })).filter(s => s.score > 0)
      scored.sort((a, b) => b.score - a.score)

      // If we found matching lessons, return them
      if (scored.length > 0) {
        return scored.slice(0, 5).map(s => s.lesson)
      }
      // Otherwise, fallback to all verified lessons
    }

    // 5. Fallback: return top verified lessons
    return allLessons.slice(0, 5)
  }

  async getStatus(sessionId: SessionId, roleGate: { getRole(): { id: string; allowedTools: string[]; deniedTools?: string[] } }): Promise<ContextStatus> {
    const role = roleGate.getRole()

    // Query active artifacts for this session (linked via events)
    const events = await this.eventBus.query({
      sessionId,
      types: ['artifact.created', 'artifact.transitioned'],
      limit: 50
    })

    const artifactIds = new Set<ArtifactId>()
    for (const event of events) {
      if (event.artifactId) {
        artifactIds.add(event.artifactId)
      }
    }

    const activeArtifacts = await Promise.all(
      Array.from(artifactIds).map(async (id) => {
        const artifact = await this.store.get(id)
        return artifact ? {
          id: artifact.id,
          type: artifact.type,
          status: artifact.status,
        } : null
      })
    )

    const validArtifacts = activeArtifacts.filter((a) => a !== null) as Array<{ id: ArtifactId; type: string; status: string }>

    // Extract constraints from artifacts and FSM definitions
    const constraints: string[] = []
    for (const artifact of validArtifacts) {
      if (artifact.type === 'Spec' && artifact.status !== 'FROZEN') {
        constraints.push(`Spec must be FROZEN before writing code (current: ${artifact.status})`)
      }
      if (artifact.type === 'Plan' && artifact.status === 'DRAFT') {
        constraints.push(`Plan must be approved before implementation`)
      }
      if (artifact.type === 'Task' && artifact.status === 'TODO') {
        constraints.push(`Task must be READY before implementation`)
      }
    }

    return {
      sessionId,
      role: role.id,
      allowedTools: role.allowedTools,
      deniedTools: role.deniedTools ?? [],
      activeArtifacts: validArtifacts,
      constraints,
    }
  }
}
