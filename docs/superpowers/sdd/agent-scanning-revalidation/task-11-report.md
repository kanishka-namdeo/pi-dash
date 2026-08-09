# Task 11: Create DriftModal Component

## Status: DONE

## Commit Hash
`4dae6665`

## Files Created
- `renderer/src/components/dashboard/DriftModal.tsx` — DriftModal component
- `renderer/src/components/dashboard/DriftModal.test.tsx` — Integration tests

## Implementation Summary

Created a `DriftModal` component that displays agent configuration drift detected by the background scan. The modal:

- Accepts `open`, `onOpenChange`, and `drift` (DriftReport) props
- Shows three conditional sections based on drift contents:
  - **Missing agents** (⚠) — with "Remove" button per agent
  - **Moved agents** (🔄) — with "Update Path" button per agent, showing old → new path
  - **New agents** (✨) — with "Add" button per agent
- Uses existing `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogFooter` from `../ui/dialog`
- Uses existing `Button` from `../ui/button`
- Imports `DriftReport` type from `../../../src/shared/types`

## Test Summary

5 tests, all passing:

| Test | Description |
|------|-------------|
| shows missing agents section | Renders missing agent count and agent name |
| shows moved agents section | Renders moved agent count and agent name |
| shows new agents section | Renders new agent count and agent name |
| does not render content when closed | Dialog content hidden when `open=false` |
| shows all sections when all types present | All three sections render simultaneously |

## Concerns
None. Implementation follows the plan spec exactly. Pre-existing test failures in unrelated files (agent-git-bridge, worktree-service, auth-service, etc.) are not caused by this change.

---

## Fix: Data-Loss Prevention in Action Handlers

**Commit:** `409a1574`

**Issue:** The original Remove button called `window.api.saveAgents([])` which would wipe ALL agents — a critical data-loss bug. The Update Path and Add buttons had no handlers at all.

**Fix applied:**
- **Remove**: Fetches current agents via `getAgents()`, filters out the removed agent, saves the filtered list
- **Update Path**: Fetches current agents, maps the moved agent to its new path, saves the updated list
- **Add**: Fetches current agents, appends the new agent (with duplicate guard), saves the merged list

**Tests added (4 new, 9 total):**

| Test | Description |
|------|-------------|
| Remove button filters out the agent | Verifies only the target agent is removed, others preserved |
| Update Path button updates path | Verifies path is updated in-place, other agents untouched |
| Add button adds new agent | Verifies new agent appended to existing list |
| Add button deduplicates | Verifies no save occurs if agent already exists |

All 9 tests pass.
