import { useEffect } from 'react';
import type { ScreenName } from '../../../types/project-setup';

interface ScreenProps {
  projectPath: string | null;
  navigate: (screen: ScreenName) => void;
}

export function ProjectLoadingScreen({ projectPath, navigate }: ScreenProps) {
  useEffect(() => {
    const check = async () => {
      if (!projectPath) return;
      const { promise, resolve } = Promise.withResolvers<void>();
      setTimeout(resolve, 2000);
      await promise;
      const isGit = await window.api.isGitRepo(projectPath);
      navigate(isGit ? 'scanning-for-agents' : 'not-a-git-repository');
    };
    check();
  }, [projectPath, navigate]);

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-background">
      <div className="w-[400px] space-y-6 text-center">
        <div className="animate-spin w-16 h-16 border-4 border-primary border-t-transparent rounded-full mx-auto" />
        <h1 className="text-2xl font-bold">Setting up your project...</h1>
        <p className="text-muted-foreground">Configuring agent workspace...</p>
        <div className="w-full bg-secondary rounded-full h-2">
          <div className="bg-primary h-2 rounded-full animate-pulse" style={{ width: '60%' }} />
        </div>
      </div>
    </div>
  );
}
