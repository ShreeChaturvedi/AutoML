# Sprint 3–4 Backend Handoff (Ayush)

This note summarizes what’s been delivered on the backend so far and what teammates should do next for their tracks.

## ✅ Implemented

### Infrastructure
- Postgres connection layer (`backend/src/db.ts`) plus migration script (`npm --prefix backend run db:migrate`). Tables include `documents`, `chunks`, `embeddings`, `query_results`, and `query_cache`.
- `.env` now covers DB connection string, dataset/document storage paths, query/answer caching limits, and chunking defaults. See `backend/.env.example`.
- CI pipeline (`.github/workflows/ci.yml`) spins up Postgres, builds backend, runs migrations, seeds a project, launches the server, and executes the automated evaluation suite.

### Query Engine (Sprint 3)
- `POST /api/query/sql`: read-only SQL execution with LIMIT enforcement, timeouts, EDA summaries, and caching (`query_cache`). Contract documented in `docs/api-contracts.md`.
- `POST /api/query/nl`: stubbed NL→SQL prompt handler that reuses the SQL route and cache.
- `GET /api/query/cache/config`: exposes TTL, max entries, and limit defaults for UI messaging.

### Document Ingestion & Retrieval (Sprint 4)
- `POST /api/upload/doc`: accepts PDF/Markdown/TXT, extracts text, chunks with overlap (`DOC_CHUNK_SIZE`, `DOC_CHUNK_OVERLAP`), generates lightweight embeddings, and persists metadata to Postgres. Raw files go under `DOCUMENT_STORAGE_DIR`.
- `GET /api/docs/search`: computes query embeddings, applies cosine + keyword reranking, and returns top-k chunks with score/snippet/span metadata.

### Answering
- `POST /api/answer`: pulls top chunks via the search service, composes a short answer with citation metadata, and caches responses (`ANSWER_CACHE_TTL_MS`). Response shape is in `docs/api-contracts.md`.

### Evaluation Suite
- `testing/tests/evalRunner.ts` + fixtures (`testing/fixtures/nl2sql_eval.json`, `rag_eval.json`) run NL→SQL and RAG checks automatically. Run locally with:
  ```bash
  npm --prefix testing install   # once
  EVAL_API_BASE=http://localhost:4000/api npm --prefix testing run eval
  ```

## 📚 Documentation
- `backend/README.md`: updated env table, query/doc/answer API surfaces, DB/migration instructions.
- `ARCHITECTURE.md`: new sections covering Postgres schema, document ingestion flow, and answer composition.
- `docs/api-contracts.md`: definitive request/response schemas for all new endpoints (share this with frontend/QA).

## 👥 Next Steps for Teammates

### Person 2 – Frontend Explore & RAG UI
1. Base all API integrations on `docs/api-contracts.md`.
2. Wire the query panel to `POST /api/query/sql` and `POST /api/query/nl`. Show cache indicators (`cached` flag) and EDA visualizations (`eda` payload).
3. Extend Upload/Data viewers to call `POST /api/upload/doc` and display doc status, chunk counts, and search results from `GET /api/docs/search`.
4. Build the “Docs cited” + Answer panel that hits `POST /api/answer` and uses `citations` metadata to link back to document snippets.
5. For local testing, run the backend (`npm --prefix backend run dev`) and use the curls in this doc or the eval suite to seed data.

### Person 3 – Evaluation/Tooling/Docs
1. Expand `testing/fixtures/*` with the full NL→SQL (≥10) and RAG (≥50) scenarios. Update `evalRunner.ts` as needed to score accuracy, hit-rate@k, and latency targets.
2. Enhance CI (if needed) with additional jobs, e.g., lint/test the frontend or publish evaluation summaries.
3. Keep `docs/api-contracts.md` up to date whenever payloads change; share with QA/UX so they can reference a single source of truth.
4. Document evaluation results (hit-rate, latency, error analysis) in the wiki once the larger datasets are ready.

Let me know if anything in this summary is unclear or if new contracts are needed—otherwise you’re good to continue building on top of the services above.
