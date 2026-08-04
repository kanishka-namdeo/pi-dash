const agents = [
  { id: 'claude', name: 'Claude Code', short: 'C', color: '#1e3a5f', textColor: '#60a5fa', status: 'active', task: 'Implementing auth middleware', progress: 72 },
  { id: 'cursor', name: 'Cursor', short: 'Cu', color: '#14532d', textColor: '#34d399', status: 'active', task: 'Writing API routes', progress: 58 },
  { id: 'copilot', name: 'Copilot', short: 'Co', color: '#312e81', textColor: '#a78bfa', status: 'active', task: 'Generating test fixtures', progress: 45 },
  { id: 'codex', name: 'Codex', short: 'Cx', color: '#78350f', textColor: '#fbbf24', status: 'idle', task: 'Waiting for step 2', progress: 0 },
  { id: 'gemini', name: 'Gemini', short: 'G', color: '#4c1d95', textColor: '#c4b5fd', status: 'idle', task: 'Available', progress: 0 },
  { id: 'qwen', name: 'Qwen', short: 'Q', color: '#3f3f46', textColor: '#d4d4d8', status: 'idle', task: 'Available', progress: 0 }
];

const activities = [
  { time: '14:02', agent: 'claude', action: 'read', desc: 'Parsing JWT token structure', file: 'src/auth/jwt.ts' },
  { time: '14:02', agent: 'cursor', action: 'write', desc: 'Created POST /api/auth/login', file: 'src/routes/auth.ts' },
  { time: '14:01', agent: 'copilot', action: 'test', desc: 'Generated 12 test fixtures', file: 'tests/fixtures/' },
  { time: '14:01', agent: 'claude', action: 'edit', desc: 'Added session validation', file: 'src/auth/session.ts' },
  { time: '14:00', agent: 'cursor', action: 'read', desc: 'Analyzing user model schema', file: 'src/models/user.ts' },
  { time: '13:59', agent: 'copilot', action: 'lint', desc: 'Fixed 3 linting errors', file: 'src/utils/' },
  { time: '13:58', agent: 'claude', action: 'plan', desc: 'Breaking down auth flow', file: '' },
  { time: '13:57', agent: 'cursor', action: 'write', desc: 'Created auth middleware', file: 'src/middleware/auth.ts' },
  { time: '13:56', agent: 'copilot', action: 'edit', desc: 'Updated error messages', file: 'src/utils/errors.ts' },
  { time: '13:55', agent: 'claude', action: 'read', desc: 'Reviewing existing patterns', file: 'src/' }
];

function getAgent(id) { return agents.find(a => a.id === id); }

function renderAgents() {
  const list = document.getElementById('agentList');
  list.innerHTML = agents.map((a, i) => {
    const barColor = a.status === 'active' ? a.textColor : 'var(--amber)';
    return '<div class="agent-card' + (i === 0 ? ' selected' : '') + '" data-id="' + a.id + '">' +
      '<div class="agent-top">' +
        '<div class="agent-icon" style="background:' + a.color + ';color:' + a.textColor + '">' + a.short + '</div>' +
        '<div class="agent-name">' + a.name + '</div>' +
        '<div class="status-dot ' + a.status + '"></div>' +
      '</div>' +
      '<div class="agent-task mono">' + a.task + '</div>' +
      (a.progress > 0 ? '<div class="agent-progress"><div class="agent-progress-bar" style="width:' + a.progress + '%;background:' + barColor + '"></div></div>' : '') +
    '</div>';
  }).join('');

  list.querySelectorAll('.agent-card').forEach(card => {
    card.addEventListener('click', () => {
      list.querySelectorAll('.agent-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
    });
  });
}

function renderActivities() {
  const list = document.getElementById('activityList');
  list.innerHTML = activities.map(a => {
    const agent = getAgent(a.agent);
    return '<div class="activity-item">' +
      '<div class="activity-time mono">' + a.time + '</div>' +
      '<div class="activity-agent" style="background:' + agent.color + ';color:' + agent.textColor + '">' + agent.short + '</div>' +
      '<div class="activity-body">' +
        '<div><span class="activity-action action-' + a.action + '">' + a.action + '</span><span class="activity-desc">' + a.desc + '</span></div>' +
        (a.file ? '<div class="activity-file mono">' + a.file + '</div>' : '') +
      '</div>' +
    '</div>';
  }).join('');
}

function addActivity() {
  const actions = ['read', 'write', 'edit', 'test', 'lint', 'plan'];
  const descs = [
    { desc: 'Parsing request headers', file: 'src/middleware/auth.ts' },
    { desc: 'Created error handler', file: 'src/utils/errors.ts' },
    { desc: 'Updated type definitions', file: 'src/types/auth.d.ts' },
    { desc: 'Running test suite', file: 'tests/auth/' },
    { desc: 'Fixing import order', file: 'src/routes/' },
    { desc: 'Planning next steps', file: '' }
  ];
  const now = new Date();
  const time = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
  const agent = agents[Math.floor(Math.random() * 3)];
  const action = actions[Math.floor(Math.random() * actions.length)];
  const d = descs[Math.floor(Math.random() * descs.length)];

  activities.unshift({ time, agent: agent.id, action, desc: d.desc, file: d.file });
  if (activities.length > 30) activities.pop();
  renderActivities();
}

function tickProgress() {
  agents.forEach(a => {
    if (a.status === 'active' && a.progress < 100) {
      a.progress = Math.min(100, a.progress + Math.floor(Math.random() * 3));
    }
  });
  renderAgents();
}

renderAgents();
renderActivities();
setInterval(addActivity, 3000);
setInterval(tickProgress, 2000);
