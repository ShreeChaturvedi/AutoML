export interface QueryColumn {
  name: string;
  dataTypeID?: number;
}

export interface QueryRow {
  [key: string]: unknown;
}

export interface QueryResultPayload {
  queryId: string;
  sql: string;
  columns: QueryColumn[];
  rows: QueryRow[];
  rowCount: number;
  executionMs: number;
  cached: boolean;
  cacheTimestamp?: string;
  eda?: EdaSummary;
}

export interface EdaSummary {
  numericColumns: NumericSummary[];
  histogram?: HistogramSummary;
  scatter?: ScatterSummary;
  correlations?: CorrelationSummary[];
}

export interface NumericSummary {
  column: string;
  min: number;
  max: number;
  mean: number;
  stdDev: number;
}

export interface HistogramSummary {
  column: string;
  buckets: Array<{
    start: number;
    end: number;
    count: number;
  }>;
}

export interface ScatterSummary {
  xColumn: string;
  yColumn: string;
  points: Array<{ x: number; y: number }>;
}

export interface CorrelationSummary {
  columnA: string;
  columnB: string;
  coefficient: number;
}
