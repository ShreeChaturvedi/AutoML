# AI-Augmented AutoML Toolchain – Backend

TypeScript + Express service that powers the AutoML platform. This initial scaffold exposes health and project-management endpoints so the frontend can begin integrating with a real API surface.

## Prerequisites

- Node.js 22 LTS (matches the frontend recommendation)
- npm 10+

## Getting Started

```bash
# Install dependencies
npm install

# Run in watch mode with hot reloading
npm run dev

# Compile TypeScript to JavaScript (outputs to build/)
npm run build

# Start the compiled server
npm run start
```

The server listens on `PORT` (defaults to `4000`) and serves all routes under `/api`.

## Available Scripts

- `npm run dev` – Start the development server with automatic reloads using `tsx`
- `npm run build` – Type-check and emit compiled output into `build/`
- `npm run start` – Serve the compiled output
- `npm run lint` – Run ESLint on the TypeScript sources
- `npm run test` – Run Vitest (currently a placeholder configuration)

## Environment Variables

Copy `.env.example` to `.env` to override defaults:

```
PORT=4000
ALLOWED_ORIGINS=http://localhost:5173
STORAGE_PATH=storage/projects.json
DATASET_METADATA_PATH=storage/datasets/metadata.json
DATASET_STORAGE_DIR=storage/datasets/files
DOCUMENT_STORAGE_DIR=storage/documents/files
DATABASE_URL=postgres://user:pass@localhost:5432/automl
PGSSLMODE=disable
PG_POOL_MIN=0
PG_POOL_MAX=10
SQL_STATEMENT_TIMEOUT_MS=5000
SQL_MAX_ROWS=1000
SQL_DEFAULT_LIMIT=200
QUERY_CACHE_TTL_MS=300000
QUERY_CACHE_MAX_ENTRIES=500
DOC_CHUNK_SIZE=500
DOC_CHUNK_OVERLAP=50
ANSWER_CACHE_TTL_MS=120000
```

- `PORT` – Port the HTTP server binds to
- `ALLOWED_ORIGINS` – Comma-separated list of origins allowed via CORS
- `STORAGE_PATH` – JSON file that stores project metadata
- `DATASET_METADATA_PATH` – JSON file storing dataset profiles
- `DATASET_STORAGE_DIR` – Directory where uploaded dataset files are saved
- `DOCUMENT_STORAGE_DIR` – Directory where uploaded context documents are saved
- `DATABASE_URL` – Optional Postgres connection string used by the new query/RAG services
- `PGSSLMODE` – `disable` (local) or `require` (managed Postgres that needs TLS)
- `PG_POOL_MIN`/`PG_POOL_MAX` – Pool sizing hints passed to `pg`
- `SQL_STATEMENT_TIMEOUT_MS` – Abort long-running queries automatically (default 5s)
- `SQL_MAX_ROWS` – Hard cap on rows returned from `/api/query/*`
- `SQL_DEFAULT_LIMIT` – Auto-appended LIMIT when callers omit one
- `QUERY_CACHE_TTL_MS`/`QUERY_CACHE_MAX_ENTRIES` – Caching controls for NL→SQL and direct SQL endpoints
- `DOC_CHUNK_SIZE` / `DOC_CHUNK_OVERLAP` – Controls chunk window/overlap during document ingestion
- `ANSWER_CACHE_TTL_MS` – TTL (ms) for cached answers returned by `/api/answer`

### Database & Migrations

While the existing JSON repositories remain the source of truth for projects/datasets, Sprint 3/4 features rely on Postgres. Provide a `DATABASE_URL`, then run:

```bash
npm run db:migrate
```

The script applies any `.sql` files inside `backend/migrations/` in lexical order. It is safe to re-run; statements use `CREATE ... IF NOT EXISTS`. The server automatically performs a connection sanity check on startup when `DATABASE_URL` is set.

## API Surface (Sprint 1)

| Method | Route              | Description                                      |
| ------ | ------------------ | ------------------------------------------------ |
| GET    | `/api/health`      | Liveness probe with uptime and timestamp info    |
| GET    | `/api/projects`    | List all persisted projects                      |
| GET    | `/api/projects/:id`| Fetch a single project by id                     |
| POST   | `/api/projects`    | Create a project (name required)                 |
| PATCH  | `/api/projects/:id`| Update project metadata                          |
| DELETE | `/api/projects/:id`| Remove a project                                 |

Projects are persisted to the JSON file configured via `STORAGE_PATH` (defaults to `storage/projects.json`). The directory is created automatically, and invalid JSON falls back to an empty project list with a warning.

## API Surface (Sprint 2 – In Progress)

| Method | Route                  | Description                                                                 |
| ------ | ---------------------- | --------------------------------------------------------------------------- |
| GET    | `/api/datasets`        | List stored dataset profiles and metadata                                   |
| POST   | `/api/upload/dataset`  | Accepts CSV/JSON/XLSX upload, profiles the dataset, and returns summary stats |

`POST /api/upload/dataset` expects a `multipart/form-data` request with the file in the `file` field and optionally `projectId`. The response contains column names, inferred dtypes, row/null counts, and a sample of the data. Raw files are saved in `DATASET_STORAGE_DIR`, while profiling metadata lives in `DATASET_METADATA_PATH`.

## API Surface (Sprint 3 – Query Execution)

> Requires `DATABASE_URL` to be configured.

| Method | Route            | Description |
| ------ | ---------------- | ----------- |
| POST   | `/api/query/sql` | Executes a user-supplied SQL statement after validating it is read-only. Auto-appends a `LIMIT` (see env vars), enforces `statement_timeout`, and returns `{ queryId, sql, columns, rows, executionMs, eda }`. Results are cached per project/sql hash. |
| POST   | `/api/query/nl`  | Accepts `{ projectId, query }`, generates a SQL statement via the NL→SQL service, executes it as above, and responds with `{ nl: { queryId, sql, rationale, query } }`. |
| GET    | `/api/query/cache/config` | Returns cache/limit configuration (useful for front-end messaging). |

Caching follows `{projectId}:{hash(sql)}` (SHA-256). Entries expire after `QUERY_CACHE_TTL_MS` and the table self-trims past `QUERY_CACHE_MAX_ENTRIES`. If the cache is disabled (no Postgres), both endpoints return `503`.

## API Surface (Sprint 4 – Document Ingestion & Search)

| Method | Route              | Description |
| ------ | ------------------ | ----------- |
| POST   | `/api/upload/doc`  | Accepts PDF/Markdown/TXT uploads plus optional `projectId`. The server extracts text, chunks it using `DOC_CHUNK_SIZE`/`DOC_CHUNK_OVERLAP`, generates lightweight embeddings, stores metadata in Postgres, and saves binaries under `DOCUMENT_STORAGE_DIR`. Returns `{ documentId, chunkCount, embeddingDimension }`. |
| GET    | `/api/docs/search` | Query params: `q` (required), `projectId` (optional), `k` (default 5). Runs vector similarity + keyword reranking against stored chunks and returns `{ results: [{ chunkId, documentId, filename, score, span, snippet }] }`. |

These endpoints require Postgres (`DATABASE_URL`). If the DB is unavailable they respond with `503`.

## API Surface (Sprint 4 – Answering)

| Method | Route         | Description |
| ------ | ------------- | ----------- |
| POST   | `/api/answer` | Body: `{ projectId?, question, topK? }`. Uses document search to retrieve top chunks, composes a simple answer with inline citations metadata, caches responses for `ANSWER_CACHE_TTL_MS`. Returns `{ answer: { status, answer, citations, meta } }` where `status` is `ok` or `not_found`. |
