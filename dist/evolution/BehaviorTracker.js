// SCALE Engine — Behavior Tracker (W10 完整实现)
// 订阅事件流，统计指标，发现模式
// v0.7.1 增强：自动触发进化周期
// 设计参考：docs/03-CORE-MODULES.md §3.7
import { logger } from '../core/logger.js';
export class BehaviorTracker {
    constructor(eventBus) {
        this.eventBus = eventBus;
        this.subs = [];
        this.metrics = new Map();
        this.autoEvolveConfig = { enabled: false, bruteRetryThreshold: 3 };
    }
    setAutoEvolve(config, runCycleFn) {
        this.autoEvolveConfig = config;
        this.runCycleFn = runCycleFn;
        logger.info({ config }, 'Auto-evolve configured');
    }
    start() {
        this.subs.push(this.eventBus.on('tool.called', (e) => this.onToolCalled(e.sessionId, e.payload)), this.eventBus.on('tool.failed', (e) => this.onToolFailed(e.sessionId)), this.eventBus.on('behavior.brute_retry', (e) => this.onBruteRetry(e.sessionId)), this.eventBus.on('behavior.blame_shift', (e) => this.onBlameShift(e.sessionId)), this.eventBus.on('behavior.premature_done', (e) => this.onPrematureDone(e.sessionId)), this.eventBus.on('artifact.created', (e) => this.onArtifactCreated(e.sessionId)), this.eventBus.on('role.activated', (e) => this.onRoleActivated(e.sessionId, e.payload.role)));
        logger.info('BehaviorTracker started');
    }
    stop() {
        for (const sub of this.subs)
            sub.unsubscribe();
        this.subs = [];
    }
    async getSessionMetrics(sessionId) {
        return this.metrics.get(sessionId) ?? this.createEmptyMetrics(sessionId);
    }
    async detectPatterns() {
        // W10 实现
        return [];
    }
    getOrCreate(sessionId) {
        if (!this.metrics.has(sessionId))
            this.metrics.set(sessionId, this.createEmptyMetrics(sessionId));
        return this.metrics.get(sessionId);
    }
    createEmptyMetrics(sessionId) {
        return {
            sessionId, duration: 0, toolCalls: 0, toolFailures: 0,
            bruteRetryCount: 0, blameShiftCount: 0, prematureDoneCount: 0,
            artifactsCreated: 0, rolesUsed: [], modelsUsed: {},
        };
    }
    onToolCalled(sessionId, _payload) { this.getOrCreate(sessionId).toolCalls += 1; }
    onToolFailed(sessionId) { this.getOrCreate(sessionId).toolFailures += 1; }
    onBruteRetry(sessionId) {
        const metrics = this.getOrCreate(sessionId);
        metrics.bruteRetryCount += 1;
        // Auto-trigger evolution cycle when threshold reached
        if (this.autoEvolveConfig.enabled && this.runCycleFn &&
            metrics.bruteRetryCount >= this.autoEvolveConfig.bruteRetryThreshold) {
            logger.warn({ sessionId, bruteRetryCount: metrics.bruteRetryCount }, 'Brute retry threshold reached — triggering auto-evolve');
            this.runCycleFn().catch(err => logger.error({ err }, 'Auto-evolve cycle failed'));
        }
    }
    onBlameShift(sessionId) { this.getOrCreate(sessionId).blameShiftCount += 1; }
    onPrematureDone(sessionId) { this.getOrCreate(sessionId).prematureDoneCount += 1; }
    onArtifactCreated(sessionId) { this.getOrCreate(sessionId).artifactsCreated += 1; }
    onRoleActivated(sessionId, role) {
        const m = this.getOrCreate(sessionId);
        if (!m.rolesUsed.includes(role))
            m.rolesUsed.push(role);
    }
}
//# sourceMappingURL=BehaviorTracker.js.map