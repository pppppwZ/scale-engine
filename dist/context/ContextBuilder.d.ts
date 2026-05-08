import type { ArtifactId, SessionId, ScenarioMode } from '../artifact/types.js';
import type { IArtifactStore } from '../artifact/store.js';
import type { IKnowledgeBase } from '../knowledge/KnowledgeBase.js';
import type { IEventBus } from '../core/eventBus.js';
export interface ContextLayer {
    name: string;
    content: string;
    priority: number;
    estimatedTokens: number;
}
export interface BuiltContext {
    system: string;
    metadata: {
        totalTokens: number;
        layers: string[];
        scenarioMode?: ScenarioMode;
    };
}
export interface ContextStatus {
    sessionId: SessionId;
    role: string;
    allowedTools: string[];
    deniedTools: string[];
    activeArtifacts: Array<{
        id: ArtifactId;
        type: string;
        status: string;
        current?: boolean;
    }>;
    constraints: string[];
    scenarioMode?: ScenarioMode;
}
export interface IContextBuilder {
    build(opts: {
        roleId?: string;
        currentArtifactId?: ArtifactId;
        sessionId: SessionId;
        scenarioMode?: ScenarioMode;
    }): Promise<BuiltContext>;
    getStatus(sessionId: SessionId, roleGate: {
        getRole(): {
            id: string;
            allowedTools: string[];
            deniedTools?: string[];
        };
    }): Promise<ContextStatus>;
}
export declare class ContextBuilder implements IContextBuilder {
    private store;
    private kb;
    private eventBus;
    private budget;
    constructor(store: IArtifactStore, kb: IKnowledgeBase, eventBus: IEventBus);
    build(opts: {
        roleId?: string;
        currentArtifactId?: ArtifactId;
        sessionId: SessionId;
        scenarioMode?: ScenarioMode;
    }): Promise<BuiltContext>;
    /**
     * Enhanced lesson recall: based on artifact tags + role context
     */
    private recallRelevantLessons;
    getStatus(sessionId: SessionId, roleGate: {
        getRole(): {
            id: string;
            allowedTools: string[];
            deniedTools?: string[];
        };
    }): Promise<ContextStatus>;
}
