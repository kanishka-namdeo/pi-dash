import { useState, useEffect } from 'react';
import type { ScreenName, Project } from '../../../types/project-setup';

interface ScreenProps {
  navigate: (screen: ScreenName) => void;
  updateProject: (path: string) => void;
}

export function RecentProjectsScreen({ navigate, updateProject }: ScreenProps) {
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    window.api.getRecentProjects(10).then(setProjects);
  }, []);

  const handleOpen = (projectPath: string) => {
    updateProject(projectPath);
    navigate('project-loading');
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-background">
      <div className="w-[560px] space-y-6">
        <h1 className="text-3xl font-bold text-center">Select Project</h1>
        <div className="space-y-2">
          {projects.map(project => (
            <div key={project.path} className="flex items-center gap-3 p-4 bg-card border border-border rounded-lg">
              <div className="flex-1">
                <p className="font-medium">{project.name}</p>
                <p className="text-sm text-muted-foreground">{project.path}</p>
              </div>
              <button onClick={() => handleOpen(project.path)} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm">
                Open
              </button>
            </div>
          ))}
        </div>
        <button onClick={() => navigate('project-selection')} className="w-full h-12 border border-border rounded-lg text-muted-foreground">
          + Open Other...
        </button>
      </div>
    </div>
  );
}
