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
