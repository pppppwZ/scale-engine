# Platform Adapters

SCALE Engine runs on Ubuntu, Windows, and Docker. Platform-specific adaptations are tracked here.

## Windows (win32)

### Path Resolution
- `SkillDiscovery.ts` — `PLATFORM_SKILLS_DIRS` uses `path.join(homedir(), ...)` producing absolute paths. `GLOBAL_PLATFORMS` array ensures these are used directly instead of re-joining with `projectDir`.
- All adapters (`ClaudeCodeAdapter`, `CodexAdapter`, etc.) use relative paths with `join(projectDir, ...)` — no issue.

### Process Spawning
- `SkillExecutor.ts:runCommand()` — `spawn("sh", ["-c", cmd])` fails on Windows. Fixed: checks `platform() === "win32"` → uses `spawn("cmd", ["/c", cmd])`.
- `cli.ts` and `phaseCommands.ts` use `spawn(cmd, [], { shell: true })` — `shell: true` auto-selects `cmd.exe` on Windows. No fix needed.

### Hook Script Generation
- `EvolutionEngine.ts:generate()` — was hardcoded to generate `#!/bin/bash` `.sh` scripts. Fixed: generates `.js` Node scripts on Windows, `.sh` bash scripts on Linux.
- `doctor.ts:checkHooksDir()` — was scanning only `.sh` files. Fixed: also scans `.js` and `.cmd`.

### Known Issues
- `better-sqlite3` native module requires compilation on Windows: `npm rebuild better-sqlite3`
- `scale` CLI not in global PATH — use full path or add to PATH manually

## Ubuntu / macOS / Docker

No platform-specific adaptations needed. All features work out of the box.

## Testing Checklist

When making changes that touch filesystem or process APIs:

- [ ] `path.join` with absolute paths — use `isAbsolute()` or `GLOBAL_PLATFORMS` check
- [ ] `spawn` / `exec` — test with `platform() === "win32"` branch
- [ ] File extensions — `.sh` on Linux, `.js`/`.cmd` on Windows
- [ ] Shell commands — `sh -c` on Linux, `cmd /c` on Windows, or use `shell: true`
- [ ] `better-sqlite3` — rebuild after Node version changes
