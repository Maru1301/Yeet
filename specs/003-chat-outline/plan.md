# Implementation Plan: Chat Outline

**Branch**: `003-chat-outline` | **Date**: 2026-04-05 | **Spec**: [spec.md](spec.md)  
**Input**: Feature specification from `/specs/003-chat-outline/spec.md`

## Summary

Add a Chat Outline overlay to the main chat view. The overlay floats over the right side of the chat content area and displays one entry per message, labelled with the first 8 words of that message (≤60 chars). Clicking an entry scrolls the chat to that message; the active entry tracks the user's scroll position. The outline is derived from the existing `messages` table — no new DB schema required.

## Technical Context

**Language/Version**: Go 1.25 (backend) / TypeScript + Vue 3 (frontend)  
**Primary Dependencies**: `net/http` stdlib, `modernc.org/sqlite` (Go); Vue 3, Vuetify 3, Pinia, Vitest (frontend)  
**Storage**: SQLite (`yeet.db`) — existing `messages` table, no new tables  
**Testing**: Vitest (frontend unit tests for new store + label utility)  
**Target Platform**: Desktop browser (Chrome/Edge), served as single binary  
**Project Type**: Web service (single-binary Go backend + embedded Vue SPA)  
**Performance Goals**: Outline endpoint responds in <100ms; frontend renders entries <500ms; active-entry scroll tracking at ≤16ms per scroll event  
**Constraints**: No CGo; no new Go dependencies; label derivation is pure string processing  
**Scale/Scope**: Single-user personal app; conversations up to ~200 messages

## Constitution Check

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Simplicity First | ✅ Pass | Outline derived from existing messages; no new table; no new Go dependency; overlay uses absolute positioning within existing chatbox |
| II. API Contract Integrity | ✅ Pass | New endpoint `/chat/outline/` does not alter any existing endpoint shape; `role` values match existing `/chat/record/` normalisation |
| III. No CGo | ✅ Pass | No new Go dependencies; all processing is stdlib string operations |
| IV. Frontend Test Coverage | ✅ Pass | New `src/store/outline.ts` and label utility in `src/global/` will have Vitest unit tests |
| V. Single-Binary Deploy | ✅ Pass | No changes to embed structure or build steps |

**Gate result**: All principles satisfied. Proceed to Phase 1.

## Project Structure

### Documentation (this feature)

```text
specs/003-chat-outline/
├── plan.md              ← this file
├── research.md          ← Phase 0 output
├── data-model.md        ← Phase 1 output
├── quickstart.md        ← Phase 1 output
├── contracts/
│   └── outline-api.md   ← Phase 1 output
└── tasks.md             ← Phase 2 output (/speckit-tasks)
```

### Source Code Changes

```text
# Backend
main.go                                      ← add handleOutline(), register route

# Frontend — new files
client-app/src/store/outline.ts              ← Pinia outline store
client-app/src/global/outline.utils.ts       ← label derivation (first 8 words, ≤60 chars)
client-app/src/components/AI.ChatOutline.vue ← floating overlay component
client-app/src/__tests__/outline.spec.ts     ← unit tests (store + label util)

# Frontend — modified files
client-app/src/global/gpt.api.service.ts     ← add outline endpoint definition
client-app/src/components/AI.Chat.vue        ← toggle button, scroll tracking, store wiring
```

**Structure Decision**: Web application (Go backend + Vue SPA). Changes are isolated to one new backend handler, one new frontend component, one new store, and one new utility. No new directories beyond the existing `src/store/`, `src/global/`, and `src/components/` layout.

## Complexity Tracking

No constitution violations. Table not required.
