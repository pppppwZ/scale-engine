import type { IEventBus } from '../core/eventBus.js';
import type { IArtifactStore } from '../artifact/store.js';
export interface SessionStartContext {
    workingDir: string;
    gitStatus: GitStatusInfo;
    recentCommits: CommitInfo[];
    progressFile?: ProgressFileInfo;
    unfinishedTasks: UnfinishedTask[];
    harnessRecommendations: string[];
    generatedAt: number;
}
export interface GitStatusInfo {
    branch: string;
    aheadOfMain: number;
    uncommittedChanges: boolean;
    untrackedFiles: string[];
}
export interface CommitInfo {
    sha: string;
    message: string;
    timestamp: number;
    author: string;
}
export interface ProgressFileInfo {
    path: string;
    content: string;
    lastTask?: string;
    currentPhase?: string;
    blockers?: string[];
}
export interface UnfinishedTask {
    taskId: string;
    priority: number;
    status: string;
    description: string;
    blockingReason?: string;
}
export declare class SessionStartSequence {
    private store;
    private eventBus;
    private projectDir;
    constructor(store: IArtifactStore, eventBus: IEventBus, projectDir?: string);
    execute(sessionId: string): Promise<SessionStartContext>;
    private getGitStatus;
    private getRecentCommits;
    private readProgressFile;
    private extractLastTask;
    private extractCurrentPhase;
    private extractBlockers;
    private findUnfinishedTasks;
    private getBlockingReason;
    private generateHarnessRecommendations;
    formatContextBlock(ctx: SessionStartContext): string;
}
