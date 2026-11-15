# Colored Pencil ArtCraft v15: Needle-Sharp Skin Tooth

**2026-11-15 — technical experiment, not likeness/artist approval.**

## 1. Reference-led material analysis

Source of topology/value: Christopher Campbell, [*Brunette woman portrait (Unsplash)*, Wikimedia Commons CC0](https://commons.wikimedia.org/wiki/File:Brunette_woman_portrait_(Unsplash).jpg). Use the existing 25 source-observed guides and finished source-vs-code Chromium proof; **do not** raster-stamp this photograph into the drawing.

Source face vs v14 full-head code at actual 285×318 Chromium 1×, from the same image and identical crop:

| Facial region | Licensed source 5×5 high-pass luminance σ | Code v14 σ |
|---|---:|---:|
| Forehead (x90–175, y46–91) | 2.1 | 12.5 |
| Cheek (x75–160, y124–192) | 4.3 | 14.1 |
| Jaw (x90–180, y200–235) | 2.4 | 14.9 |
| Nose (x150–210, y115–160) | 6.5 | 15.9 |

This sixfold excess high-frequency paper-grain competes with the actual anatomical form, even though the skin weave improved source-local luma in v14. **Do not fix it with a Gaussian blur of the finished portrait:** that would erase the true limbus, pupil, nasolabial edge, lip seam and rooted hair.

Independent technique-only craft references (do not copy contours, finished artworks or medium textures):
- [Alyona Nickelsen, *Colored Pencil Magazine AMA*, January 2017](https://coloredpencilmag.com/amaalyona/): the obvious light/dark grain is caused by distinct dark pencils over a pale substrate; use a sharp pencil, very tight individual light-pressure marks and carefully progressive chromatic layers rather than a few loud wide strokes.
- [Janie Gildow, *How to Color with Colored Pencils*](https://www.desertmuseumarts.com/_files/ugd/7a6b2d_b5b3d4744f55473394fbd965bad1a04a.pdf): long sharp points reach tooth for even fill; overlapping elongated loops and gradually reduced pressure avoid coarse pocked halftones.
- [Alyona Nickelsen, Jackson's Art blending lecture](https://www.jacksonsart.com/blog/2018/08/08/alyona-nickelsen-on-blending-coloured-pencil/): a pencil's natural sharp line should remain, broad work requires enough lightly spaced touching contacts; retain selective crisp details.

## 2. Topology, strokes and boundaries

Pure `buildPencilNeedlepointSkinContact` works only on the existing `face-optical-weave` source-confirmed marks, not on eye, iris, lip, nostril, hair, boundary or ordinary unrelated pencil characters. Along each quadratic fibre, 0–8 additional **subpixel sharp-point contacts** deposit pigment in pairs to its left and right. Their lateral distance is less than the parent width; each retains original source-derived hex, temporal pass, touch direction and curve. Micro-pressure and fine width are deterministic per source fiber/seed and independent of storyboard timing.

The renderer clips **only new microfibres** to the existing observed face polygon, projected from source pixel coordinates onto the 540×600 paper; it leaves the original sharp line and ALL older material unchanged. Every source mark survives and the four-shot paper storyboard uses exactly the same deposition order; there is no raster face, CSS blur, painted polygon, photo underpaint, copied texture or flat burnish.

Expose a 0–100% reversible `Needlepoint skin optical fill` control in **the existing Colored Pencil Reference Atelier folder**, and a numeric count of the extra deposited microfibres.

## 3. Real negative gates

- Pure Vitest: 0% output is the original mark **by object identity**; 100% deposits exactly 8 additional finite pigment arcs plus the immutable original; paired symmetric lateral coverage; no hue/contour stamp; exact deterministic seeds; invalid marks/strength reject.
- Chromium: actual licensed CC0 full-head screenshot at 0% and 100% under the same zoom, seed and material; **both** aspect modes; 0% canvas bitwise matches previous v14; ordinary video export never changes; full four-shot stages remain increasing.
- Quantitative image proof: compare code-v14 vs v15 luminance residual/grain at original screenshot resolution in forehead, cheek, jaw, nose; prove needlepoint improves high-pass variability **without** flattening source gradients or erasing iris/lip details. The release remains experimental if the visual artist cannot distinguish a high-quality pencil face at 1×.
