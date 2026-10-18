# Design system

The visual language of the product as design tokens. Open `design-system.html` in a browser to see all of it at once, no build needed.

## Source

Colours, radii, shadows, blurs and easings come from the UI prototype (six phone artboards at 392x812, four desktop artboards at 1180x730). PNG exports are in `../../UI Prototype/`.

A few things differ from the prototype on purpose:

| Prototype | Here | Reason |
| --- | --- | --- |
| Body text 15px | 16px | readable default, and it leaves room to go smaller for labels |
| Buttons around 43 to 46px tall | 44px minimum | usable touch target on a phone |
| Ad hoc spacing (6, 7, 9, 11, 13px) | 4px grid | consistency across the team |
| Button labels on one line | labels wrap, segmented controls scroll inside themselves | no horizontal scrolling at 320px (N5.1) |
| Segmented options and text buttons about 33px tall | 44px below `md`, compact from `md` | usable touch target on a phone |

These are our own decisions, not requirements from the backlog. What the backlog does ask for under N5 is a layout with no horizontal scrolling on desktop, tablet and mobile, loading, empty and error states on every list and detail view, and support for the current and previous major versions of Chrome, Safari, Firefox and Edge. `backdrop-filter` carries the frosted surfaces and is available in all of those, with a fallback in `patterns.css` for anything older.

## Layers

```
tokens.primitives.css   raw values      --ds-coral-600, --ds-space-4
tokens.semantic.css     roles           --ds-color-accent, --ds-radius-card
theme.css               Tailwind bridge, generates bg-accent, rounded-card, ...
```

Components use the semantic layer or the generated Tailwind classes. They never reference a primitive directly and never contain a raw colour or length.

`theme.css` clears Tailwind's own palette and scales with `--color-*: initial` and friends, so `bg-red-500`, `rounded-lg` and the rest do not exist. If a class you expect is missing, add the token instead of using an arbitrary value.

The `--ds-` prefix keeps our tokens out of Tailwind's namespaces (`--color-*`, `--text-*`, `--radius-*`), which would otherwise collide.

| File | Contents |
| --- | --- |
| `src/index.css` | entry point, imported by `main.tsx` |
| `src/styles/tokens.primitives.css` | raw values, the only file with literals |
| `src/styles/tokens.semantic.css` | roles |
| `src/styles/theme.css` | Tailwind theme and custom utilities |
| `src/styles/base.css` | element defaults |
| `src/styles/patterns.css` | `.ds-surface`, `.ds-btn`, `.ds-badge`, `.ds-field`, ... |

## Notes on the language

Content sits on a fixed mesh backdrop as frosted glass. Depth comes from translucency and blur, not heavy shadows. The one saturated shadow is the glow under a primary button.

Buttons are 18px rounded rectangles and fields are 16px. Only chips, badges, segmented controls, tabs and nav bars are pills.

Coral is the only accent. Violet and teal appear as status colours only.

## Patterns added for the app

| Pattern | Used by |
| --- | --- |
| `.ds-skeleton` | the loading bars of `LoadingState` (N5.2). `animate-pulse` on top, which reduced motion stops. |
| `.ds-notice`, `--info`, `--success`, `--danger` | `Notice` and `FormError` |
| `.ds-select` | a native select that looks like `.ds-field`, with room for the chevron |
| `.ds-btn[aria-busy='true']` | the pending state of `SubmitButton` |
| `.ds-nav-item` | sidebar and menu entries. The current page is marked with `aria-current="page"`. |
| `.ds-tabbar`, `.ds-tabbar-item` | the floating tab bar of the student app below `lg` |
| `max-w-layout` | the content width, from `--ds-layout-max` |

## Layout

From `lg` (1024px) both shells have a sticky sidebar with the wordmark, the navigation and the account actions. Below `lg` the student app has a floating tab bar at the bottom, and the admin console a top bar with a menu that opens in the page flow, because it has more entries than a tab bar holds. The split is at `lg` and not `md` because at 768px a sidebar leaves too little room for tables.

Every page has a sticky glass header with its title, and the content is centred at `max-w-layout` with `px-4 md:px-8`. `--ds-focus-scroll-top` and `--ds-focus-scroll-bottom` give the page `scroll-padding`, so a control that receives keyboard focus is scrolled clear of the sticky header and the tab bar instead of ending up under them (WCAG 2.4.11).

## Status colours

The Order Service owns the errand state machine (backlog F3.3), the client only presents it. The six states it defines map to the four badge variants:

| State | Variant |
| --- | --- |
| Open | `danger` |
| Accepted, Picked up | `info` |
| Completed | `success` |
| Cancelled, Expired | `neutral` |

The prototype's admin screens also show a "Stalled" label for errands sitting too long. That is a derived view, not a stored state, and it reuses `danger`.

Other statuses follow the same meaning: `success` for active or available (an Active supplier), `neutral` for inactive or archived, `info` for in progress, `danger` for anything that needs attention.

Credit movements out of the wallet use `.ds-amount--out`, movements in use `.ds-amount--in`.

## Open

- Product name: the prototype is branded Relay, the template calls the product Friend on Campus, and the D1 backlog names it neither. The web client shows Relay in the wordmark and the tab titles. No token or class encodes any name, so this can be settled late.
- Dark theme: the prototype is light only. If we want one, it is a `[data-theme="dark"]` block overriding `tokens.semantic.css`, nothing else.
- Component primitives for dialog, combobox and tabs are not chosen yet.
