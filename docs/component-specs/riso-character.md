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
- The `endRotation` option keeps shoes horizontal, even as the knee bends. This can also preserve the orientation of a grasped prop at a hand end joint.
- Joint hierarchy, target intervals, sorted position keys, overlapping chains, and zero-length bones are validated before evaluation.
- `evaluateRisoCharacter(spec, frame)` returns both the resolved plate parts and optional `joints` / `ik` diagnostic positions. The frame is quantized once to the original print cadence; reduced motion resolves the identical final cel.
- `evaluateRisoCharacter(spec, frame, {disableIK:true})` is available for comparison with plain forward kinematics.

**Storybook:** `Video production → Film Looks → Risograph Characters → RISO3 · Rigging Microscope`. The close-up offers Play/Pause, frame seek, FK-vs-IK toggle, diagnostic skeleton and foot targets, printed cadence, plate separation, misregistration and grain. The regular RISO2 film story also exposes IK and rig diagnostics. The rig debug shapes are **off by default** in production/export.

This is a solid structural rig foundation—not a full animation-authoring package. **Still missing:** joint-bound skin deformation that follows bending shapes, foot shape swaps/heel roll on impact, pelvis counterrotation and center-of-mass constraints, action blending, hand/prop targets, head rotation artwork, perspective turnarounds, collision-aware footfall placement, automatic 3D-to-2D retargeting, and timecoded phonemes. These are prioritized work rather than claims of completion.

### Focused verification

```bash
npm run test -- tests/riso-character.test.tsx tests/riso-rig-ik.test.tsx
node scripts/registry-fixture.js --item=riso-character
npx playwright test -c playwright.storybook.config.ts tests/e2e-storybook/riso-rig-ik.spec.ts
```

The original 16:9 and 9:16 FilmStage fixture remains unchanged; only the authored courier rig and renderer are updated. Production QA must inspect knees, foot contacts, wrists, face, artwork registration and both aspect ratios in an **actual encoded video**; correct joints or green CI alone are insufficient.

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
