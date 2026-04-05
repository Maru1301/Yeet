# Data Model: Chat Outline

**Branch**: `003-chat-outline` | **Date**: 2026-04-05

## No New Database Tables

Outline entries are derived deterministically from the existing `messages` table.
No schema migrations are required.

## Derived Entity: OutlineEntry

Computed at request time by the Go backend from `messages.content`.

| Field   | Type   | Source                                          | Notes                                      |
|---------|--------|-------------------------------------------------|--------------------------------------------|
| index   | int    | Row position (0-based) within conversation      | Used by frontend to locate DOM element     |
| role    | string | `messages.role` (normalised: "model" → "assistant") | "user" or "assistant"               |
| label   | string | First 8 words of `messages.content`, max 60 chars, truncated with `…` | Markdown fences stripped before extraction |

### Label Derivation Rules (Go)

1. Strip leading/trailing whitespace from `content`.
2. If content starts with a code fence (`` ``` ``), skip to first non-fence line.
3. Split on whitespace; take first 8 tokens.
4. Join with single space.
5. If result exceeds 60 bytes (UTF-8), trim to last full word within 60 bytes and append `…`.
6. If result is empty after stripping (e.g., image-only message), use `"[media]"` as fallback label.

## Frontend State Shape

Managed in a new Pinia store `useOutlineStore` in `src/store/outline.ts`.

```typescript
interface OutlineEntry {
  index: number;       // zero-based message position
  role: 'user' | 'assistant';
  label: string;       // truncated first words
}

interface OutlineState {
  conversationId: string | null;  // which conversation the entries belong to
  entries: OutlineEntry[];
  visible: boolean;               // panel open/closed
  activeIndex: number;            // index of currently visible message (scroll tracking)
}
```

### State Transitions

| Event | State Change |
|---|---|
| User opens outline panel | `visible = true`; fetch entries if `conversationId` changed |
| User closes outline panel | `visible = false` |
| New conversation loaded | `conversationId` updated; `entries` cleared; fetch triggered |
| New message added (live chat) | Append new entry derived from message content (client-side, no re-fetch) |
| User scrolls chatBox | `activeIndex` updated to reflect topmost visible message |
| User clicks outline entry | Chat scrolls to corresponding message; `activeIndex` set to clicked index |
