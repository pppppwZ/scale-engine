import type { IEventBus } from '../core/eventBus.js';
export interface AutoEvolveConfig {
    enabled: boolean;
    bruteRetryThreshold: number;
}
export interface SessionMetrics {
    sessionId: string;
    duration: number;
    toolCalls: number;
    toolFailures: number;
    bruteRetryCount: number;
    blameShiftCount: number;
    prematureDoneCount: number;
    artifactsCreated: number;
    rolesUsed: string[];
    modelsUsed: Record<string, number>;
}
export interface IBehaviorTracker {
    start(): void;
    stop(): void;
    getSessionMetrics(sessionId: string): Promise<SessionMetrics>;
    detectPatterns(): Promise<unknown[]>;
    setAutoEvolve(config: AutoEvolveConfig, runCycleFn: () => Promise<void>): void;
}
export declare class BehaviorTracker implements IBehaviorTracker {
    private eventBus;
    private subs;
    private metrics;
    private autoEvolveConfig;
    private runCycleFn?;
    constructor(eventBus: IEventBus);
    setAutoEvolve(config: AutoEvolveConfig, runCycleFn: () => Promise<void>): void;
    start(): void;
    stop(): void;
    getSessionMetrics(sessionId: string): Promise<SessionMetrics>;
    detectPatterns(): Promise<unknown[]>;
    private getOrCreate;
    private createEmptyMetrics;
    private onToolCalled;
    private onToolFailed;
    private onBruteRetry;
    private onBlameShift;
    private onPrematureDone;
    private onArtifactCreated;
    private onRoleActivated;
}
