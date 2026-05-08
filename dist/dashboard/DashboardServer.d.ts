import type { EventBus } from '../core/eventBus.js';
import type { IArtifactStore } from '../artifact/store.js';
import type { IEvolutionEvaluator, EvolutionMetrics } from '../evolution/EvolutionEvaluator.js';
import type { DetectorStatisticsTracker } from '../guardrails/DetectorEnhanced.js';
export interface DashboardState {
    artifacts: ArtifactTreeNode[];
    evolutionMetrics: EvolutionMetrics | null;
    detectorStats: DetectorStatSummary[];
    autoDefectStats: AutoDefectSummary | null;
    recentEvents: RecentEvent[];
    timestamp: number;
}
export interface AutoDefectSummary {
    totalDefects: number;
    autoCreatedCount: number;
    byRootCause: Record<string, number>;
    bySeverity: Record<string, number>;
    recentDefects: RecentDefect[];
}
export interface RecentDefect {
    id: string;
    title: string;
    rootCause: string;
    severity: string;
    detector: string;
    createdAt: number;
}
export interface ArtifactTreeNode {
    id: string;
    type: string;
    title: string;
    status: string;
    version: number;
    children: ArtifactTreeNode[];
    gates?: GateSummary[];
}
export interface GateSummary {
    name: string;
    required: boolean;
    passed: boolean;
}
export interface DetectorStatSummary {
    name: string;
    totalTriggers: number;
    bySeverity: Record<string, number>;
    lastTrigger?: number;
}
export interface RecentEvent {
    type: string;
    timestamp: number;
    artifactId?: string;
    data?: Record<string, unknown>;
}
/**
 * DashboardServer — Hono-based web server for dashboard
 */
export declare class DashboardServer {
    private app;
    private bus;
    private store;
    private evaluator;
    private detectorTracker;
    private port;
    constructor(bus: EventBus, options?: {
        port?: number;
        store?: IArtifactStore;
        evaluator?: IEvolutionEvaluator;
        detectorTracker?: DetectorStatisticsTracker;
    });
    private setupRoutes;
    getDashboardState(): Promise<DashboardState>;
    getArtifactTree(): Promise<ArtifactTreeNode[]>;
    getEvolutionMetrics(): Promise<EvolutionMetrics | null>;
    getDetectorStats(): DetectorStatSummary[];
    getAutoDefectStats(): Promise<AutoDefectSummary | null>;
    getRecentEvents(limit: number): Promise<RecentEvent[]>;
    start(): void;
    stop(): void;
    private getIndexHtml;
}
