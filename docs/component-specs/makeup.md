# MAKEUP1 — makeup and beauty for any face and any art style

**Registry item:** `makeup` · **Files:** `registry/anatomy/makeup-*.ts(x)`, `registry/anatomy/data/makeup-zones.json`,
`registry/anatomy/data/makeup-learned.json` · **Photo pipeline (Python):** `scripts/makeup/` · **Storybook:** Video
production → Art Foundations → Makeup (Makeup lab, Looks, Face charts by face shape, Skin and colour, Learned from
photographs, On a photograph) · **Skill:** [kumiki-makeup](../../skills/kumiki-makeup/SKILL.md) · **Research:**
[makeup and beauty theory, 2026-11-16](../research/makeup-beauty-theory-2026-11-16.md)

MAKEUP1 holds what stays true about makeup in every art style. It says where each product goes on a particular face
and what colour suits a particular skin. It also says how strong the light and shadow are and which finish each
product has. A
woodblock beauty's beni, a pencil portrait's lipstick and a rendered portrait's contour then share one theory. It
builds on ANAT1's measured face (the 468-point MediaPipe mesh) and its portrait renderer.

**Status:** implemented. Agent review of Storybook screenshots only: **human visual review not recorded.** The
rendered portraits are ANAT1 constructions, not approved realistic portraits (AGENTS.md rule 14).

## Architecture

```
            scripts/makeup (Python, offline)                         registry/anatomy (TypeScript, library)
 Phase 1  ingest     dataset adapters + licence gate               makeup-zones.ts   the atlas on any face (rest frame)
          geometry   MediaPipe 478 points -> rest frame,           makeup-color.ts   CIEDE2000, undertone, pigment films,
                     thirds, fifths, tilt, lips, brow map, shape                      palettes (base, blush, lips, eyes, brows)
 Phase 2  analyze    light model (AO * SH9 + shadowed key)          makeup-data.ts    evidence, face- and eye-shape rules,
                     -> albedo -> zone dLab, placement, palettes,                     17 looks as colour rules
                     contrast, finish -> blueprint.json             makeup-design.ts  analyzeFace, designMakeup -> plan,
          learn      bare prior, effects, beauty correlations                         checkMakeup
                     -> data/makeup-learned.json  ───────────────►  makeup-paint.ts   makeupPaint (renderer hook),
 Phase 3  paint      plan or blueprint on a photo                                     paintPhoto (any photo + landmarks)
                     (atlas, mesh or thin-plate-spline warp)        makeup-react.tsx  MakeupPortrait, FaceChart, tables
                          ▲                                                   │
                          └──── data/makeup-zones.json (one atlas) ◄──────────┘   plan JSON (kumiki.makeup.plan/1)
```

One zone atlas (`data/makeup-zones.json`) serves both languages. A plan made by `designMakeup` is plain JSON, so the
Python pipeline paints it on a photograph (`makeup.py apply --plan`).

## Layers

| Layer | File | What it holds |
|---|---|---|
| Atlas | `data/makeup-zones.json`, `makeup-zones.ts` | 38 zones (foundation, under-eye, tear trough, cheek, temple, jaw and nose contour, five highlights, bronzer, five blush placements, lid, crease, outer V, inner corner, lower lash line, liner, wing, puppy wing, inner-corner liner, lower liner, aegyo-sal and its shadow, tear mole, brow, straight brow, lips, liner, lip centre, gloss). A point with `surface: true` sits on the face's skin under its (x, y); 14 products with film opacity and finish; 8 finishes with roughness, specular and sparkle. `zoneField`, `resolveZone`, `zoneOutline`, `eyeWidth`. The parity fixture (`makeup.py parity`) holds Python's weights at sample points, along every stroke and with every adjustment, and the tests compare TypeScript with them. |
| Colour | `makeup-color.ts` | `deltaE2000`, `lch`, `readSkin` (ITA, undertone), `UNDERTONE_REF`, `filmStep`, `pigmentFor`, `basePalette` (foundation, concealer, corrector, contour, bronzer, highlight), `BLUSH_FAMILIES`, `blushOn`, `LIP_FAMILIES`, `lipColour`, `EYE_COMPLEMENTS`, `irisFamily`, `browColour`, `HEALTHY_SHIFT`. |
| Knowledge | `makeup-data.ts` | `MAKEUP_EVIDENCE` (graded findings with sources), `FACE_SHAPE_RULES`, `EYE_RULES`, `BROW_RULES`, `EYE_SHAPE_RULES`, `MAKEUP_LOOKS` (17 looks, five of them East Asian), `MAKEUP_LEARNED`. |
| Design | `makeup-design.ts` | `analyzeFace` (shape, eye spacing, tilt, lip ratio, brow peak), `designMakeup` (look + skin + face + iris + hair -> `MakeupPlan` with reasons and eye tools), `tapedEyeShape`, `checkMakeup`, `planSwatches`. |
| Paint | `makeup-paint.ts` | `makeupPaint(plan)` (the `SkinPaint` that `renderPortrait` calls), `makeupPortraitOptions(portrait, plan)` (paint, tape and no built-in makeup), `wearsMakeup(plan)` (false for a bare plan), `wornFace(portrait, plan)` (the face with its tape, for checks and charts), `paintPhoto(photo, plan)`, `restFrame(landmarks)`. |
| React | `makeup-react.tsx` | `MakeupPortrait`, `FaceChart`, `MakeupSwatches`, `MakeupChecks`, `UndertonePlane`, `LearnedEffects`, `LearnedContrast`, `BeautyCorrelations`, `MakeupEvidenceList`. |
| Workers | `makeup-render-pool.ts`, `makeup-render-jobs.ts`, `makeup-render-worker.ts` | `MakeupPortrait` renders in a module worker, cached (see `foundation-render.ts`). The plan goes to the worker as data, and the worker builds the paint: a paint's functions cannot go to a worker. |

## Use it

```ts
import { beautifulFace } from "components/anatomy/face-beauty";
import { renderPortrait } from "components/anatomy/face-portrait";
import { designMakeup, checkMakeup } from "components/anatomy/makeup-design";
import { makeupPaint, makeupPortraitOptions, paintPhoto } from "components/anatomy/makeup-paint";

const portrait = { sex: 0, skin: "#c99a7e", eyes: "hazel", eyeShape: "hooded" };
const face = beautifulFace(portrait).vertices;
const plan = designMakeup({ look: "soft-glam", skin: portrait.skin, face, eyes: "hazel", eyeShape: "hooded", intensity: 1 });
plan.rationale;             // why each choice: undertone, face shape, eye shape
checkMakeup(plan, face);    // contour stops before the iris, blush above the nose base, brow peak, lip contrast...
const image = renderPortrait({ ...portrait, paint: makeupPaint(plan) }); // the renderer's own makeup is then off
const taped = renderPortrait(makeupPortraitOptions(portrait, plan));    // also applies the plan's eyelid tape

// a photograph: 478 MediaPipe landmarks times [width, height, width]
const rgba = paintPhoto({ width, height, data, landmarks, skinMask }, plan);
```

Change any part of a look as data: `designMakeup({ look, overrides: { "cheek-contour": { coverage: 0.9 }, "lips": false } })`,
or pass a whole `Look` object. Layers name a zone, a colour rule, a coverage, a finish and an optional
`adjust` (`shift`, `rotate`, `scale`, `radius`, `soft`, `grow`).

## East Asian looks and eye tools

Five looks transform how the eyes read, not only their colour. The research note
[makeup-east-asian-trends-2026-11-17.md](../research/makeup-east-asian-trends-2026-11-17.md) has the evidence and the
reference photographs studied.

| Look | Id | Its signature |
| --- | --- | --- |
| Chinese social-video glam | `c-glam` | A glittering aegyo-sal with a shadow under it, an inner-corner liner, a soft puppy wing, a brown lower liner on the outer half, spiky lashes and drawn lower lashes, blush under the eyes and across the nose, a narrow nose, a coral-red gradient lip |
| Korean idol | `k-idol` | Glass skin, straight soft brows, a short puppy wing, a bright aegyo-sal, wispy lashes, hazel lenses, a coral gradient lip |
| Jirai-kei | `jirai` | A pale matte base, red-pink under the eyes, a strong rose blush right under them, a drooping red-brown wing, wispy upper lashes, heavy lower lashes, a tear mole, a small deep-red lip |
| Neo-gyaru | `neo-gyaru` | Taped double lids, doll lashes above and below, black liner round the eye, 14.5 mm dark lenses, strong contour, a sheer nude-pink gloss |
| Ryousangata (soft doll) | `ryousangata` | Rose lids, a pink aegyo-sal, a soft brown drooping wing, wispy lashes with drawn lower lashes, brown lenses, a high pink flush |

A look's `lashes`, `eyes` and `brows` drive the renderer through `SkinPaint`. They scale with intensity, inside their
caps, and are not used at 0:

- **Lashes:** `style` "wispy", "spiky" or "doll", and `lower` (length, darkness, strokes drawn with liner). Spiky
  lashes are manga spikes: 5-7 on each eye, 10-14 mm, longest in the outer third. No styled upper lash is longer than
  14 mm, and no styled lower lash is longer than 8 mm. A single lid's fold presses bare lashes down, so from
  the front they hardly show. Styled (false) lashes are curled and glued on, so they rise past the fold.
  `styleStrength` (0-1) fades a style in. `designMakeup` sets it from the intensity, so a low intensity does not give
  a full set of false lashes. `curl` (0-1) lifts lashes past a single lid as false lashes do: a look that wears mascara
  curls its lashes (a lash curler). Lower lashes drawn with liner take the liner's colour (`lower.colour`).
- **Lens:** `eyes.lens` with the tinted `diameter` (12.5-14.5 mm, a natural iris is about 11.7 mm), the limbal `ring`
  and a `tint`. The tint starts outside the pupil. The renderer keeps the diameter between just past the pupil and
  15 mm.
- **Tape:** `eyes.tape` 0-1. `tapedEyeShape` gives a single lid a low crease and keeps an in-fold lid in-fold. It
  opens a single lid by up to 1.2 mm and other lids by up to 0.5 mm. `makeupPortraitOptions` applies it to the face's
  own eye shape. A face with measured lids (no eye shape) is left as it is.
- **Brows:** `brows.straight` 0-1 straightens the face's own brow shape. The `brow-straight` zone fills the same band.
- **Lower liner:** the `liner-lower` zone starts at the outer corner. Its `adjust.span` sets how far in it goes, along
  the lash line. At 0.35 it lines the outer third, at 0.5 the outer half, at 1 the whole lower lash line (gyaru).
  `span` (0-1) keeps the first part of any stroke zone's length.

New checks: `aegyo-sal-height` (0.35-0.65 of the eye opening, 0.5 preferred), `puppy-wing-angle` (3-25 degrees down)
and `lens-size` (14.5 mm at most). Storybook: Makeup → East Asian looks.

Rules for any face:

- **Brows that peak early.** Some faces have a brow that peaks before 55% of the eye width (common in East Asian
  faces). On these, an arched `brow` fill becomes `brow-straight` (`BROW_RULES`). An arch at 71% would paint brow over
  bare skin.
- **Lip contrast either way.** `lip-contrast` takes the size of the difference. On deep skin a rose or pink lipstick is
  lighter than the skin, and that counts. A sheer light lip that lands at the skin's own value does not.
- **Plans saved earlier.** `MakeupPlan.eyes` and `brows.straight` are optional: plans saved before the eye tools still
  paint, check and render.

## The model

**Placement.** Zones are anchored to mesh vertices and sized in eye widths. They live in the face's rest frame: mm,
+x the face's own left, +y up, +z forward. A photo's landmarks reach the rest frame by a similarity fit to the
canonical mesh (Horn 1987 in TypeScript, Umeyama 1991 in Python). Every pixel gets its rest position through the mesh,
from the barycentric weights in its triangle. So zones follow each face's bone structure and stay on the skin when the
face moves. Face-shape rules and eye-shape rules change the zones as makeup artists do:

- face shapes: oval, round, square, oblong, heart, diamond, triangle.
- eye shapes: hooded, monolid, in-fold, round, deep-set, prominent, downturned, upturned, close-set, wide-set.

**Colour.** `readSkin` gives the ITA (Chardon 1991) and an undertone from the hue angle. The undertone split uses the
terciles of cheek hue measured in 960 adults of four populations (Xiao et al. 2017). The split is an estimate.
Products choose their colours from the skin:

- foundation matches the skin (aim for CIEDE2000 below 2.5) with part of the measured healthy shift (Stephen et al. 2009).
- concealer is about +5 L* (Jones et al. 2016), and correctors use complementary hues.
- contour is deeper, greyer and cooler, and bronzer is deeper and warmer.
- highlight is pearl, champagne or gold-bronze by depth and undertone.
- blush and red lipstick follow the undertone, eyeshadow the iris complement, and brows the hair.

**Film.** A product is a pigment film. At strength w it reflects `w * hide * pigment` itself and filters the rest:
`skin <- skin * ((1 - w) + w * (1 - hide) * pigment)`. A stain (hide 0) is a multiply blend. Opaque paint (hide 1) is a
normal blend. The renderer lights the film's own reflection without subsurface scattering, so heavy foundation looks
flatter.

Finishes change roughness and specular strength. Shimmer and glitter add mirror flakes fixed to the skin. Mascara
changes lash length, thickness and darkness. The designer's blend modes (multiply, normal, screen, soft light) are also
available.

**Photographs.** `paintPhoto` separates a smooth colour layer from the photo's detail (frequency separation). The
luminance variation (form, pores, fine lines) stays with the light layer, so makeup changes colour and value, not the
skin's surface. Lips and brows are darker than the skin by their own colour, so their darkness stays in their colour.
A film covers their true colour and takes the light of the skin around them. The Python pipeline has a fuller light
model. It fits ambient-occluded spherical harmonics plus the key light's cast shadow, from the mesh itself (see
`scripts/makeup/README.md`).

## What was learned (Python pipeline, `data/makeup-learned.json`)

From 104 bare faces and 17 CC0 or public-domain made-up portraits (visual review labels in
`scripts/makeup/reference-labels.json`):

- **Bare-skin prior.** Bare faces show natural colour in each zone. Their lips are about 10 L* darker and 11 a* redder
  than the skin. Their lids are darker and their cheeks redder. A made-up face's effect is its observed colour minus
  this prior.
- **Effects.** The made-up references wore their makeup mostly in the eyes and lips. Lips: about -14 L*, +12 a*. Liner
  about -9 L*. Outer V about -8 L*. Brows about -4 L*. The brow bone, under the arch, about +4 L* (a highlight). The
  cheek contour in everyday photographs is subtle.
- **Contrast.** Lip and eye luminance contrast rose from bare to made-up references (lips about 0.10 to 0.21). This is
  the direction Russell (2009) and Jones et al. (2015) report.
- **Beauty.** The data has 49 women of the Face Research Lab London Set. Their rated attractiveness rose with a
  narrower jaw for the cheek width (r = -0.40, p = 0.004). It also rose with more even skin redness (r = -0.29,
  p = 0.04). The analysis is exploratory (18 features per sex).

Storybook → Makeup → Learned from photographs shows the tables.

## Python pipeline

`scripts/makeup/README.md` has the setup and every command. In short:

```sh
python3 -I scripts/makeup/makeup.py ingest frl-london --root <FRL> --out <work>/refs            # Phase 1
python3 -I scripts/makeup/makeup.py ingest openverse --query "makeup portrait" --downloads <dl> --out <work>/refs
python3 -I scripts/makeup/makeup.py analyze <work>/refs --overlays                               # Phase 2
python3 -I scripts/makeup/makeup.py learn <work>/refs --out <work>/learned.json --ship registry/anatomy/data/makeup-learned.json
python3 -I scripts/makeup/makeup.py apply target.jpg --blueprint <ref>.blueprint.json --out out.png  # Phase 3
python3 -I scripts/makeup/makeup.py landmarks photo.jpg --out photo.json                          # for paintPhoto
```

The licence gate keeps CC0, PDM, US-Gov and CC BY by default. Research-only sets (MT, CelebA-HQ, FFHQ's NC images) need
`--allow research-only`, and `learn --ship` refuses them.

## Limits

- **One photo cannot fully separate makeup from light and colour grading.** The light model and the bare prior remove
  most natural shading. The product-physics gate drops measured "effects" that break their product's direction. A
  reference's own lid and lash-line darkness can still read as eyeshadow and liner. List such zones in the
  reference's `exclude_zones`, and the transfer leaves them out. Dense per-pixel transfer (`--warp mesh|tps`) is still
  noisier than the parametric default. `makeup.py pairs --transfer` measures a transfer against the real made-up photo
  of the same person.
- **The bare prior comes from studio-lit faces** (Face Research Lab London Set). Zones that cast shadow in directional
  light (under the jaw, temples, eye sockets) carry some lighting bias.
- **The learned set is small** (17 made-up portraits from stock photographs). It shows directions, not effect sizes.
- **Face-shape classes are a cosmetology convention**, not a validated classification.
- **The renderer paints the face mask only.** A full base (for example oshiroi) stops at the jaw.
- **No photographs of people ship with the library.** The photo story paints a rendered portrait, or a photo the user
  loads with its landmarks file.
