# RISO2 — Material-native Risograph character rigs

**Registry item:** `riso-character`; dependency `riso-print`.  
**Sources:** `registry/video/riso-character.ts` and `riso-character-react.tsx`.  
**Storybook:** **Video production → Film Looks → Risograph Characters → RISO2 · Animated Character Film**.  
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

**Storybook:** `Video production → Film Looks → Risograph Characters → RISO3 · Rigging Microscope`. The close-up offers Play/Pause, frame seek, FK-vs-IK toggle, diagnostic skeleton and foot targets, printed cadence, plate separation, misregistration and grain. The regular RISO2 film story also exposes IK and rig diagnostics. The rig debug shapes are **off by default** in production/export.

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

**Proof:** Storybook `Video production → Film Looks → Risograph Characters → RISO5 · Opaque Print Proof` stresses both actors against dense crossed printed lines and halftones. It exposes ink isolation, paper-trapping spread, registration, paper grain, background intensity and timeline seeking. Test `riso-opaque-characters.test.tsx` checks full-opacity originals, layer ordering, proof serialization and validation; Playwright verifies the film at 16:9/9:16 plus the dense-background lab, with video frame proof through the existing FilmStage export.

**Further limitations:** The character limbs still use simplified ribbon contours; actual joint mass, fabric folds, constrained shadow lines, secondary acting, intentional plate-scoped distress and variation between physical sheets remain in the craft roadmap. See [printmaking reference audit](../research/risograph-character-opaque-print-craft-2026.md). Crucially, adding more transparent ink texture is not a fix for weak shape design.

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
