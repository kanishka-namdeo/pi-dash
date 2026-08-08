# Dashboard Flow Design Sync — Spec

## Purpose

Update `design/pidash-ui.pen` to reflect the current state of the PiDash renderer implementation. The design file has drifted from the shipped code as new components were added and existing ones were restructured. This spec documents the gaps and the plan to close them.

## Scope

Full sync across all six flows in the design file:
- Onboarding Flow
- Main App Flow
- GitHub Integration Flow
- Settings Flow
- States Flow
- Auxiliary Flow

## Identified Gaps

### Main App Flow

| Design | App | Action |
|--------|-----|--------|
| MetricsFooter | BottomBar (replaces it) | Replace frame content |
| Agent Detail View (full page) | AgentDetailPanel (slide-out) | Restructure to slide-out panel |
| Terminal View + ViewToggle | TerminalPanel (unified) | Merge into Dashboard, remove separate screen |
| — | PiP Overlay System | Add new screens |
| — | RateLimitAlert (inline) | Add new component |
| — | PRComposer dialog | Add new dialog |
| — | IssueCommentForm | Add new component |
| — | BranchesTab | Add new screen |
| — | GlobalSettingsEffect | Add new component |

### GitHub Integration Flow

| Design | App | Action |
|--------|-----|--------|
| GitHub Issues (standalone screen) | IssuesTab (inside GitHubPanel) | Restructure to tab-based |
| GitHub PRs (standalone screen) | PRsTab (inside GitHubPanel) | Restructure to tab-based |
| — | BranchesTab | Add new tab screen |
| — | PRComposer | Add new dialog |
| — | IssueCommentForm | Add new component |
| — | RateLimitAlert | Add inline alert component |

### Settings Flow

| Design | App | Action |
|--------|-----|--------|
| All settings screens exist | SettingsRow, SectionCard, KeyCap utilities | Add utility components |
| — | GlobalSettingsEffect | Add effect indicator |

### States Flow

| Design | App | Action |
|--------|-----|--------|
| Agent Disconnected | AgentDisconnected overlay | Verify match, update if needed |
| GitHub Auth Expired | GitHubAuthExpired overlay | Verify match, update if needed |
| Worktree Conflict | WorktreeConflict overlay | Verify match, update if needed |

### Auxiliary Flow

| Design | App | Action |
|--------|-----|--------|
| Agent History | Not prominently exposed in current nav | Deprioritize |
| Notification Center | System notifications, not in-app | Deprioritize |
| Global Search | Command palette exists | Verify match |
| Help & Docs | Not implemented | Flag as not-yet-built |

## Execution Plan

### Phase 1: Dashboard Core (highest priority)

1. Replace MetricsFooter with BottomBar
2. Restructure Agent Detail View to slide-out panel
3. Integrate TerminalPanel into Dashboard (remove standalone Terminal View)
4. Add PiP Overlay screens

### Phase 2: GitHub Integration

5. Add BranchesTab
6. Add RateLimitAlert component
7. Add PRComposer dialog
8. Add IssueCommentForm
9. Restructure Issues/PRs to tab-based layout

### Phase 3: Settings & Utilities

10. Add SettingsRow, SectionCard, KeyCap utility components
11. Add GlobalSettingsEffect

### Phase 4: Verification Pass

12. Verify States Flow overlays match implementation
13. Verify Onboarding Flow matches implementation
14. Screenshot verification of all changed screens

## Design Principles

- Follow existing Pencil conventions (reusable components, variable references)
- Keep screens at consistent scale (1440×900 desktop)
- Use existing component library where possible (TopBar, AgentCard, Badge, etc.)
- New components match the dark theme: `#0a0a0a` bg, `#1a1a1a` cards, `#2a2a2a` borders
- Geist font for UI, Geist Mono for terminal/code

## Out of Scope

- Help & Docs screen (not yet implemented in app)
- Notification Center (system-level, not in-app)
- Agent History (not prominently exposed in current nav)
