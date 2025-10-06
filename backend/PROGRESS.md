# Backend Progress

This log tracks the backend deliverables for the AI-Augmented AutoML Toolchain and what still remains.

## Sprint 1 Scope (Weeks 1–2)

### ✅ Completed
- Express + TypeScript service scaffold with hot-reload dev script, build, lint, and test commands.
- Environment configuration loader (`PORT`, `ALLOWED_ORIGINS`, `STORAGE_PATH`) and `.env.example` for onboarding.
- Core routes:
  - `GET /api/health` – returns status, uptime, timestamp, and host information.
  - `GET/POST/PATCH/DELETE /api/projects` – CRUD API backed by the repository layer.
- JSON file persistence via `storage/projects.json`, including schema validation and automatic directory creation.
- Vitest + Supertest integration test covering create/list persistence across app restarts.
- Documentation updates in `backend/README.md` outlining scripts, environment variables, and the API surface.

### ⏳ Remaining for Sprint 1 Definition of Done
- Provide a single top-level command (or script) that runs both frontend and backend together.
- Set up a CI stub (GitLab pipeline or similar) that executes `npm run lint` and `npm run test` for the backend (and eventually the frontend).
- Wire the frontend project state to these APIs so persisted projects are surfaced in the UI (currently still local-only).

## Sprint 2 Preview (Weeks 3–4)
- Dataset ingestion endpoints (`POST /upload/dataset`) that profile uploaded CSV/XLSX/JSON files.
- Document ingestion (`POST /upload/doc`) with parsing, chunking, and vector storage hooks.
- Search endpoint (`GET /docs/search`) returning RAG-ready chunks.
- Structured backend responses that the frontend renders (schema for dataset cards, document tables, etc.).

## Notes
- Storage currently uses JSON for simplicity; swapping to SQLite/Postgres later should only require replacing the repository implementation.
- CORS allows `http://localhost:5173` by default—no changes needed when the frontend starts calling the API.
- Moderate npm advisories remain after install; run `npm audit` when you are ready to upgrade dependencies.
