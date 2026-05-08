import type { IEventBus } from '../core/eventBus.js';
import type { ISkillRegistry, SkillTriggerCondition, SkillRecommendation } from './SkillRegistry.js';
export interface TriggerEvent {
    type: 'tool_used' | 'artifact_created' | 'artifact_transitioned' | 'detector_triggered' | 'phase_changed' | 'error_occurred';
    payload: Record<string, unknown>;
    sessionId: string;
    timestamp: number;
}
export interface ITriggerEngine {
    start(): void;
    stop(): void;
    subscribe(eventType: string, handler: (event: TriggerEvent) => void): void;
    emit(event: TriggerEvent): void;
    triggerSkillRecommendation(context: SkillTriggerCondition): Promise<SkillRecommendation[]>;
    injectRecommendationToContext(sessionId: string, recommendations: SkillRecommendation[]): void;
    updateSessionContext(sessionId: string, updates: Partial<SkillTriggerCondition>): void;
    getSessionContext(sessionId: string): SkillTriggerCondition | undefined;
}
export declare class TriggerEngine implements ITriggerEngine {
    private eventBus;
    private skillRegistry;
    private subscriptions;
    private sessionContexts;
    private running;
    constructor(eventBus: IEventBus, skillRegistry: ISkillRegistry);
    start(): void;
    stop(): void;
    subscribe(eventType: string, handler: (event: TriggerEvent) => void): void;
    emit(event: TriggerEvent): void;
    triggerSkillRecommendation(context: SkillTriggerCondition): Promise<SkillRecommendation[]>;
    injectRecommendationToContext(sessionId: string, recommendations: SkillRecommendation[]): void;
    private handleToolUsed;
    private handleArtifactCreated;
    private handleArtifactTransitioned;
    private handleDetectorTriggered;
    private triggerAndInject;
    private formatRecommendationBlock;
    private extractKeywords;
    private mapArtifactToTask;
    private mapStatusToPhase;
    updateSessionContext(sessionId: string, updates: Partial<SkillTriggerCondition>): void;
    getSessionContext(sessionId: string): SkillTriggerCondition | undefined;
}
