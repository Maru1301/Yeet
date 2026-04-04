<!--
Sync Impact Report
==================
Version change: (none) → 1.0.0
Modified principles: N/A (initial ratification)
Added sections: Core Principles (I–V), Stack Constraints, Development Workflow, Governance
Removed sections: All placeholder tokens replaced
Templates reviewed:
  ✅ .specify/templates/plan-template.md — Constitution Check section aligns with principles below
  ✅ .specify/templates/spec-template.md — No principle-driven mandatory sections to add
  ✅ .specify/templates/tasks-template.md — Task categories (setup, foundational, stories) align with principles
Deferred TODOs: none
-->

# Yeet Constitution

## Core Principles

### I. Simplicity First
This is a personal project. Every design decision MUST prefer the simplest solution
that meets the requirement. No speculative abstractions, no over-engineering, no
features added ahead of need (YAGNI). Complexity MUST be explicitly justified; if
a simpler alternative exists it MUST be chosen.

### II. API Contract Integrity
The SSE streaming contract (`{"v":"..."}` chunks) and all `/chat/*` endpoint
shapes are the interface boundary between backend and frontend. Any change to
request/response shapes, SSE event format, or endpoint paths MUST be made
atomically across both sides in the same branch. Breaking changes to the contract
are not permitted without a corresponding frontend update in the same PR.

### III. No CGo
The Go backend MUST remain CGo-free at all times. SQLite access MUST use
`modernc.org/sqlite`. Any new dependency that would require CGo is forbidden.
This constraint ensures the backend compiles and runs without a C toolchain on
all target platforms.

### IV. Frontend Test Coverage
All new frontend logic in `src/global/` and `src/store/` MUST have Vitest unit
tests. UI components require tests only when they contain non-trivial business
logic. Tests MUST pass (`npm run test:coverage`) before a feature is considered
complete.

### V. Single-Binary Deploy Target
The Go backend MUST embed the built frontend assets and serve them as static
files, so the entire app is deployable as a single binary. Build steps that break
this embed (e.g., referencing absolute external paths) are not permitted.

## Stack Constraints

- **Backend**: Go 1.25+, `net/http` stdlib, `modernc.org/sqlite` (no CGo)
- **Frontend**: Vue 3, Vite 6, Vuetify 3, Pinia, Vitest
- **AI Provider**: Google Gemini API (via `API_KEY` env var) — provider changes require a full contract review
- **Persistence**: SQLite only (`yeet.db`); no external databases or caches
- **Auth**: None — single-user personal app; no authentication layer shall be added without explicit scope change

## Development Workflow

- Features follow the speckit workflow: specify → clarify → plan → tasks → implement → analyze
- Each feature lives under `specs/###-feature-name/` with `spec.md`, `plan.md`, `tasks.md`
- Branches use sequential numbering: `###-feature-name`
- Frontend builds (`npm run build:Release`) MUST complete without errors before merging
- Go backend MUST compile (`go build .`) without errors before merging
- Commit after each completed task or logical group; do not batch unrelated changes

## Governance

The constitution supersedes all other practices within this repository. Amendments
require: (1) a clear motivation, (2) updating this file with a version bump,
(3) re-running the speckit consistency propagation checklist across templates.

**Versioning policy**:
- MAJOR: Removal or redefinition of an existing principle
- MINOR: New principle or section added
- PATCH: Clarification, wording fix, or non-semantic refinement

All feature plans MUST include a Constitution Check gate before Phase 0 research.

**Version**: 1.0.0 | **Ratified**: 2026-04-03 | **Last Amended**: 2026-04-03
