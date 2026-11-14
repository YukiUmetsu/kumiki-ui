# RISO8 — Fine-detail mesh and character printcraft reference review

14 November 2026. Additional research following [the RISO7 atlas](./riso7-visual-atlas-and-source-contour-mesh.md). Third-party images are visual references only: no copying, tracing or bundling their art.

## New reference set and actionable observations

| Source | Specific observed craft principle | What to improve in Kumiki |
|---|---|---|
| [Katsuya Terada — Hot Pot Girl + Gary the Cat](https://www.giantrobot.com/products/katsuya-terada-hot-pot-girl-gary-the-cat-risograph-cream-paper) | Extremely fine but **intentional black/ochre contour hierarchy**; hair, eyes, mechanisms, and costume do not share identical line thicknesses | Reduce conspicuous geometry-guide strokes, preserve thin eyebrow/face details and separate clothing features |
| [Natalie Andrewson — Flora Summoner](https://www.natalieandrewson.com/products/flora-summoner-large-risograph-print) | Embroidered garments, ringlets, bands, fine feather shapes and articulated hands are rendered at **several nested spatial scales** | Add physically attached costume folds, hair lines and feather rachis/detail paths; microfacet mesh must not be mistaken for artwork |
| [Vicki Johnson — Autumn Owl](https://www.printerjohnson.com/products/printer-johnson-vicki-johnson-autumn-owl-risograph-print-a3) | Feathers gain volume through nested lobes, tapered marks and directional texture, while face remains readable | Layer meaningful wing/tail microstructure; avoid a few giant triangles as the only feather anatomy |
| [Esther de Korte — Garden Birds](https://www.risopop.com/pop-shop/garden-birds) | Graceful strong bird silhouettes with fine accent marks and carefully preserved paper cutouts | Source wing shapes must remain the outer contour; any new detailed marks belong **inside** the wing silhouette |
| [Strangford — A Wing and a Prayer](https://anindependentzebra.com/products/a-wing-and-a-prayer) | Repeating narrow feathers and concentric eye/face contours remain clear with a single deep ink | Accumulate detail in isolated artwork paths, not by overlaying a thick mesh over the entire actor |
| [Hiromu Oka — handmade Riso animation](https://www.itsnicethat.com/articles/hiromu-oka-animation-130422) | Hundreds of printed frames give expressive analog motion; static flat overlays would lose material continuity | Ensure mesh/landmarks follow exact held SVG exposure and preserve print ink/knockout order |
| [Greer Stothers — Field Museum Permian extinction](https://www.greerstothers.com/portfolio) | Separately printed midground, animal and foreground layers enable convincing 2.5D movement | Separate the character's canonical shape and diagnostic cage from paper grain and composite layers |
| [Tianying Yu — Riso nature animations](https://www.itsnicethat.com/articles/tianying-yu-illustration-discover-250225) | Soft halftone and misregistration coexist with small readable animal features and cinematic motion | Keep tiny facial detail legible while controlling the triangle overlay's opacity and scale |
| [Helen Lin — Face Pants Riso animation (2026)](https://helen-lin.com/work-details/face-pants) | The artist explicitly notes registration difficulty and losing delicate line detail at small print sizes | Visually test at Storybook export scale; let the user hide mesh entirely; do not expand contour stroke for visibility |
| [John Kitses — Risograph Animations](https://kitses.com/risograph-animations/) | Painted backgrounds, animated independently, then color-separated on real paper | Do not bake halftone or background texture into character geometry |
| [Philip Bell — Riso animation workshop](https://www.risopop.com/workshops/riso-animation) | Source frame → plate separation → print/scan sequence; color and physical print texture are deliberate separate passes | Keep mesh as analysis metadata, not as a print plate |
| [Valerie Baudrier — Riso animations](https://valeriebaudrier.com/motion/riso-animations) | Registration and small material irregularities vary between frames | Frame geometry is deterministic; registration distortion is rendered after structural artwork |
| [Megan Chong — Riso Animations](https://www.meganchongdesign.com/work/riso-animations) | Small discrete physical shapes change with rhythm, rather than uniform computational noise | Maintain meaningful exposure-driven motion and avoid jittering the mesh each frame |

## Measured RISO7 weaknesses

- **Huge triangles** relative to the face/hand: convex and concave contour triangulation is **boundary-constrained** but leaves wide interior faces. The narrow face/wing outline may have many adaptive vertices while the middle of the cheek, coat, wing and thighs still has large empty polygonal wedges.
- **Large graphic intrusion**: selected geometry uses thick red dashed 2.4-unit outlines and default 1.1-unit mesh strokes. A line thicker than an authored eyebrow can visually compete with the ink. Repeating every face/wing triangle in the main actor looks like a technical drawing instead of a premium print.
- **UI exposes no mesh-resolution choice**. A single density cannot work at both thumbnail and facial-study scale.
- **Performance concern**: a dense interior mesh must have an explicit triangle budget, safe deterministic subdivision, and avoid re-evaluating dense triangles for small pose thumbnails.

## RISO8 implementation contract

1. Preserve exact source contour paths/curves. Refine **only the interior analytical triangulation**, not the ink paths or their bounds.
2. Use the **conforming shared-edge refinement already on main**. Split both adjacent triangles whenever an edge is subdivided, avoiding hanging midpoints and retaining source silhouette and area. Respect the existing per-region triangle budget (default 950), and report when the edge target cannot be reached within that budget. The new focused mode refines only the selected anatomical region at requested density.
3. Default the Storybook slider to a smaller **5 drawing-unit edge target** (available range 2–14). This is deliberately in the character's drawing units rather than a viewport-dependent or fabricated 3D measurement. A density change must never alter the character's ink silhouette, reference proportions, expression pose or animation frames.
4. Reduce stroke and annotation opacity; only emphasize the selected anatomical region, not every limb all at once. Enlarge only the small isolated part in the inspector.
5. Cache the three pose-thumbnail geometry reports using the existing coarse 200-unit target, since thumbnails show the actual ink and do not need dense diagnostic meshes.
6. Regressions: triangle budget, area conservation, no triangles in concave notches, finite coordinates, original RISO paper knockouts, head/feature metrics invariant to mesh density, real browser tests switching density/visibility and export.

## Limits and follow-up craftsmanship

Refined faces represent a **2D diagnostic tessellation**, not an independently weighted/UV-persistent 3D mesh. The shared-edge algorithm preserves conforming triangulation, but does not itself create structural anatomy, garment seams, hand fingers, feather row branching, holes/boolean cutouts or frame-to-frame vertex correspondence. These need source-art and explicit regional model work, respectively. Riso-specific fine line/feather marks should be authored as a separate expressive artwork layer and kept subordinate to the ink silhouette; adding fine triangles alone is not a substitute for beautiful art.
