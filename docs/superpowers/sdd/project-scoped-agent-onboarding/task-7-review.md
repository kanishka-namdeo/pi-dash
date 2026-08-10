# Task 7 Review: Add Copy Agents from Project

## Spec Compliance

✅ **Copies selectedAgents by reference** — Line 110: `selectedAgents: source.selectedAgents || []` correctly copies the array of IDs.

✅ **Copies projectAgents with NEW IDs** — Lines 104-107: Maps over `source.projectAgents` and generates new IDs using `crypto.randomUUID()`.

✅ **Uses crypto.randomUUID()** — Confirmed in line 106.

✅ **Shows UI to select source project** — DropdownMenu (lines 191-214) displays all projects except the active project, with empty state handling.

✅ **Uses existing IPC handlers** — Uses `window.api.getProjects()` and `window.api.updateProject()` as required.

✅ **TypeScript clean** — Uses `Partial<Project>` which matches the `updateProject` signature.

## Task Quality

**Not Approved** — Critical issue found.

## Findings

### Critical

**1. Active project state not updated after copy**

After `handleCopyAgents` successfully copies agents via `updateProject()`, the `activeProject` state in the parent `Dashboard` component is not updated. The user sees a success toast, but the UI (FleetPanel, available agents, etc.) continues to show the old project data until they manually refresh or switch projects.

**Impact:** User copies agents, sees success message, but doesn't see the copied agents in the UI. Confusing UX that makes the feature appear broken.

**Comparison:** `ConfigureAgentsDialog`'s `onSaved` callback (Dashboard.tsx:300-305) correctly updates both backend and local state:
```typescript
await window.api.updateProject(activeProject.path, { selectedAgents });
setActiveProject({ ...activeProject, selectedAgents });
refreshAgents();
```

**Fix:** Add a callback prop to `TopBar` (e.g., `onProjectUpdated`) that Dashboard can use to update `activeProject` state after a successful copy. Alternatively, modify `onProjectChange` to handle same-project updates, or add a dedicated `onAgentsCopied` callback.

**Location:** `renderer/src/components/dashboard/Topbar.tsx:99-115`

### Important

**2. No error handling in handleCopyAgents**

The `handleCopyAgents` function is async but lacks try/catch. If `updateProject()` throws (e.g., PROJECT_NOT_FOUND, file system error), the error is unhandled and the user receives no feedback.

**Comparison:** `ConfigureAgentsDialog`'s `promoteToGlobal` (line 47-57) wraps async operations in try/catch with error toast.

**Fix:** Add try/catch with error toast:
```typescript
try {
  await window.api.updateProject(activeProject.path, { ... });
  toast.success(`Agents copied from ${source.name}`);
  // Call onProjectUpdated callback here
} catch {
  toast.error('Failed to copy agents. Try again.');
}
```

**Location:** `renderer/src/components/dashboard/Topbar.tsx:99-115`

### Minor

**3. Projects state loaded once on mount**

The `projects` state (line 93) is fetched once when TopBar mounts. While this is acceptable for the dropdown list (projects don't change during a copy operation), it means the dropdown shows stale data if projects are added/removed elsewhere. Not a current issue but worth noting for future enhancements.

**Location:** `renderer/src/components/dashboard/Topbar.tsx:93-97`

## Verdict

**NEEDS_FIX**

The critical issue (state not updated after copy) makes the feature appear broken to users. The important issue (no error handling) violates the codebase's error handling patterns. Both must be addressed before merge.

## Recommended Fix

1. Add `onProjectUpdated?: (project: Project) => void` prop to `TopBar`
2. In `handleCopyAgents`, after successful `updateProject`, construct the updated project object and call `onProjectUpdated`
3. In `Dashboard`, pass a callback that calls `setActiveProject` and `refreshAgents()`
4. Wrap `handleCopyAgents` in try/catch with error toast

This mirrors the pattern used by `ConfigureAgentsDialog` and ensures consistency.
