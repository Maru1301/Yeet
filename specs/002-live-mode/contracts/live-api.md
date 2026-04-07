# API Contracts: Live Mode

**Feature**: `002-live-mode`  
**Date**: 2026-04-04

---

## GET /live/ws  *(WebSocket upgrade)*

The single Live mode endpoint. The browser upgrades this HTTP connection to a WebSocket. All Live session communication flows over this connection.

**Query params**

| Param | Required | Notes |
|---|---|---|
| `model` | yes | Gemini model identifier (e.g., `gemini-2.0-flash-live`) |
| `voice` | yes | Voice preset name (e.g., `Aoede`) |

**Example**: `ws://localhost:8080/live/ws?model=gemini-2.0-flash-live&voice=Aoede`

---

### Messages: Browser → Go

All messages are JSON objects.

#### setup_complete_ack
Sent by the browser once it has received `session_ready` from Go and the audio pipeline is initialised.
```json
{ "type": "ready" }
```

#### audio_chunk
Sent continuously while the session is active (or while PTT button is held).
```json
{
  "type": "audio",
  "data": "<base64-encoded PCM 16-bit 16kHz mono>"
}
```

#### end_session
Sent when the user clicks End. Go saves the transcript and closes the Gemini connection.
```json
{ "type": "end" }
```

---

### Messages: Go → Browser

#### session_ready
Sent once Go has successfully opened the Gemini Live WebSocket and received `BidiGenerateContentSetupComplete`.
```json
{
  "type": "session_ready",
  "sessionId": "<uuid>"
}
```

#### audio_chunk
AI speech output, forwarded from Gemini.
```json
{
  "type": "audio",
  "data": "<base64-encoded PCM 16-bit 24kHz mono>"
}
```

#### transcript
Incremental transcript text for either speaker. Emitted as Gemini returns inline text.
```json
{
  "type": "transcript",
  "role": "user" | "assistant",
  "text": "partial or complete turn text",
  "turnComplete": false
}
```
When `turnComplete: true` the turn is finished and will not be extended further.

#### interrupted
Emitted when Gemini signals the AI's turn was cut short by new user input.
```json
{ "type": "interrupted" }
```

#### error
Sent on Gemini connection failure or internal relay error.
```json
{
  "type": "error",
  "message": "human-readable description"
}
```

#### session_saved
Sent after `end` is processed and the transcript has been flushed to SQLite.
```json
{
  "type": "session_saved",
  "sessionId": "<uuid>",
  "topic": "Auto-generated title"
}
```

---

## POST /live/voices

Returns the list of available voice presets.

**Request**: empty body

**Response** `200 OK`
```json
[
  { "id": "Aoede",  "displayName": "Aoede — Warm" },
  { "id": "Charon", "displayName": "Charon — Deep" },
  { "id": "Fenrir", "displayName": "Fenrir — Energetic" },
  { "id": "Kore",   "displayName": "Kore — Clear" },
  { "id": "Puck",   "displayName": "Puck — Expressive" }
]
```

---

## Existing endpoints unchanged

The following existing endpoints are reused without modification for Live mode history:

| Endpoint | Live Mode Usage |
|---|---|
| `POST /chat/conversation-list` | Lists Live sessions alongside text chats |
| `POST /chat/record/{id}` | Returns Live session transcript as chat history |
| `POST /chat/delete-record` | Deletes a Live session |

The `isLive` field on conversation records allows the frontend to display Live sessions with a distinct badge in the sidebar.
