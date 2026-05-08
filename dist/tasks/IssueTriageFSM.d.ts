import type { IEventBus } from "../core/eventBus.js";
import type { IssueRole, IssueState, IssueTriageTransition, IssueInput, TriageResult } from "../artifact/types.js";
export type { IssueRole, IssueState, IssueTriageTransition, TriageResult, IssueInput } from "../artifact/types.js";
export declare const ISSUE_TRIAGE_MACHINE: IssueTriageTransition[];
export interface IIssueTriageFSM {
    evaluate(input: IssueInput): TriageResult;
    canTransition(from: IssueState, to: IssueState): boolean;
    getTransitions(from: IssueState): IssueTriageTransition[];
    classifyRole(input: IssueInput): IssueRole;
    estimateComplexity(input: IssueInput): number;
    assessRisk(input: IssueInput): "low" | "medium" | "high";
}
export declare class IssueTriageFSM implements IIssueTriageFSM {
    private transitions;
    private eventBus;
    constructor(eventBus?: IEventBus);
    evaluate(input: IssueInput): TriageResult;
    canTransition(from: IssueState, to: IssueState): boolean;
    getTransitions(from: IssueState): IssueTriageTransition[];
    classifyRole(input: IssueInput): IssueRole;
    estimateComplexity(input: IssueInput): number;
    assessRisk(input: IssueInput): "low" | "medium" | "high";
    private checkInfoSufficiency;
    private isValidRequest;
}
export declare function createIssueTriageFSM(eventBus?: IEventBus): IIssueTriageFSM;
