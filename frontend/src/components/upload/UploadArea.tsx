/**
 * UploadArea - File upload component with drag-and-drop
 *
 * Features:
 * - Beautiful empty state with placeholder text and image
 * - Drag-and-drop file upload (react-dropzone)
 * - "+" button for manual file selection
 * - Multiple file support
 * - File type validation
 * - Shows uploaded files as FileCard components
 * - "Go/Proceed" button to move to next step
 *
 * TODO: Integrate with backend API for file upload and storage
 */

import { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Plus, ArrowRight, Cloud } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useDataStore } from '@/stores/dataStore';
import { useProjectStore } from '@/stores/projectStore';
import { useTabStore } from '@/stores/tabStore';
import type { UploadedFile } from '@/types/file';
import { getFileType } from '@/types/file';
import { FileCard } from './FileCard';
import Papa from 'papaparse';

// Accepted file types (context files and data files)
const acceptedFileTypes = {
  // Data files
  'text/csv': ['.csv'],
  'application/json': ['.json'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'application/vnd.ms-excel': ['.xls'],
  // Context/documentation files
  'application/pdf': ['.pdf'],
  'text/markdown': ['.md'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/msword': ['.doc']
};

export function UploadArea() {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const addFile = useDataStore((state) => state.addFile);
  const setPreview = useDataStore((state) => state.setPreview);
  const setProcessing = useDataStore((state) => state.setProcessing);
  const activeProjectId = useProjectStore((state) => state.activeProjectId);
  const projects = useProjectStore((state) => state.projects);
  const activeProject = activeProjectId ? projects.find(p => p.id === activeProjectId) : undefined;
  const createTab = useTabStore((state) => state.createTab);

  const onDrop = (acceptedFiles: File[]) => {
    const newFiles: UploadedFile[] = acceptedFiles.map((file) => ({
      id: crypto.randomUUID(),
      name: file.name,
      type: getFileType(file),
      size: file.size,
      uploadedAt: new Date(),
      projectId: activeProject?.id || '',
      file
    }));

    setUploadedFiles((prev) => [...prev, ...newFiles]);
    newFiles.forEach((file) => addFile(file));
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: acceptedFileTypes,
    multiple: true
  });

  const handleRemoveFile = (fileId: string) => {
    setUploadedFiles((prev) => prev.filter((f) => f.id !== fileId));
    // Also remove from store
    useDataStore.getState().removeFile(fileId);
  };

  const handleProceed = async () => {
    if (uploadedFiles.length === 0) return;

    // For now, let's preview the first CSV file
    const csvFile = uploadedFiles.find((f) => f.type === 'csv');

    if (csvFile) {
      setProcessing(true);

      // Parse CSV with PapaParse - parse entire file to get accurate row count
      Papa.parse(csvFile.file, {
        header: true,
        complete: (results) => {
          const headers = results.meta.fields || [];
          const allRows = results.data as Record<string, unknown>[];

          // Store full row count but only preview first 50 rows
          setPreview({
            fileId: csvFile.id,
            headers,
            rows: allRows.slice(0, 50), // Show first 50 rows for performance
            totalRows: allRows.length, // Accurate total count
            previewRows: Math.min(50, allRows.length)
          });

          setProcessing(false);

          // Switch to data-viewer tab to see the data
          if (activeProject) {
            // Find or create data-viewer tab
            const dataViewerTab = useTabStore
              .getState()
              .tabs.find((t) => t.projectId === activeProject.id && t.type === 'data-viewer');

            if (dataViewerTab) {
              useTabStore.getState().setActiveTab(dataViewerTab.id);
            } else {
              createTab(activeProject.id, 'data-viewer');
            }
          }
        },
        error: (error) => {
          console.error('Error parsing CSV:', error);
          setProcessing(false);
        }
      });
    } else {
      // If no CSV, just create a preprocessing tab
      if (activeProject) {
        createTab(activeProject.id, 'preprocessing');
      }
    }
  };

  return (
    <div className="flex h-full flex-col p-6 space-y-6">
      {/* Upload Area */}
      <div
        {...getRootProps()}
        className={cn(
          'flex flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-12 transition-colors cursor-pointer',
          isDragActive
            ? 'border-primary bg-primary/5'
            : 'border-border hover:border-primary/50 hover:bg-accent/50'
        )}
      >
        <input {...getInputProps()} />

        <div className="flex flex-col items-center text-center space-y-4">
          <div className="rounded-full bg-primary/10 p-4">
            <Cloud className="h-12 w-12 text-primary" />
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-foreground">
              {isDragActive ? 'Drop files here' : 'Upload your data'}
            </h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              Drag and drop your datasets here, or click to browse. Supports CSV, JSON, Excel,
              PDF, Markdown, and Word documents.
            </p>
          </div>

          <Button variant="outline" size="sm" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
            <Plus className="h-4 w-4 mr-2" />
            Select Files
          </Button>
        </div>
      </div>

      {/* Uploaded Files */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">
              Uploaded Files ({uploadedFiles.length})
            </h3>
            <Button onClick={handleProceed} size="sm">
              Proceed to Next Step
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {uploadedFiles.map((file) => (
              <FileCard key={file.id} file={file} onRemove={handleRemoveFile} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}