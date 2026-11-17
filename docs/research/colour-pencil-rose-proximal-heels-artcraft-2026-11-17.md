# CP-F1 × FLORA1 — Two source-rooted Rosa proximal lamina heels (ART HOLD)

**2026-11-17 | Unapproved, experimental.** The native 960×540 45-region rose remains diagrammatic: two front petals taper toward pointed downward ends, large side separations from the sepals remain, and the inner whorl is too concentric. The merged hypanthium repair (#619) corrected one underlying receptacle wall, but did not establish a photographic flower match. This study addresses ONLY the shape of the lower two frontal petal heels.

## Authentic technique and morphology references (no imported art)

- **Mustang Joe / Joe deSousa, Pink Rose (2024), photograph, CC0** — https://commons.wikimedia.org/wiki/File:Pink_Rose_(54027095207).jpg . Wikimedia Commons reports reviewed Flickr CC0 provenance. The original oblique petal macro shows a broad bending proximal pink lamina, a distinct curving inturned free edge, and weak broad highlight rather than a pointed cut-out. Photo is NOT geometrically registered to this stylized face; the photographed bottom edge is partly cropped, and all hidden organs remain unmeasured.
- **K. R. Robertson, Illinois Natural History Survey, Rosa longitudinal floral section** — https://www.life.illinois.edu/help/digitalflowers/Flowers/56.htm . The supporting receptacle is continuous with the floral axis; front petals bend around it but cannot become free-floating triangles.
- **Ann Swan, botanical original coloured-pencil portfolio** — https://annswan.co.uk/ . Directional veins, layered pigments and differing edge-hardness are technique observations, not copied strokes.
- **Existing native artwork** — PR #619, 16:9 full45 screenshot and 2.15× junction macro. Both still have artificial front petal ends, a separate problem from the cup.

**Rights:** third-party pages are credited; no pixel, photographed contour, texture, download, mask, or artist path is bundled, traced, sampled or redistributed. New Bézier geometry and dry-pencil paths are hand-authored in original rose coordinates. This is not a documented cultivar, flower species ID, measured photo registration or certified botanical realism.

## Topological deconstruction before editing

| Property | Observation | Native CP-F1 implementation |
|---|---|---|
| One physical lamina per front | Broad convex midsection narrows into a basal turn but not an isolated swordlike triangle. | Replace exactly two existing physical facing source paths, not add regions. |
| Shared upper fold | Front and existing underside share the upper hinge; discontinuity destroys thickness. | Both proposed paths begin with the byte-exact original hinge from ROSE_FRONT_LAMINA_VOLUME and ROSE_PHYSICAL_FOLDS. |
| Nonmirrored lower return | Proximal curls are asymmetrical. | Left hand-curved return extends to x249,y279 through a broad x223,y274 heel; right returns from x251,y280 to x242,y272, with different turning radii. |
| Cuticle micro detail | Paper tooth, pigment seeds, scratches, pressure, upper petals and serrated leaves must persist. | Append 3 independent short, timed dry-pencil fibres per changed region; retain every prior volume contact and detail. |
| Physical root | Green receptacle stays behind corolla; no green fill over genuine sepal openings. | Requires previous roseCalyxStudy, rosePhysicalFolds, roseFrontLaminaVolumeStudy, roseHypanthiumAttachmentStudy. Do not change stem, receptacle, five sepals or z-order. |
| Reversibility | Do not silently change defaults. | roseProximalHeelStudy=false; Storybook control disabled until prerequisite studies, A/B restoration in both 16:9 and 9:16. |

## Acceptance contract

- Same 21 original regions in anatomy-only composition and 45 in complete optical composition. Only petal-front-left and petal-front-right path d changes under the switch; other region paths, materials, draw order and geometry remain.
- No new image, foreignObject, blur, extra painted overlay, artificial alpha sticker or runtime dependency. Existing frame-addressed dry-colour deposits remain deterministic under arbitrary seeks.
- Capture 960×540 and 540×960 old/new/restored native pixels, source-native 2.15× right heel and complete all45 renders. Code checks do not certify reference likeness; review actual screenshots.
- **Release gate: ART HOLD, disabled by default.** Bloom still resembles a geometric cup; lateral empty areas may reflect true sepal gaps, but specimen-matched verification is absent. No independent source-image landmark or value registration.

## Next artistic priorities

1. Source one rights-cleared same-pose flower showing full corolla, five sepals, hypanthium and pedicel. Record source SHA-256, annotate real exposed anatomical edges separately from occluded regions.
2. Measure native silhouette ratios, interpetal occlusion, root and negative spaces, local value, highlight frequency and pigment density against that photo at matching crop and pose.
3. Rebuild concentric inner whorl and repetitive midtone edges without dropping microtexture or organ hierarchy; only promote independently reviewed art.


## Supplemental rights-cleared morphology references and native visual review

Two independently authored Wikimedia Commons photographs were inspected as complementary morphology references, not as same-pose registration targets:

- **Nebula Alchemist, P1.1.2014.jpg (CC0 1.0, 3,264 × 2,448):** a front/three-quarter open red rose with visible green sepal bases and a short stem. Useful for the corolla-to-calyx transition and overall petal overlap; the photographed cultivar, pose and lighting do not match this stylized rose. https://commons.wikimedia.org/wiki/File:P1.1.2014.jpg
- **Rillke, Rose rosa.jpg (CC0 1.0, 1,920 × 1,799):** a pink double rose in side profile with a visible petal skirt, sepals and stem. The Commons record explicitly notes colour correction, crop and resizing; use only as qualitative evidence for side-facing lamina and sepal relationships. https://commons.wikimedia.org/wiki/File:Rose_rosa.jpg

Neither source has been annotated with independently measured landmarks against the current drawing. No image bytes, pixels, masks, extracted colour samples or traced paths are bundled. They do not certify the present drawing or close the source-fidelity gate.

**Native browser review of PR #621 exact head \`2fb3159623d2fd2f733541c75feb7c96a5c89bf6\`:** the landscape and portrait 1× screenshots show a subtle, localized change at the two frontal heels; the right 2.15× macro shows a broader, rounder proximal return and preserves its existing upper hinge and underlying cup. The overall flower still reads as a stylized vector construction: the center remains overly spiral/concentric, the frontal faces remain comparatively planar, and lateral sepal apertures are not source-validated. This is a contained anatomy experiment, **not** an artistic acceptance. Keep \`roseProximalHeelStudy=false\` by default and retain **ART HOLD**.

The follow-up browser proof additionally captures old/new 2.15× macros for **both** left and right heels in both aspects, and asserts each changed crop differs from its own original while the full drawing restores byte-identically with the option OFF.
