/**
 * Project Store - Zustand state management for projects
 *
 * Manages:
 * - Project CRUD operations
 * - Active project selection
 * - Persistence to localStorage
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Project, ProjectFormData } from '@/types/project';

interface ProjectState {
  projects: Project[];
  activeProjectId: string | null;

  // Actions
  createProject: (data: ProjectFormData) => Project;
  updateProject: (id: string, data: Partial<ProjectFormData>) => void;
  deleteProject: (id: string) => void;
  setActiveProject: (id: string | null) => void;
  getActiveProject: () => Project | undefined;
  getProjectById: (id: string) => Project | undefined;
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
          updatedAt: new Date()
        };

        set((state) => ({
          projects: [...state.projects, newProject],
          activeProjectId: newProject.id // Auto-select new project
        }));

        return newProject;
      },

      updateProject: (id: string, data: Partial<ProjectFormData>) => {
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
      }
    }),
    {
      name: 'automl-projects-storage', // localStorage key
      version: 1
    }
  )
);