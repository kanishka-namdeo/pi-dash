import { app } from 'electron';
import fs from 'fs/promises';
import path from 'path';
import type { AgentsStore, AgentConfig } from '../shared/types';

const STORE_FILE = 'agents.json';



export async function loadAgents(): Promise<AgentsStore> {
  const userDataPath = process.env.PI_DASH_USER_DATA || app.getPath('userData');
  const storePath = path.join(userDataPath, STORE_FILE);
  
  try {
    const data = await fs.readFile(storePath, 'utf-8');
    return JSON.parse(data) as AgentsStore;
  } catch (error: unknown) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return {
        version: 1,
        agents: [],
        lastScan: 0,
        onboardingCompleted: false,
      };
    }
    throw error;
  }
}

export async function saveAgents(agents: AgentConfig[]): Promise<void> {
  const userDataPath = process.env.PI_DASH_USER_DATA || app.getPath('userData');
  const storePath = path.join(userDataPath, STORE_FILE);
  const store = await loadAgents();
  
  store.agents = agents;
  store.lastScan = Date.now();
  
  const dir = path.dirname(storePath);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(storePath, JSON.stringify(store, null, 2));
}

export async function completeOnboarding(): Promise<void> {
  const userDataPath = process.env.PI_DASH_USER_DATA || app.getPath('userData');
  const storePath = path.join(userDataPath, STORE_FILE);
  const store = await loadAgents();
  
  store.onboardingCompleted = true;
  
  const dir = path.dirname(storePath);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(storePath, JSON.stringify(store, null, 2));
}

export async function resetOnboarding(): Promise<void> {
  const userDataPath = process.env.PI_DASH_USER_DATA || app.getPath('userData');
  const storePath = path.join(userDataPath, STORE_FILE);
  const store = await loadAgents();
  store.onboardingCompleted = false;
  const dir = path.dirname(storePath);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(storePath, JSON.stringify(store, null, 2));
}
