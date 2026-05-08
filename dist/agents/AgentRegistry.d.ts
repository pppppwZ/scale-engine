import type { AgentProfile, AgentDomain } from './types.js';
export interface IAgentRegistry {
    register(profile: AgentProfile): void;
    get(id: string): AgentProfile | undefined;
    getByDomain(domain: AgentDomain): AgentProfile[];
    getByRole(role: string): AgentProfile[];
    list(): string[];
    getAll(): AgentProfile[];
}
export declare class AgentRegistry implements IAgentRegistry {
    private profiles;
    constructor(initialProfiles?: AgentProfile[]);
    register(profile: AgentProfile): void;
    get(id: string): AgentProfile | undefined;
    getByDomain(domain: AgentDomain): AgentProfile[];
    getByRole(role: string): AgentProfile[];
    list(): string[];
    getAll(): AgentProfile[];
}
export declare const DEFAULT_REGISTRY: AgentRegistry;
