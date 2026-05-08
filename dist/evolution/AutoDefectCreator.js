// SCALE Engine — Auto Defect Creator (v0.7.1)
// 自动从检测器事件创建 Defect artifact
import { logger } from '../core/logger.js';
export class AutoDefectCreator {
    constructor(store, eventBus) {
        this.store = store;
        this.eventBus = eventBus;
        this.subs = [];
        this.autoDefects = [];
    }
    start() {
        this.subs.push(this.eventBus.on('behavior.hallucination', (e) => this.onHallucination(e)), this.eventBus.on('behavior.ai_slop', (e) => this.onAISlop(e)), this.eventBus.on('behavior.duplicate_edit', (e) => this.onDuplicateEdit(e)), this.eventBus.on('behavior.brute_retry', (e) => this.onBruteRetry(e)), this.eventBus.on('behavior.blame_shift', (e) => this.onBlameShift(e)));
        logger.info('AutoDefectCreator started');
    }
    stop() {
        for (const sub of this.subs)
            sub.unsubscribe();
        this.subs = [];
    }
    getAutoDefects() {
        return [...this.autoDefects];
    }
    async onHallucination(event) {
        const payload = event.payload;
        await this.createDefect({
            rootCauseCategory: 'hallucination',
            evidence: payload.claim ?? 'Unverified success claim',
            detector: 'HallucinationDetector',
            severity: 'high',
            autoCreated: true,
            sessionId: event.sessionId,
            timestamp: Date.now(),
            context: payload,
        }, `Hallucination: ${payload.claim ?? 'unverified claim'}`);
    }
    async onAISlop(event) {
        const payload = event.payload;
        await this.createDefect({
            rootCauseCategory: 'ai_slop',
            evidence: `Pattern: ${payload.pattern} in ${payload.file}`,
            detector: 'AISlopDetector',
            severity: 'medium',
            autoCreated: true,
            sessionId: event.sessionId,
            timestamp: Date.now(),
            context: payload,
        }, `AI Slop: ${payload.pattern}`);
    }
    async onDuplicateEdit(event) {
        const payload = event.payload;
        await this.createDefect({
            rootCauseCategory: 'duplicate_edit',
            evidence: `Repeated ${payload.count ?? 2} times`,
            detector: 'DuplicateEditDetector',
            severity: 'low',
            autoCreated: true,
            sessionId: event.sessionId,
            timestamp: Date.now(),
            context: payload,
        }, 'Duplicate Edit Detected');
    }
    async onBruteRetry(event) {
        const payload = event.payload;
        await this.createDefect({
            rootCauseCategory: 'brute_retry',
            evidence: `Strategy "${payload.strategy}" failed ${payload.count ?? 3} times`,
            detector: 'BruteRetryDetector',
            severity: 'high',
            autoCreated: true,
            sessionId: event.sessionId,
            timestamp: Date.now(),
            context: payload,
        }, `Brute Retry: ${payload.strategy}`);
    }
    async onBlameShift(event) {
        const payload = event.payload;
        await this.createDefect({
            rootCauseCategory: 'blame_shift',
            evidence: payload.excuse ?? 'Shifted blame',
            detector: 'BlameShiftDetector',
            severity: 'medium',
            autoCreated: true,
            sessionId: event.sessionId,
            timestamp: Date.now(),
            context: payload,
        }, 'Blame Shift Detected');
    }
    async createDefect(payload, title) {
        try {
            const input = {
                type: 'Defect',
                title,
                initialStatus: 'OPEN',
                payload,
                tags: ['auto-created', payload.rootCauseCategory, payload.detector],
                parents: [],
            };
            const defect = await this.store.create(input);
            this.autoDefects.push(defect.id);
            this.eventBus.emit('defect.auto_created', {
                defectId: defect.id,
                rootCause: payload.rootCauseCategory,
                severity: payload.severity,
                sessionId: payload.sessionId,
            });
            logger.info({ defectId: defect.id, rootCause: payload.rootCauseCategory }, 'Auto-defect created');
        }
        catch (err) {
            logger.error({ err, payload }, 'Failed to create auto-defect');
        }
    }
}
//# sourceMappingURL=AutoDefectCreator.js.map