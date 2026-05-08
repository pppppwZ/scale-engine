import type { IFSM } from '../artifact/fsm.js';
import type { IArtifactStore } from '../artifact/store.js';
import type { IEventBus } from '../core/eventBus.js';
/**
 * 注入所有跨 Artifact 的 effects
 * 在引擎启动后调用（避免循环依赖）
 */
export declare function wireEffects(fsm: IFSM, store: IArtifactStore, eventBus: IEventBus): void;
