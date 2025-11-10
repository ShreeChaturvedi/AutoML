/**
 * File type definitions for data upload and management
 *
 * Supports various file types:
 * - Structured data: CSV, JSON, Excel
 * - Documents: PDF, Markdown, Word (for business context via RAG)
 * - Note: Images are NOT supported for upload
 */

export type FileType =
  | 'csv'
  | 'json'
  | 'excel'
  | 'pdf'
  | 'markdown'
  | 'word'
  | 'text'
  | 'other';

export interface UploadedFile {
  id: string;
  name: string;
  type: FileType;
  size: number; // in bytes
  uploadedAt: Date;
  projectId: string;
  file: File; // Original File object for processing
  previewUrl?: string; // For images and PDFs
  metadata?: FileMetadata;
}

/**
 * File metadata for different types
 */
export interface FileMetadata {
  // CSV/JSON/Excel specific
  rowCount?: number;
  columnCount?: number;
  columns?: string[];
  datasetId?: string;
  datasetProfile?: {
    nRows: number;
    nCols: number;
    dtypes: Record<string, string>;
    nullCounts: Record<string, number>;
  };

  // PDF specific
  pageCount?: number;

  // Image specific
  dimensions?: {
    width: number;
    height: number;
  };

  // General
  mimeType?: string;
  encoding?: string;
}

/**
 * Data preview for tabular files
 */
export interface DataPreview {
  fileId: string;
  headers: string[];
  rows: Record<string, unknown>[]; // Array of row objects
  totalRows: number;
  previewRows: number; // Number of rows in preview
  statistics?: ColumnStatistics[];
}

/**
 * Column statistics for data exploration
 */
export interface ColumnStatistics {
  columnName: string;
  dataType: 'numeric' | 'categorical' | 'datetime' | 'boolean' | 'text';
  uniqueValues: number;
  missingValues: number;
  missingPercentage: number;

  // Numeric stats
  min?: number;
  max?: number;
  mean?: number;
  median?: number;
  std?: number;

  // Categorical stats
  topValues?: Array<{ value: string; count: number }>;

  // Datetime stats
  minDate?: Date;
  maxDate?: Date;
}

/**
 * Query mode for data viewer
 */
export type QueryMode = 'english' | 'sql';

/**
 * Query artifact - represents a saved query result
 * Similar to a browser tab or Jupyter notebook cell
 */
export interface QueryArtifact {
  id: string;
  name: string; // Display name (auto-generated or custom)
  query: string; // The actual query text
  mode: QueryMode;
  result: DataPreview;
  timestamp: Date;
  isSaved: boolean; // Whether saved to backend (future feature)
  projectId: string;
}

/**
 * File icon mapping based on file type
 * Returns lucide-react icon name
 */
export const getFileIcon = (type: FileType): string => {
  const iconMap: Record<FileType, string> = {
    csv: 'Table',
    json: 'Braces',
    excel: 'Sheet',
    pdf: 'FileText',
    markdown: 'FileCode',
    word: 'FileType',
    text: 'FileText',
    other: 'File'
  };
  return iconMap[type];
};

/**
 * Format file size for display
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

/**
 * Determine file type from File object
 */
export const getFileType = (file: File): FileType => {
  const extension = file.name.split('.').pop()?.toLowerCase();

  if (extension === 'csv') return 'csv';
  if (extension === 'json') return 'json';
  if (extension === 'xlsx' || extension === 'xls') return 'excel';
  if (extension === 'pdf') return 'pdf';
  if (extension === 'md') return 'markdown';
  if (extension === 'docx' || extension === 'doc') return 'word';
  if (extension === 'txt') return 'text';

  return 'other';
};
