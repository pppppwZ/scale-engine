import type { IEventBus } from '../core/eventBus.js';
import type { ProposedRule } from '../evolution/EvolutionEngine.js';
export interface HookTemplate {
    id: string;
    name: string;
    hookType: 'PreToolUse' | 'PostToolUse' | 'Stop' | 'SessionStart';
    matcherPattern: string;
    description: string;
    templateBody: string;
    variables: HookVariable[];
}
export interface HookVariable {
    name: string;
    type: 'string' | 'number' | 'boolean' | 'regex' | 'array';
    required: boolean;
    defaultValue?: unknown;
    description: string;
}
export interface EnhancedHook {
    id: string;
    ruleId?: string;
    hookType: 'PreToolUse' | 'PostToolUse' | 'Stop' | 'SessionStart';
    matcher: string;
    scriptPath: string;
    createdAt: number;
    templateId?: string;
    detectorType?: string;
    language: 'shell' | 'typescript' | 'javascript';
    checkBody: string;
    timeout: number;
    retryable: boolean;
}
export interface IHookGeneratorEnhanced {
    generateFromRule(rule: ProposedRule, hooksDir: string): EnhancedHook | null;
    generateFromTemplate(template: HookTemplate, variables: Record<string, unknown>, hooksDir: string): EnhancedHook;
    generateFromDetector(detectorType: string, pattern: string, hooksDir: string): EnhancedHook;
    getTemplates(): HookTemplate[];
    registerTemplate(template: HookTemplate): void;
    validateHook(hookPath: string): Promise<{
        valid: boolean;
        errors: string[];
    }>;
}
export declare class HookGeneratorEnhanced implements IHookGeneratorEnhanced {
    private eventBus;
    private templates;
    private generatedHooks;
    constructor(eventBus: IEventBus);
    generateFromRule(rule: ProposedRule, hooksDir: string): EnhancedHook | null;
    generateFromTemplate(template: HookTemplate, variables: Record<string, unknown>, hooksDir: string): EnhancedHook;
    generateFromDetector(detectorType: string, pattern: string, hooksDir: string): EnhancedHook;
    getTemplates(): HookTemplate[];
    registerTemplate(template: HookTemplate): void;
    validateHook(hookPath: string): Promise<{
        valid: boolean;
        errors: string[];
    }>;
    private findSuitableTemplate;
    private renderTemplate;
    private extractVariablesFromRule;
    private generateRuleBasedHook;
    private generateDetectorHook;
    private inferHookType;
    private inferMatcher;
    private inferHookTypeFromDetector;
    private inferMatcherFromDetector;
}
