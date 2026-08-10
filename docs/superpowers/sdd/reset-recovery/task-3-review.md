# Task 3 Review: Add IPC Handlers for Reset/Export/Import

## Spec Compliance

✅ **All 5 IPC handlers added**: export-config, import-config, reset-agents, reset-projects, full-reset
✅ **Export uses native dialog**: `dialog.showSaveDialog` with JSON filter and timestamped filename
✅ **Import uses native dialog**: `dialog.showOpenDialog` with JSON filter
✅ **Import validates structure**: version, agents.agents array, projects array, onboardingCompleted boolean
✅ **full-reset calls resetOnboarding()**: Confirmed in implementation
✅ **Preload API methods added**: All 5 methods exposed via contextBridge
✅ **Type declarations added**: global.d.ts updated with correct signatures
✅ **ExportedConfig re-exported**: renderer/src/types/index.ts re-exports from shared types
✅ **TypeScript clean**: Modified files compile without errors (pre-existing test errors unrelated)

## Task Quality: Not Approved

### Critical Issues

None

### Important Issues

**1. Import does not restore onboardingCompleted flag**

The import handler validates `config.agents.onboardingCompleted` but never applies it to the store. The `saveAgents()` function only updates the `agents` array and `lastScan` timestamp, preserving the current store's `onboardingCompleted` value.

**Impact**: After importing a config where `onboardingCompleted: true`, the user's onboarding status remains unchanged. If they hadn't completed onboarding before import, they'll still need to complete it even though the imported config indicates they should have. This breaks the backup/restore use case.

**Location**: `src/main/ipc-handlers.ts:87-88`

**Current code**:
```typescript
await saveAgents(config.agents.agents);
const projectsPath = path.join(app.getPath('userData'), 'projects.json');
```

**Suggested fix**:
```typescript
await saveAgents(config.agents.agents);
// Restore onboarding status from imported config
if (config.agents.onboardingCompleted) {
  await completeOnboarding();
}
const projectsPath = path.join(app.getPath('userData'), 'projects.json');
```

Note: This only handles the case where imported config has `onboardingCompleted: true`. If the imported config has `onboardingCompleted: false` but the current store has it as `true`, there's no way to reset it without calling `resetOnboarding()`. However, since import is typically used to restore a backup, the common case is restoring a completed onboarding state.

**Alternative**: Modify `saveAgents()` to accept an optional `AgentsStore` parameter and restore all fields, or add a new `restoreAgentsStore()` function that writes the entire store.

### Minor Issues

None

## Verification

- ✅ Export handler correctly loads agents and projects, creates ExportedConfig, writes to file
- ✅ Import handler validates all required fields before applying changes
- ✅ Reset handlers correctly clear data structures
- ✅ Full reset clears both agents and projects, then resets onboarding
- ✅ Error handling throws descriptive errors (INVALID_JSON, INCOMPATIBLE_VERSION, etc.)
- ✅ Return values match spec ({ success: boolean } or { success: boolean, config })
- ✅ No data-loss risks in reset operations (they're intentionally destructive)
- ✅ Native dialogs used throughout (no Blob download pattern)

## Verdict

**NEEDS_FIX**

The import handler has an important bug: it validates the `onboardingCompleted` flag but doesn't restore it. This breaks the backup/restore use case where users expect their full configuration (including onboarding state) to be restored.

The fix is straightforward: after calling `saveAgents()`, check if the imported config has `onboardingCompleted: true` and call `completeOnboarding()` if so. For the reverse case (importing a config with `onboardingCompleted: false` when current is `true`), consider whether that's a supported scenario or document the limitation.

Once this is fixed, the task can be approved.
