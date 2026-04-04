# Quickstart: ChatGPT-like Chat Interface

**Feature**: `001-chat-interface`  
**Date**: 2026-04-03

## Prerequisites

- Go 1.25+, Node.js 18+
- A Google AI Studio API key

## 1. Start the backend

```bash
API_KEY=AIza... go run .
# Listens on :8080
```

## 2. Start the frontend dev server

```bash
cd client-app
npm install
npm run dev
# HTTPS on https://localhost:44493
```

## 3. Validate each user story

### US1 — Streaming response

1. Open `https://localhost:44493`
2. Type a message and press **Enter** or click Send
3. **Expect**: message bubble appears immediately; assistant bubble starts filling with text progressively
4. **Expect**: three pulsing dots are visible while streaming; they disappear when complete
5. Ask for a code snippet — **expect** syntax-highlighted code block

### US2 — Sidebar history

1. Send a message, wait for response
2. Click **New Chat**, send a different message
3. Click the first conversation in the sidebar
4. **Expect**: the first conversation's messages load correctly
5. Resize the browser to ≤375 px — **expect** sidebar collapses; hamburger icon appears

### US3 — Conversation management

1. After the first exchange completes, check the sidebar entry
2. **Expect**: auto-generated title of ≤5 words appears (within 3 s)
3. Hover over a conversation entry → click **⋯** → **Delete**
4. **Expect**: confirmation dialog appears; confirm → conversation removed from list

### US4 — Model selector

1. Click the model selector in the chat header
2. **Expect**: dropdown lists available models; one is pre-selected
3. Switch to a different model, send a message
4. **Expect**: response arrives without error

### Gap fixes

#### Stop generation button

1. Send a long message (e.g., "Write a 500-word essay on...")
2. **Expect**: Send button transforms into a **Stop** button while streaming
3. Click **Stop**
4. **Expect**: stream halts; partial response is kept; input re-enables

#### Retry button

1. Disconnect from the internet (or stop the Go server)
2. Send a message
3. **Expect**: inline error message appears with a **Retry** button
4. Reconnect (or restart the server), click **Retry**
5. **Expect**: the same message is re-sent; response streams normally

#### Welcome copy

1. Open a fresh conversation
2. **Expect**: welcome text does NOT mention "GPT-5" or "@tag" workflow
