# Dashboard Rewrite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Full rewrite of the main dashboard to match the Pencil design exactly, with design tokens, unified AgentCard, and real session data.

**Architecture:** Three-column layout (FleetPanel 280px | PlanPanel flex | ActivityFeed 320px) with TopBar header and MetricsFooter. Unified AgentCard component with variant prop for running/available states. CSS custom properties for all design tokens.

**Tech Stack:** React 18, TypeScript, Tailwind CSS v4, lucide-react icons, react-router-dom v6

## Global Constraints

- All colors, spacing, typography, and radii use CSS custom properties (no hardcoded hex in components)
- Components reference tokens via `var(--token-name)`
- Unified AgentCard with `variant: 'running' | 'available'` prop
- Real session data from SessionContext, mock plan steps
- Routing: Dashboard at `/`, Terminal at `/terminal`
- No new npm dependencies

---

### Task 1: Design Token System

**Files:**
- Modify: `renderer/src/index.css`

**Interfaces:**
- Produces: CSS custom properties `--bg`, `--card`, `--border`, `--text-primary`, `--text-secondary`, `--text-muted`, `--accent-blue`, `--accent-emerald`, `--accent-amber`, `--accent-indigo`, `--accent-rose`, `--launch-btn`, `--state-hover`, `--state-pressed`, `--font-ui`, `--font-mono`, `--text-xs` through `--text-lg`, `--space-1` through `--space-6`, `--radius-sm` through `--radius-full`

- [ ] **Step 1: Add design tokens to index.css**

Open `renderer/src/index.css` and add the following CSS custom properties at the top of the file (after the `@import "tailwindcss";` line):

```css
:root {
  /* Colors */
  --bg: #0a0a0a;
  --card: #1a1a1a;
  --border: #2a2a2a;
  --text-primary: #e5e5e5;
  --text-secondary: #a3a3a3;
  --text-muted: #737373;
  
  /* Accents */
  --accent-blue: #3b82f6;
  --accent-emerald: #10b981;
  --accent-amber: #f59e0b;
  --accent-indigo: #4f46e5;
  --accent-rose: #f43f5e;
  --launch-btn: #0066cc;
  
  /* States */
  --state-hover: #ffffff0d;
  --state-pressed: #ffffff14;
  
  /* Typography */
  --font-ui: 'Geist', system-ui, sans-serif;
  --font-mono: 'Geist Mono', 'Monaco', monospace;
  --text-xs: 10px;
  --text-sm: 12px;
  --text-base: 13px;
  --text-md: 14px;
  --text-lg: 16px;
  
  /* Spacing */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  
  /* Radii */
  --radius-sm: 4px;
  --radius-md: 6px;
  --radius-lg: 8px;
  --radius-xl: 12px;
  --radius-full: 999px;
}
```

- [ ] **Step 2: Verify tokens are accessible**

Run: `pnpm dev` and open the app in browser. Open DevTools and check that `var(--bg)` resolves to `#0a0a0a` in the computed styles.

Expected: Tokens are defined and accessible.

- [ ] **Step 3: Commit**

```bash
git add renderer/src/index.css
git commit -m "feat: add design token system to index.css"
```

---

### Task 2: AgentCard Component (Unified)

**Files:**
- Create: `renderer/src/components/dashboard/AgentCard.tsx`
- Delete: `renderer/src/components/dashboard/RunningAgentCard.tsx`
- Delete: `renderer/src/components/dashboard/AvailableAgentCard.tsx`

**Interfaces:**
- Consumes: Design tokens from Task 1
- Produces: `AgentCard` component with props `{ variant: 'running' | 'available', name: string, avatar: { letter: string, color: string }, cwd?: string, status?: 'active' | 'idle', onFocus?: () => void, onLaunch?: () => void, onPiP?: () => void }`

- [ ] **Step 1: Create AgentCard component**

Create `renderer/src/components/dashboard/AgentCard.tsx`:

```typescript
import { Focus, PictureInPicture2, Play } from 'lucide-react';

type AgentCardProps = {
  variant: 'running' | 'available';
  name: string;
  avatar: { letter: string; color: string };
  cwd?: string;
  path?: string;
  status?: 'active' | 'idle';
  onFocus?: () => void;
  onLaunch?: () => void;
  onPiP?: () => void;
};

export function AgentCard({
  variant,
  name,
  avatar,
  cwd,
  path,
  status,
  onFocus,
  onLaunch,
  onPiP,
}: AgentCardProps) {
  const isRunning = variant === 'running';

  return (
    <div
      className="p-3 rounded-xl flex flex-col gap-2"
      style={{
        backgroundColor: 'var(--card)',
        border: `1px solid var(--border)`,
      }}
    >
      {/* Top row: Avatar + Info */}
      <div className="flex items-center gap-2.5">
        {/* Avatar */}
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold text-white flex-shrink-0"
          style={{ backgroundColor: avatar.color }}
        >
          {avatar.letter}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div
            className="text-sm font-semibold truncate"
            style={{ color: 'var(--text-primary)' }}
          >
            {name}
          </div>
          {isRunning && cwd && (
            <div
              className="text-xs font-mono truncate"
              style={{ color: 'var(--text-muted)' }}
            >
              {cwd}
            </div>
          )}
          {!isRunning && path && (
            <div
              className="text-xs font-mono truncate"
              style={{ color: 'var(--text-muted)' }}
            >
              {path}
            </div>
          )}
        </div>

        {/* Status dot (running only) */}
        {isRunning && status && (
          <div
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{
              backgroundColor:
                status === 'active' ? 'var(--accent-emerald)' : 'var(--text-muted)',
            }}
          />
        )}
      </div>

      {/* Button row */}
      <div className="flex gap-2">
        {isRunning ? (
          <>
            <button
              onClick={onFocus}
              className="flex-1 flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs transition-colors"
              style={{
                backgroundColor: 'var(--bg)',
                border: `1px solid var(--border)`,
                color: 'var(--text-secondary)',
              }}
            >
              <Focus size={13} />
              Focus
            </button>
            <button
              onClick={onPiP}
              className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs transition-colors"
              style={{
                backgroundColor: 'var(--bg)',
                border: `1px solid var(--border)`,
                color: 'var(--text-secondary)',
              }}
            >
              <PictureInPicture2 size={13} />
              PiP
            </button>
          </>
        ) : (
          <>
            <button
              onClick={onLaunch}
              className="flex-1 flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-md text-xs font-medium text-white transition-colors"
              style={{ backgroundColor: 'var(--launch-btn)' }}
            >
              <Play size={13} />
              Launch
            </button>
            <button
              onClick={onPiP}
              className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs transition-colors"
              style={{
                backgroundColor: 'var(--bg)',
                border: `1px solid var(--border)`,
                color: 'var(--text-secondary)',
              }}
            >
              <PictureInPicture2 size={13} />
              PiP
            </button>
          </>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Delete old card components**

```bash
rm renderer/src/components/dashboard/RunningAgentCard.tsx
rm renderer/src/components/dashboard/AvailableAgentCard.tsx
```

- [ ] **Step 3: Verify component compiles**

Run: `pnpm dev`
Expected: No TypeScript errors. AgentCard is importable.

- [ ] **Step 4: Commit**

```bash
git add renderer/src/components/dashboard/AgentCard.tsx
git rm renderer/src/components/dashboard/RunningAgentCard.tsx
git rm renderer/src/components/dashboard/AvailableAgentCard.tsx
git commit -m "feat: unified AgentCard component with variant prop"
```

---

### Task 3: StepItem Component

**Files:**
- Create: `renderer/src/components/dashboard/StepItem.tsx`

**Interfaces:**
- Consumes: Design tokens from Task 1
- Produces: `StepItem` component with props `{ step: { number: number, name: string, agentId: string, status: 'done' | 'active' | 'pending', duration: string }, isLast: boolean }`

- [ ] **Step 1: Create StepItem component**

Create `renderer/src/components/dashboard/StepItem.tsx`:

```typescript
import { Check } from 'lucide-react';

type Step = {
  number: number;
  name: string;
  agentId: string;
  status: 'done' | 'active' | 'pending';
  duration: string;
};

type StepItemProps = {
  step: Step;
  isLast: boolean;
};

export function StepItem({ step, isLast }: StepItemProps) {
  const { number, name, agentId, status, duration } = step;

  return (
    <div className="relative flex gap-3">
      {/* Connector line */}
      {!isLast && (
        <div
          className="absolute left-4 top-8 bottom-[-16px] w-0.5"
          style={{ backgroundColor: 'var(--border)' }}
        />
      )}

      {/* Circle */}
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-medium"
        style={{
          backgroundColor:
            status === 'done'
              ? 'rgba(16, 185, 129, 0.2)'
              : status === 'active'
                ? 'rgba(59, 130, 246, 0.2)'
                : 'var(--card)',
          color:
            status === 'done'
              ? 'var(--accent-emerald)'
              : status === 'active'
                ? 'var(--accent-blue)'
                : 'var(--text-muted)',
          border: status === 'active' ? `2px solid var(--accent-blue)` : 'none',
        }}
      >
        {status === 'done' ? <Check size={14} /> : number}
      </div>

      {/* Content */}
      <div className="flex-1 pt-1">
        <div className="text-sm" style={{ color: 'var(--text-primary)' }}>
          {name}
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span
            className="text-xs font-mono px-2 py-0.5 rounded"
            style={{
              backgroundColor: 'var(--card)',
              color: 'var(--text-muted)',
            }}
          >
            {agentId}
          </span>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {duration}
          </span>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify component compiles**

Run: `pnpm dev`
Expected: No TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add renderer/src/components/dashboard/StepItem.tsx
git commit -m "feat: StepItem component for plan steps"
```

---

### Task 4: MetricsFooter Component

**Files:**
- Modify: `renderer/src/components/dashboard/MetricsFooter.tsx`

**Interfaces:**
- Consumes: Design tokens from Task 1
- Produces: `MetricsFooter` component with props `{ elapsed: number, activeAgents: number, totalCommands: number }`

- [ ] **Step 1: Rewrite MetricsFooter with design tokens**

Replace the entire contents of `renderer/src/components/dashboard/MetricsFooter.tsx`:

```typescript
type MetricsFooterProps = {
  elapsed: number;
  activeAgents: number;
  totalCommands: number;
};

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function MetricsFooter({ elapsed, activeAgents, totalCommands }: MetricsFooterProps) {
  return (
    <footer
      className="flex items-center gap-6 px-6 h-10"
      style={{
        backgroundColor: 'var(--bg)',
        borderTop: `1px solid var(--border)`,
      }}
    >
      <div className="flex items-center gap-2">
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
          Elapsed
        </span>
        <span
          className="text-xs font-mono tabular-nums"
          style={{ color: 'var(--text-primary)' }}
        >
          {formatElapsed(elapsed)}
        </span>
      </div>

      <div className="w-px h-4" style={{ backgroundColor: 'var(--border)' }} />

      <div className="flex items-center gap-2">
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
          Agents
        </span>
        <span
          className="text-xs font-mono tabular-nums"
          style={{ color: 'var(--text-primary)' }}
        >
          {activeAgents}
        </span>
      </div>

      <div className="w-px h-4" style={{ backgroundColor: 'var(--border)' }} />

      <div className="flex items-center gap-2">
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
          Commands
        </span>
        <span
          className="text-xs font-mono tabular-nums"
          style={{ color: 'var(--text-primary)' }}
        >
          {totalCommands.toLocaleString()}
        </span>
      </div>
    </footer>
  );
}
```

- [ ] **Step 2: Verify component renders**

Run: `pnpm dev`
Expected: MetricsFooter renders with design tokens.

- [ ] **Step 3: Commit**

```bash
git add renderer/src/components/dashboard/MetricsFooter.tsx
git commit -m "feat: MetricsFooter with design tokens"
```

---

### Task 5: ActivityFeed Component

**Files:**
- Modify: `renderer/src/components/dashboard/ActivityFeed.tsx`

**Interfaces:**
- Consumes: Design tokens from Task 1, `FeedEvent` type from `@/types/dashboard`
- Produces: `ActivityFeed` component with props `{ events: FeedEvent[], isPaused: boolean }`

- [ ] **Step 1: Rewrite ActivityFeed with design tokens**

Replace the entire contents of `renderer/src/components/dashboard/ActivityFeed.tsx`:

```typescript
import { useAgents } from '@/hooks/useAgents';
import { useSessionContext } from '@/context/SessionContext';
import type { FeedEvent } from '@/types/dashboard';

const eventTypeStyles: Record<FeedEvent['type'], { bg: string; label: string }> = {
  'session:started': { bg: 'rgba(16, 185, 129, 0.2)', label: 'Started' },
  'session:exited': { bg: 'rgba(244, 63, 94, 0.2)', label: 'Exited' },
  'command': { bg: 'rgba(59, 130, 246, 0.2)', label: 'Command' },
};

const eventTypeColors: Record<FeedEvent['type'], string> = {
  'session:started': 'var(--accent-emerald)',
  'session:exited': 'var(--accent-rose)',
  'command': 'var(--accent-blue)',
};

function formatTimestamp(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

type ActivityFeedProps = {
  events: FeedEvent[];
  isPaused: boolean;
};

export function ActivityFeed({ events, isPaused }: ActivityFeedProps) {
  const { agents } = useAgents();
  const { getSession } = useSessionContext();

  const getAgentName = (agentId: string) =>
    agents.find((a) => a.id === agentId)?.name ?? agentId;

  const reversedEvents = [...events].reverse();

  return (
    <aside
      className={`w-full lg:w-[320px] flex flex-col ${isPaused ? 'opacity-60' : ''}`}
      style={{
        backgroundColor: 'var(--bg)',
        borderLeft: `1px solid var(--border)`,
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: `1px solid var(--border)` }}
      >
        <span
          className="text-sm font-semibold"
          style={{ color: 'var(--text-primary)' }}
        >
          Activity
        </span>
        <div
          className="flex items-center gap-1.5 px-2 py-0.5 rounded"
          style={{ backgroundColor: 'rgba(16, 185, 129, 0.2)' }}
        >
          <div
            className="w-1.5 h-1.5 rounded-full animate-pulse"
            style={{ backgroundColor: 'var(--accent-emerald)' }}
          />
          <span
            className="text-xs"
            style={{ color: 'var(--accent-emerald)' }}
          >
            Live
          </span>
        </div>
      </div>

      {/* Event list */}
      <div className="flex-1 overflow-y-auto">
        {reversedEvents.length === 0 ? (
          <div
            className="flex items-center justify-center h-full text-sm"
            style={{ color: 'var(--text-muted)' }}
          >
            No activity yet
          </div>
        ) : (
          reversedEvents.map((event) => {
            const style = eventTypeStyles[event.type];
            const color = eventTypeColors[event.type];
            const agentName = getAgentName(event.agentId);

            return (
              <div
                key={event.id}
                className="flex gap-2.5 px-4 py-2.5"
                style={{ borderBottom: `1px solid var(--border)` }}
              >
                {/* Badge */}
                <span
                  className="px-1.5 py-0.5 rounded text-xs font-medium flex-shrink-0 h-fit"
                  style={{ backgroundColor: style.bg, color }}
                >
                  {style.label}
                </span>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div
                    className="text-xs font-mono truncate"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {event.command || event.type}
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span
                      className="text-xs font-mono"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      {agentName}
                    </span>
                    <span style={{ color: 'var(--text-muted)' }}>·</span>
                    <span
                      className="text-xs font-mono"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      {formatTimestamp(event.timestamp)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}
```

- [ ] **Step 2: Verify component renders**

Run: `pnpm dev`
Expected: ActivityFeed renders with design tokens and live badge.

- [ ] **Step 3: Commit**

```bash
git add renderer/src/components/dashboard/ActivityFeed.tsx
git commit -m "feat: ActivityFeed with design tokens"
```

---

### Task 6: PlanPanel Component

**Files:**
- Modify: `renderer/src/components/dashboard/PlanPanel.tsx`

**Interfaces:**
- Consumes: Design tokens from Task 1, `StepItem` from Task 3, `PlanStep` type from `@/types/dashboard`
- Produces: `PlanPanel` component with props `{ steps: PlanStep[], progress: number }`

- [ ] **Step 1: Rewrite PlanPanel with design tokens and StepItem**

Replace the entire contents of `renderer/src/components/dashboard/PlanPanel.tsx`:

```typescript
import type { PlanStep } from '@/types/dashboard';
import { StepItem } from './StepItem';

type PlanPanelProps = {
  steps: PlanStep[];
  progress: number;
};

export function PlanPanel({ steps, progress }: PlanPanelProps) {
  return (
    <section
      className="flex-1 flex flex-col"
      style={{
        backgroundColor: 'var(--bg)',
        borderRight: `1px solid var(--border)`,
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: `1px solid var(--border)` }}
      >
        <span
          className="text-sm font-semibold"
          style={{ color: 'var(--text-primary)' }}
        >
          Active Plan
        </span>
        <span
          className="text-xs font-mono px-2 py-0.5 rounded"
          style={{
            backgroundColor: 'var(--card)',
            color: 'var(--text-muted)',
          }}
        >
          {steps.length} steps
        </span>
      </div>

      {/* Steps list */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-4">
          {steps.map((step, index) => (
            <StepItem
              key={step.id}
              step={step}
              isLast={index === steps.length - 1}
            />
          ))}
        </div>
      </div>

      {/* Progress section */}
      <div
        className="px-4 py-3"
        style={{ borderTop: `1px solid var(--border)` }}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Progress
          </span>
          <span
            className="text-xs font-mono"
            style={{ color: 'var(--text-primary)' }}
          >
            {progress}%
          </span>
        </div>
        <div
          className="h-1.5 rounded-full overflow-hidden"
          style={{ backgroundColor: 'var(--border)' }}
        >
          <div
            className="h-full transition-all duration-500"
            style={{
              width: `${progress}%`,
              backgroundColor: 'var(--accent-emerald)',
            }}
          />
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Verify component renders**

Run: `pnpm dev`
Expected: PlanPanel renders with steps and progress bar.

- [ ] **Step 3: Commit**

```bash
git add renderer/src/components/dashboard/PlanPanel.tsx
git commit -m "feat: PlanPanel with design tokens and StepItem"
```

---

### Task 7: FleetPanel Component

**Files:**
- Modify: `renderer/src/components/dashboard/FleetPanel.tsx`

**Interfaces:**
- Consumes: Design tokens from Task 1, `AgentCard` from Task 2, `SessionInfo` from `@/context/SessionContext`, `AgentConfig` from `@/types/session`
- Produces: `FleetPanel` component with props `{ runningSessions: SessionInfo[], availableAgents: AgentConfig[], onFocus: (agentId: string) => void, onLaunch: (agentId: string) => void, onOpenAsOverlay: (agentId: string) => void }`

- [ ] **Step 1: Rewrite FleetPanel with unified AgentCard**

Replace the entire contents of `renderer/src/components/dashboard/FleetPanel.tsx`:

```typescript
import type { SessionInfo } from '@/context/SessionContext';
import type { AgentConfig } from '@/types/session';
import { AgentCard } from './AgentCard';

type FleetPanelProps = {
  runningSessions: SessionInfo[];
  availableAgents: AgentConfig[];
  onFocus: (agentId: string) => void;
  onLaunch: (agentId: string) => void;
  onOpenAsOverlay: (agentId: string) => void;
};

export function FleetPanel({
  runningSessions,
  availableAgents,
  onFocus,
  onLaunch,
  onOpenAsOverlay,
}: FleetPanelProps) {
  return (
    <aside
      className="w-full md:w-[240px] lg:w-[280px] flex flex-col"
      style={{
        backgroundColor: 'var(--bg)',
        borderRight: `1px solid var(--border)`,
      }}
    >
      {/* Running section */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: `1px solid var(--border)` }}
      >
        <span
          className="text-sm font-semibold"
          style={{ color: 'var(--text-primary)' }}
        >
          Running
        </span>
        <span
          className="text-xs font-mono px-2 py-0.5 rounded"
          style={{
            backgroundColor: 'var(--card)',
            color: 'var(--text-muted)',
          }}
        >
          {runningSessions.length}
        </span>
      </div>
      <div
        className="max-h-[40%] overflow-y-auto px-3 py-2 space-y-2"
        style={{ borderBottom: `1px solid var(--border)` }}
      >
        {runningSessions.length === 0 && (
          <div
            className="text-xs text-center py-4"
            style={{ color: 'var(--text-muted)' }}
          >
            No running agents
          </div>
        )}
        {runningSessions.map((session) => (
          <AgentCard
            key={session.agentId}
            variant="running"
            name={session.agentId}
            avatar={{
              letter: session.agentId[0].toUpperCase(),
              color: 'var(--accent-indigo)',
            }}
            cwd={session.cwd || undefined}
            status={session.state === 'running' ? 'active' : 'idle'}
            onFocus={() => onFocus(session.agentId)}
            onPiP={() => onOpenAsOverlay(session.agentId)}
          />
        ))}
      </div>

      {/* Available section */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: `1px solid var(--border)` }}
           >
        <span
          className="text-sm font-semibold"
          style={{ color: 'var(--text-primary)' }}
        >
          Available
        </span>
        <span
          className="text-xs font-mono px-2 py-0.5 rounded"
          style={{
            backgroundColor: 'var(--card)',
            color: 'var(--text-muted)',
          }}
        >
          {availableAgents.length}
        </span>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
        {availableAgents.length === 0 && (
          <div
            className="flex flex-col items-center justify-center h-full p-8 text-center"
          >
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center mb-4"
              style={{ backgroundColor: 'var(--card)' }}
            >
              <svg
                className="w-6 h-6"
                style={{ color: 'var(--text-muted)' }}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
            <p className="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>
              No agents
            </p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Add agents to get started
            </p>
          </div>
        )}
        {availableAgents.map((agent) => (
          <AgentCard
            key={agent.id}
            variant="available"
            name={agent.name}
            avatar={{
              letter: agent.name[0].toUpperCase(),
              color: agent.color || 'var(--accent-emerald)',
            }}
            path={agent.path}
            onLaunch={() => onLaunch(agent.id)}
            onPiP={() => onOpenAsOverlay(agent.id)}
          />
        ))}
      </div>
    </aside>
  );
}
```

- [ ] **Step 2: Verify component renders**

Run: `pnpm dev`
Expected: FleetPanel renders with Running/Available sections and AgentCards.

- [ ] **Step 3: Commit**

```bash
git add renderer/src/components/dashboard/FleetPanel.tsx
git commit -m "feat: FleetPanel with unified AgentCard"
```

---

### Task 8: TopBar Component

**Files:**
- Modify: `renderer/src/components/dashboard/Topbar.tsx`

**Interfaces:**
- Consumes: Design tokens from Task 1, `Mode` from `@/types/dashboard`, `ViewMode` from `@/types/pip`
- Produces: `TopBar` component with props for mode, viewMode, feed controls, navigation

- [ ] **Step 1: Rewrite TopBar with design tokens**

Replace the entire contents of `renderer/src/components/dashboard/Topbar.tsx`:

```typescript
import { useNavigate } from 'react-router-dom';
import {
  Pause,
  Play,
  GitBranch,
  LayoutDashboard,
  Monitor,
  Trash2,
  Link,
  Bell,
  Settings,
  HelpCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import type { Mode } from '@/types/dashboard';
import type { ViewMode } from '@/types/pip';

type TopBarProps = {
  mode: Mode;
  viewMode: ViewMode;
  isFeedPaused: boolean;
  hasMainAgent: boolean;
  onModeChange: (mode: Mode) => void;
  onSetViewMode: (mode: ViewMode) => void;
  onToggleFeedPause: () => void;
  onClearFeed: () => void;
};

export function TopBar({
  mode,
  viewMode,
  isFeedPaused,
  onModeChange,
  onSetViewMode,
  onToggleFeedPause,
  onClearFeed,
}: TopBarProps) {
  const navigate = useNavigate();

  return (
    <header
      className="flex items-center justify-between px-6 h-14"
      style={{
        backgroundColor: 'var(--bg)',
        borderBottom: `1px solid var(--border)`,
      }}
    >
      {/* Left: Status + Title */}
      <div className="flex items-center gap-4">
        <div
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: 'var(--accent-emerald)' }}
        />
        <span
          className="text-base font-semibold"
          style={{ color: 'var(--text-primary)' }}
        >
          Pi Orchestrator
        </span>
        <span
          className="text-sm font-mono font-medium"
          style={{ color: 'var(--text-secondary)' }}
        >
          pi-dash
        </span>
      </div>

      {/* Center-left: View Toggle */}
      <nav
        className="flex items-center gap-1 p-1 rounded-lg"
        style={{ backgroundColor: 'var(--card)' }}
      >
        <button
          onClick={() => onSetViewMode('dashboard')}
          className="flex items-center gap-1.5 px-3 py-1 rounded-md text-sm transition-colors"
          style={{
            backgroundColor: viewMode === 'dashboard' ? 'var(--border)' : 'transparent',
            color: viewMode === 'dashboard' ? 'var(--text-primary)' : 'var(--text-muted)',
          }}
        >
          <LayoutDashboard size={14} />
          Dashboard
        </button>
        <button
          onClick={() => onSetViewMode('terminal')}
          className="flex items-center gap-1.5 px-3 py-1 rounded-md text-sm transition-colors"
          style={{
            backgroundColor: viewMode === 'terminal' ? 'var(--border)' : 'transparent',
            color: viewMode === 'terminal' ? 'var(--text-primary)' : 'var(--text-muted)',
          }}
        >
          <Monitor size={14} />
          Terminal
        </button>
      </nav>

      {/* Center: Worktrees */}
      <button
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors"
        style={{ color: 'var(--text-muted)' }}
      >
        <GitBranch size={14} />
        Worktrees
      </button>

      {/* Center-right: Mode Toggle */}
      <nav
        className="flex items-center gap-1 p-1 rounded-lg"
        style={{ backgroundColor: 'var(--card)' }}
      >
        {(['auto', 'supervised', 'manual'] as const).map((m) => (
          <button
            key={m}
            onClick={() => onModeChange(m)}
            className="px-3 py-1 rounded-md text-sm transition-colors"
            style={{
              backgroundColor: mode === m ? 'var(--border)' : 'transparent',
              color: mode === m ? 'var(--text-primary)' : 'var(--text-muted)',
            }}
          >
            {m}
          </button>
        ))}
      </nav>

      {/* Right: Nav + Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => navigate('/settings/github')}
          className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
          style={{ backgroundColor: 'var(--card)', color: 'var(--text-secondary)' }}
        >
          <Link size={16} />
        </button>
        <button
          onClick={() => toast('Notifications coming soon')}
          className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
          style={{ backgroundColor: 'var(--card)', color: 'var(--text-secondary)' }}
        >
          <Bell size={16} />
        </button>
        <button
          onClick={() => navigate('/settings')}
          className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
          style={{ backgroundColor: 'var(--card)', color: 'var(--text-secondary)' }}
        >
          <Settings size={16} />
        </button>
        <button
          onClick={() => toast('Help docs coming soon')}
          className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
          style={{ backgroundColor: 'var(--card)', color: 'var(--text-secondary)' }}
        >
          <HelpCircle size={16} />
        </button>

        <div className="w-px h-6 mx-2" style={{ backgroundColor: 'var(--border)' }} />

        <button
          onClick={onToggleFeedPause}
          className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
          style={{ backgroundColor: 'var(--card)', color: 'var(--text-secondary)' }}
        >
          {isFeedPaused ? <Play size={16} /> : <Pause size={16} />}
        </button>
        <button
          onClick={onClearFeed}
          className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
          style={{ backgroundColor: 'var(--card)', color: 'var(--text-secondary)' }}
        >
          <Trash2 size={16} />
        </button>
      </div>
    </header>
  );
}
```

- [ ] **Step 2: Verify component renders**

Run: `pnpm dev`
Expected: TopBar renders with all sections and buttons.

- [ ] **Step 3: Commit**

```bash
git add renderer/src/components/dashboard/Topbar.tsx
git commit -m "feat: TopBar with design tokens and navigation"
```

---

### Task 9: Dashboard Component (Main Layout)

**Files:**
- Modify: `renderer/src/components/dashboard/Dashboard.tsx`

**Interfaces:**
- Consumes: All components from Tasks 2-8, design tokens, SessionContext, hooks
- Produces: `Dashboard` component that composes the full three-column layout

- [ ] **Step 1: Rewrite Dashboard with new components**

Replace the entire contents of `renderer/src/components/dashboard/Dashboard.tsx`:

```typescript
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSessionContext } from '@/context/SessionContext';
import { useAgents } from '@/hooks/useAgents';
import { useRealActivityFeed } from '@/hooks/useRealActivityFeed';
import { useDashboardMode } from '@/hooks/useDashboardMode';
import { usePiPContext } from '@/context/PiPContext';
import type { PlanStep } from '@/types/dashboard';
import type { ViewMode } from '@/types/pip';
import { TopBar } from './Topbar';
import { FleetPanel } from './FleetPanel';
import { PlanPanel } from './PlanPanel';
import { ActivityFeed } from './ActivityFeed';
import { MetricsFooter } from './MetricsFooter';

// Mock plan data
const mockSteps: PlanStep[] = [
  { id: '1', number: 1, name: 'Scaffold project structure', agentId: 'omp', status: 'done', duration: '2m 14s' },
  { id: '2', number: 2, name: 'Implement authentication', agentId: 'claude-code', status: 'done', duration: '5m 32s' },
  { id: '3', number: 3, name: 'Build API endpoints', agentId: 'omp', status: 'active', duration: '3m 45s' },
  { id: '4', number: 4, name: 'Write unit tests', agentId: 'codex', status: 'pending', duration: '' },
  { id: '5', number: 5, name: 'Deploy to staging', agentId: 'aider', status: 'pending', duration: '' },
];

export function Dashboard() {
  const navigate = useNavigate();
  const ctx = useSessionContext();
  const { agents: availableAgents } = useAgents();
  const { events, isPaused, pause, resume, clear } = useRealActivityFeed();
  const { mode, setMode } = useDashboardMode();
  const { state: pipState, actions: pipActions } = usePiPContext();
  const [viewMode, setViewMode] = useState<ViewMode>('dashboard');
  const [elapsed, setElapsed] = useState(0);

  const runningSessions = ctx.getActiveSessions();

  // Compute elapsed from earliest active session
  useEffect(() => {
    if (runningSessions.length === 0) {
      setElapsed(0);
      return;
    }

    const earliest = Math.min(...runningSessions.map((s) => s.createdAt));
    const tick = () => setElapsed(Math.floor((Date.now() - earliest) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [ctx.sessions]);

  const handlePause = () => {
    if (isPaused) {
      resume();
    } else {
      pause();
    }
  };

  const handleAgentClick = (agentId: string) => {
    navigate(`/agent/${agentId}`);
  };

  const handleLaunch = async (agentId: string) => {
    try {
      await ctx.launchAgent(agentId);
    } catch (error) {
      console.error('Failed to launch agent:', error);
    }
  };

  const handleOpenAsOverlay = (agentId: string) => {
    pipActions.addOverlay(agentId);
  };

  const activeAgents = runningSessions.length;
  const totalCommands = Array.from(ctx.sessions.values()).reduce(
    (sum, s) => sum + s.commandHistory.length,
    0,
  );

  // Compute progress from mock steps
  const doneSteps = mockSteps.filter((s) => s.status === 'done').length;
  const progress = Math.round((doneSteps / mockSteps.length) * 100);

  return (
    <div className="h-screen flex flex-col" style={{ backgroundColor: 'var(--bg)' }}>
      <TopBar
        mode={mode}
        viewMode={viewMode}
        isFeedPaused={isPaused}
        hasMainAgent={runningSessions.length > 0}
        onModeChange={setMode}
        onSetViewMode={setViewMode}
        onToggleFeedPause={handlePause}
        onClearFeed={clear}
      />

      <div className="flex-1 flex overflow-hidden">
        <FleetPanel
          runningSessions={runningSessions}
          availableAgents={availableAgents}
          onFocus={handleAgentClick}
          onLaunch={handleLaunch}
          onOpenAsOverlay={handleOpenAsOverlay}
        />

        <PlanPanel steps={mockSteps} progress={progress} />

        <ActivityFeed events={events} isPaused={isPaused} />
      </div>

      <MetricsFooter
        elapsed={elapsed}
        activeAgents={activeAgents}
        totalCommands={totalCommands}
      />
    </div>
  );
}
```

- [ ] **Step 2: Verify full dashboard renders**

Run: `pnpm dev`
Expected: Full dashboard renders with three-column layout, TopBar, and MetricsFooter.

- [ ] **Step 3: Commit**

```bash
git add renderer/src/components/dashboard/Dashboard.tsx
git commit -m "feat: Dashboard with three-column layout"
```

---

### Task 10: Routing Updates

**Files:**
- Modify: `renderer/src/App.tsx`

**Interfaces:**
- Consumes: `Dashboard` from Task 9, `TerminalView` (existing)
- Produces: Updated routing with Dashboard at `/` and Terminal at `/terminal`

- [ ] **Step 1: Update App.tsx routing**

Replace the routing section in `renderer/src/App.tsx`:

```typescript
import { useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Dashboard } from './components/dashboard/Dashboard';
import { TerminalView } from './components/terminal/TerminalView';
import { AgentDetailView } from './components/views/AgentDetailView';
import { WorktreeView } from './components/views/WorktreeView';
import { CompletedWorkView } from './components/views/CompletedWorkView';
import { OnboardingFlow } from './components/onboarding/OnboardingFlow';
import { SettingsScreen } from './components/settings/SettingsScreen';
import { PiPProvider } from './context/PiPContext';
import { GitHubProvider } from './context/GitHubContext';
import { SessionProvider } from './context/SessionContext';
import { SettingsProvider } from './context/SettingsContext';
import { PiPContainer } from './components/pip/PiPContainer';
import { MainTerminal } from './components/pip/MainTerminal';
import { OverlayManager } from './components/pip/OverlayManager';
import { Toaster } from './components/ui/sonner';

function App() {
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean | null>(null);

  useEffect(() => {
    if (window.api) {
      window.api.getOnboardingStatus().then(setOnboardingCompleted);
    } else {
      setOnboardingCompleted(true);
    }
  }, []);

  const handleOnboardingComplete = useCallback(() => {
    setOnboardingCompleted(true);
  }, []);

  if (onboardingCompleted === null) {
    return null; // Loading
  }

  if (!onboardingCompleted) {
    return <OnboardingFlow onComplete={handleOnboardingComplete} />;
  }

  return (
    <>
      <SessionProvider>
        <GitHubProvider>
          <PiPProvider>
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route
                  path="/terminal"
                  element={
                    <PiPContainer>
                      <MainTerminal />
                      <OverlayManager />
                    </PiPContainer>
                  }
                />
                <Route path="/agent/:agentId" element={<AgentDetailView />} />
                <Route path="/settings/*" element={<SettingsProvider><SettingsScreen /></SettingsProvider>} />
                <Route path="/completed/:agentId" element={<CompletedWorkView />} />
              </Routes>
            </BrowserRouter>
          </PiPProvider>
        </GitHubProvider>
      </SessionProvider>
      <Toaster />
    </>
  );
}
export default App;
```

- [ ] **Step 2: Verify routing works**

Run: `pnpm dev`
Expected:
- `/` shows Dashboard
- `/terminal` shows TerminalView with PiP overlays
- Other routes still work

- [ ] **Step 3: Commit**

```bash
git add renderer/src/App.tsx
git commit -m "feat: routing updates for Dashboard and Terminal views"
```

---

## Final Verification

- [ ] **Step 1: Run full test suite**

Run: `pnpm test`
Expected: All tests pass.

- [ ] **Step 2: Visual verification**

Run: `pnpm dev` and open browser.
Expected:
- Dashboard renders with three-column layout
- All colors use design tokens (no hardcoded hex)
- AgentCard shows avatars, names, action buttons
- Plan steps show correct colors (green/blue/gray)
- Activity feed shows type badges
- Metrics footer shows elapsed, agents, commands
- TopBar navigation works
- View toggle switches between Dashboard and Terminal

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "feat: complete dashboard rewrite matching Pencil design"
```
