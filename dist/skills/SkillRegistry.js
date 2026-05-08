// SCALE Engine — Skill Registry (v0.7.0)
// 技能注册表：存储、查询、推荐技能
import { logger } from '../core/logger.js';
// ============================================================================
// SkillRegistry Implementation
// ============================================================================
export class SkillRegistry {
    constructor(eventBus) {
        this.skills = new Map();
        this.eventBus = eventBus;
    }
    register(skill) {
        if (!skill.id || !skill.name || !skill.execution) {
            throw new Error('Invalid skill definition: missing required fields');
        }
        if (this.skills.has(skill.id) && !skill.installed) {
            logger.warn({ skillId: skill.id }, 'Skill already registered, skipping');
            return;
        }
        this.skills.set(skill.id, skill);
        this.eventBus.emit('skill.registered', { skillId: skill.id, domain: skill.domain, installed: skill.installed });
        logger.info({ skillId: skill.id, domain: skill.domain }, 'Skill registered');
    }
    unregister(skillId) {
        const skill = this.skills.get(skillId);
        if (!skill)
            return;
        this.skills.delete(skillId);
        this.eventBus.emit('skill.unregistered', { skillId });
        logger.info({ skillId }, 'Skill unregistered');
    }
    get(skillId) {
        return this.skills.get(skillId);
    }
    listAll(domain) {
        const all = [...this.skills.values()];
        if (domain)
            return all.filter(s => s.domain === domain);
        return all.sort((a, b) => b.priority - a.priority);
    }
    listInstalled() {
        return [...this.skills.values()].filter(s => s.installed).sort((a, b) => b.priority - a.priority);
    }
    recommend(context) {
        const candidates = [];
        for (const skill of this.skills.values()) {
            if (!skill.installed)
                continue;
            const { matched, score } = this.evaluateTriggers(skill, context);
            if (matched.length > 0 && score > 0.3) {
                const priority = this.calculatePriority(skill, score, context);
                candidates.push({
                    skillId: skill.id, priority, reason: this.generateReason(skill, matched),
                    triggeredBy: matched, executionType: skill.execution.type,
                });
            }
        }
        return candidates.sort((a, b) => b.priority - a.priority).slice(0, 5);
    }
    evaluateTriggers(skill, context) {
        const matched = [];
        let totalWeight = 0, matchedWeight = 0;
        for (const trigger of skill.triggers) {
            totalWeight += trigger.weight;
            if (this.matchesTrigger(trigger, context)) {
                matched.push(trigger);
                matchedWeight += trigger.weight;
            }
        }
        return { matched, score: totalWeight > 0 ? matchedWeight / totalWeight : 0 };
    }
    setInstalled(skillId, installed) {
        const skill = this.skills.get(skillId);
        if (!skill)
            return;
        skill.installed = installed;
        skill.installedAt = installed ? Date.now() : undefined;
        this.eventBus.emit('skill.installation_changed', { skillId, installed });
    }
    getDependencies(skillId) {
        const skill = this.skills.get(skillId);
        if (!skill?.prerequisites)
            return [];
        return skill.prerequisites.map(id => this.skills.get(id)).filter(Boolean);
    }
    checkConflicts(skillId) {
        const skill = this.skills.get(skillId);
        if (!skill?.conflicts)
            return [];
        return skill.conflicts.filter(id => this.skills.get(id)?.installed);
    }
    matchesTrigger(trigger, context) {
        switch (trigger.type) {
            case 'taskType':
                return context.taskType === trigger.value || (Array.isArray(trigger.value) && trigger.value.includes(context.taskType ?? ''));
            case 'phase': return context.phase === trigger.value;
            case 'detectorTriggered':
                return context.detectorTriggered === trigger.value || (Array.isArray(trigger.value) && trigger.value.includes(context.detectorTriggered ?? ''));
            case 'complexity': return context.complexity === trigger.value;
            case 'keyword':
                if (!context.keywords)
                    return false;
                const triggerKeywords = Array.isArray(trigger.value) ? trigger.value : [trigger.value];
                return triggerKeywords.some(k => context.keywords.some(ck => ck.toLowerCase().includes(k.toLowerCase())));
            case 'manual': return false;
            default: return false;
        }
    }
    calculatePriority(skill, triggerScore, context) {
        let priority = skill.priority + triggerScore * 30;
        if (context.complexity === 'complex' && skill.domain === 'planning')
            priority += 10;
        if (context.phase === 'verify' && skill.domain === 'verification')
            priority += 15;
        if (context.phase === 'implement' && skill.domain === 'execution')
            priority += 15;
        if (context.detectorTriggered && skill.domain === 'verification')
            priority += 20;
        return Math.min(100, Math.max(0, priority));
    }
    generateReason(skill, matched) {
        const triggerNames = matched.map(t => t.type).join(', ');
        return matched.length === 1 ? `${skill.name} 触发条件匹配: ${triggerNames}` : `${skill.name} 多条件匹配: ${triggerNames} (${matched.length} 个触发器)`;
    }
    registerBatch(skills) { for (const skill of skills)
        this.register(skill); }
    clear() { this.skills.clear(); this.eventBus.emit('skills.cleared', { clearedAt: Date.now() }); }
}
//# sourceMappingURL=SkillRegistry.js.map