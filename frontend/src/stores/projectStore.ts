import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import {
  createProject as apiCreateProject,
  deleteProject as apiDeleteProject,
  listProjects as apiListProjects,
  updateProject as apiUpdateProject
} from '@/lib/api/projects';
import type { ApiProject, ApiProjectMetadata, ApiProjectPayload } from '@/lib/api/projects';
import { getAllPhasesSorted, getNextPhase } from '@/types/phase';
import type { Phase } from '@/types/phase';
import type { Project, ProjectFormData, ProjectColor } from '@/types/project';
import { projectColorClasses } from '@/types/project';

interface ProjectState {
  projects: Project[];
  activeProjectId: string | null;
  isInitialized: boolean;
  isLoading: boolean;
  error?: string;

  initialize: () => Promise<void>;
  createProject: (data: ProjectFormData) => Promise<Project>;
  updateProject: (id: string, data: Partial<Omit<Project, 'id' | 'createdAt' | 'updatedAt'>>) => Promise<Project | undefined>;
  deleteProject: (id: string) => Promise<void>;
  setActiveProject: (id: string | null) => void;
  getActiveProject: () => Project | undefined;
  getProjectById: (id: string) => Project | undefined;

  setCurrentPhase: (projectId: string, phase: Phase) => void;
  unlockPhase: (projectId: string, phase: Phase) => void;
  completePhase: (projectId: string, phase: Phase) => void;
  isPhaseUnlocked: (projectId: string, phase: Phase) => boolean;
  isPhaseCompleted: (projectId: string, phase: Phase) => boolean;
}

const DEFAULT_PHASE_STATE = {
  unlockedPhases: ['upload'] as Phase[],
  currentPhase: 'upload' as Phase,
  completedPhases: [] as Phase[]
};

const ALL_PHASES = getAllPhasesSorted();

function isValidPhase(value: unknown): value is Phase {
  return typeof value === 'string' && (ALL_PHASES as readonly string[]).includes(value as string);
}

function normalizePhaseList(list?: Phase[]): Phase[] {
  if (!Array.isArray(list)) return [];
  const seen = new Set<Phase>();
  list.forEach((value) => {
    if (isValidPhase(value)) {
      seen.add(value);
    }
  });
  return ALL_PHASES.filter((phase) => seen.has(phase));
}

function buildPhaseState(metadata?: ApiProjectMetadata) {
  const unlocked = normalizePhaseList(metadata?.unlockedPhases);
  const completed = normalizePhaseList(metadata?.completedPhases).filter((phase) => unlocked.includes(phase));
  const current = isValidPhase(metadata?.currentPhase)
    ? (metadata?.currentPhase as Phase)
    : DEFAULT_PHASE_STATE.currentPhase;

  if (!unlocked.includes(DEFAULT_PHASE_STATE.currentPhase)) {
    unlocked.push(DEFAULT_PHASE_STATE.currentPhase);
  }
  if (!unlocked.includes(current)) {
    unlocked.push(current);
  }

  return {
    unlockedPhases: unlocked.length > 0 ? unlocked : [...DEFAULT_PHASE_STATE.unlockedPhases],
    completedPhases: completed,
    currentPhase: current
  };
}

function isProjectColor(value: unknown): value is ProjectColor {
  return (
    typeof value === 'string' &&
    Object.prototype.hasOwnProperty.call(projectColorClasses, value)
  );
}

function normalizeProject(apiProject: ApiProject): Project {
  const phaseState = buildPhaseState(apiProject.metadata);

  return {
    id: apiProject.id,
    title: apiProject.name,
    description: apiProject.description,
    icon: apiProject.icon ?? 'Folder',
    color: isProjectColor(apiProject.color) ? apiProject.color : 'blue',
    createdAt: new Date(apiProject.createdAt),
    updatedAt: new Date(apiProject.updatedAt),
    ...phaseState,
    metadata: apiProject.metadata ? { ...apiProject.metadata } : {}
  };
}

function toApiMetadata(project: Project): ApiProjectMetadata {
  const metadata: ApiProjectMetadata = {
    ...(project.metadata ?? {}),
    unlockedPhases: [...project.unlockedPhases],
    completedPhases: [...project.completedPhases],
    currentPhase: project.currentPhase
  };

  return metadata;
}

function toCreatePayload(form: ProjectFormData): ApiProjectPayload {
  return {
    name: form.title,
    description: form.description,
    icon: form.icon,
    color: form.color,
    metadata: {
      ...DEFAULT_PHASE_STATE
    }
  };
}

export const useProjectStore = create<ProjectState>()(
  persist(
    (set, get) => {
      const syncProjectMetadata = async (projectId: string) => {
        const project = get().projects.find((item) => item.id === projectId);
        if (!project) return;

        try {
          await apiUpdateProject(projectId, {
            metadata: toApiMetadata(project)
          });
        } catch (error) {
          console.error('Failed to sync project metadata', error);
          set({ error: 'Failed to sync project metadata' });
        }
      };

      return {
        projects: [],
        activeProjectId: null,
        isInitialized: false,
        isLoading: false,
        error: undefined,

        async initialize() {
          const state = get();
          if (state.isLoading) {
            return;
          }

          if (state.isInitialized && !state.error) {
            return;
          }

          set({ isLoading: true, error: undefined });

          try {
            const { projects } = await apiListProjects();
            const normalized = projects.map(normalizeProject);
            const currentActive = get().activeProjectId;
            set({
              projects: normalized,
              activeProjectId: currentActive ?? normalized[0]?.id ?? null,
              isInitialized: true,
              isLoading: false,
              error: undefined
            });
          } catch (error) {
            console.error('Failed to load projects', error);
            set({
              isInitialized: true,
              isLoading: false,
              error: 'Unable to load projects from backend'
            });
          }
        },

        async createProject(data) {
          set({ error: undefined });

          try {
            const response = await apiCreateProject(toCreatePayload(data));
            const project = normalizeProject(response.project);

            set((state) => ({
              projects: [...state.projects, project],
              activeProjectId: project.id
            }));

            return project;
          } catch (error) {
            console.error('Failed to create project', error);
            set({ error: 'Unable to create project' });
            throw error;
          }
        },

        async updateProject(id, data) {
          const existing = get().projects.find((project) => project.id === id);
          if (!existing) {
            return undefined;
          }

          set({ error: undefined });

          const payload: Partial<ApiProjectPayload> = {
            name: data.title ?? existing.title,
            description: data.description ?? existing.description,
            icon: data.icon ?? existing.icon,
            color: (data.color ?? existing.color) as ProjectColor,
            metadata: toApiMetadata({ ...existing, ...data })
          };

          try {
            const response = await apiUpdateProject(id, payload);
            const project = normalizeProject(response.project);

            set((state) => ({
              projects: state.projects.map((item) => (item.id === id ? project : item))
            }));

            return project;
          } catch (error) {
            console.error('Failed to update project', error);
            set({ error: 'Unable to update project' });
            throw error;
          }
        },

        async deleteProject(id) {
          set({ error: undefined });

          try {
            await apiDeleteProject(id);
            set((state) => {
              const remaining = state.projects.filter((project) => project.id !== id);
              const nextActive = state.activeProjectId === id ? remaining[0]?.id ?? null : state.activeProjectId;
              return {
                projects: remaining,
                activeProjectId: nextActive
              };
            });
          } catch (error) {
            console.error('Failed to delete project', error);
            set({ error: 'Unable to delete project' });
            throw error;
          }
        },

        setActiveProject(id) {
          set({ activeProjectId: id });
        },

        getActiveProject() {
          const state = get();
          return state.projects.find((project) => project.id === state.activeProjectId);
        },

        getProjectById(id) {
          return get().projects.find((project) => project.id === id);
        },

        setCurrentPhase(projectId, phase) {
          set((state) => ({
            projects: state.projects.map((project) =>
              project.id === projectId
                ? { ...project, currentPhase: phase, updatedAt: new Date() }
                : project
            )
          }));

          void syncProjectMetadata(projectId);
        },

        unlockPhase(projectId, phase) {
          set((state) => ({
            projects: state.projects.map((project) => {
              if (project.id !== projectId) return project;
              if (project.unlockedPhases.includes(phase)) return project;

              return {
                ...project,
                unlockedPhases: [...project.unlockedPhases, phase],
                updatedAt: new Date()
              };
            })
          }));

          void syncProjectMetadata(projectId);
        },

        completePhase(projectId, phase) {
          set((state) => ({
            projects: state.projects.map((project) => {
              if (project.id !== projectId) return project;

              const completedPhases = project.completedPhases.includes(phase)
                ? project.completedPhases
                : [...project.completedPhases, phase];

              const nextPhase = getNextPhase(phase);
              const unlockedPhases = nextPhase && !project.unlockedPhases.includes(nextPhase)
                ? [...project.unlockedPhases, nextPhase]
                : project.unlockedPhases;

              return {
                ...project,
                completedPhases,
                unlockedPhases,
                updatedAt: new Date()
              };
            })
          }));

          void syncProjectMetadata(projectId);
        },

        isPhaseUnlocked(projectId, phase) {
          const project = get().projects.find((p) => p.id === projectId);
          return project ? project.unlockedPhases.includes(phase) : false;
        },

        isPhaseCompleted(projectId, phase) {
          const project = get().projects.find((p) => p.id === projectId);
          return project ? project.completedPhases.includes(phase) : false;
        }
      };
    },
    {
      name: 'automl-projects-storage',
      partialize: (state) => ({
        projects: state.projects,
        activeProjectId: state.activeProjectId
      }),
      version: 3,
      migrate: (persistedState: unknown) => {
        const state = persistedState as Partial<ProjectState> | undefined;
        if (!state) return { projects: [], activeProjectId: null };
        return state;
      }
    }
  )
);
