# Implementation Plan: ChatGPT-like Chat Interface

**Branch**: `001-chat-interface` | **Date**: 2026-04-03 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `specs/001-chat-interface/spec.md`

## Summary

Deliver a polished ChatGPT-like chat experience. The core infrastructure (streaming SSE,
sidebar with history, markdown rendering, model selector, auto-title) is already in place.
This plan focuses on the delta: fixing the welcome-screen copy, adding a stop-generation
button, surfacing a copy-message action, and cleaning up minor UX gaps that separate the
current state from a production-grade ChatGPT feel.

## Technical Context

**Language/Version**: TypeScript 5.8 (frontend), Go 1.25+ (backend)  
**Primary Dependencies**: Vue 3.5, Vuetify 3.8, Pinia 2, markdown-it 14, highlight.js 11, Vitest 3  
**Storage**: SQLite via Go backend (`modernc.org/sqlite`, no CGo)  
**Testing**: Vitest + @vue/test-utils (frontend), `go test` (backend)  
**Target Platform**: Web browser (desktop + mobile ≥375 px), served as embedded static files from Go binary  
**Project Type**: Web application — Vue 3 SPA + Go HTTP backend  
**Performance Goals**: Streaming response visible within 2 s; history load within 1 s  
**Constraints**: No CGo; single-binary deploy (frontend embedded in Go binary); responsive to 375 px  
**Scale/Scope**: Single user, personal app

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Check | Notes |
|---|---|---|
| I. Simplicity First | ✅ PASS | Building on existing components; no new abstractions unless required |
| II. API Contract Integrity | ✅ PASS | No changes to SSE format or `/chat/*` endpoint shapes |
| III. No CGo | ✅ PASS | Backend untouched; all work is frontend-only |
| IV. Frontend Test Coverage | ✅ PASS | Vitest tests required for any new service/store logic |
| V. Single-Binary Deploy | ✅ PASS | No changes to embed mechanism |

No violations. No complexity justification required.

## Project Structure

### Documentation (this feature)

```text
specs/001-chat-interface/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── chat-api.md
└── tasks.md             # Phase 2 output (/speckit-tasks)
```

### Source Code (repository root)

```text
main.go                  # Backend HTTP handlers — unchanged
store.go                 # SQLite access — unchanged

client-app/
  src/
    components/
      AI.Chat.vue            # Main chat layout — welcome copy + stop button
      AI.ChatList.vue        # Sidebar — unchanged (already complete)
      AI.ChatActions.vue     # Message actions — copy button polish
      AI.ModelSelector.vue   # Model picker — unchanged
      AI.Textarea.vue        # Input area — unchanged
    global/
      gpt.api.service.ts     # API definitions — unchanged
    __tests__/
      chat.spec.ts           # Existing; extend with new scenarios
```

**Structure Decision**: Web application layout (Option 2). Frontend in `client-app/`, backend
at repo root. Both already exist; no new top-level directories needed.

## Phase 0: Research

### Existing implementation audit

| Spec Requirement | Status | Location |
|---|---|---|
| FR-001 Distinct user/assistant bubbles | ✅ Exists | `AI.Chat.vue` `.chat-user` / `.chat-bot` |
| FR-002 Streaming incremental response | ✅ Exists | `AI.Chat.vue` `processChatStreamChunk` |
| FR-003 Markdown + code highlighting | ✅ Exists | `AI.Chat.vue` markdown-it + highlight.js |
| FR-004 Typing/loading indicator | ✅ Exists | `AI.Chat.vue` `.pulse-loader` |
| FR-005 Prevent empty submission | ✅ Exists | `AI.Chat.vue` `canSend` computed |
| FR-006 Sidebar with conversation list | ✅ Exists | `AI.ChatList.vue` |
| FR-007 Load conversation history | ✅ Exists | `AI.Chat.vue` `initRecords()` |
| FR-008 Auto-generated title | ✅ Exists | `AI.Chat.vue` `genTopic` after 2nd message |
| FR-009 New conversation | ✅ Exists | `AI.Chat.vue` `newChat()` |
| FR-010 Delete with confirmation | ✅ Exists | `AI.ChatList.vue` `confirmDelete()` |
| FR-011 Model selector | ✅ Exists | `AI.ModelSelector.vue` |
| FR-012 Inline error + retry | ⚠️ Partial | Error text shown; no explicit "retry" button |

### Gap analysis

Three gaps need addressing to fully satisfy the spec:

1. **Welcome-screen copy** (`AI.Chat.vue` line ~42–48): references "GPT-5 model" and "@tag"
   workflow that don't apply to this Gemini-powered personal app. Copy must be updated.

2. **Stop generation button**: While `cancelAPI.abort()` is called on `newChat`, there is no
   dedicated "Stop" button visible during streaming. ChatGPT always shows a stop affordance.

3. **Retry affordance on error** (FR-012): The error message is shown inline but there is no
   retry button. The user must re-type. A "Retry" button re-submitting the last user message
   closes this gap.
