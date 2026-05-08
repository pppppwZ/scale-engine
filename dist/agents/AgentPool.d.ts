import type { ArtifactId } from '../artifact/types.js';
import type { IEventBus } from '../core/eventBus.js';
import type { AgentRuntime, AgentStatus, AgentResult } from './types.js';
import { AgentProfileRegistry } from './profiles.js';
import type { IModelRouter } from '../routing/ModelRouter.js';
export interface IAgentPool {
    spawn(profileId: string): AgentRuntime;
    getIdleAgents(profileId?: string): AgentRuntime[];
    getAgent(agentId: string): AgentRuntime | undefined;
    assignTask(agentId: string, taskId: ArtifactId): void;
    complete(agentId: string, outputArtifacts: ArtifactId[]): void;
    fail(agentId: string, reason: string): void;
    block(agentId: string, blockedBy: string[]): void;
    unblock(agentId: string): void;
    recycle(agentId: string): void;
    getStatus(agentId: string): AgentStatus | null;
    listAll(): AgentRuntime[];
    getActiveCount(): number;
}
export declare class AgentPool implements IAgentPool {
    private agents;
    private seq;
    private registry;
    private modelRouter?;
    private eventBus?;
    constructor(registry?: AgentProfileRegistry, modelRouter?: IModelRouter, eventBus?: IEventBus);
    /** 创建 Agent 实例 */
    spawn(profileId: string): AgentRuntime;
    /** 获取空闲 Agent */
    getIdleAgents(profileId?: string): AgentRuntime[];
    /** 获取 Agent */
    getAgent(agentId: string): AgentRuntime | undefined;
    /** 分配任务 */
    assignTask(agentId: string, taskId: ArtifactId): void;
    /** 完成任务 */
    complete(agentId: string, outputArtifacts: ArtifactId[]): void;
    /** 任务失败 */
    fail(agentId: string, reason: string): void;
    /** 阻塞 Agent */
    block(agentId: string, blockedBy: string[]): void;
    /** 解除阻塞 */
    unblock(agentId: string): void;
    /** 回收 Agent */
    recycle(agentId: string): void;
    /** 批量回收已完成的 Agent */
    recycleCompleted(): string[];
    /** 获取状态 */
    getStatus(agentId: string): AgentStatus | null;
    /** 获取所有 Agent */
    listAll(): AgentRuntime[];
    /** 获取活跃 Agent 数量 */
    getActiveCount(): number;
    /** 获取 Agent 执行结果 */
    getResult(agentId: string): AgentResult | null;
    /** 解析模型配置 */
    private resolveModel;
}
/** 默认 Pool 实例 */
export declare const defaultAgentPool: AgentPool;
