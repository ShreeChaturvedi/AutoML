import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

import { z } from 'zod';

import type { CreateProjectInput, Project, ProjectMetadata, PhaseValue } from '../types/project.js';

export interface ProjectRepository {
  list(): Project[];
  getById(id: string): Project | undefined;
  create(input: CreateProjectInput): Project;
  update(id: string, input: Partial<CreateProjectInput>): Project | undefined;
  delete(id: string): boolean;
  clear(): void;
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
      updatedAt: now,
      metadata: sanitizeMetadata(input.metadata)
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
      metadata: sanitizeMetadata({ ...existing.metadata, ...input.metadata }),
      updatedAt: new Date().toISOString()
    };

    this.projects.set(id, updated);
    return updated;
  }

  delete(id: string): boolean {
    return this.projects.delete(id);
  }

  clear(): void {
    this.projects.clear();
  }
}

export const PHASE_VALUES = [
  'upload',
  'data-viewer',
  'preprocessing',
  'feature-engineering',
  'training',
  'experiments',
  'deployment',
  'chat'
] as const satisfies readonly PhaseValue[];

const phaseSchema = z.enum(PHASE_VALUES);

const metadataSchema = z
  .object({
    unlockedPhases: z.array(phaseSchema).optional(),
    completedPhases: z.array(phaseSchema).optional(),
    currentPhase: phaseSchema.optional(),
    customInstructions: z.string().max(5000).optional()
  })
  .catchall(z.unknown())
  .optional();

const storedProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  metadata: metadataSchema
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
    return parsed.data.map((project) => ({
      ...project,
      metadata: sanitizeMetadata(project.metadata)
    }));
  } catch (error) {
    console.error('[projectRepository] Failed to load projects from file', error);
    return [];
  }
}

function persistProjects(filePath: string, projects: Project[]) {
  try {
    ensureDirectory(filePath);
    const sanitized = projects.map((project) => ({
      ...project,
      metadata: sanitizeMetadata(project.metadata)
    }));
    writeFileSync(filePath, JSON.stringify(sanitized, null, 2), 'utf8');
  } catch (error) {
    console.error('[projectRepository] Failed to persist projects to file', error);
  }
}

const DEFAULT_METADATA: Required<ProjectMetadata> = {
  unlockedPhases: ['upload'],
  completedPhases: [],
  currentPhase: 'upload',
  customInstructions: ''
};

function sanitizeMetadata(metadata?: ProjectMetadata): ProjectMetadata {
  const unlocked = Array.isArray(metadata?.unlockedPhases)
    ? metadata?.unlockedPhases.filter(isValidPhase)
    : DEFAULT_METADATA.unlockedPhases;

  const completed = Array.isArray(metadata?.completedPhases)
    ? metadata?.completedPhases.filter((phase) => isValidPhase(phase) && unlocked.includes(phase))
    : DEFAULT_METADATA.completedPhases;

  const current = isValidPhase(metadata?.currentPhase)
    ? metadata?.currentPhase
    : DEFAULT_METADATA.currentPhase;

  const customInstructions = typeof metadata?.customInstructions === 'string'
    ? metadata?.customInstructions
    : DEFAULT_METADATA.customInstructions;

  return {
    ...metadata,
    unlockedPhases: Array.from(new Set([...unlocked, current, DEFAULT_METADATA.currentPhase])),
    completedPhases: completed,
    currentPhase: current,
    customInstructions
  };
}

function isValidPhase(value: unknown): value is PhaseValue {
  return typeof value === 'string' && PHASE_VALUES.includes(value as PhaseValue);
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

  override clear(): void {
    super.clear();
    persistProjects(this.filePath, this.list());
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
