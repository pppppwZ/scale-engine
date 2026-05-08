import type { IEventBus } from '../core/eventBus.js';
import type { IKnowledgeBase } from '../knowledge/KnowledgeBase.js';
import type { DetectorStatisticsTracker } from '../guardrails/DetectorEnhanced.js';
export interface EvolutionMetrics {
    lessonsProposed: number;
    lessonsValidated: number;
    lessonsApproved: number;
    lessonsRejected: number;
    lessonQualityScore: number;
    rulesProposed: number;
    rulesApproved: number;
    rulesEnforced: number;
    ruleEffectivenessScore: number;
    hooksGenerated: number;
    hooksDeployed: number;
    hooksTriggered: number;
    hookBlockingRate: number;
    detectorTriggers: number;
    detectorBlocks: number;
    detectorWarnings: number;
    detectorEffectivenessScore: number;
    overallScore: number;
    trend: 'improving' | 'stable' | 'declining';
}
export interface EvolutionSnapshot {
    timestamp: number;
    metrics: EvolutionMetrics;
}
export interface IEvolutionEvaluator {
    evaluate(): Promise<EvolutionMetrics>;
    getHistory(): EvolutionSnapshot[];
    compareWithBaseline(baseline: EvolutionMetrics): Promise<{
        improved: boolean;
        delta: Partial<EvolutionMetrics>;
    }>;
    getRecommendations(): Promise<string[]>;
}
export declare class EvolutionEvaluator implements IEvolutionEvaluator {
    private eventBus;
    private stats?;
    private history;
    private maxHistory;
    constructor(eventBus: IEventBus, _kb?: IKnowledgeBase, stats?: DetectorStatisticsTracker | undefined, opts?: {
        maxHistory?: number;
    });
    evaluate(): Promise<EvolutionMetrics>;
    getHistory(): EvolutionSnapshot[];
    compareWithBaseline(baseline: EvolutionMetrics): Promise<{
        improved: boolean;
        delta: Partial<EvolutionMetrics>;
    }>;
    getRecommendations(): Promise<string[]>;
    private countEvents;
    private calculateLessonQuality;
    private calculateRuleEffectiveness;
    private calculateDetectorEffectiveness;
    private calculateOverallScore;
    private determineTrend;
}
