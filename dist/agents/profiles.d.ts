import type { AgentProfile } from './types.js';
export declare const PROFESSIONAL_AGENTS: AgentProfile[];
export declare class AgentProfileRegistry {
    private profiles;
    constructor();
    /** 获取 Profile */
    get(id: string): AgentProfile | undefined;
    /** 获取所有 Profiles */
    listAll(): AgentProfile[];
    /** 按 Domain 筛选 */
    findByDomain(domain: string): AgentProfile[];
    /** 按能力标签筛选 */
    findByCapability(capability: string): AgentProfile[];
    /** 注册自定义 Profile */
    register(profile: AgentProfile): void;
}
/** 默认 Registry 实例 */
export declare const defaultProfileRegistry: AgentProfileRegistry;
/** 获取单个 Profile */
export declare function getProfile(id: string): AgentProfile | undefined;
/** 按 Domain 获取 Profiles */
export declare function getProfilesByDomain(domain: string): AgentProfile[];
/** 按 Role 获取 Profiles */
export declare function getProfilesByRole(role: string): AgentProfile[];
/** 列出所有 Profile IDs */
export declare function listProfiles(): string[];
