# Research: ChatGPT-like Chat Interface

**Feature**: `001-chat-interface`  
**Date**: 2026-04-03

## Findings

### Decision: Build on existing components, not from scratch

**Rationale**: The codebase already implements every major spec requirement. A full rebuild
would violate the Simplicity First principle and risk introducing regressions. The correct
approach is targeted enhancement of existing components.

**Alternatives considered**:
- Rewrite `AI.Chat.vue` from scratch — rejected; existing implementation is correct and
  well-structured, rewrite risk not justified.
- Add a new parallel chat component — rejected; two chat implementations violates simplicity.

### Decision: Three targeted changes

The audit (plan.md Phase 0) identified three gaps:

1. **Welcome copy** — update `AI.Chat.vue` subtitle text to remove "GPT-5" and "@tag" references.
   Simple string change; no structural impact.

2. **Stop generation button** — render a "Stop" `v-btn` in place of the Send button while
   `isResponding === true`. On click, call `cancelAPI.abort()` and finalize the partial message.
   Pattern already used in `newChat()`; reuse `cancelAPI`.

3. **Retry button** — when the last message in `messages` has an error content string, show a
   "Retry" button beneath it that re-calls `send()` with `firstPrompt = false` (the user message
   is already in the list). Store the last prompt text in a `lastPrompt` ref so the payload is
   available.

**Alternatives considered**:
- Wrapping error state in a dedicated error component — rejected; overkill for a single button.
- Using a toast/snackbar for errors — already exists (`snackbar`) but inline context is better
  for a chat error.

### Decision: No backend changes

All three gaps are purely frontend. The backend SSE contract, endpoint shapes, and SQLite
schema are untouched. This satisfies Constitution Principle II (API Contract Integrity).
