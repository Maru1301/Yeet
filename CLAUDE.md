# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A personal AI chat web service:
- **Go backend** (`main.go`) — implements the API the frontend expects, translates to Google Gemini API, streams SSE
- **Vue 3 frontend** (`client-app/`) — chat UI that talks to the Go backend

## Commands

**Go backend** (repo root):
```bash
# Run (API_KEY is required — Google AI Studio key)
API_KEY=AIza... go run .

# Build binary
go build -o yeet .
```

**Frontend** (`client-app/`):
```bash
npm run dev              # HTTPS dev server on :44493, proxies /chat and /agent → Go on :8080
npm run build:Debug
npm run build:Release
npm run test             # watch mode
npm run test:coverage
npx vitest run src/__tests__/chat.spec.ts   # single test file
```

## Architecture

### Go backend (`main.go`, `store.go`)
Two-file HTTP server that implements the API contract the frontend expects and translates to Google's Gemini API. `store.go` owns all SQLite access (`modernc.org/sqlite`, no CGo required).

| Endpoint | Behaviour |
|---|---|
| `POST /chat/start` | Creates a conversation (in-memory), returns `conversationId` |
| `POST /chat/models` | Returns hardcoded Gemini model list |
| `POST /chat/send` | Appends user message, streams Gemini response as `{"v":"..."}` SSE chunks |
| `POST /chat/conversation-list` | Lists conversations with ≥1 message |
| `POST /chat/delete-record` | Deletes conversation from memory |
| `POST /chat/generate-topic` | Calls Gemini (non-streaming) for a 5-word title |
| `POST /chat/record/{id}` | Returns full conversation history |
| `/agent/*` | Stubbed (501) |

Gemini SSE chunks (`candidates[0].content.parts[0].text`) are translated into `{"v":"text"}` events — the format the frontend's `parseStreamBuffer` expects. Gemini's `"model"` role is translated to `"assistant"` in the record endpoint. Conversation history is persisted in SQLite (`yeet.db`) via `store.go` and survives restarts.

Environment variables: `API_KEY` (required), `PORT` (default `8080`), `DB_PATH` (default `yeet.db`).

### Frontend
- **Vue 3 + Vite 6**, **Vuetify 3** (UI), **Pinia** (state), **Vue Router 4**, **Vitest** (tests)
- `src/global/api.service.ts` — axios instance (`aiRequest`) and enhanced fetch (`aiFetch`), base URL from `PROXY_API_URL` global
- `src/global/gpt.api.service.ts` — all API endpoint definitions
- `src/components/` — all UI components prefixed `AI.*`
- `src/store/index.ts` — Pinia store (AI token, no-auth message)
- `src/router/index.ts` — routes: `/` (chat), `/chat/:department`, `/record`, `/record/:department`

### Environment / build config
`vue.allVar.ts` defines per-mode constants. Key field: `proxyApiUrl` — injected as the `PROXY_API_URL` global via Vite `define`. Empty string for Local/Debug (relative URLs, routed through Vite proxy); set to the deployed Go server URL for QAS/Release.

### Local dev request flow
```
Browser → Vite HTTPS :44493 → (proxy /chat, /agent) → Go HTTP :8080 → Gemini API
```
