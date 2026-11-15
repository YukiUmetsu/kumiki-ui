# ArtCraft v7 — measured portrait screenshot REJECTION, not a released character

**2026-11-14 / PR #281.** The existing synthetic-face geometry has not been reconstructed from a photograph. No additional cosmetic hatching may be added under ArtCraft v7 until the source-to-contour gate is repaired. All portrait Storybook entries remain `!dev`, inside the single existing `Video production/Film Looks/Crayon` folder.

## Real rights-verified reference and real renderer evidence

- **Photograph:** Christopher Campbell, [*Brunette woman portrait*](https://commons.wikimedia.org/wiki/File:Brunette_woman_portrait_(Unsplash).jpg), photographed/published 2015 under **CC0** (original predates Unsplash's June 2017 licensing change). View: upward-tilted three-quarter face, warm directional cheek light, dark nasal contact shadow, distinct overlapping upper/lower eyelid planes, non-symmetric lips, and hair mass sweeping around forehead. This is a *candidate identity/anatomy reconstruction reference*, not proof the existing stylized character matches it.
- **Reference pixels actually opened:** 608×1082 Chromium source screenshot of the unmodified photo from [GH Actions run 43682633614](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43682633614), artifact `14148787169`, file `artcraft-portrait-woman-portrait-source.png`. SHA256 `f8d28cbede8c8c14f9902a328b6e979e353fd9ebe6efb454bda3152586b929c2`. **This is a viewport crop, NOT the original 5184×3456 JPEG.** Do not misrepresent it as preserved original bytes.
- **Real CRAYON1 pixels actually opened:** 540×960 [GH Actions run 43671953745](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43671953745), artifact `14144119863`, `native-adult-face-portrait-299.jpg`, PR head `08ad7e158e8b5439ec5edec98c15bafcc4a0a483`. SHA256 `43e0bad437227d868da2e4f4e92502969e5210eddf9d204dabade05aa5e40cbd`. Measurements must NEVER be attributed to new revisions without new screenshots and hashes.

## Measured and independently annotated results

The 18 visibly observed named landmarks and native image dimensions are frozen in `src/video/crayon-artcraft-portrait-audit.ts`. These were annotated on the **actual source and actual rendered pixels**, rather than derived from intended SVG paths. `artcraft/scripts/portrait_fidelity_gate.py` compared normalized face-frame positions with the default hard cap 0.085. Result: **REJECT, 17 of 18 landmarks failed**. Face aspect ratio only differs by 0.01201 (passes coarse bound), demonstrating that gross aspect similarity conceals incorrect feature placement.

| Tonal feature | Source P90-P10 | CRAYON1 P90-P10 | Minimum (38% source) | Gate |
| --- | ---: | ---: | ---: | --- |
| eye_socket | 126 | 45 | 47.88 | FAIL |
| nose_planes | 110 | 16 | 41.80 | FAIL |
| cheek_planes | 58 | 15 | 22.04 | FAIL |
| lips | 123 | 17 | 46.74 | FAIL |
| hair | 166 | 154 | 63.08 | PASS |

**Visual review:** the synthetic face has frontward eye placement, very low nasal sidewall contrast and a nearly invisible mouth. The actual source has an oblique eye line, strongly modeled nose, oblique lips and distinct cheek depth. The photo is the target for *future source-driven reconstruction*; the current face is *not* a faithful portrait of that person. The final source JPEG, semantic masks for eyebrows/eyelids/alar cartilage/lips/hair, actual source-derived editable curves, repeat native render and independent artistic approval remain **BLOCKED**.

## Code and Storybook handoff

`AdultFaceArtcraftWorkbench` now offers an optional **source-review** comparison inside the same Crayon story, and independent screenshot-observed candidate landmark dots visible only on the *exact frozen native portrait configuration* (warm expression, `detail=1`, `headScaleY=.82`, portrait frame 299). The live source thumbnail is unregistered to the 608×343 browser crop and is **not** presented as pixel-aligned. Normal film renders do not load a third-party reference image.

When revising the portrait: (1) obtain original CC0 JPEG and preserve SHA; (2) independently trace the source face, orbital and cheek form paths; (3) reconstruct source-driven shapes on an isolated hero first, leaving the current fail version for negative controls; (4) capture new real Chromium 16:9/9:16 stills at 1×/3× and motion extrema; (5) re-annotate all 18 actual candidate landmarks and five true tonal regions; (6) rerun the independent Python gate and visual review. **Do not merge PR #281 as a portrait-art improvement until this is complete.**

## Second source capture — larger facial crop, independently checked

The earlier 608×343 landscape source capture showed small eyes and nose, making manual annotations less precise. The actual **608×1082 portrait** source capture from the same CI artifact reveals more facial area and sharper lid/alar/mouth boundaries. The full 18-point reference annotation and five source tonal boxes were independently remeasured on this new actual screenshot. No candidate geometry or candidate landmarks were altered.

Using the unchanged portrait candidate and strict ArtCraft v7 gate, **17/18 landmarks and 4/5 tonal regions now fail**. The remaining failure is not a material-grain problem: photo and illustration have different projected eye, nose, cheek and mouth positions. The screenshot source is still NOT the original full-resolution JPEG, so this audit cannot satisfy the v7 original-source requirement. Keep this branch draft until the real face is reconstructed and verified.


## ArtCraft v7 isolated CC0 near-eye construction (not yet approved)

**Find and inspect:** Christopher Campbell's CC0 portrait is visible at the 608×1082 browser capture reported above. The author observed its near eye at screenshot x160–370, y430–630 and inspected an enlarged unmodified 840×800 crop. This is a source-measured **region study**, not a reconstructed whole-person likeness. No reference pixels were imported into the renderer.

**Dissect:** uneven brown brow with a lighter lower rim; a bent and comparatively darker eyelid upper plane; sclera tapered more narrowly toward tear corner; iris partially hidden by upper lid; rooted lashes are individually unequal and curved; a lower flesh fold joins cheek and socket. Negative controls: isolated cartoon eyeball oval, uniform white sclera, evenly spaced eyelash fan, floating brow, arbitrary global grain.

**Specify and construct:** new `crayonCc0NearEyeStudy()` draws original native CRAYON1 wax shapes and parent-clipped local glazes in a 210×200 local coordinate frame. Opaque skin/sclera/iris/pupil/brow and separate eyelid, iris and socket volumes precede fine wax and rooted contours. Reproducible 960×540 and 540×960 camera modes use the same authored local geometry and seed. Two stories are added to **the existing** `Crayon/ArtCraft Adult Face Lab` Storybook file, still `!dev`; no new meta category.

**Render and compare:** focused unit/TS and Chromium screenshots at both aspects. Source-aligned pixel masks, actual painted wax-to-reference optical grain and 1×/3× aesthetic comparison remain outstanding. Do **not** replace the current synthetic full-face geometry automatically or claim professional-art approval. The isolated source-led eye is one region, not a passed whole-face gate.


### Chromium art critique — isolated eye, first render rejected (2026-11-15)

The actual native [Crayon ArtCraft Chromium proof](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43684634456) rendered at 960×540 and 540×960 (frame 299) and both screenshots were inspected. **Rejected for visual fidelity:** despite native wax and valid element hierarchy, the eye read as a clean graphic icon in a bounded rectangular pink patch, the brow a solid vector swoosh, the upper lashes a clockwork straight comb, and the iris a nearly perfect outlined circle.

**Iteration 2:** expand the opaque anatomical skin undercoat beyond both camera frames, preserving the original 210×200 local coordinate frame for the eye; lower its global high-frequency rubbing; build the eyebrow as *open, clipped* chromatic wash over continuous opaque skin with 91 guided curved follicles; thin/sparsify six upper lash groups and lower iris radial contrast. This changes form/attachments, not arbitrary surface grain. The hard stop on merging the rejected full-face portrait remains in force. Source-aligned contours and aligned region masks still need to be audited against the original licensed photo.


### Two actual-image iterations after the CC0 eye proof (2026-11-15)

**ArtCraft v7 sequence:** inspect source crop → dissect canthus/upper globe/lower-lid attachment → rebuild semantic wax contours and clipping → render Chromium at 960×540 and 540×960 → inspect output at 1× and magnified eye detail → reject remaining weak craftsmanship.

| State | Actual native Chromium run | Root-cause observation | Construction change | Review decision |
| --- | --- | --- | --- | --- |
| Earlier eye (v2) | [43685185755](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43685185755) | Fully visible circular iris, too much white sclera and pale upper lash root; pink separate canthus | Maintained as a visual negative control | FAIL |
| Eye v3 | [43685699764](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43685699764) | Iris now sits beneath hooded upper lid, but eye corner remains an opaque salmon sticker and lower lid a bright vector ribbon | Narrowed opening, shifted and parent-clipped the iris/pupil, added upper-lid contact shadow | Better structural hierarchy, **still experimental** |
| Eye v4 | [43685989993](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43685989993) | Right corner no longer detached, lower rim softened; still a relatively flat graphic eye with a simplified brow and insufficient source-level lash and orbital structure | Small dark parent-clipped canthus, open wax lower eyelid over opaque face, less stroke pressure and a broader lower orbital glaze | PASS technical renderer; **FAIL professional visual likeness** |

**Independent code checks:** [Changed tests and type safety](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43685989950) is green. The source-based eye remains an opt-in \`!dev\` Storybook construction exercise. A 4-panel actual-pixel comparison (CC0 browser crop, v2, v3, v4) was manually rendered during QA and reviewed; the local evidence is not embedded into the repo.

**Supporting craft technique references (not identity sources):**
- [National Portrait Gallery — Artist demonstration: how to draw an eye](https://www.npg.org.uk/schools-hub/artist-demonstration-how-to-draw-an-eye): eyelids occupy a three-dimensional surface, their contact shadow falls over the globe, and iris position reflects gaze; confirms the need for a physical lid volume rather than black eyeliner.
- [Eddie Armer, *A Tonal Study*, wax crayon portraiture](https://www.cutoutandkeep.net/projects/tonal-study): pressure, directional light, the paper's tooth and broad side-nib shading influence wax-crayon tonal construction. **Neither example authorizes copying its composition.**

**Original CC0 source provenance clarified:** [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Brunette_woman_portrait_(Unsplash).jpg) identifies the Christopher Campbell 2015 original as 5184×3456 JPEG, 7,264,042 bytes, SHA-1 \`29612991a226c0f9dbdd33be0b8014ee4f00629c\`, published before the CC0 Unsplash licence change. Original URL:
\`https://upload.wikimedia.org/wikipedia/commons/1/16/Brunette_woman_portrait_%28Unsplash%29.jpg\`.
The original download endpoint returned HTTP 429 during this review; **its original bytes were not captured, and an original-image SHA-256 cannot be claimed**. The existing 608×1082 browser screenshot and its SHA-256 remain the actual audited *source preview*.

**Next strict gate:** acquire and hash the original CC0 JPEG; independently map eye socket, eyelashes, lid shadow, iris and corners from full-resolution source pixels into the 210×200 canonical coordinate frame; reconstruct the second eye and facial planes only once the eye static hero passes aligned source-relative part masks and independent artistic review. The full-face specimen still fails the frozen 17/18 landmarks and four tonal regions gate; do not merge it as a finished human character or remove \`!dev\`.


## ArtCraft material breakthrough candidate — *stroke-built* wax finish (2026-11-15)

**Root cause:** CRAYON1 painted opaque objects with an uninterrupted, smooth SVG \`underpaintGradient\` and a low-opacity final settling layer, then placed very faint fractured wax nibs over that surface. The actual isolated eye render showed airbrushed skin, smooth enamel-like white sclera and uniform iris tonality despite the code saying \`nibStyle:"dry"\`. Increasing procedural noise would not change the **undercoat-first, faint-stroke** construction error.

**Physical process sources used for the material recipe:**
- Philadelphia Museum of Art, *Guidelines for Descriptive Terminology for Works of Art on Paper* (2014), [wax-crayon classification and visible uneven clumping](https://legacyweb.philamuseum.org/doc_downloads/conservation/DescriptiveTerminologyforArtonPaper.pdf), p. 44. Wax deposit is not an airbrush.
- Mould et al., [crayon rendering](https://people.scs.carleton.ca/~mould/papers/crayon.pdf): contact force, nib height and paper height affect how much wax is deposited and smeared. Our SVG renderer is an approximation, NOT a physically simulated wax particle height field.
- Stockmar, [Wax Crayons Techniques and Tips](https://www.stockmar.de/dk/service/brochurer/?cid=1367&file=files%2FContents%2FDownloads%2FKreativtipps%2FEN%2FSTOCKMAR_wax+crayons_techniques-and-tips_work-material_EN.pdf): layered colored strokes at deliberately changing directions; overlaid pressure marks control chromatic mixing.

**New engine contract (opt-in, unchanged legacy visuals):** \`CrayonWaxElement.deposition:"stroke-built"\` passes from native CRAYON1 scene validation to \`WaxRegion\`. It retains an *opaque, solid* buried undercoat so neither the eye nor a later actor ghosts through background art. But its visible top layer is non-gradient local color contact: heavier dry-nib ribbons of variable pressure, a second cross-grain pass with per-stroke local pivots, exposed paper-tooth dark/light wax density, reduced smooth open glaze, and existing temporal stroke order. Regions remain fully editable and frame-deterministic. \`deposition:"smooth"\` is the untouched default.

**Art-specific controls:** \`crayonCc0NearEyeStudy(aspect,detail,deposition)\` explicitly chooses \`"stroke-built"\` by default, or \`"smooth"\` as an independent negative control. Only the isolated rights-cleared eye **study** opts in; the full synthetic person remains unapproved and receives no automatic texture-only coverup. \`SourceMeasuredWaxContactComparison\` is a new **story** under the existing \`Video production/Film Looks/Crayon/ArtCraft Adult Face Lab\` meta, not a new Storybook folder. It plays the same seed, frame and geometry side-by-side. A Chromium two-up screenshot is produced by the existing targeted ArtCraft browser workflow.

**Quality gate:** Structural tests must verify nontransparent opaque body, valid mark budgets, paper contact, actual crossing SVG strokes, seed determinism and unchanged \`smooth\` output behavior. A native 1×/3× render must show individual colored crayon strokes with different widths, visible paper grain, discontinuous wax pickup and pressure variation; a full professional crayon portrait still needs source-proportions and anatomy gate. The prior **17/18 facial landmark failures and four failed tonal regions are unresolved**. Do not promote the artwork based on cleaner medium effects.
