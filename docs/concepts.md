# Feature Concepts

Parking lot for future features. When ready to build, run `/speckit-specify <concept name>` to turn it into a full spec + branch.

---

## Live Mode

**Size**: Large  
**API**: Gemini Live API (multimodal live streaming)

### Vision

A real-time voice conversation experience modelled on Gemini Live — the user talks to the AI like talking to a person. No push-to-talk delay feel; the exchange is fluid and natural.

### Key behaviours

- Microphone is always-on during a Live session; no send button
- AI responds in synthesised speech, not text
- Interruption support — user can speak mid-response to redirect the AI
- Dedicated Live mode UI separate from the standard text chat view
- Session start/end is explicit (a "Start" / "End call" affordance)

### Voice selection

Gemini Live API provides selectable voice presets. Known voices (verify current list in Google docs before building):

| Voice | Character |
|---|---|
| Aoede | Warm, feminine |
| Charon | Deep, masculine |
| Fenrir | Energetic, masculine |
| Kore | Clear, feminine |
| Puck | Expressive, neutral |

A voice selector should be surfaced in the Live mode settings panel.

### Decisions

- **History**: Live sessions are saved to conversation history and appear in the sidebar like regular chats.
- **Transcript**: Live transcript is shown alongside audio in real time.
- **Backend**: Go server relays the Gemini Live WebSocket — the frontend connects to Go, Go proxies to Gemini. API key stays server-side.
- **Why relay over direct WebSocket**: Google's docs suggest a direct browser WebSocket for lowest latency, but we anticipate extending to multi-user. With multiple users, direct tokens create billing exposure, no centralised rate-limiting, and no clean auth enforcement point. The relay hop cost is negligible for voice; the control benefits are not.

### Open questions (to resolve during spec)

- Push-to-talk fallback for environments where always-on mic is not possible?

---

## Chat Outline

**Size**: Small  
**API**: None (purely frontend, reads existing message list)

### Vision

A collapsible table-of-contents panel for the active conversation. Each user question becomes an entry showing its first few words as a title. Clicking an entry scrolls the chat to that message.

### Key behaviours

- Panel sits alongside (or overlays) the chat area; can be toggled open/closed
- Entries are generated from user messages only (assistant responses are not listed)
- Each entry shows the first ~6–8 words of the user's message, truncated with ellipsis
- Clicking an entry smoothly scrolls the chat viewport to that message
- Outline updates live as new messages are added during a conversation
- Empty state: outline is hidden or shows "No messages yet" when conversation is new

### Open questions (to resolve during spec)

- Where does the panel live — right sidebar, floating drawer, or inline above the input?
- Should it be visible by default or collapsed by default?
- Should assistant messages have their own (secondary) entries, or user-only?
