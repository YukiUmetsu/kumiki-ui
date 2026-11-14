# RISO8 — Fine-Mesh Craftsmanship and Risograph Reference Study

Date: 2026-11-14. Continuation of [RISO7's 30-work visual atlas](riso7-visual-atlas-and-source-contour-mesh.md). This audit studies further authentic Risograph printmakers and documented print animations. The third-party artworks are **study references**, not shipped assets or images to trace. All new character details below are independently authored Kumiki vector paths.

## The RISO7 defect: real outline, still huge mesh cells

RISO7 replaced artificial rectangular boundaries with measured SVG paths. That fixed silhouette fidelity, but its **ear-clipped polygons still have huge interior diagonals**: for example, a sleeve/coat can have a curved perimeter with hundreds of little boundary segments and a triangle stretching across the entire body. A precise external contour and tiny boundary vertices do **not** imply fine, evenly sized interior triangles. In RISO7, the Storybook full-character view also superimposed all ~40 region contours on every actor at once, obscuring the print. The Bird wing closeups repeated that overlay with comparatively heavy blue strokes.

### Findings from additional online Risograph studies

| # | Reference | Specific observation | Production consequence |
|---|---|---|---|
| 1 | [Strangford, *A Wing and A Prayer*](https://anindependentzebra.com/products/a-wing-and-a-prayer) and [close detail](https://bettyandthebrands.com/products/a-wing-and-a-prayer) | The owl's silhouette stays visually simple while layered quills, facial discs and repeated feather notches create its sophistication. | Maintain a **small, bounded mesh** for the physical body but keep printed feather divisions separate from anatomical topology. |
| 2 | [Esther de Korte, *Garden Birds*](https://www.risopop.com/pop-shop/garden-birds) | Three birds of different mass and tail-length design remain coherent in a two-ink scene. Spot highlights articulate wing layers without turning the characters transparent. | Draft additional accent paths with actor-specific wing attachment; preserve opaque body fill. |
| 3 | [Lou Benesch, floral bird](https://loubenesch.com/allartwork/collaborations) | The bird's patterned primaries, face and flower body overlap intentionally. Not all edges deserve equal visual weight. | Emphasize only the selected feature's fine mesh in Storybook, not every contour. |
| 4 | [Sarah Furrer, *Wistful Croon of the Crickets*](https://www.supportyourlocalartist.ch/products/safu-sarah-furrer-plakat-wistful-croon-of-the-crickets) | Dense figure linework is concentrated around eyes and eyebrows, while broad dark hair acts as a graphic counterweight. | Keep facial feature spacing and fine contour outlines readable; don't add a diagnostic web over every face region. |
| 5 | [Uma Joana, *Let's Look at the Trailer II*](https://ogaleria.com/products/lets-look-at-the-trailer-ii-by-uma-joana) | Complex hair sweeps and garment folds coexist with a quietly described face. | Source author-drawn coat-lapel and hem details rather than relying on polygon density for apparent character quality. |
| 6 | [Natalie Andrewson, *The Tailor*](https://www.natalieandrewson.com/products/collector-of-sweet-treasures-the-seamstress) | A tailor's garment construction and sewing equipment are rendered through nested lines, folds and small purposeful marks. | Introduce costume-specific lapel, hem and finger/knuckle detail as true character parts, rig-attached and independently inspectable. |
| 7 | [Hailey Algoe, Risograph originals](https://www.haileyalgoe.com/art/risograph) | A set of original illustrations varies the ink palette and line density per subject. | Avoid one universal texture or mesh grid for characters of different proportions. |
| 8 | [C.A. Hiley, *Four Pictures of Birds*](https://cahiley.com/books) | A 2026 red-and-blue bird zine mixes digital forms with brush washes; bird structure remains legible in limited inks. | Use restrained second-plate feather divisions, while measuring anatomy from shape rather than grain. |
| 9 | [Kurt Woerpel, *Sniff*](https://dev-risolab.sva.edu/news/printing-the-future-the-riso-revolution/) | Character-led sequential printed art can use intentionally chunky lines, unlike the richly feathered bird prints. | Mesh engineering must be decoupled from aesthetic style and remain customizable. |
| 10 | [Hiromu Oka's physical Risograph animation](https://www.itsnicethat.com/articles/hiromu-oka-animation-130422) and [process interview](https://www.itsnicethat.com/articles/hiromu-oka-hodo-station-process-animation-051222?cookie-preferences=true) | Motion gets printed, scanned and meticulously checked frame-by-frame. Registration/texture drift is part of the print—not a reason for rig geometry to drift. | Keep stable 2D bone coordinates and test mesh refinement on multiple poses without modifying rendered artwork. |
| 11 | [Zine Hug's printed animations](https://zinehug.com/pages/animation) | The same animated production can use hundreds of distinct frame prints while maintaining recognizability. | Test held frames, film poses, and mesh density independent of ink plate passes. |
| 12 | [2026 Riso Horse collaborative animation](https://www.residence.co/news/article/riso-horse-project-2026) | Distinct artists produced 48 frames against a consistent run-cycle template; variation in printed style did not destroy movement continuity. | Keep source-ink paths unchanged by the inspector and preserve FK/IK pose contracts. |
| 13 | [Gary Tsang, *Swallow The Universe*](https://www.behance.net/gallery/165480759/RISOGRAPH-PRINT) | Rich color separation and vivid textures surround strongly readable print outlines. | Never use translucent character-body overlays as a substitute for actual line craftsmanship. |
| 14 | [RECI feather pattern Risograph prints](https://www.behance.net/gallery/19624735/RECI-Risograph-prints) | Repeated narrow feather shapes and wavy two-ink overprinting produce detail by *design*, not random grain. | Author repeatable, tapered wing ink marks separately from structural wing mesh. |

Cross-check: [RisoLAB's physical print gallery](https://risolab.sva.edu/gallery/) demonstrates art that ranges from sparse graphic shapes to richly layered print work; [Sage College's animation process](https://sites.google.com/sage.edu/riso/animation) outlines frame → separation → print → scan → reassembly; [SPOTS (2026)](https://vimeo.com/1234898709) is a four-ink, physically printed 115-frame loop.

## Implementation priorities and acceptance criteria

### P0. Small conforming meshes, not big triangles

- Preserve RISO7's original SVG outline and its ear-clipped concave-safe base triangulation as the one source of silhouette truth.
- **Refine shared edges across adjacent triangles** until their max edge length is at or below an explicit target, with a hard bound on generated triangles. Each split edge is one shared midpoint: avoid T-junctions that would crack under future deformation.
- Generate 1, 2, 3 or 4 child triangles per source face according to its split-edge mask. Preserve orientation, area and concave exclusion; don't fill a neighboring empty feather notch.
- Expose `maxEdgeLength` through the public mesh evaluator and Storybook, with human-understandable **smaller = finer** controls. Bound passes and memory cost. The result is a 2D *diagnostic* mesh, **not** yet a persistent skinned vertex mesh.

### P0. Display only intentional information

- Do not cover the entire Courier or Bird with all-region triangle diagonals. The hero view highlights the **selected** part only; the isolated detail panel shows source silhouette and its conforming grid.
- Keep the actual print opaque, with visible dark source-contour boundaries and subdued cyan guide lines.
- When the mesh is turned off, it must actually disappear in the hero view, detail view **and** wing inset views.

### P1. Improve actual authored art, independent of mesh

- Courier: overlapping tailored coat lapels, lower-hem print fold and small attached finger/knuckle details. These are source ink paths, not computed mesh decoration.
- Bird: feather split lines, tail quill and breast plumage as restrained second-plate print details, still fully contained within opaque blue body/wing anatomy.
- Map each new path into its own character-sheet feature for source measurement; respect both characters' existing FK/IK articulation and film outline constraints.

### Storybook bug gate

Check **all five existing Risograph character Storybook stories**, not only the two newly revised model sheets:
1. Paper Courier Performance.
2. Rigging Microscope.
3. Opaque Print Proof.
4. Courier Construction & Proportion Sheet.
5. Paper Bird Construction & Proportion Sheet.

Use actual Chromium runtime-error detection, component presence, frame seeking, selectable regions and mesh-density controls. Typecheck, geometry area/edge-budget invariants, the old RISO film and knockout tests, a production Storybook build, registry validation and clean consumer installation should all pass before merge. Keep expensive browser and build checks one-off; restore **changed-tests-only CI** after qualification.

## Remaining design work

Stable correspondence of vertices over arbitrary re-animated poses, true hole/boolean mesh topology, hand/finger rigging, layered feathers and cloth drape are distinct next phases. These newly refined meshes cannot be truthfully described as volumetric or frame-index-stable triangulated surfaces. Before 3D work, obtain approved rear and side views and explicit depth construction.

**License:** Reference artworks are not redistributed or traced, and no third-party art source is imported. This repo's new illustration paths are separately hand-authored for the existing original Courier and Bird characters.
