import type { FeatureCategory, FeatureMethod } from './feature';

export type FeatureImpact = 'high' | 'medium' | 'low';
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
