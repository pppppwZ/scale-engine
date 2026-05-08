// SCALE Engine — Agent Dispatcher
// 任务分发器：根据任务类型选择合适的 Agent Profile
import { logger } from '../core/logger.js';
// Default task -> profile mappings
const DEFAULT_TASK_PROFILE_MAPPINGS = {
    'frontend': ['frontend-agent', 'ui-design-agent'],
    'backend': ['backend-agent', 'database-agent'],
    'testing': ['test-agent'],
    'deployment': ['ops-agent'],
    'review': ['code-review-agent', 'security-agent'],
    'spec': ['product-agent', 'ui-design-agent'],
    'documentation': ['docs-agent'],
    'architecture': ['architect-agent'],
    'performance': ['performance-agent']
};
export class AgentDispatcher {
    constructor(pool, registry, store, eventBus, mappings) {
        this.pool = pool;
        this.registry = registry;
        this.store = store;
        this.eventBus = eventBus;
        this.mappings = mappings ?? DEFAULT_TASK_PROFILE_MAPPINGS;
    }
    async dispatch(taskId) {
        const task = await this.store.get(taskId);
        if (!task) {
            throw new Error(`Task not found: ${taskId}`);
        }
        const profiles = this.resolveProfiles(task);
        if (profiles.length === 0) {
            logger.warn({ taskId }, 'No matching agent profiles for task');
            return [];
        }
        const agents = [];
        for (const profileId of profiles) {
            const idleAgents = this.pool.getIdleAgents(profileId);
            if (idleAgents.length > 0) {
                agents.push(idleAgents[0]);
            }
            else {
                agents.push(this.pool.spawn(profileId));
            }
        }
        for (const agent of agents) {
            this.pool.assignTask(agent.id, taskId);
        }
        this.eventBus.emit('agent.dispatched', { taskId, agentIds: agents.map(a => a.id) }, { artifactId: taskId });
        logger.info({ taskId, agentIds: agents.map(a => a.id) }, 'Task dispatched to agents');
        return agents.map(a => a.id);
    }
    async dispatchParallel(taskIds) {
        const results = new Map();
        const independent = [];
        const dependent = [];
        for (const taskId of taskIds) {
            if (await this.hasDependencies(taskId)) {
                dependent.push(taskId);
            }
            else {
                independent.push(taskId);
            }
        }
        for (const taskId of independent) {
            results.set(taskId, await this.dispatch(taskId));
        }
        for (const taskId of dependent) {
            await this.waitForDependencies(taskId);
            results.set(taskId, await this.dispatch(taskId));
        }
        return results;
    }
    resolveProfiles(task) {
        const tags = task.tags;
        const payload = task.payload;
        const requiredRole = payload.requiredRole;
        if (requiredRole) {
            const byRole = this.registry.getByRole(requiredRole);
            if (byRole.length > 0) {
                return byRole.map(p => p.id);
            }
        }
        for (const [taskType, profiles] of Object.entries(this.mappings)) {
            if (tags.includes(taskType)) {
                return profiles;
            }
        }
        const defaultProfile = this.registry.getByRole('Implementer');
        return defaultProfile.length > 0 ? [defaultProfile[0].id] : [];
    }
    async hasDependencies(taskId) {
        const task = await this.store.get(taskId);
        if (!task)
            return false;
        const payload = task.payload;
        return (payload.dependsOn?.length ?? 0) > 0;
    }
    async waitForDependencies(taskId) {
        const task = await this.store.get(taskId);
        if (!task)
            return;
        const payload = task.payload;
        const deps = payload.dependsOn ?? [];
        for (const depId of deps) {
            const dep = await this.store.get(depId);
            if (dep && dep.status !== 'COMPLETED') {
                this.eventBus.emit('agent.dispatch_blocked', { taskId, blockedBy: [depId] });
                logger.warn({ taskId, blockedBy: depId }, 'Task blocked by dependency');
            }
        }
    }
}
//# sourceMappingURL=AgentDispatcher.js.map