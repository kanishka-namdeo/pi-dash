# Task 10: Add Background Scan to App.tsx

## Status: DONE

## Commit
`194d3763` — "feat: add background drift detection on app start"

## Files Modified
- `renderer/src/App.tsx` — added background drift detection

## Changes
1. Added imports for `toast` (sonner), `useAgents`, and `useAgentScanner`
2. Added `useAgents()` hook call to load existing agents
3. Added `useAgentScanner` with `mode: 'background'` and `existingAgents: agents`
4. Added `useEffect` to trigger background scan when agents finish loading (guarded by `!agentsLoading && window.api`)
5. Added `useEffect` to show a sonner toast when drift is detected, with a "Review" action button (placeholder `console.log` — DriftModal wiring comes in Task 12)

## Design Decisions
- Did NOT use `autoStart: true` from the plan because it fires on mount before agents are loaded (empty `[]` deps), which would produce false-positive "new agent" toasts. Instead, the scan is triggered manually via a `useEffect` that waits for `agentsLoading` to become `false`.
- The `useAgents` hook is called unconditionally at the top of `App()` (before early returns) to satisfy rules of hooks. The background scan `useEffect` also runs unconditionally but guards on `!agentsLoading && window.api`.

## Verification
- TypeScript: no new errors in App.tsx (pre-existing errors in other files are unrelated)
- `useAgentScanner.test.ts`: all 27 tests pass
- `App.test.tsx`: fails due to pre-existing missing `PRDetailView` file (not caused by this change)
