# CRAYON1 ArtCraft F1 V49 — source-observed oblique wax facial volume

**2026-11-17 · opt-in !dev, PR #461 DRAFT / ART HOLD / DO NOT MERGE.**

## Original source rights and reference deconstruction

- **Photographic subject:** Christopher Campbell, [*Brunette woman portrait (Unsplash)*](https://commons.wikimedia.org/wiki/File:Brunette_woman_portrait_(Unsplash).jpg), CC0 1.0. Exact original evidence: *unmodified original* 608×1082 browser screenshot, SHA-256 `f8d28cbede8c8c14f9902a328b6e979e353fd9ebe6efb454bda3152586b929c2`, archived as [source proof 14148787169](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43682633614/artifacts/14148787169). The original high-resolution camera JPEG is *not* certified from the screenshot. No image is included in shipping code or made into a React background.
- **Authentic physical artwork inspected for medium:** Patrick Stigliani's [*Colorful Man* 1981 ink and crayon](https://lostartsalon.com/products/95088): organic interrupted paper-tooth pigment, light over dark wax, asymmetrical facial structure and dark anchors. Kassia Rico's [*Portraits 2013 Crayon*](https://www.behance.net/gallery/14450891/Portraits-2013-Crayon/modules/124832885): continuous warm/cool plane change, oblique stroke flow and layered dark wax. Artwork is **only cited as reference; not traced, copied or redistributed**.
- **Physical wax mechanics:** Rudolf, Mould & Neufeld, [*A Bidirectional Deposition Model of Wax Crayons*](https://people.scs.carleton.ca/~mould/papers/crayon-cgf.pdf): crayon contact/deposition and paper micro-tooth. ArtCraft V49 retains V48's raised paper relief, tooth/pit/grain, multi-pigment pressure contacts and original drawn silhouettes. Rotating a *local pigment deposit* is not a substitute for physically oriented strokes or a sampled photographic texture.

## Five-axis construction: topology, vector flow, edge, depth, film

1. **Topology:** Original V46 source-measured orbital geometry, V30/V41 hairline and one connected 440×611 V30 facial silhouette remain untouched. V48's exact 8 skin fields are a preserved ordered prefix, not replaced by a cheaper flattened polygon. Four additional optional photometric deposits are appended within the same opaque face. **Every** original eye/iris/lash, hair/forehead/brow, nostril, mouth, foliage, paper and timing node remains deep-equal to V48; no new sticker IDs.
2. **Flow:** The original CC0 608×1082 source has downward/outward cheek occlusion, slightly upward-tilted near canthal lid, a diagonal alar/nasolabial return, and a warm illuminated oblique cheek crest. These photo-observed vectors determine **four signed rotations** of anisotropic wax pigment around source-image centers. Legacy source fields remain axis-aligned (no `transform`).
3. **Edges:** Each deposit uses its own native zero-alpha feathered elliptical wax gradient, clipped by the existing **animated** source face. It is under, not over, the native rubbed wax, pressure nib and paper tooth; no SVG image tags or canvas photo sampling. Ellipse rotation is within ±89 degrees, finite, and has no visible effect if absent or zero.
4. **Depth:** The V48 same-source photographed pixel witnesses reveal specific remaining 3D errors, rather than a reason to introduce generalized dark cheek stripes. The added field color/strength is a research hypothesis to be measured from actual candidate PNG; the generic ANAT1 468 mesh is not the sitter's own scan.
5. **Motion:** V49 reuses exactly the native source-camera 608×1082 film, same paper/seed and unchanged 300 frame IDs and drawing/exposure phases. The optic shading follows the original face parent; no frozen raster, camera counter-motion, CSS overlay or new timeline. Film review still requires actual normal-speed playback and 1×/3× source comparison.

## Source-station design before code / observed original V48 errors

The original source screenshot and the actual native V48 f299 `crayon-v48-full-source-anat1-photometric-underpaint-v48-299.png` from [native artifact 14343158434](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/44117668149/artifacts/14343158434) were separately sampled at **7×7 median RGB**, without retouching, recrop shifts or normalized contrast. All coordinates are in original 608×1082 source-image pixels.

| Original region / center (x,y) | Original CC0 median RGB | Native V48 median RGB | Geometric adjustment hypothesis |
| --- | --- | --- | --- |
| Lower-tarsal cast (255,583) | (141,94,80) | (197,164,150) | −8° thin near-eye pigment roll; source canthal slope x216,558 → x318,545 |
| Near lateral cheek (133,702) | (123,85,67) | (176,144,129) | +68° long oblique contour into lower face; *retains* existing V48 shading |
| Nasolabial/alar transition (357,656) | (185,147,139) | (210,176,159) | +53° narrow upper-to-lower alar depth, visually separate from the nostril cavity |
| Lit malar crest (175,615) | (237,206,186) | (219,185,166) | +30° soft warm bounce along cheekbone; not a white sticker or face mask |

**Contract:** `CrayonUnderpaintField.rotationDeg?` is a bounded signed source-direction angle. `CrayonScene` and native `WaxRegion` independently reject NaN, infinity or |angle|>89. No angle leaves old markup pixel-identical. New mode `source-anat1-oblique-volume-v49` requires **exact original V48 field list** and source V30 face bounds, and appends four unique observed stations (max 12 physical fields). This preserves all prior material, geometry and film options, and the complete original V48 negative control.

## Rejection / production gates

- Required in this experiment: strict unit/TS test of all source geometry and four anisotropic fields across both lash/density settings; pre-existing unchanged-scene and malformed source tests; a same-head real Chromium 1× and 2.1× V48↔V49 negative-control PNG pair; independent check that far-eye and foliage original pixels remain unchanged; actual source-photo ROI SSIM/MAE and screenshot art review. Passing DOM or unit tests is **not** visual approval.
- Reject if bright cheek becomes an artificial colored ellipse/sticker, lower-lid eye looks more icon-like, dark cheek value is over-burnished, eye/hair/foliage loses microdetail, or photo similarity regresses. If it loses source fidelity, quarantine V49 as a failed experiment; do not turn it on by default.
- Final release remains blocked until original global CC0 SSIM ≥0.85, 18 independently **final-render** source landmarks, five true contiguous face tone planes, natural-speed complete 300-frame review, original source likeness and independent artist approval. V46/V48 are controls, not certified photos. This work alone cannot approve or merge PR #461.

## Next after V49

1. **Geometry before color**: a continuous source-conditioned orbito-malar/alar 3D surface whose actual shadow boundaries meet the tarsus and nasal ridge; the current faceted nose and flat eyelid cannot be repaired only with more pigment.
2. Integrate source-photo irregular scalp/curtain root and fiber flow into hair mass without deleting prior independent curves.
3. Recover photo-observed foliage optical depth and variable-laminae microstructure behind the source hair.
4. Measure all original candidate anatomical points and natural-speed film, with artist rejection/approval documented separately.
