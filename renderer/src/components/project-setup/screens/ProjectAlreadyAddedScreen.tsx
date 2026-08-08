import type { ScreenName } from '../../../types/project-setup';

interface ScreenProps {
  projectPath: string | null;
  navigate: (screen: ScreenName) => void;
  complete: (onComplete?: () => void) => void;
}

export function ProjectAlreadyAddedScreen({ projectPath, navigate, complete }: ScreenProps) {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-background">
      <div className="w-[480px] space-y-6 text-center">
        <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto">
          <span className="text-3xl">⚠</span>
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Project Already Added</h1>
          <p className="text-muted-foreground">This project is already in your dashboard</p>
        </div>
        <div className="p-4 bg-card rounded-lg">
          <p className="text-sm text-muted-foreground font-mono">{projectPath}</p>
        </div>
        <div className="space-y-3">
          <button onClick={() => complete()} className="w-full h-12 bg-primary text-primary-foreground rounded-lg font-medium">
            Open in Dashboard
          </button>
          <button onClick={() => navigate('project-selection')} className="w-full h-12 text-muted-foreground">
            Choose Different Project
          </button>
        </div>
      </div>
    </div>
  );
}
