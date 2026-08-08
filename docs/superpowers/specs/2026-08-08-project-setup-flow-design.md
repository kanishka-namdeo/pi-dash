# Project Setup Flow Design Spec

**Date:** 2026-08-08  
**Status:** Approved for Implementation  
**Design File:** `design/pidash-ui.pen` (Node: `UsyjJ`)

## Overview

The Project Setup Flow is a guided onboarding experience that runs after the initial agent detection onboarding. It helps users add their first project to the PiDash dashboard and select which AI coding agents to use with that project.

### Relationship to OnboardingFlow

- **OnboardingFlow** (existing): First-run agent detection and configuration
- **Project Setup Flow** (new): Runs sequentially after onboarding to set up the first project
- **Trigger**: Automatically runs after onboarding if no projects exist in `projects.json`
- **Completion**: Project setup is considered "done" when `projects.json` contains at least one project. No separate flag is stored — the presence of projects is the signal.

### Flow Modes

- **Full mode**: Runs on first-run with all 17 screens, educational copy, and loading states
- **Condensed mode**: Triggered by "Add Project" button in dashboard, starts at project selection with minimal copy

## Architecture

### Approach: Monolithic State Machine

Single `ProjectSetupFlow` component with a state machine managing all 17 screens, consistent with the existing `OnboardingFlow` pattern.

```
App.tsx
├── OnboardingFlow (existing)
│   └── Handles first-run agent detection
│   └── On complete → triggers ProjectSetupFlow (if no projects exist)
│
└── ProjectSetupFlow (new)
    ├── useProjectSetupState (state machine hook)
    ├── 17 screen components (in /components/project-setup/)
    └── On complete → navigates to Dashboard
```

### Component Hierarchy

```
ProjectSetupFlow
├── State: useProjectSetupState()
│   ├── currentScreen: ScreenName
│   ├── projectPath: string | null
│   ├── selectedAgents: string[]
│   ├── githubConnected: boolean
│   ├── cloneStatus: 'idle' | 'cloning' | 'success' | 'error'
│   └── navigate(screen: ScreenName)
│
├── Screen Components (17 total)
│   ├── Entry screens (2): ProjectSelection, GitHubConnected
│   ├── Local screens (4): RecentProjects, RecentProjectsEmpty, ProjectAlreadyAdded, RecentProjectsLoading
│   ├── Clone screens (5): CloneRepository, CloneValidationError, CloningProgress, CloneError, CloneErrorDestinationExists
│   ├── GitHub screens (1): GitHubRepoPicker
│   └── Prepare screens (5): ProjectLoading, ScanningForAgents, SelectAgents, NotAGitRepository, NoAgentsFound
│
└── Navigation: Conditional rendering based on currentScreen
```

### File Structure

```
renderer/src/
├── components/
│   └── project-setup/
│       ├── ProjectSetupFlow.tsx (main orchestrator)
│       ├── screens/
│       │   ├── ProjectSelectionScreen.tsx
│       │   ├── ProjectSelectionGitHubConnectedScreen.tsx
│       │   ├── RecentProjectsScreen.tsx
│       │   ├── RecentProjectsEmptyScreen.tsx
│       │   ├── RecentProjectsLoadingScreen.tsx
│       │   ├── ProjectAlreadyAddedScreen.tsx
│       │   ├── CloneRepositoryScreen.tsx
│       │   ├── CloneRepositoryValidationErrorScreen.tsx
│       │   ├── CloningProgressScreen.tsx
│       │   ├── CloneErrorScreen.tsx
│       │   ├── CloneErrorDestinationExistsScreen.tsx
│       │   ├── GitHubRepoPickerScreen.tsx
│       │   ├── ProjectLoadingScreen.tsx
│       │   ├── ScanningForAgentsScreen.tsx
│       │   ├── SelectAgentsScreen.tsx
│       │   ├── NotAGitRepositoryScreen.tsx
│       │   └── NoAgentsFoundScreen.tsx
│       └── __tests__/
│           └── ProjectSetupFlow.test.tsx
├── hooks/
│   └── useProjectSetupState.ts
└── types/
    └── project-setup.ts (ScreenName, ProjectSetupState types)
```

## State Management

### State Shape

```typescript
interface ProjectSetupState {
  // Navigation
  currentScreen: ScreenName;
  
  // Project data
  projectPath: string | null;
  projectName: string | null; // derived from path
  
  // GitHub integration
  githubConnected: boolean;
  githubUser: string | null;
  githubRepoUrl: string | null;
  
  // Clone operation
  cloneStatus: 'idle' | 'cloning' | 'success' | 'error';
  cloneProgress: number; // 0-100
  cloneError: string | null;
  cloneDestinationExists: boolean;
  
  // Agent selection
  selectedAgents: string[]; // agent IDs
  
  // Validation
  validationErrors: Record<string, string>; // field -> error message
  
  // Flow mode
  flowMode: 'full' | 'condensed'; // determines entry point
}

type ScreenName =
  // Entry path
  | 'project-selection'
  | 'project-selection-github-connected'
  // Local path
  | 'recent-projects'
  | 'recent-projects-empty'
  | 'recent-projects-loading'
  | 'project-already-added'
  // Clone path
  | 'clone-repository'
  | 'clone-repository-validation-error'
  | 'cloning-progress'
  | 'clone-error'
  | 'clone-error-destination-exists'
  // GitHub path
  | 'github-repo-picker'
  // Prepare path
  | 'project-loading'
  | 'scanning-for-agents'
  | 'select-agents'
  | 'not-a-git-repository'
  | 'no-agents-found';
```

### State Transitions

```
Entry Path:
  project-selection → (browse local) → project-loading
  project-selection → (GitHub URL) → github-repo-picker
  project-selection-github-connected → (clone) → clone-repository

Local Path:
  recent-projects → (select existing) → project-loading
  recent-projects → (open other) → project-selection
  recent-projects-empty → (browse) → project-selection
  recent-projects-loading → (loaded) → recent-projects
  project-already-added → (open dashboard) → COMPLETE
  project-already-added → (choose other) → project-selection

Clone Path:
  clone-repository → (valid) → cloning-progress
  clone-repository → (invalid) → clone-repository-validation-error
  clone-repository → (back) → project-selection
  cloning-progress → (success) → scanning-for-agents
  cloning-progress → (error) → clone-error
  clone-error → (retry) → clone-repository
  clone-error-destination-exists → (choose different) → clone-repository
  clone-error-destination-exists → (cancel) → project-selection

GitHub Path:
  github-repo-picker → (connect) → project-selection-github-connected
  github-repo-picker → (public URL) → clone-repository

Prepare Path:
  project-loading → (is git repo) → scanning-for-agents
  project-loading → (not git repo) → not-a-git-repository
  scanning-for-agents → (agents found) → select-agents
  scanning-for-agents → (no agents) → no-agents-found
  select-agents → (continue) → COMPLETE
  select-agents → (back) → scanning-for-agents
  not-a-git-repository → (continue anyway) → scanning-for-agents
  not-a-git-repository → (choose different) → project-selection
  no-agents-found → (add manually) → COMPLETE
  no-agents-found → (skip) → COMPLETE
```

### Hook API

```typescript
function useProjectSetupState(flowMode: 'full' | 'condensed' = 'full') {
  const [state, setState] = useState<ProjectSetupState>(getInitialState(flowMode));
  
  const navigate = useCallback((screen: ScreenName) => {
    setState(prev => ({ ...prev, currentScreen: screen }));
  }, []);
  
  const updateProject = useCallback((path: string) => {
    setState(prev => ({
      ...prev,
      projectPath: path,
      projectName: basename(path),
    }));
  }, []);
  
  const updateSelectedAgents = useCallback((agents: string[]) => {
    setState(prev => ({ ...prev, selectedAgents: agents }));
  }, []);
  
  const complete = useCallback(() => {
    // Save project to projects.json
    // Call onComplete callback
  }, []);
  
  return {
    ...state,
    navigate,
    updateProject,
    updateSelectedAgents,
    complete,
  };
}
```

## Component Structure

### Screen Component Pattern

```typescript
interface ScreenProps {
  // State
  projectPath: string | null;
  selectedAgents: string[];
  flowMode: 'full' | 'condensed';
  // ... other relevant state
  
  // Navigation
  navigate: (screen: ScreenName) => void;
  
  // Actions
  updateProject: (path: string) => void;
  updateSelectedAgents: (agents: string[]) => void;
  complete: () => void;
}
```

### Screen Descriptions

#### Entry Path (2 screens)

**1. ProjectSelectionScreen**
- Initial project selection — browse local folder or enter GitHub URL
- Shows "Add Existing Project" header, dropdown of recent projects, "Browse..." button
- Transitions: browse → `project-loading`, GitHub URL → `github-repo-picker`

**2. ProjectSelectionGitHubConnectedScreen**
- Project selection when GitHub is already connected
- Shows "✓ Connected as octocat" badge, pre-filled GitHub URL
- Transitions: clone → `clone-repository`

#### Local Path (4 screens)

**3. RecentProjectsScreen**
- List of recently opened projects with "Open" buttons
- Transitions: open → `project-loading`, open other → `project-selection`

**4. RecentProjectsEmptyScreen**
- Empty state when no recent projects exist
- Transitions: browse → `project-selection`, create new → `clone-repository`

**5. RecentProjectsLoadingScreen**
- Loading state with skeleton placeholders
- Transitions: loaded → `recent-projects` or `recent-projects-empty`

**6. ProjectAlreadyAddedScreen**
- Error state when trying to add a duplicate project
- Transitions: open dashboard → `complete()`, choose different → `project-selection`

#### Clone Path (5 screens)

**7. CloneRepositoryScreen**
- Form to clone a GitHub repository (URL, branch, destination)
- Transitions: valid → `cloning-progress`, invalid → `clone-repository-validation-error`

**8. CloneRepositoryValidationErrorScreen**
- Shows validation errors on clone form
- Transitions: fix and submit → `cloning-progress`

**9. CloningProgressScreen**
- Shows cloning progress with progress bar and file operations log
- Transitions: success → `scanning-for-agents`, error → `clone-error`

**10. CloneErrorScreen**
- Generic clone error with retry option
- Transitions: retry → `clone-repository`, cancel → `project-selection`
**11. CloneErrorDestinationExistsScreen**
- Error when destination folder already exists
- Transitions: choose different → `clone-repository`, cancel → `project-selection`

#### GitHub Path (1 screen)

**12. GitHubRepoPickerScreen**
- Connect GitHub and pick a repository
- Transitions: connect (authenticated) → `project-selection-github-connected`, public URL → `clone-repository`

#### Prepare Path (5 screens)

**13. ProjectLoadingScreen**
- Initial project loading/setup
- Transitions: is git repo → `scanning-for-agents`, not git repo → `not-a-git-repository`

**14. ScanningForAgentsScreen**
- UX transition showing scanning progress (not actual scanning)
- Transitions: after 1-2 seconds → `select-agents`

**15. SelectAgentsScreen**
- Select which globally-configured agents to use with this project
- Transitions: continue → `complete()`, back → `scanning-for-agents`

**16. NotAGitRepositoryScreen**
- Warning when project is not a git repo
- Transitions: continue anyway → `scanning-for-agents`, choose different → `project-selection`

**17. NoAgentsFoundScreen**
- Empty state when no agents are configured
- Transitions: add manually → open dialog, skip → `complete()`

## Data Model

### Project Entity

```typescript
interface Project {
  path: string;              // Absolute path to project folder
  name: string;              // Derived from path (basename)
  addedAt: string;           // ISO timestamp
  lastOpenedAt: string;      // ISO timestamp
  selectedAgents: string[];  // Agent IDs (from global agent config)
  githubUrl?: string;        // If cloned from GitHub
  isGitRepo: boolean;        // Whether it's a git repository
}
```

### projects.json Structure

```json
{
  "version": 1,
  "projects": [
    {
      "path": "/Users/you/projects/pi-dash",
      "name": "pi-dash",
      "addedAt": "2026-08-08T10:00:00Z",
      "lastOpenedAt": "2026-08-08T14:30:00Z",
      "selectedAgents": ["omp", "claude-code"],
      "githubUrl": "https://github.com/you/pi-dash",
      "isGitRepo": true
    }
  ]
}
```

**File location:** `{appData}/projects.json` where `appData = app.getPath('userData')` (Electron's user data directory).
### Operations

- `getProjects(): Project[]` — Read all projects
- `addProject(project: Project): void` — Add new project
- `updateProject(path: string, updates: Partial<Project>): void` — Update project
- `removeProject(path: string): void` — Remove project
- `getRecentProjects(limit?: number): Project[]` — Get projects sorted by lastOpenedAt

### Implementation Details

**Folder picker:** Uses Electron's `dialog.showOpenDialog({ properties: ['openDirectory'] })` from the main process, invoked via IPC.

**Clone progress streaming:** The `cloneRepository` IPC handler sends progress updates via `webContents.send('clone-progress', progress)` events. The renderer listens for these events to update the progress bar.

```typescript
// Main process
ipcMain.handle('clone-repository', async (event, url, dest, branch) => {
  const result = await cloneRepository(url, dest, branch, (progress) => {
    event.sender.send('clone-progress', progress);
  });
  return result;
});

// Renderer
useEffect(() => {
  const unsubscribe = window.api.onCloneProgress((progress) => {
    setState(prev => ({ ...prev, cloneProgress: progress }));
  });
  return unsubscribe;
}, []);
```

**`project-loading` screen behavior:** This screen checks if the selected path is a git repository by calling `window.api.isGitRepo(path)`. The progress bar is a UX animation (not tied to actual operations). After the check completes (or after 2 seconds, whichever is first), it transitions to `scanning-for-agents` or `not-a-git-repository`.

**`scanning-for-agents` timing:** Fixed 1.5-second timeout (not based on actual scanning). This is a UX transition to show the user something is happening before displaying the agent selection screen.

**`no-agents-found` "Add Manually" action:** Opens the `ManualAddScreen` component from the onboarding flow in a modal dialog. This reuses the existing manual agent add UI.

**`lastOpenedAt` update:** Updated every time the dashboard loads a project (via `updateProject(path, { lastOpenedAt: new Date().toISOString() })`).

**`removeProject` UI:** Accessible via a context menu on the Recent Projects screen (right-click → "Remove Project"). Also available in Dashboard project settings.

**`projects.json` corruption handling:** If the file is malformed or unreadable, the app logs an error and treats it as empty (no projects). The file is recreated on the next `addProject` call.

**`complete()` implementation:**
```typescript
const complete = useCallback(async () => {
  try {
    await window.api.addProject({
      path: state.projectPath!,
      name: state.projectName!,
      addedAt: new Date().toISOString(),
      lastOpenedAt: new Date().toISOString(),
      selectedAgents: state.selectedAgents,
      githubUrl: state.githubRepoUrl || undefined,
      isGitRepo: await window.api.isGitRepo(state.projectPath!),
    });
    onComplete?.();
  } catch (error) {
    if (error.message === 'PROJECT_ALREADY_EXISTS') {
      navigate('project-already-added');
    } else {
      // Show generic error toast
    }
  }
}, [state, onComplete, navigate]);
```

**`project-already-added` trigger:** This screen is shown when `addProject` throws `PROJECT_ALREADY_EXISTS`. This can happen during `complete()` or when the user tries to add a project that's already in the list.

**`recent-projects-loading` trigger:** This screen shows when the Recent Projects screen mounts and is fetching the project list from `projects.json`. It displays for a minimum of 300ms to avoid flicker, then transitions to `recent-projects` or `recent-projects-empty`.

**`clone-error-destination-exists` cancel transition:** Cancel → `project-selection` (same as other clone error screens).

**GitHub OAuth flow:** Reuses the existing GitHub OAuth integration from the app. The "Connect to GitHub" button triggers the same OAuth flow used elsewhere in the app. After successful connection, the user's GitHub repos are available for selection.

**`select-agents` with 0 globally configured agents:** If onboarding found 0 agents, the flow skips `select-agents` and goes directly to `no-agents-found` from `scanning-for-agents`.

**Shared UI components:** Reuses existing components from onboarding where possible:
- `Spinner` — from `components/onboarding/ScanningScreen.tsx`
- `ProgressBar` — from `components/onboarding/ScanningScreen.tsx`
- `Button` — from `components/ui/button.tsx` (shadcn)
- New components: `BackButton`, `AgentListRow` (specific to this flow)

**Keyboard navigation:** All interactive elements are focusable via Tab. Enter/Space activates buttons. Escape cancels the flow (returns to dashboard). Focus is managed to stay within the flow modal when in condensed mode.

**Design file node IDs:** Screens map to design nodes in `design/pidash-ui.pen` (node `UsyjJ`):
- `ProjectSelectionScreen` → `qPcKV`
- `RecentProjectsScreen` → `YFOTv`
- `RecentProjectsEmptyScreen` → `Aftg7`
- `CloneRepositoryScreen` → `w0Sri`
- `CloningProgressScreen` → `a3Qb7`
- `CloneErrorScreen` → `U6Gjh`
- `CloneErrorDestinationExistsScreen` → `LUKvY`
- `ProjectLoadingScreen` → `x3kDM`
- `NotAGitRepositoryScreen` → `rgOjb`
- `NoAgentsFoundScreen` → `BQRXs`
- `ScanningForAgentsScreen` → `jmnlI` (added)
- `SelectAgentsScreen` → `MR3Rx` (added)
- `ProjectAlreadyAddedScreen` → `oUyJu` (added)
- `RecentProjectsLoadingScreen` → `SWmfN` (added)
- `CloneRepositoryValidationErrorScreen` → `Q6xwR` (added)

## Integration Points

### 1. OnboardingFlow Integration

```typescript
// App.tsx
function App() {
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean | null>(null);
  const [projectSetupCompleted, setProjectSetupCompleted] = useState<boolean | null>(null);

  useEffect(() => {
    window.api.getOnboardingStatus().then(setOnboardingCompleted);
    window.api.getProjects().then(projects => {
      setProjectSetupCompleted(projects.length > 0);
    });
  }, []);

  if (!onboardingCompleted) {
    return <OnboardingFlow onComplete={() => setOnboardingCompleted(true)} />;
  }

  if (!projectSetupCompleted) {
    return <ProjectSetupFlow flowMode="full" onComplete={() => setProjectSetupCompleted(true)} />;
  }

  return <Dashboard />;
}
```

### 2. Agent Scanning Integration

The "Scanning for Agents" screen reuses globally configured agents from onboarding. No project-specific scanning needed.

```typescript
// In SelectAgentsScreen
const { agents } = useAgents(); // Globally configured agents from onboarding
```

### 3. IPC Handlers

```typescript
// src/main/project-manager.ts
interface ProjectManager {
  getProjects(): Promise<Project[]>;
  addProject(project: Project): Promise<void>;
  updateProject(path: string, updates: Partial<Project>): Promise<void>;
  removeProject(path: string): Promise<void>;
  getRecentProjects(limit?: number): Promise<Project[]>;
  isGitRepo(path: string): Promise<boolean>;
  cloneRepository(url: string, dest: string, branch?: string): Promise<CloneResult>;
}

// src/preload.ts
contextBridge.exposeInMainWorld('api', {
  getProjects: () => ipcRenderer.invoke('get-projects'),
  addProject: (project: Project) => ipcRenderer.invoke('add-project', project),
  updateProject: (path: string, updates: Partial<Project>) => 
    ipcRenderer.invoke('update-project', path, updates),
  removeProject: (path: string) => ipcRenderer.invoke('remove-project', path),
  getRecentProjects: (limit?: number) => 
    ipcRenderer.invoke('get-recent-projects', limit),
  isGitRepo: (path: string) => ipcRenderer.invoke('is-git-repo', path),
  cloneRepository: (url: string, dest: string, branch?: string) => 
    ipcRenderer.invoke('clone-repository', url, dest, branch),
});
```

### 4. Dashboard Integration

```typescript
// In Dashboard
const [showProjectSetup, setShowProjectSetup] = useState(false);

<Button onClick={() => setShowProjectSetup(true)}>Add Project</Button>

{showProjectSetup && (
  <ProjectSetupFlow 
    flowMode="condensed" 
    onComplete={() => setShowProjectSetup(false)} 
  />
)}
```

## Full Flow vs Condensed Version

### Full Flow (First-Run)

- **Trigger:** OnboardingFlow completes and no projects exist
- **Starting screen:** `project-selection`
- **All 17 screens accessible**
- **Educational copy and loading states shown**

### Condensed Flow (Manual Add)

- **Trigger:** User clicks "Add Project" in Dashboard
- **Starting screen:** `project-selection` (skips Recent Projects list)
- **Shorter copy and faster transitions**
- **Same components, different `flowMode` prop**

### Conditional Rendering

```typescript
export function ProjectSelectionScreen({ flowMode, navigate }: ScreenProps) {
  return (
    <div>
      <h1>Add Existing Project</h1>
      
      {flowMode === 'full' && (
        <p>Select a local project folder to get started</p>
      )}
      
      {flowMode === 'condensed' && (
        <p>Select a project folder</p>
      )}
      
      {/* Rest of UI */}
    </div>
  );
}
```

## Error Handling

### Validation Errors (Client-Side)

```typescript
function validateCloneForm(url: string, branch: string, dest: string): ValidationErrors {
  const errors: ValidationErrors = {};
  
  if (!url) {
    errors.repoUrl = 'Repository URL is required';
  } else if (!isValidGitHubUrl(url)) {
    errors.repoUrl = 'Please enter a valid repository URL';
  }
  
  if (branch && !/^[a-zA-Z0-9\-_/]+$/.test(branch)) {
    errors.branch = 'Invalid branch name';
  }
  
  if (!dest || !path.isAbsolute(dest)) {
    errors.destination = 'Destination must be an absolute path';
  }
  
  return errors;
}
```

### Clone Errors (Main Process)

```typescript
type CloneError =
  | { type: 'repository-not-found'; message: string }
  | { type: 'authentication-required'; message: string }
  | { type: 'destination-exists'; path: string }
  | { type: 'network-error'; message: string }
  | { type: 'permission-denied'; path: string }
  | { type: 'unknown'; message: string };
```

### Error-to-Screen Mapping

| Error Type | Screen | User Action |
|---|---|---|
| Validation error | `clone-repository-validation-error` | Fix form and retry |
| Repository not found | `clone-error` | Check URL and retry |
| Authentication required | `github-repo-picker` | Connect GitHub account |
| Destination exists | `clone-error-destination-exists` | Choose different location |
| Network error | `clone-error` | Check connection and retry |
| Permission denied | `clone-error` | Choose different destination |
| Project already exists | `project-already-added` | Open in dashboard or choose other |
| Not a git repo | `not-a-git-repository` | Continue anyway or choose different |
| No agents configured | `no-agents-found` | Add manually or skip |

## Testing Strategy

### 1. State Machine Tests

Test all screen transitions and state updates.

### 2. Screen Component Tests

Test each screen renders correctly and handles user actions.

### 3. Integration Tests

Test full user journeys (happy path + error scenarios).

### 4. IPC Handler Tests

Test CRUD operations and error cases.

### Coverage Goals

- **State machine:** 100% coverage
- **Screen components:** 90% coverage
- **Integration tests:** Happy path + 2-3 error scenarios
- **IPC handlers:** 100% coverage

## Acceptance Criteria

- [ ] OnboardingFlow completes → ProjectSetupFlow runs if no projects exist
- [ ] Full flow shows all 17 screens with educational copy
- [ ] Condensed flow starts at project selection with minimal copy
- [ ] Project selection works for local folders and GitHub URLs
- [ ] Clone operation shows progress and handles errors
- [ ] Agent selection uses globally configured agents
- [ ] Project saved to `projects.json` on completion
- [ ] Duplicate project detection shows error screen
- [ ] All error states have clear recovery paths
- [ ] Dashboard "Add Project" button triggers condensed flow
- [ ] All screens are responsive and accessible
- [ ] Test coverage meets goals

## Future Enhancements

- Project settings overrides (per-project agent configuration)
- Project templates (pre-configured project setups)
- Recent projects limit configuration
- Project search/filter in Recent Projects screen
- Worktree management integration
