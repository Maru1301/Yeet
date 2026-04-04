# Data Model: Live Mode

**Feature**: `002-live-mode`  
**Date**: 2026-04-04

---

## Backend (SQLite — existing schema reused)

Live sessions are stored using the **existing** conversation and message tables. No schema migrations required.

### Conversation (existing)

| Field | Type | Live Mode Usage |
|---|---|---|
| `conversationId` | TEXT (UUID) | Live session ID |
| `topic` | TEXT | Auto-generated title (same genTopic flow) |
| `createdAt` | DATETIME | Session start time |
| `isLive` | BOOLEAN | **New field** — `true` for Live sessions, `false` for text chats |

> `isLive` is the only schema addition. It allows the sidebar to badge Live sessions distinctly and the frontend to know which record viewer to use.

### Message (existing)

| Field | Type | Live Mode Usage |
|---|---|---|
| `conversationId` | TEXT | FK to conversation |
| `role` | TEXT | `'user'` or `'assistant'` |
| `content` | TEXT | Transcript text for that turn |
| `createdAt` | DATETIME | Turn timestamp |

---

## Frontend (in-memory / localStorage)

### LiveSession (in-memory, Vue reactive)

Held in the new `useLiveStore` Pinia store while a session is active.

| Field | Type | Notes |
|---|---|---|
| `sessionId` | string \| null | Assigned by Go on WS connect; matches `conversationId` in DB |
| `status` | `'idle' \| 'connecting' \| 'active' \| 'ending'` | Drives UI state |
| `voice` | string | Selected voice preset name |
| `transcript` | `TranscriptEntry[]` | Ordered list of turns, updated live |
| `isPushToTalk` | boolean | Whether PTT mode is active |

**Status transitions**:
```
idle → connecting (user clicks Start)
connecting → active (Go confirms session ready)
active → ending (user clicks End or connection drops)
ending → idle (cleanup complete)
```

### TranscriptEntry (in-memory)

| Field | Type | Notes |
|---|---|---|
| `id` | string | Local UUID for Vue key |
| `role` | `'user' \| 'assistant'` | Speaker |
| `text` | string | Transcript text; grows incrementally for assistant turns |
| `isComplete` | boolean | `false` while assistant is still speaking this turn |
| `isInterrupted` | boolean | `true` if AI turn was cut short by user |

### VoicePreset (localStorage)

| Field | Type | Notes |
|---|---|---|
| `id` | string | Backend identifier (e.g., `"Aoede"`) |
| `displayName` | string | Human label (e.g., `"Aoede — Warm"`) |

Stored as `lastUsedVoice: string` key in `localStorage`. Falls back to `"Aoede"` if absent.

### AudioState (in-memory, non-reactive — managed by AudioWorklet)

Not stored in Vue state; managed directly by the audio service.

| Field | Notes |
|---|---|
| Mic `AudioContext` | 16 kHz, mono |
| `AudioWorklet` node | Captures PCM chunks, gated by `recording` flag |
| Playback `AudioContext` | Queues and plays received PCM chunks |
| Send WebSocket | Reference to the active Go WS connection |
