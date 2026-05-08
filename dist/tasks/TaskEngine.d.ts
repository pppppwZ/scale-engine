import type { ArtifactId } from '../artifact/types.js';
import type { IArtifactStore } from '../artifact/store.js';
import type { IFSM } from '../artifact/fsm.js';
import type { IEventBus } from '../core/eventBus.js';
export interface Checkpoint {
    id: string;
    taskId: ArtifactId;
    timestamp: number;
    state: CheckpointState;
    description?: string;
    canResume: boolean;
}
export interface CheckpointState {
    context: Record<string, unknown>;
    currentStep: number;
    completedSteps: string[];
    failedSteps: string[];
}
export interface TaskStep {
    id: string;
    name: string;
    handler: StepHandler;
    timeout?: number;
    retries?: number;
    checkpoint?: boolean;
}
export type StepResult = {
    success: true;
    output?: unknown;
} | {
    success: false;
    error: string;
    retryable?: boolean;
};
export type StepHandler = (ctx: StepContext) => Promise<StepResult>;
export interface StepContext {
    taskId: ArtifactId;
    stepId: string;
    stepIndex: number;
    get: (key: string) => unknown;
    set: (key: string, value: unknown) => void;
    emit: (type: string, payload: unknown) => void;
    log: (msg: string) => void;
}
export interface TaskDecomposition {
    parentTaskId: ArtifactId;
    subtasks: Array<{
        title: string;
        payload: unknown;
        dependencies?: string[];
    }>;
}
export interface ITaskEngine {
    schedule(taskId: ArtifactId): Promise<void>;
    execute(taskId: ArtifactId, steps?: TaskStep[]): Promise<ExecutionResult>;
    pause(taskId: ArtifactId, reason: string): Promise<void>;
    resume(taskId: ArtifactId, steps?: TaskStep[]): Promise<ExecutionResult>;
    cancel(taskId: ArtifactId, reason: string): Promise<void>;
    checkpoint(taskId: ArtifactId, label?: string): Promise<Checkpoint>;
    restoreFromCheckpoint(taskId: ArtifactId, checkpointId?: string): Promise<CheckpointState>;
    decompose(decomposition: TaskDecomposition): Promise<ArtifactId[]>;
    getContext(taskId: ArtifactId): Record<string, unknown>;
    setContext(taskId: ArtifactId, key: string, value: unknown): void;
}
export interface ExecutionResult {
    taskId: ArtifactId;
    success: boolean;
    completedSteps: string[];
    failedStep?: string;
    error?: string;
    duration: number;
}
export declare class TaskEngine implements ITaskEngine {
    private store;
    private fsm;
    private eventBus;
    private runtimes;
    private checkpointsDir;
    constructor(store: IArtifactStore, fsm: IFSM, eventBus: IEventBus, opts?: {
        checkpointsDir?: string;
    });
    schedule(taskId: ArtifactId): Promise<void>;
    execute(taskId: ArtifactId, steps?: TaskStep[]): Promise<ExecutionResult>;
    pause(taskId: ArtifactId, reason: string): Promise<void>;
    resume(taskId: ArtifactId, steps?: TaskStep[]): Promise<ExecutionResult>;
    cancel(taskId: ArtifactId, reason: string): Promise<void>;
    checkpoint(taskId: ArtifactId, label?: string): Promise<Checkpoint>;
    restoreFromCheckpoint(taskId: ArtifactId, checkpointId?: string): Promise<CheckpointState>;
    decompose(decomposition: TaskDecomposition): Promise<ArtifactId[]>;
    getContext(taskId: ArtifactId): Record<string, unknown>;
    setContext(taskId: ArtifactId, key: string, value: unknown): void;
    private getOrCreateRuntime;
    private executeStep;
    private timeoutPromise;
    /** resume 后继续执行剩余步骤（不再走 start transition） */
    private executeFromRuntime;
}
