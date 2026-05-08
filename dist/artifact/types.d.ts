/**
 * SCALE Engine — Core Types
 *
 * 这是整个系统的"灵魂"。
 * 所有 Artifact、Event、FSM 类型都在这里定义。
 * 修改这个文件需要 W4 末的"数据模型冻结评审"通过。
 *
 * 设计参考：docs/02-DATA-MODEL.md
 */
/** 行为者：可以是 AI、人类或系统 */
export type Actor = {
    kind: 'ai';
    role: string;
    model?: string;
} | {
    kind: 'human';
    userId: string;
} | {
    kind: 'system';
    component: string;
};
/** 时间戳（毫秒） */
export type Timestamp = number;
/** 通用 ID 字符串。格式：{TYPE}-{YYYYMMDD}-{SEQ}，例如 SPEC-20260421-0007 */
export type ArtifactId = string;
export type EventId = string;
export type SessionId = string;
/** 11 种 Artifact 类型 */
export type ArtifactType = 'Need' | 'Insight' | 'Spec' | 'Plan' | 'TestPlan' | 'Task' | 'Change' | 'Evidence' | 'Defect' | 'Lesson' | 'Release';
export interface Artifact<TPayload = unknown> {
    id: ArtifactId;
    type: ArtifactType;
    version: number;
    status: string;
    statusHistory: StatusChange[];
    parents: ArtifactId[];
    children: ArtifactId[];
    supersedes?: ArtifactId;
    title: string;
    contentRef: string;
    payload: TPayload;
    gates: Gate[];
    createdBy: Actor;
    createdAt: Timestamp;
    updatedAt: Timestamp;
    closedAt?: Timestamp;
    tags: string[];
    labels: Record<string, string>;
}
export interface StatusChange {
    from: string;
    to: string;
    at: Timestamp;
    by: Actor;
    reason?: string;
    eventId: EventId;
}
export interface Gate {
    name: string;
    required: boolean;
    threshold?: string;
    actual?: unknown;
    passed: boolean;
    checkedAt?: Timestamp;
    checkedBy?: Actor;
    automatedCheck?: string;
    conditions?: GateCondition[];
}
/** Harness Engineering: 可程序化验证的条件 */
export interface GateCondition {
    field: string;
    operator: '==' | '!=' | '>=' | '<=' | '>' | '<' | 'includes' | 'matches';
    value: number | string | boolean | RegExp;
    description?: string;
}
/** Harness Engineering: TaskPayload 质量字段（防止 Premature Done） */
export interface TaskQualityMetrics {
    buildStatus?: 'pending' | 'success' | 'failed';
    buildExitCode?: number;
    lintStatus?: 'pending' | 'success' | 'failed';
    testPassed?: boolean;
    testCoverage?: number;
    testTotal?: number;
    testFailed?: number;
    e2ePassed?: boolean;
}
/** Need —— 用户原始诉求 */
export interface NeedPayload {
    rawText: string;
    ambiguityScore?: number;
    stakeholders: string[];
}
/** Insight —— 探索学习产出 */
export interface InsightPayload {
    category: 'fact' | 'constraint' | 'risk' | 'opportunity';
    evidence: Array<{
        type: 'file' | 'doc' | 'test' | 'log';
        ref: string;
    }>;
    confidence: number;
    contradictsArtifact?: ArtifactId;
}
/** Spec —— 需求契约 (WHAT) */
export interface SpecPayload {
    what: string;
    successCriteria: string[];
    outOfScope: string[];
    edgeCases: string[];
    northStar: string;
    ambiguityScore?: number;
}
/** Plan —— 技术方案 (HOW) */
export interface PlanPayload {
    approach: string;
    techChoices: Array<{
        decision: string;
        rationale: string;
        alternatives: string[];
    }>;
    modules: Array<{
        path: string;
        action: 'create' | 'modify' | 'delete';
        reason: string;
    }>;
    rollbackStrategy: string;
    estimatedComplexity: number;
}
/** TestPlan —— 验证方案 */
export interface TestPlanPayload {
    unitTests: TestSpec[];
    integrationTests: TestSpec[];
    manualChecks: string[];
    perfBudgets?: Array<{
        metric: string;
        target: string;
    }>;
}
export interface TestSpec {
    name: string;
    given: string;
    when: string;
    then: string;
    command?: string;
}
/** Task —— 原子可执行单元 */
export interface TaskPayload {
    description: string;
    estimatedTokens?: number;
    estimatedDurationMs?: number;
    filesInvolved: string[];
    dependsOn: ArtifactId[];
    requiredRole: string;
    requiredCapabilities: string[];
    buildStatus?: 'pending' | 'success' | 'failed';
    buildExitCode?: number;
    lintStatus?: 'pending' | 'success' | 'failed';
    testPassed?: boolean;
    testCoverage?: number;
    testTotal?: number;
    testFailed?: number;
    e2ePassed?: boolean;
    reviewPassed?: boolean;
}
/** Change —— 实际代码变更 */
export interface ChangePayload {
    commitSha?: string;
    prUrl?: string;
    filesChanged: Array<{
        path: string;
        additions: number;
        deletions: number;
    }>;
    diffSummary: string;
    reverted?: boolean;
}
/** Evidence —— 验证证据 */
export interface EvidencePayload {
    testPlanId: ArtifactId;
    toolUsed: string;
    passed: boolean;
    output: string;
    duration: number;
    artifacts: string[];
}
/** Defect —— 缺陷 */
export interface DefectPayload {
    symptom: string;
    rootCauseCategory: 'requirement_ambiguity' | 'design_flaw' | 'implementation_bug' | 'test_gap' | 'environment_issue' | 'unknown';
    rootCauseDetail: string;
    fixChangeIds: ArtifactId[];
    similarTo: ArtifactId[];
    lesson?: ArtifactId;
}
/** Lesson —— 沉淀经验 */
export interface LessonPayload {
    type: 'lesson' | 'pattern' | 'best_practice' | 'anti_pattern' | 'decision' | 'troubleshooting' | 'workflow' | 'reference';
    problem: string;
    solution: string;
    prevention: string;
    sourceDefects: ArtifactId[];
    applicableContexts: string[];
    verified: boolean;
    promotedToRule?: string;
}
/** Release —— 发布单 */
export interface ReleasePayload {
    version: string;
    includesSpecs: ArtifactId[];
    includesChanges: ArtifactId[];
    rolloutStrategy: 'canary' | 'blue_green' | 'rolling' | 'all_at_once';
    rolledBack?: boolean;
    rollbackReason?: string;
}
/** 类型映射：根据 ArtifactType 推断 Payload 类型 */
export type PayloadOf<T extends ArtifactType> = T extends 'Need' ? NeedPayload : T extends 'Insight' ? InsightPayload : T extends 'Spec' ? SpecPayload : T extends 'Plan' ? PlanPayload : T extends 'TestPlan' ? TestPlanPayload : T extends 'Task' ? TaskPayload : T extends 'Change' ? ChangePayload : T extends 'Evidence' ? EvidencePayload : T extends 'Defect' ? DefectPayload : T extends 'Lesson' ? LessonPayload : T extends 'Release' ? ReleasePayload : never;
export type EventType = 'artifact.created' | 'artifact.updated' | 'artifact.transitioned' | 'artifact.gate_checked' | 'artifact.deleted' | 'tool.called' | 'tool.completed' | 'tool.failed' | 'tool.blocked' | 'gate.checked' | 'gate.passed' | 'gate.failed' | 'behavior.brute_retry' | 'behavior.idle_tool' | 'behavior.busy_loop' | 'behavior.premature_done' | 'behavior.blame_shift' | 'behavior.ai_slop' | 'behavior.hallucination' | 'behavior.duplicate_edit' | 'role.activated' | 'role.denied' | 'session.started' | 'session.ended' | 'session.compacted' | 'session.cleared' | 'lesson.proposed' | 'lesson.validated' | 'lesson.approved' | 'lesson.rejected' | 'lesson.recalled' | 'lesson.helpful' | 'lesson.useless' | 'task.scheduled' | 'task.started' | 'task.checkpointed' | 'task.paused' | 'task.resumed' | 'task.restored' | 'task.completed' | 'task.failed' | 'task.cancelled' | 'task.drift_detected' | 'task.step_started' | 'task.step_completed' | 'task.step_failed' | 'task.step_retrying' | 'task.decomposed' | `task.custom.${string}` | 'defect.auto_created' | 'rule.proposed' | 'rule.enforced' | 'hook.generated' | 'hook.deployed' | 'hook.rollback' | 'evolution.cycle_completed' | 'evolution.evaluated' | 'context.built' | 'skill.registered' | 'skill.unregistered' | 'skill.recommended' | 'skill.executed' | 'skill.installation_changed' | 'skills.cleared' | 'external-skills.registered' | 'skills.install-prompt' | 'skill.install-started' | 'skill.installed' | 'skill.install-failed' | 'skills.batch-installed' | 'workflow.started' | 'workflow.paused' | 'workflow.resumed' | 'workflow.completed' | 'workflow.failed' | 'workflow.step_started' | 'workflow.step_completed' | 'workflow.step_failed' | 'tool.used' | 'detector.triggered' | 'phase.changed' | 'context.inject' | 'agent.spawned' | 'agent.task_assigned' | 'agent.running' | 'agent.completed' | 'agent.failed' | 'agent.recycled' | 'agent.message_sent' | 'agent.message_received' | 'agent.dispatched' | 'agent.dispatch_blocked' | 'agent.blocked' | 'agent.unblocked' | 'agent.subscribed' | 'team.formed' | 'team.dissolved' | 'team.progress_updated' | 'team.completed' | 'team.failed' | 'review.required' | 'review.passed' | 'review.failed' | 'task.review_failed' | 'pattern.extracted' | 'pattern.verified' | 'skill.proposed' | 'skill.published' | 'term.discovered' | 'term.updated' | 'term.ambiguity_detected' | 'adr.proposed' | 'adr.accepted' | 'adr.deprecated' | 'adr.superseded' | 'issue.triaged' | 'issue.state_changed' | 'issue.escalated' | 'issue.info_requested' | 'grilling.session_started' | 'grilling.session_ended' | 'grilling.concluded' | 'grilling.answer_received' | 'antipattern.detected' | 'antipattern.registered';
export interface Event<TPayload = unknown> {
    id: EventId;
    type: EventType;
    timestamp: Timestamp;
    sessionId: SessionId;
    actor: Actor;
    artifactId?: ArtifactId;
    payload: TPayload;
    causedBy?: EventId;
    correlationId?: string;
}
export interface FSMDefinition<S extends string = string, A extends string = string> {
    type: ArtifactType;
    states: readonly S[];
    initial: S;
    terminal: readonly S[];
    transitions: ReadonlyArray<TransitionDef<S, A>>;
}
export interface TransitionDef<S extends string, A extends string> {
    from: S;
    action: A;
    to: S;
    guards?: Guard[];
    effects?: Effect[];
}
export interface Guard {
    name: string;
    check: (artifact: Artifact, context: TransitionContext) => boolean | Promise<boolean>;
    errorMessage: string;
}
export interface Effect {
    name: string;
    run: (artifact: Artifact, context: TransitionContext) => void | Promise<void>;
}
export interface TransitionContext {
    actor: Actor;
    reason?: string;
    payload?: Record<string, unknown>;
}
export interface TransitionResult {
    success: boolean;
    artifact?: Artifact;
    blockedBy?: GuardFailure[];
    effectsExecuted: string[];
}
export interface GuardFailure {
    guard: string;
    message: string;
}
export interface Session {
    id: SessionId;
    agent: AgentPlatform | 'unknown';
    startedAt: Timestamp;
    endedAt?: Timestamp;
    activeRole?: string;
    scenarioMode?: ScenarioMode;
    metadata: Record<string, unknown>;
}
export interface ToolUseInput {
    sessionId: SessionId;
    tool: string;
    args: Record<string, unknown>;
    timestamp?: Timestamp;
}
export interface ToolResultInput {
    sessionId: SessionId;
    tool: string;
    args: Record<string, unknown>;
    exitCode?: number;
    output?: string;
    duration?: number;
    timestamp?: Timestamp;
}
export interface StopInput {
    sessionId: SessionId;
    aiOutput?: string;
    projectType?: string;
}
export interface GateDecision {
    allow: boolean;
    reason?: string;
    suggestion?: string;
    injectContext?: string[];
}
export interface DetectorResult {
    triggered: boolean;
    severity?: 'warn' | 'block' | 'deny';
    reason?: string;
    suggestion?: string;
}
export interface KnowledgeEntry {
    id: string;
    type: LessonPayload['type'];
    title: string;
    tags: string[];
    contentRef: string;
    embeddingId?: string;
    relevance: number;
    accessCount: number;
    lastAccessed?: Timestamp;
    verified: boolean;
    verifiedBy?: string;
    verifiedAt?: Timestamp;
    createdAt: Timestamp;
    sourceArtifact?: ArtifactId;
}
export interface KnowledgeQuery {
    type?: LessonPayload['type'] | LessonPayload['type'][];
    tags?: string[];
    minRelevance?: number;
    verifiedOnly?: boolean;
    limit?: number;
}
export interface RoleDefinition {
    name: string;
    canCreateArtifacts: ArtifactType[];
    canModifyArtifacts?: Array<{
        type: ArtifactType;
        statuses: string[];
    }>;
    canReadArtifacts?: ArtifactType[];
    allowedTools: string[];
    deniedTools?: string[];
    requiresUpstream?: Array<{
        type: ArtifactType;
        status?: string;
        allMatch?: string;
    }>;
    mustRunAfterEdit?: string[];
}
export declare class ScaleError extends Error {
    code: string;
    details?: unknown | undefined;
    constructor(message: string, code: string, details?: unknown | undefined);
}
export declare class InvalidTransitionError extends ScaleError {
    constructor(from: string, action: string);
}
export declare class GuardFailedError extends ScaleError {
    failures: GuardFailure[];
    constructor(failures: GuardFailure[]);
}
export declare class RoleDeniedError extends ScaleError {
    constructor(role: string, reason: string);
}
export declare class ArtifactNotFoundError extends ScaleError {
    constructor(id: string);
}
/** 场景模式：控制检测器敏感度、上下文规则、权限级别 */
export type ScenarioMode = 'sandbox' | 'standard' | 'critical';
/** 场景模式配置 */
export interface ScenarioModeConfig {
    mode: ScenarioMode;
    detectorSensitivity: 'low' | 'medium' | 'high';
    verificationRequired: boolean;
    humanConfirmationRequired: boolean;
    auditTrail: boolean;
    maxRetries: number;
}
/** 场景模式预设配置 */
export declare const SCENARIO_MODE_CONFIGS: Record<ScenarioMode, ScenarioModeConfig>;
/** Development phase for phase-based skill organization */
export type DevelopmentPhase = 'DEFINE' | 'PLAN' | 'BUILD' | 'VERIFY' | 'REVIEW' | 'SHIP' | 'ANTI-PATTERNS';
/** Agent 平台类型 */
export type AgentPlatform = 'claude-code' | 'codex' | 'opencode' | 'cursor' | 'gemini' | 'openclaw' | 'hermes' | 'trae' | 'workbuddy' | 'vsc' | 'qcoder';
/** Skill 引用 */
export interface SkillRef {
    id: string;
    name: string;
    description: string;
    platform: AgentPlatform;
    path: string;
    enabled: boolean;
    phase?: DevelopmentPhase;
}
/** Skill 目录扫描结果 */
export interface SkillScanResult {
    platform: AgentPlatform;
    skillsDir: string;
    skills: SkillRef[];
    exists: boolean;
}
/** 工作流步骤 */
export interface WorkflowStep {
    stepId: string;
    skillId?: string;
    action: string;
    verificationGate?: string;
    isMandatory: boolean;
    description?: string;
}
/** 工作流预设 */
export interface WorkflowPreset {
    id: string;
    name: string;
    nameZh: string;
    description: string;
    steps: WorkflowStep[];
    scenarioMode: ScenarioMode;
    requiredArtifacts: Array<{
        type: ArtifactType;
        status?: string;
    }>;
}
/** Agent 类型扩展（支持所有 11 种 Agent） */
export type AgentType = AgentPlatform;
/** 术语定义来源 */
export type TermSource = 'user-defined' | 'inferred-from-code' | 'extracted-from-docs';
/** 术语定义（CONTEXT.md 条目） */
export interface TermDefinition {
    term: string;
    definition: string;
    examples: string[];
    aliases: string[];
    lastUpdated: Timestamp;
    source: TermSource;
}
/** ADR 状态 */
export type ADRStatus = 'proposed' | 'accepted' | 'deprecated' | 'superseded';
/** ADR 记录（架构决策记录） */
export interface ADRRecord {
    id: string;
    title: string;
    status: ADRStatus;
    context: string;
    decision: string;
    consequences: string;
    alternatives?: string[];
    supersededBy?: string;
    createdAt: Timestamp;
    updatedAt: Timestamp;
}
/** ADR 状态变更事件 Payload */
export interface ADRStatusChangePayload {
    adrId: string;
    previousStatus: ADRStatus;
    newStatus: ADRStatus;
    reason?: string;
    supersededBy?: string;
}
/** 术语歧义报告 */
export interface AmbiguityReport {
    term: string;
    definitions: string[];
    sources: TermSource[];
    suggestedResolution?: string;
}
/** Issue 角色：bug 修复或新功能 */
export type IssueRole = 'bug' | 'enhancement';
/** Issue Triage 状态 */
export type IssueState = 'needs-triage' | 'needs-info' | 'ready-for-agent' | 'ready-for-human' | 'in-progress' | 'blocked' | 'completed' | 'wontfix';
/** Issue Triage 状态流转 */
export interface IssueTriageTransition {
    from: IssueState;
    to: IssueState;
    condition: string;
    auto?: boolean;
    agentAction?: string;
}
/** Issue Triage 评估结果 */
export interface TriageResult {
    state: IssueState;
    action?: string;
    reason?: string;
}
/** Issue 输入 */
export interface IssueInput {
    title: string;
    description: string;
    type?: IssueRole;
    complexity?: number;
    riskLevel?: 'low' | 'medium' | 'high';
    filesInvolved?: string[];
    dependsOn?: ArtifactId[];
}
