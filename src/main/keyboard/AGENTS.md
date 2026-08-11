# src/main/keyboard/

## Purpose

Global keyboard shortcut registration and action routing. Registers Electron global shortcuts from settings and forwards actions to the renderer process.

## Ownership

Owned by the Electron main process domain. All keyboard shortcut logic lives here.

## Local Contracts

- **KeyboardShortcutManager** (`keyboard-shortcut-manager.ts`): Registers global shortcuts from settings. Forwards actions to renderer (navigate, pip-toggle, shortcut). Supports update and unregister operations.

## Work Guidance

- Shortcuts are registered using Electron's globalShortcut API
- Shortcut bindings are read from settings
- Actions are forwarded to renderer windows via IPC
- Shortcuts are updated when settings change
- All shortcuts are unregistered on app quit

## Verification

- `pnpm build:ts` must compile cleanly
- Registered shortcuts must trigger renderer actions

## Child DOX Index

No child docs needed. This directory is a single cohesive domain.
