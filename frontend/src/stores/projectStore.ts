/**
 * Project Store - Zustand state management for projects
 *
 * Manages:
 * - Project CRUD operations
 * - Active project selection
 * - Phase progression and workflow management
 * - Persistence to localStorage
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Project, ProjectFormData } from '@/types/project';
import type { Phase } from '@/types/phase';
import { getNextPhase } from '@/types/phase';

interface ProjectState {
  projects: Project[];
  activeProjectId: string | null;

  // Actions
  createProject: (data: ProjectFormData) => Project;
  updateProject: (id: string, data: Partial<Omit<Project, 'id' | 'createdAt' | 'updatedAt'>>) => void;
  deleteProject: (id: string) => void;
  setActiveProject: (id: string | null) => void;
  getActiveProject: () => Project | undefined;
  getProjectById: (id: string) => Project | undefined;

  // Phase management
  setCurrentPhase: (projectId: string, phase: Phase) => void;
  unlockPhase: (projectId: string, phase: Phase) => void;
  completePhase: (projectId: string, phase: Phase) => void;
  isPhaseUnlocked: (projectId: string, phase: Phase) => boolean;
  isPhaseCompleted: (projectId: string, phase: Phase) => boolean;
}

export const useProjectStore = create<ProjectState>()(
  persist(
    (set, get) => ({
      projects: [],
      activeProjectId: null,

      createProject: (data: ProjectFormData) => {
        const newProject: Project = {
          id: crypto.randomUUID(),
          ...data,
          createdAt: new Date(),
          updatedAt: new Date(),
          // Initialize with only upload phase unlocked
          unlockedPhases: ['upload'],
          currentPhase: 'upload',
          completedPhases: []
        };

        set((state) => ({
          projects: [...state.projects, newProject],
          activeProjectId: newProject.id // Auto-select new project
        }));

        return newProject;
      },

      updateProject: (id: string, data: Partial<Omit<Project, 'id' | 'createdAt' | 'updatedAt'>>) => {
        set((state) => ({
          projects: state.projects.map((project) =>
            project.id === id
              ? { ...project, ...data, updatedAt: new Date() }
              : project
          )
        }));
      },

      deleteProject: (id: string) => {
        set((state) => ({
          projects: state.projects.filter((project) => project.id !== id),
          // Clear active project if it's being deleted
          activeProjectId: state.activeProjectId === id ? null : state.activeProjectId
        }));
      },

      setActiveProject: (id: string | null) => {
        set({ activeProjectId: id });
      },

      getActiveProject: () => {
        const state = get();
        return state.projects.find((p) => p.id === state.activeProjectId);
      },

      getProjectById: (id: string) => {
        return get().projects.find((p) => p.id === id);
      },

      // Phase management actions
      setCurrentPhase: (projectId: string, phase: Phase) => {
        set((state) => ({
          projects: state.projects.map((project) =>
            project.id === projectId
              ? { ...project, currentPhase: phase, updatedAt: new Date() }
              : project
          )
        }));
      },

      unlockPhase: (projectId: string, phase: Phase) => {
        set((state) => ({
          projects: state.projects.map((project) => {
            if (project.id !== projectId) return project;

            // Don't add if already unlocked
            if (project.unlockedPhases.includes(phase)) return project;

            return {
              ...project,
              unlockedPhases: [...project.unlockedPhases, phase],
              updatedAt: new Date()
            };
          })
        }));
      },

      completePhase: (projectId: string, phase: Phase) => {
        set((state) => ({
          projects: state.projects.map((project) => {
            if (project.id !== projectId) return project;

            // Mark phase as complete
            const completedPhases = project.completedPhases.includes(phase)
              ? project.completedPhases
              : [...project.completedPhases, phase];

            // Unlock next phase
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
      },

      isPhaseUnlocked: (projectId: string, phase: Phase) => {
        const project = get().projects.find((p) => p.id === projectId);
        return project ? project.unlockedPhases.includes(phase) : false;
      },

      isPhaseCompleted: (projectId: string, phase: Phase) => {
        const project = get().projects.find((p) => p.id === projectId);
        return project ? project.completedPhases.includes(phase) : false;
      }
    }),
    {
      name: 'automl-projects-storage', // localStorage key
      version: 2, // Increment version for migration
      migrate: (persistedState: unknown, version: number) => {
        const state = persistedState as ProjectState;

        // Migrate old projects without phase fields
        if (version < 2) {
          return {
            ...state,
            projects: state.projects.map((project) => ({
              ...project,
              unlockedPhases: project.unlockedPhases || ['upload'],
              currentPhase: project.currentPhase || 'upload',
              completedPhases: project.completedPhases || []
            }))
          };
        }

        return state;
      }
    }
  )
);