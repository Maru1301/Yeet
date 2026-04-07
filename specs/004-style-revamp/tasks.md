# Tasks: Style Revamp

**Input**: Design documents from `/specs/004-style-revamp/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, quickstart.md ✅

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- No test tasks — no new business logic introduced by this feature

## Path Conventions

All source paths are under `client-app/src/`.

---

## Phase 1: Setup

**Purpose**: Establish a passing test baseline before any style changes are made.

- [x] T001 Run `npm run test` in `client-app/` and confirm all existing Vitest tests pass — record baseline

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Update the three palette source files. Every component's colors propagate from here via Vuetify's `--v-theme-*` CSS variables and SCSS tokens.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T002 [P] Update `client-app/src/plugins/vuetify.ts` — move `primary`, `secondary`, `accent` out of `sharedColors` into per-theme blocks; apply warm light palette (terracotta `#C2410C` primary, amber surfaces) and cool dark palette (cyan `#06B6D4` primary, navy surfaces) from `research.md`; update all utility colors (`success`, `warning`, `error`, `info`, `pink`, `blue`, `purple`, `lightBlue`, `darkPurple`) to new values
- [x] T003 [P] Rename all `$Kingston_*` SCSS variables to semantic names in `client-app/src/styles/variables.scss` per the mapping in `research.md` (e.g. `$Kingston_GenerativeAI_Primary` → `$color-primary`); update hex values to match the new palette
- [x] T004 [P] Update `client-app/src/styles/main.scss` — replace all hardcoded hex values in `:root` and `.v-theme--dark` CSS custom property blocks with new warm/cool palette values from `research.md`; add border radius tokens (`--radius-sm: 6px`, `--radius-md: 10px`, `--radius-lg: 16px`) to `:root`; update all `$Kingston_*` SCSS variable references to the new semantic names from T003

**Checkpoint**: Foundation ready — Vuetify components now render with new palette. User story work can begin.

---

## Phase 3: User Story 1 — Modern Visual Identity (Priority: P1) 🎯 MVP

**Goal**: Zero legacy Kingston enterprise colors remain anywhere in the rendered interface (both light and dark modes). All design tokens use neutral names.

**Independent Test**: Open the app in both light and dark mode. Search the browser DevTools computed styles for `#EA0428` and `#020457` — neither should appear. Token names in DevTools CSS variables should contain no "Kingston" strings.

- [x] T005 [US1] Audit `client-app/src/components/AI.Chat.vue` — find all hardcoded hex colors in `<style>` blocks and inline `style` attributes; replace with `var(--v-theme-*)` references or the CSS custom properties updated in T004
- [x] T006 [P] [US1] Audit `client-app/src/components/AI.ChatList.vue` — replace hardcoded hex colors with `var(--v-theme-*)` or updated CSS custom properties
- [x] T007 [P] [US1] Audit `client-app/src/components/AI.Footer.vue` — replace hardcoded hex colors with `var(--v-theme-*)` or updated CSS custom properties
- [x] T008 [P] [US1] Audit `client-app/src/components/AI.PromptCards.vue` — replace hardcoded hex colors with `var(--v-theme-*)` or updated CSS custom properties
- [x] T009 [P] [US1] Audit `client-app/src/components/AI.ChatOutline.vue` — replace hardcoded hex colors with `var(--v-theme-*)` or updated CSS custom properties
- [x] T010 [P] [US1] Audit `client-app/src/components/AI.LiveMode.vue` and `client-app/src/components/AI.LiveTranscript.vue` — replace hardcoded hex colors with `var(--v-theme-*)` or updated CSS custom properties
- [x] T011 [US1] Update utility classes in `client-app/src/styles/main.scss` — recolor `.gradient-text` animation to use warm amber accent (`$color-primary`); update `.btn-icon-pink`, `.btn-icon-blue`, `.btn-icon-purple` to reference `rgba(var(--v-theme-pink))` etc.; confirm `.pink-bg-card`, `.purple-bg-card`, `.blue-bg-card` use the updated `--v-theme-*` channel vars

**Checkpoint**: US1 complete — both themes render with the new palette, no Kingston branding visible.

---

## Phase 4: User Story 2 — Consistent Component Styling (Priority: P2)

**Goal**: All major UI surfaces (chat bubbles, sidebar, input area, loading/empty states) share the same design language: medium rounded corners, subtle depth, and consistent hover/focus states.

**Independent Test**: Tab through the UI in both modes — every interactive element shows a consistent focus ring. Hover over sidebar items and observe `--list-hover-bg`. Inspect message bubbles for `border-radius: var(--radius-md)` and `box-shadow` in DevTools.

- [x] T012 [US2] Style message bubbles in `client-app/src/components/AI.Chat.vue` — apply `border-radius: var(--radius-md)` to both user and assistant bubbles; add `box-shadow: 0 1px 4px rgba(0,0,0,0.08)` for subtle depth; ensure user-sent and assistant-sent bubbles use distinct background colors drawn from the new palette
- [x] T013 [US2] Update sidebar hover and selected states in `client-app/src/components/AI.ChatList.vue` — apply `background: var(--list-hover-bg)` on hover and `background: var(--list-selected-bg)` on active; confirm selected indicator uses `color: var(--v-theme-primary)`
- [x] T014 [US2] Update message input area in `client-app/src/components/AI.Footer.vue` — apply `border-radius: var(--radius-md)` to the textarea and send button; standardize border treatment and focus ring using `outline-color: var(--v-theme-primary)`
- [x] T015 [P] [US2] Apply `border-radius: var(--radius-md)` to action buttons and selectors in `client-app/src/components/AI.ModelSelector.vue` and `client-app/src/components/AI.ChatActions.vue`
- [x] T016 [US2] Update loading and empty states — confirm Vuetify `v-skeleton-loader` and `v-progress-circular` components inherit the new `primary` color without override; audit `client-app/src/components/AI.Chat.vue` for any custom spinner colors and replace with `color="primary"` prop or `var(--v-theme-primary)`

**Checkpoint**: US2 complete — all interactive surfaces show the new design language consistently in both themes.

---

## Phase 5: User Story 3 — Typography Refresh (Priority: P3)

**Goal**: Chat body text and code blocks are comfortable to read — appropriate line-height, weight hierarchy, and code block visual separation.

**Independent Test**: Open a long assistant response in both modes. Measure that body text `line-height` is 1.6–1.7. Confirm code blocks have distinct background, padding, and monospace font.

- [x] T017 [US3] Tune prose typography in `client-app/src/styles/main.scss` — set chat message body `line-height: 1.65` and review `font-size` for message text vs. UI labels to ensure a clear weight/size hierarchy
- [x] T018 [P] [US3] Tune code block styling in `client-app/src/styles/main.scss` — set `font-size: 0.875rem`, add `padding: 12px 16px`, and confirm `background: var(--code-bg)` and `color: var(--code-text)` use the updated warm/cool palette values from T004

**Checkpoint**: US3 complete — reading a long assistant response feels comfortable in both modes.

---

## Phase 6: Polish & Verification

**Purpose**: Confirm zero regressions and the full visual story is coherent end-to-end.

- [x] T019 Run `npm run test` in `client-app/` — all Vitest tests must pass (same baseline as T001)
- [x] T020 [P] Run `npm run build:Debug` in `client-app/` — build must complete without errors
- [ ] T021 Manual smoke test — open app in light mode (confirm warm amber/terracotta feel, no red/navy), switch to dark mode (confirm cool cyan/navy feel), check sidebar hover/select, message bubbles, input focus, model selector, loading state, empty state; no legacy colors visible in either mode

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 — **BLOCKS all user stories**; T002, T003, T004 can run in parallel with each other
- **US1 (Phase 3)**: Depends on Phase 2 — T005 must complete before T011 (same file); T006–T010 can run in parallel with each other and with T005
- **US2 (Phase 4)**: Depends on Phase 2 — T012/T013/T014 can start as soon as Phase 2 is done; T015 can run in parallel with T012–T014
- **US3 (Phase 5)**: Depends on Phase 2 — T017 and T018 are independent of US1/US2 and can run in parallel with Phase 3/4 work
- **Polish (Phase 6)**: Depends on all prior phases complete

### User Story Dependencies

- **US1 (P1)**: Requires Phase 2 complete — no dependency on US2 or US3
- **US2 (P2)**: Requires Phase 2 complete — no dependency on US1 (different concern: polish vs. de-branding)
- **US3 (P3)**: Requires Phase 2 complete — no dependency on US1 or US2

### Parallel Opportunities Within Each Story

- **US1**: T006, T007, T008, T009, T010 can all run in parallel (different component files)
- **US2**: T012, T013, T014, T015 can run in parallel (different component files)
- **US3**: T017 and T018 can run in parallel (same file but non-overlapping sections)

---

## Parallel Example: Phase 2 (Foundation)

```
# All three foundation files can be updated simultaneously:
T002: client-app/src/plugins/vuetify.ts   → warm/cool palette values
T003: client-app/src/styles/variables.scss → rename $Kingston_* vars
T004: client-app/src/styles/main.scss      → CSS custom props + radius tokens
```

## Parallel Example: User Story 1

```
# After T002-T004 complete, audit all components simultaneously:
T006: AI.ChatList.vue
T007: AI.Footer.vue
T008: AI.PromptCards.vue
T009: AI.ChatOutline.vue
T010: AI.LiveMode.vue + AI.LiveTranscript.vue
# Then T005 (AI.Chat.vue) → T011 (main.scss utility classes)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Baseline test run
2. Complete Phase 2: Foundation — palette source files (T002, T003, T004 in parallel)
3. Complete Phase 3: US1 — component color audit (T005–T011)
4. **STOP and VALIDATE**: Open app in both modes, confirm no Kingston branding visible
5. Run T019 + T020 — tests pass, build succeeds

### Incremental Delivery

1. Phase 1 + Phase 2 → Foundation ready, Vuetify already picks up new colors
2. Phase 3 → US1 complete — app looks like a personal tool, not a corp product
3. Phase 4 → US2 complete — design language is polished and consistent
4. Phase 5 → US3 complete — reading comfort improved
5. Phase 6 → Verified and shippable

---

## Notes

- [P] tasks touch different files — safe to run concurrently
- [Story] label maps each task to its user story for traceability
- No new business logic → no new test tasks required (existing Vitest suite is the regression gate)
- Commit after each phase or logical group; keep style-only changes separate from logic changes
- If a color fix requires touching component logic, stop and file a separate issue
