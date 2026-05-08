import type { IEventBus } from '../core/eventBus.js';
import type { BrowserAction, BrowserSession, CapabilityResult, IBrowserCapability, CapabilityConfig } from './types.js';
export declare class PlaywrightBrowserCapability implements IBrowserCapability {
    readonly name = "playwright-browser";
    readonly category: "browser";
    private sessions;
    constructor(eventBus: IEventBus, config: CapabilityConfig['browser']);
    isAvailable(): boolean;
    initialize(): Promise<boolean>;
    shutdown(): Promise<void>;
    createSession(options?: {
        url?: string;
    }): Promise<CapabilityResult<BrowserSession>>;
    closeSession(sessionId: string): Promise<CapabilityResult<void>>;
    executeAction(sessionId: string, action: BrowserAction): Promise<CapabilityResult<unknown>>;
    takeScreenshot(sessionId: string): Promise<CapabilityResult<string>>;
}
export declare class ChromeDevToolsBrowserCapability implements IBrowserCapability {
    readonly name = "chrome-devtools-browser";
    readonly category: "browser";
    constructor(eventBus: IEventBus);
    isAvailable(): boolean;
    initialize(): Promise<boolean>;
    shutdown(): Promise<void>;
    createSession(options?: {
        url?: string;
    }): Promise<CapabilityResult<BrowserSession>>;
    executeAction(sessionId: string, action: BrowserAction): Promise<CapabilityResult<unknown>>;
    takeScreenshot(sessionId: string): Promise<CapabilityResult<string>>;
}
