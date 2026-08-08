import type { ScreenName } from '../../../types/project-setup';

interface ScreenProps {
  projectPath: string | null;
  navigate: (screen: ScreenName) => void;
}

export function CloneErrorDestinationExistsScreen({ projectPath, navigate }: ScreenProps) {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-background">
      <div className="w-[480px] space-y-6 text-center">
        <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto">
          <span className="text-3xl">⚠</span>
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Directory Already Exists</h1>
          <p className="text-muted-foreground">The destination folder already contains files.</p>
        </div>
        <div className="p-4 bg-card rounded-lg">
          <p className="text-sm text-muted-foreground font-mono">{projectPath}</p>
        </div>
        <div className="space-y-3">
          <button onClick={() => navigate('clone-repository')} className="w-full h-12 bg-primary text-primary-foreground rounded-lg font-medium">Choose Different Location</button>
          <button onClick={() => navigate('project-selection')} className="w-full h-12 text-muted-foreground">Cancel</button>
        </div>
      </div>
    </div>
  );
}
