# Visual production contract — deterministic, token-free quality safeguards

**Implemented first pass:** `registry/visual/` (optional). Reuses CC1 camera projection, MD1 event schedule, MG1 absolute-frame sampling and the existing media text segmentation. No screenshot recognition, AI image review or new animation runtime. This contract **prevents measurable mistakes**; it does **not** prove aesthetics, teaching quality or realism.

| Rule | API | Deterministic outcome |
|---|---|---|
| Real connections only | `createSemanticScene(assets).connect({from,to,id})` | Named ports required; world pose applied; incompatible or radio-as-copper links rejected. |
| No essential text over hero | `placeProtectedText(spec, measureText)` | Tries safe spaces with exact injected font metrics; returns `layout-impossible` rather than silently truncating. |
| Critical subject stays framed | `inspectCriticalCameraFrames(plan,targets,rules)` | CC1 projection checks critical subject bounds at authored frames and shot edges; actionable violations. |
| Frame named objects without guessing XYZ | `focusOnSemanticTargets(...)` | Reuses CC1's existing bounded fitting solver for multi-subject composition. |
| Camera starts before subject departs | `deriveSemanticTrackingWindow(registry, {movingId,fromId,toId,...})` | Calculates actual arrival from absolute-frame target samples with look-ahead and tail; no independently guessed camera timings. |
| Events coordinate actions | `relativeToEvent`, `deriveEventWindow`, `cameraShotBetweenEvents` | Uses MD1's compiled event schedule to derive CC1 window; no parallel frame clock. |
| Story has an ending | `validateVisualProduction(contract)` | Rejects gaps, missing actions/subjects, undefined learning outcomes and incomplete recap references. |

**Use only declared constraints.** Code cannot infer whether a box is a Send button, what a wire should attach to, whether a claimed fact is correct, or whether a model is visually premium. Authors must supply semantic parts/critical subjects and honest fidelity metadata; `inspectCraft()` is a **warning** about missing metadata, never certification.

## Minimal examples

```ts
import {
  createSemanticScene, placeProtectedText, deriveSemanticTrackingWindow,
  focusOnSemanticTargets, inspectCriticalCameraFrames,
} from "../registry/visual";

// Declare physical sockets inside reusable asset constructors, then connect.
const scene = createSemanticScene(assets); // each asset owns named ports and world transforms
scene.connect({ id: "patch-1", from: "router.lan1", to: "server.nic1" });

// Font measurement is injected from the actual loaded renderer font.
const caption = placeProtectedText({
  id: "routing-caption", text: "The router checks the IP destination.",
  font: "500 24px system-ui", fontSizePx: 24, lineHeightPx: 30,
  viewport: { width: 1600, height: 900 },
  protectedRegions: [projectedRouterBounds, projectedPacketBounds],
  maxLines: 2,
}, measureText);
if (!caption.ok) throw Error(caption.diagnostics[0].message);

// Link CC1 planning to the same moving target registry as MG1 choreography.
const window = deriveSemanticTrackingWindow(targetRegistry, {
  movingId: "signal", fromId: "router-b", toId: "router-c",
  searchStart: 1300, searchEnd: 1650, proximity: 0.35, leadFrames: 12,
});
if (!window.ok) throw Error(window.reason);
// Use window.startFrame/endFrame for the standard CC1 shot authoring.

// Only critical subjects/intervals require hard visibility guards.
const check = inspectCriticalCameraFrames(cameraPlan, targetRegistry, [{
  id: "send-button-visible", targetIds: ["send-button", "message-composer"],
  startFrame: 80, endFrame: 120, strideFrames: 1,
}]);
if (!check.ok) throw Error(check.failures[0].message);
```

## Design constraints / honest limitations

- **Author at the highest meaningful level.** Register reusable device ports and semantic camera subjects once. Never fabricate physical connections from mesh centers.
- **Zero-token compile checks.** Run the guard once during authoring/test/CI. Static port and narrative validation are O(assets + connections). Text layout uses font metrics and a few fixed candidate regions. CC1 guards sample only declared frames; choose `strideFrames:1` for strict animated segments.
- **Visibility is geometric, not image recognition.** Projected bounding boxes are conservative and don't detect texture defects, glass quality, visual clutter behind a subject or occlusion unless separately modeled. Sparse samples do not mathematically guarantee unsampled frames.
- **Text measurement fidelity matters.** Use actual loaded font metrics. Without a measurer, fail rather than claiming that invisible text fits. Text must be rendered into the returned reserved rectangle; avoid ungoverned overlays.
- **Event windows are derived, not continuously live-bound.** If choreography moves, recompile the event schedule, derived CC1 window and resulting camera plan.
- **Artistic craft remains an authoring obligation.** Use [14 — 3D fidelity](14-3d-visual-fidelity.md) for meaningful geometry/material detail. Avoid enforcing arbitrary screw/poly counts.
- **Incremental adoption.** Existing consumers are unchanged; `registry/visual` is opt-in. Network Journey's port-to-port cabling and narrative preflight currently exercise this API. Camera/text guards are available for adoption in each new authored shot.
- **CI:** `npm run typecheck` and `npx vitest run tests/visual-constraints.test.ts tests/visual-production.test.ts tests/network-journey-hardware.test.ts`. No browser or GPU required. Capture screenshots only for the much smaller final subjective review; never claim visual acceptance from these tests alone.

**Not yet implemented:** automatic subject-region collection from arbitrary React DOM, continuously adaptive camera retiming, sophisticated routing around geometry, prebuilt photorealistic asset library, or automatic artistic evaluation. Implement these when usage demonstrates need; do not imply they already exist.
