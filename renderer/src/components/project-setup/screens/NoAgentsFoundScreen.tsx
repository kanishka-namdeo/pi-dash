import type { ScreenName } from '../../../types/project-setup';

interface ScreenProps {
  navigate: (screen: ScreenName) => void;
  complete: (onComplete?: () => void) => void;
}

export function NoAgentsFoundScreen({ navigate, complete }: ScreenProps) {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-background">
      <div className="w-[480px] space-y-6 text-center">
        <div className="w-16 h-16 bg-card border border-border rounded-xl flex items-center justify-center mx-auto">
          <span className="text-2xl text-muted-foreground">🔍</span>
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">No Agents Detected</h1>
          <p className="text-muted-foreground">We couldn't find any AI coding agents in this project.</p>
        </div>
        <div className="space-y-3">
          <button onClick={() => navigate('select-agents')} className="w-full h-12 bg-primary text-primary-foreground rounded-lg font-medium">Add Agent Manually</button>
          <button onClick={() => complete()} className="w-full h-12 text-muted-foreground">Skip for Now</button>
        </div>
      </div>
    </div>
  );
}
