// SCALE Engine - Ubiquitous Language Manager (mattpocock/skills style)
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { logger } from "../core/logger.js";
export class UbiquitousLanguageManager {
    constructor(projectDir, eventBus, contextMdPath, adrDir) {
        this.terms = new Map();
        this.adrs = new Map();
        this.dirty = false;
        this.contextMdPath = contextMdPath ?? join(projectDir, "CONTEXT.md");
        this.adrDir = adrDir ?? join(projectDir, "docs", "adr");
        this.eventBus = eventBus ?? null;
        this.loadFromFiles();
    }
    loadContextMd() {
        if (!existsSync(this.contextMdPath))
            return this.terms;
        const content = readFileSync(this.contextMdPath, "utf-8");
        this.terms = this.parseContextMd(content);
        logger.info({ count: this.terms.size }, "Loaded terms");
        return this.terms;
    }
    updateTerm(term, definition, source) {
        const existing = this.terms.get(term);
        this.terms.set(term, { term, definition, examples: existing?.examples ?? [], aliases: existing?.aliases ?? [], lastUpdated: Date.now(), source });
        this.dirty = true;
        this.eventBus?.emit("term.updated", { term, source });
    }
    removeTerm(term) { this.terms.delete(term); this.dirty = true; }
    detectAmbiguity() {
        const reports = [];
        for (const [term, def] of this.terms) {
            for (const alias of def.aliases) {
                const aliasDef = this.terms.get(alias);
                if (aliasDef && aliasDef.definition !== def.definition)
                    reports.push({ term, definitions: [def.definition, aliasDef.definition], sources: [def.source, aliasDef.source] });
            }
        }
        if (reports.length)
            this.eventBus?.emit("term.ambiguity_detected", { reports });
        return reports;
    }
    getTerm(term) { return this.terms.get(term); }
    listTerms() { return Array.from(this.terms.values()); }
    proposeADR(title, context, decision) {
        const now = Date.now();
        const num = this.getNextADRNumber();
        const id = "ADR-" + num + "-" + this.slugify(title);
        const adr = { id, title, status: "proposed", context, decision, consequences: "", createdAt: now, updatedAt: now };
        this.adrs.set(id, adr);
        this.dirty = true;
        this.eventBus?.emit("adr.proposed", { adrId: id });
        return adr;
    }
    acceptADR(id) {
        const adr = this.adrs.get(id);
        if (!adr || adr.status !== "proposed")
            return;
        adr.status = "accepted";
        adr.updatedAt = Date.now();
        this.dirty = true;
        this.eventBus?.emit("adr.accepted", { adrId: id });
    }
    deprecateADR(id, supersededBy) {
        const adr = this.adrs.get(id);
        if (!adr || adr.status !== "accepted")
            return;
        adr.status = "deprecated";
        adr.supersededBy = supersededBy;
        adr.updatedAt = Date.now();
        this.dirty = true;
        this.eventBus?.emit("adr.deprecated", { adrId: id, supersededBy });
    }
    getADR(id) { return this.adrs.get(id); }
    listADRs() { return Array.from(this.adrs.values()); }
    generateContextMd() {
        const lines = ["# CONTEXT.md", "", "| Term | Definition | Examples | Aliases | Source |", "|------|------------|----------|---------|--------|"];
        for (const t of this.terms.values())
            lines.push("| " + t.term + " | " + t.definition + " | " + (t.examples.join("; ") || "-") + " | " + (t.aliases.join(", ") || "-") + " | " + t.source + " |");
        return lines.join("\n");
    }
    generateADRMarkdown(adr) {
        return "# " + adr.id + ": " + adr.title + "\n\n**Status**: " + adr.status + "\n\n## Context\n" + adr.context + "\n\n## Decision\n" + adr.decision;
    }
    async sync() {
        if (!this.dirty)
            return;
        this.ensureDir(dirname(this.contextMdPath));
        writeFileSync(this.contextMdPath, this.generateContextMd(), "utf-8");
        this.ensureDir(this.adrDir);
        for (const adr of this.adrs.values())
            writeFileSync(join(this.adrDir, adr.id + ".md"), this.generateADRMarkdown(adr), "utf-8");
        this.dirty = false;
    }
    loadFromFiles() { this.loadContextMd(); this.loadADRs(); }
    loadADRs() {
        if (!existsSync(this.adrDir))
            return;
        for (const file of readdirSync(this.adrDir)) {
            if (!file.endsWith(".md") || !file.startsWith("ADR-"))
                continue;
            const adr = this.parseADRMarkdown(readFileSync(join(this.adrDir, file), "utf-8"), file.replace(".md", ""));
            if (adr)
                this.adrs.set(adr.id, adr);
        }
    }
    parseContextMd(content) {
        const terms = new Map();
        for (const line of content.split("\n")) {
            if (line.startsWith("|") && !line.includes("Term") && !line.includes("------")) {
                const parts = line.split("|").map(p => p.trim()).filter(Boolean);
                if (parts.length >= 5)
                    terms.set(parts[0], { term: parts[0], definition: parts[1], examples: parts[2] === "-" ? [] : parts[2].split("; "), aliases: parts[3] === "-" ? [] : parts[3].split(", "), lastUpdated: Date.now(), source: parts[4] || "user-defined" });
            }
        }
        return terms;
    }
    parseADRMarkdown(content, id) {
        const titleMatch = /^# ADR-\d+: (.+)$/m.exec(content);
        const statusMatch = /\*\*Status\*\*:\s*(\w+)/.exec(content);
        return { id, title: titleMatch?.[1] ?? "Untitled", status: statusMatch?.[1] ?? "proposed", context: "", decision: "", consequences: "", createdAt: Date.now(), updatedAt: Date.now() };
    }
    getNextADRNumber() { let max = 0; for (const adr of this.adrs.values()) {
        const m = /^ADR-(\d+)/.exec(adr.id);
        if (m)
            max = Math.max(max, parseInt(m[1], 10));
    } return max + 1; }
    slugify(title) { return title.toLowerCase().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-").slice(0, 50); }
    ensureDir(path) { if (!existsSync(path))
        mkdirSync(path, { recursive: true }); }
}
export function createUbiquitousLanguageManager(projectDir, eventBus) { return new UbiquitousLanguageManager(projectDir, eventBus); }
//# sourceMappingURL=UbiquitousLanguageManager.js.map