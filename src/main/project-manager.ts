import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import log from './logger';
import type { Project } from '../../renderer/src/types/project-setup';

const DEFAULT_PROJECTS_FILE = path.join(app.getPath('userData'), 'projects.json');

interface ProjectsFile {
  version: number;
  projects: Project[];
}

async function readProjectsFile(filePath: string = DEFAULT_PROJECTS_FILE): Promise<ProjectsFile> {
  try {
    if (!fs.existsSync(filePath)) {
      return { version: 1, projects: [] };
    }
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    log.error('project-manager', 'Failed to read projects.json', error);
    return { version: 1, projects: [] };
  }
}

async function writeProjectsFile(data: ProjectsFile, filePath: string = DEFAULT_PROJECTS_FILE): Promise<void> {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

export async function getProjects(filePath: string = DEFAULT_PROJECTS_FILE): Promise<Project[]> {
  const data = await readProjectsFile(filePath);
  return data.projects;
}

export async function addProject(project: Project, filePath: string = DEFAULT_PROJECTS_FILE): Promise<void> {
  const data = await readProjectsFile(filePath);

  if (data.projects.some(p => p.path === project.path)) {
    throw new Error('PROJECT_ALREADY_EXISTS');
  }

  data.projects.push(project);
  await writeProjectsFile(data, filePath);
}

export async function updateProject(
  path: string,
  updates: Partial<Project>,
  filePath: string = DEFAULT_PROJECTS_FILE
): Promise<void> {
  const data = await readProjectsFile(filePath);
  const index = data.projects.findIndex(p => p.path === path);

  if (index === -1) {
    throw new Error('PROJECT_NOT_FOUND');
  }

  data.projects[index] = { ...data.projects[index], ...updates };
  await writeProjectsFile(data, filePath);
}

export async function removeProject(path: string, filePath: string = DEFAULT_PROJECTS_FILE): Promise<void> {
  const data = await readProjectsFile(filePath);
  data.projects = data.projects.filter(p => p.path !== path);
  await writeProjectsFile(data, filePath);
}

export async function getRecentProjects(
  limit: number = 10,
  filePath: string = DEFAULT_PROJECTS_FILE
): Promise<Project[]> {
  const projects = await getProjects(filePath);
  return projects
    .sort((a, b) => new Date(b.lastOpenedAt).getTime() - new Date(a.lastOpenedAt).getTime())
    .slice(0, limit);
}
