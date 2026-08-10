import type { AgentConfig } from '../../../src/shared/types';

/**
 * Find agents that are in selected but not in globalAgents
 */
export function findNewAgents(
  selected: AgentConfig[],
  globalAgents: AgentConfig[]
): AgentConfig[] {
  const globalIds = new Set(globalAgents.map(a => a.id));
  return selected.filter(a => !globalIds.has(a.id));
}

/**
 * Merge global and project agents, with project agents overriding global
 */
export function mergeAgents(
  globalAgents: AgentConfig[],
  projectAgents: AgentConfig[]
): AgentConfig[] {
  const map = new Map<string, AgentConfig>();
  globalAgents.forEach(a => map.set(a.id, a));
  projectAgents.forEach(a => map.set(a.id, a)); // project agents override
  return Array.from(map.values());
}
