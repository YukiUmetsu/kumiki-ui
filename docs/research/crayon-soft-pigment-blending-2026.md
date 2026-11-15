# Crayon portrait wax blending — ArtCraft reference/implementation review

**Status:** engineering implemented, artistic quality **not yet approved**.
The user's provided ArtCraft design board (especially the face and adult
character crops) has tactile transitions between flesh, warm reflected light,
under-eye shadows and hair roots. The current native SVG render, even after
smaller eyes, still has visible hard polygons across cheeks and nose.

## Source-led references and specific observations

- [Kassia Rico, crayon portrait (Behance)](https://www.behance.net/gallery/14450891/Portraits-2013-Crayon/modules/124832885):
  warm gold light and violet/cool cheek shade transition through overlapping
  rubbed strokes; neither region has a ruler-sharp vector polygon boundary.
  Third-party **technique** reference only, not for tracing anatomy.
- [Art Prof, *Oil Pastel Portrait Drawings*](https://artprof.org/learn/tutorials-media/drawing/oil-pastel-portrait-drawings/):
  start with big tone masses; use varied contact pressure, layering and blending;
  shaded sclera reflects the upper lid rather than unpainted white paper.
- [Art Prof, *Drawing a Portrait in Oil Pastel*](https://artprof.org/learn/drawing-a-portrait-in-oil-pastel/):
  observe **shapes of light/shadow** instead of symbolic feature stickers;
  broad side-nib coverage first, eyelids before pupils, then fine drawn accents.
- [Courtauld Portraiture Toolkit (PDF)](https://courtauld.ac.uk/wp-content/uploads/2021/05/Courtauld-Portraiture-Toolkit.pdf):
  the physical stroke direction and juxtaposed value fields should establish
  depth; avoid globally homogeneous synthetic speckle.
- [Yolanda Blázquez, oil pastel portrait demonstration](https://yolandablazquez.com/blog/how-to-paint-a-realistic-portrait-with-oil-pastels):
  blend early masses, then reclaim local definition with harder pastel marks.

## Concrete source-to-code decisions

| Art region | Previous flaw in real Chromium renders | Change to editable construction | Render evidence still required |
| --- | --- | --- | --- |
| Temples / cheek / jaw | harsh mauve wedges and visible geometry seams | soft pigment glaze over **opaque** continuous face; parent clip ensures wax never leaks off the facial silhouette | eye/cheek/jaw at 1x and 3x, both aspects |
| Nose sidewall | digital purple triangle instead of blended cartilage | softer, lower-pressure narrow local glaze, anatomical bridge and alar wing remain separate geometry | 1x/3x nose bridge/alar microcrop |
| Brow region | flat shelf over floating sclera | clipped diffuse socket tones without blurring iris and lid outlines | eyelids / tear ducts at final-size frame |
| Full figure | opaque subject required against any background | the full underpaint remains unfiltered and solid; only *open* upper pigment glazes can be blended | dark and light background check |
| Film/animation | local edit could change distant source seeds | no new scene elements or changing original order; serializable per-wax field and deterministic clipping | source-identical scrubbing at frames 0/150/299 |

### API

- `CrayonWaxElement.blendRadius?: number` is a finite 0..18 SVG-unit
  blur applied **only** to `coverage:"open"` tonal glazes. Zero preserves
  old output. Unlike generic blur of the whole character, this applies only
  to the glaze underlying tooth-aware, directional marks.
- `CrayonWaxElement.clipToParent?: boolean` uses the original parent wax
  shape and original source-frame drawing, analogous to already-supported
  fur contour clipping. It is not a screen-rectangle mask.
- Invalid radius, opaque blending and missing clip parents are rejected at
  the CRAYON1 JSON source boundary.

## Explicit shortcomings

This is **not** a complete source-match: gradients may look overly digital
and locally blurred contours need visual review at 1x and 3x; no calculated
SSIM or five-axis fidelity score has been obtained. Do not expose hidden
character Storybook stories based on these engineering checks.

## Actual browser critique: hard-wax versus soft-scumble and source revisions

The revised ArtCraft proof run [43661549747](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43661549747)
confirms that configurable incidental marks and soft glazes make the face
cleaner, but **rejected** on quality: the broad nose became too faint,
lower hair locks became two stiff hanging prongs, the coat silhouette read
as a padded blue vest and the blouse V looked like a geometric void.

Further code adjustments replace those straight hanging locks with shorter
rooted curls, restore subtle dorsal/alar pigment marks, and add an opaque
rolled burgundy scarf with individually clipped warp/weft pigment strokes.
Scarf drape is treated as **geometry first**, not an image overlay.
Re-render and inspect before approving. No source-contour fidelity score is
asserted, and all character Storybook pages remain hidden.

## Revised close-crop review from live browser proof

The exact native browser screenshots from
[run 43661894830](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43661894830)
were reviewed at original 540×960 plus eye and nose/mouth crops:
the cheeks and face were over-smoothed, bridge/alar anatomy nearly vanished,
brows looked like two isolated vector arcs and lips lacked clear volume.
Despite newly added cloth, the portrait remained **artistically rejected**.

Next implementation restores the nose tip, alar volume, eye-socket
substructure, malar warmth and individual brow hairs with named, clipped
wax sources. No official release score is claimed. Keep all character
pages hidden until comparative ArtCraft inspection passes.
