import type { IEventBus } from '../core/eventBus.js';
export type ModelTier = 'fast' | 'balanced' | 'powerful' | 'local';
export interface ModelConfig {
    tier: ModelTier;
    name: string;
    maxTokens: number;
    costPerMToken: number;
}
export declare const DEFAULT_MODELS: Record<ModelTier, ModelConfig>;
export interface RoutingContext {
    taskComplexity?: number;
    artifactType?: string;
    stepCount?: number;
    previousFailures?: number;
    budget?: 'low' | 'medium' | 'high';
}
export interface IModelRouter {
    route(ctx: RoutingContext): ModelConfig;
    getModels(): Record<ModelTier, ModelConfig>;
    setModel(tier: ModelTier, config: ModelConfig): void;
}
export declare class ModelRouter implements IModelRouter {
    private eventBus;
    private models;
    constructor(eventBus: IEventBus, models?: Partial<Record<ModelTier, ModelConfig>>);
    route(ctx: RoutingContext): ModelConfig;
    getModels(): Record<ModelTier, ModelConfig>;
    setModel(tier: ModelTier, config: ModelConfig): void;
    private explainRouting;
}
