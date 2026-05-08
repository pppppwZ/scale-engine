import type { IEventBus } from '../core/eventBus.js';
import type { CapabilityResult, IComputerCapability, CapabilityConfig } from './types.js';
export declare class CUACapability implements IComputerCapability {
    readonly name = "cua";
    readonly category: "computer";
    private eventBus;
    private config;
    constructor(eventBus: IEventBus, config: CapabilityConfig['computer']);
    isAvailable(): boolean;
    initialize(): Promise<boolean>;
    shutdown(): Promise<void>;
    execute(action: {
        type: 'click' | 'type' | 'scroll';
        coordinate?: [number, number];
        text?: string;
    }): Promise<CapabilityResult<void>>;
    private validateCoordinate;
}
export declare class PlaywrightComputerCapability implements IComputerCapability {
    readonly name = "playwright-computer";
    readonly category: "computer";
    isAvailable(): boolean;
    initialize(): Promise<boolean>;
    shutdown(): Promise<void>;
    execute(action: {
        type: string;
    }): Promise<CapabilityResult<void>>;
}
