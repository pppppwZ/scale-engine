// SCALE Engine — Gate Parser (v0.7.0)
// 解析验证门控表达式

import type { Artifact } from "../artifact/types.js"
// import { logger } from "../core/logger.js"  // unused - kept for future use

export interface GateExpression {
  type: "comparison" | "status_check" | "command_check" | "approval_check" | "compound" | "presence_check" | "unsupported"
  field?: string
  operator?: string
  value?: string | number
  command?: string
  expressions?: GateExpression[]
  connector?: "and" | "or"
  raw?: string
}

export interface GateResult {
  passed: boolean
  expression: string
  evaluated: GateExpression
  reason: string
  details?: Record<string, unknown>
}

export interface IGateParser {
  parse(expression: string): GateExpression
  evaluate(expr: GateExpression, context: { artifact?: Artifact; runCommand?: (cmd: string) => Promise<{ success: boolean; output: string }> }): Promise<GateResult>
  evaluateString(expression: string, context: { artifact?: Artifact; runCommand?: (cmd: string) => Promise<{ success: boolean; output: string }> }): Promise<GateResult>
}

export class GateParser implements IGateParser {
  parse(expression: string): GateExpression {
    const expr = expression.trim()
    if (expr.includes(" and ") || expr.includes(" or ")) {
      const connector = expr.includes(" and ") ? "and" : "or"
      const parts = expr.split(connector === "and" ? " and " : " or ")
      return { type: "compound", connector, expressions: parts.map(p => this.parse(p)) }
    }

    if (expr.includes(" == ") || expr.includes(" != ")) {
      const op = expr.includes(" == ") ? "==" : "!="
      const [field, value] = expr.split(" " + op + " ")
      return { type: "status_check", field: field.trim(), operator: op, value: value.trim() }
    }

    const normalized = expr.replace(/≤/g, "<=").replace(/≥/g, ">=")
    const compMatch = normalized.match(/([a-zA-Z_][a-zA-Z0-9_.]*)\s*(<=|>=|<|>|==)\s*([0-9.]+|[a-zA-Z_][a-zA-Z0-9_.]*)/)
    if (compMatch) {
      const rawValue = compMatch[3]
      const parsedValue = /^\d+(\.\d+)?$/.test(rawValue) ? Number(rawValue) : rawValue
      return { type: "comparison", field: compMatch[1], operator: compMatch[2], value: parsedValue }
    }

    const presenceMatch = expr.match(/^([a-zA-Z_][a-zA-Z0-9_.]*)\s+(present|identified|defined)$/)
    if (presenceMatch) {
      return { type: "presence_check", field: presenceMatch[1], operator: presenceMatch[2] }
    }

    if (expr.includes(" pass") || expr.includes(" fails")) {
      const cmd = expr.replace(" pass", "").replace(" fails", "").trim()
      return { type: "command_check", command: cmd }
    }

    if (expr.includes("approval") || expr.includes("human")) return { type: "approval_check" }

    return { type: "unsupported", raw: expr }
  }

  async evaluate(expr: GateExpression, ctx: { artifact?: Artifact; runCommand?: (cmd: string) => Promise<{ success: boolean; output: string }> }): Promise<GateResult> {
    if (expr.type === "comparison") return this.evalComparison(expr, ctx)
    if (expr.type === "status_check") return this.evalStatus(expr, ctx)
    if (expr.type === "presence_check") return this.evalPresence(expr, ctx)
    if (expr.type === "command_check") return this.evalCommand(expr, ctx)
    if (expr.type === "approval_check") return { passed: false, expression: "human approval", evaluated: expr, reason: "Requires human approval" }
    if (expr.type === "compound") return this.evalCompound(expr, ctx)
    if (expr.type === "unsupported") return { passed: false, expression: expr.raw ?? "", evaluated: expr, reason: "Unsupported gate expression" }
    return { passed: false, expression: "", evaluated: expr, reason: "Unknown type" }
  }

  async evaluateString(expr: string, ctx: { artifact?: Artifact; runCommand?: (cmd: string) => Promise<{ success: boolean; output: string }> }): Promise<GateResult> {
    return this.evaluate(this.parse(expr), ctx)
  }

  private evalComparison(expr: GateExpression, ctx: { artifact?: Artifact }): GateResult {
    if (!ctx.artifact) return { passed: false, expression: "", evaluated: expr, reason: "No artifact" }
    const payload = ctx.artifact.payload as Record<string, unknown>
    const fieldValue = this.resolveField(payload, ctx.artifact, expr.field)
    const target = expr.value

    if (fieldValue === undefined || fieldValue === null) {
      return { passed: false, expression: `${expr.field} ${expr.operator} ${expr.value}`, evaluated: expr, reason: "Field missing" }
    }

    let passed = false
    if (expr.operator === "<=") passed = Number(fieldValue) <= Number(target)
    else if (expr.operator === ">=") passed = Number(fieldValue) >= Number(target)
    else if (expr.operator === "<") passed = Number(fieldValue) < Number(target)
    else if (expr.operator === ">") passed = Number(fieldValue) > Number(target)
    else if (expr.operator === "==") passed = String(fieldValue) === String(target)

    return { passed, expression: `${expr.field} ${expr.operator} ${expr.value}`, evaluated: expr, reason: passed ? "OK" : "Failed" }
  }

  private evalStatus(expr: GateExpression, ctx: { artifact?: Artifact }): GateResult {
    if (!ctx.artifact) return { passed: false, expression: "", evaluated: expr, reason: "No artifact" }
    const status = ctx.artifact.status
    const passed = expr.operator === "==" ? status === expr.value : status !== expr.value
    return { passed, expression: expr.field + " " + expr.operator + " " + expr.value, evaluated: expr, reason: passed ? "OK" : "Mismatch" }
  }

  private evalPresence(expr: GateExpression, ctx: { artifact?: Artifact }): GateResult {
    if (!ctx.artifact) return { passed: false, expression: "", evaluated: expr, reason: "No artifact" }
    const payload = ctx.artifact.payload as Record<string, unknown>
    const fieldValue = this.resolveField(payload, ctx.artifact, expr.field)
    const passed = fieldValue !== undefined && fieldValue !== null && String(fieldValue).trim().length > 0
    return {
      passed,
      expression: `${expr.field} ${expr.operator}`,
      evaluated: expr,
      reason: passed ? "OK" : "Field missing",
    }
  }

  private async evalCommand(expr: GateExpression, ctx: { runCommand?: (cmd: string) => Promise<{ success: boolean; output: string }> }): Promise<GateResult> {
    if (!ctx.runCommand) return { passed: false, expression: expr.command ?? "", evaluated: expr, reason: "No runner" }
    const result = await ctx.runCommand(expr.command ?? "")
    return { passed: result.success, expression: expr.command + " pass", evaluated: expr, reason: result.success ? "OK" : result.output }
  }

  private async evalCompound(expr: GateExpression, ctx: { artifact?: Artifact; runCommand?: (cmd: string) => Promise<{ success: boolean; output: string }> }): Promise<GateResult> {
    if (!expr.expressions) return { passed: false, expression: "", evaluated: expr, reason: "No sub-expr" }
    const results = await Promise.all(expr.expressions.map(e => this.evaluate(e, ctx)))
    const passed = expr.connector === "and" ? results.every(r => r.passed) : results.some(r => r.passed)
    return { passed, expression: expr.connector ?? "and", evaluated: expr, reason: passed ? "All OK" : "Some failed" }
  }

  private resolveField(payload: Record<string, unknown>, artifact: Artifact, field?: string): unknown {
    if (!field) return undefined
    if (field.includes(".")) {
      const [head, ...rest] = field.split(".")
      const root = head in payload ? payload[head] : (artifact as unknown as Record<string, unknown>)[head]
      return rest.reduce<unknown>((acc, key) => {
        if (acc && typeof acc === "object") return (acc as Record<string, unknown>)[key]
        return undefined
      }, root)
    }
    return payload[field] ?? (artifact as unknown as Record<string, unknown>)[field]
  }
}
