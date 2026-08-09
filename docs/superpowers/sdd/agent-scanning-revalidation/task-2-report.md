# Task 2: Add find-agent-in-path IPC Handler

## Status
**DONE**

## Commits Created
- `1dedae46` — feat: add find-agent-in-path IPC handler
- `064a4405` — fix: restore getOnboardingStatus alongside findAgentInPath

## Changes Made

### 1. src/main/agent-scanner.ts
- Exported the existing `findInPath` function (changed from `async function` to `export async function`)
- This function takes a binary name and returns the full path or null

### 2. src/main/ipc-handlers.ts
- Added `findInPath` to the import from `./agent-scanner`
- Registered new IPC handler `'find-agent-in-path'` inside `registerIpcHandlers()`
- Handler returns `{ found: boolean, path?: string }` matching the expected interface

### 3. src/preload.ts
- Added `findAgentInPath: (binary: string) => ipcRenderer.invoke('find-agent-in-path', binary)` to the exposed API
- Placed after `getOnboardingStatus` in the agent management section

### 4. renderer/src/types/global.d.ts
- Added type declaration: `findAgentInPath: (binary: string) => Promise<{ found: boolean; path?: string }>;`
- Placed after `getOnboardingStatus` in the Window['api'] interface

## Test Summary
- TypeScript compilation: ✅ PASSED (no errors)
- No runtime tests executed (as instructed — this is IPC plumbing only)

## Implementation Notes
- Followed existing IPC handler pattern exactly (same structure as `validate-agent`, `identify-agent`, etc.)
- Handler uses direct import of `findInPath` rather than dynamic import (simpler, consistent with other handlers in the file)
- Return shape matches Task 1's type definitions for agent validation
- Ready for consumption by Task 3 (useAgentScanner hook)

## Concerns
None. Implementation is straightforward IPC plumbing with no edge cases.

## Fix Applied
**Commit:** `064a4405` — fix: restore getOnboardingStatus alongside findAgentInPath

**Issue:** Initial implementation accidentally replaced `getOnboardingStatus` with `findAgentInPath` in both `src/preload.ts` and `renderer/src/types/global.d.ts`, breaking the app startup which calls `window.api.getOnboardingStatus()`.

**Resolution:** Restored `getOnboardingStatus` in both files while keeping `findAgentInPath` added alongside it. Both methods now exist in the API object as intended.

**Files Modified in Fix:**
- `src/preload.ts` — restored `getOnboardingStatus: () => ipcRenderer.invoke('get-onboarding-status')`
- `renderer/src/types/global.d.ts` — restored `getOnboardingStatus: () => Promise<boolean>`

**Final State:** Both `getOnboardingStatus` and `findAgentInPath` now coexist in the API, maintaining backward compatibility while adding the new functionality.
