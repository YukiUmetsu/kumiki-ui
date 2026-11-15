# WC16 — Rejected watercolor portrait retirement and masterwork reference atlas

**Date:** 2026-11-14  
**Status:** REJECTED SOURCE ART REMOVED. No replacement character is approved, and no old face should render in production or Storybook. This document is a **research specification**, not a visual-quality certification.

## 1. The failure was structural, not a missing watercolor filter

The previous WC11–WC15 face prototypes (two sitters and the two-sitter film)
were rejected after actual 960×540 / 540×960 Chromium screenshots.
Important failings:

1. **False anatomy:** identical generic eye/mouth construction on both sitters;
   orbital cavities, zygomatic arch and nasal bridges did not join into
   believable planes. Unconvincing mouth corner shape and feature symmetry.
2. **Vector aesthetics:** perfect enclosing eye outlines, mechanical brows,
   smooth gradient-filled skin and neatly clipped contour ribbons.
3. **Poor paint structure:** warm cheek patches float on top of the face, noise
   uniformly covers everything and outlines are equally strong where physical
   watercolor would lose them into wet paper.
4. **Unconvincing hair and fabric:** ribbon-like scalar strokes over top of a
   flat colored mass, instead of actual strand-clump negative spaces, fabric
   folds and pigment pooling along gravity-aligned edges.
5. **Premature animation:** adding head keys and blinking to a visually
   unconvincing still simply animates the problem.

**Action:** Delete the rejected portrait demo geometry, old portrait stories,
portable example films, tests and portrait-only CI. Reject old
`person-portrait` and `watercolour-portrait-ensemble` FilmStage inputs with
explicit errors, while retaining generic watercolor pigment, wet-paper
physics, nonhuman illustrations and portable film infrastructure.

The old implementations remain recoverable in **Git history only**. They are
not templates for the replacement.

## 2. Reference atlas — works that actually show relevant face construction

This intentionally prioritizes **primary artist/publisher pages** over social
reposts. Thumbnails are hotlinked for *internal research only*, attributed to
owners, and not checked into the repository. Do not copy pixels, trace
protected facial geometry, imitate a real sitter's identity or train a model
on this material without permission.

| ID | Verified creator/work | Source | Target |
| --- | --- | --- | --- |
| R01 | **Mary Whyte**, workshop demonstration, three-quarter adult woman | [Artist's workshop page](https://marywhyte.com/workshops.php) · [source preview](https://marywhyte.com/uploads/workshop%20demo.jpg) | Eyes inset inside brow ridge; modeled nose/chin; believable hairstyle, strong shoulder-to-paper fade |
| R02 | **Stan Miller**, *Heather's Memory*, near-frontal young adult | [Artist's gallery](https://stanmiller.net/gallery/) · [real painting reproduced in Realism Today](https://realismtoday.com/portrait-of-emotion-painting-portraits/) | Asymmetric eyes, gentle mouth modeling, subtle warm-cool midtone interlocks, lost hair/background edge |
| R03 | **Stan Miller**, *Nick's Gaze*, elderly male | [Artist's gallery](https://stanmiller.net/gallery/) · [educational product depiction](https://painttube.tv/en-au/products/stan-miller-watercolor-portraits) | Complex eyebrow/eyelid pockets, lens glass, white beard with directional negative spaces, sculpted age |
| R04 | **Mary Whyte**, veteran portrait close-up | [Fine Art Connoisseur feature](https://fineartconnoisseur.com/2020/07/portraits-veterans-watercolor-mary-whyte/) | Complex real facial age, detailed eyelids, lip/cheek creases and textured light under the hat |
| R05 | **Charles Reid**, *Stevie Wonder* portrait | [Case Antiques catalog](https://auction.caseantiques.com/online-auctions/case-antiques/charles-reid-watercolor-stevie-wonder-5750120) | Broken watercolor washes, bold colored shadows, white paper reserves; no literal enclosed contour around every feature |
| R06 | **John Singer Sargent**, *Mrs. Gardner at Fenway Court*, 1903 | [Isabella Stewart Gardner Museum](https://www.gardnermuseum.org/experience/collection/10875) | Silhouette and edge economy **only**. The small shadowed head does *not* contain enough anatomy for a close-up benchmark |

**Do not give each reference equal weight.** R01/R02 are the primary younger
adult facial-form benchmarks. R03/R04 are the age and detail benchmarks.
R05 provides freer, more painterly edges *after* structure works. R06 is
specifically useful for supporting **mid-distance** shots, not 300% face QA.
None of these references constitutes an authorized source for copying a
recognizable human portrait.

## 3. ArtCraft three-scale study and feature-to-geometry matrix

| Region | Reference evidence | Macro / meso / micro construction rule | Candidate rejection gate |
| --- | --- | --- | --- |
| Head silhouette and bone map | R01, R02, R03 | *Macro:* distinct occiput, temple bulge, zygomatic turn, jaw hinge and asymmetric chin. *Meso:* place ears between brow and nose guides under perspective. *Micro:* irregular believable contour inflections | Same generic shape for all actors, symmetrical jaw, disembodied ears |
| Eyes, lids, brow ridge | R01, R02, R04 | *Macro:* eyes embedded within skull and cheek depth. *Meso:* upper/lower lid thickness, asymmetric palpebral apertures, tear duct and canthus. *Micro:* partial high-contrast lash/margin marks, eyelid fold taper and specific reflected highlight | Iris floats in white almond, symmetric repeated lashes, complete black circle around lids |
| Nose / nostril / upper lip | R01, R02, R05 | *Macro:* nasal bridge emerges from forehead rather than sticker. *Meso:* 3D side-plane and alar wings. *Micro:* nostril shadow *inside* cartilage volume, broken highlight at dorsum, philtrum merges with lips | Flat nose triangle, free-floating symmetrical nostrils, cartoon U-shaped smile |
| Mouth / jaw / expression | R01, R03, R04 | *Macro:* mouth respects perspective of muzzle cylinder. *Meso:* three-value lip separation with asymmetric mouth corners. *Micro:* only selective sharp wet edge at mouth opening | Uniform thick lip outline, centerline divided equally, fake smile with no cheek deformation |
| Hair and beard | R01, R03 | *Macro:* one attached volume anchored to skull. *Meso:* grouped clumps follow growth/flow and occlude face. *Micro:* open paper gaps and occasional hair-tips, selected sharp edges, no cross-contour uniform hatch | Smooth solid cap with repetitive sine strokes or detached white hair stickers |
| Skin volume and pigment | R01–R05 | *Macro:* five-value lighting anchored on facial planes. *Meso:* warm/cool wash overlap and reserves of luminous paper. *Micro:* local pigment pooling and granulation **only where actual wet watercolor edge requires it** | Face-wide procedural noise and random red blush patches |
| Clothing, neck, shoulders | R01, R03, R06 | *Macro:* connected neck/deltoid silhouette. *Meso:* cloth folds originate at collarbone, armpit and shoulder weight. *Micro:* hem/collar dry-brush, fabric-to-paper wet-edge bleed | Disconnected triangular lapels, equally strong contours on all sleeve edges |

**Authoring guidance:** Use a manual landmark map and a continuous source
shape/attachment graph per original character. A single color-swapped
template must never stand in for different bone and soft-tissue anatomy.
Do not write animation keys until static face passes all close-up gates.

## 4. Three hero studies before any new public face

Each study is original geometry; do not reproduce the copyrighted sitter.
All work is behind a non-public experimental fixture until reviewed.

1. **Front/three-quarter adult (R01 + R02):** separate skull and orbital
   volume in five grayscale values, then rebuild with controlled thin
   pigment. Image review: full portrait, eye crop, nose crop, lips crop at
   both 100% and 300%.
2. **Aged adult (R03 + R04):** asymmetric eyelid bags, crows-feet that
   follow volume, facial sag, beard clumps and meaningful negative space.
   Compare source and render *at equal crop and subject scale*.
3. **Loose expressive portrait (R05):** re-use a newly validated adult
   anatomical rig, but selectively lose edges, reserve warm skin paper,
   blend darks wet-into-wet and keep deliberate brush direction.

Only after static passes should a **controlled motion strip** show gaze,
blinks, subtle head turn, mouth shapes and deformed cheek attachments
with stable source geometry.

## 5. Non-negotiable quality acceptance

- Original, identity-safe anatomical source, authoring coordinates,
  uncertainty notes, and a measured correspondence sheet.
- Annotated regions for both eyes, eyelids, eyebrows, nose, mouth,
  cheekbones, chin, ears, hair and neckline. A crop without observable
  detail cannot validate that part.
- At least three real-source value bands matched in topology across
  frontal and 3/4 views; pixel fidelity is not meaningful for an original
  sitter who is *not* a copy of a reference person.
- No translucent person-shaped ghosting, no eye-disc stickers, no shared
  generic face paths and no random granular filter substituting for forms.
- Real 960×540 / 540×960 Chromium screenshots at 100% and 300%,
  reviewed for independent anatomy and watercolor edges.
- ArtCraft research, structural, topology, material and fidelity audits
  executed when applicable; distinguish **automated checks passed** from
  **artist-reviewed**. Current atlas does not claim either art approval or
  source-derived numeric similarity.
- **Do not promote a portrait to Storybook, film fixtures or the public
  component catalog until its still face is artist-approved.**
- After that: independent animation and MP4 playback acceptance.

### Current implementation state

- **Public Storybook:** `Video Production/Film Looks/Watercolour & Brush/02 Portrait Reference Atelier`. Reference images are linked to external owners and do **not** ship as assets.
- **FilmStage:** `watercolour-illustration` remains available for the
  `heron-wetland` study; previous human portrait subject and two-sitter
  ensemble now throw explicit retired errors.
- **Tests:** source-absence regression, externally credited reference
  metadata, legacy film-slot rejection and a Storybook browser comparison.
- **Unavailable:** new human characters, working portrait puppet demo,
  full-body painting/rigging, illustrated portrait film export.
