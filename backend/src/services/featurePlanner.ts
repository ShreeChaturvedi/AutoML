import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { env } from '../config.js';
import { createDatasetRepository } from '../repositories/datasetRepository.js';
import type { DatasetProfile } from '../types/dataset.js';
import { parseDatasetRows } from './datasetLoader.js';
import { profileDatasetRows } from './datasetProfiler.js';
import type { FeatureMethod } from './featureEngineering.js';

export type FeatureImpact = 'high' | 'medium' | 'low';
export type FeatureCategory =
  | 'numeric_transform'
  | 'scaling'
  | 'encoding'
  | 'datetime'
  | 'interaction'
  | 'text'
  | 'aggregation';

export type FeatureControlType = 'number' | 'boolean' | 'select' | 'column' | 'text';

export interface FeatureControl {
  key: string;
  label: string;
  type: FeatureControlType;
  value: unknown;
  min?: number;
  max?: number;
  step?: number;
  required?: boolean;
  options?: Array<{ value: string; label: string }>;
}

export interface FeatureSuggestion {
  id: string;
  displayName: string;
  method: FeatureMethod;
  category: FeatureCategory;
  sourceColumn: string;
  secondaryColumn?: string;
  featureName: string;
  description: string;
  rationale: string;
  impact: FeatureImpact;
  score: number;
  params: Record<string, unknown>;
  controls: FeatureControl[];
  tags?: string[];
}

export interface ColumnProfile {
  name: string;
  dtype: string;
  role: 'numeric' | 'categorical' | 'datetime' | 'boolean' | 'text';
  nullCount: number;
  missingPercentage: number;
  sampleCount: number;
  uniqueCount?: number;
  topValues?: Array<{ value: string; count: number; percentage: number }>;
  min?: number;
  max?: number;
  mean?: number;
  median?: number;
  stdDev?: number;
  skewness?: number;
  q1?: number;
  q3?: number;
  minDate?: string;
  maxDate?: string;
  averageLength?: number;
  maxLength?: number;
}

export interface FeaturePlan {
  dataset: {
    datasetId: string;
    filename: string;
    nRows: number;
    nCols: number;
  };
  columns: ColumnProfile[];
  suggestions: FeatureSuggestion[];
  generatedAt: string;
}

export interface FeaturePlanRequest {
  projectId: string;
  datasetId: string;
  targetColumn?: string;
  problemType?: 'classification' | 'regression' | 'clustering' | 'forecasting' | 'unspecified';
}

const datasetRepository = createDatasetRepository(env.datasetMetadataPath);

const FEATURE_META: Record<FeatureMethod, { displayName: string; category: FeatureCategory; description: string }> = {
  log_transform: {
    displayName: 'Log Transform',
    category: 'numeric_transform',
    description: 'Compresses large values and reduces right-skew.'
  },
  log1p_transform: {
    displayName: 'Log(1+x) Transform',
    category: 'numeric_transform',
    description: 'Stable log transform for values that include zeros.'
  },
  sqrt_transform: {
    displayName: 'Square Root',
    category: 'numeric_transform',
    description: 'Gentle transformation for count-like data.'
  },
  square_transform: {
    displayName: 'Square',
    category: 'numeric_transform',
    description: 'Accentuate larger values for non-linear effects.'
  },
  reciprocal_transform: {
    displayName: 'Reciprocal',
    category: 'numeric_transform',
    description: 'Invert the scale for ratios or decay-like signals.'
  },
  box_cox: {
    displayName: 'Box-Cox',
    category: 'numeric_transform',
    description: 'Power transform to normalize positive data.'
  },
  yeo_johnson: {
    displayName: 'Yeo-Johnson',
    category: 'numeric_transform',
    description: 'Power transform that handles zero/negative values.'
  },
  standardize: {
    displayName: 'Standardize (Z-score)',
    category: 'scaling',
    description: 'Centers data and scales to unit variance.'
  },
  min_max_scale: {
    displayName: 'Min-Max Scale',
    category: 'scaling',
    description: 'Scales values into a fixed range.'
  },
  robust_scale: {
    displayName: 'Robust Scale',
    category: 'scaling',
    description: 'Scaling resistant to outliers (median/IQR).'
  },
  max_abs_scale: {
    displayName: 'Max-Abs Scale',
    category: 'scaling',
    description: 'Scale by maximum absolute value.'
  },
  bucketize: {
    displayName: 'Equal-Width Binning',
    category: 'numeric_transform',
    description: 'Discretize values into fixed-width bins.'
  },
  quantile_bin: {
    displayName: 'Quantile Binning',
    category: 'numeric_transform',
    description: 'Discretize values into equally populated bins.'
  },
  one_hot_encode: {
    displayName: 'One-Hot Encode',
    category: 'encoding',
    description: 'Expand categories into binary indicator columns.'
  },
  label_encode: {
    displayName: 'Label Encode',
    category: 'encoding',
    description: 'Map categories to integer codes.'
  },
  target_encode: {
    displayName: 'Target Encode',
    category: 'encoding',
    description: 'Encode categories using target statistics.'
  },
  frequency_encode: {
    displayName: 'Frequency Encode',
    category: 'encoding',
    description: 'Encode categories using frequency.'
  },
  binary_encode: {
    displayName: 'Binary Encode',
    category: 'encoding',
    description: 'Compact encoding for high-cardinality categories.'
  },
  extract_year: {
    displayName: 'Extract Year',
    category: 'datetime',
    description: 'Year component from datetime.'
  },
  extract_month: {
    displayName: 'Extract Month',
    category: 'datetime',
    description: 'Month component from datetime.'
  },
  extract_day: {
    displayName: 'Extract Day',
    category: 'datetime',
    description: 'Day-of-month component from datetime.'
  },
  extract_weekday: {
    displayName: 'Extract Weekday',
    category: 'datetime',
    description: 'Weekday component from datetime.'
  },
  extract_hour: {
    displayName: 'Extract Hour',
    category: 'datetime',
    description: 'Hour component from datetime.'
  },
  cyclical_encode: {
    displayName: 'Cyclical Encode',
    category: 'datetime',
    description: 'Encode periodic time features using sin/cos.'
  },
  time_since: {
    displayName: 'Time Since',
    category: 'datetime',
    description: 'Compute elapsed time from now.'
  },
  polynomial: {
    displayName: 'Polynomial Features',
    category: 'interaction',
    description: 'Generate polynomial terms for a numeric column.'
  },
  ratio: {
    displayName: 'Ratio',
    category: 'interaction',
    description: 'Ratio between two numeric columns.'
  },
  difference: {
    displayName: 'Difference',
    category: 'interaction',
    description: 'Difference between two numeric columns.'
  },
  product: {
    displayName: 'Product',
    category: 'interaction',
    description: 'Product of two numeric columns.'
  },
  text_length: {
    displayName: 'Text Length',
    category: 'text',
    description: 'Character length of a text field.'
  },
  word_count: {
    displayName: 'Word Count',
    category: 'text',
    description: 'Token count of a text field.'
  },
  contains_pattern: {
    displayName: 'Contains Pattern',
    category: 'text',
    description: 'Binary flag for a text pattern.'
  },
  missing_indicator: {
    displayName: 'Missing Indicator',
    category: 'numeric_transform',
    description: 'Binary flag for missing values.'
  }
};

const FEATURE_CONTROLS: Partial<Record<FeatureMethod, Array<Omit<FeatureControl, 'value' | 'options'> & { default?: unknown }>>> = {
  log_transform: [
    { key: 'offset', label: 'Offset', type: 'number', min: 0, step: 0.1, default: 1 }
  ],
  min_max_scale: [
    { key: 'min', label: 'Target min', type: 'number', default: 0 },
    { key: 'max', label: 'Target max', type: 'number', default: 1 }
  ],
  bucketize: [
    { key: 'bins', label: 'Bins', type: 'number', min: 2, max: 20, step: 1, default: 5 }
  ],
  quantile_bin: [
    { key: 'quantiles', label: 'Quantiles', type: 'number', min: 2, max: 10, step: 1, default: 4 }
  ],
  one_hot_encode: [
    { key: 'drop_first', label: 'Drop first', type: 'boolean', default: false }
  ],
  target_encode: [
    { key: 'targetColumn', label: 'Target column', type: 'column', required: true },
    { key: 'smoothing', label: 'Smoothing', type: 'number', min: 0, max: 20, step: 1, default: 1 }
  ],
  frequency_encode: [
    { key: 'normalize', label: 'Normalize', type: 'boolean', default: true }
  ],
  cyclical_encode: [
    {
      key: 'period',
      label: 'Cycle',
      type: 'select',
      default: 'month',
      options: [
        { value: 'hour', label: 'Hour of day' },
        { value: 'weekday', label: 'Weekday' },
        { value: 'month', label: 'Month' },
        { value: 'day_of_year', label: 'Day of year' }
      ]
    }
  ],
  time_since: [
    {
      key: 'unit',
      label: 'Unit',
      type: 'select',
      default: 'days',
      options: [
        { value: 'days', label: 'Days' },
        { value: 'weeks', label: 'Weeks' },
        { value: 'months', label: 'Months' },
        { value: 'hours', label: 'Hours' }
      ]
    }
  ],
  polynomial: [
    { key: 'degree', label: 'Degree', type: 'number', min: 2, max: 5, step: 1, default: 2 }
  ],
  ratio: [
    { key: 'secondaryColumn', label: 'Denominator', type: 'column', required: true }
  ],
  difference: [
    { key: 'secondaryColumn', label: 'Subtract column', type: 'column', required: true }
  ],
  product: [
    { key: 'secondaryColumn', label: 'Multiply column', type: 'column', required: true }
  ],
  contains_pattern: [
    { key: 'pattern', label: 'Pattern', type: 'text', default: '' },
    { key: 'case_sensitive', label: 'Case sensitive', type: 'boolean', default: false }
  ]
};

export async function generateFeaturePlan(request: FeaturePlanRequest): Promise<FeaturePlan> {
  const dataset = await datasetRepository.getById(request.datasetId);
  if (!dataset) {
    throw new Error('Dataset not found.');
  }
  if (dataset.projectId && dataset.projectId !== request.projectId) {
    throw new Error('Dataset does not belong to this project.');
  }

  const datasetPath = join(env.datasetStorageDir, dataset.datasetId, dataset.filename);
  if (!existsSync(datasetPath)) {
    throw new Error('Dataset file not found on disk.');
  }

  const buffer = await readFile(datasetPath);
  const rows = parseDatasetRows(buffer, dataset.fileType);

  return buildFeaturePlanFromRows({
    dataset,
    rows,
    targetColumn: request.targetColumn,
    problemType: request.problemType
  });
}

export function buildFeaturePlanFromRows(params: {
  dataset: DatasetProfile;
  rows: Record<string, unknown>[];
  targetColumn?: string;
  problemType?: FeaturePlanRequest['problemType'];
}): FeaturePlan {
  const { dataset, rows, targetColumn } = params;
  const profiling = profileDatasetRows(rows, { maxRows: 5000, sampleSize: 200 });

  const sampleRows = profiling.sample;
  const stringStats = buildStringStats(sampleRows);

  const columns: ColumnProfile[] = profiling.columns.map((column) => {
    const stats = stringStats.get(column.name);
    const averageLength = stats ? stats.totalLength / Math.max(stats.count, 1) : 0;
    const role =
      column.dtype === 'number'
        ? 'numeric'
        : column.dtype === 'date'
          ? 'datetime'
          : column.dtype === 'boolean'
            ? 'boolean'
            : averageLength >= 30 || (stats?.maxLength ?? 0) >= 80
              ? 'text'
              : 'categorical';

    return {
      name: column.name,
      dtype: column.dtype,
      role,
      nullCount: column.nullCount,
      missingPercentage: Number(((column.nullCount / Math.max(dataset.nRows, 1)) * 100).toFixed(2)),
      sampleCount: column.sampleCount ?? 0,
      uniqueCount: column.uniqueCount,
      topValues: column.topValues,
      min: column.min,
      max: column.max,
      mean: column.mean,
      median: column.median,
      stdDev: column.stdDev,
      skewness: column.skewness,
      q1: column.q1,
      q3: column.q3,
      minDate: column.minDate,
      maxDate: column.maxDate,
      averageLength: stats ? Number(averageLength.toFixed(1)) : undefined,
      maxLength: stats?.maxLength
    };
  });

  const suggestions = buildFeatureSuggestions(columns, { targetColumn, sampleRows });

  return {
    dataset: {
      datasetId: dataset.datasetId,
      filename: dataset.filename,
      nRows: dataset.nRows,
      nCols: dataset.nCols
    },
    columns,
    suggestions,
    generatedAt: new Date().toISOString()
  };
}

function buildFeatureSuggestions(
  columns: ColumnProfile[],
  options: { targetColumn?: string; sampleRows: Record<string, unknown>[] }
): FeatureSuggestion[] {
  const suggestions: FeatureSuggestion[] = [];
  const numericColumns = columns.filter((col) => col.role === 'numeric');
  const categoricalColumns = columns.filter((col) => col.role === 'categorical');
  const datetimeColumns = columns.filter((col) => col.role === 'datetime');
  const textColumns = columns.filter((col) => col.role === 'text');

  const targetColumn = options.targetColumn;

  for (const column of numericColumns) {
    if (column.missingPercentage >= 5) {
      suggestions.push(
        createSuggestion({
          method: 'missing_indicator',
          sourceColumn: column.name,
          featureName: `${column.name}_missing`,
          impact: column.missingPercentage >= 20 ? 'high' : 'medium',
          rationale: `Missing rate is ${column.missingPercentage}%. Adding a missing indicator helps the model learn missingness patterns.`,
          tags: ['missingness']
        }, columns, targetColumn)
      );
    }

    if (typeof column.skewness === 'number' && Math.abs(column.skewness) >= 1) {
      const min = column.min ?? 0;
      const method = min > 0 ? 'log_transform' : 'yeo_johnson';
      const offset = min <= 0 ? 1 : min <= 1 ? 1 : 0;
      suggestions.push(
        createSuggestion({
          method,
          sourceColumn: column.name,
          featureName: `${column.name}_${method === 'log_transform' ? 'log' : 'yeo'}`,
          impact: Math.abs(column.skewness) >= 2 ? 'high' : 'medium',
          params: method === 'log_transform' ? { offset } : {},
          rationale: `Skewness is ${column.skewness}. A power transform can stabilize variance and improve model fit.`,
          tags: ['distribution']
        }, columns, targetColumn)
      );
    }

    if (shouldScale(column)) {
      const useRobust = shouldUseRobustScale(column);
      suggestions.push(
        createSuggestion({
          method: useRobust ? 'robust_scale' : 'standardize',
          sourceColumn: column.name,
          featureName: `${column.name}_${useRobust ? 'robust' : 'zscore'}`,
          impact: 'medium',
          rationale: useRobust
            ? 'Outlier spread suggests robust scaling (median/IQR).'
            : 'Wide numeric range suggests standardization for model stability.',
          tags: ['scaling']
        }, columns, targetColumn)
      );
    }

    if ((column.uniqueCount ?? 0) > 20 && (column.skewness ?? 0) > 1.5) {
      suggestions.push(
        createSuggestion({
          method: 'quantile_bin',
          sourceColumn: column.name,
          featureName: `${column.name}_qbin`,
          impact: 'low',
          rationale: 'Heavy skew and many unique values benefit from quantile bins.',
          tags: ['binning']
        }, columns, targetColumn)
      );
    }
  }

  for (const column of categoricalColumns) {
    const uniqueCount = column.uniqueCount ?? 0;
    if (uniqueCount > 0 && uniqueCount <= 15) {
      suggestions.push(
        createSuggestion({
          method: 'one_hot_encode',
          sourceColumn: column.name,
          featureName: `${column.name}_onehot`,
          impact: 'high',
          rationale: `Low cardinality (${uniqueCount} values) makes one-hot encoding effective.`,
          tags: ['categorical']
        }, columns, targetColumn)
      );
      continue;
    }

    if (uniqueCount > 15 && uniqueCount <= 60) {
      suggestions.push(
        createSuggestion({
          method: 'frequency_encode',
          sourceColumn: column.name,
          featureName: `${column.name}_freq`,
          impact: 'medium',
          rationale: `Moderate cardinality (${uniqueCount} values). Frequency encoding reduces dimensionality.`,
          tags: ['categorical']
        }, columns, targetColumn)
      );
      continue;
    }

    if (uniqueCount > 60) {
      suggestions.push(
        createSuggestion({
          method: targetColumn ? 'target_encode' : 'frequency_encode',
          sourceColumn: column.name,
          featureName: `${column.name}_${targetColumn ? 'target' : 'freq'}`,
          impact: 'medium',
          rationale: targetColumn
            ? `High cardinality (${uniqueCount} values). Target encoding preserves signal with less sparsity.`
            : `High cardinality (${uniqueCount} values). Frequency encoding is a stable fallback without a target.`,
          tags: ['categorical']
        }, columns, targetColumn)
      );
    }
  }

  for (const column of datetimeColumns) {
    suggestions.push(
      createSuggestion({
        method: 'extract_year',
        sourceColumn: column.name,
        featureName: `${column.name}_year`,
        impact: 'low',
        rationale: 'Year captures long-term temporal trends.',
        tags: ['datetime']
      }, columns, targetColumn),
      createSuggestion({
        method: 'extract_month',
        sourceColumn: column.name,
        featureName: `${column.name}_month`,
        impact: 'medium',
        rationale: 'Month captures seasonal patterns.',
        tags: ['datetime']
      }, columns, targetColumn),
      createSuggestion({
        method: 'extract_weekday',
        sourceColumn: column.name,
        featureName: `${column.name}_weekday`,
        impact: 'medium',
        rationale: 'Weekday captures weekly cyclicality.',
        tags: ['datetime']
      }, columns, targetColumn),
      createSuggestion({
        method: 'cyclical_encode',
        sourceColumn: column.name,
        featureName: `${column.name}_cycle`,
        impact: 'medium',
        rationale: 'Cyclical encoding preserves periodicity without discontinuities.',
        params: { period: 'month' },
        tags: ['datetime']
      }, columns, targetColumn)
    );
  }

  for (const column of textColumns) {
    suggestions.push(
      createSuggestion({
        method: 'text_length',
        sourceColumn: column.name,
        featureName: `${column.name}_len`,
        impact: 'medium',
        rationale: 'Length can capture verbosity or signal presence.',
        tags: ['text']
      }, columns, targetColumn),
      createSuggestion({
        method: 'word_count',
        sourceColumn: column.name,
        featureName: `${column.name}_words`,
        impact: 'medium',
        rationale: 'Word count approximates content volume.',
        tags: ['text']
      }, columns, targetColumn)
    );
  }

  const interactionSuggestions = buildInteractionSuggestions(
    numericColumns,
    columns,
    options.sampleRows,
    targetColumn
  );
  suggestions.push(...interactionSuggestions);

  return suggestions.sort((a, b) => b.score - a.score);
}

function buildInteractionSuggestions(
  numericColumns: ColumnProfile[],
  allColumns: ColumnProfile[],
  sampleRows: Record<string, unknown>[],
  targetColumn?: string
): FeatureSuggestion[] {
  if (numericColumns.length < 2) return [];

  const pairs = computeTopCorrelations(sampleRows, numericColumns);
  const suggestions: FeatureSuggestion[] = [];

  for (const pair of pairs) {
    const primary = pair.a;
    const secondary = pair.b;

    if (pair.correlation >= 0.85 && (secondary.min ?? 1) > 0) {
      suggestions.push(
        createSuggestion({
          method: 'ratio',
          sourceColumn: primary.name,
          secondaryColumn: secondary.name,
          featureName: `${primary.name}_to_${secondary.name}`,
          impact: 'medium',
          rationale: `Strong positive correlation (${pair.correlation.toFixed(2)}). Ratio can highlight proportional effects.`,
          tags: ['interaction']
        }, allColumns, targetColumn)
      );
    } else {
      suggestions.push(
        createSuggestion({
          method: 'difference',
          sourceColumn: primary.name,
          secondaryColumn: secondary.name,
          featureName: `${primary.name}_minus_${secondary.name}`,
          impact: 'low',
          rationale: `Correlation ${pair.correlation.toFixed(2)} suggests a linear relationship worth contrasting.`,
          tags: ['interaction']
        }, allColumns, targetColumn)
      );
    }
  }

  return suggestions;
}

function computeTopCorrelations(
  rows: Record<string, unknown>[],
  columns: ColumnProfile[]
): Array<{
  a: ColumnProfile;
  b: ColumnProfile;
  correlation: number;
}> {
  const numeric = columns.filter((col) => col.role === 'numeric');
  const results: Array<{ a: ColumnProfile; b: ColumnProfile; correlation: number }> = [];

  for (let i = 0; i < numeric.length; i += 1) {
    for (let j = i + 1; j < numeric.length; j += 1) {
      const a = numeric[i];
      const b = numeric[j];
      const corr = estimateCorrelation(rows, a.name, b.name);
      if (Number.isFinite(corr)) {
        results.push({ a, b, correlation: corr });
      }
    }
  }

  return results
    .filter((pair) => Math.abs(pair.correlation) >= 0.85)
    .sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation))
    .slice(0, 3);
}

function estimateCorrelation(
  rows: Record<string, unknown>[],
  columnA: string,
  columnB: string
): number {
  let n = 0;
  let sumA = 0;
  let sumB = 0;
  let sumA2 = 0;
  let sumB2 = 0;
  let sumAB = 0;

  for (const row of rows) {
    const a = coerceNumber(row[columnA]);
    const b = coerceNumber(row[columnB]);
    if (a === null || b === null) continue;
    n += 1;
    sumA += a;
    sumB += b;
    sumA2 += a * a;
    sumB2 += b * b;
    sumAB += a * b;
  }

  if (n < 10) return 0;
  const meanA = sumA / n;
  const meanB = sumB / n;
  const varianceA = sumA2 / n - meanA * meanA;
  const varianceB = sumB2 / n - meanB * meanB;
  if (varianceA <= 0 || varianceB <= 0) return 0;
  const covariance = sumAB / n - meanA * meanB;
  return covariance / Math.sqrt(varianceA * varianceB);
}

function shouldScale(column: ColumnProfile): boolean {
  if (column.role !== 'numeric') return false;
  const range = (column.max ?? 0) - (column.min ?? 0);
  if (range > 1000) return true;
  if (typeof column.mean === 'number' && typeof column.stdDev === 'number') {
    const meanMagnitude = Math.max(Math.abs(column.mean), 1);
    return column.stdDev / meanMagnitude > 2;
  }
  return false;
}

function shouldUseRobustScale(column: ColumnProfile): boolean {
  if (typeof column.q1 !== 'number' || typeof column.q3 !== 'number') return false;
  const iqr = column.q3 - column.q1;
  const range = (column.max ?? 0) - (column.min ?? 0);
  if (iqr <= 0) return false;
  return range / iqr > 10;
}

function createSuggestion(
  input: {
    method: FeatureMethod;
    sourceColumn: string;
    secondaryColumn?: string;
    featureName: string;
    impact: FeatureImpact;
    rationale: string;
    params?: Record<string, unknown>;
    tags?: string[];
  },
  columns: ColumnProfile[],
  targetColumn?: string
): FeatureSuggestion {
  const meta = FEATURE_META[input.method];
  const params = { ...(input.params ?? {}) };
  if (input.secondaryColumn) {
    params.secondaryColumn = input.secondaryColumn;
  }
  if (input.method === 'target_encode' && targetColumn) {
    params.targetColumn = targetColumn;
  }

  const controls = buildControls(input.method, params, columns, targetColumn, input.sourceColumn);
  const score = impactScore(input.impact);

  return {
    id: buildSuggestionId(input.method, input.sourceColumn, input.secondaryColumn),
    displayName: meta.displayName,
    method: input.method,
    category: meta.category,
    sourceColumn: input.sourceColumn,
    secondaryColumn: input.secondaryColumn,
    featureName: input.featureName,
    description: meta.description,
    rationale: input.rationale,
    impact: input.impact,
    score,
    params,
    controls,
    tags: input.tags
  };
}

function buildControls(
  method: FeatureMethod,
  params: Record<string, unknown>,
  columns: ColumnProfile[],
  targetColumn?: string,
  sourceColumn?: string
): FeatureControl[] {
  const definitions = FEATURE_CONTROLS[method] ?? [];
  if (definitions.length === 0) return [];

  const numericColumns = columns.filter((col) => col.role === 'numeric').map((col) => col.name);
  const columnOptions = columns.map((col) => ({ value: col.name, label: col.name }));
  const numericOptions = numericColumns.map((name) => ({ value: name, label: name }));

  return definitions.map((def) => {
    let options = def.options;
    if (def.type === 'column') {
      if (def.key === 'secondaryColumn') {
        const filtered = numericOptions.filter((opt) => opt.value !== sourceColumn);
        options = filtered.length > 0 ? filtered : numericOptions;
      } else {
        options = columnOptions;
      }
    }

    let value = params[def.key];
    if (value === undefined) {
      if (def.key === 'targetColumn' && targetColumn) {
        value = targetColumn;
      } else if (def.key === 'secondaryColumn' && options && options[0]) {
        value = options[0].value;
      } else {
        value = def.default ?? '';
      }
      params[def.key] = value;
    }

    return {
      key: def.key,
      label: def.label,
      type: def.type,
      value,
      min: def.min,
      max: def.max,
      step: def.step,
      required: def.required,
      options
    };
  });
}

function buildSuggestionId(method: FeatureMethod, source: string, secondary?: string) {
  return `${method}:${source}${secondary ? `:${secondary}` : ''}`.toLowerCase();
}

function impactScore(impact: FeatureImpact): number {
  if (impact === 'high') return 0.9;
  if (impact === 'medium') return 0.6;
  return 0.35;
}

function buildStringStats(rows: Record<string, unknown>[]): Map<string, { totalLength: number; count: number; maxLength: number }> {
  const stats = new Map<string, { totalLength: number; count: number; maxLength: number }>();

  for (const row of rows) {
    for (const [key, value] of Object.entries(row)) {
      if (typeof value !== 'string') continue;
      const trimmed = value.trim();
      if (!trimmed) continue;
      const length = trimmed.length;
      const existing = stats.get(key) ?? { totalLength: 0, count: 0, maxLength: 0 };
      existing.totalLength += length;
      existing.count += 1;
      existing.maxLength = Math.max(existing.maxLength, length);
      stats.set(key, existing);
    }
  }

  return stats;
}

function coerceNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}
