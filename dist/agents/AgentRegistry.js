// SCALE Engine — Agent Registry
// Profile 注册与查询
import { PROFESSIONAL_AGENTS } from './profiles.js';
import { logger } from '../core/logger.js';
export class AgentRegistry {
    constructor(initialProfiles = PROFESSIONAL_AGENTS) {
        this.profiles = new Map();
        for (const profile of initialProfiles) {
            this.register(profile);
        }
    }
    register(profile) {
        if (this.profiles.has(profile.id)) {
            throw new Error(`Agent profile already registered: ${profile.id}`);
        }
        this.profiles.set(profile.id, profile);
        logger.debug({ profileId: profile.id, domain: profile.domain }, 'Agent profile registered');
    }
    get(id) {
        return this.profiles.get(id);
    }
    getByDomain(domain) {
        return Array.from(this.profiles.values()).filter(p => p.domain === domain);
    }
    getByRole(role) {
        return Array.from(this.profiles.values()).filter(p => p.inheritsRole === role);
    }
    list() {
        return Array.from(this.profiles.keys());
    }
    getAll() {
        return Array.from(this.profiles.values());
    }
}
export const DEFAULT_REGISTRY = new AgentRegistry();
//# sourceMappingURL=AgentRegistry.js.map