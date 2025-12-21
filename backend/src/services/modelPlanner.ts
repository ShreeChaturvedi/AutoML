import type { DatasetProfile } from '../types/dataset.js';
import { createDatasetRepository } from '../repositories/datasetRepository.js';
import { env } from '../config.js';
import { listModelTemplates } from './modelTemplates.js';
import type { ModelTaskType, ModelTemplate } from '../types/model.js';

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

const datasetRepository = createDatasetRepository(env.datasetMetadataPath);

export async function generateModelPlan(request: ModelPlanRequest): Promise<ModelPlan> {
  const dataset = await datasetRepository.getById(request.datasetId);
  if (!dataset) {
    throw new Error('Dataset not found.');
  }
  if (dataset.projectId && dataset.projectId !== request.projectId) {
    throw new Error('Dataset does not belong to this project.');
  }

  return buildModelPlanFromDataset(dataset, request.targetColumn, request.problemType);
}

export function buildModelPlanFromDataset(
  dataset: DatasetProfile,
  targetColumn?: string,
  problemType?: ModelPlanRequest['problemType']
): ModelPlan {
  const templates = listModelTemplates();
  const taskType = resolveTaskType(dataset, targetColumn, problemType);
  const recommendations = templates
    .filter((template) => template.taskType === taskType)
    .map((template) => ({
      template,
      parameters: { ...template.defaultParams },
      rationale: buildRationale(template, dataset, targetColumn),
      score: scoreTemplate(template, dataset)
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);

  return {
    dataset: {
      datasetId: dataset.datasetId,
      filename: dataset.filename,
      nRows: dataset.nRows,
      nCols: dataset.nCols
    },
    taskType,
    recommendations,
    generatedAt: new Date().toISOString()
  };
}

function resolveTaskType(
  dataset: DatasetProfile,
  targetColumn?: string,
  problemType?: ModelPlanRequest['problemType']
): ModelTaskType {
  if (problemType && problemType !== 'unspecified' && problemType !== 'forecasting') {
    return problemType;
  }
  if (!targetColumn) {
    return 'clustering';
  }
  const target = dataset.columns.find((column) => column.name === targetColumn);
  if (!target) {
    return 'classification';
  }
  if (target.dtype === 'number') {
    return 'regression';
  }
  return 'classification';
}

function buildRationale(template: ModelTemplate, dataset: DatasetProfile, targetColumn?: string): string {
  const sampleSize = dataset.nRows;
  const columns = dataset.nCols;
  const scaleHint = columns > 25 ? 'handles many predictors well' : 'works well with compact feature sets';

  if (template.taskType === 'classification') {
    if (template.id.includes('logistic')) {
      return `Strong baseline classifier that ${scaleHint}. Useful for quick, interpretable results.`;
    }
    return `Ensemble model that captures non-linear interactions and ${scaleHint}.`;
  }

  if (template.taskType === 'regression') {
    if (template.id.includes('linear')) {
      return `Fast baseline regression. Good starting point for ${sampleSize} samples.`;
    }
    return `Non-linear regressor that adapts to complex patterns in ${columns} features.`;
  }

  return `Clustering option for exploratory grouping on ${sampleSize} samples.`;
}

function scoreTemplate(template: ModelTemplate, dataset: DatasetProfile): number {
  const sizeScore = dataset.nRows >= 5000 ? 0.15 : 0.05;
  if (template.id.includes('random_forest')) {
    return 0.8 + sizeScore;
  }
  if (template.id.includes('logistic') || template.id.includes('linear')) {
    return 0.6 + (dataset.nRows < 2000 ? 0.15 : 0);
  }
  if (template.id.includes('kmeans')) {
    return 0.7;
  }
  return 0.5;
}
