// SCALE Engine — Agent Channel (v0.8.0)
// Agent 通信管道：消息发送/接收/广播/订阅
// ============================================================================
// AgentChannel 实现
// ============================================================================
export class AgentChannel {
    constructor(eventBus) {
        this.subscriptions = new Map(); // agentId -> subscribed channels
        this.messageQueue = new Map(); // agentId -> pending messages
        this.seq = 0;
        this.eventBus = eventBus;
    }
    // ========== 消息发送 ==========
    /** 发送消息 */
    send(from, to, type, payload) {
        const message = {
            id: `MSG-${Date.now()}-${++this.seq}`,
            from,
            to,
            type,
            payload,
            timestamp: Date.now()
        };
        if (to === 'broadcast') {
            // 广播给所有订阅者
            this.broadcastInternal(from, message);
        }
        else {
            // 发送给特定 Agent
            this.deliver(to, message);
        }
        if (this.eventBus) {
            this.eventBus.emit('agent.message_sent', { messageId: message.id, from, to, type }, {});
        }
        return message;
    }
    /** 广播消息 */
    broadcast(from, type, payload) {
        const message = this.send(from, 'broadcast', type, payload);
        // 返回所有接收者的消息
        const recipients = this.getSubscribers(from);
        return recipients.map(r => ({
            ...message,
            id: `${message.id}-${r}`,
            to: r
        }));
    }
    // ========== 消息接收 ==========
    /** 接收消息（取出所有待处理消息） */
    receive(agentId) {
        const messages = this.messageQueue.get(agentId) ?? [];
        this.messageQueue.set(agentId, []);
        return messages;
    }
    /** 获取待处理消息数量 */
    getPendingCount(agentId) {
        return this.messageQueue.get(agentId)?.length ?? 0;
    }
    /** 查看最新消息（不移除） */
    peekLatest(agentId) {
        const messages = this.messageQueue.get(agentId);
        if (!messages || messages.length === 0)
            return null;
        return messages[messages.length - 1];
    }
    // ========== 订阅管理 ==========
    /** 订阅频道 */
    subscribe(agentId, channel) {
        if (!this.subscriptions.has(agentId)) {
            this.subscriptions.set(agentId, new Set());
        }
        this.subscriptions.get(agentId).add(channel);
        if (this.eventBus) {
            this.eventBus.emit('agent.subscribed', { agentId, channel }, {});
        }
    }
    /** 取消订阅 */
    unsubscribe(agentId, channel) {
        const channels = this.subscriptions.get(agentId);
        if (channels) {
            channels.delete(channel);
            if (channels.size === 0) {
                this.subscriptions.delete(agentId);
            }
        }
    }
    /** 获取订阅者列表 */
    getSubscribers(channel) {
        const subscribers = [];
        for (const [agentId, channels] of this.subscriptions) {
            if (channels.has(channel)) {
                subscribers.push(agentId);
            }
        }
        return subscribers;
    }
    // ========== 消息过滤 ==========
    /** 按类型过滤消息 */
    filterByType(agentId, type) {
        const messages = this.messageQueue.get(agentId) ?? [];
        const filtered = messages.filter(m => m.type === type);
        // 从队列中移除已过滤的消息
        const remaining = messages.filter(m => m.type !== type);
        this.messageQueue.set(agentId, remaining);
        return filtered;
    }
    /** 按发送者过滤消息 */
    filterBySender(agentId, from) {
        const messages = this.messageQueue.get(agentId) ?? [];
        const filtered = messages.filter(m => m.from === from);
        const remaining = messages.filter(m => m.from !== from);
        this.messageQueue.set(agentId, remaining);
        return filtered;
    }
    // ========== Private Methods ==========
    /** 投递消息 */
    deliver(agentId, message) {
        if (!this.messageQueue.has(agentId)) {
            this.messageQueue.set(agentId, []);
        }
        this.messageQueue.get(agentId).push(message);
    }
    /** 内部广播 */
    broadcastInternal(from, message) {
        const subscribers = this.getSubscribers(from);
        for (const agentId of subscribers) {
            // 排除发送者自己
            if (agentId !== from) {
                this.deliver(agentId, message);
            }
        }
    }
}
/** 默认 Channel 实例 */
export const defaultAgentChannel = new AgentChannel();
//# sourceMappingURL=AgentChannel.js.map