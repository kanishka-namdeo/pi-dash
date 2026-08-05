import { useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Dashboard } from './components/dashboard/Dashboard';
import { TerminalView } from './components/terminal/TerminalView';
import { AgentDetailView } from './components/views/AgentDetailView';
import { WorktreeView } from './components/views/WorktreeView';
import { CompletedWorkView } from './components/views/CompletedWorkView';
import { OnboardingFlow } from './components/onboarding/OnboardingFlow';

function App() {
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean | null>(null);

  useEffect(() => {
    window.api.getOnboardingStatus().then(setOnboardingCompleted);
  }, []);

  const handleOnboardingComplete = useCallback(() => {
    setOnboardingCompleted(true);
  }, []);

  if (onboardingCompleted === null) {
    return null; // Loading
  }

  if (!onboardingCompleted) {
    return <OnboardingFlow onComplete={handleOnboardingComplete} />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/agent/:agentId" element={<TerminalView />} />
        <Route path="/worktrees" element={<WorktreeView />} />
        <Route path="/completed/:agentId" element={<CompletedWorkView />} />
      </Routes>
    </BrowserRouter>
  );
}
export default App;
