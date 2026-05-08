import type { Event, EventType, EventId, Actor, ArtifactId, SessionId, Timestamp } from '../artifact/types.js';
export type EventHandler<T = unknown> = (event: Event<T>) => void | Promise<void>;
export interface Subscription {
    unsubscribe(): void;
}
export interface EmitOptions {
    sessionId?: SessionId;
    actor?: Actor;
    artifactId?: ArtifactId;
    causedBy?: EventId;
    correlationId?: string;
}
export interface ReplayFilter {
    fromTimestamp?: Timestamp;
    toTimestamp?: Timestamp;
    types?: EventType[];
    sessionId?: SessionId;
    artifactId?: ArtifactId;
}
export interface QueryFilter extends ReplayFilter {
    limit?: number;
    filter?: (event: Event) => boolean;
}
export type EventMiddleware = (event: Event) => Event | null;
export interface IEventBus {
    on<T = unknown>(type: EventType | '*', handler: EventHandler<T>): Subscription;
    once<T = unknown>(type: EventType, handler: EventHandler<T>): void;
    emit<T = unknown>(type: EventType, payload: T, opts?: EmitOptions): Event<T>;
    emitAsync<T = unknown>(type: EventType, payload: T, opts?: EmitOptions): Promise<Event<T>>;
    use(middleware: EventMiddleware): void;
    replay(filter: ReplayFilter, handler: EventHandler): Promise<void>;
    query(filter: QueryFilter): Promise<Event[]>;
    flush(): Promise<void>;
}
export declare class EventBus implements IEventBus {
    private handlers;
    private middlewares;
    private memoryRing;
    private maxRingSize;
    private seq;
    private eventsDir;
    constructor(opts?: {
        eventsDir?: string;
    });
    on<T>(type: EventType | '*', handler: EventHandler<T>): Subscription;
    once<T>(type: EventType, handler: EventHandler<T>): void;
    use(mw: EventMiddleware): void;
    emit<T>(type: EventType, payload: T, opts?: EmitOptions): Event<T>;
    emitAsync<T>(type: EventType, payload: T, opts?: EmitOptions): Promise<Event<T>>;
    replay(filter: ReplayFilter, handler: EventHandler): Promise<void>;
    query(filter: QueryFilter): Promise<Event[]>;
    flush(): Promise<void>;
    private generateId;
    private persist;
    private pushToRing;
    private dispatchAsync;
    private dispatchSync;
    private getEventFiles;
    private matchesFilter;
}
