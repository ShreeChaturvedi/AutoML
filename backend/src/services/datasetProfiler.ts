import type { DatasetFileType, DatasetProfileColumn } from '../types/dataset.js';

import { parseDatasetRows } from './datasetLoader.js';

interface ProfileOptions {
  sampleSize?: number;
  maxRows?: number;
}

const DEFAULT_OPTIONS: Required<ProfileOptions> = {
  sampleSize: 20,
  maxRows: 5000
};

export interface DatasetProfilingResult {
  nRows: number;
  columns: DatasetProfileColumn[];
  sample: Record<string, unknown>[];
}

export function profileDataset(buffer: Buffer, fileType: DatasetFileType, options: ProfileOptions = {}): DatasetProfilingResult {
  const rows = parseDatasetRows(buffer, fileType);
  return profileDatasetRows(rows, options);
}

export function profileDatasetRows(
  rows: Record<string, unknown>[],
  options: ProfileOptions = {}
): DatasetProfilingResult {
  const effectiveOptions = { ...DEFAULT_OPTIONS, ...options };
  const rowsForProfile = rows.slice(0, effectiveOptions.maxRows);
  const columns = buildColumns(rowsForProfile);
  const sample = rowsForProfile.slice(0, effectiveOptions.sampleSize);

  return {
    nRows: rows.length,
    columns,
    sample
  };
}

function buildColumns(rows: Record<string, unknown>[]): DatasetProfileColumn[] {
  const columns = new Map<string, { values: unknown[]; nullCount: number }>();

  for (const row of rows) {
    Object.keys(row).forEach((key) => {
      if (!columns.has(key)) {
        columns.set(key, { values: [], nullCount: 0 });
      }
      const entry = columns.get(key)!;
      const value = row[key];
      if (value === null || value === undefined || value === '') {
        entry.nullCount += 1;
      } else {
        entry.values.push(value);
      }
    });

    // Track missing columns as null
    columns.forEach((entry, key) => {
      if (!(key in row)) {
        entry.nullCount += 1;
      }
    });
  }

  return Array.from(columns.entries()).map(([name, data]) => ({
    name,
    dtype: inferColumnType(data.values),
    nullCount: data.nullCount
  }));
}

function inferColumnType(values: unknown[]): string {
  if (values.length === 0) {
    return 'unknown';
  }

  if (values.every((value) => isBoolean(value))) {
    return 'boolean';
  }

  if (values.every((value) => isNumber(value))) {
    return 'number';
  }

  if (values.every((value) => isDate(value))) {
    return 'date';
  }

  return 'string';
}

function isBoolean(value: unknown): boolean {
  if (typeof value === 'boolean') return true;
  if (typeof value === 'string') {
    const lower = value.trim().toLowerCase();
    return lower === 'true' || lower === 'false';
  }
  return false;
}

function isNumber(value: unknown): boolean {
  if (typeof value === 'number' && Number.isFinite(value)) return true;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '') return false;
    const num = Number(trimmed);
    return Number.isFinite(num);
  }
  return false;
}

function isDate(value: unknown): boolean {
  if (value instanceof Date) {
    return !Number.isNaN(value.getTime());
  }
  if (typeof value === 'string') {
    const timestamp = Date.parse(value);
    return !Number.isNaN(timestamp);
  }
  return false;
}
