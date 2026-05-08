import type { Gate, GateCondition, TaskPayload } from '../artifact/types.js';
export declare class GateEvaluator {
    static evaluate(conditionStr: string, payload: Record<string, unknown>): boolean;
    static parseConditions(conditionStr: string): GateCondition[];
    static checkCondition(condition: GateCondition, payload: Record<string, unknown>): {
        passed: boolean;
        reason?: string;
    };
    static HARNESS_GATES: Record<string, Gate>;
    static checkHarnessGates(payload: TaskPayload, requiredGates?: string[]): {
        passed: boolean;
        gateResults: Array<{
            gate: Gate;
            passed: boolean;
            reason?: string;
        }>;
    };
}
