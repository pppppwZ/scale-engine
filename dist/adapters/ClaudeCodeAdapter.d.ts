export interface AdapterConfig {
    projectDir: string;
    scaleDir?: string;
    agentType?: 'claude-code' | 'codex' | 'opencode' | 'cursor' | 'gemini' | 'openclaw' | 'hermes' | 'trae' | 'workbuddy' | 'vsc' | 'qcoder';
    scenarioMode?: 'sandbox' | 'standard' | 'critical';
}
export interface HookEntry {
    matcher: string;
    command: string;
    timeout?: number;
}
export interface SettingsJson {
    hooks?: Record<string, HookEntry[]>;
    permissions?: {
        allow?: string[];
        deny?: string[];
    };
    mcpServers?: Record<string, unknown>;
}
export interface IAgentAdapter {
    readonly agentType: string;
    init(config: AdapterConfig): Promise<InitResult>;
    getSettingsPath(): string;
    getKnowledgeDocPath(): string;
    getSkillsDir(): string;
    generateSettings(): SettingsJson;
    generateKnowledgeDoc(projectName: string, techStack?: string[]): string;
    mergeSettings(existing: SettingsJson): SettingsJson;
    isInstalled(): boolean;
}
export interface InitResult {
    settingsPath: string;
    knowledgeDocPath: string;
    scaleDir: string;
    created: string[];
    skipped: string[];
}
export declare class ClaudeCodeAdapter implements IAgentAdapter {
    readonly agentType = "claude-code";
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
