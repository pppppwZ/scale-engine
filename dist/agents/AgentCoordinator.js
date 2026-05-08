// SCALE Engine — Agent Coordinator
// 协调器：任务分解、团队组建、进度监控、结果聚合
import { logger } from '../core/logger.js';
export class AgentCoordinator {
    constructor(pool, dispatcher, channel, store, taskEngine, eventBus) {
        this.pool = pool;
        this.dispatcher = dispatcher;
        this.channel = channel;
        this.store = store;
        this.taskEngine = taskEngine;
        this.eventBus = eventBus;
    }
    async executeTeamTask(taskId, config) {
        const startTime = Date.now();
        const task = await this.store.get(taskId);
        if (!task) {
            throw new Error(`Task not found: ${taskId}`);
        }
        logger.info({ taskId, profiles: config.profiles }, 'Starting team task execution');
        const subtasks = await this.decomposeTask(task, config);
        const team = await this.formTeam(taskId, config);
        await this.dispatcher.dispatchParallel(subtasks.map(s => s.id));
        const progress = await this.monitorProgress(team);
        while (progress.running > 0 && progress.completed < subtasks.length) {
            await new Promise(r => setTimeout(r, 1000));
            progress.completed++;
            progress.running--;
        }
        const result = await this.aggregateResults(team, startTime);
        await this.dissolveTeam(team);
        this.eventBus.emit('team.completed', { teamId: team.id, success: result.success });
        logger.info({ teamId: team.id, success: result.success, duration: result.duration }, 'Team task completed');
        return result;
    }
    async formTeam(taskId, config) {
        const agents = [];
        for (const profileId of config.profiles) {
            const idle = this.pool.getIdleAgents(profileId);
            if (idle.length > 0) {
                agents.push(idle[0]);
            }
            else {
                agents.push(this.pool.spawn(profileId));
            }
        }
        const team = {
            id: `TEAM-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            agents,
            leader: agents[0],
            startedAt: Date.now(),
            taskId,
        };
        for (const agent of agents) {
            this.channel.subscribe(agent.id, team.id);
        }
        this.eventBus.emit('team.formed', { teamId: team.id, agentCount: agents.length });
        logger.info({ teamId: team.id, agents: agents.map(a => a.id) }, 'Team formed');
        return team;
    }
    async dissolveTeam(team) {
        for (const agent of team.agents) {
            this.channel.unsubscribe(agent.id, team.id);
            if (agent.status === 'completed' || agent.status === 'failed') {
                this.pool.recycle(agent.id);
            }
        }
        team.dissolvedAt = Date.now();
        this.eventBus.emit('team.dissolved', { teamId: team.id });
        logger.info({ teamId: team.id }, 'Team dissolved');
    }
    async monitorProgress(team) {
        const statuses = team.agents.map(a => a.status);
        return {
            teamId: team.id,
            taskId: team.taskId,
            total: team.agents.length,
            completed: statuses.filter(s => s === 'completed').length,
            running: statuses.filter(s => s === 'running').length,
            blocked: statuses.filter(s => s === 'blocked').length,
            failed: statuses.filter(s => s === 'failed').length,
            idle: statuses.filter(s => s === 'idle').length,
            agents: team.agents.map(a => ({
                agentId: a.id,
                profileId: a.profile.id,
                status: a.status,
                duration: a.completedAt ? a.completedAt - a.startedAt : Date.now() - a.startedAt
            }))
        };
    }
    async decomposeTask(task, config) {
        const decomposition = {
            parentTaskId: task.id,
            subtasks: config.profiles.map(profileId => ({
                title: `${task.title} - ${profileId}`,
                payload: { requiredRole: profileId.split('-')[0] },
                dependencies: [],
            })),
        };
        const subtaskIds = await this.taskEngine.decompose(decomposition);
        const subtasks = [];
        for (const id of subtaskIds) {
            const artifact = await this.store.get(id);
            if (artifact)
                subtasks.push(artifact);
        }
        logger.info({ taskId: task.id, subtaskCount: subtasks.length }, 'Task decomposed');
        return subtasks;
    }
    async aggregateResults(team, startTime) {
        const agentResults = new Map();
        const outputs = [];
        for (const agent of team.agents) {
            const duration = (agent.completedAt ?? Date.now()) - agent.startedAt;
            const result = {
                agentId: agent.id,
                status: agent.status,
                outputArtifacts: agent.outputArtifacts,
                duration,
                retryCount: agent.retryCount ?? 0,
            };
            agentResults.set(agent.id, result);
            outputs.push(...agent.outputArtifacts);
            if (agent.profile.domain === 'frontend' && agent.outputArtifacts.length > 0) {
                this.channel.send(agent.id, 'code-review-agent', 'output-share', { artifacts: agent.outputArtifacts });
            }
        }
        return {
            teamId: team.id,
            success: outputs.length > 0,
            outputArtifacts: outputs,
            duration: Date.now() - startTime,
            agentResults,
        };
    }
}
//# sourceMappingURL=AgentCoordinator.js.map