import type { IArtifactStore } from '../artifact/store.js';
import type { IEventBus } from '../core/eventBus.js';
import type { IFSM } from '../artifact/fsm.js';
/**
 * ReviewEnforcer - 编码完成后强制调用评审 Agent
 *
 * 文章证据：评审 Agent 发现了编码 Agent 遗漏的渠道判断逻辑（潜在线上故障）
 *
 * 工作流程：
 * 1. Task 状态从 IN_PROGRESS → REVIEW_REQUIRED (新增状态)
 * 2. 自动触发 code-reviewer agent 评审
 * 3. 评审通过 → REVIEW_PASSED → DONE
 * 4. 评审不通过 → REVIEW_FAILED → 回退到 IN_PROGRESS
 */
export declare class ReviewEnforcer {
    private store;
    private eventBus;
    private fsm;
    constructor(store: IArtifactStore, eventBus: IEventBus, fsm: IFSM);
    /**
     * Harness: 检查是否需要强制评审
     */
    shouldEnforceReview(taskId: string): Promise<boolean>;
    /**
     * Harness: 强制评审入口
     * 编码完成后自动触发，不依赖人工
     */
    enforceReview(taskId: string): Promise<ReviewResult>;
    /**
     * Harness: 自动回退机制
     * 评审不通过时，自动回退到 IN_PROGRESS 状态
     */
    rollbackOnReviewFailure(taskId: string, reasons: string[]): Promise<void>;
    /**
     * Harness: 评审循环上限
     * 文章启发：评审最多 2 轮，超出升级人工决策
     */
    checkReviewIteration(taskId: string): Promise<{
        exceeded: boolean;
        iteration: number;
    }>;
}
export interface ReviewResult {
    passed: boolean;
    taskId: string;
    reasons?: string[];
    gateResults?: Array<{
        gate: any;
        passed: boolean;
        reason?: string;
    }>;
}
