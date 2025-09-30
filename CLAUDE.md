# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a senior capstone project developing an **AI-Native Automated Data Scientist Platform**. The platform is designed to automate tedious data science workflows while giving experienced data scientists full control. It's not a business intelligence tool, but a productivity platform for complex ML use cases.

### Core System Architecture

The platform follows a **project-centric architecture** with five main phases:

1. **Ingestion & Analysis**: Handles structured datasets (CSV, JSON, Excel) and unstructured business context (PDFs, documentation) with automated schema detection and data quality assessment
2. **Query Engine**: Dual-mode interface (natural language + SQL) powered by fine-tuned open-source LLMs for domain-specific data exploration
3. **Domain-Aware Feature Engineering**: RAG-based feature suggestions using vector embeddings of business documents, with full CRUD control for data scientists
4. **Flexible Model Training**: Hybrid approach using parameterized templates for core algorithms + LLM-generated preprocessing code. Supports traditional ML (XGBoost, RandomForest, ARIMA) and supervised fine-tuning of LLMs
5. **Deployment & Monitoring**: Containerized API endpoints with performance dashboards and model interpretation using domain-aware LLMs

### Key Technical Concepts

- **"Control Panel" UI Philosophy**: Users interact with AI decisions through interactive UI elements (toggles, sliders, inputs), not by viewing/editing generated code
- **Structured LLM Output**: LLMs output JSON that the frontend renders as polished UI components, hiding non-deterministic behavior
- **Dual Workflow**: "Express Lane" (accept all automation) vs "Interactive Path" (manual control at any stage)
- **RAG Integration**: Business context documents are embedded in a vector database to inform feature suggestions and model training

### Planned Cloud Architecture

- **Storage Layer**: Object storage (data lake) + managed relational DB with vector embedding support + in-memory caching
- **Compute Layer**: Serverless functions (event-driven tasks) + container orchestration (training, inference)
- **API/Networking Layer**: API gateway for routing, auth, traffic management
- **DevOps Layer**: CI/CD automation + comprehensive observability (logging, metrics, tracing)

## GitLab Workflow

This project uses GitLab for collaboration with specific branch and merge constraints:

### Branch Strategy

- **main**: Protected branch, requires merge requests with approval. Cannot push directly.
- **Current active branch**: `feat/ui-shell` - likely for initial UI/shell development
- Feature branches should follow the pattern established by the team (e.g., `feat/`, `fix/`, `docs/`)

### Merge Request Rules

- All MRs require at least 1 approval
- MR author cannot approve their own MR
- Contributors to an MR cannot approve it
- Push constraints require commit author email from `miamioh.edu`

### Issue Templates

The project includes several GitLab issue templates in `.gitlab/issue_templates/`:
- `user_story.md`: For user story-based development (follows I-N-V-E-S-T principles)
- `ML_Epic.md`, `ML_issue_v1.md`, `ML_issue_v2.md`: ML-specific issue templates
- `debug_report.md`: For bug tracking
- `issue.md`: General issue template

Use these templates when creating issues to maintain consistency.

## Development Status

**⚠️ Early Stage**: Currently in the planning/proposal phase. No implementation code exists yet. The repository contains:
- Project proposal documentation (`Proposal Detailed Brainstorm.txt`, `Senior Design Project Proposal.pdf`)
- GitLab workflow configuration
- Issue and merge request templates

## Future Development Areas

Based on the project vision, expect future development in these areas:
- **Frontend**: Web dashboards (Project Dashboard, Data Preparation, Query Engine, Model Training, Model Registry, Deployment/Monitoring) + CLI for power users
- **Backend**: API services for data ingestion, feature engineering, model training orchestration
- **ML Pipeline**: Integration with scikit-learn, XGBoost, Optuna, and LLM fine-tuning frameworks
- **Data Infrastructure**: Vector database integration (for RAG), relational DB setup, object storage
- **LLM Integration**: Fine-tuning pipelines, prompt engineering, structured output parsing (JSON)
- don't run npm run dev. use some other command just to test functionality. npm run dev runs a dev server on different ports and i don't want that.