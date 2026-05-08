import type { WorkflowPreset } from "../artifact/types.js";
import type { IEventBus } from "../core/eventBus.js";
import type { IArtifactStore } from "../artifact/store.js";
import { GateResult } from "./GateParser.js";
export interface WorkflowSession {
    id: string;
    presetId: string;
    presetName: string;
    currentStep: number;
    totalSteps: number;
    status: "running" | "paused" | "completed" | "failed" | "blocked";
    blockingReason?: string;
    verifiedSteps: number[];
    stepHistory: StepHistoryEntry[];
    startedAt: number;
    pausedAt?: number;
    completedAt?: number;
    context: Record<string, unknown>;
}
export interface StepHistoryEntry {
    stepId: string;
    stepIndex: number;
    action: string;
    status: "pending" | "running" | "verified" | "failed" | "skipped";
    startedAt: number;
    completedAt?: number;
    output?: unknown;
    error?: string;
    gateResult?: GateResult;
}
export interface IWorkflowExecutor {
    start(preset: WorkflowPreset, context: Record<string, unknown>): Promise<WorkflowSession>;
    getStatus(sessionId: string): Promise<WorkflowSession | null>;
    pause(sessionId: string, reason?: string): Promise<void>;
    resume(sessionId: string): Promise<void>;
    executeStep(sessionId: string, stepIndex?: number): Promise<StepHistoryEntry>;
    runAll(sessionId: string): Promise<WorkflowSession>;
    getHistory(sessionId: string): Promise<StepHistoryEntry[]>;
}
export declare class WorkflowExecutor implements IWorkflowExecutor {
    private sessions;
    private gateParser;
    private eventBus;
    private store;
    constructor(eventBus: IEventBus, store: IArtifactStore);
    start(preset: WorkflowPreset, context: Record<string, unknown>): Promise<WorkflowSession>;
    getStatus(sessionId: string): Promise<WorkflowSession | null>;
    pause(sessionId: string, reason?: string): Promise<void>;
    resume(sessionId: string): Promise<void>;
    executeStep(sessionId: string, stepIndex?: number): Promise<StepHistoryEntry>;
    runAll(sessionId: string): Promise<WorkflowSession>;
    getHistory(sessionId: string): Promise<StepHistoryEntry[]>;
    private executeAction;
    private getPresetStep;
    private getRelatedArtifact;
}
