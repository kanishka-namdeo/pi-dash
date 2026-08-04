// Pi Orchestration Engine
// Core orchestration logic for coordinating multiple Pi agents


class PiOrchestrator {
  constructor() {
    this.taskQueue = new TaskQueue();
    this.delegator = new TaskDelegator(registry, this.taskQueue);
    this.mode = 'supervised'; // auto, supervised, manual
    this.eventListeners = new Map();
    this.executionLog = [];
  }

  // Initialize with a main orchestrator agent
  initialize(projectName) {
    const orchestrator = new PiAgent(
      'orchestrator-main',
      'Pi Orchestrator',
      AgentRole.ORCHESTRATOR,
      { metadata: { project: projectName } }
    );
    orchestrator.status = AgentStatus.ACTIVE;
    registry.registerAgent(orchestrator);
    
    this.log('system', `Orchestrator initialized for project: ${projectName}`);
    return orchestrator;
  }

  // Spawn a sub-agent for a specific role
  spawnAgent(role, config = {}) {
    const id = `${role}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const name = `${role.charAt(0).toUpperCase() + role.slice(1)} Agent`;
    
    const agent = new PiAgent(id, name, role, {
      worktree: config.worktree || `worktree-${id}`,
      parentId: config.parentId || 'orchestrator-main',
      metadata: config.metadata || {}
    });

    registry.registerAgent(agent);
    
    // Add to parent's children
    const parent = registry.getAgent(agent.parentId);
    if (parent) {
      parent.addChild(agent);
    }

    this.log('spawn', `Spawned ${role} agent: ${id}`);
    this.emit('agent:spawned', { agent });
    
    return agent;
  }

  // Create a task and add to queue
  createTask(title, description, config = {}) {
    const task = this.taskQueue.createTask(title, description, config);
    this.log('task', `Created task: ${title}`);
    this.emit('task:created', { task });
    return task;
  }

  // Create a plan with multiple steps
  createPlan(title, steps) {
    const planTask = this.createTask(title, `Plan: ${title}`, {
      priority: 'high',
      context: { isPlan: true }
    });

    steps.forEach((step, index) => {
      const stepTask = this.createTask(step.title, step.description, {
        parentTask: planTask.id,
        priority: step.priority || 'medium',
        context: { stepIndex: index, ...step.context }
      });
      planTask.addSubtask(stepTask);
    });

    this.log('plan', `Created plan: ${title} with ${steps.length} steps`);
    this.emit('plan:created', { plan: planTask });
    
    return planTask;
  }

  // Execute a plan based on current mode
  executePlan(planId) {
    const plan = this.taskQueue.getTask(planId);
    if (!plan) return;

    this.log('execute', `Executing plan: ${plan.title}`);
    this.emit('plan:execution:started', { plan });

    switch (this.mode) {
      case 'auto':
        this.executeAutoMode(plan);
        break;
      case 'supervised':
        this.executeSupervisedMode(plan);
        break;
      case 'manual':
        this.executeManualMode(plan);
        break;
    }
  }

  // Auto mode: fully autonomous execution
  executeAutoMode(plan) {
    const subtasks = plan.subtasks.map(id => this.taskQueue.getTask(id));
    
    // Group tasks by dependencies
    const independent = subtasks.filter(t => !t.parentTask);
    
    // Execute independent tasks in parallel
    this.delegator.setStrategy(DelegationStrategy.PARALLEL);
    this.delegator.executeParallel(independent.map(t => t.id));
  }

  // Supervised mode: execute with checkpoints
  executeSupervisedMode(plan) {
    const subtasks = plan.subtasks.map(id => this.taskQueue.getTask(id));
    
    // Execute first task, wait for approval
    if (subtasks.length > 0) {
      const firstTask = subtasks[0];
      this.delegator.autoDelegate(firstTask.id);
      this.emit('plan:awaiting:approval', { 
        plan, 
        currentTask: firstTask,
        message: 'Ready to execute. Awaiting approval.' 
      });
    }
  }

  // Manual mode: wait for explicit commands
  executeManualMode(plan) {
    this.emit('plan:manual:mode', { 
      plan, 
      message: 'Manual mode. Use commands to execute each step.' 
    });
  }

  // Approve current task (for supervised mode)
  approveTask(taskId) {
    const task = this.taskQueue.getTask(taskId);
    if (!task) return;

    this.log('approve', `Approved task: ${task.title}`);
    this.emit('task:approved', { task });

    // Continue execution
    const plan = task.parentTask ? this.taskQueue.getTask(task.parentTask) : null;
    if (plan) {
      const nextTask = plan.subtasks
        .map(id => this.taskQueue.getTask(id))
        .find(t => t.status === TaskStatus.PENDING);
      
      if (nextTask) {
        this.delegator.autoDelegate(nextTask.id);
      }
    }
  }

  // Handle task completion
  completeTask(taskId, result) {
    const task = this.taskQueue.getTask(taskId);
    if (!task) return;

    task.complete(result);
    
    const agent = registry.getAgent(task.assignedTo);
    if (agent) {
      agent.status = AgentStatus.IDLE;
      agent.currentTask = null;
    }

    this.log('complete', `Task completed: ${task.title}`);
    this.emit('task:completed', { task, result });

    // Check if parent plan is complete
    if (task.parentTask) {
      const parent = this.taskQueue.getTask(task.parentTask);
      if (parent && parent.getProgress(this.taskQueue) === 100) {
        this.completeTask(parent.id, { message: 'All subtasks completed' });
      }
    }
  }

  // Send message between agents
  sendMessage(fromId, toId, message) {
    const from = registry.getAgent(fromId);
    const to = registry.getAgent(toId);
    
    if (!from || !to) return;

    from.sendMessage(toId, message);
    this.log('message', `${from.name} -> ${to.name}: ${message}`);
    this.emit('agent:message', { from, to, message });
  }

  // Monitor agent status
  monitorAgents() {
    const agents = registry.getAllAgents();
    
    agents.forEach(agent => {
      if (agent.status === AgentStatus.ACTIVE && agent.currentTask) {
        // Simulate progress
        const increment = Math.random() * 5;
        agent.updateProgress(agent.progress + increment);
        
        if (agent.progress >= 100) {
          this.completeTask(agent.currentTask.id, { message: 'Task completed' });
        }
      }
    });

    this.emit('agents:updated', { agents });
  }

  // Execution modes
  setMode(mode) {
    this.mode = mode;
    this.log('mode', `Switched to ${mode} mode`);
    this.emit('mode:changed', { mode });
  }

  // Event system
  on(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event).push(callback);
  }

  emit(event, data) {
    const listeners = this.eventListeners.get(event) || [];
    listeners.forEach(callback => callback(data));
  }

  // Logging
  log(type, message) {
    this.executionLog.push({
      timestamp: Date.now(),
      type,
      message
    });
  }

  // Get execution stats
  getStats() {
    const allTasks = this.taskQueue.getAllTasks();
    const completed = this.taskQueue.getCompletedTasks();
    const active = this.taskQueue.getActiveTasks();
    const agents = registry.getAllAgents();
    const activeAgents = registry.getActiveAgents();

    return {
      totalTasks: allTasks.length,
      completedTasks: completed.length,
      activeTasks: active.length,
      totalAgents: agents.length,
      activeAgents: activeAgents.length,
      overallProgress: this.taskQueue.getOverallProgress()
    };
  }
}

// Singleton orchestrator
const orchestrator = new PiOrchestrator();
