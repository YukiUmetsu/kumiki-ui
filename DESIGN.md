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
| Parchment | `#f6f3f1` | Canvas / page background. Never pure white. |
| Off-Black | `#242424` | Primary text and secondary actions. |
| Ash | `#cecac8` | Decorative borders, dividers, hairlines (1px). |
| Lake Blue | `#2b59d1` | The single accent — reserved for the one primary action per screen. |
| Graphite | `#4e4d4d` | Muted text (replaces Smoke, which fails WCAG AA on Parchment). |
| Smoke | `#797776` | Strong control boundaries that must meet non-text contrast. |
| Ink | `#000000` | Focus rings in light mode. |
| Periwinkle Mist | `#cfdaf5` | Subtle / card / accent backgrounds. |
| Sky Blue | `#a0b5eb` | Decorative accent tint. |
| Mint | `#a7fccd` | Decorative accent tint. |
| Coral | `#ff9473` | Decorative warm accent; dark-mode destructive foreground. |
| Crimson | `#f37a0a` | Destructive actions. |
| Gold | `#ecda98` | Decorative warm accent. |
| White | `#ffffff` | Primary surfaces and inverse text. |

### Contrast trade-off

The spec says Ash for all borders. Ash on Parchment is ~1.6:1, so it cannot carry control boundaries under WCAG 2.2 1.4.11. `semantic.border.strong` is therefore mapped to Smoke (`#797776`, ≥3:1 on surfaces) while `semantic.border.subtle` stays Ash for decorative dividers.

### Dark appearance notes

The dark palette keeps the same roles but inverts value relationships so hierarchy survives the appearance switch:

- `action.primary` stays Lake Blue; it remains the single brightest accent.
- `action.secondary` uses an elevated graphite fill with white text — lower luminance than Lake Blue, clearly subordinate, and distinct from the bordered `outline` variant.
- `action.subtle` is rendered as an off-black ghost with ash text, giving it lower emphasis than secondary.
- `action.disabled` uses the default surface colour with smoke text so disabled controls recede below `outline` buttons.

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
| radius-sm | 4px | small corners |
| radius-md | 8px | default controls |
| radius-lg | 12px | larger controls |
| radius-xl / 2xl | 16px | panels |
| radius-3xl | 40px | cards / surfaces |
| radius-full / pill | 9999px | buttons, tags, pills |

Buttons are **100px pills** (`rounded-full`). Cards use **40px** (`rounded-surface`).

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
- Use pill-shaped controls.
- Keep the page canvas Parchment; never pure white.
- Reserve Lake Blue for the single primary action.
- Use 1px Ash hairlines for decorative separation.
- Use sentence case for labels, buttons, tabs, nav and menu items. Reserve uppercase + wide tracking for the only two overline micro-labels: the progress label (rendered at body-sm / 14 px for readability) and the dropdown-menu group header.

**Don't**
- Make headings bold.
- Set UI chrome in monospace — mono stays available to consumers but was removed from chrome for readability.
- Use a pure-white page background.
- Use Lake Blue for anything except the primary action.
- Use Smoke for muted text — use Graphite instead.
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
