// SCALE Engine — Trigger Engine (v0.7.0)
// 技能触发引擎：监听事件，触发技能推荐
import { logger } from '../core/logger.js';
export class TriggerEngine {
    constructor(eventBus, skillRegistry) {
        this.subscriptions = new Map();
        this.sessionContexts = new Map();
        this.running = false;
        this.eventBus = eventBus;
        this.skillRegistry = skillRegistry;
    }
    start() {
        if (this.running)
            return;
        this.running = true;
        this.eventBus.on('tool.used', (e) => this.handleToolUsed(e.payload));
        this.eventBus.on('artifact.created', (e) => this.handleArtifactCreated(e.payload));
        this.eventBus.on('artifact.transitioned', (e) => this.handleArtifactTransitioned(e.payload));
        this.eventBus.on('detector.triggered', (e) => this.handleDetectorTriggered(e.payload));
        logger.info('TriggerEngine started');
    }
    stop() {
        this.running = false;
        this.subscriptions.clear();
        this.sessionContexts.clear();
        logger.info('TriggerEngine stopped');
    }
    subscribe(eventType, handler) {
        const subs = this.subscriptions.get(eventType) ?? [];
        subs.push(handler);
        this.subscriptions.set(eventType, subs);
    }
    emit(event) {
        const subs = this.subscriptions.get(event.type);
        if (!subs)
            return;
        for (const handler of subs) {
            try {
                handler(event);
            }
            catch (err) {
                logger.error({ err }, 'Trigger handler error');
            }
        }
    }
    async triggerSkillRecommendation(context) {
        const recommendations = this.skillRegistry.recommend(context);
        if (recommendations.length > 0) {
            logger.info({ count: recommendations.length, topSkill: recommendations[0]?.skillId }, 'Skills recommended');
            this.eventBus.emit('skill.recommended', { recommendations, context });
        }
        return recommendations;
    }
    injectRecommendationToContext(sessionId, recommendations) {
        if (recommendations.length === 0)
            return;
        const block = this.formatRecommendationBlock(recommendations);
        this.eventBus.emit('context.inject', { sessionId, block, type: 'skill_recommendations' });
    }
    handleToolUsed(data) {
        const sessionId = data.sessionId ?? 'default';
        const tool = data.tool;
        const context = this.sessionContexts.get(sessionId) ?? {};
        if (tool === 'Bash') {
            const cmd = (data.args?.command) ?? '';
            context.keywords = this.extractKeywords(cmd);
        }
        this.sessionContexts.set(sessionId, context);
        this.emit({ type: 'tool_used', payload: { tool }, sessionId, timestamp: Date.now() });
        this.triggerAndInject(sessionId, context);
    }
    handleArtifactCreated(data) {
        const sessionId = data.sessionId ?? 'default';
        const artifactType = data.type;
        const context = this.sessionContexts.get(sessionId) ?? {};
        context.artifactType = artifactType;
        context.taskType = this.mapArtifactToTask(artifactType);
        this.sessionContexts.set(sessionId, context);
        this.emit({ type: 'artifact_created', payload: { artifactId: data.id, type: artifactType }, sessionId, timestamp: Date.now() });
        this.triggerAndInject(sessionId, context);
    }
    handleArtifactTransitioned(data) {
        const sessionId = data.sessionId ?? 'default';
        const newStatus = data.newStatus;
        const context = this.sessionContexts.get(sessionId) ?? {};
        context.artifactStatus = newStatus;
        context.phase = this.mapStatusToPhase(newStatus);
        this.sessionContexts.set(sessionId, context);
        this.emit({ type: 'artifact_transitioned', payload: { artifactId: data.id, newStatus }, sessionId, timestamp: Date.now() });
        this.triggerAndInject(sessionId, context);
    }
    handleDetectorTriggered(data) {
        const sessionId = data.sessionId ?? 'default';
        const detector = data.detector;
        const context = this.sessionContexts.get(sessionId) ?? {};
        context.detectorTriggered = detector;
        this.sessionContexts.set(sessionId, context);
        this.emit({ type: 'detector_triggered', payload: { detector }, sessionId, timestamp: Date.now() });
        this.triggerAndInject(sessionId, context);
    }
    async triggerAndInject(sessionId, context) {
        const recommendations = await this.triggerSkillRecommendation(context);
        this.injectRecommendationToContext(sessionId, recommendations);
    }
    formatRecommendationBlock(recommendations) {
        const lines = recommendations.map((r, i) => `${i + 1}. **${r.skillId}** (priority ${r.priority}) - ${r.reason}`);
        return `\n## Recommended Skills\n\n${lines.join('\n')}\n`;
    }
    extractKeywords(cmd) {
        const keywords = [];
        if (/test|spec|verify/i.test(cmd))
            keywords.push('test');
        if (/build|compile|make/i.test(cmd))
            keywords.push('build');
        if (/lint|check|audit/i.test(cmd))
            keywords.push('lint');
        if (/fix|bug|error|issue/i.test(cmd))
            keywords.push('bug-fix');
        if (/refactor|clean|optimize/i.test(cmd))
            keywords.push('refactor');
        if (/add|create|new|implement/i.test(cmd))
            keywords.push('feature');
        return keywords;
    }
    mapArtifactToTask(type) {
        const map = { Spec: 'planning', Plan: 'planning', Task: 'execution', Change: 'execution', Defect: 'bug-fix', Evidence: 'verification', Lesson: 'evolution' };
        return map[type] ?? 'unknown';
    }
    mapStatusToPhase(status) {
        const map = { DRAFT: 'plan', REVIEWING: 'plan', FROZEN: 'plan', APPROVED: 'implement', IN_PROGRESS: 'implement', BLOCKED: 'implement', DONE: 'verify', CLOSED: 'evolve' };
        return map[status] ?? 'explore';
    }
    updateSessionContext(sessionId, updates) {
        const ctx = this.sessionContexts.get(sessionId) ?? {};
        Object.assign(ctx, updates);
        this.sessionContexts.set(sessionId, ctx);
    }
    getSessionContext(sessionId) {
        return this.sessionContexts.get(sessionId);
    }
}
//# sourceMappingURL=TriggerEngine.js.map