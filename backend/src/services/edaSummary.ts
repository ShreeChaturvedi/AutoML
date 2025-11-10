import type {
  CorrelationSummary,
  EdaSummary,
  HistogramSummary,
  NumericSummary,
  QueryRow,
  ScatterSummary
} from '../types/query.js';

const MAX_SCATTER_POINTS = 200;
const HISTOGRAM_BUCKETS = 10;

export function buildEdaSummary(rows: QueryRow[]): EdaSummary | undefined {
  if (rows.length === 0) {
    return undefined;
  }

  const numericColumns = inferNumericColumns(rows);
  if (numericColumns.length === 0) {
    return undefined;
  }

  const numericSummaries = computeNumericSummaries(rows, numericColumns);
  const histogram = buildHistogram(rows, numericColumns[0]);
  const scatter =
    numericColumns.length >= 2
      ? buildScatter(rows, numericColumns[0], numericColumns[1])
      : undefined;
  const correlations = buildCorrelations(rows, numericColumns);

  return {
    numericColumns: numericSummaries,
    histogram,
    scatter,
    correlations
  };
}

function inferNumericColumns(rows: QueryRow[]): string[] {
  const firstRow = rows[0];
  return Object.keys(firstRow).filter((column) => {
    return rows.every((row) => {
      const value = row[column];
      return typeof value === 'number' || (typeof value === 'string' && !Number.isNaN(Number(value)));
    });
  });
}

function computeNumericSummaries(rows: QueryRow[], columns: string[]): NumericSummary[] {
  return columns.map((column) => {
    const values = rows
      .map((row) => row[column])
      .map((value) => (typeof value === 'number' ? value : Number(value)))
      .filter((value) => Number.isFinite(value));

    if (values.length === 0) {
      return {
        column,
        min: 0,
        max: 0,
        mean: 0,
        stdDev: 0
      };
    }

    const min = Math.min(...values);
    const max = Math.max(...values);
    const mean = values.reduce((acc, curr) => acc + curr, 0) / values.length;
    const variance =
      values.reduce((acc, curr) => acc + (curr - mean) ** 2, 0) / Math.max(1, values.length - 1);

    return {
      column,
      min,
      max,
      mean,
      stdDev: Math.sqrt(variance)
    };
  });
}

function buildHistogram(rows: QueryRow[], column: string): HistogramSummary | undefined {
  const values = rows
    .map((row) => row[column])
    .map((value) => (typeof value === 'number' ? value : Number(value)))
    .filter((value) => Number.isFinite(value));

  if (values.length === 0) return undefined;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const bucketSize = (max - min || 1) / HISTOGRAM_BUCKETS;

  const buckets = Array.from({ length: HISTOGRAM_BUCKETS }).map((_, index) => ({
    start: min + index * bucketSize,
    end: min + (index + 1) * bucketSize,
    count: 0
  }));

  values.forEach((value) => {
    const index = Math.min(
      HISTOGRAM_BUCKETS - 1,
      Math.floor((value - min) / (bucketSize || 1))
    );
    buckets[index].count += 1;
  });

  return {
    column,
    buckets
  };
}

function buildScatter(rows: QueryRow[], xColumn: string, yColumn: string): ScatterSummary | undefined {
  const points = rows
    .map((row) => ({
      x: Number(row[xColumn]),
      y: Number(row[yColumn])
    }))
    .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y))
    .slice(0, MAX_SCATTER_POINTS);

  if (points.length === 0) return undefined;

  return { xColumn, yColumn, points };
}

function buildCorrelations(rows: QueryRow[], columns: string[]): CorrelationSummary[] | undefined {
  if (columns.length < 2) return undefined;

  const summaries: CorrelationSummary[] = [];
  for (let i = 0; i < columns.length; i += 1) {
    for (let j = i + 1; j < columns.length; j += 1) {
      const a = columns[i];
      const b = columns[j];
      const coefficient = pearsonCorrelation(rows, a, b);
      if (!Number.isNaN(coefficient)) {
        summaries.push({ columnA: a, columnB: b, coefficient });
      }
    }
  }

  return summaries.length > 0 ? summaries : undefined;
}

function pearsonCorrelation(rows: QueryRow[], columnA: string, columnB: string): number {
  const values = rows
    .map((row) => ({
      a: Number(row[columnA]),
      b: Number(row[columnB])
    }))
    .filter((pair) => Number.isFinite(pair.a) && Number.isFinite(pair.b));

  if (values.length === 0) return Number.NaN;

  const meanA = values.reduce((acc, { a }) => acc + a, 0) / values.length;
  const meanB = values.reduce((acc, { b }) => acc + b, 0) / values.length;

  let numerator = 0;
  let denomA = 0;
  let denomB = 0;

  values.forEach(({ a, b }) => {
    numerator += (a - meanA) * (b - meanB);
    denomA += (a - meanA) ** 2;
    denomB += (b - meanB) ** 2;
  });

  const denominator = Math.sqrt(denomA * denomB);
  if (denominator === 0) return Number.NaN;
  return numerator / denominator;
}
