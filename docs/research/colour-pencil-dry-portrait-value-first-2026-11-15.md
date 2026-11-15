# ArtCraft v7 — value-first, source-guided dry-pencil portrait proof

**2026-11-15 · EXPERIMENTAL, NOT ARTIST APPROVED.**

## Reference observations before code

- [Jesse Lane, *Photorealism Decoded*](https://www.artistsnetwork.com/art-mediums/colored-pencil/photorealism-decoded-oceans-of-layers/): build general **value planes before details**, layer subdued complementary skin hues rather than flat uniform complexion, and reserve bright paper highlights. A detailed pupil on a flat cheek does not produce a convincing head.
- [Jesse Lane, interview in RJD Gallery PDF](https://rjdgallery.com/wp-content/uploads/2016/06/JESSE-LANE.pdf): the artist describes soft, controlled pencil scribbles over archival Bristol and photographic reference planning; the visible result is more than a high-frequency photograph filter.
- [Elena Pancorbo's portrait gallery](https://www.elenapancorbo.com/): eyes sink into orbital and malar planes, warm and cool contours separate the nose bridge and alae, and eyelid/lash edges are sharper than broad cheek transitions. Long free hair strands have root/volume structure.
- [CC0 Christopher Campbell source photograph](https://commons.wikimedia.org/wiki/File:Brunette_woman_portrait_(Unsplash).jpg): the **only anatomy and source-colour geometry** for this experiment. The portrait feature guide already encodes 25 manually observed photograph landmarks. No source-contour coordinates are taken from Lane or Pancorbo work.

We found from an actual same-source Storybook capture that the existing accepted *technical* output still looks like a softened photograph. ArtCraft's first task is to **remove the photo layer** in a bounded facial crop and inspect whether real laid strokes can carry facial value and feature structure.

## New isolated construction experiment

`createDryPortraitPlate` accepts the licensed source RGB bytes, measured face guide, crop (eyes/lips), and deterministic seed. It composes a **360×240 paper plate** from:
1. A coarse **value** scaffold: shallow diagonal strokes whose pressure follows *sampled* source value instead of uniformly colored rectangles.
2. A second **chroma** cross-layer: cooler local pigment over the broader values, never skin-tone assumptions.
3. **Contour/detail** deposits: orientation follows local source luminance gradient near strong transitions (inner lids, nostril/lip edges), preserving white glints.
4. Existing measured lid, iris, brow, nose and lip feature marks transformed to the exact source crop; all endpoints and controls are clipped to the paper support.

Crucially, the final canvas is initialized from **plain ivory paper** and receives **individual pencil strokes only**: no `drawImage`, `putImageData`, copied pixels, photo wash or photographic underpainting. Source sampling controls mark positions, pressure and pigment colour; the algorithm is still *photo-conditioned*, not a fully standalone editable facial 3D/2D geometry model.

The original atelier still shows its photo-derived output, with the no-photo plate adjacent in the **same existing** `Video Production/Film Looks/Colour-pencil` Storybook folder. Both use the same source, crop, selected region and seed, so the difference is transparent and falsifiable.

## ArtCraft five-axis review, honest status

| Axis | What is actually measured/constructed | Remaining limitation |
| --- | --- | --- |
| Connectivity and occlusion | Named facial features are mapped from one licensed reference; no separate floating eye-white SVG | This is a sampled plate, not independent facial mesh topology |
| Silhouette and contour | Local gradient alignment around eyes/lips; no photo pixels in output | Hair/face boundary and jaw contour not separately authored |
| Proportion | 25 source landmarks project through actual Storybook framing, 120×80 facial crop | Landmark uncertainty and source/output independent 18-point gate pending |
| Value/material | Three individually drawn chronological passes, source-sampled pressure, two optical pigment directions, paper reserves | True burnish, paper spectral response, and pigment optical depth not calibrated |
| Temporal consistency | Stable seed / absolute mark data; crop control does not mutate exported photo-renderer pixels | This is a static detail study, not an approved full-film character rig |

**Acceptance:** unit geometry/determinism + 16:9/9:16 Chromium render captures are **technical tests**, not professional artistic approval. Compare source vs code-drawn eye/lip at 1× and 3×, record whether values/modeling read without the photograph, and reject/promote independently. Do not silently replace the gallery artwork or remove the `construction-rejected` label on the old manually built human. Continue with actual source-to-original head, jaw, hair, eyelid and mouth planes once the dry-only detail studies are visually acceptable.
