export const DEFAULT_SYMBOL_MAP = { "->": "switch to", "v": "verified", "x": "failed", "?": "unknown", "!": "critical", "+": "add", "-": "remove" };
export const DEFAULT_PRESERVE_TERMS = ["TypeScript", "JavaScript", "React", "Vue", "Node.js", "PostgreSQL", "API", "async", "await", "Promise", "interface", "type"];
export class CavemanCompressor {
    compress(text, config) { if (!config.enabled)
        return text; let r = this.removeFillerWords(text); r = this.applySymbols(r); return r; }
    shouldActivate(tokenUsage, tokenLimit) { return (tokenLimit - tokenUsage) < 50000; }
    removeFillerWords(text) { const f = ["I", "have", "analyzed", "the", "a", "is", "that"]; let r = text; for (const w of f)
        r = r.replace(new RegExp("\b" + w + "\b", "gi"), ""); return r.replace(/\s+/g, " ").trim(); }
    applySymbols(text) { const m = { "switch to": "->", "verified": "v", "failed": "x", "add": "+", "remove": "-" }; let r = text; for (const [p, s] of Object.entries(m))
        r = r.replace(new RegExp(p, "gi"), s); return r; }
}
export function createCavemanCompressor() { return new CavemanCompressor(); }
export const DEFAULT_CAVEMAN_CONFIG = { enabled: false, preserveTerms: DEFAULT_PRESERVE_TERMS, symbolMap: DEFAULT_SYMBOL_MAP, maxCompressionRatio: 0.25 };
//# sourceMappingURL=CavemanCompressor.js.map