# DocumentPage2D — what a document page still contains

**Status:** Implementing (automated render checks recorded in the [verification log](../verification/document-page-2d.md); human review pending)
**Catalog phase:** specialized
**Scope:** One document page drawn in four stages: a scan with no text layer, a text layer added by OCR, a black box over a line with the text layer still present, and a flattened redaction with the text layer removed. The drawing shows what a file contains after each step. It does not show real text, and it does not claim how accurate any recognition or redaction is.

## Install and inspect
- Registry item: `document-page-2d` (`DocumentPage2D`, `DOCUMENT_PAGE_STATES`).
- Storybook: **Domains → Document Pages**. Four states side by side, a dark-theme copy, and the box placed on lines 1, 4 and 6.

## Minimal usage
~~~tsx
<DocumentPage2D state="boxed" redactedLine={2} theme="paper" width={240} height={200} />
~~~

## Contract
- **Use / not use:** use to explain scanned PDFs, OCR and the difference between a visual black box and a true redaction. Do not use it to show real document content or to claim that a particular tool performs these steps.
- **Public API:** `state` (`scan` default, `ocr`, `boxed`, `flattened`), `redactedLine` (whole number 0–5; default 2; used by `boxed` and `flattened`), `title` (defaults by state), plus the standard `DomainIllustration` props (`theme`, `tokens`, `frame`, `reducedMotion`, `showTitle`, `backdrop`, `parts`, `ref`, SVG props).
- **Validation:** an unknown state throws with the valid list. `redactedLine` outside 0–5, or not a whole number, throws with the valid range.
- **Composition:** named parts (`sheet`) through the toolkit's pose API. The text-layer outlines and the box are separate groups, so a host can animate either.
- **Semantics:** the illustration is `role="img"`, named by its title. Placeholder bars carry no meaning; the title and the explanatory text around the drawing do the work.
- **Keyboard/focus:** none.
- **Visual states:**
  - `scan`: grey sheet, faint lines, no outlines.
  - `ocr`: white sheet, solid lines, dashed accent outline on every line.
  - `boxed`: the covered line is under a solid ink box, and its dashed outline is drawn on top of the box.
  - `flattened`: the box is drawn with no outlines.
- **Customization:** `theme` (`paper`, `midnight`) and `tokens`.
- **Dependencies:** `domain-illustration-2d`.
- **Limits:**
  - One page, six lines, fixed positions. The layout does not reflow.
  - The text-layer outline is a stylised rectangle around each placeholder line. It does not match real word boxes, and the drawing is not evidence of how a particular OCR engine segments text.
  - The title band names the state; the drawing does not explain it. Hosts should put the claim in words beside the drawing, as the story does.

## Verification
See the [verification log](../verification/document-page-2d.md).
