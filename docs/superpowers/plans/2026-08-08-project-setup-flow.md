# Project Setup Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a guided project setup flow that runs after onboarding to help users add their first project and select agents.

**Architecture:** Monolithic state machine with 17 screen components, separate `projects.json` persistence, IPC handlers for project CRUD and git operations, integrates sequentially after OnboardingFlow.

**Tech Stack:** React, TypeScript, Electron IPC, simple-json (for projects.json), simple-git (for clone operations)

## Global Constraints

- Package manager: **pnpm**
- Logging: Use `electron-log` via `import log from './logger'` (main) or `import { log } from '@/lib/logger'` (renderer). Never use `console.log`.
- Follow existing onboarding flow patterns for consistency
- All screens must be keyboard accessible (Tab/Enter/Space/Escape)
- Design file reference: `design/pidash-ui.pen` node `UsyjJ`

---

## File Structure

```
renderer/src/
├── types/
│   └── project-setup.ts (NEW: ScreenName, ProjectSetupState, Project types)
├── hooks/
│   └── useProjectSetupState.ts (NEW: state machine hook)
├── components/
│   └── project-setup/
│       ├── ProjectSetupFlow.tsx (NEW: main orchestrator)
│       ├── screens/
│       │   ├── ProjectSelectionScreen.tsx (NEW)
│       │   ├── ProjectSelectionGitHubConnectedScreen.tsx (NEW)
│       │   ├── RecentProjectsScreen.tsx (NEW)
│       │   ├── RecentProjectsEmptyScreen.tsx (NEW)
│       │   ├── RecentProjectsLoadingScreen.tsx (NEW)
│       │   ├── ProjectAlreadyAddedScreen.tsx (NEW)
│       │   ├── CloneRepositoryScreen.tsx (NEW)
│       │   ├── CloneRepositoryValidationErrorScreen.tsx (NEW)
│       │   ├── CloningProgressScreen.tsx (NEW)
│       │   ├── CloneErrorScreen.tsx (NEW)
│       │   ├── CloneErrorDestinationExistsScreen.tsx (NEW)
│       │   ├── GitHubRepoPickerScreen.tsx (NEW)
│       │   ├── ProjectLoadingScreen.tsx (NEW)
│       │   ├── ScanningForAgentsScreen.tsx (NEW)
│       │   ├── SelectAgentsScreen.tsx (NEW)
│       │   ├── NotAGitRepositoryScreen.tsx (NEW)
│       │   └── NoAgentsFoundScreen.tsx (NEW)
│       └── __tests__/
│           └── ProjectSetupFlow.test.tsx (NEW)
├── App.tsx (MODIFY: add ProjectSetupFlow routing)
└── components/dashboard/Dashboard.tsx (MODIFY: add "Add Project" button)

src/main/
├── project-manager.ts (NEW: project CRUD operations)
├── git-operations.ts (NEW: clone, isGitRepo)
├── ipc-handlers.ts (MODIFY: register project IPC handlers)
└── preload.ts (MODIFY: expose project API to renderer)
```

---

### Task 1: Define Types and Interfaces

**Files:**
- Create: `renderer/src/types/project-setup.ts`
- Test: `renderer/src/types/__tests__/project-setup.test.ts`

**Interfaces:**
- Produces: `ScreenName`, `ProjectSetupState`, `Project`, `CloneError`, `ValidationErrors` types used by all subsequent tasks

- [ ] **Step 1: Write the failing test**

```typescript
// renderer/src/types/__tests__/project-setup.test.ts
import { describe, it, expect } from 'vitest';
import type { ScreenName, ProjectSetupState, Project } from '../project-setup';

describe('Project Setup Types', () => {
  it('defines all 17 screen names', () => {
    const screens: ScreenName[] = [
      'project-selection',
      'project-selection-github-connected',
      'recent-projects',
      'recent-projects-empty',
      'recent-projects-loading',
      'project-already-added',
      'clone-repository',
      'clone-repository-validation-error',
      'cloning-progress',
      'clone-error',
      'clone-error-destination-exists',
      'github-repo-picker',
      'project-loading',
      'scanning-for-agents',
      'select-agents',
      'not-a-git-repository',
      'no-agents-found',
    ];
    expect(screens).toHaveLength(17);
  });

  it('defines Project interface', () => {
    const project: Project = {
      path: '/test/project',
      name: 'project',
      addedAt: '2026-08-08T10:00:00Z',
      lastOpenedAt: '2026-08-08T14:30:00Z',
      selectedAgents: ['omp', 'claude-code'],
      isGitRepo: true,
    };
    expect(project.path).toBe('/test/project');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test renderer/src/types/__tests__/project-setup.test.ts`
Expected: FAIL with "Cannot find module"

- [ ] **Step 3: Write type definitions**

```typescript
// renderer/src/types/project-setup.ts
export type ScreenName =
  | 'project-selection'
  | 'project-selection-github-connected'
  | 'recent-projects'
  | 'recent-projects-empty'
  | 'recent-projects-loading'
  | 'project-already-added'
  | 'clone-repository'
  | 'clone-repository-validation-error'
  | 'cloning-progress'
  | 'clone-error'
  | 'clone-error-destination-exists'
  | 'github-repo-picker'
  | 'project-loading'
  | 'scanning-for-agents'
  | 'select-agents'
  | 'not-a-git-repository'
  | 'no-agents-found';

export interface Project {
  path: string;
  name: string;
  addedAt: string;
  lastOpenedAt: string;
  selectedAgents: string[];
  githubUrl?: string;
  isGitRepo: boolean;
}

export interface ProjectSetupState {
  currentScreen: ScreenName;
  projectPath: string | null;
  projectName: string | null;
  githubConnected: boolean;
  githubUser: string | null;
  githubRepoUrl: string | null;
  cloneStatus: 'idle' | 'cloning' | 'success' | 'error';
  cloneProgress: number;
  cloneError: string | null;
  cloneDestinationExists: boolean;
  selectedAgents: string[];
  validationErrors: Record<string, string>;
  flowMode: 'full' | 'condensed';
}

export type CloneError =
  | { type: 'repository-not-found'; message: string }
  | { type: 'authentication-required'; message: string }
  | { type: 'destination-exists'; path: string }
  | { type: 'network-error'; message: string }
  | { type: 'permission-denied'; path: string }
  | { type: 'unknown'; message: string };

export interface ValidationErrors {
  repoUrl?: string;
  branch?: string;
  destination?: string;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test renderer/src/types/__tests__/project-setup.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add renderer/src/types/project-setup.ts renderer/src/types/__tests__/project-setup.test.ts
git commit -m "feat: add project setup flow types"
```

---

### Task 2: Implement Project Manager (Main Process)

**Files:**
- Create: `src/main/project-manager.ts`
- Test: `src/main/__tests__/project-manager.test.ts`

**Interfaces:**
- Consumes: `Project` type from `renderer/src/types/project-setup.ts`
- Produces: `getProjects()`, `addProject()`, `updateProject()`, `removeProject()`, `getRecentProjects()` functions

- [ ] **Step 1: Write the failing test**

```typescript
// src/main/__tests__/project-manager.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getProjects, addProject, updateProject, removeProject, getRecentProjects } from '../project-manager';
import type { Project } from '../../renderer/src/types/project-setup';
import fs from 'fs';
import path from 'path';

const TEST_PROJECTS_FILE = path.join(__dirname, 'test-projects.json');

describe('Project Manager', () => {
  beforeEach(() => {
    if (fs.existsSync(TEST_PROJECTS_FILE)) {
      fs.unlinkSync(TEST_PROJECTS_FILE);
    }
  });

  afterEach(() => {
    if (fs.existsSync(TEST_PROJECTS_FILE)) {
      fs.unlinkSync(TEST_PROJECTS_FILE);
    }
  });

  it('returns empty array when no projects exist', async () => {
    const projects = await getProjects(TEST_PROJECTS_FILE);
    expect(projects).toEqual([]);
  });

  it('adds a project', async () => {
    const project: Project = {
      path: '/test/project',
      name: 'project',
      addedAt: '2026-08-08T10:00:00Z',
      lastOpenedAt: '2026-08-08T10:00:00Z',
      selectedAgents: ['omp'],
      isGitRepo: true,
    };

    await addProject(project, TEST_PROJECTS_FILE);
    const projects = await getProjects(TEST_PROJECTS_FILE);
    
    expect(projects).toHaveLength(1);
    expect(projects[0].path).toBe('/test/project');
  });

  it('prevents duplicate projects', async () => {
    const project: Project = {
      path: '/test/project',
      name: 'project',
      addedAt: '2026-08-08T10:00:00Z',
      lastOpenedAt: '2026-08-08T10:00:00Z',
      selectedAgents: ['omp'],
      isGitRepo: true,
    };

    await addProject(project, TEST_PROJECTS_FILE);
    
    await expect(addProject(project, TEST_PROJECTS_FILE)).rejects.toThrow('PROJECT_ALREADY_EXISTS');
  });

  it('updates a project', async () => {
    const project: Project = {
      path: '/test/project',
      name: 'project',
      addedAt: '2026-08-08T10:00:00Z',
      lastOpenedAt: '2026-08-08T10:00:00Z',
      selectedAgents: ['omp'],
      isGitRepo: true,
    };

    await addProject(project, TEST_PROJECTS_FILE);
    await updateProject('/test/project', { lastOpenedAt: '2026-08-08T14:30:00Z' }, TEST_PROJECTS_FILE);
    
    const projects = await getProjects(TEST_PROJECTS_FILE);
    expect(projects[0].lastOpenedAt).toBe('2026-08-08T14:30:00Z');
  });

  it('removes a project', async () => {
    const project: Project = {
      path: '/test/project',
      name: 'project',
      addedAt: '2026-08-08T10:00:00Z',
      lastOpenedAt: '2026-08-08T10:00:00Z',
      selectedAgents: ['omp'],
      isGitRepo: true,
    };

    await addProject(project, TEST_PROJECTS_FILE);
    await removeProject('/test/project', TEST_PROJECTS_FILE);
    
    const projects = await getProjects(TEST_PROJECTS_FILE);
    expect(projects).toHaveLength(0);
  });

  it('returns recent projects sorted by lastOpenedAt', async () => {
    const project1: Project = {
      path: '/test/project1',
      name: 'project1',
      addedAt: '2026-08-07T10:00:00Z',
      lastOpenedAt: '2026-08-07T10:00:00Z',
      selectedAgents: ['omp'],
      isGitRepo: true,
    };

    const project2: Project = {
      path: '/test/project2',
      name: 'project2',
      addedAt: '2026-08-08T10:00:00Z',
      lastOpenedAt: '2026-08-08T14:30:00Z',
      selectedAgents: ['claude-code'],
      isGitRepo: false,
    };

    await addProject(project1, TEST_PROJECTS_FILE);
    await addProject(project2, TEST_PROJECTS_FILE);
    
    const recent = await getRecentProjects(10, TEST_PROJECTS_FILE);
    expect(recent[0].path).toBe('/test/project2');
    expect(recent[1].path).toBe('/test/project1');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/main/__tests__/project-manager.test.ts`
Expected: FAIL with "Cannot find module"

- [ ] **Step 3: Implement project manager**

```typescript
// src/main/project-manager.ts
import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import log from './logger';
import type { Project } from '../../renderer/src/types/project-setup';

const DEFAULT_PROJECTS_FILE = path.join(app.getPath('userData'), 'projects.json');

interface ProjectsFile {
  version: number;
  projects: Project[];
}

async function readProjectsFile(filePath: string = DEFAULT_PROJECTS_FILE): Promise<ProjectsFile> {
  try {
    if (!fs.existsSync(filePath)) {
      return { version: 1, projects: [] };
    }
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    log.error('project-manager', 'Failed to read projects.json', error);
    return { version: 1, projects: [] };
  }
}

async function writeProjectsFile(data: ProjectsFile, filePath: string = DEFAULT_PROJECTS_FILE): Promise<void> {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

export async function getProjects(filePath: string = DEFAULT_PROJECTS_FILE): Promise<Project[]> {
  const data = await readProjectsFile(filePath);
  return data.projects;
}

export async function addProject(project: Project, filePath: string = DEFAULT_PROJECTS_FILE): Promise<void> {
  const data = await readProjectsFile(filePath);
  
  if (data.projects.some(p => p.path === project.path)) {
    throw new Error('PROJECT_ALREADY_EXISTS');
  }
  
  data.projects.push(project);
  await writeProjectsFile(data, filePath);
}

export async function updateProject(
  path: string, 
  updates: Partial<Project>, 
  filePath: string = DEFAULT_PROJECTS_FILE
): Promise<void> {
  const data = await readProjectsFile(filePath);
  const index = data.projects.findIndex(p => p.path === path);
  
  if (index === -1) {
    throw new Error('PROJECT_NOT_FOUND');
  }
  
  data.projects[index] = { ...data.projects[index], ...updates };
  await writeProjectsFile(data, filePath);
}

export async function removeProject(path: string, filePath: string = DEFAULT_PROJECTS_FILE): Promise<void> {
  const data = await readProjectsFile(filePath);
  data.projects = data.projects.filter(p => p.path !== path);
  await writeProjectsFile(data, filePath);
}

export async function getRecentProjects(
  limit: number = 10, 
  filePath: string = DEFAULT_PROJECTS_FILE
): Promise<Project[]> {
  const projects = await getProjects(filePath);
  return projects
    .sort((a, b) => new Date(b.lastOpenedAt).getTime() - new Date(a.lastOpenedAt).getTime())
    .slice(0, limit);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test src/main/__tests__/project-manager.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/main/project-manager.ts src/main/__tests__/project-manager.test.ts
git commit -m "feat: add project manager for CRUD operations"
```

---

### Task 3: Implement Git Operations

**Files:**
- Create: `src/main/git-operations.ts`
- Test: `src/main/__tests__/git-operations.test.ts`

**Interfaces:**
- Consumes: `CloneError` type from `renderer/src/types/project-setup.ts`
- Produces: `isGitRepo()`, `cloneRepository()` functions

- [ ] **Step 1: Write the failing test**

```typescript
// src/main/__tests__/git-operations.test.ts
import { describe, it, expect } from 'vitest';
import { isGitRepo } from '../git-operations';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('Git Operations', () => {
  it('returns true for git repository', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'git-test-'));
    const gitDir = path.join(tempDir, '.git');
    fs.mkdirSync(gitDir);
    
    const result = await isGitRepo(tempDir);
    expect(result).toBe(true);
    
    fs.rmSync(tempDir, { recursive: true });
  });

  it('returns false for non-git directory', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'git-test-'));
    
    const result = await isGitRepo(tempDir);
    expect(result).toBe(false);
    
    fs.rmSync(tempDir, { recursive: true });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/main/__tests__/git-operations.test.ts`
Expected: FAIL with "Cannot find module"

- [ ] **Step 3: Implement git operations**

```typescript
// src/main/git-operations.ts
import fs from 'fs';
import path from 'path';
import simpleGit from 'simple-git';
import log from './logger';
import type { CloneError } from '../../renderer/src/types/project-setup';

export async function isGitRepo(repoPath: string): Promise<boolean> {
  try {
    const gitDir = path.join(repoPath, '.git');
    return fs.existsSync(gitDir);
  } catch (error) {
    log.error('git-operations', 'Failed to check git repo', error);
    return false;
  }
}

export async function cloneRepository(
  url: string,
  dest: string,
  branch: string = 'main',
  onProgress?: (progress: number) => void
): Promise<{ success: boolean; error?: CloneError }> {
  try {
    if (fs.existsSync(dest)) {
      return {
        success: false,
        error: { type: 'destination-exists', path: dest }
      };
    }

    const git = simpleGit();
    
    await git.clone(url, dest, {
      '--branch': branch,
      '--progress': true,
    });

    onProgress?.(100);
    return { success: true };
  } catch (error) {
    log.error('git-operations', 'Clone failed', error);
    
    const message = error instanceof Error ? error.message : String(error);
    
    if (message.includes('not found') || message.includes('404')) {
      return { success: false, error: { type: 'repository-not-found', message } };
    }
    
    if (message.includes('authentication') || message.includes('401')) {
      return { success: false, error: { type: 'authentication-required', message } };
    }
    
    if (message.includes('EACCES') || message.includes('permission')) {
      return { success: false, error: { type: 'permission-denied', path: dest } };
    }
    
    return { success: false, error: { type: 'unknown', message } };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test src/main/__tests__/git-operations.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/main/git-operations.ts src/main/__tests__/git-operations.test.ts
git commit -m "feat: add git operations for clone and repo detection"
```

---

### Task 4: Register IPC Handlers

**Files:**
- Modify: `src/main/ipc-handlers.ts`
- Modify: `src/preload.ts`

**Interfaces:**
- Consumes: `project-manager.ts`, `git-operations.ts`
- Produces: IPC channels for renderer to call

- [ ] **Step 1: Add IPC handlers to main process**

```typescript
// src/main/ipc-handlers.ts (add to existing file)
import { getProjects, addProject, updateProject, removeProject, getRecentProjects } from './project-manager';
import { isGitRepo, cloneRepository } from './git-operations';

export function registerProjectHandlers(): void {
  ipcMain.handle('get-projects', async () => {
    return await getProjects();
  });

  ipcMain.handle('add-project', async (event, project) => {
    return await addProject(project);
  });

  ipcMain.handle('update-project', async (event, path, updates) => {
    return await updateProject(path, updates);
  });

  ipcMain.handle('remove-project', async (event, path) => {
    return await removeProject(path);
  });

  ipcMain.handle('get-recent-projects', async (event, limit) => {
    return await getRecentProjects(limit);
  });

  ipcMain.handle('is-git-repo', async (event, path) => {
    return await isGitRepo(path);
  });

  ipcMain.handle('clone-repository', async (event, url, dest, branch) => {
    const result = await cloneRepository(url, dest, branch, (progress) => {
      event.sender.send('clone-progress', progress);
    });
    return result;
  });
}
```

- [ ] **Step 2: Expose API in preload**

```typescript
// src/preload.ts (add to existing contextBridge.exposeInMainWorld call)
getProjects: () => ipcRenderer.invoke('get-projects'),
addProject: (project) => ipcRenderer.invoke('add-project', project),
updateProject: (path, updates) => ipcRenderer.invoke('update-project', path, updates),
removeProject: (path) => ipcRenderer.invoke('remove-project', path),
getRecentProjects: (limit) => ipcRenderer.invoke('get-recent-projects', limit),
isGitRepo: (path) => ipcRenderer.invoke('is-git-repo', path),
cloneRepository: (url, dest, branch) => ipcRenderer.invoke('clone-repository', url, dest, branch),
onCloneProgress: (callback) => {
  const subscription = (event, progress) => callback(progress);
  ipcRenderer.on('clone-progress', subscription);
  return () => ipcRenderer.removeListener('clone-progress', subscription);
},
```

- [ ] **Step 3: Update TypeScript declarations**

```typescript
// renderer/src/types/global.d.ts (add to existing Window interface)
getProjects(): Promise<Project[]>;
addProject(project: Project): Promise<void>;
updateProject(path: string, updates: Partial<Project>): Promise<void>;
removeProject(path: string): Promise<void>;
getRecentProjects(limit?: number): Promise<Project[]>;
isGitRepo(path: string): Promise<boolean>;
cloneRepository(url: string, dest: string, branch?: string): Promise<{ success: boolean; error?: CloneError }>;
onCloneProgress(callback: (progress: number) => void): () => void;
```

- [ ] **Step 4: Commit**

```bash
git add src/main/ipc-handlers.ts src/preload.ts renderer/src/types/global.d.ts
git commit -m "feat: register project setup IPC handlers"
```

---

### Task 5: Implement State Machine Hook

**Files:**
- Create: `renderer/src/hooks/useProjectSetupState.ts`
- Test: `renderer/src/hooks/__tests__/useProjectSetupState.test.ts`

**Interfaces:**
- Consumes: `ScreenName`, `ProjectSetupState` types
- Produces: `useProjectSetupState()` hook with state and navigation functions

- [ ] **Step 1: Write the failing test**

```typescript
// renderer/src/hooks/__tests__/useProjectSetupState.test.ts
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useProjectSetupState } from '../useProjectSetupState';

describe('useProjectSetupState', () => {
  it('starts at project-selection in full mode', () => {
    const { result } = renderHook(() => useProjectSetupState('full'));
    expect(result.current.currentScreen).toBe('project-selection');
    expect(result.current.flowMode).toBe('full');
  });

  it('starts at project-selection in condensed mode', () => {
    const { result } = renderHook(() => useProjectSetupState('condensed'));
    expect(result.current.currentScreen).toBe('project-selection');
    expect(result.current.flowMode).toBe('condensed');
  });

  it('navigates to next screen', () => {
    const { result } = renderHook(() => useProjectSetupState('full'));
    
    act(() => {
      result.current.navigate('clone-repository');
    });
    
    expect(result.current.currentScreen).toBe('clone-repository');
  });

  it('updates project path', () => {
    const { result } = renderHook(() => useProjectSetupState('full'));
    
    act(() => {
      result.current.updateProject('/path/to/project');
    });
    
    expect(result.current.projectPath).toBe('/path/to/project');
    expect(result.current.projectName).toBe('project');
  });

  it('updates selected agents', () => {
    const { result } = renderHook(() => useProjectSetupState('full'));
    
    act(() => {
      result.current.updateSelectedAgents(['omp', 'claude-code']);
    });
    
    expect(result.current.selectedAgents).toEqual(['omp', 'claude-code']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test renderer/src/hooks/__tests__/useProjectSetupState.test.ts`
Expected: FAIL with "Cannot find module"

- [ ] **Step 3: Implement state machine hook**

```typescript
// renderer/src/hooks/useProjectSetupState.ts
import { useState, useCallback } from 'react';
import path from 'path';
import type { ScreenName, ProjectSetupState } from '../types/project-setup';

function getInitialState(flowMode: 'full' | 'condensed'): ProjectSetupState {
  return {
    currentScreen: 'project-selection',
    flowMode,
    projectPath: null,
    projectName: null,
    githubConnected: false,
    githubUser: null,
    githubRepoUrl: null,
    cloneStatus: 'idle',
    cloneProgress: 0,
    cloneError: null,
    cloneDestinationExists: false,
    selectedAgents: [],
    validationErrors: {},
  };
}

export function useProjectSetupState(flowMode: 'full' | 'condensed' = 'full') {
  const [state, setState] = useState<ProjectSetupState>(() => getInitialState(flowMode));

  const navigate = useCallback((screen: ScreenName) => {
    setState(prev => ({ ...prev, currentScreen: screen }));
  }, []);

  const updateProject = useCallback((projectPath: string) => {
    setState(prev => ({
      ...prev,
      projectPath,
      projectName: path.basename(projectPath),
    }));
  }, []);

  const updateSelectedAgents = useCallback((agents: string[]) => {
    setState(prev => ({ ...prev, selectedAgents: agents }));
  });

  const complete = useCallback(async (onComplete?: () => void) => {
    try {
      await window.api.addProject({
        path: state.projectPath!,
        name: state.projectName!,
        addedAt: new Date().toISOString(),
        lastOpenedAt: new Date().toISOString(),
        selectedAgents: state.selectedAgents,
        githubUrl: state.githubRepoUrl || undefined,
        isGitRepo: state.projectPath ? await window.api.isGitRepo(state.projectPath) : false,
      });
      onComplete?.();
    } catch (error) {
      if (error instanceof Error && error.message === 'PROJECT_ALREADY_EXISTS') {
        navigate('project-already-added');
      }
    }
  }, [state, navigate]);

  return {
    ...state,
    navigate,
    updateProject,
    updateSelectedAgents,
    complete,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test renderer/src/hooks/__tests__/useProjectSetupState.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add renderer/src/hooks/useProjectSetupState.ts renderer/src/hooks/__tests__/useProjectSetupState.test.ts
git commit -m "feat: add project setup state machine hook"
```

---

### Task 6: Build Screen Components (Entry + Local Paths)

**Files:**
- Create: `renderer/src/components/project-setup/screens/ProjectSelectionScreen.tsx`
- Create: `renderer/src/components/project-setup/screens/ProjectSelectionGitHubConnectedScreen.tsx`
- Create: `renderer/src/components/project-setup/screens/RecentProjectsScreen.tsx`
- Create: `renderer/src/components/project-setup/screens/RecentProjectsEmptyScreen.tsx`
- Create: `renderer/src/components/project-setup/screens/RecentProjectsLoadingScreen.tsx`
- Create: `renderer/src/components/project-setup/screens/ProjectAlreadyAddedScreen.tsx`

**Interfaces:**
- Consumes: `ScreenProps` pattern with state + navigation
- Produces: 6 screen components

- [ ] **Step 1: Create ProjectSelectionScreen**

```typescript
// renderer/src/components/project-setup/screens/ProjectSelectionScreen.tsx
import { useState } from 'react';
import type { ScreenName } from '../../../types/project-setup';

interface ScreenProps {
  flowMode: 'full' | 'condensed';
  navigate: (screen: ScreenName) => void;
  updateProject: (path: string) => void;
}

export function ProjectSelectionScreen({ flowMode, navigate, updateProject }: ScreenProps) {
  const [githubUrl, setGithubUrl] = useState('');

  const handleBrowse = async () => {
    const result = await window.api.showOpenDialog({
      properties: ['openDirectory'],
    });
    if (!result.canceled && result.filePaths.length > 0) {
      updateProject(result.filePaths[0]);
      navigate('project-loading');
    }
  };

  const handleGitHubSubmit = () => {
    if (githubUrl) {
      navigate('github-repo-picker');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-background">
      <div className="w-[560px] space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold">Add Existing Project</h1>
          <p className="text-secondary-foreground">
            {flowMode === 'full' 
              ? 'Select a local project folder to get started'
              : 'Select a project folder'}
          </p>
        </div>

        <button
          onClick={handleBrowse}
          className="w-full h-12 bg-primary text-primary-foreground rounded-lg font-medium"
        >
          Browse...
        </button>

        <div className="space-y-2">
          <p className="text-sm text-muted-foreground text-center">or create from</p>
          <input
            type="text"
            placeholder="owner/repo"
            value={githubUrl}
            onChange={(e) => setGithubUrl(e.target.value)}
            className="w-full h-12 px-4 bg-card border border-border rounded-lg"
          />
          <button
            onClick={handleGitHubSubmit}
            className="w-full h-12 bg-secondary text-secondary-foreground rounded-lg"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create remaining 5 screens** (follow same pattern, refer to design file `UsyjJ` for exact UI)

Screens to create:
- `ProjectSelectionGitHubConnectedScreen` — shows "✓ Connected as octocat" badge, clone button
- `RecentProjectsScreen` — lists projects with "Open" buttons
- `RecentProjectsEmptyScreen` — empty state with "Browse Folder" / "Create New"
- `RecentProjectsLoadingScreen` — skeleton placeholders + spinner
- `ProjectAlreadyAddedScreen` — warning icon, "Open in Dashboard" / "Choose Different"

- [ ] **Step 3: Commit**

```bash
git add renderer/src/components/project-setup/screens/
git commit -m "feat: add entry and local path screen components"
```

---

### Task 7: Build Screen Components (Clone + GitHub Paths)

**Files:**
- Create: `renderer/src/components/project-setup/screens/CloneRepositoryScreen.tsx`
- Create: `renderer/src/components/project-setup/screens/CloneRepositoryValidationErrorScreen.tsx`
- Create: `renderer/src/components/project-setup/screens/CloningProgressScreen.tsx`
- Create: `renderer/src/components/project-setup/screens/CloneErrorScreen.tsx`
- Create: `renderer/src/components/project-setup/screens/CloneErrorDestinationExistsScreen.tsx`
- Create: `renderer/src/components/project-setup/screens/GitHubRepoPickerScreen.tsx`

**Interfaces:**
- Consumes: `ScreenProps` pattern, clone progress IPC events
- Produces: 6 screen components

- [ ] **Step 1: Create CloneRepositoryScreen with validation**

```typescript
// renderer/src/components/project-setup/screens/CloneRepositoryScreen.tsx
import { useState } from 'react';
import type { ScreenName, ValidationErrors } from '../../../types/project-setup';

interface ScreenProps {
  navigate: (screen: ScreenName) => void;
  updateProject: (path: string) => void;
}

function validateCloneForm(url: string, branch: string, dest: string): ValidationErrors {
  const errors: ValidationErrors = {};
  if (!url) errors.repoUrl = 'Repository URL is required';
  else if (!/^https:\/\/github\.com\/[\w-]+\/[\w-]+/.test(url)) {
    errors.repoUrl = 'Please enter a valid repository URL';
  }
  if (branch && !/^[a-zA-Z0-9\-_/]+$/.test(branch)) errors.branch = 'Invalid branch name';
  if (!dest) errors.destination = 'Destination is required';
  return errors;
}

export function CloneRepositoryScreen({ navigate, updateProject }: ScreenProps) {
  const [url, setUrl] = useState('');
  const [branch, setBranch] = useState('main');
  const [dest, setDest] = useState('');
  const [errors, setErrors] = useState<ValidationErrors>({});

  const handleSubmit = () => {
    const validationErrors = validateCloneForm(url, branch, dest);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      navigate('clone-repository-validation-error');
      return;
    }
    updateProject(dest);
    navigate('cloning-progress');
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-background">
      <div className="w-[560px] space-y-6">
        <h1 className="text-3xl font-bold text-center">Clone Repository</h1>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Repository URL</label>
            <input value={url} onChange={(e) => setUrl(e.target.value)} className="w-full h-12 px-4 bg-card border border-border rounded-lg" />
            {errors.repoUrl && <p className="text-sm text-destructive">{errors.repoUrl}</p>}
          </div>
          <div>
            <label className="text-sm font-medium">Branch</label>
            <input value={branch} onChange={(e) => setBranch(e.target.value)} className="w-full h-12 px-4 bg-card border border-border rounded-lg" />
          </div>
          <div>
            <label className="text-sm font-medium">Destination</label>
            <input value={dest} onChange={(e) => setDest(e.target.value)} className="w-full h-12 px-4 bg-card border border-border rounded-lg" />
          </div>
        </div>
        <div className="space-y-3">
          <button onClick={handleSubmit} className="w-full h-12 bg-primary text-primary-foreground rounded-lg font-medium">Clone</button>
          <button onClick={() => navigate('project-selection')} className="w-full h-12 text-muted-foreground">← Back</button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create CloningProgressScreen with progress listener**

```typescript
// renderer/src/components/project-setup/screens/CloningProgressScreen.tsx
import { useState, useEffect } from 'react';
import type { ScreenName } from '../../../types/project-setup';

interface ScreenProps {
  projectPath: string | null;
  githubRepoUrl: string | null;
  navigate: (screen: ScreenName) => void;
}

export function CloningProgressScreen({ projectPath, githubRepoUrl, navigate }: ScreenProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const unsubscribe = window.api.onCloneProgress(setProgress);
    
    if (githubRepoUrl && projectPath) {
      window.api.cloneRepository(githubRepoUrl, projectPath).then((result) => {
        if (result.success) {
          navigate('scanning-for-agents');
        } else if (result.error?.type === 'destination-exists') {
          navigate('clone-error-destination-exists');
        } else {
          navigate('clone-error');
        }
      });
    }
    
    return unsubscribe;
  }, [githubRepoUrl, projectPath, navigate]);

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-background">
      <div className="w-[400px] space-y-6 text-center">
        <div className="animate-spin w-16 h-16 border-4 border-primary border-t-transparent rounded-full mx-auto" />
        <h1 className="text-2xl font-bold">Cloning repository...</h1>
        <div className="w-full bg-secondary rounded-full h-2">
          <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
        </div>
        <p className="text-sm text-muted-foreground">{progress}% complete</p>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create remaining 4 screens** (CloneRepositoryValidationErrorScreen, CloneErrorScreen, CloneErrorDestinationExistsScreen, GitHubRepoPickerScreen)

- [ ] **Step 4: Commit**

```bash
git add renderer/src/components/project-setup/screens/
git commit -m "feat: add clone and GitHub path screen components"
```

---

### Task 8: Build Screen Components (Prepare Path)

**Files:**
- Create: `renderer/src/components/project-setup/screens/ProjectLoadingScreen.tsx`
- Create: `renderer/src/components/project-setup/screens/ScanningForAgentsScreen.tsx`
- Create: `renderer/src/components/project-setup/screens/SelectAgentsScreen.tsx`
- Create: `renderer/src/components/project-setup/screens/NotAGitRepositoryScreen.tsx`
- Create: `renderer/src/components/project-setup/screens/NoAgentsFoundScreen.tsx`

- [ ] **Step 1: Create ProjectLoadingScreen**

```typescript
// renderer/src/components/project-setup/screens/ProjectLoadingScreen.tsx
import { useEffect } from 'react';
import type { ScreenName } from '../../../types/project-setup';

interface ScreenProps {
  projectPath: string | null;
  navigate: (screen: ScreenName) => void;
}

export function ProjectLoadingScreen({ projectPath, navigate }: ScreenProps) {
  useEffect(() => {
    const check = async () => {
      if (!projectPath) return;
      const isGit = await window.api.isGitRepo(projectPath);
      // Wait minimum 2 seconds for UX
      await new Promise(resolve => setTimeout(resolve, 2000));
      navigate(isGit ? 'scanning-for-agents' : 'not-a-git-repository');
    };
    check();
  }, [projectPath, navigate]);

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-background">
      <div className="w-[400px] space-y-6 text-center">
        <div className="animate-spin w-16 h-16 border-4 border-primary border-t-transparent rounded-full mx-auto" />
        <h1 className="text-2xl font-bold">Setting up your project...</h1>
        <p className="text-muted-foreground">Configuring agent workspace...</p>
        <div className="w-full bg-secondary rounded-full h-2">
          <div className="bg-primary h-2 rounded-full animate-pulse" style={{ width: '60%' }} />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create ScanningForAgentsScreen (1.5s timeout)**

```typescript
// renderer/src/components/project-setup/screens/ScanningForAgentsScreen.tsx
import { useEffect } from 'react';
import type { ScreenName } from '../../../types/project-setup';

interface ScreenProps {
  navigate: (screen: ScreenName) => void;
}

export function ScanningForAgentsScreen({ navigate }: ScreenProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      navigate('select-agents');
    }, 1500);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-background">
      <div className="w-[400px] space-y-6 text-center">
        <div className="w-16 h-16 bg-card border border-border rounded-xl flex items-center justify-center mx-auto">
          <span className="text-4xl font-bold text-primary">π</span>
        </div>
        <div className="animate-spin w-16 h-16 border-4 border-primary border-t-transparent rounded-full mx-auto" />
        <h1 className="text-2xl font-bold">Scanning for agents</h1>
        <p className="text-muted-foreground">Looking for installed AI coding assistants...</p>
        <p className="text-xs text-muted-foreground">Only reads local agent configs — nothing leaves your device.</p>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create SelectAgentsScreen**

```typescript
// renderer/src/components/project-setup/screens/SelectAgentsScreen.tsx
import { useAgents } from '../../../hooks/useAgents';
import type { ScreenName } from '../../../types/project-setup';

interface ScreenProps {
  selectedAgents: string[];
  updateSelectedAgents: (agents: string[]) => void;
  navigate: (screen: ScreenName) => void;
  complete: (onComplete?: () => void) => void;
}

export function SelectAgentsScreen({ selectedAgents, updateSelectedAgents, navigate, complete }: ScreenProps) {
  const { agents } = useAgents();

  const toggleAgent = (agentId: string) => {
    const updated = selectedAgents.includes(agentId)
      ? selectedAgents.filter(id => id !== agentId)
      : [...selectedAgents, agentId];
    updateSelectedAgents(updated);
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-background">
      <div className="w-[560px] space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold">Select Agents</h1>
          <p className="text-muted-foreground">Choose which agents to use with this project</p>
        </div>
        <div className="space-y-2">
          {agents.map(agent => (
            <label key={agent.id} className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg cursor-pointer">
              <input type="checkbox" checked={selectedAgents.includes(agent.id)} onChange={() => toggleAgent(agent.id)} />
              <span className="font-medium">{agent.name}</span>
              <span className="text-sm text-muted-foreground ml-auto">{agent.path}</span>
            </label>
          ))}
        </div>
        <div className="space-y-3">
          <button
            onClick={() => complete()}
            disabled={selectedAgents.length === 0}
            className="w-full h-12 bg-primary text-primary-foreground rounded-lg font-medium disabled:opacity-50"
          >
            Continue ({selectedAgents.length})
          </button>
          <button onClick={() => navigate('scanning-for-agents')} className="w-full h-12 text-muted-foreground">← Back</button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create NotAGitRepositoryScreen and NoAgentsFoundScreen**

- [ ] **Step 5: Commit**

```bash
git add renderer/src/components/project-setup/screens/
git commit -m "feat: add prepare path screen components"
```

---

### Task 9: Build ProjectSetupFlow Orchestrator

**Files:**
- Create: `renderer/src/components/project-setup/ProjectSetupFlow.tsx`

- [ ] **Step 1: Create orchestrator component**

```typescript
// renderer/src/components/project-setup/ProjectSetupFlow.tsx
import { useProjectSetupState } from '../../hooks/useProjectSetupState';
import type { ScreenName } from '../../types/project-setup';
import { ProjectSelectionScreen } from './screens/ProjectSelectionScreen';
import { ProjectSelectionGitHubConnectedScreen } from './screens/ProjectSelectionGitHubConnectedScreen';
import { RecentProjectsScreen } from './screens/RecentProjectsScreen';
import { RecentProjectsEmptyScreen } from './screens/RecentProjectsEmptyScreen';
import { RecentProjectsLoadingScreen } from './screens/RecentProjectsLoadingScreen';
import { ProjectAlreadyAddedScreen } from './screens/ProjectAlreadyAddedScreen';
import { CloneRepositoryScreen } from './screens/CloneRepositoryScreen';
import { CloneRepositoryValidationErrorScreen } from './screens/CloneRepositoryValidationErrorScreen';
import { CloningProgressScreen } from './screens/CloningProgressScreen';
import { CloneErrorScreen } from './screens/CloneErrorScreen';
import { CloneErrorDestinationExistsScreen } from './screens/CloneErrorDestinationExistsScreen';
import { GitHubRepoPickerScreen } from './screens/GitHubRepoPickerScreen';
import { ProjectLoadingScreen } from './screens/ProjectLoadingScreen';
import { ScanningForAgentsScreen } from './screens/ScanningForAgentsScreen';
import { SelectAgentsScreen } from './screens/SelectAgentsScreen';
import { NotAGitRepositoryScreen } from './screens/NotAGitRepositoryScreen';
import { NoAgentsFoundScreen } from './screens/NoAgentsFoundScreen';

const SCREEN_COMPONENTS: Record<ScreenName, React.ComponentType<any>> = {
  'project-selection': ProjectSelectionScreen,
  'project-selection-github-connected': ProjectSelectionGitHubConnectedScreen,
  'recent-projects': RecentProjectsScreen,
  'recent-projects-empty': RecentProjectsEmptyScreen,
  'recent-projects-loading': RecentProjectsLoadingScreen,
  'project-already-added': ProjectAlreadyAddedScreen,
  'clone-repository': CloneRepositoryScreen,
  'clone-repository-validation-error': CloneRepositoryValidationErrorScreen,
  'cloning-progress': CloningProgressScreen,
  'clone-error': CloneErrorScreen,
  'clone-error-destination-exists': CloneErrorDestinationExistsScreen,
  'github-repo-picker': GitHubRepoPickerScreen,
  'project-loading': ProjectLoadingScreen,
  'scanning-for-agents': ScanningForAgentsScreen,
  'select-agents': SelectAgentsScreen,
  'not-a-git-repository': NotAGitRepositoryScreen,
  'no-agents-found': NoAgentsFoundScreen,
};

interface ProjectSetupFlowProps {
  flowMode?: 'full' | 'condensed';
  onComplete?: () => void;
}

export function ProjectSetupFlow({ flowMode = 'full', onComplete }: ProjectSetupFlowProps) {
  const state = useProjectSetupState(flowMode);
  const Screen = SCREEN_COMPONENTS[state.currentScreen];

  if (!Screen) return null;

  return <Screen {...state} onComplete={onComplete} />;
}
```

- [ ] **Step 2: Commit**

```bash
git add renderer/src/components/project-setup/ProjectSetupFlow.tsx
git commit -m "feat: add ProjectSetupFlow orchestrator component"
```

---

### Task 10: Integrate with App.tsx

**Files:**
- Modify: `renderer/src/App.tsx`

- [ ] **Step 1: Add ProjectSetupFlow routing**

```typescript
// renderer/src/App.tsx (modify existing App component)
import { ProjectSetupFlow } from './components/project-setup/ProjectSetupFlow';

function App() {
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean | null>(null);
  const [projectCount, setProjectCount] = useState<number | null>(null);

  useEffect(() => {
    let ignored = false;
    if (window.api) {
      window.api.getOnboardingStatus().then((status) => {
        if (ignored) return;
        setOnboardingCompleted(status);
      });
      window.api.getProjects().then((projects) => {
        if (ignored) return;
        setProjectCount(projects.length);
      });
    }
    return () => { ignored = true; };
  }, []);

  if (onboardingCompleted === null || projectCount === null) {
    return null;
  }

  if (!onboardingCompleted) {
    return <OnboardingFlow onComplete={() => setOnboardingCompleted(true)} />;
  }

  if (projectCount === 0) {
    return <ProjectSetupFlow flowMode="full" onComplete={() => setProjectCount(1)} />;
  }

  return (
    // ... existing dashboard routes
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add renderer/src/App.tsx
git commit -m "feat: integrate ProjectSetupFlow into App routing"
```

---

### Task 11: Add Dashboard "Add Project" Button

**Files:**
- Modify: `renderer/src/components/dashboard/Dashboard.tsx`

- [ ] **Step 1: Add condensed flow trigger**

```typescript
// renderer/src/components/dashboard/Dashboard.tsx
import { useState } from 'react';
import { ProjectSetupFlow } from '../project-setup/ProjectSetupFlow';

export function Dashboard() {
  const [showProjectSetup, setShowProjectSetup] = useState(false);

  if (showProjectSetup) {
    return (
      <ProjectSetupFlow
        flowMode="condensed"
        onComplete={() => {
          setShowProjectSetup(false);
          // Refresh project list
        }}
      />
    );
  }

  return (
    // ... existing dashboard UI
    <button onClick={() => setShowProjectSetup(true)}>Add Project</button>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add renderer/src/components/dashboard/Dashboard.tsx
git commit -m "feat: add Add Project button to Dashboard"
```

---

### Task 12: Final Verification

- [ ] **Step 1: Run all tests**

```bash
pnpm test
```

Expected: All tests pass

- [ ] **Step 2: Run dev server and verify flow**

```bash
pnpm dev
```

Verify:
- Onboarding completes → ProjectSetupFlow runs (if no projects)
- Full flow shows all 17 screens
- Can browse local folder and complete setup
- Can enter GitHub URL and clone
- Dashboard "Add Project" button triggers condensed flow
- Duplicate project shows error screen
- All error states have recovery paths

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "feat: complete Project Setup Flow implementation"
```