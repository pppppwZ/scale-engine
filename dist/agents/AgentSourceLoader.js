// SCALE Engine — Agent Source Loader (v0.9.0)
// 从外部 YAML 文件加载 Agent Profile 定义
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, extname } from 'node:path';
import * as yaml from 'js-yaml';
import { defaultProfileRegistry } from './profiles.js';
import { logger } from '../core/logger.js';
export class AgentSourceLoader {
    constructor(registry = defaultProfileRegistry) { this.registry = registry; }
    loadFromDirectory(dir) {
        if (!existsSync(dir)) {
            logger.warn({ dir }, 'Agent source directory not found');
            return [];
        }
        const profiles = [];
        const entries = readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
            if (entry.isDirectory()) {
                profiles.push(...this.loadFromDirectory(join(dir, entry.name)));
            }
            else if (entry.isFile() && (extname(entry.name) === '.yaml' || extname(entry.name) === '.yml')) {
                const profile = this.loadFromFile(join(dir, entry.name));
                if (profile) {
                    profiles.push(profile);
                    try {
                        this.registry.register(profile);
                    }
                    catch { }
                }
            }
        }
        return profiles;
    }
    loadFromFile(filePath) {
        if (!existsSync(filePath))
            return null;
        try {
            return this.loadFromYAML(readFileSync(filePath, 'utf-8'));
        }
        catch {
            return null;
        }
    }
    loadFromYAML(content) {
        try {
            const def = yaml.load(content);
            if (!this.validateDefinition(def))
                return null;
            return this.convertDefinition(def);
        }
        catch {
            return null;
        }
    }
    validateDefinition(def) {
        const required = ['id', 'name', 'domain', 'inheritsRole', 'capabilities'];
        for (const f of required)
            if (!def[f])
                return false;
        const validDomains = ['frontend', 'backend', 'testing', 'ui-design', 'operations', 'product', 'code-review', 'security', 'documentation', 'planning', 'exploration', 'database', 'performance', 'architecture'];
        if (!validDomains.includes(def.domain))
            return false;
        return true;
    }
    convertDefinition(def) {
        const profile = {
            id: def.id, name: def.name, description: def.description ?? '',
            domain: def.domain, inheritsRole: def.inheritsRole,
            capabilities: def.capabilities, preferredModel: def.preferredModel || 'balanced'
        };
        if (def.emoji)
            profile.emoji = def.emoji;
        if (def.color)
            profile.color = def.color;
        if (def.identity)
            profile.identity = def.identity;
        if (def.missions)
            profile.missions = def.missions;
        if (def.rules)
            profile.rules = def.rules;
        if (def.outputFormat)
            profile.outputFormat = def.outputFormat;
        if (def.deliverables)
            profile.deliverables = def.deliverables;
        if (def.workflow)
            profile.workflow = def.workflow;
        if (def.successMetrics)
            profile.successMetrics = def.successMetrics;
        if (def.collaboration)
            profile.collaboration = def.collaboration;
        return profile;
    }
    exportToYAML(profile) {
        return yaml.dump(profile);
    }
}
export const defaultAgentSourceLoader = new AgentSourceLoader();
export function loadAgentsFromDirectory(dir) { return defaultAgentSourceLoader.loadFromDirectory(dir); }
export function loadAgentFromFile(filePath) { return defaultAgentSourceLoader.loadFromFile(filePath); }
export function exportProfileToYAML(profile) { return defaultAgentSourceLoader.exportToYAML(profile); }
//# sourceMappingURL=AgentSourceLoader.js.map