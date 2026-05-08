import type { IEventBus } from "../core/eventBus.js";
import type { ISkillRegistry, SkillExecutionType } from "./SkillRegistry.js";
import type { ICapabilityRegistry } from "../capabilities/types.js";
export interface SkillExecutionResult {
    skillId: string;
    type: SkillExecutionType;
    success: boolean;
    output?: unknown;
    error?: string;
    durationMs: number;
}
export interface ISkillExecutor {
    execute(skillId: string, input: Record<string, unknown>): Promise<SkillExecutionResult>;
    executeCliCommand(command: string, _parameters: Record<string, unknown>): Promise<SkillExecutionResult>;
    executeBuiltinFunction(functionName: string, input: Record<string, unknown>): Promise<SkillExecutionResult>;
    registerBuiltinFunction(name: string, fn: (input: Record<string, unknown>) => Promise<unknown>): void;
}
export declare class SkillExecutor implements ISkillExecutor {
    private skillRegistry;
    private eventBus;
    private capabilityRegistry?;
    private builtinFunctions;
    constructor(skillRegistry: ISkillRegistry, eventBus: IEventBus, capabilityRegistry?: ICapabilityRegistry);
    execute(skillId: string, input: Record<string, unknown>): Promise<SkillExecutionResult>;
    executeCliCommand(command: string, _parameters: Record<string, unknown>): Promise<SkillExecutionResult>;
    executeBuiltinFunction(functionName: string, input: Record<string, unknown>): Promise<SkillExecutionResult>;
    registerBuiltinFunction(name: string, fn: (input: Record<string, unknown>) => Promise<unknown>): void;
    executeMCPTool(toolName: string, input: Record<string, unknown>): Promise<SkillExecutionResult>;
    private getToolCategory;
    private executeBrowserAction;
    private executeSearchAction;
    private executeComputerAction;
    private mapToolToAction;
    private mapToolToComputerAction;
    private registerDefaultBuiltinFunctions;
    private runCommand;
}
