# Tasks: Chat Outline

**Input**: Design documents from `/specs/003-chat-outline/`  
**Branch**: `003-chat-outline` | **Date**: 2026-04-05  
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅

**Tests**: Included — spec requests Vitest unit tests for the outline store and label utility.

**Organization**: Tasks grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: No new project infrastructure required — Go, Vue, Vitest, and SQLite are already configured. This phase is intentionally minimal.

- [x] T001 Verify feature branch `003-chat-outline` is active and working directory is clean

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Label derivation utility — shared by backend (Go) and indirectly drives frontend test coverage. Must be complete before US1 backend work begins.

**⚠️ CRITICAL**: Backend handler and frontend store both depend on the label contract being settled here.

- [x] T002 Implement `deriveLabel(content string) string` in `main.go` (inline helper): strip leading whitespace, skip code fence lines, take first 8 whitespace-separated tokens, join with single space, trim to last full word within 60 UTF-8 bytes, append `…` if trimmed, return `"[media]"` if result is empty — per `data-model.md` Label Derivation Rules
- [x] T003 [P] Implement `deriveLabel(content: string): string` utility in `client-app/src/global/outline.utils.ts`: same 8-word / 60-char rules as T002 (used by US3 live-update path)
- [x] T004 [P] Write Vitest unit tests for `deriveLabel` in `client-app/src/__tests__/outline.spec.ts`: cover normal sentence, code-fence prefix, short single word, empty string, string >60 chars mid-word, emoji/Unicode — assert each expected label output

**Checkpoint**: Label logic is tested and agreed — backend and frontend will produce identical labels for the same content.

---

## Phase 3: User Story 1 — View Structured Outline of a Conversation (Priority: P1) 🎯 MVP

**Goal**: User opens the Chat Outline overlay and sees one labeled entry per message in the current conversation.

**Independent Test**: Open any existing conversation (≥2 messages), click the outline toggle, confirm the floating overlay appears on the right side of the chat area with one entry per message, each showing the first ~8 words of that message.

### Implementation for User Story 1

- [x] T005 [US1] Add `handleOutline()` to `main.go`: query `SELECT role, content FROM messages WHERE conversation_id = ? ORDER BY rowid ASC`, build JSON array `{"entries":[{"index":N,"role":"...","label":"..."}]}` using `deriveLabel` (T002), register route `POST /chat/outline/{conversationId}` — per `contracts/outline-api.md`
- [x] T006 [P] [US1] Create Pinia outline store `client-app/src/store/outline.ts`: define `OutlineEntry` and `OutlineState` interfaces, implement `fetchEntries(conversationId)` action (calls API, populates `entries`, sets `conversationId`), `setVisible(v)`, `setActiveIndex(i)` — per `data-model.md` Frontend State Shape
- [x] T007 [P] [US1] Add `outline` endpoint definition to `client-app/src/global/gpt.api.service.ts`: `POST /chat/outline/{conversationId}` returning `{ entries: OutlineEntry[] }`
- [x] T008 [US1] Create `client-app/src/components/AI.ChatOutline.vue`: floating overlay (`position: absolute`, top-right of `.chatbox`, width 260px, height 100%, overflow-y auto, semi-transparent background), renders `v-for` list of entries with `index`, `role` chip, and `label` text; shows empty-state text when `entries` is empty; conditionally rendered via `v-if="outlineStore.visible"`
- [x] T009 [US1] Mount `AI.ChatOutline.vue` inside `client-app/src/components/AI.Chat.vue`: import component, add outline toggle button to chat header (icon button), wire `outlineStore.setVisible(!outlineStore.visible)` on click, ensure `.chatbox` has `position: relative` for absolute child positioning
- [x] T010 [US1] Wire outline fetch on conversation load in `AI.Chat.vue` `initRecords()`: after messages load, call `outlineStore.fetchEntries(conversationId)` if outline is visible or store `conversationId` changed

**Checkpoint**: US1 fully functional — toggle opens overlay, entries display for any loaded conversation, empty state shown for empty conversation.

---

## Phase 4: User Story 2 — Navigate to a Section via the Outline (Priority: P2)

**Goal**: Clicking an outline entry scrolls the chat to the corresponding message and the active entry tracks scroll position.

**Independent Test**: With outline open, click any non-visible entry — chat must scroll to that message. Then manually scroll the chat — the highlighted entry in the outline must update to reflect the topmost visible message.

### Implementation for User Story 2

- [x] T011 [US2] Emit `click` event from `AI.ChatOutline.vue` entries: each entry emits `{ index }` when clicked; parent handler scrolls `chatBox` to the DOM element at `data-message-index="N"` using `scrollIntoView({ behavior: 'smooth', block: 'start' })` and calls `outlineStore.setActiveIndex(index)`
- [x] T012 [US2] Add `data-message-index` attributes to message rows in `AI.Chat.vue`: each rendered message element gets `data-message-index="N"` (zero-based) so the scroll target can be located by `querySelector`
- [x] T013 [US2] Implement scroll-tracking in `AI.Chat.vue`: on `chatBox` scroll event, iterate message elements via `querySelectorAll('[data-message-index]')`, use `getBoundingClientRect()` to find the last element whose top is at or above the chatBox midpoint, call `outlineStore.setActiveIndex(N)` — per `research.md` Decision 2
- [x] T014 [US2] Apply active-entry highlight style in `AI.ChatOutline.vue`: bind `:class="{ active: index === outlineStore.activeIndex }"` on each entry row; add CSS for `.active` (background highlight, left border accent)

**Checkpoint**: US1 + US2 both functional — view outline and click-to-scroll both work; active entry tracks scroll.

---

## Phase 5: User Story 3 — Outline Updates as the Conversation Progresses (Priority: P3)

**Goal**: When a new message is sent or received during an active chat session, a new outline entry appears immediately without a network round-trip.

**Independent Test**: With outline open, send a new message — within 500ms a new entry appears at the bottom of the outline labelled with the opening words of that message.

### Implementation for User Story 3

- [x] T015 [US3] Add `appendEntry(content: string, role: string)` action to `client-app/src/store/outline.ts`: derives label client-side using `deriveLabel` (T003), pushes `{ index: entries.length, role, label }` to `entries`
- [x] T016 [US3] Call `outlineStore.appendEntry(content, role)` in `AI.Chat.vue` after each message is appended to the chat: once for the outgoing user message and once when the assistant response stream completes
- [x] T017 [US3] Add Vitest unit tests for `appendEntry` and `fetchEntries` store actions in `client-app/src/__tests__/outline.spec.ts`: mock `gpt.api.service.ts` fetch, assert state transitions for open/close, fetch populates entries, append adds correct entry with derived label

**Checkpoint**: All three user stories functional — view outline, navigate, and live updates all work end-to-end.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: UX refinements and validation against the quickstart.md verification checklist.

- [x] T018 [P] Style `AI.ChatOutline.vue` for visual polish: semi-transparent backdrop (`rgba` background), subtle scrollbar styling, entry hover state, smooth `v-if` transition (CSS `transition: opacity`)
- [x] T019 [P] Handle edge-case labels in `AI.ChatOutline.vue`: entries with `label === "[media]"` display with italic style or a media icon; very short labels (≤2 chars) display without truncation ellipsis
- [ ] T020 Run quickstart.md verification steps 1–10 manually: confirm overlay positioning, scroll-to-message, active entry tracking, new-message append, and Live Mode compatibility all pass
- [x] T021 [P] Review `main.go` `handleOutline` for error path: return `{"entries":[]}` (not 500) for unknown `conversationId`; return 500 only on actual DB error — per `contracts/outline-api.md` Error Responses

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 — BLOCKS all user stories
- **Phase 3 (US1)**: Depends on Phase 2 (needs `deriveLabel` in Go)
- **Phase 4 (US2)**: Depends on Phase 3 (needs `data-message-index` DOM attributes from T012, outline component from T008)
- **Phase 5 (US3)**: Depends on Phase 2 (needs `outline.utils.ts` from T003) and Phase 3 (needs `appendEntry` action wired into store)
- **Phase 6 (Polish)**: Depends on Phases 3–5

### User Story Dependencies

- **US1 (P1)**: Can start after Phase 2 — no dependency on US2 or US3
- **US2 (P2)**: Depends on US1 (needs overlay component + store from US1)
- **US3 (P3)**: Depends on US1 (needs `outline.ts` store); independent of US2

### Within Each User Story

- Backend endpoint (T005) can be implemented in parallel with frontend store (T006) and API service (T007)
- Component (T008) depends on store (T006) being defined
- Wiring into AI.Chat.vue (T009, T010) depends on component (T008) existing

### Parallel Opportunities

- T003 (frontend `deriveLabel`) and T004 (Vitest tests) can run in parallel with T002 (Go `deriveLabel`) in Phase 2
- T006 (outline store) and T007 (API service) can run in parallel with T005 (Go handler) in Phase 3
- T018, T019, T021 can all run in parallel in Phase 6

---

## Parallel Example: User Story 1

```bash
# After Phase 2 completes, launch these in parallel:
Task: "T005 — handleOutline() in main.go"
Task: "T006 — outline.ts Pinia store"
Task: "T007 — gpt.api.service.ts outline endpoint"

# Then sequentially:
Task: "T008 — AI.ChatOutline.vue component (needs T006)"
Task: "T009 — mount in AI.Chat.vue (needs T008)"
Task: "T010 — wire fetch in initRecords (needs T009)"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001)
2. Complete Phase 2: Foundational (T002–T004)
3. Complete Phase 3: User Story 1 (T005–T010)
4. **STOP and VALIDATE**: Open existing conversation, toggle outline, confirm entries appear
5. Deploy/demo if ready

### Incremental Delivery

1. Setup + Foundational → label logic settled and tested
2. US1 → View outline → validate independently → demo
3. US2 → Click-to-scroll → validate independently → demo
4. US3 → Live updates → validate independently → demo
5. Polish → final QA per quickstart.md

### Single-Developer Order

T001 → T002 → T003 + T004 (parallel) → T005 + T006 + T007 (parallel) → T008 → T009 → T010 → T011 → T012 → T013 → T014 → T015 → T016 → T017 → T018 + T019 + T021 (parallel) → T020

---

## Notes

- [P] tasks = different files, no cross-task dependencies within the phase
- Each user story is independently testable per its Checkpoint
- Tests (T004, T017) use Vitest — run with `npx vitest run src/__tests__/outline.spec.ts` from `client-app/`
- Go `handleOutline` uses inline SQL (no changes to `store.go`) per plan.md
- `outline.utils.ts` `deriveLabel` must produce identical output to Go `deriveLabel` for the same input — validate with shared test cases in T004
- Commit after each phase checkpoint to preserve independently working increments
