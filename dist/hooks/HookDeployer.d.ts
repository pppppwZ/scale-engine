import type { IEventBus } from '../core/eventBus.js';
import type { EnhancedHook } from './HookGeneratorEnhanced.js';
export interface DeploymentResult {
    success: boolean;
    hookId: string;
    settingsPath: string;
    errors: string[];
}
export interface DeploymentStatus {
    hookId: string;
    deployedAt: number;
    settingsPath: string;
    active: boolean;
    rollbackAvailable: boolean;
}
export interface IHookDeployer {
    deploy(hook: EnhancedHook, settingsPath: string): DeploymentResult;
    deployMultiple(hooks: EnhancedHook[], settingsPath: string): DeploymentResult[];
    rollback(hookId: string, settingsPath: string): boolean;
    getStatus(hookId: string): DeploymentStatus | null;
    listDeployed(): DeploymentStatus[];
    validateForDeployment(hook: EnhancedHook): {
        valid: boolean;
        errors: string[];
    };
}
export declare class HookDeployer implements IHookDeployer {
    private eventBus;
    private deployments;
    private hooksBackup;
    constructor(eventBus: IEventBus);
    deploy(hook: EnhancedHook, settingsPath: string): DeploymentResult;
    deployMultiple(hooks: EnhancedHook[], settingsPath: string): DeploymentResult[];
    rollback(hookId: string, settingsPath: string): boolean;
    getStatus(hookId: string): DeploymentStatus | null;
    listDeployed(): DeploymentStatus[];
    validateForDeployment(hook: EnhancedHook): {
        valid: boolean;
        errors: string[];
    };
    private readSettings;
    private writeSettings;
    private buildHookConfig;
}
