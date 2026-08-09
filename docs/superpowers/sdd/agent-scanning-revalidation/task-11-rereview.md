# Task 11 Re-review: DriftModal Data-Loss Fix

**Commit:** 409a1574 — `fix: prevent data loss in DriftModal action handlers`
**Files:** `DriftModal.tsx`, `DriftModal.test.tsx`
**Tests:** 9 passed (9) — includes 4 new handler-behavior tests

---

## Fix Verification: **ADDRESSED**

The original bug — `window.api.saveAgents([])` wiping all agents on Remove — is fully resolved. All three handlers now follow the correct fetch → transform → save pattern:

### 1. Remove handler (`handleRemove`)
- Fetches current agents via `window.api.getAgents()`
- Filters out the target agent by `id`
- Saves the filtered list — **all other agents preserved**

### 2. Update Path handler (`handleUpdatePath`)
- Fetches current agents
- Maps over the list, replacing only the matching agent's `path` with `newPath`
- Saves the updated list — **all other agents preserved**

### 3. Add handler (`handleAdd`)
- Fetches current agents
- Duplicate guard: `if (!currentAgents.some(a => a.id === agent.id))` prevents re-adding
- Appends the new agent to the existing list
- Saves the merged list — **all other agents preserved**

### 4. No data-loss bugs remain
Every handler reads the current state before mutating. No handler passes a hardcoded empty list or a partial list that would drop unrelated agents.

---

## New Breakage: **None**

- All three handlers use the same consistent async pattern (fetch → transform → save).
- No race conditions introduced — each handler is sequential `await` and triggered by discrete button clicks.
- The `AgentConfig` type import is correctly added.
- Button `onClick` bindings correctly pass the expected arguments (`agent.id`, `v.agent.id` + `v.newPath!`, `agent`).
- The `v.newPath!` non-null assertion is safe here because moved agents always have a `newPath` by contract of the `DriftReport` type.
- The duplicate guard in `handleAdd` correctly prevents no-op saves when the agent already exists.
- Mock setup in tests correctly provides `getAgents` returning `mockResolvedValue([])` by default, with per-test overrides.

---

## Test Coverage

| Test | What it verifies |
|------|-----------------|
| `Remove button filters out the agent from current list` | Remove preserves other agents, drops only the target |
| `Update Path button updates the agent path in current list` | Update Path mutates only the target's path field |
| `Add button adds new agent to current list` | Add appends to existing agents |
| `Add button does not duplicate if agent already exists` | Duplicate guard prevents redundant save |

All 4 new tests use `waitFor` for async assertions and verify the exact `saveAgents` call arguments — strong coverage of the fix.

---

## Verdict: **APPROVED**

The critical data-loss bug is resolved. All three action handlers now correctly preserve existing agent data. Tests verify the exact save payloads. No new issues introduced.
