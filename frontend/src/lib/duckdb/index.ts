/**
 * DuckDB Service Layer - Barrel export
 * 
 * Exports the DuckDB service singleton and types for use throughout the app.
 */

export { DuckDBService, getDuckDB, resetDuckDB } from './duckdbClient';
export type {
  TableMetadata,
  ColumnSchema,
  QueryResult,
  QueryError,
  DuckDBConfig,
  ServiceStats
} from './types';
