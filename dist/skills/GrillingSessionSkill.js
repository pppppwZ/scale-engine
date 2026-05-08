// SCALE Engine - Grilling Session Skill (mattpocock/skills style)
// 递归决策树探索，一次一个问题
import { getGrillingTemplate } from "./GrillingTemplates.js";
import { logger } from "../core/logger.js";
export class GrillingSessionManager {
    constructor(eventBus) {
        this.sessions = new Map();
        this.eventBus = eventBus ?? null;
        this.templates = getGrillingTemplate;
    }
    startSession(topic) {
        const template = this.templates[topic] ?? getGrillingTemplate(topic);
        const id = "GRILL-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6);
        const session = { id, topic, currentNodeId: template[0]?.id ?? "Q1", history: [], concluded: false };
        this.sessions.set(id, session);
        logger.info({ sessionId: id, topic }, "Grilling session started");
        this.eventBus?.emit("grilling.session_started", { sessionId: id, topic });
        return session;
    }
    handleAnswer(sessionId, selectedOption) {
        const session = this.sessions.get(sessionId);
        if (!session || session.concluded)
            return { type: "conclusion", conclusion: session?.conclusion };
        session.history.push({ questionId: session.currentNodeId, selectedOption, timestamp: Date.now() });
        const currentQuestion = this.getCurrentQuestion(session);
        if (!currentQuestion)
            return this.concludeSession(session);
        const nextNodeId = currentQuestion.branchMap[selectedOption];
        if (nextNodeId === "CONCLUSION" || !nextNodeId)
            return this.concludeSession(session);
        session.currentNodeId = nextNodeId;
        const nextQuestion = this.getCurrentQuestion(session);
        return { type: "question", question: nextQuestion };
    }
    getSession(sessionId) { return this.sessions.get(sessionId); }
    endSession(sessionId) {
        const session = this.sessions.get(sessionId);
        if (!session)
            return undefined;
        if (!session.concluded)
            this.concludeSession(session);
        this.sessions.delete(sessionId);
        this.eventBus?.emit("grilling.session_ended", { sessionId });
        return session.conclusion;
    }
    getCurrentQuestion(session) {
        const template = this.templates[session.topic];
        return template?.find(q => q.id === session.currentNodeId);
    }
    concludeSession(session) {
        session.concluded = true;
        const decisions = this.extractDecisions(session.history);
        const risks = this.extractRisks(session.history);
        session.conclusion = {
            summary: this.generateSummary(decisions),
            decisions,
            risks,
            nextSteps: this.generateNextSteps(decisions),
            artifactsToUpdate: this.suggestArtifactUpdates(decisions),
        };
        logger.info({ sessionId: session.id, decisions: decisions.length }, "Grilling concluded");
        this.eventBus?.emit("grilling.concluded", { sessionId: session.id, conclusion: session.conclusion });
        return { type: "conclusion", conclusion: session.conclusion };
    }
    extractDecisions(history) {
        return history.map(h => h.selectedOption);
    }
    extractRisks(history) {
        const risks = [];
        for (const h of history) {
            const question = this.findQuestion(h.questionId);
            const option = question?.options.find(o => o.id === h.selectedOption);
            if (option?.risk)
                risks.push(option.risk);
        }
        return risks;
    }
    findQuestion(id) {
        for (const template of Object.values(this.templates)) {
            const q = template.find(t => t.id === id);
            if (q)
                return q;
        }
        return undefined;
    }
    generateSummary(decisions) {
        return "Decisions made: " + decisions.join(" -> ");
    }
    generateNextSteps(decisions) {
        const steps = [];
        if (decisions.includes("internal"))
            steps.push("Review internal user workflow");
        if (decisions.includes("external"))
            steps.push("Design public UX");
        if (decisions.includes("deep"))
            steps.push("Define interface contract");
        if (decisions.includes("shallow"))
            steps.push("Plan module composition");
        return steps;
    }
    suggestArtifactUpdates(decisions) {
        const artifacts = [];
        if (decisions.length > 3)
            artifacts.push("CONTEXT.md");
        if (decisions.includes("enterprise") || decisions.includes("k8s"))
            artifacts.push("ADR");
        return artifacts;
    }
}
export function createGrillingSessionManager(eventBus) {
    return new GrillingSessionManager(eventBus);
}
//# sourceMappingURL=GrillingSessionSkill.js.map