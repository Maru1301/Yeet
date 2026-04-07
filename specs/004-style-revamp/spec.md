# Feature Specification: Style Revamp

**Feature Branch**: `004-style-revamp`  
**Created**: 2026-04-07  
**Status**: Draft  
**Input**: User description: "style revamp"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Modern Visual Identity (Priority: P1)

A user opens the chat application and immediately perceives it as a polished, modern personal AI assistant rather than a corporate enterprise product. The interface feels cohesive: colors, typography, spacing, and component styling all reinforce a unified aesthetic that is distinct from the current Kingston enterprise branding.

**Why this priority**: The Kingston-branded color palette and naming conventions are enterprise holdovers from the source fork. Replacing these is the core of the revamp and everything else depends on the foundational design tokens being updated first.

**Independent Test**: Can be fully tested by opening the app (both light and dark modes) and verifying no Kingston brand colors or enterprise styling cues are visible, and that the overall palette feels intentional and modern.

**Acceptance Scenarios**:

1. **Given** the app is loaded in light mode, **When** a user views any page, **Then** all colors, borders, and backgrounds match the new personal design palette with no legacy Kingston red (`#EA0428`) or Kingston navy (`#020457`) visible.
2. **Given** the app is in dark mode, **When** a user views any page, **Then** dark-mode surfaces, text, and accents all use the updated palette and remain readable with sufficient contrast.
3. **Given** the app uses design tokens (CSS variables and SCSS variables), **When** the revamp is applied, **Then** the token names no longer reference "Kingston" and reflect a generic, personal naming scheme.

---

### User Story 2 - Consistent Component Styling (Priority: P2)

A user interacts with chat bubbles, the sidebar, the message input, model selector, and all buttons and finds them visually consistent — rounded corners, spacing, shadows, and hover states all follow the same design language.

**Why this priority**: Once the palette is updated, component-level polish turns a "recolored" app into a truly revamped one. Inconsistent component styles will still feel like a partially updated enterprise tool.

**Independent Test**: Can be fully tested by going through each major UI surface (chat thread, sidebar conversation list, input bar, model selector, outline panel) and confirming that visual language is uniform across components.

**Acceptance Scenarios**:

1. **Given** the chat view is open, **When** a user reads a conversation, **Then** user and assistant message bubbles are clearly differentiated and styled in a way that looks intentional rather than default/generic.
2. **Given** the sidebar is visible, **When** a user hovers over or selects a conversation, **Then** hover and active states use the new palette's accent color, not the Kingston red or indigo.
3. **Given** the input area is focused, **When** a user types a message, **Then** the textarea, send button, and action buttons display consistent border radius, spacing, and focus ring styling.

---

### User Story 3 - Typography Refresh (Priority: P3)

A user reads messages and UI labels and finds the typography feels clean and contemporary — font weights, sizes, and line heights are appropriately tuned for a chat interface rather than a business document viewer.

**Why this priority**: Typography is a supporting concern; the palette and component consistency matter more for a "revamp" feel, but typography elevates polish once those are done.

**Independent Test**: Can be fully tested by reviewing message text, headings, labels, and code blocks for consistent font sizing, weight hierarchy, and line spacing without needing any backend changes.

**Acceptance Scenarios**:

1. **Given** a long assistant message is rendered, **When** a user reads it, **Then** body text line-height and font size are comfortable for sustained reading (not cramped or oversized).
2. **Given** code blocks appear in a message, **When** a user views them, **Then** code font, background, and padding are visually distinct from prose and easy to scan.

---

### Edge Cases

- What happens when a user has their OS set to high-contrast mode — do the new styles degrade gracefully?
- How does the styling look on narrow mobile viewports (< 600px) where sidebar and chat panel stack?
- What happens to any inline `style` attributes or hardcoded hex values inside `.vue` component templates — do they conflict with the new design tokens?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: All visual branding from the enterprise source product (colors, naming) MUST be replaced with a neutral personal identity that carries no association with that brand.
- **FR-002**: A new cohesive color palette MUST be defined and applied consistently across the entire interface, covering primary actions, surfaces, borders, and text. The design language uses subtle depth: soft shadows on message bubbles, cards, and panels to create spatial clarity without visual heaviness.
- **FR-003**: Both light and dark visual themes MUST be updated to the new palette so the experience is consistent regardless of the user's preferred mode.
- **FR-004**: All color combinations used for text on backgrounds MUST meet standard accessibility contrast requirements for comfortable reading.
- **FR-005**: Every UI component MUST draw its colors from the shared palette rather than one-off values, ensuring a single palette change propagates everywhere.
- **FR-006**: The visual style of chat message bubbles (user-sent and assistant-sent) MUST be clearly differentiated and reflect the new design language.
- **FR-007**: The conversation list in the sidebar MUST have updated hover and selected state styling consistent with the new palette.
- **FR-008**: The message input area, including the text field and action buttons, MUST present a coherent, updated visual treatment. All interactive elements (buttons, inputs, message bubbles) MUST use medium corner rounding (8–12px) as the standard border radius.
- **FR-009**: Text sizing, weight hierarchy, and line spacing MUST be tuned to suit comfortable long-form reading in a chat context. The existing font family MUST be retained; no new typefaces will be introduced.
- **FR-010**: Loading states (streaming response indicators) and empty states (fresh conversation, empty sidebar) MUST be restyled to match the new palette and design language.
- **FR-011**: All existing features and interactions MUST continue to work correctly after the visual changes are applied.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can open the app in both light and dark mode and encounter no legacy enterprise brand colors anywhere in the rendered interface.
- **SC-002**: All interactive elements (buttons, list items, inputs) display consistent hover and focus states drawn from the new palette, verifiable by tabbing through the UI.
- **SC-003**: All text-on-background color combinations in the chat view and sidebar pass standard accessibility contrast thresholds for normal and large text.
- **SC-004**: A fresh-eyes reviewer unfamiliar with the project identifies the app as a personal tool rather than a corporate product, based solely on visual impression.
- **SC-005**: All existing automated frontend tests continue to pass after the style changes with no functional regressions.

## Clarifications

### Session 2026-04-07

- Q: What color palette direction should the revamp use? → A: Warm (amber/terracotta-toned) in light mode; cool (blue/teal-toned) in dark mode
- Q: Should the font family change or only sizing/weights? → A: Keep existing font stack; adjust sizing, weight, and spacing only
- Q: Flat/minimal or subtle depth (shadows/elevation)? → A: Subtle depth — soft shadows on cards, bubbles, and panels
- Q: What border radius style for buttons, inputs, and bubbles? → A: Medium rounded — 8–12px on most elements
- Q: Should loading spinners and empty states be restyled? → A: Yes — include loading and empty states in the revamp

## Assumptions

- The revamp is visual/stylistic only — no layout restructuring, no new components, and no backend changes are in scope.
- The target aesthetic is a modern, calm, personal AI chat interface rather than an enterprise dashboard. Light mode uses a warm palette (amber/terracotta-toned accents on neutral surfaces); dark mode uses a cool palette (blue/teal-toned accents on dark surfaces).
- The app's existing theming system remains the primary mechanism; the revamp works within it rather than replacing it.
- Dark mode support is required — both themes must be updated as a single unit of work.
- The app is primarily desktop-focused; mobile-responsive behavior should not regress but is not the focus of this revamp.
- No brand or logo assets need to be designed or sourced; the revamp is limited to color, typography, and component styling.
