# Task 4 Review: Update useProjectSetupState for Scoped Agents

## Reviewer: SubBTask4Reviewer
## Date: 2026-08-10

---

## Spec Compliance: ✅ PASS

All Task 4 requirements are met:

- ✅ `setPendingAgents(agents)` added with correct signature
- ✅ `setAgentScopeChoice(choice)` added with correct signature  
- ✅ `completeWithScopedAgents(onComplete)` added with correct behavior
- ✅ Correctly handles global vs project scope:
  - Project scope: agents go to `project.projectAgents`
  - Global scope: agents appended to global store via `saveAgents`, project gets empty `projectAgents`
- ✅ Builds Project with both `selectedAgents` and `projectAgents`
- ✅ Handles `PROJECT_ALREADY_EXISTS` error by navigating to `project-already-added`
- ✅ All 11 tests passing (8 existing + 3 new)

---

## Task Quality: Approved

### Code Quality: ✅ Excellent

**Strengths:**
1. **Proper React patterns**: All new actions use `useCallback` with correct dependencies
2. **Type safety**: Uses `unknown` for error type instead of `any` (better than spec)
3. **Error handling**: Properly narrows error type with `instanceof Error` check
4. **Consistency**: Follows existing patterns from `complete()` function
5. **Defensive coding**: Uses `state.projectName || basename(state.projectPath!)` fallback for project name
6. **No over-engineering**: Minimal, focused implementation that does exactly what's needed

**Implementation Details:**
- `basename()` function already existed in file (not introduced by Task 4)
- Global agents are saved BEFORE building project (correct order - fail fast if save fails)
- Empty `pendingAgents` with null `agentScopeChoice` works correctly (no-op)
- Uses existing IPC handlers: `addProject`, `getAgents`, `saveAgents`, `isGitRepo`

### Test Coverage: ✅ Comprehensive

**New tests (3):**
1. ✅ `saves project agents separately when scope is project`
   - Verifies agents go to `projectAgents`
   - Verifies `saveAgents` NOT called
   - Verifies `onComplete` called

2. ✅ `saves global agents via saveAgents when scope is global`
   - Verifies agents saved globally via `saveAgents`
   - Verifies project gets empty `projectAgents`

3. ✅ `navigates to project-already-added on duplicate error`
   - Verifies error handling
   - Verifies navigation to correct screen
   - Verifies `onComplete` NOT called

**Test setup:**
- Added `getAgents` and `saveAgents` mocks to `beforeEach`
- All mocks properly cleared between tests

### Integration: ✅ Ready for Task 5

**IPC Integration:**
- Uses existing `addProject` handler (no new handlers needed)
- Uses existing `getAgents` and `saveAgents` handlers for global scope
- Correctly handles `PROJECT_ALREADY_EXISTS` error

**State Management:**
- `pendingAgents` and `agentScopeChoice` correctly added to state
- State fields initialized to `[]` and `null` respectively
- State updates use functional form (`prev => ...`) to avoid stale closures

**Type Safety:**
- Renderer types (`renderer/src/types/project-setup.ts`) include `pendingAgents` and `agentScopeChoice`
- Shared types (`src/shared/project-setup-types.ts`) correctly omit UI-only fields
- `Project` type includes `projectAgents: AgentConfig[]` in both locations

---

## Findings

### Critical: None

### Important: None

### Minor: None

**Observations (not issues):**

1. **Error handling improvement**: The new `completeWithScopedAgents()` re-throws non-`PROJECT_ALREADY_EXISTS` errors, while the existing `complete()` silently swallows them. This is actually BETTER behavior and matches the spec. The existing `complete()` function has a pre-existing bug (silent error swallowing) that should be fixed separately, but is out of scope for Task 4.

2. **Name fallback**: `completeWithScopedAgents()` uses `state.projectName || basename(state.projectPath!)` while `complete()` uses `state.projectName!`. The fallback is defensive coding and not a bug. Since `updateProject()` always sets `projectName`, both approaches work correctly.

3. **Shared types**: The shared types file (`src/shared/project-setup-types.ts`) does not include `pendingAgents` and `agentScopeChoice`. This is correct - those fields are UI-only state that don't cross the IPC boundary. Only `Project.projectAgents` needs to be in shared types.

---

## Verdict: APPROVED

Task 4 is complete, correct, and ready for Task 5.

**Summary:**
- All spec requirements met
- Clean, well-structured code
- Comprehensive test coverage
- No bugs or issues found
- Ready for integration with SelectAgentsScreen (Task 5)

**Next Steps:**
- Proceed to Task 5: Update SelectAgentsScreen for New Agent Detection
