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

`--plan` checks and prints the capture matrix **without** opening a browser. Default real capture makes **36 PNGs**:

| Story | Toggle combination | Camera frames | Video aspects |
|---|---|---|---|
| Street Corner | full detail; room pockets off; crafted streetscape off; masonry bond off; rooms + streetscape off | 0 / 58 / 120 | 16:9 / 9:16 |
| Hillside | pine/birch woodland | 0 / 58 / 120 | 16:9 / 9:16 |

Seed defaults to `21`. The matrix isolates room depth, streetscape geometry and masonry surface finish; the room-and-streetscape-off image supplies a simpler baseline. Each frame is the actual Storybook **WebGL canvas**, not a static mockup. The script also visits the last frame and seeks backward to the first, comparing output SHA-256 hashes for the same configuration.

Results are written to a **new timestamped folder** at `dist/craft-environment-review/`:

- `index.html` — contact sheet for visual comparison.
- `manifest.json` — seed, story, variant, frame, aspect, pixel dimensions, SHA-256, frame-seek parity, runtime errors and explicit `approval: "unreviewed"`.
- Individual `.png` canvases — exact pixels inspected. Existing runs are not overwritten.

For a faster focused pass, use e.g.:

```bash
npm run craft:review -- --scenes=street --aspects=portrait --seeds=1,41,99 --frames=0,58,120
```

Accepted flags: `--scenes=street,hillside`, `--aspects=landscape,portrait`, `--seeds=1,41,99` (1–99), `--frames=0,58,120` (0–120), `--port=6006`, `--out=dist/craft-environment-review`. Selections must be distinct; plan capped at 120 images. Set `KUMIKI_CHROME_EXECUTABLE` if using a system Chromium instead of the bundled browser. **The script fails clearly** if the browser cannot launch, Storybook is not running, WebGL reports an error, an aspect ratio is wrong, or a reverse seek changes rendered pixels. It deliberately does **not** promote any result to approved.

## Human visual gate — inspect the contact sheet at 100% and delivery size

1. **Composition and identity:** 16:9 and 9:16 each keep the building/tree or key feature visibly framed at frames 0, 58, 120; neither is merely a blind crop. Portrait street mode focuses the left-hand façade rather than expecting both buildings to fit the narrow frame; verify that choice in context.
2. **Architecture:** masonry piers and cornices have plausible scale and no missing faces; glass stays on the outside of the rooms; geometry does not interpenetrate when the camera orbits. Compare `detailed` against `no-rooms` specifically for parallax through panes.
   - **Masonry finish:** compare `detailed` against `no-masonry` at identical camera/seed. Check half-offset coursing, scale to window bays, stable corner projection, mortar not becoming stripes at distance, natural narrow seam relief and sensible contrast under moving light.
3. **Street details:** curbs protrude above asphalt; paint sits on the road; drains align beside rather than across zebra markings; seams do not dominate in medium shots. Two actual shaded streetlamps should be grounded, evenly scaled, face the road and avoid crossings without crowding the trees. Compare `detailed` against `no-streetscape`.
4. **Nature:** tree silhouettes look intentional and recognizably distinct; no leaf-or-needle spray clusters resemble floating spheres, obvious repeated stamps or intersecting cards; no trunks float over terrain. Check high-contrast edges and shadowing.
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
