# RISO9 — ArtCraft reference-led character redraw

**Study date:** November 14, 2026. **Workflow:** ArtCraft v6, plus `art-reference-research`, `art-reference-structural-study`, `art-2d-character-craft`, `art-mesh-topology`, `art-material-study`, `art-fidelity-review`.

**Design source of truth:** Kumiki's own editable Courier and Bird from `src/video/riso-character-demo.tsx`; real RISO8 Chromium stills are the canonical baseline, not third-party images. External artwork supplies *craft and technique*, not identity, exact pose, copies or traced Bézier geometry. The screenshot baseline is [PR 210's passing browser workflow](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43638467064).

## Primary reference image board (external links; images NOT bundled)

All source images are linked for visual study. Copyright belongs to their original creators. No download/redistribution rights are assumed.

| Reference | Visual image / artist page | Detail observed at three scales | RISO9 distinct construction rule |
|---|---|---|---|
| A1 — **Ciclos**, kore.wave | [Published print](https://www.risopop.com/pop-shop/ciclos) / [high-resolution image](https://images.squarespace-cdn.com/content/v1/5d665d7207aca80001560a23/957f9a7e-47c0-4c14-8726-7b06050508f1/ciclos-2.png) | Macro: one broad blue hair silhouette anchors a near-white face. Meso: irregularly alternating locks and large negative paper openings, strong eye/eyelash asymmetry. Micro: tiny separate lid, tear-duct, nose, lip and fingernail marks, *not* undifferentiated dark face fill. | Courier hair: one rooted mass plus three differentiated clumps with changing curvature; eyes: upper/lower lids with actual paper apertures and separate irises; mouth corners and nostril independent. Negative control: helmet polygon, triangle nose and a filled eyelid wedge. |
| A2 — **Garden Birds**, Esther de Korte | [Original print](https://www.risopop.com/pop-shop/garden-birds) / [print photograph](https://images.squarespace-cdn.com/content/v1/5d665d7207aca80001560a23/d8b3442b-ee34-4975-89da-83503efe4170/gardenbirds-2.png) | Macro: distinct flying bodies keep physical mass. Meso: different tail/wing root and overlapping covert shapes; patterned black slots make feather groups legible. Micro: tapered shaft/slit marks align with feather axes, often different sizes. | Bird: 4 asymmetrical wing-tip feathers per side, concave notches, rooted coverts and tapered shaft accents, different left/right designs. Negative control: single boomerang wing with evenly spaced dots. |
| A3 — **Starling**, Isaac LeFever | [Artist's Risograph print](https://dribbble.com/shots/25675934-Starling-Risograph) / [image](https://cdn.dribbble.com/userupload/36331300/file/original-d29bec580c37e611c9e7a87fd5534064.jpg) | Macro: single crisp avian silhouette on textured paper. Meso: feather-tract variation distinguishes head, mantle, coverts and long primaries. Micro: short hatching follows feather growth, not a uniform noise fill. | Bird feather details must rotate with the source wing joint and follow the local primaries; a few dense insets near shoulder, fewer marks at each tip. Do not replace feather plates with indiscriminate grain. |
| A4 — **Checkered coat figure**, Elena Maria Knittelfelder | [Artist's original project](https://www.behance.net/gallery/243846539/felt-Benito-might-delete-later) / [print art](https://mir-s3-cdn-cf.behance.net/project_modules/fs/6d1538243846539.698a5a14ca7ec.png) | Macro: torso reads from narrow shoulders, hanging coat hem and distinct shoe silhouettes. Meso: coat sleeves and hands separate from cuffs; scarf follows body action. Micro: short knuckle and shoe contour strokes. | Courier coat gets a body-facing lapel edge, sewn pocket welt and hem break; hands get thumb opposition and more than one finger notch; preserve IK ankle/foot contact. Negative control: gloves as red mitten capsules, coat as a straight pentagon. |
| A5 — **Jaroslav Filip portrait**, Sarah Camilla Pekarčíková | [Print listing](https://www.risoto.shop/products/jaroslav-filip) / [large scan](https://www.risoto.shop/cdn/shop/products/Jarohlava.png?v=1758633844&width=1946) | Macro: restrained silhouette, tonal value anchored by dark hair. Meso: face cheek/eyelid planes; micro: short oriented hatch strokes with varying density, never random uniform lines. | Courier cheek and nose bridges carry narrow local ink accents; do not cover the face in even halftone and do not remove paper whites. |
| A6 — **C.A. Hiley, Four Pictures of Birds** | [Artist's 2026 bird book](https://cahiley.com/books) | Meso: mixed hand-drawn ink wash and digital shape beneath an intentionally limited red/blue separation. | Bird's printed second plate carries feather subdivisions within an opaque anatomical main mass. Do not infer watercolor physics. |
| A7 — **Hiromu Oka, physically printed animation** | [Animation process article](https://www.itsnicethat.com/articles/hiromu-oka-animation-130422) | Macro: original 2D drawings remain recognizable after frame-by-frame physical print. Micro: the registration and grain evolve but feature identity remains anchored. | Character body, head and limb silhouette paths remain solid. Frame events alter dedicated expression shapes; grain/misregistration are separated from geometry. |
| A8 — **Miki Kim, Strange Flower Has Bloomed** | [Hand Saw Press's 2025 Risograph book](https://quintalatelier.com/en/products/a-strange-flower-has-bloomed) | Fine lines were hard to print; production required substantial proof iteration. | Deliberate small ink feature widths, but never subpixel hairline detail that disappears in 960x540 source film. |

## Actual initial-image diagnosis

Baseline screenshot `courier-fine-mesh.png` / `video-riso-characters--paper-courier-performance-storybook.png`:
- **Courier head:** red cap, dark blue hair mass, almost-white face; eyes are two single ink wedges. The broad right-side hair sheet is closer to a helmet than separately directed locks. There is no coherent iris/upper/lower lid system; nose is one triangle. Back cheek has no subtle contour hierarchy.
- **Courier body:** visible coat and bag, but body is a single monotone slab; gloves are red blobs without believable thumb/index separation; suit/coat lapels have broad angular planes without seam rhythm. Overprinting/paper opacity now correct—**do not revert to translucent character bodies**.
- **Bird:** recognizable flying profile, yet both wings are mostly one tapering boomerang each. Head a near-circular red disk, eye a dark dot, beak a simple triangle. Tail has only two crude prongs. Two-plate feather accents exist but cannot replace the missing feather geometry.

## Construction map — reference observations converted to geometry

| Feature / actor | Artist-authored plan | Layer / rig | Acceptance at 960×540 and 3× crop |
|---|---|---|---|
| Hair / Courier | Broad crown remains a dark mass; three *nonuniform* locks along fringe/temple terminate at different positions, with small paper gaps. Include one red crown seam/texture accent | `hair`, `hair-forelock`, `hair-temple`, `hair-strand-ink` on head; overlapping cap | Face stays legible, no detached hair, no helmet look |
| Eyes / Courier | Separate upper and lower lids, redrawn iris disks positioned behind aperture; asymmetric brows retain existing blink and smile timing | `eye-line`, `eye-lower-lids`, `iris-left/right` on head; expression-specific paths | Both distinct, blink does not show open iris over closed lid |
| Nose/mouth / Courier | Curved bridge/tip, one nostril, articulated smiling/open-mouth mark and lip/corner accents | `nose`, `nostril`, `mouth`, `lip-shadow` on head | No unanchored triangle or identical mouth shape across gestures |
| Cloth / Courier | Body-shaped lapels, shoulder-to-armpit fold taper, diagonally converging pouch tension, distinct pocket/hem marks | Body/arms/forearms and satchel, each child follows IK | No floating seams during wave and bag grip |
| Glove / Courier | Palm, thumb opposition and gently separated short finger tip; no parallel noodle fingers; raised crease detail | `left/right-glove` silhouettes plus finger/knuckle paths on hand joints | Distinguishable thumb at 3× crop, bag-hand grip maintained |
| Wings / Bird | Four irregular primary/secondary tips with concave negative notches; single rooted mass. Different outer sweep each wing | Original `wing-left/right` paths on separate wing joints | Feather rhythm is asymmetric, not a single blade or 4 equal scallops |
| Feather detail / Bird | Curved coverts and tapered shaft lines follow local feather flow; low density at outer tips | Separate blue / screened red spots attached to wing joint | Feathers read at small film scale without see-through body |
| Bird head/beak | Neck-to-cheek taper, modest eye ring/eyebrow arc, upper-lower beak separation in a contrasting ink | Head, eye, beak, beak division all on root | No circle-head + black dot + solid triangle simplification |
| Tail / Bird | Three different-length tips with shared feather root, directional quill | Tail joint | No floating or disconnected feathers across flaps |

**Shape graph:** courier head → hair crown → forelock and temple branches → anchored hairline; torso → shoulder folds → sleeves → forearms → cuffs → palm/thumb/finger crease; bird body → wing roots → coverts → primaries → independent ink shafts, body → tail root → feather tips. Dots/hatching are decorations and do **not** constitute anatomy.

## Verification contract

- Original source geometry remains the character's identity. No copyright material imported.
- Static frames first: portrait closeup / torso & glove / Bird wing and beak at 3× resolution, then film frames f0/f46/f78/f157/f198 plus Bird f0/f84/f160.
- Tests: every authored part mapped to source-sheet regions; each SVG path closed and finite; expression redraws actually change; wing paths preserve concavity; existing IK/opacity print contracts unchanged.
- ArtCraft's deterministic style-guided image scores require **aligned actual semantic source/render crops**. External reference paintings differ in subject and cannot ethically or mathematically be passed off as pixel-matched references. Run reproducible source-region/print-region checks; report aesthetic judgments and unsupported axes separately.
- Missing views remain unapproved: side, back, three-quarter; never claim these art studies create a 3D turnaround.

**Reference images may be visited in the URLs above but may not be copied into this repository without permission.**
