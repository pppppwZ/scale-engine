import type { IEventBus } from '../core/eventBus.js';
import type { IBrowserCapability, ISearchCapability, IComputerCapability, IMCPCapability, CapabilityConfig, ICapabilityRegistry } from './types.js';
export declare class CapabilityRegistry implements ICapabilityRegistry {
    private browser;
    private search;
    private computer;
    private config;
    private eventBus;
    constructor(eventBus: IEventBus, config?: CapabilityConfig);
    getBrowser(): IBrowserCapability | null;
    getSearch(): ISearchCapability | null;
    getComputer(): IComputerCapability | null;
    getAll(): IMCPCapability[];
    configure(config: Partial<CapabilityConfig>): void;
}
