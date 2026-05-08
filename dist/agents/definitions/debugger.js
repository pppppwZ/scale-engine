export const DEBUGGER_AGENT = {
    id: 'debugger', name: 'Debugger', description: 'Debugging agent',
    triggers: ['debug', 'fix'], capabilities: [{ name: 'debug', description: 'Debug', inputs: [], outputs: [] }],
    toolAllowlist: ['Read', 'Grep', 'Bash'], modelPreference: 'sonnet', maxConcurrency: 2, priority: 12,
};
//# sourceMappingURL=debugger.js.map