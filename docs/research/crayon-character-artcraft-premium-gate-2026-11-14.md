# ArtCraft v6: premium Crayon character admission

**Status: rejected, not artist-approved** (2026-11-14). The legacy child,
animal, hare and dragon character Storybook groups are not professionally
acceptable. This change quarantines those stories, without deleting film
source code, until real image-led validation succeeds.

## Actually studied references

User-authorized, AI-generated character design board in this chat is the
priority illustration target (1448x1086). Local crops measured from it:
face [5,110,481,413], expressions [489,119,919,392],
fabric [930,115,1438,410], adult figures [407,427,1024,1051],
animal [1012,445,1438,813]. Coordinates are image pixels, not
CRAYON1 film positions.

Third-party technique benchmarks; study craftsmanship, not exact copyrighted
contours or colors:

- Surabhi Gaikwad, *The Gaze 9*: https://www.saatchiart.com/art/Painting-The-Gaze-9/284577/10469649/view
  Observed adult hair mass, believable non-chibi face, garment plaids
  following cloth volume, layered dry-looking texture.
- Anuk Rocha, *Miki*: https://shop.delphiangallery.com/products/anuk-rocha-miki
  Observed separate upper/lower lids, tear duct, nose alar wings,
  lip volumes, warm/cool value patches around the eyes.
- Bobbie Seagroatt, *Grey Parka*: https://bobbieseagroatt.com/oil-pastel-paintings-on-paper/
  Observed structured collar/neck junction, weight-bearing folds,
  functional seams, closures and selective highlight edges.
- Sennelier Mathilde Polidori close-up:
  https://www.sennelier-colors.com/en/Vibrant-oil-pastels-portrait-with-Mathilde-Polidori_fiche_17730.html
  Observed broad opaque color planes under finer hard-edged accents.
- National Portrait Gallery pastel craft:
  https://www.npg.org.uk/schools-hub/drawing-techniques-and-materials
  Different material binder/mark behavior; not a digital-noise overlay.
- Art Prof oil-pastel portrait demonstration:
  https://artprof.org/learn/drawing-a-portrait-in-oil-pastel/
  Build sockets and upper lids *before* pupils; observe shadows not
  symbolic feature stickers; use variable wax pressure.

## Required region-level craft quality (release blocks)

- **Cranial shape**: non-chibi ratios with explicitly measured landmarks,
  asymmetrical mandibular taper; verified front, 3/4 and profile.
- **Eyes**: brow ridge, supraorbital fold, upper/lower tarsal lids,
  medial/lateral canthus, shaded sclera, iris/pupil occlusion and natural
  reflection. No circular dot eye or detached eyebrow.
- **Nose & mouth**: nasal bridge, sidewall, alar wings, nostril beneath
  tip, philtrum, two lip volumes, commissures and chin plane; expressions
  retain jaw mass and plausible musculature.
- **Hair**: rooted strands by growth flow, clump depth and overlapping
  locks, temples/nape continuity, taper hierarchy, fine flyaways only
  after major shape approval. No elliptical helmet scribbles.
- **Hands**: metacarpal/palm, thumb opposition, individual joints,
  finger grip around props with hidden overlap and stress poses.
- **Coats and fabrics**: shoulder/sleeve cap attachment, collar roll,
  lapels, darts, cuffs, buttonholes, thick hems, sewn pockets, plaid
  warp/weft following **curved cloth**, fabric-specific wool/linen/leather
  pressure and draw direction; not decorative flat stickers.
- **Legs and boots**: pelvis/knee/ankle connections, heel, instep, toe,
  sole contact and gravity; no floating feet or sliding at stance.
- **Wax**: single-stroke, layered-pigment, solid-underpaint,
  subtractive and scumbled swatches at 1x/3x; foreground **opaque**
  on both black and cream backgrounds. Break edges by meaningful
  pressure, not uncorrelated random speckles.
- **Acting and film**: 30fps actual playback, 9:16 and 16:9 frames,
  blink occlusion, extreme rigs, dialogue expressions and back-scrub
  determinism. Text may return inside portrait artwork only after
  measured safe-area/collision proof for long text and CJK.

## ArtCraft strict proof needed to re-enable the Storybook tags

1. Reference crops + licensing + observed landmarks per named part.
2. Locked part, anchor, parent, z-order and curve hierarchy; approved
   **static** unrigged portrait before animation.
3. Actual semantic masks and v6 axis audit: component connectivity,
   path tangent/curvature, stroke-width distribution, repeated motifs,
   medium microtexture. Predeclare applicable axes, thresholds, positive
   and negative controls for each feature.
4. Real browser-rendered source/output crops at aligned camera and
   1x/3x scale, exact 16:9 and 9:16 resolution; actual recorded metrics.
5. Rig/playback review at frame extrema and normal speed on both
   light and dark ground.
6. Independent visual artist approval with reviewed evidence identifiers
   and no unresolved critical defects.

The current gallery fails gates 1–6. TypeScript, SVG element-count tests
and document checklists **cannot** approve artistry. Do not invent
fidelity metrics, call browser QA done without screenshots, or unhide
legacy characters merely because new paths were added.

## Ordered next build

**First code construction completed, visual approval pending:**
`src/video/crayon-artcraft-adult-face-fixtures.ts` and its deliberately
hidden Storybook workbench now implement a distinct adult, three-quarter
face with independent jaw, cheek, nose, lips, sclera, iris, tear ducts,
upper/lower lids and rooted hair flow, plus basic tailored collar planes.
This is a prototype, **not an approved person character**, and has not
been reviewed against actual browser-rendered source crops.

Next, independently render and inspect its actual eye/nose/mouth region,
then refine whole head/hair; then articulated garment
and hands/feet; only then multi-view and rigging. A highly detailed
face must pass visual review before expanding to new characters.
Keep all work within Video production / Film Looks / Crayon.

## Actual renderer proof capture (opt-in / local first)

KUMIKI_CRAYON_ARTCRAFT_PROOF=1 npx vitest run --project unit tests/crayon-artcraft-adult-face.test.tsx

Writes 10 real React-rendered SVG source frames (1/75/160/235/299, in
landscape and portrait) to dist/crayon-artcraft-face-proof/. Rasterize
them at original resolution and 3x for independent optical review. These
are not source-matched fidelity scores and cannot promote the work by
themselves. Recorded visual review and all ArtCraft axes remain pending.

## Native rendered ArtCraft critique — visual fail, despite passing browser tests

Browser QA run [43659715114](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43659715114)
produced two **actual CRAYON1 React/Chromium renders** at 960×540 and 540×960,
frame 299. The browser check passed only for syntax, opacity and element
presence. **Independent visual rejection** is mandatory:

- Face read as flat, posterized mauve and peach sticker shapes instead of
  cohesive light, half-tone and shadow transitions. The long nasal sidewall
  formed a distracting triangular stripe rather than anatomical planes.
- Eyes read too large, circular and symmetric for the target adult portrait;
  lid and socket hierarchy was subordinated to the exposed sclera/iris shape.
- Hair formed a compact helmet/bob rather than rooted, overlapping flowing
  locks. Stroke marks followed clip boundaries but not convincing hair mass.
- Coat read as a rectangular rounded blob with a vertical apron-like linen
  strip, lacking waist, shoulders and coat construction. Upper torso proportions
  were unconvincing in both aspect ratios.
- Surface grain appeared uniformly coarse on face, hair and coat; real wax
  should distinguish heavy, opaque broad side-nib deposition from small
  pressure-tapered directional strokes, respecting each material's scale.

**First code remediation:** rebalance warm/cool palette; reduce prominence
of hard cheek/jaw masks, narrow nose planes and eyelid shapes, reshape crown
and tailored coat/collar/linen neckline, decrease facial microtexture density
and increase base mark spacing. Rerender required before any acceptance.

These are evidence-based *failures*, not numerical fidelity scores. Preserve
failed screenshots in PR artifacts for side-by-side review. No character
Storybook gallery is unhidden by this corrective iteration.

## ArtCraft expressive facial and textile study (unapproved)

The reference-board face has expressive mouth corners and cheek planes;
its visible clothing has warp/weft plaid, floral embroidery and sewn trim.
Current CRAYON1 geometry lacks many of these semantic subfeatures. The
new study adds individually addressable original contours for:
- mouth commissure deformation and separate upper/lower lip volumes for
  neutral vs subtle warm expression (not simple hue changes);
- two cheek pigment regions, source-bounded freckles, rooted temple curl
  strokes and partial forehead hairline;
- coat placket, button threads, actual piping, shaped sleeve-direction wool,
  scarf diagonal woven rhythm and linen floral embroidery.

These are *original editable code strokes*, not raster pasted from the
reference board. They remain behind Storybook `!dev` until the actual
front/3-quarter/profile evidence satisfies face and costume gates.
