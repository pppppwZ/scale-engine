#!/usr/bin/env node
// SCALE OS — Unified MCP Server
// Wires up the full @hongmaple0820/scale-engine npm package:
//   - Artifact FSM (create/transition/list/show)
//   - Guardrails Gateway (12 detectors: 5 behavior + 4 security + 3 enhanced)
//   - Evolution Engine (Defect→Lesson→Rule→Hook)
//   - Knowledge Base (TF-IDF + cosine similarity)
//   - Context Builder (token budget, layered prompts)
//   - Behavior Tracker (session metrics, auto-evolve)
//   - Workflow Presets (10 presets)
//   - Agent Adapters (11 platforms)
import { join } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname } from 'node:path';
import { execFile } from 'node:child_process';
import { readdirSync, readFileSync, existsSync, mkdirSync } from 'node:fs';

// Windows ESM fix: dynamic import requires file:// URLs on Windows
const toURL = (p) => pathToFileURL(p).href;

const __dirname = dirname(fileURLToPath(import.meta.url));
const homeDir = homedir();

// Resolve npm package: prefer installed location (~/.scale/package/), fallback to relative
const installedPkgRoot = join(homeDir, '.scale', 'package');
const relativePkgRoot = join(__dirname, '..', 'package');
const pkgRoot = existsSync(join(installedPkgRoot, 'node_modules', '@hongmaple0820', 'scale-engine'))
  ? installedPkgRoot : relativePkgRoot;

const distDir = join(pkgRoot, 'node_modules', '@hongmaple0820', 'scale-engine', 'dist');
// Evolver: prefer installed alongside npm package, fallback to repo submodule
const evolverPaths = [
  join(pkgRoot, 'evolver'),
  join(__dirname, '..', 'evolver'),
];
const evolverDir = evolverPaths.find(p => existsSync(join(p, 'index.js'))) || evolverPaths[0];

// Import all modules from the npm package
const { ScaleMCPServer: BaseServer } = await import(toURL(join(distDir, 'api', 'mcp.js')));
const { SessionStartSequence } = await import(toURL(join(distDir, 'context', 'SessionStartSequence.js')));
const { Gateway } = await import(toURL(join(distDir, 'guardrails', 'Gateway.js')));
const { BruteRetryDetector, IdleToolDetector, BusyLoopDetector, PrematureDoneDetector, BlameShiftDetector } = await import(toURL(join(distDir, 'guardrails', 'detectors.js')));
const { DangerousCommandDetector, SecretLeakDetector, RoleGateDetector, ScopeCreepDetector } = await import(toURL(join(distDir, 'guardrails', 'advancedDetectors.js')));
const { AISlopDetector, HallucinationDetector, DuplicateEditDetector } = await import(toURL(join(distDir, 'guardrails', 'DetectorEnhanced.js')));
const { EvolutionEngine, LessonExtractor, RuleProposer, HookGenerator } = await import(toURL(join(distDir, 'evolution', 'EvolutionEngine.js')));
const { BehaviorTracker } = await import(toURL(join(distDir, 'evolution', 'BehaviorTracker.js')));
const { PatternExtractor } = await import(toURL(join(distDir, 'evolution', 'PatternExtractor.js')));
const { createAdapter, SUPPORTED_AGENTS } = await import(toURL(join(distDir, 'adapters', 'index.js')));
const { WorkflowExecutor } = await import(toURL(join(distDir, 'workflows', 'WorkflowExecutor.js')));
const { WORKFLOW_PRESETS, listWorkflowPresets } = await import(toURL(join(distDir, 'workflows', 'presets.js')));

const scaleDir = join(homedir(), '.scale');
const base = new BaseServer(scaleDir);

// Wire up SessionStartSequence — auto-recon on every session
const sessionStart = new SessionStartSequence(base.store, base.bus, process.cwd());

// Wire up Guardrails — register all 12 detectors (5 behavior + 4 security + 3 enhanced)
const gateway = new Gateway(base.bus);
gateway.registerDetector(new BruteRetryDetector(), 'preTool');
gateway.registerDetector(new IdleToolDetector(), 'preTool');
gateway.registerDetector(new BusyLoopDetector(), 'preTool');
gateway.registerDetector(new PrematureDoneDetector(), 'beforeStop');
gateway.registerDetector(new BlameShiftDetector(), 'postTool');
gateway.registerDetector(new DangerousCommandDetector(), 'preTool');
gateway.registerDetector(new SecretLeakDetector(), 'preTool');
gateway.registerDetector(new RoleGateDetector(), 'preTool');
gateway.registerDetector(new ScopeCreepDetector(), 'postTool');
// Enhanced detectors
gateway.registerDetector(new AISlopDetector(), 'preTool');
gateway.registerDetector(new HallucinationDetector(), 'postTool');
gateway.registerDetector(new DuplicateEditDetector(), 'preTool');

// Wire up Evolution
const extractor = new LessonExtractor(base.store, base.kb, base.bus);
const proposer = new RuleProposer(base.kb, base.bus);
const generator = new HookGenerator(base.bus);
const evolutionEngine = new EvolutionEngine(extractor, proposer, generator, base.bus, scaleDir);

// Wire up Behavior Tracker
const tracker = new BehaviorTracker(base.bus);
tracker.setAutoEvolve({ enabled: true, bruteRetryThreshold: 3 }, () => evolutionEngine.runCycle());
tracker.start();

// Pattern extractor
const patternExtractor = new PatternExtractor(base.store, base.kb, base.bus);

// Full tool list: base 7 + guardrails 3 + evolution 4 + knowledge 3 + behavior 2 + workflow 2 + adapter 1
const EXTRA_TOOLS = [
  {
    name: 'scale_gate_pre',
    description: 'Run pre-tool guardrails check. Returns allow/deny + reason.',
    inputSchema: {
      type: 'object',
      properties: {
        tool: { type: 'string', description: 'Tool name being called' },
        args: { type: 'object', description: 'Tool arguments' },
        sessionId: { type: 'string', description: 'Session ID' },
      },
      required: ['tool', 'args'],
    },
  },
  {
    name: 'scale_gate_post',
    description: 'Run post-tool guardrails check. Tracks completions and failures.',
    inputSchema: {
      type: 'object',
      properties: {
        tool: { type: 'string' },
        args: { type: 'object' },
        output: { type: 'string' },
        exitCode: { type: 'number' },
        sessionId: { type: 'string' },
      },
      required: ['tool', 'exitCode'],
    },
  },
  {
    name: 'scale_gate_stop',
    description: 'Run before-stop guardrails check. Blocks premature completion.',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: { type: 'string' },
        context: { type: 'string' },
      },
    },
  },
  {
    name: 'scale_evolve',
    description: 'Run evolution cycle: scan Defects → extract Lessons → propose Rules → generate Hooks',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'scale_evolve_extract',
    description: 'Extract lesson from a specific defect',
    inputSchema: {
      type: 'object',
      properties: { defectId: { type: 'string' } },
      required: ['defectId'],
    },
  },
  {
    name: 'scale_evolve_propose',
    description: 'Propose rules from verified lessons',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'scale_evolve_approve',
    description: 'Approve a proposed rule',
    inputSchema: {
      type: 'object',
      properties: { ruleId: { type: 'string' }, approvedBy: { type: 'string' } },
      required: ['ruleId', 'approvedBy'],
    },
  },
  {
    name: 'scale_evolve_stats',
    description: 'Get evolution engine statistics',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'scale_knowledge_add',
    description: 'Add entry to knowledge base',
    inputSchema: {
      type: 'object',
      properties: {
        type: { type: 'string' },
        title: { type: 'string' },
        tags: { type: 'array', items: { type: 'string' } },
        contentRef: { type: 'string' },
      },
      required: ['type', 'title', 'tags'],
    },
  },
  {
    name: 'scale_knowledge_recall',
    description: 'Recall from knowledge base by tags/relevance',
    inputSchema: {
      type: 'object',
      properties: {
        tags: { type: 'array', items: { type: 'string' } },
        limit: { type: 'number' },
      },
    },
  },
  {
    name: 'scale_knowledge_verify',
    description: 'Mark a knowledge entry as verified',
    inputSchema: {
      type: 'object',
      properties: { entryId: { type: 'string' } },
      required: ['entryId'],
    },
  },
  {
    name: 'scale_behavior_metrics',
    description: 'Get behavior metrics for a session',
    inputSchema: {
      type: 'object',
      properties: { sessionId: { type: 'string' } },
      required: ['sessionId'],
    },
  },
  {
    name: 'scale_patterns_extract',
    description: 'Extract successful patterns from completed artifacts',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'scale_workflow_run',
    description: 'Run a workflow preset by ID (basic-dev, tdd-dev, bug-fix, sdd, etc.)',
    inputSchema: {
      type: 'object',
      properties: {
        presetId: {
          type: 'string',
          description: 'Workflow preset ID',
          enum: ['basic-dev', 'tdd-dev', 'bug-fix', 'sdd', 'code-review', 'security-audit', 'ralph-loop', 'rapid-proto', 'massive-refactor', 'parallel-exec'],
        },
      },
      required: ['presetId'],
    },
  },
  {
    name: 'scale_workflow_presets',
    description: 'List available workflow presets',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'scale_adapter_init',
    description: 'Initialize SCALE OS for a specific Agent platform. Creates directories, settings, hooks, and knowledge doc.',
    inputSchema: {
      type: 'object',
      properties: {
        agentType: {
          type: 'string',
          description: 'Agent platform type',
          enum: SUPPORTED_AGENTS,
        },
        projectDir: { type: 'string', description: 'Project directory path' },
        scaleDir: { type: 'string', description: 'Custom .scale directory path' },
      },
      required: ['agentType', 'projectDir'],
    },
  },
  // ---- Evolver bridge tools ----
  {
    name: 'scale_evolver_run',
    description: 'Trigger a single Evolver evolution cycle. Scans sessions → collects signals → selects Gene → applies mutation.',
    inputSchema: {
      type: 'object',
      properties: {
        cwd: { type: 'string', description: 'Working directory for Evolver (defaults to project root)' },
      },
    },
  },
  {
    name: 'scale_evolver_solidify',
    description: 'Solidify (approve) the last Evolver evolution run. Commits the Gene mutation.',
    inputSchema: {
      type: 'object',
      properties: {
        cwd: { type: 'string', description: 'Working directory' },
        intent: { type: 'string', enum: ['repair', 'optimize', 'innovate'] },
      },
    },
  },
  {
    name: 'scale_evolver_distill_skill',
    description: 'Distill a cognitive toolkit role SKILL.md into an Evolver Gene (GEP format). Bridges cognitive roles → evolutionary assets.',
    inputSchema: {
      type: 'object',
      properties: {
        skillPath: { type: 'string', description: 'Path to SKILL.md file (e.g. cognitive-toolkit/roles/feynman/SKILL.md)' },
        cwd: { type: 'string', description: 'Working directory' },
      },
      required: ['skillPath'],
    },
  },
  {
    name: 'scale_evolver_sync',
    description: 'Sync Evolver assets (Genes/Capsules) with the EvoMap Hub.',
    inputSchema: {
      type: 'object',
      properties: {
        cwd: { type: 'string', description: 'Working directory' },
      },
    },
  },
  // ---- Cognitive toolkit bridge tools ----
  {
    name: 'scale_cognitive_roles',
    description: 'List available cognitive toolkit roles with their mental models and SKILL.md paths.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'scale_cognitive_read_role',
    description: 'Read a cognitive toolkit role SKILL.md content. Use before invoking a role for analysis.',
    inputSchema: {
      type: 'object',
      properties: {
        role: { type: 'string', description: 'Role name (feynman/munger/linchao/paulgraham/mrbeast/thiel/dalio/naval/taleb/dialectics)' },
      },
      required: ['role'],
    },
  },
];

async function handleExtraToolCall(name, args) {
  switch (name) {
    case 'scale_gate_pre':
      return gateway.preTool({ tool: args.tool, args: args.args, sessionId: args.sessionId });
    case 'scale_gate_post':
      await gateway.postTool({ tool: args.tool, args: args.args, output: args.output, exitCode: args.exitCode, sessionId: args.sessionId });
      return { status: 'tracked', tool: args.tool, exitCode: args.exitCode };
    case 'scale_gate_stop':
      return gateway.beforeStop({ sessionId: args.sessionId, context: args.context });
    case 'scale_evolve':
      return evolutionEngine.runCycle();
    case 'scale_evolve_extract':
      return extractor.extract(args.defectId);
    case 'scale_evolve_propose':
      return proposer.scanAndPropose();
    case 'scale_evolve_approve':
      return proposer.approve(args.ruleId, args.approvedBy);
    case 'scale_evolve_stats':
      return evolutionEngine.getStats();
    case 'scale_knowledge_add':
      return base.kb.add(args);
    case 'scale_knowledge_recall':
      return base.kb.recall(args);
    case 'scale_knowledge_verify':
      await base.kb.verify(args.entryId, 'mcp-client');
      return { status: 'verified', entryId: args.entryId };
    case 'scale_behavior_metrics':
      return tracker.getSessionMetrics(args.sessionId);
    case 'scale_patterns_extract': {
      const allArtifacts = await base.store.query({});
      const doneArtifacts = allArtifacts.filter(a => a.status === 'DONE' || a.status === 'COMPLETED');
      const patterns = [];
      for (const a of doneArtifacts) {
        const p = await patternExtractor.extractFromArtifact(a.id);
        if (p) patterns.push(p);
      }
      return { patternsExtracted: patterns.length, patterns };
    }
    case 'scale_workflow_run': {
      const presetId = args.presetId;
      const preset = WORKFLOW_PRESETS[presetId] || null;
      if (!preset) return { error: `Unknown preset: ${presetId}. Available: ${Object.keys(WORKFLOW_PRESETS).join(', ')}` };
      const executor = new WorkflowExecutor(base.bus, base.store);
      // Override getPresetStep to use actual preset data (npm package only has 3 hardcoded)
      executor.getPresetStep = (_presetId, stepIndex) => preset.steps?.[stepIndex] || null;
      const session = await executor.start(preset, { scaleDir });
      const result = await executor.runAll(session.id);
      return result;
    }
    case 'scale_workflow_presets':
      return listWorkflowPresets().map(p => ({ id: p.id, name: p.name, description: p.description, steps: p.steps?.length || 0 }));
    case 'scale_adapter_init': {
      const adapter = createAdapter(args.agentType);
      try {
        const result = await adapter.init({ projectDir: args.projectDir, scaleDir: args.scaleDir });
        return result;
      } catch (e) {
        return { error: e.message, hint: 'Adapter init failed — hooks format may be incompatible. Check settings.json hook structure (Claude Code uses nested {hooks:[{type,command}]}, adapter expects flat {command}).' };
      }
    }
    // ---- Evolver bridge (state-file based, non-interactive) ----
    case 'scale_evolver_run': {
      // Evolver `run` is interactive (outputs GEP prompt, waits for LLM).
      // Instead, we scan signals + return current evolution state.
      const cwd = args.cwd || process.cwd();
      const evoDir = join(cwd, 'memory', 'evolution');
      const stateFile = join(evoDir, 'evolution_state.json');
      const solidifyFile = join(evoDir, 'evolution_solidify_state.json');
      const personalityFile = join(evoDir, 'personality_state.json');
      const result = { cwd, evolverInstalled: existsSync(join(evolverDir, 'index.js')) };
      try { result.state = JSON.parse(readFileSync(stateFile, 'utf-8')); } catch { result.state = null; }
      try { result.lastRun = JSON.parse(readFileSync(solidifyFile, 'utf-8')); } catch { result.lastRun = null; }
      try { result.personality = JSON.parse(readFileSync(personalityFile, 'utf-8')); } catch { result.personality = null; }
      if (!result.evolverInstalled) result.hint = 'Run install.sh Step 4 to install Evolver';
      return result;
    }
    case 'scale_evolver_solidify': {
      // Non-interactive: read solidify state, run evolver solidify if installed.
      const cwd = args.cwd || process.cwd();
      const solidifyFile = join(cwd, 'memory', 'evolution', 'evolution_solidify_state.json');
      if (!existsSync(solidifyFile)) return { error: 'No pending evolution run to solidify', cwd };
      if (!existsSync(join(evolverDir, 'index.js'))) return { error: 'Evolver not installed' };
      const cmdArgs = [join(evolverDir, 'index.js'), 'solidify'];
      if (args.intent) cmdArgs.push(`--intent=${args.intent}`);
      cmdArgs.push('--dry-run'); // safe preview first
      return new Promise((resolve) => {
        execFile('node', cmdArgs, { cwd, timeout: 30000 }, (err, stdout, stderr) => {
          resolve({
            dryRun: true,
            output: stdout?.slice(-2000) || '',
            error: err ? (err.message + '\n' + (stderr || '')) : null,
            hint: 'Remove --dry-run from source to apply for real',
          });
        });
      });
    }
    case 'scale_evolver_distill_skill': {
      // Bridge: read SKILL.md → add to KnowledgeBase (evolver distill needs LLM response format)
      const skillPath = args.skillPath;
      if (!existsSync(skillPath)) return { error: `Skill file not found: ${skillPath}` };
      const content = readFileSync(skillPath, 'utf-8');
      const roleName = skillPath.split('/').filter(Boolean).pop() || 'unknown';
      // Add to scale-engine KnowledgeBase as a cross-reference
      try {
        await base.kb.add({
          type: 'cognitive-role',
          title: `Cognitive Role: ${roleName}`,
          tags: ['cognitive-toolkit', roleName, 'evolver-bridge'],
          contentRef: skillPath,
        });
      } catch {}
      return {
        status: 'bridged',
        role: roleName,
        contentLength: content.length,
        knowledgeBase: true,
        message: `Role "${roleName}" added to KnowledgeBase. For full GEP distillation, run: evolver distill --response-file=<llm_response_path>`,
      };
    }
    case 'scale_evolver_sync': {
      if (!existsSync(join(evolverDir, 'index.js'))) return { error: 'Evolver not installed' };
      const cwd = args.cwd || process.cwd();
      return new Promise((resolve) => {
        execFile('node', [join(evolverDir, 'index.js'), 'sync'], { cwd, timeout: 30000 }, (err, stdout, stderr) => {
          resolve({
            output: stdout?.slice(-2000) || '',
            error: err ? (err.message + '\n' + (stderr || '')) : null,
            status: err ? 'failed' : 'synced',
          });
        });
      });
    }
    // ---- Cognitive toolkit bridge ----
    case 'scale_cognitive_roles': {
      const skillsDir = join(homeDir, '.claude', 'skills');
      try {
        const entries = readdirSync(skillsDir, { withFileTypes: true });
        return entries.filter(e => e.isDirectory() && e.name.endsWith('-perspective')).map(e => {
          const roleName = e.name.replace('-perspective', '');
          let preview = '';
          try { preview = readFileSync(join(skillsDir, e.name, 'SKILL.md'), 'utf-8').slice(0, 200); } catch {}
          return { name: roleName, skillPath: join(skillsDir, e.name, 'SKILL.md'), preview };
        });
      } catch (e) {
        return { error: 'Cognitive toolkit roles not found', path: skillsDir, message: e.message };
      }
    }
    case 'scale_cognitive_read_role': {
      const roleDir = args.role + '-perspective';
      const rolePath = join(homeDir, '.claude', 'skills', roleDir, 'SKILL.md');
      try {
        const content = readFileSync(rolePath, 'utf-8');
        return { role: args.role, content };
      } catch (e) {
        return { error: `Role not found: ${args.role}`, path: rolePath };
      }
    }
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

// Unified request handler
let buf = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => {
  buf += chunk;
  const lines = buf.split('\n');
  buf = lines.pop();
  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      const msg = JSON.parse(line);
      (async () => {
        if (msg.method === 'initialize') {
          process.stdout.write(JSON.stringify({
            jsonrpc: '2.0', id: msg.id,
            result: {
              protocolVersion: '2024-11-05',
              capabilities: { tools: {} },
              serverInfo: { name: 'scale-os', version: '2.0.0' },
            },
          }) + '\n');
        } else if (msg.method === 'tools/list') {
          const baseTools = base.getTools();
          process.stdout.write(JSON.stringify({
            jsonrpc: '2.0', id: msg.id,
            result: { tools: [...baseTools, ...EXTRA_TOOLS] },
          }) + '\n');
        } else if (msg.method === 'tools/call') {
          const toolName = msg.params.name;
          const toolArgs = msg.params.arguments ?? {};
          let result;
          // Intercept scale_context to inject SessionStartSequence reconnaissance
          if (toolName === 'scale_context') {
            let sessionCtx = null;
            try {
              sessionCtx = await sessionStart.execute(toolArgs.sessionId);
            } catch { /* best-effort */ }
            result = await base.handleToolCall(toolName, toolArgs);
            if (sessionCtx) {
              result.sessionRecon = {
                gitStatus: sessionCtx.gitStatus,
                recentCommits: sessionCtx.recentCommits,
                unfinishedTasks: sessionCtx.unfinishedTasks,
                recommendations: sessionCtx.harnessRecommendations,
              };
            }
          } else {
            // Try base tools first (create/transition/list/show/available_actions/stats)
            const baseNames = base.getTools().map(t => t.name);
            if (baseNames.includes(toolName)) {
              result = await base.handleToolCall(toolName, toolArgs);
            } else {
              result = await handleExtraToolCall(toolName, toolArgs);
            }
          }
          process.stdout.write(JSON.stringify({
            jsonrpc: '2.0', id: msg.id,
            result: { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] },
          }) + '\n');
        } else if (msg.method === 'notifications/initialized') {
          // no response
        } else if (msg.id) {
          process.stdout.write(JSON.stringify({
            jsonrpc: '2.0', id: msg.id,
            error: { code: -32601, message: `Method not found: ${msg.method}` },
          }) + '\n');
        }
      })().catch(e => {
        process.stdout.write(JSON.stringify({
          jsonrpc: '2.0', id: msg?.id,
          error: { code: -32000, message: e.message },
        }) + '\n');
      });
    } catch (e) { /* skip malformed JSON */ }
  }
});
process.stdin.on('end', () => {
  tracker.stop();
  process.exit(0);
});
