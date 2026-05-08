export interface DiagnosticResult {
    name: string;
    status: 'ok' | 'warn' | 'fail';
    message: string;
    fix?: string;
}
export interface DoctorReport {
    overall: 'healthy' | 'degraded' | 'broken';
    checks: DiagnosticResult[];
    timestamp: number;
}
export declare class Doctor {
    private projectDir;
    private scaleDir;
    constructor(projectDir?: string, scaleDir?: string);
    diagnose(): Promise<DoctorReport>;
    private checkScaleDir;
    private checkEventsDir;
    private checkArtifactsDir;
    private checkSettingsJson;
    private checkKnowledgeDoc;
    private checkRulesDir;
    private checkHooksDir;
    private checkNodeVersion;
    private checkDiskUsage;
    private checkGitignore;
    formatReport(report: DoctorReport): string;
}
