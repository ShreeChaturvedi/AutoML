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
- Frontend is now wired to the backend API; project CRUD/phase state persists via `/api/projects` while keeping the previous Zustand UX intact.
- `npm run dev` (in `frontend/`) spins up both backend and frontend with prefixed logs so API requests are visible beside Vite output.
- Dataset ingestion endpoint (`POST /api/upload/dataset`) profiles CSV/JSON/XLSX files, stores metadata/files on disk, and returns column stats + sample rows.
- Dataset metadata can be retrieved via `GET /api/datasets`, enabling automated benchmarks to verify persisted uploads.
- Frontend upload panel pushes tabular files to `/api/upload/dataset` while keeping local previews, and surfaces status badges for backend sync.

### ⏳ Remaining for Sprint 1 Definition of Done
- Set up a CI stub (GitLab pipeline or similar) that executes `npm run lint` and `npm run test` for the backend (and eventually the frontend).

## Sprint 2 Preview (Weeks 3–4)
- Dataset ingestion endpoints (`POST /upload/dataset`) that profile uploaded CSV/XLSX/JSON files.
- Document ingestion (`POST /upload/doc`) with parsing, chunking, and vector storage hooks.
- Search endpoint (`GET /docs/search`) returning RAG-ready chunks.
- Structured backend responses that the frontend renders (schema for dataset cards, document tables, etc.).

## Notes
- Storage currently uses JSON for simplicity; swapping to SQLite/Postgres later should only require replacing the repository implementation.
- CORS allows `http://localhost:5173` by default—no changes needed when the frontend starts calling the API.
- Moderate npm advisories remain after install; run `npm audit` when you are ready to upgrade dependencies.
