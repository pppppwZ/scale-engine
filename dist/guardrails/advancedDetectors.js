// SCALE Engine — 危险命令检测 + Role 权限网关 + ScopeCreep 检测
// W5 补充检测器 + 9th detector
// 设计参考：docs/01-ARCHITECTURE.md §二 L2
// ============================================================================
// 6. 危险命令检测器
// ============================================================================
export class DangerousCommandDetector {
    constructor() {
        this.name = 'dangerous-command';
        this.patterns = [
            { pattern: /rm\s+-rf\s+[\/~]/, description: 'rm -rf on root/home' },
            { pattern: /rm\s+-rf\s+\*/, description: 'rm -rf wildcard' },
            { pattern: /DROP\s+(TABLE|DATABASE|SCHEMA)/i, description: 'SQL DROP' },
            { pattern: /TRUNCATE\s+TABLE/i, description: 'SQL TRUNCATE' },
            { pattern: /DELETE\s+FROM\s+\w+\s*;/i, description: 'SQL DELETE without WHERE' },
            { pattern: /ALTER\s+TABLE\s+\w+\s+DROP/i, description: 'SQL ALTER DROP column' },
            { pattern: /curl\s+.*\|\s*(bash|sh)/i, description: 'curl pipe to shell' },
            { pattern: /chmod\s+777/, description: 'chmod 777' },
            { pattern: />\s*\/dev\/sda/, description: 'write to device' },
            { pattern: /mkfs\./, description: 'format filesystem' },
            { pattern: /:(){ :\|:& };:/, description: 'fork bomb' },
            { pattern: /dd\s+if=.*of=\/dev\//, description: 'dd to device' },
        ];
    }
    async check(input, ctx) {
        if (input.tool !== 'Bash')
            return { triggered: false };
        const command = input.args.command ?? '';
        for (const { pattern, description } of this.patterns) {
            if (pattern.test(command)) {
                ctx.eventBus.emit('tool.blocked', {
                    tool: input.tool,
                    detector: this.name,
                    reason: description,
                    command,
                }, { sessionId: input.sessionId });
                return {
                    triggered: true,
                    severity: 'deny',
                    reason: `🛑 危险命令被拦截：${description}\n命令: ${command}\n此操作需要人工确认后才能执行。`,
                    suggestion: '请使用安全的替代命令，或获取人工授权。',
                };
            }
        }
        return { triggered: false };
    }
}
// ============================================================================
// 7. 密钥泄露检测器
// ============================================================================
export class SecretLeakDetector {
    constructor() {
        this.name = 'secret-leak';
        this.patterns = [
            { pattern: /['"]?[A-Za-z0-9+\/]{40}['"]?/, description: 'possible API key (40 chars)' },
            { pattern: /AKIA[0-9A-Z]{16}/, description: 'AWS Access Key ID' },
            { pattern: /-----BEGIN (RSA |EC |DSA )?PRIVATE KEY-----/, description: 'Private key' },
            { pattern: /sk-[a-zA-Z0-9]{48}/, description: 'OpenAI API key' },
            { pattern: /ghp_[a-zA-Z0-9]{36}/, description: 'GitHub PAT' },
            { pattern: /password\s*[:=]\s*['"][^'"]{8,}['"]/, description: 'hardcoded password' },
        ];
    }
    async check(input, ctx) {
        if (!['Edit', 'Write', 'MultiEdit'].includes(input.tool))
            return { triggered: false };
        const content = JSON.stringify(input.args);
        for (const { pattern, description } of this.patterns) {
            if (pattern.test(content)) {
                ctx.eventBus.emit('tool.blocked', {
                    tool: input.tool,
                    detector: this.name,
                    reason: description,
                }, { sessionId: input.sessionId });
                return {
                    triggered: true,
                    severity: 'block',
                    reason: `🔑 检测到可能的密钥泄露：${description}\n请使用环境变量代替硬编码密钥。`,
                    suggestion: '使用 process.env.XXX 或 .env 文件',
                };
            }
        }
        return { triggered: false };
    }
}
export const BUILT_IN_ROLES = {
    explorer: {
        id: 'explorer',
        name: 'Explorer',
        allowedTools: ['Read', 'Grep', 'Glob', 'WebSearch', 'Bash'],
        deniedTools: ['Edit', 'Write', 'MultiEdit'],
    },
    planner: {
        id: 'planner',
        name: 'Planner',
        allowedTools: ['Read', 'Grep', 'Glob', 'Write'],
        deniedTools: ['Bash'],
    },
    implementer: {
        id: 'implementer',
        name: 'Implementer',
        allowedTools: ['Read', 'Grep', 'Glob', 'Edit', 'Write', 'MultiEdit', 'Bash'],
    },
    reviewer: {
        id: 'reviewer',
        name: 'Reviewer',
        allowedTools: ['Read', 'Grep', 'Glob', 'Bash'],
        deniedTools: ['Edit', 'Write', 'MultiEdit'],
    },
};
export class RoleGateDetector {
    constructor() {
        this.name = 'role-gate';
        this.currentRole = BUILT_IN_ROLES.implementer;
    }
    setRole(role) {
        this.currentRole = role;
    }
    getRole() {
        return this.currentRole;
    }
    async check(input, _ctx) {
        const role = this.currentRole;
        // Denied tools take priority
        if (role.deniedTools?.includes(input.tool)) {
            return {
                triggered: true,
                severity: 'deny',
                reason: `⛔ Role "${role.name}" 不允许使用 ${input.tool}。请先切换到合适的 Role (如 Implementer)。`,
                suggestion: `切换 Role: scale role activate implementer`,
            };
        }
        // If allowedTools is specified, tool must be in the list
        if (!role.allowedTools.includes(input.tool)) {
            return {
                triggered: true,
                severity: 'deny',
                reason: `⛔ Role "${role.name}" 不允许使用 ${input.tool}。允许的工具: [${role.allowedTools.join(', ')}]`,
                suggestion: `切换到允许 ${input.tool} 的 Role`,
            };
        }
        return { triggered: false };
    }
}
// ============================================================================
// 9. ScopeCreep 检测器
// ============================================================================
export class ScopeCreepDetector {
    constructor(opts = {}) {
        this.name = 'scope-creep';
        this.maxFiles = opts.maxFiles ?? 15;
        this.windowMs = opts.windowMs ?? 10 * 60 * 1000; // 10 minutes
    }
    async check(input, ctx) {
        if (!['Edit', 'Write', 'MultiEdit'].includes(input.tool))
            return { triggered: false };
        const file = input.args.file_path;
        if (!file)
            return { triggered: false };
        const key = `scope-creep:${input.sessionId}`;
        const record = ctx.cache.get(key)
            ?? { files: new Set(), timestamps: [] };
        const now = Date.now();
        // Prune old timestamps outside window
        record.timestamps = record.timestamps.filter((t) => now - t < this.windowMs);
        // Track new file
        const isNew = !record.files.has(file);
        record.files.add(file);
        record.timestamps.push(now);
        ctx.cache.set(key, record);
        // Only warn when a NEW file is added and we exceed the threshold
        if (isNew && record.files.size > this.maxFiles) {
            ctx.eventBus.emit('tool.blocked', {
                tool: input.tool,
                detector: this.name,
                reason: `scope_creep:${record.files.size}_files`,
                file,
            }, { sessionId: input.sessionId });
            return {
                triggered: true,
                severity: 'warn',
                reason: `⚠️ 检测到「范围蔓延」：本会话已编辑 ${record.files.size} 个不同文件（阈值 ${this.maxFiles}）。请确认这些修改都在当前任务范围内，而非越界修改。`,
                suggestion: '请检查是否偏离了原始任务范围。考虑收窄修改范围或拆分为多个任务。',
            };
        }
        return { triggered: false };
    }
}
//# sourceMappingURL=advancedDetectors.js.map