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
