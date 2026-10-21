# SemanticCalloutLayer (V03): labels attached to moving parts

**Scope:** Measured labels and leaders for semantic anchors on moving 2D, isometric or 3D objects. Built on SL1 `layoutSemanticLabels`. There is no camera, clock or renderer: the caller supplies projection and fonts.

## Install and inspect

- Registry items: `semantic-callouts` (layout and SVG overlay) and `semantic-callouts-three` (exact `HeroAssetViewer` camera, projection and ray-cast occlusion).
- Storybook: **House Math → Semantic Callouts**. A deterministic camera orbit with the front door opening, staged entrances, a protected caption band and condenser, 16:9/9:16, a depth-test toggle and an impossible-layout stress mode.

## Minimal usage

~~~ts
const camera = heroViewCamera(house, view, 1280, 720);
const projector = createThreeCalloutProjector({ camera, viewport: { width: 1280, height: 720 }, root: house.group, parts: house.parts });
const layout = layoutCallouts({
  asset: inspectHouse3D(house), frame, viewport: { width: 1280, height: 720 },
  callouts: [{ id: "fan", anchorId: "hvac.condenser.top", title: "Condenser fan", detail: "Moves heat outdoors", window: { startFrame: 12, endFrame: 180 } }],
  project: projector.project, occluded: projector.occluded,
  protectedRegions: [captionBand], protectedParts: ["hvac.condenser"],
  typography: { titleFont: "600 21px Geist", titleSizePx: 21, maxWidthPx: 300, measure: createCanvasMeasurer({}) },
});
<SemanticCalloutOverlay layout={layout} width={1280} height={720} />;
~~~

## Contracts

- **Anchors:** `anchorId` (an InspectableAsset anchor that follows its part) or `partId` (center of the part's bounds at that frame). Unknown IDs fail `preflightCallouts` and make `layoutCallouts` throw.
- **Status:**
  - `visible`: placed.
  - `occluded`: only when a depth test is supplied. Without one, a single `occlusion-unknown` note is emitted and anchors count as visible.
  - `outside`: behind the camera or beyond the safe inset.
  - `unplaceable`: no free space within the largest leader length, with a diagnostic.
  - `inactive`: outside the callout's window. Callouts never clip or overlap silently.
- **Placement:**
  - Greedy by priority with SL1, trying leader lengths `[28, 64, 120, 200]` px.
  - Never covers another anchor, a placed label, a protected region or a protected part's projected bounds.
  - Side-stable: an anchor on the left half prefers the left, so a label only changes side when its anchor crosses the center.
- **Text:** wrapped greedily on `Intl.Segmenter` segments with the real font measurer, which is CJK-safe; unbreakable runs break by grapheme. Padding is at least 18 / 8 px. Exceeding the soft line limits reports `text-overflow`, and the text is never truncated. The overlay draws exactly the measured lines, with no `foreignObject` and no reflow.
- **Grouping:** callouts with the same `group` and title collapse into the highest-priority one, which shows a ×N count.
- **Timing:** entrance and exit fades over `fadeFrames` (default 8) inside each window. Pure per frame, in any seek order.

## Limitations

- Placement is per frame (deterministic). Large, fast camera moves can still swap a label's side when its anchor crosses the center. Prefer the locked or slow cameras recommended in [explainer lessons](../15-explainer-lessons.md).
- Leaders are straight. Leader-to-label crossings are not checked.
- Occlusion is a ray test to the anchor point, not a per-pixel visibility estimate. Transparent materials below 50 % opacity do not occlude.
