// SCALE Engine — Pattern Extractor (Positive Learning)
// Purpose: Extract successful patterns from completed artifacts
import { logger } from '../core/logger.js';
export class PatternExtractor {
    constructor(store, kb, eventBus) {
        this.store = store;
        this.kb = kb;
        this.eventBus = eventBus;
        this.patterns = new Map();
        this.seq = 0;
    }
    async extractFromArtifact(artifactId) {
        const artifact = await this.store.get(artifactId);
        if (!artifact)
            return null;
        if (artifact.status !== 'DONE') {
            logger.debug({ artifactId, status: artifact.status }, 'Artifact not DONE');
            return null;
        }
        const payload = artifact.payload;
        const transitions = payload.transitions;
        if (!transitions || transitions.length < 2)
            return null;
        const retries = payload.transitionRetries;
        if (retries && retries > 0)
            return null;
        const pattern = this.buildPattern(artifact, transitions);
        this.patterns.set(pattern.id, pattern);
        await this.kb.add({
            type: 'pattern',
            title: pattern.name,
            tags: [...pattern.contexts, 'positive-learning'],
            contentRef: 'patterns/' + pattern.id + '.md',
            verified: false,
            sourceArtifact: artifactId,
        });
        this.eventBus.emit('pattern.extracted', { patternId: pattern.id, artifactId });
        logger.info({ patternId: pattern.id, artifactId }, 'Pattern extracted');
        return pattern;
    }
    async extractFromSession(sessionId) {
        const artifacts = await this.store.query({});
        const sessionArtifacts = artifacts.filter(a => a.payload.sessionId === sessionId);
        const patterns = [];
        for (const a of sessionArtifacts.filter(a => a.status === 'DONE')) {
            const p = await this.extractFromArtifact(a.id);
            if (p)
                patterns.push(p);
        }
        return patterns;
    }
    async validatePattern(pattern) {
        const artifacts = await this.store.query({});
        const similar = artifacts.filter(a => a.status === 'DONE' && a.type === pattern.contexts[0]);
        pattern.successRate = similar.length > 0 ? similar.length / artifacts.length : 0;
        pattern.verified = pattern.successRate >= 0.7;
        if (pattern.verified) {
            this.eventBus.emit('pattern.verified', { patternId: pattern.id, successRate: pattern.successRate });
        }
        return pattern.verified;
    }
    getPatterns() { return Array.from(this.patterns.values()); }
    buildPattern(artifact, transitions) {
        const steps = transitions.map((t, i) => ({
            order: i + 1,
            action: t.action,
            expectedOutcome: 'Transition ' + t.from + ' to ' + t.to,
            toolsUsed: [],
        }));
        return {
            id: 'PATTERN-' + Date.now() + '-' + (++this.seq).toString().padStart(3, '0'),
            name: artifact.type + ' Workflow',
            description: 'Extracted from: ' + artifact.title,
            contexts: [artifact.type],
            steps,
            successRate: 1.0,
            extractedFrom: [artifact.id],
            createdAt: Date.now(),
            verified: false,
        };
    }
}
//# sourceMappingURL=PatternExtractor.js.map