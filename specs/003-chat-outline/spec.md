# Feature Specification: Chat Outline

**Feature Branch**: `003-chat-outline`  
**Created**: 2026-04-05  
**Status**: Draft  
**Input**: User description: "Chat Outline"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View Structured Outline of a Conversation (Priority: P1)

A user is mid-way through a long conversation and wants to quickly scan what has been covered. They open the Chat Outline overlay and see a list of entries — one per message — each labelled with the first few words of that message.

**Why this priority**: This is the core value — giving users a readable map of their conversation. Without it, the feature has no purpose.

**Independent Test**: Can be fully tested by opening any multi-topic conversation and confirming a labeled section list appears in the outline panel.

**Acceptance Scenarios**:

1. **Given** a conversation with messages covering multiple distinct topics, **When** the user opens the Chat Outline panel, **Then** the panel displays a structured list of labeled sections representing the conversation flow.
2. **Given** a conversation with only 1–2 messages, **When** the user opens the Chat Outline panel, **Then** the panel shows a minimal outline or a placeholder indicating insufficient content.
3. **Given** a conversation with no messages, **When** the user opens the Chat Outline panel, **Then** an empty state message is shown.

---

### User Story 2 - Navigate to a Section via the Outline (Priority: P2)

A user spots a section in the outline that matches what they are looking for. They click it and the main chat view scrolls directly to the start of that conversation segment.

**Why this priority**: Navigation is the primary utility of an outline. Without it the outline is static reference material with limited value.

**Independent Test**: Can be fully tested by clicking any outline entry and confirming the chat scrolls to the corresponding message.

**Acceptance Scenarios**:

1. **Given** the Chat Outline is open and shows multiple sections, **When** the user clicks a section entry, **Then** the chat view scrolls to the first message of that section.
2. **Given** the user has scrolled away, **When** they click the same outline entry again, **Then** the chat scrolls back to that section.

---

### User Story 3 - Outline Updates as the Conversation Progresses (Priority: P3)

A user is actively chatting. Each time a new message is sent or received, a new outline entry appears immediately using the first few words of that message.

**Why this priority**: Live sync keeps the outline current, but the feature is fully useful even when viewed after the conversation ends.

**Independent Test**: Can be fully tested by sending a new message and confirming a new entry appears in the outline within half a second, labelled with the opening words of that message.

**Acceptance Scenarios**:

1. **Given** the Chat Outline overlay is open and a new message is added, **When** the message is received, **Then** a new outline entry appears within 500 milliseconds labelled with the first few words of that message.
2. **Given** an existing outline entry, **When** no new messages are added, **Then** the existing entry labels remain unchanged.

---

### Edge Cases

- What happens when a message starts with whitespace, punctuation, or is very short (e.g., "OK" or "👍")?
- How many words constitute "first few words" — is there a maximum character or word count for a label?
- How does the outline behave if a message is deleted from a conversation — is its entry removed?
- How does the outline behave when a historical conversation is loaded from the sidebar?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST provide a Chat Outline panel that users can open and close from within any active conversation. When open, the panel appears as a floating overlay anchored to the right side of the main chat view; it overlays the chat content without splitting or reflowing the message layout.
- **FR-002**: The system MUST produce a structured, ordered list of outline entries — one per message — derived directly from the conversation without any AI summarisation or recomputation.
- **FR-003**: Each outline entry label MUST be formed from the first few words of the corresponding message; labels are set once when the message is first recorded and never recomputed.
- **FR-004**: Users MUST be able to click an outline entry to scroll the chat view to the corresponding conversation segment.
- **FR-005**: The outline MUST update automatically when a new message is added to the conversation, appending a new entry using the first few words of that message; no recomputation of existing entries occurs.
- **FR-006**: When a conversation has no messages, the system MUST display an empty state in the outline panel.
- **FR-007**: The outline MUST be available for both in-progress conversations and previously saved historical conversations. The outline for each conversation MUST be persisted and reloaded on subsequent visits without regenerating from scratch.
- **FR-009**: The outline MUST be available for saved Live Mode voice transcripts in addition to text chat conversations; transcript turns are treated as equivalent to chat messages for the purpose of outline generation.
- **FR-008**: The outline panel MUST visually indicate which section corresponds to the currently visible area of the chat as the user scrolls.

### Key Entities

- **Conversation**: The full ordered sequence of user and AI messages; the source material for outline generation.
- **Outline Section**: A labeled segment of the conversation representing a coherent topic; linked to a specific starting message in the conversation.
- **Outline Panel**: The UI surface that displays the ordered list of sections and provides navigation controls.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The outline panel loads and displays all entries within 500 milliseconds for conversations of up to 200 messages.
- **SC-002**: Clicking an outline entry scrolls the chat to the correct message 100% of the time.
- **SC-003**: A new outline entry appears within 500 milliseconds of a new message being added to the conversation.
- **SC-004**: At least 80% of users in usability testing can identify which part of the conversation a given outline entry refers to without additional help.
- **SC-005**: The outline overlay does not obstruct the chat input area and can be dismissed without navigating away from the conversation.

## Clarifications

### Session 2026-04-05

- Q: Where does the outline panel appear in the layout? → A: Floating right-side overlay within the main chat view — appears over the chat content without splitting or reflowing the message layout
- Q: Is the generated outline persisted or ephemeral? → A: Persisted across sessions — stored server-side per conversation and reloaded on next visit; updated incrementally as new messages arrive
- Q: Does the Chat Outline apply to Live Mode (voice) conversations? → A: Yes — Chat Outline is available for both text chat conversations and saved Live Mode voice transcripts
- Q: How are outline section labels generated, and what is the minimum content threshold? → A: Labels are the first few words of each message — no AI summarisation, no minimum threshold; every message contributes one outline entry immediately and labels are never recomputed

## Assumptions

- Desktop browser is the primary target; mobile layout is out of scope for v1.
- Live Mode voice transcripts are treated as a conversation source equivalent to text chat; the outline generation logic is shared across both types.
- Outline labels are derived by truncating each message to its first few words; no AI model call or summarisation is involved in outline construction.
- The outline is a flat or lightly-nested list; deep multi-level hierarchies are out of scope for v1.
- Users cannot manually create, rename, or reorder outline sections in v1; sections are AI-generated only.
- The outline for each conversation is persisted server-side; on subsequent visits the stored outline loads instantly rather than regenerating. The outline is only regenerated if it does not yet exist or is invalidated by new messages.
- The outline panel is a floating right-side overlay within the main chat view; it does not split or reflow the message layout.
