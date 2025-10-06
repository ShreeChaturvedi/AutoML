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
```

- `PORT` – Port the HTTP server binds to
- `ALLOWED_ORIGINS` – Comma-separated list of origins allowed via CORS
- `STORAGE_PATH` – Placeholder for future persistence (currently unused while data stays in memory)

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
