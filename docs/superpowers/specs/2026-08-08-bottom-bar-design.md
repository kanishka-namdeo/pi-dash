# Bottom Bar Design Spec

**Date:** 2026-08-08  
**Status:** Approved for implementation  
**Design file:** `design/pidash-ui.pen` → "Bottom Bar Flow" frame

## Overview

A persistent bottom bar for PiDash that provides agent monitoring, workspace context, and key metrics at a glance. Inspired by VS Code's status bar, Orca's agent status glyphs, and Claude Code's telemetry strip.

## Design Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Purpose | Balanced: agent status + workspace context + metrics | User selected "both balanced" over agent-only or context-only |
| Height | 36px (medium density) | Comfortable single row with icons + labels + values |
| Layout | Left / Center / Right zones | Classic IDE pattern, clear ownership per zone |
| Interactivity | Highly interactive | Most items clickable — agent detail, branch picker, mode toggle, notifications |
| Center idle | Empty / minimal | Center only shows alerts or plan progress when active |

## Structure

```
┌─────────────────────────────────────────────────────────────────────────┐
│  [Left Zone]              [Center Zone]              [Right Zone]      │
│  flex-start               flex-grow                  flex-end          │
│  gap: 12px                (alerts only)              gap: 16px         │
│  padding: 0 16px                                   padding: 0 16px     │
└─────────────────────────────────────────────────────────────────────────┘
```

- **Height:** 36px
- **Background:** `$bg`
- **Top border:** 1px `$border`
- **Center zone:** Expands to fill remaining space

## Left Zone — Agent & Workspace Context

| Item | Visual | Interactive | Notes |
|---|---|---|---|
| **Active agent pill** | `[●] OMP` — status dot (8px) + agent name (13px, `$text-primary`) | Click → opens AgentDetailPanel | Dot color reflects state |
| **Branch** | `⎇ main` — git-branch icon (14px) + branch name (13px, `$text-secondary`) | Click → opens worktree/branch selector | Only when repo connected |
| **Repo** | `pi-dash` — repo name (13px, `$text-secondary`) | Click → navigates to GitHub integration | Only when repo connected |

**Separators:** `·` between items (4px padding each side).

**Empty state:** When no agents running and no repo connected, shows `π PiDash` in `$text-muted`.

### Status Dot Semantics

| State | Color | When |
|---|---|---|
| Running | `$accent-emerald` (#10b981) | Agent actively executing |
| Idle/Waiting | `$accent-amber` (#f59e0b) | Agent waiting for input or paused |
| Error | `$accent-rose` (#f43f5e) | Agent crashed or exited with error |
| Exited | `$text-muted` (#737373) | Agent process ended normally |

## Center Zone — Alerts & Status

**Default state:** Empty. A hairline divider (1px `$border`, 16px tall) appears between left and right zones when center is empty.

### Alert Types

| Alert | Visual | Behavior |
|---|---|---|
| **Rate limit warning** | `⚠ Claude: 80% used — resets in 2h 33m` — amber background tint | Appears at 80% usage. Click → usage detail. Dismissable. |
| **Agent error** | `● OMP exited unexpectedly` — red background tint | Agent crash/exit with error. Click → focus terminal. Dismissable. |
| **GitHub auth expired** | `⚠ GitHub session expired — re-authenticate` — amber tint | OAuth token expired. Click → GitHub settings. Dismissable. |
| **Plan progress** | `Step 3/5: Build API endpoints` — `$text-secondary`, no background | Active plan execution. Click → expand PlanPanel. Not dismissable. |

**Priority:** error > rate limit > auth > plan. Only highest-priority alert shows.

**Animations:**
- Alert appears: slide in from right, 200ms ease-out
- Alert dismissed: fade out, 150ms
- Plan completes: fade out, 300ms
- Divider: fades in/out with center state

## Right Zone — Metrics & Actions

| Item | Visual | Interactive | Notes |
|---|---|---|---|
| **Mode toggle** | `Auto ▾` — label (12px) + chevron (12px) | Click → dropdown: Auto/Supervised/Manual | Compact dropdown |
| **Elapsed** | `⏱ 12:34` — timer icon (14px) + time (12px mono) | Not clickable | Updates every second. `M:SS` < 1hr, `H:MM:SS` ≥ 1hr |
| **Agent count** | `3 ●` — count (12px mono) + dot (6px) | Click → focuses FleetPanel | Dot = worst state among all agents |
| **Command count** | `⚡ 142` — zap icon (14px) + count (12px mono) | Not clickable | `k` suffix over 999 |
| **Notifications** | `🔔 2` — bell icon (14px) + badge (12px mono) | Click → notification center | Badge only when count > 0 |
| **Settings** | `⚙` — gear icon (16px) | Click → Settings flow | Rightmost item |

**Spacing:** 16px between items. Separators (1px `$border`, 16px tall) between mode toggle and elapsed.

## Typography

- **Font:** `$font-ui` (Geist) for labels, `$font-mono` (Geist Mono) for numeric values
- **Labels:** 12px, `$text-secondary`
- **Values:** 12-13px, `$text-primary`
- **Agent name:** 13px, `font-weight: 500`

## Interactions

**Hover states:**
- Clickable items: background `$card` at 50% opacity, 4px radius
- Transition: 100ms ease-in

**Click targets:**
- Minimum 28px height for comfortable clicking
- Padding ensures touch-friendly targets

## Responsive Behavior

- Window < 800px: repo name hides first, then branch name
- Agent pill and metrics always visible
- Icons remain, labels hide progressively

## Design Variants

Four variants are defined in `design/pidash-ui.pen` → "Bottom Bar Flow":

1. **Default State** — Agent running, repo connected, no alerts. Center shows hairline divider.
2. **Alert State** — Rate limit warning in center zone. Divider hidden when alert active.
3. **Multi-Agent State** — Multiple agents with mixed states. Agent count shows worst state (amber). Plan progress in center.
4. **Empty State** — No agents, no repo. Left zone shows app name only. Center divider visible.

## Data Sources

| Data | Source | Notes |
|---|---|---|
| Active agent | `SessionContext.getActiveSessions()` | Most recently active session |
| Agent state | `SessionInfo.state` | running/idle/exited |
| Branch | `GitHubContext.branches` + active worktree | Requires GitHub integration |
| Repo | `GitHubContext.activeRepo` | Requires GitHub integration |
| Mode | `useDashboardMode()` | auto/supervised/manual |
| Elapsed | Computed from session start times | Updates every second |
| Agent count | `SessionContext.sessions.size` | Total sessions |
| Command count | Sum of `SessionInfo.commandHistory.length` | Across all sessions |
| Notifications | Notification center state | Badge count |

## Implementation Notes

- Replace existing `MetricsFooter` component with new `BottomBar` component
- Bottom bar is persistent across all views (Dashboard, Terminal, Settings, etc.)
- Alert queue managed by a new `useBottomBarAlerts()` hook
- Mode toggle dropdown reuses existing dropdown patterns from TopBar
- Agent detail panel already exists — bottom bar pill triggers it
