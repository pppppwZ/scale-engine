import type { ArtifactId, Timestamp, AgentPlatform } from '../artifact/types.js';
/** Agent 专业领域 */
export type AgentDomain = 'frontend' | 'backend' | 'testing' | 'ui-design' | 'operations' | 'product' | 'code-review' | 'security' | 'documentation' | 'planning' | 'exploration' | 'database' | 'performance' | 'architecture';
/** 模型层级偏好 */
export type ModelTier = 'fast' | 'balanced' | 'powerful';
/** 输出规范 */
export interface OutputSpec {
    fileTypes: string[];
    style: string;
}
/** 协作偏好 */
export interface CollaborationSpec {
    reportsTo?: string;
    sharesWith: string[];
}
/** Agent 人设定义 */
export interface AgentIdentity {
    role: string;
    personality: string;
    memory: string;
    experience: string;
}
/** Agent 核心使命 */
export interface AgentMission {
    name: string;
    description: string;
    priority: 'critical' | 'high' | 'normal';
}
/** Agent 关键规则 */
export interface AgentRule {
    name: string;
    description: string;
    enforcement: 'block' | 'warn' | 'suggest';
}
/** Agent 交付物模板 */
export interface AgentDeliverable {
    name: string;
    template: string;
    format: 'markdown' | 'code' | 'json' | 'yaml';
}
/** Agent 工作流程步骤 */
export interface AgentWorkflowStep {
    stepId: string;
    name: string;
    description: string;
    outputs?: string[];
}
/** Agent 成功指标 */
export interface AgentSuccessMetric {
    name: string;
    target: string;
    measurement: string;
}
/** Agent Profile：专业 Agent 定义 (v0.9.0 增强) */
export interface AgentProfile {
    id: string;
    name: string;
    description: string;
    domain: AgentDomain;
    emoji?: string;
    color?: string;
    identity?: AgentIdentity;
    missions?: AgentMission[];
    rules?: AgentRule[];
    inheritsRole: string;
    capabilities: string[];
    preferredModel: ModelTier;
    outputFormat?: OutputSpec;
    deliverables?: AgentDeliverable[];
    workflow?: AgentWorkflowStep[];
    successMetrics?: AgentSuccessMetric[];
    collaboration?: CollaborationSpec;
}
/** Agent 实例状态 */
export type AgentStatus = 'idle' | 'running' | 'blocked' | 'completed' | 'failed' | 'recycled';
/** 消息类型 */
export type MessageType = 'task-request' | 'task-complete' | 'task-fail' | 'dependency-block' | 'dependency-resolve' | 'output-share' | 'review-request' | 'review-result' | 'help-request' | 'status-update';
/** Agent 消息 */
export interface AgentMessage {
    id: string;
    from: string;
    to: string | 'broadcast';
    type: MessageType;
    payload: unknown;
    timestamp: Timestamp;
}
/** Agent 实例运行时 */
export interface AgentRuntime {
    id: string;
    profile: AgentProfile;
    status: AgentStatus;
    assignedTask?: ArtifactId;
    model: ModelConfig;
    startedAt: Timestamp;
    completedAt?: Timestamp;
    outputArtifacts: ArtifactId[];
    messages: AgentMessage[];
    blockedBy?: string[];
    retryCount: number;
    error?: string;
}
/** 模型配置 */
export interface ModelConfig {
    provider: AgentPlatform | 'anthropic' | 'openai' | 'google';
    modelId: string;
    tier: ModelTier;
}
/** Agent 团队 */
export interface AgentTeam {
    id: string;
    agents: AgentRuntime[];
    leader: AgentRuntime;
    startedAt: Timestamp;
    completedAt?: Timestamp;
    dissolvedAt?: Timestamp;
    taskId?: ArtifactId;
    scenarioMode?: 'sandbox' | 'standard' | 'critical';
}
/** 团队执行结果 */
export interface TeamExecutionResult {
    teamId: string;
    success: boolean;
    outputArtifacts: ArtifactId[];
    duration: number;
    agentResults: Map<string, AgentResult>;
}
/** 单个 Agent 执行结果 */
export interface AgentResult {
    agentId: string;
    status: AgentStatus;
    outputArtifacts: ArtifactId[];
    duration: number;
    retryCount: number;
}
/** Agent 执行结果（兼容旧版） */
export interface AgentExecutionResult {
    agentId: string;
    success: boolean;
    outputArtifacts: ArtifactId[];
    duration: number;
    error?: string;
}
/** 团队配置 */
export interface TeamConfig {
    profiles: string[];
    parallelism: number;
    timeout?: number;
    onConflict: 'abort' | 'retry' | 'skip';
    scenarioMode?: 'sandbox' | 'standard' | 'critical';
}
/** 任务依赖解析结果 */
export interface DependencyResolution {
    taskId: ArtifactId;
    blockedBy: ArtifactId[];
    ready: boolean;
}
/** 任务分组（按依赖关系） */
export interface TaskGroups {
    independent: ArtifactId[];
    dependent: DependentTask[];
}
/** 有依赖的任务 */
export interface DependentTask {
    taskId: ArtifactId;
    dependencies: ArtifactId[];
}
/** 任务 → Profile 映射 */
export type TaskProfileMap = Record<string, string[]>;
/** 进度报告 */
export interface ProgressReport {
    teamId: string;
    taskId?: ArtifactId;
    total: number;
    completed: number;
    running: number;
    blocked: number;
    failed: number;
    idle: number;
    agents: AgentStatusReport[];
}
/** Agent 状态报告 */
export interface AgentStatusReport {
    agentId: string;
    profileId: string;
    status: AgentStatus;
    task?: ArtifactId;
    duration: number;
}
/** LLM Provider 配置 */
export type WorkflowLLMProvider = 'claude-code' | 'gemini-cli' | 'copilot-cli' | 'codex-cli' | 'deepseek' | 'anthropic' | 'openai' | 'ollama';
/** LLM 配置 */
export interface WorkflowLLMConfig {
    provider: WorkflowLLMProvider;
    model?: string;
    apiKey?: string;
    baseUrl?: string;
}
/** Workflow 输入参数 */
export interface WorkflowInput {
    name: string;
    required?: boolean;
    default?: string;
    description?: string;
}
/** Workflow 步骤 */
export interface WorkflowStepDef {
    id: string;
    role: string;
    task: string;
    output?: string;
    depends_on?: string[];
    retry?: number;
    timeout?: number;
}
/** YAML Workflow 定义 */
export interface WorkflowDefinition {
    name: string;
    description?: string;
    version?: string;
    agents_dir?: string;
    llm: WorkflowLLMConfig;
    concurrency?: number;
    inputs?: WorkflowInput[];
    steps: WorkflowStepDef[];
    output_dir?: string;
}
/** DAG 节点（用于执行图） */
export interface DAGNode {
    stepId: string;
    step: WorkflowStepDef;
    dependencies: string[];
    dependents: string[];
    level: number;
}
/** DAG 执行图 */
export interface DAGExecutionGraph {
    nodes: Map<string, DAGNode>;
    levels: DAGNode[][];
    maxLevel: number;
}
/** 步骤执行结果 */
export interface WorkflowStepResult {
    stepId: string;
    status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
    output?: string;
    duration?: number;
    retryCount?: number;
    error?: string;
    agentId?: string;
}
/** Workflow 执行结果 */
export interface WorkflowExecutionResult {
    workflowName: string;
    success: boolean;
    totalSteps: number;
    completedSteps: number;
    failedSteps: number;
    duration: number;
    stepResults: Map<string, WorkflowStepResult>;
    outputs: Record<string, string>;
    executionLog: string[];
}
