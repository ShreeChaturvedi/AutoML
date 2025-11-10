import { apiRequest } from './client';

export interface UploadDatasetResponse {
  dataset: {
    datasetId: string;
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
