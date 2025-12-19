# AI-Augmented AutoML Toolchain

AI-augmented AutoML workspace built as a TypeScript monorepo with a React frontend, Express API, and Playwright benchmarks. The focus is a guided, control-panel workflow for data scientists: upload data, explore with SQL, get preprocessing/feature suggestions, and iterate toward training.

## What Works Today

- Project CRUD with workflow phase navigation (frontend + backend file store).
- Dataset upload for CSV/JSON/XLSX, basic profiling, and Postgres table loading.
- Data Explorer with SQL editor (Monaco), query execution, caching, and EDA summaries.
- Preprocessing analysis + suggestion cards driven by backend heuristics.
- Feature engineering UI + backend apply pipeline that generates derived datasets.
- Document ingestion (PDF/Markdown/TXT), chunking, lightweight embeddings, and search.
- RAG-style answering using retrieved snippets (no LLM yet).
- Training code execution via Pyodide (browser) and Docker runtime (cloud) with package management.
- Playwright benchmark flow and a simple NL→SQL/RAG eval runner.
- Auth flows (login/signup/reset/profile) backed by JWT + refresh tokens when Postgres is configured.

## In Progress / Known Gaps

- NL→SQL is template-based (not LLM-driven); English mode needs richer parsing.
- Cloud execution requires the Docker runtime image to be available or auto-built.
- Auth is wired, but end-to-end validation still requires Postgres + SMTP config.
- DuckDB client exists but is currently unused (backend Postgres is the active query engine).

## System Requirements

- Node.js 22 LTS
- npm 10+
- Postgres 16+ (required for auth, query, documents, answers, preprocessing)
- Docker Desktop (recommended for the one-command `npm run dev` flow)

## Quick Start

Install workspace dependencies:

```bash
npm run install:all
```

Run the full stack (auto-starts a Docker Postgres container named `automl-postgres-5433` on `localhost:5433`, writes `backend/.env` if missing, and applies migrations):

```bash
npm run dev
```

If you already run Postgres elsewhere, update `backend/.env` with your own `DATABASE_URL` and rerun `npm run dev`.

Optional commands:

```bash
npm --prefix backend run dev      # backend only
npm --prefix frontend run dev:ui  # frontend only
npm run dev:backend              # backend only (root shortcut)
npm run dev:ui                   # frontend only (root shortcut)
npm --prefix backend run benchmark:api  # API latency/throughput benchmark
npm run benchmark                # Playwright benchmark
npm run eval                     # NL→SQL + RAG eval (requires backend)
```

## Documentation

- `ARCHITECTURE.md` — system topology, data flow, and storage layout
- `PROGRESS.md` — verified feature status and known gaps
- `DECISIONS.md` — ADR-style architectural decisions
- `docs/api-contracts.md` — request/response contracts for key endpoints
- `docs/design-system.md` — frontend layout, typography, and color guidelines

## Repository Structure

```
backend/   Express + TypeScript API
frontend/  Vite + React UI
testing/   Playwright benchmark + eval runner
```

## License

TBD (internal project).
