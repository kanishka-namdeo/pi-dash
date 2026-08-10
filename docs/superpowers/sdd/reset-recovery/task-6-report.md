# Task 6: Wire Reset & Recovery Tab into Settings

## Status: DONE

## Commit
`70e8d27e` — "feat: add Reset & Recovery tab to Settings"

## Files Modified
1. `renderer/src/components/settings/SettingsSidebar.tsx` — Added `ShieldAlert` to lucide-react imports; added `{ id: 'reset', label: 'Reset & Recovery', icon: ShieldAlert }` to `navItems` array.
2. `renderer/src/components/settings/SettingsScreen.tsx` — Added `import { ResetRecoverySettings } from './ResetRecoverySettings'`; added `<Route path="/reset" element={<ResetRecoverySettings />} />` inside `<Routes>`.

## Concerns
None. TypeScript check confirms no new errors introduced (all pre-existing errors are in unrelated files).
