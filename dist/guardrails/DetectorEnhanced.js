// SCALE Engine — Detector Enhanced (v0.7.0)
// 增强 Detector 管理：统计、配置、AI-Slop检测、Hallucination检测
import { logger } from '../core/logger.js';
export class DetectorStatisticsTracker {
    constructor(maxRecords = 1000) {
        this.triggers = [];
        this.maxRecords = maxRecords;
    }
    record(trigger) {
        this.triggers.push(trigger);
        if (this.triggers.length > this.maxRecords)
            this.triggers.shift();
    }
    getStats(detectorName) {
        const matches = this.triggers.filter(t => t.detectorName === detectorName);
        if (matches.length === 0)
            return null;
        return {
            detectorName,
            totalTriggers: matches.length,
            bySeverity: this.groupBy(matches, 'severity'),
            byTool: this.groupBy(matches, 'tool'),
            recentTriggers: matches.slice(-10),
        };
    }
    getAllStats() {
        const names = new Set(this.triggers.map(t => t.detectorName));
        return Array.from(names).map(n => this.getStats(n)).filter(Boolean);
    }
    getRecentTriggers(limit = 50) { return this.triggers.slice(-limit); }
    clear() { this.triggers = []; }
    groupBy(arr, key) {
        const result = {};
        for (const item of arr) {
            const val = String(item[key]);
            result[val] = (result[val] ?? 0) + 1;
        }
        return result;
    }
}
export class DetectorRegistry {
    constructor() {
        this.detectors = new Map();
    }
    register(detector, hook, config) {
        this.detectors.set(detector.name, { detector, hook, config: config ?? { enabled: true } });
        logger.info({ name: detector.name, hook }, 'Detector registered in registry');
    }
    unregister(detectorName) { return this.detectors.delete(detectorName); }
    getDetector(detectorName) { return this.detectors.get(detectorName)?.detector ?? null; }
    getConfig(detectorName) { return this.detectors.get(detectorName)?.config ?? null; }
    setConfig(detectorName, config) {
        const existing = this.detectors.get(detectorName);
        if (existing)
            existing.config = { ...existing.config, ...config };
    }
    listDetectors() {
        return Array.from(this.detectors.entries()).map(([name, { hook, config }]) => ({ name, hook, enabled: config.enabled }));
    }
    enable(detectorName) { this.setConfig(detectorName, { enabled: true }); }
    disable(detectorName) { this.setConfig(detectorName, { enabled: false }); }
}
export class AISlopDetector {
    constructor(opts = {}) {
        this.name = 'ai-slop';
        this.patterns = [
            { pattern: /gradient.*purple.*blue/i, description: 'purple-blue gradient overuse' },
            { pattern: /gradient.*linear.*135deg/i, description: 'generic 135deg gradient' },
            { pattern: /borderRadius:s*(8|12|16)(px|rem)/i, description: 'uniform rounded corners' },
            { pattern: /rounded-[(8|12|16)px]/i, description: 'uniform rounded corners (Tailwind)' },
            { pattern: /hero.*section.*center.*gradient/i, description: 'generic hero section' },
            { pattern: /grid-cols-3.*gap-4/i, description: 'generic 3-column grid' },
            { pattern: /flex.*justify-between.*items-center/i, description: 'generic flex center layout' },
            { pattern: /[🚀💡🎯✨🎉📊🏆⚡💡🔧]/u, description: 'emoji overuse' },
            { pattern: /background.*blur.*opacity.*0.[1-5]/i, description: 'decorative blur overlay' },
        ];
        this.threshold = opts.threshold ?? 3;
        this.windowMs = opts.windowMs ?? 5 * 60 * 1000;
    }
    async check(input, ctx) {
        if (!['Edit', 'Write', 'MultiEdit'].includes(input.tool))
            return { triggered: false };
        const content = JSON.stringify(input.args);
        const matches = [];
        for (const { pattern, description } of this.patterns) {
            if (pattern.test(content))
                matches.push(description);
        }
        if (matches.length < 2)
            return { triggered: false };
        const key = 'ai-slop:' + input.sessionId;
        const history = ctx.cache.get(key) ?? [];
        const recent = history.filter(t => Date.now() - t < this.windowMs);
        recent.push(Date.now());
        ctx.cache.set(key, recent);
        if (recent.length >= this.threshold) {
            ctx.eventBus.emit('behavior.ai_slop', { sessionId: input.sessionId, patterns: matches, count: recent.length }, { sessionId: input.sessionId });
            return {
                triggered: true,
                severity: 'warn',
                reason: 'Detected AI-Slop patterns: ' + matches.slice(0, 3).join(', ') + '. Make code look human-written.',
                suggestion: 'Avoid: gradient abuse, uniform rounded corners, emoji, template hero, 3-column grid.',
            };
        }
        return { triggered: false };
    }
}
export class HallucinationDetector {
    constructor() {
        this.name = 'hallucination';
        this.patterns = [
            { pattern: /测试.*通过|passed.*test/i, description: 'unverified test pass claim' },
            { pattern: /已.*验证|verified.*success/i, description: 'unverified verification claim' },
            { pattern: /构建.*成功|build.*succeeded/i, description: 'unverified build success claim' },
            { pattern: /lint.*通过|lint.*passed/i, description: 'unverified lint pass claim' },
        ];
    }
    async check(input, ctx) {
        const text = input.output ?? '';
        const matches = [];
        for (const { pattern, description } of this.patterns) {
            if (pattern.test(text))
                matches.push(description);
        }
        if (matches.length === 0)
            return { triggered: false };
        const recentCommands = await ctx.eventBus.query({
            sessionId: input.sessionId,
            types: ['tool.completed'],
            filter: (e) => {
                const p = e.payload;
                return p.tool === 'Bash' && /test|lint|build|verify/i.test(p.args?.command ?? '');
            },
            limit: 10,
        });
        const hasSuccessClaim = matches.some(m => m.includes('unverified'));
        if (hasSuccessClaim && recentCommands.length === 0) {
            ctx.eventBus.emit('behavior.hallucination', { sessionId: input.sessionId, patterns: matches, type: 'unverified_claim' }, { sessionId: input.sessionId });
            return {
                triggered: true,
                severity: 'warn',
                reason: 'Detected hallucination: claiming "' + matches[0] + '" without running verification.',
                suggestion: 'Run actual verification commands: bun test, pnpm lint, pnpm build',
            };
        }
        return { triggered: false };
    }
}
export class DuplicateEditDetector {
    constructor(opts = {}) {
        this.name = 'duplicate-edit';
        this.maxDuplicates = opts.maxDuplicates ?? 2;
    }
    async check(input, ctx) {
        if (input.tool !== 'Edit')
            return { triggered: false };
        const args = input.args;
        if (!args.old_string || !args.file_path)
            return { triggered: false };
        const key = 'duplicate-edit:' + input.sessionId + ':' + args.file_path;
        const edits = ctx.cache.get(key) ?? [];
        const duplicateCount = edits.filter(s => s === args.old_string).length;
        edits.push(args.old_string);
        ctx.cache.set(key, edits);
        if (duplicateCount >= this.maxDuplicates) {
            ctx.eventBus.emit('behavior.duplicate_edit', { sessionId: input.sessionId, file: args.file_path, count: duplicateCount + 1 }, { sessionId: input.sessionId });
            return {
                triggered: true,
                severity: 'warn',
                reason: 'Detected duplicate edit: same content edited ' + (duplicateCount + 1) + ' times in ' + args.file_path,
                suggestion: 'Check if previous edits applied correctly, try different strategy.',
            };
        }
        return { triggered: false };
    }
}
export class EnhancedGatewayContext {
    constructor(eventBus) {
        this.registry = new DetectorRegistry();
        this.stats = new DetectorStatisticsTracker();
        // Listen to all events and filter behavior events
        eventBus.on('*', (e) => {
            if (!e.type.startsWith('behavior.'))
                return;
            const payload = e.payload;
            this.stats.record({
                detectorName: String(e.type.replace('behavior.', '')),
                sessionId: String(payload.sessionId ?? 'unknown'),
                tool: String(payload.tool ?? 'unknown'),
                severity: 'warn',
                triggeredAt: Date.now(),
                reason: String(payload.reason ?? ''),
            });
        });
    }
}
export const ALL_ENHANCED_DETECTORS = [
    { detector: new AISlopDetector(), hook: 'preTool' },
    { detector: new HallucinationDetector(), hook: 'postTool' },
    { detector: new DuplicateEditDetector(), hook: 'preTool' },
];
//# sourceMappingURL=DetectorEnhanced.js.map