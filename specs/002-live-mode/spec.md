# Feature Specification: Live Mode

**Feature Branch**: `002-live-mode`  
**Created**: 2026-04-04  
**Status**: Draft  
**Input**: User description: "Live Mode"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Start and Hold a Live Voice Conversation (Priority: P1)

A user opens Live mode, clicks Start, and speaks naturally to the AI. The AI responds in a chosen voice while a live transcript appears on screen. The conversation feels like talking to a person — fluid, low-latency, no typing involved.

**Why this priority**: This is the entire value of Live mode. Nothing else is meaningful without the core voice loop working.

**Independent Test**: Open Live mode, click Start, speak a sentence. Verify the AI responds audibly and the transcript updates in real time. End the session — verify the conversation is saved to the sidebar.

**Acceptance Scenarios**:

1. **Given** Live mode is open, **When** the user clicks Start, **Then** the microphone activates and the AI begins listening.
2. **Given** the session is active, **When** the user speaks, **Then** the user's words appear in the transcript and the AI responds in speech within 2 seconds.
3. **Given** the AI is speaking, **When** the response is delivered, **Then** a live transcript of the AI's words appears alongside the audio.
4. **Given** the session is active, **When** the user clicks End, **Then** the microphone deactivates, the session closes, and the conversation is saved to the sidebar history.
5. **Given** the session has ended, **When** the user views the sidebar, **Then** the Live session appears as a conversation entry with an auto-generated title.

---

### User Story 2 - Interrupt the AI Mid-Response (Priority: P2)

While the AI is speaking, the user can start talking to redirect or cut off the response. The AI stops, listens, and responds to the new input.

**Why this priority**: Without interruption support the conversation feels robotic — the user must wait for the AI to finish every time, which breaks the natural flow Live mode promises.

**Independent Test**: Start a session, ask for a long response, then speak mid-answer. Verify the AI stops and responds to the new input.

**Acceptance Scenarios**:

1. **Given** the AI is mid-response, **When** the user begins speaking, **Then** the AI stops its current output immediately.
2. **Given** the AI has been interrupted, **When** the user finishes speaking, **Then** the AI responds to the new input as a continuation of the conversation.
3. **Given** an interruption occurs, **When** the transcript updates, **Then** both the truncated AI response and the new user input are reflected accurately.

---

### User Story 3 - Select an AI Voice (Priority: P3)

Before or between sessions, the user can pick which voice the AI uses from a list of available presets.

**Why this priority**: Voice is a personal preference; the feature works without it (a default voice is used) but voice choice significantly improves the experience.

**Independent Test**: Open the voice selector, choose a non-default voice, start a session, and verify the AI responds in the chosen voice.

**Acceptance Scenarios**:

1. **Given** the Live mode settings are open, **When** the user opens the voice selector, **Then** a list of available voice presets is shown, each with a name and character description.
2. **Given** a voice is selected, **When** the user starts a session, **Then** the AI speaks in the selected voice for the entire session.
3. **Given** no voice has been chosen before, **When** Live mode first opens, **Then** a sensible default voice is pre-selected.
4. **Given** a session is in progress, **When** the user changes the voice, **Then** the change takes effect from the next AI response onward.

---

### User Story 4 - Push-to-Talk Fallback (Priority: P4)

In environments where always-on microphone access is restricted (e.g., browser permissions, shared device), the user can hold a button to talk instead.

**Why this priority**: Nice-to-have accessibility fallback; the primary experience is always-on mic.

**Independent Test**: Enable push-to-talk mode, hold the button, speak, release — verify the AI only receives audio while the button is held.

**Acceptance Scenarios**:

1. **Given** the user has enabled push-to-talk mode in settings, **When** they hold the Talk button, **Then** the microphone activates only for the duration the button is held.
2. **Given** the button is released, **When** the audio capture stops, **Then** the AI processes and responds to what was said.
3. **Given** push-to-talk mode is active, **When** the AI is speaking and the user holds the button, **Then** the AI is interrupted and listens.

---

### Edge Cases

- What happens when the microphone permission is denied by the browser?
- What happens if the connection to the server drops mid-session?
- How is silence handled — does the AI speak again if the user says nothing for 10+ seconds?
- What happens if the AI response is interrupted before any words are spoken?
- How does the transcript handle overlapping speech (user and AI speaking simultaneously)?
- What happens when the session is ended while the AI is mid-response?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST provide a dedicated Live mode view, distinct from the standard text chat interface.
- **FR-002**: The system MUST activate the microphone when a Live session starts and deactivate it when the session ends.
- **FR-003**: The system MUST stream the user's speech to the AI in real time with no perceptible delay.
- **FR-004**: The system MUST play the AI's response as synthesised speech.
- **FR-005**: The system MUST display a live transcript of both the user's speech and the AI's response as the session progresses.
- **FR-006**: The system MUST support interruption — when the user speaks while the AI is responding, the AI MUST stop and respond to the new input.
- **FR-007**: The system MUST offer a selectable list of AI voice presets with a default pre-selected.
- **FR-008**: The system MUST save the full transcript of each Live session to conversation history upon session end.
- **FR-009**: The system MUST auto-generate a title for the Live session and display it in the sidebar.
- **FR-010**: The system MUST provide a push-to-talk button as a fallback input mode, toggleable in settings.
- **FR-011**: The system MUST display a clear visual indicator when the microphone is active and when the AI is speaking.
- **FR-012**: The system MUST show a user-friendly error and gracefully end the session if the connection is lost.

### Key Entities

- **Live Session**: A real-time voice conversation; has a start time, end time, voice preset used, and a full transcript. Saved to conversation history on end.
- **Transcript Entry**: A single turn in the session; carries speaker (user or AI), text content, and timestamp.
- **Voice Preset**: An available AI voice; has a name and character description. Selected per-session; persisted as user preference.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The AI begins responding within 2 seconds of the user finishing a sentence on a standard broadband connection.
- **SC-002**: When the user interrupts, the AI stops within 500 milliseconds of the user beginning to speak.
- **SC-003**: The live transcript reflects spoken words within 1 second of them being spoken.
- **SC-004**: 100% of completed Live sessions appear in conversation history after the session ends.
- **SC-005**: The voice selector lists all available presets and the selected voice is audibly distinct from the default.

## Assumptions

- The user's device has a working microphone; browser microphone permission must be granted for the feature to function.
- Always-on microphone is the primary input mode; push-to-talk is a secondary fallback.
- The AI's voice output is played through the device's default audio output; no custom audio routing is in scope.
- Video input is out of scope for this version — audio only.
- Live sessions and standard text chat sessions are stored in the same conversation history; no separate Live-only history view is required.
- The voice preset selection persists across sessions as a user preference.
- The Go server relays the real-time audio stream to the AI provider; the API key is never exposed to the browser.
