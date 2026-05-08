import type { IDetector, DetectorContext } from './Gateway.js';
import type { ToolUseInput, DetectorResult } from '../artifact/types.js';
export declare class DangerousCommandDetector implements IDetector {
    name: string;
    private patterns;
    check(input: ToolUseInput, ctx: DetectorContext): Promise<DetectorResult>;
}
export declare class SecretLeakDetector implements IDetector {
    name: string;
    private patterns;
    check(input: ToolUseInput, ctx: DetectorContext): Promise<DetectorResult>;
}
export interface RoleDefinition {
    id: string;
    name: string;
    allowedTools: string[];
    deniedTools?: string[];
}
export declare const BUILT_IN_ROLES: Record<string, RoleDefinition>;
export declare class RoleGateDetector implements IDetector {
    name: string;
    private currentRole;
    setRole(role: RoleDefinition): void;
    getRole(): RoleDefinition;
    check(input: ToolUseInput, _ctx: DetectorContext): Promise<DetectorResult>;
}
export declare class ScopeCreepDetector implements IDetector {
    name: string;
    /** Max distinct files allowed per session before warning */
    private maxFiles;
    /** Window in ms to track file edits */
    private windowMs;
    constructor(opts?: {
        maxFiles?: number;
        windowMs?: number;
    });
    check(input: ToolUseInput, ctx: DetectorContext): Promise<DetectorResult>;
}
