# Chinese Ink: Source-led Character Portrait Rebuild (ANAT6)

**Status:** research-only redraw and Storybook study; not production-approved.

## Purpose

Create new Chinese-ink character studies from independently researched Ming/Qing figure paintings. The redraws do not reuse the previous Shanshui cast or the ANAT2–ANAT5 character paths. The implementation imports only the shared ANAT1 face topology/landmarks and EXPR1 expression deformation.

## New source set

| Source | Useful evidence | Rights / use |
|---|---|---|
| [Chen Hongshou, Scholar with Staff and Brush](https://www.clevelandart.org/art/1979.27.2.19), CMA 1979.27.2.19 | A small standing bearded scholar in a tan robe and black cap, holding a staff and brush; delicate contour lines and intentionally reduced scale. The museum describes the late album style as archaistic and hyper-refined. | CMA Open Access: the museum states that the work may be copied, modified and distributed without asking permission. |
| [Ren Yi, Zhong Kui](https://www.metmuseum.org/art/collection/search/37393?showOnly=openAccess), Met 2002.208.2, dated 1883 | Broad facial mass, blossom in the hair, full beard, book-reading gaze and voluminous robe. The Met notes that Ren Yi adopts Chen Hongshou's figural style and presents Zhong Kui as an elegant, eccentric scholar rather than a conventional ferocious demon-queller. | Met Open Access; Public Domain. |
| [Ren Yi, Su Wu the Shepherd](https://www.artmuseum.tsinghua.edu.cn/en/cpsj_english/gndc/gcxy/201605/t20160526_1116.shtml), Tsinghua University Art Museum, 1874 | Seated elder with greying temples, far-reaching gaze, scepter and stretched torso; the museum describes fine facial contour lines and the use of nail-head-rat-tail and bent-reed drawing in hood and clothing. | Museum record is linked for study. Reproduction rights are not stated; no source image is embedded in Storybook. |
| [Ren Yi, Scholar on a Rock](https://www.metmuseum.org/art/collection/search/39715?showOnly=openAccess), Met 1986.267.49, ca. 1880 | A scholar resting against a garden rock, walking stick propped in the stone, reading gaze, scalloped contours and patterned robe folds. | Met Public Domain record. Image endpoint was unreliable in this pass; link-only. |

## Source deconstruction

### Scholar

- Use the CMA standing scholar for vertical gesture, head-to-body scale, black cap, staff/brush relationship and fine line density.
- Use Ren Yi's Scholar on a Rock for the quieter reading gaze and the relation between scalloped silhouette and patterned robe folds.
- Keep the face long and narrow, with a tapered jaw, fine moustache and separate pointed beard.
- Keep robe folds directional and sparse enough to preserve the miniature figure's negative space. Do not inflate the source into a generic heroic body.

### Su Wu

- The Tsinghua record identifies grey temples, a far-reaching gaze, a seated but stretched body and a scepter held with resolve.
- The hood and robe combine nail-head-rat-tail and bent-reed drawing; vary line pressure and taper rather than repeating parallel fold marks.
- Age reads through upper-lid weight, temple greying, fine contour lines and a long light beard, not exaggerated wrinkles or a grimace.
- The sheep and cold setting explain the scene, but are not needed in this portrait crop.

### Zhong Kui

- The Met source describes an elegant, eccentric scholar with a blossom in his hair, seated reading beside archaic bronzes, flowers and fruit.
- Build a broad cheek/jaw mass, substantial nose, full beard and loose hair; retain a composed reading gaze.
- The blossom and robe volume distinguish the character. Avoid the generic angry demon-queller stereotype.

## Anatomy and expression implementation

- Start from ANAT1's raw 468-point face topology. Apply small source-specific local landmark remaps for face width, jaw, lower-face length, nose projection, eye spacing, cheek mass and mouth width.
- Do not use a population norm as a proxy for a historical sitter. The remaps are explicitly source-study parameters, not demographic claims.
- Project the face at a controllable yaw so near/far eye width, nose projection and cheek overlap remain asymmetric.
- Use EXPR1's FACS-based expression deformation for neutral, smile, sad, angry, surprise and fear. Brow, eyelid, cheek, nasolabial, mouth and jaw changes remain connected.
- Keep ears, headwear, hair, beard, moustache, neck, collar and robe as separate layers. Hair and beard fibers are deterministic and individually tapered.
- Preserve the difference between line character: fine facial contour, more forceful cloth/hood edges, and softer wet washes. Paper grain is subtle and should never replace real linework.

## Storybook

- Story: Video production / Film Looks / Chinese Ink / ANAT6 Source-led Character Portraits.
- Controls: character, expression, intensity, yaw and material detail.
- Contact sheet: six expressions for the selected source-led character.
- Reference board: four source cards. Only the CMA and Met Public Domain images are embedded. Tsinghua and the second Met reference remain link-only.
- The reference cards record the role each source plays: face/beard, pose/prop, garment, line character and gesture.

## Acceptance boundary

This is a source-informed art study, not a sitter likeness claim. The ArtCraft portrait gate remains open: the historic paintings are not source photographs, and the work has not completed source-relative landmark registration plus independent 1×/3× visual review. Do not describe the study as production-qualified until that gate is satisfied.
