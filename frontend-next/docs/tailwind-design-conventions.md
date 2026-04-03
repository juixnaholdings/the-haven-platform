# Tailwind-First UI Conventions

This frontend now uses Tailwind utility classes as the primary styling path.

## Scope
- `frontend-next` is the active frontend.
- Keep `/dashboard` route design and protected shell sidebar/header visual structure unchanged unless explicitly requested.

## Preferred Styling Pattern
- Use inline Tailwind utility classes in shared components first.
- Reuse semantic helper classes from [`src/app/globals.css`](../src/app/globals.css) only when they reduce duplication across many screens.
- Avoid creating new large bespoke CSS blocks for individual pages.

## Visual Direction
- Warm neutral surfaces (`slate` + light amber accents).
- Soft depth (`shadow-sm`, subtle borders).
- Rounded cards/panels and pill-style actions.
- Consistent spacing rhythm (`gap-4`, `gap-6`, `px-4/6`, `py-3/5`).

## Shared UI Expectations
- Buttons: rounded-full, clear primary/secondary/ghost variants.
- Forms: uppercase micro-labels, calm borders, visible focus rings.
- Tables: muted headers, soft row hover, compact utility actions.
- Status badges: tonal chips with readable contrast.
- Modals: rounded shell, dim backdrop, clear header/body/footer regions.
- Empty/loading/error states: compact, clear, and actionable.

## Product Screen Patterns
- Prefer route-level Tailwind utility composition in screen files (`*PageScreen.tsx`) over adding new global CSS.
- Keep domain screens on a shared rhythm:
  - root wrapper: `space-y-6`
  - section cards: `rounded-3xl border border-slate-200/80 bg-white/95 p-6 shadow-sm`
  - action groups: `flex flex-wrap items-center gap-2.5`
  - metadata text: `text-sm text-slate-500`
- Reuse shared primitives (`PageHeader`, `EntityTable`, `PaginationControls`, `StatusBadge`, `StatCard`) and only add one-off utilities where layout intent is route-specific.
