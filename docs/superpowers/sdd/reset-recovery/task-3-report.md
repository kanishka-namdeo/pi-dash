# Sub-project C, Task 3: Add IPC Handlers for Reset/Export/Import

## Status
DONE

## Commit
`a6e2f1d1` — feat: add reset/export/import IPC handlers

## Files Modified
- `src/main/ipc-handlers.ts` — added 5 IPC handlers (export-config, import-config, reset-agents, reset-projects, full-reset) with imports for dialog, app, path, fs, ExportedConfig, resetOnboarding
- `src/preload.ts` — exposed 5 new API methods (exportConfig, importConfig, resetAgents, resetProjects, fullReset)
- `renderer/src/types/global.d.ts` — added type declarations for the 5 new API methods
- `renderer/src/types/index.ts` — re-exported ExportedConfig type from shared types

## Implementation Details
- Export uses native `dialog.showSaveDialog` with JSON filter and timestamped default filename
- Import uses native `dialog.showOpenDialog` with JSON filter and validates version, agents array, projects array, and onboardingCompleted flag
- Import throws descriptive errors: INVALID_JSON, INCOMPATIBLE_VERSION, INVALID_AGENTS, INVALID_PROJECTS, INVALID_ONBOARDING
- Reset agents clears agents array via saveAgents([])
- Reset projects writes empty projects array to projects.json
- Full reset clears both agents and projects, then calls resetOnboarding()
- All handlers return `{ success: boolean }` (import also returns config on success)

## Verification
- TypeScript compiles cleanly for modified files (pre-existing errors in unrelated test files remain)
- No circular dependency issues — type-only imports are erased at compile time
- Follows existing patterns in ipc-handlers.ts and preload.ts

---

## P1 Fix: Restore onboardingCompleted flag during import

**Commit:** `4af62b10` — fix: restore onboardingCompleted flag during import

**Issue:** The import handler validated `config.agents.onboardingCompleted` but never applied it to the store. The `saveAgents()` function only updates the agents array and lastScan timestamp, preserving the current store's onboardingCompleted value.

**Fix:** After calling `saveAgents()`, check if `config.agents.onboardingCompleted` is true and call `completeOnboarding()` if so. If it's false, call `resetOnboarding()`.

**File Modified:**
- `src/main/ipc-handlers.ts` — added onboarding state restoration logic in import-config handler

**Verification:**
- TypeScript compiles cleanly
- All 5 agent-store tests pass
- Uses statically imported `completeOnboarding` and `resetOnboarding` functions (no dynamic imports)
