import type { IEventBus } from '../core/eventBus.js';
import type { IArtifactStore } from '../artifact/store.js';
import type { ArtifactId, SessionId } from '../artifact/types.js';
export interface DefectPayload {
    rootCauseCategory: string;
    evidence: string;
    detector: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    autoCreated: boolean;
    sessionId: SessionId;
    timestamp: number;
    context?: Record<string, unknown>;
}
export interface IAutoDefectCreator {
    start(): void;
    stop(): void;
    getAutoDefects(): ArtifactId[];
}
export declare class AutoDefectCreator implements IAutoDefectCreator {
    private store;
    private eventBus;
    private subs;
    private autoDefects;
    constructor(store: IArtifactStore, eventBus: IEventBus);
    start(): void;
    stop(): void;
    getAutoDefects(): ArtifactId[];
    private onHallucination;
    private onAISlop;
    private onDuplicateEdit;
    private onBruteRetry;
    private onBlameShift;
    private createDefect;
}
