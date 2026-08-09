import { useState, useEffect, useCallback, Component, type ReactNode, type ErrorInfo } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Dashboard } from './components/dashboard/Dashboard';
import { AgentDetailView } from './components/views/AgentDetailView';
import { WorktreeView } from './components/views/WorktreeView';
import { CompletedWorkView } from './components/views/CompletedWorkView';
import { PRDetailView } from './components/github/PRDetailView';
import { OnboardingFlow } from './components/onboarding/OnboardingFlow';
import { ProjectSetupFlow } from './components/project-setup/ProjectSetupFlow';
import { SettingsScreen } from './components/settings/SettingsScreen';
import { SettingsProvider } from './context/SettingsContext';
import { GlobalSettingsEffect } from './components/settings/GlobalSettingsEffect';
import { PiPProvider } from './context/PiPContext';
import { GitHubProvider } from './context/GitHubContext';
import { SessionProvider } from './context/SessionContext';
import { OverlayManager } from './components/pip/OverlayManager';
import { Toaster } from './components/ui/sonner';
import { CommandPalette } from './components/CommandPalette';
import { AlertCircle } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen flex items-center justify-center bg-[#0a0a0a]">
          <div className="max-w-md text-center space-y-4">
            <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
            <h1 className="text-xl text-[#e5e5e5]">Something went wrong</h1>
            <p className="text-sm text-[#a3a3a3]">
              The application encountered an unexpected error.
            </p>
            <div className="flex gap-3 justify-center pt-2">
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 rounded-lg bg-[#1a1a1a] text-[#e5e5e5] hover:bg-[#2a2a2a] transition-colors text-sm"
              >
                Reload Page
              </button>
              <button
                onClick={() => (window.location.href = '/')}
                className="px-4 py-2 rounded-lg bg-[#1a1a1a] text-[#e5e5e5] hover:bg-[#2a2a2a] transition-colors text-sm"
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}


function App() {
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean | null>(null);
  const [projectCount, setProjectCount] = useState<number | null>(null);

  const refreshProjectCount = useCallback(async () => {
    const projects = await window.api.getProjects();
    setProjectCount(projects.length);
  }, []);

  useEffect(() => {
    let ignored = false;
    if (window.api) {
      window.api.getOnboardingStatus().then((status) => {
        if (ignored) return;
        setOnboardingCompleted(status);
      });
      refreshProjectCount().then(() => {
        if (ignored) return;
      });
    } else {
      setOnboardingCompleted(true);
    }
    return () => { ignored = true; };
  }, [refreshProjectCount]);

  const handleOnboardingComplete = useCallback(() => {
    setOnboardingCompleted(true);
  }, []);

  if (onboardingCompleted === null || projectCount === null) {
    return null; // Loading
  }

  if (!onboardingCompleted) {
    return <OnboardingFlow onComplete={handleOnboardingComplete} />;
  }

  if (projectCount === 0) {
    return <ProjectSetupFlow flowMode="full" onComplete={refreshProjectCount} />;
  }

  return (
    <>
      <ErrorBoundary>
        <SessionProvider>
          <GitHubProvider>
            <PiPProvider>
              <SettingsProvider>
                <GlobalSettingsEffect />
                <BrowserRouter>
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/agent/:agentId" element={<AgentDetailView />} />
                    <Route path="/settings/*" element={<SettingsScreen />} />
                    <Route path="/completed/:agentId" element={<CompletedWorkView />} />
                    <Route path="/pr/:prNumber" element={<PRDetailView />} />
                    <Route path="/worktrees" element={<WorktreeView />} />
                  </Routes>
                  <CommandPalette />
                </BrowserRouter>
              </SettingsProvider>
            </PiPProvider>
          </GitHubProvider>
        </SessionProvider>
      </ErrorBoundary>
      <Toaster />
    </>
  );
}
export default App;
