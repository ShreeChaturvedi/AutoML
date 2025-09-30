/**
 * Tab Store - Zustand state management for workspace tabs
 *
 * Manages:
 * - Tab creation, deletion, reordering
 * - Active tab selection
 * - Tab state persistence
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Tab, TabType } from '@/types/tab';
import { tabTypeConfig } from '@/types/tab';

interface TabState {
  tabs: Tab[];
  activeTabId: string | null;

  // Actions
  createTab: (projectId: string, type: TabType) => Tab;
  closeTab: (id: string) => void;
  setActiveTab: (id: string | null) => void;
  reorderTabs: (startIndex: number, endIndex: number) => void;
  getActiveTab: () => Tab | undefined;
  getTabsByProject: (projectId: string) => Tab[];
  closeAllProjectTabs: (projectId: string) => void;
}

export const useTabStore = create<TabState>()(
  persist(
    (set, get) => ({
      tabs: [],
      activeTabId: null,

      createTab: (projectId: string, type: TabType) => {
        const config = tabTypeConfig[type];
        const existingTabs = get().tabs.filter((t) => t.projectId === projectId);
        const maxOrder = existingTabs.length > 0
          ? Math.max(...existingTabs.map((t) => t.order))
          : -1;

        const newTab: Tab = {
          id: crypto.randomUUID(),
          projectId,
          type,
          title: config.label,
          order: maxOrder + 1,
          createdAt: new Date()
        };

        set((state) => ({
          tabs: [...state.tabs, newTab],
          activeTabId: newTab.id // Auto-select new tab
        }));

        return newTab;
      },

      closeTab: (id: string) => {
        const state = get();
        const closingTab = state.tabs.find((t) => t.id === id);

        if (!closingTab) return;

        // If closing active tab, select another tab from the same project
        let newActiveTabId = state.activeTabId;
        if (state.activeTabId === id) {
          const projectTabs = state.tabs
            .filter((t) => t.projectId === closingTab.projectId && t.id !== id)
            .sort((a, b) => a.order - b.order);

          newActiveTabId = projectTabs.length > 0 ? projectTabs[0].id : null;
        }

        set((state) => ({
          tabs: state.tabs.filter((tab) => tab.id !== id),
          activeTabId: newActiveTabId
        }));
      },

      setActiveTab: (id: string | null) => {
        set({ activeTabId: id });
      },

      reorderTabs: (startIndex: number, endIndex: number) => {
        set((state) => {
          const activeProject = state.tabs.find((t) => t.id === state.activeTabId)?.projectId;
          if (!activeProject) return state;

          // Get tabs for current project
          const projectTabs = state.tabs
            .filter((t) => t.projectId === activeProject)
            .sort((a, b) => a.order - b.order);

          const otherTabs = state.tabs.filter((t) => t.projectId !== activeProject);

          // Reorder
          const [movedTab] = projectTabs.splice(startIndex, 1);
          projectTabs.splice(endIndex, 0, movedTab);

          // Update order property
          projectTabs.forEach((tab, index) => {
            tab.order = index;
          });

          return {
            tabs: [...projectTabs, ...otherTabs]
          };
        });
      },

      getActiveTab: () => {
        const state = get();
        return state.tabs.find((t) => t.id === state.activeTabId);
      },

      getTabsByProject: (projectId: string) => {
        return get()
          .tabs.filter((t) => t.projectId === projectId)
          .sort((a, b) => a.order - b.order);
      },

      closeAllProjectTabs: (projectId: string) => {
        set((state) => ({
          tabs: state.tabs.filter((t) => t.projectId !== projectId),
          activeTabId: null
        }));
      }
    }),
    {
      name: 'automl-tabs-storage',
      version: 1
    }
  )
);