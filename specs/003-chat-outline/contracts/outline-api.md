# Contract: Chat Outline API

**Branch**: `003-chat-outline` | **Date**: 2026-04-05

## Endpoint

```
POST /chat/outline/{conversationId}
```

No request body required. `conversationId` is the UUID in the URL path.

---

## Success Response

**Status**: `200 OK`  
**Content-Type**: `application/json`

```json
{
  "entries": [
    { "index": 0, "role": "user",      "label": "Can you explain how…" },
    { "index": 1, "role": "assistant", "label": "Sure! The concept of…" },
    { "index": 2, "role": "user",      "label": "What about edge cases?" }
  ]
}
```

`entries` is ordered by message position (ascending). Empty array if the conversation has no messages.

---

## Error Responses

| Status | Condition |
|--------|-----------|
| `500 Internal Server Error` | Database error reading messages |

*Note*: An unknown `conversationId` returns `200` with `"entries": []` (same as an empty conversation), consistent with the existing `/chat/record/` behaviour.

---

## Consistency with Existing Contracts

- Uses `POST` — consistent with all other `/chat/*` endpoints.
- Does not alter any existing endpoint request/response shapes.
- `role` values match the normalised values already returned by `/chat/record/` (`"user"`, `"assistant"`).
- `index` is zero-based message position, not a DB row ID — no internal IDs are exposed.
