import type { FSMDefinition } from './types.js';
export declare const NeedFSM: FSMDefinition;
export declare const InsightFSM: FSMDefinition;
export declare const SpecFSM: FSMDefinition;
export declare const PlanFSM: FSMDefinition;
export declare const TestPlanFSM: FSMDefinition;
export declare const TaskFSM: FSMDefinition;
export declare const ChangeFSM: FSMDefinition;
export declare const EvidenceFSM: FSMDefinition;
export declare const DefectFSM: FSMDefinition;
export declare const LessonFSM: FSMDefinition;
export declare const ReleaseFSM: FSMDefinition;
export declare const ALL_FSMS: readonly [FSMDefinition<string, string>, FSMDefinition<string, string>, FSMDefinition<string, string>, FSMDefinition<string, string>, FSMDefinition<string, string>, FSMDefinition<string, string>, FSMDefinition<string, string>, FSMDefinition<string, string>, FSMDefinition<string, string>, FSMDefinition<string, string>, FSMDefinition<string, string>];
import type { IFSM } from './fsm.js';
import type { ArtifactType } from './types.js';
export declare function registerAllFSMs(fsm: IFSM): void;
/** 各 Artifact 类型的初始状态查询表 */
export declare const INITIAL_STATES: Record<ArtifactType, string>;
