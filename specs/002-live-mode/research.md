# Research: Live Mode

**Feature**: `002-live-mode`  
**Date**: 2026-04-04

---

## Decision: Gemini Live API Protocol

**Decision**: Use the Gemini Live API bidirectional WebSocket endpoint.

**Rationale**:
- Endpoint: `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key={API_KEY}`
- Protocol: JSON-framed messages over a persistent WebSocket
- Supports real-time audio input (PCM 16-bit, 16 kHz, mono), text input, and mixed input
- Returns audio output (PCM) + inline text transcripts in the same stream
- Native interruption: sending new audio while the server is outputting causes it to stop

**Message types (client → Gemini)**:
| Type | Purpose |
|---|---|
| `BidiGenerateContentSetup` | Opens session; sets model, voice, system instructions |
| `BidiGenerateContentRealtimeInput` | Streams audio/video chunks during session |
| `BidiGenerateContentClientContent` | Sends text turns or signals end-of-turn |

**Message types (Gemini → client)**:
| Type | Purpose |
|---|---|
| `BidiGenerateContentSetupComplete` | Confirms session is ready |
| `BidiGenerateContentServerContent` | Audio output chunks + inline transcripts |
| `BidiGenerateContentToolCall` | Tool use (out of scope for this feature) |

**Audio format**: PCM 16-bit little-endian, 16 000 Hz, mono (input); same format for output. Both directions base64-encoded within JSON.

**Alternatives considered**:
- Direct browser WebSocket to Gemini — rejected; see `docs/concepts.md` for rationale (multi-user security, rate limiting, API key exposure).

---

## Decision: Go WebSocket Library

**Decision**: `github.com/gorilla/websocket`

**Rationale**:
- Pure Go, no CGo — satisfies Constitution Principle III
- Mature, widely used, well-documented
- Supports concurrent read/write with proper locking primitives
- Handles the browser ↔ Go leg cleanly

**Alternatives considered**:
- `golang.org/x/net/websocket` — older, less featured, not recommended for new code
- `nhooyr.io/websocket` — good but less community adoption; gorilla is sufficient

---

## Decision: Relay Architecture

**Decision**: Symmetric bidirectional proxy — Go holds two WebSocket connections simultaneously (browser and Gemini) and relays messages between them.

```
Browser ←── WS /live/ws ──→ Go relay ←── WS Gemini Live API ──→ Gemini
```

**Go relay responsibilities**:
1. On browser connect: open Gemini Live WebSocket, inject API key and session config (voice, model)
2. Browser → Gemini: forward audio chunks and client content messages unchanged
3. Gemini → Browser: forward audio and transcript messages; also buffer transcript text server-side
4. On session end (browser disconnect or explicit end message): flush transcript to SQLite as a saved conversation

**Rationale**: Keeps frontend simple — it only talks to Go. All Gemini auth and protocol details are hidden server-side.

---

## Decision: Audio Handling in the Browser

**Decision**: Use `AudioWorklet` for mic capture; `AudioContext` + `AudioBufferSourceNode` for playback.

**Rationale**:
- `MediaRecorder` produces compressed formats (webm/opus) not compatible with Gemini's PCM requirement
- `AudioWorklet` runs in a dedicated audio thread and can produce raw PCM samples at the required 16 kHz mono format
- Playback: received PCM chunks are decoded and queued in an `AudioContext` for gapless output

**Audio pipeline**:
```
Mic → getUserMedia → AudioContext (16 kHz) → AudioWorklet (PCM chunks) → WebSocket → Go
Go → WebSocket → PCM chunks → AudioContext → AudioBufferSourceNode → Speaker
```

---

## Decision: Transcript Storage

**Decision**: Reuse the existing conversation + message SQLite schema. Live sessions are stored as conversations; each transcript turn is stored as a message with role `user` or `assistant`.

**Rationale**: No new tables needed. The existing `ChatHistory` record shape already supports role + text. Live sessions appear naturally in the sidebar alongside text conversations.

**Session save trigger**: Go flushes the buffered transcript to SQLite when the browser WebSocket disconnects (clean or unclean). A partial transcript is still saved on connection drop.

---

## Decision: Voice Preset Persistence

**Decision**: Voice selection is sent as part of the session setup message when opening the WebSocket connection. The frontend stores the last-used voice in `localStorage` as a simple user preference.

**Rationale**: No backend persistence needed for a single-user app. `localStorage` survives page refresh, which is sufficient.

---

## Decision: Interruption Mechanism

**Decision**: The browser continuously streams mic audio even when the AI is speaking. Gemini's Live API handles interruption natively — receiving new audio input while outputting causes it to truncate its response and switch to listening.

**Frontend behaviour**: No special UI needed to "interrupt". The user simply speaks. The frontend marks the AI as interrupted in the transcript when a new user turn starts before the previous AI turn is marked complete.

---

## Open Question Resolved: Push-to-Talk

**Decision**: Push-to-talk is a toggle in the Live mode settings. When enabled, mic audio is only captured and sent while the user holds the Talk button. `AudioWorklet` processing is gated by a `recording` flag. No architecture change required — just a conditional on the audio send path.
