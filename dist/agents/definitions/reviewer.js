export const REVIEWER_AGENT = {
    id: 'reviewer', name: 'Reviewer', description: 'Review agent',
    triggers: ['review', 'check'], capabilities: [{ name: 'review', description: 'Review', inputs: [], outputs: [] }],
    toolAllowlist: ['Read', 'Grep'], modelPreference: 'sonnet', maxConcurrency: 2, priority: 7,
};
//# sourceMappingURL=reviewer.js.map