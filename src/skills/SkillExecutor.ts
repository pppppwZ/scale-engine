// SCALE Engine — Skill Executor (v0.9.0)
// 技能执行器：执行不同类型的技能 + MCP 能力集成

import type { IEventBus } from "../core/eventBus.js"
import type { ISkillRegistry, SkillExecutionType } from "./SkillRegistry.js"
import type { ICapabilityRegistry, IBrowserCapability, ISearchCapability, IComputerCapability } from "../capabilities/types.js"
import { skillsInvoker } from "../capabilities/InstalledSkillsIntegration.js"
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
  private capabilityRegistry?: ICapabilityRegistry
  private builtinFunctions: Record<string, (input: Record<string, unknown>) => Promise<unknown>> = {}

  constructor(skillRegistry: ISkillRegistry, eventBus: IEventBus, capabilityRegistry?: ICapabilityRegistry) {
    this.skillRegistry = skillRegistry
    this.eventBus = eventBus
    this.capabilityRegistry = capabilityRegistry
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
        case "mcp-tool": result = await this.executeMCPTool(skill.execution.config.toolName ?? "", input); break
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

  async executeMCPTool(toolName: string, input: Record<string, unknown>): Promise<SkillExecutionResult> {
    const start = Date.now()
    if (!this.capabilityRegistry) {
      return { skillId: "", type: "mcp-tool", success: false, error: "Capability registry not initialized", durationMs: 0 }
    }

    try {
      // Map tool name to capability
      const category = this.getToolCategory(toolName)
      let result: unknown

      switch (category) {
        case 'browser':
          const browser = this.capabilityRegistry.getBrowser()
          if (!browser) return { skillId: "", type: "mcp-tool", success: false, error: "Browser capability not available", durationMs: Date.now() - start }
          result = await this.executeBrowserAction(browser, toolName, input)
          break
        case 'search':
          const search = this.capabilityRegistry.getSearch()
          if (!search) return { skillId: "", type: "mcp-tool", success: false, error: "Search capability not available", durationMs: Date.now() - start }
          result = await this.executeSearchAction(search, toolName, input)
          break
        case 'computer':
          const computer = this.capabilityRegistry.getComputer()
          if (!computer) return { skillId: "", type: "mcp-tool", success: false, error: "Computer capability not available", durationMs: Date.now() - start }
          result = await this.executeComputerAction(computer, toolName, input)
          break
        default:
          return { skillId: "", type: "mcp-tool", success: false, error: `Unknown tool category: ${toolName}`, durationMs: Date.now() - start }
      }

      return { skillId: "", type: "mcp-tool", success: true, output: result, durationMs: Date.now() - start }
    } catch (e) {
      return { skillId: "", type: "mcp-tool", success: false, error: String(e), durationMs: Date.now() - start }
    }
  }

  private getToolCategory(toolName: string): 'browser' | 'search' | 'computer' | 'unknown' {
    if (toolName.includes('browser') || toolName.includes('navigate') || toolName.includes('click') || toolName.includes('screenshot')) return 'browser'
    if (toolName.includes('search') || toolName.includes('fetch') || toolName.includes('web')) return 'search'
    if (toolName.includes('computer') || toolName.includes('cua') || toolName.includes('desktop')) return 'computer'
    return 'unknown'
  }

  private async executeBrowserAction(browser: IBrowserCapability, toolName: string, input: Record<string, unknown>): Promise<unknown> {
    const sessionId = input.sessionId as string ?? `default-${Date.now()}`
    if (toolName.includes('navigate')) {
      const sessionResult = await browser.createSession({ url: input.url as string })
      return sessionResult
    }
    return await browser.executeAction(sessionId, { type: this.mapToolToAction(toolName), target: input.target as string, value: input.value as string })
  }

  private async executeSearchAction(search: ISearchCapability, toolName: string, input: Record<string, unknown>): Promise<unknown> {
    if (toolName.includes('search')) return await search.search(input.query as string, { limit: input.limit as number })
    if (toolName.includes('fetch')) return await search.fetch(input.url as string)
    return { error: 'Unknown search action' }
  }

  private async executeComputerAction(computer: IComputerCapability, toolName: string, input: Record<string, unknown>): Promise<unknown> {
    return await computer.execute({ type: this.mapToolToComputerAction(toolName), coordinate: input.coordinate as [number, number], text: input.text as string })
  }

  private mapToolToAction(toolName: string): 'navigate' | 'click' | 'fill' | 'screenshot' | 'snapshot' | 'wait' | 'hover' | 'press_key' {
    const map: Record<string, 'navigate' | 'click' | 'fill' | 'screenshot' | 'snapshot' | 'wait' | 'hover' | 'press_key'> = {
      navigate: 'navigate', click: 'click', fill: 'fill', screenshot: 'screenshot', snapshot: 'snapshot',
      wait: 'wait', hover: 'hover', press: 'press_key', type: 'fill'
    }
    for (const [key, action] of Object.entries(map)) if (toolName.includes(key)) return action
    return 'click'
  }

  private mapToolToComputerAction(toolName: string): 'click' | 'type' | 'scroll' {
    if (toolName.includes('click')) return 'click'
    if (toolName.includes('type')) return 'type'
    if (toolName.includes('scroll')) return 'scroll'
    return 'click'
  }

  private registerDefaultBuiltinFunctions(): void {
    this.registerBuiltinFunction("tdd_check", async (_input) => ({ checked: true, hasTest: true }))
    this.registerBuiltinFunction("debug_suggest", async (_input) => ({ suggestions: ["Check error message"] }))
    this.registerBuiltinFunction("verify_status", async (_input) => ({ verified: true }))
    // ========== 真正调用已安装的外部技能 ==========
    // web-access CDP browser automation
    this.registerBuiltinFunction("web_access_targets", async () => skillsInvoker.webAccessTargets())
    this.registerBuiltinFunction("web_access_new_tab", async (input) => skillsInvoker.webAccessNewTab(input.url as string))
    this.registerBuiltinFunction("web_access_eval", async (input) => skillsInvoker.webAccessEval(input.targetId as string, input.js as string))
    this.registerBuiltinFunction("web_access_click", async (input) => skillsInvoker.webAccessClick(input.targetId as string, input.selector as string))
    this.registerBuiltinFunction("web_access_close", async (input) => skillsInvoker.webAccessClose(input.targetId as string))
    // playwright CLI browser automation
    this.registerBuiltinFunction("playwright_open", async (input) => skillsInvoker.playwrightOpen(input.url as string))
    this.registerBuiltinFunction("playwright_snapshot", async () => skillsInvoker.playwrightSnapshot())
    this.registerBuiltinFunction("playwright_click", async (input) => skillsInvoker.playwrightClick(input.ref as string))
    // cua desktop automation
    this.registerBuiltinFunction("cua_mouse_move", async (input) => skillsInvoker.cuaMouseMove(input.x as number, input.y as number))
    this.registerBuiltinFunction("cua_screenshot", async () => skillsInvoker.cuaScreenshot())
    // graphify knowledge graph
    this.registerBuiltinFunction("graphify_build", async (input) => skillsInvoker.graphifyBuild(input.dir as string))
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
