# Implementation Plan: Live Mode

**Branch**: `002-live-mode` | **Date**: 2026-04-04 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `specs/002-live-mode/spec.md`

## Summary

Add a real-time voice conversation mode powered by the Gemini Live API. The Go server
acts as a WebSocket relay between the browser and Gemini, keeping the API key server-side.
The browser captures mic audio via AudioWorklet (PCM 16 kHz mono), streams it to Go over
WebSocket, and receives AI audio + live transcript in return. Sessions are saved to the
existing SQLite conversation history on end.

## Technical Context

**Language/Version**: TypeScript 5.8 (frontend), Go 1.25+ (backend)  
**Primary Dependencies**: `github.com/gorilla/websocket` (Go), Web Audio API + AudioWorklet (browser native)  
**Storage**: Existing SQLite schema + one new `isLive` boolean column on conversations  
**Testing**: Vitest (frontend service/store logic)  
**Target Platform**: Web browser (desktop; mobile mic access varies), Go binary backend  
**Project Type**: Web application — Vue 3 SPA + Go HTTP backend  
**Performance Goals**: AI response starts within 2 s of user finishing a sentence; interruption within 500 ms  
**Constraints**: No CGo; `gorilla/websocket` is pure Go ✅; single-binary embed unchanged  
**Scale/Scope**: Single user initially; relay architecture already supports multi-user extension

## Constitution Check

| Principle | Check | Notes |
|---|---|---|
| I. Simplicity First | ⚠️ JUSTIFIED | WebSocket relay + AudioWorklet are genuinely the simplest solution; no simpler path exists for real-time bidirectional audio |
| II. API Contract Integrity | ✅ PASS | New `/live/*` endpoints only; all `/chat/*` shapes untouched |
| III. No CGo | ✅ PASS | `gorilla/websocket` is pure Go |
| IV. Frontend Test Coverage | ✅ PASS | `src/global/live.api.service.ts` and `src/store/live.ts` require Vitest tests |
| V. Single-Binary Deploy | ✅ PASS | AudioWorklet processor loaded as inline blob URL; no external file needed |

**Complexity justification (Principle I)**: Real-time bidirectional audio streaming has no
simple implementation. The AudioWorklet + WebSocket relay is the minimum viable architecture.
Every component serves a direct spec requirement with no speculative additions.

## Project Structure

### Documentation (this feature)

```text
specs/002-live-mode/
├── plan.md              # This file
├── research.md          # Phase 0 output ✅
├── data-model.md        # Phase 1 output ✅
├── quickstart.md        # Phase 1 output ✅
├── contracts/
│   └── live-api.md      # Phase 1 output ✅
└── tasks.md             # Phase 2 output (/speckit-tasks)
```

### Source Code

```text
main.go                              # Add /live/ws WebSocket relay + /live/voices endpoint
store.go                             # Add isLive column migration; saveLiveSession function

client-app/src/
  components/
    AI.LiveMode.vue                  # New: full Live mode UI (status, transcript, controls)
    AI.LiveTranscript.vue            # New: scrolling transcript panel
    AI.VoiceSelector.vue             # New: voice preset picker
  global/
    live.api.service.ts              # New: WebSocket connection + message handling
    live.audio.service.ts            # New: AudioWorklet mic capture + PCM playback
  store/
    live.ts                          # New: Pinia store (session state, transcript)
  worklets/
    mic-processor.js                 # New: AudioWorklet PCM capture processor
  router/
    index.ts                         # Add /live route
  __tests__/
    live.api.service.spec.ts         # New: Vitest tests for WS message handling
    live.store.spec.ts               # New: Vitest tests for store state transitions
```

**Structure Decision**: Web application layout. Backend in `main.go`/`store.go` (repo root).
Frontend in `client-app/src/` following existing conventions (components prefixed `AI.*`,
services in `global/`, store in `store/`).

## Phase 0: Research

See `research.md` — all unknowns resolved:

| Question | Resolution |
|---|---|
| Gemini Live API protocol | Bidirectional WS, JSON-framed, PCM 16 kHz audio |
| Go WebSocket library | `gorilla/websocket` (pure Go, CGo-free) |
| Relay architecture | Symmetric proxy — Go holds both WS legs |
| Browser audio capture | AudioWorklet → PCM 16 kHz mono |
| Playback | AudioContext + AudioBufferSourceNode |
| Transcript storage | Existing conversation/message schema + `isLive` flag |
| Voice persistence | `localStorage` (single-user app) |
| Interruption | Native to Gemini Live — sending audio stops AI output |
| Push-to-talk | `recording` flag gates AudioWorklet send path |

## Phase 1: Design

See `data-model.md`, `contracts/live-api.md`, `quickstart.md`.

### Key design decisions

**Backend relay loop** (per connection):
```
goroutine A: browser WS read → Gemini WS write
goroutine B: Gemini WS read → browser WS write + transcript buffer
main:        on close → flush transcript to SQLite → send session_saved
```

**AudioWorklet inline blob** — the worklet processor is defined as a JS string constant
in `live.audio.service.ts` and registered via `URL.createObjectURL(new Blob([...]))`.
Keeps everything in one file; no separate `.js` asset that could break the single-binary embed.

**Route**: `/live` added to Vue Router as a full-page view with its own route, not a modal
overlay on the chat view.

### Post-design Constitution re-check

All five principles pass. The `isLive` column is a non-breaking SQLite `ALTER TABLE ADD COLUMN`
with a default of `0`. No existing queries are affected.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|---|---|---|
| AudioWorklet (complex browser API) | Only way to get raw PCM at 16 kHz for Gemini | `MediaRecorder` outputs compressed formats (webm/opus) incompatible with Gemini Live input format |
| Dual goroutine relay | Required for concurrent bidirectional WS proxy | Single goroutine cannot simultaneously read from two blocking WS connections |
