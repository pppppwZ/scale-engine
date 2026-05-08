import type { AgentProfile } from './types.js';
import { AgentProfileRegistry } from './profiles.js';
export interface YAMLAgentDefinition {
    id: string;
    name: string;
    description?: string;
    domain: string;
    emoji?: string;
    color?: string;
    identity?: {
        role: string;
        personality: string;
        memory: string;
        experience: string;
    };
    missions?: Array<{
        name: string;
        description: string;
        priority: 'critical' | 'high' | 'normal';
    }>;
    rules?: Array<{
        name: string;
        description: string;
        enforcement: 'block' | 'warn' | 'suggest';
    }>;
    inheritsRole: string;
    capabilities: string[];
    preferredModel: string;
    deliverables?: Array<{
        name: string;
        template: string;
        format: 'markdown' | 'code' | 'json' | 'yaml';
    }>;
    workflow?: Array<{
        stepId: string;
        name: string;
        description: string;
        outputs?: string[];
    }>;
    successMetrics?: Array<{
        name: string;
        target: string;
        measurement: string;
    }>;
    outputFormat?: {
        fileTypes: string[];
        style: string;
    };
    collaboration?: {
        reportsTo?: string;
        sharesWith: string[];
    };
}
export interface IAgentSourceLoader {
    loadFromDirectory(dir: string): AgentProfile[];
    loadFromFile(filePath: string): AgentProfile | null;
    loadFromYAML(content: string): AgentProfile | null;
    validateDefinition(def: YAMLAgentDefinition): boolean;
}
export declare class AgentSourceLoader implements IAgentSourceLoader {
    private registry;
    constructor(registry?: AgentProfileRegistry);
    loadFromDirectory(dir: string): AgentProfile[];
    loadFromFile(filePath: string): AgentProfile | null;
    loadFromYAML(content: string): AgentProfile | null;
    validateDefinition(def: YAMLAgentDefinition): boolean;
    private convertDefinition;
    exportToYAML(profile: AgentProfile): string;
}
export declare const defaultAgentSourceLoader: AgentSourceLoader;
export declare function loadAgentsFromDirectory(dir: string): AgentProfile[];
export declare function loadAgentFromFile(filePath: string): AgentProfile | null;
export declare function exportProfileToYAML(profile: AgentProfile): string;
