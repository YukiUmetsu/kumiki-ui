# RISO2 — Material-native Risograph character rigs

**Registry item:** `riso-character`; dependency `riso-print`.  
**Sources:** `registry/video/riso-character.ts` and `riso-character-react.tsx`.  
**Storybook:** **Video production → Film Looks → Risograph → RISO2 · Animated Character Film**.  
**Production fixture:** `examples/film/riso-character-performance.film.json`.  
**Research evidence:** [Risograph animated film/process references](../research/riso-character-animation-video-study.md).

## Authored character — reusable data model

RISO2 deliberately does not assume a human skeleton. It accepts an arbitrary directed parent/joint tree, independently authored paths attached to any joint, spots/ink palettes assigned to each part, and a single deterministic timeline. A rotating wing, swinging bag, hand, walking foot, and mouth are all just keyed joints and paths.

- **Joint**: `id`, optional `parent`, base `x/y/rotate/scale`, and optional sorted position/rotation/scale offset keys with linear, smooth or held interpolation.
- **Ink part**: `id`, `joint`, `plate`, inert SVG `d`, one of `solid` or `screen`, opacity, and optional expression-specific replacement paths.
- **Expression key**: absolute-frame discrete facial/pose appearance changes (blink, speak, smile, turn). Use separate authored path variants, not an approximation through arbitrary rectangular cropping.
- **Cadence**: 1, 2, 3 or 4 held source frames, then sample absolute frame. This can emulate printed flipbook timing without re-timing the whole film.
- **Validation**: field-path issues for unknown parents/plates, cyclic skeletons, injection in SVG paths, invalid transforms, duplicate identifiers and unsorted keys.

The renderer `RisoCharacterInk` draws **only one declared ink plate**, inside the existing `RisoPrint` artwork callback. Neither character owns paper grain, halftone sampling, registration or its own playback clock. Those are owned by `RisoPrint` and the existing `FilmStage`, so moving the character never rerolls the physical sheet.

### Reusable API

```tsx
<RisoPrint spec={printSpec} frame={3} artworks={{
  blue: ink => <RisoCharacterInk spec={originalActor} frame={shotFrame} plateId="blue"
    paint={ink} x={360} y={340} scale={1.1}/>,
  red: ink => <RisoCharacterInk spec={originalActor} frame={shotFrame} plateId="red"
    paint={ink} x={360} y={340} scale={1.1}/>,
}}/>
```

Use `evaluateRisoCharacter(spec, frame)` to inspect the resolved transform matrix and expression path per part. Result data is independent of playback or prior frames, so scrubbing to 165, then 3, then 165 yields the same drawing.

## RISO3 — articulated limbs, two-bone IK and grounded walk

The original RISO2 actor only rotated each leg as a rigid shape; feet floated or slid and the boot's angle changed with the leg. The RISO3 extension adds a generic, deterministic two-bone rig solver without changing the existing FilmStage or spot-ink contract.

**Optional `spec.ik` constraints:** Each constraint declares a `root → mid → end` direct parent chain (hip → knee → ankle, or shoulder → elbow → wrist), a bend/pole sign (`-1 | 1`), optional `endRotation`, and a target. The target is either ordered keyed stage positions or a looping **walk** with an explicit planted stance and lifted swing.

```ts
const walkingLeg = {
  id: "left-foot-lock", root: "left-leg", mid: "left-knee",
  end: "left-ankle", bend: 1, endRotation: 0,
  target: {
    kind: "walk", startFrame: 0, endFrame: 198,
    initialX: 35, groundY: 0,
    stride: 46, cycleFrames: 66, stanceFrames: 38,
    phaseFrames: 0, lift: 17,
  },
};
```

- Stance phase: the target's **stage-space x/y never changes**, even as the actor's root translates. Reachable targets are solved by the geometric law of cosines, retaining upper and lower bone lengths.
- Swing phase: position eases horizontally to the next contact point while a sine arc raises the foot. The second foot can start half a cycle later.
- End frame: both targets freeze; there is no new integration step or independent clock. Requested targets that are physically unreachable are **clamped** rather than stretching or producing NaNs.
- The `endRotation` option keeps shoes horizontal, even as the knee bends. The optional `footRoll` parameter pitches shoes down during lift and up before the next landing, returning to exactly level during stance.
- **Animated prop followers:** An IK target `{kind:"follow",joint:"satchel",x:7,y:4}` resolves the grip relative to a sibling animated prop joint every film frame; the elbow and wrist can reach for a swinging bag, steering wheel, or other character-attached target. Cycles, unknown joints and invalid grip offsets are rejected. The `satchel-handhold` demonstration uses a 2-bone shoulder→elbow→wrist chain independent of the planted legs.
- Joint hierarchy, target intervals, sorted position keys, overlapping chains, and zero-length bones are validated before evaluation.
- `evaluateRisoCharacter(spec, frame)` returns both the resolved plate parts and optional `joints` / `ik` diagnostic positions. The frame is quantized once to the original print cadence; reduced motion resolves the identical final cel.
- `evaluateRisoCharacter(spec, frame, {disableIK:true})` is available for comparison with plain forward kinematics.

**Storybook:** `Video production → Film Looks → Risograph → RISO3 · Rigging Microscope`. The close-up offers Play/Pause, frame seek, FK-vs-IK toggle, diagnostic skeleton and foot targets, printed cadence, plate separation, misregistration and grain. The regular RISO2 film story also exposes IK and rig diagnostics. The rig debug shapes are **off by default** in production/export.

This is a solid structural rig foundation—not a full animation-authoring package. **Still missing:** joint-bound skin deformation that follows bending shapes, foot shape swaps/heel roll on impact, pelvis counterrotation and center-of-mass constraints, action blending, grasp/release timelines and robust hand pose redraws, head rotation artwork, perspective turnarounds, collision-aware footfall placement, automatic 3D-to-2D retargeting, and timecoded phonemes. These are prioritized work rather than claims of completion.

### Focused verification

```bash
npm run test -- tests/riso-character.test.tsx tests/riso-rig-ik.test.tsx
node scripts/registry-fixture.js --item=riso-character
npx playwright test -c playwright.storybook.config.ts tests/e2e-storybook/riso-rig-ik.spec.ts
```

The original 16:9 and 9:16 FilmStage fixture remains unchanged; only the authored courier rig and renderer are updated. Production QA must inspect knees, foot contacts, wrists, face, artwork registration and both aspect ratios in an **actual encoded video**; correct joints or green CI alone are insufficient.

## RISO4 — deformable ink contours and joint seam continuity

RISO3 planted the courier's feet but still drew every limb as a single rigid SVG shape at its owning joint. In RISO4, an *optional* `skin` object on an ink part draws one rounded, tapered silhouette between its joint and a **direct child**. The contour follows the final evaluated IK/FK world coordinates on **every sampled cel**, without introducing a new timeline or duplicating the Risograph material renderer.

```ts
{
  id: "left-thigh", joint: "left-leg", plate: "blue", paint: "solid",
  // d is a backwards-compatible fallback for FK/raw paint consumers
  d: "M-11 -4 Q1 -12 11 -4 L10 33 Q7 42 -7 43 Z",
  skin: {
    tipJoint: "left-knee", baseWidth: 22, tipWidth: 17,
    overlap: 3.4, bow: -1.1,
  },
}
```

- `baseWidth` and `tipWidth` are **full widths**, not radii. They scale with the evaluated joint transforms. `overlap` extends coverage past the bone endpoints to conceal subpixel cracks. `bow` gently displaces the contour's centerline, useful for sleeve shapes, soft fabric and stylized anatomy.
- Skins render as a closed, cubic SVG silhouette in character-stage coordinates with an identity local transform, rather than double-transforming against the joint. Existing static paths, expressions, boots, hands, props and independent bird wings continue to work unchanged.
- The courier demonstration uses connected, fully opaque blue-plate ink contours for both thighs, shins, upper sleeves and forearms. Each can be toggled **Soft joint contours** on/off in both the FilmStage character Storybook and the magnified rigging microscope.
- The validator rejects nonexistent or nondescendant endpoint joints, nonpositive/nonfinite widths, and unsafe bow/overlap ranges. `tests/riso-joint-skin.test.ts` covers finite folded joints, direct-parent constraints, walking and arm poses, deterministic back-seeks and non-skinned legacy drawings.
- Deforming a tapered contour improves seam continuity but is **not** a substitute for fully hand-redrawn muscle masses, cloth wrinkles, segmented bone topology, elbow volume preservation, occlusion masks or production character design. Human visual review of overlaps, passing limbs, hem silhouette and the 16:9/9:16 film is still required.

## RISO5 — paper-backed opaque characters, trapped silhouettes and new details

**Why:** An ink pass is translucent for genuine Riso overprint, but that must not make characters look like acetate. Previous RISO2–RISO4 artwork applied partial opacity to its primary face, coat, bag and bird shapes and multiplied the entire character over an already printed city, exposing its background through the figure.

**New compositing:** `RisoPrint.foregroundLayers` supports ordered paper knockouts and separate spot-ink foreground passes. Each layer has `id`, `knockout` (optional SVG artwork), and `artworks` with callbacks for every declared plate. Background still prints in declared order. A complete opaque paper silhouette is painted **after all environment spots** and **before** an actor's blue/red ink. The new layer is not a third ink, not postprocessed alpha, and not a second animation clock. Existing RisoPrint users with no foreground layers render identically.

`RisoCharacterKnockout` evaluates the entire actor pose (including bent deforming joint skins, expressions, and full part geometry) with the same sampled frame, same IK controls and same stage placement as `RisoCharacterInk`. Its `spread` (0..8 character-stage units; default 1.8) expands paper clearance slightly to trap inevitable ink-plate misregistration gaps. It inherits the paper fill from `RisoPrint` and never uses authored part opacity.

```tsx
<RisoPrint
  spec={printSpec} frame={3} artworks={cityAndTypeByInk}
  foregroundLayers={[{
    id: "courier",
    knockout: <RisoCharacterKnockout
      spec={courier} frame={frame} x={x} y={y} scale={scale}/>,
    artworks: {
      blue: paint => <RisoCharacterInk spec={courier} frame={frame}
        plateId="blue" paint={paint} x={x} y={y} scale={scale}/>,
      red: paint => <RisoCharacterInk spec={courier} frame={frame}
        plateId="red" paint={paint} x={x} y={y} scale={scale}/>,
    },
  }]}
/>
```

The original courier and bird now use **fully opaque base color masses**. The entire face contour is paper-only (`knockoutOnly: true`); the face is never printed with translucent blue dots. Strong solid facial linework gives expression contrast, while small cheek and pocket accents may use actual halftone dot fills. Additional details include cobalt facial keyline, red boot construction and sole marks, vermilion coat seam/pocket ink, and contrasting satchel hardware.

The foreground API intentionally refuses duplicate IDs, invalid/missing plate callbacks and paper knockouts in `transparentPaper` mode. One-ink isolation still shows the paper-clearance silhouette, and plate registration remains independent.

**Proof:** Storybook `Video production → Film Looks → Risograph → RISO5 · Opaque Print Proof` stresses both actors against dense crossed printed lines and halftones. It exposes ink isolation, paper-trapping spread, registration, paper grain, background intensity and timeline seeking. Test `riso-opaque-characters.test.tsx` checks full-opacity originals, layer ordering, proof serialization and validation; Playwright verifies the film at 16:9/9:16 plus the dense-background lab, with video frame proof through the existing FilmStage export.

**Further limitations:** The character limbs still use simplified ribbon contours; actual joint mass, fabric folds, constrained shadow lines, secondary acting, intentional plate-scoped distress and variation between physical sheets remain in the craft roadmap. See [printmaking reference audit](../research/risograph-character-opaque-print-craft-2026.md). Crucially, adding more transparent ink texture is not a fix for weak shape design.

## RISO7 — Measured source-contour meshes, not rectangular proxies

**Important current implementation:** [30-work visual atlas and geometric critique](../research/riso7-visual-atlas-and-source-contour-mesh.md). Study references are linked, not bundled; do not trace or redistribute published artwork.

RISO6 originally used manual axis-aligned rectangular polygons and an independently calculated four-span limb approximation. These were *guides*, not the actual source shape; their dimensions and triangles were too coarse to support precise eyes, eyebrows, lips, hair, clothing folds or feathers. **RISO7 completely replaces those defaults with original character SVG contour sampling.** The RISO6 section below records the historical motivation and should not be used as the geometry API authority.

### Source geometry pipeline

`registry/video/riso-path-geometry.ts` provides independent, deterministic SVG-path geometry:
- `flattenRisoSvgPath(d, flatness?)`: M/L/H/V/C/S/Q/T/A/Z (relative and absolute), adaptive cubic/quadratic Bezier error control, elliptical arc conversion. Separate contours for disconnected islands, including left/right eyes and two coat buttons.
- `selectRisoSourceContour(d, sourceSubpathIndex?, flatness?)`: exact authored source island, or largest principal silhouette when not specified.
- `triangulateRisoContour(outline)`: ear clipping of a concave/simple closed contour. Triangle edges follow actual sampled source curves rather than spilling across hair/fringe, sleeve folds or wing notches.
- `risoContourSignedArea` and `risoPointInContour`: mathematical geometry inspection and area contracts, not bitmap tests.

`evaluateRisoCharacterMesh(spec, sheet, frame)` first evaluates **the same** `evaluateRisoCharacter` absolute frame as production ink/knockout. The renderer's resolved SVG part `d` and `matrix(...)` are sampled and transformed to stage space. A skin's dynamically painted SVG curve, cap and overlap are measured directly; **there is no duplicate joint ribbon construction**. The part's original rest path gives a canonical (local) `referenceBounds`, normalized to the **actual source-face SVG height H**. The old rectangle vertices in fixtures are removed; `contour?` remains only as optional legacy metadata for external consumers.

Every report supplies original-source `outline`, `triangles`, `sourceContourPoints`, `contourArea`, `triangleArea`, `referenceBounds`, head-normalized dimensions and named source-derived extrema/center landmarks. `sheet.measurements` connects two real feature regions into measured posed-frame `dx`, `dy`, `distance` and `distanceInHeads`.

For the Courier: two eye islands, two eyebrows, nose, mouth, hair, separate cap crown and brim, sleeve/forearm/glove, hips/knees/boots, two buttons, stitching and bag flap all get inspectable source regions. Interocular spacing, brow-to-eye separation, nose-mouth spacing and garment/limb relationships can be compared in actual H. For the Paper Bird: eye-beak, head-body, wing span and tail-body measures follow the original wing and head paths. Unlike RISO6, the selected detail panel **draws the sampled feature** and its interior triangles, not merely a rectangle width/height.

```tsx
const mesh = evaluateRisoCharacterMesh(COURIER, RISO_COURIER_SHEET, 46);
const left = mesh.regions.find(r => r.id === "eye-left");
const right = mesh.regions.find(r => r.id === "eye-right");
const spacing = mesh.measurements.find(m => m.id === "interocular");
// left.outline and right.outline are different source SVG islands.
// spacing.distanceInHeads is from the evaluated, IK-accurate frame.
```

### Explicit geometry limits

- **2D only:** Measurements describe the original ink silhouette. No depth, UVs, weight-stable topology, perspective reconstruction, rear-view or real 3D volume is implied.
- **Simple closed exterior:** Ear clipping handles concavity, but hollow/donut cutouts and multishape boolean unions require a separate winding-rule, hole-aware mesh extension. A multi-subpath region currently selects its specifically authored subpath or the largest principal shape.
- **Source frame sampling:** Adaptive Bezier flattening can return a different number of vertices as a curve deforms. This is suitable for **frame-precise proportion QA**, not yet a persistent vertex-correspondence deformable skin mesh.
- **Print aesthetic separation:** Screens, ink grain, registration/trapping and intentional paper knockouts remain in RisoPrint and are not inserted into the construction mesh. This preserves the solid RISO5 characters.

Validation gates: independent SVG curve/arc/concave-notch tests, real source outlines for every part, distinct eye paths, current-frame IK parity, area conservation, invalid topology/schema guards, and interactive Storybook/sheet proof. Technical design can be further evolved for complex holes and dense feather networks without adding a dependency or reintroducing rectangular proxies.

## RISO6 — Source-faithful character sheets and proportion meshes

A **character sheet is authored per character**, not synthesized from a generic human anatomy template. The production fixtures are:

- **Paper Courier**: `Video production / Film Looks / Risograph Characters / Courier · Construction & Proportion Sheet`.
- **Paper Bird**: `Video production / Film Looks / Risograph Characters / Paper Bird · Construction & Proportion Sheet`.

Both stories use **the original RISO5 actor spec and ink art**, not detached lookalikes. Each prints an exportable SVG with a complete figure, detailed head enlargement, three genuine existing animation poses, named component cages, joint markers and a selected-part measurement panel. The Bird receives a wide-body layout and independently enlarged, IK-pose-accurate left/right wing cages rather than reusing all the tall humanoid white space. The head close-up excludes unrelated sleeves and wings, preventing the face and beak from being hidden. Controls expose the source frame, region selector, category, mesh visibility, labels, skeleton and **Export SVG sheet**.

### Proportion measurement rules

The new reusable `registry/video/riso-proportion-mesh.ts` defines `RisoCharacterMeshSheet` and `RisoMeshRegion`. Each region declares:

- `id`, anatomical/category `label`, owning rig `joint`, and one or more source `parts`.
- A **finite convex construction polygon** in that joint's authored local drawing units.
- Optional `tipJoint` for a connected skin segment. A four-span, eight-triangle ribbon is recomputed from the **actual final IK/FK matrices** of that parent and child on the selected film frame.
- Named local landmarks, transformed to stage coordinates on each sampled cel.

The `headRegion` establishes a **character-specific head-height unit H**, with no generic anatomical ratios imposed. Every part gets local width/height (drawing units), width/H, height/H and an independently evaluated pose-space cage. The Courier's authored head construction height is 89 units; the Paper Bird's is 63. These are **design guides**, not an estimate of centimeters, depth or path-exact pixel bounds. The mesh intentionally does not replace the drawing or alter render poses.

Source-file fixtures are `src/video/riso-character-mesh-sheets.ts`. The Courier covers the separately drawn eyes and eyebrows, nose, mouth, cheek, head silhouette, hair, cap, coat, seams, pocket, buttons, neck, sleeves, forearms, gloves, thighs, shins, boots, satchel and hardware. The Bird covers head, eye/blink, beak, body, feathered wings and tail, and is **not** assigned invented eyebrows, sleeves, arms or legs.

`RisoCharacterModelSheet` in `registry/video/riso-character-sheet-react.tsx` renders the same exact source vectors and the paper-knockout face. The construction mesh uses thin overlay strokes but **does not fade the character** or modify its opaque Risograph spot-ink pass. It exports one SVG that remains crisp when inspected closely.

### Honest source limitations

The original actor assets are primarily one **authored 2D projection** with animated poses. The sheet's three figure views show different animation frames; they are **not front/side/back orthographic views**. Accurate side, back, three-quarter and rear wing constructions **remain unapproved and explicitly marked missing**. Never mirror a flat vector character to claim an authentic back or side turnaround. Before turning either subject into a source-faithful 3D character, draw and approve the missing views independently.

The mesh is an **artist-authored 2D triangle cage**, not a volumetric mesh with real topology, depth, bone weights or hidden anatomy. Its usefulness is consistency checking: eye separation, eyebrow alignment, limb and sleeve dimensions, costume proportion, and frame-to-frame changes without losing the original silhouette.

### Integration and tests

```tsx
const report = evaluateRisoCharacterMesh(COURIER, RISO_COURIER_SHEET, 46);
const mouth = report.regions.find(region => region.id === "mouth");
console.log(report.headUnit, mouth?.widthInHeads, mouth?.triangles.length);

<RisoCharacterModelSheet
  spec={COURIER}
  sheet={RISO_COURIER_SHEET}
  frame={46}
  selectedRegion="eye-left"
  showMesh
  showJoints
/>
```

The inspector rejects missing region IDs, unrecognized source parts/joints, degenerate or unbounded polygons, invalid anchors and nondescendant segment connections. Regression coverage audits **all** authored parts for both characters, checks 8-triangle IK limb deformation, reproducible seeks, proportional metrics and full SVG markup. Browser checks save real sheets, select individual features, toggle mesh visibility and exercise SVG export.

Design reference: Toon Boom's [character sheet production guidance](https://helpcentre.toonboom.com/hc/en-ca/articles/57134612631955-Character-Design-03-Finalizing-the-character-sheets) distinguishes lineup, model turnaround, action poses and expression sheets. The IIT Bombay [animation character model-sheet course](https://www.dsource.in/course/character-design-animation/model-sheet) requires consistent scale and approved views. Here the available authored poses and construction cages are labeled accurately rather than silently promoted to unapproved orthographic art.

## Original film

**Paper Courier** is an original short editorial example, not copied from any published Riso animation. The courier walks into town with separately rotating legs and arms, a swinging satchel, blinking, opening their mouth and smiling; a bird has independent moving wings and tail. Cobalt and vermilion art print as separate physical plates, with a screened backdrop, fixed misregistration, paper grain and 16:9/9:16 layouts.

The three authored FilmStage shots are arrival (0–89), encounter/speaking (90–174), and exit/smile (175–239). The eight-second 30fps film has no local timers in the rendering API. Storybook provides Play/Pause, seek, output ratio, material/ink plate isolation, cadence, registration, grain, seed, and reduced motion.

```bash
npm run test -- tests/riso-character.test.tsx
npm run film:check -- examples/film/riso-character-performance.film.json
npm run film:render -- examples/film/riso-character-performance.film.json --frames=240 --only=landscape --out=dist/riso-character-proof
npm run film:frame -- examples/film/riso-character-performance.film.json --frame=170 --only=portrait --out=dist/riso-character-proof
node scripts/registry-fixture.js --item=riso-character
```

## Quality and roadmap limitations

The initial RISO2 milestone includes hierarchical FK joints, held-frame pose interpolation and explicit expression redrawing. **It is not yet** robust two-bone IK, physics-based cloth, 3D character retargeting, sound-driven visemes, morph topology reconstruction, per-cel analog print-and-rescan or a complete reusable action clip database.

The next priorities are dedicated **authorable actions and constraints** (walk cycles, reaching, grounding feet, interacting with props, reusable action clip blends), paper-stable 2.5D parallax scene layers and camera cues, multi-ink print captures with optional per-sheet registration variance, and frame-cache/profiled production output. These must remain distinct from the existing reusable spot-ink printing primitives.

No external artwork, footage, soundtrack or proprietary font has been bundled or traced. The linked video references were used to derive craft and production concepts, not assets or copied compositions.

**Acceptance:** require clean standalone registry install, TS/unit validation, browser-recorded acting and plate isolation, 16:9/9:16 print composition, deterministic back-seeking, exported playable MP4, and independent senior review. A small example film cannot certify support for every possible video or sophisticated production character animation.

## RISO11 — ArtCraft figure/feather source refinement (2026-11-14)

The example Courier and Paper Bird keep the same version-1 rig, spot plates, paper knockout and film slots. Reference-led drawing has been refined with curved/tapered, source-mapped feather barbs and covert rows; breast and tail engraving; coat fold tension; individual glove/thumb planes and expression-specific mouth corners. Both actor definition files still use opaque ink silhouettes and deterministic frame evaluation.

- **Storybook:** `Video production / Film Looks / Risograph` → `Courier ArtCraft Detail`, `Bird ArtCraft Detail`, character construction sheets, and the native character film. Pose checkpoint buttons expose face, garment and feather stress frames without changing the production frame clock.
- **Reference/structural notes:** [RISO11 ArtCraft feather and tailoring study](../research/riso11-feather-and-tailored-ink-artcraft.md).
- **Regression:** `tests/riso11-ink-craft.test.ts`; existing source-mesh, ArtCraft, opacity and bird wing/face collision tests remain authoritative.

This is a craftsmanship iteration, not a claim that examples are anatomically complete or equivalent to third-party artwork. Final-release artistic acceptance requires actual normal-speed film review, independent human visual judgment and source-relative ArtCraft measurements.


### RISO11 correction — internal face paper clearance

Actual production film frames revealed that an actor-wide paper knockout is **insufficient** when a blue coat or arm exists behind a pale face inside the same actor. The face was drawn as a `knockoutOnly` part, but that flag was previously honored only by the exterior paper silhouette and ignored by `RisoCharacterInk`; as a result, body/strap ink showed through the face.

`RisoCharacterInk` now treats each `knockoutOnly` path as **an internal negative-space mask of earlier ink parts** on each spot plate. Later facial ink is painted normally on the exposed paper. The example Courier orders the entire coat, sleeve, glove, bag and badge behind the face clearance and facial features. Multiple staged masks are supported in paint-order segments; actors without paper-clearance parts do not create masks. This is not low-opacity overpainting or an RGB transparency filter.

Verify `tests/riso-character-paper-clearance.test.tsx`, the browser clearance stress frames (landscape and portrait at 46/157/198), and the encoded production film. Future work: explicit per-part depth/deformation vocabulary for complex occlusions, a production-grade multi-character face-overlap editor, and independent print-artist approval.

## Human-character reference atlas (RISO12)

The curated [Risograph human-character research atlas](../research/riso12-human-character-reference-atlas.md) documents nine verified printed figure studies, source links, facial/hand/garment/pose construction observations, the current Courier gaps, and ordered ArtCraft acceptance gates. It is a **reference study**, not a claim that the current character artwork meets these visual standards. Use it to prioritize face geometry and separately articulated hands before adding more print noise.


## RISO13 — source-built facial anatomy and hand-root articulation

The [RISO13 portrait/hand ArtCraft implementation and review](../research/riso13-human-portrait-and-hand-study.md) adds upper-lid expression planes, nose/philtrum/chin volume and a left ear/hair growth forms to the original Courier, while keeping the 240-frame actor contract. **Eight independent finger-root FK joints** introduce genuine thumb and three independently rotating digits per hand; they inherit the existing satchel-grip IK parent. Source sheets and stress-pose mesh tests cover all new parts.

The existing `Video production / Film Looks / Risograph` Storybook folder now includes a **four-pose human anatomy contact sheet** with interactive spot-plate/dot-density and source-outline controls; diagnostic controls are not physical printer calibration. No external reference artwork or new animation renderer is included.

**Limitations:** first-pass portrait and finger-root articulation are not a full anatomically accurate three-knuckle hand, approved turnaround, complete human ensemble or independent artist approval. Those remain explicit roadmap items.

## RISO14 — two-human original-character print exchange

The [source-anchored two-human study](../research/riso14-human-ensemble-study.md) adds the original **Paper Artist** actor with different source face, hair, red coat and scarf contours, alongside the Courier. Its independently mapped model sheet, rigged digits, original facial expressions, and source-anchored printed-sheet exchange are available in the **same** Storybook Risograph folder.

It reuses the native `RisoPrint` spot-ink renderer and offers portrait/landscape, timeline play/pause, blue/red plate separation, halftone cell, registration and paper grain controls, plus visual contact-anchor diagnostics. All shape/sample evaluation is absolute-frame deterministic; UI playback is only a frame driver.

**Not a final artist-approved film:** side/three-quarter views, full digit knuckle chains, dynamic printed-sheet physics, realistic human contact and calibrated physical Riso color/ink proofing remain open.


## RISO18 — deterministic multi-actor paper ownership

**Reusable source API:** `registry/video/riso-prop-handoff.ts`, authored physical contour in
`registry/video/riso-transfer-sheet.tsx`. See the
[reference-led handoff study](../research/riso18-transfer-ownership-artcraft.md) and
the unchanged Storybook **Video production → Film Looks → Risograph** folder.

The RISO14–17 film used a paper ribbon indefinitely bound between two animated wrist roots, even after the receiving hand should have taken possession. RISO18 separates **actual actor hands** from **material endpoints** and defines four predictable phases: `unfurl`, `shared`, `release`, and `received`. The final paper start/end are receiver-relative, without any dependence on the donor's current coordinates after `releaseEnd`.

```ts
import { evaluateRisoPropHandoff, RISO_HANDOFF_DEFAULTS }
  from "../../registry/video/riso-prop-handoff";
import { evaluateRisoTransferSheet }
  from "../../registry/video/riso-transfer-sheet";

const handoff = evaluateRisoPropHandoff(
  absoluteFrame,
  sourceHandNow, receiverHandNow,
  sourceHandAtReleaseStart, receiverHandAtReleaseStart,
  RISO_HANDOFF_DEFAULTS,
);
const geometry = evaluateRisoTransferSheet(
  handoff.paperStart, handoff.paperEnd, handoff.progress,
  { curl: 3, gripPinch: .5,
    sourceGrip: handoff.sourceGrip, receiverGrip: handoff.receiverGrip },
);
```

**Time and control:** source and receiver hand coordinates are evaluated in one common stage coordinate system from each original `RisoCharacterSpec`; the two *atReleaseStart* reference roots must be sampled at the **absolute release-start frame**, never captured from previous playback state. The schedule defaults to unfold frame 126, contact 160, release start 178, recipient ownership 202 and receiver relative tilt −45°. `unfoldStart < contactFrame < releaseStart < releaseEnd` is validated, as are all anchor coordinates and bounded tilt. Authoring can customize the schedule; source timing is not tied to wall-clock playback.

**Material topology:** `geometry.outline` is used both for the opaque letter knockout and the blue-plate outline. `sourceGrip` and `receiverGrip` independently compress each end's physical edge while preserving the already authored inset, three ruling lines, folds, hatching, red cancellation stamp and spot-ink material. Only original selected **closed finger pads** provide physical front clearances; blue finger engravings are ink, not white-filled masks.

**Studio:** the RISO18 Storybook sample exposes frame, aspect ratio, blue/red plate, ink registration, paper fibres, sheet curl, pinch strength, release frame, transfer duration and final tilt. A compact cue sheet displays current beat, owner and two pressure values. Existing RISO17 double-grip staging is preserved. The result is a mechanically validated demonstration, **not** artist-approved face animation, fully simulated flexible paper, collision forces or a verified feature-length filmmaking system.


## RISO19 — material-local pressure imprints and genuine hand contact

`registry/video/riso-transfer-sheet.tsx` now carries authored **contact crease paths** and **screened paper depression pockets** as first-class evaluated geometry, alongside the original physical letter outline, stamp, inset, fold and fine ruling. The new output keys are:

- `contactCreases: {source: readonly string[], receiver: readonly string[]}` — three independent short, curved quadratic wrinkle lines at each *actively held* paper end.
- `contactShadows: {source: string, receiver: string}` — one closed tapered blue screened compression crescent on each actively held paper end; empty when there is no pressure.
- `imprintDepth?: number` (default `1`, range `0..1`) — explicitly controls strength of contact marks **without changing the underlying printable paper outline**, so comparison/stress checks remain meaningful.
- `sourceGrip?: number`, `receiverGrip?: number` remain the material end-pressure controls from RISO18. The ensemble now attenuates them by the real projected gap `max(0,1-gap/12)` between the advancing/free paper end and the relevant rigged hand. The original unmodified `evaluateRisoPropHandoff` gesture pressure values are still available independently.

```tsx
const paper = evaluateRisoTransferSheet(
  handoff.paperStart, handoff.paperEnd, handoff.progress,
  {curl:3,gripPinch:.5,sourceGrip:contactSource,
   receiverGrip:contactRecipient,imprintDepth:.75},
);
<RisoTransferSheetPlate
  outline={paper.outline} geometry={paper} plateId="blue"
  paint={paint} detail={true}
/>
```

`RisoTransferSheetPlate` draws local pressure lines and the two tiny compression pockets **only on the blue press master**; red stamp/hatching remain independent and paper still uses one opaque knockout. `detail=false` and `imprintDepth=0` both yield a simple material-negative control. All crease points use the same rotated, bowed material coordinate transform as the paper sheet, not screen-relative paths or postprocessed gradients. The existing Risograph Storybook folder includes a `Pressed paper creases` slider and two-aspect source/receiving/released frame tests.

[ArtCraft reference and negative controls](../research/riso19-contact-pressure-artcraft.md) document shape topology, localized tangent flow, pressure metrics, real print references, and the *unverified* browser/normal-speed film and pixel-comparison release gates. This is deterministic illustrated paper pressure, **not** physically simulated force feedback or approved artistic likeness.
