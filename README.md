# SCALE Engine v0.5.0

> **S**caffold · **C**ontrol · **A**rtifact · **L**earn · **E**volve
>
> AI 工程化脚手架引擎 — 让 AI Agent 在物理约束下工作，而不是靠提示词自律。

[![Version](https://img.shields.io/badge/version-0.5.0-orange)]()
[![Agents](https://img.shields.io/badge/agents-7-blue)]()
[![Workflows](https://img.shields.io/badge/workflows-10-green)]()
[![Detectors](https://img.shields.io/badge/detectors-8-red)]()
[![License](https://img.shields.io/badge/license-MIT-green)]()

## 核心理念

```
提示词说 "你应该跑测试"    → AI 可以假装跑了  ❌
Stop Hook 检查 "未跑测试"  → AI 物理无法跳过  ✅
```

## v0.5.0 新特性

| 特性 | 说明 |
|------|------|
| 🆕 **7 种 Agent 适配器** | Claude Code, Codex, OpenCode, Cursor, Gemini, OpenClaw, Hermes |
| 🆕 **3 种场景模式** | Sandbox (探索), Standard (开发), Critical (生产) |
| 🆕 **10 种工作流预设** | 基础开发、TDD、Bug修复、SDD、代码审查、安全审计、自主循环、快速原型、大规模重构、并行执行 |
| 🆕 **技能生态系统** | 自动发现已安装技能，生成 skills.md |
| 🆕 **SCALE v10.0 哲学** | ContextBuilder 内置认知诚实、反惰性、验证门控 |
| 🆕 **场景模式感知** | 检测器敏感度、权限级别、上下文规则随模式自动调节 |

## 六层架构

```
L1 Context       — Token 预算 + SCALE v10.0 哲学 + 场景模式感知
L2 Guardrails    — 8 检测器 + Role 网关 + 场景模式敏感度
L3 Observability — EventBus + BehaviorTracker
L4 Orchestration — TaskEngine + Effects + ModelRouter + 10 工作流预设
L5 Memory        — KnowledgeBase + 衰减算法 + 技能发现
L6 Evolution     — Defect→Lesson→Rule→Hook 自进化
```

## 快速开始

```bash
npm install -g @hongmaple0820/scale-engine
cd your-project

# 初始化 — 支持 7 种 Agent
scale init --agent claude-code          # Claude Code
scale init --agent codex                # Codex CLI
scale init --agent opencode             # OpenCode
scale init --agent cursor               # Cursor
scale init --agent gemini               # Gemini
scale init --agent openclaw             # OpenClaw
scale init --agent hermes               # Hermes

# 场景模式选择
scale init --agent claude-code --scenario sandbox    # 探索/原型
scale init --agent claude-code --scenario standard   # 日常开发 (默认)
scale init --agent claude-code --scenario critical   # 生产/安全

# 诊断
scale doctor

# 工作流
scale workflow list                     # 查看所有 10 种工作流
scale workflow list --scenario critical # 按场景筛选

# 技能
scale skill scan                        # 发现已安装技能

# 日常使用
scale create Spec "用户导出 Excel 功能"
scale transition SPEC-xxx refine
scale transition SPEC-xxx approve       # ambiguity > 0.2 物理拦截
scale verify-task TASK-xxx              # build + lint + test
scale evolve                            # Defect→Lesson→Rule→Hook
```

## CLI 命令 (15 个)

| 命令 | 说明 |
|------|------|
| `scale init` | 初始化 (.scale/ + hooks + 知识文档 + 场景模式) |
| `scale doctor` | 环境诊断 + 健康检查 |
| `scale create` | 创建 Artifact (11 种类型) |
| `scale list` | 列表查询 |
| `scale show` | 详情 |
| `scale suggest` | 可用操作建议 |
| `scale transition` | 状态迁移 (含 guard) |
| `scale verify-task` | 代码质量验证 (build/lint/test) |
| `scale create-prd` | 自动创建 Spec→Plan→Tasks 层级 |
| `scale role` | 角色切换 (6 种内置角色) |
| `scale context` | 组装上下文 (含场景模式) |
| `scale evolve` | 进化周期 (Defect→Lesson→Rule→Hook) |
| `scale stats` | 统计 |
| `scale workflow` | 工作流预设管理 |
| `scale skill` | 技能发现 |

## 7 种 Agent 适配器

| Agent | 配置文件 | 知识文档 | 技能目录 |
|-------|---------|---------|---------|
| **Claude Code** | `.claude/settings.json` | `CLAUDE.md` | `.claude/commands/` |
| **Codex** | `.codex/hooks.json` + `config.toml` | `AGENTS.md` | `.codex/commands/` |
| **OpenCode** | `~/.config/opencode/hooks.json` | `AGENTS.md` | `~/.config/opencode/skills/` |
| **Cursor** | `.cursor/settings.json` | `.cursorrules` | `.cursor/skills/` |
| **Gemini** | `.gemini/settings.json` | `GEMINI.md` | — |
| **OpenClaw** | `.openclaw/settings.json` | `AGENTS.md` | — |
| **Hermes** | `.hermes/settings.json` | `.hermes.md` | — |

## 3 种场景模式

| 模式 | 检测器敏感度 | 验证要求 | 人工确认 | 最大重试 |
|------|------------|---------|---------|---------|
| 🏖️ **Sandbox** | 低 | 不要求 | 不要求 | 10 |
| ⚙️ **Standard** | 中 | 要求 | 不要求 | 5 |
| 🔒 **Critical** | 高 | 要求 | 要求 | 3 |

## 10 种工作流预设

| # | 工作流 | 场景 | 说明 |
|---|--------|------|------|
| 1 | 基础开发流 | Standard | Explore→Spec→Plan→Implement→Verify |
| 2 | TDD功能开发 | Standard | 测试先行: RED→GREEN→REFACTOR |
| 3 | Bug修复 | Standard | 复现→诊断→修复→验证→沉淀 |
| 4 | SDD | Critical | 严格契约驱动, ambiguity ≤ 0.1 |
| 5 | 代码审查 | Standard | 风格→逻辑→安全→性能 |
| 6 | 安全审计 | Critical | 密钥→注入→认证→数据→依赖 |
| 7 | Ralph自主循环 | Sandbox | 全自动AI循环 |
| 8 | 快速原型 | Sandbox | 最小仪式, 快速验证 |
| 9 | 大规模重构 | Critical | 增量重构 + 测试护城河 |
| 10 | 并行执行 | Standard | 依赖分析 + 并行任务执行 |

## 11 种 Artifact · 8 个检测器 · 4 级自进化

### 11 种 Artifact (FSM 状态机)

```
Need → Insight → Spec → Plan → TestPlan → Task → Change → Evidence
                                                               ↓
                                          Defect ← Lesson ← Release
```

### 8 个检测器

| 检测器 | 阶段 | 严重度 | 说明 |
|--------|------|--------|------|
| DangerousCommand | PreTool | deny | 拦截 rm -rf, DROP TABLE 等 |
| SecretLeak | PreTool | deny | 拦截硬编码密钥 |
| RoleGate | PreTool | block | 角色权限控制 |
| BruteRetry | PreTool | block | 3次相同重试→强制换策略 |
| IdleTool | PreTool | warn | 失败后未调查就改代码 |
| BusyLoop | PreTool | block | 同一文件反复修改 |
| PrematureDone | BeforeStop | block | 未运行测试就声称完成 |
| BlameShift | PostTool | warn | 甩锅给环境但无证据 |

### 4 级自进化

```
Defect (closed) → Lesson (extracted) → Rule (proposed) → Hook (generated)
     3 Gates:          2 Gates:           2 Gates:         1 Gate:
     状态+根因+去重     verified+active    relevance≥0.6    approved
                       accessCount≥3      accessCount≥3    enforcement=hook
```

## SCALE v10.0 核心哲学 (ContextBuilder P1 层)

```
v5.0(认知流+工具驾驭) × v8.0(认知脚手架+反幻觉) × v9.1(反惰性+求是+SDD)

- 认知诚实: 不确定→[UNCERTAIN], 严禁幻觉式合规
- 显性推理: <think reasoning="effort"> before action
- Owner意识: 做 Owner 不做执行者
- 反惰性: 暴力重试→换策略 | 甩锅→先验证 | 工具闲置→穷尽工具 | 忙碌假象→换思路
- 1%规则: 有1%可能→必须调用技能
- 验证门控: ✅只来自工具，不来自脑补
```

## API

```typescript
import {
  // Core
  EventBus, Container, logger,

  // Artifact + FSM
  FSM, InMemoryArtifactStore,
  registerAllFSMs, INITIAL_STATES,

  // Guardrails
  Gateway, BruteRetryDetector, PrematureDoneDetector,

  // Context
  ContextBuilder,

  // Knowledge + Evolution
  KnowledgeBase, EvolutionEngine,

  // 7 Agent Adapters
  createAdapter, SUPPORTED_AGENTS,
  ClaudeCodeAdapter, CodexAdapter, OpenCodeAdapter,
  CursorAdapter, GeminiAdapter, OpenClawAdapter, HermesAdapter,

  // Skill Discovery
  SkillDiscovery,

  // Workflow Presets
  listWorkflowPresets, getPresetsByScenario,
  BASIC_DEV, TDD_DEV, BUG_FIX, SDD,
  CODE_REVIEW, SECURITY_AUDIT, RALPH_LOOP,
  RAPID_PROTO, MASSIVE_REFACTOR, PARALLEL_EXEC,
} from '@hongmaple0820/scale-engine'
```

## 技术栈

- TypeScript 5.5 + ESM
- better-sqlite3 (WAL 模式)
- Zod (校验) + Pino (日志)
- Citty (CLI) + Hono (HTTP) + MCP SDK
- Vitest (测试)

## License

MIT
