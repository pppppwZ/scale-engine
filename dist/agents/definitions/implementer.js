export const IMPLEMENTER_AGENT = {
    id: 'implementer', name: 'Implementer', description: 'Implementation agent',
    triggers: ['implement', 'code'], capabilities: [{ name: 'implement', description: 'Implement', inputs: [], outputs: [] }],
    toolAllowlist: ['Read', 'Edit', 'Write'], modelPreference: 'sonnet', maxConcurrency: 2, priority: 8,
};
//# sourceMappingURL=implementer.js.map