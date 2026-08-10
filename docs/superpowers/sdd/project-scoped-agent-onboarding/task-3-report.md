# Task 3: AgentScopeDialog Component

## Status
DONE

## Commit
f5066271

## Files Created
- `renderer/src/components/project-setup/AgentScopeDialog.tsx`
- `renderer/src/components/project-setup/AgentScopeDialog.test.tsx`

## Test Summary
7 tests, all passing:
1. Renders with agent list (verifies agent names and paths displayed)
2. Renders radio buttons for scope selection (2 radios)
3. Defaults to global scope selected
4. Allows switching to project scope
5. Calls onAddToGlobal when Continue clicked with global selected
6. Calls onAddToProject when Continue clicked with project selected
7. Calls onCancel when Cancel clicked

## Implementation Notes
- Uses existing `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogFooter` from `../ui/dialog`
- Uses existing `Button` from `../ui/button`
- Imports `AgentConfig` type from `../../../../src/shared/types`
- Two radio options: "Add to global config" (default) and "Use for this project only"
- `onOpenChange` on Dialog triggers `onCancel` when dismissed
- Component is ready for consumption by Task 5 (SelectAgentsScreen)
