# Automated Data Scientist Platform — CSE 448/449

A cloud-hosted, AI-assisted AutoML toolchain to move from raw data to a deployable model with less grunt work and more expert control.

---

## What this is (plain terms)

- **Upload data + docs.** The system profiles your dataset and uses your PDFs/notes as domain context.
- **Explore quickly.** Ask questions in natural language or run direct SQL; get quick EDA tables/charts.
- **Tweak features, not code.** A “feature control panel” shows suggestions you can edit and toggle.
- **Train and compare.** Spin up baseline models, track runs, view basic explainability.
- **Package and monitor.** Ship a containerized API and keep an eye on performance/drift.

---

## Start here (project docs)

- **Overview & scope:** [Senior Design Project Proposal (PDF)](Senior%20Design%20Project%20Proposal.pdf)
- **Background & UX notes:** [Proposal Detailed Brainstorm (TXT)](Proposal%20Detailed%20Brainstorm.txt)
- **Schedule & deliverables:** [Biweekly Sprint Plan v2 (PDF)](Biweekly_Sprint_Plan_v2.pdf)

---

## MVP scope

1. **Ingestion & Context**
   - Schema/type detection, nulls, samples
   - Embed project docs for domain-aware guidance (RAG)

2. **Explore**
   - NL → SQL with safe fallbacks
   - Quick EDA visuals

3. **Feature Control Panel**
   - Suggested transforms (name, method, params) rendered as editable controls

4. **Train**
   - Templated baselines (e.g., XGBoost/LightGBM)
   - Simple interpretability and run tracking

5. **Deploy & Monitor**
   - Containerized endpoint
   - Basic health/drift checks

---

## How we’ll build it (high level)

- **Sprints:** 13 two-week sprints from setup → ingestion → explore → feature panel → training → deploy → demo
- **Contract:** Backend returns compact, validated JSON; frontend renders stable controls from that JSON

---

## Milestones

- **S1–S3:** Repo/CI → Ingestion v1 → Explore v0  
- **S4–S7:** RAG v1 → Feature Panel v1 → Latency/quality passes  
- **S8–S10:** HPO + run tracking → Model packaging  
- **S11:** Guardrails → Cloud deploy → Final demo

---

## Contributing

- Open small, focused PRs with a clear summary and checklist.
- Follow lint/test rules; CI must pass.
- Log issues with steps to reproduce and expected vs. actual behavior.

