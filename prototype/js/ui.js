// Pi Orchestrator UI Renderer
// Handles all DOM updates for the dashboard


class UIRenderer {
  constructor(orchestrator) {
    this.orchestrator = orchestrator;
    this.selectedAgent = null;
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Listen to orchestrator events
    this.orchestrator.on('agent:spawned', () => this.renderAgents());
    this.orchestrator.on('task:created', () => this.renderPlan());
    this.orchestrator.on('plan:created', () => this.renderPlan());
    this.orchestrator.on('task:completed', () => {
      this.renderAgents();
      this.renderPlan();
      this.renderMetrics();
    });
    this.orchestrator.on('agents:updated', () => {
      this.renderAgents();
      this.renderMetrics();
    });
    this.orchestrator.on('mode:changed', () => this.renderModeSelector());
  }

  renderAgents() {
    const list = document.getElementById('agentList');
    const agents = registry.getAllAgents();
    
    list.innerHTML = agents.map((agent, i) => {
      const colors = agent.getDisplayColor();
      const barColor = agent.status === AgentStatus.ACTIVE ? colors.text : 'var(--amber)';
      const isSelected = this.selectedAgent === agent.id || (i === 0 && !this.selectedAgent);
      
      return `<div class="agent-card${isSelected ? ' selected' : ''}" data-id="${agent.id}">
        <div class="agent-top">
          <div class="agent-icon" style="background:${colors.bg};color:${colors.text}">${agent.getShortName()}</div>
          <div class="agent-name">${agent.name}</div>
          <div class="status-dot ${agent.status}"></div>
        </div>
        <div class="agent-task mono">${agent.currentTask?.title || agent.role}</div>
        ${agent.progress > 0 ? `<div class="agent-progress"><div class="agent-progress-bar" style="width:${agent.progress}%;background:${barColor}"></div></div>` : ''}
      </div>`;
    }).join('');

    // Add click handlers
    list.querySelectorAll('.agent-card').forEach(card => {
      card.addEventListener('click', () => {
        list.querySelectorAll('.agent-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        this.selectedAgent = card.dataset.id;
      });
    });

    // Update count
    const countEl = document.querySelector('.fleet .count');
    if (countEl) countEl.textContent = agents.length;
  }

  renderPlan() {
    const planContent = document.querySelector('.plan-content');
    const allTasks = this.orchestrator.taskQueue.getAllTasks();
    
    // Find the main plan task
    const planTask = allTasks.find(t => t.context?.isPlan);
    if (!planTask) {
      planContent.innerHTML = '<div class="plan-title">No active plan</div>';
      return;
    }

    const subtasks = planTask.subtasks.map(id => this.orchestrator.taskQueue.getTask(id));
    const progress = planTask.getProgress(this.orchestrator.taskQueue);

    let html = `
      <div class="plan-title">${planTask.title}</div>
      <div class="plan-subtitle mono">${planTask.id} · ${this.getTimeAgo(planTask.createdAt)}</div>
    `;

    subtasks.forEach((task, index) => {
      const stepClass = task.status === 'completed' ? 'done' : 
                        task.status === 'in_progress' ? 'active' : '';
      
      html += `<div class="step ${stepClass}">
        <div class="step-marker"></div>
        <div class="step-header">
          <span class="step-num mono">${String(index + 1).padStart(2, '0')}</span>
          <span class="step-name">${task.title}</span>
        </div>
        <div class="step-agents">`;

      if (task.assignedTo) {
        const agent = registry.getAgent(task.assignedTo);
        if (agent) {
          const colors = agent.getDisplayColor();
          const statusClass = task.status === 'in_progress' ? 'running' : 
                             task.status === 'completed' ? 'done' : '';
          const statusText = task.status === 'in_progress' ? `● ${this.getDuration(task.startedAt)}` :
                            task.status === 'completed' ? this.getDuration(task.startedAt, task.completedAt) :
                            'waiting';
          
          html += `<div class="step-agent">
            <div class="step-agent-icon" style="background:${colors.bg};color:${colors.text}">${agent.getShortName()}</div>
            <span>${agent.name}</span>
            <span class="step-agent-status ${statusClass} mono">${statusText}</span>
          </div>`;
        }
      } else {
        html += `<div class="step-agent">
          <span class="step-agent-status mono">unassigned</span>
        </div>`;
      }

      html += `</div></div>`;
    });

    html += `
      <div class="plan-progress">
        <div class="progress-header">
          <span class="progress-label">Overall progress</span>
          <span class="progress-pct mono">${progress}%</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" style="width:${progress}%"></div>
        </div>
      </div>
    `;

    planContent.innerHTML = html;

    // Update step count
    const countEl = document.querySelector('.plan .count');
    if (countEl) countEl.textContent = `${subtasks.length} steps`;
  }

  renderMetrics() {
    const stats = this.orchestrator.getStats();
    
    const metricsEl = document.querySelector('.metrics');
    metricsEl.innerHTML = `
      <div class="metric">
        <span class="metric-label">Tasks done</span>
        <span class="metric-value mono">${stats.completedTasks}</span>
      </div>
      <div class="metric-sep"></div>
      <div class="metric">
        <span class="metric-label">Pass rate</span>
        <span class="metric-value good mono">100%</span>
      </div>
      <div class="metric-sep"></div>
      <div class="metric">
        <span class="metric-label">Active</span>
        <span class="metric-value mono">${stats.activeAgents}</span>
      </div>
      <div class="metric-sep"></div>
      <div class="metric">
        <span class="metric-label">Est. cost</span>
        <span class="metric-value warn mono">$0.42</span>
      </div>
    `;
  }

  renderModeSelector() {
    const modeButtons = document.querySelectorAll('.mode-btn');
    modeButtons.forEach(btn => {
      btn.classList.remove('active');
      if (btn.textContent.toLowerCase() === this.orchestrator.mode) {
        btn.classList.add('active');
      }
    });
  }

  getTimeAgo(timestamp) {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  }

  getDuration(start, end = Date.now()) {
    const seconds = Math.floor((end - start) / 1000);
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}m ${String(secs).padStart(2, '0')}s`;
  }
}
