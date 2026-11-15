# ArtCraft v6 — reference-led reconstruction of The Wild Hare

Date: 2026-11-14
Source system: CRAYON1; original illustration defined in
`src/video/crayon-wildlife-portrait-fixtures.ts`.
Custom ArtCraft skill modules used: `artcraft`,
`art-reference-research`, `art-reference-structural-study`,
`art-2d-character-craft`, `art-character-structure`,
`art-mesh-topology`, `art-material-study` and `art-fidelity-review`.

## Direct observations and sources

The actual inspected images and detailed rights notes are recorded in
`crayon-artcraft-hare-reference-study.json`. The principal references:

- [Bavarian wildlife portal — European hare in profile](https://www.wildtierportal.bayern.de/wildtiere_bayern/102456/index.php)
- [Nadezhda Kokorina — Portrait of a Hare (oil pastel)](https://www.saatchiart.com/en-pr/art/Drawing-Portrait-of-a-hare-painting-animal-art-oil-pastel-rabbit-art/296362/9862769/view)
- [Tracy Barnett — After the Dawn (colored pencil)](https://annkullberg.com/blogs/ann-muses/the-pencil-box-featured-artists-january-2024)
- [Richard Hull crayon work — wax buildup and sgraffito](https://westernexhibitions.com/exhibition/5488/)

The artwork is **original** rather than a tracing or asset import.
No copyrighted images, photos or artists' stroke textures are distributed.
The reference images were inspected as web-viewable visual sources, not
downloaded into the repository or analyzed as licensed image files.
Consequently, their numerical source mask/SSIM/five-axis gate is not
available. Do not use source-fidelity language to describe this result.

## What failed in the previous screenshot

The prior hare looked like a vector mascot despite a complicated procedural
crayon engine. The actual screenshot showed:

1. A rounded, egg-like large head with a conspicuously flat solid-color
   back-of-skull plane.
2. A circular cheek patch poorly connected to the nasal bridge and jaw.
3. A near-capsule muzzle and generic dark nose dot.
4. Ear membranes that appeared identical to flat painted triangles without
   visible root canals or folded lips; 16:9 ears nearly clipped at the top.
5. A strong black eye silhouette without convincing brow/tear-corner
   structure. High-frequency generated fur could not correct these shapes.

The first small ArtCraft vector study reauthored those high-impact areas,
then an independent visual check still found a too-angular nasal bridge,
large back cranium and generic oval shadow. This is not a completed
fine-art likeness. The second static iteration narrowed the muzzle,
connected an uneven cheek plane and fitted both ear tips inside 16:9.

## Named geometry contract (construction before material)

See `crayon-artcraft-hare-part-structure.json` for source association,
local coordinate extents, attachment, pivot and stress-pose plan for
18 named critical parts. Important changes implemented in the *actual*
CRAYON1 source:

- Asymmetric narrower skull profile rather than an undifferentiated oval.
- Orbital socket, brow bone, tear-corner and feathered upper-lid outlines
  are distinct editable pieces, above forehead pigment but below eye.
- Sloped nasal plane joins the forehead to the tapering main muzzle;
  a dark underside and separate warm whisker pad prevent a peanut silhouette.
- Malar/zygomatic shadow sits between cheek plane and lower fur;
  nostril luster, philtrum and concentrated whisker follicles recover
  small-scale anatomical structure.
- Far and near ear have independently painted membrane, recessed crease,
  root canal, raised outer lip and narrow contour fold. All remain correctly
  parented to existing independent source ear rigs.
- Source character root now uses scale .98 in both formats; landscape
  origin is (676,357), portrait (340,599). This removes the cropped-ear
  framing problem without independently rescaling child parts.
- Existing 21 anatomically guided fur regions and two-layer wax sgraffito
  remain available. These layers were **not** used to disguise the primary
  geometry problems; structural masses were rebuilt first.
- Four inspection cameras in `Video production / Film Looks / Crayon /
  Scene Engine`: eye, cheek fur, nasal/muzzle, and ear. Macro views
  inherit all actual animated artwork, but hide screen-space titles during
  close-up review; production exports retain the complete original film.
- All anatomical wax volumes use opaque underpainting; none were changed
  into translucent alpha masks.

## ArtCraft structure graph

```text
shoulder-silhouette [root; full body scale]
└── head [three-quarter wedge]
    ├── far-ear → far-ear-inner → crease-shadow / rim-fold
    ├── near-ear → near-ear-inner / outer-lip / canal-shadow / rim-fold
    ├── orbital-structure → eye-brow-bone / tear-duct
    │                        └── eye-rim → iris → pupil / dark & gold flecks
    ├── cheek plane → malar-ridge-shadow / light reflection / follicles
    └── nasal-bridge-plane → muzzle-projection → muzzle underside, pad
                                      └── nose / luster / philtrum
```

The indentation for overlapping pigments expresses **shape adjacency
and painter order**, not always a literal transform parent. The source
spec is authoritative for animation hierarchy.

Negative controls: standalone oval face, identical triangle ears,
circular glued-on eyes, separate peanut muzzle, random stipple that
doesn't follow the face, cartoon uniform dark contour, detached tufts.

## ArtCraft reject-and-repair: negative-space anatomy

The first source-art still was inspected at normal film size and at a
3× muzzle crop. It showed an unintended **dark paper-colored triangle**
between the whisker pad and cheek. The first version added face planes
without a sufficiently connected maxilla. This was not a wax-material
defect and could not be corrected by increasing fur noise or strokes.

The second pass added `maxillary-junction`, an opaque hidden mass
between the upper nasal bridge, muzzle projection and lower-jaw wax.
Its bounding area intentionally overlaps both adjacent masses and it
inherits `head` motion. Five new narrow directional fur bands now
follow the brow, nasal slope, connected cheek, whisker pad and ear root,
and clip to their respective painted anatomical parents.

A locally rendered source-art image was re-inspected at full frame;
pixels at the previously exposed opening changed from bare paper
(#23353d) to the expected connected cheek pigment (#956f59).
This is useful **isolated-shape evidence**, not a browser-backed
renderer claim: the final CRAYON1 film remains a separate acceptance gate.
The negative-control guardrail in the new unit test enforces overlap
of the three painted masses, but polygon bounds overlap alone cannot
prove every surface pixel is continuous, so actual visual review remains
mandatory.

## Testing and verification

New `tests/crayon-artcraft-hare-anatomy.test.tsx` verifies scene
validation, required semantic subparts, opaque wax state, source
parent hierarchy, safe world-space ear/nose/eye points at five motion
frames in both 16:9 and 9:16, iris/eyelid frame continuity, and stable
SSR scene markup.

Suggested commands:

```bash
npm run typecheck
npx vitest run tests/crayon-artcraft-hare-anatomy.test.tsx
npm run film:check -- examples/film/crayon-wildlife-portrait.film.json
npm run film:render -- examples/film/crayon-wildlife-portrait.film.json --frames=240 --only=landscape --out=dist/crayon-artcraft
npm run film:render -- examples/film/crayon-wildlife-portrait.film.json --frames=240 --only=portrait --out=dist/crayon-artcraft
```

The code-based still prototypes and side-by-side craft boards were
rendered and visually inspected outside Storybook. Those images are
**not** native-engine film captures; do not cite them as proof that the
film is artist-approved. The real browser/FFmpeg workflow remains
manually runnable to avoid unrequested CI rendering cost.

## November 14 follow-up: cheek transition and real-browser QA

Reference comparison: [Kokorina's oil-pastel hare](https://www.saatchiart.com/en-pr/art/Drawing-Portrait-of-a-hare-painting-animal-art-oil-pastel-rabbit-art/296362/9862769/view)
and the [Association of Animal Artists 2026 hare portrait](https://associationofanimalartists.com/spring-exhibition-2026-gallery-4)
show a curved rear cheek with dense local guard hair that crosses the
light/shadow boundary, not an isolated geometric dark capsule.

The previous original CRAYON1 `cheek-cool-shadow` was a broad, solid,
high-value-difference shape. Refined it into an irregular cool plane with
a reduced dark outline and smaller bounds, then placed two separately
seeded anatomical guard-hair fields *within that moving wax parent*:
`cheek-cool-short-guard` and `cheek-cool-root-shadow`. Retains an opaque
underpaint and the 240-element contract. `detail` still modifies only
microstroke density; never silhouette, topology or base color.

Storybook's old single 26-story entrypoint was split by subject. The
source player and control definitions are shared, and camera inspection
panels now reside under `Crayon/Wildlife/The Wild Hare`. New manual-only
Playwright visual captures cover two aspect ratios, seek/reseek stability,
four macro views, shape presence, material masks and browser exceptions.
The inexpensive default CI now checks local imports and JSX in both
`src/video` and `src/components/video`, in addition to TypeScript and
changed tests.

**Evidence status:** new source geometry tests, type checks and source
preflight are automated; the manual Chromium render/MP4 film must still
be run and reviewed. No source-pixel matching or claim of gallery-level
craft is justified by a successful source-code test.

## Pending release gates

ArtCraft v6 requires actual high-resolution licensed/usable source
crops with immutable semantic masks and five-axis regional baselines,
plus native engine captures at final size and normal-speed playback
review. The referenced artworks have no cleared redistribution
permission, and this environment cannot fetch their image bytes.
Therefore pixel-fidelity and mathematical-artistry source metrics
remain BLOCKED. Character turnaround/profile consistency during
larger head rotations, body-fur realism and final editorial
composition also require additional review. No "world-class",
"faithful reproduction", or final-release certification is claimed.
