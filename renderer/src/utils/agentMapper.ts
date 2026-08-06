import type { AgentConfig } from '../../../src/shared/types';
import type { Agent } from '@/types/dashboard';

// Known agent color mappings
const knownAgentColors: Record<string, { bg: string; text: string }> = {
  claude: { bg: '#1e3a5f', text: '#60a5fa' },
  cursor: { bg: '#3b2f5f', text: '#a78bfa' },
  copilot: { bg: '#1f4f3f', text: '#4ade80' },
  windsurf: { bg: '#4f2f1f', text: '#fb923c' },
  cline: { bg: '#4f1f3f', text: '#f472b6' },
  aider: { bg: '#1f3f4f', text: '#22d3ee' },
};

// Generate a deterministic color from agent id
function generateColor(id: string): { bg: string; text: string } {
  if (knownAgentColors[id]) {
    return knownAgentColors[id];
  }

  // Hash the id to generate consistent colors
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }

  const hue = Math.abs(hash % 360);
  const bg = `hsl(${hue}, 40%, 25%)`;
  const text = `hsl(${hue}, 70%, 65%)`;

  return { bg, text };
}

/**
 * Maps an AgentConfig (from agent store) to an Agent (UI type)
 */
export function agentConfigToAgent(config: AgentConfig): Agent {
  const colors = generateColor(config.id);

  return {
    id: config.id,
    name: config.name,
    short: config.name ? config.name.slice(0, 2).toUpperCase() : '?',
    color: colors.bg,
    textColor: colors.text,
    status: 'idle',
    task: '',
    progress: 0,
    path: config.path,
    files: [],
    messages: [],
  };
}
