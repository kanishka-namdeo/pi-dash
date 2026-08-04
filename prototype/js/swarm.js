// Pi Swarm Orchestration
// Manages parallel agent execution across isolated worktrees

const SwarmMode = {
  COOPERATIVE: 'cooperative',  // Agents share context
  COMPETITIVE: 'competitive',  // Agents work independently, best result wins
  HIERARCHICAL: 'hierarchical' // Parent agent coordinates children
};

class SwarmOrchestrator {
  constructor(registry, taskQueue) {
    this.registry = registry;
    this.taskQueue = taskQueue;
    this.mode = SwarmMode.COOPERATIVE;
    this.worktrees = new Map();
    this.communicationLog = [];
  }

  setMode(mode) {
    this.mode = mode;
  }

  createWorktree(id, baseBranch = 'main') {
    const worktree = {
      id,
      baseBranch,
      agents: [],
      createdAt: Date.now(),
      status: 'active'
    };
    this.worktrees.set(id, worktree);
    return worktree;
  }

  assignAgentToWorktree(agentId, worktreeId) {
    const agent = this.registry.getAgent(agentId);
    const worktree = this.worktrees.get(worktreeId);
    
    if (!agent || !worktree) {
      throw new Error(`Agent ${agentId} or worktree ${worktreeId} not found`);
    }

    agent.worktree = worktreeId;
    worktree.agents.push(agentId);
  }

  // Swarm communication patterns
  broadcast(fromAgentId, message) {
    const fromAgent = this.registry.getAgent(fromAgentId);
    if (!fromAgent) return;

    const recipients = this.registry.getAllAgents()
      .filter(a => a.id !== fromAgentId && a.worktree === fromAgent.worktree);

    for (const recipient of recipients) {
      fromAgent.sendMessage(recipient.id, message);
    }

    this.communicationLog.push({
      type: 'broadcast',
      from: fromAgentId,
      message,
      timestamp: Date.now(),
      worktree: fromAgent.worktree
    });
  }

  sendDirect(fromAgentId, toAgentId, message) {
    const fromAgent = this.registry.getAgent(fromAgentId);
    const toAgent = this.registry.getAgent(toAgentId);
    
    if (!fromAgent || !toAgent) return;

    fromAgent.sendMessage(toAgentId, message);
    
    this.communicationLog.push({
      type: 'direct',
      from: fromAgentId,
      to: toAgentId,
      message,
      timestamp: Date.now()
    });
  }

  // Coordinate parallel execution
  async executeSwarm(taskIds, worktreeId) {
    const worktree = this.worktrees.get(worktreeId);
    if (!worktree) {
      throw new Error(`Worktree ${worktreeId} not found`);
    }

    const agents = worktree.agents.map(id => this.registry.getAgent(id));
    const tasks = taskIds.map(id => this.taskQueue.getTask(id));

    if (agents.length === 0 || tasks.length === 0) {
      throw new Error('No agents or tasks available');
    }

    // Assign tasks to agents
    const assignments = [];
    for (let i = 0; i < Math.min(agents.length, tasks.length); i++) {
      const agent = agents[i];
      const task = tasks[i];
      
      task.assign(agent.id);
      agent.assignTask(task);
      
      assignments.push({ agent: agent.id, task: task.id });
    }

    // In a real implementation, this would:
    // 1. Start each agent in its own process
    // 2. Monitor their progress
    // 3. Collect results
    // 4. Handle failures and retries

    return {
      assignments,
      worktree: worktreeId,
      startedAt: Date.now()
    };
  }

  // Monitor swarm progress
  getSwarmStatus(worktreeId) {
    const worktree = this.worktrees.get(worktreeId);
    if (!worktree) return null;

    const agents = worktree.agents.map(id => this.registry.getAgent(id));
    const tasks = agents
      .map(a => a.currentTask)
      .filter(t => t !== null)
      .map(t => this.taskQueue.getTask(t));

    return {
      worktree: worktreeId,
      agents: agents.map(a => ({
        id: a.id,
        name: a.name,
        role: a.role,
        status: a.status,
        progress: a.progress,
        currentTask: a.currentTask
      })),
      tasks: tasks.map(t => ({
        id: t.id,
        title: t.title,
        status: t.status,
        progress: t.getProgress(this.taskQueue)
      })),
      overallProgress: tasks.length > 0 
        ? Math.round(tasks.reduce((sum, t) => sum + t.getProgress(this.taskQueue), 0) / tasks.length)
        : 0
    };
  }

  // Collect results from completed agents
  collectResults(worktreeId) {
    const worktree = this.worktrees.get(worktreeId);
    if (!worktree) return [];

    const agents = worktree.agents.map(id => this.registry.getAgent(id));
    const completedAgents = agents.filter(a => a.status === AgentStatus.COMPLETED);

    return completedAgents.map(agent => {
      const task = agent.currentTask ? this.taskQueue.getTask(agent.currentTask) : null;
      return {
        agentId: agent.id,
        agentName: agent.name,
        taskId: task?.id,
        taskTitle: task?.title,
        result: task?.result,
        duration: task?.getDuration()
      };
    });
  }

  // Merge results based on strategy
  mergeResults(worktreeId) {
    const results = this.collectResults(worktreeId);
    
    switch (this.mode) {
      case SwarmMode.COMPETITIVE:
        // Pick the best result (e.g., highest quality, fastest, etc.)
        return this.selectBestResult(results);
      
      case SwarmMode.HIERARCHICAL:
        // Combine results in a structured way
        return this.combineHierarchical(results);
      
      case SwarmMode.COOPERATIVE:
      default:
        // Merge all results into a unified output
        return this.mergeCooperative(results);
    }
  }

  selectBestResult(results) {
    // Simple heuristic: pick the first completed result
    // In reality, this would use quality metrics, test results, etc.
    return results[0] || null;
  }

  combineHierarchical(results) {
    return {
      type: 'hierarchical',
      contributions: results,
      mergedAt: Date.now()
    };
  }

  mergeCooperative(results) {
    return {
      type: 'cooperative',
      combined: results.map(r => r.result).filter(r => r !== null),
      totalDuration: results.reduce((sum, r) => sum + (r.duration || 0), 0),
      mergedAt: Date.now()
    };
  }
}
