# Chinese ink character reference study — Ming/Qing portraits

**Date:** 2026-11-17 · **Workstream:** ANAT5 · **Purpose:** Create three new Chinese-ink character studies from museum references, using ANAT1 anatomy and EXPR1 facial expression. This is a fresh redraw, not a modification of ANAT2/ANAT3 or the existing Shanshui cast.

## Rights-cleared references

The Metropolitan Museum of Art identifies the following works as **Public Domain**. Storybook will link to the official Met IIIF image service and object records; source images will not be traced or modified.

| Source | Study observations | Evidence |
|---|---|---|
| [Twenty-five bust portraits of famous scholars](https://www.metmuseum.org/art/collection/search/51810), unidentified artist, Ming dynasty, 16th–17th c., handscroll, ink and color on paper, object 55.37 | 25 distinct heads; variation in face width, lower-face length, brow rhythm, beard mass, hat height, gaze and collar silhouette. The Met notes a dark-bearded, tall-black-hat figure near the end but does not identify him conclusively. | [IIIF crop A](https://collectionapi.metmuseum.org/api/collection/v1/iiif/51810/197276/main-image) · [crop B](https://collectionapi.metmuseum.org/api/collection/v1/iiif/51810/161536/main-image) |
| [Woman at her dressing table](https://www.metmuseum.org/art/collection/search/910543), attributed to Leng Mei, early 18th c., hanging scroll, ink and color on silk, object 2024.180 | Seated writer and standing attendant have different head inclinations, gaze directions, hair arrangements, garment overlaps and hand-to-object relationships. The Met notes the inkstone and water pot as evidence that the seated subject is a writer. | [IIIF image](https://collectionapi.metmuseum.org/api/collection/v1/iiif/910543/2250417/main-image) |
| [Portrait of a Lady](https://www.metmuseum.org/art/collection/search/48936), unidentified artist, late 16th–early 17th c., Ming dynasty, ink and color on silk, object 51.39.1 | Formal portrait reference for head/neck alignment, head-to-robe scale, broad sleeve mass and negative space. The available image is monochrome; no color claims are derived from it. | [IIIF image](https://collectionapi.metmuseum.org/api/collection/v1/iiif/48936/164539/main-image) |
| [Scholar in the Wind](https://www.metmuseum.org/art/collection/search/49460), Ren Xun, ca. 1880, Qing dynasty, ink and color on alum paper, object 1986.267.45 | Movement benchmark, not a face/likeness source. The Met describes animated outline strokes and rapidly turning, modulated contour lines that make the heavy robe twist and flutter. | Museum object record and curatorial description. The IIIF endpoint did not return a reliable preview in this pass; no pixel-level contour measurements are claimed. |

## Observations before drawing

### Scholar busts — object 55.37
- This is a sequence of individual heads, not one face repeated with recolored caps.
- Hairline, hat crown and face silhouette are separate contours. The tall black hat counterbalances the dark beard; it is not a generic rounded cap.
- Beard construction needs a soft substrate plus individually rooted, directionally varied fibers. The moustache-to-cheek and moustache-to-chin transitions remain legible.
- Eye and brow shapes vary between sitters. No identity is asserted because the original labels were removed.

### Seated writer and attendant — object 2024.180
- The seated writer has a lowered inward gaze and compact head-to-shoulder relationship; the standing attendant leans toward her with a distinct head angle.
- Hair consists of pinned masses, ornaments and fine escaping strands, not a single polygon.
- Garment structure comes from overlapping collar planes, sleeve volumes and folds attached to shoulder/elbow/wrist direction.
- Hands participate in a hand-to-object action. This increment is a portrait/upper-body foundation and does not claim a completed hand reconstruction.

### Formal portrait and wind figure
- The formal portrait supplies a comparative head/neck/robe proportion and negative-space reference.
- Ren Xun's wind figure supplies a movement grammar: garment contours change curvature and width with direction and pressure. Repeated parallel stripes would lose the movement.

## Construction contract

- Use ANAT1's 468-vertex face surface and named craniofacial landmarks for skull mask, eyes, nose, lips and jaw.
- Use EXPR1 action-unit deformation for neutral, smile, sad, surprise, fear and angry states across all three new characters. Expressions move landmarks and eyelid/lip topology; they do not swap decorative mouth stickers.
- Create three independent source-informed landmark morphs: scholar, writer and attendant. These are hand-authored visual-study ratios, not population norms, clinical measurements or ancestry claims.
- Project the actual 3D face mesh at distinct yaw angles; preserve near/far eye foreshortening and asymmetric contour.
- Draw cap, pinned hair, ears, beard, neck, collar and robe as independent attached layers.
- Chinese-ink treatment uses paper reserve, irregular low-opacity wet washes, broken contours, variable brush pressure and separately rooted hair/beard fibers.
- Reject flat face stickers, hard nose U-shapes, beard triangles, generic cap trapezoids and mechanical cloth stripes.
- This is a style-guided original redraw, not a pixel-matched copy or identity reconstruction.

## Validation and remaining limits

Vitest covers source-specific geometry, ANAT1/EXPR1 linkage, expression changes, semantic part markers, invalid controls and finite output. Storybook provides the source atlas, live controls and six-state expression strip. Playwright covers navigation and live interaction. CI/browser evidence is necessary but not artistic acceptance; final 1×/3× source comparison and normal-speed animation review remain separate human visual gates. The existing Shanshui cast is not replaced or approved by this study.


## Second reference pass — additional Ming/Qing portrait and attendant sources

The Storybook reference board now includes **eight image views from seven distinct objects**. The four new objects were inspected independently rather than treated as generic costume inspiration.

| Source | Rights / object data | New observations and intended use |
|---|---|---|
| [Jiang Yun, *Portrait of a Man*](https://www.metmuseum.org/art/collection/search/51783) | The Met, 19th c., object 52.177.8, ink and color on paper, Public Domain. [IIIF image](https://collectionapi.metmuseum.org/api/collection/v1/iiif/51783/2234827/main-image) | Rounded cap has a distinct crown and edge band; hairline and cap are separate. Moustache, chin beard and cheek hair have different masses. Fur coat creates a large soft outer silhouette around a much smaller head; blue inner robe and bright cuff are separate layers. Use as a Qing male-detail benchmark, not as Ming scholar costume. |
| [Jiang Jun, *Portrait of a Lady*](https://www.metmuseum.org/art/collection/search/51780) | The Met, 19th c., object 52.177.5, ink and color on paper, Public Domain. [IIIF image](https://collectionapi.metmuseum.org/api/collection/v1/iiif/51780/2234806/main-image) | Hair mass, hairline, flower ornaments, earrings and hanging jewelry are distinct attached forms. The face is delicate but still has visible brow, eye, nose and mouth structure. Embroidered collar and sleeve borders have layered bands and irregular motifs rather than a flat color stripe. Use for writer/attendant hair and textile detail. |
| [*Court ladies and attendant*](https://asia-archive.si.edu/object/F1916.135/) | Smithsonian Freer Gallery, 16th c., School of Tang Yin (formerly attributed to Su Hanchen), F1916.135, ink and color on silk, CC0. [IIIF image](https://ids.si.edu/ids/deliveryService?id=FS-8197_07&max=1200) | Three female figures vary head angle, bun silhouette, relative scale, sleeve length and gesture. The aged reproduction is low contrast; use its contour, pose and role hierarchy only. Do not infer exact pigment colors from this preview. |
| [*Portrait of a man and his servant*](https://asia-archive.si.edu/object/F1918.9/) | Smithsonian Freer Gallery, 17th c., Ming or Qing, F1918.9, ink and color on silk, CC0. [IIIF manifest](https://ids.si.edu/ids/manifest/FS-5807_13) · [CC0 image copy](https://commons.wikimedia.org/wiki/File:Portrait_of_a_man_and_his_servant.jpg) | The main sitter and smaller servant occupy one composition with deliberately different head/body scale, garment volume and accessory relationships. Use for role hierarchy and composition, not sitter identity or a universal servant body ratio. |

### Cross-reference feature graph

| Character / region | Primary evidence | Construction consequence |
|---|---|---|
| Scholar skull, brow and beard | Met 55.37 crops A/B; Jiang Yun 52.177.8 | Taper the lower face; separate skull, cap, hairline, cheek, moustache, chin substrate and individual beard fibers. The cap is a tall structured form with a crown plane, front panel, band and side seams, not a dome. |
| Writer face and gaze | Met 2024.180 seated writer; Met 52.177.5 | Keep the lowered gaze and head pitch. Model upper/lower lids, tear corners, brow volume, nasal bridge/alar wings, philtrum, vermilion border and chin as separate connected features. |
| Writer hair and collar | Met 2024.180; Jiang Jun 52.177.5 | Build a pinned coil with layered hair locks, ornaments, earrings and embroidered collar bands. Hairline, scalp mass and accessories remain separate. |
| Attendant face and pose | Met 2024.180 standing attendant; Smithsonian F1916.135 | Preserve the attendant's different head inclination, gaze and smaller role in the composition. Do not reuse the writer's head silhouette or simply recolor the same bun. |
| Attendant / role scale | Smithsonian F1916.135 and F1918.9 | Distinguish people through silhouette, head angle, garment volume and hand/prop relationships; never encode a single fixed body ratio for every attendant. |
| Robe structure | Met 2024.180; Jiang Yun 52.177.8; Jiang Jun 52.177.5 | Separate outer robe, inner collar, sleeve volume, cuff embroidery and pressure folds. Do not transfer Qing fur or 19th-century embroidery wholesale onto a Ming character. |

### Anatomical detail contract for the redraw

The 468-point ANAT1 surface is only the underlying facial volume. The visible face must explicitly construct and preserve:

- **Cranium and contour:** forehead, temple, zygomatic prominence, cheek plane, mandibular angle, jaw body, chin pad and ear attachment. The outer skull/hat/ear are separate from the facial mask.
- **Eyes:** upper and lower lid contours, tear corners, scleral opening, iris/pupil, upper-lid fold, lower-lid rim, brow ridge and individually directed brow hairs. Near/far eye widths must remain asymmetric under yaw.
- **Nose:** bridge plane, sidewall washes, tip, alar wings, nostril pockets, columella and subnasale. Reject the single straight nose line and hard U-shaped base.
- **Mouth:** cupid's bow, upper/lower vermilion, oral fissure, corners, philtrum, sublabial groove and chin transition. EXPR1 must deform the actual connected geometry.
- **Hair and facial hair:** scalp mass, hairline, bun/cap attachment, ornaments, side locks, moustache roots, cheek growth and chin split. Fibers follow source-observed flow fields; they are not evenly spaced vertical bars.
- **Costume:** neck contact, collar overlap, lapel, sleeve root, elbow direction, cuff, hem and embroidery. Each fold must attach to its parent cloth form and change width/curvature with pressure.

### Current screenshot rejection / acceptance status

The first ANAT5 browser capture was reviewed at native Storybook scale. It is **not artistically acceptable**: the scholar still reads as a round generic head under a dome cap with a small triangular beard; the writer's face and hair remain too simplified; the robe is a generic shoulder arc; and two museum cards were blank because the images were lazy-loaded below the viewport. The Storybook board has now been expanded to eight eager-loaded source views, including new male, female and attendant references. This fixes reference visibility and breadth, **not the drawing-quality defect**.

**ART HOLD remains.** The next implementation pass must redraw the scholar hero face from the source-specific landmark map, then derive the writer and attendant as genuinely different constructions. A new 1×/3× screenshot must be visually inspected before approval. The strict ArtCraft local-evidence gate is also still blocked: source images are currently linked from official museum/IIIF endpoints in Storybook, but local archival copies, annotated crops and source-relative masks have not yet been committed. Do not claim an ArtCraft visual-fidelity pass or artistic acceptance from the Storybook screenshot alone.


## Second construction pass — anatomy and material layers

The first native screenshot was rejected; the next pass has now been implemented, but its new render is awaiting browser evidence. Changes are source-directed rather than a recolor of the earlier portrait:

- **Face shape:** reduced generic cheek width and tapered the lower face independently for scholar, writer and attendant. ANAT1 remains the underlying 468-point surface; no published population norm is used as an identity or attractiveness target.
- **Eye construction:** added landmark-connected scleral apertures, upper/lower lid rims, lid folds, tear-corner accents, iris rings, lashes and separately rooted brow fibers. Near/far geometry still comes from the projected 3D surface.
- **Nose and mouth:** added bridge/sidewall washes, alar rims, nostril pockets, philtrum columns, nasolabial transitions, vermilion volume and sublabial/chin relief from ANAT1 landmarks.
- **Scholar headwear:** replaced the rounded dome with a taller, squared cap silhouette, a separate front panel, crown/side seams, woven band and cap fibers.
- **Writer and attendant hair:** added distinct coil/pin masses, ornaments, hair fibers and suspended earrings. Their hair arrangements are no longer only a single shared hair silhouette with different colors.
- **Scholar facial hair:** replaced the single triangular substrate with separate left/right cheek-to-chin masses, split flow and two moustache substrates; individual fibers follow the split.
- **Anatomical support:** added ear helix/antihelix/tragus, neck tendons and clavicle-to-collar contact.
- **Textile/material:** added separate collar embroidery motifs for the women, character-specific shoulder contours, a more varied paper-fibre field and small pigment deposits.

The new unit contract checks the existence and count of these semantic features. This proves DOM construction, not artistic quality. The next review must inspect the new 1× and 3× screenshots, confirm that the details read as connected anatomy rather than decorative line noise, and reject any face that still appears round/cartoon-like at actual film scale.

**Current status: ART HOLD.** The new source board and renderer are committed, but this pass has not yet been accepted by a fresh visual comparison or a human art reviewer. Local source-image archives and annotated crops are also still absent, so the strict local-reference evidence gate remains blocked.
