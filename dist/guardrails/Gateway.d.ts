import type { ToolUseInput, ToolResultInput, StopInput, GateDecision, DetectorResult } from '../artifact/types.js';
import type { IEventBus } from '../core/eventBus.js';
export interface IDetector {
    name: string;
    check(input: ToolUseInput | ToolResultInput | StopInput, context: DetectorContext): Promise<DetectorResult>;
}
export interface DetectorContext {
    eventBus: IEventBus;
    cache: Map<string, unknown>;
}
export interface IGateway {
    preTool(input: ToolUseInput): Promise<GateDecision>;
    postTool(input: ToolResultInput): Promise<void>;
    beforeStop(input: StopInput): Promise<GateDecision>;
    registerDetector(detector: IDetector, hook: 'preTool' | 'postTool' | 'beforeStop'): void;
}
export declare class Gateway implements IGateway {
    private eventBus;
    private cache;
    private detectors;
    constructor(eventBus: IEventBus);
    registerDetector(detector: IDetector, hook: 'preTool' | 'postTool' | 'beforeStop'): void;
    preTool(input: ToolUseInput): Promise<GateDecision>;
    postTool(input: ToolResultInput): Promise<void>;
    beforeStop(input: StopInput): Promise<GateDecision>;
}
