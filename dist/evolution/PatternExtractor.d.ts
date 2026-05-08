import type { IArtifactStore } from '../artifact/store.js';
import type { IKnowledgeBase } from '../knowledge/KnowledgeBase.js';
import type { IEventBus } from '../core/eventBus.js';
import type { ArtifactId } from '../artifact/types.js';
export interface Pattern {
    id: string;
    name: string;
    description: string;
    contexts: string[];
    steps: PatternStep[];
    successRate: number;
    extractedFrom: ArtifactId[];
    createdAt: number;
    verified: boolean;
}
export interface PatternStep {
    order: number;
    action: string;
    expectedOutcome: string;
    toolsUsed: string[];
}
export interface IPatternExtractor {
    extractFromArtifact(artifactId: ArtifactId): Promise<Pattern | null>;
    extractFromSession(sessionId: string): Promise<Pattern[]>;
    validatePattern(pattern: Pattern): Promise<boolean>;
    getPatterns(): Pattern[];
}
export declare class PatternExtractor implements IPatternExtractor {
    private store;
    private kb;
    private eventBus;
    private patterns;
    private seq;
    constructor(store: IArtifactStore, kb: IKnowledgeBase, eventBus: IEventBus);
    extractFromArtifact(artifactId: ArtifactId): Promise<Pattern | null>;
    extractFromSession(sessionId: string): Promise<Pattern[]>;
    validatePattern(pattern: Pattern): Promise<boolean>;
    getPatterns(): Pattern[];
    private buildPattern;
}
