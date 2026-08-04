# Renderer — React Application

## Purpose

React 19 + TypeScript renderer for the Pi Dashboard Electron app. Implements the agent orchestration UI with live simulation, activity feed, and plan tracking.

## Ownership

- Owned by the renderer domain. All UI, state management, and rendering logic lives here.
- Entry point: `renderer/src/main.tsx` mounting `App.tsx`.

## Local Contracts

- **Dark theme**: `#0a0a0a` background, `#1a1a1a` cards, `#2a2a2a` borders
- **Fonts**: Geist (UI), JetBrains Mono (numbers/code)
- **State architecture**: Hooks own all state and simulation logic; components are pure render functions receiving data via props
- **Styling**: Tailwind CSS v4 with shadcn/ui component primitives (`components/ui/`)
- **Icons**: lucide-react

## Work Guidance

### Directory layout

- `types/` — Shared TypeScript interfaces (`Agent`, `Activity`, `PlanStep`, `Mode`)
- `data/` — Mock/seed data for simulation
- `hooks/` — All stateful logic (`useAgentSimulation`, `useActivityFeed`, `useDashboardMode`, `useElapsedTimer`)
- `components/dashboard/` — Dashboard-specific components (`Dashboard`, `Topbar`, `FleetPanel`, `AgentCard`, `PlanPanel`, `ActivityFeed`, `MetricsFooter`, `AgentDetailPanel`)
- `components/ui/` — Reusable shadcn/ui primitives (`Button`, `Card`)
- `lib/` — Utility functions

### Key rules

- Do not put state logic in components — delegate to hooks
- Do not import Electron APIs from renderer code; use the preload bridge
- Keep components small and focused; extract when a component exceeds ~150 lines

## Verification

- TypeScript must compile cleanly: `pnpm build:ts`
- Vite build must succeed: `pnpm build:renderer`

## Child DOX Index

- No child `AGENTS.md` files are needed. All renderer subdirectories are owned by this doc.
