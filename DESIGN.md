# Kumiki UI — Monad base theme

This document describes the **Monad** design system encoded in the canonical tokens (`foundations/tokens/kumiki.tokens.json`). Components remain brand-neutral: everything below is expressed through semantic tokens, so a custom theme is just a set of semantic-token overrides.

## Font substitution note

The original Monad specification uses commercial typefaces. Kumiki ships free variable-font substitutes:

| Role | Spec font | Substitute | CSS token |
|---|---|---|---|
| Headings / display | (commercial serif) | **Newsreader Variable** | `--km-font-serif` |
| UI chrome & body (labels, buttons, nav, tags, captions, short copy, paragraphs) | (commercial sans) | **Geist Variable** | `--km-font-sans` |
| Optional monospace (available for code to consumers; **not used for UI chrome**) | (commercial mono) | System mono stack | `--km-font-mono` |

Newsreader is used at **weight 400 only** — headings are never bold. CJK fallback stacks are appended after the primary family so Japanese/Korean text still renders.

Monospace is available as a token for consumers who want it, but Kumiki removed it from UI chrome for readability — UI text now inherits the sans stack.

## Palette

| Token | Hex | Role |
|---|---|---|
| Parchment | `#f6f3f1` | Light canvas / page background. Never pure white. |
| Off-Black | `#242424` | Light primary text and secondary actions. |
| Ash | `#cecac8` | Light decorative borders, dividers, hairlines (1px); light `surface.inset` and `surface.track`. |
| Lake Blue | `#2b59d1` | Retained as an optional informational blue (light `status.info`). No longer the accent. |
| Graphite | `#4e4d4d` | Light muted text (replaces Smoke, which fails WCAG AA on Parchment). |
| Smoke | `#797776` | Light strong control boundaries; dark `action.disabled-fg`. |
| Ink | `#000000` | Focus rings in light mode. |
| Periwinkle Mist | `#cfdaf5` | Subtle / card / accent backgrounds. |
| Sky Blue | `#a0b5eb` | Dark `status.info`. |
| Mint | `#a7fccd` | Light `action.subtle` fill. |
| Coral | `#ff9473` | Decorative warm accent. |
| Crimson | `#f37a0a` | Retained primitive only — no longer the light destructive colour. |
| Gold | `#ecda98` | Dark `status.warning`. |
| White | `#ffffff` | Light primary surfaces and inverse text; light `surface.field`. |
| Night | `#141416` | Dark canvas. |
| Void | `#101012` | Dark `surface.inset` (deepest recess). |
| Coal | `#1d1d20` | Dark `surface.default` (cards, panels). |
| Coal Bright | `#242429` | Dark `surface.subtle` and `surface.floating`. |
| Slate | `#2a2a30` | Dark `surface.elevated`. |
| Slate Bright | `#3a3a42` | Dark `action.secondary`. |
| Iron | `#33333c` | Dark `border.subtle`, `surface.track` and `action.disabled`. |
| Steel | `#6b6b73` | Dark `border.strong`. |
| Pitch | `#17171b` | Dark `surface.field`. |
| Emerald | `#0b7a52` | Brand accent, light: `action.primary` and light `status.success`. |
| Emerald Bright | `#3ecf8e` | Brand accent, dark: dark `action.primary` and dark `status.success`. |
| Emerald Deep | `#06231a` | Text on dark `action.primary`. |
| Emerald Tint | `#123528` | Dark `action.subtle` fill. |
| Emerald Pale | `#8fe8c0` | Text on dark `action.subtle`. |
| Coral Bright | `#ff7a6b` | Dark `action.destructive`, dark `text.danger`, dark `status.danger`. |
| Coral Deep | `#2b100b` | Text on dark `action.destructive`. |
| Mist | `#f2f2f3` | Dark `text.primary` and dark `focus.ring`. |
| Silver | `#a3a3aa` | Dark `text.muted`. |
| Red | `#c0392b` | Light `action.destructive`, light `text.danger`, light `status.danger`. |
| Amber | `#b45309` | Light `status.warning`. |

The brand accent is now **emerald**, used in **both** appearances: light is Emerald `#0b7a52` with white text; dark is Emerald Bright `#3ecf8e` with Emerald Deep `#06231a` text. This intentionally supersedes the original Refero “Monad” Lake Blue accent; Lake Blue is retained only as an optional informational blue.

### Semantic colour groups

Primitives are ingredients; components consume the semantic roles below.

`status.{info, success, warning, danger}` is the semantic **severity** scale, separate from `action.destructive`.

| Role | Light | Dark |
|---|---|---|
| `status.info` | Lake Blue `#2b59d1` | Sky Blue `#a0b5eb` |
| `status.success` | Emerald `#0b7a52` | Emerald Bright `#3ecf8e` |
| `status.warning` | Amber `#b45309` | Gold `#ecda98` |
| `status.danger` | Red `#c0392b` | Coral Bright `#ff7a6b` |

Severity is conveyed by BOTH an icon and a colour — never colour alone. Destructive actions are a distinct concept from danger status: do not reuse one role for the other.

`surface.track` is the recessed/sunken rail behind progress bars, tab troughs and switch rails. Light is Ash `#cecac8`, dark is Iron `#33333c`. It must be perceptible against both `surface.canvas` and `surface.default` in both appearances; the previous dark value was `surface.inset`, which vanished against the card.

`surface.field` is the interior of text inputs, textareas, selects and checkboxes. Light is White `#ffffff`, dark is Pitch `#17171b`. A field must read as a well recessed below its surrounding card, so it must not reuse the card's own surface colour.

`overlay.scrim` alpha is **0.15** in light and **0.6** in dark.

### Contrast trade-off

The spec says Ash for all borders. Ash on Parchment is ~1.5:1, so it cannot carry control boundaries under WCAG 2.2 1.4.11. `semantic.border.strong` is therefore mapped to Smoke (`#797776`, ≥3:1 on surfaces) while `semantic.border.subtle` stays Ash for decorative dividers.

The contrast audit enforces **15 pairs across 3 themes with no failures**. Canonical kumiki-resolved figures include: light `text.primary` on `surface.canvas` 14.05:1, light `action.primary-fg` on `action.primary` 5.36:1, light `text.danger` on `surface.default` 5.44:1, light `text.danger` on `surface.subtle` 4.92:1, light `border.strong` on `surface.default` 4.46:1; dark `text.primary` on `surface.canvas` 16.45:1, dark `text.muted` on `surface.subtle` 6.16:1, dark `action.primary-fg` on `action.primary` 8.33:1, dark `action.destructive-fg` on `action.destructive` 6.98:1, dark `border.strong` on `surface.default` 3.18:1. Re-derive with `npm run contrast:audit`.

### Dark appearance notes

The dark palette keeps the same roles but inverts value relationships so hierarchy survives the appearance switch:

- Elevation is achieved by the solid surface (`coal` `#1d1d20`) sitting ABOVE the canvas (`night` `#141416`). This was previously inverted and is now corrected; never reuse the old pure-black solid surface.
- `action.primary` uses Emerald Bright `#3ecf8e` on Emerald Deep `#06231a` text.
- `action.secondary` uses Slate Bright `#3a3a42` with Mist text.
- `action.subtle` uses Emerald Tint `#123528` with Emerald Pale `#8fe8c0` text, keeping the brand tint on the lowest-emphasis button instead of a neutral grey.
- `action.destructive` uses Coral Bright `#ff7a6b` with Coral Deep `#2b100b` text.
- `action.disabled` uses Iron `#33333c` with Smoke text. It must NOT equal `surface.default`, or disabled controls become invisible — this was a real defect.

Borders and focus: `border.subtle` is Iron `#33333c`, `border.strong` is Steel `#6b6b73`, `focus.ring` is Mist `#f2f2f3`, and `overlay.scrim` alpha is 0.6.

### Deviations from the source style guide

Two deliberate deviations from the Refero “Monad” spec are recorded here so a future reader can revert them knowingly:

- The accent was moved from Lake Blue to emerald at the product owner's request.
- The light `destructive` / `text.danger` colour was moved from Monad Crimson `#f37a0a` to Red `#c0392b` (originally `#cf3f2c`), because `#f37a0a` sits in the same hue family as the light `status.warning` Amber `#b45309`, which made “warning” and “destructive” hard to tell apart. The Red primitive was darkened from `#cf3f2c` to `#c0392b` because `#cf3f2c` only reached 4.31:1 as text on the light `surface.subtle` (Parchment) used by status badges; the current value reaches 4.92:1 there and 5.44:1 on white.
- The example themes in `examples/themes` do not define the `semantic.status` group, so `--km-status-*` resolves to nothing under them and every status colour falls back to the inherited text colour. `npm run contrast:audit` therefore cannot enforce the `status.*` pairs; only `text.danger` is guarded. Define a `status` group in a new example theme before shipping it.

## Type scale

| Token | Size | Leading | Tracking | Use |
|---|---:|---:|---:|---|
| Display | 80px | 1.2 | −1.6px | Hero headlines |
| Heading-lg | 48px | 1.2 | −0.96px | Major section titles |
| Heading | 40px | 1.2 | −0.8px | Page titles |
| Heading-sm | 32px | 1.2 | −0.64px | Sub-section titles |
| Subheading | 24px | 1.2 | −0.48px | Card / panel titles |
| Label | 18px | 1.2 | −0.4px | Stand-alone labels |
| Body-lg | 20px | 1.35 | −0.4px | Lead paragraphs |
| Body | 16px | 1.35 | −0.4px | Long-form body (Geist) |
| Body-sm | 14px | 1.35 | −0.28px | Compact body |
| Caption | 12px | 1.2 | −0.4px | Captions, microcopy |

Only weights **400** and **500** are used.

## Spacing

Base unit **8px**. The canonical spacing tokens are:

| Token | Value |
|---|---|
| space-1 | 8px |
| space-2 | 16px |
| space-3 | 24px |
| space-4 | 32px |
| space-5 | 40px |
| space-6 | 64px |
| space-7 | 72px |
| space-8 | 80px |

Key layouts:

- element-gap: 16px (`space-2`)
- card-padding (default): 24px (`space-3`)
- card-padding (feature): 40px (`space-5`)
- section-gap: 64px (`space-6`)
- page-max-width: 1432px

## Radii

| Token | Value | Use |
|---|---|---|
| radius-sm | 6px | small inner radius for concentric nesting (e.g. a tab thumb inside a 9px tab list) |
| radius-md | 8px | compact controls |
| radius-lg | 10px | larger controls |
| radius-xl | 12px | panels |
| radius-2xl | 16px | large surfaces |
| radius-3xl | 16px | large surfaces |
| radius-pill | 9999px | genuinely circular/organic shapes only (switch tracks and thumbs, progress bars, avatar / empty-state circles) |
| radius-control | 9px | controls (derived) |
| radius-surface | 12px | cards, panels, overlay popups (derived; equals radius-xl) |

Controls are **rounded rectangles (9px)**, not pills. Cards, panels and overlay popups share a single **12px** surface radius. 6px is the small inner radius used for concentric nesting — a tab thumb inside a 9px tab list. `radius-pill` is now reserved for genuinely circular/organic shapes only: switch tracks and thumbs, progress bars, and avatar / empty-state circles.

Pill controls read as decorative and undermine the dense, engineered feel. A tight rounded-rectangle scale reads as premium and keeps concentric radii geometrically correct (outer radius − inset = inner radius).

## Shadow

A single, subtle elevation token is used everywhere:

```
0 0 10px 0 rgb(0 0 0 / 0.1)
```

Borders do the structural work; elevations are intentionally quiet.

## Do / Don't

**Do**
- Use serif headings at 400 only.
- Use the readable sans (Geist) for UI chrome: labels, buttons, nav, badges, tags, captions, short copy.
- Use the readable sans (Geist) for long-form body paragraphs.
- Use rounded-rectangle controls on the 9px control radius; reserve `radius-pill` for genuinely circular shapes.
- Keep the page canvas Parchment; never pure white.
- Reserve emerald for the single primary action.
- Use 1px Ash hairlines for decorative separation.
- Use `status.*` tokens for severity and keep an icon alongside the colour.
- Give fields and rails their own recessed surface (`surface.field`, `surface.track`).
- Keep disabled states visibly distinct from the surface behind them.
- Use sentence case for labels, buttons, tabs, nav and menu items. Reserve uppercase + wide tracking for the only two overline micro-labels: the progress label (rendered at body-sm / 14 px for readability) and the dropdown-menu group header.

**Don't**
- Make headings bold.
- Set UI chrome in monospace — mono stays available to consumers but was removed from chrome for readability.
- Use a pure-white page background.
- Use pill-shaped buttons or controls.
- Use emerald for anything except the primary action.
- Use Smoke for muted text — use Graphite instead.
- Use colour as the only signal of severity.
- Set a disabled fill equal to the surrounding surface colour.
- Use `radius-pill` for buttons, cards, panels or overlay popups.
- Let a destructive action visually compete with the primary action in mixed button groups. In a destructive confirmation dialog the filled destructive variant may be the confirm action; elsewhere keep it secondary or isolated.

## Override-precedence contract

Token resolution follows:

```
defaults → theme → appearance → density → documented component variant → local consumer overrides
```

- **Defaults** are the Monad foundation + semantic tokens.
- **Theme** is a named collection of semantic-token overrides (see `examples/themes/`).
- **Appearance** is `data-km-appearance="light|dark"`.
- **Density** is `data-km-density="comfortable|compact|spacious"`.
- **Component variants** (`primary`, `outline`, etc.) choose semantic roles, never hardcoded colours.
- **Consumer overrides** use `className`, `style`, DOM props and forwarded refs.

Themes may only change colour, type, spacing, radii and motion — they may not change behaviour, roles or accessible semantics.
