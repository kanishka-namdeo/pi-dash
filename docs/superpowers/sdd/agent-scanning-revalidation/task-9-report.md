# Task 9: Integrate useAgentScanner into AgentsSettings

## Status: DONE

## Commit Hash
`e1c7482fc1c42eede568577a999e164c26b22094`

## Files Modified
- `renderer/src/components/settings/AgentsSettings.tsx`

## Changes Made

### 1. Added useAgentScanner hook imports
- Imported `useAgentScanner` from `../../hooks/useAgentScanner`
- Added `RefreshCw` and `Search` icons from `lucide-react`

### 2. Integrated two useAgentScanner instances
- **Revalidation hook**: `useAgentScanner({ mode: 'revalidate', existingAgents: agents })`
  - Returns `revalidate` function, `validationResult`, and `isValidating` state
- **Incremental scan hook**: `useAgentScanner({ mode: 'incremental', existingAgents: agents })`
  - Returns `incrementalScan` function and `isScanningForAgents` state

### 3. Added status indicator helper
- `getStatus(agentId)` function looks up validation status from `validationResult.validations`
- Returns `'valid'`, `'moved'`, `'missing'`, or `null`

### 4. Added status indicators to agent list
- Replaced static "Disconnected" badge with dynamic status indicators
- 🟢 for valid agents
- 🟡 for moved agents
- 🔴 for missing agents
- Falls back to "Disconnected" badge when no validation has been performed

### 5. Added action buttons
- **"Re-validate All" button**: Triggers revalidation of all configured agents
  - Shows spinning RefreshCw icon while validating
  - Disabled during validation
- **"Scan for Agents" button**: Triggers incremental scan for new agents
  - Shows Search icon
  - Disabled during scanning
- Both buttons only appear when agents list is not empty

## Verification

### TypeScript Compilation
- ✅ No errors in `AgentsSettings.tsx` or `useAgentScanner.ts`
- Pre-existing errors in other files are unrelated to this task

### Tests
- ✅ All 27 tests in `useAgentScanner.test.ts` pass
- No existing tests for `AgentsSettings.tsx` to update

## Implementation Notes

The integration follows the plan exactly:
1. Two separate hook instances with different modes
2. Status indicators update based on validation results
3. Buttons provide clear visual feedback during operations
4. UI remains responsive with disabled states during async operations

The incremental scan result is available but not automatically merged into the agents list, allowing users to review new agents before adding them (future enhancement if needed).

## Concerns
None. Implementation matches the plan specification.
