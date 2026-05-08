import type { IEventBus } from '../core/eventBus.js';
import type { SearchResult, CapabilityResult, ISearchCapability, CapabilityConfig } from './types.js';
export declare class WebSearchCapability implements ISearchCapability {
    readonly name = "websearch";
    readonly category: "search";
    private eventBus;
    private config;
    constructor(eventBus: IEventBus, config: CapabilityConfig['search']);
    isAvailable(): boolean;
    initialize(): Promise<boolean>;
    shutdown(): Promise<void>;
    search(query: string, options?: {
        limit?: number;
    }): Promise<CapabilityResult<SearchResult[]>>;
    fetch(url: string): Promise<CapabilityResult<{
        content: string;
    }>>;
}
export declare class Context7SearchCapability implements ISearchCapability {
    readonly name = "context7-search";
    readonly category: "search";
    isAvailable(): boolean;
    initialize(): Promise<boolean>;
    shutdown(): Promise<void>;
    search(query: string): Promise<CapabilityResult<SearchResult[]>>;
    fetch(url: string): Promise<CapabilityResult<{
        content: string;
    }>>;
}
