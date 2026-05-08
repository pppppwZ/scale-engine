import type { WorkflowDefinition, WorkflowExecutionResult } from '../agents/types.js';
import { AgentPool } from '../agents/AgentPool.js';
import { AgentDispatcher } from '../agents/AgentDispatcher.js';
/**
 * WorkflowOrchestrator — 工作流编排器
 *
 * 核心功能：
 * - 解析 YAML WorkflowDefinition
 * - 构建 DAG 执行图
 * - 并行执行无依赖步骤
 * - 管理步骤状态和输出变量
 */
export declare class WorkflowOrchestrator {
    private dagBuilder;
    private agentPool;
    private dispatcher;
    private outputs;
    constructor(agentPool: AgentPool, dispatcher: AgentDispatcher);
    /**
     * 执行工作流
     * @param workflow Workflow 定义
     * @returns 执行结果
     */
    execute(workflow: WorkflowDefinition): Promise<WorkflowExecutionResult>;
    /**
     * 执行单个步骤
     */
    private executeStep;
    /**
     * 解析变量（{{output_name}} → 实际值）
     */
    private resolveVariables;
    /**
     * 模拟执行（实际应调用 LLM）
     * TODO: 集成真实 LLM 调用
     */
    private simulateExecution;
    /**
     * 获取输出变量
     */
    getOutput(name: string): string | undefined;
    /**
     * 清除输出变量
     */
    clearOutputs(): void;
}
/** 创建 WorkflowOrchestrator 实例 */
export declare function createWorkflowOrchestrator(agentPool: AgentPool, dispatcher: AgentDispatcher): WorkflowOrchestrator;
