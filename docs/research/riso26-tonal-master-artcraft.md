# RISO26 — original portrait face planes as independently screened spot values

**ArtCraft v9.1 stage:** Original source face contour preserved; physically printed tonal-master candidate. Independent identity/anatomy and print-matched image review remain pending.

## Inspected baseline and cause

Actual [RISO25 Chromium screenshots](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43744268703) include the neutral head, mouth close-up and `riso25-full-face-speech-portrait.png`. Both frontal faces have strongly visible **red polkadot patches** above the eyes, on the cheeks and near the jaw. Broad eye socket, cheek and lateral jaw panels appear to carry **the exact same screen dot radius** as if they were decorative freckles. The eyes, ears, nose and lip source paths are distinct and must stay fixed; the problem is not to solve by changing human anatomy, adding edge noise or smoothing/dropping those geometry details.

The root cause is technical and artistically meaningful: all original `RisoCharacterPart.paint === "screen"` components used one uniform `RisoPaint.dots` density per plate. Neither the original source's cheek/jaw hierarchy nor printed value differences could survive that flat stencil behavior.

### Primary reference studies

- [Fish Guts Press — actual close-up of blue/pink printed eyes](https://fishgutspress.com/collections/frontpage): readable blue eye contours remain ink-solid; varying blue and pink screened tonal coverage around the brows, sockets and the lighter adjacent facial planes. Study **local shape/dot-value relationships**, not the depicted individual.
- [Tori Kudo — eye cover art](https://pianola-records.com/products/%E5%B7%A5%E8%97%A4%E5%86%AC%E9%87%8C-tori-kudo-%E3%81%BE%E3%81%AA%E3%81%93%E5%88%87%E3%82%8B%E7%8F%BE%E5%AE%9F-7inch): high-contrast contiguous eye geometry surrounded by comparatively sparse printed freckle marks. The precise production process is not independently verified; **technique evidence**, not a physical press calibration.
- [Printed Angela Giarratana profile portrait](https://www.etsy.com/au/listing/1792373016/angela-giarratana-smosh-starkid-a4): clean mostly reserved-paper cheek area, concentrated under-eye shading and crisp nostril/ear contours. **Third-party style study** only, never a source for tracing another person's face.
- [Hot Pink Press file setup guide](https://static1.squarespace.com/static/6536646de87d8241fb0f02dc/t/696fbd3e010b245ddca95ce5/1768930622700/Risograph%2BFile%2BSet%2BUp%2BGuide%2Bby%2BHot%2BPink%2BPress.pdf): each spot ink master is independently prepared and deposited; changes in source grayscale alter printed dot-area coverage, not the color palette or sheet identity.

External images are not bundled or reprinted. Authored Courier and Paper Artist retain **their own** face geometry and expressions. The structured [reference study](riso26-tonal-master-reference-study.json) and [source anatomy/structure map](riso26-tonal-master-character-structure.json) name the exact original ink planes.

## ArtCraft five-axis construction

| Axis | Source issue | RISO26 source/press change | Negative control |
| --- | --- | --- | --- |
| Topological continuity | Flat red freckles cover unrelated facial planes. | Every original eyebrow, socket, cheek, nostril, mouth and jaw path and head matrix remains *unchanged*. The same source contours receive **physically differentiated dot coverage**. | No edited silhouette or painted sticker replacing a source feature. |
| Vector flow | Distinct eye/jaw planes cannot be read as different depths. | Orbital planes print intermediate strength; curved cheek/zygomatic and jaw planes print lighter. Tangents and stage anchors remain exactly from original source. | No global alpha filter hiding all facial red. |
| Width/edge | All screen sites produce the same dot radius even for highlighted skin. | Add **local small-circle** AM and **local lower-ranked-site** FM variants of the original physical stencil pattern. Solid fine eye/lip/ear strokes stay on their exact original red/blue master. | No CSS opacity, blur, Gaussian noise, duplicated face RGB layer or simulated transparent paper. |
| Rhythm | Equal-size dots repeat mechanically above eyes and on jaw. | Part-specific source ink values: **light 22%, mid 55%, normal 100% of global density**. All variants use identical plate seed, dot cell/angle, native stage transforms and printer registration. | No random dot motion, temporal popping, or jitter per rendered frame. |
| Microtexture | Paper grain already exists but cannot fix tone grouping. | Preserve original paper stock color, paper pores, misregistration, two-ink multiply, and sharp printed screen edges. | No texture applied over complete frame or overprinted fake transparent face. |

At Storybook default `screenDensity=.33`, normal AM circle area approximates `0.33 × cell area`, mid `0.1815 × cell area`, and light `0.0726 × cell area` (before ink gain). The **dot center and press angle are unchanged**; for FM, stable ranked sites receive proportionally lower coverage, again without moving the earlier sites. The global sliders still control mode, density, pitch and ink gain.

Production hooks:
- `registry/video/riso-character.ts`: optional validated **`screenTone:"light"|"mid"`** on `paint:"screen"` parts. Each sampled expression copies it without affecting the source SVG.
- `registry/video/print-plates-react.tsx`: generate both extra physical screen master patterns *per existing plate*, with unchanged color/angle/cell/seed/registration; pass them through optional `RisoPaint.lightDots` and `midDots`.
- `registry/video/riso-character-react.tsx`: bind each screened source part to the matched master, retaining backward compatibility for standalone old paint bindings.
- `src/video/riso-character-demo.tsx` and `riso-human-ensemble.tsx`: set lighter cheek/jaw tone on the original named anatomy source paths and intermediate tone on original orbital/temple paths. **No path drawing, mesh triangulation or pose edit.**
- Existing Storybook `OcularPrintCraft` (no new folder/page) adds **RISO26 tonal master comparison**: switch to legacy universal red dot radius or new original source-bound value hierarchy at identical pose/aspect/crop/ink mode; retain RISO24 hair and RISO25 face comparison controls.

## Acceptance and remaining gates

Unit tests `tests/riso26-tonal-press-artcraft.test.tsx` verify source identity path invariance, invalid metadata rejection, pure opaque dot-area math, AM/FM deterministic ranks, no alpha overlays, separated red/blue print masks and real per-part fill URIs. Browser proof `tests/e2e-storybook/riso21-ocular-print-artcraft.spec.ts` captures **both original faces** at 16:9 and 9:16, neutral and smile, AM and FM, before and after exact same zoom/pose, plus red-only and speech full-face prints.

Inspect actual Chromium screenshots at normal scale and detailed close-up. **Reject** if cheek shadows disappear entirely, orbits lose form, visible red dots still look like identical giant freckles, or the fine eye/lip contours are less legible. Passing TypeScript or browser screenshot inequality is *mechanical evidence*, not an independent artist approval.

Still blocked: side and 3/4 human source geometry, rights-cleared source-identity landmarks and `human_anatomy_fidelity_gate.py` proof, reviewed normal-speed 240-frame export. Release as an **incremental source-derived print craft feature**, not a certified physical press/identity-matched portrait.
