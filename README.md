# Yeet

A personal AI chat web app powered by Google Gemini. Conversations are persisted locally in SQLite.

## Stack

- **Backend** — Go, single binary, no CGo, SQLite via `modernc.org/sqlite`
- **Frontend** — Vue 3, Vite 6, Vuetify 3, Pinia, markdown-it, Mermaid

## Requirements

- Go 1.25+
- Node.js 18+
- A [Google AI Studio](https://aistudio.google.com/) API key

## Getting started

**1. Start the backend**

```bash
API_KEY=AIza... go run .
# Listens on :8080, stores data in yeet.db
```

**2. Start the frontend dev server**

```bash
cd client-app
npm install
npm run dev
# HTTPS on https://localhost:44493
```

Open `https://localhost:44493` in your browser.

## Configuration

| Variable | Default | Description |
|---|---|---|
| `API_KEY` | — | Google AI Studio API key (required) |
| `PORT` | `8080` | Port the Go server listens on |
| `DB_PATH` | `yeet.db` | SQLite database file path |

## Build

**Backend binary**

```bash
go build -o yeet .
```

**Frontend**

```bash
cd client-app
npm run build:Release   # production build
npm run build:Debug     # debug build
```

## Project structure

```
main.go          # HTTP handlers, Gemini SSE client
store.go         # SQLite schema and queries
client-app/
  src/
    components/  # UI components (AI.*.vue)
    global/      # API service layer
    store/       # Pinia state
    router/      # Vue Router routes
    views/       # Page-level views
```

## API endpoints

| Endpoint | Description |
|---|---|
| `POST /chat/start` | Create a new conversation |
| `POST /chat/models` | List available Gemini models |
| `POST /chat/send` | Send a message, stream response (SSE) |
| `POST /chat/conversation-list` | List conversations with messages |
| `POST /chat/delete-record` | Delete a conversation |
| `POST /chat/generate-topic` | Generate a short title for a conversation |
| `POST /chat/record/{id}` | Get full message history for a conversation |
