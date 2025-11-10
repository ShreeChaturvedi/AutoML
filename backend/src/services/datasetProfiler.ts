import { parse as parseCsv } from 'csv-parse/sync';
import XLSX from 'xlsx';

import type { DatasetFileType, DatasetProfileColumn } from '../types/dataset.js';

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
  const effectiveOptions = { ...DEFAULT_OPTIONS, ...options };
  let rows: Record<string, unknown>[] = [];

  switch (fileType) {
    case 'csv':
      rows = profileCsv(buffer, effectiveOptions);
      break;
    case 'json':
      rows = profileJson(buffer, effectiveOptions);
      break;
    case 'xlsx':
      rows = profileXlsx(buffer, effectiveOptions);
      break;
    default:
      throw new Error(`Unsupported dataset file type: ${fileType}`);
  }

  const columns = buildColumns(rows);
  const sample = rows.slice(0, effectiveOptions.sampleSize);

  return {
    nRows: rows.length,
    columns,
    sample
  };
}

function profileCsv(buffer: Buffer, options: Required<ProfileOptions>): Record<string, unknown>[] {
  const text = buffer.toString('utf8');
  const records = parseCsv(text, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    to: options.maxRows
  }) as Record<string, unknown>[];
  return records;
}

function profileJson(buffer: Buffer, options: Required<ProfileOptions>): Record<string, unknown>[] {
  const text = buffer.toString('utf8');
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) {
      return parsed
        .filter((item) => typeof item === 'object' && item !== null)
        .slice(0, options.maxRows) as Record<string, unknown>[];
    }

    if (typeof parsed === 'object' && parsed !== null) {
      return [parsed as Record<string, unknown>];
    }
  } catch (error) {
    // Attempt to parse as NDJSON
    const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    const rows: Record<string, unknown>[] = [];
    for (const line of lines) {
      try {
        const value = JSON.parse(line);
        if (typeof value === 'object' && value !== null) {
          rows.push(value as Record<string, unknown>);
        }
        if (rows.length >= options.maxRows) break;
      } catch {
        console.warn('[datasetProfiler] Skipping invalid JSON line');
      }
    }
    if (rows.length > 0) {
      return rows;
    }
    throw error;
  }

  return [];
}

function profileXlsx(buffer: Buffer, options: Required<ProfileOptions>): Record<string, unknown>[] {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return [];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: null
  });
  return rows.slice(0, options.maxRows);
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
