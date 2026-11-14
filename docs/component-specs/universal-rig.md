# RIG1 — universal rig for any film look

**Registry pack:** `universal-rig` (depends on `motion-track`, `crayon-storybook`)
**Files:** `registry/rig/rig-spec.ts` (contract + validation), `rig-evaluate.ts` (pure evaluator), `rig-presets.ts` (12 original rigs), `rig-react.tsx` (six painters, `RigScene`, `RigFigure`, `RigLayer`)
**Storybook:** Video production → Film Looks → Universal Rig → **One rig, any film look**, **Rig parade**, **Rigs inside a collage film**
**Status:** implemented; agent review of Chromium captures only — **human normal-speed review not recorded**.

## Idea

A rig says *what moves and how*; a painter says *what it looks like*. The same `RigSpec` is drawn as flat vector,
scissor-cut paper (collage), wax crayon, two-plate riso, ink wash or blueprint, and the same rig can sit inside a COLLAGE1
scene as a `rig` node. Rigs are JSON (no functions), every frame is a pure function of `(spec, frame)`, so any seek order
draws the same pose.

## Contract (`RigSpec`)

- **Bones**: a hierarchy of joints (`x`, `y` in the parent's space, rest `rotate`, `length` along local +y).
- **Parts**: outlines in bone space (`path`, `ellipse`, `rect`, `capsule`, `polygon`) with a **material role** (skin, fur,
  scale, membrane, feather, metal, brass, wood, sail, smoke, light…), a z order, optional `far` (far-side limbs are
  shaded back), optional named `variants` (eyes shut, mouth open).
- **Palette**: role → colour. Painters restyle it.
- **Root keys**: travel through the scene (`x`, `y`, `rotate`, `facing`). Distance and speed drive gaits and wheels.
- **Tracks**: keyed local overrides per bone.
- **Drivers** (each with an optional `start`/`end`/`ramp` window):
  | Driver | Use |
  | --- | --- |
  | `gait` | Legs by analytic two-bone IK. Stance feet are locked to the ground (they do not slide while the body passes), swing feet arc forward; per-leg phase gives walk, trot, gallop, bird hops; `bob` and `swing` (arms, head, neck in step). |
  | `wing` | Flapping with a fast downstroke and a slower recovery, elbow folding on the upstroke. |
  | `chain` | Travelling wave down a bone chain: tails, necks, fish bodies, scarves, flags; follow-through on acceleration. |
  | `wheel` | Wheels roll by distance travelled / radius. |
  | `crank` | Rods riding crank pins: `coupling` (stays parallel) or `slide` (crosshead/piston on a guide). |
  | `spin`, `oscillate`, `pendulum`, `bank` | Propellers, hull roll and heave, suspension bounce by speed, swinging pendulums, banking along the flight path. |
  | `clock` | Hour/minute/second hands from clock-time keys; seconds can tick once a second with a settle. |
  | `emitter` | Recycled particles (smoke puffs, fire tongues) born at a bone and left behind in the world as the root moves. |
  | `variant` | Seeded blinks, keyed drawings, talking mouth on a syllable rhythm. |
- `inspectRig(input)` returns every problem with its path; painters throw on an invalid rig.

## Presets

`personRig`, `quadrupedRig("dog" | "horse" | "cat")`, `birdRig`, `dragonRig`, `fishRig`, `locomotiveRig`, `carRig`,
`planeRig`, `shipRig`, `clockRig` — original designs (CC0 dedication), parametric by `size`, `motion`, window, `from`/`to`,
ground `y`, `facing` and palette. `RIG_PRESETS` lists them with their motions:

| Subject | Motions |
| --- | --- |
| Person | idle, walk, run, wave, talk, cheer |
| Dog, horse, cat | idle, walk (lateral sequence), trot (diagonal), gallop (rotary) |
| Bird | perch, fly, hop |
| Dragon | fly (membrane wings, S-neck, rippling tail), walk, roar (rear back, lunge, jaw, fire) |
| Koi | swim |
| Locomotive | run (drivers, coupling/main rods, crosshead, smoke) |
| Car | drive (wheels, suspension, exhaust) |
| Plane | fly (prop, scarf, banking climb and glide) |
| Ship | sail (roll, heave, breathing sails, pennants) |
| Clock | tick (pendulum, ticking seconds) |

## Painters

`RigScene` draws a board plus figures; `RigFigure` draws one figure inside a scene; `RigLayer` is a self-contained
figure for embedding (COLLAGE1 uses it). Looks: `flat`, `collage` (cut paper, fibre, lift shadows, halftone far side),
`crayon` (reuses `WaxRegion`/`WaxLine`; each held pose redraws the wax), `riso` (warm/cool split to pink and blue
plates, screened tints, misregistration, multiply), `ink` (one continuous wash per figure plus a single dry-brush
silhouette contour), `blueprint` (line work on a grid). Every look can show the bones (`showBones`).

## In COLLAGE1

```ts
{ id: "train", kind: "rig", rig: locomotiveRig({ start: 0, end: 240, from: -800, to: 1800, y: 720 }), look: "collage" }
```

## Checks

```bash
npx vitest run --project unit tests/rig.test.tsx tests/collage.test.tsx tests/collage-photo.test.tsx
node scripts/registry-fixture.js --item=universal-rig
node scripts/registry-fixture.js --item=editorial-collage
```

Tests cover: every preset × motion validates; seek-order purity; a planted foot stays exactly still in world space;
wheels roll by distance and the coupling rod stays level; the seconds hand ticks per second; every look renders; rig
nodes validate and render inside collage scenes.

## Limits

- Side-on 2D rigs: no turnarounds, no foreshortening (the propeller is a squash), no mesh deformation (parts are rigid).
- Gaits assume flat ground at `ground`; no slopes or stairs. Quadruped hind legs use a two-segment chain with a drawn
  hock, not a three-segment leg.
- Older style-specific character systems (crayon, ink, watercolour, riso characters, the collage puppet) are not
  migrated yet; RIG1 is the recommended base for new work.
