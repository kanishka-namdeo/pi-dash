# Agent Dashboard Design Spec

## Overview

A high-fidelity, responsive agent orchestration dashboard for the Pi Dash Electron app. The dashboard displays a live command center with simulated agent activity, plan execution, and metrics. All interactions are wired up with realistic behavior, but no actual backend functionality — this is a UI prototype.

**Scope:** Single-page dashboard view with full simulation. No wizard flow, no task creation, no plan review screens.

---

## Architecture

**Approach:** Feature-based with Custom Hooks (Approach 3)

All simulation logic is extracted into dedicated hooks. Components are pure render functions that receive data via props and emit events via callbacks. This provides clean separation between UI and simulation, making each independently testable and easy to swap for real data later.

### File Structure

```
renderer/src/
├── components/
│   ├── dashboard/
│   │   ├── Dashboard.tsx          ← main orchestrator, wires hooks to layout
│   │   ├── Topbar.tsx             ← logo, project name, mode selector, controls
│   │   ├── FleetPanel.tsx         ← agent cards list
│   │   ├── AgentCard.tsx          ← individual agent card
│   │   ├── PlanPanel.tsx          ← active plan with steps
│   │   ├── ActivityFeed.tsx       ← live activity stream
│   │   ├── MetricsFooter.tsx      ← bottom stats bar
│   │   └── AgentDetailPanel.tsx   ← slide-in panel on agent click
│   └── ui/                        ← existing shadcn components
├── hooks/
│   ├── useAgentSimulation.ts      ← agent states, progress ticking, pause/stop
│   ├── useActivityFeed.ts         ← activity generation, auto-append
│   ├── useDashboardMode.ts        ← auto/supervised/manual mode state
│   └── useElapsedTimer.ts         ← elapsed time counter
├── types/
│   └── dashboard.ts               ← Agent, Activity, PlanStep, Mode types
└── data/
    └── mockData.ts                ← seed agents, activities, plan steps
```

### Key Boundaries

- **Hooks** own all state and simulation logic (timers, intervals, random generation)
- **Components** are pure render — they receive data via props, emit events via callbacks
- **Dashboard.tsx** is the only component that calls hooks and passes data down
- **Types** are shared across hooks and components

---

## Data Types

### Agent

```typescript
type Agent = {
  id: string;
  name: string;
  short: string;
  color: string;
  textColor: string;
  status: 'active' | 'idle' | 'paused';
  task: string;
  progress: number;
  files?: string[];
  messages?: { time: string; text: string }[];
}
```

### Activity

```typescript
type Activity = {
  id: string;
  time: string;
  agentId: string;
  action: 'read' | 'write' | 'edit' | 'test' | 'lint' | 'plan';
  description: string;
  file?: string;
}
```

### Mode

```typescript
type Mode = 'auto' | 'supervised' | 'manual';
```

### PlanStep

```typescript
type PlanStep = {
  id: string;
  number: number;
  name: string;
  agentId: string;
  status: 'done' | 'active' | 'pending';
  duration: string;
}
```

### DashboardState

```typescript
type DashboardState = {
  agents: Agent[];
  activities: Activity[];
  mode: Mode;
  isPaused: boolean;
  elapsed: number;
  selectedAgentId?: string;
}
```

Note: `isStopped` is not persistent state — the stop button triggers a reset action across all hooks and the timer restarts immediately.

---

## Simulation Hooks

### useAgentSimulation

Manages agent array, ticks progress every 2s (when not paused), handles pause/stop/reset.

**Returns:**
```typescript
{
  agents: Agent[];
  pause: () => void;
  resume: () => void;
  stop: () => void;
  reset: () => void;
  selectAgent: (id: string) => void;
}
```

**Behavior:**
- Progress ticks up randomly (1-5%) every 2s for active agents
- When agent hits 100%, status flips to 'idle'
- Pause freezes all progress updates
- Stop resets all agents to initial state
- Active agents have green status dot, idle have amber, paused have gray

### useActivityFeed

Generates new activity entries every 3s from a pool of templates. Keeps last 30 entries.

**Parameters:**
```typescript
useActivityFeed(agents: Agent[], isPaused: boolean)
```

**Returns:**
```typescript
{
  activities: Activity[];
  addActivity: (activity: Activity) => void;
}
```

**Behavior:**
- Receives current agents array as input
- Auto-generates entries only from agents with status 'active'
- Each entry has: timestamp, agent ID, action type, description, optional file path
- Actions are color-coded: read (blue), write (emerald), edit (violet), test (amber), lint (gray), plan (blue)
- New entries fade in with 200ms animation
- Auto-scrolls to top when new entries arrive
- Pauses generation when isPaused is true

### useDashboardMode

Manages mode state (auto/supervised/manual).

**Returns:**
```typescript
{
  mode: Mode;
  setMode: (mode: Mode) => void;
}
```

**Behavior:**
- Mode selector is purely visual (no behavior change for now)
- Three modes: auto, supervised, manual
- Active mode is highlighted in topbar

### useElapsedTimer

Counts elapsed seconds when running, pauses when stopped.

**Returns:**
```typescript
{
  elapsed: number;
  start: () => void;
  stop: () => void;
  reset: () => void;
}
```

**Behavior:**
- Increments every second when running
- Pause freezes the counter
- Stop resets to 0
- Formatted as "M:SS" in metrics footer

---

## Component Design

### Dashboard.tsx

Main orchestrator component.

**Responsibilities:**
- Calls all four hooks
- Passes data down to child components via props
- Handles agent selection (opens detail panel)
- Renders the three-column layout: fleet | plan | activity

**Layout:**
- Topbar (fixed height)
- Main content area (flex-1, three columns)
- MetricsFooter (fixed height)
- AgentDetailPanel (absolute positioned, slides in from right)

### Topbar

**Props:**
```typescript
{
  mode: Mode;
  isPaused: boolean;
  onModeChange: (mode: Mode) => void;
  onPause: () => void;
  onStop: () => void;
}
```

**Elements:**
- Logo + "Pi Orchestrator" text (left)
- Project name "pi-dash" in monospace (center-left)
- Mode selector: three buttons (auto/supervised/manual), active state highlighted (center)
- Control buttons: pause (toggles icon), stop (resets dashboard), new task (no-op) (right)

**Interactions:**
- Click mode button → calls `onModeChange(mode)`
- Click pause → calls `onPause()` (toggles between pause/resume)
- Click stop → calls `onStop()` (resets all state)

### FleetPanel

**Props:**
```typescript
{
  agents: Agent[];
  selectedAgentId?: string;
  onSelectAgent: (id: string) => void;
}
```

**Elements:**
- Panel header: "Fleet" label + agent count badge
- Scrollable list of AgentCards

### AgentCard

**Props:**
```typescript
{
  agent: Agent;
  isSelected: boolean;
  onClick: () => void;
}
```

**Elements:**
- Agent icon (colored circle with short name)
- Agent name
- Status dot (green/amber/gray based on status)
- Current task description (monospace, truncated)
- Progress bar (only shown when progress > 0)

**Interactions:**
- Click → calls `onClick()` (opens detail panel)
- Selected card gets highlighted border

### PlanPanel

**Props:**
```typescript
{
  steps: PlanStep[];
  progress: number;
}
```

**Elements:**
- Panel header: "Active Plan" label + step count badge
- Vertical step list with connecting lines
- Each step: number, name, agent badge, status indicator
- Overall progress bar at bottom

**Static data:** Plan steps are mock data for now (not generated by hooks)

### ActivityFeed

**Props:**
```typescript
{
  activities: Activity[];
  agents: Agent[];
}
```

**Elements:**
- Header: "Activity" label + live pulse dot (animated)
- Scrollable list of activity items
- Each item: timestamp, agent badge, action tag (color-coded), description, file path

**Interactions:**
- Auto-scrolls to top when new entries arrive
- Fade-in animation on new items (200ms)

### MetricsFooter

**Props:**
```typescript
{
  progress: number;
  elapsed: number;
  activeAgents: number;
  tokens: number;
}
```

**Elements:**
- Four metrics separated by vertical dividers:
  - Progress % (from plan progress)
  - Elapsed time (formatted as "M:SS")
  - Active agents count
  - Tokens (mock value, amber color)
- All values in monospace font

### AgentDetailPanel

**Props:**
```typescript
{
  agent?: Agent;
  isOpen: boolean;
  onClose: () => void;
}
```

**Elements:**
- Slide-in panel from right (320px width)
- Header: agent icon + name + role, close button
- Sections:
  - Current task
  - Progress bar with percentage
  - Files touched (list of file paths)
  - Messages (timestamped log)

**Interactions:**
- Click close → calls `onClose()`
- Smooth slide animation (300ms ease-out)
- Overlay backdrop (optional)

---

## Responsive Design

### Desktop (1280px+)

**Layout:** Three-column
- Fleet: 280px fixed width
- Plan: flex-1 (fills remaining space)
- Activity: 320px fixed width
- Agent detail panel: slides over from right (320px)

### Tablet (768-1279px)

**Layout:** Two-column
- Fleet: 240px fixed width
- Plan + Activity: stacked vertically (plan on top, activity below)
- Agent detail panel: slides over from right (280px)

### Mobile (<768px)

**Layout:** Single column with tab navigation
- Top tabs: Fleet | Plan | Activity (switches views)
- Agent detail panel: full-screen overlay
- Metrics footer: wraps to two rows if needed

---

## Visual Styling

### Color Palette

- Background: `#0a0a0a`
- Card background: `#1a1a1a`
- Border: `#2a2a2a`
- Text primary: `#e5e5e5`
- Text secondary: `#a3a3a3`
- Text muted: `#737373`

**Accent colors:**
- Emerald (success/active): `#10b981`
- Amber (warning/idle): `#f59e0b`
- Blue (info/read): `#3b82f6`
- Violet (orchestrator/edit): `#8b5cf6`
- Red (danger/stop): `#ef4444`

### Typography

- UI text: Geist (400, 500, 600 weights)
- Monospace (numbers/code): JetBrains Mono (400, 500 weights)

### Animations

- Activity items: fade in (200ms)
- Agent detail panel: slide in from right (300ms ease-out)
- Progress bars: smooth transition (500ms)
- Status dots: pulse animation when active (infinite loop)
- Live pulse dot in activity header: pulse animation (infinite loop)

### Scrollbar

- Custom styled: 6px width
- Track: transparent
- Thumb: `#2a2a2a` with border-radius

---

## Edge Cases

### Empty States

- "No active agents" when all agents are idle
- "No activity yet" on fresh start (before first activity generated)

### Overflow

- Activity feed: scrollable, auto-scrolls to top
- Long task descriptions: truncate with ellipsis
- Long file paths: truncate with ellipsis

### Pause State

- All animations freeze
- Progress bars stop ticking
- Activity feed stops generating new entries
- Elapsed timer stops counting

### Stop State

- Resets all agents to initial state
- Clears activity feed
- Resets elapsed timer to 0
- Resets progress to 0

---

## Mock Data

### Seed Agents (6 agents)

1. Claude Code (active, 72% progress)
2. Cursor (active, 58% progress)
3. Copilot (active, 45% progress)
4. Codex (idle, 0% progress)
5. Gemini (idle, 0% progress)
6. Qwen (idle, 0% progress)

### Seed Activities (10 entries)

Pre-populated activity feed with realistic entries (read, write, edit, test, lint, plan actions)

### Seed Plan Steps (4 steps)

1. Research existing auth patterns (Scout, done)
2. Implement JWT middleware (Worker, active)
3. Build login/logout endpoints (Worker, pending)
4. Review and test (Reviewer, pending)

---

## Implementation Notes

- Use existing shadcn/ui components where possible (Button, Card)
- Use lucide-react for icons
- Use Tailwind CSS for all styling (no custom CSS files)
- Use React hooks for all state management (no external state libraries)
- Use `setInterval` for simulation timers (clean up on unmount)
- Use CSS transitions for animations (no animation libraries)
- Responsive breakpoints use Tailwind's default breakpoints (sm, md, lg, xl)

---

## Future Considerations (Out of Scope)

- Real backend integration (replace simulation hooks with API calls)
- Task creation wizard flow
- Plan review and approval flow
- Completion screen with results
- Agent configuration and management
- Historical task data and analytics
- Settings and preferences
