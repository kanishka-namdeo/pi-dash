# Task 5: Update SelectAgentsScreen for New Agent Detection

## Status
DONE

## Commit Hash
33282d133afa95390f2c492e4777c994d75323a7

## Files Modified
- `renderer/src/components/project-setup/screens/SelectAgentsScreen.tsx`

## Changes Made
1. Added imports for `useState`, `useEffect`, `AgentScopeDialog`, `findNewAgents`, and `AgentConfig` type
2. Extended `ScreenProps` interface with `setPendingAgents`, `setAgentScopeChoice`, and `onComplete`
3. Added state for `globalAgents` and `showScopeDialog`
4. Added `useEffect` to load global agents on mount
5. Computed `scannedAgents` (selected agents as `AgentConfig[]`) and `newAgents` via `findNewAgents`
6. Replaced inline `complete()` call with `handleContinue` that checks for new agents and shows scope dialog
7. Added `handleAddToGlobal` handler that saves agents globally then completes
8. Added `handleAddToProject` handler that sets project scope then completes
9. Added "🆕" badge next to new agents in the list
10. Added `<AgentScopeDialog>` at the end of the component

## Verification
- TypeScript compilation: no errors in SelectAgentsScreen.tsx
- All pre-existing TypeScript errors are in unrelated files

## Concerns
None.


## Fix Applied
**Issue:** Both `handleAddToGlobal` and `handleAddToProject` called `complete(onComplete)`, which hardcodes `projectAgents: []`. This meant project-scoped agents were silently lost.

**Fix:** Replaced `complete(onComplete)` with `completeWithScopedAgents(onComplete)` in both handlers. Removed manual global-save logic from `handleAddToGlobal` since `completeWithScopedAgents` already handles it.

**Commit:** c110b146

**Updated handlers:**
- `handleAddToGlobal`: Sets scope to 'global', closes dialog, calls `completeWithScopedAgents`
- `handleAddToProject`: Sets scope to 'project', closes dialog, calls `completeWithScopedAgents`

**Verification:**
- TypeScript compilation: no errors
- agentScope utility tests: all pass (4/4)

## Fix 2: React State Batching
**Issue:** React batches state updates, so calling `setAgentScopeChoice()` then immediately `completeWithScopedAgents()` in the same synchronous execution meant `completeWithScopedAgents` read stale `agentScopeChoice` from its closure.

**Fix:** Modified `completeWithScopedAgents` in `useProjectSetupState.ts` to accept `scopeChoice` and `agents` as parameters instead of reading from state. Updated handlers in `SelectAgentsScreen.tsx` to pass these directly.

**Commit:** 4b75fe51

**Files modified:**
- `renderer/src/hooks/useProjectSetupState.ts` — updated `completeWithScopedAgents` signature
- `renderer/src/components/project-setup/screens/SelectAgentsScreen.tsx` — updated handlers
- `renderer/src/hooks/__tests__/useProjectSetupState.test.ts` — updated tests

**Verification:**
- TypeScript compilation: no errors
- agentScope utility tests: all pass (4/4)

## Fix 3: ScreenProps Type Annotation
**Issue:** The `ScreenProps` interface had a stale type annotation for `completeWithScopedAgents` that didn't match the updated function signature.

**Fix:** Updated the type annotation to `(scopeChoice: 'global' | 'project', agents: AgentConfig[], onComplete?: () => void) => void`.

**Commit:** 3a1402eb

**Verification:**
- TypeScript compilation: no errors