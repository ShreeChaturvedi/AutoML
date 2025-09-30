/**
 * Data Store - Zustand state management for uploaded files and datasets
 *
 * Manages:
 * - File uploads and storage
 * - Data preview and statistics
 * - Current active dataset
 *
 * NOTE: File data is stored in memory for now.
 * TODO: Integrate with backend API for persistence and large file handling.
 */

import { create } from 'zustand';
import type { UploadedFile, DataPreview } from '@/types/file';

interface DataState {
  files: UploadedFile[];
  currentPreview: DataPreview | null;
  isProcessing: boolean;

  // Actions
  addFile: (file: UploadedFile) => void;
  removeFile: (id: string) => void;
  getFilesByProject: (projectId: string) => UploadedFile[];
  setPreview: (preview: DataPreview | null) => void;
  setProcessing: (processing: boolean) => void;
  clearProjectData: (projectId: string) => void;
}

export const useDataStore = create<DataState>((set, get) => ({
  files: [],
  currentPreview: null,
  isProcessing: false,

  addFile: (file: UploadedFile) => {
    set((state) => ({
      files: [...state.files, file]
    }));
  },

  removeFile: (id: string) => {
    set((state) => ({
      files: state.files.filter((f) => f.id !== id),
      // Clear preview if it's for this file
      currentPreview: state.currentPreview?.fileId === id ? null : state.currentPreview
    }));
  },

  getFilesByProject: (projectId: string) => {
    return get().files.filter((f) => f.projectId === projectId);
  },

  setPreview: (preview: DataPreview | null) => {
    set({ currentPreview: preview });
  },

  setProcessing: (processing: boolean) => {
    set({ isProcessing: processing });
  },

  clearProjectData: (projectId: string) => {
    set((state) => ({
      files: state.files.filter((f) => f.projectId !== projectId),
      currentPreview: state.currentPreview?.fileId &&
        state.files.find((f) => f.id === state.currentPreview?.fileId)?.projectId === projectId
        ? null
        : state.currentPreview
    }));
  }
}));