import type { KnowledgeEntry, KnowledgeQuery } from '../artifact/types.js';
import type { IEventBus } from '../core/eventBus.js';
export interface IKnowledgeBase {
    add(entry: Omit<KnowledgeEntry, 'id' | 'createdAt' | 'accessCount' | 'relevance'>): Promise<KnowledgeEntry>;
    recall(query: KnowledgeQuery): Promise<KnowledgeEntry[]>;
    recallByVector(text: string, topK: number): Promise<KnowledgeEntry[]>;
    markHelpful(id: string, sessionId: string): Promise<void>;
    markUseless(id: string, sessionId: string): Promise<void>;
    verify(id: string, verifiedBy: string): Promise<void>;
    decay(): Promise<void>;
}
export declare class KnowledgeBase implements IKnowledgeBase {
    private eventBus;
    private entries;
    private seq;
    private documentFrequencies;
    private totalDocuments;
    constructor(eventBus: IEventBus);
    add(input: Omit<KnowledgeEntry, 'id' | 'createdAt' | 'accessCount' | 'relevance'>): Promise<KnowledgeEntry>;
    recall(query: KnowledgeQuery): Promise<KnowledgeEntry[]>;
    recallByVector(text: string, topK: number): Promise<KnowledgeEntry[]>;
    /**
     * Tokenize text into lowercase terms (simple word splitting)
     */
    private tokenize;
    /**
     * Calculate term frequency (TF) for a term in a document
     */
    private termFrequency;
    /**
     * Calculate inverse document frequency (IDF) for a term
     */
    private inverseDocumentFrequency;
    /**
     * Rebuild document frequency cache
     */
    private rebuildDocumentFrequencies;
    /**
     * Calculate TF-IDF vector for a document
     */
    private tfidfVector;
    /**
     * Calculate cosine similarity between two term sets
     */
    private cosineSimilarity;
    markHelpful(id: string, sessionId: string): Promise<void>;
    markUseless(id: string, sessionId: string): Promise<void>;
    verify(id: string, verifiedBy: string): Promise<void>;
    decay(): Promise<void>;
    private generateId;
}
