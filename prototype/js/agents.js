// Pi Agent Registry
// Manages Pi agents and their orchestration roles

const AgentRole = {
  ORCHESTRATOR: 'orchestrator',
  SCOUT: 'scout',
  WORKER: 'worker',
  REVIEWER: 'reviewer',
  DESIGNER: 'designer',
  LIBRARIAN: 'librarian'
};

const AgentStatus = {
  ACTIVE: 'active',
  IDLE: 'idle',
  WAITING: 'waiting',
  COMPLETED: 'completed'
};

class PiAgent {
  constructor(id, name, role, config = {}) {
    this.id = id;
    this.name = name;
    this.role = role;
    this.status = AgentStatus.IDLE;
    this.currentTask = null;
    this.progress = 0;
    this.worktree = config.worktree || null;
    this.parentId = config.parentId || null;
    this.children = [];
    this.messages = [];
    this.metadata = config.metadata || {};
  }

  assignTask(task) {
    this.currentTask = task;
    this.status = AgentStatus.ACTIVE;
    this.progress = 0;
  }

  updateProgress(value) {
    this.progress = Math.min(100, value);
    if (this.progress >= 100) {
      this.status = AgentStatus.COMPLETED;
    }
  }

  addChild(agent) {
    agent.parentId = this.id;
    this.children.push(agent);
  }

  sendMessage(to, message) {
    this.messages.push({
      timestamp: Date.now(),
      from: this.id,
      to,
      content: message
    });
  }

  getDisplayColor() {
    const colors = {
      [AgentRole.ORCHESTRATOR]: { bg: '#4c1d95', text: '#c4b5fd' },
      [AgentRole.SCOUT]: { bg: '#1e3a5f', text: '#60a5fa' },
      [AgentRole.WORKER]: { bg: '#14532d', text: '#34d399' },
      [AgentRole.REVIEWER]: { bg: '#78350f', text: '#fbbf24' },
      [AgentRole.DESIGNER]: { bg: '#312e81', text: '#a78bfa' },
      [AgentRole.LIBRARIAN]: { bg: '#3f3f46', text: '#d4d4d8' }
    };
    return colors[this.role] || colors[AgentRole.WORKER];
  }

  getShortName() {
    const shorts = {
      [AgentRole.ORCHESTRATOR]: 'Or',
      [AgentRole.SCOUT]: 'Sc',
      [AgentRole.WORKER]: 'Wk',
      [AgentRole.REVIEWER]: 'Rv',
      [AgentRole.DESIGNER]: 'Ds',
      [AgentRole.LIBRARIAN]: 'Lb'
    };
    return shorts[this.role] || 'Ag';
  }
}

class AgentRegistry {
  constructor() {
    this.agents = new Map();
    this.orchestrator = null;
  }

  registerAgent(agent) {
    this.agents.set(agent.id, agent);
    if (agent.role === AgentRole.ORCHESTRATOR && !this.orchestrator) {
      this.orchestrator = agent;
    }
  }

  getAgent(id) {
    return this.agents.get(id);
  }

  getAgentsByRole(role) {
    return Array.from(this.agents.values()).filter(a => a.role === role);
  }

  getActiveAgents() {
    return Array.from(this.agents.values()).filter(a => a.status === AgentStatus.ACTIVE);
  }

  removeAgent(id) {
    const agent = this.agents.get(id);
    if (agent) {
      if (agent.parentId) {
        const parent = this.agents.get(agent.parentId);
        if (parent) {
          parent.children = parent.children.filter(c => c.id !== id);
        }
      }
      this.agents.delete(id);
    }
  }

  getAllAgents() {
    return Array.from(this.agents.values());
  }
}

// Singleton registry
const registry = new AgentRegistry();
