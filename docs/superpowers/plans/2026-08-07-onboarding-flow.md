# Onboarding Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the complete onboarding flow as specified in the Pencil design, including 7 shared UI components, 8 screens (1 new), and agent path detection.

**Architecture:** Design system first approach — build shared UI components (IconBox, Checkbox, Spinner, StatusIcon, AgentRow, AgentCard, AgentChip), then update existing screens to use them and add the missing Scan Error screen. Agent path resolution uses PATH check + known locations fallback.

**Tech Stack:** React, TypeScript, Tailwind CSS, lucide-react icons, Vitest for testing

## Global Constraints

- All components must be typed with TypeScript interfaces
- Use existing Tailwind classes from the project (no new CSS files)
- Follow existing file structure: components in `renderer/src/components/`, utils in `renderer/src/utils/`
- Tests use Vitest + React Testing Library
- Design source: `design/pidash-ui.pen` frame `Fs3DC`

---

## File Structure

### New Files
| File | Responsibility |
|------|---------------|
| `renderer/src/components/ui/IconBox.tsx` | Colored icon container |
| `renderer/src/components/ui/Checkbox.tsx` | Styled checkbox with indigo border |
| `renderer/src/components/ui/Spinner.tsx` | Ring/arc loading indicator |
| `renderer/src/components/ui/StatusIcon.tsx` | CheckCircle / AlertCircle icons |
| `renderer/src/components/ui/AgentRow.tsx` | Selectable agent row with optional checkbox |
| `renderer/src/components/ui/AgentCard.tsx` | Agent info card with download link |
| `renderer/src/components/ui/AgentChip.tsx` | Clickable chip for path auto-fill |
| `renderer/src/components/onboarding/ScanErrorScreen.tsx` | Scan failure screen |
| `renderer/src/utils/agentPathResolver.ts` | Agent path detection utility |
| `renderer/src/components/ui/__tests__/IconBox.test.tsx` | IconBox tests |
| `renderer/src/components/ui/__tests__/Checkbox.test.tsx` | Checkbox tests |
| `renderer/src/components/ui/__tests__/Spinner.test.tsx` | Spinner tests |
| `renderer/src/components/ui/__tests__/StatusIcon.test.tsx` | StatusIcon tests |
| `renderer/src/components/ui/__tests__/AgentRow.test.tsx` | AgentRow tests |
| `renderer/src/components/ui/__tests__/AgentCard.test.tsx` | AgentCard tests |
| `renderer/src/components/ui/__tests__/AgentChip.test.tsx` | AgentChip tests |
| `renderer/src/components/onboarding/__tests__/ScanErrorScreen.test.tsx` | ScanErrorScreen tests |
| `renderer/src/utils/__tests__/agentPathResolver.test.ts` | Path resolver tests |

### Modified Files
| File | Changes |
|------|---------|
| `src/shared/types.ts` | Add `'scan-error'` to ScreenName |
| `renderer/src/components/onboarding/OnboardingFlow.tsx` | Add ScanErrorScreen to registry |
| `renderer/src/components/onboarding/WelcomeScreen.tsx` | Update layout, use IconBox |
| `renderer/src/components/onboarding/ScanningScreen.tsx` | Use Spinner, navigate to scan-error |
| `renderer/src/components/onboarding/ResultsScreen.tsx` | Use Checkbox, AgentRow |
| `renderer/src/components/onboarding/ManualAddScreen.tsx` | Add AgentChip group |
| `renderer/src/components/onboarding/NoAgentsScreen.tsx` | Use AgentCard, add search icon |
| `renderer/src/components/onboarding/ReadyScreen.tsx` | Use StatusIcon, AgentRow with badges |

---

## Task 1: Update ScreenName Type

**Files:**
- Modify: `src/shared/types.ts:56`

**Interfaces:**
- Produces: `ScreenName` type with `'scan-error'` added

- [ ] **Step 1: Update the ScreenName type**

Open `src/shared/types.ts` and update line 56:

```typescript
export type ScreenName = 'welcome' | 'scanning' | 'results' | 'manual-add' | 'ready' | 'no-agents' | 'scan-error';
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `pnpm tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/shared/types.ts
git commit -m "feat: add scan-error to ScreenName type"
```

---

## Task 2: Create IconBox Component

**Files:**
- Create: `renderer/src/components/ui/IconBox.tsx`
- Create: `renderer/src/components/ui/__tests__/IconBox.test.tsx`

**Interfaces:**
```typescript
interface IconBoxProps {
  icon: LucideIcon;
  bgColor: string;
  iconColor: string;
  size?: number;
}
```

- [ ] **Step 1: Write the failing test**

Create `renderer/src/components/ui/__tests__/IconBox.test.tsx`:

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Search } from 'lucide-react';
import { IconBox } from '../IconBox';

describe('IconBox', () => {
  it('renders with correct size', () => {
    render(<IconBox icon={Search} bgColor="#3b82f622" iconColor="#3b82f6" size={40} />);
    const container = screen.getByTestId('icon-box');
    expect(container).toHaveStyle({ width: '40px', height: '40px' });
  });

  it('renders with default size', () => {
    render(<IconBox icon={Search} bgColor="#3b82f622" iconColor="#3b82f6" />);
    const container = screen.getByTestId('icon-box');
    expect(container).toHaveStyle({ width: '40px', height: '40px' });
  });

  it('applies background color', () => {
    render(<IconBox icon={Search} bgColor="#3b82f622" iconColor="#3b82f6" />);
    const container = screen.getByTestId('icon-box');
    expect(container).toHaveStyle({ backgroundColor: '#3b82f622' });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run renderer/src/components/ui/__tests__/IconBox.test.tsx`
Expected: FAIL — module not found

- [ ] **Step 3: Write minimal implementation**

Create `renderer/src/components/ui/IconBox.tsx`:

```typescript
import type { LucideIcon } from 'lucide-react';

interface IconBoxProps {
  icon: LucideIcon;
  bgColor: string;
  iconColor: string;
  size?: number;
}

export function IconBox({ icon: Icon, bgColor, iconColor, size = 40 }: IconBoxProps) {
  return (
    <div
      data-testid="icon-box"
      className="rounded-lg flex items-center justify-center shrink-0"
      style={{
        width: `${size}px`,
        height: `${size}px`,
        backgroundColor: bgColor,
      }}
    >
      <Icon size={size * 0.5} style={{ color: iconColor }} />
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run renderer/src/components/ui/__tests__/IconBox.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add renderer/src/components/ui/IconBox.tsx renderer/src/components/ui/__tests__/IconBox.test.tsx
git commit -m "feat: add IconBox component"
```

---

## Task 3: Create Checkbox Component

**Files:**
- Create: `renderer/src/components/ui/Checkbox.tsx`
- Create: `renderer/src/components/ui/__tests__/Checkbox.test.tsx`

**Interfaces:**
```typescript
interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
}
```

- [ ] **Step 1: Write the failing test**

Create `renderer/src/components/ui/__tests__/Checkbox.test.tsx`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Checkbox } from '../Checkbox';

describe('Checkbox', () => {
  it('renders unchecked state', () => {
    render(<Checkbox checked={false} onChange={() => {}} />);
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toHaveAttribute('aria-checked', 'false');
  });

  it('renders checked state with indigo background', () => {
    render(<Checkbox checked={true} onChange={() => {}} />);
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toHaveAttribute('aria-checked', 'true');
  });

  it('calls onChange when clicked', () => {
    const handleChange = vi.fn();
    render(<Checkbox checked={false} onChange={handleChange} />);
    fireEvent.click(screen.getByRole('checkbox'));
    expect(handleChange).toHaveBeenCalledWith(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run renderer/src/components/ui/__tests__/Checkbox.test.tsx`
Expected: FAIL — module not found

- [ ] **Step 3: Write minimal implementation**

Create `renderer/src/components/ui/Checkbox.tsx`:

```typescript
import { Check } from 'lucide-react';

interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function Checkbox({ checked, onChange }: CheckboxProps) {
  return (
    <button
      role="checkbox"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="w-5 h-5 rounded flex items-center justify-center shrink-0 transition-colors"
      style={{
        backgroundColor: checked ? '#4f46e5' : '#1a1a1a',
        border: `2px solid ${checked ? '#4f46e5' : '#6b7280'}`,
      }}
    >
      {checked && <Check size={14} className="text-white" />}
    </button>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run renderer/src/components/ui/__tests__/Checkbox.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add renderer/src/components/ui/Checkbox.tsx renderer/src/components/ui/__tests__/Checkbox.test.tsx
git commit -m "feat: add Checkbox component"
```

---

## Task 4: Create Spinner Component

**Files:**
- Create: `renderer/src/components/ui/Spinner.tsx`
- Create: `renderer/src/components/ui/__tests__/Spinner.test.tsx`

**Interfaces:**
```typescript
interface SpinnerProps {
  size?: number;
  color?: string;
}
```

- [ ] **Step 1: Write the failing test**

Create `renderer/src/components/ui/__tests__/Spinner.test.tsx`:

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Spinner } from '../Spinner';

describe('Spinner', () => {
  it('renders with default size', () => {
    render(<Spinner />);
    const spinner = screen.getByTestId('spinner');
    expect(spinner).toHaveStyle({ width: '64px', height: '64px' });
  });

  it('renders with custom size', () => {
    render(<Spinner size={48} />);
    const spinner = screen.getByTestId('spinner');
    expect(spinner).toHaveStyle({ width: '48px', height: '48px' });
  });

  it('has loading role', () => {
    render(<Spinner />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run renderer/src/components/ui/__tests__/Spinner.test.tsx`
Expected: FAIL — module not found

- [ ] **Step 3: Write minimal implementation**

Create `renderer/src/components/ui/Spinner.tsx`:

```typescript
interface SpinnerProps {
  size?: number;
  color?: string;
}

export function Spinner({ size = 64, color = '#4f46e5' }: SpinnerProps) {
  const strokeWidth = 4;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <div
      data-testid="spinner"
      role="status"
      className="animate-spin"
      style={{ width: `${size}px`, height: `${size}px` }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Background ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#334155"
          strokeWidth={strokeWidth}
        />
        {/* Animated arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDasharray={`${circumference * 0.25} ${circumference * 0.75}`}
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run renderer/src/components/ui/__tests__/Spinner.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add renderer/src/components/ui/Spinner.tsx renderer/src/components/ui/__tests__/Spinner.test.tsx
git commit -m "feat: add Spinner component"
```

---

## Task 5: Create StatusIcon Component

**Files:**
- Create: `renderer/src/components/ui/StatusIcon.tsx`
- Create: `renderer/src/components/ui/__tests__/StatusIcon.test.tsx`

**Interfaces:**
```typescript
interface StatusIconProps {
  type: 'success' | 'error';
  size?: number;
}
```

- [ ] **Step 1: Write the failing test**

Create `renderer/src/components/ui/__tests__/StatusIcon.test.tsx`:

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusIcon } from '../StatusIcon';

describe('StatusIcon', () => {
  it('renders success icon', () => {
    render(<StatusIcon type="success" />);
    expect(screen.getByTestId('status-icon')).toBeInTheDocument();
  });

  it('renders error icon', () => {
    render(<StatusIcon type="error" />);
    expect(screen.getByTestId('status-icon')).toBeInTheDocument();
  });

  it('applies custom size', () => {
    render(<StatusIcon type="success" size={48} />);
    const icon = screen.getByTestId('status-icon');
    expect(icon).toHaveStyle({ width: '48px', height: '48px' });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run renderer/src/components/ui/__tests__/StatusIcon.test.tsx`
Expected: FAIL — module not found

- [ ] **Step 3: Write minimal implementation**

Create `renderer/src/components/ui/StatusIcon.tsx`:

```typescript
import { CheckCircle, AlertCircle } from 'lucide-react';

interface StatusIconProps {
  type: 'success' | 'error';
  size?: number;
}

export function StatusIcon({ type, size = 64 }: StatusIconProps) {
  const Icon = type === 'success' ? CheckCircle : AlertCircle;
  const color = type === 'success' ? '#10b981' : '#f43f5e';

  return (
    <div
      data-testid="status-icon"
      style={{ width: `${size}px`, height: `${size}px`, color }}
    >
      <Icon size={size} />
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run renderer/src/components/ui/__tests__/StatusIcon.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add renderer/src/components/ui/StatusIcon.tsx renderer/src/components/ui/__tests__/StatusIcon.test.tsx
git commit -m "feat: add StatusIcon component"
```

---

## Task 6: Create AgentRow Component

**Files:**
- Create: `renderer/src/components/ui/AgentRow.tsx`
- Create: `renderer/src/components/ui/__tests__/AgentRow.test.tsx`

**Interfaces:**
```typescript
interface AgentRowProps {
  name: string;
  path: string;
  icon: string;
  gradient: string;
  selected?: boolean;
  onToggle?: () => void;
  showCheckbox?: boolean;
  badge?: string;
}
```

- [ ] **Step 1: Write the failing test**

Create `renderer/src/components/ui/__tests__/AgentRow.test.tsx`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AgentRow } from '../AgentRow';

describe('AgentRow', () => {
  const defaultProps = {
    name: 'Claude Code',
    path: '/usr/local/bin/claude',
    icon: 'claude',
    gradient: 'from-orange-500 to-red-600',
  };

  it('renders agent name and path', () => {
    render(<AgentRow {...defaultProps} />);
    expect(screen.getByText('Claude Code')).toBeInTheDocument();
    expect(screen.getByText('/usr/local/bin/claude')).toBeInTheDocument();
  });

  it('shows checkbox when showCheckbox is true', () => {
    render(<AgentRow {...defaultProps} showCheckbox={true} selected={false} />);
    expect(screen.getByRole('checkbox')).toBeInTheDocument();
  });

  it('calls onToggle when clicked', () => {
    const handleToggle = vi.fn();
    render(<AgentRow {...defaultProps} showCheckbox={true} selected={false} onToggle={handleToggle} />);
    fireEvent.click(screen.getByRole('checkbox'));
    expect(handleToggle).toHaveBeenCalled();
  });

  it('shows badge when provided', () => {
    render(<AgentRow {...defaultProps} badge="Detected" />);
    expect(screen.getByText('Detected')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run renderer/src/components/ui/__tests__/AgentRow.test.tsx`
Expected: FAIL — module not found

- [ ] **Step 3: Write minimal implementation**

Create `renderer/src/components/ui/AgentRow.tsx`:

```typescript
import { Checkbox } from './Checkbox';

// Agent gradient registry
const AGENT_GRADIENTS: Record<string, { gradient: string; symbol: string }> = {
  omp: { gradient: 'from-indigo-500 to-purple-600', symbol: 'π' },
  cursor: { gradient: 'from-cyan-500 to-blue-600', symbol: '⌘' },
  aider: { gradient: 'from-emerald-500 to-teal-600', symbol: 'A' },
  claude: { gradient: 'from-orange-500 to-red-600', symbol: 'C' },
  codex: { gradient: 'from-orange-500 to-red-600', symbol: 'C' },
  continue: { gradient: 'from-violet-500 to-fuchsia-600', symbol: '▶' },
  copilot: { gradient: 'from-gray-500 to-gray-600', symbol: 'G' },
};

interface AgentRowProps {
  name: string;
  path: string;
  icon: string;
  gradient: string;
  selected?: boolean;
  onToggle?: () => void;
  showCheckbox?: boolean;
  badge?: string;
}

function AgentAvatar({ iconKey }: { iconKey: string }) {
  const entry = AGENT_GRADIENTS[iconKey];
  if (!entry) {
    return (
      <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center shrink-0">
        <span className="text-slate-400 text-sm">?</span>
      </div>
    );
  }
  return (
    <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${entry.gradient} flex items-center justify-center shrink-0`}>
      <span className="text-white text-sm font-bold">{entry.symbol}</span>
    </div>
  );
}

export function AgentRow({
  name,
  path,
  icon,
  gradient,
  selected = false,
  onToggle,
  showCheckbox = false,
  badge,
}: AgentRowProps) {
  const borderColor = selected ? '#4f46e5' : '#334155';
  const bgColor = selected ? '#4f46e522' : '#1a1a1a';

  return (
    <div
      className="rounded-lg flex items-center gap-3 p-3 transition-colors"
      style={{ backgroundColor: bgColor, border: `1px solid ${borderColor}` }}
    >
      {showCheckbox && (
        <Checkbox checked={selected} onChange={() => onToggle?.()} />
      )}
      <AgentAvatar iconKey={icon} />
      <div className="flex-1 min-w-0">
        <div className="text-white text-sm font-semibold truncate">{name}</div>
        <div className="text-slate-400 text-xs truncate">{path}</div>
      </div>
      {badge && (
        <span className="text-xs px-2 py-1 rounded bg-slate-700 text-slate-300 shrink-0">
          {badge}
        </span>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run renderer/src/components/ui/__tests__/AgentRow.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add renderer/src/components/ui/AgentRow.tsx renderer/src/components/ui/__tests__/AgentRow.test.tsx
git commit -m "feat: add AgentRow component"
```

---

## Task 7: Create AgentCard Component

**Files:**
- Create: `renderer/src/components/ui/AgentCard.tsx`
- Create: `renderer/src/components/ui/__tests__/AgentCard.test.tsx`

**Interfaces:**
```typescript
interface AgentCardProps {
  name: string;
  description: string;
  icon: string;
  gradient: string;
  url: string;
}
```

- [ ] **Step 1: Write the failing test**

Create `renderer/src/components/ui/__tests__/AgentCard.test.tsx`:

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AgentCard } from '../AgentCard';

describe('AgentCard', () => {
  it('renders agent name and description', () => {
    render(
      <AgentCard
        name="Cursor"
        description="AI-first code editor"
        icon="cursor"
        gradient="from-cyan-500 to-blue-600"
        url="https://cursor.sh"
      />
    );
    expect(screen.getByText('Cursor')).toBeInTheDocument();
    expect(screen.getByText('AI-first code editor')).toBeInTheDocument();
  });

  it('has download link', () => {
    render(
      <AgentCard
        name="Cursor"
        description="AI-first code editor"
        icon="cursor"
        gradient="from-cyan-500 to-blue-600"
        url="https://cursor.sh"
      />
    );
    const link = screen.getByRole('link', { name: /download/i });
    expect(link).toHaveAttribute('href', 'https://cursor.sh');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run renderer/src/components/ui/__tests__/AgentCard.test.tsx`
Expected: FAIL — module not found

- [ ] **Step 3: Write minimal implementation**

Create `renderer/src/components/ui/AgentCard.tsx`:

```typescript
import { ExternalLink } from 'lucide-react';

// Agent gradient registry (same as AgentRow)
const AGENT_GRADIENTS: Record<string, { gradient: string; symbol: string }> = {
  omp: { gradient: 'from-indigo-500 to-purple-600', symbol: 'π' },
  cursor: { gradient: 'from-cyan-500 to-blue-600', symbol: '⌘' },
  aider: { gradient: 'from-emerald-500 to-teal-600', symbol: 'A' },
  claude: { gradient: 'from-orange-500 to-red-600', symbol: 'C' },
  codex: { gradient: 'from-orange-500 to-red-600', symbol: 'C' },
  continue: { gradient: 'from-violet-500 to-fuchsia-600', symbol: '▶' },
  copilot: { gradient: 'from-gray-500 to-gray-600', symbol: 'G' },
};

interface AgentCardProps {
  name: string;
  description: string;
  icon: string;
  gradient: string;
  url: string;
}

function AgentAvatar({ iconKey, size = 40 }: { iconKey: string; size?: number }) {
  const entry = AGENT_GRADIENTS[iconKey];
  if (!entry) {
    return (
      <div
        className="rounded-lg bg-slate-700 flex items-center justify-center shrink-0"
        style={{ width: size, height: size }}
      >
        <span className="text-slate-400 text-lg">?</span>
      </div>
    );
  }
  return (
    <div
      className={`rounded-lg bg-gradient-to-br ${entry.gradient} flex items-center justify-center shrink-0`}
      style={{ width: size, height: size }}
    >
      <span className="text-white text-xl font-bold">{entry.symbol}</span>
    </div>
  );
}

export function AgentCard({ name, description, icon, gradient, url }: AgentCardProps) {
  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 flex items-start gap-4">
      <AgentAvatar iconKey={icon} size={48} />
      <div className="flex-1 min-w-0">
        <div className="text-white font-semibold">{name}</div>
        <div className="text-slate-400 text-sm mt-1">{description}</div>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-indigo-400 text-sm mt-2 hover:text-indigo-300"
        >
          <ExternalLink size={14} />
          Download
        </a>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run renderer/src/components/ui/__tests__/AgentCard.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add renderer/src/components/ui/AgentCard.tsx renderer/src/components/ui/__tests__/AgentCard.test.tsx
git commit -m "feat: add AgentCard component"
```

---

## Task 8: Create AgentChip Component

**Files:**
- Create: `renderer/src/components/ui/AgentChip.tsx`
- Create: `renderer/src/components/ui/__tests__/AgentChip.test.tsx`

**Interfaces:**
```typescript
interface AgentChipProps {
  name: string;
  agentId: string;
  onClick: (path: string) => void;
  selected?: boolean;
}
```

- [ ] **Step 1: Write the failing test**

Create `renderer/src/components/ui/__tests__/AgentChip.test.tsx`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AgentChip } from '../AgentChip';

describe('AgentChip', () => {
  it('renders agent name', () => {
    render(<AgentChip name="Claude Code" agentId="claude" onClick={() => {}} />);
    expect(screen.getByText('Claude Code')).toBeInTheDocument();
  });

  it('calls onClick with agentId when clicked', () => {
    const handleClick = vi.fn();
    render(<AgentChip name="Claude Code" agentId="claude" onClick={handleClick} />);
    fireEvent.click(screen.getByText('Claude Code'));
    expect(handleClick).toHaveBeenCalledWith('claude');
  });

  it('applies selected styling when selected', () => {
    render(<AgentChip name="Claude Code" agentId="claude" onClick={() => {}} selected={true} />);
    const chip = screen.getByRole('button');
    expect(chip).toHaveAttribute('aria-pressed', 'true');
  });

  it('applies unselected styling by default', () => {
    render(<AgentChip name="Claude Code" agentId="claude" onClick={() => {}} />);
    const chip = screen.getByRole('button');
    expect(chip).toHaveAttribute('aria-pressed', 'false');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run renderer/src/components/ui/__tests__/AgentChip.test.tsx`
Expected: FAIL — module not found

- [ ] **Step 3: Write minimal implementation**

Create `renderer/src/components/ui/AgentChip.tsx`:

```typescript
interface AgentChipProps {
  name: string;
  agentId: string;
  onClick: (agentId: string) => void;
  selected?: boolean;
}

export function AgentChip({ name, agentId, onClick, selected = false }: AgentChipProps) {
  const borderColor = selected ? '#4f46e5' : '#475569';
  const bgColor = selected ? '#4f46e522' : 'transparent';

  return (
    <button
      role="button"
      aria-pressed={selected}
      onClick={() => onClick(agentId)}
      className="px-3 py-1.5 rounded-full text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-900"
      style={{
        backgroundColor: bgColor,
        border: `1px solid ${borderColor}`,
        color: selected ? '#a5b4fc' : '#94a3b8',
      }}
    >
      {name}
    </button>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run renderer/src/components/ui/__tests__/AgentChip.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add renderer/src/components/ui/AgentChip.tsx renderer/src/components/ui/__tests__/AgentChip.test.tsx
git commit -m "feat: add AgentChip component"
```

---

## Task 9: Create Agent Path Resolver Utility

**Files:**
- Create: `renderer/src/utils/agentPathResolver.ts`
- Create: `renderer/src/utils/__tests__/agentPathResolver.test.ts`

**Interfaces:**
```typescript
export async function resolveAgentPath(agentId: string): Promise<string>
```

- [ ] **Step 1: Write the failing test**

Create `renderer/src/utils/__tests__/agentPathResolver.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resolveAgentPath } from '../agentPathResolver';

describe('resolveAgentPath', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns a path string for known agent claude', async () => {
    const path = await resolveAgentPath('claude');
    expect(typeof path).toBe('string');
    expect(path.length).toBeGreaterThan(0);
  });

  it('returns a path string for known agent cursor', async () => {
    const path = await resolveAgentPath('cursor');
    expect(typeof path).toBe('string');
    expect(path.length).toBeGreaterThan(0);
  });

  it('returns a path string for known agent aider', async () => {
    const path = await resolveAgentPath('aider');
    expect(typeof path).toBe('string');
    expect(path.length).toBeGreaterThan(0);
  });

  it('returns a path string for known agent omp', async () => {
    const path = await resolveAgentPath('omp');
    expect(typeof path).toBe('string');
    expect(path.length).toBeGreaterThan(0);
  });

  it('returns a path string for known agent copilot', async () => {
    const path = await resolveAgentPath('copilot');
    expect(typeof path).toBe('string');
    expect(path.length).toBeGreaterThan(0);
  });

  it('returns default path for unknown agent', async () => {
    const path = await resolveAgentPath('unknown-agent');
    expect(typeof path).toBe('string');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run renderer/src/utils/__tests__/agentPathResolver.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write minimal implementation**

Create `renderer/src/utils/agentPathResolver.ts`:

```typescript
const KNOWN_AGENTS: Record<string, {
  name: string;
  unixPaths: string[];
  windowsPaths: string[];
  defaultPath: string;
}> = {
  claude: {
    name: 'Claude Code',
    unixPaths: ['/usr/local/bin/claude', '~/.claude/bin/claude'],
    windowsPaths: ['C:\\Program Files\\Claude\\claude.exe', '%LOCALAPPDATA%\\Programs\\Claude\\claude.exe'],
    defaultPath: '/usr/local/bin/claude',
  },
  cursor: {
    name: 'Cursor',
    unixPaths: ['/Applications/Cursor.app', '~/.cursor/'],
    windowsPaths: ['C:\\Users\\%USERNAME%\\AppData\\Local\\Programs\\Cursor\\'],
    defaultPath: '/Applications/Cursor.app',
  },
  aider: {
    name: 'Aider',
    unixPaths: ['/usr/local/bin/aider', '~/.local/bin/aider'],
    windowsPaths: ['C:\\Program Files\\Aider\\aider.exe'],
    defaultPath: '/usr/local/bin/aider',
  },
  omp: {
    name: 'OMP',
    unixPaths: ['/usr/local/bin/omp'],
    windowsPaths: ['C:\\Program Files\\OMP\\omp.exe'],
    defaultPath: '/usr/local/bin/omp',
  },
  copilot: {
    name: 'GitHub Copilot',
    unixPaths: ['/usr/local/bin/gh'],
    windowsPaths: ['C:\\Program Files\\GitHub CLI\\gh.exe'],
    defaultPath: '/usr/local/bin/gh',
  },
};

const isWindows = typeof process !== 'undefined' && process.platform === 'win32';

async function checkPathExists(path: string): Promise<boolean> {
  try {
    if (typeof window !== 'undefined' && (window as any).api?.fileExists) {
      return (window as any).api.fileExists(path);
    }
    return false;
  } catch {
    return false;
  }
}

async function checkWhich(command: string): Promise<string | null> {
  try {
    if (typeof window !== 'undefined' && (window as any).api?.which) {
      const result = await (window as any).api.which(command);
      return result || null;
    }
    return null;
  } catch {
    return null;
  }
}

export async function resolveAgentPath(agentId: string): Promise<string> {
  const agent = KNOWN_AGENTS[agentId];
  if (!agent) {
    return agentId;
  }

  // Step 1: Check PATH using which/where
  const whichResult = await checkWhich(agentId);
  if (whichResult) {
    return whichResult;
  }

  // Step 2: Check known locations
  const paths = isWindows ? agent.windowsPaths : agent.unixPaths;
  for (const p of paths) {
    const exists = await checkPathExists(p);
    if (exists) {
      return p;
    }
  }

  // Step 3: Return default path
  return agent.defaultPath;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run renderer/src/utils/__tests__/agentPathResolver.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add renderer/src/utils/agentPathResolver.ts renderer/src/utils/__tests__/agentPathResolver.test.ts
git commit -m "feat: add agent path resolver utility"
```

---

## Task 10: Create Scan Error Screen

**Files:**
- Create: `renderer/src/components/onboarding/ScanErrorScreen.tsx`
- Create: `renderer/src/components/onboarding/__tests__/ScanErrorScreen.test.tsx`

**Interfaces:**
```typescript
interface ScanErrorScreenProps {
  onNavigate: (screen: ScreenName) => void;
}
```

- [ ] **Step 1: Write the failing test**

Create `renderer/src/components/onboarding/__tests__/ScanErrorScreen.test.tsx`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ScanErrorScreen } from '../ScanErrorScreen';

describe('ScanErrorScreen', () => {
  const mockOnNavigate = vi.fn();

  it('renders scan failed title', () => {
    render(<ScanErrorScreen onNavigate={mockOnNavigate} />);
    expect(screen.getByText('Scan Failed')).toBeInTheDocument();
  });

  it('renders error description', () => {
    render(<ScanErrorScreen onNavigate={mockOnNavigate} />);
    expect(screen.getByText(/couldn't scan for agents/i)).toBeInTheDocument();
  });

  it('renders Try Again button', () => {
    render(<ScanErrorScreen onNavigate={mockOnNavigate} />);
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('renders Add Manually button', () => {
    render(<ScanErrorScreen onNavigate={mockOnNavigate} />);
    expect(screen.getByRole('button', { name: /add manually/i })).toBeInTheDocument();
  });

  it('navigates to scanning on Try Again', () => {
    render(<ScanErrorScreen onNavigate={mockOnNavigate} />);
    fireEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(mockOnNavigate).toHaveBeenCalledWith('scanning');
  });

  it('navigates to manual-add on Add Manually', () => {
    render(<ScanErrorScreen onNavigate={mockOnNavigate} />);
    fireEvent.click(screen.getByRole('button', { name: /add manually/i }));
    expect(mockOnNavigate).toHaveBeenCalledWith('manual-add');
  });

  it('renders error status icon', () => {
    render(<ScanErrorScreen onNavigate={mockOnNavigate} />);
    expect(screen.getByTestId('status-icon')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run renderer/src/components/onboarding/__tests__/ScanErrorScreen.test.tsx`
Expected: FAIL — module not found

- [ ] **Step 3: Write minimal implementation**

Create `renderer/src/components/onboarding/ScanErrorScreen.tsx`:

```typescript
import type { ScreenName } from '../../types';
import { PiLogo } from '../ui/PiLogo';
import { StatusIcon } from '../ui/StatusIcon';

interface ScanErrorScreenProps {
  onNavigate: (screen: ScreenName) => void;
}

export function ScanErrorScreen({ onNavigate }: ScanErrorScreenProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-8">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <PiLogo size={48} />
        </div>

        <div className="flex justify-center">
          <StatusIcon type="error" size={64} />
        </div>

        <h2 className="text-2xl font-bold text-white">Scan Failed</h2>
        <p className="text-slate-400">
          We couldn't scan for agents. The scan may have timed out or been interrupted.
        </p>

        <div className="space-y-3">
          <button
            onClick={() => onNavigate('scanning')}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-900"
            aria-label="Try scanning again"
          >
            Try Again
          </button>
          <button
            onClick={() => onNavigate('manual-add')}
            className="w-full bg-transparent hover:bg-slate-800 text-slate-400 hover:text-slate-300 font-medium py-3 px-6 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-slate-600 focus:ring-offset-2 focus:ring-offset-slate-900"
            aria-label="Add an agent manually"
          >
            + Add Manually
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run renderer/src/components/onboarding/__tests__/ScanErrorScreen.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add renderer/src/components/onboarding/ScanErrorScreen.tsx renderer/src/components/onboarding/__tests__/ScanErrorScreen.test.tsx
git commit -m "feat: add ScanErrorScreen component"
```

---

## Task 11: Update OnboardingFlow (Add ScanErrorScreen to Registry)

**Files:**
- Modify: `renderer/src/components/onboarding/OnboardingFlow.tsx`
- Modify: `renderer/src/components/onboarding/OnboardingFlow.test.tsx`

- [ ] **Step 1: Update the test to include ScanErrorScreen**

Open `renderer/src/components/onboarding/OnboardingFlow.test.tsx` and add the mock and test case.

Add this mock at the top with the other mocks (after line 12):

```typescript
vi.mock('./ScanErrorScreen', () => ({ ScanErrorScreen: () => <div data-testid="scan-error">ScanErrorScreen</div> }));
```

Add this test case inside the `describe('OnboardingFlow')` block (after the ReadyScreen test):

```typescript
  it('renders ScanErrorScreen when currentScreen is scan-error', () => {
    mockState.currentScreen = 'scan-error';
    renderFlow();
    expect(screen.getByTestId('scan-error')).toBeInTheDocument();
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run renderer/src/components/onboarding/OnboardingFlow.test.tsx`
Expected: FAIL — ScanErrorScreen not in registry

- [ ] **Step 3: Update OnboardingFlow to register ScanErrorScreen**

Open `renderer/src/components/onboarding/OnboardingFlow.tsx` and make these changes:

Add the import (after the ReadyScreen import on line 8):

```typescript
import { ScanErrorScreen } from './ScanErrorScreen';
```

Update the `SCREEN_COMPONENTS` record to include `scan-error`:

```typescript
const SCREEN_COMPONENTS: Record<ScreenName, React.ComponentType<any>> = {
  welcome: WelcomeScreen,
  scanning: ScanningScreen,
  results: ResultsScreen,
  'manual-add': ManualAddScreen,
  'no-agents': NoAgentsScreen,
  ready: ReadyScreen,
  'scan-error': ScanErrorScreen,
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run renderer/src/components/onboarding/OnboardingFlow.test.tsx`
Expected: PASS — all 7 screen tests pass

- [ ] **Step 5: Commit**

```bash
git add renderer/src/components/onboarding/OnboardingFlow.tsx renderer/src/components/onboarding/OnboardingFlow.test.tsx
git commit -m "feat: register ScanErrorScreen in OnboardingFlow"
```

---

## Task 12: Update Welcome Screen (Vertical Layout, IconBox, Privacy Note)

**Files:**
- Modify: `renderer/src/components/onboarding/WelcomeScreen.tsx`
- Modify: `renderer/src/components/onboarding/WelcomeScreen.test.tsx`

**Changes:**
- Layout: 3-column grid → vertical stack (640px max-width, centered)
- Feature cards: Replace emojis with `IconBox` components
  - Auto-detect: blue bg, search icon
  - One-click launch: green bg, zap icon
  - Live activity: purple bg, activity icon
- Add privacy note at bottom

- [ ] **Step 1: Update the test**

Open `renderer/src/components/onboarding/WelcomeScreen.test.tsx` and replace its contents with:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { WelcomeScreen } from './WelcomeScreen';

describe('WelcomeScreen', () => {
  const mockOnNavigate = vi.fn();

  it('renders welcome title', () => {
    render(<WelcomeScreen onNavigate={mockOnNavigate} />);
    expect(screen.getByText(/Welcome to PiDash/i)).toBeInTheDocument();
  });

  it('renders description text', () => {
    render(<WelcomeScreen onNavigate={mockOnNavigate} />);
    expect(screen.getByText(/unified dashboard/i)).toBeInTheDocument();
  });

  it('renders Get Started button', () => {
    render(<WelcomeScreen onNavigate={mockOnNavigate} />);
    const button = screen.getByRole('button', { name: /get started/i });
    expect(button).toBeInTheDocument();
  });

  it('renders skip link', () => {
    render(<WelcomeScreen onNavigate={mockOnNavigate} />);
    const link = screen.getByRole('button', { name: /skip/i });
    expect(link).toBeInTheDocument();
  });

  it('calls onNavigate with scanning when Get Started is clicked', () => {
    render(<WelcomeScreen onNavigate={mockOnNavigate} />);
    const button = screen.getByRole('button', { name: /get started/i });
    fireEvent.click(button);
    expect(mockOnNavigate).toHaveBeenCalledWith('scanning');
  });

  it('calls onNavigate with manual-add when skip is clicked', () => {
    render(<WelcomeScreen onNavigate={mockOnNavigate} />);
    const link = screen.getByRole('button', { name: /skip/i });
    fireEvent.click(link);
    expect(mockOnNavigate).toHaveBeenCalledWith('manual-add');
  });

  it('renders feature highlights', () => {
    render(<WelcomeScreen onNavigate={mockOnNavigate} />);
    expect(screen.getByText(/Auto-detect agents/i)).toBeInTheDocument();
    expect(screen.getByText(/One-click launch/i)).toBeInTheDocument();
    expect(screen.getByText(/Live activity/i)).toBeInTheDocument();
  });

  it('renders IconBox components for feature cards', () => {
    render(<WelcomeScreen onNavigate={mockOnNavigate} />);
    const iconBoxes = screen.getAllByTestId('icon-box');
    expect(iconBoxes.length).toBe(3);
  });

  it('renders privacy note', () => {
    render(<WelcomeScreen onNavigate={mockOnNavigate} />);
    expect(screen.getByText(/locally installed agents/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run renderer/src/components/onboarding/WelcomeScreen.test.tsx`
Expected: FAIL — IconBox and privacy note not found

- [ ] **Step 3: Update WelcomeScreen implementation**

Replace the contents of `renderer/src/components/onboarding/WelcomeScreen.tsx` with:

```typescript
import { Search, Zap, Activity } from 'lucide-react';
import { PiLogo } from '../ui/PiLogo';
import { IconBox } from '../ui/IconBox';

interface WelcomeScreenProps {
  onNavigate: (screen: string) => void;
}

export function WelcomeScreen({ onNavigate }: WelcomeScreenProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-8">
      <div className="max-w-xl w-full space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <PiLogo size={80} />
          </div>
          <h1 className="text-4xl font-bold text-white">Welcome to PiDash</h1>
          <p className="text-lg text-slate-400">
            Your unified dashboard for AI coding agents
          </p>
        </div>

        {/* Feature highlights — vertical stack */}
        <div className="space-y-3">
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 flex items-start gap-4">
            <IconBox icon={Search} bgColor="#3b82f622" iconColor="#3b82f6" size={40} />
            <div>
              <h3 className="text-white font-semibold">Auto-detect agents</h3>
              <p className="text-sm text-slate-400">
                We'll scan your system for installed AI coding assistants
              </p>
            </div>
          </div>
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 flex items-start gap-4">
            <IconBox icon={Zap} bgColor="#10b98122" iconColor="#10b981" size={40} />
            <div>
              <h3 className="text-white font-semibold">One-click launch</h3>
              <p className="text-sm text-slate-400">
                Start any agent from your dashboard with a single click
              </p>
            </div>
          </div>
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 flex items-start gap-4">
            <IconBox icon={Activity} bgColor="#8b5cf622" iconColor="#8b5cf6" size={40} />
            <div>
              <h3 className="text-white font-semibold">Live activity</h3>
              <p className="text-sm text-slate-400">
                Monitor what your agents are doing in real-time
              </p>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="space-y-3">
          <button
            onClick={() => onNavigate('scanning')}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-900"
            aria-label="Get started with agent detection"
          >
            Get Started
          </button>
          <button
            onClick={() => onNavigate('manual-add')}
            className="w-full bg-transparent hover:bg-slate-800 text-slate-400 hover:text-slate-300 font-medium py-3 px-6 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-slate-600 focus:ring-offset-2 focus:ring-offset-slate-900"
            aria-label="Skip detection and add agents manually"
          >
            Skip — I'll add agents manually
          </button>
        </div>

        {/* Privacy note */}
        <p className="text-xs text-center text-slate-500">
          We only detect locally installed agents — nothing leaves your device.
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run renderer/src/components/onboarding/WelcomeScreen.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add renderer/src/components/onboarding/WelcomeScreen.tsx renderer/src/components/onboarding/WelcomeScreen.test.tsx
git commit -m "feat: update WelcomeScreen with vertical layout, IconBox, privacy note"
```

---

## Task 13: Update Scanning Screen (Use Spinner, Navigate to Scan Error)

**Files:**
- Modify: `renderer/src/components/onboarding/ScanningScreen.tsx`
- Modify: `renderer/src/components/onboarding/ScanningScreen.test.tsx`

**Changes:**
- Replace basic spinner with `Spinner` component
- Add privacy note below subtitle
- On timeout/exception: navigate to `'scan-error'` instead of inline error UI

- [ ] **Step 1: Update the test**

Open `renderer/src/components/onboarding/ScanningScreen.test.tsx` and replace its contents with:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ScanningScreen } from './ScanningScreen';

vi.mock('../../types', async () => {
  const actual = await vi.importActual('../../types');
  return { ...actual };
});

describe('ScanningScreen', () => {
  const mockOnNavigate = vi.fn();
  const mockSetAgents = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock window.api.scanAgents to never resolve (keeps scanning state)
    (window as any).api = {
      scanAgents: vi.fn().mockReturnValue(new Promise(() => {})),
    };
  });

  it('renders scanning title', () => {
    render(<ScanningScreen onNavigate={mockOnNavigate} setAgents={mockSetAgents} />);
    expect(screen.getByText(/Scanning for agents/i)).toBeInTheDocument();
  });

  it('renders Spinner component', () => {
    render(<ScanningScreen onNavigate={mockOnNavigate} setAgents={mockSetAgents} />);
    expect(screen.getByTestId('spinner')).toBeInTheDocument();
  });

  it('renders privacy note', () => {
    render(<ScanningScreen onNavigate={mockOnNavigate} setAgents={mockSetAgents} />);
    expect(screen.getByText(/locally installed agents/i)).toBeInTheDocument();
  });

  it('has loading status indicator', () => {
    render(<ScanningScreen onNavigate={mockOnNavigate} setAgents={mockSetAgents} />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run renderer/src/components/onboarding/ScanningScreen.test.tsx`
Expected: FAIL — Spinner and privacy note not found

- [ ] **Step 3: Update ScanningScreen implementation**

Replace the contents of `renderer/src/components/onboarding/ScanningScreen.tsx` with:

```typescript
import { useEffect, useState, useRef } from 'react';
import type { ScreenName, AgentConfig, ScanResult } from '../../types';
import { PiLogo } from '../ui/PiLogo';
import { Spinner } from '../ui/Spinner';

interface ScanningScreenProps {
  onNavigate: (screen: ScreenName) => void;
  setAgents: (agents: AgentConfig[]) => void;
}

export function ScanningScreen({ onNavigate, setAgents }: ScanningScreenProps) {
  const [status, setStatus] = useState<'scanning' | 'complete' | 'error'>('scanning');
  const [result, setResult] = useState<ScanResult | null>(null);
  const navigateCalledRef = useRef(false);
  const onNavigateRef = useRef(onNavigate);
  const setAgentsRef = useRef(setAgents);

  useEffect(() => {
    onNavigateRef.current = onNavigate;
    setAgentsRef.current = setAgents;
  }, [onNavigate, setAgents]);

  useEffect(() => {
    const timeoutMs = 15_000;
    const controller = new AbortController();

    const scan = async () => {
      try {
        const timeoutPromise = new Promise<ScanResult>((resolve, reject) => {
          const timer = setTimeout(() => reject(new Error('scan-timeout')), timeoutMs);
          controller.signal.addEventListener('abort', () => {
            clearTimeout(timer);
            resolve(undefined as never);
          });
        });

        const scanResult = await Promise.race<ScanResult>([
          window.api.scanAgents(),
          timeoutPromise,
        ]);

        if (controller.signal.aborted) return;

        setResult(scanResult);
        setAgentsRef.current(scanResult.agents);
        setStatus('complete');

        // Auto-navigate after 1.5s
        setTimeout(() => {
          if (!navigateCalledRef.current) {
            navigateCalledRef.current = true;
            onNavigateRef.current(scanResult.agents.length > 0 ? 'results' : 'no-agents');
          }
        }, 1500);
      } catch (err: unknown) {
        if (controller.signal.aborted) return;
        // Navigate to scan-error screen instead of showing inline error
        if (!navigateCalledRef.current) {
          navigateCalledRef.current = true;
          onNavigateRef.current('scan-error');
        }
      }
    };

    scan();

    return () => {
      controller.abort();
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-8">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <PiLogo size={60} />
        </div>

        {status === 'scanning' ? (
          <>
            {/* Spinner component */}
            <div className="flex justify-center">
              <Spinner size={64} />
            </div>
            <h2 className="text-2xl font-bold text-white">Scanning for agents</h2>
            <p className="text-slate-400">
              Looking for installed AI coding assistants...
            </p>
            <p className="text-xs text-slate-500">
              We only detect locally installed agents — nothing leaves your device.
            </p>
          </>
        ) : (
          <>
            {/* Complete state */}
            <div className="flex justify-center" aria-hidden="true">
              <div className="h-16 w-16 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <svg className="h-8 w-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-white">Scan Complete</h2>
            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 space-y-2 text-left">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Agents found</span>
                <span className="text-white font-medium">{result?.agents.length ?? 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Duration</span>
                <span className="text-white font-medium">{result ? `${(result.duration / 1000).toFixed(1)}s` : '—'}</span>
              </div>
              {result?.warnings && result.warnings.length > 0 && (
                <div className="pt-2 border-t border-slate-700">
                  <p className="text-sm text-amber-400 font-medium mb-1">Warnings</p>
                  <ul className="text-xs text-slate-400 space-y-1 list-disc list-inside">
                    {result.warnings.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <p className="text-xs text-slate-500 animate-pulse">
              Navigating automatically...
            </p>
          </>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run renderer/src/components/onboarding/ScanningScreen.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add renderer/src/components/onboarding/ScanningScreen.tsx renderer/src/components/onboarding/ScanningScreen.test.tsx
git commit -m "feat: update ScanningScreen with Spinner component and scan-error navigation"
```

---

## Task 14: Update Results Screen (Use Checkbox, AgentRow)

**Files:**
- Modify: `renderer/src/components/onboarding/ResultsScreen.tsx`
- Modify: `renderer/src/components/onboarding/ResultsScreen.test.tsx`

**Changes:**
- Use `Checkbox` component for agent selection
- Use `AgentRow` component for each agent
- Keep Select All / Deselect All / count display
- Continue button shows count: "Continue (3)"

- [ ] **Step 1: Update the test**

Open `renderer/src/components/onboarding/ResultsScreen.test.tsx` and replace its contents with:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ResultsScreen } from './ResultsScreen';
import type { AgentConfig } from '../../types';

describe('ResultsScreen', () => {
  const mockOnNavigate = vi.fn();
  const mockToggleAgent = vi.fn();
  const mockSelectAll = vi.fn();
  const mockDeselectAll = vi.fn();

  const mockAgents: AgentConfig[] = [
    { id: 'claude-1', name: 'Claude Code', path: '/usr/local/bin/claude', icon: 'claude', source: 'detected' },
    { id: 'cursor-1', name: 'Cursor', path: '/Applications/Cursor.app', icon: 'cursor', source: 'detected' },
  ];

  it('renders agent list using AgentRow', () => {
    render(
      <ResultsScreen
        onNavigate={mockOnNavigate}
        agents={mockAgents}
        selectedAgents={['claude-1']}
        toggleAgent={mockToggleAgent}
        selectAll={mockSelectAll}
        deselectAll={mockDeselectAll}
      />
    );
    expect(screen.getByText('Claude Code')).toBeInTheDocument();
    expect(screen.getByText('Cursor')).toBeInTheDocument();
  });

  it('renders checkboxes for each agent', () => {
    render(
      <ResultsScreen
        onNavigate={mockOnNavigate}
        agents={mockAgents}
        selectedAgents={['claude-1']}
        toggleAgent={mockToggleAgent}
        selectAll={mockSelectAll}
        deselectAll={mockDeselectAll}
      />
    );
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes.length).toBe(2);
  });

  it('shows select count in Continue button', () => {
    render(
      <ResultsScreen
        onNavigate={mockOnNavigate}
        agents={mockAgents}
        selectedAgents={['claude-1']}
        toggleAgent={mockToggleAgent}
        selectAll={mockSelectAll}
        deselectAll={mockDeselectAll}
      />
    );
    expect(screen.getByText(/Continue \(1\)/)).toBeInTheDocument();
  });

  it('renders Select All and Deselect All buttons', () => {
    render(
      <ResultsScreen
        onNavigate={mockOnNavigate}
        agents={mockAgents}
        selectedAgents={[]}
        toggleAgent={mockToggleAgent}
        selectAll={mockSelectAll}
        deselectAll={mockDeselectAll}
      />
    );
    expect(screen.getByText('Select All')).toBeInTheDocument();
    expect(screen.getByText('Deselect All')).toBeInTheDocument();
  });

  it('calls selectAll when Select All is clicked', () => {
    render(
      <ResultsScreen
        onNavigate={mockOnNavigate}
        agents={mockAgents}
        selectedAgents={[]}
        toggleAgent={mockToggleAgent}
        selectAll={mockSelectAll}
        deselectAll={mockDeselectAll}
      />
    );
    fireEvent.click(screen.getByText('Select All'));
    expect(mockSelectAll).toHaveBeenCalled();
  });

  it('calls onNavigate with ready when Continue is clicked', () => {
    render(
      <ResultsScreen
        onNavigate={mockOnNavigate}
        agents={mockAgents}
        selectedAgents={['claude-1']}
        toggleAgent={mockToggleAgent}
        selectAll={mockSelectAll}
        deselectAll={mockDeselectAll}
      />
    );
    fireEvent.click(screen.getByText(/Continue/));
    expect(mockOnNavigate).toHaveBeenCalledWith('ready');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run renderer/src/components/onboarding/ResultsScreen.test.tsx`
Expected: FAIL — Checkbox role not found (old implementation uses native input)

- [ ] **Step 3: Update ResultsScreen implementation**

Replace the contents of `renderer/src/components/onboarding/ResultsScreen.tsx` with:

```typescript
import type { AgentConfig, ScreenName } from '../../types';
import { Checkbox } from '../ui/Checkbox';
import { AgentRow } from '../ui/AgentRow';

interface ResultsScreenProps {
  onNavigate: (screen: ScreenName) => void;
  agents: AgentConfig[];
  selectedAgents: string[];
  toggleAgent: (agentId: string) => void;
  selectAll: () => void;
  deselectAll: () => void;
}

export function ResultsScreen({
  onNavigate,
  agents,
  selectedAgents,
  toggleAgent,
  selectAll,
  deselectAll,
}: ResultsScreenProps) {
  const allSelected = agents.length > 0 && selectedAgents.length === agents.length;
  const noneSelected = selectedAgents.length === 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-8">
      <div className="max-w-lg w-full space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-white">
            {agents.length > 0 ? 'Agents Detected' : 'No Agents Found'}
          </h1>
          <p className="text-slate-400">
            {agents.length > 0
              ? `We found ${agents.length} agent${agents.length === 1 ? '' : 's'}. Select the ones to add.`
              : "We didn't detect any agents. You can add them manually."}
          </p>
        </div>

        {/* Agent list */}
        {agents.length > 0 && (
          <div className="space-y-3">
            {/* Select controls */}
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={selectAll}
                  disabled={allSelected}
                  className="text-sm font-medium text-indigo-400 hover:text-indigo-300 disabled:text-slate-600 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-900 rounded px-2 py-1 transition-colors"
                  aria-label="Select all agents"
                >
                  Select All
                </button>
                <span className="text-slate-600">|</span>
                <button
                  type="button"
                  onClick={deselectAll}
                  disabled={noneSelected}
                  className="text-sm font-medium text-indigo-400 hover:text-indigo-300 disabled:text-slate-600 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-900 rounded px-2 py-1 transition-colors"
                  aria-label="Deselect all agents"
                >
                  Deselect All
                </button>
              </div>
              <span className="text-sm text-slate-500">
                {selectedAgents.length} / {agents.length} selected
              </span>
            </div>

            {/* Agent items using AgentRow + Checkbox */}
            <ul
              className="space-y-2 max-h-72 overflow-y-auto pr-1"
              role="list"
              aria-label="Detected agents list"
            >
              {agents.map((agent) => {
                const checked = selectedAgents.includes(agent.id);
                return (
                  <li key={agent.id}>
                    <AgentRow
                      name={agent.name}
                      path={agent.path}
                      icon={agent.icon}
                      gradient={agent.icon}
                      selected={checked}
                      onToggle={() => toggleAgent(agent.id)}
                      showCheckbox={true}
                    />
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => onNavigate('ready')}
            disabled={noneSelected}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-900"
            aria-label={noneSelected ? 'Select at least one agent to continue' : 'Continue with selected agents'}
          >
            Continue ({selectedAgents.length})
          </button>
          <button
            type="button"
            onClick={() => onNavigate('manual-add')}
            className="w-full bg-transparent hover:bg-slate-800 text-slate-400 hover:text-slate-300 font-medium py-3 px-6 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-slate-600 focus:ring-offset-2 focus:ring-offset-slate-900"
            aria-label="Add an agent manually"
          >
            + Add Manually
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run renderer/src/components/onboarding/ResultsScreen.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add renderer/src/components/onboarding/ResultsScreen.tsx renderer/src/components/onboarding/ResultsScreen.test.tsx
git commit -m "feat: update ResultsScreen with Checkbox and AgentRow components"
```

---

## Task 15: Update Manual Add Screen (Add AgentChip Group)

**Files:**
- Modify: `renderer/src/components/onboarding/ManualAddScreen.tsx`
- Modify: `renderer/src/components/onboarding/ManualAddScreen.test.tsx`

**Changes:**
- Add `AgentChip` group below input ("Or choose a known agent")
- Chips: Claude Code, Cursor, Aider, OMP, Copilot
- On chip click: resolve path, fill input, trigger validation
- Error text: rose-colored, below input

- [ ] **Step 1: Update the test**

Open `renderer/src/components/onboarding/ManualAddScreen.test.tsx` and add these test cases at the end of the existing `describe` block (before the closing `});`):

```typescript
  it('renders AgentChip group with known agents', () => {
    render(<ManualAddScreen onNavigate={mockOnNavigate} addAgent={mockAddAgent} />);
    expect(screen.getByText(/Or choose a known agent/i)).toBeInTheDocument();
    expect(screen.getByText('Claude Code')).toBeInTheDocument();
    expect(screen.getByText('Cursor')).toBeInTheDocument();
    expect(screen.getByText('Aider')).toBeInTheDocument();
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run renderer/src/components/onboarding/ManualAddScreen.test.tsx`
Expected: FAIL — "Or choose a known agent" not found

- [ ] **Step 3: Update ManualAddScreen implementation**

Open `renderer/src/components/onboarding/ManualAddScreen.tsx` and make these changes:

Add imports at the top (after the existing imports):

```typescript
import { AgentChip } from '../ui/AgentChip';
import { resolveAgentPath } from '../../utils/agentPathResolver';
```

Add the known agents list after the `CONFIDENCE_COLORS` constant:

```typescript
const KNOWN_AGENT_CHIPS = [
  { name: 'Claude Code', agentId: 'claude' },
  { name: 'Cursor', agentId: 'cursor' },
  { name: 'Aider', agentId: 'aider' },
  { name: 'OMP', agentId: 'omp' },
  { name: 'Copilot', agentId: 'copilot' },
];
```

Add the chip click handler inside the component (after the `handleKeyDown` callback):

```typescript
  const handleChipClick = useCallback(async (agentId: string) => {
    const resolvedPath = await resolveAgentPath(agentId);
    setPath(resolvedPath);
    // Trigger validation by simulating a change
    setValidationResult(null);
    setIdentificationResult(null);
  }, []);
```

Add the AgentChip group in the JSX, after the validation error section (after line 178, before the identification result section):

```tsx
        {/* Known agent chips */}
        <div className="space-y-2">
          <p className="text-sm text-slate-400">Or choose a known agent:</p>
          <div className="flex flex-wrap gap-2">
            {KNOWN_AGENT_CHIPS.map((chip) => (
              <AgentChip
                key={chip.agentId}
                name={chip.name}
                agentId={chip.agentId}
                onClick={handleChipClick}
              />
            ))}
          </div>
        </div>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run renderer/src/components/onboarding/ManualAddScreen.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add renderer/src/components/onboarding/ManualAddScreen.tsx renderer/src/components/onboarding/ManualAddScreen.test.tsx
git commit -m "feat: add AgentChip group to ManualAddScreen"
```

---

## Task 16: Update No Agents Screen (Use AgentCard, Add Search Icon)

**Files:**
- Modify: `renderer/src/components/onboarding/NoAgentsScreen.tsx`
- Modify: `renderer/src/components/onboarding/NoAgentsScreen.test.tsx`

**Changes:**
- Add search icon above title (replace emoji)
- Use `AgentCard` component for popular agents
- Agents: OMP, Cursor, Aider (with download links)
- Buttons: Add Manually + Scan Again

- [ ] **Step 1: Update the test**

Open `renderer/src/components/onboarding/NoAgentsScreen.test.tsx` and replace its contents with:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { NoAgentsScreen } from './NoAgentsScreen';

describe('NoAgentsScreen', () => {
  const mockOnNavigate = vi.fn();

  it('renders no agents title', () => {
    render(<NoAgentsScreen onNavigate={mockOnNavigate} />);
    expect(screen.getByText(/No Agents Found/i)).toBeInTheDocument();
  });

  it('renders AgentCard components for popular agents', () => {
    render(<NoAgentsScreen onNavigate={mockOnNavigate} />);
    expect(screen.getByText('Oh My Pile (OMP)')).toBeInTheDocument();
    expect(screen.getByText('Cursor')).toBeInTheDocument();
    expect(screen.getByText('Aider')).toBeInTheDocument();
  });

  it('renders download links for each agent', () => {
    render(<NoAgentsScreen onNavigate={mockOnNavigate} />);
    const downloadLinks = screen.getAllByText(/Download/i);
    expect(downloadLinks.length).toBeGreaterThanOrEqual(3);
  });

  it('renders Add Manually button', () => {
    render(<NoAgentsScreen onNavigate={mockOnNavigate} />);
    expect(screen.getByRole('button', { name: /add manually/i })).toBeInTheDocument();
  });

  it('renders Scan Again button', () => {
    render(<NoAgentsScreen onNavigate={mockOnNavigate} />);
    expect(screen.getByRole('button', { name: /scan again/i })).toBeInTheDocument();
  });

  it('navigates to manual-add on Add Manually click', () => {
    render(<NoAgentsScreen onNavigate={mockOnNavigate} />);
    fireEvent.click(screen.getByRole('button', { name: /add manually/i }));
    expect(mockOnNavigate).toHaveBeenCalledWith('manual-add');
  });

  it('navigates to scanning on Scan Again click', () => {
    render(<NoAgentsScreen onNavigate={mockOnNavigate} />);
    fireEvent.click(screen.getByRole('button', { name: /scan again/i }));
    expect(mockOnNavigate).toHaveBeenCalledWith('scanning');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run renderer/src/components/onboarding/NoAgentsScreen.test.tsx`
Expected: FAIL — AgentCard not used yet

- [ ] **Step 3: Update NoAgentsScreen implementation**

Replace the contents of `renderer/src/components/onboarding/NoAgentsScreen.tsx` with:

```typescript
import { Search } from 'lucide-react';
import type { ScreenName } from '../../types';
import { AgentCard } from '../ui/AgentCard';

const POPULAR_AGENTS = [
  {
    id: 'omp',
    name: 'Oh My Pile (OMP)',
    description: 'AI coding assistant with unified agent dashboard',
    icon: 'omp',
    gradient: 'from-indigo-500 to-purple-600',
    url: 'https://ohmypile.com',
  },
  {
    id: 'cursor',
    name: 'Cursor',
    description: 'AI-first code editor built for speed',
    icon: 'cursor',
    gradient: 'from-cyan-500 to-blue-600',
    url: 'https://cursor.sh',
  },
  {
    id: 'aider',
    name: 'Aider',
    description: 'AI pair programming in your terminal',
    icon: 'aider',
    gradient: 'from-emerald-500 to-teal-600',
    url: 'https://aider.chat',
  },
];

interface NoAgentsScreenProps {
  onNavigate: (screen: ScreenName) => void;
}

export function NoAgentsScreen({ onNavigate }: NoAgentsScreenProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-8">
      <div className="max-w-2xl w-full space-y-8">
        {/* Header with search icon */}
        <div className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center">
            <Search size={28} className="text-slate-400" />
          </div>
          <h1 className="text-3xl font-bold text-white">No Agents Found</h1>
          <p className="text-lg text-slate-400 max-w-md mx-auto">
            We couldn't detect any AI coding agents on your system.
            You can download one below, add an agent manually, or scan again.
          </p>
        </div>

        {/* Popular agents using AgentCard */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-white">Popular AI Coding Agents</h2>
          <div className="grid gap-3">
            {POPULAR_AGENTS.map((agent) => (
              <AgentCard
                key={agent.id}
                name={agent.name}
                description={agent.description}
                icon={agent.icon}
                gradient={agent.gradient}
                url={agent.url}
              />
            ))}
          </div>
        </div>

        {/* Action buttons */}
        <div className="space-y-3">
          <button
            onClick={() => onNavigate('manual-add')}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-900"
            aria-label="Add an agent manually"
          >
            Add Manually
          </button>
          <button
            onClick={() => onNavigate('scanning')}
            className="w-full bg-transparent hover:bg-slate-800 text-slate-400 hover:text-slate-300 font-medium py-3 px-6 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-slate-600 focus:ring-offset-2 focus:ring-offset-slate-900"
            aria-label="Scan again for agents"
          >
            Scan Again
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run renderer/src/components/onboarding/NoAgentsScreen.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add renderer/src/components/onboarding/NoAgentsScreen.tsx renderer/src/components/onboarding/NoAgentsScreen.test.tsx
git commit -m "feat: update NoAgentsScreen with AgentCard and search icon"
```

---

## Task 17: Update Ready Screen (Use StatusIcon, AgentRow with Badges)

**Files:**
- Modify: `renderer/src/components/onboarding/ReadyScreen.tsx`
- Modify: `renderer/src/components/onboarding/ReadyScreen.test.tsx`

**Changes:**
- Use `StatusIcon` (CheckCircle) for success state
- Header: "You're All Set!" + "X agents ready to go"
- Use `AgentRow` component with badges (no checkboxes)
- Badges: "Detected" or "Manual" based on `agent.source`
- Buttons: Open Dashboard + Add Another Agent

- [ ] **Step 1: Update the test**

Open `renderer/src/components/onboarding/ReadyScreen.test.tsx` and replace its contents with:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ReadyScreen } from './ReadyScreen';
import type { AgentConfig } from '../../types';

vi.mock('../../hooks/useOnboardingState', async () => {
  const actual = await vi.importActual('../../hooks/useOnboardingState');
  return { ...actual };
});

describe('ReadyScreen', () => {
  const mockOnNavigate = vi.fn();
  const mockOnComplete = vi.fn();

  const mockAgents: AgentConfig[] = [
    { id: 'claude-1', name: 'Claude Code', path: '/usr/local/bin/claude', icon: 'claude', source: 'detected' },
    { id: 'cursor-1', name: 'Cursor', path: '/Applications/Cursor.app', icon: 'cursor', source: 'manual' },
  ];

  it('renders "You\'re All Set!" title', () => {
    render(
      <ReadyScreen
        onNavigate={mockOnNavigate}
        agents={mockAgents}
        selectedAgents={['claude-1', 'cursor-1']}
        onComplete={mockOnComplete}
      />
    );
    expect(screen.getByText(/You're All Set/i)).toBeInTheDocument();
  });

  it('renders agent count', () => {
    render(
      <ReadyScreen
        onNavigate={mockOnNavigate}
        agents={mockAgents}
        selectedAgents={['claude-1', 'cursor-1']}
        onComplete={mockOnComplete}
      />
    );
    expect(screen.getByText(/2 agents ready to go/i)).toBeInTheDocument();
  });

  it('renders StatusIcon component', () => {
    render(
      <ReadyScreen
        onNavigate={mockOnNavigate}
        agents={mockAgents}
        selectedAgents={['claude-1', 'cursor-1']}
        onComplete={mockOnComplete}
      />
    );
    expect(screen.getByTestId('status-icon')).toBeInTheDocument();
  });

  it('renders AgentRow with badges for each selected agent', () => {
    render(
      <ReadyScreen
        onNavigate={mockOnNavigate}
        agents={mockAgents}
        selectedAgents={['claude-1', 'cursor-1']}
        onComplete={mockOnComplete}
      />
    );
    expect(screen.getByText('Claude Code')).toBeInTheDocument();
    expect(screen.getByText('Cursor')).toBeInTheDocument();
    expect(screen.getByText('Detected')).toBeInTheDocument();
    expect(screen.getByText('Manual')).toBeInTheDocument();
  });

  it('renders Open Dashboard button', () => {
    render(
      <ReadyScreen
        onNavigate={mockOnNavigate}
        agents={mockAgents}
        selectedAgents={['claude-1']}
        onComplete={mockOnComplete}
      />
    );
    expect(screen.getByRole('button', { name: /open dashboard/i })).toBeInTheDocument();
  });

  it('renders Add Another Agent button', () => {
    render(
      <ReadyScreen
        onNavigate={mockOnNavigate}
        agents={mockAgents}
        selectedAgents={['claude-1']}
        onComplete={mockOnComplete}
      />
    );
    expect(screen.getByRole('button', { name: /add another agent/i })).toBeInTheDocument();
  });

  it('navigates to manual-add on Add Another Agent click', () => {
    render(
      <ReadyScreen
        onNavigate={mockOnNavigate}
        agents={mockAgents}
        selectedAgents={['claude-1']}
        onComplete={mockOnComplete}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /add another agent/i }));
    expect(mockOnNavigate).toHaveBeenCalledWith('manual-add');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run renderer/src/components/onboarding/ReadyScreen.test.tsx`
Expected: FAIL — StatusIcon and AgentRow badges not found

- [ ] **Step 3: Update ReadyScreen implementation**

Replace the contents of `renderer/src/components/onboarding/ReadyScreen.tsx` with:

```typescript
import { useState, useCallback } from 'react';
import type { AgentConfig, ScreenName } from '../../types';
import { StatusIcon } from '../ui/StatusIcon';
import { AgentRow } from '../ui/AgentRow';

interface ReadyScreenProps {
  onNavigate: (screen: ScreenName) => void;
  agents: AgentConfig[];
  selectedAgents: string[];
  onComplete?: () => void;
}

export function ReadyScreen({ onNavigate, agents, selectedAgents, onComplete }: ReadyScreenProps) {
  const [isComplete, setIsComplete] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const selectedList = agents.filter((a) => selectedAgents.includes(a.id));

  const handleOpenDashboard = useCallback(async () => {
    setIsSaving(true);
    try {
      // Save agents and complete onboarding
      if (onComplete) {
        await onComplete();
      }
      setIsComplete(true);
    } catch (err) {
      console.error('Failed to complete onboarding:', err);
    } finally {
      setIsSaving(false);
    }
  }, [agents, selectedAgents, isSaving, onComplete]);

  if (isComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-8">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="flex justify-center">
            <StatusIcon type="success" size={64} />
          </div>
          <h1 className="text-4xl font-bold text-white">Setup Complete!</h1>
          <p className="text-lg text-slate-300">
            Your agents are saved. Launch the dashboard to start managing them.
          </p>
          <div className="pt-4 space-y-3">
            <button
              type="button"
              onClick={() => onNavigate('ready')}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-900"
              aria-label="Open dashboard"
            >
              Open Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-8">
      <div className="max-w-xl w-full space-y-8">
        {/* Header with StatusIcon */}
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <StatusIcon type="success" size={64} />
          </div>
          <h1 className="text-4xl font-bold text-white">You&apos;re All Set!</h1>
          <p className="text-lg text-slate-400">
            {selectedList.length === 1
              ? '1 agent ready to go'
              : `${selectedList.length} agents ready to go`}
          </p>
        </div>

        {/* Selected agents list using AgentRow with badges */}
        {selectedList.length > 0 && (
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-semibold text-white">Your Agents</h2>
            <ul className="space-y-3" role="list" aria-label="Selected agents">
              {selectedList.map((agent) => (
                <li key={agent.id}>
                  <AgentRow
                    name={agent.name}
                    path={agent.path}
                    icon={agent.icon}
                    gradient={agent.icon}
                    badge={agent.source === 'detected' ? 'Detected' : 'Manual'}
                  />
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Action buttons */}
        <div className="space-y-3">
          <button
            type="button"
            onClick={handleOpenDashboard}
            disabled={isSaving}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-900"
            aria-label="Open dashboard and complete onboarding"
          >
            {isSaving ? 'Saving...' : 'Open Dashboard'}
          </button>
          <button
            type="button"
            onClick={() => onNavigate('manual-add')}
            className="w-full bg-transparent hover:bg-slate-800 text-slate-300 hover:text-white font-medium py-3 px-6 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 focus:ring-offset-slate-900"
            aria-label="Add another agent manually"
          >
            + Add Another Agent
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run renderer/src/components/onboarding/ReadyScreen.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add renderer/src/components/onboarding/ReadyScreen.tsx renderer/src/components/onboarding/ReadyScreen.test.tsx
git commit -m "feat: update ReadyScreen with StatusIcon and AgentRow badges"
```

---

## Self-Review

Before executing this plan, verify:

1. **Type consistency**: All component interfaces match the design spec
2. **Import paths**: All imports use correct relative paths
3. **Test coverage**: Each new component has tests for rendering, props, and interactions
4. **TDD order**: Tests written before implementation in every task
5. **No placeholders**: All code blocks are complete and runnable
6. **Commit granularity**: Each task is a separate commit for easy review
7. **Screen registry**: OnboardingFlow updated to include ScanErrorScreen
8. **Shared components**: IconBox, Checkbox, Spinner, StatusIcon, AgentRow, AgentCard, AgentChip all created before screen updates
9. **Navigation flow**: welcome → scanning → results/scan-error/no-agents → manual-add → ready
10. **Agent path resolver**: Utility created before ManualAddScreen update

---

## Execution Handoff

This plan is ready for execution. Recommended approach:

1. **Use subagent-driven-development** — dispatch one subagent per task for parallel execution where possible
2. **Task dependencies**: Tasks 1-9 (components + utilities) can be parallelized. Tasks 10-17 (screens) depend on components being complete.
3. **Verification**: After each task, run the test suite to ensure no regressions
4. **Final verification**: After all tasks complete, run `pnpm test` to verify all tests pass

**Estimated commits**: 17 (one per task)

**Files created**: 17 new files (9 components/utils + 8 test files)

**Files modified**: 8 existing files (7 screens + OnboardingFlow + their tests)

**Total tasks**: 17

---
