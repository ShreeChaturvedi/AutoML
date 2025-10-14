# AI-Augmented AutoML Toolchain

Modern AutoML workspace combining a TypeScript/Express API, a React data science UI, and an end-to-end Playwright benchmark. Built and maintained by the CSE 448 capstone team.

## Table of Contents
- [Overview](#overview)
- [Key Features](#key-features)
- [System Requirements](#system-requirements)
- [Getting Started](#getting-started)
  - [Install Dependencies](#install-dependencies)
  - [Configure Environment](#configure-environment)
  - [Run the Stack](#run-the-stack)
- [Development Workflow](#development-workflow)
- [Repository Structure](#repository-structure)
- [Tooling & Commands](#tooling--commands)
- [Documentation](#documentation)
- [Data Storage](#data-storage)
- [Support](#support)
- [License](#license)

## Overview

The AI-Augmented AutoML Toolchain streamlines dataset ingestion, exploratory analysis, and model workflow orchestration. The solution ships as a monorepo with three coordinated workspaces:

1. `backend/` – Express + TypeScript API exposing project management and dataset profiling endpoints.
2. `frontend/` – Vite + React SPA delivering the AutoML user experience.
3. `testing/` – Playwright benchmark suite validating critical user journeys against compiled artifacts.

Refer to `ARCHITECTURE.md` for a detailed system design and interaction diagram.

## Key Features

- Project lifecycle management with persisted metadata and workflow phase tracking.
- Dataset ingestion pipeline with CSV/JSON/XLSX profiling, schema inference, and sample extraction.
- Rich client UI with drag-and-drop uploads, tabbed data viewer, and Tailwind + shadcn component system.
- Unified developer command (`npm --prefix frontend run dev`) that launches both frontend and backend in watch mode.
- Automated Playwright benchmark (`npm run benchmark`) that builds both workspaces and verifies end-to-end flows.

## System Requirements

- **Node.js**: 22 LTS
- **npm**: 10+
- **OS**: macOS, Linux, or Windows (WSL recommended)
- Optional: Chromium download permissions for Playwright benchmark runs.

## Getting Started

### Install Dependencies

From the repository root, install workspace dependencies:

```bash
npm --prefix backend install
npm --prefix frontend install
npm --prefix testing install   # required for automated benchmark
```

### Configure Environment

1. Copy environment template if backend defaults need adjustment:
   ```bash
   cp backend/.env.example backend/.env
   ```
2. Update values such as `PORT`, `ALLOWED_ORIGINS`, and storage paths as needed (see `backend/src/config.ts`).

### Run the Stack

```bash
npm --prefix frontend run dev
```

The command above launches:
- Backend API at `http://localhost:4000/api`
- Vite dev server at `http://localhost:5173`

Run the workspaces individually when required:
- `npm --prefix backend run dev` – backend only
- `npm --prefix frontend run dev:ui` – frontend only

## Development Workflow

1. **Code** – Implement changes in the appropriate workspace.
2. **Lint/Test** – Execute local checks:
   - `npm --prefix backend run lint`
   - `npm --prefix frontend run lint`
3. **Validate End-to-End** – `npm run benchmark` (headless) or `npm run benchmark:headed` (with browser UI).
4. **Review** – Ensure docs and type definitions are updated before submitting changes.

## Repository Structure

```text
ai-augmented-auto-ml-toolchain/
├── ARCHITECTURE.md
├── backend/
│   ├── src/
│   └── storage/
├── frontend/
│   └── src/
├── testing/
│   └── tests/
└── Attachments/
```

- Application flows and file-level references are documented in `ARCHITECTURE.md`.
- Workspace-specific guidance lives in `backend/README.md` and `frontend/README.md`.

## Tooling & Commands

| Context | Command | Description |
| ------- | ------- | ----------- |
| Root | `npm run benchmark` | Build backend + frontend, run Playwright benchmark headlessly. |
| Root | `npm run benchmark:headed` | Same as above but displays the Chromium window. |
| Backend | `npm --prefix backend run dev` | Start API with hot reload (`tsx watch`). |
| Backend | `npm --prefix backend run build` | Compile TypeScript into `build/`. |
| Backend | `npm --prefix backend run start` | Serve compiled backend. |
| Frontend | `npm --prefix frontend run dev` | Launch combined dev environment (frontend + backend). |
| Frontend | `npm --prefix frontend run build` | Type-check and produce production bundle. |
| Frontend | `npm --prefix frontend run preview` | Serve the built frontend for validation. |

## Documentation

- `ARCHITECTURE.md` – System architecture, diagrams, and data flows.
- `backend/README.md` – Backend scripts, environment variables, and API surface.
- `frontend/README.md` – Frontend capabilities, tech stack, and troubleshooting.
- `Attachments/` – Supporting materials, design artifacts, and historical context.

## Data Storage

The backend persists data under `backend/storage/` by default:

- `storage/projects.json` – Project metadata and workflow phases.
- `storage/datasets/metadata.json` – Dataset profiles (schema, inferred types, sample).
- `storage/datasets/files/<datasetId>/<filename>` – Raw dataset binaries.

Override these locations via environment variables (`STORAGE_PATH`, `DATASET_METADATA_PATH`, `DATASET_STORAGE_DIR`).

## Support

- Issues and enhancements are tracked through the team’s Git hosting platform.
- For urgent runtime incidents, contact the current backend or frontend owner within the capstone team.

## License

To be determined (internal project).
