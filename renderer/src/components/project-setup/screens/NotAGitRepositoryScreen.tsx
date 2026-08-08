import type { ScreenName } from '../../../types/project-setup';

interface ScreenProps {
  navigate: (screen: ScreenName) => void;
}

export function NotAGitRepositoryScreen({ navigate }: ScreenProps) {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-background">
      <div className="w-[480px] space-y-6 text-center">
        <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto">
          <span className="text-3xl">⚠</span>
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Not a Git Repository</h1>
          <p className="text-muted-foreground">This folder doesn't appear to be a git repository.</p>
        </div>
        <div className="space-y-3">
          <button onClick={() => navigate('scanning-for-agents')} className="w-full h-12 bg-primary text-primary-foreground rounded-lg font-medium">Continue Anyway</button>
          <button onClick={() => navigate('project-selection')} className="w-full h-12 text-muted-foreground">Choose Different Folder</button>
        </div>
      </div>
    </div>
  );
}
