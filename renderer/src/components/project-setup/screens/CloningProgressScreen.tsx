import { useState, useEffect } from 'react';
import type { ScreenName } from '../../../types/project-setup';

interface ScreenProps {
  projectPath: string | null;
  githubRepoUrl: string | null;
  navigate: (screen: ScreenName) => void;
}

export function CloningProgressScreen({ projectPath, githubRepoUrl, navigate }: ScreenProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const unsubscribe = window.api.onCloneProgress(setProgress);

    if (githubRepoUrl && projectPath) {
      window.api.cloneRepository(githubRepoUrl, projectPath).then((result) => {
        if (result.success) {
          navigate('scanning-for-agents');
        } else if (result.error?.type === 'destination-exists') {
          navigate('clone-error-destination-exists');
        } else {
          navigate('clone-error');
        }
      });
    }

    return unsubscribe;
  }, [githubRepoUrl, projectPath, navigate]);

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-background">
      <div className="w-[400px] space-y-6 text-center">
        <div className="animate-spin w-16 h-16 border-4 border-primary border-t-transparent rounded-full mx-auto" />
        <h1 className="text-2xl font-bold">Cloning repository...</h1>
        <div className="w-full bg-secondary rounded-full h-2">
          <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
        </div>
        <p className="text-sm text-muted-foreground">{progress}% complete</p>
      </div>
    </div>
  );
}
