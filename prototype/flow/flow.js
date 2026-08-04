// Pi Orchestrator - Clickable Prototype
// Hybrid fidelity: core flows functional, secondary screens static

const screens = {
  goal: document.getElementById('screen-goal'),
  plan: document.getElementById('screen-plan'),
  execution: document.getElementById('screen-execution'),
  complete: document.getElementById('screen-complete')
};

// Agent data
const agents = [
  { id: 'scout', name: 'Scout', short: 'S', color: '#1e3a5f', textColor: '#06b6d4', status: 'active', task: 'Analyzing codebase patterns', progress: 72, role: 'Code analysis specialist' },
  { id: 'worker1', name: 'Worker 1', short: 'W1', color: '#14532d', textColor: '#10b981', status: 'active', task: 'Implementing JWT middleware', progress: 58, role: 'Implementation specialist' },
  { id: 'worker2', name: 'Worker 2', short: 'W2', color: '#312e81', textColor: '#8b5cf6', status: 'idle', task: 'Waiting for step 3', progress: 0, role: 'API development' },
  { id: 'reviewer', name: 'Reviewer', short: 'R', color: '#78350f', textColor: '#f59e0b', status: 'idle', task: 'Waiting for review', progress: 0, role: 'Code review & testing' }
];

const activities = [];

// Screen navigation
function showScreen(name) {
  Object.values(screens).forEach(s => s.classList.remove('active'));
  screens[name].classList.add('active');
}

// Goal Input screen
document.getElementById('generatePlanBtn').addEventListener('click', () => {
  const goal = document.getElementById('goalInput').value.trim();
  if (goal) {
    document.getElementById('planTitle').textContent = goal.length > 50 ? goal.substring(0, 50) + '...' : goal;
  }
  drawPlanGraph();
  showScreen('plan');
});

// Plan Review screen
document.getElementById('backToGoalBtn').addEventListener('click', () => showScreen('goal'));
document.getElementById('approvePlanBtn').addEventListener('click', () => {
  showScreen('execution');
  startExecution();
});

// Draw plan graph (SVG)
function drawPlanGraph() {
  const svg = document.getElementById('planGraph');
  svg.innerHTML = '';
  
  const steps = [
    { x: 80, y: 100, label: 'Research', agent: 'scout' },
    { x: 280, y: 100, label: 'JWT', agent: 'worker' },
    { x: 480, y: 100, label: 'Endpoints', agent: 'worker' },
    { x: 680, y: 100, label: 'Review', agent: 'reviewer' }
  ];
  
  const colors = { scout: '#06b6d4', worker: '#3b82f6', reviewer: '#f59e0b' };
  
  // Draw connections
  for (let i = 0; i < steps.length - 1; i++) {
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', steps[i].x + 30);
    line.setAttribute('y1', steps[i].y);
    line.setAttribute('x2', steps[i + 1].x - 30);
    line.setAttribute('y2', steps[i + 1].y);
    line.setAttribute('stroke', '#2a2a3a');
    line.setAttribute('stroke-width', '2');
    line.setAttribute('stroke-dasharray', '4,4');
    svg.appendChild(line);
  }
  
  // Draw nodes
  steps.forEach((step, i) => {
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', step.x);
    circle.setAttribute('cy', step.y);
    circle.setAttribute('r', '28');
    circle.setAttribute('fill', '#111118');
    circle.setAttribute('stroke', colors[step.agent]);
    circle.setAttribute('stroke-width', '2');
    g.appendChild(circle);
    
    const num = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    num.setAttribute('x', step.x);
    num.setAttribute('y', step.y + 5);
    num.setAttribute('text-anchor', 'middle');
    num.setAttribute('fill', '#e8e8f0');
    num.setAttribute('font-size', '14');
    num.setAttribute('font-weight', '500');
    num.textContent = i + 1;
    g.appendChild(num);
    
    const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    label.setAttribute('x', step.x);
    label.setAttribute('y', step.y + 50);
    label.setAttribute('text-anchor', 'middle');
    label.setAttribute('fill', '#a0a0b0');
    label.setAttribute('font-size', '12');
    label.textContent = step.label;
    g.appendChild(label);
    
    svg.appendChild(g);
  });
}

// Execution screen
let executionInterval;
let elapsedSeconds = 0;
let currentStep = 0;

function startExecution() {
  renderAgents();
  renderExecutionPlan();
  startActivitySimulation();
  
  executionInterval = setInterval(() => {
    elapsedSeconds++;
    document.getElementById('elapsed').textContent = formatTime(elapsedSeconds);
    updateProgress();
    tickAgentProgress();
  }, 1000);
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function renderAgents() {
  const list = document.getElementById('agentList');
  list.innerHTML = agents.map(a => `
    <div class="agent-card" data-id="${a.id}">
      <div class="agent-top">
        <div class="agent-icon" style="background:${a.color};color:${a.textColor}">${a.short}</div>
        <div class="agent-name">${a.name}</div>
        <div class="status-dot ${a.status}"></div>
      </div>
      <div class="agent-task mono">${a.task}</div>
      ${a.progress > 0 ? `<div class="agent-progress"><div class="agent-progress-bar" style="width:${a.progress}%;background:${a.textColor}"></div></div>` : ''}
    </div>
  `).join('');
  
  list.querySelectorAll('.agent-card').forEach(card => {
    card.addEventListener('click', () => openAgentPanel(card.dataset.id));
  });
  
  document.getElementById('activeAgents').textContent = agents.filter(a => a.status === 'active').length;
}

function renderExecutionPlan() {
  const plan = document.getElementById('executionPlan');
  const steps = [
    { name: 'Research existing auth patterns', agent: 'Scout', status: 'done' },
    { name: 'Implement JWT middleware', agent: 'Worker 1', status: 'active' },
    { name: 'Build login/logout endpoints', agent: 'Worker 2', status: 'pending' },
    { name: 'Review and test', agent: 'Reviewer', status: 'pending' }
  ];
  
  plan.innerHTML = steps.map((step, i) => `
    <div class="step ${step.status}" data-step="${i}">
      <div class="step-marker">
        ${step.status === 'done' ? '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#000" stroke-width="2"><polyline points="3,7 6,10 11,4"/></svg>' : ''}
      </div>
      <div class="step-header">
        <div class="step-num mono">STEP ${i + 1}</div>
        <div class="step-name">${step.name}</div>
        <div class="step-agents">
          <div class="step-agent">
            <div class="step-agent-icon" style="background:${agents.find(a => a.name.toLowerCase().includes(step.agent.toLowerCase().split(' ')[0]))?.color || '#3f3f46'};color:${agents.find(a => a.name.toLowerCase().includes(step.agent.toLowerCase().split(' ')[0]))?.textColor || '#d4d4d8'}">${step.agent[0]}</div>
            <span class="step-agent-status ${step.status === 'active' ? 'running' : step.status === 'done' ? 'done' : ''}">${step.status === 'active' ? 'Running' : step.status === 'done' ? 'Done' : 'Waiting'}</span>
          </div>
        </div>
        ${step.status === 'active' ? `
          <div class="step-approval">
            <button class="approval-btn approve" onclick="approveStep(${i})">Approve</button>
            <button class="approval-btn skip" onclick="skipStep(${i})">Skip</button>
          </div>
        ` : ''}
      </div>
    </div>
  `).join('');
  
  const completed = steps.filter(s => s.status === 'done').length;
  const total = steps.length;
  const pct = Math.round((completed / total) * 100);
  document.getElementById('progressPct').textContent = `${pct}%`;
  
  const progressBar = document.createElement('div');
  progressBar.className = 'plan-progress';
  progressBar.innerHTML = `
    <div class="progress-header">
      <span class="progress-label">Overall progress</span>
      <span class="progress-pct">${pct}%</span>
    </div>
    <div class="progress-bar">
      <div class="progress-fill" style="width:${pct}%"></div>
    </div>
  `;
  plan.appendChild(progressBar);
}

function updateProgress() {
  const steps = document.querySelectorAll('.step');
  const done = document.querySelectorAll('.step.done').length;
  const total = steps.length;
  const pct = Math.round((done / total) * 100);
  document.getElementById('progressPct').textContent = `${pct}%`;
  
  const fill = document.querySelector('.progress-fill');
  if (fill) fill.style.width = `${pct}%`;
  
  const pctText = document.querySelector('.progress-pct');
  if (pctText) pctText.textContent = `${pct}%`;
}

function approveStep(stepIndex) {
  const step = document.querySelector(`.step[data-step="${stepIndex}"]`);
  if (step) {
    step.classList.remove('active');
    step.classList.add('done');
    step.querySelector('.step-marker').innerHTML = '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#000" stroke-width="2"><polyline points="3,7 6,10 11,4"/></svg>';
    
    const approval = step.querySelector('.step-approval');
    if (approval) approval.remove();
    
    // Activate next step
    const nextStep = document.querySelector(`.step[data-step="${stepIndex + 1}"]`);
    if (nextStep && !nextStep.classList.contains('done')) {
      nextStep.classList.add('active');
      const status = nextStep.querySelector('.step-agent-status');
      if (status) {
        status.textContent = 'Running';
        status.classList.add('running');
      }
      
      // Add approval buttons
      const header = nextStep.querySelector('.step-header');
      const approvalDiv = document.createElement('div');
      approvalDiv.className = 'step-approval';
      approvalDiv.innerHTML = `
        <button class="approval-btn approve" onclick="approveStep(${stepIndex + 1})">Approve</button>
        <button class="approval-btn skip" onclick="skipStep(${stepIndex + 1})">Skip</button>
      `;
      header.appendChild(approvalDiv);
    }
    
    updateProgress();
    
    // Check if all done
    if (document.querySelectorAll('.step.done').length === document.querySelectorAll('.step').length) {
      setTimeout(() => {
        clearInterval(executionInterval);
        showScreen('complete');
      }, 1500);
    }
  }
}

function skipStep(stepIndex) {
  const step = document.querySelector(`.step[data-step="${stepIndex}"]`);
  if (step) {
    step.classList.remove('active');
    step.classList.add('done');
    step.querySelector('.step-marker').innerHTML = '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#606070" stroke-width="2"><line x1="4" y1="4" x2="10" y2="10"/><line x1="10" y1="4" x2="4" y2="10"/></svg>';
    
    const approval = step.querySelector('.step-approval');
    if (approval) approval.remove();
    
    // Activate next step
    const nextStep = document.querySelector(`.step[data-step="${stepIndex + 1}"]`);
    if (nextStep && !nextStep.classList.contains('done')) {
      nextStep.classList.add('active');
      const status = nextStep.querySelector('.step-agent-status');
      if (status) {
        status.textContent = 'Running';
        status.classList.add('running');
      }
      
      const header = nextStep.querySelector('.step-header');
      const approvalDiv = document.createElement('div');
      approvalDiv.className = 'step-approval';
      approvalDiv.innerHTML = `
        <button class="approval-btn approve" onclick="approveStep(${stepIndex + 1})">Approve</button>
        <button class="approval-btn skip" onclick="skipStep(${stepIndex + 1})">Skip</button>
      `;
      header.appendChild(approvalDiv);
    }
    
    updateProgress();
    
    if (document.querySelectorAll('.step.done').length === document.querySelectorAll('.step').length) {
      setTimeout(() => {
        clearInterval(executionInterval);
        showScreen('complete');
      }, 1500);
    }
  }
}

function tickAgentProgress() {
  agents.forEach(a => {
    if (a.status === 'active' && a.progress < 100) {
      a.progress = Math.min(100, a.progress + Math.floor(Math.random() * 3));
      if (a.progress === 100) {
        a.status = 'idle';
        a.task = 'Task completed';
      }
    }
  });
  renderAgents();
  
  const totalTokens = Math.floor(elapsedSeconds * 120);
  document.getElementById('tokens').textContent = totalTokens.toLocaleString();
}

function startActivitySimulation() {
  const actions = ['read', 'write', 'edit', 'test'];
  const tasks = [
    { desc: 'Parsing JWT token structure', file: 'src/auth/jwt.ts' },
    { desc: 'Created auth middleware', file: 'src/middleware/auth.ts' },
    { desc: 'Added session validation', file: 'src/auth/session.ts' },
    { desc: 'Running test suite', file: 'tests/auth/' },
    { desc: 'Updated type definitions', file: 'src/types/auth.d.ts' }
  ];
  
  function addActivity() {
    const now = new Date();
    const time = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
    const agent = agents.filter(a => a.status === 'active')[0] || agents[0];
    const action = actions[Math.floor(Math.random() * actions.length)];
    const task = tasks[Math.floor(Math.random() * tasks.length)];
    
    activities.unshift({ time, agent: agent.id, action, desc: task.desc, file: task.file });
    if (activities.length > 20) activities.pop();
    renderActivities();
  }
  
  addActivity();
  setInterval(addActivity, 3000);
}

function renderActivities() {
  const list = document.getElementById('activityList');
  list.innerHTML = activities.map(a => {
    const agent = agents.find(ag => ag.id === a.agent);
    return `
      <div class="activity-item">
        <div class="activity-time mono">${a.time}</div>
        <div class="activity-agent" style="background:${agent.color};color:${agent.textColor}">${agent.short}</div>
        <div class="activity-body">
          <div>
            <span class="activity-action action-${a.action}">${a.action}</span>
            <span class="activity-desc">${a.desc}</span>
          </div>
          <div class="activity-file mono">${a.file}</div>
        </div>
      </div>
    `;
  }).join('');
}

// Agent panel
function openAgentPanel(agentId) {
  const agent = agents.find(a => a.id === agentId);
  if (!agent) return;
  
  document.getElementById('panelAgentIcon').style.background = agent.color;
  document.getElementById('panelAgentIcon').style.color = agent.textColor;
  document.getElementById('panelAgentIcon').textContent = agent.short;
  document.getElementById('panelAgentName').textContent = agent.name;
  document.getElementById('panelAgentRole').textContent = agent.role;
  document.getElementById('panelAgentTask').textContent = agent.task;
  document.getElementById('panelAgentProgress').style.width = `${agent.progress}%`;
  document.getElementById('panelAgentProgress').style.background = agent.textColor;
  document.getElementById('panelAgentProgressText').textContent = `${agent.progress}%`;
  
  document.getElementById('agentPanel').classList.add('open');
}

document.getElementById('closePanelBtn').addEventListener('click', () => {
  document.getElementById('agentPanel').classList.remove('open');
});

// Completion screen
document.getElementById('newTaskBtn').addEventListener('click', () => {
  // Reset state
  elapsedSeconds = 0;
  currentStep = 0;
  activities.length = 0;
  agents.forEach(a => { a.progress = 0; a.status = 'idle'; });
  document.getElementById('goalInput').value = '';
  showScreen('goal');
});

// Execution controls
document.getElementById('pauseBtn').addEventListener('click', () => {
  const btn = document.getElementById('pauseBtn');
  if (executionInterval) {
    clearInterval(executionInterval);
    executionInterval = null;
    btn.innerHTML = '<svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor"><polygon points="3,1 11,6 3,11"/></svg>';
  } else {
    executionInterval = setInterval(() => {
      elapsedSeconds++;
      document.getElementById('elapsed').textContent = formatTime(elapsedSeconds);
      updateProgress();
      tickAgentProgress();
    }, 1000);
    btn.innerHTML = '<svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor"><rect x="2" y="1" width="3" height="10" rx="1"/><rect x="7" y="1" width="3" height="10" rx="1"/></svg>';
  }
});

document.getElementById('stopBtn').addEventListener('click', () => {
  if (confirm('Stop execution? This will cancel the current plan.')) {
    clearInterval(executionInterval);
    showScreen('goal');
  }
});

// Initialize
drawPlanGraph();
