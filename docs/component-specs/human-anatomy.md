# ANAT1 — human anatomy framework for any art style

**Registry pack:** `human-anatomy` (no runtime dependencies)
**Files:** `registry/anatomy/anatomy-body.ts` (lattice decoder, morph evaluator, presets), `anatomy-growth.ts` (CDC
length/stature for age), `anatomy-measure.ts` (tape-measure sections, ANSUR-named measures, volume and mass),
`anatomy-pose.ts` (clinical joints, ranges, forward kinematics, skinning, pose and hand-pose library),
`anatomy-view.ts` (camera, `HumanFrame`, contours, terminators, software rasteriser, `projectPoint`),
`anatomy-face.ts` (3D face study, landmarks, feature loops, facial norms), `anatomy-hair.ts` (hair data, strand
generator, hair rendering, brows and lashes), `anatomy-color.ts` (skin, hair and iris colour; colour science), `anatomy-reference.ts` (ANSUR access,
regressions, canon checks, surface forms, age changes, drawing recipe), `anatomy-react.tsx` (`HumanFigure` reference
painter), `data/*` (baked tables and licences). Binary body model: `assets/models/anatomy/human-body-lattice.bin`
(2.6 MB, 1.3 MB gzipped). Reference images: `assets/photos/anatomy-references/` (22 public-domain/CC0 plates).
**Storybook:** Video production → Art Foundations → Human Anatomy → **Lab**, **Population line-up**, **Turnaround**,
**Pose library** (+ front/side QA), **Hand poses**, **Face lab**, **Head angles**, **Range of motion**, **Any style**,
**Proportions and ranges**, **Reference board**, **Hair lab**, **Hair types and colours**, **Skin, hair and eye colour**
**Status:** implemented; agent review of Chromium screenshots only — **human visual review not recorded**. This is a
construction and reference framework. It does **not** certify a finished realistic portrait or pencil drawing: those
still need their style's gates (CP-F1, ArtCraft v7 portrait gate — AGENTS.md rules 13–14).

## What it is for

Draw people that read as real in any medium. The framework decides *where the forms are* — proportions, depth,
silhouette, joint angles, light and shadow shapes, facial landmarks — from measured data; a painter (pencil, ink,
collage, riso, cel, paint, RIG1 looks) decides only *how they look*.

```ts
import { createHumanBody, loadHumanBodyModel } from "components/anatomy/anatomy-body";
import { poseHumanBody, POSE_PRESETS, HAND_POSES } from "components/anatomy/anatomy-pose";
import { renderHumanFrame } from "components/anatomy/anatomy-view";
import { measureHumanBody } from "components/anatomy/anatomy-measure";
import latticeUrl from "assets/models/anatomy/human-body-lattice.bin?url";

const model = await loadHumanBodyModel(latticeUrl);           // or decodeHumanBodyModel(arrayBuffer) in Node
const body = createHumanBody(model, { sex: 0.1, age: 34, muscle: 0.6, weight: 0.45 });
const posed = poseHumanBody(body, { ...POSE_PRESETS[2].pose, "elbow.L": { flex: 40 }, ...HAND_POSES.relaxed() });
const frame = renderHumanFrame(body, posed.points, { yaw: 30, pitch: 5, distance: 6 }, { width: 600, height: 900 });
// frame.triangles / contours / terminators / landmarks / joints → any painter; <HumanFigure frame={frame} /> for reference
const m = measureHumanBody(body); // stature, headsTall, ANSUR-named breadths, girths, lengths, mass, BMI
```

## Coordinates and conventions

Metres, right-handed: **+x the figure's own left, +y up, +z forward** (the way the figure faces); origin on the floor
under the pelvis. Camera `yaw` 0 = front, 90 = the figure's left side, 180 = back; `pitch` + = camera above. Omit
`distance` for orthographic model sheets; for photo-like work use ≥ 3× the subject's height.

## Body model (`createHumanBody`)

Baked by `scripts/anatomy/bake_makehuman.py` from the **CC0 MakeHuman** base mesh, macro targets, default skeleton and
weights (revision recorded in `assets/models/anatomy/NOTICE.md`). The lattice holds 72 macro corners (sex × age ×
muscle × weight), 16 height deltas and 24 ancestry deltas over ~3,400 surface points (exact barycentric transfer from the
13,380-vertex original), so blending with MakeHuman's own piecewise-linear weights reproduces any setting.

| Param | Range | Meaning |
|---|---|---|
| `sex` | 0–1 | female → male sculpted forms (blendable) |
| `age` | 1–90 y | MakeHuman keys at 1, 10, 25, 90 y |
| `muscle`, `weight` | 0–1 | 0.5 average; MakeHuman's weight axis spans roughly BMI 16–25 for adults (heavier bodies need care: no data beyond it) |
| `height` | 0–1 | height-for-age percentile (0.5 median, 0/1 ≈ ±2 SD) and MakeHuman's height morph |
| `ancestry` | weights | MakeHuman's coarse African/Asian/Caucasian sculpt averages — not identities; use references for a specific person |
| `stature` | m | explicit final stature (uniform scale) |
| `growthCurve` | bool | default true: stature follows CDC 2000 length/stature-for-age (1–20 y), adults keep the age-20 value, −1 mm/yr after 40 |

`HUMAN_PRESETS` gives 16 people from a toddler to 80-year-olds and heavy/lean/athletic adults; their landmark and joint
positions are tabulated in `data/model-tables.json` (`presets`) for agents that only need numbers.

**Landmarks (47):** vertex, glabella, sellion, pronasale, subnasale, stomion, pogonion, menton, opisthocranion, tragion,
zygion, gonion, cervicale (C7), suprasternale, acromion, thelion, omphalion, iliocristale (supracristal plane through L4),
trochanterion, buttock, crotch, patella, femoral epicondyle, malleoli, pternion, acropodion, olecranon, stylion,
dactylion (L/R where paired). **Skeleton:** 57 bones (spine05–01, neck01–03, head, jaw, eyes, clavicle, shoulder,
upper arm, forearm + twist, wrist, 4 metacarpals, 15 finger bones per hand, pelvis, thigh, shin, foot, big toe, toes).

## Calibration against measured adults (ANSUR II)

Default woman/man aged 25 (CDC adult stature 1.633 / 1.766 m), model measure ÷ stature vs ANSUR II p50, z in ANSUR SDs
of the ratio. Regenerate with `npx jiti scripts/anatomy/export-anatomy-tables.ts`.

| Measure (ANSUR) | Woman 25: model ÷ stature | ANSUR p50 | z | Man 25: model ÷ stature | ANSUR p50 | z |
|---|---|---|---|---|---|---|
| cervicaleHeight (`cervicaleheight`) | 0.851 | 0.857 | -0.9 | 0.852 | 0.864 | -1.8 |
| suprasternaleHeight (`suprasternaleheight`) | 0.817 | 0.817 | +0.1 | 0.809 | 0.819 | -1.4 |
| acromialHeight (`acromialheight`) | 0.823 | 0.820 | +0.3 | 0.829 | 0.821 | +0.9 |
| chestHeight (`chestheight`) | 0.728 | 0.719 | +0.6 | 0.729 | 0.735 | -0.6 |
| waistHeight (`waistheightomphalion`) | 0.598 | 0.602 | -0.3 | 0.626 | 0.602 | +1.9 |
| iliocristaleHeight (`iliocristaleheight`) | 0.588 | 0.611 | -1.8 | 0.589 | 0.604 | -1.2 |
| trochanterionHeight (`trochanterionheight`) | 0.495 | 0.519 | -1.6 | 0.511 | 0.512 | -0.1 |
| crotchHeight (`crotchheight`) | 0.468 | 0.480 | -0.8 | 0.488 | 0.481 | +0.5 |
| kneeHeight (`kneeheightmidpatella`) | 0.277 | 0.275 | +0.2 | 0.295 | 0.278 | +1.8 |
| lateralMalleolusHeight (`lateralmalleolusheight`) | 0.041 | 0.039 | +1.0 | 0.034 | 0.042 | -2.6 |
| biacromialBreadth (`biacromialbreadth`) | 0.211 | 0.225 | -1.4 | 0.209 | 0.236 | -2.8 |
| chestBreadth (`chestbreadth`) | 0.171 | 0.165 | +0.5 | 0.190 | 0.165 | +2.5 |
| chestDepth (`chestdepth`) | 0.128 | 0.151 | -1.4 | 0.130 | 0.144 | -1.0 |
| chestCircumference (`chestcircumference`) | 0.523 | 0.576 | -1.2 | 0.543 | 0.603 | -1.2 |
| waistBreadth (`waistbreadth`) | 0.173 | 0.183 | -0.6 | 0.155 | 0.186 | -1.6 |
| waistDepth (`waistdepth`) | 0.110 | 0.128 | -1.1 | 0.108 | 0.134 | -1.4 |
| waistCircumference (`waistcircumference`) | 0.456 | 0.524 | -1.2 | 0.433 | 0.534 | -1.6 |
| hipBreadth (`hipbreadth`) | 0.229 | 0.217 | +0.7 | 0.204 | 0.196 | +0.6 |
| buttockDepth (`buttockdepth`) | 0.133 | 0.142 | -0.7 | 0.129 | 0.140 | -0.8 |
| buttockCircumference (`buttockcircumference`) | 0.569 | 0.625 | -1.3 | 0.529 | 0.581 | -1.2 |
| neckCircumference (`neckcircumference`) | 0.200 | 0.202 | -0.2 | 0.218 | 0.226 | -0.5 |
| headLength (`headlength`) | 0.113 | 0.117 | -0.8 | 0.117 | 0.114 | +0.7 |
| headBreadth (`headbreadth`) | 0.088 | 0.091 | -0.7 | 0.084 | 0.088 | -0.9 |
| headCircumference (`headcircumference`) | 0.317 | 0.344 | -1.9 | 0.320 | 0.327 | -0.6 |
| bizygomaticBreadth (`bizygomaticbreadth`) | 0.081 | 0.082 | -0.2 | 0.081 | 0.081 | -0.1 |
| mentonSellionLength (`mentonsellionlength`) | 0.069 | 0.070 | -0.2 | 0.071 | 0.070 | +0.2 |
| interpupillaryBreadth (`interpupillarybreadth`) | 0.036 | 0.038 | -0.9 | 0.034 | 0.036 | -1.1 |
| upperArmLength (`acromionradialelength`) | 0.164 | 0.191 | -4.2 | 0.173 | 0.191 | -3.0 |
| forearmLength (`radialestylionlength`) | 0.133 | 0.148 | -2.3 | 0.155 | 0.152 | +0.3 |
| handLength (`handlength`) | 0.108 | 0.111 | -0.6 | 0.121 | 0.110 | +2.5 |
| footLength (`footlength`) | 0.132 | 0.151 | -3.6 | 0.149 | 0.154 | -1.0 |
| span (`span`) | 1.021 | 1.018 | +0.1 | 1.105 | 1.031 | +2.6 |
| thighCircumference (`thighcircumference`) | 0.349 | 0.377 | -0.9 | 0.324 | 0.356 | -1.0 |
| calfCircumference (`calfcircumference`) | 0.212 | 0.228 | -1.0 | 0.212 | 0.223 | -0.7 |
| bicepsCircumference (`bicepscircumferenceflexed`) | 0.174 | 0.186 | -0.8 | 0.187 | 0.204 | -0.9 |

**Known model deviations (draw against ANSUR, not the model, when they matter):** the upper arm is short (z −3 to −4),
the woman's foot is short (−3.6), the man's hand and span are long (+2.5), the man's bony shoulders are narrow (−2.8).
Default bodies are leaner than the Army sample (BMI ≈ 19–21 vs ANSUR median ≈ 24–27), so girths read −1 to −1.6 SD.
`predictFromStature(sex, mm)` returns ANSUR regression values (with residual SD) for a coherent person of any height.

## Posing (`poseHumanBody`)

Joint ids (`.L`/`.R` for sided): spine, neck, jaw, eyes, clavicle, shoulder, elbow, forearm, wrist, finger2–5-mcp/pip/dip,
thumb-cmc/mcp/ip, hip, knee, ankle, toes. DOFs: `flex`, `abduct`, `twist`, in goniometer degrees from the anatomical
position (forearm 0 = thumb up; spine/neck 0 = the sculpted relaxed curve). Angles are clamped to `JOINTS[].dofs`
ranges (AAOS table, CDC study, or flagged estimates); `outOfRange` lists what was clamped. The shoulder girdle lifts
automatically above 60° of arm elevation (scapulohumeral rhythm). `mirrorPose`, `blendPoses`, `POSE_PRESETS`
(anatomical, relaxed, contrapposto, walk contact, run, sit, crouch, kneel, reach up, hands on hips, thinking, wave) and
`HAND_POSES` (relaxed, open, spread, fist, point, grip, pinch). `CDC_ROM` has measured means by age band and sex.

Verified numerically: shoulder flexion 90 → upper arm points +z; abduction 90 → +x (slightly up from the girdle); hip
flexion 90 → +z; knee flexion 90 → −z; supination −85 → palm faces +z; pronation 80 → palm faces −z.

## Rendering (`renderHumanFrame`, `renderMeshFrame`, `rasterizeHumanFrame`)

`HumanFrame`: screen positions and depth for every point; front-facing triangles with smooth light values and tone bands
(highlight, light, halftone, core, shadow); visible occluding contours (zero set of n·v with a depth-buffer visibility
test and a light-driven weight hint; micro-loops below ~1.2% of figure height dropped); terminators (n·l = 0 on surfaces
facing the camera); landmark and joint screen positions; `projectPoint` for props and guides. `rasterizeHumanFrame`
fills a seam-free RGBA buffer (clay, tonal, cel, silhouette) identically in a browser or Node. `HumanFigure` paints a
frame with CSS custom properties `--kumiki-anatomy-light|shadow|ink|accent|grid|eye`.

## Face study (`createFace`)

The MediaPipe canonical face (468 points, Apache-2.0) with 35 named landmarks and feature loops (eyelids, brows, lips,
mouth line, nose base, oval). By default it is fitted to the chosen norm's means — eye width and spacing, nose width and
height, lower face — so z = 0 is the published average and each step is one SD: `FACE_NORMS` holds North American
white (Farkas 2005), African American (Farkas 2007) and Saudi (Al-Sebaei 2015) values by sex. `measureFace` reports
en–en, ex–en, al–al, n–sn, sn–gn, ch–ch, ex–ex, zy–zy. Irises: 11.7 mm, lid-clipped (`eyeCentres`, `IRIS_DIAMETER_MM`).
The mask has no ears, cranium or hairline.

## Hair (`growHair`, `renderHairSegments`, `faceHair`)

`growHair(body, posedPoints, params)` plants roots inside an anatomical hairline — the front at the trichion (sellion
+ Farkas tr–n), temples (with `recession`), above the ears, the nape — orients them away from the crown whorl (right of
midline and clockwise by default, per the measured frequencies), grows strands under gravity with collision against the
head, neck and shoulders (hair lies along the skull near the root), keeps the face clear (front hair sweeps to its side;
`fringe: true` cuts bangs above the brows instead), clumps strands into locks and adds waves (types II–III) or helices
(IV–VIII) with curl shrinkage. Params: `length`, `curl` 1–8, `strands`, `parting` none/left/center/right, `flow`
natural/down/back/forward, `recession`, `whorl`, `volume`, `clump`, `frizz`, `fringe`, `seed`. Output: strand
polylines in metres, a per-point `scalpMask` (tint the skin under the hair) and per-strand jitter.

`renderHairSegments(hair, frame, { eumelanin, pheomelanin, grey, depth })` projects strands with the frame's camera,
culls segments behind the body using the rasteriser's depth buffer, tapers width to the tip and shades with
Kajiya–Kay diffuse plus Marschner's two shifted highlights (white R toward the root, tinted TRT toward the tip).
`HumanFigure` accepts `hair` and `hairColor` and draws all of this. `faceHair` gives eyebrow strokes (inner hairs up,
body lateral-up, tail lateral-down) and upper/lower lashes for the face study.

Data (`HAIR_GROUPS`, `HAIR_FACTS`, `CURL_TYPES`): density, cross-section (≈ 70–78 µm equivalent diameter), growth and
ellipticity by broad group (secondary sources, grade M), whorl frequencies (Schmidt et al. 2008), lash counts and
lengths. The eight curl types follow the de la Mettrie et al. 2007 classification; their geometry is an estimate (E)
because the published per-type values were not accessible. Limit: guide strands for drawing (hundreds to thousands),
not a groom of 100,000 hairs; tight coils read as a textured volume rather than individual coils.

## Colour (`anatomy-color.ts`)

- **Skin:** `MONK_SKIN_TONES` (CC BY 4.0, with CIELAB and ITA°), `itaDegrees` / `itaCategory` (Chardon 1991),
  `SKIN_SCATTERING` (Jensen et al. 2001 skin1/skin2 σs′, σa, diffuse reflectance, η; verified against the paper's
  Fig. 5b), `skinShade` / `skinRamp` (linear-light shading with a warm subsurface band at the terminator derived from
  skin1 absorption), `SKIN_ZONES` / `skinZoneColor` (forehead, cheeks, nose, ears, lips, beard shadow, eyelids,
  under-eye, knuckles, palms/soles, areola).
- **Hair:** `hairSigmaA` (eumelanin σa 0.419/0.697/1.37, pheomelanin 0.187/0.4/1.05 per unit concentration, from pbrt-v3
  after Chiang et al. 2016), `hairAlbedo` (painter base colour, stylised), `hairReflectanceFromSigmaA` (pbrt-compatible),
  `HAIR_COLOR_PRESETS` (blonde 0.3, brown 1.3, black 8 per pbrt-v4 docs; the rest estimates), `hairColorHex` with a
  grey-strand fraction, `HAIR_HIGHLIGHTS` (Marschner 2003 lobe shifts and widths), `shadeHair`.
- **Eyes:** `IRIS_COLORS` (inner, outer, limbal ring), `EYE_NOTES`; body eyeballs show iris and pupil from the eye
  bone's gaze axis.
- **Science:** sRGB ↔ linear ↔ CIELAB helpers.

## Reference knowledge (`anatomy-reference.ts`)

`ANSUR` (93 measures × sex: mean, SD, p1–p99, ratio to stature, regression on stature, group medians), `statureForAge`,
`MODEL_TABLES.byAge` (heads tall, eye line in head, crotch and navel ratios, shoulder/hip widths in heads, leg ratio),
`CANON_CHECKS` (twelve drawing canons tested against data), `SURFACE_FORMS` (27 bones, muscles, fat pads and creases
with drawing notes), `AGE_CHANGES`, `DRAWING_RECIPE`. Evidence grades: M measured, A verified clinical table,
B standard anatomy fact, S sculpted model. Sources and grading: [research note](../research/human-anatomy-framework-2026-11-15.md).

## Regenerating data

```sh
python3 -I scripts/anatomy/bake_ansur.py ANSUR_II_MALE_Public.csv ANSUR_II_FEMALE_Public.csv registry/anatomy/data/ansur-ii-ranges.json
python3 -I scripts/anatomy/bake_reference_data.py canonical_face_model.obj statage.csv lenageinf.csv registry/anatomy/data
MH_REVISION=<sha> python3 scripts/anatomy/bake_makehuman.py <makehuman/data> assets/models/anatomy/human-body-lattice.bin   # numpy, scipy, fast-simplification in a scratch venv
npx jiti scripts/anatomy/export-anatomy-tables.ts
```

## Limits

- One sculpted parametric body family: not a scan population; individual variation (posture, asymmetry, fat
  distribution, faces) must come from references.
- Linear-blend skinning: extreme flexion (deep crouch, full fist) shows some volume loss at joints.
- Decimated mesh (~3,400 points): fine for full figures and hands at medium size; use the face study for faces.
- Muscle and soft-tissue changes with pose (biceps bulge, breast and belly shift) are not simulated.
- ANSUR II is a military sample aged 17–58; CDC growth curves are a US reference; facial norms are small samples.
