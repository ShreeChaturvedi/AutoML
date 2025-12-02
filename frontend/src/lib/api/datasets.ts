import { apiRequest } from './client';

export interface UploadDatasetResponse {
  dataset: {
    datasetId: string;
    projectId?: string;
    filename: string;
    fileType: string;
    size: number;
    n_rows: number;
    n_cols: number;
    columns: string[];
    dtypes: Record<string, string>;
    null_counts: Record<string, number>;
    sample: Record<string, unknown>[];
    createdAt: string;
    tableName?: string; // Postgres table name for SQL querying
  };
}

export async function uploadDatasetFile(file: File, projectId?: string) {
  const formData = new FormData();
  formData.append('file', file);
  if (projectId) {
    formData.append('projectId', projectId);
  }

  return apiRequest<UploadDatasetResponse>('/upload/dataset', {
    method: 'POST',
    body: formData
  });
}

export interface DatasetProfile {
  datasetId: string;
  projectId?: string;
  filename: string;
  fileType: string;
  size: number;
  nRows: number;
  nCols: number;
  columns: Array<{
    name: string;
    dtype: string;
    nullCount: number;
  }>;
  sample: Record<string, unknown>[];
  createdAt: string;
  updatedAt: string;
}

export async function listDatasets(projectId?: string) {
  const url = projectId ? `/datasets?projectId=${projectId}` : '/datasets';
  return apiRequest<{ datasets: DatasetProfile[] }>(url, { method: 'GET' });
}

export async function getDatasetSample(datasetId: string) {
  return apiRequest<{
    sample: Record<string, unknown>[];
    columns: string[];
    rowCount: number;
  }>(`/datasets/${datasetId}/sample`, { method: 'GET' });
}

export async function deleteDataset(datasetId: string) {
  return apiRequest<{ success: boolean }>(`/datasets/${datasetId}`, { method: 'DELETE' });
}
