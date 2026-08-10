# Task 5 Re-review: Fix for Project-Scoped Agents Not Saved

## Fix Verification: NOT ADDRESSED

The critical bug is **NOT FIXED**. The fix introduces a stale-closure bug that prevents project-scoped agents from being saved.

### Root Cause

In `SelectAgentsScreen.tsx`, both handlers have this pattern:

```typescript
const handleAddToGlobal = (agentsToAdd: AgentConfig[]) => {
  setAgentScopeChoice('global');           // Schedules React state update
  setShowScopeDialog(false);
  completeWithScopedAgents(onComplete);    // Reads state immediately
};
```

**The problem:**
1. `setAgentScopeChoice('global')` calls `setState()` which schedules an asynchronous state update
2. `completeWithScopedAgents(onComplete)` is called immediately in the same synchronous execution
3. React batches state updates, so the state update from step 1 is NOT committed yet
4. `completeWithScopedAgents` reads `state.agentScopeChoice` from its closure, which still has the OLD value (null or previous choice)
5. Both `projectAgents` and `globalAgents` resolve to `[]` because the scope choice doesn't match 'project' or 'global'

### Evidence

In `useProjectSetupState.ts:78-80`:
```typescript
const completeWithScopedAgents = useCallback(async (onComplete?: () => void) => {
  const projectAgents = state.agentScopeChoice === 'project' ? state.pendingAgents : [];
  const globalAgents = state.agentScopeChoice === 'global' ? state.pendingAgents : [];
  // ...
}, [state, navigate]);
```

The function captures `state` in its closure. When called immediately after `setAgentScopeChoice()`, it reads the stale state.

### Why Tests Pass

The tests in `useProjectSetupState.test.ts` call `setAgentScopeChoice()` and `completeWithScopedAgents()` in **separate `act()` blocks**:

```typescript
act(() => {
  result.current.setAgentScopeChoice('project');
});

await act(async () => {
  await result.current.completeWithScopedAgents(onComplete);
});
```

This allows the state update to commit between calls. The real handlers call both functions in the same synchronous execution, which the tests don't simulate.

### Additional Issue

The `agentsToAdd` parameter in both handlers is now unused. The handlers receive the agent list from `AgentScopeDialog` but don't use it, relying entirely on `state.pendingAgents` instead.

## New Breakage

**Critical regression:** Project-scoped agents are still not saved. The bug manifests differently (stale closure instead of hardcoded empty array) but the outcome is identical: `projectAgents: []` is passed to `addProject()`.

## Verdict: NEEDS_FIX

### Required Fix

The handlers must ensure `completeWithScopedAgents` sees the updated scope choice. Options:

1. **Pass scope as argument** (recommended):
   ```typescript
   const handleAddToGlobal = (agentsToAdd: AgentConfig[]) => {
     setAgentScopeChoice('global');
     setShowScopeDialog(false);
     completeWithScopedAgents('global', agentsToAdd, onComplete);
   };
   ```

2. **Use useEffect to trigger completion** after state updates:
   ```typescript
   useEffect(() => {
     if (shouldComplete && agentScopeChoice) {
       completeWithScopedAgents(onComplete);
       setShouldComplete(false);
     }
   }, [agentScopeChoice, shouldComplete]);
   ```

3. **Use ref for scope choice** instead of state to avoid closure issues.

Option 1 is cleanest and most explicit.

## Summary

The fix attempts to address the original bug by routing both handlers through `completeWithScopedAgents()`, but introduces a React state timing bug that produces the same outcome: project-scoped agents are never saved. The fix requires rework to ensure the scope choice is visible to the completion function.
