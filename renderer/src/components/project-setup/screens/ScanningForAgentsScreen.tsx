import { useEffect } from 'react';
import type { ScreenName } from '../../../types/project-setup';

interface ScreenProps {
  navigate: (screen: ScreenName) => void;
}

export function ScanningForAgentsScreen({ navigate }: ScreenProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      navigate('select-agents');
    }, 1500);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-background">
      <div className="w-[400px] space-y-6 text-center">
        <div className="w-16 h-16 bg-card border border-border rounded-xl flex items-center justify-center mx-auto">
          <span className="text-4xl font-bold text-primary">π</span>
        </div>
        <div className="animate-spin w-16 h-16 border-4 border-primary border-t-transparent rounded-full mx-auto" />
        <h1 className="text-2xl font-bold">Scanning for agents</h1>
        <p className="text-muted-foreground">Looking for installed AI coding assistants...</p>
        <p className="text-xs text-muted-foreground">Only reads local agent configs — nothing leaves your device.</p>
      </div>
    </div>
  );
}
