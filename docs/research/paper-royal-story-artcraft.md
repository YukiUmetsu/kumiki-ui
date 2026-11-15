# The Moonlit Lantern — PAPER-R1 ArtCraft study (2026-11-15)

**Style:** sophisticated layered papercut story theatre. **Narrative:** a forest lantern has gone dark; a princess listens to its animals, a fox leads a prince through the orchard, and the royal pair restore its light together. A rabbit, a fox, a deer and an owl each have separate character identities. The story is an original composition, not an adaptation or third-party character.

## Reference evidence

| Actual work | What can be observed | Code translation |
| --- | --- | --- |
| [Lotte Reiniger’s silhouette animation](https://www.designstylebook.com/cinematography/silhouette-animation) | Silhouette-based adult profile figures with hinged parts and finely cut ornament | Independently pivoted head/limbs and profile-readable crowned royals, not rubbery vector morphing |
| [Auzou Swan Lake Paper Theatre](https://hupalupa.store/en/auzou-swan-lake-paper-theatre) | A forest portal, human figure, swans and layered water with carefully protected reading space | Castle behind forest, animal cast by the central clearing, cut tree planes and creek |
| [Knight’s Stories Pop Up Theatre](https://www.behance.net/gallery/55723629/Knights-Stories-A-Pop-Up-Theatre) | Forest stage, independently layered animal figures, dimensional cardboard folds and costume color | Foreground/intermediate/background separation; actual opaque sheet shadows, stepped costume panels |
| [Shape & Shadow: Sidekick Adventures](https://www.shapeandshadow.com/new-gallery-49/) | Studio describes physical puppets, movable parts, top-down stop-motion stage and replacement pieces | Reuse native PAPER-D2 parent-inherited pivots, do not simulate action by alpha-fading raster puppets |
| [Forest lovers paper lamp](https://www.pinkoi.com/product/eQGiDQMK) | Layered woodland silhouettes with a central pair and penetrating light between real paper cuts | Physical foliage bridge and luminous layered lantern, no global color filter |

The photographs and animations remain the owners' work. The links are study references; **no source pixels or traced character geometry enter the repository**. Visible online previews support qualitative construction observations only. Source-matched high-resolution face fidelity, per-pixel crop metrics and frame-by-frame third-party motion analysis **are not claimed**.

## Macro → meso → micro construction

**Macro:** center the lantern above a low creek with a castle behind the forest, retain separate clear visual silhouettes for both royals; stagger animal sizes and keep tree canopy rooted to the stage side. **Meso:** princess's long multicolor gown panels, cuffs, braid and hair; prince's tailored lapels, cape and two boots; fox tail/head, rabbit ear joints, deer antler forks, owl wing pins. **Micro:** die-cut crown stones, bodice seam cuts, eyelash and lip silhouettes, 13 small stars, creek highlights, flower petals and cut foliage tips. The scene is physically a stack of fully opaque colored cardstock layers with real voids.

Attachment graph and labels: [character-structure JSON](paper-royal-character-structure.json). Source→feature targets: [reference-study JSON](paper-royal-reference-study.json). All figure part names are stable and animation is expressed by absolute frame (no random per-frame positions). Default runtime 24 seconds (3 × 8 s at 30 fps), with landscape and portrait independently arranged.

## Storyboard and acceptance requirements

| Act | Frames | Blocking/acting | Visual thesis |
| --- | --- | --- | --- |
| The forest falls silent | 0–239 | Princess listens, rabbit keeps watch, owl perches, prince waits across the creek | Quiet moon and pale cards, cut-out forest aperture |
| Follow the little lights | 240–479 | Fox hops and prince approaches; princess takes a small step toward them | Controlled follow-through, real animal joints |
| A light shared | 480–719 | Both step together as a brighter lantern rises; woodland creatures answer | Warm higher-key cards and fan of real cut-light rays |

The two edits close and open using fully opaque PAPER-D2 deckled curtains; no semi-transparent crossfade. Character roots, limb pivots and depth painter order are inherited from PAPER-D2 rather than rebuilt.

**Technical release gate:** `npm run typecheck`, paper-focused Vitest, registry validation, `npm run film:check -- examples/film/paper-royal-lantern.film.json`, Chromium Storybook three-act screenshots in both formats, production frame PNGs for frames 130/370/610 and one real 30-frame encoded edit spanning 239→240. Fail on missing scene, blank chapter, stale story folder, invalid path, detached parent, translucent solid body, unsupported motion, or editor frame-jump inconsistency.

**Artistic release gate (independent of tests):** inspect at 15%, 1× and 3× both aspect ratios, especially eye/face/hair and costume attachment, fox legs, rabbit ears, antler branch topology and actual act-to-act motion. The first attempt is *developmental art*, not a claim of source-faithful portrait quality or finished production character rig. Prioritize correcting silhouette and contact before adding decorative material effects.

## ArtCraft rendered critique — R1 image evidence → R2 geometry

Source of criticism: **actual** FilmStage chapter stills 130/370/610 in 960×540 and 540×960 and Storybook browser captures from [proof run 43687199786](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43687199786). The checked release gates passed, but the image did not merit an artistic sign-off.

- **Person construction:** princess/prince heads appeared as round, largely featureless paper discs disconnected from the garment neckline, and their eyes were oversimplified. R2 adds *physically connected* opaque neck contour stocks, a more anatomically articulated profile with cheek/nose/chin, thin separate orbital and cheek planes, two independent paper eye whites, a dark shared pupil/eyelash patch, and a few directional hair/fur cuts. No painted mask or transparent filter.
- **Nature topology:** 14 random foliage positions per tree did not follow a connected twig and trees looked like bare poles. R2 replaces the side trees with 8 per-side connected branches each, paired terminal cut leaves located exactly at bough tips, and attached highlights. Portrait now receives hanging foliage tethered to the upper page border.
- **Portrait art direction:** characters were small in a mostly empty 9:16 vertical viewport. R2 moves the ground plane lower, enlarges the character stock at uniform scale, and narrows the main pair's blocking by act. This is a native composition, not stretched 16:9 artwork.
- **Moon and lantern:** the disc moon with dark punched dots read as a face. R2 uses one offset crescent cut aperture, drops the lantern toward its actors in the final shot, and groups the spark blades into one sheet to preserve the 128-sheet cap while adding anatomy.

**R2 currently requires independent final proof**: rerun both-format native PNGs and inspect 1×/3× face/neck, animal, page borders, moon crescent and attachment continuity. Ensure release not claimed if costume/face remains doll-like. This remains original stylized paper artwork, not portrait fidelity based on a licensed close-up photographic source.
