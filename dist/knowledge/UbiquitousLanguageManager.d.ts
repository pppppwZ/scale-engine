import type { IEventBus } from "../core/eventBus.js";
import type { TermDefinition, TermSource, ADRRecord, AmbiguityReport } from "../artifact/types.js";
export interface IUbiquitousLanguageManager {
    loadContextMd(): Map<string, TermDefinition>;
    updateTerm(term: string, definition: string, source: TermSource): void;
    removeTerm(term: string): void;
    detectAmbiguity(): AmbiguityReport[];
    proposeADR(title: string, context: string, decision: string): ADRRecord;
    acceptADR(id: string): void;
    deprecateADR(id: string, supersededBy: string): void;
    generateContextMd(): string;
    generateADRMarkdown(adr: ADRRecord): string;
    sync(): Promise<void>;
    getTerm(term: string): TermDefinition | undefined;
    getADR(id: string): ADRRecord | undefined;
    listTerms(): TermDefinition[];
    listADRs(): ADRRecord[];
}
export declare class UbiquitousLanguageManager implements IUbiquitousLanguageManager {
    private contextMdPath;
    private adrDir;
    private terms;
    private adrs;
    private eventBus;
    private dirty;
    constructor(projectDir: string, eventBus?: IEventBus, contextMdPath?: string, adrDir?: string);
    loadContextMd(): Map<string, TermDefinition>;
    updateTerm(term: string, definition: string, source: TermSource): void;
    removeTerm(term: string): void;
    detectAmbiguity(): AmbiguityReport[];
    getTerm(term: string): TermDefinition | undefined;
    listTerms(): TermDefinition[];
    proposeADR(title: string, context: string, decision: string): ADRRecord;
    acceptADR(id: string): void;
    deprecateADR(id: string, supersededBy: string): void;
    getADR(id: string): ADRRecord | undefined;
    listADRs(): ADRRecord[];
    generateContextMd(): string;
    generateADRMarkdown(adr: ADRRecord): string;
    sync(): Promise<void>;
    private loadFromFiles;
    private loadADRs;
    private parseContextMd;
    private parseADRMarkdown;
    private getNextADRNumber;
    private slugify;
    private ensureDir;
}
export declare function createUbiquitousLanguageManager(projectDir: string, eventBus?: IEventBus): IUbiquitousLanguageManager;
