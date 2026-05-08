import type { IArtifactStore } from "../artifact/store.js";
import type { IFSM } from "../artifact/fsm.js";
import type { IEventBus } from "../core/eventBus.js";
export interface FSMContextSnapshot {
    artifactId: string;
    artifactType: string;
    currentStatus: string;
    allowedTransitions: string[];
    blockingReasons: string[];
    downstreamImpact: string[];
    parentStatus?: string;
    childrenStatuses: string[];
}
export interface SessionFSMContext {
    sessionId: string;
    artifacts: FSMContextSnapshot[];
    recalledLessons: string[];
    recommendations: string[];
    generatedAt: number;
}
export interface IFSMAgentBridge {
    getFSMContext(artifactId: string): Promise<FSMContextSnapshot | null>;
    getSessionContext(sessionId: string, eventBus: IEventBus): Promise<SessionFSMContext>;
    checkOperation(artifactId: string, operation: string): Promise<{
        allowed: boolean;
        reasons: string[];
    }>;
    getCreationPrerequisites(artifactType: string): Promise<{
        requiredParentStatus: string[];
        message: string;
    }>;
    injectFSMContextToPrompt(prompt: string, artifactIds: string[]): Promise<string>;
}
export declare class FSMAgentBridge implements IFSMAgentBridge {
    private fsm;
    private store;
    constructor(fsm: IFSM, store: IArtifactStore);
    getFSMContext(artifactId: string): Promise<FSMContextSnapshot | null>;
    checkOperation(artifactId: string, operation: string): Promise<{
        allowed: boolean;
        reasons: string[];
    }>;
    getCreationPrerequisites(artifactType: string): Promise<{
        requiredParentStatus: string[];
        message: string;
    }>;
    /**
     * Get FSM context for all artifacts related to a session
     * This is the primary method for SessionStart hook to inject context
     */
    getSessionContext(sessionId: string, eventBus: IEventBus): Promise<SessionFSMContext>;
    /**
     * Generate actionable recommendations from FSM state
     */
    private generateRecommendations;
    injectFSMContextToPrompt(prompt: string, artifactIds: string[]): Promise<string>;
    private calculateDownstreamImpact;
    private formatFSMBlock;
}
