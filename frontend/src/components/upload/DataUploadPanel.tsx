/**
 * DataUploadPanel - Enhanced file upload interface
 *
 * Features:
 * - Beautiful drag-and-drop area with visual feedback
 * - Multiple file support with file type validation
 * - File cards with preview, type badges, and size display
 * - Remove and preview actions
 * - Proceed button to move to next workflow step
 * - Empty state with clear instructions
 * - Uploaded files organized in responsive grid
 *
 * Design Philosophy:
 * - Professional, polished aesthetic
 * - Clear visual hierarchy
 * - Smooth animations and transitions
 * - Handles edge cases (long file names, many files, etc.)
 *
 * TODO: Backend integration for file storage
 */

import { useState, useEffect, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Database, FileStack } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useDataStore } from '@/stores/dataStore';
import { useProjectStore } from '@/stores/projectStore';
import { ContinueButton } from '@/components/layout/ContinueButton';
import { getDuckDB } from '@/lib/duckdb';
import type { UploadedFile } from '@/types/file';
import { getFileType } from '@/types/file';
import { FileCard } from './FileCard';
import Papa from 'papaparse';
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
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isParsingFiles, setIsParsingFiles] = useState(false);
  const addFile = useDataStore((state) => state.addFile);
  const setFileMetadata = useDataStore((state) => state.setFileMetadata);
  const projects = useProjectStore((state) => state.projects);
  const project = projects.find(p => p.id === projectId);
  const [datasetUploadStatus, setDatasetUploadStatus] = useState<Record<string, 'uploading' | 'uploaded' | 'error'>>({});
  const [datasetUploadErrors, setDatasetUploadErrors] = useState<Record<string, string>>({});

  const onDrop = (acceptedFiles: File[]) => {
    const newFiles: UploadedFile[] = acceptedFiles.map((file) => ({
      id: crypto.randomUUID(),
      name: file.name,
      type: getFileType(file),
      size: file.size,
      uploadedAt: new Date(),
      projectId: projectId,
      file
    }));

    setUploadedFiles((prev) => [...prev, ...newFiles]);
    newFiles.forEach((file) => addFile(file));

    newFiles
      .filter((file) => ['csv', 'json', 'excel'].includes(file.type))
      .forEach((file) => {
        void uploadDatasetToBackend(file);
      });
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: acceptedFileTypes,
    multiple: true
  });

  const handleRemoveFile = (fileId: string) => {
    setUploadedFiles((prev) => prev.filter((f) => f.id !== fileId));
    useDataStore.getState().removeFile(fileId);
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
  };

  const uploadDatasetToBackend = useCallback(
    async (file: UploadedFile) => {
      setDatasetUploadStatus((prev) => ({ ...prev, [file.id]: 'uploading' }));
      setDatasetUploadErrors((prev) => {
        const next = { ...prev };
        delete next[file.id];
        return next;
      });

      try {
        const response = await uploadDatasetFile(file.file, projectId);
        const dataset = response.dataset;

        setDatasetUploadStatus((prev) => ({ ...prev, [file.id]: 'uploaded' }));
        setFileMetadata(file.id, {
          datasetId: dataset.datasetId,
          rowCount: dataset.n_rows,
          columnCount: dataset.n_cols,
          columns: dataset.columns,
          datasetProfile: {
            nRows: dataset.n_rows,
            nCols: dataset.n_cols,
            dtypes: dataset.dtypes,
            nullCounts: dataset.null_counts
          }
        });
      } catch (error) {
        console.error(`Failed to sync ${file.name} with backend`, error);
        setDatasetUploadStatus((prev) => ({ ...prev, [file.id]: 'error' }));
        const message = error instanceof Error ? error.message : 'Failed to upload dataset';
        setDatasetUploadErrors((prev) => ({ ...prev, [file.id]: message }));
      }
    },
    [projectId, setFileMetadata]
  );

  // Automatically parse CSV files when uploaded
  useEffect(() => {
    const csvFiles = uploadedFiles.filter((f) => f.type === 'csv');

    if (csvFiles.length > 0) {
      setIsParsingFiles(true);
      const addPreview = useDataStore.getState().addPreview;

      // Parse all CSVs
      const parsePromises = csvFiles.map((csvFile) => {
        // Check if already parsed
        const existingPreview = useDataStore.getState().previews.find(
          (p) => p.fileId === csvFile.id
        );

        if (existingPreview) {
          return Promise.resolve();
        }

        return new Promise<void>((resolve) => {
          Papa.parse(csvFile.file, {
            header: true,
            complete: async (results) => {
              const headers = results.meta.fields || [];
              const allRows = results.data as Record<string, unknown>[];

              addPreview({
                fileId: csvFile.id,
                headers,
                rows: allRows.slice(0, 50),
                totalRows: allRows.length,
                previewRows: Math.min(50, allRows.length)
              });

              // Load table into DuckDB for querying
              try {
                const duckdb = getDuckDB();
                await duckdb.loadTable(csvFile.id, csvFile.file);
                console.log(`Loaded ${csvFile.name} into DuckDB`);
              } catch (error) {
                console.error(`Failed to load ${csvFile.name} into DuckDB:`, error);
                // Continue anyway - preview will still work
              }

              resolve();
            },
            error: (error) => {
              console.error(`Error parsing CSV ${csvFile.name}:`, error);
              resolve();
            }
          });
        });
      });

      // Wait for all CSVs to parse
      Promise.all(parsePromises).then(() => {
        setIsParsingFiles(false);

        // Create initial artifacts for each CSV
        const createArtifact = useDataStore.getState().createArtifact;
        const previews = useDataStore.getState().previews;

        csvFiles.forEach((csvFile) => {
          const preview = previews.find((p) => p.fileId === csvFile.id);
          if (preview && project) {
            const duckdb = getDuckDB();
            const tableMetadata = duckdb.getTableByFileId(csvFile.id);
            const tableName = tableMetadata?.tableName || csvFile.name.replace(/\.[^/.]+$/, '');
            const query = `-- Preview of ${csvFile.name}\nSELECT * FROM ${tableName} LIMIT ${preview.previewRows}`;

            // Check if artifact already exists
            const existingArtifact = useDataStore.getState().queryArtifacts.find(
              (a) => a.name === csvFile.name && a.projectId === project.id
            );

            if (!existingArtifact) {
              createArtifact(query, 'sql', preview, project.id, csvFile.name);
            }
          }
        });
      });
    }
  }, [uploadedFiles, project]);

  // Count file types
  const dataFiles = uploadedFiles.filter(f => ['csv', 'json', 'excel'].includes(f.type));
  const contextFiles = uploadedFiles.filter(f => ['pdf', 'other'].includes(f.type));
  const isUploadingDatasets = Object.values(datasetUploadStatus).some((status) => status === 'uploading');

  return (
    <Card data-testid="data-upload-panel" className="h-full flex flex-col border-0 shadow-none">
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
          {uploadedFiles.length > 0 && !isParsingFiles && !isUploadingDatasets && (
            <ContinueButton
              currentPhase="upload"
              projectId={projectId}
              disabled={false}
            />
          )}
          {(isParsingFiles || isUploadingDatasets) && (
            <Badge variant="secondary" className="text-xs">
              {isUploadingDatasets ? 'Syncing datasets with backend...' : 'Parsing files...'}
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
        {uploadedFiles.length > 0 && (
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
                {uploadedFiles.length} total
              </span>
            </div>

            {/* File Grid - Scrollable */}
            <div className="flex-1 overflow-y-auto scrollbar-hide">
              <div className="grid grid-cols-1 gap-3">
                {uploadedFiles.map((file) => (
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
