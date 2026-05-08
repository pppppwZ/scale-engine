// SCALE Engine — Event Bus
// 系统的"神经系统"。所有模块通过它解耦。
// 内存 pub/sub + JSONL 持久化 + 重放能力。
// 设计参考：docs/03-CORE-MODULES.md §3.1
import { logger } from './logger.js';
import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
export class EventBus {
    constructor(opts = {}) {
        this.handlers = new Map();
        this.middlewares = [];
        this.memoryRing = [];
        this.maxRingSize = 1000;
        this.seq = 0;
        this.eventsDir = opts.eventsDir ?? '.scale/events';
        if (!existsSync(this.eventsDir))
            mkdirSync(this.eventsDir, { recursive: true });
    }
    on(type, handler) {
        if (!this.handlers.has(type))
            this.handlers.set(type, new Set());
        const handlers = this.handlers.get(type);
        handlers.add(handler);
        return { unsubscribe: () => { handlers.delete(handler); if (handlers.size === 0)
                this.handlers.delete(type); } };
    }
    once(type, handler) {
        const sub = this.on(type, (e) => { sub.unsubscribe(); handler(e); });
    }
    use(mw) { this.middlewares.push(mw); }
    emit(type, payload, opts = {}) {
        const event = Object.freeze({
            id: this.generateId(),
            type, timestamp: Date.now(),
            sessionId: opts.sessionId ?? 'system',
            actor: opts.actor ?? { kind: 'system', component: 'EventBus' },
            artifactId: opts.artifactId, payload,
            causedBy: opts.causedBy, correlationId: opts.correlationId,
        });
        let processed = event;
        for (const mw of this.middlewares) {
            processed = mw(processed);
            if (!processed)
                return event;
        }
        this.persist(processed);
        this.pushToRing(processed);
        this.dispatchAsync(processed);
        return processed;
    }
    async emitAsync(type, payload, opts) {
        const event = this.emit(type, payload, opts);
        await this.dispatchSync(event);
        return event;
    }
    async replay(filter, handler) {
        for (const file of this.getEventFiles(filter)) {
            const lines = readFileSync(file, 'utf-8').split('\n').filter(Boolean);
            for (const line of lines) {
                try {
                    const event = JSON.parse(line);
                    if (this.matchesFilter(event, filter))
                        await handler(event);
                }
                catch (e) {
                    logger.warn({ file, error: e.message }, 'Failed to parse event');
                }
            }
        }
    }
    async query(filter) {
        const results = [];
        const limit = filter.limit ?? 1000;
        for (let i = this.memoryRing.length - 1; i >= 0; i--) {
            const event = this.memoryRing[i];
            if (this.matchesFilter(event, filter) && (!filter.filter || filter.filter(event))) {
                results.push(event);
                if (results.length >= limit)
                    return results;
            }
        }
        if (results.length < limit) {
            await this.replay(filter, (event) => {
                if (results.length >= limit)
                    return;
                if (!filter.filter || filter.filter(event)) {
                    if (!results.find((r) => r.id === event.id))
                        results.push(event);
                }
            });
        }
        return results.slice(0, limit);
    }
    async flush() { }
    generateId() {
        this.seq = (this.seq + 1) % 100000;
        return `EVT-${Date.now()}-${this.seq.toString().padStart(5, '0')}`;
    }
    persist(event) {
        const date = new Date(event.timestamp).toISOString().slice(0, 10);
        const file = join(this.eventsDir, `${date}.jsonl`);
        try {
            appendFileSync(file, JSON.stringify(event) + '\n', 'utf-8');
        }
        catch (e) {
            logger.error({ event: event.id, error: e.message }, 'Failed to persist event');
        }
    }
    pushToRing(event) {
        this.memoryRing.push(event);
        if (this.memoryRing.length > this.maxRingSize)
            this.memoryRing.shift();
    }
    dispatchAsync(event) { setImmediate(() => this.dispatchSync(event)); }
    async dispatchSync(event) {
        const handlers = [...(this.handlers.get(event.type) ?? []), ...(this.handlers.get('*') ?? [])];
        for (const handler of handlers) {
            try {
                await handler(event);
            }
            catch (e) {
                logger.error({ event: event.id, type: event.type, error: e.message }, 'Event handler threw');
            }
        }
    }
    getEventFiles(filter) {
        if (!existsSync(this.eventsDir))
            return [];
        const all = readdirSync(this.eventsDir).filter((f) => f.endsWith('.jsonl')).sort();
        if (!filter.fromTimestamp && !filter.toTimestamp)
            return all.map((f) => join(this.eventsDir, f));
        return all.filter((f) => {
            const date = f.replace('.jsonl', '');
            const fileStart = new Date(date).getTime();
            const fileEnd = fileStart + 24 * 60 * 60 * 1000;
            if (filter.fromTimestamp && fileEnd < filter.fromTimestamp)
                return false;
            if (filter.toTimestamp && fileStart > filter.toTimestamp)
                return false;
            return true;
        }).map((f) => join(this.eventsDir, f));
    }
    matchesFilter(event, filter) {
        if (filter.fromTimestamp && event.timestamp < filter.fromTimestamp)
            return false;
        if (filter.toTimestamp && event.timestamp > filter.toTimestamp)
            return false;
        if (filter.types && !filter.types.includes(event.type))
            return false;
        if (filter.sessionId && event.sessionId !== filter.sessionId)
            return false;
        if (filter.artifactId && event.artifactId !== filter.artifactId)
            return false;
        return true;
    }
}
//# sourceMappingURL=eventBus.js.map