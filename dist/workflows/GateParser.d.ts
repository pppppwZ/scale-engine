import type { Artifact } from "../artifact/types.js";
export interface GateExpression {
    type: "comparison" | "status_check" | "command_check" | "approval_check" | "compound";
    field?: string;
    operator?: string;
    value?: string | number;
    command?: string;
    expressions?: GateExpression[];
    connector?: "and" | "or";
}
export interface GateResult {
    passed: boolean;
    expression: string;
    evaluated: GateExpression;
    reason: string;
    details?: Record<string, unknown>;
}
export interface IGateParser {
    parse(expression: string): GateExpression;
    evaluate(expr: GateExpression, context: {
        artifact?: Artifact;
        runCommand?: (cmd: string) => Promise<{
            success: boolean;
            output: string;
        }>;
    }): Promise<GateResult>;
    evaluateString(expression: string, context: {
        artifact?: Artifact;
        runCommand?: (cmd: string) => Promise<{
            success: boolean;
            output: string;
        }>;
    }): Promise<GateResult>;
}
export declare class GateParser implements IGateParser {
    parse(expression: string): GateExpression;
    evaluate(expr: GateExpression, ctx: {
        artifact?: Artifact;
        runCommand?: (cmd: string) => Promise<{
            success: boolean;
            output: string;
        }>;
    }): Promise<GateResult>;
    evaluateString(expr: string, ctx: {
        artifact?: Artifact;
        runCommand?: (cmd: string) => Promise<{
            success: boolean;
            output: string;
        }>;
    }): Promise<GateResult>;
    private evalComparison;
    private evalStatus;
    private evalCommand;
    private evalCompound;
}
