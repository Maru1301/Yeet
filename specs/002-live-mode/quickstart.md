# Quickstart: Live Mode

**Feature**: `002-live-mode`  
**Date**: 2026-04-04

## Prerequisites

- Go 1.25+, Node.js 18+
- `API_KEY` set to a Google AI Studio key with Gemini Live API access
- A device with a working microphone and speakers
- Browser with WebSocket + Web Audio API support (Chrome/Edge recommended)

## 1. Start the backend

```bash
API_KEY=AIza... go run .
# Listens on :8080
```

## 2. Start the frontend dev server

```bash
cd client-app
npm run dev
# HTTPS on https://localhost:44493
```

## 3. Validate each user story

### US1 — Core voice conversation

1. Open `https://localhost:44493`, navigate to Live mode
2. Click **Start** — grant microphone permission when prompted
3. **Expect**: mic indicator activates; status shows "Listening"
4. Speak a sentence (e.g., "Tell me a short joke")
5. **Expect**: your words appear in the transcript within 1 second
6. **Expect**: AI responds in speech; transcript grows as it speaks
7. Click **End**
8. **Expect**: session closes; conversation appears in the sidebar with an auto-generated title

### US2 — Interruption

1. Start a session, ask for a long response ("Write me a poem about the ocean")
2. While the AI is speaking, say "Stop, tell me about mountains instead"
3. **Expect**: AI speech stops within ~500 ms of you speaking
4. **Expect**: transcript marks previous AI turn as interrupted
5. **Expect**: AI responds to the new topic

### US3 — Voice selection

1. Open Live mode settings, open the voice selector
2. **Expect**: list shows Aoede, Charon, Fenrir, Kore, Puck with descriptions
3. Select a non-default voice (e.g., Charon)
4. Start a session, ask a question
5. **Expect**: AI responds in Charon's voice (audibly distinct from default)
6. Refresh the page, return to Live mode
7. **Expect**: Charon is still pre-selected

### US4 — Push-to-talk

1. In Live mode settings, enable **Push-to-talk**
2. Start a session
3. **Expect**: mic is NOT active by default; status shows "Hold to talk"
4. Hold the Talk button and speak
5. **Expect**: mic activates only while held; AI responds after release
6. While AI is speaking, hold Talk and speak
7. **Expect**: AI is interrupted (same as US2)

### Error cases

1. Stop the Go server mid-session
2. **Expect**: error message displayed inline; session ends gracefully; partial transcript saved

### History

1. After ending a session, open the sidebar
2. Click the Live session entry
3. **Expect**: full transcript loads in the record viewer with user/assistant turns
