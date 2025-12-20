import { describe, it, expect } from 'vitest';

import type { DatasetProfile } from '../types/dataset.js';
import { buildFeaturePlanFromRows } from './featurePlanner.js';

describe('featurePlanner', () => {
  it('builds a feature plan with data-driven suggestions', () => {
    const rows = [
      {
        revenue: 120,
        cost: 45,
        category: 'A',
        timestamp: '2024-01-01',
        notes: 'This is a long context string describing a customer interaction.'
      },
      {
        revenue: 240,
        cost: 60,
        category: 'B',
        timestamp: '2024-01-02',
        notes: 'Another detailed note with enough length to classify as text.'
      },
      {
        revenue: null,
        cost: 55,
        category: 'A',
        timestamp: '2024-01-03',
        notes: 'Detailed notes keep this column above the text threshold.'
      },
      {
        revenue: 480,
        cost: 90,
        category: 'B',
        timestamp: '2024-01-04',
        notes: 'Yet another descriptive sentence that should be treated as text.'
      }
    ];

    const dataset: DatasetProfile = {
      datasetId: 'dataset-123',
      projectId: 'project-123',
      filename: 'sample.csv',
      fileType: 'csv',
      size: 1024,
      nRows: rows.length,
      nCols: 5,
      columns: [],
      sample: rows,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const plan = buildFeaturePlanFromRows({
      dataset,
      rows,
      targetColumn: 'revenue'
    });

    const methods = plan.suggestions.map((s) => s.method);
    expect(methods).toContain('missing_indicator');
    expect(methods).toContain('one_hot_encode');
    expect(methods).toContain('extract_year');
    expect(methods).toContain('text_length');

    const revenueMissing = plan.suggestions.find((s) => s.method === 'missing_indicator');
    expect(revenueMissing?.featureName).toBe('revenue_missing');
  });
});
