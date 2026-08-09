# Dashboard Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add collapsible panels, terminal header with close button, restart button on exited agents, and keyboard shortcut handler to match the Pencil design (Variant G).

**Architecture:** Dashboard owns collapse state for FleetPanel, ActivitySection, and PlanPanel. Collapsed variants render as icon rails. TerminalSection expands to fill freed space. TerminalPanel gets a header bar. AgentCard differentiates "never launched" vs "exited" states.

**Tech Stack:** React state, Tailwind, lucide-react icons

## Global Constraints

- Package manager: **pnpm**
- Collapse state lives in Dashboard, passed as props
- Collapsed panels use the same components with different widths — no separate collapsed components
- TerminalSection fills remaining space via `flex-1`
- Follow existing patterns: CSS custom properties for colors, Tailwind for layout

---

### Task 1: Add Collapse State to Dashboard

**Files:**
- Modify: `renderer/src/components/dashboard/Dashboard.tsx`

**Interfaces:**
- Consumes: Nothing
- Produces: `collapsedPanels: Set<string>`, `toggleCollapse: (panel: string) => void`

- [ ] **Step 1: Add collapse state**

In `Dashboard.tsx`, add state:

```typescript
const [collapsedPanels, setCollapsedPanels] = useState<Set<string>>(new Set());

const toggleCollapse = useCallback((panel: string) => {
  setCollapsedPanels(prev => {
    const next = new Set(prev);
    if (next.has(panel)) {
      next.delete(panel);
    } else {
      next.add(panel);
    }
    return next;
  });
}, []);
```

- [ ] **Step 2: Pass collapse props to child components**

Add to FleetPanel, ActivityFeed, PlanPanel props:
- `isCollapsed: boolean`
- `onToggleCollapse: () => void`

- [ ] **Step 3: Commit**

```bash
git add renderer/src/components/dashboard/Dashboard.tsx
git commit -m "feat: add collapse state to Dashboard"
```

---

### Task 2: Make FleetPanel Collapsible

**Files:**
- Modify: `renderer/src/components/dashboard/FleetPanel.tsx`

**Interfaces:**
- Consumes: `isCollapsed`, `onToggleCollapse`
- Produces: Collapsed rail (48px) with agent avatars

- [ ] **Step 1: Add collapse props to FleetPanelProps**

```typescript
type FleetPanelProps = {
  // ... existing props
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
};
```

- [ ] **Step 2: Conditionally render collapsed rail**

When `isCollapsed`:
- Width: `48px` (instead of `280px`)
- Show only agent avatar circles (no names, no buttons)
- Show collapse/expand toggle button at bottom
- Hide Running/Available headers

When expanded:
- Render as normal (current implementation)

- [ ] **Step 3: Add toggle button**

Add a small button (chevron icon) that calls `onToggleCollapse`. Position at bottom of panel.

- [ ] **Step 4: Update Dashboard to pass props**

```typescript
<FleetPanel
  // ... existing props
  isCollapsed={collapsedPanels.has('fleet')}
  onToggleCollapse={() => toggleCollapse('fleet')}
/>
```

- [ ] **Step 5: Commit**

```bash
git add renderer/src/components/dashboard/FleetPanel.tsx
git commit -m "feat: make FleetPanel collapsible with icon rail"
```

---

### Task 3: Make ActivitySection Collapsible

**Files:**
- Modify: `renderer/src/components/dashboard/ActivityFeed.tsx`

**Interfaces:**
- Consumes: `isCollapsed`, `onToggleCollapse`
- Produces: Collapsed rail (36px) with live dot and count

- [ ] **Step 1: Add collapse props**

```typescript
type ActivityFeedProps = {
  // ... existing props
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
};
```

- [ ] **Step 2: Conditionally render collapsed rail**

When `isCollapsed`:
- Width: `36px`
- Show: live dot (green), event count badge, expand button
- Hide: feed list, header

When expanded:
- Render as normal

- [ ] **Step 3: Update Dashboard**

```typescript
<ActivityFeed
  // ... existing props
  isCollapsed={collapsedPanels.has('activity')}
  onToggleCollapse={() => toggleCollapse('activity')}
/>
```

- [ ] **Step 4: Commit**

```bash
git add renderer/src/components/dashboard/ActivityFeed.tsx
git commit -m "feat: make ActivitySection collapsible with live indicator"
```

---

### Task 4: Make PlanPanel Collapsible

**Files:**
- Modify: `renderer/src/components/dashboard/PlanPanel.tsx`

**Interfaces:**
- Consumes: `isCollapsed`, `onToggleCollapse`
- Produces: Collapsed bar (44px) with title, progress, expand button

- [ ] **Step 1: Add collapse props**

```typescript
type PlanPanelProps = {
  // ... existing props
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
};
```

- [ ] **Step 2: Conditionally render collapsed bar**

When `isCollapsed`:
- Height: `44px` (instead of `200px`)
- Show: "Plan" title, step count, progress bar, expand button
- Hide: individual step list

When expanded:
- Render as normal

- [ ] **Step 3: Update Dashboard**

```typescript
<PlanPanel
  steps={mockSteps}
  progress={hasAgents ? progress : 0}
  isCollapsed={collapsedPanels.has('plan')}
  onToggleCollapse={() => toggleCollapse('plan')}
/>
```

- [ ] **Step 4: Commit**

```bash
git add renderer/src/components/dashboard/PlanPanel.tsx
git commit -m "feat: make PlanPanel collapsible with progress bar"
```

---

### Task 5: Add TerminalPanel Header

**Files:**
- Modify: `renderer/src/components/dashboard/TerminalPanel.tsx`

**Interfaces:**
- Consumes: `agentId`, agent name from availableAgents
- Produces: Header bar with agent name, status, close button

- [ ] **Step 1: Add agent name prop**

```typescript
type TerminalPanelProps = {
  agentId: string | null;
  agentName?: string;
  onClose?: () => void;
};
```

- [ ] **Step 2: Add header bar**

When `agentId` is set, render header above TerminalView:

```typescript
<div className="flex items-center justify-between px-4 h-10" style={{ backgroundColor: 'var(--card)', borderBottom: `1px solid var(--border)` }}>
  <span className="text-sm font-mono" style={{ color: 'var(--text-primary)' }}>{agentName || agentId}</span>
  <div className="flex items-center gap-2">
    <span className="text-xs" style={{ color: 'var(--accent-emerald)' }}>● Running</span>
    <button onClick={onClose} className="p-1 rounded hover:bg-white/10">
      <X size={14} />
    </button>
  </div>
</div>
```

- [ ] **Step 3: Update Dashboard to pass props**

```typescript
<TerminalPanel
  agentId={selectedAgentId}
  agentName={selectedAgent?.name}
  onClose={() => setSelectedAgentId(null)}
/>
```

- [ ] **Step 4: Commit**

```bash
git add renderer/src/components/dashboard/TerminalPanel.tsx
git commit -m "feat: add TerminalPanel header with close button"
```

---

### Task 6: Add Restart Button to AgentCard

**Files:**
- Modify: `renderer/src/components/dashboard/AgentCard.tsx`

**Interfaces:**
- Consumes: `status` prop ('active' | 'idle' | 'exited')
- Produces: "Restart" button when exited

- [ ] **Step 1: Update AgentCardProps**

```typescript
type AgentCardProps = {
  // ... existing
  status?: 'active' | 'idle' | 'exited';
};
```

- [ ] **Step 2: Add restart button**

In the button row, when `!isRunning && status === 'exited'`:
- Show "Restart" button (same style as Launch but with RotateCcw icon)
- Keep PiP button

- [ ] **Step 3: Update Dashboard to pass status**

In `sessionToAgent` mapping, set `status: s.state === 'running' ? 'active' : 'exited'` for sessions that have exited.

- [ ] **Step 4: Commit**

```bash
git add renderer/src/components/dashboard/AgentCard.tsx renderer/src/components/dashboard/Dashboard.tsx
git commit -m "feat: add Restart button to exited agent cards"
```

---

### Task 7: Wire Keyboard Shortcut (Ctrl+L)

**Files:**
- Modify: `renderer/src/App.tsx` or wherever shortcut events are handled

**Interfaces:**
- Consumes: `shortcut` IPC event from main process
- Produces: Launch first available agent

- [ ] **Step 1: Find or create shortcut handler**

Search for existing `shortcut` event listener. If none exists, add one in App.tsx:

```typescript
useEffect(() => {
  const unsub = window.api.onShortcut?.((action: string) => {
    if (action === 'launchAgent') {
      // Launch first available agent
      const firstAvailable = availableAgents.find(a => !runningSessions.some(s => s.agentId === a.id));
      if (firstAvailable) {
        handleLaunch(firstAvailable.id);
      }
    }
  });
  return unsub;
}, [availableAgents, runningSessions, handleLaunch]);
```

- [ ] **Step 2: Verify preload exposes onShortcut**

Check if `preload.ts` has `onShortcut` binding. If not, add:

```typescript
onShortcut: (callback: (action: string) => void) => {
  const handler = (_event: any, action: string) => callback(action);
  ipcRenderer.on('shortcut', handler);
  return () => ipcRenderer.removeListener('shortcut', handler);
},
```

- [ ] **Step 3: Commit**

```bash
git add renderer/src/App.tsx src/preload.ts
git commit -m "feat: wire Ctrl+L keyboard shortcut to launch agent"
```

---

### Task 8: Verify End-to-End

- [ ] **Step 1: Start dev server**

Run: `pnpm dev`

- [ ] **Step 2: Verify collapse behavior**

1. Click collapse button on FleetPanel → shrinks to 48px rail
2. Click collapse on ActivitySection → shrinks to 36px
3. Click collapse on PlanPanel → shrinks to 44px bar
4. TerminalSection expands to fill freed space
5. Click expand buttons → panels restore

- [ ] **Step 3: Verify terminal header**

1. Launch agent → terminal shows header with name + status + close button
2. Click close → terminal deselects, shows empty state

- [ ] **Step 4: Verify restart button**

1. Launch agent, then kill it (or let it exit)
2. Agent card shows "Restart" instead of "Launch"
3. Click Restart → new session starts

- [ ] **Step 5: Verify keyboard shortcut**

1. Press Ctrl+L → first available agent launches

- [ ] **Step 6: Run tests**

Run: `pnpm test`
Expected: All tests pass
