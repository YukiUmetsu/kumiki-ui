# Crayon ArtCraft F1 V52 — source-positive facial planes plus original hair wax

**2026-11-17 — PR #461 DRAFT / !dev / ART HOLD / DO NOT MERGE.**

Original photo: Christopher Campbell CC0 [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Brunette_woman_portrait_(Unsplash).jpg). Rights-verified evidence is original browser screenshot 608×1082, SHA-256 `f8d28cbede8c8c14f9902a328b6e979e353fd9ebe6efb454bda3152586b929c2`; the full original camera JPEG is NOT held here. Real material reference: [Mould et al. physical crayon deposition](https://people.scs.carleton.ca/~mould/papers/crayon-cgf.pdf), [Stockmar manufacturer wax-layering techniques](https://www.stockmar.de/en/service/publications/?cid=1237&file=files%2FContents%2FDownloads%2FKreativtipps%2FEN%2FSTOCKMAR_wax+crayons_getting-started_EN.pdf).

**Observed failure and engineering choice:** V51 9 additional dark/bright root contours obeyed source clip and had all green technical CI but were **visually rejected**: dark mechanical boundary stripes, not the photographed hair root whorl. Source/real-Chromium SSIM `.507668→.500779` entire portrait and hair crown `.367543→.349188`; all 7 measured hair ROIs regressed. [Independent V51 rejection with same-head native real pixels](crayon-f1-anat1-original-root-locks-v51-2026-11-17.md). V51 stays opt-in negative control, NEVER in new branches.

V49 source-oblique face underpaint improved **V48 whole .500630→.501302** and original near eye/nose/cheek without altering the photographically registered hair. V50 source-dark hair improved **V48 whole .500630→.507668** and all six photographed hair ROIs without altering face/iris/foliage. These modifications touch **distinct existing wax elements**: V49 modifies `face-outline.underpaintFields` (8 existing + 4 rotated color contacts) while V50 modifies only `hair-crown-surface`, `hair-left-curtain`, `hair-right-curtain` native wax underpaint (4+4+3 source stations).

V52 composes only those two independently photo-positive mediums on identical original CC0 608×1082 camera, seed, 300-frame timing and fully retained 267+ original dry-wax hair subcurves. Exact V48 underpaint reference and V50 hair references are required; malformed/missing roots, double application and V51 contours fail closed. There is no raster photo in the render, no new hair/body/face shape and no displacement of the original human source landmarks.

**ArtCraft acceptance not achieved:** Independently run exact head native 608×1082 full/2.1× cheek Chromium screenshots at f299, compare against same-source V50 with original-photo SSIM/MAE and protected far-eye/upper foliage, and inspect original 1×/3×. Whole photo SSIM must still reach .85, five source value planes, 18 independently measured painted landmarks, full 300-frame playback and independent art signoff before PR can merge.

## Actual same-head native Chromium and original-photo pixel audit — 2026-11-17

**Rendering code head:** `829d44c18afe4e5f45a872bdf466a0577a9ede0f`. **All relevant CI GREEN:** [strict TypeScript and changed unit](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/44129513844), [original physical CRAYON1 drawing test](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/44129513616), [actual Chromium source-negative-control screenshot tests](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/44129513655). Exact four real full 608×1082 and 2.1× cheek V50/V52 PNGs plus independent V48–V51 comparison snapshots: [artifact 14350215597](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/44129513655/artifacts/14350215597).

**Source:** exact originally saved CC0 608×1082 browser capture SHA256 `f8d28cbede8c8c14f9902a328b6e979e353fd9ebe6efb454bda3152586b929c2`; not the original high-resolution camera JPEG. Method: decode two actual native f299 Chromium PNGs at unmodified original camera/seed; SSIM via `skimage.metrics.structural_similarity(..., channel_axis=2, data_range=255)`, RGB MAE per 8-bit channel, unchanged image coordinates, zero retouching, scaling, overlay or color normalization.

| Source-photo ROI | V50 SSIM | V52 SSIM | Δ | RGB MAE V50 → V52 |
| --- | ---: | ---: | ---: | ---: |
| Entire 608×1082 image | .507668 | **.508340** | +.000672 | 26.087→**25.962** |
| Original face (175,410,375,830) | .724289 | **.727992** | +.003703 | 20.419→19.771 |
| Near eye (175,450,360,625) | .595561 | **.601072** | +.005511 | 30.491→29.239 |
| Original near iris (239,531,292,570) | .516876 | **.523483** | +.006607 | 27.827→26.657 |
| Nasal root (310,515,405,650) | .671679 | **.678243** | +.006564 | 20.057→19.572 |
| Original nose (342,555,466,671) | .557601 | **.562852** | +.005251 | 23.246→22.465 |
| Near left cheek (130,565,270,705) | .781170 | **.790037** | +.008867 | 21.121→19.216 |
| Malar crest (145,580,250,680) | .798264 | **.810029** | +.011765 | 14.269→12.262 |
| Lateral undercheek (107,620,233,830) | .711722 | **.716431** | +.004709 | 30.598→29.387 |
| Original crown (132,175,462,320) | .367543 | .367543 | 0 | 24.705→24.705 |
| Original far curtain (445,321,565,705) | .441029 | .441029 | 0 | 22.289→22.289 |
| Original far eye (415,475,470,535) | .339851 | .339851 | 0 | 51.456→51.456 |
| Upper foliage (0,0,80,75) | .560451 | .560451 | 0 | 16.608→16.608 |

**Control nuance:** V49's additional original-face pigment sits below wax and can affect the optical color of the *near iris ROI* by overlap. The original iris *geometry and source elements* remain identical, but near iris pixels changed (17.4% exceeded 5 summed RGB units), and original-source SSIM in that ROI improves by +.006607. The **far** eye and upper foliage original pixel regions are **exactly unchanged**; do not falsely claim every eye pixel is identical. Exact photographic/physical data and original 300-frame scene are intact.

**Independent art review of real native V52 screenshot:** Face and cheek values improve regionally, hair already darker than V48, but photograph likeness is still unacceptable: the brow and upper lid are graphic, the far iris shallow, nose/labial cavity and cheek have disconnected paper-cut contours, hair remains too regularly grouped around a helmet silhouette, and leafy background reads as flat stylized icons rather than observed photographed vegetation. Overall score **.5083 vs required .85**; full natural-speed 300-frame film, 18 independently verified *rendered* landmarks, five complete contiguous facial value planes and independent professional-art review remain blocked.

**Decision:** V52 is the **source-positive opt-in research baseline** ahead of V50, not artist-approved production. V51 remains **rejected** and excluded. PR #461 must remain **DRAFT / ART HOLD / unmerged**.
