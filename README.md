# PiDash — AI Agent Dashboard

An Electron desktop app for monitoring and managing your fleet of AI coding agents.

## Onboarding Flow

When you first launch PiDash, a 6-screen onboarding flow guides you through setting up your agents. The flow scans your system for installed AI coding agents, lets you validate and identify them, and saves your configuration before entering the main dashboard.

### Screens

| # | Screen | Purpose |
|---|--------|---------|
| 1 | **Welcome** | Introduction with "Start Scan" button |
| 2 | **Scanning** | Auto-scans filesystem for known agent binaries; shows real-time progress |
| 3 | **Results** | Lists detected agents with checkboxes for selection |
| 4 | **Manual Add** | Paste a binary path to manually add an agent (validates and identifies) |
| 5 | **No Agents** | Friendly fallback with popular agent download links and manual-add option |
| 6 | **Ready** | Review selected agents and complete setup; launches dashboard on save |

### Triggering Onboarding

Onboarding runs when no agents have been configured. To trigger it again:

- **Delete `agents.json`** (location varies by platform — check `src/main/agent-store.ts` for the path), or
- **Set `onboardingCompleted: false`** in `agents.json`

## Development

```bash
# Install dependencies
pnpm install

# Start dev server (TypeScript watch + Vite + Electron)
pnpm dev

# Run tests
pnpm test

# Type check
npx tsc --noEmit
npx tsc --noEmit --project tsconfig.app.json

# Production build
pnpm build
```

## Architecture

- **Main process** (`src/main.ts`, `src/main/`): Electron IPC handlers, agent scanning, filesystem store
- **Preload** (`src/preload.ts`): Bridges IPC to `window.api` for the renderer
- **Renderer** (`renderer/src/`): React + Vite UI with shadcn/ui components
- **Shared types** (`src/shared/types.ts`): Onboarding types used by both processes

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Onboarding won't start | Delete `agents.json` or set `onboardingCompleted: false` |
| "window.api is undefined" | Ensure preload script is loaded; check `contextIsolation` in Electron config |
| Scan finds no agents | Verify agents are in standard locations; use Manual Add for custom paths |
| Build fails | Run `pnpm install` to ensure all deps are present, then retry |
| Tests fail | Ensure `vitest` and `@testing-library/react` are installed |
