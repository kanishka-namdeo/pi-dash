# Picture-in-Picture Terminal Grid Design

> **Feature:** Multi-agent terminal grid with draggable overlays  
> **Date:** 2026-08-05  
> **Status:** Approved for implementation

## Overview

Implement a Picture-in-Picture (PiP) terminal layout where one agent occupies the main terminal area and additional agents float as draggable, resizable overlays. This provides clear focus with peripheral awareness of other running agents.

## Design Decisions

### Core Pattern
- **Picture-in-Picture** with draggable overlays
- Main terminal area shows focused agent (or dashboard fallback)
- Floating overlays for additional agents
- Click overlay to promote to main focus

### Library Choice
- **react-rnd** for draggable/resizable overlays
- Mature (4.3k stars, 12 years development)
- Purpose-built for floating windows
- TypeScript support

## Architecture

### Component Hierarchy

```
App
└── PiPProvider (Context)
    ├── Dashboard (consumes usePiP to add overlays)
    ├── PiPContainer
    │   ├── MainTerminal (or Dashboard fallback)
    │   └── OverlayManager
    │       └── AgentOverlay[] (each with xterm.js)
    └── SessionManager (global, persists across navigation)
```

### State Management

**Global PiP State (Context):**
```ts
type PiPState = {
  mainAgentId: string | null;
  overlays: Overlay[];
  sessions: Map<string, SessionState>; // global session tracking
  nextZIndex: number;
};

type Overlay = {
  agentId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  size: 'S' | 'M' | 'L';
};

type SizePreset = {
  S: { width: 280, height: 180 };
  M: { width: 400, height: 260 };
  L: { width: 560, height: 360 };
};
```

### Layout Strategy

- `PiPContainer` uses CSS Grid: `grid-template: 1fr / 1fr` (single cell, full viewport)
- `MainTerminal` fills the grid cell
- `OverlayManager` uses `position: absolute` with `top: 0; left: 0; right: 0; bottom: 0`
- Each `AgentOverlay` is absolutely positioned via react-rnd's internal state

## Interactions

### Main Terminal Area
- Shows active agent's full terminal (xterm.js)
- Clicking agent card in dashboard → sets as `mainAgentId`
- If no agent focused (`mainAgentId === null`), shows dashboard/fleet overview

### Overlay Interactions

1. **Dragging:**
   - Grab overlay header to drag
   - react-rnd handles drag physics
   - `onDragStop` → save new x/y position to state
   - Optional: edge snapping when within 20px of viewport edge

2. **Resizing:**
   - Drag edges/corners to resize
   - `onResizeStop` → save new width/height
   - Preset sizes via double-click or context menu:
     - S: 280x180
     - M: 400x260
     - L: 560x360

3. **Clicking overlay:**
   - Promotes to main focus (swaps with current main)
   - Previous main becomes overlay at old overlay's position
   - Brings overlay to front (increments zIndex)

4. **Z-index management:**
   - Clicking overlay → `nextZIndex++`, assign to that overlay
   - Ensures clicked overlay is always on top

5. **Closing overlay:**
   - X button in overlay header
   - Removes from `overlays` array
   - Does NOT kill the agent session (keeps running in background)

6. **Opening overlay:**
   - Right-click agent card in dashboard → "Open as overlay"
   - Or drag agent card into main area (future enhancement)

### Overlay Content (Configurable)

- **Minimal mode:** Agent name + status indicator only
- **Preview mode:** Last N lines of terminal output (truncated)
- **Rich mode:** Output + activity metrics (CPU, elapsed time)

User can toggle between modes via overlay settings menu.

## Data Flow & IPC Integration

### Existing Infrastructure (already built)
- `SessionManager` manages PTY lifecycle per agent
- IPC bridge routes session traffic by `agentId`
- `useSession` hook handles spawn/write/resize/destroy
- `session.onData` events stream terminal output

### New Data Flow for Overlays

```
Main Process                          Renderer Process
─────────────                         ────────────────
SessionManager                        
  ├─ Session(pi) ──────────────────►  MainTerminal (xterm.js)
  ├─ Session(claude) ──────────────►  Overlay[0] (xterm.js)
  ├─ Session(gemini) ──────────────►  Overlay[1] (xterm.js)
  └─ Session(...) ─────────────────►  Overlay[N] (xterm.js)

IPC Events:
  session:data(agentId, data) ──────► All terminals subscribed
  session:exit(agentId, exitCode) ──► Updates overlay status
```

### Key Integration Points

1. **Multiple xterm.js instances:**
   - Each overlay creates its own `Terminal` instance
   - All instances subscribe to `session.onData` for their `agentId`
   - Filter events by `agentId` to route output correctly

2. **Session lifecycle:**
   - Opening overlay → check if session exists
   - If not, call `session.create(agentId, cwd)`
   - If yes, just attach new xterm.js instance to existing session
   - Closing overlay → do NOT destroy session (keep running in background)

3. **Resize propagation:**
   - When overlay resizes → call `session.resize(agentId, cols, rows)`
   - Ensures PTY dimensions match terminal display
   - Main terminal also resizes independently

4. **State persistence:**
   - Save overlay positions/sizes to `localStorage` or `electron-store`
   - Restore on app restart
   - Optional: save per-workspace (different layouts per project)

### Hook Design

```ts
// New hook for overlay management
function usePiP() {
  const [overlays, setOverlays] = useState<Overlay[]>([]);
  const [mainAgentId, setMainAgentId] = useState<string | null>(null);
  
  const addOverlay = (agentId: string) => {
    // Validation: prevent duplicate agents
    if (mainAgentId === agentId) return;
    if (overlays.some(o => o.agentId === agentId)) return;
    // ... add overlay with default position/size
  };
  
  const removeOverlay = (agentId: string) => { /* ... */ };
  const promoteToMain = (agentId: string) => { /* swap logic */ };
  const updateOverlayPosition = (agentId: string, x: number, y: number) => { /* ... */ };
  const updateOverlaySize = (agentId: string, width: number, height: number) => { /* ... */ };
  
  return { overlays, mainAgentId, addOverlay, removeOverlay, promoteToMain, /* ... */ };
}
```

## Validation & Edge Cases

### Prevent Duplicate Agents
- An agent should be EITHER main OR overlay, not both
- `addOverlay` validates against `mainAgentId` and existing overlays
- `promoteToMain` handles swap atomically

### Session Persistence Across Navigation
- Current `useSession` is tied to TerminalView component lifecycle
- For PiP, sessions need to persist when navigating between dashboard and terminal views
- Solution: lift session management to global context (`PiPProvider`)

### Multiple xterm.js Instances Performance
- Each overlay creates its own xterm.js instance
- With 10 overlays + 1 main = 11 terminals
- Performance considerations:
  - Overlays use smaller scrollback (100 lines vs 1000 for main)
  - Lazy-render overlay content only when visible
  - Consider virtualization if >5 overlays

### State Management Approach
- Existing code uses React hooks without global state library
- For PiP we need global state accessible from dashboard, main terminal, and overlays
- Solution: `PiPContext` at App level with `usePiP()` hook

### Overlay Content Modes
- All overlays render full xterm.js (consistent behavior)
- "Minimal" mode = hide terminal, show status only
- Size presets (S/M/L) control how much terminal is visible

## Implementation Considerations

### Dependencies
```bash
pnpm add react-rnd
```

### New Files
- `renderer/src/context/PiPContext.tsx` — global PiP state
- `renderer/src/components/pip/PiPContainer.tsx` — main layout wrapper
- `renderer/src/components/pip/OverlayManager.tsx` — renders all overlays
- `renderer/src/components/pip/AgentOverlay.tsx` — individual overlay with react-rnd
- `renderer/src/hooks/usePiP.ts` — hook for accessing PiP state

### Modified Files
- `renderer/src/App.tsx` — wrap with `PiPProvider`
- `renderer/src/components/dashboard/Dashboard.tsx` — add "Open as overlay" action
- `renderer/src/components/terminal/TerminalView.tsx` — integrate with PiP context

### Testing Strategy
- Unit tests for `usePiP` hook (state management, validation)
- Integration tests for overlay interactions (drag, resize, promote)
- E2E tests for session lifecycle with overlays
- Performance tests with 10+ overlays

## Future Enhancements

- Edge snapping (snap to left/right/top/bottom when within 20px)
- Drag agent cards from dashboard to create overlays
- Workspace-specific layouts (different overlay configs per project)
- Overlay grouping (group multiple overlays together)
- Minimize overlay to icon (collapse to corner)
- Overlay templates (save/load overlay configurations)

## Success Criteria

- [ ] Main terminal shows focused agent or dashboard fallback
- [ ] Overlays are draggable with react-rnd
- [ ] Overlays are resizable with preset sizes (S/M/L)
- [ ] Clicking overlay promotes to main focus
- [ ] Overlay content is configurable (minimal/preview/rich)
- [ ] Sessions persist across navigation
- [ ] No duplicate agents (main OR overlay, not both)
- [ ] Overlay positions persist across app restarts
- [ ] Performance acceptable with 10+ overlays
