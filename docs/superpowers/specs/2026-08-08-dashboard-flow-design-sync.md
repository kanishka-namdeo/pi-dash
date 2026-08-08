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

#### 1.1 Replace MetricsFooter with BottomBar

**Current MetricsFooter:** Simple footer with elapsed time, agent count, commands
**New BottomBar:** Persistent bottom bar with:
- Left section: Active agent status with color-coded indicator
- Center: Workspace context (current directory, branch)
- Right: Metrics (CPU, memory, network) + alert indicators
- Height: ~40px, fixed at bottom of screen
- Background: `#1a1a1a` with subtle top border `#2a2a2a`

**Acceptance:** BottomBar frame replaces MetricsFooter in all Dashboard screens. Screenshot shows agent status, workspace, and metrics sections.

#### 1.2 Restructure Agent Detail View to Slide-out Panel

**Current:** Full-page view with header, terminal area, view toggle
**New:** Slide-out panel overlaying the right side of Dashboard:
- Width: ~400px, slides in from right
- Header: Agent avatar, name, task, status badge, close button
- Tabs: "Files" | "Messages" | "Terminal"
- Content area: File changes list or message stream
- Overlay backdrop: semi-transparent dark overlay when open

**Acceptance:** AgentDetailPanel shown as overlay on Dashboard, not separate screen.

#### 1.3 Integrate TerminalPanel into Dashboard

**Current:** Separate "Terminal View" screen with view toggle
**New:** TerminalPanel embedded in Dashboard center area:
- When no agent selected: Empty state with "Select an agent" prompt
- When agent selected: xterm.js terminal with session binding
- View toggle removed (Dashboard always shows terminal when agent selected)
- Close button to deselect agent and return to fleet view

**Acceptance:** Remove standalone Terminal View screen. Dashboard shows terminal inline.

#### 1.4 Add PiP Overlay System

**New screens to add:**
- PiP Container: Grid layout showing main terminal + floating overlays
- Agent Overlay: Draggable, resizable terminal window
  - Header bar with agent name, status dot, resize handle, close button
  - Terminal content area (xterm.js)
  - Size presets: small (400×300), medium (600×400), large (800×600)
- Overlay Manager: Shows all active overlays in a list

**Acceptance:** PiP screens show main terminal with 2-3 floating overlay windows.

### Phase 2: GitHub Integration

#### 2.1 Add BranchesTab

**Layout:**
- Header: Repo chip, search box, refresh button
- List: Branch rows with name, commit count, last updated, status badge
- Actions: Create worktree from branch, delete branch, view on GitHub

**Acceptance:** BranchesTab screen within GitHub Integration Flow.

#### 2.2 Add RateLimitAlert

**Layout:**
- Inline alert banner at top of GitHub panels
- Shows: API calls remaining, reset time, progress bar
- Colors: Warning (yellow/orange) when low, error (red) when exhausted
- Dismissible

**Acceptance:** RateLimitAlert component shown in GitHub settings and panels.

#### 2.3 Add PRComposer Dialog

**Layout:**
- Modal dialog overlay
- Title: "Create Pull Request"
- Fields: Title, description (markdown editor), base branch, target repo
- Reviewers: Multi-select with avatar chips
- Labels: Multi-select with color chips
- Footer: Create PR button, cancel button

**Acceptance:** PRComposer dialog screen.

#### 2.4 Add IssueCommentForm

**Layout:**
- Textarea with markdown support
- Toolbar: Bold, italic, link, code, quote, list
- Attach button for files
- Submit button, cancel link
- Character count

**Acceptance:** IssueCommentForm component shown within Issues context.

#### 2.5 Restructure Issues/PRs to Tab-based Layout

**Current:** Standalone screens
**New:** Tabs within GitHubPanel:
- Issues tab: Filterable list with state chips, labels, assignees
- PRs tab: List with status badges, CI checks, reviewers
- Branches tab: (see 2.1)
- Each tab has consistent header with search, filters, refresh

**Acceptance:** GitHubPanel shown with tabs, Issues/PRs as tab content not standalone screens.

### Phase 3: Settings & Utilities

#### 3.1 Add Utility Components

**SettingsRow:**
- Two-column layout: label/description on left, control on right
- Separator line between rows
- Height: ~56px per row

**SectionCard:**
- Card container for grouped settings
- Title, optional description
- Padding, subtle border `#2a2a2a`

**KeyCap:**
- Keyboard shortcut visual
- Rounded rectangle with monospace text
- Background: `#2a2a2a`, text: `#f5f5f5`

**Acceptance:** Utility components added to reusable components section.

#### 3.2 Add GlobalSettingsEffect

**Layout:**
- Toast-like notification
- Shows: "Settings synced across all agents"
- Auto-dismiss after 3 seconds
- Appears at bottom-right

**Acceptance:** GlobalSettingsEffect component.

### Phase 4: Verification Pass

#### 4.1 Verify States Flow Overlays
- Agent Disconnected: Verify matches `AgentDisconnected.tsx`
- GitHub Auth Expired: Verify matches `GitHubAuthExpired.tsx`
- Worktree Conflict: Verify matches `WorktreeConflict.tsx`

#### 4.2 Verify Onboarding Flow
- WelcomeScreen: Verify feature highlights match
- ScanningScreen: Verify spinner and states
- ResultsScreen: Verify agent list and selection
- ManualAddScreen: Verify form layout
- NoAgentsScreen: Verify popular agent cards
- ReadyScreen: Verify confirmation layout

#### 4.3 Screenshot Verification
- Take screenshot of each changed screen
- Verify visual match with implementation
- Document any remaining discrepancies

## Design Principles

- Follow existing Pencil conventions (reusable components, variable references)
- Keep screens at consistent scale (1440×900 desktop)
- Use existing component library where possible (TopBar, AgentCard, Badge, etc.)
- New components match the dark theme: `#0a0a0a` bg, `#1a1a1a` cards, `#2a2a2a` borders
- Geist font for UI, Geist Mono for terminal/code

## Design Specifications

### Color Palette

| Token | Value | Usage |
|-------|-------|-------|
| bg | `#0a0a0a` | Main background |
| card | `#1a1a1a` | Cards, panels |
| border | `#2a2a2a` | Borders, dividers |
| text-primary | `#f5f5f5` | Primary text |
| text-secondary | `#9ca3af` | Secondary text |
| accent | `#6366f1` | Primary accent (indigo) |
| success | `#22c55e` | Success states |
| warning | `#f59e0b` | Warning states |
| error | `#ef4444` | Error states |
| agent-omp | `#6366f1` | OMP agent color |
| agent-claude | `#d97706` | Claude Code color |
| agent-cursor | `#0ea5e9` | Cursor agent color |
| agent-aider | `#ec4899` | Aider agent color |

### Typography

| Element | Font | Size | Weight |
|---------|------|------|--------|
| H1 | Geist | 24px | 600 |
| H2 | Geist | 18px | 600 |
| H3 | Geist | 16px | 600 |
| Body | Geist | 14px | 400 |
| Caption | Geist | 12px | 400 |
| Mono | Geist Mono | 13px | 400 |
| Terminal | Geist Mono | 14px | 400 |

### Spacing

| Token | Value |
|-------|-------|
| xs | 4px |
| sm | 8px |
| md | 16px |
| lg | 24px |
| xl | 32px |
| xxl | 48px |

### Corner Radius

| Element | Radius |
|---------|--------|
| Cards | 8px |
| Buttons | 6px |
| Inputs | 6px |
| Badges | 4px |
| Overlays | 12px |

### BottomBar Specification

**Layout:** Horizontal flex, fixed at bottom
**Height:** 40px
**Background:** `#1a1a1a`
**Border-top:** 1px solid `#2a2a2a`
**Sections:**
- Left (flex: 1): Agent status dot + name + current task
- Center (flex: 1): Folder icon + cwd path + branch chip
- Right (flex: 1): CPU% + RAM% + network indicator + alert bell

### AgentDetailPanel Specification

**Width:** 400px
**Position:** Right side, slides in from right edge
**Background:** `#1a1a1a`
**Border-left:** 1px solid `#2a2a2a`
**Header:** 56px height, agent avatar + name + status badge + close button
**Tabs:** "Files" | "Messages" | "Terminal" - underline tabs pattern
**Content:** Scrollable area with file list or message stream

### PiP Overlay Specification

**Container:** CSS grid, main area + floating overlays
**Overlay window:**
- Min size: 300×200
- Max size: 1200×800
- Default: 600×400
- Header: 36px, agent name + status + controls
- Content: Terminal output
- Resize handle: Bottom-right corner
- Drag handle: Header bar

### RateLimitAlert Specification

**Position:** Top of GitHub panels
**Height:** 48px
**Background:** Gradient based on severity
  - Normal: `#1a1a1a` with green accent
  - Warning: `#1a1a1a` with yellow accent
  - Critical: `#1a1a1a` with red accent
**Content:** "API Rate Limit: X/Y remaining · Resets in Z minutes"
**Progress bar:** Shows remaining quota

### PRComposer Dialog Specification

**Width:** 600px
**Background:** `#1a1a1a`
**Border:** 1px solid `#2a2a2a`
**Radius:** 12px
**Header:** "Create Pull Request" + close button
**Fields:**
- Title: Text input
- Description: Markdown textarea with toolbar
- Base: Select dropdown
- Reviewers: Multi-select with avatars
- Labels: Multi-select with color chips
**Footer:** "Create PR" (primary) + "Cancel" (secondary)

## Out of Scope

- Help & Docs screen (not yet implemented in app)
- Notification Center (system-level, not in-app)
- Agent History (not prominently exposed in current nav)

## Implementation Approach

### Pencil MCP Tool Usage

All design updates will use the Pencil MCP server exclusively:
- `get_app_state` — Load schema and canvas design
- `execute` — Insert, update, replace, delete nodes
- `get_screenshot` — Verify visual changes
- `batch_design` — Batch operations for complex changes

### Node Management

- **Insert:** Add new nodes as children of existing frames
- **Copy:** Duplicate existing components for instances
- **Update:** Modify properties of existing nodes
- **Replace:** Swap component instances or content
- **Delete:** Remove obsolete nodes

### Screenshot Verification

After each significant change:
1. Call `get_screenshot` with the modified frame ID
2. Verify visual output matches expected design
3. Document any discrepancies in the spec

### Component Reuse Strategy

1. Scan existing reusable components before creating new ones
2. Use `ref` nodes for component instances
3. Override descendant properties via `descendants` map
4. Keep component library DRY

## Testing & Verification Checklist

### Pre-implementation
- [ ] Load current design state
- [ ] Document existing component IDs
- [ ] Screenshot baseline of all flows

### Phase 1 Verification
- [ ] BottomBar replaces MetricsFooter in all Dashboard screens
- [ ] AgentDetailPanel is slide-out overlay, not full page
- [ ] TerminalPanel integrated into Dashboard
- [ ] PiP Overlay screens added and functional

### Phase 2 Verification
- [ ] BranchesTab added to GitHub Integration Flow
- [ ] RateLimitAlert component present
- [ ] PRComposer dialog screen added
- [ ] IssueCommentForm component added
- [ ] Issues/PRs restructured as tabs

### Phase 3 Verification
- [ ] SettingsRow component added
- [ ] SectionCard component added
- [ ] KeyCap component added
- [ ] GlobalSettingsEffect added

### Phase 4 Verification
- [ ] States Flow overlays match implementation
- [ ] Onboarding Flow matches implementation
- [ ] All screenshots verified
- [ ] No broken references or missing components

### Post-implementation
- [ ] Design file opens without errors
- [ ] All screens render correctly
- [ ] Component instances resolve properly
- [ ] Variables and themes intact
- [ ] Document structure clean
