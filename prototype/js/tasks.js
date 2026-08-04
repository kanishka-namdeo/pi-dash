// Pi Task Delegation System
// Manages task creation, delegation, and execution tracking

const TaskStatus = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  FAILED: 'failed',
  BLOCKED: 'blocked'
};

const TaskPriority = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};

class Task {
  constructor(id, title, description, config = {}) {
    this.id = id;
    this.title = title;
    this.description = description;
    this.status = TaskStatus.PENDING;
    this.priority = config.priority || TaskPriority.MEDIUM;
    this.assignedTo = null;
    this.parentTask = config.parentTask || null;
    this.subtasks = [];
    this.createdAt = Date.now();
    this.startedAt = null;
    this.completedAt = null;
    this.result = null;
    this.context = config.context || {};
    this.acceptanceCriteria = config.acceptanceCriteria || [];
  }

  assign(agentId) {
    this.assignedTo = agentId;
    this.status = TaskStatus.IN_PROGRESS;
    this.startedAt = Date.now();
  }

  complete(result) {
    this.status = TaskStatus.COMPLETED;
    this.completedAt = Date.now();
    this.result = result;
  }

  fail(reason) {
    this.status = TaskStatus.FAILED;
    this.completedAt = Date.now();
    this.result = { error: reason };
  }

  addSubtask(task) {
    task.parentTask = this.id;
    this.subtasks.push(task.id);
  }

  getProgress(taskQueue) {
    if (this.subtasks.length === 0) {
      return this.status === TaskStatus.COMPLETED ? 100 : 
             this.status === TaskStatus.IN_PROGRESS ? 50 : 0;
    }
    
    if (!taskQueue) return 0;
    
    const completed = this.subtasks.filter(id => {
      const task = taskQueue.getTask(id);
      return task && task.status === TaskStatus.COMPLETED;
    }).length;
    return Math.round((completed / this.subtasks.length) * 100);
  }

  getDuration() {
    if (!this.startedAt) return 0;
    const end = this.completedAt || Date.now();
    return Math.round((end - this.startedAt) / 1000);
  }
}

class TaskQueue {
  constructor() {
    this.tasks = new Map();
    this.executionOrder = [];
  }

  createTask(title, description, config = {}) {
    const id = `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const task = new Task(id, title, description, config);
    this.tasks.set(id, task);
    this.executionOrder.push(id);
    return task;
  }

  getTask(id) {
    return this.tasks.get(id);
  }

  getPendingTasks() {
    return Array.from(this.tasks.values())
      .filter(t => t.status === TaskStatus.PENDING)
      .sort((a, b) => {
        const priorityOrder = {
          [TaskPriority.CRITICAL]: 0,
          [TaskPriority.HIGH]: 1,
          [TaskPriority.MEDIUM]: 2,
          [TaskPriority.LOW]: 3
        };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      });
  }

  getActiveTasks() {
    return Array.from(this.tasks.values())
      .filter(t => t.status === TaskStatus.IN_PROGRESS);
  }

  getCompletedTasks() {
    return Array.from(this.tasks.values())
      .filter(t => t.status === TaskStatus.COMPLETED);
  }

  getAllTasks() {
    return Array.from(this.tasks.values());
  }

  getTaskTree(taskId) {
    const task = this.tasks.get(taskId);
    if (!task) return null;
    
    return {
      ...task,
      subtasks: task.subtasks.map(id => this.getTaskTree(id))
    };
  }

  getOverallProgress() {
    const allTasks = this.getAllTasks();
    if (allTasks.length === 0) return 0;
    
    const completed = allTasks.filter(t => t.status === TaskStatus.COMPLETED).length;
    return Math.round((completed / allTasks.length) * 100);
  }
}

const DelegationStrategy = {
  PARALLEL: 'parallel',
  SEQUENTIAL: 'sequential',
  PIPELINE: 'pipeline',
  HIERARCHICAL: 'hierarchical'
};

class TaskDelegator {
  constructor(registry, taskQueue) {
    this.registry = registry;
    this.taskQueue = taskQueue;
    this.strategy = DelegationStrategy.PARALLEL;
  }

  setStrategy(strategy) {
    this.strategy = strategy;
  }

  delegateTask(taskId, agentId) {
    const task = this.taskQueue.getTask(taskId);
    const agent = this.registry.getAgent(agentId);
    
    if (!task || !agent) {
      throw new Error(`Task ${taskId} or agent ${agentId} not found`);
    }

    task.assign(agentId);
    agent.assignTask(task);
    
    return { task, agent };
  }

  autoDelegate(taskId) {
    const task = this.taskQueue.getTask(taskId);
    if (!task) return null;

    // Find available agent based on task requirements
    const availableAgents = this.registry.getAllAgents()
      .filter(a => a.status === AgentStatus.IDLE || a.status === AgentStatus.WAITING);

    if (availableAgents.length === 0) {
      task.status = TaskStatus.BLOCKED;
      return null;
    }

    // Simple round-robin for now
    const agent = availableAgents[0];
    return this.delegateTask(taskId, agent.id);
  }

  executeParallel(taskIds) {
    const results = [];
    for (const taskId of taskIds) {
      const result = this.autoDelegate(taskId);
      if (result) results.push(result);
    }
    return results;
  }

  executeSequential(taskIds) {
    // In a real implementation, this would queue tasks
    // For prototype, just delegate the first one
    if (taskIds.length > 0) {
      return this.autoDelegate(taskIds[0]);
    }
    return null;
  }

  executePipeline(stages) {
    // Each stage is an array of task IDs
    // Execute current stage, wait for completion, then next stage
    const currentStage = stages[0];
    if (!currentStage) return [];
    
    return this.executeParallel(currentStage);
  }
}
