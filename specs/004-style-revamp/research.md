# Research: Style Revamp

## 1. Vuetify 3 Theme Architecture

**Decision**: Update `client-app/src/plugins/vuetify.ts` as the single source of truth for palette values.

**Rationale**: Vuetify 3 exposes every theme color as a `--v-theme-<key>` CSS variable. Changing values in `createVuetify()` automatically propagates throughout all Vuetify components and any SCSS/CSS that references `var(--v-theme-*)`. This is the lowest-friction path — no component-level changes are needed for Vuetify-rendered colors.

**Current structure**:
- `sharedColors` — used by both light and dark themes (currently all Kingston enterprise colors)
- `lightColors` — light-only surface/background values
- `darkColors` — dark-only surface/background values

**Revised approach**: Because the two themes now have different accent directions (warm vs. cool), `primary`, `secondary`, and `accent` must move out of `sharedColors` and into each theme's own color block. `sharedColors` should retain only truly theme-invariant utility colors (success green, warning gold, error red) and even those will be desaturated/retuned.

**Alternatives considered**:
- Replacing Vuetify's theming with CSS-only custom properties: rejected — adds complexity without benefit; Vuetify's system already handles dark/light switching.
- Keeping `sharedColors` and overriding per-theme: rejected — misleading structure, easy to regress.

---

## 2. New Color Palette

### Light Mode (Warm)

| Role | Name | Value | Notes |
|------|------|-------|-------|
| Primary accent | `primary` | `#C2410C` | Burnt orange / terracotta |
| Secondary | `secondary` | `#92400E` | Deep amber brown |
| Accent | `accent` | `#FB923C` | Soft orange highlight |
| Background | `background` | `#F7F3ED` | Warm off-white |
| Surface | `surface` | `#FFFBF5` | Near-white warm paper |
| Sidebar | `sideBar` | `#E8DFD2` | Warm sand |
| Dark primary (nav icons) | `darkPrimary` | `#9A3412` | Deep terracotta |
| Input button bg | `inputBtn` | `#FEF3E8` | Warm tint |
| List item bg | `listItemBg` | `#FEF3E8` | Warm tint |

### Dark Mode (Cool)

| Role | Name | Value | Notes |
|------|------|-------|-------|
| Primary accent | `primary` | `#06B6D4` | Cyan-500 |
| Secondary | `secondary` | `#0EA5E9` | Sky-500 |
| Accent | `accent` | `#67E8F9` | Cyan-300 highlight |
| Background | `background` | `#0F1923` | Deep cool navy |
| Surface | `surface` | `#162032` | Slightly lighter navy |
| Sidebar | `sideBar` | `#1A2D40` | Cool panel |
| Dark primary (nav icons) | `darkPrimary` | `#38BDF8` | Sky-400, readable on dark |
| Input button bg | `inputBtn` | `#1E3044` | Cool tinted input |
| List item bg | `listItemBg` | `#1E3044` | Cool tinted |

### Shared Utility Colors (theme-invariant)

| Role | Name | Value | Notes |
|------|------|-------|-------|
| Success | `success` | `#10B981` | Emerald-500, neutral green |
| Warning | `warning` | `#F59E0B` | Amber-400 |
| Error | `error` | `#EF4444` | Red-500 |
| Info | `info` | `#6366F1` | Indigo-500 |
| Pink (functional) | `pink` | `#F472B6` | Pink-400 |
| Blue (functional) | `blue` | `#818CF8` | Indigo-400 |
| Purple (functional) | `purple` | `#C084FC` | Purple-400 |
| Light blue | `lightBlue` | `#93C5FD` | Blue-300 |
| Dark purple | `darkPurple` | `#4C1D95` | Violet-900 |

**Rationale**: Tailwind CSS 3's palette was used as a reference because its color scales are perceptually balanced and well-tested for contrast. No Tailwind dependency is introduced — only the hex values are borrowed.

---

## 3. SCSS Variable Renaming

**Decision**: Rename all `$Kingston_*` variables in `variables.scss` to semantic equivalents. Update any references in `main.scss`.

**Mapping**:

| Old | New |
|-----|-----|
| `$Kingston_White` | `$color-white` |
| `$Kingston_White50` | `$color-white-50` |
| `$Kingston_Black` | `$color-text-primary` |
| `$Kingston_Black54` | `$color-text-secondary` |
| `$Kingston_LightGray` | `$color-text-muted` |
| `$Kingston_LightBg` | `$color-surface-muted` |
| `$Kingston_Red` | `$color-danger` |
| `$Kingston_Pink` | `$color-accent-pink` |
| `$Kingston_Green` | `$color-success` |
| `$Kingston_DarkGreen` | `$color-success-dark` |
| `$Kingston_Gold` | `$color-warning` |
| `$Kingston_LightRed` | `$color-error` |
| `$Kingston_GenerativeAI_Primary` | `$color-primary` |
| `$Kingston_GenerativeAI_Secondary` | `$color-secondary` |
| `$Kingston_GenerativeAI_DarkBg` | `$color-dark-bg` |
| `$Kingston_GenerativeAI_LightBg` | `$color-light-bg` |

**Alternatives considered**: Deleting `variables.scss` entirely and relying solely on Vuetify CSS variables — viable but removes a useful fallback for components that need SCSS compile-time values. Keeping the file with renamed variables is the safer, simpler path.

---

## 4. CSS Custom Properties in `main.scss`

**Decision**: Update all hardcoded values in `:root` and `.v-theme--dark` blocks to reference the new palette.

| Variable | Light (warm) | Dark (cool) |
|----------|-------------|------------|
| `--bot-bg` | `#FFFBF5` | `#1A2D40` |
| `--bot-text` | `#3D2B1F` | `#E0F2FE` |
| `--code-bg` | `#F0E8DC` | `#1E3044` |
| `--code-text` | `#3D2B1F` | `#E0F2FE` |
| `--pre-bg` | `#EDE0D0` | `#162032` |
| `--pre-text` | `#3D2B1F` | `#E0F2FE` |
| `--surface-elevated` | `#FFFBF5` | `#1A2D40` |
| `--list-selected-bg` | `#FDDCBE` | `rgba(6,182,212,0.2)` |
| `--list-hover-bg` | `#FDECD6` | `rgba(14,165,233,0.1)` |
| `--border-color` | `#E5D5C5` | `#1E3A50` |
| `--text-muted` | `#8B6E5A` | `#94A3B8` |

---

## 5. Border Radius Token

**Decision**: Introduce a single `--radius-md: 10px` token used for buttons, inputs, and message bubbles. Component-specific overrides (`--radius-sm: 6px`, `--radius-lg: 16px`) for smaller chips and larger cards.

---

## 6. Loading & Empty State Colors

**Decision**: Vuetify skeleton loaders and progress indicators use `primary` and `surface` colors automatically via `--v-theme-*`. Updating the theme values in vuetify.ts is sufficient. Custom spinner colors hardcoded in components will be audited and replaced with `color="primary"` props or CSS variable references.

---

## 7. Component Inline Color Audit

Files to audit for hardcoded colors (from initial scan):
- `AI.Chat.vue` — likely has message bubble bg colors
- `AI.ChatList.vue` — list item hover/selected
- `AI.Footer.vue` — input area
- `AI.PromptCards.vue` — card backgrounds
- `AI.LiveMode.vue` / `AI.LiveTranscript.vue` — audio UI
- `main.scss` — `.gradient-text`, `.btn-icon-*`, `[class*="-bg-card"]`

All hardcoded hex values in these files must be replaced with `var(--v-theme-*)` references or the updated CSS custom properties.
