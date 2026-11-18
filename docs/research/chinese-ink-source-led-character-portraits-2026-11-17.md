# Chinese Ink: Source-led Character Portrait Rebuild (ANAT6)

**Status:** research-only redraw and Storybook study; not production-approved.

## Purpose

Create new Chinese-ink character studies from independently researched Ming/Qing figure paintings. The redraws do not reuse the previous Shanshui cast or the ANAT2–ANAT5 character paths. The implementation uses ANAT1's 468-point facial surface and named craniofacial landmarks, plus EXPR1's FACS action units, feature deformations, crease marks, gaze and continuous expression-weight blending.

These are original character studies informed by historical visual language, not reconstructions of a sitter's identity. Historical paintings are not photographic references and cannot satisfy the photo-based ArtCraft v7 likeness gate.

## New source set and rights

| Source | Useful evidence | Rights / use |
|---|---|---|
| [Chen Hongshou, Scholar with Staff and Brush](https://www.clevelandart.org/art/1979.27.2.19), CMA 1979.27.2.19 | Small standing scholar with black cap, staff, brush, tan robe and fine contour lines. Preserve the deliberately reduced figure scale. | CMA Open Access; copy, modification and distribution permitted. |
| [Ren Yi, Zhong Kui](https://www.metmuseum.org/art/collection/search/37393?showOnly=openAccess), Met 2002.208.2, dated 1883 | Eccentric scholar, blossom in hair, full beard, book-reading gaze and voluminous robe. Not the conventional ferocious demon-queller pose. | Met Open Access; Public Domain. |
| [Ren Yi, Su Wu the Shepherd](https://www.artmuseum.tsinghua.edu.cn/en/cpsj_english/gndc/gcxy/201605/t20160526_1116.shtml), Tsinghua University Art Museum, 1874 | Grey temples, distant gaze, stretched seated torso and scepter; fine facial contour, nail-head-rat-tail and bent-reed drawing in hood and clothing. | Museum record is linked for study. Reproduction rights are not stated; image remains link-only. |
| [Chen Hongshou, Lady Xuanwen Giving Instruction on the Rites of Zhou](https://www.clevelandart.org/art/1961.89), CMA 1961.89, 1638 | Venerable woman instructs young scholars; elongated faces, iron-wire outline and mineral pigments. | CMA Open Access; image remains link-only because the stable endpoint was not verified. |
| [Jiang Jun, Portrait of a Lady](https://www.metmuseum.org/art/collection/search/51780?showOnly=openAccess), Met 52.177.5, 19th century | The inscription appears to identify a 26-year-old portrait; the image shows a pink peony, ornate hair ornaments, long earrings, blue embroidered robe, patterned cuffs and a folded fan held in front. Primary reference for the new lady character. | Met Open Access; Public Domain. |
| [Unidentified artist, Portrait of a Gentleman](https://www.metmuseum.org/art/collection/search/48939?showOnly=openAccess), Met 51.39.3, 16th–17th c. | Long flowing beard, seated formal pose, vermilion robe and crane rank badge; useful for beard taper and robe mass. | Met Open Access; Public Domain. |
| [Jiang Yun, Portrait of a Man](https://www.metmuseum.org/art/collection/search/51783?showOnly=openAccess), Met 52.177.8, 19th c. | 45-year-old sitter, direct gaze, fur-lined coat and peacock-feather hat ornament; mature face and tonal hierarchy. | Met Open Access; Public Domain. |
| [Unidentified artist, Portrait of a Scholar](https://www.metmuseum.org/art/collection/search/48941?showOnly=openAccess), Met 29.20.1, 17th–18th c. | Seated scholar, black cap, quiet pose, plain robe and generous negative space. | Met Open Access; Public Domain. |
| [Ruan Zude, Portrait of Yizhai at Eighty-Five](https://www.metmuseum.org/art/collection/search/36081), Met 59.49.1 | High cheekbones, pursed lips and gentle gaze as age/personality cues. | Link-only; reproduction rights not established. |
| [Ruan Zude, Portrait of the Wife of Yizhai](https://www.metmuseum.org/art/collection/search/36082), Met 59.49.2 | Elderly female portrait, gold-and-pearl earrings, ornate headdress and layered blue brocade. | Link-only; reproduction rights not established. |

## Source deconstruction

- **Scholar:** CMA miniature for vertical scale, staff/brush gesture, black cap and iron-wire contour. Met scholar and gentleman portraits for beard taper, head-to-body relation and robe mass. Do not inflate the miniature into a heroic bust.
- **Su Wu:** Tsinghua record identifies grey temples, far gaze, stretched seated body and scepter. Hood and robe combine nail-head-rat-tail and bent-reed drawing. Age reads through orbital depth and soft tissue, not a rectangular beard silhouette.
- **Zhong Kui:** Met source describes an elegant, eccentric scholar with blossom in hair, book-reading gaze, archaic bronzes, flowers and fruit. Build broad cheek/jaw mass and full but translucent beard; avoid the generic demon-queller stereotype.
- **Jiang Jun's lady:** Met 19th-century portrait 52.177.5 supplies a blue embroidered robe, pink peony, elaborate hair ornaments, hanging earrings, patterned cuffs and folded fan. The inscription appears to identify a 26-year-old portrait. The new character is independently drawn with a tapered jaw, smaller vermilion mouth and pinned coiffure; it is not the sitter's likeness.

## Anatomy and expression

- Use ANAT1's 468-point face topology, named landmarks and upper/lower eye/lip loops. The 468-point face mask does not include ears, cranium or hairline; this study uses source-relative ear-root approximations, and production full-head work must integrate the human-body lattice.
- Apply local source-specific remaps for face width, temple, jaw, chin, cheek, nose, eye spacing and lower-face length. No demographic norm is used as a proxy for a historical sitter.
- Age affects orbital depth and mild soft-tissue descent. Fine age marks remain restrained and follow bone planes.
- EXPR1 drives brow, eyelid, cheek, nose, lip-corner and jaw motion. AU weights blend continuously across a 12-frame transition; reduced-motion mode snaps to the target.
- Eye apertures are closed paths from ANAT1 upper/lower lid loops. The mouth outline comes from upper/lower lip loops; open oral aperture follows EXPR1 mouth/jaw movement.
- Hair/headwear fibers are clipped to the supporting cap, hood or coiffure. Beard mass is a translucent substrate beneath tapered fibers; the lady has no beard or moustache.
- Rice-paper fibers are irregular and directional, not a ruled grid. Face planes use layered washes; facial contours remain fine and cloth edges carry more pressure.

## Storybook

- Story: Video production / Film Looks / Chinese Ink / ANAT6 Source-led Character Portraits.
- Characters: scholar, Su Wu, Zhong Kui and a new Jiang Jun lady study.
- Controls: expression source/target, intensity, 12-frame transition, head turn, material detail and reduced motion.
- Contact sheet: eight expressions per character.
- Reference board: ten source cards; six Open Access/Public Domain images embedded, four rights-unclear/unverified records link-only.
- Browser evidence captures 1× and enlarged 3× crops. Screenshot review remains a human art review, not an automated path-count score.

## Acceptance boundary

Research-only. Historical paintings are style and character references, not source photographs. The photo-based ArtCraft v7 likeness gate remains open. Do not describe this as production-qualified until the relevant style gate, native 1×/3× visual review and any required consented photographic-reference process are complete.
