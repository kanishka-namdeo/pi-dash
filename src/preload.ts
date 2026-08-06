import { contextBridge, ipcRenderer } from 'electron';
import type { AgentConfig, SessionInfo } from './shared/types';

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
  // Existing
  platform: process.platform,
  versions: process.versions,
  
  // Agent management
  scanAgents: () => ipcRenderer.invoke('scan-agents'),
  validateAgent: (path: string) => ipcRenderer.invoke('validate-agent', path),
  identifyAgent: (path: string) => ipcRenderer.invoke('identify-agent', path),
  getAgents: () => ipcRenderer.invoke('get-agents'),
  saveAgents: (agents: AgentConfig[]) => ipcRenderer.invoke('save-agents', agents),
  completeOnboarding: () => ipcRenderer.invoke('complete-onboarding'),
  getOnboardingStatus: () => ipcRenderer.invoke('get-onboarding-status'),
  launchAgent: (id: string) => ipcRenderer.invoke('launch-agent', id),

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

  // Dialog
  openDirectory: () => ipcRenderer.invoke('dialog:openDirectory'),

  // GitHub integration
  github: {
    // Auth
    authGetUser: () => ipcRenderer.invoke('github:auth:getUser'),
    authOAuth: () => ipcRenderer.invoke('github:auth:oauth'),
    authPAT: (token: string) => ipcRenderer.invoke('github:auth:pat', token),
    authLogout: () => ipcRenderer.invoke('github:auth:logout'),
    // Repos
    repoList: () => ipcRenderer.invoke('github:repo:list'),
    repoAdd: (owner: string, name: string, localPath: string) =>
      ipcRenderer.invoke('github:repo:add', owner, name, localPath),
    repoRemove: (id: number) => ipcRenderer.invoke('github:repo:remove', id),
    repoGetActive: () => ipcRenderer.invoke('github:repo:getActive'),
    repoSetActive: (id: number) => ipcRenderer.invoke('github:repo:setActive', id),
    // Data
    dataIssues: (owner: string, repo: string) =>
      ipcRenderer.invoke('github:data:issues', owner, repo),
    dataPRs: (owner: string, repo: string) =>
      ipcRenderer.invoke('github:data:prs', owner, repo),
  },
});
