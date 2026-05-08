// SCALE Engine — Guardrails Gateway (W5 完整实现)
// Hook 网关 + 5 种懒惰检测器 + Role 权限
// 设计参考：docs/03-CORE-MODULES.md §3.5
import { logger } from '../core/logger.js';
export class Gateway {
    constructor(eventBus) {
        this.eventBus = eventBus;
        this.cache = new Map();
        this.detectors = {
            preTool: [],
            postTool: [],
            beforeStop: [],
        };
    }
    registerDetector(detector, hook) {
        this.detectors[hook].push(detector);
        logger.debug({ name: detector.name, hook }, 'Detector registered');
    }
    async preTool(input) {
        for (const det of this.detectors.preTool) {
            const result = await det.check(input, { eventBus: this.eventBus, cache: this.cache });
            if (result.triggered) {
                if (result.severity === 'deny' || result.severity === 'block') {
                    this.eventBus.emit('tool.blocked', { tool: input.tool, detector: det.name, reason: result.reason }, { sessionId: input.sessionId });
                    return { allow: false, reason: result.reason, suggestion: result.suggestion };
                }
                if (result.severity === 'warn') {
                    return { allow: true, reason: result.reason, injectContext: [result.reason ?? ''] };
                }
            }
        }
        this.eventBus.emit('tool.called', { tool: input.tool, args: input.args }, { sessionId: input.sessionId });
        return { allow: true };
    }
    async postTool(input) {
        if (input.exitCode === 0) {
            this.eventBus.emit('tool.completed', { tool: input.tool, args: input.args, output: input.output }, { sessionId: input.sessionId });
        }
        else {
            this.eventBus.emit('tool.failed', { tool: input.tool, args: input.args, exitCode: input.exitCode, output: input.output }, { sessionId: input.sessionId });
        }
        for (const det of this.detectors.postTool) {
            await det.check(input, { eventBus: this.eventBus, cache: this.cache });
        }
    }
    async beforeStop(input) {
        for (const det of this.detectors.beforeStop) {
            const result = await det.check(input, { eventBus: this.eventBus, cache: this.cache });
            if (result.triggered && (result.severity === 'deny' || result.severity === 'block')) {
                return { allow: false, reason: result.reason, suggestion: result.suggestion };
            }
        }
        return { allow: true };
    }
}
//# sourceMappingURL=Gateway.js.map