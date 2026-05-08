import type { KnowledgeEntry } from '../artifact/types.js';
import type { IEventBus } from '../core/eventBus.js';
import type { IKnowledgeBase } from '../knowledge/KnowledgeBase.js';
export interface ValidationResult {
    valid: boolean;
    gateResults: GateResult[];
    overallScore: number;
    reason?: string;
}
export interface GateResult {
    gateName: string;
    passed: boolean;
    score: number;
    details: string;
}
export interface ILessonValidator {
    validate(entry: Omit<KnowledgeEntry, 'id' | 'createdAt' | 'accessCount' | 'relevance'>): Promise<ValidationResult>;
    checkGoogleability(title: string): Promise<GateResult>;
    checkContextSpecific(entry: Omit<KnowledgeEntry, 'id' | 'createdAt' | 'accessCount' | 'relevance'>): Promise<GateResult>;
    checkDuplicate(title: string, contentRef: string): Promise<GateResult>;
}
export declare class LessonValidator implements ILessonValidator {
    private eventBus;
    private kb;
    private minGoogleabilityScore;
    private maxDuplicateSimilarity;
    constructor(eventBus: IEventBus, kb?: IKnowledgeBase, opts?: {
        minGoogleabilityScore?: number;
        maxDuplicateSimilarity?: number;
    });
    validate(entry: Omit<KnowledgeEntry, 'id' | 'createdAt' | 'accessCount' | 'relevance'>): Promise<ValidationResult>;
    checkGoogleability(title: string): Promise<GateResult>;
    checkContextSpecific(entry: Omit<KnowledgeEntry, 'id' | 'createdAt' | 'accessCount' | 'relevance'>): Promise<GateResult>;
    checkDuplicate(title: string, _contentRef: string): Promise<GateResult>;
    private calculateSimilarity;
}
