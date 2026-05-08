import type { IArtifactStore } from '../artifact/store.js';
import type { IKnowledgeBase } from '../knowledge/KnowledgeBase.js';
import type { IEventBus } from '../core/eventBus.js';
import type { IAgentManager } from '../agents/IAgent.js';
import type { EvolutionStats } from '../evolution/EvolutionEngine.js';
export interface DashboardConfig {
    port: number;
    host: string;
    artifactStore: IArtifactStore;
    knowledgeBase: IKnowledgeBase;
    eventBus: IEventBus;
    agentManager: IAgentManager;
    evolutionStats?: () => EvolutionStats;
}
export interface DashboardData {
    artifacts: Array<{
        id: string;
        type: string;
        status: string;
        title: string;
        createdAt: number;
    }>;
    sessions: Array<{
        id: string;
        startedAt: number;
        artifacts: number;
    }>;
    knowledge: Array<{
        id: string;
        type: string;
        title: string;
        relevance: number;
    }>;
    evolution: EvolutionStats;
    agents: Array<{
        id: string;
        name: string;
        dispatchCount: number;
        successRate: number;
    }>;
}
export declare class DashboardServer {
    private config;
    private server;
    private viewsDir;
    constructor(config: DashboardConfig);
    start(): void;
    stop(): void;
    private handleRequest;
    private handleApi;
    private collectData;
}
