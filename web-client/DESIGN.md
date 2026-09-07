# Design system

The visual language of the product as design tokens. Open `design-system.html`
in a browser to see all of it at once, no build needed.

## Source

Colours, radii, shadows, blurs and easings come from the UI prototype
(six phone artboards at 392x812, four desktop artboards at 1180x730). PNG
exports are in `../../UI Prototype/`.

Three things differ from the prototype on purpose:

| Prototype | Here | Reason |
| --- | --- | --- |
| Body text 15px | 16px | N6.1.2 requires at least 16dp body text |
| Buttons around 43 to 46px tall | 44px minimum | N6.1.1 requires 44x44dp targets below 768px |
| Ad hoc spacing (6, 7, 9, 11, 13px) | 4px grid | consistency across the team |

## Layers

```
tokens.primitives.css   raw values      --ds-coral-600, --ds-space-4
tokens.semantic.css     roles           --ds-color-accent, --ds-radius-card
theme.css               Tailwind bridge, generates bg-accent, rounded-card, ...
```

Components use the semantic layer or the generated Tailwind classes. They never
reference a primitive directly and never contain a raw colour or length.

`theme.css` clears Tailwind's own palette and scales with `--color-*: initial`
and friends, so `bg-red-500`, `rounded-lg` and the rest do not exist. If a class
you expect is missing, add the token instead of using an arbitrary value.

The `--ds-` prefix keeps our tokens out of Tailwind's namespaces
(`--color-*`, `--text-*`, `--radius-*`), which would otherwise collide.

| File | Contents |
| --- | --- |
| `src/index.css` | entry point, imported by `main.tsx` |
| `src/styles/tokens.primitives.css` | raw values, the only file with literals |
| `src/styles/tokens.semantic.css` | roles |
| `src/styles/theme.css` | Tailwind theme and custom utilities |
| `src/styles/base.css` | element defaults |
| `src/styles/patterns.css` | `.ds-surface`, `.ds-btn`, `.ds-badge`, `.ds-field`, ... |

## Notes on the language

Content sits on a fixed mesh backdrop as frosted glass. Depth comes from
translucency and blur, not heavy shadows. The one saturated shadow is the glow
under a primary button.

Buttons are 18px rounded rectangles and fields are 16px. Only chips, badges,
segmented controls, tabs and nav bars are pills.

Coral is the only accent. Violet and teal appear as status colours only.

## Status colours

The Order Service owns the errand state machine, the client only presents it.

| State | Variant |
| --- | --- |
| Open, Stalled | `danger` |
| Accepted, Picked up | `info` |
| Delivered, Completed | `success` |
| Expired, Cancelled | `neutral` |

Credit movements out of the wallet use `.ds-amount--out`, movements in use
`.ds-amount--in`.

## Open

- Product name: the prototype says Relay, the backlog says CampusRun, the
  template says Friend on Campus. No token or class encodes any of them.
- Dark theme: the prototype is light only. If we want one, it is a
  `[data-theme="dark"]` block overriding `tokens.semantic.css`, nothing else.
- Component primitives for dialog, combobox and tabs are not chosen yet.
