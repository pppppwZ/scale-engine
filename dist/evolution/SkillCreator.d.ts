import type { Pattern, IPatternExtractor } from './PatternExtractor.js';
import type { IEventBus } from '../core/eventBus.js';
export interface SkillProposal {
    id: string;
    name: string;
    description: string;
    triggers: string[];
    triggerConditions: string[];
    agents: string[];
    steps: SkillStep[];
    examples: SkillExample[];
    antipatterns: string[];
    sourcePattern: string;
    sourceConversation?: string;
    meetsCriteria?: SkillCriteria;
    status: 'draft' | 'proposed' | 'approved' | 'published';
    createdAt: number;
}
export interface SkillStep {
    phase: string;
    actions: string[];
    checklist: string[];
}
export interface SkillExample {
    title: string;
    code?: string;
    description: string;
}
export interface SkillCriteria {
    notGoogleable: boolean;
    contextSpecific: boolean;
    executable: boolean;
    hardWon: boolean;
}
export interface SkillCandidate {
    id: string;
    detectedPattern: string;
    potentialTriggers: string[];
    estimatedValue: number;
    meetsCriteria: SkillCriteria;
}
export interface ISkillCreator {
    patternToSkill(pattern: Pattern): SkillProposal;
    detectSkillCandidate(conversationId: string): SkillCandidate | null;
    validateTriggerConditions(proposal: SkillProposal): {
        valid: boolean;
        reason?: string;
    };
    proposeToUser(skill: SkillProposal): Promise<boolean>;
    publish(skill: SkillProposal, skillsDir: string): string;
    getProposals(): SkillProposal[];
}
export declare class SkillCreator implements ISkillCreator {
    private extractor;
    private eventBus;
    private proposals;
    private seq;
    constructor(extractor: IPatternExtractor, eventBus: IEventBus);
    patternToSkill(pattern: Pattern): SkillProposal;
    proposeToUser(skill: SkillProposal): Promise<boolean>;
    publish(skill: SkillProposal, skillsDir: string): string;
    getProposals(): SkillProposal[];
    detectSkillCandidate(conversationId: string): SkillCandidate | null;
    validateTriggerConditions(proposal: SkillProposal): {
        valid: boolean;
        reason?: string;
    };
    private generateSkillMarkdownEnhanced;
    private skillNameFromPattern;
    private inferTriggers;
    private inferTriggerConditions;
    private inferAgents;
    private convertSteps;
    private generateSkillMarkdown;
}
