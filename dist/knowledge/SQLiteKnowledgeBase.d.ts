import type { KnowledgeEntry, KnowledgeQuery } from '../artifact/types.js';
import type { IEventBus } from '../core/eventBus.js';
import type { IKnowledgeBase } from './KnowledgeBase.js';
export declare class SQLiteKnowledgeBase implements IKnowledgeBase {
    private eventBus;
    private db;
    private seq;
    constructor(eventBus: IEventBus, opts?: {
        dbPath?: string;
    });
    add(input: Omit<KnowledgeEntry, 'id' | 'createdAt' | 'accessCount' | 'relevance'>): Promise<KnowledgeEntry>;
    recall(query: KnowledgeQuery): Promise<KnowledgeEntry[]>;
    recallByVector(text: string, topK: number): Promise<KnowledgeEntry[]>;
    markHelpful(id: string, sessionId: string): Promise<void>;
    markUseless(id: string, sessionId: string): Promise<void>;
    verify(id: string, verifiedBy: string): Promise<void>;
    decay(): Promise<void>;
    /** Close database connection */
    close(): void;
    /** Get stats */
    stats(): {
        entryCount: number;
        verifiedCount: number;
        byType: Record<string, number>;
    };
    private generateId;
    private fromRow;
}
