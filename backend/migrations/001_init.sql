-- Initial schema for AI-Augmented AutoML Toolchain

CREATE TABLE IF NOT EXISTS projects (
  project_id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS datasets (
  dataset_id UUID PRIMARY KEY,
  project_id UUID REFERENCES projects(project_id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  file_type TEXT NOT NULL,
  byte_size BIGINT NOT NULL,
  row_count INTEGER,
  column_count INTEGER,
  profile JSONB DEFAULT '{}'::jsonb,
  storage_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS documents (
  document_id UUID PRIMARY KEY,
  project_id UUID REFERENCES projects(project_id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  byte_size BIGINT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  storage_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chunks (
  chunk_id UUID PRIMARY KEY,
  document_id UUID REFERENCES documents(document_id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(project_id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  token_count INTEGER,
  span JSONB DEFAULT '{}'::jsonb,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS embeddings (
  embedding_id UUID PRIMARY KEY,
  chunk_id UUID REFERENCES chunks(chunk_id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(project_id) ON DELETE CASCADE,
  embedding DOUBLE PRECISION[] NOT NULL,
  dimension INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS query_results (
  query_id UUID PRIMARY KEY,
  project_id UUID REFERENCES projects(project_id) ON DELETE CASCADE,
  sql_text TEXT NOT NULL,
  execution_ms INTEGER NOT NULL,
  result_preview JSONB NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS query_cache (
  cache_id UUID PRIMARY KEY,
  project_id UUID REFERENCES projects(project_id) ON DELETE CASCADE,
  sql_hash TEXT NOT NULL,
  sql_text TEXT NOT NULL,
  cached_result JSONB NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  last_accessed TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_datasets_project ON datasets(project_id);
CREATE INDEX IF NOT EXISTS idx_documents_project ON documents(project_id);
CREATE INDEX IF NOT EXISTS idx_chunks_document ON chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_embeddings_project ON embeddings(project_id);
CREATE INDEX IF NOT EXISTS idx_query_results_project ON query_results(project_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_query_cache_project_hash ON query_cache(project_id, sql_hash);
