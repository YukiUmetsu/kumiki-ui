# Crayon ArtCraft F1 V47 — source-measured, ANAT1-normal-weighted continuous facial wax

**2026-11-17 · PR #461 DRAFT / ART HOLD · experimental `!dev`.**

## Reference and failure being corrected

The only identity reference remains **Christopher Campbell, [*Brunette woman portrait (Unsplash)*](https://commons.wikimedia.org/wiki/File:Brunette_woman_portrait_(Unsplash).jpg), CC0 1.0**. The exact pixel benchmark is the **608×1082 original photo browser screenshot** (SHA256 `f8d28cbede8c8c14f9902a328b6e979e353fd9ebe6efb454bda3152586b929c2`), stored in [source proof artifact 14148787169](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43682633614/artifacts/14148787169). This is **not** the original uncropped camera photograph.

V46 improved near-eye **shape** (iris ROI SSIM 0.457611→0.512308, entire eye 0.394864→0.414968) but whole-photo SSIM was only 0.497072 and mean RGB error increased slightly. At original 1×, the photographed cheek has dramatic continuous light-to-shadow roll that the native illustration still renders as largely uniformly pale, with visible graphic disconnected nose/eye marks and paper scumbles. V44's experiment darkened five coarse isolated wax polygons and visibly **regressed** source SSIM and authentic material finish. The next trial must not repeat that failure.

**Physical medium:** [Rudolf/Mould/Neufeld, *Bidirectional Deposition Model of Wax Crayons*](https://people.scs.carleton.ca/~mould/papers/crayon-cgf.pdf) describes pressure-dependent pigment deposition and tooth; [Philadelphia Museum of Art, *Descriptive Terminology for Works of Art on Paper*](https://legacyweb.philamuseum.org/doc_downloads/conservation/DescriptiveTerminologyforArtonPaper.pdf) documents surface layering and edge character. Maintain native CRAYON1 `dry-wax` contacts; no photo texture, image fill, external image-generation effect or flat polygon skin sticker is permitted.

## Independent exact-photo 7×7 RGB median witnesses

Re-read the existing licensed 608×1082 **original screenshot** and the byte-extracted **V46 native Chromium f299 PNG** from [verified source evidence artifact 14310999761](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/44045846628/artifacts/14310999761). The values below were calculated directly with NumPy/PIL, no photo re-coloring, registration or contrast normalization.

| Continuous facial field and sampled point (x,y) | Original CC0 RGB | V46 native RGB | Current defect |
| --- | --- | --- | --- |
| Lit malar crest (193,622) | (240,207,191) | (224,187,168) | photoreal source highlight ~20 channels lighter |
| Lower malar return (220,688) | (203,151,128) | (223,186,166) | wrong gradual warm shadow falloff |
| Orbital→malar (201,582) | (189,150,136) | (209,175,158) | insufficient upper-cheek shadow |
| Lateral undercheek (133,702) | (123,85,67) | (203,166,149) | missing ~80-channel 3D underturn |
| Deep lateral jaw (155,762) | (129,92,75) | (197,162,145) | insufficient crease light occlusion |
| Nasal root (333,533) | (124,95,90) | (199,167,153) | too little inner orbital depth |
| Nasal ridge transition (367,595) | (226,192,174) | (200,164,148) | highlight under-rendered |
| Mandibular roll (261,830) | (177,133,108) | (197,163,148) | continuous jaw turn overly light |

One sampled pixel does **not** define a skin region. The trial uses **continuous anatomical source-image trajectories** and 468-vertex ANAT1 mesh vertex light to direct thin strokes without copying these colors as a global RGB texture. The original photo, source eye geometry and original native rendered V46 remain available as exact controls.

## Topology, 3D flow, wax deposition, depth and motion

**1. Connected topology:** Existing V46 portrait and all elements are a **deep-equal unchanged prefix**. Do not alter or truncate any of the original face/head/hair/tooth/glint/makeup/cornea/naris/brow, 19 source-traced foliage components, exact 3D eye aperture, film camera or seeded animation. **Exactly five** additional contours are appended under original `face-outline` parent `clipToParent:true`, IDs `cc0-anat1-form-malar-light`, `-orbito-malar`, `-lateral-cast`, `-nasal-root`, `-jaw-roll`. No new solid/wax masks or changed authored painter indices of existing nodes.

**2. Source-led orientation:** Five hand-selected **source image cubic guides** follow upper malar crest x161–222,y596–659, orbital trough x191–298,y581–633, lateral underturn x125–214,y636–823, nasal-root to alar-sidewall x331–387,y520–629, and mandibular roll x210–374,y790–847. Their source-geometric tangents and normals define all the actual dry-wax contact direction and placement. Never replace the face with generalized cosine blobs, copied photograph panels or uniform strokes.

**3. ANAT1 mesh normal-weighted pressure:** The existing fitted 468-vertex ANAT1 face determines pose and local surface light using `renderMeshFrame(...).vertexLight[FACE_LANDMARKS]` for photographed cheekbone.R, palpebrale-inferius.R, zygion.R, sellion and menton. This 3D light factor only modulates **small wax pressure offsets**. It never moves source identity landmark coordinates or infers the sitter's true 3D scan. The source's observed pigment error and real photo cubic trajectories have priority. Explicitly do **not** claim the vertex lighting is ground-truth measured BRDF.

**4. Physical wax and micro-elements:** Source trajectories generate 82 lit malar, 70 orbital, 115 lateral-shadow, 65 nasal and 82 mandibular **short varying, connected cubic contacts** within their single native CRAYON1 contour group each. Individual strokes have non-uniform length, normal offset, low-opacity dry-wax pressure and facial-plane-dependent width (.59–.97 source pixels) to avoid a hard glued-on shadow sticker; all five groups keep native paper tooth, sparse missed contacts, parent clipping and a photograph-derived warm shade. No new raster or external material. The many small curves are one layered wax gesture, not 414 randomly oriented hairs.

**5. Temporal/stable film:** Opt-in `midfaceForm:"source-anat1-continuous-face-v47"`, all 300 original frames, original source `seed`, paper and camera. Late value finishing starts at original frame 245 and completes at 299 without changing earlier registered anatomy and source hair motions. Original V46 remains an independent selectable negative control. Three !dev Storybook states show full portrait, 1.6× connected cheek and near-eye/orbital macro, with normal timeline controls.

## Tests, possible failure and acceptance

- Same-head strict unit/TS: all original source elements exactly unchanged by V47; five (and only five) appended `contour` objects with expected ID, pressure/width/range, parent clip, valid source bounds, correct n=414 independent source-oriented cubic contacts; both detail .2 and 1 and both sparse/rooted source lash modes; deterministic render; no invalid source, source omission or double application.
- Same-head native Chromium: compare **same 608×1082 source-camera f299** V46 vs V47, plus 2.1× cheek macro. Protect actual decoded PNG original unaffected upper-left foliage and far-eye tissue; reject any incomplete Chromium tile raster or overpaint of the far eye/nose/hair. Require source RGB/SSIM at whole image and eight above photographic features and measure *local* color/shape regression, not just DOM IDs.
- **Art rejection conditions:** Brown wax scratch banding, overly regular parallel strokes, material too neat/homogeneous, darkening at wrong location, disconnected cheek highlight, photo-relative whole or cheek-region SSIM regression, overpaint onto eyes/nose/eyelids/hair, contour widths looking like dark facial hair or false pore lines, or failure to materially increase connected 3D face appearance. If observed, retain only as `!dev` negative research, not production.
- Release: Existing global **≥0.85 CC0-photo SSIM** gate remains. Final-render independently observed **18 anatomical landmarks, five complete facial value regions**, all 300 naturally played animation frames, independent artist evaluation, and source-to-render visual inspection at 1×, 1.6×, and near-eye detail are **not** satisfied by these tests.

## V47 independent native Chromium image and artist review

Actual same-head code commit **`0eefb55d59d871b5903b0953f34972fa5a058449`**, saved native SVG/Chromium screenshots at full **608×1082** f299 for both negative-control **V46** and V47 experimental stage, plus the exact original-camera 2.1× cheek macro. Original CC0 photographic RGB bytes were compared to the **unmodified** original f299 native PNGs via `skimage.metrics.structural_similarity(photo,render,channel_axis=2,data_range=255)`. No transforms, image overlays, alignments, sharpening, or contrast postprocessing.

**Source and rendered evidence:**
- [Native 1× whole portrait, 2.1× cheek V46/V47 matched screenshots, artifact **14341401786**](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/44111816738/artifacts/14341401786).
- [V47 native Chromium screenshot check PASS](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/44111816738); [strict TypeScript and changed unit suites PASS](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/44111816712); [native drawing grammar PASS](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/44111816722).
- The initial run identified two *real* integration faults (photographed eyebrow follicles are `kind:"contour"`, not `"wax"`; ANAT1 `HumanFrame.vertexLight` stores **signed n·L in [−1,1]**, so the shadowed jaw legitimately yields a negative value). Fixed both with explicit native type and signed-light normalization. All three workflows subsequently passed at the exact pixel generation commit.

### 608×1082 exact original-photo comparisons

| Photo source ROI x0,y0,x1,y1 | Native V46 SSIM | Native V47 SSIM | Δ | RGB MAE V46→V47 |
| --- | ---: | ---: | ---: | --- |
| Whole portrait (0,0,608,1082) | **0.497072** | 0.496756 | **−0.000316** | 27.79→27.78 |
| Full face (108,282,502,862) | **0.623006** | 0.622086 | −0.000920 | 27.60→27.59 |
| Near eye (175,450,360,625) | **0.576375** | 0.576103 | −0.000272 | 33.84→33.84 |
| Malar crest (145,580,250,680) | **0.788520** | 0.788274 | −0.000246 | 15.09→15.09 |
| Undercheek shadow (107,620,233,830) | **0.665734** | 0.658880 | **−0.006854** | 42.86→42.74 |
| Infraorbital (190,565,330,660) | **0.743826** | 0.743649 | −0.000177 | 23.67→23.67 |
| Nasal root (310,515,405,650) | **0.654919** | 0.653032 | −0.001887 | 22.78→22.80 |
| Jaw turn (196,784,390,864) | **0.696713** | 0.693215 | −0.003498 | 24.16→24.09 |
| Entire near cheek (117,585,310,810) | **0.765417** | 0.762345 | **−0.003072** | 28.49→28.43 |
| Far eye negative control (415,475,470,535) | 0.339835 | 0.339835 | exactly unchanged | 51.90→51.90 |
| Upper foliage negative control (0,0,80,75) | 0.560451 | 0.560451 | exactly unchanged | 16.61→16.61 |
| Near iris original control (239,531,292,570) | 0.512308 | 0.512308 | exactly unchanged | 28.87→28.87 |

This validates optical isolation: the original V46 face and all 18 source hair groups and V43 photographic foliage are preserved and 5 normal-weighted contours change just **~0.07% of full image pixels** (and ~0.19% within the full face). However the new marks **do not** form a continuous broad facial value field: the missing ~80-RGB lateral cheek shadow remains, and the new wax fragments make unnatural isolated dark dots/moles and abrasion-like parallel scratches on the cheek at 1×/2.1×. Negative controls are pixel identical.

**Critical ArtCraft conclusion: REJECT the V47 candidate as a visual-improvement claim.** A tiny MAE gain is outweighed by worse SSIM in every touched region; material-level form and anatomical likeness do not improve. The five opt-in `!dev` scumble groups remain an isolated implementation/negative experiment only. Their tests passing **does not** constitute artistic acceptance.

### Next implementation priorities

1. **Change the actual light-bearing volume**, not add more surface flecks: source-observed 3D-coherent underpaint, calibrated across the near cheek and nasolabial return and using the ANAT1 camera and smooth normal field. Broad wax occupancy must replace default flat skin *without cutting out/tile-like hard planes*. Use multiple physically contiguous wax glazes and preserve skin texture.
2. Recover actual source eye/eyebrow detail, scleral curvature, tearfilm, cornea and the subtle lower-lid-to-cheek geometry. V46 remains the stronger selected experimental anatomy candidate.
3. Develop a **photo-relative 3D surface map** (smooth, continuous 2D chromatic/luminance errors with optical depth) and compare each region under an identical f299 source and seed. Distinguish source makeup, occlusion, pigment tooth and human skin surface; do not assume the generic ANAT1 mesh is the sitter's 3D scan.
4. Audit real **18 final rendered landmarks, five continuous source facial plane ranges, all 300 frames at normal speed**, and independent artist approval. No merge until the original ≥0.85 source similarity gate and visual review are met.

**Final V47 status:** DRAFT, ART HOLD, **not approved**, do not merge PR #461.

