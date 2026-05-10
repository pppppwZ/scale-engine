#!/usr/bin/env node
// scale-task-grader.js
// UserPromptSubmit hook: 自动任务分级 + 认知调度强制注入
// 每次 user 提交消息时触发，注入分级指令到模型上下文

const fs = require('fs');
const path = require('path');

const HOME = require('os').homedir();
const DEBUG_LOG = process.env.SCALE_HOOK_DEBUG_LOG;
const DEBUG = process.env.SCALE_HOOK_DEBUG === '1';

function debugLog(type, payload) {
  if (!DEBUG || !DEBUG_LOG) return;
  try {
    var entry = { ts: new Date().toISOString(), hook: 'scale-task-grader', type: type, payload: payload };
    fs.appendFileSync(DEBUG_LOG, JSON.stringify(entry) + '\n');
  } catch (e) { process.stderr.write('debugLog error: ' + e.message + '\n'); }
}

var input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', function(chunk) { input += chunk; });
process.stdin.on('end', function() {
  var prompt = '';
  try {
    var data = JSON.parse(input || '{}');
    prompt = data.user_message || data.prompt || data.message || data.userMessage || '';
    if (typeof prompt === 'object') prompt = JSON.stringify(prompt);
  } catch (e) {}

  var level = gradeTask(prompt);
  debugLog('task_graded', { level: level, promptPreview: (prompt || '').substring(0, 100) });

  var result = buildInjection(level);
  process.stdout.write(JSON.stringify(result));
});

function gradeTask(prompt) {
  var p = (prompt || '').toLowerCase();

  var lSignals = [
    '架构', '重构', '系统设计', '迁移', '多模块', '全栈',
    '大规模', '全面', '整体', '重写', '重新设计', '基础设施',
    '全面检查', '全流程', '全功能',
    'architecture', 'refactor', 'redesign', 'migration',
    'infrastructure', 'full-stack', 'comprehensive'
  ];

  var mSignals = [
    '功能', '实现', '开发', '新增', '集成', '接口', '页面',
    '模块', '组件', '服务', '认证', '支付', '权限', '测试',
    'feature', 'implement', 'develop', 'integrate', 'endpoint',
    'module', 'component', 'service', 'auth', 'test'
  ];

  if (lSignals.some(function(s) { return p.indexOf(s) !== -1; })) return 'L';
  if (mSignals.some(function(s) { return p.indexOf(s) !== -1; })) return 'M';
  return 'S';
}

function buildInjection(level) {
  var configs = {
    S: {
      depth: 'L1 快速', phases: 'Phase B → E',
      roleCount: '1个角色', action: '选1个最相关角色快速审视后直接回复'
    },
    M: {
      depth: 'L2 标准', phases: 'Phase A → B → E',
      roleCount: '2个角色', action: '选2个角色多视角评估后回复'
    },
    L: {
      depth: 'L3 深度', phases: 'Phase A → B → C → D → E',
      roleCount: '3个角色', action: '含交叉质询+风险审计+仲裁裁决'
    }
  };

  var c = configs[level];

  var ctx = [
    '[SCALE OS 强制流程 — 自动分级: ' + level + '级 | 认知深度: ' + c.depth + ']',
    '',
    '你必须在回复用户之前执行以下步骤（不可跳过）：',
    '',
    '1. 任务确认: ' + level + '级 → ' + c.phases,
    '2. 调用 mcp__scale-workflow__set_workflow_phase 设置对应阶段',
    '3. 认知调度: ' + c.roleCount + ' — ' + c.action,
    '4. 调用 mcp__scale-os__scale_cognitive_read_role 读取选中角色的 SKILL.md',
    '5. 用角色心智模型分析后，将结论注入回复',
    '',
    '角色选择参考：',
    '  拆解/本质 → feynman   风险/证伪 → taleb   系统/反馈 → dalio',
    '  执行/落地 → paulgraham  人性/需求 → naval   博弈/竞争 → thiel',
    '  趋势/宏观 → linchao   矛盾/方向 → dialectics',
    '',
    'S=单文件/简单  M=多功能/中等  L=架构/重构/大规模',
    '如果预判不准可修正，但流程不可省略。'
  ].join('\n');

  return {
    systemMessage: '[SCALE] 自动分级: ' + level + '级 | ' + c.depth,
    hookSpecificOutput: {
      hookEventName: 'UserPromptSubmit',
      additionalContext: ctx
    }
  };
}
