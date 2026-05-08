import type { IAgentAdapter, AdapterConfig, InitResult, SettingsJson } from './ClaudeCodeAdapter.js';
export declare class CodexAdapter implements IAgentAdapter {
    readonly agentType = "codex";
    private projectDir;
    private scaleDir;
    getSettingsPath(): string;
    getKnowledgeDocPath(): string;
    getSkillsDir(): string;
    isInstalled(): boolean;
    generateSettings(): SettingsJson;
    generateCodexConfig(): string;
    mergeSettings(existing: SettingsJson): SettingsJson;
    generateKnowledgeDoc(projectName: string, techStack?: string[]): string;
    init(config: AdapterConfig): Promise<InitResult>;
}
