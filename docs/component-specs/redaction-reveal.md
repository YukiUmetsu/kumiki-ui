# RedactionReveal — covered text as bars, highlights or overlays

**Status:** Implementing (visual and automated checks pending; see Verification)
**Catalog phase:** specialized
**Scope:** Inline text in which character ranges are covered. The default `redacted` mode removes the covered text from the page and replaces it with a bar, so copy, search and assistive tech cannot reach it. `revealed` shows the full text with the ranges marked for review. `overlay-only` paints a bar over text that stays in the page; it exists to demonstrate why a visual black box is not a redaction.

## Install and inspect
- Registry item: `redaction-reveal` (`RedactionReveal`, `normalizeRedactions`, `redactionSegments`, `redactionWidthEm`).
- Storybook: **Visual → Redaction Reveal**, with the three modes and a live readout of which covered strings still appear in the page, realistic samples (log line, contact line, long token), dark theme, a 240 px column and invalid-range diagnostics.

## Minimal usage
~~~tsx
<RedactionReveal
  text="Sent from 203.0.113.42 by alex.morgan@example.test"
  ranges={[{ start: 10, end: 22, label: "IP address" }, { start: 27, end: 49, label: "email address" }]}
  mode="redacted" // "revealed" | "overlay-only"
/>
~~~

## Contract
- **Use / not use:** use for logs, screenshots transcribed as text, CSV cells, document excerpts and any inline text that must show a redaction. Do not use `overlay-only` in production for protection; the text stays selectable, searchable and readable by screen readers.
- **Public API:** `text: string`, `ranges: RedactionRange[]` (`{ start, end, label? }`, UTF-16 offsets, half-open), `mode` (default `redacted`), and every standard `span` attribute plus `ref` (forwarded to the root `span`).
- **Composition:** inline. It renders no block element and takes `className` and `style` like any span.
- **Semantics:** each bar is `role="img"` with the accessible name `Redacted` or `Redacted: <label>`. Revealed and overlay text is ordinary text. The root carries `data-km-redaction-mode`.
- **Keyboard/focus:** none. Nothing is focusable.
- **Visual states:** `redacted` (bar), `revealed` (highlight with an underline mark), `overlay-only` (bar over text, text colour matched to the bar so the letters are invisible but present).
- **Customization:** CSS custom properties on any ancestor: `--km-redaction-ink` (bar and overlay colour, default `currentColor`), `--km-redaction-highlight` (default an amber tint) and `--km-redaction-mark` (underline, default amber). With the defaults, bars follow the text colour in light and dark themes.
- **Dependencies:** none beyond React. No global CSS, no measurement, no motion.
- **Limits:**
  - Bar width is an approximation in `em`: about 0.55 em per Latin character and 1 em per CJK, emoji or full-width glyph. A bar matches the covered text's length, not its exact glyph widths.
  - Offsets are UTF-16 code units. Use `text.indexOf` or a tokenizer that reports code-unit offsets; never offsets computed from grapheme counts.
  - Ranges that are out of bounds are clamped (covering more text, never less). Overlaps are merged. Empty and non-integer ranges are dropped. `normalizeRedactions` returns these as diagnostics; the component does not surface them, so validate upstream when accuracy matters.
  - Long unbroken tokens wrap anywhere (`overflow-wrap: anywhere`), which keeps narrow columns intact.
  - The component does not choose what to redact. Detection of personal data, secrets or location metadata belongs to the consumer.

## Verification
- Storybook stories exist for every mode and for the cases above.
- Rendered-state checks, the DOM exposure check and screenshots: see [the verification log](../verification/redaction-reveal.md) once recorded. Until then this component is **not** verified.
