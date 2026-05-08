import type { IEventBus } from '../core/eventBus.js';
import type { SkillRegistry } from './SkillRegistry.js';
import type { SkillInstallConfig, ISkillInstaller } from './SkillInstaller.js';
import type { AgentPlatform, SkillRef, SkillScanResult, DevelopmentPhase } from '../artifact/types.js';
/** Phase-based skill scan result */
export interface PhaseSkillScanResult {
    phase: DevelopmentPhase;
    skills: SkillRef[];
    count: number;
}
/** 发现上下文 - Agent 执行任务时的场景 */
export interface DiscoveryContext {
    taskType: string;
    missingCapabilities: string[];
    phase: 'explore' | 'plan' | 'execute' | 'verify' | 'deliver';
    keywords: string[];
}
/** 发现结果 */
export interface DiscoveryResult {
    skillId: string;
    sourceUrl: string;
    quality: number;
    relevance: number;
    description: string;
    alreadyInstalled: boolean;
    installConfig?: SkillInstallConfig;
}
/** Agent 主动技能发现接口 */
export interface ISkillDiscovery {
    discover(context: DiscoveryContext): Promise<DiscoveryResult[]>;
    recommendInstall(context: DiscoveryContext): Promise<SkillInstallConfig[]>;
    periodicScan(): Promise<DiscoveryResult[]>;
    checkDuringExecution(taskType: string, capabilities: string[]): Promise<DiscoveryResult[]>;
    scanSkills(platform: AgentPlatform): SkillScanResult;
    scanPhaseSkills(projectDir?: string): Map<DevelopmentPhase, PhaseSkillScanResult>;
    getSkillsForPhase(phase: DevelopmentPhase, projectDir?: string): SkillRef[];
    detectPlatform(): AgentPlatform | null;
}
export declare class SkillDiscovery implements ISkillDiscovery {
    private registry;
    private installer;
    private eventBus;
    private projectDir;
    /**
     * 构造函数支持两种模式：
     * 1. 独立模式（仅 projectDir）：用于平台检测和技能扫描
     * 2. 增强模式（完整参数）：用于 Agent 主动发现和推荐安装
     */
    constructor(registryOrProjectDir: SkillRegistry | string, installer?: ISkillInstaller, eventBus?: IEventBus, projectDir?: string);
    discover(context: DiscoveryContext): Promise<DiscoveryResult[]>;
    recommendInstall(context: DiscoveryContext): Promise<SkillInstallConfig[]>;
    periodicScan(): Promise<DiscoveryResult[]>;
    checkDuringExecution(taskType: string, capabilities: string[]): Promise<DiscoveryResult[]>;
    detectPlatform(): AgentPlatform | null;
    scanSkills(platform: AgentPlatform): SkillScanResult;
    generateSkillsMd(skills: SkillRef[]): string;
    /**
     * Scan skills organized by development phase
     * @param projectDir - Project directory containing skills/ folder
     * @returns Map of phase to skill scan results
     */
    scanPhaseSkills(projectDir?: string): Map<DevelopmentPhase, PhaseSkillScanResult>;
    /**
     * Get skills available for a specific development phase
     * @param phase - Development phase (DEFINE, PLAN, BUILD, VERIFY, REVIEW, SHIP, ANTI-PATTERNS)
     * @param projectDir - Project directory
     * @returns List of skills for the phase
     */
    getSkillsForPhase(phase: DevelopmentPhase, projectDir?: string): SkillRef[];
    /**
     * Generate phase-based skills index markdown
     */
    generatePhaseSkillsMd(scanResult: Map<DevelopmentPhase, PhaseSkillScanResult>): string;
    private matchCategory;
    private calculateRelevance;
    private detectMissingCapabilities;
    private createInstallConfig;
    private extractSkillDescription;
}
