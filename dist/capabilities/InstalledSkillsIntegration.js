// SCALE Engine — Installed Skills Integration v0.9.0
import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { homedir } from 'node:os';
export const SKILLS_DIR = join(homedir(), '.claude', 'skills');
export const AGENTS_SKILLS_DIR = join(homedir(), '.agents', 'skills');
export class InstalledSkillsInvoker {
    async webAccessTargets() {
        return this.runCommand('curl -s http://localhost:3456/targets', 5000, 'web-access');
    }
    async webAccessNewTab(url) {
        return this.runCommand('curl -s "http://localhost:3456/new?url=' + encodeURIComponent(url) + '"', 30000, 'web-access');
    }
    async webAccessEval(targetId, js) {
        return this.runCommand('curl -s -X POST "http://localhost:3456/eval?target=' + targetId + '" -d "' + js + '"', 10000, 'web-access');
    }
    async webAccessClick(targetId, sel) {
        return this.runCommand('curl -s -X POST "http://localhost:3456/click?target=' + targetId + '" -d "' + sel + '"', 10000, 'web-access');
    }
    async webAccessClose(targetId) {
        return this.runCommand('curl -s "http://localhost:3456/close?target=' + targetId + '"', 5000, 'web-access');
    }
    async playwrightOpen(url) {
        const pw = join(AGENTS_SKILLS_DIR, 'playwright', 'scripts', 'playwright_cli.sh');
        return this.runCommand('"' + pw + '" open "' + url + '"', 30000, 'playwright');
    }
    async playwrightSnapshot() {
        const pw = join(AGENTS_SKILLS_DIR, 'playwright', 'scripts', 'playwright_cli.sh');
        return this.runCommand('"' + pw + '" snapshot', 10000, 'playwright');
    }
    async playwrightClick(ref) {
        const pw = join(AGENTS_SKILLS_DIR, 'playwright', 'scripts', 'playwright_cli.sh');
        return this.runCommand('"' + pw + '" click ' + ref, 10000, 'playwright');
    }
    async cuaMouseMove(x, y) {
        return this.runCommand('npx @anthropic/mcp-cua mouseMove ' + x + ' ' + y, 10000, 'cua');
    }
    async cuaScreenshot() {
        return this.runCommand('npx @anthropic/mcp-cua screenshot', 10000, 'cua');
    }
    async graphifyBuild(dir) {
        return this.runCommand('graphify "' + dir + '"', 60000, 'graphify');
    }
    runCommand(cmd, timeout, skillId) {
        const start = Date.now();
        return new Promise((resolve) => {
            const proc = spawn('sh', ['-c', cmd], { timeout });
            let stdout = '', stderr = '';
            proc.stdout.on('data', d => stdout += d);
            proc.stderr.on('data', d => stderr += d);
            proc.on('close', code => resolve({ success: code === 0, output: stdout, error: stderr, durationMs: Date.now() - start, skillId }));
            proc.on('error', e => resolve({ success: false, error: e.message, durationMs: Date.now() - start, skillId }));
        });
    }
}
export const skillsInvoker = new InstalledSkillsInvoker();
//# sourceMappingURL=InstalledSkillsIntegration.js.map