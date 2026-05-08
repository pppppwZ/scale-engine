import type { AgentTeam, TeamConfig, TeamExecutionResult, ProgressReport } from './types.js';
import type { ArtifactId } from '../artifact/types.js';
import type { IArtifactStore } from '../artifact/store.js';
import type { IEventBus } from '../core/eventBus.js';
import type { IAgentPool } from './AgentPool.js';
import type { IAgentDispatcher } from './AgentDispatcher.js';
import type { IAgentChannel } from './AgentChannel.js';
import type { ITaskEngine } from '../tasks/TaskEngine.js';
export interface IAgentCoordinator {
    executeTeamTask(taskId: ArtifactId, config: TeamConfig): Promise<TeamExecutionResult>;
    formTeam(taskId: ArtifactId, config: TeamConfig): Promise<AgentTeam>;
    dissolveTeam(team: AgentTeam): Promise<void>;
    monitorProgress(team: AgentTeam): Promise<ProgressReport>;
}
export declare class AgentCoordinator implements IAgentCoordinator {
    private pool;
    private dispatcher;
    private channel;
    private store;
    private taskEngine;
    private eventBus;
    constructor(pool: IAgentPool, dispatcher: IAgentDispatcher, channel: IAgentChannel, store: IArtifactStore, taskEngine: ITaskEngine, eventBus: IEventBus);
    executeTeamTask(taskId: ArtifactId, config: TeamConfig): Promise<TeamExecutionResult>;
    formTeam(taskId: ArtifactId, config: TeamConfig): Promise<AgentTeam>;
    dissolveTeam(team: AgentTeam): Promise<void>;
    monitorProgress(team: AgentTeam): Promise<ProgressReport>;
    private decomposeTask;
    private aggregateResults;
}
