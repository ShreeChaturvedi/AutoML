import { apiRequest, getApiBaseUrl } from './client';
import type { ModelRecord, ModelTemplate, TrainModelRequest } from '@/types/model';
import type { ModelPlan, ModelPlanRequest } from '@/types/modelPlan';

export async function listModelTemplates() {
  return apiRequest<{ templates: ModelTemplate[] }>('/models/templates', { method: 'GET' });
}

export async function listModels(projectId?: string) {
  const query = projectId ? `?projectId=${projectId}` : '';
  return apiRequest<{ models: ModelRecord[] }>(`/models${query}`, { method: 'GET' });
}

export async function trainModel(request: TrainModelRequest) {
  return apiRequest<{ model: ModelRecord; success: boolean; message: string }>(
    '/models/train',
    {
      method: 'POST',
      body: JSON.stringify(request)
    }
  );
}

export async function fetchModelPlan(request: ModelPlanRequest): Promise<ModelPlan> {
  const response = await apiRequest<{ plan: ModelPlan }>('/models/plan', {
    method: 'POST',
    body: JSON.stringify(request)
  });
  return response.plan;
}

export function getModelArtifactUrl(modelId: string) {
  return `${getApiBaseUrl()}/models/${modelId}/artifact`;
}
