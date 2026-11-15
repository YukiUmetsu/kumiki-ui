# ArtCraft v10 · dry pencil dark jaw-to-hair contact

Status: **experimental material study, NOT an artist-approved human portrait**.

## Authentic source, anatomy and vector deconstruction

- **Licensed measured portrait:** [Christopher Campbell, *Brunette woman portrait*, CC0/Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Brunette_woman_portrait_(Unsplash).jpg). The unmodified source is displayed beside an independently drawn dry-pencil rendering in the existing `Video Production / Film Looks / Colour Pencil / Reference Pencil Atelier` Storybook. The portrait and output are hand-registered to the same 285×318 visual crop. The original photo file and all artist-owned artwork remain external.
- **Technique-only study:** [Elena Pancorbo's original portrait gallery](https://www.elenapancorbo.com/) reveals how delicate skin-plane pencil edges meet deep hair masses without uniform white borders; [Jesse Lane](https://www.artistsnetwork.com/art-mediums/colored-pencil/photorealism-decoded-oceans-of-layers/) distinguishes fine, high-pressure occlusion contacts from built-up soft low-pressure skin layers. **Neither artist's pixels, contours, textures nor likeness are copied**.
- **Topology:** 18 independently hand-observed reference-photo silhouette points define the existing face. The left ear → cheek → jaw → chin boundary is segments 12–16. A source-space registration tolerance and subpixel hair masking removed valid dark deposits immediately beside this edge, despite near-black source pigment. The dry 540×600 plate consequently showed a continuous hair-to-face *white sticker* line that the original reference **does not** contain.

## Independent native Chromium source/output measurements

Measured in the previous all-green [ArtCraft photo evidence run](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43711354208) at `540×600` before correction, displayed at 285×318. Screenshot regions are the actual native source and dry drawing, **not** the original 5184×3456 photo and not an independent 18-landmark approval.

| Measured dark boundary | Crop pixel x,y | Source 5×5 mean luminance | Previous dry mean | Deficit |
| --- | --- | ---: | ---: | ---: |
| Upper jaw/hair | 82,180 | ~64.7 | ~147.9 | **83.2** |
| Mid jaw/hair | 99,210 | ~52.3 | ~132.2 | **80.0** |
| Lower jaw/hair | 120,230 | ~65.9 | ~133.6 | **67.7** |

The *single pixel* deficits were larger still, often over 140/255. These are true photo-dark brown contact points, not blank paper, pale cheek or specular glints.

## Material-native repair

`createDryPencilHeadPlate` retains all existing CC0 source measurements, independent hair fibres, skin chroma/value passes, 0–100% anatomy-flow A/B and all physical paper reserves. Only the left measured source-dark boundary gets fine 3-band curved pencil nibs. Each nib samples the real **photographic dark brown** pixel, checks that it is an actual warm hair/skin contact (not green garden or ivory bright skin), and uses deterministic fragmented, pressure-variable deposition; width/pressure vary. The strokes do not form a solid polygon, bitmap, general silhouette outline or painted photo filter. Existing individual eye, brow, nose, lip, hair and film marks are neither removed nor simplified.

`CC0_JAW_CONTACT_PROBES` records the three source/drawing 5×5 boundary patches, rejects source-region misregistration or a dry-vs-source luminance deficit ≥65, and **always** returns `artisticApproval: false`. Storybook displays the original actual-pixel readings in the same existing reference-atelier pane, with no new folder. Focused Chromium tests exercise both 16:9 and 9:16 and preserve old ArtCraft optical negative gates.

## Artist acceptance still blocked

Technical passing probes show only that an obvious white material gap has become less pronounced. A credible professional colored-pencil face still requires independent 18-point registered source/actual-output landmark validation, 1×/3× visual critique for overdrawn jaw outlines, more organic varied-pressure skin pigment, corrected eyelid/orbital volume and silhouette-to-neck continuity, plus motion extrema. Do **not** promote this portrait out of experimental `!dev` on CI alone.
