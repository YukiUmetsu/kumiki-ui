# ArtCraft v9.1 — wax crayon on rooted hair, separate material/structure gates

**Scope:** F1 face source-registered right and left hair-curtain gestures. Experimental, not an approved portrait. F1 photograph is Christopher Campbell, [Brunette woman portrait (Unsplash)](https://commons.wikimedia.org/wiki/File:Brunette_woman_portrait_(Unsplash).jpg), CC0 1.0; source audit used its independently captured 608×1082 browser screenshot. The image establishes F1 **hair/root geometry**, not the chemical behavior of wax crayon.

## Primary observed medium references

1. **Philadelphia Museum of Art**, *Guidelines for Descriptive Terminology for Works of Art on Paper* (Ash/Homolka/Lussier, 2014), [photomicrograph figure 49](https://legacyweb.philamuseum.org/doc_downloads/conservation/DescriptiveTerminologyforArtonPaper.pdf). Differentiating feature: actual wax-crayon deposits show end-of-stroke clumping/pickup, uneven cohesive transfer and visible binder. This is a material observation, not a source of portrait anatomy.
2. **N. Crist**, *Technical Study of Roberto Matta's Works on Paper* (ANAGPIC, 2006), [wax versus pencil micrographs, figures 4–5](https://resources.culturalheritage.org/anagpic-student-papers/wp-content/uploads/sites/11/2020/04/2006ANAGPIC_Crist.pdf). Wax contacts raised paper fibers as chunkier discontinuous patches; pencil tends toward finer, more even deposits. We model that distinction, without claiming material physics accuracy.
3. **Rudolf / Mould / Neufeld**, [crayon paper friction and force deposition model](https://people.scs.carleton.ca/~mould/papers/crayon.pdf), §3.5, figure 5. Observed force-dependent wax pickup and different mark densities suggest pressure and a paper-fixed relief field belong in the material contract.

The source photograph and conservation micrographs have **different scopes**. The museum and research material is cited, not copied into the package or treated as a matching portrait. A licensed high-resolution photographed single-stroke alignment with matching paper roughness is **still missing**.

## ArtCraft structural deconstruction

| Evidence | Topology / direction | Medium observation | Implementation | Failure / negative control |
| --- | --- | --- | --- | --- |
| F1 left curtain | attached near-ear roots bend into narrow descending hair mass | longitudinal wax accents should share parent's taper | five curved, source-space guides; 85 native subcurves | random x/y scratches, disconnected spaghetti |
| F1 right curtain | roots sweep past far cheek and widen into downward locks | uneven visible pigment along selected guides | six curved guides; 130 subcurves | bright full-length digital SVG highlight threads |
| PMA fig. 49 | one stroke remains one attached gestural unit, even where contact breaks | edge/pickup clumps live at actual stroke ending | individual asymmetric filled short contact lobes, raised-paper test, seeded attached terminal pickups | global random speckle overlay |
| Crist figs. 4–5 | paper peaks produce interrupted contact | wax differs from fine pencil crossgrain | page-seeded height + pressure threshold, broken ribbon segments | uniform fine hairlines |
| Mould fig. 5 | increasing tool force increases visible pigmented area | pressure is not an opacity-only slider | `waxPressure` 0.2–1, macro contact width responds | changing opacity of one continuous vector stroke |

- **Macro:** preserve original face/hair silhouette boundaries and native 608×1082 source composition, without reusing an unrelated B1 body.
- **Meso:** keep 215 rooted curtain subcurves and 52 independent crown subcurves, six pigment/weight bands per mass, parent clipping, deterministic absolute-frame timing.
- **Micro:** `crayonWaxFiberContacts` rejects malformed or unsupported SVG geometry, samples a single paper-fixed relief function, lays uneven colored closed contact patches with actual curvature and attaches pickups at deposited endpoints. The original smooth line remains the explicit negative control, not removed from the library.
- **Scene contract:** an opt-in `CrayonContourElement.waxContact="dry-wax"` and `waxPressure` pair; other films, connectors, crown details and legacy contour lines retain their previous paths and material contract. Storybook lets artists compare both modes without adding a new folder.

## Proof protocol

- **Code/contract:** run source TypeScript typecheck and focused unit suite, including deterministic repeat, paper-seed/pressure differences, partial frame reveal, invalid SVG rejection, clipped hair, old smooth-line compatibility and registry element budget.
- **Native render:** capture original CRAYON1 **right macro and matching right line negative-control** at 608×1082 camera scale, both from the same geometry/seed/frame=299; separately capture left macro, full source and earlier frames. Compare at native 1× and material 2.15×.
- **Art:** visually inspect whether the dark wax mass, raised paper gaps, end pickups and source-guided direction survive at finished playback speed. Material local-contrast statistics alone do not certify authentic crayon. Re-run independent anatomical and source-pixel gates before any full portrait is promoted.

**Current release gate remains REJECTED.** The F1 face has known anatomical/identity defects (nostril form, iris/eyelid attachment, lip and teeth slit, chin and jaw/neck shadow) and has no independently approved 1×/3× complete-character render, wax-stroke reference match or acting/motion audit. Keep #281 draft and Storybook `!dev`; do not merge on technical CI alone.

## Native browser material A/B rejection ledger

- **V1** 608×1082 matched right hair macro, final frame 299: wax versus smooth control mean RGB absolute difference **0.352/channel**; only **2.94%** of pixels changed by more than five levels in any channel. Actual visual review rejects this as an effectively invisible material change; smooth line signatures remained dominant.
- **V2** wider true wax side contact, same scene and negative-control camera: mean RGB difference **1.263/channel**; **10.39%** of pixels changed by more than five levels and **2.15%** by more than 20 levels. Browser captured individual broader strips, but artist review **rejects** the result as nearly parallel uninterrupted tan/gold bands floating over unrelated hatch noise. Increased numerical change alone is not ArtCraft visual acceptance.
- **V3 staged correction** changes *only* the contact valley threshold and bright hair pigment values. Keeps all 215 source-directed curtain trajectories, 52 crown arcs, clips, layer hierarchy and source framing intact. Goal is to recover broken raised-fiber wax clumps and dark hair coherence without reducing semantic complexity. Must be inspected at native actual pixels and compared with identical A/B control before any claim.

**Unresolved source gap:** no independent high-resolution macro wax hair study under matching paper/pressure, no independently re-measured 18 candidate anatomy landmarks for this revision, and no accepted full portrait or normal-speed motion proof. Structural, material and artistic release gates remain distinct; **PR #281 stays draft**.
