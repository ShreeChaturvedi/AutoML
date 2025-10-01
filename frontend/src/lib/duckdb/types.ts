/**
 * Type definitions for DuckDB service layer
 */

/**
 * Metadata for a registered table in DuckDB
 */
export interface TableMetadata {
  tableName: string;
  fileId: string;
  fileName: string;
  rowCount: number;
  columnCount: number;
  columns: ColumnSchema[];
  loadedAt: Date;
  sizeBytes: number;
}

/**
 * Schema information for a column
 */
export interface ColumnSchema {
  name: string;
  type: string; // DuckDB type (INTEGER, VARCHAR, DOUBLE, etc.)
  nullable: boolean;
}

/**
 * Result from executing a SQL query
 */
export interface QueryResult {
  rows: Record<string, unknown>[];
  columns: ColumnSchema[];
  rowCount: number;
  totalRows: number; // May differ from rowCount if LIMIT applied
  executionTimeMs: number;
  truncated: boolean;
}

/**
 * Structured error information from query execution
 */
export interface QueryError extends Error {
  line?: number;
  column?: number;
  suggestion?: string;
  originalError?: unknown;
}

/**
 * Configuration options for DuckDBService
 */
export interface DuckDBConfig {
  maxResultRows?: number; // Default limit for result sets
  queryTimeout?: number; // Query timeout in milliseconds
  enableLogging?: boolean; // Enable debug logging
  workerUrl?: string; // Custom worker bundle URL
}

/**
 * Statistics about DuckDB service state
 */
export interface ServiceStats {
  isInitialized: boolean;
  tablesLoaded: number;
  totalMemoryBytes: number;
  queriesExecuted: number;
  averageQueryTimeMs: number;
}
