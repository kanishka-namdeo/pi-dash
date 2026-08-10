# Task 4: Update useProjectSetupState for Scoped Agents

## Status: DONE

## Commit
`1546e12e` — `feat: add scoped agent support to useProjectSetupState`

## Files Modified
- `renderer/src/hooks/useProjectSetupState.ts` — added `setPendingAgents`, `setAgentScopeChoice`, `completeWithScopedAgents` actions; imported `Project` and `AgentConfig` types; used `unknown` instead of `any` for error handling
- `renderer/src/hooks/__tests__/useProjectSetupState.test.ts` — added `getAgents`/`saveAgents` mocks; added 3 tests for `completeWithScopedAgents`

## Changes

### New state fields (already present from Task 1)
- `pendingAgents: []`
- `agentScopeChoice: null`

### New actions
- `setPendingAgents(agents: AgentConfig[])` — sets agents pending scope decision
- `setAgentScopeChoice(choice: 'global' | 'project' | null)` — sets user's scope choice
- `completeWithScopedAgents(onComplete?)` — saves project with scoped agents:
  - If scope is `'project'`: agents go into `project.projectAgents`
  - If scope is `'global'`: agents are appended to global store via `saveAgents`, project gets empty `projectAgents`
  - Handles `PROJECT_ALREADY_EXISTS` error by navigating to `project-already-added`
  - Re-throws other errors

### Test summary
All 11 tests pass (8 existing + 3 new):
- `completeWithScopedAgents > saves project agents separately when scope is project` — verifies agents go to `projectAgents`, `saveAgents` not called, `onComplete` called
- `completeWithScopedAgents > saves global agents via saveAgents when scope is global` — verifies agents saved globally, project gets empty `projectAgents`
- `completeWithScopedAgents > navigates to project-already-added on duplicate error` — verifies error handling

## Concerns
None.
