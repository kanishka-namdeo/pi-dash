# Live Agent Session Management Design

**Date:** 2026-08-05  
**Status:** Draft  
**Scope:** Interactive terminal sessions with mock PTY backend

## Overview

PiDash evolves from a passive monitoring dashboard into an interactive multi-agent terminal control plane. Users can start, interact with, pause, resume, and kill agent terminal sessions. All functionality is backed by mock data (no real PTY connections), but the architecture mirrors real terminal emulators (Warp, Orca) to enable future migration.

## Architecture

### Core Components

```
┌─────────────────────────────────────────────────┐
│  TerminalPane (Custom block renderer)           │
│  - React-based command block components         │
│  - ANSI parser for styled spans                 │
│  - Input handling (line-by-line)                │
└────────────┬────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────┐
│  AgentSession (state machine per agent)         │
│  - States: idle → working → waiting → paused    │
│  - Command history buffer                       │
│  - Session metadata (agent identity, state)     │
└────────────┬────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────┐
│  MockPTY (simulated PTY layer)                  │
│  - Pattern matching on input                    │
│  - Agent-specific response templates            │
│  - Simulates command execution delay            │
└────────────┬────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────┐
│  SessionStore (persistence)                     │
│  - Extends AgentConfig with session state       │
│  - Persists to electron-store                   │
│  - Restores on app reopen                       │
└─────────────────────────────────────────────────┘
```

### Design Decision: Custom Block Renderer (not xterm.js)

xterm.js renders a continuous character-grid buffer — it owns its own DOM, scrollback, and line rendering. It has no concept of "this output belongs to that command" or collapsible block headers. Command blocks require structured React components with collapse/expand, grouping, and per-block metadata. These are fundamentally incompatible rendering models.

For a mock-backed demo, the custom block renderer is the pragmatic choice:
- Full control over block structure, collapse, copy
- ANSI support is achievable with a simple parser (not full xterm.js spec, but enough for mock responses)
- Structured data model makes persistence and copy/search easier
- Saves xterm.js for when real PTYs are wired up (future enhancement)

Trade-off: loses "real terminal" features (cursor movement, true color, full ANSI spec), but for a mock demo with scripted responses, these aren't needed.

### Data Flow

1. User types command in TerminalPane
2. TerminalPane sends to AgentSession
3. AgentSession queues command, updates state to `working`
4. MockPTY processes command, returns response with ANSI codes
5. AgentSession writes response to terminal
6. Command + output grouped into CommandBlock (if multi-line output)
7. SessionStore persists state after each interaction

## Session Lifecycle State Machine

### States

| State | Meaning | UI indicator |
|-------|---------|--------------|
| `idle` | Session exists but no active command | Gray dot |
| `working` | Processing a command / generating response | Green pulse |
| `waiting` | Between commands, ready for input | Amber dot |
| `paused` | User paused — no new input accepted | Amber dot, frozen |
| `killed` | Session terminated | Red dot, read-only |

### State Transitions

```
                    ┌──────────┐
          ┌────────│   idle   │────────┐
          │        └──────────┘        │
          │ start session              │ kill
          ▼                            │
     ┌──────────┐                      │
     │ working  │◄─────────┐           │
     └────┬─────┘          │           │
          │ command sent   │ resume    │
          ▼                │           │
     ┌──────────┐     ┌────┴────┐      │
     │ waiting  │────►│ paused  │──────┘
     └──────────┘     └─────────┘
          │ response received
          ▼
     ┌──────────┐
     │ working  │  (cycle continues)
     └──────────┘
```

- **Start**: `idle` → `working` (first command sent)
- **Command cycle**: `working` → `waiting` (response done) → `working` (next command)
- **Pause**: any active state → `paused`
- **Resume**: `paused` → `waiting`
- **Kill**: any state → `killed` (terminal becomes read-only, history preserved)
- **Restart**: `killed` → `idle` (clears history, fresh session)

### Key Behaviors

- `waiting` is the "ready for input" state — input field enabled
- `working` disables input (agent is busy) — shows spinner/pulse
- `paused` freezes everything — visual indicator that session is suspended
- `killed` preserves scrollback but locks input — user can review but not interact
- `restart` from `killed` state resets everything

## MockPTY & Response Engine

### MockPTY Interface

```typescript
type SessionState = 'idle' | 'working' | 'waiting' | 'paused' | 'killed';

type MockPTY = {
  agentId: string;
  state: SessionState;
  
  // Core PTY operations
  write(input: string): void;        // User types command
  onData(callback: (data: string) => void): void;  // Terminal output
  onStateChange(callback: (state: SessionState) => void): void;
  
  // Lifecycle
  start(): void;
  pause(): void;
  resume(): void;
  kill(): void;
  restart(): void;
  
  // History
  getHistory(): CommandBlock[];  // Returns structured blocks, not raw strings
  clearHistory(): void;
};

// Factory function
function createMockPTY(agentId: string, config: AgentConfig): MockPTY;
```

### MockPTY Lifecycle

Each agent gets its own MockPTY instance, created when:
- User navigates to agent detail view for the first time
- App restores a persisted session on startup

The MockPTY is owned by the `useAgentSession` hook and destroyed when the component unmounts (but state persists via SessionStore).

### Response Engine Design

Each agent has a response template map:

```typescript
type AgentResponseTemplate = {
  patterns: RegExp[];           // Match user input
  responses: string[];          // Possible responses (random selection)
  delay: { min: number; max: number };  // Simulated execution time (ms)
};
```

All responses include ANSI codes for styling.

### Agent Personalities

- **Claude**: Analytical, verbose, uses markdown-style formatting
  - `help` → detailed explanation with examples
  - `ls` → formatted directory listing with descriptions
  - Unknown commands → helpful suggestions

- **Cursor**: Action-oriented, concise, code-focused
  - `help` → quick reference
  - `ls` → compact file list
  - Unknown commands → "Try: ..." with alternatives

- **Copilot**: Suggestive, collaborative tone
  - `help` → "I can help with..." suggestions
  - `ls` → file list with "Would you like me to..." prompts
  - Unknown commands → "Maybe you meant...?"

### Unknown Command Handling

When no pattern matches, the MockPTY returns a fallback response specific to the agent's personality. The response is styled with a warning color (yellow/amber) to indicate the command wasn't recognized. The session remains in `waiting` state — the user can try again.

```typescript
// Fallback response template per agent
type FallbackTemplate = {
  response: string;  // ANSI-styled "unknown command" message
  delay: { min: number; max: number };
};
```

### Execution Simulation

```
User types: "npm install react"
  ↓
MockPTY.write() called
  ↓
State: working → onData("$ npm install react\n")
  ↓
setTimeout(delay)  // 500-2000ms random
  ↓
Match pattern → select response (or fallback)
  ↓
State: waiting → onData(response with ANSI codes)
  ↓
AgentSession groups command + response into CommandBlock
  ↓
CommandBlock added to history (if multi-line output, isMultiLine = true)
  ↓
SessionStore persists updated history
```

### ANSI Code Support

MockPTY responses include ANSI escape codes for:
- Colors: `\x1b[32m` (green), `\x1b[31m` (red)
- Bold: `\x1b[1m`
- Reset: `\x1b[0m`

A custom ANSI parser converts escape codes into styled React spans (see ANSI Parser section below).

**Example response (Claude):**

```
\x1b[1mInstalling dependencies...\x1b[0m

\x1b[32m✓\x1b[0m react@18.2.0 installed
\x1b[32m✓\x1b[0m react-dom@18.2.0 installed

\x1b[36mNext steps:\x1b[0m
  • Import React in your components
  • Run `npm run dev` to start the dev server
```

### Mock Response Data Examples

```typescript
const claudeTemplates: AgentResponseTemplate[] = [
  {
    patterns: [/^help$/i],
    responses: [
      '\x1b[1mAvailable commands:\x1b[0m\n\n  \x1b[36mhelp\x1b[0m     — Show this help message\n  \x1b[36mls\x1b[0m       — List files in current directory\n  \x1b[36mcat\x1b[0m      — Display file contents\n  \x1b[36mnpm\x1b[0m      — Node package manager\n  \x1b[36mgit\x1b[0m      — Version control\n\nType any command and I\'ll explain what it does.',
    ],
    delay: { min: 300, max: 800 },
  },
  {
    patterns: [/^ls(\s|$)/],
    responses: [
      '\x1b[1mDirectory listing:\x1b[0m\n\n  \x1b[34md\x1b[0m src/\n  \x1b[34md\x1b[0m node_modules/\n  \x1b[32m-\x1b[0m package.json    \x1b[90m1.2KB\x1b[0m\n  \x1b[32m-\x1b[0m tsconfig.json   \x1b[90m856B\x1b[0m\n  \x1b[32m-\x1b[0m README.md       \x1b[90m2.4KB\x1b[0m',
    ],
    delay: { min: 200, max: 500 },
  },
];

const cursorTemplates: AgentResponseTemplate[] = [
  {
    patterns: [/^help$/i],
    responses: [
      '\x1b[1mCommands:\x1b[0m help | ls | cat | npm | git',
    ],
    delay: { min: 100, max: 300 },
  },
  {
    patterns: [/^ls(\s|$)/],
    responses: [
      'src/  node_modules/  package.json  tsconfig.json  README.md',
    ],
    delay: { min: 100, max: 200 },
  },
];
```

## ANSI Parser

Since we're using a custom block renderer instead of xterm.js, we need a lightweight ANSI parser that converts escape codes into styled React elements.

### Supported ANSI Codes

For mock responses, we only need a subset of the full ANSI spec:

| Code | Meaning | React Style |
|------|---------|-------------|
| `\x1b[0m` | Reset | Default |
| `\x1b[1m` | Bold | `fontWeight: 'bold'` |
| `\x1b[31m` | Red | `color: '#ef4444'` |
| `\x1b[32m` | Green | `color: '#22c55e'` |
| `\x1b[33m` | Yellow | `color: '#eab308'` |
| `\x1b[34m` | Blue | `color: '#3b82f6'` |
| `\x1b[35m` | Magenta | `color: '#d946ef'` |
| `\x1b[36m` | Cyan | `color: '#06b6d4'` |
| `\x1b[37m` | White | `color: '#ffffff'` |
| `\x1b[90m` | Bright Black (dim) | `color: '#737373'` |

### Parser Interface

```typescript
type StyledSpan = {
  text: string;
  bold?: boolean;
  color?: string;
};

function parseAnsi(input: string): StyledSpan[] {
  // Split input by ANSI escape sequences
  // Track current style state
  // Return array of styled spans
}
```

### Rendering

```typescript
function AnsiText({ text }: { text: string }) {
  const spans = parseAnsi(text);
  return (
    <>
      {spans.map((span, i) => (
        <span
          key={i}
          style={{
            fontWeight: span.bold ? 'bold' : 'normal',
            color: span.color || 'inherit',
          }}
        >
          {span.text}
        </span>
      ))}
    </>
  );
}
```

### Implementation Notes

- Write a simple custom parser (~50 lines) — no external dependency needed for this subset
- Parser only needs to handle the codes listed above (mock responses don't use cursor movement, true color, etc.)
- Performance: parse once per block on render, not on every keystroke
- Store raw ANSI strings in persistence, parse at render time

## Command Blocks

### Block Detection Logic

Based on user choice: "Only group when output spans multiple lines, single-line stays flat."

```typescript
type CommandBlock = {
  id: string;
  command: string;           // Raw command text (no ANSI)
  timestamp: number;         // Unix ms
  output: string;            // Raw output with ANSI codes (single string, may contain \n)
  isMultiLine: boolean;      // output.includes('\n')
  isCollapsed: boolean;      // UI-only, NOT persisted — defaults to false on restore
};
```

Note: `output` is a single string (not `string[]`). Multi-line detection uses `output.includes('\n')`. ANSI codes are preserved in the raw string and parsed at render time by the ANSI Parser. `isCollapsed` is ephemeral UI state — not persisted.

### Grouping Rules

1. **Single-line output** → flat display (no block wrapper)
   ```
   $ echo "hello"
   hello
   $ 
   ```

2. **Multi-line output** → collapsible block
   ```
   ▼ $ ls -la
     total 24
     drwxr-xr-x  5 user staff  160 Jan 15 10:23 .
     drwxr-xr-x  3 user staff   96 Jan 14 09:15 ..
     -rw-r--r--  1 user staff  245 Jan 15 10:20 package.json
   ```

3. **Block header** shows:
   - Collapse/expand chevron (▼/▶)
   - Command text
   - Timestamp (on hover)

4. **Collapsed state** shows:
   - ▶ chevron
   - Command text
   - Output summary: "3 lines" or first line preview

### Implementation

```typescript
function shouldGroupAsBlock(output: string): boolean {
  return output.includes('\n');
}

function renderBlock(block: CommandBlock) {
  if (!block.isMultiLine) {
    // Flat rendering
    return (
      <>
        <div className="command">$ {block.command}</div>
        <div className="output"><AnsiText text={block.output} /></div>
      </>
    );
  }
  
  // Block rendering (collapsible)
  return (
    <div className="command-block">
      <div className="block-header" onClick={() => toggleCollapse(block.id)}>
        <span>{block.isCollapsed ? '▶' : '▼'}</span>
        <span>$ {block.command}</span>
      </div>
      {!block.isCollapsed && (
        <div className="block-body">
          <AnsiText text={block.output} />
        </div>
      )}
    </div>
  );
}
```

### Edge Cases

- **Empty output** → no block, just the command
- **Error output** → always show as block (errors are usually multi-line)
- **Streaming output** → buffer until command completes, then group
- **ANSI codes in output** → preserved in block body (ANSI parser renders them as styled spans)

## useAgentSession Hook

The central hook that ties TerminalPane, MockPTY, and SessionStore together.

### Interface

```typescript
type UseAgentSessionReturn = {
  // State
  state: SessionState;
  blocks: CommandBlock[];
  currentInput: string;
  
  // Actions
  submitCommand: (command: string) => void;
  pause: () => void;
  resume: () => void;
  kill: () => void;
  restart: () => void;
  clearHistory: () => void;
  setInput: (input: string) => void;
  
  // Block interactions
  toggleCollapse: (blockId: string) => void;
  
  // Command history navigation
  historyBack: () => string | null;   // Returns previous command
  historyForward: () => string | null; // Returns next command
};

function useAgentSession(agentId: string): UseAgentSessionReturn;
```

### Responsibilities

1. **Create/retrieve MockPTY** for the agent (lazy init, restore from persistence)
2. **Manage state machine** transitions
3. **Buffer command + response** into CommandBlock after each interaction
4. **Persist** state changes via SessionStore (debounced)
5. **Track** command history for up/down arrow navigation
6. **Manage** ephemeral UI state (collapse, current input)

### Hook Lifecycle

```
Component mount
  ↓
Load persisted session from SessionStore
  ↓
Create MockPTY (or restore existing)
  ↓
Restore history blocks
  ↓
Set initial state (from persisted or 'idle')
  ↓
[User interacts]
  ↓
On unmount: flush pending writes to SessionStore
```

## Session Persistence

### Two-Layer Persistence Model

```
┌─────────────────────────────────────────────┐
│  Layer 1: Durable Session State             │
│  (survives app restart)                     │
│                                             │
│  - Agent session state (idle/working/etc.)  │
│  - Command history (all blocks)             │
│  - Session metadata (created, last active)  │
│  - Agent config (name, icon, path)          │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│  Layer 2: Ephemeral UI State                │
│  (reset on restart)                         │
│                                             │
│  - Scroll position                          │
│  - Block collapse/expand state              │
│  - Input field content (in-progress cmd)    │
│  - Panel sizes / layout                     │
└─────────────────────────────────────────────┘
```

### Storage Mechanism

Extend the existing `AgentConfig` type with session data:

```typescript
type AgentConfig = {
  id: string;
  name: string;
  icon: string;
  path: string;
  source: 'detected' | 'manual';
  task?: string;  // Current agent task (used by AgentDetailView)
  
  // Session persistence (new)
  session?: {
    state: SessionState;
    history: CommandBlock[];  // isCollapsed stripped before persist
    createdAt: number;
    lastActiveAt: number;
  };
};
```

Stored via existing `agent-store.ts` (electron-store backed JSON file).

**Note:** The existing `AgentConfig` in `src/shared/types.ts` already has `id`, `name`, `icon`, `path`, `source`, `fingerprint`, and `pid`. The `task` and `session` fields are additions.

### Restore Behavior on App Reopen

| Session state | Restore action |
|---------------|---------------|
| `idle` | Show empty terminal, ready for input |
| `waiting` | Show history, input enabled |
| `working` | Show history, reset to `waiting` (mock — no real process to resume) |
| `paused` | Show history frozen, resume available |
| `killed` | Show read-only history, restart available |

### Write Strategy

- Persist after every command completion (not on every keystroke)
- Debounce writes: max 1 write/second per agent
- On app close: flush all pending writes
- Strip `isCollapsed` from blocks before persisting (it's ephemeral UI state)

### Size Limits

- Max 1000 command blocks per session (prevent unbounded growth)
- Evict oldest blocks when limit hit (FIFO)
- Each block stores raw output strings — ANSI codes are parsed at render time

## UI/UX Layout & Interactions

### Terminal View Layout

```
┌─────────────────────────────────────────────────────────┐
│  [←] Agent Name  [● working]  task description    [⋮]  │  ← Header (existing)
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ▼ $ ls -la                                             │  ← Multi-line block (collapsible)
│    total 24                                             │
│    drwxr-xr-x  5 user staff  160 Jan 15 10:23 .        │
│    -rw-r--r--  1 user staff  245 Jan 15 10:20 pkg.json │
│                                                         │
│  $ echo "hello"                                         │  ← Single-line (flat)
│  hello                                                  │
│                                                         │
│  ▼ $ npm install react                                  │  ← Another block
│    ✓ react@18.2.0 installed                             │
│    ✓ react-dom@18.2.0 installed                         │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ $ │                                             │   │  ← Input prompt
│  └─────────────────────────────────────────────────┘   │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  [Pause] [Kill] [Restart]              [Clear History]  │  ← Controls
└─────────────────────────────────────────────────────────┘
```

### State-Dependent UI

| State | Input field | Controls | Visual indicator |
|-------|-------------|----------|------------------|
| `idle` | Enabled, placeholder "Type a command..." | Start | Gray dot |
| `working` | Disabled, shows spinner | Pause, Kill | Green pulse |
| `waiting` | Enabled, ready for next command | Pause, Kill | Amber dot |
| `paused` | Disabled, frozen | Resume, Kill | Amber dot, dimmed |
| `killed` | Hidden | Restart, Clear | Red dot, read-only overlay |

### Input Behavior

- **Enter**: submit command
- **Up/Down arrows**: navigate command history (within session)
- **Ctrl+C**: cancel current input (or send interrupt if `working`)
- **Ctrl+L**: clear terminal view (preserves history in storage)
- **Tab**: autocomplete (future — not in mock scope)

### Block Interactions

- **Click chevron**: collapse/expand block
- **Right-click block**: context menu (Copy Block, Copy Command, Copy Output)
- **Hover block header**: show timestamp tooltip
- **Shift+click block**: select range for multi-block copy

### Keyboard Navigation Between Blocks

- **Cmd+Up/Down**: jump between command blocks
- **Cmd+Shift+C**: copy selected block(s)

### Responsive Behavior

- Terminal fills available vertical space
- Input prompt fixed at bottom
- Controls fixed at bottom below terminal
- Scrollback: infinite (limited by block count, not pixels)

## Migration from Existing TerminalView

The existing `renderer/src/components/terminal/TerminalView.tsx` is a read-only log viewer with mock data. It will be replaced by the new architecture:

| Existing | Replacement |
|----------|-------------|
| `TerminalView.tsx` (read-only log viewer) | `TerminalPane.tsx` (interactive block renderer) + `TerminalView.tsx` (container with controls) |
| `mockLogs` (hardcoded per agent) | `MockPTY` (dynamic pattern-matched responses) |
| `TerminalLine` type | `CommandBlock` type |
| Simulated log entries via `setInterval` | Real command/response cycle via `MockPTY.write()` |

The existing `TerminalView.tsx` file will be repurposed as the container component (header + controls), while `TerminalPane.tsx` handles the block rendering and input.

## Implementation Notes

### Dependencies

- Custom ANSI parser (~50 lines) — no external dependency needed
- Existing `electron-store` — session persistence
- Existing `agent-store.ts` — extend with session data

### File Structure

```
renderer/src/
  components/
    terminal/
      TerminalPane.tsx          # Block renderer container (replaces existing)
      TerminalView.tsx          # Container with header + controls (updated)
      CommandBlock.tsx          # Block rendering component (new)
      AnsiText.tsx              # ANSI parser + renderer (new)
  hooks/
    useAgentSession.ts          # Session state machine (new)
  lib/
    mockResponses.ts            # Agent response templates (new)
    ansiParser.ts               # ANSI escape code parser (new)
    sessionStore.ts             # Persistence layer (new)
  types/
    session.ts                  # Session types (new — CommandBlock, SessionState, etc.)
```

### Testing Strategy

- Unit tests for state machine transitions
- Unit tests for MockPTY pattern matching
- Unit tests for ANSI parser
- Integration tests for session persistence (save/restore cycle)
- Visual tests for terminal rendering (manual)

## Future Enhancements (Out of Scope)

- Real PTY connections (node-pty + xterm.js)
- Inter-agent messaging
- Command autocomplete
- Block sharing/exporting
- Session search across agents
- Terminal split views (side-by-side agents)
- Workflow recording (Warp-style)

## Success Criteria

- User can start, interact with, pause, resume, and kill agent sessions
- Sessions persist across app restarts
- Terminal renders ANSI codes correctly via custom parser
- Multi-line output is grouped into collapsible blocks
- Single-line output remains flat
- Each agent has distinct response personality
- State transitions are smooth and visually clear
- Existing `TerminalView.tsx` is migrated without breaking agent detail navigation
