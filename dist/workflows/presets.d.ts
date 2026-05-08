import type { WorkflowPreset, ScenarioMode } from '../artifact/types.js';
/** 1. 基础开发流 — 标准的 Explore→Plan→Implement→Verify→Learn 循环 */
export declare const BASIC_DEV: WorkflowPreset;
/** 2. TDD功能开发 — Test-Driven Development 工作流 */
export declare const TDD_DEV: WorkflowPreset;
/** 3. Bug修复 — 快速定位→修复→验证→防止复发 */
export declare const BUG_FIX: WorkflowPreset;
/** 4. SDD — Spec-Driven Development 严格契约驱动 */
export declare const SDD: WorkflowPreset;
/** 5. 代码审查 — 系统化审查流程 */
export declare const CODE_REVIEW: WorkflowPreset;
/** 6. 安全审计 — 全面安全审查 */
export declare const SECURITY_AUDIT: WorkflowPreset;
/** 7. Ralph自主循环 — 全自动 AI 自主执行循环 */
export declare const RALPH_LOOP: WorkflowPreset;
/** 8. 快速原型 — 快速探索和原型验证 */
export declare const RAPID_PROTO: WorkflowPreset;
/** 9. 大规模重构 — 安全的大型代码重构 */
export declare const MASSIVE_REFACTOR: WorkflowPreset;
/** 10. 并行执行 — 多任务并行开发 */
export declare const PARALLEL_EXEC: WorkflowPreset;
export declare const WORKFLOW_PRESETS: Record<string, WorkflowPreset>;
/**
 * Get a workflow preset by ID.
 */
export declare function getWorkflowPreset(id: string): WorkflowPreset | undefined;
/**
 * List all available workflow presets.
 */
export declare function listWorkflowPresets(): WorkflowPreset[];
/**
 * Get presets filtered by scenario mode.
 */
export declare function getPresetsByScenario(mode: ScenarioMode): WorkflowPreset[];
