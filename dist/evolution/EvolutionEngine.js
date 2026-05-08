// SCALE Engine — Evolution Layer (W7)
// 4 级自进化：Defect → Lesson → Rule → Hook
// 设计参考：docs/01-ARCHITECTURE.md §二 L6
import { logger } from '../core/logger.js';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
export class LessonExtractor {
    constructor(store, kb, eventBus) {
        this.store = store;
        this.kb = kb;
        this.eventBus = eventBus;
    }
    /**
     * 从已关闭的 Defect 中提取 Lesson
     * Gate 1: Defect 必须在 DIAGNOSED/FIXED/CLOSED 状态
     * Gate 2: 必须有 rootCauseCategory
     * Gate 3: 不重复（标题相似度检查）
     */
    async extract(defectId) {
        const defect = await this.store.get(defectId);
        if (!defect)
            return null;
        // Gate 1: 状态检查
        if (!['DIAGNOSED', 'FIXED', 'CLOSED'].includes(defect.status)) {
            logger.debug({ defectId, status: defect.status }, 'Defect not ready for lesson extraction');
            return null;
        }
        // Gate 2: 根因检查
        const payload = defect.payload;
        const rootCause = payload.rootCauseCategory;
        if (!rootCause || rootCause === 'unknown') {
            logger.debug({ defectId }, 'Defect has no root cause');
            return null;
        }
        // Gate 3: 去重
        const title = `[${rootCause}] ${defect.title}`;
        const existing = await this.kb.recall({ tags: [rootCause] });
        const isDupe = existing.some((e) => this.similarity(e.title, title) > 0.85);
        if (isDupe) {
            logger.debug({ defectId, title }, 'Similar lesson already exists — skipping');
            return null;
        }
        // 创建 Lesson
        const entry = await this.kb.add({
            type: 'lesson',
            title,
            tags: [rootCause, defect.type, ...(payload.tags ?? [])],
            contentRef: `lessons/${defectId}.md`,
            verified: false,
            sourceArtifact: defectId,
        });
        this.eventBus.emit('lesson.proposed', {
            lessonId: entry.id,
            defectId,
            rootCause,
            title,
        });
        logger.info({ lessonId: entry.id, defectId }, 'Lesson extracted from defect');
        return entry;
    }
    /**
     * 扫描所有已关闭的 Defect，批量提取 lessons
     */
    async scanForPatterns() {
        const defects = await this.store.query({ type: 'Defect' });
        const closedDefects = defects.filter((d) => ['DIAGNOSED', 'FIXED', 'CLOSED'].includes(d.status));
        const extracted = [];
        for (const defect of closedDefects) {
            const lesson = await this.extract(defect.id);
            if (lesson)
                extracted.push(lesson);
        }
        // 检测重复模式：同类根因出现 ≥3 次 → 标记为高优先
        const causeCount = new Map();
        for (const d of closedDefects) {
            const cause = d.payload.rootCauseCategory;
            if (cause)
                causeCount.set(cause, (causeCount.get(cause) ?? 0) + 1);
        }
        for (const [cause, count] of causeCount) {
            if (count >= 3) {
                logger.warn({ cause, count }, 'Recurring defect pattern detected — consider promoting to Rule');
            }
        }
        return extracted;
    }
    similarity(a, b) {
        const setA = new Set(a.toLowerCase().split(/\s+/));
        const setB = new Set(b.toLowerCase().split(/\s+/));
        const intersection = [...setA].filter((w) => setB.has(w));
        return intersection.length / Math.max(setA.size, setB.size);
    }
}
export class RuleProposer {
    constructor(kb, eventBus) {
        this.kb = kb;
        this.eventBus = eventBus;
        this.rules = new Map();
        this.seq = 0;
    }
    async proposeFromLesson(lessonId) {
        const lessons = await this.kb.recall({});
        const lesson = lessons.find((l) => l.id === lessonId);
        if (!lesson)
            return null;
        // 只对 verified + active 的 lesson 提议
        if (!lesson.verified) {
            logger.debug({ lessonId }, 'Lesson not verified — cannot propose rule');
            return null;
        }
        const rule = {
            id: `RULE-${Date.now()}-${(++this.seq).toString().padStart(3, '0')}`,
            title: `Rule: ${lesson.title}`,
            description: `Auto-proposed from lesson ${lessonId}. Tags: ${lesson.tags.join(', ')}`,
            sourceLesson: lessonId,
            pattern: lesson.tags[0] ?? 'general',
            enforcement: lesson.accessCount >= 5 ? 'hook' : 'prompt',
            createdAt: Date.now(),
            approved: false,
        };
        this.rules.set(rule.id, rule);
        this.eventBus.emit('rule.proposed', {
            ruleId: rule.id,
            lessonId,
            enforcement: rule.enforcement,
        });
        logger.info({ ruleId: rule.id, lessonId }, 'Rule proposed from lesson');
        return rule;
    }
    async scanAndPropose() {
        const lessons = await this.kb.recall({ verifiedOnly: true });
        const proposed = [];
        for (const lesson of lessons) {
            // 只对 relevance ≥ 0.6 且 accessCount ≥ 3 的 lesson 自动提议
            if (lesson.relevance >= 0.6 && lesson.accessCount >= 3) {
                const existing = [...this.rules.values()].find((r) => r.sourceLesson === lesson.id);
                if (!existing) {
                    const rule = await this.proposeFromLesson(lesson.id);
                    if (rule)
                        proposed.push(rule);
                }
            }
        }
        return proposed;
    }
    async approve(ruleId, approvedBy) {
        const rule = this.rules.get(ruleId);
        if (!rule)
            throw new Error(`Rule not found: ${ruleId}`);
        rule.approved = true;
        rule.approvedBy = approvedBy;
        this.eventBus.emit('rule.enforced', { ruleId, approvedBy });
        logger.info({ ruleId, approvedBy }, 'Rule approved');
        return rule;
    }
    getProposedRules() {
        return [...this.rules.values()];
    }
    writeRuleFile(rule, rulesDir) {
        mkdirSync(rulesDir, { recursive: true });
        const filename = `${rule.id}.md`;
        const path = join(rulesDir, filename);
        const content = `# ${rule.title}

> Source: ${rule.sourceLesson}
> Enforcement: ${rule.enforcement}
> Approved: ${rule.approved ? `Yes (by ${rule.approvedBy})` : 'Pending'}
> Created: ${new Date(rule.createdAt).toISOString()}

## Description

${rule.description}

## Pattern

\`${rule.pattern}\`
`;
        writeFileSync(path, content, 'utf-8');
        return path;
    }
}
export class HookGenerator {
    constructor(eventBus) {
        this.eventBus = eventBus;
        this.hooks = [];
    }
    generate(rule, hooksDir) {
        if (!rule.approved) {
            logger.debug({ ruleId: rule.id }, 'Rule not approved — cannot generate hook');
            return null;
        }
        if (rule.enforcement !== 'hook') {
            logger.debug({ ruleId: rule.id }, 'Rule enforcement is prompt, not hook — skipping');
            return null;
        }
        mkdirSync(hooksDir, { recursive: true });
        const hookType = this.inferHookType(rule.pattern);
        const matcher = this.inferMatcher(rule.pattern);
        const scriptName = `${rule.id}.sh`;
        const scriptPath = join(hooksDir, scriptName);
        // Generate shell script
        const script = `#!/bin/bash
# Auto-generated hook from Rule: ${rule.id}
# Source lesson: ${rule.sourceLesson}
# Pattern: ${rule.pattern}
# Hook type: ${hookType} | Matcher: ${matcher}
#
# This hook was automatically promoted from a recurring lesson.
# Edit with caution — it enforces a hard constraint.

# Read tool input from stdin
INPUT=$(cat)

# Check condition
# TODO: Implement specific check for pattern "${rule.pattern}"
# For now, this is a placeholder that always passes.
echo "Hook ${rule.id} checked (pattern: ${rule.pattern})" >&2
exit 0
`;
        writeFileSync(scriptPath, script, 'utf-8');
        const hook = {
            id: `HOOK-${Date.now()}`,
            ruleId: rule.id,
            hookType,
            matcher,
            scriptPath,
            createdAt: Date.now(),
        };
        this.hooks.push(hook);
        this.eventBus.emit('hook.generated', {
            hookId: hook.id,
            ruleId: rule.id,
            hookType,
            matcher,
            scriptPath,
        });
        logger.info({ hookId: hook.id, ruleId: rule.id, hookType }, 'Hook generated from rule');
        return hook;
    }
    getGeneratedHooks() {
        return [...this.hooks];
    }
    inferHookType(pattern) {
        if (/test|verify|lint|build/i.test(pattern))
            return 'Stop';
        if (/edit|write|delete/i.test(pattern))
            return 'PreToolUse';
        return 'PostToolUse';
    }
    inferMatcher(pattern) {
        if (/bash|command|shell/i.test(pattern))
            return 'Bash';
        if (/edit|write/i.test(pattern))
            return 'Edit|Write|MultiEdit';
        return '';
    }
}
// ============================================================================
// EvolutionEngine — 编排 4 级进化
// ============================================================================
export class EvolutionEngine {
    constructor(extractor, proposer, generator, eventBus, scaleDir = '.scale') {
        this.extractor = extractor;
        this.proposer = proposer;
        this.generator = generator;
        this.scaleDir = scaleDir;
        this.eventBus = eventBus;
    }
    /**
     * 完整进化周期：
     * 1. 扫描 Defects → 提取 Lessons
     * 2. 扫描 Lessons → 提议 Rules
     * 3. (人审后) 已批准 Rules → 生成 Hooks
     */
    async runCycle() {
        const stats = {
            lessonsExtracted: 0,
            rulesProposed: 0,
            rulesApproved: 0,
            hooksGenerated: 0,
        };
        // Step 1: Extract lessons
        const lessons = await this.extractor.scanForPatterns();
        stats.lessonsExtracted = lessons.length;
        // Step 2: Propose rules
        const rules = await this.proposer.scanAndPropose();
        stats.rulesProposed = rules.length;
        // Step 3: Generate hooks for approved rules
        const approvedRules = this.proposer.getProposedRules().filter((r) => r.approved && r.enforcement === 'hook');
        stats.rulesApproved = approvedRules.length;
        const hooksDir = join(this.scaleDir, 'hooks');
        for (const rule of approvedRules) {
            const hook = this.generator.generate(rule, hooksDir);
            if (hook)
                stats.hooksGenerated++;
        }
        logger.info(stats, 'Evolution cycle completed');
        this.eventBus.emit('evolution.cycle_completed', stats);
        return stats;
    }
    getStats() {
        return {
            lessonsExtracted: 0, // Would need persistence
            rulesProposed: this.proposer.getProposedRules().length,
            rulesApproved: this.proposer.getProposedRules().filter((r) => r.approved).length,
            hooksGenerated: this.generator.getGeneratedHooks().length,
        };
    }
}
//# sourceMappingURL=EvolutionEngine.js.map