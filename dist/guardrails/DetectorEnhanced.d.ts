import type { IDetector, DetectorContext } from './Gateway.js';
import type { ToolUseInput, ToolResultInput, DetectorResult } from '../artifact/types.js';
import type { IEventBus } from '../core/eventBus.js';
export interface DetectorTriggerRecord {
    detectorName: string;
    sessionId: string;
    tool: string;
    severity: string;
    triggeredAt: number;
    reason: string;
}
export interface DetectorStatistics {
    detectorName: string;
    totalTriggers: number;
    bySeverity: Record<string, number>;
    byTool: Record<string, number>;
    recentTriggers: DetectorTriggerRecord[];
}
export interface IDetectorStatisticsTracker {
    record(trigger: DetectorTriggerRecord): void;
    getStats(detectorName: string): DetectorStatistics | null;
    getAllStats(): DetectorStatistics[];
    getRecentTriggers(limit?: number): DetectorTriggerRecord[];
    clear(): void;
}
export declare class DetectorStatisticsTracker implements IDetectorStatisticsTracker {
    private triggers;
    private maxRecords;
    constructor(maxRecords?: number);
    record(trigger: DetectorTriggerRecord): void;
    getStats(detectorName: string): DetectorStatistics | null;
    getAllStats(): DetectorStatistics[];
    getRecentTriggers(limit?: number): DetectorTriggerRecord[];
    clear(): void;
    private groupBy;
}
export interface DetectorConfig {
    enabled: boolean;
    threshold?: number;
    windowMs?: number;
    customPatterns?: Array<{
        pattern: RegExp;
        description: string;
    }>;
}
export interface IDetectorRegistry {
    register(detector: IDetector, hook: 'preTool' | 'postTool' | 'beforeStop', config?: DetectorConfig): void;
    unregister(detectorName: string): boolean;
    getDetector(detectorName: string): IDetector | null;
    getConfig(detectorName: string): DetectorConfig | null;
    setConfig(detectorName: string, config: Partial<DetectorConfig>): void;
    listDetectors(): Array<{
        name: string;
        hook: string;
        enabled: boolean;
    }>;
    enable(detectorName: string): void;
    disable(detectorName: string): void;
}
export declare class DetectorRegistry implements IDetectorRegistry {
    private detectors;
    register(detector: IDetector, hook: 'preTool' | 'postTool' | 'beforeStop', config?: DetectorConfig): void;
    unregister(detectorName: string): boolean;
    getDetector(detectorName: string): IDetector | null;
    getConfig(detectorName: string): DetectorConfig | null;
    setConfig(detectorName: string, config: Partial<DetectorConfig>): void;
    listDetectors(): Array<{
        name: string;
        hook: string;
        enabled: boolean;
    }>;
    enable(detectorName: string): void;
    disable(detectorName: string): void;
}
export declare class AISlopDetector implements IDetector {
    name: string;
    private patterns;
    private threshold;
    private windowMs;
    constructor(opts?: {
        threshold?: number;
        windowMs?: number;
    });
    check(input: ToolUseInput, ctx: DetectorContext): Promise<DetectorResult>;
}
export declare class HallucinationDetector implements IDetector {
    name: string;
    private patterns;
    check(input: ToolResultInput, ctx: DetectorContext): Promise<DetectorResult>;
}
export declare class DuplicateEditDetector implements IDetector {
    name: string;
    private maxDuplicates;
    constructor(opts?: {
        maxDuplicates?: number;
    });
    check(input: ToolUseInput, ctx: DetectorContext): Promise<DetectorResult>;
}
export interface IEnhancedGateway {
    registry: IDetectorRegistry;
    stats: IDetectorStatisticsTracker;
}
export declare class EnhancedGatewayContext implements IEnhancedGateway {
    registry: IDetectorRegistry;
    stats: IDetectorStatisticsTracker;
    constructor(eventBus: IEventBus);
}
export declare const ALL_ENHANCED_DETECTORS: Array<{
    detector: IDetector;
    hook: 'preTool' | 'postTool' | 'beforeStop';
}>;
