import { config as loadEnv } from 'dotenv';

loadEnv();

const DEFAULT_ORIGINS = ['http://localhost:5173'];

function parseOrigins(value: string | undefined): string[] {
  if (!value) return DEFAULT_ORIGINS;
  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function parsePort(value: string | undefined): number {
  const fallback = 4000;
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

function parseInteger(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parsePort(process.env.PORT),
  allowedOrigins: parseOrigins(process.env.ALLOWED_ORIGINS),
  storagePath: process.env.STORAGE_PATH ?? 'storage/projects.json',
  datasetStorageDir: process.env.DATASET_STORAGE_DIR ?? 'storage/datasets/files',
  documentStorageDir: process.env.DOCUMENT_STORAGE_DIR ?? 'storage/documents/files',
  datasetMetadataPath: process.env.DATASET_METADATA_PATH ?? 'storage/datasets/metadata.json',
  databaseUrl: process.env.DATABASE_URL,
  pgSslMode: process.env.PGSSLMODE ?? 'disable',
  pgPoolMin: parseInteger(process.env.PG_POOL_MIN, 0),
  pgPoolMax: parseInteger(process.env.PG_POOL_MAX, 10),
  sqlStatementTimeoutMs: parseInteger(process.env.SQL_STATEMENT_TIMEOUT_MS, 5000),
  sqlMaxRows: parseInteger(process.env.SQL_MAX_ROWS, 1000),
  sqlDefaultLimit: parseInteger(process.env.SQL_DEFAULT_LIMIT, 200),
  queryCacheTtlMs: parseInteger(process.env.QUERY_CACHE_TTL_MS, 5 * 60 * 1000),
  queryCacheMaxEntries: parseInteger(process.env.QUERY_CACHE_MAX_ENTRIES, 500),
  docChunkSize: parseInteger(process.env.DOC_CHUNK_SIZE, 500),
  docChunkOverlap: parseInteger(process.env.DOC_CHUNK_OVERLAP, 50),
  answerCacheTtlMs: parseInteger(process.env.ANSWER_CACHE_TTL_MS, 2 * 60 * 1000)
};
