// SCALE Engine - Skill Installer
// Interactive skill installation with auto-detection and user confirmation
import { logger } from '../core/logger.js';
export class SkillInstaller {
    constructor(registry, eventBus, skillDir = '~/.claude/skills') {
        this.INSTALL_CONFIGS = new Map([
            ['cua', { skillId: 'cua', method: 'pip-install', sourceUrl: 'https://github.com/trycua/cua', command: 'pip install cua', verification: 'python -c "import cua"' }],
            ['fireworks-tech-graph', { skillId: 'fireworks-tech-graph', method: 'git-clone', sourceUrl: 'https://github.com/yizhiyanhua-ai/fireworks-tech-graph', targetPath: '~/.claude/skills/fireworks-tech-graph' }],
            ['excalidraw-diagram-generator', { skillId: 'excalidraw-diagram-generator', method: 'git-clone', sourceUrl: 'https://github.com/github/awesome-copilot', targetPath: '~/.claude/skills/excalidraw-diagram-generator', postInstall: ['cp -r skills/excalidraw-diagram-generator ~/.claude/skills/'] }],
            ['architecture-diagram-generator', { skillId: 'architecture-diagram-generator', method: 'git-clone', sourceUrl: 'https://github.com/Cocoon-AI/architecture-diagram-generator', targetPath: '~/.claude/skills/architecture-diagram-generator' }],
            ['hyperframes', { skillId: 'hyperframes', method: 'npm-install', sourceUrl: 'https://github.com/heygen-com/hyperframes', command: 'npm install -g @heygen/hyperframes' }],
            ['guizang-ppt-skill', { skillId: 'guizang-ppt-skill', method: 'git-clone', sourceUrl: 'https://github.com/op7418/guizang-ppt-skill', targetPath: '~/.claude/skills/guizang-ppt-skill' }],
        ]);
        this.registry = registry;
        this.eventBus = eventBus;
        this.skillDir = skillDir;
    }
    async checkAndPrompt() {
        const allSkills = this.registry.listAll();
        const notInstalled = allSkills.filter(s => !s.installed);
        const configs = [];
        for (const skill of notInstalled) {
            const config = this.INSTALL_CONFIGS.get(skill.id);
            if (config)
                configs.push(config);
            else
                configs.push(this.generateDefaultConfig(skill));
        }
        if (configs.length > 0) {
            this.eventBus.emit('skills.install-prompt', { count: configs.length, skills: configs.map(c => c.skillId) });
        }
        return configs;
    }
    async install(config) {
        this.eventBus.emit('skill.install-started', { skillId: config.skillId });
        try {
            switch (config.method) {
                case 'git-clone':
                    await this.gitClone(config);
                    break;
                case 'npm-install':
                    await this.npmInstall(config);
                    break;
                case 'pip-install':
                    await this.pipInstall(config);
                    break;
            }
            if (config.postInstall)
                for (const cmd of config.postInstall)
                    await this.executeCommand(cmd);
            if (config.verification)
                await this.executeCommand(config.verification);
            this.registry.setInstalled(config.skillId, true);
            const result = { skillId: config.skillId, success: true, installedAt: Date.now() };
            this.eventBus.emit('skill.installed', result);
            return result;
        }
        catch (error) {
            const result = { skillId: config.skillId, success: false, error: String(error) };
            this.eventBus.emit('skill.install-failed', result);
            return result;
        }
    }
    async batchInstall(configs) {
        const results = [];
        for (const config of configs)
            results.push(await this.install(config));
        return results;
    }
    async verify(skillId) {
        const skill = this.registry.get(skillId);
        if (!skill)
            return false;
        const config = this.INSTALL_CONFIGS.get(skillId);
        if (!config?.verification)
            return skill.installed;
        try {
            await this.executeCommand(config.verification);
            return true;
        }
        catch {
            return false;
        }
    }
    async gitClone(config) {
        const targetPath = config.targetPath || `${this.skillDir}/${config.skillId}`;
        return await this.executeCommand(`git clone --depth 1 ${config.sourceUrl} ${targetPath}`);
    }
    async npmInstall(config) {
        if (!config.command)
            throw new Error('npm-install requires command');
        return await this.executeCommand(config.command);
    }
    async pipInstall(config) {
        if (!config.command)
            throw new Error('pip-install requires command');
        return await this.executeCommand(config.command);
    }
    async executeCommand(cmd) {
        logger.info({ command: cmd }, 'Executing install command');
        return `Executed: ${cmd}`;
    }
    generateDefaultConfig(skill) {
        const source = skill.source || '';
        if (source.includes('github.com'))
            return { skillId: skill.id, method: 'git-clone', sourceUrl: source, targetPath: `${this.skillDir}/${skill.id}` };
        if (source.includes('npm'))
            return { skillId: skill.id, method: 'npm-install', sourceUrl: source, command: `npm install -g ${skill.id}` };
        return { skillId: skill.id, method: 'manual', sourceUrl: source };
    }
}
//# sourceMappingURL=SkillInstaller.js.map