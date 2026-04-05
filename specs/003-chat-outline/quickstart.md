# Quickstart: Chat Outline

**Branch**: `003-chat-outline` | **Date**: 2026-04-05

## Prerequisites

Standard dev environment — no new tools required.

```bash
# Backend
API_KEY=AIza... go run .          # serves on :8080

# Frontend
cd client-app && npm run dev      # HTTPS dev server on :44493
```

## Files to Touch

### Backend (Go)

| File | Change |
|------|--------|
| `main.go` | Register `POST /chat/outline/` route; add `handleOutline()` handler function |

No changes to `store.go` — outline queries use the existing `messages` table directly via inline SQL in `handleOutline`.

### Frontend (Vue)

| File | Change |
|------|--------|
| `src/store/outline.ts` | **New** — Pinia store: `OutlineEntry`, `OutlineState`, actions |
| `src/global/gpt.api.service.ts` | Add `outline` service entry |
| `src/components/AI.ChatOutline.vue` | **New** — floating overlay component |
| `src/components/AI.Chat.vue` | Add outline toggle button; wire scroll tracking; pass `messages` to outline store on load/update |
| `src/__tests__/outline.store.spec.ts` | **New** — unit tests for outline store and label derivation utility |

## Verifying the Feature

1. Start backend + frontend.
2. Open any existing conversation (≥2 messages).
3. Click the outline toggle button in the chat header.
4. Confirm the floating overlay appears at the top-right of the chat area.
5. Confirm each entry shows the first ~8 words of the corresponding message.
6. Click an entry — chat should scroll to that message.
7. Scroll the chat manually — the active entry in the outline should update.
8. Send a new message — a new entry should appear in the outline immediately.
9. Close and reopen the outline — entries should reload instantly (no generation delay).
10. Open a Live Mode conversation from the sidebar — outline should work identically.
