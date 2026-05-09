export declare const SKILLS_DIR: string;
export declare const AGENTS_SKILLS_DIR: string;
export interface SkillInvocationResult {
    success: boolean;
    output?: string;
    error?: string;
    durationMs: number;
    skillId: string;
}
export declare class InstalledSkillsInvoker {
    webAccessTargets(): Promise<SkillInvocationResult>;
    webAccessNewTab(url: string): Promise<SkillInvocationResult>;
    webAccessEval(targetId: string, js: string): Promise<SkillInvocationResult>;
    webAccessClick(targetId: string, sel: string): Promise<SkillInvocationResult>;
    webAccessClose(targetId: string): Promise<SkillInvocationResult>;
    playwrightOpen(url: string): Promise<SkillInvocationResult>;
    playwrightSnapshot(): Promise<SkillInvocationResult>;
    playwrightClick(ref: string): Promise<SkillInvocationResult>;
    cuaMouseMove(x: number, y: number): Promise<SkillInvocationResult>;
    cuaScreenshot(): Promise<SkillInvocationResult>;
    graphifyBuild(dir: string): Promise<SkillInvocationResult>;
    private runCommand;
}
export declare const skillsInvoker: InstalledSkillsInvoker;
