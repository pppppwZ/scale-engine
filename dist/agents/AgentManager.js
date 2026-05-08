// SCALE Engine — Agent Manager
// Purpose: Central registry and dispatcher for subagents
import { AGENT_MANAGER_TOKEN } from './IAgent.js';
import { container } from '../core/container.js';
import { logger } from '../core/logger.js';
class DefaultAgent {
    constructor(definition) {
        this.definition = definition;
    }
    canHandle(userInput) {
        const lower = userInput.toLowerCase();
        return this.definition.triggers.some((t) => lower.includes(t.toLowerCase()));
    }
    getConfidence(userInput) {
        const lower = userInput.toLowerCase();
        let matches = 0;
        for (const trigger of this.definition.triggers) {
            if (lower.includes(trigger.toLowerCase()))
                matches++;
        }
        return Math.min(matches / this.definition.triggers.length, 1);
    }
    async execute(context) {
        const start = Date.now();
        logger.info('Agent ' + this.definition.id + ' executing: ' + context.userInput.slice(0, 50));
        return {
            success: true,
            output: 'Agent ' + this.definition.name + ' processed task',
            durationMs: Date.now() - start,
            modelUsed: this.definition.modelPreference,
        };
    }
}
export class AgentManager {
    constructor() {
        this.agents = new Map();
        this.definitions = new Map();
    }
    register(definition, implementation) {
        const agent = implementation ?? new DefaultAgent(definition);
        this.agents.set(definition.id, agent);
        this.definitions.set(definition.id, definition);
        logger.debug('Registered agent: ' + definition.id + ' (' + definition.name + ')');
    }
    findBestAgent(userInput) {
        const candidates = [];
        for (const def of this.definitions.values()) {
            const agent = this.agents.get(def.id);
            if (!agent)
                continue;
            if (agent.canHandle(userInput)) {
                candidates.push({ def, confidence: agent.getConfidence(userInput) });
            }
        }
        if (candidates.length === 0)
            return null;
        candidates.sort((a, b) => {
            if (a.def.priority !== b.def.priority)
                return b.def.priority - a.def.priority;
            return b.confidence - a.confidence;
        });
        return candidates[0].def;
    }
    async dispatch(context) {
        const best = this.findBestAgent(context.userInput);
        if (!best) {
            return { success: false, error: 'No agent available', durationMs: 0, modelUsed: 'none' };
        }
        const agent = this.agents.get(best.id);
        if (!agent) {
            return { success: false, error: 'Agent ' + best.id + ' not registered', durationMs: 0, modelUsed: 'none' };
        }
        return agent.execute(context);
    }
    listAll() { return Array.from(this.definitions.values()); }
    getById(id) { return this.agents.get(id); }
    hasHandler(userInput) { return this.findBestAgent(userInput) !== null; }
}
export function initializeAgentManager() {
    const manager = new AgentManager();
    container.registerInstance(AGENT_MANAGER_TOKEN, manager);
    return manager;
}
export { AGENT_MANAGER_TOKEN };
//# sourceMappingURL=AgentManager.js.map