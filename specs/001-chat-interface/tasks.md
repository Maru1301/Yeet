---
description: "Task list for ChatGPT-like Chat Interface"
---

# Tasks: ChatGPT-like Chat Interface

**Input**: Design documents from `specs/001-chat-interface/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/chat-api.md ✅, quickstart.md ✅

**Tests**: Not requested in spec — no test tasks generated.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1–US4)
- Exact file paths included in all descriptions

## Path Conventions

Web application layout:
- **Backend**: `main.go`, `store.go` (repo root)
- **Frontend**: `client-app/src/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Verify branch and confirm no foundational blockers.

- [x] T001 Confirm branch `001-chat-interface` is checked out and `client-app/` builds clean (`npm run build:Debug` passes)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Identify the `isError` state needed by US1 and US3 before story work begins.

**⚠️ CRITICAL**: US1 and US3 both depend on the new `isError` ref on Message objects (data-model.md). Add it once here; all stories consume it.

- [x] T002 Add `isError: boolean` field to the in-memory Message shape and `lastPrompt` ref in `client-app/src/components/AI.Chat.vue` — set `lastPrompt` inside the `send()` function before clearing `input`, and set `isError = true` on the last message inside `handleChatStreamError()`

**Checkpoint**: Foundation ready — US1, US3, US4 can now proceed.

---

## Phase 3: User Story 1 — Streaming Response & Error Retry (Priority: P1) 🎯 MVP

**Goal**: Complete the streaming chat loop with a Stop button and a Retry button on error.

**Independent Test**: Open the app, send a message, verify streaming with pulse dots → complete response. Kill the server mid-stream → verify error + Retry button. Click Retry → verify message re-sends.

### Implementation for User Story 1

- [x] T003 [US1] Add a **Stop** button in `client-app/src/components/AI.Chat.vue`: replace the Send `v-btn` with a Stop `v-btn` (icon `mdi-stop`) when `isResponding === true`; on click call `cancelAPI.abort()`, set `isResponding = false`, and finalize the partial message via `handleChatStreamEnd()`
- [x] T004 [US1] Add a **Retry** button in `client-app/src/components/AI.Chat.vue`: below the last message bubble when `isError === true`, render a `v-btn` (text "Retry"); on click, reset `isError`, clear the error message from `messages`, and call `send(false)` using `lastPrompt` as the payload content (set `input.value = lastPrompt` before calling `send(false)`)

**Checkpoint**: US1 fully functional — streaming, stop, and retry all work independently.

---

## Phase 4: User Story 2 — Sidebar Conversation History (Priority: P2)

**Goal**: Sidebar lists all past conversations ordered most-recent-first; clicking one loads its history.

**Independent Test**: Create two conversations, click between them in the sidebar, confirm each loads distinct history. Resize to 375 px — confirm sidebar collapses.

> **Note**: Research confirmed this story is **already fully implemented** in `AI.ChatList.vue` and `AI.Chat.vue` (`initRecords()`). No new tasks required. Verify against quickstart.md §US2 before marking complete.

- [ ] T005 [US2] Verify US2 acceptance scenarios manually using `specs/001-chat-interface/quickstart.md` §"US2 — Sidebar history"; confirm sidebar collapse works at 375 px viewport width

**Checkpoint**: US2 verified complete.

---

## Phase 5: User Story 3 — Conversation Management (Priority: P3)

**Goal**: New chat, delete with confirmation, and auto-title all work correctly.

**Independent Test**: Create a conversation, verify auto-title appears, delete it via ⋯ menu → confirm dialog → confirm removed.

> **Note**: Research confirmed this story is **already fully implemented**. No new tasks required beyond welcome-copy fix (which is included here as it affects the new-chat landing view).

- [x] T006 [US3] Fix welcome-screen copy in `client-app/src/components/AI.Chat.vue`: update the `.chat-subtitle` text to remove the "GPT-5 model" and "@tag" references; replace with copy appropriate for a Gemini-powered personal chat app (e.g., "Ask me anything. Start a conversation below.")
- [ ] T007 [US3] Verify US3 acceptance scenarios manually using `specs/001-chat-interface/quickstart.md` §"US3 — Conversation management"

**Checkpoint**: US3 verified complete with corrected welcome copy.

---

## Phase 6: User Story 4 — Model Selector (Priority: P4)

**Goal**: Model dropdown lists available models; selected model is used for subsequent messages; default pre-selected on load.

**Independent Test**: Open the model selector, pick a non-default model, send a message — response arrives without error.

> **Note**: Research confirmed this story is **already fully implemented** in `AI.ModelSelector.vue`. No new tasks required.

- [ ] T008 [US4] Verify US4 acceptance scenarios manually using `specs/001-chat-interface/quickstart.md` §"US4 — Model selector"

**Checkpoint**: US4 verified complete.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final validation and cleanup across all stories.

- [x] T009 [P] Run `npm run build:Release` in `client-app/` and confirm the frontend embeds correctly in the Go binary (`go build -o yeet .`)
- [x] T010 [P] Run existing Vitest suite (`npm run test:coverage` in `client-app/`) — confirm no regressions from T003/T004/T006 changes
- [ ] T011 Run full quickstart validation end-to-end per `specs/001-chat-interface/quickstart.md` — all scenarios pass

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS US1 and US3 (both need `isError`)
- **US1 (Phase 3)**: Depends on Foundational — delivers Stop + Retry
- **US2 (Phase 4)**: No dependencies on US1; can start after Setup
- **US3 (Phase 5)**: Depends on Foundational (uses `isError` context); can run in parallel with US1 after Foundation
- **US4 (Phase 6)**: No dependencies; can start after Setup
- **Polish (Phase 7)**: Depends on all stories complete

### User Story Dependencies

- **US1**: Foundational → T003 → T004
- **US2**: Independent (already implemented) → T005 verify
- **US3**: Foundational → T006 → T007
- **US4**: Independent (already implemented) → T008 verify

### Parallel Opportunities

- US2 (T005) and US4 (T008) can be verified in parallel after Phase 1
- US3 (T006–T007) can run in parallel with US1 (T003–T004) after Foundational
- Polish tasks T009 and T010 can run in parallel

---

## Parallel Example: After Foundational

```
Parallel track A: T003 → T004  (US1: Stop + Retry buttons)
Parallel track B: T006 → T007  (US3: welcome copy + verify)
Independent:      T005          (US2: verify)
Independent:      T008          (US4: verify)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001)
2. Complete Phase 2: Foundational (T002)
3. Complete Phase 3: US1 — Stop + Retry (T003, T004)
4. **STOP and VALIDATE**: streaming + stop + retry all work
5. Ship MVP

### Incremental Delivery

1. T001–T002 → Foundation ready
2. T003–T004 → US1 complete (Stop + Retry) ← MVP
3. T005 → US2 verified
4. T006–T007 → US3 complete (welcome copy + management)
5. T008 → US4 verified
6. T009–T011 → Polish + full validation

---

## Notes

- [P] = no shared file conflicts, safe to run concurrently
- US2 and US4 require only verification (already implemented)
- The largest implementation work is in `AI.Chat.vue` (T002, T003, T004, T006) — sequence these to avoid conflicts
- Commit after T004 (US1 complete) and after T007 (US3 complete) at minimum
- `isError` flag introduced in T002 is consumed by both T003 and T004 — do not skip T002
