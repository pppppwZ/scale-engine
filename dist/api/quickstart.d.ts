import type { AgentPlatform } from '../artifact/types.js';
export interface PlatformDetectionResult {
    platform: AgentPlatform | null;
    confidence: number;
    suggestions: string[];
}
export declare function detectPlatform(projectDir?: string): PlatformDetectionResult;
export declare const PHYSICAL_CONSTRAINTS: {
    id: string;
    severity: string;
    matcher: string;
    command: string;
}[];
export interface QuickStartResult {
    success: boolean;
    platform: AgentPlatform | null;
    created: string[];
    skipped: string[];
    constraintsApplied: number;
    capabilitiesEnabled: string[];
    nextSteps: string[];
}
export declare function quickStart(projectDir?: string): Promise<QuickStartResult>;
