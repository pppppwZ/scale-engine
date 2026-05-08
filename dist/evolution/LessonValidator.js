// SCALE Engine — Lesson Validator (v0.7.0)
// Lesson 提取验证：Googleability、Context-Specific、Non-Duplicate
import { logger } from '../core/logger.js';
export class LessonValidator {
    constructor(eventBus, kb, opts = {}) {
        this.eventBus = eventBus;
        this.kb = kb ?? null;
        this.minGoogleabilityScore = opts.minGoogleabilityScore ?? 0.3;
        this.maxDuplicateSimilarity = opts.maxDuplicateSimilarity ?? 0.8;
    }
    async validate(entry) {
        const gateResults = [];
        // Gate 1: Trigger Check (already done by LessonExtractor)
        const triggerGate = {
            gateName: 'trigger',
            passed: true,
            score: 1.0,
            details: 'Defect passed trigger conditions',
        };
        gateResults.push(triggerGate);
        // Gate 2: Googleability (not easily searchable)
        const googleabilityGate = await this.checkGoogleability(entry.title);
        gateResults.push(googleabilityGate);
        // Gate 3: Context-Specific (references specific artifacts)
        const contextGate = await this.checkContextSpecific(entry);
        gateResults.push(contextGate);
        // Gate 4: Deduplication
        const duplicateGate = await this.checkDuplicate(entry.title, entry.contentRef);
        gateResults.push(duplicateGate);
        // Calculate overall score
        const totalScore = gateResults.reduce((sum, g) => sum + g.score, 0) / gateResults.length;
        const allPassed = gateResults.every(g => g.passed);
        const result = {
            valid: allPassed,
            gateResults,
            overallScore: totalScore,
            reason: allPassed ? undefined : 'Failed gates: ' + gateResults.filter(g => !g.passed).map(g => g.gateName).join(', '),
        };
        this.eventBus.emit('lesson.validated', {
            title: entry.title,
            valid: result.valid,
            score: result.overallScore,
            gates: gateResults,
        });
        logger.info({ title: entry.title, valid: result.valid, score: totalScore }, 'Lesson validated');
        return result;
    }
    async checkGoogleability(title) {
        // Simulate googleability check (in production, would call actual search API)
        // High googleability = easily found on Google = not unique enough
        // We want lessons that are NOT easily googleable (context-specific)
        // Placeholder implementation: check for generic terms
        const genericTerms = [
            'error', 'bug', 'fix', 'issue', 'how to', 'tutorial',
            'guide', 'documentation', 'reference', 'api', 'example',
        ];
        const titleLower = title.toLowerCase();
        const hasGenericTerm = genericTerms.some(t => titleLower.includes(t));
        // If title has many generic terms, it's probably googleable (bad)
        // We want titles that are specific enough that you can't just Google them
        const score = hasGenericTerm ? 0.2 : 0.8;
        const passed = score >= this.minGoogleabilityScore;
        return {
            gateName: 'googleability',
            passed,
            score,
            details: passed
                ? 'Title is context-specific, not easily googleable'
                : 'Title contains generic terms, likely googleable',
        };
    }
    async checkContextSpecific(entry) {
        // Check if lesson references specific context (artifact, project, specific code)
        const hasSourceArtifact = entry.sourceArtifact !== undefined;
        const hasTags = entry.tags.length > 0;
        // Check content for context markers
        const contentRef = entry.contentRef.toLowerCase();
        const hasContextMarkers = /art-|spec-|plan-|task-|defect-/.test(contentRef);
        const score = (hasSourceArtifact ? 0.4 : 0) + (hasTags ? 0.3 : 0) + (hasContextMarkers ? 0.3 : 0);
        const passed = score >= 0.5;
        return {
            gateName: 'context_specific',
            passed,
            score,
            details: passed
                ? 'Lesson has context markers (artifact refs, tags)'
                : 'Lesson lacks specific context references',
        };
    }
    async checkDuplicate(title, _contentRef) {
        if (!this.kb) {
            return {
                gateName: 'deduplication',
                passed: true,
                score: 1.0,
                details: 'No KB available for deduplication check',
            };
        }
        // Check for similar lessons in KB
        const existing = await this.kb.recall({
            tags: [],
            limit: 100,
        });
        // Simple title similarity check
        const titleLower = title.toLowerCase();
        let maxSimilarity = 0;
        for (const entry of existing) {
            const existingTitle = entry.title.toLowerCase();
            const similarity = this.calculateSimilarity(titleLower, existingTitle);
            maxSimilarity = Math.max(maxSimilarity, similarity);
        }
        const passed = maxSimilarity < this.maxDuplicateSimilarity;
        const score = 1 - maxSimilarity;
        return {
            gateName: 'deduplication',
            passed,
            score,
            details: passed
                ? 'No similar lesson found (max similarity: ' + maxSimilarity.toFixed(2) + ')'
                : 'Similar lesson exists (similarity: ' + maxSimilarity.toFixed(2) + ')',
        };
    }
    calculateSimilarity(a, b) {
        // Simple word overlap similarity
        const wordsA = a.split(/\s+/);
        const wordsB = b.split(/\s+/);
        const intersection = wordsA.filter(w => wordsB.includes(w));
        const union = [...new Set([...wordsA, ...wordsB])];
        return intersection.length / union.length;
    }
}
//# sourceMappingURL=LessonValidator.js.map