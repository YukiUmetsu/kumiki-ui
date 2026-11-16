# ArtCraft F1 — scleral wax contact / photographed orbit negative control

Date: 2026-11-15 · **Status: experimental / artistically UNAPPROVED** · Draft [PR #281](https://github.com/YukiUmetsu/kumiki-ui/pull/281).

## Reference acquisition, rights, and source observation

1. [Christopher Campbell, *Brunette woman portrait*, Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Brunette_woman_portrait_(Unsplash).jpg) — photographed 21 October 2015, published before Unsplash's June 2017 license change and listed by Commons as CC0 1.0. Face identity follows the existing fixed **608×1082 browser screenshot** and 18 independent source-point records, **not** a reinterpretation of the original 5,184×3,456 camera photograph. Do not silently substitute the camera photograph as an equivalent pixel baseline; its orientation/crop differs.
2. [Philadelphia Museum of Art, *Guidelines for Descriptive Terminology for Works of Art on Paper* (2014), p. 44](https://legacyweb.philamuseum.org/doc_downloads/conservation/DescriptiveTerminologyforArtonPaper.pdf) — wax crayons are identified by uneven cohesive deposition, terminal pickup/clumps and visible binder, rather than clean digital lines. The museum's photomicrograph illustrates the material's **heterogeneous** paper contact.
3. [Rudolf, Mould & Neufeld, *A Bidirectional Deposition Model of Wax Crayons* (2005)](https://doi.org/10.1111/j.1467-8659.2005.00826.x) — pressure, paper-height contact, friction, removal and redeposition produce stroke-dependent wax behavior. This F1 experiment **does not claim** full physical replication.

All reference photographs are linked for study; no third-party image pixels are bundled in the drawing. The candidate scene retains purely authored geometric wax deposits.

## Five-axis deconstruction: eyelid/sclera/iris

| Axis | F1 observed/required feature | Native rendering decision | Failure condition |
| --- | --- | --- | --- |
| Topological continuity | scleral body enclosed by canthi and lids; iris entirely inside sclera | new near lateral + medial and far lateral occlusion planes are children of the corresponding original sclera, separately clipped | independent sticker, or pigments crossing eye aperture |
| Vector flow | upper and lower lid cast moves around the eye's oblique optical curvature | three tapered cubic/quadratic pigment footprints follow **each local eye boundary**, not a single centered ellipse | horizontal uniform stripe or unrelated radial hatch |
| Edge characteristic | softer contact transition *within* a distinct opaque eyeball | opt-in open-wax feathered **pigment** deposits over opaque inherited sclera | aliased polygon mask, gray wash crossing hair/skin |
| Width/rhythm | asymmetric partial side shadows; near and far eyes are different scales | two unequal near deposits and one shorter far deposit, 2.8–3.8 unit feather; low-density narrow side-nib contact | equally spaced artificial eyeliner or enlarged round doll iris |
| Tactile microtexture | intermittently attached wax over raised paper tooth | `stroke-built`, pressure .39–.44, local grain and contact pickup; no photo overlay | airbrushed transparent smear or synthetic unbounded speckles |

These are manually authored *hypotheses* about matching the source; measured source-space points are unchanged. A passing structural/topology test is **not** a visual source-fidelity pass.

## Implementation and falsifiable comparison

- In `src/video/crayon-artcraft-cc0-face.ts`, the optional `eyeContact` study control defaults to `"source-shade"`; `"baseline"` returns the **exact** prior semantic element sequence with zero new pigment objects. The three new regions are drawn after opaque sclera and before original irises, pupils, lid and hair occluders. No original feature IDs, color gradients, paths, camera framing or animated timings were removed or simplified.
- Existing **Video Production / Film Looks / Crayon / ArtCraft Adult Face Lab** now exposes a source-shaded/baseline dropdown beside the original 608×1082 photo comparison and independently selectable near/far eye camera. No new Storybook folder.
- New Vitest asserts exact equality of all previously existing elements under the A/B control, source-rooted parent/clipping, 3 new feathered masks, timed ordering, full/low-detail validity, invalid-option rejection and rendered SVG presence.
- New native Chromium A/B test renders both settings at the same 608×1082 near-eye inspection camera, seed and frame **299**, saves two PNGs and checks the screenshots are not byte-identical. The existing full-film browser proof also covers the now **23** opt-in pigment feather masks.
- The negative control tests material effect, **not** comparative beauty. Pixel difference alone cannot certify less-bright sclera or better anatomy.

## Artistic release checklist (blocking)

- Inspect actual original F1 screenshot vs rendered baseline vs candidate at native 1× and at the documented 2.95×/3× ocular cameras. Reject if canthus/sclera looks like a flat brown wedge, edge mask or recolored eye ring.
- Independently annotate the candidate's tear ducts, exposed scleral slivers, iris boundaries, and lid cast; compare to source and re-run the ArtCraft portrait/edge/tonal gates on **identical** source/render crops. Record hashes for the exact assets used; photo-versus-crayon SSIM is only a regression signal.
- At frames 143, 170, 194, 237 and 299 verify pigment order, no premature mask flashes, and correct parent attachment; inspect source-native film at playback speed and 9:16/16:9 output where supported.
- Continue with source-shaped lash *clusters*, cheek/nasal planes, natural iris wax and jaw/neck connection after a new actual-pixel artistic review.

**Decision:** keep PR #281 draft and `!dev`, unmerged until the independent art/fidelity/motion gates pass. Automated tests only establish an experimental starting point.
