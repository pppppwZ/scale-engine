/**
 * SCALE Engine — Core Types
 *
 * 这是整个系统的"灵魂"。
 * 所有 Artifact、Event、FSM 类型都在这里定义。
 * 修改这个文件需要 W4 末的"数据模型冻结评审"通过。
 *
 * 设计参考：docs/02-DATA-MODEL.md
 */
// ============================================================================
// 11. 错误类型
// ============================================================================
export class ScaleError extends Error {
    constructor(message, code, details) {
        super(message);
        this.code = code;
        this.details = details;
        this.name = 'ScaleError';
    }
}
export class InvalidTransitionError extends ScaleError {
    constructor(from, action) {
        super(`State '${from}' does not support action '${action}'`, 'INVALID_TRANSITION', {
            from,
            action,
        });
    }
}
export class GuardFailedError extends ScaleError {
    constructor(failures) {
        super(`Transition blocked by guards: ${failures.map((f) => f.guard).join(', ')}`, 'GUARD_FAILED', {
            failures,
        });
        this.failures = failures;
    }
}
export class RoleDeniedError extends ScaleError {
    constructor(role, reason) {
        super(`Role '${role}' denied: ${reason}`, 'ROLE_DENIED', { role, reason });
    }
}
export class ArtifactNotFoundError extends ScaleError {
    constructor(id) {
        super(`Artifact '${id}' not found`, 'ARTIFACT_NOT_FOUND', { id });
    }
}
/** 场景模式预设配置 */
export const SCENARIO_MODE_CONFIGS = {
    sandbox: {
        mode: 'sandbox',
        detectorSensitivity: 'low',
        verificationRequired: false,
        humanConfirmationRequired: false,
        auditTrail: false,
        maxRetries: 10,
    },
    standard: {
        mode: 'standard',
        detectorSensitivity: 'medium',
        verificationRequired: true,
        humanConfirmationRequired: false,
        auditTrail: true,
        maxRetries: 5,
    },
    critical: {
        mode: 'critical',
        detectorSensitivity: 'high',
        verificationRequired: true,
        humanConfirmationRequired: true,
        auditTrail: true,
        maxRetries: 3,
    },
};
//# sourceMappingURL=types.js.map