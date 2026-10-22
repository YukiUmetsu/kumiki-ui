# EvidenceStage — show the source, cite it exactly, conclude from it

**Status:** Implementing. Automated checks and agent screenshot review are recorded below. Human review is pending.
**Catalog phase:** P0, first slice of Phase 3 in [17 — Explainer Visual Components](../17-explainer-visual-components.md#3-highest-priority-component-contracts-p0).
**Scope:** Presents authorized evidence: photographs, screenshots, document excerpts, quotes and data tables.
- It highlights exact regions, shows readable provenance and rights, and frames each cited target with its context.
- It ends on a conclusion whose numbered citations link back to the evidence.
- It verifies what can be verified: quotes match their offsets, cells hold the cited value, regions lie inside the image, and every source carries provenance and rights. It cannot judge whether a source is true.

## Reuse and the gap it fills
- **Reused:**
  - **Images:** `MediaFrame` draws them, with honest loading and failure states.
  - **Text:** wrapping is CaptionPerformer's offset-preserving `layoutCaptionLines`, measured with the real font through `createCanvasMeasurer`.
  - **Zoom:** focus crops use the same `regionCrop` / `interpolateCrop` as FreezeFrameFocus, moved into `frame-clip.ts` and now shared by both.
  - **Callouts:** SemanticCallouts places them on an `InspectableAsset` built from the anchors.
  - **Safe area:** an enclosing ShortSafeFrame's content area sets the lanes.
  - **Checks:** reading time comes from `readableCaptionFrames`; tests use `inspectSeekParity`.
- **Not reused:** `DocumentPage2D` and `RedactionReveal`. DocumentPage2D is an illustration with placeholder lines, so it cannot hold exact quotes. Redactions here are length-preserving blocks in the measured text, so citation offsets stay valid, and RedactionReveal is an inline HTML component.
- **The gap:** before this item, the registry could show a document illustration or a photo, but nothing tied a claim to an exact, verified excerpt with its provenance.

## Install and inspect
- Registry item: `evidence-stage` (`evidence-stage.ts`, `evidence-stage-react.tsx`).
- Storybook: **Visual → Evidence Stage**.
  - **Investigation:** one 26-second investigation at 9:16 and 16:9 across three source types, all fictional samples or in-house renders:
    - a delivery-policy document with one redaction;
    - a 3840×2160 conveyor still, rendered by `node scripts/generate-conveyor-footage.mjs --still=90`;
    - a route-schedule table.

    Its conclusion is "10:04 + 3 × 12 minutes ≈ 10:40", with citations [1]–[3].
  - **Refusals:** a misquote, a cited redaction, a region outside the image, a wrong cell value, missing rights and a dangling citation, each reported.

## Minimal usage
~~~tsx
const spec: EvidenceStageSpec = { id: "arrival", fps: { num: 30, den: 1 }, sources, beats: [
  { id: "open", kind: "establish", sourceId: "policy", durationFrames: 120 },
  { id: "rule", kind: "focus", sourceId: "policy", anchorIds: ["per-stop"], durationFrames: 80, callouts: [{ anchorId: "per-stop", title: "12 minutes per stop" }] },
  { id: "end", kind: "conclude", durationFrames: 120 },
], conclusion: { text: "… plus 3 × 12 minutes [1] …", citations: [{ marker: "[1]", sourceId: "policy", anchorId: "per-stop" }] } };

<EvidenceStage spec={spec} frame={frame} width={1080} height={1920} onDiagnostics={report} />
~~~

## Contract
- **Provenance (required):** `{ title, author | publisher, date, locator, url?, accessed?, rights: { status, reference }, note? }`.
  - `rights.status` is `owned`, `licensed`, `public-domain`, `permission` or `fair-use-claimed`. A source without a rights reference is refused, and a fair-use claim is flagged as the author's judgement, not a licence.
  - Provenance is drawn in a measured lane that wraps and never truncates. Each establish beat must give it reading time.
- **Sources:**
  - `image`: `{ asset (with intrinsic width/height), alt, anchors: [{ id, rect (source px) }] }`. Regions must lie inside the image, and `alt` is required.
  - `text`: `{ text, lang?, anchors: [{ id, quote, start? | occurrence? }], redactions?, width?, font?, fontSizePx?, lineHeight? }`.
    - **Quotes:** the quote must equal the text at `start`, or be unambiguous (or pick a match with `occurrence`).
    - **Redactions:** redacted characters are replaced one for one by █, so the hidden text never renders and offsets stay valid. Citing redacted text is refused.
  - `table`: `{ columns: [{ id, label, width, align? }], rows: [{ id, cells }], anchors: [{ id, rowId, columnId?, expect? }] }`. `expect` must equal the displayed cell. A cell's **context** is its row label (first column) and its column header.
- **Beats:** `establish` (whole source), `focus` (anchors with `context` padding, default 0.6 of the target size, plus callouts) and `conclude`. Consecutive beats on the same source move the camera over `moveFrames` (18); a change of source is a cut.
- **Box layout:** `layoutEvidenceBox(spec, beat, box, measure, { safe })` reserves:
  - a provenance lane at the bottom (measured lines);
  - a callout lane at the top during focus beats with callouts;
  - a viewport for the surface, the remaining space.

  Surfaces are clipped to the viewport.
- **Callouts:** documents and tables are never covered; the whole visible page is protected, so labels go to the callout lane or the margins. Photos protect the cited region and its context. Callouts that cannot be placed are reported (`evidence-callout-unplaceable`), never silently dropped.
- **Evaluation:** `evaluateEvidence(spec, surfaces, frame, box, viewportOf?)` returns the beat, crop, draw mapping, highlight strengths, citation markers, callouts and conclusion visibility. It is pure, so seeks are exact. The focus crop frames the anchor's context, not only the anchor.
- **Validation:** `validateEvidenceStage(spec, surfaces, boxes, { measure, safe, minContextPx, minTargetPx, maxUpscale })`. Layout errors come from `layoutEvidenceSources`.
  - **Provenance and rights:** `evidence-provenance-missing`, `evidence-rights-missing`, `evidence-fair-use-claimed`, `evidence-alt-missing`.
  - **Anchors:** `evidence-quote-mismatch`, `evidence-anchor-redacted`, `evidence-anchor-outside`, `evidence-value-mismatch`, `evidence-anchor-unknown`.
  - **Beats:** `evidence-source-unknown`, `evidence-focus-empty`, `evidence-focus-short`, `evidence-provenance-short`.
  - **Framing, per output:** `evidence-target-cropped` (an error if the target or its context is cut off), `evidence-context-lost`, `evidence-target-small` (text rendered under 36 px tall), `evidence-upscaled` (image pixels enlarged more than ×1.5).
  - **Conclusion:** `evidence-citation-unused`, `evidence-citation-unknown`, `evidence-citation-dangling`, `evidence-citation-unshown`, `evidence-conclusion-unshown`.
- **Component:**
  - `EvidenceStage` owns no clock. Its props are `spec`, `frame`, `width` / `height`, `measure?`, `safe?`, `onDiagnostics`, plus forwarded `div` props and ref.
  - The root reports `data-evidence-beat` and `data-evidence-status` (`pending` until an image source has loaded, `error`, `ready`).
  - Colours come from the `--km-evidence-*` tokens.
- **Limits:**
  - Rectangular regions only; a quote can't span sources.
  - Tables use fixed column widths (long cells are not wrapped).
  - The text card is a typeset excerpt, not a facsimile of the original page. Use an image source for a visual record of the page.
  - The conclusion is author text; arithmetic in it is not checked.

## Verification (2026-10-22)
- `npx vitest run tests/visual-constraints.test.ts`: four cases.
  - **Layout:** exact anchors at measured offsets (fake 10 px measurer); a length-preserving redaction; table context covers the row label and header.
  - **Refusals:** misquote, ambiguous quote, cited redaction, region outside the image, wrong cell value, missing provenance or rights, fair-use claim, missing alt.
  - **Citations:** unused, unknown, dangling and unshown markers.
  - **Lanes and seeking:** lanes are reserved and a long title wraps without truncation; the target's context stays inside the viewport; establish shows the full surface; the conclusion is visible; both outputs validate without errors; seek parity holds.
- Rendered in Storybook (9:16 and 16:9) and reviewed by the agent: establish, both document focuses, photo focus, table focus, conclusion and refusals. Every beat was `ready`, every callout was placed, no diagnostics were raised in the good story, and there were no console errors.
- Fixed after review:
  - **Table context:** the table focus showed "10:04" without its row or header, so a context region was added and focus frames it.
  - **Covered text:** callouts covered document text, so pages are now protected and a callout lane is reserved.
  - **Overlapping provenance:** the provenance overlapped content; it now has its own measured lane.
  - **Silent drops:** unplaceable callouts were silently dropped and are now reported. Leaders can reach the lane (up to 640 px).
  - **Upscaling:** the 1920 px photo was enlarged up to ×4.85; it is now a 4K render.
  - **Reading time:** establish beats are long enough to read the provenance.
  - **Thumbnails and layout:** conclusion thumbnails now include context, the portrait conclusion uses one column, and the 16:9 card is centred.
  - **Crop precision:** `interpolateCrop` returns identical crops exactly, with no floating-point drift.
- **Human visual review:** pending. No real third-party document, photograph or dataset has been exercised; all samples are fictional or in-house.
