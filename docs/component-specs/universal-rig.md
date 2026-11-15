# RIG1 — universal rig for any film look

**Registry pack:** `universal-rig` (depends on `motion-track`, `crayon-storybook`)
**Files:** `registry/rig/rig-spec.ts` (contract + validation), `rig-evaluate.ts` (pure evaluator), `rig-kit.ts` (authoring
builder and shape helpers), `rig-presets-living.ts`, `rig-presets-machines.ts`, `rig-presets.ts` (catalogue and re-exports),
`rig-react.tsx` (six painters, `RigScene`, `RigFigure`, `RigLayer`, `followCamera`)
**Storybook:** Video production → Film Looks → Universal Rig → **One rig, any film look**, **Action sheet**, **Rig parade**,
**Rigs inside a collage film**
**Status:** implemented; agent review of Chromium contact sheets (frame-by-frame) only — **human normal-speed review not recorded**.

## Idea

A rig says *what moves and how*; a painter says *what it looks like*. The same `RigSpec` is drawn as flat vector,
scissor-cut paper (collage), wax crayon, two-plate riso, ink wash or blueprint, and the same rig can sit inside a COLLAGE1
scene as a `rig` node. Rigs are JSON (no functions), every frame is a pure function of `(spec, frame)`, so any seek order
draws the same pose.

## Contract (`RigSpec`)

- **Bones**: a hierarchy of joints (`x`, `y` in the parent's space, rest `rotate`, `length` along local +y).
- **Parts**: outlines in bone space (`path`, `ellipse`, `rect`, `capsule`, `polygon`) with a **material role** (skin, fur,
  scale, membrane, feather, metal, brass, wood, sail, smoke, light…), a z order, optional `far` (far-side limbs are
  shaded back), optional named `variants` (eyes shut, mouth open, hand pointing).
- **Palette**: role → colour. Painters restyle it.
- **Root keys**: travel through the scene (`x`, `y`, `rotate`, `facing`, depth `scale`, `yaw`). The evaluator derives
  **signed travel** in the figure's own units: moving against an explicit `facing` is reversing (feet step back, wheels roll
  backward), and depth scale and yaw are removed so wheels and feet turn by the distance actually covered.
- **Tracks**: keyed local overrides per bone (added to the rest pose).
- **Drivers** (each with an optional `start`/`end`/`ramp` window):
  | Driver | Use |
  | --- | --- |
  | `gait` | Legs by analytic two-bone IK with real footfall phases. Stance feet are locked to the ground; feet with a `toe` roll up onto the planted toe at push-off; swing feet follow a Hermite arc whose end speeds match the stance sweep (no snap at lift-off or touch-down); `curl` folds hooves and paws with the shin; `swingHip` lets the shoulder blade and pelvis follow the leg. Body `bob` (`bobPhase`, `bobHarmonic`), `pitch` and `sink` are locked to the cycle; `swing` moves arms, necks, heads and spines in step. |
  | `reach` | Two-bone IK toward keyed root-space targets or another bone's joint: feet planted on the floor or on pedals, hands on knees, a chin, a handlebar, a phone at the ear. Blends with the FK pose by its window. |
  | `flap` | Side-view wingbeats by projection: the wing plane turns about the body's long axis, so its span foreshortens by sin(elevation) — spread above the back, edge-on, below the belly — never swinging forward. Arm and hand fold back on the upstroke, the hand presses ahead on the downstroke, `tilt` shows the far wing, `heave` lifts the body each stroke, `glide` holds the wings spread. |
  | `wing` | The older in-plane flap (kept for existing rigs). |
  | `suspension` | A damped spring driven by the root's real forward acceleration (convolved over the recent frames, still pure): noses dive under braking and rebound at the stop, cars squat on throttle, riders lurch. |
  | `flash` | Lights and indicators: bones it lists are off except inside its windows, steady or blinking (`period`, `duty`, `fade`). |
  | `turn` | Turning in depth: the root foreshortens the side by cos(yaw); listed rear or front face bones open by sin(yaw). |
  | `chain` | Travelling wave down a bone chain: tails, necks, fish bodies, scarves, flags; follow-through on acceleration; `bias` streams a tail back. |
  | `wheel` | Wheels roll by signed travel / radius (negative radius counter-rotates: pedals kept level); `lock` windows skid. |
  | `crank` | Rods riding crank pins: `coupling` (stays parallel) or `slide` (crosshead/piston on a guide). |
  | `spin`, `oscillate`, `pendulum`, `bank` | Propellers and rotors (`project` spins edge-on blades as cos(angle)), hull roll and heave, suspension bounce by speed, pendulums, banking along the flight path (`lean` noses a helicopter down with speed). |
  | `clock` | Hour/minute/second hands from clock-time keys; seconds can tick once a second with a settle. |
  | `emitter` | Recycled particles (smoke, fire, tyre smoke) born at a bone and left behind in the world as the root moves. |
  | `variant` | Seeded blinks, keyed drawings, talking mouth on a syllable rhythm. |
- `inspectRig(input)` returns every problem with its path; painters throw on an invalid rig.

## Presets

Original designs (CC0 dedication), parametric by `size`, `motion`, window, `from`/`to`, ground `y`, `facing` and palette.
`RIG_PRESETS` lists them with their motions, group, default size, natural pace (px per frame), and whether a motion flies
or is staged on screen:

| Subject | Motions |
| --- | --- |
| Person | idle, walk (heel-to-toe, body lowest in double support), run (flight phase), wave, talk, cheer, sit (on a chair, gestures while talking), sit-down and stand-up (hip hinge, feet step, hands to knees), jump (crouch, arm swing, knee tuck, land and absorb), point, think, clap, bow, dance (120 bpm), phone |
| Dog, cat | idle, walk (lateral sequence), trot (diagonal with suspension), canter (three-beat), gallop (rotary, spine flexing between extended and gathered suspensions), sit |
| Horse | idle, walk, trot, canter, gallop (transverse: LH, RH, LF, RF, gathered suspension; pitch, bob and head nod locked to the footfalls; knees forward, hocks back; tail streaming with pace) |
| Songbird | fly (projected wingbeat), glide, perch, hop, peck |
| Butterfly | flutter (wings clap above the back on a wandering path) |
| Koi | swim |
| Dragon | fly (membrane wings on finger spars, projected beat), glide, walk, roar (wings flare, lunge, fire) |
| Modern car | drive, brake, sudden-brake (wheels lock, tyre smoke, driver thrown forward, hazards after), reverse (reverse lamps, driver looks back, wheels roll backward), turn-away and turn-toward (indicator, yaw, shrink into or grow out of the distance, end face opens), open-window (glass slides behind the door skin, driver waves), flash-lights, indicate, hazards |
| Vintage car | drive, brake, sudden-brake, reverse, turn-away, turn-toward |
| Bicycle | ride (crank geared to the wheels, pedals level, rider's feet and hands by IK), coast (freewheel) |
| Steam locomotive | run (drivers, coupling/main rods, crosshead, smoke) |
| Propeller plane | fly |
| Helicopter | hover, takeoff (rotor spin-up, lift-off), fly (noses down with speed) |
| Hot-air balloon | float, burn (burner bursts, basket swing) |
| Sailing ship | sail |
| Pendulum clock | tick |

## Painters and camera

`RigScene` draws a backdrop plus figures; `RigFigure` draws one figure inside a scene; `RigLayer` is a self-contained
figure for embedding (COLLAGE1 uses it). Looks: `flat`, `collage`, `crayon`, `riso`, `ink`, `blueprint`. **Every look animates
on ones by default**; pass `cadence={2}` for a stop-motion feel. A medium's texture `boil` is separate from the motion
cadence (crayon wax redraws every four frames even on ones). `camera={{ x, y, zoom }}` frames any world point;
`followCamera(spec, frame, { y, lead })` tracks a travelling rig. The ground band and its marks are anchored to the world in
tiles, so they scroll under a tracking camera and show the true speed of a gait. Every look can show the bones.

## In COLLAGE1

```ts
{ id: "train", kind: "rig", rig: locomotiveRig({ start: 0, end: 240, from: -800, to: 1800, y: 720 }), look: "collage" }
```

## Checks

```bash
npx vitest run --project unit tests/rig.test.tsx tests/collage.test.tsx tests/collage-photo.test.tsx
npx jiti scripts/rig-validate-all.ts          # every preset × motion validates and evaluates (any window length: pass frames)
npx jiti scripts/rig-gait-audit.ts            # planted-foot slide, IK over-reach and hover per legged motion
node scripts/registry-fixture.js --item=universal-rig
node scripts/registry-fixture.js --item=editorial-collage
```

`scripts/rig-contact-sheet.ts` (bundle with esbuild, run with node) renders consecutive frames side by side for
frame-by-frame review (`--follow` tracks, `--zoom` frames the subject, `--big` enlarges cells).

Tests cover: every preset × motion validates; seek-order purity; a planted foot stays still in world space; gallop knee and
hock directions and the transverse landing order; projected wings reach above and below the body and never far ahead of
the shoulder; braking dives then rebounds; reversing rolls wheels backward with reverse lamps lit only while reversing; a
turn away shrinks, yaws and opens the rear face; a seated person has the pelvis on the chair and feet planted; wheels and
crank linkages; clock and pendulum; every look renders; the camera transforms the world; rig nodes inside collage scenes.

Gait audit at the time of writing: every walk, trot, canter and gallop plants without IK clamping (worst stance-foot drift
under 1 px, from the toe roll's first frames).

## Limits

- Side-on 2D rigs: no full turnarounds. Turns in depth foreshorten the side and open a flat end face (tail panel or
  nose); sloping hatches and windscreens are not reprojected.
- No mesh deformation (parts are rigid); wings and membranes are planar.
- Gaits assume flat ground at `ground`; no slopes or stairs. Quadruped legs are two-segment chains with a curling foot.
- Older style-specific character systems (crayon, ink, watercolour, riso characters, the collage puppet) are not
  migrated; RIG1 is the recommended base for new work.
