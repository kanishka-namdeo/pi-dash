// Mock data for views that need agent data
// This is a minimal stub to fix import errors

export interface Agent {
  id: string;
  name: string;
  status: string;
}

export const seedAgents: Agent[] = [
  { id: 'pi', name: 'Pi', status: 'active' },
  { id: 'claude', name: 'Claude', status: 'active' },
];
