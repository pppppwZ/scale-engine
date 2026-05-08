// SCALE Engine — Knowledge Base (W7 完整实现 + v0.7.2 TF-IDF)
// 设计参考：docs/03-CORE-MODULES.md §3.4
// Phase 3 增强：TF-IDF 文本相似度计算
export class KnowledgeBase {
    constructor(eventBus) {
        this.eventBus = eventBus;
        this.entries = new Map();
        this.seq = 0;
        // TF-IDF cache
        this.documentFrequencies = new Map();
        this.totalDocuments = 0;
    }
    async add(input) {
        const entry = {
            ...input,
            id: this.generateId(),
            createdAt: Date.now(),
            accessCount: 0,
            relevance: 0.5,
        };
        this.entries.set(entry.id, entry);
        this.eventBus.emit('lesson.proposed', { lessonId: entry.id }, { artifactId: input.sourceArtifact });
        return entry;
    }
    async recall(query) {
        let results = Array.from(this.entries.values());
        if (query.type) {
            const types = Array.isArray(query.type) ? query.type : [query.type];
            results = results.filter((e) => types.includes(e.type));
        }
        if (query.tags)
            results = results.filter((e) => query.tags.every((t) => e.tags.includes(t)));
        if (query.minRelevance)
            results = results.filter((e) => e.relevance >= query.minRelevance);
        if (query.verifiedOnly)
            results = results.filter((e) => e.verified);
        results.sort((a, b) => b.relevance - a.relevance);
        return results.slice(0, query.limit ?? 10);
    }
    async recallByVector(text, topK) {
        // v0.7.2: TF-IDF implementation (Phase 3 enhancement)
        const queryTerms = this.tokenize(text);
        if (queryTerms.length === 0)
            return this.recall({ verifiedOnly: true, limit: topK });
        const scored = [];
        for (const entry of this.entries.values()) {
            // Use title + tags for document representation (contentRef is file path)
            const docText = `${entry.title} ${entry.tags.join(' ')}`;
            const docTerms = this.tokenize(docText);
            const score = this.cosineSimilarity(queryTerms, docTerms);
            if (score > 0)
                scored.push({ entry, score });
        }
        // Fallback to verified recall if no TF-IDF matches
        if (scored.length === 0)
            return this.recall({ verifiedOnly: true, limit: topK });
        // Sort by TF-IDF similarity, then by relevance as tiebreaker
        scored.sort((a, b) => b.score - a.score || b.entry.relevance - a.entry.relevance);
        return scored.slice(0, topK).map(s => s.entry);
    }
    // ============================================================================
    // TF-IDF Helper Methods (Phase 3)
    // ============================================================================
    /**
     * Tokenize text into lowercase terms (simple word splitting)
     */
    tokenize(text) {
        return text
            .toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .split(/\s+/)
            .filter(t => t.length > 2); // Skip short terms
    }
    /**
     * Calculate term frequency (TF) for a term in a document
     */
    termFrequency(term, docTerms) {
        const count = docTerms.filter(t => t === term).length;
        return count / docTerms.length;
    }
    /**
     * Calculate inverse document frequency (IDF) for a term
     */
    inverseDocumentFrequency(term) {
        // Update document frequencies if needed
        if (this.documentFrequencies.size === 0 || this.totalDocuments !== this.entries.size) {
            this.rebuildDocumentFrequencies();
        }
        const df = this.documentFrequencies.get(term) ?? 0;
        if (df === 0)
            return 0;
        return Math.log(this.totalDocuments / df);
    }
    /**
     * Rebuild document frequency cache
     */
    rebuildDocumentFrequencies() {
        this.documentFrequencies.clear();
        this.totalDocuments = this.entries.size;
        for (const entry of this.entries.values()) {
            // Use title + tags for document representation (contentRef is file path)
            const docText = `${entry.title} ${entry.tags.join(' ')}`;
            const terms = new Set(this.tokenize(docText));
            for (const term of terms) {
                this.documentFrequencies.set(term, (this.documentFrequencies.get(term) ?? 0) + 1);
            }
        }
    }
    /**
     * Calculate TF-IDF vector for a document
     */
    tfidfVector(terms) {
        const tfidf = new Map();
        const uniqueTerms = new Set(terms);
        for (const term of uniqueTerms) {
            const tf = this.termFrequency(term, terms);
            const idf = this.inverseDocumentFrequency(term);
            if (tf * idf > 0)
                tfidf.set(term, tf * idf);
        }
        return tfidf;
    }
    /**
     * Calculate cosine similarity between two term sets
     */
    cosineSimilarity(queryTerms, docTerms) {
        const queryVec = this.tfidfVector(queryTerms);
        const docVec = this.tfidfVector(docTerms);
        if (queryVec.size === 0 || docVec.size === 0)
            return 0;
        // Dot product
        let dot = 0;
        for (const [term, weight] of queryVec) {
            if (docVec.has(term))
                dot += weight * docVec.get(term);
        }
        // Magnitudes
        const queryMag = Math.sqrt(Array.from(queryVec.values()).reduce((s, w) => s + w * w, 0));
        const docMag = Math.sqrt(Array.from(docVec.values()).reduce((s, w) => s + w * w, 0));
        if (queryMag === 0 || docMag === 0)
            return 0;
        return dot / (queryMag * docMag);
    }
    async markHelpful(id, sessionId) {
        const entry = this.entries.get(id);
        if (entry) {
            entry.relevance = Math.min(1, entry.relevance + 0.05);
            entry.accessCount += 1;
            entry.lastAccessed = Date.now();
            this.eventBus.emit('lesson.helpful', { lessonId: id }, { sessionId });
        }
    }
    async markUseless(id, sessionId) {
        const entry = this.entries.get(id);
        if (entry) {
            entry.relevance = Math.max(0.05, entry.relevance - 0.1);
            this.eventBus.emit('lesson.useless', { lessonId: id }, { sessionId });
        }
    }
    async verify(id, verifiedBy) {
        const entry = this.entries.get(id);
        if (entry) {
            entry.verified = true;
            entry.verifiedBy = verifiedBy;
            entry.verifiedAt = Date.now();
            this.eventBus.emit('lesson.approved', { lessonId: id, verifiedBy });
        }
    }
    async decay() {
        const DAY = 24 * 60 * 60 * 1000;
        for (const entry of this.entries.values()) {
            const days = entry.lastAccessed ? (Date.now() - entry.lastAccessed) / DAY : 90;
            const recency = Math.exp(-days / 30);
            entry.relevance = Math.max(0.05, entry.relevance * 0.95 + recency * 0.05);
        }
    }
    generateId() {
        this.seq = (this.seq + 1) % 10000;
        return `KB-${Date.now()}-${this.seq.toString().padStart(4, '0')}`;
    }
}
//# sourceMappingURL=KnowledgeBase.js.map