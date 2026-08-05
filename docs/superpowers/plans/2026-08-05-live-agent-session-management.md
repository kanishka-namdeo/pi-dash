# Live Agent Session Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build interactive terminal sessions with mock PTY backend, enabling users to start, interact with, pause, resume, and kill agent sessions.

**Architecture:** Custom block renderer (not xterm.js) with ANSI parser for styled output. Session state machine manages lifecycle (idle/working/waiting/paused/killed). MockPTY provides pattern-matched responses with agent-specific personalities. SessionStore persists state across app restarts.

**Tech Stack:** React, TypeScript, electron-store (existing), custom ANSI parser

## Global Constraints

- Mock functionality only — no real PTY connections
- Custom block renderer, not xterm.js (save xterm.js for future real PTY migration)
- ANSI parser handles subset: reset, bold, 8 colors (31-37, 90)
- Command blocks: multi-line output only (single-line stays flat)
- Session persistence: max 1000 blocks per session, FIFO eviction
- Debounce persistence writes: max 1/second per agent
- All responses include ANSI codes for styling
- `isCollapsed` is ephemeral UI state — not persisted

---

## File Structure

```
renderer/src/
  types/
    session.ts                    # NEW: SessionState, CommandBlock, AgentConfig extensions
  
  lib/
    ansiParser.ts                 # NEW: parseAnsi() function
    ansiParser.test.ts            # NEW: tests for ANSI parser
  
  lib/
    mockResponses.ts              # NEW: Agent response templates
    mockResponses.test.ts         # NEW: tests for pattern matching
  
  lib/
    mockPTY.ts                    # NEW: MockPTY class
    mockPTY.test.ts               # NEW: tests for MockPTY lifecycle
  
  lib/
    sessionStore.ts               # NEW: Persistence layer
    sessionStore.test.ts          # NEW: tests for save/restore
  
  hooks/
    useAgentSession.ts            # NEW: Session state machine hook
    useAgentSession.test.ts       # NEW: tests for state transitions
  
  components/
    terminal/
      AnsiText.tsx                # NEW: ANSI renderer component
      AnsiText.test.tsx           # NEW: tests for rendering
      
      CommandBlock.tsx            # NEW: Block rendering component
      CommandBlock.test.tsx       # NEW: tests for collapse/expand
      
      TerminalPane.tsx            # NEW: Block renderer container
      TerminalPane.test.tsx       # NEW: tests for input/scroll
      
      TerminalView.tsx            # MODIFY: Add controls, integrate TerminalPane
```

---

### Task 1: ANSI Parser

**Files:**
- Create: `renderer/src/lib/ansiParser.ts`
- Create: `renderer/src/lib/ansiParser.test.ts`

**Interfaces:**
- Produces: `parseAnsi(input: string): StyledSpan[]`
- Produces: `StyledSpan = { text: string; bold?: boolean; color?: string }`

- [ ] **Step 1: Write failing test for basic text (no ANSI)**

```typescript
// renderer/src/lib/ansiParser.test.ts
import { describe, it, expect } from 'vitest';
import { parseAnsi } from './ansiParser';

describe('parseAnsi', () => {
  it('parses plain text without ANSI codes', () => {
    const result = parseAnsi('hello world');
    expect(result).toEqual([{ text: 'hello world' }]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test renderer/src/lib/ansiParser.test.ts`
Expected: FAIL — `parseAnsi is not exported`

- [ ] **Step 3: Write minimal implementation**

```typescript
// renderer/src/lib/ansiParser.ts
export type StyledSpan = {
  text: string;
  bold?: boolean;
  color?: string;
};

export function parseAnsi(input: string): StyledSpan[] {
  return [{ text: input }];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test renderer/src/lib/ansiParser.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add renderer/src/lib/ansiParser.ts renderer/src/lib/ansiParser.test.ts
git commit -m "feat: add ANSI parser foundation"
```

- [ ] **Step 6: Write failing test for bold**

```typescript
// Add to renderer/src/lib/ansiParser.test.ts
it('parses bold text', () => {
  const result = parseAnsi('\x1b[1mhello\x1b[0m');
  expect(result).toEqual([{ text: 'hello', bold: true }]);
});
```

- [ ] **Step 7: Run test to verify it fails**

Run: `pnpm test renderer/src/lib/ansiParser.test.ts`
Expected: FAIL — bold not handled

- [ ] **Step 8: Implement bold parsing**

```typescript
// Update renderer/src/lib/ansiParser.ts
const ANSI_REGEX = /\x1b\[(\d+)m/g;

const COLOR_MAP: Record<string, string> = {
  '31': '#ef4444', // red
  '32': '#22c55e', // green
  '33': '#eab308', // yellow
  '34': '#3b82f6', // blue
  '35': '#d946ef', // magenta
  '36': '#06b6d4', // cyan
  '37': '#ffffff', // white
  '90': '#737373', // bright black (dim)
};

export function parseAnsi(input: string): StyledSpan[] {
  const spans: StyledSpan[] = [];
  let currentText = '';
  let currentBold = false;
  let currentColor: string | undefined;
  
  let lastIndex = 0;
  let match;
  
  while ((match = ANSI_REGEX.exec(input)) !== null) {
    // Add text before this escape sequence
    if (match.index > lastIndex) {
      currentText += input.slice(lastIndex, match.index);
    }
    
    const code = match[1];
    
    // If we have accumulated text, save it
    if (currentText) {
      spans.push({
        text: currentText,
        bold: currentBold || undefined,
        color: currentColor,
      });
      currentText = '';
    }
    
    // Update style state
    if (code === '0') {
      currentBold = false;
      currentColor = undefined;
    } else if (code === '1') {
      currentBold = true;
    } else if (COLOR_MAP[code]) {
      currentColor = COLOR_MAP[code];
    }
    
    lastIndex = match.index + match[0].length;
  }
  
  // Add remaining text
  if (lastIndex < input.length) {
    currentText += input.slice(lastIndex);
  }
  
  if (currentText) {
    spans.push({
      text: currentText,
      bold: currentBold || undefined,
      color: currentColor,
    });
  }
  
  return spans;
}
```

- [ ] **Step 9: Run test to verify it passes**

Run: `pnpm test renderer/src/lib/ansiParser.test.ts`
Expected: PASS

- [ ] **Step 10: Write failing test for colors**

```typescript
// Add to renderer/src/lib/ansiParser.test.ts
it('parses colored text', () => {
  const result = parseAnsi('\x1b[32mgreen\x1b[0m');
  expect(result).toEqual([{ text: 'green', color: '#22c55e' }]);
});

it('parses bold and colored text', () => {
  const result = parseAnsi('\x1b[1m\x1b[31mred bold\x1b[0m');
  expect(result).toEqual([{ text: 'red bold', bold: true, color: '#ef4444' }]);
});

it('handles multiple spans', () => {
  const result = parseAnsi('normal \x1b[32mgreen\x1b[0m normal');
  expect(result).toEqual([
    { text: 'normal ' },
    { text: 'green', color: '#22c55e' },
    { text: ' normal' },
  ]);
});
```

- [ ] **Step 11: Run tests to verify they pass**

Run: `pnpm test renderer/src/lib/ansiParser.test.ts`
Expected: All PASS

- [ ] **Step 12: Commit**

```bash
git add renderer/src/lib/ansiParser.ts renderer/src/lib/ansiParser.test.ts
git commit -m "feat: implement ANSI parser with bold and color support"
```

---

### Task 2: Session Types

**Files:**
- Create: `renderer/src/types/session.ts`

**Interfaces:**
- Produces: `SessionState`, `CommandBlock`, extended `AgentConfig`

- [ ] **Step 1: Define session types**

```typescript
// renderer/src/types/session.ts
export type SessionState = 'idle' | 'working' | 'waiting' | 'paused' | 'killed';

export type CommandBlock = {
  id: string;
  command: string;           // Raw command text (no ANSI)
  timestamp: number;         // Unix ms
  output: string;            // Raw output with ANSI codes (single string, may contain \n)
  isMultiLine: boolean;      // output.includes('\n')
  isCollapsed: boolean;      // UI-only, NOT persisted
};

export type SessionData = {
  state: SessionState;
  history: Omit<CommandBlock, 'isCollapsed'>[];  // Strip ephemeral state before persist
  createdAt: number;
  lastActiveAt: number;
};
```

- [ ] **Step 2: Extend AgentConfig type**

```typescript
// Add to renderer/src/types/session.ts
import type { AgentConfig as BaseAgentConfig } from '../../../src/shared/types';

export type AgentConfig = BaseAgentConfig & {
  task?: string;
  session?: SessionData;
};
```

- [ ] **Step 3: Commit**

```bash
git add renderer/src/types/session.ts
git commit -m "feat: add session types"
```

---

### Task 3: Mock Response Templates

**Files:**
- Create: `renderer/src/lib/mockResponses.ts`
- Create: `renderer/src/lib/mockResponses.test.ts`

**Interfaces:**
- Produces: `AgentResponseTemplate`, `getMockResponse(agentId, input)`

- [ ] **Step 1: Write failing test for pattern matching**

```typescript
// renderer/src/lib/mockResponses.test.ts
import { describe, it, expect } from 'vitest';
import { getMockResponse } from './mockResponses';

describe('getMockResponse', () => {
  it('returns help response for claude', () => {
    const result = getMockResponse('claude', 'help');
    expect(result).toBeDefined();
    expect(result.response).toContain('Available commands');
    expect(result.delay).toEqual({ min: 300, max: 800 });
  });
  
  it('returns ls response for cursor', () => {
    const result = getMockResponse('cursor', 'ls');
    expect(result).toBeDefined();
    expect(result.response).toContain('src/');
    expect(result.delay.min).toBeLessThan(result.delay.max);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test renderer/src/lib/mockResponses.test.ts`
Expected: FAIL — `getMockResponse is not exported`

- [ ] **Step 3: Implement mock responses**

```typescript
// renderer/src/lib/mockResponses.ts
export type AgentResponseTemplate = {
  patterns: RegExp[];
  responses: string[];
  delay: { min: number; max: number };
};

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
    responses: ['\x1b[1mCommands:\x1b[0m help | ls | cat | npm | git'],
    delay: { min: 100, max: 300 },
  },
  {
    patterns: [/^ls(\s|$)/],
    responses: ['src/  node_modules/  package.json  tsconfig.json  README.md'],
    delay: { min: 100, max: 200 },
  },
];

const copilotTemplates: AgentResponseTemplate[] = [
  {
    patterns: [/^help$/i],
    responses: ['\x1b[1mI can help with:\x1b[0m\n\n• help — show commands\n• ls — list files\n• cat — read files\n\nWhat would you like to do?'],
    delay: { min: 200, max: 400 },
  },
  {
    patterns: [/^ls(\s|$)/],
    responses: ['\x1b[34msrc/\x1b[0m  \x1b[34mnode_modules/\x1b[0m  package.json  tsconfig.json  README.md\n\nWould you like me to show you a file?'],
    delay: { min: 150, max: 350 },
  },
];

const templatesByAgent: Record<string, AgentResponseTemplate[]> = {
  claude: claudeTemplates,
  cursor: cursorTemplates,
  copilot: copilotTemplates,
};

const fallbackResponses: Record<string, AgentResponseTemplate> = {
  claude: {
    patterns: [],
    responses: ['\x1b[33mCommand not recognized.\x1b[0m Try \x1b[36mhelp\x1b[0m to see available commands.'],
    delay: { min: 200, max: 400 },
  },
  cursor: {
    patterns: [],
    responses: ['\x1b[33mUnknown command.\x1b[0m Try: help'],
    delay: { min: 100, max: 200 },
  },
  copilot: {
    patterns: [],
    responses: ['\x1b[33mHmm, I don\'t recognize that.\x1b[0m Maybe try \x1b[36mhelp\x1b[0m?'],
    delay: { min: 150, max: 300 },
  },
};

export function getMockResponse(
  agentId: string,
  input: string
): { response: string; delay: { min: number; max: number } } {
  const templates = templatesByAgent[agentId] || [];
  
  for (const template of templates) {
    if (template.patterns.some(pattern => pattern.test(input))) {
      const response = template.responses[Math.floor(Math.random() * template.responses.length)];
      return { response, delay: template.delay };
    }
  }
  
  // Fallback
  const fallback = fallbackResponses[agentId] || fallbackResponses.claude;
  const response = fallback.responses[0];
  return { response, delay: fallback.delay };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test renderer/src/lib/mockResponses.test.ts`
Expected: PASS

- [ ] **Step 5: Write test for fallback**

```typescript
// Add to renderer/src/lib/mockResponses.test.ts
it('returns fallback for unknown command', () => {
  const result = getMockResponse('claude', 'unknown-command');
  expect(result).toBeDefined();
  expect(result.response).toContain('not recognized');
});
```

- [ ] **Step 6: Run test to verify it passes**

Run: `pnpm test renderer/src/lib/mockResponses.test.ts`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add renderer/src/lib/mockResponses.ts renderer/src/lib/mockResponses.test.ts
git commit -m "feat: add mock response templates with agent personalities"
```

---

### Task 4: MockPTY

**Files:**
- Create: `renderer/src/lib/mockPTY.ts`
- Create: `renderer/src/lib/mockPTY.test.ts`

**Interfaces:**
- Consumes: `getMockResponse(agentId, input)` from Task 3
- Consumes: `SessionState`, `CommandBlock` from Task 2
- Produces: `MockPTY` interface, `createMockPTY(agentId, config)` factory

- [ ] **Step 1: Write failing test for lifecycle**

```typescript
// renderer/src/lib/mockPTY.test.ts
import { describe, it, expect, vi } from 'vitest';
import { createMockPTY } from './mockPTY';
import type { AgentConfig } from '../types/session';

const mockConfig: AgentConfig = {
  id: 'claude',
  name: 'Claude',
  icon: 'claude',
  path: '/path/to/claude',
  source: 'detected',
};

describe('MockPTY', () => {
  it('starts in idle state', () => {
    const pty = createMockPTY('claude', mockConfig);
    expect(pty.state).toBe('idle');
  });
  
  it('transitions to working when command is written', () => {
    const pty = createMockPTY('claude', mockConfig);
    pty.write('help');
    expect(pty.state).toBe('working');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test renderer/src/lib/mockPTY.test.ts`
Expected: FAIL — `createMockPTY is not exported`

- [ ] **Step 3: Implement MockPTY**

```typescript
// renderer/src/lib/mockPTY.ts
import type { SessionState, CommandBlock } from '../types/session';
import type { AgentConfig } from '../types/session';
import { getMockResponse } from './mockResponses';

export type MockPTY = {
  agentId: string;
  state: SessionState;
  
  write(input: string): void;
  onData(callback: (data: string) => void): void;
  onStateChange(callback: (state: SessionState) => void): void;
  
  start(): void;
  pause(): void;
  resume(): void;
  kill(): void;
  restart(): void;
  
  getHistory(): CommandBlock[];
  clearHistory(): void;
};

export function createMockPTY(agentId: string, config: AgentConfig): MockPTY {
  let state: SessionState = 'idle';
  const history: CommandBlock[] = [];
  const dataCallbacks: ((data: string) => void)[] = [];
  const stateCallbacks: ((state: SessionState) => void)[] = [];
  
  function setState(newState: SessionState) {
    state = newState;
    stateCallbacks.forEach(cb => cb(newState));
  }
  
  function emitData(data: string) {
    dataCallbacks.forEach(cb => cb(data));
  }
  
  return {
    agentId,
    get state() {
      return state;
    },
    
    write(input: string) {
      if (state !== 'waiting' && state !== 'idle') {
        return; // Can't write in other states
      }
      
      setState('working');
      emitData(`$ ${input}\n`);
      
      const { response, delay } = getMockResponse(agentId, input);
      const delayMs = delay.min + Math.random() * (delay.max - delay.min);
      
      setTimeout(() => {
        emitData(response + '\n');
        
        const block: CommandBlock = {
          id: crypto.randomUUID(),
          command: input,
          timestamp: Date.now(),
          output: response,
          isMultiLine: response.includes('\n'),
          isCollapsed: false,
        };
        
        history.push(block);
        setState('waiting');
      }, delayMs);
    },
    
    onData(callback: (data: string) => void) {
      dataCallbacks.push(callback);
    },
    
    onStateChange(callback: (state: SessionState) => void) {
      stateCallbacks.push(callback);
    },
    
    start() {
      setState('waiting');
    },
    
    pause() {
      if (state === 'working' || state === 'waiting') {
        setState('paused');
      }
    },
    
    resume() {
      if (state === 'paused') {
        setState('waiting');
      }
    },
    
    kill() {
      setState('killed');
    },
    
    restart() {
      history.length = 0;
      setState('idle');
    },
    
    getHistory() {
      return [...history];
    },
    
    clearHistory() {
      history.length = 0;
    },
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test renderer/src/lib/mockPTY.test.ts`
Expected: PASS

- [ ] **Step 5: Write test for pause/resume**

```typescript
// Add to renderer/src/lib/mockPTY.test.ts
it('can pause and resume', () => {
  const pty = createMockPTY('claude', mockConfig);
  pty.start();
  expect(pty.state).toBe('waiting');
  
  pty.pause();
  expect(pty.state).toBe('paused');
  
  pty.resume();
  expect(pty.state).toBe('waiting');
});
```

- [ ] **Step 6: Run test to verify it passes**

Run: `pnpm test renderer/src/lib/mockPTY.test.ts`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add renderer/src/lib/mockPTY.ts renderer/src/lib/mockPTY.test.ts
git commit -m "feat: implement MockPTY with lifecycle management"
```

---

### Task 5: Session Persistence

**Files:**
- Create: `renderer/src/lib/sessionStore.ts`
- Create: `renderer/src/lib/sessionStore.test.ts`

**Interfaces:**
- Consumes: `SessionData`, `CommandBlock` from Task 2
- Produces: `saveSession(agentId, session)`, `loadSession(agentId)`

- [ ] **Step 1: Write failing test for save/load**

```typescript
// renderer/src/lib/sessionStore.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { saveSession, loadSession } from './sessionStore';
import type { SessionData } from '../types/session';

describe('sessionStore', () => {
  beforeEach(() => {
    localStorage.clear();
  });
  
  it('saves and loads session', () => {
    const session: SessionData = {
      state: 'waiting',
      history: [
        {
          id: '1',
          command: 'help',
          timestamp: Date.now(),
          output: 'help output',
          isMultiLine: false,
        },
      ],
      createdAt: Date.now(),
      lastActiveAt: Date.now(),
    };
    
    saveSession('claude', session);
    const loaded = loadSession('claude');
    
    expect(loaded).toEqual(session);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test renderer/src/lib/sessionStore.test.ts`
Expected: FAIL — `saveSession is not exported`

- [ ] **Step 3: Implement session store**

```typescript
// renderer/src/lib/sessionStore.ts
import type { SessionData } from '../types/session';

const STORAGE_PREFIX = 'pidash:session:';

export function saveSession(agentId: string, session: SessionData): void {
  const key = STORAGE_PREFIX + agentId;
  localStorage.setItem(key, JSON.stringify(session));
}

export function loadSession(agentId: string): SessionData | null {
  const key = STORAGE_PREFIX + agentId;
  const data = localStorage.getItem(key);
  if (!data) return null;
  
  try {
    return JSON.parse(data) as SessionData;
  } catch {
    return null;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test renderer/src/lib/sessionStore.test.ts`
Expected: PASS

- [ ] **Step 5: Write test for max blocks**

```typescript
// Add to renderer/src/lib/sessionStore.test.ts
it('enforces max 1000 blocks', () => {
  const history = Array.from({ length: 1005 }, (_, i) => ({
    id: String(i),
    command: `cmd${i}`,
    timestamp: Date.now(),
    output: `output${i}`,
    isMultiLine: false,
  }));
  
  const session: SessionData = {
    state: 'waiting',
    history,
    createdAt: Date.now(),
    lastActiveAt: Date.now(),
  };
  
  saveSession('claude', session);
  const loaded = loadSession('claude');
  
  expect(loaded?.history.length).toBe(1000);
  expect(loaded?.history[0].id).toBe('5'); // First 5 evicted
});
```

- [ ] **Step 6: Update implementation to enforce limit**

```typescript
// Update renderer/src/lib/sessionStore.ts
const MAX_BLOCKS = 1000;

export function saveSession(agentId: string, session: SessionData): void {
  const key = STORAGE_PREFIX + agentId;
  
  // Enforce max blocks limit
  if (session.history.length > MAX_BLOCKS) {
    session = {
      ...session,
      history: session.history.slice(-MAX_BLOCKS),
    };
  }
  
  localStorage.setItem(key, JSON.stringify(session));
}
```

- [ ] **Step 7: Run test to verify it passes**

Run: `pnpm test renderer/src/lib/sessionStore.test.ts`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add renderer/src/lib/sessionStore.ts renderer/src/lib/sessionStore.test.ts
git commit -m "feat: implement session persistence with max blocks limit"
```

---

### Task 6: useAgentSession Hook

**Files:**
- Create: `renderer/src/hooks/useAgentSession.ts`
- Create: `renderer/src/hooks/useAgentSession.test.ts`

**Interfaces:**
- Consumes: `createMockPTY` from Task 4
- Consumes: `saveSession`, `loadSession` from Task 5
- Consumes: `SessionState`, `CommandBlock` from Task 2
- Produces: `useAgentSession(agentId)` hook

- [ ] **Step 1: Write failing test for hook**

```typescript
// renderer/src/hooks/useAgentSession.test.ts
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAgentSession } from './useAgentSession';

describe('useAgentSession', () => {
  it('initializes with idle state', () => {
    const { result } = renderHook(() => useAgentSession('claude'));
    expect(result.current.state).toBe('idle');
  });
  
  it('transitions to working when submitting command', () => {
    const { result } = renderHook(() => useAgentSession('claude'));
    
    act(() => {
      result.current.submitCommand('help');
    });
    
    expect(result.current.state).toBe('working');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test renderer/src/hooks/useAgentSession.test.ts`
Expected: FAIL — `useAgentSession is not exported`

- [ ] **Step 3: Implement useAgentSession hook**

```typescript
// renderer/src/hooks/useAgentSession.ts
import { useState, useEffect, useRef, useCallback } from 'react';
import type { SessionState, CommandBlock } from '../types/session';
import { createMockPTY, type MockPTY } from '../lib/mockPTY';
import { saveSession, loadSession } from '../lib/sessionStore';
import type { AgentConfig } from '../types/session';

export type UseAgentSessionReturn = {
  state: SessionState;
  blocks: CommandBlock[];
  currentInput: string;
  
  submitCommand: (command: string) => void;
  pause: () => void;
  resume: () => void;
  kill: () => void;
  restart: () => void;
  clearHistory: () => void;
  setInput: (input: string) => void;
  
  toggleCollapse: (blockId: string) => void;
  
  historyBack: () => string | null;
  historyForward: () => string | null;
};

export function useAgentSession(agentId: string): UseAgentSessionReturn {
  const [state, setState] = useState<SessionState>('idle');
  const [blocks, setBlocks] = useState<CommandBlock[]>([]);
  const [currentInput, setCurrentInput] = useState('');
  const [historyIndex, setHistoryIndex] = useState(-1);
  
  const ptyRef = useRef<MockPTY | null>(null);
  const saveTimeoutRef = useRef<number | null>(null);
  
  // Initialize PTY and restore session
  useEffect(() => {
    const config: AgentConfig = {
      id: agentId,
      name: agentId,
      icon: agentId,
      path: `/mock/${agentId}`,
      source: 'detected',
    };
    
    const pty = createMockPTY(agentId, config);
    ptyRef.current = pty;
    
    // Restore persisted session
    const saved = loadSession(agentId);
    if (saved) {
      setState(saved.state === 'working' ? 'waiting' : saved.state);
      setBlocks(saved.history.map(h => ({ ...h, isCollapsed: false })));
    }
    
    // Subscribe to PTY state changes
    pty.onStateChange((newState) => {
      setState(newState);
    });
    
    // Subscribe to PTY data (for building blocks)
    let currentBlock: Partial<CommandBlock> | null = null;
    
    pty.onData((data) => {
      if (data.startsWith('$ ')) {
        // Command line
        currentBlock = {
          id: crypto.randomUUID(),
          command: data.slice(2).trim(),
          timestamp: Date.now(),
          output: '',
          isMultiLine: false,
          isCollapsed: false,
        };
      } else if (currentBlock) {
        // Output
        currentBlock.output += (currentBlock.output ? '\n' : '') + data;
        currentBlock.isMultiLine = currentBlock.output.includes('\n');
        
        // When state transitions to waiting, save the block
        if (pty.state === 'waiting') {
          setBlocks(prev => [...prev, currentBlock as CommandBlock]);
          currentBlock = null;
        }
      }
    });
    
    return () => {
      // Cleanup: flush pending save
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [agentId]);
  
  // Debounced save
  const scheduleSave = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    saveTimeoutRef.current = window.setTimeout(() => {
      if (ptyRef.current) {
        const history = blocks.map(({ isCollapsed, ...rest }) => rest);
        saveSession(agentId, {
          state,
          history,
          createdAt: Date.now(),
          lastActiveAt: Date.now(),
        });
      }
    }, 1000);
  }, [agentId, blocks, state]);
  
  // Save on state change
  useEffect(() => {
    scheduleSave();
  }, [state, scheduleSave]);
  
  const submitCommand = useCallback((command: string) => {
    if (ptyRef.current && (state === 'idle' || state === 'waiting')) {
      ptyRef.current.start();
      ptyRef.current.write(command);
      setCurrentInput('');
      setHistoryIndex(-1);
    }
  }, [state]);
  
  const pause = useCallback(() => {
    ptyRef.current?.pause();
  }, []);
  
  const resume = useCallback(() => {
    ptyRef.current?.resume();
  }, []);
  
  const kill = useCallback(() => {
    ptyRef.current?.kill();
  }, []);
  
  const restart = useCallback(() => {
    ptyRef.current?.restart();
    setBlocks([]);
    setState('idle');
  }, []);
  
  const clearHistory = useCallback(() => {
    ptyRef.current?.clearHistory();
    setBlocks([]);
  }, []);
  
  const setInput = useCallback((input: string) => {
    setCurrentInput(input);
  }, []);
  
  const toggleCollapse = useCallback((blockId: string) => {
    setBlocks(prev => prev.map(b => 
      b.id === blockId ? { ...b, isCollapsed: !b.isCollapsed } : b
    ));
  }, []);
  
  const historyBack = useCallback((): string | null => {
    const commands = blocks.map(b => b.command);
    if (commands.length === 0) return null;
    
    const newIndex = Math.min(historyIndex + 1, commands.length - 1);
    setHistoryIndex(newIndex);
    return commands[commands.length - 1 - newIndex];
  }, [blocks, historyIndex]);
  
  const historyForward = useCallback((): string | null => {
    if (historyIndex <= 0) {
      setHistoryIndex(-1);
      return '';
    }
    
    const commands = blocks.map(b => b.command);
    const newIndex = historyIndex - 1;
    setHistoryIndex(newIndex);
    return commands[commands.length - 1 - newIndex];
  }, [blocks, historyIndex]);
  
  return {
    state,
    blocks,
    currentInput,
    submitCommand,
    pause,
    resume,
    kill,
    restart,
    clearHistory,
    setInput,
    toggleCollapse,
    historyBack,
    historyForward,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test renderer/src/hooks/useAgentSession.test.ts`
Expected: PASS

- [ ] **Step 5: Write test for pause/resume**

```typescript
// Add to renderer/src/hooks/useAgentSession.test.ts
it('can pause and resume', () => {
  const { result } = renderHook(() => useAgentSession('claude'));
  
  act(() => {
    result.current.submitCommand('help');
  });
  
  // Wait for working state
  expect(result.current.state).toBe('working');
  
  act(() => {
    result.current.pause();
  });
  
  expect(result.current.state).toBe('paused');
  
  act(() => {
    result.current.resume();
  });
  
  expect(result.current.state).toBe('waiting');
});
```

- [ ] **Step 6: Run test to verify it passes**

Run: `pnpm test renderer/src/hooks/useAgentSession.test.ts`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add renderer/src/hooks/useAgentSession.ts renderer/src/hooks/useAgentSession.test.ts
git commit -m "feat: implement useAgentSession hook with state machine"
```

---

### Task 7: AnsiText Component

**Files:**
- Create: `renderer/src/components/terminal/AnsiText.tsx`
- Create: `renderer/src/components/terminal/AnsiText.test.tsx`

**Interfaces:**
- Consumes: `parseAnsi` from Task 1
- Produces: `AnsiText` component

- [ ] **Step 1: Write failing test for AnsiText**

```typescript
// renderer/src/components/terminal/AnsiText.test.tsx
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { AnsiText } from './AnsiText';

describe('AnsiText', () => {
  it('renders plain text', () => {
    const { container } = render(<AnsiText text="hello" />);
    expect(container.textContent).toBe('hello');
  });
  
  it('renders bold text', () => {
    const { container } = render(<AnsiText text="\x1b[1mbold\x1b[0m" />);
    const span = container.querySelector('span');
    expect(span?.style.fontWeight).toBe('bold');
    expect(span?.textContent).toBe('bold');
  });
  
  it('renders colored text', () => {
    const { container } = render(<AnsiText text="\x1b[32mgreen\x1b[0m" />);
    const span = container.querySelector('span');
    expect(span?.style.color).toBe('rgb(34, 197, 94)'); // #22c55e in RGB
    expect(span?.textContent).toBe('green');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test renderer/src/components/terminal/AnsiText.test.tsx`
Expected: FAIL — `AnsiText is not exported`

- [ ] **Step 3: Implement AnsiText component**

```typescript
// renderer/src/components/terminal/AnsiText.tsx
import { parseAnsi } from '../../lib/ansiParser';

export function AnsiText({ text }: { text: string }) {
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

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test renderer/src/components/terminal/AnsiText.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add renderer/src/components/terminal/AnsiText.tsx renderer/src/components/terminal/AnsiText.test.tsx
git commit -m "feat: add AnsiText component for styled terminal output"
```

---

### Task 8: CommandBlock Component

**Files:**
- Create: `renderer/src/components/terminal/CommandBlock.tsx`
- Create: `renderer/src/components/terminal/CommandBlock.test.tsx`

**Interfaces:**
- Consumes: `CommandBlock` type from Task 2
- Consumes: `AnsiText` from Task 7
- Produces: `CommandBlockView` component

- [ ] **Step 1: Write failing test for CommandBlock**

```typescript
// renderer/src/components/terminal/CommandBlock.test.tsx
import { describe, it, expect } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { CommandBlockView } from './CommandBlock';
import type { CommandBlock } from '../../types/session';

const mockBlock: CommandBlock = {
  id: '1',
  command: 'ls',
  timestamp: Date.now(),
  output: 'file1.txt\nfile2.txt',
  isMultiLine: true,
  isCollapsed: false,
};

describe('CommandBlockView', () => {
  it('renders command and output', () => {
    const { container } = render(
      <CommandBlockView block={mockBlock} onToggleCollapse={() => {}} />
    );
    expect(container.textContent).toContain('ls');
    expect(container.textContent).toContain('file1.txt');
  });
  
  it('shows collapse chevron for multi-line blocks', () => {
    const { container } = render(
      <CommandBlockView block={mockBlock} onToggleCollapse={() => {}} />
    );
    expect(container.textContent).toContain('▼');
  });
  
  it('calls onToggleCollapse when header is clicked', () => {
    let clicked = false;
    const { container } = render(
      <CommandBlockView block={mockBlock} onToggleCollapse={() => { clicked = true; }} />
    );
    
    const header = container.querySelector('.block-header');
    fireEvent.click(header!);
    
    expect(clicked).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test renderer/src/components/terminal/CommandBlock.test.tsx`
Expected: FAIL — `CommandBlockView is not exported`

- [ ] **Step 3: Implement CommandBlock component**

```typescript
// renderer/src/components/terminal/CommandBlock.tsx
import type { CommandBlock } from '../../types/session';
import { AnsiText } from './AnsiText';

type CommandBlockViewProps = {
  block: CommandBlock;
  onToggleCollapse: (blockId: string) => void;
};

export function CommandBlockView({ block, onToggleCollapse }: CommandBlockViewProps) {
  if (!block.isMultiLine) {
    // Flat rendering for single-line output
    return (
      <div className="command-block-flat">
        <div className="command">$ {block.command}</div>
        <div className="output">
          <AnsiText text={block.output} />
        </div>
      </div>
    );
  }
  
  // Collapsible block for multi-line output
  return (
    <div className="command-block">
      <div 
        className="block-header"
        onClick={() => onToggleCollapse(block.id)}
      >
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

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test renderer/src/components/terminal/CommandBlock.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add renderer/src/components/terminal/CommandBlock.tsx renderer/src/components/terminal/CommandBlock.test.tsx
git commit -m "feat: add CommandBlock component with collapse/expand"
```

---

### Task 9: TerminalPane Component

**Files:**
- Create: `renderer/src/components/terminal/TerminalPane.tsx`
- Create: `renderer/src/components/terminal/TerminalPane.test.tsx`

**Interfaces:**
- Consumes: `useAgentSession` from Task 6
- Consumes: `CommandBlockView` from Task 8
- Produces: `TerminalPane` component

- [ ] **Step 1: Write failing test for TerminalPane**

```typescript
// renderer/src/components/terminal/TerminalPane.test.tsx
import { describe, it, expect } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { TerminalPane } from './TerminalPane';

describe('TerminalPane', () => {
  it('renders input field', () => {
    const { container } = render(<TerminalPane agentId="claude" />);
    const input = container.querySelector('input');
    expect(input).toBeDefined();
  });
  
  it('calls submitCommand on Enter', () => {
    const { container } = render(<TerminalPane agentId="claude" />);
    const input = container.querySelector('input')!;
    
    fireEvent.change(input, { target: { value: 'help' } });
    fireEvent.keyPress(input, { key: 'Enter', charCode: 13 });
    
    // Input should be cleared after submit
    expect(input.value).toBe('');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test renderer/src/components/terminal/TerminalPane.test.tsx`
Expected: FAIL — `TerminalPane is not exported`

- [ ] **Step 3: Implement TerminalPane component**

```typescript
// renderer/src/components/terminal/TerminalPane.tsx
import { useRef, useEffect } from 'react';
import { useAgentSession } from '../../hooks/useAgentSession';
import { CommandBlockView } from './CommandBlock';

export function TerminalPane({ agentId }: { agentId: string }) {
  const {
    state,
    blocks,
    currentInput,
    submitCommand,
    setInput,
    toggleCollapse,
    historyBack,
    historyForward,
  } = useAgentSession(agentId);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [blocks]);
  
  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && currentInput.trim()) {
      submitCommand(currentInput.trim());
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prev = historyBack();
      if (prev !== null) setInput(prev);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = historyForward();
      if (next !== null) setInput(next);
    }
  };
  
  const isInputDisabled = state === 'working' || state === 'paused' || state === 'killed';
  
  return (
    <div className="terminal-pane">
      <div className="terminal-content" ref={scrollRef}>
        {blocks.map(block => (
          <CommandBlockView
            key={block.id}
            block={block}
            onToggleCollapse={toggleCollapse}
          />
        ))}
      </div>
      
      <div className="terminal-input-container">
        <span>$ </span>
        <input
          ref={inputRef}
          type="text"
          value={currentInput}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isInputDisabled}
          placeholder={state === 'killed' ? 'Session terminated' : 'Type a command...'}
        />
        {state === 'working' && <span className="spinner">⟳</span>}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test renderer/src/components/terminal/TerminalPane.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add renderer/src/components/terminal/TerminalPane.tsx renderer/src/components/terminal/TerminalPane.test.tsx
git commit -m "feat: add TerminalPane component with input and scroll"
```

---

### Task 10: TerminalView Integration

**Files:**
- Modify: `renderer/src/components/terminal/TerminalView.tsx`

**Interfaces:**
- Consumes: `TerminalPane` from Task 9
- Consumes: `useAgentSession` from Task 6

- [ ] **Step 1: Update TerminalView to use TerminalPane**

```typescript
// Update renderer/src/components/terminal/TerminalView.tsx
import { useAgentSession } from '../../hooks/useAgentSession';
import { TerminalPane } from './TerminalPane';

export function TerminalView({ agentId }: { agentId: string }) {
  const { state, pause, resume, kill, restart, clearHistory } = useAgentSession(agentId);
  
  return (
    <div className="terminal-view">
      <div className="terminal-controls">
        {state === 'working' || state === 'waiting' ? (
          <button onClick={pause}>Pause</button>
        ) : state === 'paused' ? (
          <button onClick={resume}>Resume</button>
        ) : null}
        
        {state !== 'killed' && (
          <button onClick={kill}>Kill</button>
        )}
        
        {state === 'killed' && (
          <button onClick={restart}>Restart</button>
        )}
        
        <button onClick={clearHistory}>Clear History</button>
      </div>
      
      <TerminalPane agentId={agentId} />
    </div>
  );
}
```

- [ ] **Step 2: Run all tests to verify integration**

Run: `pnpm test`
Expected: All tests PASS

- [ ] **Step 3: Manual visual test**

Run: `pnpm dev`

Navigate to an agent detail view. Verify:
- Input field is visible and focused
- Typing a command and pressing Enter shows the command and response
- Multi-line output is collapsible
- Pause/Resume/Kill/Restart buttons work
- Session persists across page refresh

- [ ] **Step 4: Commit**

```bash
git add renderer/src/components/terminal/TerminalView.tsx
git commit -m "feat: integrate TerminalPane into TerminalView with controls"
```

---

### Task 11: Final Integration & Styling

**Files:**
- Modify: `renderer/src/index.css`

- [ ] **Step 1: Add terminal styles**

```css
/* Add to renderer/src/index.css */

/* Terminal Pane */
.terminal-pane {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #0d0d0d;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 13px;
}

.terminal-content {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}

.terminal-input-container {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  border-top: 1px solid #2a2a2a;
  background: #1a1a1a;
}

.terminal-input-container span {
  color: #22c55e;
  margin-right: 8px;
}

.terminal-input-container input {
  flex: 1;
  background: transparent;
  border: none;
  color: #e5e5e5;
  outline: none;
  font-family: inherit;
  font-size: inherit;
}

.terminal-input-container input:disabled {
  opacity: 0.5;
}

.terminal-input-container .spinner {
  color: #3b82f6;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Command Blocks */
.command-block-flat {
  margin-bottom: 8px;
}

.command-block-flat .command {
  color: #3b82f6;
}

.command-block-flat .output {
  color: #a3a3a3;
  margin-left: 16px;
}

.command-block {
  margin-bottom: 8px;
  border-left: 2px solid #2a2a2a;
  padding-left: 8px;
}

.block
-header {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 4px 0;
  color: #3b82f6;
  user-select: none;
}

.block-header:hover {
  background: #1a1a1a;
}

.block-header span:first-child {
  font-size: 10px;
  width: 12px;
}

.block-body {
  margin-left: 20px;
  color: #a3a3a3;
  white-space: pre-wrap;
}

/* Terminal View */
.terminal-view {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.terminal-controls {
  display: flex;
  gap: 8px;
  padding: 8px 12px;
  border-bottom: 1px solid #2a2a2a;
  background: #1a1a1a;
}

.terminal-controls button {
  padding: 4px 12px;
  background: #2a2a2a;
  border: none;
  color: #e5e5e5;
  cursor: pointer;
  border-radius: 4px;
  font-size: 12px;
}

.terminal-controls button:hover {
  background: #3a3a3a;
}
```

- [ ] **Step 2: Run all tests**

Run: `pnpm test`
Expected: All tests PASS

- [ ] **Step 3: Visual verification**

Run: `pnpm dev`

Navigate to agent detail view and verify:
- Terminal has dark background
- Commands are blue
- Output is gray
- Blocks have left border
- Collapse/expand works smoothly
- Controls are styled correctly

- [ ] **Step 4: Commit**

```bash
git add renderer/src/index.css
git commit -m "feat: add terminal styling"
```

---

## Self-Review

**Spec coverage:**
- ✅ Interactive terminal sessions (Tasks 6-10)
- ✅ Mock PTY backend (Tasks 3-4)
- ✅ Session lifecycle state machine (Tasks 4, 6)
- ✅ Custom block renderer (Tasks 7-9)
- ✅ ANSI parser (Tasks 1, 7)
- ✅ Command blocks with collapse/expand (Task 8)
- ✅ Session persistence (Task 5)
- ✅ Agent personalities (Task 3)
- ✅ Migration from existing TerminalView (Task 10)

**Placeholder scan:** No TBDs, TODOs, or vague steps found.

**Type consistency:** All types match across tasks:
- `SessionState` defined in Task 2, used in Tasks 4, 6
- `CommandBlock` defined in Task 2, used in Tasks 6, 8, 9
- `parseAnsi` defined in Task 1, used in Task 7
- `createMockPTY` defined in Task 4, used in Task 6
- `useAgentSession` defined in Task 6, used in Tasks 9, 10

---

Plan complete and saved to `docs/superpowers/plans/2026-08-05-live-agent-session-management.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?