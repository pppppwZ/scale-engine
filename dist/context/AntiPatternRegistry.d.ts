import type { IEventBus } from '../core/eventBus.js';
export interface AntiPattern {
    id: string;
    principle: 'think-before-coding' | 'simplicity-first' | 'surgical-changes' | 'goal-driven-execution';
    category: string;
    title: string;
    userRequest: string;
    wrongCode: string;
    wrongDescription: string;
    correctApproach: string | string[];
    correctCode?: string;
    correctDescription: string;
    testQuestion?: string;
    tags: string[];
}
export interface AntiPatternMatch {
    patternId: string;
    detectedIn: string;
    severity: 'high' | 'medium' | 'low';
    suggestion: string;
}
export interface IAntiPatternRegistry {
    getAntiPatterns(principle?: string): AntiPattern[];
    searchAntiPatterns(query: string): AntiPattern[];
    detectInCode(code: string): AntiPatternMatch[];
    getExample(principle: string, category: string): AntiPattern | undefined;
}
export declare class AntiPatternRegistry implements IAntiPatternRegistry {
    private patterns;
    private eventBus;
    constructor(eventBus?: IEventBus);
    getAntiPatterns(principle?: string): AntiPattern[];
    searchAntiPatterns(query: string): AntiPattern[];
    detectInCode(code: string): AntiPatternMatch[];
    getExample(principle: string, category: string): AntiPattern | undefined;
    register(pattern: AntiPattern): void;
}
export declare function createAntiPatternRegistry(eventBus?: IEventBus): IAntiPatternRegistry;
