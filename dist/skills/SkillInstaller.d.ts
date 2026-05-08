import type { SkillRegistry } from './SkillRegistry.js';
import type { IEventBus } from '../core/eventBus.js';
export type InstallMethod = 'git-clone' | 'npm-install' | 'pip-install' | 'curl-download' | 'manual';
export interface SkillInstallConfig {
    skillId: string;
    method: InstallMethod;
    sourceUrl: string;
    targetPath?: string;
    command?: string;
    postInstall?: string[];
    verification?: string;
}
export interface InstallResult {
    skillId: string;
    success: boolean;
    installedAt?: number;
    error?: string;
}
export interface ISkillInstaller {
    checkAndPrompt(): Promise<SkillInstallConfig[]>;
    install(config: SkillInstallConfig): Promise<InstallResult>;
    batchInstall(configs: SkillInstallConfig[]): Promise<InstallResult[]>;
    verify(skillId: string): Promise<boolean>;
}
export declare class SkillInstaller implements ISkillInstaller {
    private registry;
    private eventBus;
    private skillDir;
    private INSTALL_CONFIGS;
    constructor(registry: SkillRegistry, eventBus: IEventBus, skillDir?: string);
    checkAndPrompt(): Promise<SkillInstallConfig[]>;
    install(config: SkillInstallConfig): Promise<InstallResult>;
    batchInstall(configs: SkillInstallConfig[]): Promise<InstallResult[]>;
    verify(skillId: string): Promise<boolean>;
    private gitClone;
    private npmInstall;
    private pipInstall;
    private executeCommand;
    private generateDefaultConfig;
}
