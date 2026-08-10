# Sub-project C, Task 4: Create ResetAction Component

## Status
DONE

## Commit
`28144145` — feat: add ResetAction confirmation dialog component

## Files Created
- `renderer/src/components/settings/ResetAction.tsx` — reusable confirmation dialog component for reset actions
- `renderer/src/components/settings/ResetAction.test.tsx` — comprehensive test suite with 7 test cases

## Implementation Details
- Component accepts `title`, `description`, `impact`, `onConfirm`, and optional `requireText` props
- Renders a row with title/description on the left and a destructive button on the right
- Button opens a Dialog with impact preview and optional text confirmation
- Uses existing UI components: Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, Button, Input
- When `requireText` is provided, user must type the exact text to enable the confirm button
- Shows loading state ("Resetting...") during async onConfirm execution
- Clears input text when dialog closes (via cancel or successful confirm)
- Properly handles async onConfirm with try/finally to ensure loading state is cleared

## Test Summary
All 7 tests pass:
1. ✓ renders with title and description
2. ✓ opens dialog when button clicked
3. ✓ confirm button disabled until requireText matches
4. ✓ calls onConfirm when user confirms
5. ✓ dialog closes after successful confirm
6. ✓ shows loading state during confirmation
7. ✓ clears input when dialog closes

## Verification
- All tests pass (7/7)
- Uses existing UI components from the project's design system
- Follows established patterns from other dialog components (QuickScanModal, ConfigureAgentsDialog)
- TypeScript types are properly defined
- Component is ready for consumption by Task 5 (ResetRecoverySettings)
