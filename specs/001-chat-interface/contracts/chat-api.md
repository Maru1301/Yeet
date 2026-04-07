# API Contracts: Chat Interface

**Feature**: `001-chat-interface`  
**Date**: 2026-04-03  

> All contracts below are **existing and unchanged**. No new endpoints are introduced by
> this feature. This document serves as the authoritative reference for frontend ↔ backend
> integration within this feature.

---

## POST /chat/start

Creates a new conversation session.

**Request**
```json
{
  "Domain": "",
  "User": { "Name": "" },
  "ClientDevice": {
    "PrimaryLanguage": "en-US",
    "SecondaryLanguages": "",
    "TimeZone": "Asia/Taipei"
  }
}
```

**Response** `200 OK`
```json
{ "conversationId": "<uuid>" }
```

---

## POST /chat/models

Returns the list of available models.

**Request** `{}` (empty object)

**Response** `200 OK`
```json
[
  { "name": "gemini-2.0-flash", "displayName": "Gemini 2.0 Flash", "isAgent": false },
  { "name": "gemini-2.5-pro",   "displayName": "Gemini 2.5 Pro",   "isAgent": false }
]
```
*(Exact model list is backend-defined and may change; frontend must not hard-code names.)*

---

## POST /chat/send  *(SSE streaming)*

Sends a user message and streams the assistant response.

**Request**
```json
{
  "ConversationId": "<uuid>",
  "Content": "user message text",
  "File": null,
  "User": { "Name": "" },
  "Domain": "",
  "Model": "gemini-2.0-flash"
}
```

**Response** — `text/event-stream`  
Each chunk is a newline-delimited JSON object:
```
{"v":"partial response text"}
{"v":" more text"}
```
Error chunk (non-fatal, inline):
```
{"e":"error description"}
```
Stream ends when the server closes the connection.

**Frontend contract**:
- Parse via `parseStreamBuffer()` — splits on `\n\n`, extracts `{"v":"..."}` matches.
- Accumulate in `content` ref; render markdown only on newline boundaries during streaming.
- On stream end: call `handleChatStreamEnd()` to finalize the message.
- On fetch error: call `handleChatStreamError()` and set `isError = true` on last message.
- **Abort**: call `cancelAPI.abort()` to stop mid-stream. Partial content is kept.

---

## POST /chat/conversation-list

Returns all conversations that have at least one message.

**Request**
```json
{ "User": "" }
```

**Response** `200 OK`
```json
[
  {
    "conversationId": "<uuid>",
    "topic": "Short auto-generated title",
    "createdAt": "2026-04-03T10:00:00Z",
    "isAgent": false
  }
]
```
*Ordered most-recent-first by the backend.*

---

## POST /chat/record/{id}

Returns the full message history of a conversation.

**Request** — body empty (POST with no body)  
**Path param**: `id` = `conversationId`

**Response** `200 OK`
```json
{
  "ChatHistory": [
    {
      "Role": { "Label": "user" },
      "Items": [{ "Text": "user message" }]
    },
    {
      "Role": { "Label": "assistant" },
      "Items": [{ "Text": "assistant response" }]
    }
  ]
}
```

---

## POST /chat/delete-record

Permanently deletes a conversation.

**Request**
```json
{ "conversationId": "<uuid>", "user": "" }
```

**Response** `200 OK` — empty body

---

## POST /chat/generate-topic

Generates a short title for a conversation (called after 1st exchange).

**Request**
```json
{
  "ConversationId": "<uuid>",
  "User": { "Name": "" },
  "ClientDevice": {
    "PrimaryLanguage": "en-US",
    "SecondaryLanguages": "",
    "TimeZone": "Asia/Taipei"
  }
}
```

**Response** `200 OK` — empty body  
*(Title is stored server-side; client refreshes conversation list to pick it up.)*
