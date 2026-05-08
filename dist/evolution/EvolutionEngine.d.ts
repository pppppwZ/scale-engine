import type { IEventBus } from '../core/eventBus.js';
import type { IKnowledgeBase } from '../knowledge/KnowledgeBase.js';
import type { IArtifactStore } from '../artifact/store.js';
import type { ArtifactId, KnowledgeEntry } from '../artifact/types.js';
export interface ProposedRule {
    id: string;
    title: string;
    description: string;
    sourceLesson: string;
    pattern: string;
    enforcement: 'prompt' | 'hook';
    createdAt: number;
    approved: boolean;
    approvedBy?: string;
}
export interface GeneratedHook {
    id: string;
    ruleId: string;
    hookType: 'PreToolUse' | 'PostToolUse' | 'Stop';
    matcher: string;
    scriptPath: string;
    createdAt: number;
}
export interface EvolutionStats {
    lessonsExtracted: number;
    rulesProposed: number;
    rulesApproved: number;
    hooksGenerated: number;
}
export interface ILessonExtractor {
    extract(defectId: ArtifactId): Promise<KnowledgeEntry | null>;
    scanForPatterns(): Promise<KnowledgeEntry[]>;
}
export declare class LessonExtractor implements ILessonExtractor {
    private store;
    private kb;
    private eventBus;
    constructor(store: IArtifactStore, kb: IKnowledgeBase, eventBus: IEventBus);
    /**
     * 从已关闭的 Defect 中提取 Lesson
     * Gate 1: Defect 必须在 DIAGNOSED/FIXED/CLOSED 状态
     * Gate 2: 必须有 rootCauseCategory
     * Gate 3: 不重复（标题相似度检查）
     */
    extract(defectId: ArtifactId): Promise<KnowledgeEntry | null>;
    /**
     * 扫描所有已关闭的 Defect，批量提取 lessons
     */
    scanForPatterns(): Promise<KnowledgeEntry[]>;
    private similarity;
}
export interface IRuleProposer {
    proposeFromLesson(lessonId: string): Promise<ProposedRule | null>;
    scanAndPropose(): Promise<ProposedRule[]>;
    approve(ruleId: string, approvedBy: string): Promise<ProposedRule>;
    getProposedRules(): ProposedRule[];
    writeRuleFile(rule: ProposedRule, rulesDir: string): string;
}
export declare class RuleProposer implements IRuleProposer {
    private kb;
    private eventBus;
    private rules;
    private seq;
    constructor(kb: IKnowledgeBase, eventBus: IEventBus);
    proposeFromLesson(lessonId: string): Promise<ProposedRule | null>;
    scanAndPropose(): Promise<ProposedRule[]>;
    approve(ruleId: string, approvedBy: string): Promise<ProposedRule>;
    getProposedRules(): ProposedRule[];
    writeRuleFile(rule: ProposedRule, rulesDir: string): string;
}
export interface IHookGenerator {
    generate(rule: ProposedRule, hooksDir: string): GeneratedHook | null;
    getGeneratedHooks(): GeneratedHook[];
}
export declare class HookGenerator implements IHookGenerator {
    private eventBus;
    private hooks;
    constructor(eventBus: IEventBus);
    generate(rule: ProposedRule, hooksDir: string): GeneratedHook | null;
    getGeneratedHooks(): GeneratedHook[];
    private inferHookType;
    private inferMatcher;
}
export declare class EvolutionEngine {
    private extractor;
    private proposer;
    private generator;
    private scaleDir;
    private eventBus;
    constructor(extractor: ILessonExtractor, proposer: IRuleProposer, generator: IHookGenerator, eventBus: IEventBus, scaleDir?: string);
    /**
     * 完整进化周期：
     * 1. 扫描 Defects → 提取 Lessons
     * 2. 扫描 Lessons → 提议 Rules
     * 3. (人审后) 已批准 Rules → 生成 Hooks
     */
    runCycle(): Promise<EvolutionStats>;
    getStats(): EvolutionStats;
}
