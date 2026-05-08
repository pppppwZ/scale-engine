import type { IAgentManager, IAgent, AgentDefinition, AgentTaskContext, AgentResult } from './IAgent.js';
import { AGENT_MANAGER_TOKEN } from './IAgent.js';
export declare class AgentManager implements IAgentManager {
    private agents;
    private definitions;
    register(definition: AgentDefinition, implementation?: IAgent): void;
    findBestAgent(userInput: string): AgentDefinition | null;
    dispatch(context: AgentTaskContext): Promise<AgentResult>;
    listAll(): AgentDefinition[];
    getById(id: string): IAgent | undefined;
    hasHandler(userInput: string): boolean;
}
export declare function initializeAgentManager(): AgentManager;
export { AGENT_MANAGER_TOKEN };
