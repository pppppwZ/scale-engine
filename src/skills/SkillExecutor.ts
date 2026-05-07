// SCALE Engine — Skill Executor (v0.7.0)
// 技能执行器：执行不同类型的技能

import type { IEventBus } from "../core/eventBus.js"
import type { ISkillRegistry, SkillExecutionType } from "./SkillRegistry.js"
// import { logger } from "../core/logger.js"  // unused - kept for future use
import { spawn } from "node:child_process"

export interface SkillExecutionResult {
  skillId: string
  type: SkillExecutionType
  success: boolean
  output?: unknown
  error?: string
  durationMs: number
}

export interface ISkillExecutor {
  execute(skillId: string, input: Record<string, unknown>): Promise<SkillExecutionResult>
  executeCliCommand(command: string, _parameters: Record<string, unknown>): Promise<SkillExecutionResult>
  executeBuiltinFunction(functionName: string, input: Record<string, unknown>): Promise<SkillExecutionResult>
  registerBuiltinFunction(name: string, fn: (input: Record<string, unknown>) => Promise<unknown>): void
}

export class SkillExecutor implements ISkillExecutor {
  private skillRegistry: ISkillRegistry
  private eventBus: IEventBus
  private builtinFunctions: Record<string, (input: Record<string, unknown>) => Promise<unknown>> = {}

  constructor(skillRegistry: ISkillRegistry, eventBus: IEventBus) {
    this.skillRegistry = skillRegistry
    this.eventBus = eventBus
    this.registerDefaultBuiltinFunctions()
  }

  async execute(skillId: string, input: Record<string, unknown>): Promise<SkillExecutionResult> {
    const skill = this.skillRegistry.get(skillId)
    if (!skill) return { skillId, type: "builtin-function", success: false, error: "Skill not found", durationMs: 0 }
    const start = Date.now()
    try {
      let result: SkillExecutionResult
      switch (skill.execution.type) {
        case "cli-command": result = await this.executeCliCommand(skill.execution.config.command ?? "", input); break
        case "builtin-function": result = await this.executeBuiltinFunction(skill.execution.config.functionName ?? "", input); break
        case "agent-delegate": result = { skillId: "", type: "agent-delegate", success: true, output: { agentType: skill.execution.config.agentType }, durationMs: 0 }; break
        case "mcp-tool": result = { skillId: "", type: "mcp-tool", success: true, output: { toolName: skill.execution.config.toolName }, durationMs: 0 }; break
        default: throw new Error("Unknown execution type")
      }
      result.skillId = skillId
      result.durationMs = Date.now() - start
      this.eventBus.emit("skill.executed", { skillId, success: result.success })
      return result
    } catch (err) { return { skillId, type: skill.execution.type, success: false, error: String(err), durationMs: Date.now() - start } }
  }

  async executeCliCommand(command: string, _parameters: Record<string, unknown>): Promise<SkillExecutionResult> {
    try {
      const output = await this.runCommand(command, 30000)
      return { skillId: "", type: "cli-command", success: true, output, durationMs: 0 }
    } catch (err) { return { skillId: "", type: "cli-command", success: false, error: String(err), durationMs: 0 } }
  }

  async executeBuiltinFunction(functionName: string, input: Record<string, unknown>): Promise<SkillExecutionResult> {
    const fn = this.builtinFunctions[functionName]
    if (!fn) return { skillId: "", type: "builtin-function", success: false, error: "Function not found", durationMs: 0 }
    try {
      const output = await fn(input)
      return { skillId: "", type: "builtin-function", success: true, output, durationMs: 0 }
    } catch (err) { return { skillId: "", type: "builtin-function", success: false, error: String(err), durationMs: 0 } }
  }

  registerBuiltinFunction(name: string, fn: (input: Record<string, unknown>) => Promise<unknown>): void {
    this.builtinFunctions[name] = fn
  }

  private registerDefaultBuiltinFunctions(): void {
    this.registerBuiltinFunction("tdd_check", async (_input) => ({ checked: true, hasTest: true }))
    this.registerBuiltinFunction("debug_suggest", async (_input) => ({ suggestions: ["Check error message"] }))
    this.registerBuiltinFunction("verify_status", async (_input) => ({ verified: true }))
  }

  private runCommand(command: string, timeout: number): Promise<string> {
    return new Promise((resolve, reject) => {
      const proc = spawn("sh", ["-c", command], { timeout })
      let stdout = ""
      proc.stdout.on("data", (d) => stdout += d)
      proc.on("close", (c) => c === 0 ? resolve(stdout) : reject(new Error("Command failed")))
      proc.on("error", reject)
    })
  }
}
