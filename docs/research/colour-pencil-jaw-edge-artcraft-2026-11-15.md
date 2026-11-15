# ArtCraft CP18 — source-measured mandibular tooth recovery

2026-11-15 • research primitive, **not artistic sign-off**.

## Authentic references and deconstruction

**Licensed sitter source**: Christopher Campbell, [*Brunette woman portrait (Unsplash)*, Wikimedia CC0](https://commons.wikimedia.org/wiki/File:Brunette_woman_portrait_(Unsplash).jpg), the exact 25-landmark photo already measured in kumiki-ui's photograph-conditioned colored-pencil atelier. Independent instruction/technique references (no artwork copied):
- [Royal Talens, portrait drawing with colored pencil](https://www.royaltalens.com/blogs/pencils/portrait-drawing): very sharp individual pencil tips for detail, work gradually in layers, shadow greys/browns instead of outline-black.
- [Kirsty Partridge, *The Coloured Pencil Guide to Drawing Skin*](https://kirsty-partridge.s3.amazonaws.com/wp-content/uploads/2021/10/11162613/Drawing-Skin-Coloured-Pencil-Guide.pdf): real skin transitions should be continuously graduated, never copied as broad bright/dark ruled hatching.
- [Justin Maas, *Portrait Drawing with Lyra Rembrandt Polycolor*](https://assets.ctfassets.net/f1fikihmjtrp/3M5deVdW8BF7XIDQvunZPx/fcf171dc2381a62fb64e7b58fc9d837b/LYRA_Combined_PDF.pdf): measure accurate contour and mass before more tonal layering, then selectively recover value.

**Firsthand visual deconstruction:** inspected actual PR #405 285×318 *licensed photo vs entire 120k+ dry-pencil mark canvas*, including 5× jaw close-up. The source has a *gradual umber underchin edge*. The code-rendered jaw has hundreds of tiny **white / ivory pocks gathered into an almost ruler-straight, chalky mandibular arc**. This is visible at normal video scale and has no photographed physical white-rim counterpart. Root cause: sparse pencil nibs stop at polygon boundary while subsequent bright paper tooth remains between face and darker hair/neck. This is NOT a problem to solve with blurred vector/photo pixels.

## Quantitative before evidence, exact sourced contour

The 18-point CC0 face contour is projected using existing source eye separation/hairline. In the published 285×318 landscape Chromium proof, jaw landmarks from polygon index 8–15 map to native screenshot:

| Segment | Projected x,y | Photo vs existing dry-pencil Y difference at contour (approx) |
|---|---|---:|
| 8 | (204,221)→(189,237) | +38 |
| 9 | (189,237)→(171,246) | +17 |
| 10 | (171,246)→(146,244) | +13 |
| 11 | (146,244)→(120,231) | **+57** |
| 12 | (120,231)→(99,211) | +32 |
| 13 | (99,211)→(84,184) | **+56** |
| 14 | (84,184)→(73,151) | +36 |

These are observed canvas RGB-to-luminance deficits, not invented theory. Besides the high-contrast line, the high-frequency grain is excessive across forehead, cheek and lower face.

## Mechanism

New pure `createPhotoJawToothFibres(source,drawn,guides,face,crop,strength,seed)` examines photographic source pigment **and** the already-painted dry paper canvas at corresponding projected positions. Only when **(a)** the source Y is dark (<=185), **(b)** the dry colored-pencil canvas is brighter than source by >=19, **(c)** the location belongs to observed jaw contour segments 8–14, and **(d)** the point is on-frame may a new nib be authored. Mark count stays under 3× 140×7 and usually far less, deterministic by seed. Offset pressure varies according to **measured missing pigment**, with local warm/neutral umber sampled from the real sitter. Short curved pressure gestures follow the measured contour tangent, with 3 slightly displaced bands to supply optical tooth rather than a single uniform eyeliner-like rim. The original 120k+ code-driven gradients, delicate eye/lip/iris and hand-like hair strokes remain unchanged.

The result contains **only** finite quadratic pencil-mark properties, no image/raster objects, copied source photo, pixel-stamped texture, vector whiteout, source underpaint, blur, color-grade or synthetic 3D mesh. The read-only drawn canvas is used *only for deciding where physical pencil pigment is missing*; it is never mutated or blended directly.

Existing one-folder Color Pencil Reference Atelier gains an explicit **0–100% Photograph-verified jaw paper-tooth repair** toggle, source-supported mark count, full-head and final storyboard frame only. 0% is bit-identical to pre-CP18. Other storyboard phases remain their original unaltered material stages. Separate independent photo-to-pencil video export remains byte-identical.

## Release acceptance

- Pure unit: disabled identity; same-seed/different-seed determinism; physically finite curved tips; **no marks** on bright source or existing already-dark drawing; clipped/offscreen source/paint no marks; no input mutations and hard validation.
- Chromium: source photo/legacy/enhanced at identical 285×318 for **both 16:9 and 9:16**, 0/100 slider, live count and unchanged normal video, realistic jaw polyline source-vs-dry luma/MAE relative to source; protected nose/lip/iris/hair/background pixels not altered.
- Actual 1× and 5× visual review, not merely CI pass, before merging. Preserve natural soft jaw edge (no black vector contour). **Whole-face craftsmanship and independent likeness remain NOT approved.**
