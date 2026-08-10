import { describe, it, expect } from 'vitest';
import type { ScreenName, ProjectSetupState, Project } from '../project-setup';

describe('Project Setup Types', () => {
  it('defines all 17 screen names', () => {
    const screens: ScreenName[] = [
      'project-selection',
      'project-selection-github-connected',
      'recent-projects',
      'recent-projects-empty',
      'recent-projects-loading',
      'project-already-added',
      'clone-repository',
      'clone-repository-validation-error',
      'cloning-progress',
      'clone-error',
      'clone-error-destination-exists',
      'github-repo-picker',
      'project-loading',
      'scanning-for-agents',
      'select-agents',
      'not-a-git-repository',
      'no-agents-found',
    ];
    expect(screens).toHaveLength(17);
  });

  it('defines Project interface', () => {
    const project: Project = {
      path: '/test/project',
      name: 'project',
      addedAt: '2026-08-08T10:00:00Z',
      lastOpenedAt: '2026-08-08T14:30:00Z',
      selectedAgents: ['omp', 'claude-code'],
      isGitRepo: true,
      projectAgents: [],
    };
    expect(project.path).toBe('/test/project');
  });
});
