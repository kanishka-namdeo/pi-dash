import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getProjects, addProject, updateProject, removeProject, getRecentProjects } from '../project-manager';
import type { Project } from '../../shared/project-setup-types';
import fs from 'fs';
import path from 'path';
vi.mock('electron', () => ({
  app: {
    getPath: () => '/tmp/test-user-data',
  },
}));

const TEST_PROJECTS_FILE = path.join(__dirname, 'test-projects.json');

describe('Project Manager', () => {
  beforeEach(() => {
    if (fs.existsSync(TEST_PROJECTS_FILE)) {
      fs.unlinkSync(TEST_PROJECTS_FILE);
    }
  });

  afterEach(() => {
    if (fs.existsSync(TEST_PROJECTS_FILE)) {
      fs.unlinkSync(TEST_PROJECTS_FILE);
    }
  });

  it('returns empty array when no projects exist', async () => {
    const projects = await getProjects(TEST_PROJECTS_FILE);
    expect(projects).toEqual([]);
  });

  it('adds a project', async () => {
    const project: Project = {
      path: '/test/project',
      name: 'project',
      addedAt: '2026-08-08T10:00:00Z',
      lastOpenedAt: '2026-08-08T10:00:00Z',
      selectedAgents: ['omp'],
      isGitRepo: true,
    };

    await addProject(project, TEST_PROJECTS_FILE);
    const projects = await getProjects(TEST_PROJECTS_FILE);

    expect(projects).toHaveLength(1);
    expect(projects[0].path).toBe('/test/project');
  });

  it('prevents duplicate projects', async () => {
    const project: Project = {
      path: '/test/project',
      name: 'project',
      addedAt: '2026-08-08T10:00:00Z',
      lastOpenedAt: '2026-08-08T10:00:00Z',
      selectedAgents: ['omp'],
      isGitRepo: true,
    };

    await addProject(project, TEST_PROJECTS_FILE);

    await expect(addProject(project, TEST_PROJECTS_FILE)).rejects.toThrow('PROJECT_ALREADY_EXISTS');
  });

  it('updates a project', async () => {
    const project: Project = {
      path: '/test/project',
      name: 'project',
      addedAt: '2026-08-08T10:00:00Z',
      lastOpenedAt: '2026-08-08T10:00:00Z',
      selectedAgents: ['omp'],
      isGitRepo: true,
    };

    await addProject(project, TEST_PROJECTS_FILE);
    await updateProject('/test/project', { lastOpenedAt: '2026-08-08T14:30:00Z' }, TEST_PROJECTS_FILE);

    const projects = await getProjects(TEST_PROJECTS_FILE);
    expect(projects[0].lastOpenedAt).toBe('2026-08-08T14:30:00Z');
  });

  it('removes a project', async () => {
    const project: Project = {
      path: '/test/project',
      name: 'project',
      addedAt: '2026-08-08T10:00:00Z',
      lastOpenedAt: '2026-08-08T10:00:00Z',
      selectedAgents: ['omp'],
      isGitRepo: true,
    };

    await addProject(project, TEST_PROJECTS_FILE);
    await removeProject('/test/project', TEST_PROJECTS_FILE);

    const projects = await getProjects(TEST_PROJECTS_FILE);
    expect(projects).toHaveLength(0);
  });

  it('returns recent projects sorted by lastOpenedAt', async () => {
    const project1: Project = {
      path: '/test/project1',
      name: 'project1',
      addedAt: '2026-08-07T10:00:00Z',
      lastOpenedAt: '2026-08-07T10:00:00Z',
      selectedAgents: ['omp'],
      isGitRepo: true,
    };

    const project2: Project = {
      path: '/test/project2',
      name: 'project2',
      addedAt: '2026-08-08T10:00:00Z',
      lastOpenedAt: '2026-08-08T14:30:00Z',
      selectedAgents: ['claude-code'],
      isGitRepo: false,
    };

    await addProject(project1, TEST_PROJECTS_FILE);
    await addProject(project2, TEST_PROJECTS_FILE);

    const recent = await getRecentProjects(10, TEST_PROJECTS_FILE);
    expect(recent[0].path).toBe('/test/project2');
    expect(recent[1].path).toBe('/test/project1');
  });
});
