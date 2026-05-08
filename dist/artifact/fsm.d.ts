/**
 * SCALE Engine — FSM (Finite State Machine) Engine
 *
 * 系统的"宪法执行者"。
 * 所有 Artifact 状态变化必须通过 fsm.transition()，禁止任何代码绕过。
 *
 * 设计参考：docs/02-DATA-MODEL.md §三、docs/03-CORE-MODULES.md §3.2
 */
import type { ArtifactType, FSMDefinition, TransitionContext, TransitionResult, GuardFailure } from './types.js';
import type { IArtifactStore } from './store.js';
import type { IEventBus } from '../core/eventBus.js';
export interface IFSM {
    register(definition: FSMDefinition): void;
    canTransition(artifactId: string, action: string): Promise<{
        allowed: boolean;
        blockedBy?: GuardFailure[];
    }>;
    transition(artifactId: string, action: string, context: TransitionContext): Promise<TransitionResult>;
    availableActions(artifactId: string): Promise<string[]>;
    getDefinition(type: ArtifactType): FSMDefinition | undefined;
}
export declare class FSM implements IFSM {
    private store;
    private eventBus;
    private registry;
    /** Per-artifact lock chain to prevent concurrent transitions */
    private locks;
    constructor(store: IArtifactStore, eventBus: IEventBus);
    register(definition: FSMDefinition): void;
    getDefinition(type: ArtifactType): FSMDefinition | undefined;
    canTransition(artifactId: string, action: string): Promise<{
        allowed: boolean;
        blockedBy?: GuardFailure[];
    }>;
    transition(artifactId: string, action: string, context: TransitionContext): Promise<TransitionResult>;
    private executeTransition;
    /** Number of artifacts with pending lock chains (for testing/monitoring) */
    get pendingLocks(): number;
    availableActions(artifactId: string): Promise<string[]>;
}
export declare const SpecFSM: FSMDefinition;
