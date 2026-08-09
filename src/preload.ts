import { contextBridge, ipcRenderer } from 'electron';
import type { AgentConfig, SessionInfo } from './shared/types';
import type { Project, CloneError } from './shared/project-setup-types';

export type SessionAPI = {
  create: (agentId: string, cwd: string) => Promise<{ pid: number; state: string } | { error: string }>;
  get: (agentId: string) => Promise<SessionInfo | null | { error: string }>;
  list: () => Promise<SessionInfo[] | { error: string }>;
  write: (agentId: string, data: string) => Promise<void | { error: string }>;
  resize: (agentId: string, cols: number, rows: number) => Promise<void | { error: string }>;
  destroy: (agentId: string) => Promise<void | { error: string }>;
  onData: (callback: (agentId: string, data: string) => void) => () => void;
  onExit: (callback: (agentId: string, exitCode: number) => void) => () => void;
};

contextBridge.exposeInMainWorld('api', {
  platform: process.platform,
  versions: process.versions,
  cwd: () => ipcRenderer.invoke('get-cwd'),
  
  // Agent management
  scanAgents: () => ipcRenderer.invoke('scan-agents'),
  validateAgent: (path: string) => ipcRenderer.invoke('validate-agent', path),
  identifyAgent: (path: string) => ipcRenderer.invoke('identify-agent', path),
  getAgents: () => ipcRenderer.invoke('get-agents'),
  saveAgents: (agents: AgentConfig[]) => ipcRenderer.invoke('save-agents', agents),
  completeOnboarding: () => ipcRenderer.invoke('complete-onboarding'),
  findAgentInPath: (binary: string) => ipcRenderer.invoke('find-agent-in-path', binary),

  // Session management
  session: {
    create: (agentId: string, cwd: string) =>
      ipcRenderer.invoke('session:create', { agentId, cwd }),
    get: (agentId: string) =>
      ipcRenderer.invoke('session:get', { agentId }),
    list: () =>
      ipcRenderer.invoke('session:list'),
    write: (agentId: string, data: string) =>
      ipcRenderer.invoke('session:write', { agentId, data }),
    resize: (agentId: string, cols: number, rows: number) =>
      ipcRenderer.invoke('session:resize', { agentId, cols, rows }),
    destroy: (agentId: string) =>
      ipcRenderer.invoke('session:destroy', { agentId }),
    onData: (callback: (agentId: string, data: string) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, agentId: string, data: string) => {
        callback(agentId, data);
      };
      ipcRenderer.on('session:data', listener);
      return () => ipcRenderer.removeListener('session:data', listener);
    },
    onExit: (callback: (agentId: string, exitCode: number) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, agentId: string, exitCode: number) => {
        callback(agentId, exitCode);
      };
      ipcRenderer.on('session:exit', listener);
      return () => ipcRenderer.removeListener('session:exit', listener);
    },
  } satisfies SessionAPI,

  // Project management
  getProjects: () => ipcRenderer.invoke('get-projects'),
  addProject: (project: Project) => ipcRenderer.invoke('add-project', project),
  updateProject: (path: string, updates: Partial<Project>) => ipcRenderer.invoke('update-project', path, updates),
  removeProject: (path: string) => ipcRenderer.invoke('remove-project', path),
  getRecentProjects: (limit?: number) => ipcRenderer.invoke('get-recent-projects', limit),
  isGitRepo: (path: string) => ipcRenderer.invoke('is-git-repo', path),
  cloneRepository: (url: string, dest: string, branch?: string) => ipcRenderer.invoke('clone-repository', url, dest, branch),
  onCloneProgress: (callback: (progress: number) => void) => {
    const subscription = (_event: Electron.IpcRendererEvent, progress: number) => callback(progress);
    ipcRenderer.on('clone-progress', subscription);
    return () => ipcRenderer.removeListener('clone-progress', subscription);
  },

  // Dialog
  openDirectory: () => ipcRenderer.invoke('dialog:openDirectory'),

  // GitHub integration
  github: {
    // New nested API (Tasks 6-7 channels)
    auth: {
      getState: () => ipcRenderer.invoke('github:auth:getState'),
      startOAuth: () => ipcRenderer.invoke('github:auth:oauth'),
      loginWithPAT: (token: string) => ipcRenderer.invoke('github:auth:pat', token),
      logout: () => ipcRenderer.invoke('github:auth:logout'),
    },
    repos: {
      getAll: () => ipcRenderer.invoke('github:repos:getAll'),
      add: (owner: string, name: string, localPath: string) =>
        ipcRenderer.invoke('github:repos:add', owner, name, localPath),
      remove: (id: number) => ipcRenderer.invoke('github:repos:remove', id),
      setActive: (id: number | null) => ipcRenderer.invoke('github:repos:setActive', id),
    },
    data: {
      fetchIssues: (owner: string, repo: string) =>
        ipcRenderer.invoke('github:data:issues', owner, repo),
      fetchPRs: (owner: string, repo: string) =>
        ipcRenderer.invoke('github:data:prs', owner, repo),
      fetchBranches: (owner: string, repo: string) =>
        ipcRenderer.invoke('github:data:branches', owner, repo),
    },
    issues: {
      create: (owner: string, repo: string, title: string, body: string, labels?: string[], assignees?: string[]) =>
        ipcRenderer.invoke('github:issues:create', owner, repo, title, body, labels, assignees),
      comment: (owner: string, repo: string, issueNumber: number, body: string) =>
        ipcRenderer.invoke('github:issues:comment', owner, repo, issueNumber, body),
    },
    prs: {
      create: (owner: string, repo: string, title: string, body: string, head: string, base: string) =>
        ipcRenderer.invoke('github:prs:create', owner, repo, title, body, head, base),
      review: (owner: string, repo: string, prNumber: number, event: string, body: string) =>
        ipcRenderer.invoke('github:prs:review', owner, repo, prNumber, event, body),
    },
    // Legacy flat methods (backward compatibility)
    authGetUser: () => ipcRenderer.invoke('github:auth:getUser'),
    authOAuth: () => ipcRenderer.invoke('github:auth:oauth'),
    authPAT: (token: string) => ipcRenderer.invoke('github:auth:pat', token),
    authLogout: () => ipcRenderer.invoke('github:auth:logout'),
    repoList: () => ipcRenderer.invoke('github:repo:list'),
    repoAdd: (owner: string, name: string, localPath: string) =>
      ipcRenderer.invoke('github:repo:add', owner, name, localPath),
    repoRemove: (id: number) => ipcRenderer.invoke('github:repo:remove', id),
    repoGetActive: () => ipcRenderer.invoke('github:repo:getActive'),
    repoSetActive: (id: number) => ipcRenderer.invoke('github:repo:setActive', id),
    dataIssues: (owner: string, repo: string) =>
      ipcRenderer.invoke('github:data:issues', owner, repo),
    dataPRs: (owner: string, repo: string) =>
      ipcRenderer.invoke('github:data:prs', owner, repo),
  },

  // Worktree management
  worktree: {
    list: (repoPath: string) => ipcRenderer.invoke('worktree:list', repoPath),
    create: (repoPath: string, branch: string, baseBranch: string, issueNumber?: number) =>
      ipcRenderer.invoke('worktree:create', repoPath, branch, baseBranch, issueNumber),
  },

  // Agent GitHub integration
  agentGitHub: {
    createPR: (worktreePath: string, title: string, body: string) =>
      ipcRenderer.invoke('agent-github:createPR', worktreePath, title, body),
    commentIssue: (owner: string, repo: string, issueNumber: number, body: string) =>
      ipcRenderer.invoke('agent-github:commentIssue', owner, repo, issueNumber, body),
    readFeedback: (owner: string, repo: string, prNumber: number) =>
      ipcRenderer.invoke('agent-github:readFeedback', owner, repo, prNumber),
    assign: (worktreeId: string, agentId: string) =>
      ipcRenderer.invoke('agent-github:assign', worktreeId, agentId),
  },

  // Settings
  settings: {
    getAll: () => ipcRenderer.invoke('settings:getAll'),
    set: (path: string, value: unknown) => ipcRenderer.invoke('settings:set', path, value),
    reset: () => ipcRenderer.invoke('settings:reset'),
    export: () => ipcRenderer.invoke('settings:export'),
    import: (data: unknown) => ipcRenderer.invoke('settings:import', data),
  },

  // Keyboard shortcuts
  onShortcut: (callback: (action: string) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, action: string) => callback(action);
    ipcRenderer.on('shortcut', handler);
    return () => ipcRenderer.removeListener('shortcut', handler);
  },

  // Search
  search: {
    getRecent: () => ipcRenderer.invoke('search:getRecent'),
    addRecent: (term: string) => ipcRenderer.invoke('search:addRecent', term),
    clearRecent: () => ipcRenderer.invoke('search:clearRecent'),
  },
});
