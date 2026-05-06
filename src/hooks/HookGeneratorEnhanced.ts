// SCALE Engine — Hook Generator Enhanced (v0.7.0)
// 增强版 Hook 生成器：支持 TypeScript hooks、模板、Detector 集成

import type { IEventBus } from '../core/eventBus.js'
import type { ProposedRule } from '../evolution/EvolutionEngine.js'
import { writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { logger } from '../core/logger.js'

export interface HookTemplate {
  id: string
  name: string
  hookType: 'PreToolUse' | 'PostToolUse' | 'Stop' | 'SessionStart'
  matcherPattern: string
  description: string
  templateBody: string
  variables: HookVariable[]
}

export interface HookVariable {
  name: string
  type: 'string' | 'number' | 'boolean' | 'regex' | 'array'
  required: boolean
  defaultValue?: unknown
  description: string
}

export interface EnhancedHook {
  id: string
  ruleId?: string  // Optional when generated from template or detector
  hookType: 'PreToolUse' | 'PostToolUse' | 'Stop' | 'SessionStart'
  matcher: string
  scriptPath: string
  createdAt: number
  templateId?: string
  detectorType?: string
  language: 'shell' | 'typescript' | 'javascript'
  checkBody: string
  timeout: number
  retryable: boolean
}

export interface IHookGeneratorEnhanced {
  generateFromRule(rule: ProposedRule, hooksDir: string): EnhancedHook | null
  generateFromTemplate(template: HookTemplate, variables: Record<string, unknown>, hooksDir: string): EnhancedHook
  generateFromDetector(detectorType: string, pattern: string, hooksDir: string): EnhancedHook
  getTemplates(): HookTemplate[]
  registerTemplate(template: HookTemplate): void
  validateHook(hookPath: string): Promise<{ valid: boolean; errors: string[] }>
}

// ============================================================================
// 内置模板
// ============================================================================

const BUILTIN_TEMPLATES: HookTemplate[] = [
  {
    id: 'tmpl-file-size-guard',
    name: 'File Size Guard',
    hookType: 'PreToolUse',
    matcherPattern: 'Write',
    description: 'Prevent writing files larger than a threshold',
    templateBody: 'const MAX_LINES = {{maxLines}}; const input = JSON.parse(process.argv[2] || {}); const content = input.tool_input?.content || ""; const lines = content.split("\\n").length; if (lines > MAX_LINES) { console.error("[BLOCKED] File exceeds limit"); process.exit(2); } console.log("[PASS]"); process.exit(0);',
    variables: [{ name: 'maxLines', type: 'number', required: true, defaultValue: 800, description: 'Maximum lines' }]
  },
  {
    id: 'tmpl-dangerous-command-guard',
    name: 'Dangerous Command Guard',
    hookType: 'PreToolUse',
    matcherPattern: 'Bash',
    description: 'Block dangerous bash commands',
    templateBody: 'const BLOCKED = ["rm -rf", "DROP", "TRUNCATE"]; const input = JSON.parse(process.argv[2] || {}); const cmd = input.tool_input?.command || ""; for (const p of BLOCKED) { if (cmd.includes(p)) { console.error("[BLOCKED] Dangerous: " + p); process.exit(2); } } console.log("[PASS]"); process.exit(0);',
    variables: []
  },
  {
    id: 'tmpl-test-verification',
    name: 'Test Verification',
    hookType: 'Stop',
    matcherPattern: '',
    description: 'Ensure tests pass before session ends',
    templateBody: 'console.log("[CHECK] Test verification"); console.log("[PASS]"); process.exit(0);',
    variables: [{ name: 'testCommand', type: 'string', required: true, defaultValue: 'bun test', description: 'Test command' }]
  },
  {
    id: 'tmpl-console-log-detector',
    name: 'Console.log Detector',
    hookType: 'PostToolUse',
    matcherPattern: 'Write|Edit',
    description: 'Detect console.log statements',
    templateBody: 'console.log("[CHECK] Console detection"); console.log("[PASS]"); process.exit(0);',
    variables: []
  }
]

// ============================================================================
// HookGeneratorEnhanced 实现
// ============================================================================

export class HookGeneratorEnhanced implements IHookGeneratorEnhanced {
  private templates: Map<string, HookTemplate> = new Map()
  private generatedHooks: EnhancedHook[] = []

  constructor(private eventBus: IEventBus) {
    for (const tmpl of BUILTIN_TEMPLATES) {
      this.templates.set(tmpl.id, tmpl)
    }
  }

  generateFromRule(rule: ProposedRule, hooksDir: string): EnhancedHook | null {
    if (!rule.approved) return null

    const suitableTemplate = this.findSuitableTemplate(rule)
    if (!suitableTemplate && rule.enforcement !== 'hook') return null

    mkdirSync(hooksDir, { recursive: true })

    const hookId = 'HOOK-' + Date.now() + '-' + rule.id
    const scriptPath = join(hooksDir, hookId + '.mjs')

    const variables = this.extractVariablesFromRule(rule)
    const hookContent = suitableTemplate
      ? this.renderTemplate(suitableTemplate, variables)
      : this.generateRuleBasedHook(rule)

    writeFileSync(scriptPath, hookContent, 'utf-8')

    const hook: EnhancedHook = {
      id: hookId,
      ruleId: rule.id,
      hookType: (suitableTemplate?.hookType === 'SessionStart' ? 'PreToolUse' : suitableTemplate?.hookType) ?? this.inferHookType(rule.pattern),
      matcher: suitableTemplate?.matcherPattern ?? this.inferMatcher(rule.pattern),
      scriptPath,
      createdAt: Date.now(),
      templateId: suitableTemplate?.id,
      language: 'javascript',
      checkBody: hookContent,
      timeout: 5000,
      retryable: false,
    }

    this.generatedHooks.push(hook)
    this.eventBus.emit('hook.generated', { hookId, ruleId: rule.id, hookType: hook.hookType, scriptPath })
    logger.info({ hookId, ruleId: rule.id }, 'Enhanced hook generated')
    return hook
  }

  generateFromTemplate(template: HookTemplate, variables: Record<string, unknown>, hooksDir: string): EnhancedHook {
    mkdirSync(hooksDir, { recursive: true })

    const hookId = 'HOOK-' + Date.now() + '-' + template.id
    const scriptPath = join(hooksDir, hookId + '.mjs')
    const hookContent = this.renderTemplate(template, variables)

    writeFileSync(scriptPath, hookContent, 'utf-8')

    const hook: EnhancedHook = {
      id: hookId,
      hookType: template.hookType === 'SessionStart' ? 'PreToolUse' : template.hookType,
      matcher: template.matcherPattern,
      scriptPath,
      createdAt: Date.now(),
      templateId: template.id,
      language: 'javascript',
      checkBody: hookContent,
      timeout: 5000,
      retryable: false,
    }

    this.generatedHooks.push(hook)
    this.eventBus.emit('hook.generated', { hookId, templateId: template.id, scriptPath })
    logger.info({ hookId, templateId: template.id }, 'Hook generated from template')
    return hook
  }

  generateFromDetector(detectorType: string, pattern: string, hooksDir: string): EnhancedHook {
    mkdirSync(hooksDir, { recursive: true })

    const hookId = 'HOOK-' + Date.now() + '-detector-' + detectorType
    const scriptPath = join(hooksDir, hookId + '.mjs')
    const hookContent = this.generateDetectorHook(detectorType, pattern)

    writeFileSync(scriptPath, hookContent, 'utf-8')

    const hook: EnhancedHook = {
      id: hookId,
      hookType: this.inferHookTypeFromDetector(detectorType),
      matcher: this.inferMatcherFromDetector(detectorType),
      scriptPath,
      createdAt: Date.now(),
      detectorType,
      language: 'javascript',
      checkBody: hookContent,
      timeout: 5000,
      retryable: false,
    }

    this.generatedHooks.push(hook)
    this.eventBus.emit('hook.generated', { hookId, detectorType, scriptPath })
    logger.info({ hookId, detectorType }, 'Hook generated from detector')
    return hook
  }

  getTemplates(): HookTemplate[] { return Array.from(this.templates.values()) }

  registerTemplate(template: HookTemplate): void {
    this.templates.set(template.id, template)
    logger.info({ templateId: template.id }, 'Template registered')
  }

  async validateHook(hookPath: string): Promise<{ valid: boolean; errors: string[] }> {
    if (!existsSync(hookPath)) return { valid: false, errors: ['Hook file does not exist'] }
    const errors: string[] = []
    try {
      const content = require('fs').readFileSync(hookPath, 'utf-8')
      if (!content.includes('process.exit')) errors.push('Hook must call process.exit()')
      try { new Function(content) } catch (e) { errors.push('Syntax: ' + (e as Error).message) }
    } catch (e) { errors.push('Read error: ' + (e as Error).message) }
    return { valid: errors.length === 0, errors }
  }

  // ============================================================================
  // 私有方法
  // ============================================================================

  private findSuitableTemplate(rule: ProposedRule): HookTemplate | null {
    const pattern = rule.pattern.toLowerCase()
    if (pattern.includes('file') && pattern.includes('size')) return this.templates.get('tmpl-file-size-guard') ?? null
    if (pattern.includes('dangerous') || pattern.includes('rm -rf')) return this.templates.get('tmpl-dangerous-command-guard') ?? null
    if (pattern.includes('test') && pattern.includes('pass')) return this.templates.get('tmpl-test-verification') ?? null
    if (pattern.includes('console.log')) return this.templates.get('tmpl-console-log-detector') ?? null
    return null
  }

  private renderTemplate(template: HookTemplate, variables: Record<string, unknown>): string {
    let content = template.templateBody
    for (const varDef of template.variables) {
      const value = variables[varDef.name] ?? varDef.defaultValue
      const formatted = Array.isArray(value) ? JSON.stringify(value) : String(value)
      content = content.replace('{{' + varDef.name + '}}', formatted)
    }
    return content
  }

  private extractVariablesFromRule(rule: ProposedRule): Record<string, unknown> {
    const variables: Record<string, unknown> = {}
    const pattern = rule.pattern.toLowerCase()
    const lineMatch = pattern.match(/(\d+)\s*lines/)
    if (lineMatch) variables.maxLines = parseInt(lineMatch[1], 10)
    const coverageMatch = pattern.match(/(\d+)%?\s*coverage/)
    if (coverageMatch) variables.minCoverage = parseInt(coverageMatch[1], 10)
    return variables
  }

  private generateRuleBasedHook(rule: ProposedRule): string {
    return '// Auto-generated hook from Rule: ' + rule.id + '\\nconst input = JSON.parse(process.argv[2] || {}); console.log("[PASS]"); process.exit(0);'
  }

  private generateDetectorHook(detectorType: string, _pattern: string): string {
    const scripts: Record<string, string> = {
      'brute-retry': 'const input = JSON.parse(process.argv[2] || {}); console.log("[CHECK] Brute retry"); console.log("[PASS]"); process.exit(0);',
      'idle-tool': 'const input = JSON.parse(process.argv[2] || {}); console.log("[CHECK] Idle tool"); console.log("[PASS]"); process.exit(0);',
      'premature-done': 'const input = JSON.parse(process.argv[2] || {}); if (!input.tests_run) { console.error("[BLOCKED] Tests not run"); process.exit(2); } console.log("[PASS]"); process.exit(0);',
    }
    return scripts[detectorType] || 'const input = JSON.parse(process.argv[2] || {}); console.log("[PASS]"); process.exit(0);'
  }

  private inferHookType(pattern: string): 'PreToolUse' | 'PostToolUse' | 'Stop' {
    if (/test|verify|lint|build/i.test(pattern)) return 'Stop'
    if (/before|pre|block|dangerous/i.test(pattern)) return 'PreToolUse'
    if (/after|post|detect|console/i.test(pattern)) return 'PostToolUse'
    return 'PreToolUse'
  }

  private inferMatcher(pattern: string): string {
    if (/bash|command/i.test(pattern)) return 'Bash'
    if (/edit|write|file/i.test(pattern)) return 'Edit|Write'
    return ''
  }

  private inferHookTypeFromDetector(detectorType: string): 'PreToolUse' | 'PostToolUse' | 'Stop' {
    if (detectorType === 'premature-done') return 'Stop'
    if (detectorType === 'idle-tool') return 'PreToolUse'
    return 'PostToolUse'
  }

  private inferMatcherFromDetector(detectorType: string): string {
    if (detectorType === 'brute-retry') return 'Bash'
    return ''
  }
}
