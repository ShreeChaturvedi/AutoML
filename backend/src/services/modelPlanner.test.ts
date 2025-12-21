import { describe, it, expect } from 'vitest';

import type { DatasetProfile } from '../types/dataset.js';
import { buildModelPlanFromDataset } from './modelPlanner.js';

describe('modelPlanner', () => {
  it('infers regression when target column is numeric', () => {
    const dataset = makeDataset([
      { name: 'target', dtype: 'number', nullCount: 0 },
      { name: 'feature', dtype: 'number', nullCount: 0 }
    ]);

    const plan = buildModelPlanFromDataset(dataset, 'target');
    expect(plan.taskType).toBe('regression');
    expect(plan.recommendations.some((rec) => rec.template.id === 'random_forest_regressor')).toBe(true);
  });

  it('infers classification when target column is categorical', () => {
    const dataset = makeDataset([
      { name: 'target', dtype: 'string', nullCount: 0 },
      { name: 'feature', dtype: 'number', nullCount: 0 }
    ]);

    const plan = buildModelPlanFromDataset(dataset, 'target');
    expect(plan.taskType).toBe('classification');
    expect(plan.recommendations.some((rec) => rec.template.id === 'random_forest_classifier')).toBe(true);
  });

  it('defaults to clustering when no target column provided', () => {
    const dataset = makeDataset([
      { name: 'feature', dtype: 'number', nullCount: 0 }
    ]);

    const plan = buildModelPlanFromDataset(dataset);
    expect(plan.taskType).toBe('clustering');
    expect(plan.recommendations.some((rec) => rec.template.id === 'kmeans')).toBe(true);
  });
});

function makeDataset(columns: DatasetProfile['columns']): DatasetProfile {
  return {
    datasetId: 'dataset-1',
    projectId: 'project-1',
    filename: 'sample.csv',
    fileType: 'csv',
    size: 1000,
    nRows: 120,
    nCols: columns.length,
    columns,
    sample: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}
