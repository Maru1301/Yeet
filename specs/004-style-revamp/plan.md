# Implementation Plan: Style Revamp

**Branch**: `004-style-revamp` | **Date**: 2026-04-07 | **Spec**: [spec.md](spec.md)  
**Input**: Feature specification from `/specs/004-style-revamp/spec.md`

## Summary

Replace all Kingston enterprise branding (colors, SCSS variable names, CSS custom properties) with a new personal palette: warm amber/terracotta in light mode, cool cyan/teal in dark mode. Apply medium border radius (8–12px), subtle depth (soft shadows), and tuned typography spacing throughout. Loading and empty states are included in scope. No layout, logic, or backend changes.

## Technical Context

**Language/Version**: TypeScript 5, SCSS  
**Primary Dependencies**: Vue 3, Vite 6, Vuetify 3, Pinia  
**Storage**: N/A — no data changes  
**Testing**: Vitest (all existing tests must continue to pass)  
**Target Platform**: Browser, desktop-primary  
**Project Type**: Web application — frontend only for this feature  
**Performance Goals**: No measurable increase in paint/render time vs. baseline  
**Constraints**: `npm run build:Release` must succeed; no new font dependencies; existing Vitest tests must pass  
**Scale/Scope**: ~20 Vue components, 2 SCSS files, 1 Vuetify plugin config file

## Constitution Check

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Simplicity First | PASS | Pure style changes — no new abstractions, no speculative utilities |
| II. API Contract Integrity | PASS | No backend or API changes; SSE contract untouched |
| III. No CGo | PASS | Frontend-only feature |
| IV. Frontend Test Coverage | PASS | No new business logic added; existing tests must remain green |
| V. Single-Binary Deploy Target | PASS | Frontend build output is still embedded as static assets |

No gate violations. No Complexity Tracking entry required.

## Project Structure

### Documentation (this feature)

```text
specs/004-style-revamp/
├── plan.md              # This file
├── research.md          # Phase 0 output — palette decisions, variable mapping
├── quickstart.md        # Phase 1 output — implementation guide
├── checklists/
│   └── requirements.md  # Spec quality checklist (all passing)
└── tasks.md             # Phase 2 output (/speckit.tasks — not yet created)
```

### Source Code (files touched by this feature)

```text
client-app/
├── src/
│   ├── plugins/
│   │   └── vuetify.ts           # PRIMARY: new warm light + cool dark palette
│   ├── styles/
│   │   ├── variables.scss       # Rename $Kingston_* → semantic names
│   │   └── main.scss            # Update CSS custom props + global styles
│   └── components/
│       ├── AI.Chat.vue          # Message bubble styles
│       ├── AI.ChatList.vue      # Sidebar list hover/selected states
│       ├── AI.Footer.vue        # Input area treatment
│       ├── AI.PromptCards.vue   # Card backgrounds
│       ├── AI.ChatOutline.vue   # Outline panel
│       ├── AI.LiveMode.vue      # Audio UI colors
│       └── AI.LiveTranscript.vue # Transcript colors
```

**Structure Decision**: Single frontend project. All changes are confined to `client-app/src/`. No new files need to be created (aside from plan artifacts).

## Implementation Phases

### Phase A: Foundation (Palette + Tokens)

**Goal**: Establish the new palette at the source level. After this phase, Vuetify components pick up new colors automatically.

1. **`vuetify.ts`** — Replace `sharedColors`, `lightColors`, `darkColors` with new warm/cool palette from `research.md`. Move `primary`, `secondary`, `accent` out of `sharedColors` into per-theme blocks.

2. **`variables.scss`** — Rename all `$Kingston_*` variables to semantic names per the mapping in `research.md`. Update hex values to match new palette.

3. **`main.scss` — CSS custom properties** — Update all values in `:root` (warm) and `.v-theme--dark` (cool) blocks. Add border radius tokens (`--radius-sm: 6px`, `--radius-md: 10px`, `--radius-lg: 16px`). Fix any `$Kingston_*` variable references to new names.

### Phase B: Component Audit & Cleanup

**Goal**: Eliminate all remaining hardcoded enterprise colors from component files.

4. **Audit each component** in the touched-files list above:
   - Grep for hardcoded hex values in `<style>` blocks.
   - Replace with `var(--v-theme-*)` or updated CSS custom properties.
   - Replace any `$Kingston_*` SCSS references with new variable names.

5. **`main.scss` — utility classes** — Update `.btn-icon-pink`, `.btn-icon-blue`, `.btn-icon-purple`, `.gradient-text` animation colors, `.pink-bg-card` / `.purple-bg-card` / `.blue-bg-card` to use the new palette.

### Phase C: Component Polish

**Goal**: Apply design language decisions (border radius, depth, message bubble differentiation).

6. **Message bubbles** (`AI.Chat.vue`) — Apply `var(--radius-md)` for bubble corner rounding. Ensure user-sent and assistant-sent bubbles are visually distinct using new palette colors. Soft box-shadow on bubbles using `box-shadow: 0 1px 4px rgba(0,0,0,0.08)`.

7. **Sidebar states** (`AI.ChatList.vue`) — Apply new `--list-hover-bg` and `--list-selected-bg` values. Ensure selected indicator uses the new primary accent.

8. **Input area** (`AI.Footer.vue`) — Apply `var(--radius-md)` to textarea and buttons. Consistent border and focus-ring treatment.

9. **Loading & empty states** — Confirm Vuetify skeleton loaders inherit new `primary` color automatically. Audit any custom spinner or empty-state placeholder colors and update to new palette.

### Phase D: Typography

**Goal**: Tune text for comfortable chat reading without changing font family.

10. **`main.scss`** — Review and adjust body text `line-height` (target 1.6–1.7 for chat prose), `font-size` hierarchy for labels vs. body vs. code. Code block `font-size` and `padding` for scannability.

### Phase E: Verification

11. Run `npm run test` — all Vitest tests must pass.
12. Run `npm run build:Debug` — must compile without errors.
13. Manual smoke test in both light and dark mode: check all key surfaces, hover/active states, message bubbles, input area, loading states.

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Light palette direction | Warm (amber/terracotta) | Personal, calm; clear contrast with previous enterprise red |
| Dark palette direction | Cool (cyan/teal) | Focused, modern; complements warm light without monotony |
| Font family | Retain existing stack | Avoids CJK coverage risk; sizing/spacing tuning is sufficient |
| Visual depth | Subtle shadows | Spatial clarity without heaviness; supports warm light feel |
| Border radius | 8–12px (medium) | Friendly but not casual; pairs well with warm palette |
| Loading/empty states | Included in scope | Jarring inconsistency if left in old palette |
| Data model changes | None | Pure visual change |
| API/contract changes | None | Fully frontend-scoped |
