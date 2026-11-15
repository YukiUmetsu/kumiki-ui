# RIG1 — universal rig for any film look

**Registry pack:** `universal-rig` (depends on `motion-track`, `crayon-storybook`)
**Files:** `registry/rig/rig-spec.ts` (contract + validation), `rig-evaluate.ts` (pure evaluator), `rig-kit.ts` (authoring
builder and shape helpers), `rig-presets-living.ts`, `rig-presets-machines.ts`, `rig-presets-nature.ts` (frog, snake, leaf, petals), `rig-presets-actions.ts` (person actions with props), `rig-flutter.ts` (falling-plate kinematics), `rig-presets.ts` (catalogue and re-exports),
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
  shaded back), optional named `variants` (eyes shut, mouth open, hand pointing). `extrude` makes a part a solid of the
  rig's `depth3d`: when the root yaws, the far side shifts by depth·tan(yaw) and the faces between the near and far outlines
  (hood, windscreen, nose, tail) are painted, shaded by orientation (`faceRole` gives the faces their own material, e.g. a
  dark cabin whose windscreen faces are glass); `far3d` parts (far wheels, the other lamps, far-side
  indicators) are drawn at the far side, under or over those faces.
- **Palette**: role → colour. Painters restyle it.
- **Root keys**: travel through the scene (`x`, `y`, `rotate`, `facing`, depth `scale`, `yaw`). The evaluator derives
  **signed travel** in the figure's own units: moving against an explicit `facing` is reversing (feet step back, wheels roll
  backward), and depth scale and yaw are removed so wheels and feet turn by the distance actually covered.
- **Tracks**: keyed local overrides per bone (added to the rest pose).
- **Drivers** (each with an optional `start`/`end`/`ramp` window):
  | Driver | Use |
  | --- | --- |
  | `gait` | Legs by analytic two-bone IK with real footfall phases. Legs with a `pastern` (hooves, paws) keep the leg above it almost straight through stance — a column on a sinking fetlock, as in Muybridge's gallop plates — fold tightly in swing, then straighten to reach before landing; the hoof (`hoof` bone) stays flat while planted and flips back in swing. Stance feet are locked to the ground; feet with a `toe` roll up onto the planted toe at push-off; swing feet follow a Hermite arc whose end speeds match the stance sweep (no snap at lift-off or touch-down); `curl` folds hooves and paws with the shin; `swingHip` lets the shoulder blade and pelvis follow the leg. Body `bob` (`bobPhase`, `bobHarmonic`), `pitch` and `sink` are locked to the cycle; `swing` moves arms, necks, heads and spines in step. |
  | `reach` | Two-bone IK toward keyed root-space targets or another bone's joint: feet planted on the floor or on pedals, hands on knees, a chin, a handlebar, a phone at the ear. Blends with the FK pose by its window. |
  | `flap` | Side-view wingbeats by projection: the wing plane turns about the body's long axis, so its span foreshortens by sin(elevation) — spread above the back, edge-on, below the belly — never swinging forward. Arm and hand fold back on the upstroke, the hand presses ahead on the downstroke, `tilt` shows the far wing, `heave` lifts the body each stroke, `glide` holds the wings spread. |
  | `wing` | The older in-plane flap (kept for existing rigs). |
  | `suspension` | A damped spring driven by the root's real forward acceleration (convolved over the recent frames, still pure): noses dive under braking and rebound at the stop, cars squat on throttle, riders lurch; `range` limits it one-sidedly (a bicycle lifts its rear wheel but never sinks it). |
  | `flash` | Lights and indicators: bones it lists are off except inside its windows, steady or blinking (`period`, `duty`, `fade`). |
  | `turn` | Flat end-face bones that open by sin(yaw) (kept for simple rigs; solid figures use `extrude` instead). |
  | `chain` | Travelling wave down a bone chain: tails, necks, fish bodies, scarves, flags; follow-through on acceleration; `bias` streams a tail back. |
  | `wheel` | Wheels roll by signed travel / radius (negative radius counter-rotates: pedals kept level); `lock` windows skid. |
  | `crank` | Rods riding crank pins: `coupling` (stays parallel) or `slide` (crosshead/piston on a guide). |
  | `spin`, `oscillate`, `pendulum`, `bank` | Propellers and rotors (`project` spins edge-on blades as cos(angle); `spinUp` and `spinDown` wind them up and down), hull roll and heave, suspension bounce by speed, pendulums, banking along the flight path (`lean` noses a helicopter down with speed). |
  | `clock` | Hour/minute/second hands from clock-time keys; seconds can tick once a second with a settle. |
  | `emitter` | Recycled particles (smoke, fire, tyre smoke) born at a bone and left behind in the world as the root moves. |
  | `variant` | Seeded blinks, keyed drawings, talking mouth on a syllable rhythm. |
  | `serpent` | Lateral undulation: the chain (head first) lies on a sine track fixed to the ground and slides along it as the root travels, so every point of the body passes where the head was, with no sideways slip; the head swings less than the body (`head`). |
  | `drift` | Flat particles (petals, leaves, snow, confetti) released in an area, carried by gusty wind and falling in the flutter or tumble regime of a light plate (`rig-flutter.ts`), recycled after `life` frames. |
- Tracks also take `shear`, so a flat part (a leaf, a petal, a pancake) can be projected tilted in depth with rotate, scale
  and shear. A part's `backColor` shows when its bone is mirrored (the paler underside of a flipped leaf), and `side`
  draws a part only on the front or the back face (veins on top, raised pale veins underneath).
- `shadows` lists bones that cast a soft ground shadow straight below them (a frog in mid-leap, a skittering leaf).
- `inspectRig(input)` returns every problem with its path; painters throw on an invalid rig.

## Presets

Original designs (CC0 dedication), parametric by `size`, `motion`, window, `from`/`to`, ground `y`, `facing` and palette.
`RIG_PRESETS` lists them with their motions, group, default size, natural pace (px per frame), and whether a motion flies
or is staged on screen:

| Subject | Motions |
| --- | --- |
| Person | idle, walk (heel-to-toe, body lowest in double support), run (flight phase), wave, talk, cheer, sit (on a chair, gestures while talking), sit-down and stand-up (hip hinge, feet step, hands to knees), jump (crouch, arm swing, knee tuck, land and absorb), point, think, clap, bow, dance (120 bpm), phone, shoot (draw from the hip, bladed two-hand stance, three shots with muzzle rise, flash and ejected casings, lower to ready), box (guard, jab–jab–cross with the body leaning into the cross, duck), kick (front snap kick: chamber, snap, rechamber), sword (two-handed overhead cut: raise, step in, cut in a few frames with a swoosh, dead stop, zanshin, back to the middle guard), chop (rocking knife at a counter, slices tipping over, guiding knuckles walking along), pan-toss (pan shaken and see-sawed over a gas flame, then a flip: push, jerk back with the lip rising, pancake turning over in the air, steam) |
| Frog | idle (throat pumping, blinks), hop (long leaps: take-off off planted toes, legs trailing in flight, forelegs land first, hind legs fold back), croak (throat sac fills with the mouth shut, flanks squeeze, calls in bouts) |
| Snake | slither (lateral undulation seen from a raised camera, tongue flicks), idle (coiled, neck raised in an S, tongue flicks), strike (cocks, lunges a third of its length in two frames gaping, holds, recoils) |
| Leaf | sway (on a twig, fluttering and flashing undersides in gusts), fall (zigzag flutter with a tumble, settles flat), fall-water (lands on a pond, floats and turns, ripples spread), blow (skitters along the ground in three gusts, flipping end over end) |
| Cherry-blossom petals | blow (a stream of petals on a gusty breeze, tumbling and fluttering), fall (a slow petal rain) |
| Dog, cat | idle, walk (lateral sequence), trot (diagonal with suspension), canter (three-beat), gallop (rotary, spine flexing between extended and gathered suspensions), sit |
| Horse | idle, walk, trot, canter, gallop (transverse, timed from Muybridge's 15-frame stride: hinds land at 0 and .1, fores at .27 and .4, ~30% gathered suspension; straight stance columns on sinking fetlocks, legs folded under in the suspension, reaching straight before landing; pitch, bob and head nod locked to the footfalls; neck lengthening with pace) |
| Songbird | fly (projected wingbeat), glide, perch, hop, peck |
| Butterfly | flutter (wings clap above the back on a wandering path) |
| Koi | swim |
| Dragon | fly (membrane wings on finger spars, projected beat), glide, walk, roar (wings flare, lunge, fire) |
| Modern car | drive, brake, sudden-brake (wheels lock, tyre smoke, driver thrown forward, hazards after), reverse (reverse lamps, driver looks back, wheels roll backward), turn-away and turn-toward (the body turns as a solid: windscreen, nose or tail open between the near and far sides, far wheels and lamps appear; turning away is a left turn signalled by the far-side indicator on the rear corner, turning toward is a right turn on the near side), open-window (glass slides behind the door skin, driver waves), flash-lights, indicate, hazards |
| Vintage car | drive, brake, sudden-brake, reverse, turn-away, turn-toward (solid body) |
| Bicycle | ride (crank geared to the wheels, pedals level, rider's feet and hands by IK), coast (freewheel), stop (brakes to rest, rider puts a foot down), sudden-stop (front brake lifts the rear wheel about the front contact, rider thrown forward) |
| Steam locomotive | run (drivers, coupling/main rods, crosshead, smoke) |
| Propeller plane | fly |
| Helicopter | hover, takeoff (rotor spin-up, lift-off), fly (noses down with speed), land (descend, flare, settle on the skids, rotor winds down and its blur fades) |
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

Gait audit at the time of writing: planted-foot drift 0 px for every quadruped gait and under 0.5 px for people; the
touch-down / lift-off frame skids by a few px at most (the horse walk ~20 px at the audit's 2.5× speed). Reference: Muybridge,
*The Horse in Motion* (1878, public domain), studied frame by frame for the gallop timing and leg shapes.

## Reference study: horse lower leg (fetlock, pastern, hoof)

Sources, all public domain (Muybridge, 1887):
- Plate 563, the "Dusel" walk, studied as the Commons animation [Muybridge horse walking animated.gif](https://commons.wikimedia.org/wiki/File:Muybridge_horse_walking_animated.gif).
- Plate 626, "Annie G." gallop: [Muybridge race horse animated.gif](https://commons.wikimedia.org/wiki/File:Muybridge_race_horse_animated.gif).
- Plate 611, trot: [Animal locomotion. Plate 611](https://commons.wikimedia.org/wiki/File:Animal_locomotion._Plate_611_-_DPLA_-_aeff1b20efcfdc09b5f84345674ae8d1.jpg).

Method: the lower legs were cropped from every frame, enlarged, and compared with rig contact sheets at the same frame count.

Supporting biomechanics:
- The fetlock behaves as an elastic spring and is extended only under load. Slow-motion gallop studies measure about 90° of hoof rotation at break-over.
- Distal joints flex in sequence in swing: knee (carpus), then fetlock, then hoof.

| Observation | Construction rule | Check |
| --- | --- | --- |
| Stance: the pastern slopes 45–60° down and forward from the fetlock to a flat hoof. The fetlock sinks under load but never to the ground. | The pastern angle is solved per frame to keep the leg above at 98.5% of its length, clamped to at least 38° above the ground. | Pastern 43–61° through walk stance; planted drift 0 px. |
| The front wall of the hoof continues the pastern's slope (the hoof–pastern axis). The hoof is about half the fetlock's height, and the pastern is about as long as the hoof is tall. | Hoof drawn with its front wall parallel to the standing pastern. Pastern 9.5u, about 18% of leg height. | Feet close-up sheets. |
| Break-over: the heel lifts and the hoof pivots on the planted toe. The pastern turns with it, and at lift-off hoof and pastern stand in line, sole facing back. | The last 28% of stance rotates hoof and pastern together about the toe, up to 64°. | Test: the hoof passes 40° with its toe on the ground; then lands flat. |
| Swing: the fetlock flexes and the hoof hangs in line with the pastern, sole facing back, never upside down. The leg then straightens and sets the hoof down flat. | Hoof kept in line with the pastern in swing; fetlock curl 44° fore and 26° hind (peak hoof angle about 120°). Landing blends to the loaded, flat pose. | Swing hoof angle 118–126°; landing flat. |

## Reference study: modern car front and wheels

Sources (study only; nothing copied or traced):
- [Honda Civic Hybrid, right front view](https://commons.wikimedia.org/wiki/File:Honda_Civic_Hybrid_(2022,_Europe)_IAA_2023_1X7A0545_(2).jpg), by Alexander-93, CC BY-SA 4.0.
- [VW Golf hatchback, front three-quarter](https://commons.wikimedia.org/wiki/File:2017_Volkswagen_Golf_(5G_MY17)_1.4_SE_TSI_hatchback_(2017-08-30).jpg), by Allie_Caulfield, CC BY 2.0.

The rig's design stays original, with no brand marks.

| Observation | Construction rule |
| --- | --- |
| From three-quarter front, the bonnet top, windscreen and roof read as surfaces, because the camera sits above bonnet height. | `depth3dTilt` (0.22): as the car yaws, the far side also rises by depth·tilt·\|sin yaw\|, so up-facing faces of the extruded shell and cabin show. Cabin faces use glass (`faceRole`). |
| Headlamps wrap both front corners, with a wide dark grille low between them, a plate below, a full-width lower intake and fog-lamp pockets. At the tail: lamps at both corners, a plate and a dark bumper band. | Front and rear face bones are scaled by the `turn` driver and sheared to follow the raised far edge, so the decals sit exactly on the extruded nose and tail. |
| Tyres are cylinders with thick sidewalls (about 35% of tyre radius on a 55-profile tyre). The sidewall flattens where it meets the road, and the rim and spokes are recessed. | A non-rotating tyre with a flat contact patch and a tread band extruded at 22% of car width (`extrudeDepth`). A rim lip and dark dish recess the alloy, which turns inside it. |
| Dark gap under the sill and overhangs; tinted glass with sky reflections. | Underbody shadow strip; darker glass with sheen streaks. |

## Reference study: clapping in profile

Source: Muybridge, *Animal Locomotion*, [Plate 533, "Movement of the hand; clasping hands"](https://commons.wikimedia.org/wiki/File:Animal_locomotion._Plate_533_(Boston_Public_Library).jpg) (1887, public domain). Its top rows show two open hands meeting palm to palm, seen from the side.

| Observation | Construction rule |
| --- | --- |
| Forearms angle up from bent elbows. The open hands rise to chest height with the fingers together, pointing up and forward. | IK reach places the wrists about 14u ahead of the shoulders at chest height. A `flat` hand drawing has the fingers together, separated fingertips, and the thumb along the upper edge. |
| At contact, the back of the near hand covers the far palm and the far fingertips peek past it. | Contact wrist targets sit about 1u apart, the far hand slightly ahead. |
| The clap swings the hands apart across the body, which is invisible in pure profile. | Apart pose cheats depth: the near hand comes toward the camera (scale 1.1, fanned −14°, lifted); the far hand recedes (scale 0.94, +10°). |
| About three claps a second, fast into the hit and slower out, with the body answering each hit. | 10-frame beat: ease-in to contact with a one-frame squash, ease-out apart. The torso, head and pelvis jolt on each contact, the head a frame late. |

## Reference study: frog jump

Source: Li et al., [frame sequence of a *Rana dybowskii* jump](https://commons.wikimedia.org/wiki/File:Frame-Sequence-of-Rana-dybowskii-Jump.jpg) (CC BY 4.0, side and top views). Landing mechanics: Nauwelaerts & Aerts, "Take-off and landing forces in jumping frogs", *J Exp Biol* 209 (2006).

| Observation | Construction rule |
| --- | --- |
| Crouch: the hind leg folds in a Z (thigh forward, shank back, long foot forward under the chest); forelegs prop the chest; the back slopes up to the head with a sacral hump. | Body pitched −22° about the hip; the thigh and shank are solved by IK from the hip to a planted ankle; tarsus and toes lie flat forward. |
| Take-off: the leg straightens until hip, knee, ankle and toes form one line about 30–40° below horizontal; the toes leave last. | The toe tip stays planted while the hip travels to the end of the straight leg; the hip and knee extend first and the foot rolls off its toes late (proximal to distal). |
| Flight: the legs trail straight behind, in line with the body; the forelegs swing from hanging to reaching down and forward. | Leg angles follow the body axis with a decreasing droop; the body follows a parabola timed from the take-off speed. |
| Landing: forelegs fully extended touch first, the body pitched nose-down, the hind legs still high behind; then they fold forward and the frog settles back into the crouch. | Hands are planted at the next crouch's spot by IK; the hind legs pass through a tuck (thighs up and back, feet up) over 12 frames and land in the crouch. |

## Reference study: boxing, shooting, sword and kitchen actions

Boxing source: Muybridge, [Athletes boxing](https://commons.wikimedia.org/wiki/File:Athletes_boxing.gif) (*The Attitudes of Animals in Motion*, public domain), studied frame by frame. Snake strike timing: Penning, Sawvel & Moon, "Debunking the viper's strike", *Biology Letters* (2016), ~70 ms to contact. Pan: Ko & Hu, "The physics of tossing fried rice", *J R Soc Interface* (2020). Falling plates: Belmonte, Eisenberg & Moses (PRL 1998), Pesavento & Wang (PRL 2004, JFM 2005), Auguste, Magnaudet & Fabre (JFM 2013).

| Observation | Construction rule |
| --- | --- |
| Boxers stand wide and staggered, knees bent; the punching arm goes fully straight at shoulder height while the other fist stays at the face; on a straight rear-hand punch the body leans ~20° and the rear leg drives straight. | Guard fists at the jaw and eye line; jabs snap out in 3 frames and back in 5; the cross turns the torso to 20° and slides the pelvis forward over planted feet. |
| A snake strike reaches the target in 50–90 ms with the mouth opening on the way. | Two frames out (30 fps), a three-frame gape hold, an eight-frame recoil into the S. |
| Wok and pan tossing is a double pendulum: the pan slides and see-saws about a radian out of phase, ~2.7 times a second, pivoting on the stove. | Shake cycle of 11 frames with a 1-radian lag between slide and tilt; a flip pushes forward, then jerks back with the far lip rising; the pan dips to catch. |
| Falling plates flutter (level mid-swing, pitched up at the ends of each swing, rising briefly) or tumble (autorotation with sideways drift), with slow precession. | `flutterState` in closed form plus `projectPlate` (camera 29° above): leaves narrow, shear and show their back face as they turn. |

Every prop is a keyed bone and the hands reach for its grip points, so a test can check that no hand leaves the gun, sword, knife or pan.

## Limits

- Side-on 2D rigs: no full turnarounds. Turns in depth extrude the side outline across the figure's width (an
  orthographic solid): good to about ±30° of yaw; beyond that a real 3/4 drawing is needed.
- No mesh deformation (parts are rigid); wings and membranes are planar. Snake bodies are capsule chains, so outlines
  show faint seams in looks that stroke every part.
- Leaves, petals and food turn in depth by projection of a flat plate; they have no thickness or curl.
- Gaits assume flat ground at `ground`; no slopes or stairs. Quadruped legs are two-segment chains with a curling foot.
- Older style-specific character systems (crayon, ink, watercolour, riso characters, the collage puppet) are not
  migrated; RIG1 is the recommended base for new work.
