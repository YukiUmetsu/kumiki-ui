# 01 — Premium Design Foundations

**Aim:** consistent craftsmanship that survives customization. “Premium” is neither glassmorphism nor minimalism; it is the combined experience of clarity, purpose, dependable behavior, expressive restraint and attention to detail. A complicated interface can still be premium when its information is well organized.

## Design principles applied to every component

| Principle | Implementation test |
|---|---|
| Clear hierarchy | Primary action/status is obvious; supporting detail doesn't compete for attention |
| Readability | Text is comfortably legible; no tiny, pale “premium-looking” labels |
| Precision | Consistent spacing/alignment, optical icon sizing, stable loading dimensions |
| Predictability | Familiar keyboard/pointer conventions, explicit state changes, correct focus restoration |
| Responsiveness | Immediate feedback, no accidental layout shifts, async work never blocks the whole interface |
| Restraint | Motion, shadow and color serve function; ornament doesn't hide the interaction |
| Brand independence | Same component works under unrelated themes without internal style patches |
| Resilience | Long/CJK strings, missing content, errors, zoom, mobile width and reduced motion remain usable |

Favor whitespace for grouping before adding borders/cards. Avoid endless nested cards, inconsistent radii, oversized headings beside cramped controls, and decorative animation that interferes with repeated work. Don't hide essential functionality just to reduce visible text.

## Token architecture

Use **Design Tokens Community Group (DTCG) JSON** as canonical source, with a validator and generated CSS custom properties. Tokens are design API; version changes carefully.

| Layer | Examples | Rule |
|---|---|---|
| Foundation | palette steps, spacing steps, type metrics, radii, duration | Internal design ingredients, not app-specific |
| Semantic | `surface.canvas`, `text.primary`, `action.primary`, `border.subtle`, `focus.ring` | Components consume these by role |
| Component | `button.height.md`, `dialog.radius`, `tree.row.height` | Add only when a real component needs special control |

Beyond the examples above, `surface.{canvas,default,subtle,elevated,inset,floating}` are joined by `surface.track` (recessed rails for progress bars, tab troughs and switch rails) and `surface.field` (the interior of inputs, textareas, selects and checkboxes). `status.{info,success,warning,danger}` is the semantic severity scale, separate from `action.destructive`.

Use `--km-` CSS variable prefix; `data-km-appearance="light|dark"` and `data-km-density="comfortable|compact|spacious"` scopes. A **custom theme** is a named collection of semantic-token overrides. Do not encode one theme or consumer into component source. Keep `appearance`, `density`, theme selection and reduced-motion preference independent.

Override precedence: `defaults → theme → appearance → density → documented component variant → local consumer overrides`. Document override boundaries and test resolved text/surface pairs. Themes cannot silently change behavior or accessible semantics.

Example (illustrative CSS, not a full token implementation):

```css
:root { --km-surface: #fff; --km-text: #16181b; --km-space-3: 12px; }
[data-km-appearance='dark'] { --km-surface: #16181b; --km-text: #f8f9fa; }
.km-panel { color: var(--km-text); background: var(--km-surface); padding: var(--km-space-3); }
```

## Visual defaults (guidelines, not absolute rules)

| Area | Starting guideline |
|---|---|
| Type | Body ~16–18 px; dense data 14–16 px; metadata generally >=13–14 px; logical font fallbacks for CJK |
| Line height | Body ~1.45–1.65; headings tighter; verify actual font rendering |
| Spacing | 4, 8, 12, 16, 24, 32, 48, 64 px spacing rhythm; pair gaps by visual relationship |
| Layout | Consistent alignment anchors; predictable padding; dense surfaces may use tighter but readable spacing |
| Motion | CSS for simple effects; Motion only when composition, gestures or interruptible layout transitions justify it |
| Duration | Press feedback ~80–140 ms; popover ~140–220 ms; larger transitions ~180–320 ms, adjusted by context |
| Contrast | WCAG 2.2 AA-oriented text and nontext criteria; validate **resolved foreground/background**, not isolated palette colors |
| Targets | Respect WCAG 2.2 target-size rule/exception; prefer ~44 px targets in touch-heavy contexts where practical |

Use purpose-driven easing: enter/decelerate, exit/accelerate, and continuity for shared-layout transitions. Avoid animating properties that cause expensive layout work when transform/opacity convey the same information. Disable or simplify nonessential movement under `prefers-reduced-motion`; never hide necessary information when motion is reduced.

## Customization contract

A consumer should be able to change colors, typeface, density, radii, spacing and motion profile **without patching interaction code**. Offer typed `variant`/`size` only where semantic, slots/compound composition for meaningful structure, standard `className`/`style`/DOM attributes, and ref forwarding where applicable. Do not force app-wide providers for standalone controls. Avoid `!important`, brittle internal selectors and giant “pixel-level” prop APIs.

Test the same component in two deliberately different **anonymous** palettes (`theme-a`, `theme-b`), light/dark, comfortable/compact, English/Japanese, long content, 200% text size and reduced motion. A component that only looks good in the default story is unfinished.

**References:** [Apple HIG](https://developer.apple.com/design/human-interface-guidelines), [WCAG 2.2](https://www.w3.org/TR/WCAG22/), [DTCG format](https://www.designtokens.org/tr/2025.10/format/), [NN/g usability heuristics](https://www.nngroup.com/articles/ten-usability-heuristics/).
