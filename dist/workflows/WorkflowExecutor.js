// SCALE Engine — Workflow Executor (v0.7.0)
// 工作流执行器：执行预设工作流步骤
import { GateParser } from "./GateParser.js";
import { logger } from "../core/logger.js";
export class WorkflowExecutor {
    constructor(eventBus, store) {
        this.sessions = new Map();
        this.gateParser = new GateParser();
        this.eventBus = eventBus;
        this.store = store;
    }
    async start(preset, context) {
        const session = {
            id: `WF-${Date.now()}`,
            presetId: preset.id,
            presetName: preset.name,
            currentStep: 0,
            totalSteps: preset.steps.length,
            status: "running",
            verifiedSteps: [],
            stepHistory: preset.steps.map((s, i) => ({
                stepId: s.stepId, stepIndex: i, action: s.action, status: "pending", startedAt: 0
            })),
            startedAt: Date.now(),
            context,
        };
        this.sessions.set(session.id, session);
        this.eventBus.emit("workflow.started", { sessionId: session.id, presetId: preset.id });
        logger.info({ sessionId: session.id, presetId: preset.id }, "Workflow started");
        return session;
    }
    async getStatus(sessionId) {
        return this.sessions.get(sessionId) ?? null;
    }
    async pause(sessionId, reason) {
        const session = this.sessions.get(sessionId);
        if (!session)
            return;
        session.status = "paused";
        session.pausedAt = Date.now();
        session.blockingReason = reason;
        this.eventBus.emit("workflow.paused", { sessionId, reason });
        logger.info({ sessionId, reason }, "Workflow paused");
    }
    async resume(sessionId) {
        const session = this.sessions.get(sessionId);
        if (!session || session.status !== "paused")
            return;
        session.status = "running";
        session.pausedAt = undefined;
        session.blockingReason = undefined;
        this.eventBus.emit("workflow.resumed", { sessionId });
        logger.info({ sessionId }, "Workflow resumed");
    }
    async executeStep(sessionId, stepIndex) {
        const session = this.sessions.get(sessionId);
        if (!session)
            throw new Error("Session not found");
        if (session.status === "paused")
            throw new Error("Session is paused");
        const idx = stepIndex ?? session.currentStep;
        const step = session.stepHistory[idx];
        if (!step)
            throw new Error("Step not found");
        step.status = "running";
        step.startedAt = Date.now();
        try {
            // 执行动作（模拟）
            step.output = await this.executeAction(session.context, step.action);
            // 验证门控
            const presetStep = this.getPresetStep(session.presetId, idx);
            if (presetStep?.verificationGate) {
                const gateResult = await this.gateParser.evaluateString(presetStep.verificationGate, {
                    artifact: await this.getRelatedArtifact(session.context),
                    runCommand: async (_cmd) => ({ success: true, output: "" })
                });
                step.gateResult = gateResult;
                if (!gateResult.passed) {
                    step.status = "failed";
                    step.error = gateResult.reason;
                    session.status = "blocked";
                    session.blockingReason = gateResult.reason;
                    return step;
                }
            }
            step.status = "verified";
            step.completedAt = Date.now();
            session.verifiedSteps.push(idx);
            session.currentStep = idx + 1;
            if (session.currentStep >= session.totalSteps) {
                session.status = "completed";
                session.completedAt = Date.now();
                this.eventBus.emit("workflow.completed", { sessionId });
            }
            return step;
        }
        catch (err) {
            step.status = "failed";
            step.error = String(err);
            step.completedAt = Date.now();
            session.status = "failed";
            throw err;
        }
    }
    async runAll(sessionId) {
        const session = this.sessions.get(sessionId);
        if (!session)
            throw new Error("Session not found");
        for (let i = 0; i < session.totalSteps; i++) {
            if (session.status === "blocked" || session.status === "failed")
                break;
            await this.executeStep(sessionId, i);
        }
        return session;
    }
    async getHistory(sessionId) {
        const session = this.sessions.get(sessionId);
        return session?.stepHistory ?? [];
    }
    async executeAction(_context, action) {
        // 模拟执行，实际由 Agent 或 CLI 处理
        if (action.startsWith("scale "))
            return { command: action, executed: true };
        return { action, result: "simulated" };
    }
    getPresetStep(presetId, stepIndex) {
        // 从 presets.ts 导入的预设中获取 - 简化版本
        const presets = {
            "basic-dev": [{ stepId: "explore", action: "explore", isMandatory: true }],
            "tdd-dev": [{ stepId: "explore", action: "explore", isMandatory: true }],
            "bug-fix": [{ stepId: "reproduce", action: "reproduce", isMandatory: true }],
        };
        return presets[presetId]?.[stepIndex];
    }
    async getRelatedArtifact(context) {
        const artifactId = context.artifactId;
        if (!artifactId)
            return undefined;
        const artifact = await this.store.get(artifactId);
        return artifact ?? undefined;
    }
}
//# sourceMappingURL=WorkflowExecutor.js.map