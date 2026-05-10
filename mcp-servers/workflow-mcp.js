#!/usr/bin/env node

/**
 * SCALE OS Workflow MCP Server
 *
 * 工作流状态管理 MCP 服务器
 * 兼容 Node.js v8+
 */

const fs = require('fs');
const path = require('path');

// 从命令行参数获取状态文件路径
const getStatePath = function() {
  const args = process.argv.slice(2);
  const stateIndex = args.indexOf('--state');
  if (stateIndex !== -1 && args[stateIndex + 1]) {
    return args[stateIndex + 1];
  }
  return path.join(process.env.HOME || '.', '.scale', 'workflow.json');
};

// 读取工作流状态
const readState = function() {
  const statePath = getStatePath();
  try {
    if (fs.existsSync(statePath)) {
      const data = fs.readFileSync(statePath, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error reading state: ' + error.message);
  }
  return {
    version: '10.0',
    currentPhase: 'idle',
    context: {},
    phases: {},
    history: []
  };
};

// 写入工作流状态
const writeState = function(state) {
  const statePath = getStatePath();
  try {
    fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
    return { success: true };
  } catch (error) {
    console.error('Error writing state: ' + error.message);
    return { success: false, error: error.message };
  }
};

// 处理工具调用
const handleToolCall = function(name, args, callback) {
  switch (name) {
    case 'get_workflow_state':
      callback(null, {
        content: [{ type: 'text', text: JSON.stringify(readState(), null, 2) }]
      });
      break;

    case 'set_workflow_phase':
      var state = readState();
      state.currentPhase = args.phase;
      if (!state.context) state.context = {};
      state.context.lastUpdate = new Date().toISOString();
      var writeResult = writeState(state);
      callback(null, {
        content: [{ type: 'text', text: JSON.stringify(writeResult, null, 2) }]
      });
      break;

    case 'add_workflow_history':
      var currentState = readState();
      if (!currentState.history) currentState.history = [];
      currentState.history.push({
        phase: args.phase,
        action: args.action,
        result: args.result || 'success',
        timestamp: new Date().toISOString()
      });
      var historyResult = writeState(currentState);
      callback(null, {
        content: [{ type: 'text', text: JSON.stringify(historyResult, null, 2) }]
      });
      break;

    default:
      callback(new Error('Unknown tool: ' + name));
  }
};

// 处理请求
const handleRequest = function(message, callback) {
  if (message.method === 'initialize') {
    callback(null, {
      protocolVersion: '2024-11-05',
      capabilities: { tools: {} },
      serverInfo: {
        name: 'scale-workflow',
        version: '10.0'
      }
    });
  } else if (message.method === 'tools/list') {
    callback(null, {
      tools: [
        {
          name: 'get_workflow_state',
          description: '获取当前工作流状态',
          inputSchema: { type: 'object', properties: {} }
        },
        {
          name: 'set_workflow_phase',
          description: '设置工作流阶段',
          inputSchema: {
            type: 'object',
            properties: {
              phase: {
                type: 'string',
                enum: ['idle', 'exploration', 'planning', 'execution', 'verification', 'consolidation']
              }
            },
            required: ['phase']
          }
        },
        {
          name: 'add_workflow_history',
          description: '添加工作流历史记录',
          inputSchema: {
            type: 'object',
            properties: {
              phase: { type: 'string' },
              action: { type: 'string' },
              result: { type: 'string' }
            },
            required: ['phase', 'action']
          }
        }
      ]
    });
  } else if (message.method === 'tools/call') {
    handleToolCall(message.params.name, message.params.arguments, callback);
  } else {
    callback(null, {});
  }
};

// stdio MCP 协议处理 — readline 逐行模式
var readline = require('readline');
var rl = readline.createInterface({ input: process.stdin, terminal: false });

rl.on('line', function(line) {
  if (!line.trim()) return;

  try {
    var message = JSON.parse(line);

    handleRequest(message, function(error, result) {
      var response = {
        jsonrpc: '2.0',
        id: message.id
      };
      if (error) {
        response.error = {
          code: -32603,
          message: error.message
        };
      } else {
        response.result = result;
      }
      process.stdout.write(JSON.stringify(response) + '\n');
    });
  } catch (e) {
    process.stdout.write(JSON.stringify({
      jsonrpc: '2.0',
      id: null,
      error: { code: -32700, message: 'Parse error' }
    }) + '\n');
  }
});

rl.on('close', function() {
  // stdin closed
});
