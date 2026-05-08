import type { IEventBus } from '../core/eventBus.js';
export type SkillDomain = 'context' | 'planning' | 'execution' | 'verification' | 'evolution' | 'deployment';
export type SkillExecutionType = 'cli-command' | 'agent-delegate' | 'mcp-tool' | 'skill-file' | 'builtin-function';
export type SkillTriggerType = 'taskType' | 'phase' | 'detectorTriggered' | 'complexity' | 'keyword' | 'manual' | 'artifactType' | 'artifactStatus';
export interface SkillTrigger {
    type: SkillTriggerType;
    value: string | string[];
    weight: number;
}
export interface SkillExecution {
    type: SkillExecutionType;
    config: {
        command?: string;
        agentType?: string;
        toolName?: string;
        skillPath?: string;
        functionName?: string;
        parameters?: Record<string, unknown>;
    };
    timeout?: number;
    retryPolicy?: {
        maxRetries: number;
        backoffMs: number;
    };
}
export interface SkillDefinition {
    id: string;
    name: string;
    description: string;
    domain: SkillDomain;
    triggers: SkillTrigger[];
    execution: SkillExecution;
    prerequisites?: string[];
    conflicts?: string[];
    priority: number;
    installed: boolean;
    installedAt?: number;
    source?: string;
}
export interface SkillRecommendation {
    skillId: string;
    priority: number;
    reason: string;
    triggeredBy: SkillTrigger[];
    executionType: SkillExecutionType;
}
export interface SkillTriggerCondition {
    taskType?: string;
    phase?: 'explore' | 'plan' | 'implement' | 'verify' | 'evolve';
    detectorTriggered?: string;
    complexity?: 'simple' | 'medium' | 'complex';
    keywords?: string[];
    artifactType?: string;
    artifactStatus?: string;
}
export interface ISkillRegistry {
    register(skill: SkillDefinition): void;
    unregister(skillId: string): void;
    get(skillId: string): SkillDefinition | undefined;
    listAll(domain?: SkillDomain): SkillDefinition[];
    listInstalled(): SkillDefinition[];
    recommend(context: SkillTriggerCondition): SkillRecommendation[];
    evaluateTriggers(skill: SkillDefinition, context: SkillTriggerCondition): {
        matched: SkillTrigger[];
        score: number;
    };
    setInstalled(skillId: string, installed: boolean): void;
    getDependencies(skillId: string): SkillDefinition[];
    checkConflicts(skillId: string): string[];
}
export declare class SkillRegistry implements ISkillRegistry {
    private skills;
    private eventBus;
    constructor(eventBus: IEventBus);
    register(skill: SkillDefinition): void;
    unregister(skillId: string): void;
    get(skillId: string): SkillDefinition | undefined;
    listAll(domain?: SkillDomain): SkillDefinition[];
    listInstalled(): SkillDefinition[];
    recommend(context: SkillTriggerCondition): SkillRecommendation[];
    evaluateTriggers(skill: SkillDefinition, context: SkillTriggerCondition): {
        matched: SkillTrigger[];
        score: number;
    };
    setInstalled(skillId: string, installed: boolean): void;
    getDependencies(skillId: string): SkillDefinition[];
    checkConflicts(skillId: string): string[];
    private matchesTrigger;
    private calculatePriority;
    private generateReason;
    registerBatch(skills: SkillDefinition[]): void;
    clear(): void;
}
