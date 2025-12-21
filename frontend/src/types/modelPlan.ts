import type { ModelTaskType, ModelTemplate } from './model';

export interface ModelPlanRequest {
  projectId: string;
  datasetId: string;
  targetColumn?: string;
  problemType?: ModelTaskType | 'forecasting' | 'unspecified';
}

export interface ModelRecommendation {
  template: ModelTemplate;
  parameters: Record<string, unknown>;
  rationale: string;
  score: number;
}

export interface ModelPlan {
  dataset: {
    datasetId: string;
    filename: string;
    nRows: number;
    nCols: number;
  };
  taskType: ModelTaskType;
  recommendations: ModelRecommendation[];
  generatedAt: string;
}
