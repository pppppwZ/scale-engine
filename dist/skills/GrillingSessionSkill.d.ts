import type { IEventBus } from "../core/eventBus.js";
import type { Timestamp } from "../artifact/types.js";
import { type GrillingTopic } from "./GrillingTemplates.js";
export interface GrillingOption {
    id: string;
    label: string;
    explanation: string;
    risk?: string;
}
export interface GrillingQuestion {
    id: string;
    question: string;
    options: GrillingOption[];
    branchMap: Record<string, string>;
    contextHint?: string;
}
export interface GrillingSession {
    id: string;
    topic: GrillingTopic;
    currentNodeId: string;
    history: Array<{
        questionId: string;
        selectedOption: string;
        timestamp: Timestamp;
    }>;
    concluded: boolean;
    conclusion?: GrillingConclusion;
}
export interface GrillingConclusion {
    summary: string;
    decisions: string[];
    risks: string[];
    nextSteps: string[];
    artifactsToUpdate: string[];
}
export interface GrillingResponse {
    type: "question" | "conclusion";
    question?: GrillingQuestion;
    conclusion?: GrillingConclusion;
}
export interface IGrillingSessionManager {
    startSession(topic: GrillingTopic): GrillingSession;
    handleAnswer(sessionId: string, selectedOption: string): GrillingResponse;
    getSession(sessionId: string): GrillingSession | undefined;
    endSession(sessionId: string): GrillingConclusion | undefined;
}
export declare class GrillingSessionManager implements IGrillingSessionManager {
    private sessions;
    private templates;
    private eventBus;
    constructor(eventBus?: IEventBus);
    startSession(topic: GrillingTopic): GrillingSession;
    handleAnswer(sessionId: string, selectedOption: string): GrillingResponse;
    getSession(sessionId: string): GrillingSession | undefined;
    endSession(sessionId: string): GrillingConclusion | undefined;
    private getCurrentQuestion;
    private concludeSession;
    private extractDecisions;
    private extractRisks;
    private findQuestion;
    private generateSummary;
    private generateNextSteps;
    private suggestArtifactUpdates;
}
export declare function createGrillingSessionManager(eventBus?: IEventBus): IGrillingSessionManager;
