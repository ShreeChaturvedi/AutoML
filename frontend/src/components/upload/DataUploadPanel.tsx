/**
 * DataUploadPanel - Backend-integrated file upload interface
 *
 * Features:
 * - Drag-and-drop upload with backend persistence
 * - Automatic dataset upload to Postgres
 * - File hydration on mount (loads persisted files)
 * - Upload status tracking
 * - Delete with backend sync
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Database, FileStack } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useDataStore } from '@/stores/dataStore';
import type { UploadedFile } from '@/types/file';
import { getFileType } from '@/types/file';
import { FileCard } from './FileCard';
import { uploadDatasetFile } from '@/lib/api/datasets';

// Accepted file types (data files and context documents only - NO images)
const acceptedFileTypes = {
  // Data files
  'text/csv': ['.csv'],
  'application/json': ['.json'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'application/vnd.ms-excel': ['.xls'],
  // Context/documentation files (for RAG and business context)
  'application/pdf': ['.pdf'],
  'text/markdown': ['.md'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/msword': ['.doc'],
  'text/plain': ['.txt']
};

interface DataUploadPanelProps {
  projectId: string;
}

export function DataUploadPanel({ projectId }: DataUploadPanelProps) {
  const [datasetUploadStatus, setDatasetUploadStatus] = useState<Record<string, 'uploading' | 'uploaded' | 'error'>>({});
  const [datasetUploadErrors, setDatasetUploadErrors] = useState<Record<string, string>>({});

  const addFile = useDataStore((state) => state.addFile);
  const setFileMetadata = useDataStore((state) => state.setFileMetadata);
  const hydrateFromBackend = useDataStore((state) => state.hydrateFromBackend);
  const allFiles = useDataStore((state) => state.files);

  // Filter files for this project using useMemo to avoid infinite loops
  const projectFiles = useMemo(
    () => allFiles.filter((file) => file.projectId === projectId),
    [allFiles, projectId]
  );

  // Hydrate files from backend on mount
  useEffect(() => {
    if (projectId) {
      void hydrateFromBackend(projectId);
    }
  }, [projectId, hydrateFromBackend]);

  // Upload dataset files to backend
  const uploadDatasetToBackend = useCallback(
    async (file: UploadedFile) => {
      setDatasetUploadStatus((prev) => ({ ...prev, [file.id]: 'uploading' }));

      try {
        const response = await uploadDatasetFile(file.file!, projectId);
        const dataset = response.dataset;

        // Update file metadata with backend info
        setFileMetadata(file.id, {
          datasetId: dataset.datasetId,
          tableName: dataset.tableName,
          rowCount: dataset.n_rows,
          columnCount: dataset.n_cols,
          columns: dataset.columns
        });

        setDatasetUploadStatus((prev) => ({ ...prev, [file.id]: 'uploaded' }));
        console.log(`[DataUploadPanel] ✅ Uploaded ${file.name} to backend`);
      } catch (error) {
        console.error(`[DataUploadPanel] Failed to upload ${file.name}:`, error);
        setDatasetUploadStatus((prev) => ({ ...prev, [file.id]: 'error' }));
        setDatasetUploadErrors((prev) => ({
          ...prev,
          [file.id]: error instanceof Error ? error.message : 'Upload failed'
        }));
      }
    },
    [projectId, setFileMetadata]
  );

  // Handle file drop
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const newFiles: UploadedFile[] = acceptedFiles.map((file) => ({
        id: crypto.randomUUID(),
        name: file.name,
        type: getFileType(file),
        size: file.size,
        uploadedAt: new Date(),
        projectId: projectId,
        file
      }));

      // Add to store
      newFiles.forEach((file) => {
        addFile(file);
        // Auto-upload dataset files
        if (['csv', 'json', 'excel'].includes(file.type)) {
          void uploadDatasetToBackend(file);
        }
      });
    },
    [projectId, addFile, uploadDatasetToBackend]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: acceptedFileTypes,
    multiple: true
  });

  const handleRemoveFile = async (fileId: string) => {
    try {
      await useDataStore.getState().deleteFile(fileId);
      setDatasetUploadStatus((prev) => {
        const next = { ...prev };
        delete next[fileId];
        return next;
      });
      setDatasetUploadErrors((prev) => {
        const next = { ...prev };
        delete next[fileId];
        return next;
      });
    } catch (error) {
      console.error('[DataUploadPanel] Failed to delete file:', error);
      setDatasetUploadErrors((prev) => ({
        ...prev,
        [fileId]: 'Failed to delete file from server'
      }));
    }
  };

  // Count file types
  const dataFiles = projectFiles.filter(f => ['csv', 'json', 'excel'].includes(f.type));
  const contextFiles = projectFiles.filter(f => ['pdf', 'markdown', 'word', 'text', 'other'].includes(f.type));
  const isUploading = Object.values(datasetUploadStatus).some(status => status === 'uploading');

  return (
    <Card className="h-full flex flex-col border-0 shadow-none">
      <CardHeader className="space-y-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-primary/10 p-2">
              <Database className="h-5 w-5 text-primary" />
            </div>
            <div className="space-y-0.5">
              <CardTitle className="text-lg font-semibold">Data Upload</CardTitle>
              <CardDescription className="text-xs">
                Upload datasets and documentation for your project
              </CardDescription>
            </div>
          </div>
          {isUploading && (
            <Badge variant="secondary" className="text-xs">
              Uploading...
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col space-y-4 pt-0 overflow-hidden">
        {/* Drag and Drop Area */}
        <div
          {...getRootProps()}
          className={cn(
            'flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 transition-all duration-200 cursor-pointer group',
            isDragActive
              ? 'border-primary bg-primary/10 scale-[1.02]'
              : 'border-border hover:border-primary/60 hover:bg-accent/30'
          )}
        >
          <input {...getInputProps()} />

          <div className="flex flex-col items-center text-center space-y-4">
            {/* Icon */}
            <div
              className={cn(
                'rounded-2xl p-4 transition-all duration-200',
                isDragActive
                  ? 'bg-primary/20 scale-110'
                  : 'bg-primary/10 group-hover:bg-primary/15 group-hover:scale-105'
              )}
            >
              {isDragActive ? (
                <Upload className="h-10 w-10 text-primary animate-bounce" />
              ) : (
                <FileStack className="h-10 w-10 text-primary" />
              )}
            </div>

            {/* Text */}
            <div className="space-y-2 max-w-md">
              <h3 className="text-base font-semibold text-foreground">
                {isDragActive ? 'Drop your files here' : 'Upload your files'}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Drag and drop files here, or click anywhere in this area to browse. Supports CSV, JSON, Excel for data and PDF, Markdown, Word for context documents.
              </p>
            </div>
          </div>
        </div>

        {/* Uploaded Files Section */}
        {projectFiles.length > 0 && (
          <div className="flex-1 flex flex-col space-y-3 min-h-0">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h3 className="text-sm font-semibold text-foreground">Uploaded Files</h3>
                <div className="flex items-center gap-2">
                  {dataFiles.length > 0 && (
                    <Badge variant="secondary" className="text-xs font-medium">
                      {dataFiles.length} data
                    </Badge>
                  )}
                  {contextFiles.length > 0 && (
                    <Badge variant="outline" className="text-xs font-medium">
                      {contextFiles.length} context
                    </Badge>
                  )}
                </div>
              </div>
              <span className="text-xs text-muted-foreground">
                {projectFiles.length} total
              </span>
            </div>

            {/* File Grid - Scrollable */}
            <div className="flex-1 overflow-y-auto scrollbar-hide">
              <div className="grid grid-cols-1 gap-3">
                {projectFiles.map((file) => (
                  <FileCard
                    key={file.id}
                    file={file}
                    onRemove={handleRemoveFile}
                    status={datasetUploadStatus[file.id]}
                    errorMessage={datasetUploadErrors[file.id]}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
