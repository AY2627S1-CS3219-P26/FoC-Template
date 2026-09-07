# web-client

See `../AGENTS.md` for repository-wide rules. Read `DESIGN.md` before writing any
UI, and open `design-system.html` in a browser to see the whole design language.

## Scope

Presentation and interaction only. Every data rule, validation rule, permission
rule, state transition and credit calculation belongs to a backend service. Do
not reimplement one here, not even a small one. If the endpoint you need does not
exist, say so rather than computing the value in the client.

Stack: React 19, Vite 8, TypeScript, Tailwind 4, oxlint. No test runner and no
formatter are installed, so do not write instructions that assume them.

Nothing is implemented yet. `App.tsx` is a placeholder, delete it when routing
lands.

## Design system

The rules that matter most, in order:

1. **Never write a raw colour or length.** No hex, no `rgb()`, no px in a
   component. Use a Tailwind class from the theme (`bg-surface`, `text-muted`,
   `rounded-card`, `p-3`) or a pattern class from `patterns.css`.
2. **Tailwind's default palette and scales are deliberately removed.**
   `theme.css` sets `--color-*: initial` and the same for radius, shadow, text,
   font, tracking, leading, ease, blur and breakpoint. So `bg-red-500` and
   `rounded-lg` do not compile. **This is intended, not a bug.** Do not remove
   those `initial` lines to make a class work.
3. **No arbitrary values.** `bg-[#ff5a3c]` and `p-[13px]` defeat the point.
4. **Missing token?** Add it to `tokens.semantic.css`, referencing a primitive,
   and mention it in the pull request. Never inline the value instead.
5. **Components never reference a primitive.** `--ds-coral-600` is not for
   components, `--ds-color-accent` is.
6. **Buttons are 18px rounded rectangles and fields are 16px, not pills.** Pills
   are only for chips, badges, segmented controls, tabs and nav bars. Getting
   this backwards is the fastest way to stop looking like the prototype.

Available pattern classes, so you do not reinvent them:

```
surfaces  .ds-surface  .ds-surface--chrome  .ds-surface--sunken
          .ds-surface--panel  .ds-hairline  .ds-rows
buttons   .ds-btn  .ds-btn--primary  .ds-btn--glass  .ds-btn--text
          .ds-btn--icon
badges    .ds-badge  .ds-badge--danger  .ds-badge--info
          .ds-badge--success  .ds-badge--neutral
forms     .ds-label  .ds-field-label  .ds-field  .ds-field-error
          .ds-segmented
numbers   .ds-num  .ds-stat-value  .ds-stat-unit  .ds-amount
          .ds-amount--out  .ds-amount--in
other     .ds-placeholder  .ds-bar
```

A button always carries `.ds-btn` plus one variant, for example
`class="ds-btn ds-btn--primary"`. Same for badges and amounts.

Extra utilities from `theme.css`: `glass`, `glass-soft`, `bg-accent-gradient`,
`bg-backdrop-mesh`, `tap-target`, `nums-tabular`.

Import order in `src/index.css` is deliberate. `base.css` and `patterns.css` are
imported into cascade layers so Tailwind utilities can still override them. Do
not flatten those imports.

## What the UI has to do

From the backlog, group N5:

- No horizontal scrolling on desktop, tablet or mobile.
- Every list and detail view has a loading state, an empty state and an error
  state. These are part of the work, not polish added later.
- Works on the current and previous major versions of Chrome, Safari, Firefox
  and Edge.

House rules on top of that, encoded in the tokens:

- Interactive targets at least 44x44px below the `md` breakpoint, at least 8px
  apart. Icon-only controls use `.ds-btn--icon` or the `tap-target` utility.
- Body text at least 16px. Anything smaller is a label, never prose.
- The layout works from 320px upward. Build mobile first and add `md:` and `lg:`,
  never `max-*` downward.
- Keyboard focus stays visible. Do not remove an outline without replacing it.
- Wide content, tables especially, scrolls inside its own container rather than
  pushing the page sideways.

## Structure

Once features start: `src/features/<domain>/` for feature code, `src/components/`
for anything genuinely shared by two or more features, `src/lib/` for the API
client and helpers. Features do not import from each other.

## Before you call it done

Run `npm run build` and `npm run lint`. Both must pass.
