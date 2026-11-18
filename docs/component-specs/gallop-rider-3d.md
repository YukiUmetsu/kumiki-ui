# Horse and Rider Gallop 3D (`gallop-rider-3d`)

**Scope:** an interactive Three.js scene of a cowboy on a horse at a gallop across open range. Each part is a reusable module: the horse, the tack, the rider coupling, contact markers, footfall audio, dust, the camera and the terrain. The horse and the tack are original Kumiki assets. The rider is a Microsoft Rocketbox avatar (MIT).

**Status:** WIP, not visually accepted (see [3D visual fidelity](../14-3d-visual-fidelity.md)). The owner has not done a human visual review. The horse is a code-sculpted original, not a photogrammetry scan.

## Install and inspect

- Registry item: `gallop-rider-3d`. It depends on `crafted-3d-hero`, `domain-finance-hero-3d` (auto-rig) and `terrain` (GEO1).
- Storybook: **Video production → Art Foundations → Animal Anatomy → Horse and rider gallop (3D)**. The story has these controls:
  - Coat (25 presets) and size (Small, Medium, Large and a withers-height slider, 1.30–1.80 m).
  - "Saddle & bridle" and "Rider" switches.
  - Camera buttons (Chase, Tracking, Front, Hooves) and a free view. Drag or use the arrow keys to turn the camera round the horse. Use the wheel, a pinch or + and − to zoom. A double-click, 0 or "Reset view" returns to the framing.
  - A speed slider, "Stop" (the horse pulls up and stands) or "Gallop", "Pause" (the world stops and the camera still moves) and sound.
  - A quality readout.
- Catalog: `npm run catalog:find -- --query="galloping horse"`.
- Assets that you host:
  - `assets/models/animals/stock-horse-bay.glb`: the horse, with the clips `gallop` and `stand`. Gait data is in the root node extras as `kumikiGait`. The coat masks (`_kmcoata`, `_kmcoatb`, `_kmcoatc`) and the hair roots (`_hairroot`) let `horse-coat` recolour any coat at run time.
  - `assets/models/animals/western-gear.glb`: the groups `tack@trunk` and `tack@head`, the sockets, and `cowboy-hat`.
  - `assets/models/people/rocketbox-male-adult-08.glb` and `LICENSE-Microsoft-Rocketbox.txt`.
  - `assets/sound/recorded/hoof-dirt-1…8.wav`, `hoof-dirt-scuff-1.wav`, `horse-breath-1…2.wav` (CC0, see `assets/sound/catalog.json`).
- Rebuild the GLBs after you change the horse or tack code:

~~~bash
node scripts/horse-glb.mjs                 # assets/models/animals/stock-horse-bay.glb
node scripts/horse-glb.mjs --coat=grey     # another painted fallback coat (in the scene, use setCoat)
node scripts/horse-glb.mjs --part=gear     # assets/models/animals/western-gear.glb
~~~

## Minimal usage

~~~tsx
<GallopScene3D horseUrl={horse} gearUrl={gear} riderUrl={rider} sounds={{ hoof: hoofUrls, scuff: [scuffUrl], breath: breathUrls }} />
~~~

~~~ts
const scene = await GallopScene.create({ canvas, horseUrl, gearUrl, riderUrl, sounds });
scene.start();                  // or step(dt) / update(dt) + render() for frame-accurate capture
scene.setSpeed(14);             // m/s, clamped to 8.5–15.5
scene.setFraming("tracking");   // "chase" | "tracking" | "front" | "hoof"
scene.orbit(.4, .1);            // turn the framing round the horse (radians); zoom(.8); resetView()
scene.setCoat("blue-roan");     // a HORSE_COAT_PRESETS id or a full HorseCoatSpec
scene.setSize("large");         // "small" | "medium" | "large" or a withers height in metres
scene.setRunning(false);        // pull up and stand; setRunning(true) to gallop again
scene.setPaused(true);          // freeze the world; the camera still moves
scene.setTackVisible(false);    // saddle, bridle and reins off (the rider goes too)
scene.setRiderVisible(false);   // rider off; the reins are tied at the horn
await scene.setAudio(true);     // call from a user gesture
scene.stats();                  // fps, draws, triangles, stirrup, leg and hoof errors, audio sync
~~~

## Modules

| File | What it does |
|---|---|
| `registry/craft/horse-3d.ts` | `createStockHorse(options)`: the sculpted, skinned horse as a `HeroAsset`. It has a lofted torso, neck and head, muscle masses, veins, cupped ears, lids, lashes, whiskers, shod hooves and strand-card hair. The painted coat (six `HORSE_COATS`) is a fallback for other glTF viewers. The coat masks and hair roots are baked for `horse-coat`. Hair cards carry shading normals shared by both faces, so a lock shades like a soft cylinder. |
| `registry/craft/horse-coat.ts` | `HORSE_COAT_PRESETS` (25 coats with the photograph each was read from), `HorseCoatSpec` (base colours, points, dun marks, roan, grey and dapples, sooty, white patterns, leopard spotting, face and leg markings, sweat) and `applyHorseCoat(root, spec)`. It returns a handle whose `set(spec)` changes the coat live (uniforms only). `HORSE_SIZES` and `horseSize()` give the size presets, the height range, the width scale and the head scale. |
| `registry/craft/horse-gallop.ts` | `HORSE_SKELETON` and `poseHorseGallop(rig, t)`: the gallop solver on the real limb segments. The femur carries the thigh muscles and the tibia the gaskin (extra weight segments), so the hindquarter swings with the leg. The tail has three dock bones and a five-bone hair chain (`HORSE_TAIL_HAIR`). `HORSE_GALLOP_DEFAULTS` holds the timing. `horseGallopSpeed()` gives the ground speed for a playback rate. |
| `registry/craft/western-tack.ts` | `createWesternTack()`, `attachTack(horse, tack)` and `createCowboyHat()`. Pad, skirts and straps are shells of the horse body, so they fit it. |
| `registry/craft/mounted-rider.ts` | `MountedRider`: seat spring with absorption, two-bone IK for boots in the stirrups and fists on the reins, head stabilization. With a `LateralHull` (the mount's lateral extent, measured from its meshes), each knee swings until thigh and calf lie outside the barrel and tack. Each elbow swings until the arm lies outside the torso (an elliptic cylinder, narrower at the waist). Limbs start each frame from the bind pose, and the IK runs twice, so it is exact and never accumulates twist. `solveTwoBoneIK` works for any bone axes. |
| `registry/craft/verlet-cloth.ts` | `VerletRope`, `RopeMesh`, `VerletCloth` and `SpringBoneChain`: fixed-step secondary motion for reins, the neckerchief and the tail hair. The chain follows the animated pose softly, under gravity, air drag (in the carrier's frame) and the wake's turbulence, with sphere colliders and a bend limit. |
| `registry/craft/auto-rig.ts` | Gives `RigBoneSpec.influences`: extra segments that count as a bone for skin weights. |
| `registry/craft/gait-contacts.ts` | `measureGaitContacts(root, clip, limbs)` samples any looping clip at 1 kHz and returns land and lift markers. `forEachCrossed` visits the markers between two clip times. |
| `registry/video/footfall-audio.ts` | `createFootfallAudio({ bank })`: decoded buffers, a voice pool, hits on the AudioContext clock, take rotation, an air-rush bed. `footfallDynamics(speed)` gives gain and rate. |
| `registry/craft/impact-dust.ts` | `ImpactDust`: pooled, GPU-driven dust puffs and dirt clods. `emit()` writes a few instances into ring buffers. |
| `registry/motion/chase-camera-three.ts` | `ChaseCamera` and `CHASE_FRAMINGS`: critically damped springs, FOV punch, drift and trauma shake. `orbit`, `zoom` and `resetView` turn a framing round its look point. `subjectScale` scales the framings for a bigger or smaller subject. |
| `registry/craft/trail-terrain.ts` | `createTrailTerrain()`: a closed trail loop, graded ground with a surface shader, GEO1 landforms on the horizon, and sage, grass and rocks. `groundHeight(x, z)` matches the drawn mesh. |
| `registry/video/gallop-scene-3d.ts`, `-react.tsx` | `GallopScene` and `<GallopScene3D>`: the assembly, with the controls above and a quality readout. The rider's legs press the hanging fenders and skirts in toward the barrel, up to 4.5 cm, in their vertex shader. On a size change the stirrup leathers are fitted again (0–12 cm shorter). |

## Research (phase 1)

| Topic | Finding | Source |
|---|---|---|
| Footfall order and timing | Plate 626, read frame by frame (15 intervals each stride): trailing hind lands first, leading hind about 0.07 later, trailing fore about 0.23, leading fore about 0.40. Each hoof is down for about 0.3 of the stride. The suspension is gathered, with the legs folded under the body. | Muybridge, *Animal Locomotion* plate 626, NGA 136536 (CC0); "The Horse in Motion", 1878 (public domain) |
| Stride frequency and duty factor | Gallop at 10–15 m/s: 2.16–3.04 strides/s, 4.4–5.6 m. Thoroughbreds at race starts: 2.47 strides/s, stance 72% and suspension 28% of a stride. Hind duty factor: 0.30 at a canter to 0.20 at a fast gallop. | [Illinois kinematic study](https://ideals.illinois.edu/items/70192); [Thoroughbred stride timing](https://madbarn.com/research/multivariate-statistical-analysis-of-stride-timing-measurements-of-nonfatigued-racing-thoroughbreds); [Leach et al. 1984](https://www.originalwisdom.com/wp-content/uploads/bsk-pdf-manager/2019/04/Leach-et-al_1984_Standardised-terminology-for-the-description-and-analysis-of-equine-locomotion.pdf) |
| Rider coupling | A crouched rider does not follow the horse's bounce. The legs and hips isolate the rider, which lowers the horse's cost. A seated, straight-legged rider cannot isolate. | Pfau et al. 2009, *Science* 325:289 ([summary](https://madbarn.com/research/modern-riding-style-improves-horse-racing-times)) |
| Hoof and ground | On dirt the heel slides forward a few centimetres at touchdown in a gallop. | Symons et al. 2014, [summary](https://madbarn.com/research/distal-hindlimb-kinematics-of-galloping-thoroughbred-racehorses-on-dirt-and-synthetic-racetrack-surfaces) |
| Camera | Film practice for horses at speed: "low and long" (camera low, long lens), camera cars that run parallel, chase from behind. Game practice: a spring arm with lag, an FOV kick when the speed goes up, trauma shake (trauma² × smooth noise). | [No Film School](https://nofilmschool.com/tricks-to-film-horse-stunts); Eiserloh, "Juicing Your Cameras With Math", GDC 2016; [Unreal: third person camera](https://www.unrealengine.com/tech-blog/six-ingredients-for-a-dynamic-third-person-camera) |
| Western saddle | Horn on the swell (fork), seat, cantle, skirts, fenders that hold the stirrups, rigging dees, latigo and cinch, breast collar. | [Cowboy Way: saddle parts](https://cowboyway.com/What/SaddleParts.htm); [Equine Helper](https://equinehelper.com/western-saddle-parts/) |
| Conformation and head | Landmarks measured on a side photograph of a standing Quarter Horse. The withers height is 1.52 m and the body length is equal to it. The chest depth is 0.47 of the withers height. The knee is at 0.40 m and the hock at 0.49 m. The head depth comes from a profile photograph. | Commons "Quarter Horse(REFON)-cleaned.jpg" (CC BY 2.5); "Head of Orlov Trotter horse turned right 2026.jpg" (public domain); ANIM1 face table |
| Coat, eye and hair (HD study) | Visible short hair laid in one direction. Each hair has a different colour, which breaks the sheen into streaks. Highlights stretch along the hair. The eye is almost all dark iris, between thick dark lids, with dense upper lashes. The mane is in coarse, clumped locks. | Commons: "Horse close up face.jpg" (public domain), "Horse-eye-closeup-0b.jpg" (CC BY-SA 4.0), "Tousled horse mane (Unsplash).jpg" (CC0), "A horse with a beautifully groomed mane.jpg" (public domain). Study use only, not shipped. |
| Coat colours and patterns | Roan: white hairs on the body only, the head, lower legs, mane and tail stay solid. Tobiano: smooth white that crosses the back, white legs, a dark head. Frame overo: jagged white along the sides that does not cross the back, dark legs, a bald face. Sabino: ragged, roaned white high on the legs and belly. Splash: white from below with a crisp edge, a bald face. Leopard: dark spots on white, larger on the quarters, striped hooves. Blanket: white over the hips with spots. Dun and grullo: dorsal stripe and leg barring. Dapple grey: pale dapples in a darker net, darker legs. Flea-bitten: white with red-brown specks. Champagne: mottled pink skin. Silver dapple: a dark body with a flaxen-silver mane. Pink skin and pale hooves under white hair. | 27 Commons photographs, one or two for each coat (licences checked on each file page). The shade and sun colours were sampled on the photographs. Each preset in `HORSE_COAT_PRESETS` names its photograph. Study use only, not shipped. |
| Horse size | FEI rules class a pony at up to 1.48 m (14.2 hh) without shoes. Arabians stand 14.1–15.1 hh (1.45–1.55 m), Quarter Horses 14.3–16 hh (1.50–1.63 m), Thoroughbreds 15.2–17 hh (1.57–1.73 m, about 16 hh on average). The presets are 1.42, 1.52 and 1.68 m. The slider covers 1.30–1.80 m. The model assumes that taller riding horses are leggier rather than proportionally wider, and that small horses carry relatively larger heads. The width scale (√size) and the head scale are design estimates, not measurements. | [British Equestrian: FEI pony measuring](https://www.britishequestrian.org.uk/equine/fei-pony-measuring) (rules); [Horse Illustrated: breeds and height](https://www.horseillustrated.com/horse-breeds-horse-height-explained), [Mad Barn: Thoroughbred profile](https://madbarn.com/thoroughbred-horse-breed-profile) (secondary guides, not registry rulebooks) |
| Tail at a gallop | In plate 626 the tail streams out behind, near the horizontal, with the hair drooping at the end. | Muybridge, *Animal Locomotion* plate 626 (CC0) |
| Rider's legs and arms | The rider's leg lies on the fender, which hangs between the leg and the horse. The stirrup hangs from the fender's outer face. A western rider at speed holds the reins low over the horn in closed fists, with the elbows bent at the sides. | [Cowboy Way: saddle parts](https://cowboyway.com/What/SaddleParts.htm); western riding practice |
| Hoofbeats | Single hoof impacts on hard, muddy ground and one breath, all CC0. The licence was read on each Freesound page. earshot: "a horse hoof thudding on packed dirt" z 2.7–4.6, p_real 0.99 before trimming. | Freesound kalhan 434803, 434804, 434809; craigsmith 675420; mrrap4food 619069 |

## Blueprint (phase 2)

**Gait clip.** The clip is one stride, in place, baked at 120 fps (51 keys, the last key equal to the first). Stride 4.6 m at 2.4 strides/s gives 11 m/s at rate 1. The scene plays it at `speed / 11.04` and moves the root at `speed`.

**Audio sync markers.** The markers come from the clip itself, at 1 kHz, with a 6 mm enter and 15 mm exit band:

| Leg | Lands (% of stride) | Lifts (% of stride) |
|---|---|---|
| Right hind (trailing) | 99.5 | 28.3 |
| Left hind (leading) | 7.5 | 36.2 |
| Right fore (trailing) | 25.4 | 53.9 |
| Left fore (leading) | 39.3 | 68.8 |

The suspension is 30.7% of the stride. A hoof thud plays on each landing. The leading fore is the loudest. A breath plays on the leading-fore landing, because a galloping horse breathes once each stride. A dirt scuff plays on each hind lift.

**Camera.** Positions and look points follow critically damped springs:

| Framing | Offset in horse frame (m) | FOV | Position half-life | Equal lerp at 60 fps |
|---|---|---|---|---|
| Chase | (−4.8, 1.5, 2.5) | 38° | 0.16 s | 0.070 |
| Tracking (camera car, long lens) | (0.6, 1.0, 13) | 21° | 0.22 s | 0.051 |
| Front (retreating, low) | (10, 0.7, 1.6) | 30° | 0.20 s | 0.056 |
| Hoof height | (−0.6, 0.32, 2.6) | 48° | 0.12 s | 0.092 |

- FOV punch: +4° at 12 m/s, +0.9° for each m/s² of forward acceleration, no more than +9°, half-life 0.35 s.
- Speed blur: a radial blur, from 0.006 at rest to 0.024 at full FOV punch. The centre stays sharp.
- Shake: a handheld drift of 3.5 cm and 0.006 rad at 0.55 Hz, scaled by (speed / 12)².
- Impact trauma: +0.10 for each hind or trailing-fore landing and +0.16 for each leading-fore landing. Trauma decays by 2.2 each second. The shake is trauma² × gradient noise at 17 Hz, with 3 cm and 0.012 rad at trauma 1.

**Audio dynamics.** Gain is 0.35 + 0.65·√(speed / 12), clamped to 1.6. Rate is 0.94 + 0.06·(speed / 12), clamped to 0.9–1.12. Each hit adds ±4% pitch and ±15% gain at random. The air rush rises with the square of the speed.

## Quality gates and evidence

The values below are measured in the story, in headless Chromium with the GPU, at 60 fps and 1280 × 720. CI does not measure them.

| Gate | Method | Result |
|---|---|---|
| Rider rigging | `MountedRider` puts the pelvis on the seat socket through a vertical spring (absorption 0.55, ±7 cm). It solves the legs with two-bone IK to the stirrup sockets on the saddle. | Boot ball to stirrup tread: 0.0–0.1 mm (readout). |
| Legs outside the saddle | Every sixth frame the probe skins about 530 leg vertices (the lower third of each thigh, the knee and the calf) on the CPU and measures how far they reach into the hull. Fenders and skirts count inset by the 4.5 cm they can be pressed in. Before this change the jeans passed through the fenders and skirts. | Medium: 0–4 mm on 24 s of trail with banked curves. Small: 0–5 mm. Large: 0–15 mm. Without the knee solve: 130–290 mm. The inner upper thigh, which rests on the seat and jockeys, is not probed. |
| Arms outside the body | The elbow solve samples the upper arm (from 40% of its length) and the forearm (from a third) against the torso cylinder. | 0 mm, galloping and standing. Renders show the upper arms down the rider's sides and the forearms forward to the fists. |
| Tail | Spring bone chain on the five hair bones: stiffness 5/s toward the clip, drag 0.045 each step, air coupling 2.2/s, wake turbulence 7% of the airspeed, bend limit 0.5 rad, two spheres on the buttocks. | Galloping: the tail streams back and waves through the stride without folding (frame sequence). Stopped: it hangs. |
| Coat | A gallery of all 25 presets beside the photographs. | Reviewed by the author against the photographs, not by the owner. |
| Planted hooves | In clip space, `tests/gallop-rider-3d.test.ts` checks every toe from touchdown to 65% of stance. In the scene, a probe follows each planted toe from the first frame after touchdown to 80% of its stance. | Clip space: 0.0 mm off the ground and 0.0 mm off the ground's motion to 70% of stance. Scene: 217 stances in 20 s, median slide 2.2 mm, median height 7.4 mm. On one curved stretch of the trail: up to 23 mm slide and about 4 cm height (see the limits below). |
| Audio sync | Hits fire only from contact markers (`forEachCrossed`). They are scheduled on the AudioContext clock 2 frames ahead and mapped with `getOutputTimestamp`. A probe compares each scheduled time with the frame that shows the contact. | 108 of 108 hits matched with 0.0 ms error, 0 late after the first frame. There are no timers. The probe measures the schedule against the frame clock. It does not measure the output device latency. |
| Camera damping | Critically damped springs. Each chase framing is equal to a lerp of 0.05–0.09 at 60 fps (below 0.1). | See the table above. |
| Memory | Dust and clods use fixed instanced ring buffers (900 puffs, 1200 clods). Audio buffers are decoded once and the voice chains are pooled. Each hit creates one Web Audio source node, which the API requires. | `update()` 0.2 ms for each frame (rider solves, tail chain and leg probe included). 110 draw calls, 3.6 M triangles (shadow pass included). |

## Known limits

- **Terrain under the hooves.** The near ground is triangles of about 4 m. The horse fits its pitch and height to the ground under its fore and hind stance points. On strongly curved stretches the triangle edges leave up to about 4 cm of float and 2 cm of slide. Per-leg ground IK on the clip will remove this. It is not built.
- **One gait.** Only the gallop and stand clips are in the GLB. "Stop" fades the gallop into the stand clip between 7 and 1.5 m/s, so the horse does not trot or walk on the way down. The hoof probe pauses during the fade.
- **Rider contact.** The rider's inner upper thigh rests on the seat and jockeys without soft-tissue deformation. The pressed fenders and skirts do not update their shadow. Standing in place, the elbows stand a little out from the body, because an upright rider's hands reach forward to the horn.
- **Hindquarter.** When a hind leg reaches far forward, a shallow fold shows at the back of the thigh.
- **Size.** Width scales as √size. This is a design estimate, not a measured model of each breed.
- **Coat patterns.** White patterns and spots are procedural noise shaped by the rules in the research table, not traced from one horse.
- **Realism.** The coat, the head and the hair follow the HD reference study, but nobody has accepted them in a review. Close views show the SDF smoothness and simplified skin folds.
- **GLB size.** The horse is 12.6 MB (with the coat masks) and the gear is 10.4 MB. They are not quantized. `KHR_mesh_quantization` or meshopt will make them smaller.
- **Sound.** The hoofbeats are recordings on hard, muddy ground, not on a dry trail. Nobody has done a listening review in the scene.
- **Rider.** The Rocketbox shirt, jeans and boots stay skinned to the body. Only the neckerchief, the reins and the tail use secondary motion. The mane uses a shader ripple.
