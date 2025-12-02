/**
 * Dataset Loader - Loads uploaded datasets into Postgres tables for querying
 */

import { getDbPool } from '../db.js';
import type { DatasetProfileColumn } from '../types/dataset.js';
import { parse as parseCsv } from 'csv-parse/sync';
import XLSX from 'xlsx';

/**
 * Load a dataset into a Postgres table
 */
export async function loadDatasetIntoPostgres(params: {
  datasetId: string;
  filename: string;
  fileType: 'csv' | 'json' | 'xlsx';
  buffer: Buffer;
  columns: DatasetProfileColumn[];
}): Promise<{ tableName: string; rowsLoaded: number }> {
  const { datasetId, filename, fileType, buffer, columns } = params;

  // Sanitize filename to create valid table name
  const tableName = sanitizeTableName(filename, datasetId);

  // Parse data based on file type
  const rows = parseDataFile(buffer, fileType);

  if (rows.length === 0) {
    throw new Error('No data rows to load');
  }

  const pool = getDbPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Drop table if it exists (idempotent uploads)
    await client.query(`DROP TABLE IF EXISTS "${tableName}"`);

    // Create table with inferred schema
    const createTableSql = generateCreateTableSql(tableName, columns);
    await client.query(createTableSql);

    // Insert data
    const rowsLoaded = await insertRows(client, tableName, columns, rows);

    await client.query('COMMIT');

    console.log(`[datasetLoader] Loaded ${rowsLoaded} rows into "${tableName}"`);

    return { tableName, rowsLoaded };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`[datasetLoader] Failed to load dataset into table "${tableName}"`, error);
    throw error;
  } finally {
    client.release();
  }
}

function sanitizeTableName(filename: string, datasetId: string): string {
  // Remove extension and sanitize to create clean, user-friendly table name
  const baseName = filename.replace(/\.[^/.]+$/, '');
  const sanitized = baseName
    .replace(/[^a-zA-Z0-9_]/g, '_') // Replace invalid chars with underscore
    .replace(/^[^a-zA-Z]/, 'table_') // Ensure starts with letter
    .toLowerCase()
    .slice(0, 63); // Postgres max identifier length

  // Return clean name matching original filename (e.g., "checkpoints_eoc")
  // Conflicts handled by DROP TABLE IF EXISTS on re-upload
  return sanitized;
}

function parseDataFile(buffer: Buffer, fileType: 'csv' | 'json' | 'xlsx'): Record<string, unknown>[] {
  switch (fileType) {
    case 'csv': {
      const text = buffer.toString('utf8');
      return parseCsv(text, {
        columns: true,
        skip_empty_lines: true,
        trim: true
      }) as Record<string, unknown>[];
    }
    case 'json': {
      const text = buffer.toString('utf8');
      const parsed = JSON.parse(text);
      return Array.isArray(parsed) ? parsed : [parsed];
    }
    case 'xlsx': {
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      if (!sheetName) return [];
      const sheet = workbook.Sheets[sheetName];
      return XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null });
    }
    default:
      throw new Error(`Unsupported file type: ${fileType}`);
  }
}

function generateCreateTableSql(tableName: string, columns: DatasetProfileColumn[]): string {
  const columnDefs = columns.map((col) => {
    const pgType = inferPostgresType(col.dtype);
    return `"${col.name}" ${pgType}`;
  });

  return `CREATE TABLE "${tableName}" (${columnDefs.join(', ')})`;
}

function inferPostgresType(dtype: string): string {
  switch (dtype) {
    case 'number':
      return 'DOUBLE PRECISION';
    case 'boolean':
      return 'BOOLEAN';
    case 'date':
      return 'TIMESTAMP';
    case 'string':
    default:
      return 'TEXT';
  }
}

async function insertRows(
  client: any,
  tableName: string,
  columns: DatasetProfileColumn[],
  rows: Record<string, unknown>[]
): Promise<number> {
  if (rows.length === 0) return 0;

  const columnNames = columns.map(c => c.name);

  // Postgres has a parameter limit of ~32k parameters
  // Calculate batch size to stay under this limit
  const maxParams = 30000; // Leave some buffer
  const paramsPerRow = columnNames.length;
  const batchSize = Math.floor(maxParams / paramsPerRow);

  let totalRowsInserted = 0;

  // Insert in batches
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);

    const placeholders = batch.map((_, rowIdx) => {
      const valuePlaceholders = columnNames.map((_, colIdx) => `$${rowIdx * columnNames.length + colIdx + 1}`);
      return `(${valuePlaceholders.join(', ')})`;
    });

    const values: unknown[] = [];
    batch.forEach((row) => {
      columnNames.forEach((colName) => {
        values.push(row[colName] ?? null);
      });
    });

    const insertSql = `
      INSERT INTO "${tableName}" (${columnNames.map(n => `"${n}"`).join(', ')})
      VALUES ${placeholders.join(', ')}
    `;

    await client.query(insertSql, values);
    totalRowsInserted += batch.length;

    if (batch.length < batchSize) {
      console.log(`[datasetLoader] Inserted ${totalRowsInserted} rows in ${Math.ceil(rows.length / batchSize)} batches`);
    }
  }

  return totalRowsInserted;
}
