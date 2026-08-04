import { contextBridge, ipcRenderer } from 'electron';
import type { AgentConfig } from './shared/types';

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
  launchAgent: (id: string) => ipcRenderer.invoke('launch-agent', id),
});
