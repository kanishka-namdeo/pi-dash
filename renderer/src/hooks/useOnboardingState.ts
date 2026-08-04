import { useState } from 'react';
import type { Agent, ScreenName } from '../types';

export function useOnboardingState() {
  const [currentScreen, setCurrentScreen] = useState<ScreenName>('welcome');
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);

  const navigateTo = (screen: ScreenName) => {
    setCurrentScreen(screen);
  };

  const addAgent = (agent: Agent) => {
    setAgents(prev => [...prev, agent]);
    setSelectedAgents(prev => [...prev, agent.id]);
  };

  const toggleAgent = (agentId: string) => {
    setSelectedAgents(prev =>
      prev.includes(agentId)
        ? prev.filter(id => id !== agentId)
        : [...prev, agentId]
    );
  };

  const selectAll = () => {
    setSelectedAgents(agents.map(agent => agent.id));
  };

  const deselectAll = () => {
    setSelectedAgents([]);
  };

  return {
    currentScreen,
    agents,
    selectedAgents,
    navigateTo,
    setAgents,
    addAgent,
    toggleAgent,
    selectAll,
    deselectAll,
  };
}
