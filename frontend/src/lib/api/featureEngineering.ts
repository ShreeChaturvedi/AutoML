import { apiRequest } from './client';
import type { UploadDatasetResponse } from './datasets';
import type { FeatureSpec } from '@/types/feature';
import type { PythonVersion } from '@/lib/pyodide/types';
import type { FeaturePlan, FeaturePlanRequest } from '@/types/featurePlan';

export interface ApplyFeatureEngineeringRequest {
  projectId: string;
  datasetId: string;
  outputName?: string;
  outputFormat?: 'csv' | 'json' | 'xlsx';
  pythonVersion?: PythonVersion;
  features: FeatureSpec[];
}

export async function applyFeatureEngineering(
  request: ApplyFeatureEngineeringRequest
): Promise<UploadDatasetResponse> {
  return apiRequest<UploadDatasetResponse>('/feature-engineering/apply', {
    method: 'POST',
    body: JSON.stringify(request)
  });
}

export async function fetchFeaturePlan(request: FeaturePlanRequest): Promise<FeaturePlan> {
  const response = await apiRequest<{ plan: FeaturePlan }>('/feature-engineering/plan', {
    method: 'POST',
    body: JSON.stringify(request)
  });
  return response.plan;
}
