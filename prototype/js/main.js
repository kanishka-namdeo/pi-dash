// Pi Orchestrator Dashboard - Main Entry Point
// Initializes the orchestrator and sets up the demo scenario


// Initialize the orchestrator
const projectName = 'pi-dash';
orchestrator.initialize(projectName);

// Create UI renderer
const ui = new UIRenderer(orchestrator);

// Set up demo scenario
function setupDemo() {
  // Spawn a team of Pi agents
  const scout = orchestrator.spawnAgent(AgentRole.SCOUT, {
    metadata: { specialty: 'code analysis' }
  });
  
  const worker1 = orchestrator.spawnAgent(AgentRole.WORKER, {
    metadata: { specialty: 'implementation' }
  });
  
  const worker2 = orchestrator.spawnAgent(AgentRole.WORKER, {
    metadata: { specialty: 'testing' }
  });
  
  const reviewer = orchestrator.spawnAgent(AgentRole.REVIEWER, {
    metadata: { specialty: 'code review' }
  });

  // Create a plan for implementing a feature
  const plan = orchestrator.createPlan('Implement user authentication', [
    {
      title: 'Analyze existing codebase',
      description: 'Scout the project structure and identify auth patterns',
      priority: 'high',
      context: { type: 'scout' }
    },
    {
      title: 'Implement auth middleware',
      description: 'Create JWT-based authentication middleware',
      priority: 'high',
      context: { type: 'implementation' }
    },
    {
      title: 'Write integration tests',
      description: 'Add comprehensive test coverage for auth flow',
      priority: 'medium',
      context: { type: 'testing' }
    },
    {
      title: 'Review implementation',
      description: 'Code review for security best practices',
      priority: 'medium',
      context: { type: 'review' }
    }
  ]);

  // Set supervised mode
  orchestrator.setMode('supervised');

  // Auto-assign first task to scout
  const firstTask = plan.subtasks[0];
  orchestrator.delegator.delegateTask(firstTask, scout.id);

  // Initial render
  ui.renderAgents();
  ui.renderPlan();
  ui.renderMetrics();
  ui.renderModeSelector();

  // Simulate agent activity
  setInterval(() => {
    orchestrator.monitorAgents();
  }, 2000);

  // Simulate task completion and progression
  setTimeout(() => {
    // Complete first task
    orchestrator.completeTask(firstTask, { 
      message: 'Found 3 auth patterns in codebase',
      findings: ['JWT middleware', 'session-based auth', 'OAuth2 integration']
    });

    // Auto-assign next task
    const secondTask = plan.subtasks[1];
    orchestrator.delegator.delegateTask(secondTask, worker1.id);
    
    ui.renderAgents();
    ui.renderPlan();
  }, 5000);

  setTimeout(() => {
    // Add another worker for testing
    const thirdTask = plan.subtasks[2];
    orchestrator.delegator.delegateTask(thirdTask, worker2.id);
    
    ui.renderAgents();
    ui.renderPlan();
  }, 10000);

  // Set up mode selector clicks
  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const mode = btn.textContent.toLowerCase();
      orchestrator.setMode(mode);
    });
  });

  // Set up control buttons
  document.querySelector('.ctrl-btn[title="Pause"]').addEventListener('click', () => {
    console.log('Pause clicked');
  });

  document.querySelector('.ctrl-btn[title="Stop"]').addEventListener('click', () => {
    console.log('Stop clicked');
  });

  document.querySelector('.ctrl-btn[title="New Task"]').addEventListener('click', () => {
    const task = orchestrator.createTask(
      'New ad-hoc task',
      'Task created from UI',
      { priority: 'medium' }
    );
    ui.renderPlan();
  });
}

// Start the demo
setupDemo();
