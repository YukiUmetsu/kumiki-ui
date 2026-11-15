# PAPER-D1 — Reference-led general-purpose paper film director

**ArtCraft v7**: find → inspect → dissect → specify → construct → render → compare → refine.

## Creative brief and source board

Goal: compose any *author-provided* cut-paper SVG subject into a multi-shot 2.5D film, in both 16:9 and 9:16, without a separate compositor, duplicated clock, ghosted actors or bespoke Storybook folders. Artistic aspiration is wide genre coverage, **not** a claim that arbitrary character art or mechanical folding becomes realistic automatically.

At 960×540 and 540×960, maintain three inspectable invariants: (1) every finished cardstock subject is opaque and all holes are genuine, (2) at shot boundaries the entire composition changes without semi-transparent layer mixing, (3) moving attached component sheets share translation and preserve their existing pivots. Important: physically stacked cardstock stays visually separate from a 2D photographic filter.

| Reference | Observed from accessible image/guide | Architecture translation | Rejected shortcut |
| --- | --- | --- | --- |
| [Kraken lightbox, Computer Aided Crafting](https://www.computeraidedcrafting.com/art/kraken-light-box) | Cut paper forms a nested frame: dark near foliage, distant ship, moon and 8 depth layers | Real independent PAPER1 cut stocks, optical depth with bounded overhead camera | Transparent collage overlay and flattened atlas |
| [Aline Maire, enchanted forest](https://mymodernmet.com/paper-light-box-art-aline-maire/) | Top and side branches attach into continuous canopy over open illuminated clearing | Preserve existing woodland canopy topology and light-filled gaps; no separate unrooted leaf drift | Disconnected foliage stickers |
| [CCEA cutout animation guide](https://ccea.org.uk/downloads/docs/ccea-asset/Resource/Film%20and%20Animation%20at%20Key%20Stage%202.pdf) | Paper objects, top-down staging and silhouette puppet motion are distinct from freeform character deformation | Per-part finite 2D pose tracks and existing PAPER1 hinged flutter | Global rubbery squash / arbitrary independent rotation |

The first two finished works were visually studied at **search-preview scale**; no unlicensed images or source crops were stored. Source-level pixel fidelity, high-resolution microdetail, exact match scores and external frame-by-frame motion inspection remain unverified. Original high-detail source art used in the demo already resides in the validated PAPER1 landscape, botanical and object kits; their earlier research ledgers remain authoritative. The original film edits are not traced from any listed artwork. Structured source/feature ledger: [reference-study JSON](paper-director-artcraft-reference-study.json).

## Construction map

```text
PAPER-D1 Film (durations, two independent aspect layouts)
  Shot 01 -> PAPER1 woodland: sky / mountains / rooted branch mesh / water / frame
  Shot 02 -> PAPER1 botanical: medallion / flowers / moth wing rig + body
  Shot 03 -> PAPER1 architectural: canal / house blocks / windows / bridge / frame
  Shot 04 -> PAPER1 engineered object: camera body / lens rings / dial / frame
    Each cut = opaque SVG path + optional true holes + depth + pivot + poseKeys
    Every shot = own backing + stocks + overhead cameraKeys
    FilmStage = frame clock, production outputs, soundtrack, captions, external transitions
```

No new character facial anatomy is invented in this work. A future realistic paper-human system needs verified references and a separate ArtCraft character-specific anatomy/rig gate, not generic shapes.

## Shape → motion contract

| Control | New API | Physical interpretation and bound |
| --- | --- | --- |
| Cut-piece movement | `PaperCutLayer.poseKeys` | deterministic x/y (±4096 stage px), rotation (±180°), exact increasing frames |
| Timing | `ease`: smooth, linear, hold | in/out card motion, sliding tabs, stepped stop-motion hold; no jitter between seeks |
| Overhead camera | `PaperCraftSpec.cameraKeys` | x/y within 12% of largest edge; zoom 1–1.18; centered SVG world transform |
| Shot sequence | `PaperDirectorFilm.shots[].scenes.landscape/portrait` | native aspect-specific authored geometry, shared FPS and shot duration |
| Material | Existing PAPER1 `PaperCraftStage` | unchanged opaque cardstock, true apertures, shadows, tooth, all five media |
| Film export | FD1 `paper-craft-director` slot | storyboard JSON or verified app-level demo preset; no extra timeline or media codec |

Hard cuts were chosen deliberately. Transitional shutter/curl sheets and multi-person joint constraints require real construction and are future work, not alpha-fade placeholders.

## Negative controls and QA evidence contract

- Do not shift one butterfly wing without the rest of its body translation: it will disconnect from the named hinge.
- Do not let a new camera zoom below 1 (reveals uncropped stage) or above 1.18 (over-crops subjects); reject NaN, out-of-order keys, off-stage tracks and unknown film styles before render.
- Do not let portrait be stretched landscape art; require aspect-specific source-spec, consistent scene dimensions and FPS.
- Do not claim that arbitrary SVG paths or automatic smooth camera motion guarantees compelling illustration. Inspect actual native film output at thumbnail, full resolution, and major attachment crops.
- End-of-frame replay must be deterministic under shuffled absolute seeking; reduced-motion resolves to the final static per-shot state.
- Film boundaries `239→240`, `479→480`, `719→720` must be hard cuts with no ghosting.

**Current validation status (pre-merge)**: technical and visual gates are pending CI and final output inspection. After the first render, record the top three actual visible defects, fix structural causes, regenerate the same views, and keep the final review status explicit. Unsupported: source-faithful complex characters, true V-fold engineering, depth compositing with occlusion-aware articulated IK, audio-driven acting and fully automatic art direction.
