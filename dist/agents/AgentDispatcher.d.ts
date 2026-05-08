import type { TaskProfileMap } from './types.js';
import type { ArtifactId, Artifact } from '../artifact/types.js';
import type { IArtifactStore } from '../artifact/store.js';
import type { IEventBus } from '../core/eventBus.js';
import type { IAgentPool } from './AgentPool.js';
import type { IAgentRegistry } from './AgentRegistry.js';
export interface IAgentDispatcher {
    dispatch(taskId: ArtifactId): Promise<string[]>;
    dispatchParallel(taskIds: ArtifactId[]): Promise<Map<ArtifactId, string[]>>;
    resolveProfiles(task: Artifact): string[];
}
export declare class AgentDispatcher implements IAgentDispatcher {
    private pool;
    private registry;
    private store;
    private eventBus;
    private mappings;
    constructor(pool: IAgentPool, registry: IAgentRegistry, store: IArtifactStore, eventBus: IEventBus, mappings?: TaskProfileMap);
    dispatch(taskId: ArtifactId): Promise<string[]>;
    dispatchParallel(taskIds: ArtifactId[]): Promise<Map<ArtifactId, string[]>>;
    resolveProfiles(task: Artifact): string[];
    private hasDependencies;
    private waitForDependencies;
}
