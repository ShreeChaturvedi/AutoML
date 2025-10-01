/**
 * Data Store - Zustand state management for uploaded files and datasets
 *
 * Manages:
 * - File uploads and storage
 * - Data preview and statistics
 * - Current active dataset
 * - Query artifacts (saved query results)
 *
 * NOTE: File data is stored in memory for now.
 * TODO: Integrate with backend API for persistence and large file handling.
 */

import { create } from 'zustand';
import type { UploadedFile, DataPreview, QueryArtifact, QueryMode } from '@/types/file';

interface DataState {
  files: UploadedFile[];
  previews: DataPreview[]; // CHANGED: Multiple previews instead of single
  isProcessing: boolean;

  // Query artifacts
  queryArtifacts: QueryArtifact[];
  activeArtifactId: string | null;
  queryCounter: number; // For auto-naming artifacts

  // File tab management (for Data Viewer phase)
  activeFileTabId: string | null; // Can be fileId or artifactId
  fileTabType: 'file' | 'artifact' | null; // Track what type of tab is active

  // File actions
  addFile: (file: UploadedFile) => void;
  removeFile: (id: string) => void;
  getFilesByProject: (projectId: string) => UploadedFile[];
  addPreview: (preview: DataPreview) => void; // CHANGED: Add single preview
  removePreview: (fileId: string) => void;
  getPreviewByFileId: (fileId: string) => DataPreview | undefined;
  setProcessing: (processing: boolean) => void;
  clearProjectData: (projectId: string) => void;

  // Query artifact actions
  createArtifact: (query: string, mode: QueryMode, result: DataPreview, projectId: string, customName?: string) => string;
  updateArtifact: (id: string, updates: Partial<QueryArtifact>) => void;
  removeArtifact: (id: string) => void;
  setActiveArtifact: (id: string | null) => void;
  // NOTE: Use getArtifactsByProject() sparingly - it returns a new array reference.
  // In components, prefer: const all = useDataStore(s => s.queryArtifacts) + useMemo filter
  getArtifactsByProject: (projectId: string) => QueryArtifact[];
  clearProjectArtifacts: (projectId: string) => void;

  // File tab actions
  setActiveFileTab: (id: string | null, type: 'file' | 'artifact' | null) => void;
}

export const useDataStore = create<DataState>((set, get) => ({
  files: [],
  previews: [],
  isProcessing: false,
  queryArtifacts: [],
  activeArtifactId: null,
  queryCounter: 0,
  activeFileTabId: null,
  fileTabType: null,

  // File actions
  addFile: (file: UploadedFile) => {
    set((state) => ({
      files: [...state.files, file]
    }));
  },

  removeFile: (id: string) => {
    set((state) => ({
      files: state.files.filter((f) => f.id !== id),
      previews: state.previews.filter((p) => p.fileId !== id)
    }));
  },

  getFilesByProject: (projectId: string) => {
    return get().files.filter((f) => f.projectId === projectId);
  },

  addPreview: (preview: DataPreview) => {
    set((state) => ({
      previews: [...state.previews.filter((p) => p.fileId !== preview.fileId), preview]
    }));
  },

  removePreview: (fileId: string) => {
    set((state) => ({
      previews: state.previews.filter((p) => p.fileId !== fileId)
    }));
  },

  getPreviewByFileId: (fileId: string) => {
    return get().previews.find((p) => p.fileId === fileId);
  },

  setProcessing: (processing: boolean) => {
    set({ isProcessing: processing });
  },

  clearProjectData: (projectId: string) => {
    const filesToRemove = get().files.filter((f) => f.projectId === projectId);
    const fileIdsToRemove = filesToRemove.map((f) => f.id);
    
    set((state) => ({
      files: state.files.filter((f) => f.projectId !== projectId),
      previews: state.previews.filter((p) => !fileIdsToRemove.includes(p.fileId))
    }));
  },
  
  // Query artifact actions
  createArtifact: (query: string, mode: QueryMode, result: DataPreview, projectId: string, customName?: string) => {
    const state = get();
    const id = `artifact-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const counter = state.queryCounter + 1;
    const name = customName || `Query ${counter}`;
    
    const artifact: QueryArtifact = {
      id,
      name,
      query,
      mode,
      result,
      timestamp: new Date(),
      isSaved: false,
      projectId
    };
    
    set((state) => ({
      queryArtifacts: [...state.queryArtifacts, artifact],
      activeArtifactId: id,
      queryCounter: counter
    }));
    
    return id;
  },
  
  updateArtifact: (id: string, updates: Partial<QueryArtifact>) => {
    set((state) => ({
      queryArtifacts: state.queryArtifacts.map((artifact) =>
        artifact.id === id ? { ...artifact, ...updates } : artifact
      )
    }));
  },
  
  removeArtifact: (id: string) => {
    set((state) => ({
      queryArtifacts: state.queryArtifacts.filter((artifact) => artifact.id !== id),
      activeArtifactId: state.activeArtifactId === id ? null : state.activeArtifactId
    }));
  },
  
  setActiveArtifact: (id: string | null) => {
    set({ activeArtifactId: id });
  },
  
  getArtifactsByProject: (projectId: string) => {
    return get().queryArtifacts.filter((artifact) => artifact.projectId === projectId);
  },
  
  clearProjectArtifacts: (projectId: string) => {
    set((state) => ({
      queryArtifacts: state.queryArtifacts.filter((artifact) => artifact.projectId !== projectId),
      activeArtifactId: state.queryArtifacts.find((a) => a.id === state.activeArtifactId)?.projectId === projectId
        ? null
        : state.activeArtifactId
    }));
  },

  // File tab actions
  setActiveFileTab: (id: string | null, type: 'file' | 'artifact' | null) => {
    set({ activeFileTabId: id, fileTabType: type });
  }
}));