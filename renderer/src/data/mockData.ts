import type { Agent, Activity, PlanStep } from '@/types/dashboard';

export const seedAgents: Agent[] = [
  {
    id: 'claude',
    name: 'Claude Code',
    short: 'C',
    color: '#1e3a5f',
    textColor: '#60a5fa',
    status: 'active',
    task: 'Implementing auth middleware',
    progress: 72,
    files: ['src/auth/jwt.ts', 'src/models/user.ts'],
    messages: [
      { time: '14:02', text: 'Found existing session pattern' },
      { time: '14:01', text: 'Starting JWT structure analysis' },
    ],
  },
  {
    id: 'cursor',
    name: 'Cursor',
    short: 'Cu',
    color: '#14532d',
    textColor: '#34d399',
    status: 'active',
    task: 'Writing API routes',
    progress: 58,
    files: ['src/routes/auth.ts'],
    messages: [{ time: '14:02', text: 'Created POST /api/auth/login' }],
  },
  {
    id: 'copilot',
    name: 'Copilot',
    short: 'Co',
    color: '#312e81',
    textColor: '#a78bfa',
    status: 'active',
    task: 'Generating test fixtures',
    progress: 45,
    files: ['tests/fixtures/'],
    messages: [{ time: '14:01', text: 'Generated 12 test fixtures' }],
  },
  {
    id: 'codex',
    name: 'Codex',
    short: 'Cx',
    color: '#78350f',
    textColor: '#fbbf24',
    status: 'idle',
    task: 'Waiting for step 2',
    progress: 0,
  },
  {
    id: 'gemini',
    name: 'Gemini',
    short: 'G',
    color: '#4c1d95',
    textColor: '#c4b5fd',
    status: 'idle',
    task: 'Available',
    progress: 0,
  },
  {
    id: 'qwen',
    name: 'Qwen',
    short: 'Q',
    color: '#3f3f46',
    textColor: '#d4d4d8',
    status: 'idle',
    task: 'Available',
    progress: 0,
  },
];

export const seedActivities: Activity[] = [
  { id: '1', time: '14:02', agentId: 'claude', action: 'read', description: 'Parsing JWT token structure', file: 'src/auth/jwt.ts' },
  { id: '2', time: '14:02', agentId: 'cursor', action: 'write', description: 'Created POST /api/auth/login', file: 'src/routes/auth.ts' },
  { id: '3', time: '14:01', agentId: 'copilot', action: 'test', description: 'Generated 12 test fixtures', file: 'tests/fixtures/' },
  { id: '4', time: '14:01', agentId: 'claude', action: 'edit', description: 'Added session validation', file: 'src/auth/session.ts' },
  { id: '5', time: '14:00', agentId: 'cursor', action: 'read', description: 'Analyzing user model schema', file: 'src/models/user.ts' },
  { id: '6', time: '13:59', agentId: 'copilot', action: 'lint', description: 'Fixed 3 linting errors', file: 'src/utils/' },
  { id: '7', time: '13:58', agentId: 'claude', action: 'plan', description: 'Breaking down auth flow', file: '' },
  { id: '8', time: '13:57', agentId: 'cursor', action: 'write', description: 'Created auth middleware', file: 'src/middleware/auth.ts' },
  { id: '9', time: '13:56', agentId: 'copilot', action: 'edit', description: 'Updated error messages', file: 'src/utils/errors.ts' },
  { id: '10', time: '13:55', agentId: 'claude', action: 'read', description: 'Reviewing existing patterns', file: 'src/' },
];

export const seedPlanSteps: PlanStep[] = [
  { id: '1', number: 1, name: 'Research existing auth patterns', agentId: 'claude', status: 'done', duration: '~2 min' },
  { id: '2', number: 2, name: 'Implement JWT middleware', agentId: 'cursor', status: 'active', duration: '~4 min' },
  { id: '3', number: 3, name: 'Build login/logout endpoints', agentId: 'copilot', status: 'pending', duration: '~4 min' },
  { id: '4', number: 4, name: 'Review and test', agentId: 'claude', status: 'pending', duration: '~2 min' },
];

export const activityTemplates = [
  { action: 'read' as const, descriptions: ['Parsing request headers', 'Analyzing dependencies', 'Reviewing type definitions'] },
  { action: 'write' as const, descriptions: ['Created new handler', 'Added validation logic', 'Implemented error handling'] },
  { action: 'edit' as const, descriptions: ['Updated configuration', 'Modified interface', 'Refactored utility function'] },
  { action: 'test' as const, descriptions: ['Running test suite', 'Generated test cases', 'Validating edge cases'] },
  { action: 'lint' as const, descriptions: ['Fixed linting errors', 'Formatted code', 'Resolved import order'] },
  { action: 'plan' as const, descriptions: ['Planning next steps', 'Breaking down task', 'Analyzing requirements'] },
];
