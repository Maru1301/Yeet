# Research: Chat Outline

**Branch**: `003-chat-outline` | **Date**: 2026-04-05

## Decision 1: Outline Label Length

**Decision**: First 8 words of the message content, capped at 60 characters; truncated with `…` if over the limit. Whitespace is normalised (collapse multiple spaces/newlines). If the message starts with a code block or markdown fence, strip the fence marker and use the first words of the content inside.

**Rationale**: 8 words is enough to identify a conversational turn without reading the full message. 60 chars fits cleanly in a narrow floating panel at typical desktop font sizes. Stripping markdown fences prevents labels like "```javascript…".

**Alternatives considered**:
- First sentence only — too variable in length; some messages are one very long sentence.
- Fixed 50-char trim — simpler but ignores word boundaries, resulting in mid-word truncation.
- AI-generated label — rejected per spec (no recomputation; labels derived directly from content).

---

## Decision 2: Active Section Detection

**Decision**: Use a scroll event listener on the `chatBox` element (already refs in `AI.Chat.vue`) paired with `getBoundingClientRect()` on each message row. The active outline entry is the one whose corresponding message is the last one whose top edge is at or above the midpoint of the chatBox viewport.

**Rationale**: `IntersectionObserver` requires attaching observers to every message element, which complicates lifecycle management as messages are dynamically loaded. The scroll listener + `getBoundingClientRect` approach is simpler and already compatible with the existing `chatBox` ref pattern. Performance is acceptable since the message list is not virtualized.

**Alternatives considered**:
- `IntersectionObserver` — more declarative but complex to wire into Vue's dynamic message list; adds observer cleanup overhead.
- CSS `scroll-snap` — not applicable here; we need detection, not snapping.

---

## Decision 3: Floating Overlay Positioning

**Decision**: The outline overlay is `position: absolute` inside the `.chatbox` container (which already has `position: relative` semantics within the flex layout). It is pinned to the top-right corner of the chatbox with a fixed width of 260px and `height: 100%`, with `overflow-y: auto` for scrolling. A semi-transparent backdrop and `pointer-events: none` on the backdrop (but `pointer-events: auto` on the panel itself) allow the user to still interact with the chat below.

**Rationale**: Absolute positioning within the existing chatbox container requires no layout changes to parent components. It avoids adding a new CSS stacking context that could conflict with Vuetify components (dialogs, tooltips).

**Alternatives considered**:
- `position: fixed` — breaks on scroll and ignores the chat container boundary.
- Flex sibling column — splits the layout (rejected per spec: overlay must not reflow messages).
- Vuetify `v-navigation-drawer` right variant — too heavy; adds its own DOM structure and z-index management.

---

## Decision 4: Persistence Strategy

**Decision**: No new database table is required. Outline entries are derived on-the-fly from the existing `messages` table (first N words of each message's `content` column). Since messages are already persisted in SQLite, the outline is implicitly persisted — it can be reconstructed identically on every visit. The backend computes the label at query time using Go string processing.

**Rationale**: A separate `outline_entries` table would be redundant data. The label is a pure deterministic function of `message.content`; storing it separately violates Principle I (Simplicity First) and risks sync drift if messages are ever edited or deleted.

**Alternatives considered**:
- Materialised `outline` column on `messages` table — adds migration complexity for no benefit.
- Client-side label derivation — possible but requires sending full message content to the client first, defeating the purpose of a lightweight outline load.

---

## Decision 5: New Backend Endpoint

**Decision**: `POST /chat/outline/{conversationId}` — returns the ordered list of outline entries for a conversation.

Response shape:
```json
{
  "entries": [
    { "index": 0, "role": "user", "label": "Can you explain how…" },
    { "index": 1, "role": "assistant", "label": "Sure! The concept of…" }
  ]
}
```

`index` is the zero-based position of the message in the conversation; it is used by the frontend to scroll to the correct DOM element.

**Rationale**: `POST` is consistent with all other `/chat/*` endpoints in this project. Returning `index` rather than a message ID avoids adding an `id` field to the existing `/chat/record` response shape (Principle II: no unnecessary contract changes).

**Alternatives considered**:
- `GET /chat/outline/{id}` — inconsistent with project convention (all chat endpoints use POST).
- Returning message ID — would require exposing DB row IDs to the frontend, changing the existing record contract.
- Embedding outline in `/chat/record` response — conflates two concerns; outline can be fetched independently.
