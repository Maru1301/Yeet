# Style Revamp — Developer Quickstart

## What changes and where

| File | What changes |
|------|-------------|
| `client-app/src/plugins/vuetify.ts` | Primary palette source — new warm light + cool dark theme colors |
| `client-app/src/styles/variables.scss` | Rename all `$Kingston_*` variables to semantic names |
| `client-app/src/styles/main.scss` | Update CSS custom property values in `:root` and `.v-theme--dark`; update any `$Kingston_*` references |
| `client-app/src/components/*.vue` | Audit and replace hardcoded hex colors with `var(--v-theme-*)` or CSS custom properties |

## How Vuetify theming works (quick reference)

1. Colors defined in `createVuetify({ theme: { themes: { light: { colors: {...} }, dark: { colors: {...} } } } })` become CSS variables: `--v-theme-primary`, `--v-theme-surface`, etc.
2. In templates, use Vuetify color props: `color="primary"`, `bg-color="surface"`.
3. In SCSS/CSS, reference: `var(--v-theme-primary)` or `rgba(var(--v-theme-primary), 0.2)` for alpha variants.
4. Theme switching is handled by `localStorage.getItem('theme')` defaulting to `'dark'`.

## Step-by-step implementation order

### Step 1 — Update `vuetify.ts`
- Split `sharedColors` into per-theme blocks (warm primary for light, cool primary for dark).
- Replace all Kingston hex values with new palette values from `research.md`.
- Keep key names identical (`primary`, `secondary`, `surface`, etc.) — Vuetify components use these names automatically.

### Step 2 — Rename `variables.scss`
- Replace all `$Kingston_*` variable names with semantic names per the mapping in `research.md`.
- Update values where they reference old Kingston brand colors.

### Step 3 — Update `main.scss`
- Update all hardcoded hex values in `:root` and `.v-theme--dark`.
- Fix any `$Kingston_*` SCSS variable references to use new names.
- Add `--radius-md: 10px`, `--radius-sm: 6px`, `--radius-lg: 16px` to `:root`.
- Update `.gradient-text` animation to use warm accent colors.

### Step 4 — Audit components
For each `.vue` file:
1. Search for hardcoded hex colors in `<style>` blocks and inline `style` attributes.
2. Replace with `var(--v-theme-*)` references or the CSS custom properties updated in Step 3.
3. Replace any `$Kingston_*` SCSS variable usages with the new names.

### Step 5 — Apply border radius token
- In `main.scss`, add utility styles or update existing component styles to use `var(--radius-md)` for buttons, inputs, and message bubbles.
- Vuetify components accept a `:rounded` prop — use `rounded="lg"` for cards and `rounded="md"` for buttons/inputs where appropriate.

### Step 6 — Verify loading and empty states
- Confirm Vuetify skeleton loaders pick up the new `primary` color automatically.
- Check `AI.Chat.vue` for any custom spinner/loading indicator colors.
- Ensure empty-state illustrations or placeholder text use `--text-muted` or `color="secondary"`.

### Step 7 — Test
```bash
cd client-app
npm run test          # all Vitest tests must pass
npm run build:Debug   # must compile without errors
```
Then manually verify:
- Light mode: warm amber/terracotta feel, no red/navy
- Dark mode: cool cyan/blue feel, no purple/indigo from old theme
- Both modes: message bubbles differentiated, sidebar hover/select states updated

## Key constraint

This feature is **style-only**. Do not change component logic, data flow, router config, or backend code. If a color fix requires changing component logic, that is out of scope — file it as a separate issue.
