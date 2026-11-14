# RISO7 — Risograph Visual Atlas and Source-Contour Character Mesh Review

Research date: **14 November 2026**. Scope: genuine prints and documented Riso animation whenever stated; a few digital Riso-inspired illustrations are flagged. These links are **study references only**, not assets licensed for inclusion in Kumiki UI. Do not download, trace, reproduce, train on or redistribute their individual character drawings.

## Diagnosis of the previous construction-sheet mesh

Inspection of `registry/video/riso-proportion-mesh.ts` and `src/video/riso-character-mesh-sheets.ts` (RISO6):

1. **Wrong contours, P0.** 38 feature entries were authored as four-corner axis-aligned rectangles. Triangulating each box produces two triangles that may sit entirely outside the actual eye, brow, curl, jaw, wing feather, shoe or coat edge. A plausible measurement label does not make an invented box proportional to the real drawing.
2. **Two geometric truths, P0.** Skinned limbs in the character film use a rounded, overlapping **cubic-and-quadratic outline** from `risoJointSkinPath`; the mesh code independently generates a four-span straight-sided ribbon. Their silhouettes and end caps do not coincide. Rendered mesh can look attached while lying outside ink.
3. **Bad facial analytics, P0.** `eye-line` is two independent SVG paths. RISO6 assigned the **same source part** to left/right eyes yet supplied two unrelated boxes; no actual eye separation, brow/eyelid gap, face proportion or speaking-mouth size was measured from ink.
4. **Invalid triangulation, P0.** A vertex fan from point zero fills outside concave feathers, bangs and garment shapes. The number of triangles is fixed by box/cage, not by source curvature.
5. **Weak character-specific studies, P1.** The Bird wings are treated as generic four-point boxes rather than feather-edged organic silhouettes. The coat brim, buttons, stitching and bag flap are grouped rather than inspected as their own source details.
6. **Poor reference-sheet hierarchy, P1.** All-region diagonals clutter the entire actor and distract from actual line quality. The selected part panel previously showed only width/height text, not the inspected contour and mesh.
7. **Print ≠ geometry, P1.** Halftone, pinholes, plate registration and feed streaks should affect printed ink appearance, **not** change the character's canonical face or body topology. Morphology must remain stable under print effects.
8. **False 3D promise, P2.** One source projection cannot generate a truthful rear/side model. A vector-constrained **2D** mesh is useful for consistency, not depth or deformable volumetric topology.

## Curated visual atlas — 30 sourced studies

The observed/usable lesson is based on the linked published work or documented method, not permission to copy the subject. References are intentionally diverse: sparse and ornate illustration, portrait anatomy, expressive comic acting, animal silhouettes, wardrobe construction, physical-print/animation methods.

### Faces, eyes, eyebrows, hair and print-line craft

| # | Real work / creator | Art observation → measurable implementation lesson |
|---|---|---|
| 01 | [LEAD BELLY, Ziv Sameach — Good Press](https://goodpress.co.uk/products/leady-belly-by-ziv-sameach) | Scratchy character portraits, asymmetric mouth/nose decisions, loose but deliberately placed cheek/jaw contours. **Use actual curves** rather than symmetric oval/rectangular proxies. |
| 02 | [191 Riso Zine — Behance](https://www.behance.net/gallery/233260447/191-_-Riso-Zine) | Highly differentiated open mouth, eyelid, circular glasses, hair silhouette. **Measure facial subpaths separately** and preserve expression redraw geometry. |
| 03 | [TAROT ZINE — Behance](https://www.behance.net/gallery/96806545/TAROT-ZINE) | Layered eyebrow hairs, separated eyelid/iris, dark lip hierarchy and cutout highlights. **Contour-specific feature landmarks**, not a single broad face cage. |
| 04 | [Clément Soulmagnon, editorial & personal illustrations](https://clementsoulmagnon.com/editorial-personal-illustrations) | Spot-colored portrait with facial white space, eye/ear/nose placement and narrow stylized silhouette. **Compare actual head to facial-part distances**, preserve paper-colored face. |
| 05 | [Fish Guts Press — Halftone portrait process](https://fishgutspress.com/collections/frontpage) | Dense blue/pink halftone shapes with separate hair and eye contours; even tints are not equivalent to transparent line art. **Do not feed print dot density into anatomical mesh**. |
| 06 | [Silly Gooze Editions — Expressive portrait zine](https://www.sillygooze.co.uk/ourservices) | Highly exaggerated mouth/face shapes, sketch-hatched brows and individual hand gestures. **Support multi-keyframe contours and nonrectangular outlines**. |
| 07 | [Fleshy Fashion — Risograph zine](https://tanmoyux.github.io/ff.html) | Distinct eye proportions, eyelash/hair spikes, ears and streetwear edges rendered in two colors. **Preserve small concavities and sharp line corners**. |
| 08 | [Coffee & Castoffs — Into My Sketchbook](https://coffeeandcastoffs.shop/products/into-my-sketchbook-risograph-zine) | High-density panel storytelling; face features and dialogue must remain legible at small physical sizes. **Line and form readability outrank more halftone noise**. |
| 09 | [RisoLAB / SVA archive](https://risolab.sva.edu/gallery/) | Broad set of real limited-palette ink studies, from pale hair silhouettes to fine multicolor detail. **No single canonical Riso 'look'; author-specific feature geometry is essential**. |
| 10 | [Nichole Shinn — Portrait Styles](https://nicholeshinn.com/printedmatters/) | Portrait studies embrace deliberate simplification, varying line/density choices. **Design normalized relationships per character, never universal human proportions**. |

### Arms, clothing, hands, movement and accessory structure

| # | Real work / creator | Transferable structure and review target |
|---|---|---|
| 11 | [Kenn Lam — Risograph Catalogue](https://www.behance.net/gallery/213940917/Risograph-Catalogue) | Flowing striped dresses, elongated limbs, high-contrast dance poses; **concave drapery edges** must not be filled across by fan triangles. |
| 12 | [Hi_Res Spread #4 — Behance](https://www.behance.net/gallery/11913045/Hi_Res-Spread-4) | Long stylized garment contours, layered negative-space cutouts, print overlaps; **separate garment silhouette from inset decorations**. |
| 13 | [Elena Maria Knittelfelder — Printed checkered-coat character](https://www.behance.net/gallery/243846539/felt-Benito-might-delete-later) | Strongly recognizable silhouette from hem to shoes, visible hand/coat/scarf separation; **measure sleeves, wrist openings, shoes and garment hem individually**. |
| 14 | [Rosie Leech — Squash Grower (CLUSTER)](https://www.cluster-london.com/getting-to-know-rosie-leech-cluster-illustration-artist-in-residency-journal-2021) | Loose hands and a checkered coat in a sparse narrative vignette; **follow actual cuff and finger contours** without mechanically uniform cylinders. |
| 15 | [Michael van Kekem — hand-cut shape zine](https://peopleofprint.com/illustration-2/michael-van-kekem-riso-zine/) | Physical paper-cut silhouettes scanned as separate printed layers; **measure source boundaries and islands**, not guessed bounding rectangles. |
| 16 | [Kristen Liu-Wong — Risograph prints](https://www.kristenliuart.com/prints) | Distinctive character outlines and dense graphic patterns; **keep detailed graphic motif geometry separate from structural limbs**. |
| 17 | [Joakim Ojanen — Klumpfot & Puckelrygg](https://konstigbooks.com/art/9789198960167.html) | Expressive thin limbs, distorted heads and playful body language; **anatomy is intentionally nonstandard** and must not be corrected to generic proportions. |
| 18 | [Sarula Bao — Spring Style cover, The New Yorker](https://www.newyorker.com/culture/cover-story/cover-story-2023-03-27) | *Digital/editorial Riso-like visual grammar; physical Riso process is not verified.* Detailed sneaker geometry, garment draping and opposing leg poses; **study figure readability, not infer print provenance**. |

### Birds, feathers, tails and nonhuman anatomy

| # | Real work / creator | Transferable structure and review target |
|---|---|---|
| 19 | [Garden Birds — Esther de Korte, Riso Pop](https://www.risopop.com/pop-shop/garden-birds) | Birds expressed by different body, wing, tail and beak silhouettes using a tiny palette. **Each feather/wing uses concave vector contour study**. |
| 20 | [A Wing and A Prayer — Strangford](https://anindependentzebra.com/products/a-wing-and-a-prayer) | Close-packed wing feather pattern, distinct facial disk and head orientation. **Keep feather-edge notches, wing attachment and facial scale**. |
| 21 | [Autumn Owl — Vicki Johnson, Printer Johnson](https://www.printerjohnson.com/products/printer-johnson-vicki-johnson-autumn-owl-risograph-print-a3) | Numerous feather contours and eye rings integrated with botanical masses; **interior ink detail should not be mistaken for body mesh**. |
| 22 | [Enchanted Forest — Melissa Castrillón](https://www.melissacastrillon.shop/category/riso-prints) | Interlocking hair, feathers and tree curves; **preserve organic centerline silhouette and separate foreground/background occupancy**. |
| 23 | [Lou Benesch — Bird collaboration](https://loubenesch.com/allartwork/collaborations) | Layered scalloped wings and highly abstract bird shapes. **Nonhuman characters need source-driven topology, not human rig cages**. |
| 24 | [Waddle I Do — Duplikat Press](https://nationalparkprintshop.com/products/waddle-i-do) | A simple rounded body supported by repeated complex feather motifs. **Retain the body exterior and treat nested feather patterns as an independent print detail layer**. |

### Real printed animation, registration and temporal craft

| # | Animation / process source | Transferable procedural lesson |
|---|---|---|
| 25 | [Zine Hug — Riso Animation + Crushed/Wind](https://zinehug.com/pages/animation) and [Crushed contact sheet](https://zinehug.com/products/crushed-contact-sheet) | Many discrete printed redraws; facial expression/neck/eyes change between actual cels. **Sample the expression-replacement SVG at each held frame**, not the rest silhouette. |
| 26 | [SPOTS — Yiqin Ma, 2026](https://vimeo.com/1234898709) | Four-color, 115-frame Riso printing exploring organic shape transformation; **the deformation model should honor contour sequence across frames**. |
| 27 | [Philip Bell — Risograph Motion](https://philipbell.art/risograph-motion.html) | Programmed geometric animation printed/scanned with uneven, streaked ink. **Separate geometric movement from physical texture effects**. |
| 28 | [Chado — Dominica Harrison](https://www.nicaharrison.com/chado-dreaming-in-texture-at-bath) | Real printed-film grain and subtle texture movement. **Printed frame texture may vary without disturbing construction mesh**. |
| 29 | [Sentimentals — Sam Lee, Society of Illustrators](https://societyillustrators.org/illustrators-65/sentimentals/) | Digitally animated and >300 frames physically printed. **Character features remain readable under changing physical ink artifacts**. |
| 30 | [Megan Chong — Riso Animations](https://www.meganchongdesign.com/work/riso-animations), [John Kitses — Risograph Animations](https://kitses.com/risograph-animations/) | Printed stop-motion and watercolor-to-print reconstruction. **Keep shape samples deterministic and anchored to the evaluated rig pose**. |

Additional technique cross-checks: [Ms. Registration studio screening guide](https://www.msregistration.studio/risources) distinguishes AM/fixed-angle halftone from FM/stochastic graining; [RisoLAB SVA gallery](https://risolab.sva.edu/gallery/) demonstrates art styles outside the simplest flat 2-color zines; [Christina Sayut's random actor](https://christinasayut.com/random-actor-1) documents digital video → physical Riso frames; [SVA's animated penguin](https://sva.design/projects/16019/riso-animation/) shows nonhuman acting; [Lemo-Opuscar's Risograph demo](https://lemomo-ai.github.io/lemo-opuscar/styles/risograph/) is a digital style-engine comparison and **not proof of physically printed frames**.

## Implemented P0/P1: RISO7 source-contour mesh

1. **SVG truth:** replace 38 rectangular proxy cages with the original authored SVG part paths. A deterministic path flattener supports M/L/H/V/C/S/Q/T/A/Z and relative forms; cubic/quadratic curves use an error-limited subdivision, arcs use the standard SVG endpoint-to-center conversion. Each animated frame uses `evaluateRisoCharacter` resolved path **and its transform**, so IK/facial redraw motion is not approximated twice.
2. **Correct features:** left/right eyes reference **different subpaths** of `eye-line`; the coat crown/brim, upper/lower coat buttons, stitching and satchel flap receive independent region IDs. All metrics derive from source coordinates rather than hand-invented box extents.
3. **Concave topology:** ear-clip the sampled exterior silhouette instead of a fan or a four-span ribbon. An L-shaped notch, curved hair/coat/feather outline and skinned limb share the same math. A bounded vertex count and total source path length protect runtime use; no third-party geometry package needed.
4. **Measured relationships:** per-character H derives from the real SVG face/head height. Named eye spacing, brow-eye gaps, nose-mouth distance, hair-to-face spacing, wing span, eye-beak distance and costume ratios are measured in the actual posed frame and normalized by H.
5. **Presentation:** nonselected regions show quiet contours; the selected shape has a precise enlarged isolated cutout with its own triangle fan visualization, actual sample/triangle count and surface area residual. Extra dimensions and pose references remain printable in SVG.
6. **Honest limitations:** no claimed automatic 3D surface, 3D depth, hidden hair layers or rear-side view; fill holes, multiple overlapping closed subpaths and self-intersections remain **separate authoring problems**. The mesh describes the chosen source silhouette, not synthetic joint volume or unmodeled hand/finger parts.

## Next-pass priorities after RISO7

- **P1:** True per-part multi-island / cutout-aware vector mesh (e.g., figure-eight/hollow buckle and interior negative-space holes), with winding-rule hierarchy rather than a single largest outer loop.
- **P1:** Treat feather and clothing construction as *layered graphic anatomy* with artist-labeled structural landmarks and fold/feather paths, not a dense all-edges triangulation overlay.
- **P1:** Frame-to-frame vertex correspondences for consistent skinning and smooth interpolation. Current samples are individually curve-flattened per pose and may change vertex count; appropriate for **measurement** but **not** yet a UV- or weight-stable deformation mesh.
- **P1:** Add expressive acting: eyebrow/eyelid/nose/mouth variants at close-up, true garment fold paths in bend poses, small hand/grip redraws, detailed feather layers.
- **P2:** Actual physical Riso scan reference gamut, per-plate screening/stochastic grain, bounded registration/trapping QA and texture temporal consistency tests. Texture must not masquerade as geometry.

**Copyright / provenance:** Links are research references only. No downloaded illustrations, screenshots, fonts, source files or traced paths are bundled. Character meshes are derived exclusively from original Kumiki-UI vector artwork authored in this repository.
