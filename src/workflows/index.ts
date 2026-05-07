// SCALE Engine — Workflows Module Index (v0.7.0)

export { WORKFLOW_PRESETS, getWorkflowPreset, listWorkflowPresets, getPresetsByScenario } from "./presets.js"
export type { WorkflowPreset, ScenarioMode, WorkflowStep } from "../artifact/types.js"
export { WorkflowExecutor, type IWorkflowExecutor, type WorkflowSession, type StepHistoryEntry } from "./WorkflowExecutor.js"
export { GateParser, type IGateParser, type GateExpression, type GateResult } from "./GateParser.js"
