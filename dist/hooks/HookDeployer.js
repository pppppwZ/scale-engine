// SCALE Engine — Hook Deployer (v0.7.0)
// Hook 部署管理：验证、安装、跟踪、回滚
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { logger } from '../core/logger.js';
export class HookDeployer {
    constructor(eventBus) {
        this.eventBus = eventBus;
        this.deployments = new Map();
        this.hooksBackup = new Map();
    }
    deploy(hook, settingsPath) {
        const validation = this.validateForDeployment(hook);
        if (!validation.valid) {
            return { success: false, hookId: hook.id, settingsPath, errors: validation.errors };
        }
        // 读取现有 settings
        const settings = this.readSettings(settingsPath);
        if (!settings) {
            return { success: false, hookId: hook.id, settingsPath, errors: ['Cannot read settings.json'] };
        }
        // 备份原配置
        this.hooksBackup.set(hook.id, JSON.stringify(settings));
        // 添加 hook 配置
        const hookConfig = this.buildHookConfig(hook);
        const hooks = settings.hooks ?? {};
        if (!hooks[hook.hookType])
            hooks[hook.hookType] = [];
        hooks[hook.hookType].push(hookConfig);
        settings.hooks = hooks;
        // 写入文件
        try {
            this.writeSettings(settingsPath, settings);
        }
        catch (e) {
            return { success: false, hookId: hook.id, settingsPath, errors: ['Failed to write settings: ' + e.message] };
        }
        // 记录部署状态
        const status = {
            hookId: hook.id,
            deployedAt: Date.now(),
            settingsPath,
            active: true,
            rollbackAvailable: true,
        };
        this.deployments.set(hook.id, status);
        this.eventBus.emit('hook.deployed', { hookId: hook.id, hookType: hook.hookType, scriptPath: hook.scriptPath, settingsPath });
        logger.info({ hookId: hook.id, settingsPath }, 'Hook deployed');
        return { success: true, hookId: hook.id, settingsPath, errors: [] };
    }
    deployMultiple(hooks, settingsPath) {
        return hooks.map(h => this.deploy(h, settingsPath));
    }
    rollback(hookId, settingsPath) {
        const status = this.deployments.get(hookId);
        if (!status || !status.rollbackAvailable) {
            logger.warn({ hookId }, 'No rollback available for hook');
            return false;
        }
        const backup = this.hooksBackup.get(hookId);
        if (!backup) {
            logger.warn({ hookId }, 'No backup found for hook');
            return false;
        }
        try {
            writeFileSync(settingsPath, backup, 'utf-8');
            status.active = false;
            status.rollbackAvailable = false;
            this.eventBus.emit('hook.rollback', { hookId, settingsPath });
            logger.info({ hookId }, 'Hook rolled back');
            return true;
        }
        catch (e) {
            logger.error({ hookId, error: e.message }, 'Rollback failed');
            return false;
        }
    }
    getStatus(hookId) {
        return this.deployments.get(hookId) ?? null;
    }
    listDeployed() {
        return Array.from(this.deployments.values());
    }
    validateForDeployment(hook) {
        const errors = [];
        // 检查脚本文件存在
        if (!existsSync(hook.scriptPath)) {
            errors.push('Hook script does not exist: ' + hook.scriptPath);
        }
        // 检查 hook 类型
        const validTypes = ['PreToolUse', 'PostToolUse', 'Stop', 'SessionStart'];
        if (!validTypes.includes(hook.hookType)) {
            errors.push('Invalid hook type: ' + hook.hookType);
        }
        // 检查 matcher
        if (hook.hookType !== 'Stop' && hook.hookType !== 'SessionStart' && !hook.matcher) {
            errors.push('Matcher is required for PreToolUse/PostToolUse hooks');
        }
        // 检查超时合理
        if (hook.timeout < 1000 || hook.timeout > 60000) {
            errors.push('Timeout should be between 1000ms and 60000ms');
        }
        return { valid: errors.length === 0, errors };
    }
    readSettings(path) {
        if (!existsSync(path)) {
            // 创建默认配置
            return { hooks: {} };
        }
        try {
            const content = readFileSync(path, 'utf-8');
            return JSON.parse(content);
        }
        catch (e) {
            logger.error({ path, error: e.message }, 'Failed to read settings');
            return null;
        }
    }
    writeSettings(path, settings) {
        const dir = join(path, '..');
        if (!existsSync(dir))
            mkdirSync(dir, { recursive: true });
        writeFileSync(path, JSON.stringify(settings, null, 2), 'utf-8');
    }
    buildHookConfig(hook) {
        const config = {
            matcher: hook.matcher || '',
            command: 'node ' + hook.scriptPath,
            timeout: hook.timeout,
        };
        // 添加描述
        if (hook.templateId) {
            config.description = 'Generated from template: ' + hook.templateId;
        }
        else if (hook.detectorType) {
            config.description = 'Generated from detector: ' + hook.detectorType;
        }
        else if (hook.ruleId) {
            config.description = 'Generated from rule: ' + hook.ruleId;
        }
        return config;
    }
}
//# sourceMappingURL=HookDeployer.js.map