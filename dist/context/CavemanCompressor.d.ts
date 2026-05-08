export interface CavemanConfig {
    enabled: boolean;
    preserveTerms: string[];
    symbolMap: Record<string, string>;
    maxCompressionRatio: number;
}
export declare const DEFAULT_SYMBOL_MAP: Record<string, string>;
export declare const DEFAULT_PRESERVE_TERMS: string[];
export interface ICavemanCompressor {
    compress(text: string, config: CavemanConfig): string;
    shouldActivate(tokenUsage: number, tokenLimit: number): boolean;
}
export declare class CavemanCompressor implements ICavemanCompressor {
    compress(text: string, config: CavemanConfig): string;
    shouldActivate(tokenUsage: number, tokenLimit: number): boolean;
    private removeFillerWords;
    private applySymbols;
}
export declare function createCavemanCompressor(): ICavemanCompressor;
export declare const DEFAULT_CAVEMAN_CONFIG: CavemanConfig;
