# Sub-project C Task 3 Review Package

## Commits
```
a6e2f1d1 feat: add reset/export/import IPC handlers
```

## Diff Stat
```
 src/main/ipc-handlers.ts            | ~80 lines added
 src/preload.ts                      | ~10 lines added
 renderer/src/types/global.d.ts      | ~10 lines added
 renderer/src/types/index.ts         | ~5 lines added
 4 files modified
```

## Summary
Task 3 adds 5 IPC handlers for reset/export/import operations using native Electron dialogs.

## IPC Handlers Added
1. **export-config** — Uses `dialog.showSaveDialog`, writes ExportedConfig to file
2. **import-config** — Uses `dialog.showOpenDialog`, validates structure, restores agents and projects
3. **reset-agents** — Clears agents.json (empty array)
4. **reset-projects** — Clears projects.json (empty array)
5. **full-reset** — Clears both + calls resetOnboarding()

## Key Implementation Details
- Export uses native `dialog.showSaveDialog` (not Blob download)
- Import uses native `dialog.showOpenDialog` (not file input)
- Import validates: version, agents structure, projects array, onboardingCompleted type
- Import throws specific errors: INVALID_JSON, INCOMPATIBLE_VERSION, INVALID_AGENTS, INVALID_PROJECTS, INVALID_ONBOARDING
- All handlers return `{ success: boolean }` or `{ success: boolean, config?: any }`

## Files Modified
- `src/main/ipc-handlers.ts` (~80 lines added)
- `src/preload.ts` (~10 lines added)
- `renderer/src/types/global.d.ts` (~10 lines added)
- `renderer/src/types/index.ts` (~5 lines added)

## TypeScript
- Compiles cleanly for modified files
