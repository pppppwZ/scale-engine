import type { GrillingQuestion } from "./GrillingSessionSkill.js";
export declare const REQUIREMENT_CLARITY_TREE: GrillingQuestion[];
export declare const DESIGN_DEPTH_TREE: GrillingQuestion[];
export declare const TECH_SELECTION_TREE: GrillingQuestion[];
export type GrillingTopic = "requirement-clarity" | "design-depth" | "tech-selection";
export declare const GRILLING_TEMPLATES: Record<GrillingTopic, GrillingQuestion[]>;
export declare function getGrillingTemplate(topic: GrillingTopic): GrillingQuestion[];
