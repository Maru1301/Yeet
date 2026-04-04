---
description: "Task list for Live Mode"
---

# Tasks: Live Mode

**Input**: Design documents from `specs/002-live-mode/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/live-api.md ✅, quickstart.md ✅

**Tests**: Not requested in spec — no test tasks generated (service/store test files listed as polish tasks).

**Organization**: Tasks grouped by user story; each story independently testable.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Safe to run in parallel (different files, no shared dependencies)
- **[Story]**: US1–US4 maps to spec.md priorities

## Path Conventions

- **Backend**: `main.go`, `store.go` (repo root)
- **Frontend**: `client-app/src/`

---

## Phase 1: Setup

**Purpose**: Add dependency, create file skeletons, configure routing.

- [x] T001 Add `github.com/gorilla/websocket` to Go module: run `go get github.com/gorilla/websocket` in repo root and commit updated `go.mod` / `go.sum`
- [x] T002 [P] Create empty file skeletons (no logic yet): `client-app/src/global/live.api.service.ts`, `client-app/src/global/live.audio.service.ts`, `client-app/src/store/live.ts`, `client-app/src/worklets/mic-processor.js`
- [x] T003 [P] Create empty Vue component files: `client-app/src/components/AI.LiveMode.vue`, `client-app/src/components/AI.LiveTranscript.vue`, `client-app/src/components/AI.VoiceSelector.vue`
- [x] T004 Add `/live` route to `client-app/src/router/index.ts` pointing to `AI.LiveMode.vue`; add a "Live" navigation entry in `client-app/src/components/AI.ChatList.vue`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Backend relay infrastructure and SQLite schema change — required by all user stories.

⚠️ **CRITICAL**: All US phases depend on this foundation being complete.

- [x] T005 Add `isLive` column to SQLite conversations table in `store.go`: add `ALTER TABLE conversations ADD COLUMN isLive INTEGER NOT NULL DEFAULT 0` to the `initDB` migration block (guard with `IF NOT EXISTS` pattern already used in codebase)
- [x] T006 Add `saveLiveSession(conversationID string, turns []liveTurn) error` function to `store.go` that inserts a conversation (with `isLive=1`) and its transcript turns as messages in a single transaction
- [x] T007 Implement `/live/voices` REST endpoint in `main.go`: `POST` handler returning the hardcoded voice preset list from `contracts/live-api.md`
- [x] T008 Implement the Go WebSocket relay handler in `main.go`:
  - Register `GET /live/ws` with gorilla/websocket upgrader
  - On browser connect: read `model` + `voice` query params, open Gemini Live WebSocket with `BidiGenerateContentSetup` message
  - Goroutine A: read from browser WS → write to Gemini WS
  - Goroutine B: read from Gemini WS → write to browser WS, buffer transcript turns
  - On close (either side): call `saveLiveSession`, send `session_saved` message to browser, close both connections
- [x] T009 Implement `live.api.service.ts` in `client-app/src/global/live.api.service.ts`:
  - `connect(model, voice): WebSocket` — opens `ws://.../live/ws?model=&voice=`
  - `send(ws, message)` — sends typed JSON message
  - Typed message interfaces matching `contracts/live-api.md` (both directions)
- [x] T010 Implement `live.ts` Pinia store in `client-app/src/store/live.ts`:
  - State: `status`, `sessionId`, `voice`, `transcript: TranscriptEntry[]`, `isPushToTalk` (from `data-model.md`)
  - Actions: `setStatus`, `setSessionId`, `setVoice`, `appendTranscript`, `markTurnComplete`, `markInterrupted`, `reset`
  - Load/persist `voice` from `localStorage` key `lastUsedVoice`; default `"Aoede"`

**Checkpoint**: Backend relay functional; frontend WS service and store ready — US1 can begin.

---

## Phase 3: User Story 1 — Core Voice Conversation (Priority: P1) 🎯 MVP

**Goal**: User starts a session, speaks, hears the AI respond in speech, sees the live transcript, ends the session — which is then saved to history.

**Independent Test**: Open `/live`, click Start, speak a sentence, verify AI audio response + transcript, click End, verify session in sidebar. See `quickstart.md §US1`.

- [x] T011 [US1] Implement `mic-processor.js` AudioWorklet in `client-app/src/worklets/mic-processor.js`: capture input PCM samples as `Float32Array`, convert to Int16 PCM, post as `ArrayBuffer` to main thread; expose `recording` parameter to gate capture
- [x] T012 [US1] Implement `live.audio.service.ts` in `client-app/src/global/live.audio.service.ts`:
  - `startMic(ws)`: creates `AudioContext` at 16 kHz, loads worklet via inline blob URL, opens mic with `getUserMedia`, pipes through worklet, sends PCM chunks as base64 `audio` WS messages
  - `stopMic()`: disconnects worklet, closes mic stream
  - `playChunk(base64PCM)`: decodes base64 → Int16 PCM → `Float32Array`, schedules on `AudioContext` using `AudioBufferSourceNode` for gapless queued playback
  - `stopPlayback()`: cancels any queued audio
- [x] T013 [US1] Implement `AI.LiveTranscript.vue` in `client-app/src/components/AI.LiveTranscript.vue`: renders `transcript` array from live store; user turns right-aligned, assistant turns left-aligned (mirrors chat bubble style); incomplete assistant turns show a pulsing cursor at end of text
- [x] T014 [US1] Implement `AI.LiveMode.vue` in `client-app/src/components/AI.LiveMode.vue` — core session flow:
  - Start button: calls `live.api.service.connect`, sends `ready` after `session_ready` received, calls `live.audio.service.startMic`
  - Handles incoming WS messages: `audio` → `playChunk`; `transcript` → store `appendTranscript`; `session_saved` → update store, refresh sidebar
  - End button: sends `end` message, calls `stopMic`, calls `stopPlayback`
  - Status indicator: shows `idle / connecting / active / ending` from store
  - Mic active indicator: animated icon while `status === 'active'`
  - AI speaking indicator: animated icon while receiving `audio` chunks
  - Error display: shows `error` message inline; resets to idle

**Checkpoint**: Full voice conversation works end-to-end. Session saved to sidebar on end.

---

## Phase 4: User Story 2 — Interruption (Priority: P2)

**Goal**: User speaks while AI is responding; AI stops and answers the new input.

**Independent Test**: Ask for a long response, speak mid-answer, verify AI stops and responds to new input. See `quickstart.md §US2`.

> **Note**: Interruption is handled natively by Gemini Live — sending audio while AI is outputting causes it to stop. The only work here is correctly reflecting the interrupted state in the transcript UI.

- [x] T015 [US2] Handle `interrupted` WS message in `AI.LiveMode.vue` (`client-app/src/components/AI.LiveMode.vue`): on receipt, call store `markInterrupted` on the last incomplete assistant turn; update `AI.LiveTranscript.vue` to render interrupted turns with a visual strikethrough or "↩ interrupted" label
- [ ] T016 [US2] Verify interruption end-to-end using `quickstart.md §US2`; confirm transcript correctly shows interrupted turns

**Checkpoint**: Interruption reflected in transcript; native Gemini behaviour confirmed working.

---

## Phase 5: User Story 3 — Voice Selection (Priority: P3)

**Goal**: User picks a voice preset; it persists across sessions; AI speaks in the selected voice.

**Independent Test**: Select Charon, start session, verify audibly different voice; refresh page, verify Charon still selected. See `quickstart.md §US3`.

- [x] T017 [US3] Implement `AI.VoiceSelector.vue` in `client-app/src/components/AI.VoiceSelector.vue`:
  - On mount: call `GET /live/voices` (via `live.api.service.ts`) to populate preset list
  - Renders a dropdown/select with `displayName` for each preset
  - On change: call store `setVoice(id)` which updates `localStorage` and state
  - Shows currently selected voice as default
- [x] T018 [US3] Integrate `AI.VoiceSelector.vue` into `AI.LiveMode.vue` settings panel (`client-app/src/components/AI.LiveMode.vue`): render selector in a settings row above the Start button; disable selector while `status !== 'idle'`

**Checkpoint**: Voice selection persists; selected voice audibly used in session.

---

## Phase 6: User Story 4 — Push-to-Talk Fallback (Priority: P4)

**Goal**: Toggle PTT mode; mic only captures while Talk button is held.

**Independent Test**: Enable PTT, hold button, speak, release; verify AI only receives audio while held. See `quickstart.md §US4`.

- [x] T019 [US4] Add PTT toggle and Talk button to `AI.LiveMode.vue` (`client-app/src/components/AI.LiveMode.vue`):
  - Settings row: toggle switch "Push-to-talk" bound to store `isPushToTalk`
  - When `isPushToTalk` is true: replace mic-always-on behaviour with a Talk button using `@pointerdown` / `@pointerup` events
  - On pointerdown: set AudioWorklet `recording` parameter to `1`
  - On pointerup: set `recording` parameter to `0`
  - When `isPushToTalk` is false: `recording` is always `1` while session is active

**Checkpoint**: PTT mode gates audio capture correctly; AI only responds to held-button speech.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [x] T020 [P] Write Vitest tests for `live.api.service.ts` in `client-app/src/__tests__/live.api.service.spec.ts`: test message type construction, base64 encoding, and WS send helper
- [x] T021 [P] Write Vitest tests for `live.ts` store in `client-app/src/__tests__/live.store.spec.ts`: test all state transitions (status, appendTranscript, markInterrupted, reset, voice persistence)
- [x] T022 [P] Add Live session badge (e.g., mic icon) to sidebar conversation list items where `isLive === true` in `client-app/src/components/AI.ChatList.vue`
- [x] T023 Run `npm run build:Release` in `client-app/` and `go build -o yeet .` in repo root — confirm clean build with no errors
- [x] T024 Run `npm run test:coverage` in `client-app/` — confirm new tests pass and no regressions
- [ ] T025 Run full quickstart validation end-to-end per `specs/002-live-mode/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies
- **Foundational (Phase 2)**: Depends on Phase 1 (T001 gorilla import needed)
- **US1 (Phase 3)**: Depends on Foundational — needs relay (T008), service (T009), store (T010)
- **US2 (Phase 4)**: Depends on US1 — needs WS message handling already in place
- **US3 (Phase 5)**: Depends on Foundational (T009 for `/live/voices` call) — independent of US1/US2
- **US4 (Phase 6)**: Depends on US1 (AudioWorklet `recording` param used in T011)
- **Polish (Phase 7)**: Depends on all stories complete

### Parallel Opportunities After Foundational

```
Track A: T011 → T012 → T013 → T014   (US1: audio pipeline + UI)
Track B: T017 → T018                  (US3: voice selector — needs only T009)
```

US2 (T015–T016) and US4 (T019) can begin once US1 Track A completes.

---

## Implementation Strategy

### MVP First (US1 Only)

1. T001–T004 (Setup)
2. T005–T010 (Foundational)
3. T011–T014 (US1: core voice loop)
4. **STOP AND VALIDATE**: full conversation works, session saves to history
5. Ship MVP — voice mode is live

### Incremental Delivery

1. Setup + Foundational → relay ready
2. US1 → working voice conversation ← **MVP**
3. US2 → interruption in transcript
4. US3 → voice picker
5. US4 → push-to-talk
6. Polish → tests, badge, final validation

---

## Notes

- T008 (relay) is the most complex single task — the dual-goroutine WS proxy. Allow extra time.
- T011 + T012 (AudioWorklet + audio service) are the second most complex — test in Chrome/Edge; Safari AudioWorklet support varies.
- T002 and T003 are pure skeleton creation — complete them first to unblock parallel work.
- The `recording` AudioWorklet parameter (T011) must be implemented before PTT (T019) can work.
- All [P] tasks within a phase touch different files and can be done concurrently.
