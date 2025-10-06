import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

import { z } from 'zod';

import type { CreateProjectInput, Project } from '../types/project.js';

export interface ProjectRepository {
  list(): Project[];
  getById(id: string): Project | undefined;
  create(input: CreateProjectInput): Project;
  update(id: string, input: Partial<CreateProjectInput>): Project | undefined;
  delete(id: string): boolean;
}

export class InMemoryProjectRepository implements ProjectRepository {
  protected readonly projects = new Map<string, Project>();

  constructor(initialProjects: Project[] = []) {
    initialProjects.forEach((project) => {
      this.projects.set(project.id, project);
    });
  }

  list(): Project[] {
    return Array.from(this.projects.values());
  }

  getById(id: string): Project | undefined {
    return this.projects.get(id);
  }

  create(input: CreateProjectInput): Project {
    const now = new Date().toISOString();
    const project: Project = {
      id: randomUUID(),
      name: input.name,
      description: input.description,
      icon: input.icon ?? 'folder-closed',
      color: input.color ?? 'blue',
      createdAt: now,
      updatedAt: now
    };

    this.projects.set(project.id, project);
    return project;
  }

  update(id: string, input: Partial<CreateProjectInput>): Project | undefined {
    const existing = this.projects.get(id);
    if (!existing) return undefined;

    const updated: Project = {
      ...existing,
      ...input,
      updatedAt: new Date().toISOString()
    };

    this.projects.set(id, updated);
    return updated;
  }

  delete(id: string): boolean {
    return this.projects.delete(id);
  }
}

const storedProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string()
});

const storedProjectsSchema = z.array(storedProjectSchema);

function ensureDirectory(filePath: string) {
  const directory = dirname(filePath);
  if (!existsSync(directory)) {
    mkdirSync(directory, { recursive: true });
  }
}

function loadProjectsFromFile(filePath: string): Project[] {
  if (!existsSync(filePath)) {
    return [];
  }

  try {
    const raw = readFileSync(filePath, 'utf8');
    if (!raw.trim()) return [];
    const parsed = storedProjectsSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) {
      console.warn('[projectRepository] Ignoring invalid storage file contents');
      return [];
    }
    return parsed.data;
  } catch (error) {
    console.error('[projectRepository] Failed to load projects from file', error);
    return [];
  }
}

function persistProjects(filePath: string, projects: Project[]) {
  try {
    ensureDirectory(filePath);
    writeFileSync(filePath, JSON.stringify(projects, null, 2), 'utf8');
  } catch (error) {
    console.error('[projectRepository] Failed to persist projects to file', error);
  }
}

export class FileProjectRepository extends InMemoryProjectRepository {
  private readonly filePath: string;

  constructor(filePath: string) {
    ensureDirectory(filePath);
    const initialProjects = loadProjectsFromFile(filePath);
    super(initialProjects);
    this.filePath = filePath;

    if (!existsSync(filePath)) {
      persistProjects(this.filePath, this.list());
    }
  }

  override create(input: CreateProjectInput): Project {
    const project = super.create(input);
    persistProjects(this.filePath, this.list());
    return project;
  }

  override update(id: string, input: Partial<CreateProjectInput>): Project | undefined {
    const project = super.update(id, input);
    if (project) {
      persistProjects(this.filePath, this.list());
    }
    return project;
  }

  override delete(id: string): boolean {
    const deleted = super.delete(id);
    if (deleted) {
      persistProjects(this.filePath, this.list());
    }
    return deleted;
  }
}

export function createProjectRepository(storagePath: string): ProjectRepository {
  try {
    return new FileProjectRepository(storagePath);
  } catch (error) {
    console.error('[projectRepository] Falling back to in-memory storage', error);
    return new InMemoryProjectRepository();
  }
}
