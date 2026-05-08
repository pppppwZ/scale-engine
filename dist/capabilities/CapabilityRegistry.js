// SCALE Engine — Capability Registry
// Central registry for all MCP capabilities
import { DEFAULT_CONFIG } from './types.js';
import { PlaywrightBrowserCapability, ChromeDevToolsBrowserCapability } from './BrowserCapability.js';
import { WebSearchCapability } from './SearchCapability.js';
import { CUACapability } from './ComputerCapability.js';
export class CapabilityRegistry {
    constructor(eventBus, config = DEFAULT_CONFIG) {
        this.browser = null;
        this.search = null;
        this.computer = null;
        this.eventBus = eventBus;
        this.config = config;
    }
    getBrowser() {
        if (!this.browser && this.config.browser.enabled) {
            this.browser = this.config.browser.preferredEngine === 'playwright'
                ? new PlaywrightBrowserCapability(this.eventBus, this.config.browser)
                : new ChromeDevToolsBrowserCapability(this.eventBus);
        }
        return this.browser;
    }
    getSearch() {
        if (!this.search && this.config.search.enabled) {
            this.search = new WebSearchCapability(this.eventBus, this.config.search);
        }
        return this.search;
    }
    getComputer() {
        if (!this.computer && this.config.computer.enabled) {
            this.computer = new CUACapability(this.eventBus, this.config.computer);
        }
        return this.computer;
    }
    getAll() {
        const caps = [];
        if (this.browser)
            caps.push(this.browser);
        if (this.search)
            caps.push(this.search);
        if (this.computer)
            caps.push(this.computer);
        return caps;
    }
    configure(config) {
        this.config = { ...this.config, ...config };
        this.browser = null;
        this.search = null;
        this.computer = null;
    }
}
//# sourceMappingURL=CapabilityRegistry.js.map