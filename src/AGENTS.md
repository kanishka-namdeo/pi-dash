# Electron Main Process

## Purpose

Electron main process entry point and preload script. Owns the application lifecycle, window management, and the secure bridge between Electron APIs and the renderer.

## Ownership

- Owned by the root project. These files are the Electron shell around the renderer.

## Local Contracts

- `main.ts` — Creates the BrowserWindow, handles app events, and loads the Vite-built renderer
- `preload.ts` — Exposes only the APIs the renderer needs via `contextBridge`; never expose `require` or Node built-ins directly

## Work Guidance

- Keep the main process minimal — the renderer owns all UI logic
- Do not add IPC channels unless the renderer has a demonstrated need
- The renderer loads from Vite dev server in development (`localhost:5173`) and from the packaged `dist/` in production

## Verification

- `pnpm start` must launch the Electron window without errors
- `pnpm build` must produce a runnable packaged app in `release/`

## Child DOX Index

- [main/github/AGENTS.md](http://main/github/AGENTS.md) — GitHub integration (auth, repos, issues, PRs, branches). All other `main/` subdirectories are owned by this doc.
