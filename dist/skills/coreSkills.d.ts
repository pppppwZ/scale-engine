import type { SkillDefinition } from "./SkillRegistry.js";
export declare const CORE_SKILLS: SkillDefinition[];
export declare function getCoreSkill(id: string): SkillDefinition | undefined;
export declare function registerCoreSkills(registry: {
    registerBatch: (skills: SkillDefinition[]) => void;
}): void;
