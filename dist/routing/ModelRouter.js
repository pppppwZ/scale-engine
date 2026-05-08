// SCALE Engine — Model Router (W9)
// 基于任务复杂度选择模型
// 设计参考：docs/01-ARCHITECTURE.md §二 L4
import { logger } from '../core/logger.js';
export const DEFAULT_MODELS = {
    fast: { tier: 'fast', name: 'claude-haiku', maxTokens: 200_000, costPerMToken: 0.25 },
    balanced: { tier: 'balanced', name: 'claude-sonnet', maxTokens: 200_000, costPerMToken: 3.0 },
    powerful: { tier: 'powerful', name: 'claude-opus', maxTokens: 200_000, costPerMToken: 15.0 },
    local: { tier: 'local', name: 'local-llm', maxTokens: 32_000, costPerMToken: 0.0 },
};
export class ModelRouter {
    constructor(eventBus, models) {
        this.eventBus = eventBus;
        this.models = { ...DEFAULT_MODELS, ...models };
    }
    route(ctx) {
        let tier;
        // Rule 1: Budget override
        if (ctx.budget === 'low') {
            tier = 'fast';
        }
        else if (ctx.budget === 'high') {
            tier = 'powerful';
        }
        // Rule 2: High complexity or repeated failures → powerful
        else if ((ctx.taskComplexity ?? 0) > 0.7 || (ctx.previousFailures ?? 0) >= 2) {
            tier = 'powerful';
        }
        // Rule 3: Simple tasks → fast
        else if ((ctx.taskComplexity ?? 0.5) < 0.3 && (ctx.stepCount ?? 1) <= 2) {
            tier = 'fast';
        }
        // Rule 4: Default → balanced
        else {
            tier = 'balanced';
        }
        const model = this.models[tier];
        logger.debug({ ctx, selectedTier: tier, model: model.name }, 'Model routed');
        this.eventBus.emit('tool.called', {
            tool: 'ModelRouter',
            routedTo: model.name,
            tier,
            reason: this.explainRouting(ctx, tier),
        });
        return model;
    }
    getModels() {
        return { ...this.models };
    }
    setModel(tier, config) {
        this.models[tier] = config;
    }
    explainRouting(ctx, tier) {
        if (ctx.budget === 'low')
            return 'budget=low → fast';
        if (ctx.budget === 'high')
            return 'budget=high → powerful';
        if ((ctx.previousFailures ?? 0) >= 2)
            return `${ctx.previousFailures} failures → powerful`;
        if ((ctx.taskComplexity ?? 0) > 0.7)
            return `complexity=${ctx.taskComplexity} → powerful`;
        if ((ctx.taskComplexity ?? 0.5) < 0.3)
            return `complexity=${ctx.taskComplexity} → fast`;
        return `default → ${tier}`;
    }
}
//# sourceMappingURL=ModelRouter.js.map