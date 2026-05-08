import type { IAgentAdapter } from './ClaudeCodeAdapter.js';
import type { AgentPlatform } from '../artifact/types.js';
export type { IAgentAdapter, AdapterConfig, InitResult, SettingsJson, HookEntry } from './ClaudeCodeAdapter.js';
export { ClaudeCodeAdapter } from './ClaudeCodeAdapter.js';
export { CodexAdapter } from './CodexAdapter.js';
export { OpenCodeAdapter } from './OpenCodeAdapter.js';
export { CursorAdapter } from './CursorAdapter.js';
export { GeminiAdapter } from './GeminiAdapter.js';
export { OpenClawAdapter } from './OpenClawAdapter.js';
export { HermesAdapter } from './HermesAdapter.js';
export { TraeAdapter } from './TraeAdapter.js';
export { WorkBuddyAdapter } from './WorkBuddyAdapter.js';
export { VSCAdapter } from './VSCAdapter.js';
export { QCoderAdapter } from './QCoderAdapter.js';
/** All supported agent type identifiers */
export declare const SUPPORTED_AGENTS: AgentPlatform[];
/**
 * Create an adapter instance for the given agent type.
 * Throws if agent type is not supported.
 */
export declare function createAdapter(agentType: string): IAgentAdapter;
