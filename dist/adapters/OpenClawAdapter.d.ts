import type { IAgentAdapter, AdapterConfig, InitResult, SettingsJson } from './ClaudeCodeAdapter.js';
export declare class OpenClawAdapter implements IAgentAdapter {
    readonly agentType = "openclaw";
    private projectDir;
    private scaleDir;
    getSettingsPath(): string;
    getKnowledgeDocPath(): string;
    getSkillsDir(): string;
    isInstalled(): boolean;
    generateSettings(): SettingsJson;
    mergeSettings(existing: SettingsJson): SettingsJson;
    generateKnowledgeDoc(projectName: string, techStack?: string[]): string;
    init(config: AdapterConfig): Promise<InitResult>;
}
