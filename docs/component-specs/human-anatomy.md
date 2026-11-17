# ANAT1 — human anatomy framework for any art style

**Registry pack:** `human-anatomy` (no runtime dependencies)
**Files:** `registry/anatomy/anatomy-body.ts` (lattice decoder, morph evaluator, presets), `anatomy-growth.ts` (CDC
length/stature for age), `anatomy-measure.ts` (tape-measure sections, ANSUR-named measures, volume and mass),
`anatomy-pose.ts` (clinical joints, ranges, forward kinematics, skinning, pose and hand-pose library),
`anatomy-view.ts` (camera, `HumanFrame`, contours, terminators, software rasteriser, `projectPoint`),
`anatomy-face.ts` (3D face study, landmarks, feature loops, facial norms), `anatomy-hair.ts` (hair data, strand
generator, hair rendering, brows and lashes), `hair-groom.ts` (groomed hairstyles and bangs, strand renderer),
`eye-detail.ts` (eye shapes, iris colours and the iris's structure), `skin-texture.ts` and `skin-texture-react.tsx`
(skin texture by region and age), `hand-model.ts`, `hand-render.ts` and `hand-react.tsx` (hands in detail: types,
gestures, grasps, actions),
`anatomy-color.ts` (skin, hair and iris colour; colour science), `anatomy-reference.ts` (ANSUR access,
regressions, canon checks, surface forms, age changes, drawing recipe), `anatomy-react.tsx` (`HumanFigure` reference
painter), `data/*` (baked tables and licences). Binary body model: `assets/models/anatomy/human-body-lattice.bin`
(2.6 MB, 1.3 MB gzipped). Reference images: `assets/photos/anatomy-references/` (42 public-domain/CC0 plates and
photographs: 11 of eyes, 5 of skin, 4 of hands).
**Storybook:** Video production → Art Foundations → Human Anatomy, in this order:
body — **Lab**, **Population line-up**, **Turnaround**, **Pose library**, **Range of motion**, **Proportions and
ranges**, **Any style**, **Reference board**; faces — **Face lab**, **Beautiful faces**, **Head angles**, **Portrait in motion**; eyes —
**Eye lab**, **Eye shapes**, **Iris colours**; skin — **Skin texture by region**, **Skin colour (Monk scale)**; hair —
**Hair lab**, **Hairstyles**, **Bangs (fringes)**, **Curl types and hair colours**, **Hair on the posable body**;
hands — **Hand lab**, **Hand types**, **Hand gestures**, **Grasps (GRASP taxonomy)**, **Hand animations**, **Hand
details**.
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

## Beautiful faces and portraits (`face-beauty.ts`, `face-portrait.ts`, `face-portrait-react.tsx`)

**`beautifulFace(options)`.** Applies what the research on facial attractiveness supports
([research note](../research/face-beauty-portrait-2026-11-16.md)), each step scaled by `beauty` (0 = the calibrated
average face, 1 = everything applied):
- **Averageness:** starts from population means.
- **Symmetry:** every vertex is averaged with its mirror.
- **Breadths:** cheekbone breadth set to ANSUR II (133.8 mm women, 142.6 mm men), which gives Pallett's 46% pupil ratio
  by itself.
- **Jaw:** a narrower jaw.
- **Femininity:** above-average femininity for women; slight feminisation for men (Perrett 1998).
- **Eyes:** a slight canthal tilt (the opening: see lids on the iris).
- **Brows:** drawn in the band between the face's own upper and lower brow edges, so each type's stars' brow shape and
  thickness carry through.
- **Lips:** vermilion heights from attractive young women (6.5 / 11.6 mm, Popenko's 1:2); the lips closed.
- **Form:** brow ridge about 10 mm ahead of the cornea, the rim below the eye about 3 mm behind it, the cheek about
  2 mm ahead (Jelks vector).
- **Face types** (`faceType`, `realFaces` 0–1.5): the shape of beautiful modern stars of one ancestry group, by sex
  (`FACE_TYPE_GROUPS`, `FACE_TYPES`, [research note](../research/face-types-2026-11-16.md)): East Asian, Southeast
  Asian, South Asian, Middle Eastern & North African, Black, Latin American, Northern & Western, Southern and Eastern
  European. Each type is fitted to several stars' photographs (1995 on; public domain, CC0, CC BY or CC BY-SA,
  measured only and credited; one photograph a person) in MediaPipe's landmark space: rendered, read by the same model
  and corrected. Groups are never blended. Asking for a type also brings its look (skin, eyes, hair) unless given;
  without one, the type matching the norm is used. Lid margins and the inner lip line are left out of the fit.
- **Bone structure** (with the type): the group's depth at the brow ridge, nasal root and cheekbones (measured on its
  stars' photographs against the Northern European stars) and at the bridge, nose tip and lips (soft-tissue norms
  and estimates).
- **Face-shape variants** (`faceVariant` 1 or 2): each type's stars split in two by face shape, each variant from at
  least four people, named by what it changes (for example "a longer face, a narrower jaw").
- **Lids on the iris:** the upper margin MRD1 above the pupil (about 4 mm), the lower MRD2 below it (about 5.3 mm),
  where the portrait puts the eyeball, so no white shows above or below the iris. An eye shape keeps its own opening.
- **Mouth corners:** at the height measured on the type's stars' closed mouths (a little below the lips' midline),
  not drooping.
- **Hairline:** placed where the eye-to-mouth distance is 36% of face length.

**The golden ratio.** `goldenRatioReport` lists the claims beside the face's values (`GOLDEN_RATIO`): Marquardt's
nose : mouth = 1 : φ, and the popular length : width = φ. Tests found the mask fits masculinised fashion-model faces
(Holland 2008), and a 2024 systematic review found no link between golden-ratio fit and attractiveness. So φ is
reported, not built in.

**`renderPortrait(options)`.** Renders on the CPU, about 3–6 s for 256 × 320 and 8–15 s for 480 × 600 at 2×
supersampling, most of it the hair. Geometry:
- the calibrated face, Loop-subdivided twice;
- a strip of skin grown from the face mask's top edge up and round to the cranium, so the forehead is one surface up
  to the hairline;
- a cranium from ANSUR head measures;
- a neck behind the jaw that ends under the garment, and shoulders with a scoop or crew neckline.

Shading:
- **Key light:** a softbox of about 20°: shadow-mapped, the shadow's edge widening with the distance to what casts
  it (percentage-closer soft shadows: a blocker search, then 16 Poisson taps turned per point), so the nose's shadow
  is soft at its end; finer in close-ups, with a bias that grows where the light grazes the skin.
- **Fill, rim, sky and bounce lights.**
- **Ambient occlusion** from 22 directions.
- **Subsurface scattering:** the d'Eon & Luebke six-Gaussian skin profile.
- **Specular:** a GGX dielectric with F₀ 0.028, oilier in the T-zone.
- **Regional skin colour** (`SKIN_ZONES`), with uneven tone that grows with age.
- **Skin texture by region and age** (`skin-texture.ts`): furrows, pores and fine wrinkles bend the normal and
  darken the furrows, faded by the pixel's size; the face's age lines and folds (`faceWrinkles`); age spots and
  freckles.
- **Eyes:** ray-traced eyeballs:
  - the iris from `eye-detail.ts`, lit like the face round it and brighter opposite the light;
  - a sclera pinker toward the corners;
  - a softbox catchlight, and the upper lid and lashes shading the top third;
  - a pink waterline;
  - the caruncle, hidden by an epicanthal fold.
- **Lashes and brows** drawn as hairs: lashes in clumps of two to four, tapered, longest in the outer third, pressed
  down by a single lid's fold. The eye shape sets the crease (its height, an in-fold start, or none), a hood's shadow
  and the epicanthal fold.
- **Lips:** volume and border.
- **Hair:** groomed by `hair-groom.ts` (below). It shadows the skin under it, and the scalp under it is painted in the
  hair's colour (a soft hairline, a thin parting).
- **Expressions:** EXPR1 action units and creases.

Options:
- sex, beauty and skin;
- eyes: an `IRIS_TYPES` id (`eyes`, and `eyesRight` for complete heterochromia), the pupil's diameter (`pupil`, mm),
  an `EYE_SHAPES` id (`eyeShape`);
- `framing`: "eyes" for a close-up of both eyes and brows;
- `age` (years; default 30) and `freckles` (0–1);
- hair: melanin, a `HAIRSTYLES` id ("long", "short" and "bob" are kept as aliases), and `fringe`, `parting`,
  `hairStrands`, `hairLength`, `hairCurl` and `hairGrey` to override the style;
- expression, yaw (±25°), key light;
- makeup: `makeup` ("none", "natural" or "glamour", by default "natural" for women) and `lipstick`. For a designed
  look, give `paint: makeupPaint(plan)` from MAKEUP1 ([makeup](makeup.md)). The built-in makeup is then off by
  default;
- `debug` passes (normals, irradiance, occlusion, hair shadow).

The result carries the groom and the head it was groomed on (`hair`), and the 468 face-mesh points in output pixels
(`landmarks`). By default 12,000–40,000 strands are drawn,
scaled with the picture's size, up to 120,000 on request.

`FacePortrait` draws one in a canvas after paint, queued one at a time. `GoldenRatioTable` and `BeautyEvidence` show
the checks and sources.

**Status:** agent review of renders only. It reads as a lit CG portrait, not an approved realistic portrait (AGENTS.md
rule 14 still applies to the pencil portrait style). The mask is one average face, so individuals differ only by the
parameters above.

## Rendering in pages: workers, caches, previews (`foundation-render.ts`, `foundation-render-react.tsx`)

`FacePortrait`, `HandView`, `HandFlipbook`, `SkinSwatchView` (and MATL1's `MaterialSwatch`, SKY1's `CloudSky`, WATER1's
`OceanView`) render in module workers, so pages stay responsive while pictures fill in:

- Each pack has a pool (`anatomy-render-pool.ts`, `materials-render-pool.ts`, `sky-render-pool.ts`,
  `water-render-pool.ts`). A pool runs up to four workers, one fewer than the machine's cores. Without workers (tests,
  server rendering, a blocked worker URL), the same jobs run on the page's thread.
- Renders start when a frame comes within 600 px of the screen, previews before full renders.
- A job nobody waits for any more is dropped before it starts.
- Portraits with the same hair go to the same worker, which keeps the groomed hair (about 1–5 s of work).
- Results are cached in memory (about 256 MB) and in IndexedDB (`kumiki-render-cache`, the 600 most recent), so
  returning to a page or reloading it draws at once. Cache keys include `RENDER_CACHE_VERSION`. Storybook defines
  `__KUMIKI_RENDER_VERSION__` as a hash of `registry/{anatomy,nature,materials}` taken at start-up, so a changed
  renderer never shows a stale picture; restart Storybook after editing a renderer, or call `clearRenderCache()`.
- A portrait first draws a half-size preview (one sample a pixel, at most 9,000 strands), then the full render.
- While a frame works, a badge reads "Rendering…" or "Preview · refining…". When options change, the last picture
  stays, dimmed, until the new one is ready. The canvas carries `aria-busy`, and the badge's spinner stands still
  under reduced motion.

## Eyes in detail (`eye-detail.ts`)

([research note](../research/eye-detail-2026-11-16.md))

**`EYE_SHAPES`** (11): almond, round, hooded, monolid, in-fold double lid, upturned, downturned, deep-set, prominent,
close-set and wide-set.

Each sets the lid opening:
- its height and width;
- its canthal tilt and the upper lid's peak;
- a rounder lower lid.

And the lid and socket:
- the upper-lid crease: its height, an in-fold start at the epicanthal fold, or none;
- a hood and an epicanthal fold;
- the eyes' depth and spacing.

The numbers sit in measured ranges:
- creases of 4–6 mm in Chinese double lids and 8–8.6 mm in Malay lids, with 30% of Chinese adults having none (Lu et
  al. 2017);
- inner corners 31–35 mm apart, openings 31–33 mm wide (Alberto & Soriano 2024);
- a canthal tilt of about 8° (a Korean clinical sample).

`applyEyeShape(vertices, shape, sex)` moves a face mesh to a shape; `beautifulFace({ eyeShape })` applies it. The
portrait draws the crease, hood and fold.

**`IRIS_TYPES`** (14): black-brown to light blue, with amber, hazel, yellow-green, grey-green and a green with a brown
centre. Each has its own pupillary and ciliary colours, measured zone by zone in twelve public-domain or CC0 eye
photographs (`EYE_REFERENCES`; blue and light blue are estimated). Each also sets fibres, crypts, furrows, a limbal
ring, a pupillary ruff and freckles.

`irisAlbedo(type, r, θ, seed)` gives the colour at a point:
- the pupillary zone inside a jagged collarette, streaking out along the fibres;
- radial fibres;
- crypts by the collarette;
- contraction furrows toward the edge;
- the limbal ring and the ruff.

`EYE_EVIDENCE` lists the graded findings. The eye photographs are on the Reference board under "eyes".

## Skin texture by region (`skin-texture.ts`)

([research note](../research/skin-texture-2026-11-16.md))

**`SKIN_REGIONS`** (13): forehead, nose, cheek, chin, eyelids, crow's feet, upper lip, neck, back of the hand,
knuckles, palm, fingertip and forearm. Each has:
- pores (density, size);
- a furrow network (spacing, depth, anisotropy, direction);
- fine wrinkles or creases, papillary ridges;
- vellus hair, sheen and redness.

The anchors are reported (sources in `SKIN_EVIDENCE`):
- primary furrows 30–100 µm deep, secondary 5–40 µm;
- cheek pores at 10–80 per cm² (Flament et al. 2015), larger on the nose and forehead;
- vellus hair 439/cm² on the forehead;
- with age the furrows grow fewer and deeper.

**`skinSurface(region, x, y, { age, footprint, seed })`** gives the height, darkening and redness at a point:
- primary lines in three crossing families (triangles and rhombi), finer secondary lines, domed plateaus;
- pores as oval pits;
- wandering, branching wrinkles, and ridges that end and fork (a loop on a fingertip);
- detail finer than about two pixels faded out.

Also:
- `faceWrinkles` (forehead, glabella, crow's feet, under-eye, nasolabial and marionette folds, neck);
- `ageSpotsAt` and `frecklesAt`; `blendSkinRegions`;
- `renderSkinSwatch` (a region at macro scale under a raking light, with near-surface and subsurface scattering, a
  sheen and vellus hairs), and `SkinSwatchView` / `SkinRegionsSheet` in React.

## Hands in detail (`hand-model.ts`, `hand-render.ts`, `hand-react.tsx`)

([research note](../research/hands-2026-11-16.md))

**`HAND_TYPES`** (11), with sizes from ANSUR II (means and percentiles) or estimated for children:
- adults: a large strong man's, an average man's, a slender long-fingered hand, an average, slender and small woman's;
- younger: a teenager's, a six-year-old's, a toddler's;
- older: an old woman's and an old man's.

Each sets length, breadth, palm length, finger thickness, padding, muscle, knuckles, veins, tendons, taper, digit
ratio, nails (shape, free edge) and skin.

**`buildHand(type, side)`** gives bone lengths and radii:
- the phalanges follow two reported rules: middle + distal ≈ proximal, and joint-to-tip ≈ 1.3 × the end segment;
- finger widths come from the breadth;
- the thumb sits at the base of the palm.

**`poseHand(hand, pose)`** places every bone. `HandPose` gives MCP, PIP and DIP flexion and spread for each finger,
and the thumb's CMC flexion, abduction and opposition with its MCP and IP; then the wrist. The pose is completed
naturally:
- end joints follow the middle joints (⅔);
- neighbours follow a little;
- a `thumbTo` or `thumbPoint` target solves the thumb's angles within its ranges.

**`HAND_GESTURES`** (15): relaxed (the normal cascade), open, spread, fist, point, OK, thumbs up, V, horns, call me,
pinch, claw, cupped, beckon, three.

**`GRASPS`** (33): the GRASP taxonomy (Feix et al. 2016), numbered as in the paper, with kind, opposition, thumb
position and observed frequency. **`graspHand(hand, id, close)`**:
- places the grasp's object by contact;
- opens each joint until the finger is clear, then closes it until it touches;
- solves the thumb onto the object.

So any hand fits any object.

**`HAND_ANIMATIONS`** (8): wave, grasp and release, count to five, beckon, drum the fingers, pinch and let go, thumbs
up, make an OK. **`animateHand(hand, anim, t)`** eases by the minimum-jerk profile (Flash & Hogan 1985), with
per-finger delays and oscillations; actions loop.

**`renderHand(posed, options)`** ray-marches a signed-distance hand:
- **Surface:** rounded-cone phalanges with joint bulges and pads, a palm of metacarpals with thenar and hypothenar
  masses, nails (square, oval, round, almond), veins, tendons, a child's dimples, the held object.
- **Shading:** skin texture by region, palm and joint creases, a lighter palm, a traced shadow map read softly,
  occlusion, subsurface scattering, glossy nails.
- **Options:** views by the hand's own sides; `focus` and `zoom` for close-ups; `frameMm` for one scale across
  hands; skin and nail colour; `quality: "draft"` for animation frames.

`HandView` and `HandFlipbook` (frames rendered progressively, then looped; reduced motion waits for Play) show them in
React.

**Status:** agent review of renders only. Fingers blend rather than collide; there is no arm.

## Groomed hair (`hair-groom.ts`)

The hair foundation for rendered heads ([research note](../research/hair-groom-2026-11-16.md)).

**`groomHair(head, { style, fringe, parting, curl, lengthScale, strands, guides, seed })`** grooms a style on a
`HairHead`. A `HairHead` gives:
- the cranium (ellipsoid), hairline, brow, eye, ear, chin and neck heights;
- optionally the face's front surface, the shoulder tops and the chest front, so hair can rest on them.

Steps:
- **Roots** sit on the skin inside an anatomical hairline (front, temples, around the ears, the nape).
- **Comb:** away from the crown whorl, or back, or to the side. Hair leaves a parting on its own side, and over the
  front of the head the style holds it off the face until it passes the temple.
- **Guides (480)** grow from the root as heavy elastic rods:
  - where the hair beneath holds them (outer layers from higher roots lie further out), they lie on the head and
    follow the comb;
  - where the head falls away, they turn toward gravity over √(ℓ³/L), with ℓ ≈ 5 cm (Goldstein et al. 2012). So
    long hair falls from the widest part of the head, short hair stands, and the last few centimetres keep their
    direction;
  - they rest on the forehead (bangs), pass beside the cheeks and over the ears, and drape over the shoulders: in
    front of the ridge onto the chest, behind it down the back.
- **Styles:** blow-dried cuts hug the head; set or gathered styles stay against it; coils stand out.
- **Physics** ([research note](../research/hair-bangs-2026-11-17.md)): fringes and short and medium lengths then
  settle as heavy elastic rods. The weight beyond each joint bends the strand from its styled curve by
  (moment × segment) / B, with B / w = ℓ³. Positions are rebuilt from the root, so nothing stretches; every point is
  pushed out of the head, face, ears, neck, shoulders and chest on every pass; a surface hair rests on carries the
  weight beyond it. With no contact this is the heavy elastica, within 1–3°. Long hair and blunt-cut lengths keep
  their grown hang.
- **Cut:** a blunt line, layers or a textured trim, and each fringe on its own line. The fringe lines come from 25
  modern photographs (measured):
  - full: 2 mm below the brows in the middle, 12 mm at the outer brow;
  - curtain: open to the hairline in the middle, to the outer brow and cheekbone;
  - side-swept: from the hairline to 18 mm below the brow.
- **Fringe pieces:** 18–48 clumps of their own, gathering near the ends; each piece ends a few millimetres up or
  down. A fringe strand is drawn as two finer ones.
- **Children (5,000–120,000)** follow only guides that stay together, with their offset carried in the strand's own
  frame. Then they:
  - gather into locks (leaders chosen by root and tip);
  - curl (waves as flat S-curves across the hair sheet, neighbouring locks nearly in step; helices for curls);
  - frizz and fly away in smooth arcs;
  - stay off the face (children too) and below the parting; a fringe's children are cut on its line.

**`HAIRSTYLES`** (15): long straight, long wavy, lob, bob, bob with blunt bangs, shoulder length with curtain bangs,
long side wave, curly, afro, ponytail, low bun, pixie, short crop, slicked back, buzz. Each has lengths by region,
cut, parting, fringe, comb, curl, volume, clumping, frizz, hold, ends, front lift and hug.

**`FRINGES`** (7): blunt, wispy (see-through), micro, long (lash-grazing), curtain, bottleneck, side-swept. Each has a
triangular section (width to the temple corners, depth behind the hairline), density, set, clumping and its cut line:
- blunt at the brows;
- micro halfway up the forehead;
- long at the lashes;
- curtain from the bridge of the nose to the cheekbones;
- bottleneck from the brows round the eyes to the cheekbones;
- side-swept from the brow on the part side to the cheekbone.

**`renderHairStrands(raster, groom, view, light)`** draws the strands as anti-aliased lines, far to near, hidden
behind the skin and ears. Each drawn strand is as wide as the real hairs it stands for. Shading:
- Marschner's R, TT and TRT lobes with melanin absorption;
- deep opacity maps along the key light (`hairDensityMap`) for self-shadowing, and along the view for sky occlusion;
- light scattered through the hair volume in the hair's colour, so the side away from the light still reads as hair,
  not as a bald scalp;
- a sheen from the fill; locks and tips vary a little in tone; grey strands are a share of white fibres.

`scalpCover` and `partLine` say where to paint the scalp in the hair's colour, and where a parting shows.
`HAIR_PHYSICS` and `HAIR_SHADOW` hold the constants.

**Status:** agent review of renders only (Hair lab, Hairstyles, Bangs). It is a groom for portraits from the front
(±25°), not a simulation in motion.

## Portraits in motion, and hair in moving air (`portrait-motion.ts`, `moveHair`)

`PortraitInMotion` (in `face-portrait-react.tsx`) renders a looping portrait frame by frame in the workers.
`portraitFrame(base, t, motion)` gives each frame's options:

- **Blinks** (AU43): the lid closes in about 100 ms, stays shut briefly and reopens in about 200 ms. This follows
  high-speed video of spontaneous blinks (Kwon et al. 2013). People at rest blink about 17 times a minute
  (Bentivoglio et al. 1997), so a 3 s loop holds one blink.
- **Glances** (AU61–64): saccades take about 20–30 ms plus 2–3 ms per degree (the main sequence), so a glance is over
  within one frame; the eyes then hold still.
- **Hair** uses `moveHair(groom, head, { t, wind, direction, gust, period })`:
  - Each strand bends from its root like a light cantilever loaded by drag. Its end moves with the square of the wind
    speed and of the strand's length, up to a quarter of the length: a 25 cm lock moves about 2 cm in a 3 m/s breeze,
    and a crop barely moves.
  - Gusts swing the speed at about 0.6 and 1.7 Hz, a wave about 15 cm long runs down each lock, and each lock has its
    own phase.
  - Hair resting on the head, shoulders or chest moves at 30% (friction).
  - Strands keep their segment lengths and are kept out of the head, face, neck, shoulders and chest.
  - With `period`, every rate is rounded to whole cycles, so the loop has no seam.

The groomed hair is cached, so only its pose changes per frame. Story: **Portrait in motion**.

**Hair on the skin, the scalp and the hairline (portraits).**

- **Shadows.** Hair shadows are gathered in four layers by the hair's distance from the skin, each blurred by the
  softbox's penumbra (about 0.35 × the distance: hair on the skin is crisp, a curtain 3 cm off the cheek is soft).
  Only skin the key light reaches takes a hair shadow. A cheek turned away from the light used to take the forehead's
  hair coverage, which gave a hard dark edge down the face.
- **Scalp.** Under the hair, the scalp shows streaks along the groom's own root directions. Straight hair gives long
  streaks; curl types IV–VIII give round clumps about 2 mm across. The hairline breaks into those streaks instead of
  fading smoothly.
- **Scattering.** Hair-covered scalp takes no part in the skin's light scattering, so there is no red rim along the
  hairline.
- **Forehead strip.** The strip that joins the face mask to the cranium is pulled onto the ellipsoid along its radius.
  It used to stand out past the skull at the temples as fins.

## Hair on the posable body (`growHair`, `renderHairSegments`, `faceHair`)

The quick drawing hair for the 3D body and the painters (the portrait uses `hair-groom.ts`).

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
