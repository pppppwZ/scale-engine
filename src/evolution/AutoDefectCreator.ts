// SCALE Engine — Auto Defect Creator (v0.7.1)
// 自动从检测器事件创建 Defect artifact

import type { IEventBus } from '../core/eventBus.js'
import type { IArtifactStore, CreateArtifactInput } from '../artifact/store.js'
import type { ArtifactId, SessionId } from '../artifact/types.js'
import { logger } from '../core/logger.js'

export interface DefectPayload {
  rootCauseCategory: string
  evidence: string
  detector: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  autoCreated: boolean
  sessionId: SessionId
  timestamp: number
  context?: Record<string, unknown>
}

export interface IAutoDefectCreator {
  start(): void
  stop(): void
  getAutoDefects(): ArtifactId[]
}

export class AutoDefectCreator implements IAutoDefectCreator {
  private subs: Array<{ unsubscribe(): void }> = []
  private autoDefects: ArtifactId[] = []

  constructor(
    private store: IArtifactStore,
    private eventBus: IEventBus,
  ) {}

  start(): void {
    this.subs.push(
      this.eventBus.on('behavior.hallucination', (e) => this.onHallucination(e)),
      this.eventBus.on('behavior.ai_slop', (e) => this.onAISlop(e)),
      this.eventBus.on('behavior.duplicate_edit', (e) => this.onDuplicateEdit(e)),
      this.eventBus.on('behavior.brute_retry', (e) => this.onBruteRetry(e)),
      this.eventBus.on('behavior.blame_shift', (e) => this.onBlameShift(e)),
    )
    logger.info('AutoDefectCreator started')
  }

  stop(): void {
    for (const sub of this.subs) sub.unsubscribe()
    this.subs = []
  }

  getAutoDefects(): ArtifactId[] {
    return [...this.autoDefects]
  }

  private async onHallucination(event: { sessionId: SessionId; payload: unknown }): Promise<void> {
    const payload = event.payload as { claim?: string; evidence?: string }
    await this.createDefect({
      rootCauseCategory: 'hallucination',
      evidence: payload.claim ?? 'Unverified success claim',
      detector: 'HallucinationDetector',
      severity: 'high',
      autoCreated: true,
      sessionId: event.sessionId,
      timestamp: Date.now(),
      context: payload,
    }, `Hallucination: ${payload.claim ?? 'unverified claim'}`)
  }

  private async onAISlop(event: { sessionId: SessionId; payload: unknown }): Promise<void> {
    const payload = event.payload as { pattern?: string; file?: string }
    await this.createDefect({
      rootCauseCategory: 'ai_slop',
      evidence: `Pattern: ${payload.pattern} in ${payload.file}`,
      detector: 'AISlopDetector',
      severity: 'medium',
      autoCreated: true,
      sessionId: event.sessionId,
      timestamp: Date.now(),
      context: payload,
    }, `AI Slop: ${payload.pattern}`)
  }

  private async onDuplicateEdit(event: { sessionId: SessionId; payload: unknown }): Promise<void> {
    const payload = event.payload as { editContent?: string; count?: number }
    await this.createDefect({
      rootCauseCategory: 'duplicate_edit',
      evidence: `Repeated ${payload.count ?? 2} times`,
      detector: 'DuplicateEditDetector',
      severity: 'low',
      autoCreated: true,
      sessionId: event.sessionId,
      timestamp: Date.now(),
      context: payload,
    }, 'Duplicate Edit Detected')
  }

  private async onBruteRetry(event: { sessionId: SessionId; payload: unknown }): Promise<void> {
    const payload = event.payload as { strategy?: string; count?: number }
    await this.createDefect({
      rootCauseCategory: 'brute_retry',
      evidence: `Strategy "${payload.strategy}" failed ${payload.count ?? 3} times`,
      detector: 'BruteRetryDetector',
      severity: 'high',
      autoCreated: true,
      sessionId: event.sessionId,
      timestamp: Date.now(),
      context: payload,
    }, `Brute Retry: ${payload.strategy}`)
  }

  private async onBlameShift(event: { sessionId: SessionId; payload: unknown }): Promise<void> {
    const payload = event.payload as { excuse?: string }
    await this.createDefect({
      rootCauseCategory: 'blame_shift',
      evidence: payload.excuse ?? 'Shifted blame',
      detector: 'BlameShiftDetector',
      severity: 'medium',
      autoCreated: true,
      sessionId: event.sessionId,
      timestamp: Date.now(),
      context: payload,
    }, 'Blame Shift Detected')
  }

  private async createDefect(payload: DefectPayload, title: string): Promise<void> {
    try {
      const input: CreateArtifactInput = {
        type: 'Defect',
        title,
        initialStatus: 'OPEN',
        payload,
        tags: ['auto-created', payload.rootCauseCategory, payload.detector],
        parents: [],
      }
      const defect = await this.store.create(input)
      this.autoDefects.push(defect.id)
      this.eventBus.emit('defect.auto_created', {
        defectId: defect.id,
        rootCause: payload.rootCauseCategory,
        severity: payload.severity,
        sessionId: payload.sessionId,
      })
      logger.info({ defectId: defect.id, rootCause: payload.rootCauseCategory }, 'Auto-defect created')
    } catch (err) {
      logger.error({ err, payload }, 'Failed to create auto-defect')
    }
  }
}
