# WC12 — Portrait ArtCraft material and anatomy study

**Scope:** improve an original source-authored watercolor sitter in `src/video/watercolour-portrait-demo.ts`; use real master watercolor work as **technique** references, never copied pixels, traced geometry, or a claimed reproduction of a pictured individual.

## Primary verified watercolor portrait study

| Source | Reference observation | WC11 failure | WC12 construction decision |
|---|---|---|---|
| [Stan Miller, *Heather's Memory*, Realism Today](https://realismtoday.com/portrait-of-emotion-painting-portraits/) and [artist gallery](https://stanmiller.net/gallery/) | Facial value shifts flow continuously across forehead, temples, cheeks and throat; eye details remain precise; hair is multi-valued and irregular | Vector-like cheek patches with obvious geometric edges; centered perfect face; blank porcelain look | Give face one broad round luminance volume, taper secondary cheek/nose glazes and blur **only** their wet boundaries; preserve crisp anatomy at eye and mouth. |
| [Eudes Correia, *Menina, Black Power* and process interview](https://realismtoday.com/inspiring-interviews-eudes-correia-watercolor-painting-ideas/) | His described first wash is water-rich, lightly connected and preserves light; final second pass establishes selected details. Painted hair and garments blend into neighboring fields while face features retain hierarchy | Over-separated heavy purplish helmet and coat mass; all shadows read as individual vector shapes | Local lost/found hair/temple edges, controlled fine pigment strands, restrained coat creases and a palette-value hierarchy: eyes > nose/mouth > hair/collar. |
| [Yong Wang, watercolor portrait process, *Capturing Likeness* (2026)](https://www.internationalartist.com/issues/170/Capturing-Likeness) | Wet-in-wet tonal harmony underpins realistic portrait; dry strokes later define face and hair. The human sitter stays anatomically coherent through changing edge treatment | WC11 was built as more than 50 overlaid solid paths, but medium controls couldn't differentiate soft forms from crisp eyes | Optional semantic `edgeSoftness` on each wash plus original precise `line` and `drybrush` unaffected. |
| [Liu Yi, artist teaching profile](https://epc-artcourses.com/2013/08/liu-yi/) | Wet paper makes controlled soft transitions, but figure construction and clothing remain firmly drawn | Pure paper-grain noise could not conceal incorrect face structure | Introduce **source geometry** eye-aperture clipping and form-aware tonal modeling before adding pigment texture. |
| [Stan Miller, *Portrait of a Stranger*](https://americanwatercolor.net/portrait-of-a-stranger/) | The emotional intent and value placement matter more than literal feature count | Fine strands multiplied without improved emotional expression | Calm sidelong look, softened ocular ring and mouth, intentional eye highlights, no decorative universal outline. |

**Copyright and limits:** These images are online art observations with rights retained by their creators. No images, likenesses, exact contours or assets from these references are stored in Kumiki. The reference board here consists of links and technical observations; source/render pixel SSIM is not a valid metric because the sitter is original.

## Actual baseline: WC11 final PNG inspected

The user's existing `watercolour-wc11-portrait-final.png` is a 540×960 production frame. Main deficiencies, in descending visual impact:

1. **Face:** two hard broad oval cheek marks, long nose polygon and rigid jaw values read like flat translucent vector cut-outs, not diffused watercolor modeling. The face is too evenly front-facing; eye apertures are symmetrical despite the intended slight turn.
2. **Eyes:** the iris can be painted beyond the eyelid aperture. Eyes appear too small/manga-like in some poses because the dark contour is uniformly sharp and the iris/sclera values are too high contrast.
3. **Hair:** an oversized continuous dark silhouette dominates; rigid pointed fringe clumps and repetitively spaced thin strands do not model the hair's mass, directional light and root attachment.
4. **Garment:** collar and jacket have triangle-seam edges and hard shadow boundaries without fiber evidence; midtone mass visually overwhelms the face.
5. **Medium:** the WC11 uniform linear gradients are wrong for rounded facial volumes; paper granulation was global and did not yield region-specific lost/found edge control. Another global blur would destroy eye/lip detail.

## Geometry and material specification

The normalized face study retains the existing portable path tree and rig. Eye centers: near (249,230), far (350,220). Mouth center (307,364), nose center (316,312), chin (292,432). Near and far eye widths intentionally differ. At the facial group level, both eye systems are attached to the head, but the iris is independently gaze-keyed. An **authored Bézier eye aperture** acts as the physically meaningful clipping mask, so iris/pupil cannot extend into skin when gazing.

The existing `WatercolourWashTreatment` supports independent pigments, direction and glazing. WC12 adds:

- `wash.gradient: 'radial' | 'linear'`. Radial luminance is off-center toward the source light, used for rounded skull, eye socket, cheeks, nose and selected hair mass; other existing watercolor scenes continue with default linear.
- `wash.edgeSoftness: number` bounded 0..1. Three deterministic, source-owned wet edge filter strengths. Only selected cheeks, temples, hair rim, lip transition and jacket creases use it. Existing base skin and eye lines remain crisp.
- `group.clipPath: string` using the exact safe SVG path grammar already enforced for shape geometry; the eye iris/glint group uses the opening shape. Child motion remains absolute-frame/deterministic.
- Storybook user toggle **Soft wet-on-wet portrait edges**, independent of the optical glaze and fine detail toggles, in the existing `Video Production/Film Looks/Watercolour & Brush/02 Painted Characters` folder.

This is still a qualitative watercolor approximation, not spectral Kubelka–Munk or conservation-grade pigment physics. No background-wide blur is added.

## ArtCraft structural/five-axis gates

| Axis | Semantic region | Expected evidence | Failure to reject |
|---|---|---|---|
| Topology | near/far eye sockets | pupil/iris clipped *inside* authored aperture, continuous head-rig ownership | detached or floating pupils; iris bleeds over lids |
| Weight | full face + collar | face values > cheek washes, dark accents only around pupils, nose junctions and hair | one dominant solid hair/coat patch with flat forehead |
| Flow | scalp to temples | tapered curved highlighted washes, short pencil clusters following root direction | equally spaced vertical line grids |
| Rhythm | cheek/temple lost edges | variation in size and sharpness between wet midtones and crisp lashes | uniform outlines and blanket blur |
| Texture | cheek and hair at final size | edges soften locally without changing adjacent sclera or skin opacity | cartoon polygons, chalky face, globally smeared mouth |

**Acceptance:** changed-source TS/limited tests; focused dual-aspect Chromium Storybook screenshots with soft-edge toggle on/off; actual FilmStage full-resolution frames and short animated MP4. Do not label as artist-approved without independent painter feedback. Preserve WC9–11 heron and old actor film regression tests. At final release retain the browser/FFmpeg workflow as manual-only to protect CI credits.

## Remaining high-priority craft after WC12

- Multi-angle human head anatomy with face planes consistent at 3/4, profile and chin tilt.
- Portrait-specific brush path pressure/width, not just filled SVG shape layers.
- Better cheek/jaw feathering and water blooms with fiber distribution measured from paper.
- Eyes with actual eyelash roots, tiny tear line and realistic specular occlusion.
- Several ethnically diverse original sitters/ages, different lighting and body turns, true rig reusability and proof crops.
