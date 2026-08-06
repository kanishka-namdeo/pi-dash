import { useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Dashboard } from './components/dashboard/Dashboard';
import { TerminalView } from './components/terminal/TerminalView';
import { AgentDetailView } from './components/views/AgentDetailView';
import { WorktreeView } from './components/views/WorktreeView';
import { CompletedWorkView } from './components/views/CompletedWorkView';
import { OnboardingFlow } from './components/onboarding/OnboardingFlow';
import { PiPProvider } from './context/PiPContext';
import { SessionProvider } from './context/SessionContext';
import { PiPContainer } from './components/pip/PiPContainer';
import { MainTerminal } from './components/pip/MainTerminal';
import { OverlayManager } from './components/pip/OverlayManager';

function App() {
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean | null>(null);

  useEffect(() => {
    if (window.api) {
      window.api.getOnboardingStatus().then(setOnboardingCompleted);
    } else {
      setOnboardingCompleted(true);
    }
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
    <SessionProvider>
      <PiPProvider>
        <BrowserRouter>
          <Routes>
            <Route
              path="/"
              element={
                <PiPContainer>
                  <MainTerminal />
                  <OverlayManager />
                </PiPContainer>
              }
            />
            <Route path="/agent/:agentId" element={<AgentDetailView />} />
            <Route path="/worktrees" element={<WorktreeView />} />
            <Route path="/completed/:agentId" element={<CompletedWorkView />} />
          </Routes>
        </BrowserRouter>
      </PiPProvider>
    </SessionProvider>
  );
}
export default App;
