export const TESTER_AGENT = {
    id: 'tester', name: 'Tester', description: 'Testing agent',
    triggers: ['test', 'tdd'], capabilities: [{ name: 'test', description: 'Test', inputs: [], outputs: [] }],
    toolAllowlist: ['Read', 'Edit', 'Write', 'Bash'], modelPreference: 'sonnet', maxConcurrency: 2, priority: 9,
};
//# sourceMappingURL=tester.js.map