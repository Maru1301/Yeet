# Data Model: ChatGPT-like Chat Interface

**Feature**: `001-chat-interface`  
**Date**: 2026-04-03

> No schema changes required. The data model below documents the existing entities for
> reference. All persistence is handled by the Go backend / SQLite; the frontend holds
> in-memory representations only.

## Entities

### Conversation

Stored in SQLite by the backend. Surfaced to the frontend via `/chat/conversation-list`
and `/chat/record/{id}`.

| Field | Type | Notes |
|---|---|---|
| `conversationId` | string (UUID) | Primary key |
| `topic` | string \| undefined | Auto-generated 5-word title; absent until first exchange completes |
| `createdAt` | string (ISO-8601 UTC) | Set on creation |
| `isAgent` | boolean | Distinguishes agent vs standard Gemini conversation |

**Validation rules**:
- `conversationId` is server-assigned; client must not generate it.
- `topic` is set server-side by `/chat/generate-topic`; client treats it as read-only.

### Message (frontend in-memory only)

The frontend builds this shape from the `/chat/record/{id}` response and the live streaming
accumulation.

| Field | Type | Notes |
|---|---|---|
| `role` | `'user'` \| `'gpt'` \| `'assistant'` | `'gpt'` used during streaming, mapped to `'assistant'` from history |
| `content` | string (HTML) | Rendered markdown; empty string while streaming |
| `markdownContent` | string | Raw markdown source; stored for copy/export |
| `image` | string \| undefined | Data URI for attached image |
| `timestamp` | string \| undefined | Present on history records |
| `isError` | boolean | Set to `true` when `handleChatStreamError` fires — **new field** |

**State transitions**:
```
[submitted] → role:'gpt', content:'' (streaming)
           → role:'gpt', content:html (stream complete)
           → role:'gpt', content:errorHtml, isError:true (stream error)
```

### Model (frontend in-memory only)

Fetched from `/chat/models` on load. Held in `AI.ModelSelector.vue`.

| Field | Type | Notes |
|---|---|---|
| `name` | string | Backend identifier sent in payload |
| `displayName` | string | Shown in the selector dropdown |
| `isAgent` | boolean | True for agent-mode models |

## New Frontend State (AI.Chat.vue)

Two new reactive refs required for the gap fixes:

| Ref | Type | Purpose |
|---|---|---|
| `lastPrompt` | `string` | Holds the most recent user prompt text for retry |
| `isError` | `boolean` | True when the last message is an error; drives retry button visibility |
