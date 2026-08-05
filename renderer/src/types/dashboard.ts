export type Agent = {
  id: string;
  name: string;
  short: string;
  color: string;
  textColor: string;
  status: 'active' | 'idle' | 'paused';
  task: string;
  progress: number;
  path?: string;
  files?: string[];
  messages?: { time: string; text: string }[];
};

export type Activity = {
  id: string;
  time: string;
  agentId: string;
  action: 'read' | 'write' | 'edit' | 'test' | 'lint' | 'plan';
  description: string;
  file?: string;
};

export type Mode = 'auto' | 'supervised' | 'manual';

export type PlanStep = {
  id: string;
  number: number;
  name: string;
  agentId: string;
  status: 'done' | 'active' | 'pending';
  duration: string;
};
