import type { ScreenName } from '../../../types/project-setup';

interface ScreenProps {
  navigate: (screen: ScreenName) => void;
}

export function RecentProjectsEmptyScreen({ navigate }: ScreenProps) {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-background">
      <div className="w-[400px] space-y-6 text-center">
        <div className="w-16 h-16 bg-card border border-border rounded-xl flex items-center justify-center mx-auto">
          <span className="text-2xl text-muted-foreground">📁</span>
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">No Recent Projects</h1>
          <p className="text-muted-foreground">You haven't opened any projects yet</p>
        </div>
        <div className="space-y-3">
          <button onClick={() => navigate('project-selection')} className="w-full h-12 bg-primary text-primary-foreground rounded-lg font-medium">
            Browse Folder
          </button>
          <button onClick={() => navigate('clone-repository')} className="w-full h-12 border border-border rounded-lg text-muted-foreground">
            Create New
          </button>
        </div>
      </div>
    </div>
  );
}
