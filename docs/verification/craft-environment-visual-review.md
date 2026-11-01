# Procedural-environment visual review — repeatable frame receipts

**Status:** capture automation implemented on the feature branch; **no GPU screenshots or human visual approvals are recorded yet**. This is a hands-on review procedure, not a quality certificate or a substitute for an approved hero asset.

## When to run

- After changing `environment-generator.ts`, `streetscape.ts`, scatter, LOD, surface detail, camera framing, or lighting in the environment story.
- Before adopting generated buildings, road, room pockets or trees for a video. Always inspect the actual video aspect ratio and delivery-size image.
- After bumping Three.js or changing the browser/GPU; shading/transparency can change despite identical geometry tests.

## Capture the comparisons

Use a render machine with an installed Chromium and WebGL2 (software GL may show different color/quality than the production GPU):

```bash
npm ci
npx playwright install chromium # once per environment; requires browser download
npm run storybook             # keep running in another terminal (default :6006)
npm run craft:review -- --plan
npm run craft:review
```

For CI or offline development, `npm run craft:review:check` validates the CLI matrix and failure handling without a browser. It is **not** a screenshot or GPU render test.

`--plan` checks and prints the capture matrix **without** opening a browser. Default real capture plans **108 PNGs**:

| Story | Toggle combination | Camera frames | Video aspects |
|---|---|---|---|
| Street Corner | full detail; hard LOD; rooms off; streetscape off; masonry off; window treatments off; rooms + streetscape off | 0 / 58 / 120 | 16:9 / 9:16 |
| Hillside | pine/birch woodland with soft LOD; same woodland with hard LOD | 0 / 58 / 120 | 16:9 / 9:16 |
| Masonry Detail | running bond; flat wall | 0 / 58 / 120 | 16:9 / 9:16 |
| Streetlamp Detail | complete cast-metal construction | 0 / 58 / 120 | 16:9 / 9:16 |
| Window Detail | dressed recessed rooms; bare recessed rooms; dark backing | 0 / 58 / 120 | 16:9 / 9:16 |
| Foliage Detail | oak / birch / pine close orbit, foliage present | 0 / 58 / 120 | 16:9 / 9:16 |

Seed defaults to `21`. The matrix isolates room depth, behind-glass dressings, streetscape geometry and masonry surface finish; the room-and-streetscape-off image supplies a simpler baseline. Close-up stories independently expose their seed and camera frame so identical camera/material comparisons are reproducible. Each frame is the actual Storybook **WebGL canvas**, not a static mockup. The script also visits the last frame and seeks backward to the first, comparing output SHA-256 hashes for the same configuration.

Results are written to a **new timestamped folder** at `dist/craft-environment-review/`:

- `index.html` — contact sheet for visual comparison.
- `manifest.json` — seed, story, variant, frame, aspect, pixel dimensions, SHA-256, frame-seek parity, runtime errors and explicit `approval: "unreviewed"`.
- Individual `.png` canvases — exact pixels inspected. Existing runs are not overwritten.

For a faster focused pass, use e.g.:

```bash
npm run craft:review -- --scenes=street --aspects=portrait --seeds=1,41,99 --frames=0,58,120
```

Accepted flags: `--scenes=street,hillside,masonry,streetlamp,windows,foliage,natural-plants,natural-materials,natural-closeups,material-lab`, `--aspects=landscape,portrait`, `--seeds=1,41,99` (1–99), `--frames=0,58,120` (0–120), `--port=6006`, `--out=dist/craft-environment-review`. Selections must be distinct; plan capped at 120 images. Set `KUMIKI_CHROME_EXECUTABLE` if using a system Chromium instead of the bundled browser. **The script fails clearly** if the browser cannot launch, Storybook is not running, WebGL reports an error, an aspect ratio is wrong, or a reverse seek changes rendered pixels. It deliberately does **not** promote any result to approved.

Optional natural-world captures are separate from the 108-image default plan, so the 120-image safety cap remains meaningful:

```bash
npm run craft:review -- --scenes=natural-plants,natural-materials --aspects=landscape --frames=0,58,120
```

`natural-plants` compares grass, fern and wildflower over identical seeded forest soil; `natural-materials` compares all thirteen material finishes under identical meadow grass. These scenes map to Storybook **3D asset toolkit / Natural Environments**. Inspect curved blade/leaf attachments, fern silhouettes, flower stems, ground contact, map UV seams, wet/dry roughness and repeating patterns. The capture is not a realism certificate.

For tighter construction checks, use **`--scenes=natural-closeups`** (three botanical families) at frames 0/58/120. A centered specimen is guaranteed in the close-up orbit and ground maps use 512×512 textures with a finer world-space repeat. Check panicles, rachises, leaf margins, calyces and pollen details, then compare with the overview to check silhouette and density.

To inspect new materials at close distance, use `npm run craft:review -- --scenes=material-lab --aspects=landscape --frames=0,58,120`. The representative 12-mode matrix includes granite/basalt/sandstone/limestone/river-pebble and sand, three textured glass variants, and rock-chip particle geometry. Glass needs both transmission and the colored background objects to reveal its refraction; grain sizes must remain visible but not overpower the image. Record real GPU review, not just file hashes.

## Human visual gate — inspect the contact sheet at 100% and delivery size

1. **Composition and identity:** 16:9 and 9:16 each keep the building/tree or key feature visibly framed at frames 0, 58, 120; neither is merely a blind crop. Portrait street mode focuses the left-hand façade rather than expecting both buildings to fit the narrow frame; verify that choice in context.
2. **Architecture:** masonry piers and cornices have plausible scale and no missing faces; glass stays on the outside of the rooms; geometry does not interpenetrate when the camera orbits. Compare `detailed` against `no-rooms` specifically for parallax through panes.
   - **Window dressings:** compare `windows/dressed` → `windows/bare` → `windows/backing` at identical seed/frame. Check folds and roller panels stay physically behind glazing, attach to the top of each room, avoid mullions and remain differentiated from furniture. Compare street `detailed` vs `no-treatments` to ensure the detail is useful at the intended output distance and doesn't create busy repeated stripes. Verify any additional transparency sorting or z-fighting under a moving camera.
   - **Masonry finish:** compare street `detailed` against `no-masonry`, then close-up `masonry/bonded` against `masonry/flat` at identical camera/seed. Check half-offset coursing, scale to window bays, full physical joint width (not doubled at cell boundaries), stable corner projection, mortar not becoming stripes at distance, natural narrow seam relief and sensible contrast under moving light. Look for subpixel color shimmer from stone grain too.
3. **Street details:** curbs protrude above asphalt; paint sits on the road; drains align beside rather than across zebra markings; seams do not dominate in medium shots. Two actual shaded streetlamps should be grounded, evenly scaled, face the road and avoid crossings without crowding the trees. Compare `detailed` against `no-streetscape`, then inspect `streetlamp/constructed` at oblique close range for base bolts, arm joins, shade thickness and lens.
4. **Nature:** tree silhouettes look intentional and recognizably distinct; no leaf-or-needle spray clusters resemble floating spheres, obvious repeated stamps or intersecting cards; no trunks float over terrain. The `Foliage Detail` story isolates the three species at close range: check whether oak lobes are legible, birch edges avoid stair-steps, leaves meet their branchlets, bark tint reads as natural variation rather than stripes, and the canopy has plausible light gaps. Use its **Foliage enabled** toggle to inspect the woody skeleton separately. Compare `hard-lod` to `detailed` (street) or `woodland` (hillside) at matching seed/frame/aspect. Scrub the full 0–120 range, including 290px/95px detail boundaries; look for reduced popping **without** alpha-hash stipple, moiré, doubled silhouettes or shadow flicker. Three stills alone cannot determine this.
5. **Shading:** PBR surfaces are neither flat plastic nor noisy; warm/cool material separation persists in both output formats. Glass transparency and reflections look stable when moving.
6. **Motion and determinism:** the orbital move creates meaningful parallax between façades, trees and foreground. Reverse-seek manifest checks pass; scrub the live story to inspect motion, since three still frames **cannot** reveal flicker and pacing.
7. **Performance:** measure real render device frame time, GPU memory and draw-call budgets for candidate production scenes. The capture does **not** measure these. Compare with a feature-disabled baseline before raising detail budgets.

Record reviewers, date, actual screenshot folder, capture device/driver, per-gate pass/fail, and follow-up changes **separately** in the production video's visual acceptance record. Do not silently change `approval` in a generated manifest. Production close-ups, source-accurate streets/buildings and hero-level materials still need reviewed bespoke assets.

## Troubleshooting

- **Chromium missing:** install via `npx playwright install chromium` on an authorized render host. Offline planning still works.
- **WebGL unavailable/context lost:** retry with an enabled local GPU and inspect the Storybook `role=alert` message; software fallback is a diagnostic, not an automatic quality pass.
- **Seek hash fails:** save and compare the two frame captures on the same browser/GPU, inspect live story for nondeterministic effects and rerun. GPU/browser output hashes are not cross-machine proof; only same-run parity is tested.
- **Canvas fails to load:** confirm Storybook port or pass `--port=NNNN`; open `iframe.html?id=craft-procedural-environments--street-corner&viewMode=story` manually.

Related: [procedural environments](../component-specs/craft-procedural-environments.md), [streetscape](../component-specs/craft-streetscape.md), [3D fidelity standard](../14-3d-visual-fidelity.md).
