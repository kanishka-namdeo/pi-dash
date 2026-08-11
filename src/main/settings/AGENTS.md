# src/main/settings/

## Purpose

Application settings management. Provides a typed schema for all app settings, electron-store persistence, and export/import functionality for backup and recovery.

## Ownership

Owned by the Electron main process domain. All settings-related logic lives here.

## Local Contracts

- **SettingsService** (`settings-service.ts`): electron-store wrapper for app settings. Provides get, set, getAll, reset, export, and import operations using the schema from settings-types.ts.
- **SettingsSchema** (`settings-types.ts`): Typed schema covering 8 categories: general, notifications, keyboard, search, terminal, worktrees, advanced, ignoredDrifts.

### IPC Handlers

Settings IPC handlers are registered in `src/main/ipc/settings-handlers.ts`:
- `settings:getAll` — Get all settings
- `settings:set` — Set a single setting value
- `settings:reset` — Reset all settings to defaults
- `settings:export` — Export settings to JSON file
- `settings:import` — Import settings from JSON file

## Work Guidance

- Settings use electron-store for persistence
- Schema validation is enforced on set operations
- Export produces a timestamped JSON backup file
- Import validates the imported structure against the current schema
- Settings changes are propagated to the renderer via the preload bridge

## Verification

- `pnpm build:ts` must compile cleanly
- Settings get/set/reset must work without errors
- Export/import must produce valid JSON files

## Child DOX Index

No child docs needed. This directory is a single cohesive domain.
