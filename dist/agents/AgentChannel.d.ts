import type { IEventBus } from '../core/eventBus.js';
import type { AgentMessage, MessageType } from './types.js';
export interface IAgentChannel {
    send(from: string, to: string | 'broadcast', type: MessageType, payload: unknown): AgentMessage;
    receive(agentId: string): AgentMessage[];
    subscribe(agentId: string, channel: string): void;
    unsubscribe(agentId: string, channel: string): void;
    getPendingCount(agentId: string): number;
    broadcast(from: string, type: MessageType, payload: unknown): AgentMessage[];
}
export declare class AgentChannel implements IAgentChannel {
    private subscriptions;
    private messageQueue;
    private seq;
    private eventBus?;
    constructor(eventBus?: IEventBus);
    /** 发送消息 */
    send(from: string, to: string | 'broadcast', type: MessageType, payload: unknown): AgentMessage;
    /** 广播消息 */
    broadcast(from: string, type: MessageType, payload: unknown): AgentMessage[];
    /** 接收消息（取出所有待处理消息） */
    receive(agentId: string): AgentMessage[];
    /** 获取待处理消息数量 */
    getPendingCount(agentId: string): number;
    /** 查看最新消息（不移除） */
    peekLatest(agentId: string): AgentMessage | null;
    /** 订阅频道 */
    subscribe(agentId: string, channel: string): void;
    /** 取消订阅 */
    unsubscribe(agentId: string, channel: string): void;
    /** 获取订阅者列表 */
    getSubscribers(channel: string): string[];
    /** 按类型过滤消息 */
    filterByType(agentId: string, type: MessageType): AgentMessage[];
    /** 按发送者过滤消息 */
    filterBySender(agentId: string, from: string): AgentMessage[];
    /** 投递消息 */
    private deliver;
    /** 内部广播 */
    private broadcastInternal;
}
/** 默认 Channel 实例 */
export declare const defaultAgentChannel: AgentChannel;
