# GitHub Flow Completeness — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 8 new screens/variants to the GitHub Integration Flow in `design/pidash-ui.pen` to close gaps in agent↔GitHub linking, CI visibility, review submission, issue creation, multi-repo support, agent session logs, rate limit management, and sync configuration.

**Architecture:** All screens are additions to the existing `GitHub Integration Flow` frame (id: `g30OX8`) in the Pencil design file. Each screen is a 1440×900 frame (or modal overlay) positioned within the flow canvas. Uses existing design tokens (`$bg`, `$card`, `$border`, `$accent-*`, `$text-*`, `$font-ui`, `$font-mono`) and component patterns (cards, pills, chips, badges) from the existing 10 screens.

**Tech Stack:** Pencil MCP tools (`get_app_state`, `execute`, `get_screenshot`), `.pen` file format v2.15

## Global Constraints

- All screens use dark theme: `$bg` (#0a0a0a), `$card` (#1a1a1a), `$border` (#2a2a2a)
- Lucide icon library for all icons
- Monospace (`$font-mono`) for paths, branches, numbers, code
- Color-coded status: emerald (#10b981) = success/open, amber (#f59e0b) = warning/pending, rose (#f43f5e) = error/closed, indigo (#6366f1) = accent/active, blue (#3b82f6) = info
- Pill badges: cornerRadius 999, dot indicator 6px, padding [3,10] or [4,10]
- Cards: cornerRadius 8, stroke $border strokeWidth 1
- Screen frames: 1440×900, clip true, fill $bg
- Header bars: height 56, stroke $border bottom 1, padding [0,24], gap 16

---

### Task 1: Agent Assignment Modal

**Files:**
- Modify: `design/pidash-ui.pen` (add modal frame to GitHub Integration Flow)

**Interfaces:**
- Consumes: existing design tokens, agent list pattern from Results Screen, worktree card pattern from Git Worktrees screen
- Produces: new frame "Agent Assignment Modal" (640×560) positioned within the flow

- [ ] **Step 1: Load Pencil schema and current canvas state**

Call `get_app_state` with all four flags to load the schema:
```json
{
  "include_schema": true,
  "include_canvas_design": true,
  "include_scripts_and_shaders": false,
  "include_browser": false
}
```

- [ ] **Step 2: Create the modal backdrop frame**

Create a frame at position x=7640, y=1044 (next available slot in the flow grid), 640px wide × 560px tall:
- type: frame, name: "Agent Assignment Modal"
- fill: $card (#1a1a1a), cornerRadius: 12, stroke: $border, strokeWidth: 1
- layout: vertical, gap: 0

- [ ] **Step 3: Add modal header**

Inside the modal frame, add a header section:
- Frame: name "ModalHeader", width: fill_container, height: 56, padding: [0,20], justifyContent: space_between, alignItems: center, stroke: $border bottom 1
  - Text: "Assign Agent", fontSize: 16, fontWeight: 600, fill: $text-primary
  - Icon button: 32×32, close icon (x), fill: $card, cornerRadius: 6

- [ ] **Step 4: Add issue context section**

Below header, add context block:
- Frame: name "IssueContext", width: fill_container, padding: 20, layout: vertical, gap: 8
  - Text: "Issue #123 · Fix agent authentication", fontSize: 14, fontWeight: 600, fill: $text-primary
  - Text: "stablyai/orca", fontSize: 12, fontWeight: normal, fill: $text-muted, fontFamily: $font-mono

- [ ] **Step 5: Add agent list section**

Below context, add "Select an agent" label + agent rows:
- Text: "Select an agent", fontSize: 12, fontWeight: 500, fill: $text-secondary, padding: [0,20]
- Frame: name "AgentList", width: fill_container, layout: vertical, gap: 0, padding: [0,20]
  - Agent Row 1 (selected): frame, fill: #4f46e522, cornerRadius: 8, stroke: $accent-indigo, padding: 12, gap: 12, alignItems: center
    - Checkbox: 20×20, fill: $accent-indigo, cornerRadius: 4, check icon
    - Status dot: 8px, fill: $accent-emerald (idle)
    - Text: "Claude Code", fontSize: 14, fontWeight: 600, fill: #ffffff
    - Text: "/usr/local/bin/claude", fontSize: 12, fill: $text-secondary, fontFamily: $font-mono
    - Text: "Status: idle", fontSize: 11, fill: $text-muted
  - Agent Row 2 (busy): same structure but fill: $card, stroke: $border, dot: $accent-amber, status text: "working on #118"
  - Agent Row 3 (offline): same but dot: $text-muted (hollow), dimmed text

- [ ] **Step 6: Add worktree picker section**

Below agent list:
- Text: "Worktree", fontSize: 12, fontWeight: 500, fill: $text-secondary, padding: [0,20]
- Frame: name "WorktreePicker", width: fill_container, layout: vertical, gap: 0, padding: [0,20]
  - Option 1 (selected): frame, fill: #4f46e522, cornerRadius: 6, stroke: $accent-indigo, padding: 10
    - Text: "feat/123-agent-auth", fontSize: 13, fontFamily: $font-mono, fill: $text-primary
    - Text: "(create new)", fontSize: 11, fill: $text-muted
  - Option 2: frame, fill: $card, cornerRadius: 6, stroke: $border, padding: 10
    - Text: "main-worktree", fontSize: 13, fontFamily: $font-mono, fill: $text-secondary
    - Text: "(existing)", fontSize: 11, fill: $text-muted

- [ ] **Step 7: Add footer buttons**

Bottom of modal:
- Frame: name "ModalFooter", width: fill_container, height: 64, padding: [0,20], justifyContent: flex-end, gap: 12, stroke: $border top 1
  - Button: "Cancel", width: auto, height: 36, fill: $bg, cornerRadius: 6, stroke: $border, text fill: $text-secondary
  - Button: "Assign Agent", width: auto, height: 36, fill: $accent-indigo, cornerRadius: 6, text fill: #ffffff, fontWeight: 500

- [ ] **Step 8: Screenshot and verify**

Call `get_screenshot` on the new modal frame. Verify:
- Modal is 640px wide with visible border
- Three agent rows with correct status indicators
- Worktree picker shows two options
- Footer buttons aligned right

---

### Task 2: PR Checks Panel

**Files:**
- Modify: `design/pidash-ui.pen` (add checks section to existing PR Detail frame id: `vywE1`)

**Interfaces:**
- Consumes: existing PR Detail SummaryPanel (id: `tnHkX`), StatsRow (id: `f03WO`)
- Produces: new "Checks" section inserted between StatsRow and review timeline

- [ ] **Step 1: Load Pencil schema**

Call `get_app_state` with all four flags.

- [ ] **Step 2: Create collapsed checks section**

Inside SummaryPanel, after StatsRow, add:
- Frame: name "ChecksSection", width: fill_container, layout: vertical, stroke: $border bottom 1, padding: [12,24]
  - Frame: name "ChecksHeader", justifyContent: space_between, alignItems: center
    - Text: "Checks", fontSize: 13, fontWeight: 600, fill: $text-primary
    - Icon: chevron-down, 14px, fill: $text-muted
  - Frame: name "ChecksSummary", gap: 12, paddingTop: 8
    - Pill: fill: #10b98122, cornerRadius: 999, padding: [3,10]
      - Dot: 6px, fill: $accent-emerald
      - Text: "3/3 passing", fontSize: 11, fill: $accent-emerald
    - Text: "12m 14s total", fontSize: 11, fill: $text-muted, fontFamily: $font-mono

- [ ] **Step 3: Create expanded checks state (separate frame variant)**

Create a new frame "PR Detail — Checks Expanded" next to the existing PR Detail:
- Same layout as existing PR Detail but ChecksSection is expanded:
  - Frame: name "ChecksExpanded", layout: vertical, gap: 0
    - Check Row 1: frame, padding: [8,0], gap: 12, alignItems: center
      - Icon: check-circle, 14px, fill: $accent-emerald
      - Text: "build", fontSize: 12, fill: $text-primary
      - Text: "4m 02s", fontSize: 11, fill: $text-muted, fontFamily: $font-mono
      - Text: "main", fontSize: 11, fill: $text-muted
    - Check Row 2: same, "test-unit", "6m 38s"
    - Check Row 3: same, "test-e2e", "1m 34s"
    - Frame: name "ChecksFooter", paddingTop: 8, gap: 8
      - Text: "Last run: 12 minutes ago", fontSize: 11, fill: $text-muted
      - Text: "View on GitHub ↗", fontSize: 11, fill: $accent-blue, fontWeight: 500

- [ ] **Step 4: Screenshot and verify**

Screenshot both collapsed and expanded states. Verify check rows align correctly and status icons use correct colors.

---

### Task 3: Review Composer

**Files:**
- Modify: `design/pidash-ui.pen` (add PR Detail variant with review composer)

**Interfaces:**
- Consumes: existing PR Detail frame, comment composer pattern
- Produces: new frame "PR Detail — Review Mode"

- [ ] **Step 1: Load Pencil schema**

Call `get_app_state` with all four flags.

- [ ] **Step 2: Create PR Detail — Review Mode frame**

New frame 1440×900, same structure as existing PR Detail but bottom-right section replaced:
- Frame: name "PR Detail — Review Mode", 1440×900, fill: $bg, layout: vertical
- Copy header bar from existing PR Detail
- Copy SummaryPanel from existing PR Detail
- Replace right column bottom with Review Composer

- [ ] **Step 3: Build review composer UI**

In the right column, below the timeline:
- Frame: name "ReviewComposer", width: fill_container, layout: vertical, gap: 12, padding: 24, stroke: $border top 1
  - Text: "Review", fontSize: 14, fontWeight: 600, fill: $text-primary
  - Frame: name "ReviewTabs", gap: 8
    - Tab "Comment": frame, fill: #ffffff14, cornerRadius: 6, padding: [6,14]
      - Text: "Comment", fontSize: 12, fill: $text-primary
    - Tab "Approve": frame, fill: #00000000, cornerRadius: 6, padding: [6,14]
      - Text: "Approve", fontSize: 12, fill: $text-muted
    - Tab "Request Changes": frame, fill: #00000000, cornerRadius: 6, padding: [6,14]
      - Text: "Request Changes", fontSize: 12, fill: $text-muted
  - Frame: name "ReviewTextarea", width: fill_container, height: 120, fill: $bg, cornerRadius: 6, stroke: $border, padding: 12
    - Text: "Write your review... (Markdown supported)", fontSize: 12, fill: $text-muted
  - Frame: name "ReviewActions", justifyContent: flex-end, gap: 12
    - Button: "Cancel", height: 36, fill: $bg, cornerRadius: 6, stroke: $border
    - Button: "Submit Review", height: 36, fill: $accent-emerald, cornerRadius: 6
      - Text: "Submit Review", fontSize: 13, fill: #ffffff, fontWeight: 500

- [ ] **Step 4: Screenshot and verify**

Screenshot the review mode variant. Verify three tabs visible, textarea present, Submit button is emerald.

---

### Task 4: New Issue Screen

**Files:**
- Modify: `design/pidash-ui.pen` (add full screen frame)

**Interfaces:**
- Consumes: GitHub Issues header pattern, label chip pattern from issue list
- Produces: new frame "New Issue" (1440×900)

- [ ] **Step 1: Load Pencil schema**

Call `get_app_state` with all four flags.

- [ ] **Step 2: Create header bar**

New frame "New Issue" at next available position:
- Frame: name "New Issue", 1440×900, fill: $bg, layout: vertical
- HeaderBar: height 56, stroke $border bottom, padding [0,24], gap 16, alignItems center
  - BackBtn: 34×34, $card, cornerRadius 8, arrow-left icon
  - Title: "New Issue", fontSize 16, fontWeight 600, $text-primary
  - RepoChip: frame, $card, cornerRadius 8, stroke $border, github icon + "stablyai/orca" + chevron-down
  - Spacer (flex)
  - DraftBtn: height 32, $bg, cornerRadius 6, stroke $border, text "Draft"
  - CreateBtn: height 32, $accent-indigo, cornerRadius 6, text "Create Issue" fill #ffffff

- [ ] **Step 3: Build content area with title + description**

Content frame: width fill_container, height fill_container, padding 24, gap 24
- Left column (width: fill_container, layout vertical, gap 16):
  - Label: "Title", fontSize 14, fontWeight 500, $text-secondary
  - Input: height 48, $card, cornerRadius 8, stroke $border, padding [0,16]
    - Text: "Add retry logic for GitHub API failures", fontSize 18, fill $text-primary
  - Frame: justifyContent space_between, alignItems center
    - Label: "Description", fontSize 14, fontWeight 500, $text-secondary
    - Frame: gap 0 (Write/Preview toggle)
      - Tab "Write": fill $card, cornerRadius 6, padding [4,12], text "Write" fontSize 12
      - Tab "Preview": fill transparent, cornerRadius 6, padding [4,12], text "Preview" fontSize 12, fill $text-muted
  - Textarea: width fill_container, height 280, $card, cornerRadius 8, stroke $border, padding 16
    - Multi-line text content with markdown body text

- [ ] **Step 4: Build right sidebar metadata**

Right column (width: 320, layout vertical, gap 16):
- Labels section:
  - Label: "Labels", fontSize 12, fontWeight 500, $text-secondary
  - Frame: gap 6, flexWrap wrap
    - Chip "bug": fill #f43f5e22, cornerRadius 999, padding [2,8], text "bug" fill #f43f5e fontSize 11
    - Chip "enhancement": fill #3b82f622, cornerRadius 999, padding [2,8], text "enhancement" fill #3b82f6 fontSize 11
  - Text: "+ Add label", fontSize 12, fill $accent-indigo
- Assignees section:
  - Label: "Assignees", fontSize 12, fontWeight 500, $text-secondary
  - Frame: gap 8, alignItems center
    - Ellipse: 24×24, fill #6366f1 (avatar)
    - Text: "kanis", fontSize 13, fill $text-primary
    - Icon: x, 12px, $text-muted
  - Text: "+ Add assignee", fontSize 12, fill $accent-indigo
- Milestone section:
  - Label: "Milestone", fontSize 12, fontWeight 500, $text-secondary
  - Frame: $card, cornerRadius 6, stroke $border, padding [8,12], justifyContent space_between
    - Text: "v2.1 — Aug 2026", fontSize 12, fill $text-secondary
    - Icon: chevron-down, 12px, $text-muted
- Projects section:
  - Label: "Projects", fontSize 12, fontWeight 500, $text-secondary
  - Frame: gap 8, alignItems center
    - Checkbox: 16×16, $accent-indigo, check icon
    - Text: "Agent Dashboard", fontSize 12, fill $text-secondary

- [ ] **Step 5: Screenshot and verify**

Screenshot the full New Issue screen. Verify title input, markdown textarea, right sidebar with all four metadata sections.

---

### Task 5: Multi-Repo Overview

**Files:**
- Modify: `design/pidash-ui.pen` (add full screen frame)

**Interfaces:**
- Consumes: dashboard metric card pattern, issue row pattern, PR row pattern
- Produces: new frame "Multi-Repo Overview" (1440×900)

- [ ] **Step 1: Load Pencil schema**

Call `get_app_state` with all four flags.

- [ ] **Step 2: Create header bar**

New frame "Multi-Repo Overview":
- HeaderBar: height 56, same pattern as Dashboard — GitHub Connected
  - Logo, "PiDash" title, separator
  - Tab "All Repos": fill $accent-indigo, cornerRadius 4, text "All Repos" fill #ffffff
  - Settings icon, avatar

- [ ] **Step 3: Build metric cards row**

Content area: padding 24, gap 20
- Frame: name "MetricsRow", gap 16, width fill_container
  - Card 1 "Open Issues": 280×100, $card, cornerRadius 8, stroke $border, padding 20
    - Text: "12", fontSize 32, fontWeight 700, fill $text-primary
    - Text: "Open Issues", fontSize 13, fill $text-muted
  - Card 2 "PRs Needing Review": same structure, "5", $accent-amber
  - Card 3 "Active Agents": "3", $accent-emerald
  - Card 4 "Repos Tracked": "3", $accent-blue

- [ ] **Step 4: Build two-column issue/PR lists**

Frame: name "ListsRow", gap 20, width fill_container, height fill_container
- Left column "Recent Issues": width fill_container, $card, cornerRadius 8, stroke $border, layout vertical
  - Header: "Recent Issues", padding 16, fontSize 14, fontWeight 600, stroke $border bottom
  - Group "stablyai/orca": padding [8,16]
    - Text: "stablyai/orca", fontSize 11, fontFamily $font-mono, fill $text-muted
    - Row "#123 Fix agent auth": dot $accent-emerald, text, time
    - Row "#118 Retry logic": dot $accent-emerald, text, time
  - Group "stablyai/pi-dash": same structure
  - Group "kanis/dotfiles": same structure
- Right column "Recent PRs": same structure with PR data
  - Each PR row: git-pull-request icon, number, title, status badge, time

- [ ] **Step 5: Build agent activity feed**

Below lists:
- Frame: name "AgentActivity", width fill_container, $card, cornerRadius 8, stroke $border, padding 16, layout vertical, gap 8
  - Text: "Agent Activity", fontSize 14, fontWeight 600, fill $text-primary
  - Row 1: dot $accent-emerald, "Claude Code", "→", "working on orca#123", "2m ago"
  - Row 2: dot $accent-emerald, "OMP", "→", "idle", "15m ago"
  - Row 3: dot $text-muted, "Cursor", "→", "offline", "1h ago"

- [ ] **Step 6: Screenshot and verify**

Screenshot the full Multi-Repo Overview. Verify 4 metric cards, two grouped lists, agent activity feed.

---

### Task 6: Agent Session Tab in PR Detail

**Files:**
- Modify: `design/pidash-ui.pen` (add PR Detail variant with agent session tab)

**Interfaces:**
- Consumes: existing PR Detail frame, tab pattern from GitHub Panel
- Produces: new frame "PR Detail — Agent Session"

- [ ] **Step 1: Load Pencil schema**

Call `get_app_state` with all four flags.

- [ ] **Step 2: Create frame with modified tab bar**

New frame "PR Detail — Agent Session" (1440×900):
- Same header as existing PR Detail
- Same SummaryPanel on left (420px)
- Right column: replace tab bar with "Timeline | Files | Agent Session" (Agent Session active)

- [ ] **Step 3: Build session header**

Right column content:
- Frame: name "SessionHeader", padding 16, stroke $border bottom, layout vertical, gap 8
  - Frame: gap 8, alignItems center
    - Ellipse: 28×28, fill #f59e0b (agent avatar)
    - Text: "Claude Code", fontSize 14, fontWeight 600, fill $text-primary
    - Pill: fill #10b98122, dot $accent-emerald, text "working" fontSize 11
  - Text: "started 2h ago · branch: fix/123-agent-auth", fontSize 12, fill $text-muted

- [ ] **Step 4: Build tool call log**

Frame: name "ToolCallLog", width fill_container, height fill_container, layout vertical, gap 0, padding [0,16]
- Tool Call 1 (collapsed Read):
  - Frame: padding [10,0], stroke $border bottom, gap 8, alignItems center
    - Icon: chevron-right, 12px, $text-muted
    - Icon: file-text, 14px, $accent-blue
    - Text: "Read", fontSize 12, fontWeight 500, fill $text-primary
    - Text: "src/github/service.ts", fontSize 12, fontFamily $font-mono, fill $text-secondary
    - Text: "2.3s · 847 lines", fontSize 11, fill $text-muted, fontFamily $font-mono
- Tool Call 2 (collapsed Edit): same pattern, edit icon, "+34 −12"
- Tool Call 3 (expanded Bash):
  - Frame: padding [10,0], gap 8 (header row, same as above)
    - Icon: chevron-down, terminal icon, "Bash:", "pnpm test", "45.2s · exit 0"
  - Frame: name "BashOutput", fill #0a0a0a, cornerRadius 6, padding 12, margin [4,0,0,0]
    - Text: "PASS src/github/...\nPASS src/renderer/...\nTests: 47 passed", fontSize 11, fontFamily $font-mono, fill $text-secondary, lineHeight 1.6
- Tool Call 4 (collapsed Write): write icon, "+89 lines (new file)"
- Tool Call 5 (thinking):
  - Frame: gap 8, alignItems center
    - Icon: loader (spinner), 14px, $accent-indigo
    - Text: "Thinking...", fontSize 12, fill $text-muted

- [ ] **Step 5: Build bottom action bar**

Frame: name "SessionActions", padding 16, stroke $border top, gap 12
- Button: "Pause Agent", height 32, $bg, cornerRadius 6, stroke $border, pause icon + text
- Button: "Open Terminal", height 32, $accent-indigo, cornerRadius 6, terminal icon + text

- [ ] **Step 6: Screenshot and verify**

Screenshot the Agent Session tab. Verify session header, 5 tool calls with correct icons, expanded Bash output, bottom action buttons.

---

### Task 7: Rate Limit Warning

**Files:**
- Modify: `design/pidash-ui.pen` (add banner states + settings section)

**Interfaces:**
- Consumes: existing GitHub Settings frame, banner pattern from offline state
- Produces: two banner frames + API Usage section in settings

- [ ] **Step 1: Load Pencil schema**

Call `get_app_state` with all four flags.

- [ ] **Step 2: Create low-warning banner**

New frame "Rate Limit — Low Warning":
- Frame: width 1440, height 44, fill: #f59e0b11 (amber 10%), stroke: $accent-amber left 3
  - Frame: padding [0,24], gap 12, alignItems center
    - Icon: alert-triangle, 16px, fill $accent-amber
    - Text: "GitHub API rate limit: 312 requests remaining", fontSize 13, fill $text-secondary
    - Text: "Configure ▾", fontSize 12, fill $accent-amber, fontWeight 500
    - Spacer
    - Icon: x, 14px, $text-muted

- [ ] **Step 3: Create exhausted banner**

New frame "Rate Limit — Exhausted":
- Same structure but: fill: #f43f5e11 (rose 10%), stroke: $accent-rose left 3
  - Icon: x-circle, fill $accent-rose
  - Text: "GitHub API rate limit exhausted"
  - Text: "Cached data is shown. Resets in 23 minutes.", fontSize 13
  - Text: "Dismiss", fontSize 12, fill $accent-rose, fontWeight 500

- [ ] **Step 4: Screenshot and verify**

Screenshot both banners. Verify amber banner for low warning, rose banner for exhausted, correct icons and text.

---

### Task 8: Sync Settings

**Files:**
- Modify: `design/pidash-ui.pen` (add section to existing GitHub Settings frame id: `eq6P1`)

**Interfaces:**
- Consumes: existing GitHub Settings right column structure
- Produces: new "Sync & Data" section in right column

- [ ] **Step 1: Load Pencil schema**

Call `get_app_state` with all four flags.

- [ ] **Step 2: Create Sync & Data section header**

Inside the GitHub Settings right column, below the existing repos card:
- Frame: name "SyncDataSection", width fill_container, layout vertical, gap 16
  - Text: "Sync & Data", fontSize 16, fontWeight 600, fill $text-primary

- [ ] **Step 3: Build repositories checkbox list**

- Frame: name "ReposCard", width fill_container, $card, cornerRadius 8, stroke $border, layout vertical
  - Header: padding 16, stroke $border bottom
    - Text: "Repositories", fontSize 13, fontWeight 600, fill $text-primary
  - Row 1: padding [12,16], gap 12, alignItems center
    - Checkbox: 18×18, $accent-indigo, check icon
    - Text: "stablyai/orca", fontSize 13, fontFamily $font-mono, fill $text-primary
    - Text: "Issues · PRs · Checks", fontSize 11, fill $text-muted
  - Row 2: same, "stablyai/pi-dash", "Issues · PRs"
  - Row 3: checkbox unchecked ($card fill, $border stroke), "kanis/dotfiles", "Issues"
  - Footer: padding 12, stroke $border top
    - Text: "+ Add repository", fontSize 12, fill $accent-indigo, fontWeight 500

- [ ] **Step 4: Build sync mode radio cards**

- Text: "Sync mode", fontSize 12, fontWeight 500, fill $text-secondary
- Frame: gap 12
  - Card "Polling" (selected): width fill_container, $card, cornerRadius 8, stroke $accent-indigo, padding 16, layout vertical, gap 8
    - Frame: gap 8, alignItems center
      - Radio dot: 16×16, $accent-indigo border, inner dot 8px $accent-indigo
      - Text: "Polling", fontSize 13, fontWeight 600, fill $text-primary
    - Text: "Interval: 60s", fontSize 12, fill $text-secondary
  - Card "Webhooks" (unselected): same structure but stroke $border, radio empty, text "Webhooks (advanced)" fill $text-muted
    - Text: "Requires a public URL or tunnel", fontSize 11, fill $text-muted

- [ ] **Step 5: Build data types checkbox grid**

- Text: "Data types", fontSize 12, fontWeight 500, fill $text-secondary
- Frame: width fill_container, $card, cornerRadius 8, stroke $border, padding 16
  - Frame: gap 24 (2-column grid)
    - Column 1: layout vertical, gap 8
      - Checkbox row: checkbox checked + "Issues"
      - Checkbox row: checkbox checked + "Checks/CI"
      - Checkbox row: checkbox checked + "Notifications"
    - Column 2: layout vertical, gap 8
      - Checkbox row: checkbox checked + "Pull requests"
      - Checkbox row: checkbox unchecked + "Discussions"
      - Checkbox row: checkbox unchecked + "Projects"

- [ ] **Step 6: Build API Usage progress bar**

- Text: "API Usage", fontSize 12, fontWeight 500, fill $text-secondary
- Frame: layout vertical, gap 8
  - Frame: width fill_container, height 8, $bg, cornerRadius 4
    - Frame: width 93% (4682/5000), height 8, $accent-emerald, cornerRadius 4
  - Frame: justifyContent space_between
    - Text: "4,682 / 5,000 remaining", fontSize 11, fontFamily $font-mono, fill $text-secondary
    - Text: "Resets in 42 minutes", fontSize 11, fill $text-muted

- [ ] **Step 7: Build cache section**

- Text: "Cache", fontSize 12, fontWeight 500, fill $text-secondary
- Frame: gap 12, alignItems center
  - Frame: gap 6, alignItems center
    - Dot: 6px, $accent-emerald
    - Text: "Enabled — cached data available offline", fontSize 12, fill $text-secondary
  - Button: "Clear cache", height 28, $bg, cornerRadius 6, stroke $border, fontSize 11
  - Text: "Last synced: 12 seconds ago", fontSize 11, fill $text-muted

- [ ] **Step 8: Screenshot and verify**

Screenshot the GitHub Settings screen with the new Sync & Data section. Verify repos list, sync mode cards, data types grid, API usage bar, cache section.

---

### Task 9: Update Flow Subtitle + Final Verification

**Files:**
- Modify: `design/pidash-ui.pen` (update flow subtitle text)

**Interfaces:**
- Consumes: existing flow subtitle text node (id: `eg6TU`)
- Produces: updated subtitle text

- [ ] **Step 1: Update flow subtitle**

Find the FlowSub text node (id: `eg6TU`) in the GitHub Integration Flow frame and update its content from:
```
settings → dashboard → issues → worktrees → pull request
```
to:
```
settings → dashboard → issues → worktrees → pull request → multi-repo → new issue → agent session → sync
```

- [ ] **Step 2: Full flow screenshot**

Screenshot the entire GitHub Integration Flow frame. Verify all 18 screens (10 existing + 8 new) are visible and correctly positioned.

- [ ] **Step 3: Commit**

```bash
git add design/pidash-ui.pen
git commit -m "design: add 8 GitHub flow screens for completeness

Adds Agent Assignment Modal, PR Checks Panel, Review Composer,
New Issue, Multi-Repo Overview, Agent Session Tab, Rate Limit
Warning banners, and Sync Settings to the GitHub Integration Flow."
```