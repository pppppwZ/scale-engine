/**
 * SCALE Engine — FSM (Finite State Machine) Engine
 *
 * 系统的"宪法执行者"。
 * 所有 Artifact 状态变化必须通过 fsm.transition()，禁止任何代码绕过。
 *
 * 设计参考：docs/02-DATA-MODEL.md §三、docs/03-CORE-MODULES.md §3.2
 */
import { InvalidTransitionError, ArtifactNotFoundError, } from './types.js';
import { logger } from '../core/logger.js';
export class FSM {
    constructor(store, eventBus) {
        this.store = store;
        this.eventBus = eventBus;
        this.registry = new Map();
        /** Per-artifact lock chain to prevent concurrent transitions */
        this.locks = new Map();
    }
    register(definition) {
        if (this.registry.has(definition.type)) {
            throw new Error(`FSM already registered for type: ${definition.type}`);
        }
        this.registry.set(definition.type, definition);
        logger.debug({ type: definition.type, states: definition.states }, 'FSM registered');
    }
    getDefinition(type) {
        return this.registry.get(type);
    }
    async canTransition(artifactId, action) {
        const artifact = await this.store.get(artifactId);
        if (!artifact)
            throw new ArtifactNotFoundError(artifactId);
        const def = this.registry.get(artifact.type);
        if (!def)
            throw new Error(`No FSM registered for type: ${artifact.type}`);
        const tx = def.transitions.find((t) => t.from === artifact.status && t.action === action);
        if (!tx)
            return { allowed: false, blockedBy: [{ guard: 'transition', message: `No transition from '${artifact.status}' via '${action}'` }] };
        const failures = [];
        for (const guard of tx.guards ?? []) {
            try {
                const passed = await guard.check(artifact, {
                    actor: { kind: 'system', component: 'FSM.canTransition' },
                });
                if (!passed)
                    failures.push({ guard: guard.name, message: guard.errorMessage });
            }
            catch (e) {
                failures.push({ guard: guard.name, message: `Guard threw: ${e.message}` });
            }
        }
        return { allowed: failures.length === 0, blockedBy: failures.length > 0 ? failures : undefined };
    }
    async transition(artifactId, action, context) {
        // Concurrency lock: serialize transitions per artifact
        const prev = this.locks.get(artifactId) ?? Promise.resolve();
        let releaseLock;
        const acquired = new Promise((resolve) => { releaseLock = resolve; });
        this.locks.set(artifactId, prev.then(() => acquired));
        await prev;
        try {
            return await this.executeTransition(artifactId, action, context);
        }
        finally {
            releaseLock();
            // Clean up lock entry if no pending chain
            if (this.locks.get(artifactId) === prev.then(() => acquired)) {
                this.locks.delete(artifactId);
            }
        }
    }
    async executeTransition(artifactId, action, context) {
        const artifact = await this.store.get(artifactId);
        if (!artifact)
            throw new ArtifactNotFoundError(artifactId);
        const def = this.registry.get(artifact.type);
        if (!def)
            throw new Error(`No FSM registered for type: ${artifact.type}`);
        const tx = def.transitions.find((t) => t.from === artifact.status && t.action === action);
        if (!tx)
            throw new InvalidTransitionError(artifact.status, action);
        // Phase 1: 检查所有 guards
        const failures = [];
        for (const guard of tx.guards ?? []) {
            try {
                const passed = await guard.check(artifact, context);
                if (!passed) {
                    failures.push({ guard: guard.name, message: guard.errorMessage });
                }
            }
            catch (e) {
                failures.push({
                    guard: guard.name,
                    message: `Guard threw: ${e.message}`,
                });
            }
        }
        if (failures.length > 0) {
            logger.info({ artifactId, action, failures }, 'Transition blocked by guards');
            return { success: false, blockedBy: failures, effectsExecuted: [] };
        }
        // Phase 2: 写状态历史 + 更新状态（事件先发，后落 DB）
        const event = this.eventBus.emit('artifact.transitioned', {
            artifactId,
            from: artifact.status,
            to: tx.to,
            reason: context.reason,
        }, {
            sessionId: 'system',
            actor: context.actor,
            artifactId,
        });
        const updated = await this.store.update(artifactId, {
            status: tx.to,
            statusHistory: [
                ...artifact.statusHistory,
                {
                    from: artifact.status,
                    to: tx.to,
                    at: Date.now(),
                    by: context.actor,
                    reason: context.reason,
                    eventId: event.id,
                },
            ],
            updatedAt: Date.now(),
            ...(def.terminal.includes(tx.to) ? { closedAt: Date.now() } : {}),
        });
        logger.info({ artifactId, from: artifact.status, to: tx.to, by: context.actor }, 'Transition completed');
        // Phase 3: 异步执行 effects（不阻塞返回，但记录失败）
        const effectsExecuted = [];
        for (const effect of tx.effects ?? []) {
            try {
                await effect.run(updated, context);
                effectsExecuted.push(effect.name);
            }
            catch (e) {
                logger.error({ artifactId, effect: effect.name, error: e.message }, 'Effect execution failed');
                // Effect 失败不回滚状态迁移（事件已发出，下游可补偿）
            }
        }
        return { success: true, artifact: updated, effectsExecuted };
    }
    /** Number of artifacts with pending lock chains (for testing/monitoring) */
    get pendingLocks() {
        return this.locks.size;
    }
    async availableActions(artifactId) {
        const artifact = await this.store.get(artifactId);
        if (!artifact)
            throw new ArtifactNotFoundError(artifactId);
        const def = this.registry.get(artifact.type);
        if (!def)
            return [];
        return def.transitions
            .filter((t) => t.from === artifact.status)
            .map((t) => t.action);
    }
}
// ============================================================================
// 内置 FSM 定义（11 种 Artifact）
// 这些定义在 src/artifact/fsmDefinitions/ 下完整实现
// 此处只列 Spec 作为示例
// ============================================================================
export const SpecFSM = {
    type: 'Spec',
    states: ['DRAFT', 'REVIEWING', 'FROZEN', 'REVISING', 'OBSOLETED'],
    initial: 'DRAFT',
    terminal: ['OBSOLETED'],
    transitions: [
        {
            from: 'DRAFT',
            action: 'refine',
            to: 'REVIEWING',
        },
        {
            from: 'REVIEWING',
            action: 'reject',
            to: 'DRAFT',
        },
        {
            from: 'REVIEWING',
            action: 'approve',
            to: 'FROZEN',
            guards: [
                {
                    name: 'ambiguity_below_threshold',
                    check: (a) => {
                        const payload = a.payload;
                        return (payload.ambiguityScore ?? 1) <= 0.2;
                    },
                    errorMessage: 'Spec 模糊度必须 ≤ 0.2 才能 FROZEN',
                },
            ],
        },
        {
            from: 'FROZEN',
            action: 'challenge',
            to: 'REVISING',
            // effects 在运行时由 Engine 注入（避免循环依赖）
        },
        {
            from: 'REVISING',
            action: 'finalize',
            to: 'FROZEN',
        },
        {
            from: 'FROZEN',
            action: 'supersede',
            to: 'OBSOLETED',
        },
    ],
};
// 其他 FSM 定义占位（W2 完整实现）
// export const NeedFSM: FSMDefinition = { ... }
// export const PlanFSM: FSMDefinition = { ... }
// export const TaskFSM: FSMDefinition = { ... }
// export const ChangeFSM: FSMDefinition = { ... }
// export const DefectFSM: FSMDefinition = { ... }
// ...
//# sourceMappingURL=fsm.js.map