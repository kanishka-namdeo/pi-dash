# Dashboard Flow Design Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Update `design/pidash-ui.pen` to reflect the current PiDash renderer implementation by replacing outdated screens, adding missing components, and restructuring flows to match the shipped code.

**Architecture:** Systematic update of six design flows using Pencil MCP tools. Each flow is updated independently with screenshot verification after each change. Existing reusable components are leveraged where possible.

**Tech Stack:** Pencil MCP server (`get_app_state`, `execute`, `get_screenshot`), JavaScript snippets for batch node operations.

## Global Constraints

- Use Pencil MCP tools exclusively for all design updates — never use Read/Grep/Edit on `.pen` files
- All four flags required on `get_app_state`: `include_schema: true`, `include_canvas_design: true`, `include_scripts_and_shaders: false`, `include_browser: false`
- Cap visual `batch_design` calls at ≤8 ops per call
- Set `placeholder: true` on any new or modified root frame during work, unset when done
- Name every node with a human-readable name
- Use `fit_content` or `fill_container` for sizing, never hardcoded percentages
- Follow existing component reuse patterns (ref nodes with descendants overrides)
- Dark theme: `#0a0a0a` bg, `#1a1a1a` cards, `#2a2a2a` borders
- Desktop scale: 1440×900

---

### Task 1: Replace MetricsFooter with BottomBar

**Files:**
- Modify: `design/pidash-ui.pen` (Main App Flow frame)

**Interfaces:**
- Consumes: Existing MetricsFooter component ID (`dHYeU`)
- Produces: New BottomBar component (reusable) and updated Dashboard instances

- [ ] **Step 1: Load current design state**

```
CallMcpTool: get_app_state({include_schema: true, include_canvas_design: true, include_scripts_and_shaders: false, include_browser: false})
```

Expected: Schema and canvas design loaded, top-level frame IDs returned.

- [ ] **Step 2: Create BottomBar reusable component**

```javascript
const pos = FindEmptySpace({width: 1440, height: 60, direction: "right", padding: 80})
bottomBarId = Insert(document, {type: "frame", name: "BottomBar", x: pos.x, y: pos.y, reusable: true, layout: "horizontal", width: 1440, height: 40, fill: "$card", stroke: {type: "color", color: "$border", strokeWidth: [1, 0, 0, 0]}, padding: [0, 16], gap: 16, alignItems: "center", placeholder: true})

// Left section: Agent status
leftId = Insert(bottomBarId, {type: "frame", name: "AgentStatus", layout: "horizontal", gap: 8, alignItems: "center"})
Insert(leftId, {type: "ellipse", name: "StatusDot", width: 8, height: 8, fill: "$success"})
Insert(leftId, {type: "text", name: "AgentName", fontFamily: "Geist Mono", fontSize: 12, fill: "$text-primary", content: "omp"})
Insert(leftId, {type: "text", name: "AgentTask", fontFamily: "Geist", fontSize: 11, fill: "$text-secondary", content: "Building API endpoints"})

// Center section: Workspace
centerId = Insert(bottomBarId, {type: "frame", name: "Workspace", layout: "horizontal", gap: 8, alignItems: "center"})
Insert(centerId, {type: "icon", name: "FolderIcon", library: "lucide", icon: "folder", width: 14, height: 14, fill: "$text-secondary"})
Insert(centerId, {type: "text", name: "CwdPath", fontFamily: "Geist Mono", fontSize: 11, fill: "$text-secondary", content: "/projects/pi-dash"})
Insert(centerId, {type: "text", name: "BranchChip", fontFamily: "Geist Mono", fontSize: 11, fill: "$accent", content: "main"})

// Right section: Metrics
rightId = Insert(bottomBarId, {type: "frame", name: "Metrics", layout: "horizontal", gap: 16, alignItems: "center"})
Insert(rightId, {type: "text", name: "CpuMetric", fontFamily: "Geist Mono", fontSize: 11, fill: "$text-secondary", content: "CPU 23%"})
Insert(rightId, {type: "text", name: "RamMetric", fontFamily: "Geist Mono", fontSize: 11, fill: "$text-secondary", content: "RAM 4.2GB"})
Insert(rightId, {type: "icon", name: "AlertIcon", library: "lucide", icon: "bell", width: 14, height: 14, fill: "$text-secondary"})

Update(bottomBarId, {placeholder: false})
```

Expected: BottomBar component created with agent status, workspace, and metrics sections.

- [ ] **Step 3: Screenshot BottomBar component**

```
CallMcpTool: get_screenshot({nodeId: "<bottomBarId>"})
```

Expected: Screenshot shows horizontal bar with three sections: agent status (green dot + name), workspace (folder icon + path + branch), metrics (CPU/RAM/bell).

- [ ] **Step 4: Replace MetricsFooter instances with BottomBar in Main App Flow**

```javascript
// Find and replace MetricsFooter ref in Dashboard
Update("oxvLJ/dHYeU", {ref: bottomBarId})
```

Expected: Dashboard screen now references BottomBar instead of MetricsFooter.

- [ ] **Step 5: Commit**

```bash
git add design/pidash-ui.pen
git commit -m "design: replace MetricsFooter with BottomBar component"
```

---

### Task 2: Restructure Agent Detail View to Slide-out Panel

**Files:**
- Modify: `design/pidash-ui.pen` (Main App Flow frame)

**Interfaces:**
- Consumes: Existing Agent Detail View frame (`DFecf`)
- Produces: Updated AgentDetailPanel as overlay

- [ ] **Step 1: Load current design state**

```
CallMcpTool: get_app_state({include_schema: true, include_canvas_design: true, include_scripts_and_shaders: false, include_browser: false})
```

- [ ] **Step 2: Update Agent Detail View to slide-out panel**

```javascript
// Update the existing Agent Detail View frame to be a slide-out panel
// Width ~400px, positioned on right side
Update("DFecf", {
  name: "AgentDetailPanel",
  width: 400,
  height: 900,
  x: 1040,
  fill: "$card",
  stroke: {type: "color", color: "$border", strokeWidth: [0, 0, 0, 1]},
  placeholder: true
})

// Update header
Update("Wmtrr", {name: "PanelHeader", layout: "horizontal", gap: 12, alignItems: "center", padding: [12, 16]})

// Update agent info section
Update("ziuzl", {name: "AgentInfo", layout: "horizontal", gap: 12, alignItems: "center", padding: [12, 16]})

// Add tabs: Files | Messages | Terminal
tabsId = Insert("DFecf", {type: "frame", name: "PanelTabs", layout: "horizontal", gap: 0, padding: [0, 16], width: "fill_container"})
Insert(tabsId, {type: "text", name: "FilesTab", fontFamily: "Geist", fontSize: 13, fill: "$text-primary", content: "Files", textGrowth: "fixed-width", width: "fill_container", textAlign: "center"})
Insert(tabsId, {type: "text", name: "MessagesTab", fontFamily: "Geist", fontSize: 13, fill: "$text-secondary", content: "Messages", textGrowth: "fixed-width", width: "fill_container", textAlign: "center"})
Insert(tabsId, {type: "text", name: "TerminalTab", fontFamily: "Geist", fontSize: 13, fill: "$text-secondary", content: "Terminal", textGrowth: "fixed-width", width: "fill_container", textAlign: "center"})

Update("DFecf", {placeholder: false})
```

Expected: Agent Detail View updated to 400px wide slide-out panel with tabs.

- [ ] **Step 3: Screenshot AgentDetailPanel**

```
CallMcpTool: get_screenshot({nodeId: "DFecf"})
```

Expected: 400px wide panel on right side with header, agent info, tabs, and content area.

- [ ] **Step 4: Commit**

```bash
git add design/pidash-ui.pen
git commit -m "design: restructure Agent Detail View to slide-out panel"
```

---

### Task 3: Integrate TerminalPanel into Dashboard

**Files:**
- Modify: `design/pidash-ui.pen` (Main App Flow frame)

**Interfaces:**
- Consumes: Existing Terminal View frame (`s1QzWe`)
- Produces: TerminalPanel integrated into Dashboard center area

- [ ] **Step 1: Load current design state**

```
CallMcpTool: get_app_state({include_schema: true, include_canvas_design: true, include_scripts_and_shaders: false, include_browser: false})
```

- [ ] **Step 2: Update Dashboard center area to include TerminalPanel**

```javascript
// The TerminalPanel is already embedded in Dashboard.tsx
// Update the ContentArea to reflect terminal integration
Update("l3OM0S", {name: "ContentArea", layout: "vertical", gap: 0, width: "fill_container"})

// Remove separate Terminal View screen - mark as deprecated
Update("s1QzWe", {name: "Terminal View (deprecated)", enabled: false})
```

Expected: Dashboard ContentArea updated, standalone Terminal View marked as deprecated.

- [ ] **Step 3: Screenshot Dashboard**

```
CallMcpTool: get_screenshot({nodeId: "oxvLJ"})
```

Expected: Dashboard shows FleetPanel, center area with terminal, ActivityFeed.

- [ ] **Step 4: Commit**

```bash
git add design/pidash-ui.pen
git commit -m "design: integrate TerminalPanel into Dashboard, deprecate standalone Terminal View"
```

---

### Task 4: Add PiP Overlay System

**Files:**
- Modify: `design/pidash-ui.pen` (Main App Flow frame)

**Interfaces:**
- Consumes: Existing TopBar, AgentCard components
- Produces: PiP Container, Agent Overlay, Overlay Manager screens

- [ ] **Step 1: Load current design state**

```
CallMcpTool: get_app_state({include_schema: true, include_canvas_design: true, include_scripts_and_shaders: false, include_browser: false})
```

- [ ] **Step 2: Create PiP Container screen**

```javascript
const pos = FindEmptySpace({width: 1440, height: 900, direction: "right", padding: 80})
pipContainerId = Insert(document, {type: "frame", name: "PiP Container", x: pos.x, y: pos.y, width: 1440, height: 900, fill: "$bg", clip: true, placeholder: true})

// TopBar ref
Insert(pipContainerId, {type: "ref", ref: "m3JfU", name: "TopBar", x: 0, y: 0, width: 1440})

// Main terminal area
mainTermId = Insert(pipContainerId, {type: "frame", name: "MainTerminal", x: 0, y: 56, width: 1440, height: 844, fill: "#0f0f0f", padding: 16})
for (let i = 0; i < 12; i++) {
  Insert(mainTermId, {type: "text", name: "Line" + i, fontFamily: "Geist Mono", fontSize: 13, fill: "$text-secondary", content: "> command output line " + i, y: i * 20})
}

Update(pipContainerId, {placeholder: false})
```

Expected: PiP Container screen with TopBar and main terminal area.

- [ ] **Step 3: Create Agent Overlay component**

```javascript
const overlayPos = FindEmptySpace({width: 600, height: 400, direction: "right", padding: 80, nodeId: pipContainerId})
agentOverlayId = Insert(document, {type: "frame", name: "Agent Overlay", x: overlayPos.x, y: overlayPos.y, reusable: true, width: 600, height: 400, fill: "$card", stroke: {type: "color", color: "$border"}, cornerRadius: 8, layout: "vertical", placeholder: true})

// Header
overlayHeaderId = Insert(agentOverlayId, {type: "frame", name: "OverlayHeader", layout: "horizontal", gap: 8, alignItems: "center", padding: [8, 12], height: 36})
Insert(overlayHeaderId, {type: "ellipse", name: "StatusDot", width: 8, height: 8, fill: "$success"})
Insert(overlayHeaderId, {type: "text", name: "AgentName", fontFamily: "Geist Mono", fontSize: 12, fill: "$text-primary", content: "claude-code"})
Insert(overlayHeaderId, {type: "frame", name: "Spacer", width: "fill_container"})
Insert(overlayHeaderId, {type: "icon", name: "ResizeIcon", library: "lucide", icon: "maximize", width: 14, height: 14, fill: "$text-secondary"})
Insert(overlayHeaderId, {type: "icon", name: "CloseIcon", library: "lucide", icon: "x", width: 14, height: 14, fill: "$text-secondary"})

// Terminal content
overlayTermId = Insert(agentOverlayId, {type: "frame", name: "TerminalContent", width: "fill_container", height: "fill_container", fill: "#0f0f0f", padding: 12})
for (let i = 0; i < 8; i++) {
  Insert(overlayTermId, {type: "text", name: "Line" + i, fontFamily: "Geist Mono", fontSize: 12, fill: "$text-secondary", content: "> overlay output " + i, y: i * 16})
}

Update(agentOverlayId, {placeholder: false})
```

Expected: Reusable Agent Overlay component with header and terminal content.

- [ ] **Step 4: Add overlay instances to PiP Container**

```javascript
// Add 2 overlay instances to PiP Container
Insert(pipContainerId, {type: "ref", ref: agentOverlayId, name: "Overlay-claude-code", x: 20, y: 150, width: 500, height: 350})
Insert(pipContainerId, {type: "ref", ref: agentOverlayId, name: "Overlay-cursor", x: 580, y: 200, width: 450, height: 300})
```

Expected: PiP Container shows main terminal with 2 floating overlay windows.

- [ ] **Step 5: Screenshot PiP Container**

```
CallMcpTool: get_screenshot({nodeId: pipContainerId})
```

Expected: Main terminal area with 2 floating overlay windows showing agent terminals.

- [ ] **Step 6: Commit**

```bash
git add design/pidash-ui.pen
git commit -m "design: add PiP Overlay system with container and overlay component"
```

---

### Task 5: Add GitHub BranchesTab

**Files:**
- Modify: `design/pidash-ui.pen` (GitHub Integration Flow frame)

**Interfaces:**
- Consumes: Existing TopBar, Badge, Avatar components
- Produces: BranchesTab screen

- [ ] **Step 1: Load current design state**

```
CallMcpTool: get_app_state({include_schema: true, include_canvas_design: true, include_scripts_and_shaders: false, include_browser: false})
```

- [ ] **Step 2: Create BranchesTab screen**

```javascript
const pos = FindEmptySpace({width: 1440, height: 900, direction: "right", padding: 80})
branchesId = Insert(document, {type: "frame", name: "BranchesTab", x: pos.x, y: pos.y, width: 1440, height: 900, fill: "$bg", clip: true, placeholder: true})

// Header
headerId = Insert(branchesId, {type: "frame", name: "Header", layout: "horizontal", gap: 16, alignItems: "center", padding: [16, 24], width: "fill_container"})
Insert(headerId, {type: "text", name: "Title", fontFamily: "Geist", fontSize: 18, fontWeight: 600, fill: "$text-primary", content: "Branches"})
Insert(headerId, {type: "frame", name: "Spacer", width: "fill_container"})
Insert(headerId, {type: "text", name: "SearchBox", fontFamily: "Geist Mono", fontSize: 12, fill: "$text-secondary", content: "Search branches..."})
Insert(headerId, {type: "icon", name: "RefreshIcon", library: "lucide", icon: "refresh-cw", width: 16, height: 16, fill: "$text-secondary"})

// Branch list
listId = Insert(branchesId, {type: "frame", name: "BranchList", layout: "vertical", gap: 0, padding: [0, 24], width: "fill_container"})

const branches = [
  {name: "main", commits: "0", updated: "2h ago", active: true},
  {name: "feature/auth", commits: "12", updated: "1d ago", active: false},
  {name: "feature/api", commits: "8", updated: "3d ago", active: false},
  {name: "fix/tests", commits: "3", updated: "5d ago", active: false}
]

for (const b of branches) {
  const rowId = Insert(listId, {type: "frame", name: "Branch-" + b.name, layout: "horizontal", gap: 12, alignItems: "center", padding: [12, 0], stroke: {type: "color", color: "$border", strokeWidth: [0, 0, 1, 0]}})
  Insert(rowId, {type: "icon", name: "BranchIcon", library: "lucide", icon: "git-branch", width: 16, height: 16, fill: b.active ? "$accent" : "$text-secondary"})
  const infoId = Insert(rowId, {type: "frame", name: "Info", layout: "vertical", gap: 2})
  Insert(infoId, {type: "text", name: "BranchName", fontFamily: "Geist Mono", fontSize: 13, fill: "$text-primary", content: b.name})
  Insert(infoId, {type: "text", name: "CommitCount", fontFamily: "Geist", fontSize: 11, fill: "$text-secondary", content: b.commits + " commits · " + b.updated})
  Insert(rowId, {type: "frame", name: "Spacer", width: "fill_container"})
  if (b.active) {
    Insert(rowId, {type: "text", name: "ActiveBadge", fontFamily: "Geist", fontSize: 11, fill: "$accent", content: "active"})
  }
}

Update(branchesId, {placeholder: false})
```

Expected: BranchesTab screen with header, search, and branch list.

- [ ] **Step 3: Screenshot BranchesTab**

```
CallMcpTool: get_screenshot({nodeId: branchesId})
```

Expected: Branch list with icons, names, commit counts, and active indicator.

- [ ] **Step 4: Commit**

```bash
git add design/pidash-ui.pen
git commit -m "design: add BranchesTab screen to GitHub Integration Flow"
```

---

### Task 6: Add RateLimitAlert Component

**Files:**
- Modify: `design/pidash-ui.pen` (GitHub Integration Flow frame)

**Interfaces:**
- Consumes: Existing Badge, Progress components
- Produces: RateLimitAlert reusable component

- [ ] **Step 1: Load current design state**

```
CallMcpTool: get_app_state({include_schema: true, include_canvas_design: true, include_scripts_and_shaders: false, include_browser: false})
```

- [ ] **Step 2: Create RateLimitAlert component**

```javascript
const pos = FindEmptySpace({width: 1440, height: 60, direction: "right", padding: 80})
rateLimitId = Insert(document, {type: "frame", name: "RateLimitAlert", x: pos.x, y: pos.y, reusable: true, width: 1440, height: 48, fill: "#1a1a0a", stroke: {type: "color", color: "#f59e0b", strokeWidth: [1, 0, 0, 0]}, layout: "horizontal", gap: 16, alignItems: "center", padding: [0, 24], placeholder: true})

Insert(rateLimitId, {type: "icon", name: "WarningIcon", library: "lucide", icon: "alert-triangle", width: 16, height: 16, fill: "#f59e0b"})
Insert(rateLimitId, {type: "text", name: "AlertText", fontFamily: "Geist", fontSize: 12, fill: "$text-secondary", content: "API Rate Limit: 4,500/5,000 remaining · Resets in 45 minutes"})

// Progress bar
progressId = Insert(rateLimitId, {type: "frame", name: "ProgressBar", width: 200, height: 4, fill: "#333333", cornerRadius: 2})
Insert(progressId, {type: "frame", name: "ProgressFill", width: 180, height: 4, fill: "#f59e0b", cornerRadius: 2})

Insert(rateLimitId, {type: "frame", name: "Spacer", width: "fill_container"})
Insert(rateLimitId, {type: "icon", name: "DismissIcon", library: "lucide", icon: "x", width: 14, height: 14, fill: "$text-secondary"})

Update(rateLimitId, {placeholder: false})
```

Expected: RateLimitAlert component with warning icon, text, and progress bar.

- [ ] **Step 3: Screenshot RateLimitAlert**

```
CallMcpTool: get_screenshot({nodeId: rateLimitId})
```

Expected: Yellow-accented alert bar with rate limit info and progress bar.

- [ ] **Step 4: Commit**

```bash
git add design/pidash-ui.pen
git commit -m "design: add RateLimitAlert component"
```

---

### Task 7: Add PRComposer Dialog

**Files:**
- Modify: `design/pidash-ui.pen` (GitHub Integration Flow frame)

**Interfaces:**
- Consumes: Existing Button, Input, Avatar components
- Produces: PRComposer dialog screen

- [ ] **Step 1: Load current design state**

```
CallMcpTool: get_app_state({include_schema: true, include_canvas_design: true, include_scripts_and_shaders: false, include_browser: false})
```

- [ ] **Step 2: Create PRComposer dialog**

```javascript
const pos = FindEmptySpace({width: 700, height: 600, direction: "right", padding: 80})
prComposerId = Insert(document, {type: "frame", name: "PRComposer", x: pos.x, y: pos.y, width: 700, height: 600, fill: "$card", stroke: {type: "color", color: "$border"}, cornerRadius: 12, layout: "vertical", gap: 0, placeholder: true})

// Header
composerHeaderId = Insert(prComposerId, {type: "frame", name: "DialogHeader", layout: "horizontal", gap: 12, alignItems: "center", padding: [16, 24], stroke: {type: "color", color: "$border", strokeWidth: [0, 0, 1, 0]}})
Insert(composerHeaderId, {type: "text", name: "DialogTitle", fontFamily: "Geist", fontSize: 16, fontWeight: 600, fill: "$text-primary", content: "Create Pull Request"})
Insert(composerHeaderId, {type: "frame", name: "Spacer", width: "fill_container"})
Insert(composerHeaderId, {type: "icon", name: "CloseIcon", library: "lucide", icon: "x", width: 16, height: 16, fill: "$text-secondary"})

// Body
composerBodyId = Insert(prComposerId, {type: "frame", name: "DialogBody", layout: "vertical", gap: 16, padding: [24, 24], width: "fill_container"})

// Title field
Insert(composerBodyId, {type: "text", name: "TitleLabel", fontFamily: "Geist", fontSize: 12, fontWeight: 500, fill: "$text-secondary", content: "Title"})
Insert(composerBodyId, {type: "frame", name: "TitleInput", width: "fill_container", height: 40, fill: "$bg", stroke: {type: "color", color: "$border"}, cornerRadius: 6, padding: [0, 12], layout: "vertical", justifyContent: "center"})
Insert(composerBodyId, {type: "text", name: "TitlePlaceholder", fontFamily: "Geist Mono", fontSize: 13, fill: "$text-secondary", content: "PR title"})

// Description
Insert(composerBodyId, {type: "text", name: "DescLabel", fontFamily: "Geist", fontSize: 12, fontWeight: 500, fill: "$text-secondary", content: "Description"})
Insert(composerBodyId, {type: "frame", name: "DescArea", width: "fill_container", height: 150, fill: "$bg", stroke: {type: "color", color: "$border"}, cornerRadius: 6, padding: [12, 12]})
Insert(composerBodyId, {type: "text", name: "DescPlaceholder", fontFamily: "Geist Mono", fontSize: 12, fill: "$text-secondary", content: "Add a description..."})

// Base branch
Insert(composerBodyId, {type: "text", name: "BaseLabel", fontFamily: "Geist", fontSize: 12, fontWeight: 500, fill: "$text-secondary", content: "Base Branch"})
Insert(composerBodyId, {type: "frame", name: "BaseSelect", width: "fill_container", height: 40, fill: "$bg", stroke: {type: "color", color: "$border"}, cornerRadius: 6, padding: [0, 12], layout: "vertical", justifyContent: "center"})
Insert(composerBodyId, {type: "text", name: "BaseValue", fontFamily: "Geist Mono", fontSize: 13, fill: "$text-primary", content: "main"})

// Footer
composerFooterId = Insert(prComposerId, {type: "frame", name: "DialogFooter", layout: "horizontal", gap: 12, alignItems: "center", padding: [16, 24], stroke: {type: "color", color: "$border", strokeWidth: [1, 0, 0, 0]}})
Insert(composerFooterId, {type: "frame", name: "Spacer", width: "fill_container"})
Insert(composerFooterId, {type: "frame", name: "CancelBtn", width: 100, height: 36, fill: "transparent", stroke: {type: "color", color: "$border"}, cornerRadius: 6, layout: "vertical", justifyContent: "center", alignItems: "center"})
Insert(composerFooterId, {type: "text", name: "CancelLabel", fontFamily: "Geist", fontSize: 13, fill: "$text-secondary", content: "Cancel"})
Insert(composerFooterId, {type: "frame", name: "CreateBtn", width: 120, height: 36, fill: "$accent", cornerRadius: 6, layout: "vertical", justifyContent: "center", alignItems: "center"})
Insert(composerFooterId, {type: "text", name: "CreateLabel", fontFamily: "Geist", fontSize: 13, fill: "#ffffff", content: "Create PR"})

Update(prComposerId, {placeholder: false})
```

Expected: PRComposer dialog with title, description, base branch, and action buttons.

- [ ] **Step 3: Screenshot PRComposer**

```
CallMcpTool: get_screenshot({nodeId: prComposerId})
```

Expected: Dialog with form fields and create/cancel buttons.

- [ ] **Step 4: Commit**

```bash
git add design/pidash-ui.pen
git commit -m "design: add PRComposer dialog"
```

---

### Task 8: Add Utility Components (SettingsRow, SectionCard, KeyCap)

**Files:**
- Modify: `design/pidash-ui.pen` (root level for reusable components)

**Interfaces:**
- Consumes: Existing Button, Input components
- Produces: SettingsRow, SectionCard, KeyCap reusable components

- [ ] **Step 1: Load current design state**

```
CallMcpTool: get_app_state({include_schema: true, include_canvas_design: true, include_scripts_and_shaders: false, include_browser: false})
```

- [ ] **Step 2: Create SettingsRow component**

```javascript
const rowPos = FindEmptySpace({width: 600, height: 80, direction: "right", padding: 80})
settingsRowId = Insert(document, {type: "frame", name: "SettingsRow", x: rowPos.x, y: rowPos.y, reusable: true, width: 600, height: 56, layout: "horizontal", gap: 16, alignItems: "center", padding: [0, 16], placeholder: true})

// Left side
leftId = Insert(settingsRowId, {type: "frame", name: "Left", layout: "vertical", gap: 2})
Insert(leftId, {type: "text", name: "RowLabel", fontFamily: "Geist", fontSize: 13, fontWeight: 500, fill: "$text-primary", content: "Setting Label"})
Insert(leftId, {type: "text", name: "RowDesc", fontFamily: "Geist", fontSize: 11, fill: "$text-secondary", content: "Setting description text"})

// Right side (control placeholder)
Insert(settingsRowId, {type: "frame", name: "Spacer", width: "fill_container"})
Insert(settingsRowId, {type: "frame", name: "Control", width: 120, height: 32, fill: "$bg", stroke: {type: "color", color: "$border"}, cornerRadius: 6})

Update(settingsRowId, {placeholder: false})
```

Expected: SettingsRow component with label, description, and control placeholder.

- [ ] **Step 3: Create SectionCard component**

```javascript
const cardPos = FindEmptySpace({width: 600, height: 200, direction: "right", padding: 80})
sectionCardId = Insert(document, {type: "frame", name: "SectionCard", x: cardPos.x, y: cardPos.y, reusable: true, width: 600, height: 200, fill: "$card", stroke: {type: "color", color: "$border"}, cornerRadius: 8, layout: "vertical", gap: 16, padding: [24, 24], placeholder: true})

Insert(sectionCardId, {type: "text", name: "SectionTitle", fontFamily: "Geist", fontSize: 14, fontWeight: 600, fill: "$text-primary", content: "Section Title"})
Insert(sectionCardId, {type: "text", name: "SectionDesc", fontFamily: "Geist", fontSize: 12, fill: "$text-secondary", content: "Section description text"})
Insert(sectionCardId, {type: "frame", name: "Content", width: "fill_container", height: "fill_container", fill: "$bg", cornerRadius: 4})

Update(sectionCardId, {placeholder: false})
```

Expected: SectionCard component with title, description, and content area.

- [ ] **Step 4: Create KeyCap component**

```javascript
const keyPos = FindEmptySpace({width: 200, height: 60, direction: "right", padding: 80})
keyCapId = Insert(document, {type: "frame", name: "KeyCap", x: keyPos.x, y: keyPos.y, reusable: true, width: 36, height: 32, fill: "$border", cornerRadius: 6, layout: "vertical", justifyContent: "center", alignItems: "center", placeholder: true})

Insert(keyCapId, {type: "text", name: "KeyLabel", fontFamily: "Geist Mono", fontSize: 12, fontWeight: 500, fill: "$text-primary", content: "⌘"})

Update(keyCapId, {placeholder: false})
```

Expected: KeyCap component showing a keyboard key visual.

- [ ] **Step 5: Screenshot all utility components**

```
CallMcpTool: get_screenshot({nodeId: settingsRowId})
CallMcpTool: get_screenshot({nodeId: sectionCardId})
CallMcpTool: get_screenshot({nodeId: keyCapId})
```

Expected: Three components showing settings row, section card, and key cap.

- [ ] **Step 6: Commit**

```bash
git add design/pidash-ui.pen
git commit -m "design: add SettingsRow, SectionCard, KeyCap utility components"
```

---

### Task 9: Add GlobalSettingsEffect

**Files:**
- Modify: `design/pidash-ui.pen` (Settings Flow frame)

**Interfaces:**
- Consumes: Existing Toast component
- Produces: GlobalSettingsEffect component

- [ ] **Step 1: Load current design state**

```
CallMcpTool: get_app_state({include_schema: true, include_canvas_design: true, include_scripts_and_shaders: false, include_browser: false})
```

- [ ] **Step 2: Create GlobalSettingsEffect component**

```javascript
const pos = FindEmptySpace({width: 400, height: 80, direction: "right", padding: 80})
globalEffectId = Insert(document, {type: "frame", name: "GlobalSettingsEffect", x: pos.x, y: pos.y, reusable: true, width: 360, height: 48, fill: "$card", stroke: {type: "color", color: "$accent"}, cornerRadius: 8, layout: "horizontal", gap: 12, alignItems: "center", padding: [0, 16], placeholder: true})

Insert(globalEffectId, {type: "icon", name: "CheckIcon", library: "lucide", icon: "check-circle", width: 16, height: 16, fill: "$accent"})
Insert(globalEffectId, {type: "text", name: "EffectText", fontFamily: "Geist", fontSize: 12, fill: "$text-primary", content: "Settings synced across all agents"})

Update(globalEffectId, {placeholder: false})
```

Expected: Toast-like notification component.

- [ ] **Step 3: Screenshot GlobalSettingsEffect**

```
CallMcpTool: get_screenshot({nodeId: globalEffectId})
```

Expected: Small toast notification with check icon and sync message.

- [ ] **Step 4: Commit**

```bash
git add design/pidash-ui.pen
git commit -m "design: add GlobalSettingsEffect component"
```

---

### Task 10: Verification Pass — States Flow

**Files:**
- Modify: `design/pidash-ui.pen` (States Flow frame)

**Interfaces:**
- Consumes: Existing overlay components
- Produces: Verified and updated state screens

- [ ] **Step 1: Load current design state**

```
CallMcpTool: get_app_state({include_schema: true, include_canvas_design: true, include_scripts_and_shaders: false, include_browser: false})
```

- [ ] **Step 2: Screenshot Agent Disconnected overlay**

```
CallMcpTool: get_screenshot({nodeId: "ZN5Sa"})
```

Verify: Matches `AgentDisconnected.tsx` implementation — error icon, title, description, reconnect and view output buttons.

- [ ] **Step 3: Screenshot GitHub Auth Expired overlay**

```
CallMcpTool: get_screenshot({nodeId: "OZjaS"})
```

Verify: Matches `GitHubAuthExpired.tsx` implementation — error icon, title, description, re-auth and use PAT buttons.

- [ ] **Step 4: Screenshot Worktree Conflict overlay**

```
CallMcpTool: get_screenshot({nodeId: "ZKKLL"})
```

Verify: Matches `WorktreeConflict.tsx` implementation — error icon, title, description, resolve buttons.

- [ ] **Step 5: Update any mismatches**

If any overlay doesn't match implementation, update the frame content to match.

- [ ] **Step 6: Commit**

```bash
git add design/pidash-ui.pen
git commit -m "design: verify States Flow overlays match implementation"
```

---

### Task 11: Verification Pass — Onboarding Flow

**Files:**
- Modify: `design/pidash-ui.pen` (Onboarding Flow frame)

**Interfaces:**
- Consumes: Existing onboarding screens
- Produces: Verified onboarding flow

- [ ] **Step 1: Load current design state**

```
CallMcpTool: get_app_state({include_schema: true, include_canvas_design: true, include_scripts_and_shaders: false, include_browser: false})
```

- [ ] **Step 2: Screenshot each onboarding screen**

```
CallMcpTool: get_screenshot({nodeId: "gpEIl"})   // WelcomeScreen
CallMcpTool: get_screenshot({nodeId: "pROAd"})   // ScanningScreen
CallMcpTool: get_screenshot({nodeId: "Ik8Au"})   // ResultsScreen
CallMcpTool: get_screenshot({nodeId: "BU3dP"})   // ManualAddScreen
CallMcpTool: get_screenshot({nodeId: "l15TAw"})  // NoAgentsScreen
CallMcpTool: get_screenshot({nodeId: "ey7iI"})   // ReadyScreen
CallMcpTool: get_screenshot({nodeId: "W0tYGn"})  // ScanErrorScreen
```

Verify each against corresponding implementation:
- WelcomeScreen: π logo, title, subtitle, feature cards, buttons
- ScanningScreen: π logo, spinner, title, subtitle, privacy note, cancel button
- ResultsScreen: header, agent list with checkboxes, select/deselect buttons, continue button
- ManualAddScreen: header, path input, browse button, known agent chips, identification result
- NoAgentsScreen: search icon, title, subtitle, popular agent cards, buttons
- ReadyScreen: check circle, title, subtitle, agent list with badges, buttons
- ScanErrorScreen: alert icon, title, subtitle, retry and add manual buttons

- [ ] **Step 3: Update any mismatches**

If any screen doesn't match implementation, update the frame content.

- [ ] **Step 4: Commit**

```bash
git add design/pidash-ui.pen
git commit -m "design: verify Onboarding Flow matches implementation"
```

---

### Task 12: Final Verification & Cleanup

**Files:**
- Modify: `design/pidash-ui.pen` (entire document)

**Interfaces:**
- Consumes: All updated frames and components
- Produces: Clean, verified design file

- [ ] **Step 1: Load current design state**

```
CallMcpTool: get_app_state({include_schema: true, include_canvas_design: true, include_scripts_and_shaders: false, include_browser: false})
```

- [ ] **Step 2: List all top-level frames**

```javascript
Get(n => n.type === "frame" && n.reusable !== true && Print(n.id, "=", n.name))
```

Expected: List of all screen frames in the document.

- [ ] **Step 3: List all reusable components**

```javascript
Get(n => n.reusable && Print(n.id, "=", n.name))
```

Expected: List of all reusable components.

- [ ] **Step 4: Screenshot key updated screens**

```
CallMcpTool: get_screenshot({nodeId: "oxvLJ"})   // Dashboard (with BottomBar)
CallMcpTool: get_screenshot({nodeId: "DFecf"})   // AgentDetailPanel
CallMcpTool: get_screenshot({nodeId: pipContainerId})  // PiP Container
```

- [ ] **Step 5: Verify no placeholder flags remain set**

```javascript
Get(n => n.placeholder === true && Print(n.id, "=", n.name, "has placeholder=true"))
```

Expected: No output (all placeholders cleared).

- [ ] **Step 6: Final commit**

```bash
git add design/pidash-ui.pen
git commit -m "design: final verification pass — all flows synced with implementation"
```
