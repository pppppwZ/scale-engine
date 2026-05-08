import type { WorkflowStepDef, DAGNode, DAGExecutionGraph } from '../agents/types.js';
/**
 * DAGBuilder — 构建 DAG 执行图
 *
 * 核心功能：
 * - 解析 depends_on 依赖关系
 * - Topological 排序确定执行层级
 * - 检测循环依赖（抛出错误）
 * - 分组并行执行步骤
 */
export declare class DAGBuilder {
    /**
     * 构建 DAG 执行图
     * @param steps Workflow 步骤定义列表
     * @returns DAG 执行图（含层级分组）
     */
    buildGraph(steps: WorkflowStepDef[]): DAGExecutionGraph;
    /**
     * 计算节点执行层级
     * Level 0 = 无依赖，可立即执行
     * Level N = 依赖 Level N-1 的节点
     */
    private calculateLevels;
    /**
     * 检测循环依赖
     * DFS 检查是否存在回到起点路径
     */
    hasCycle(nodes: Map<string, DAGNode>, startId: string): boolean;
    /**
     * 按层级分组节点
     * 同层级节点可并行执行
     */
    groupByLevel(nodes: Map<string, DAGNode>): DAGNode[][];
    /**
     * 获取并行执行分组
     * @param graph DAG 执行图
     * @returns 可并行执行的步骤 ID 数组（按层级）
     */
    getParallelGroups(graph: DAGExecutionGraph): string[][];
    /**
     * 获取可立即执行的步骤（Level 0）
     */
    getReadySteps(graph: DAGExecutionGraph): WorkflowStepDef[];
    /**
     * 获取下一步可执行的步骤（当前层级完成后）
     * @param graph DAG 执行图
     * @param completedIds 已完成的步骤 IDs
     */
    getNextReadySteps(graph: DAGExecutionGraph, completedIds: Set<string>): WorkflowStepDef[];
}
/** 默认 DAGBuilder 实例 */
export declare const defaultDAGBuilder: DAGBuilder;
