# ArtCraft v9.1 · Four Chinese ink masterworks — structural and material study

**Status:** research gate complete for the four selected paintings; construction is candidate work under visual release hold. **Do not merge on green CI alone.** Historic examples teach brush grammar, not artwork pixels, layout, figures, or source identity. No museum or Google Arts & Culture image is copied into library assets.

## Sources reviewed

| Key | Author / work | Institutional source | Critical technique |
| --- | --- | --- | --- |
| HG | Huang Gongwang (黄公望), *Dwelling in the Fuchun Mountains* (富春山居圖), c.1350 | National Palace Museum https://theme.npm.edu.tw/selection/Article.aspx?lang=2&sNo=04000975; analytical detail https://smarthistory.org/wp-content/uploads/2023/10/National_Palace_brushstroke_labeled-copy.jpg | Long hemp-fibre contours; round layered hills; foreground/middle/distance and empty paper between loaded stroke families. |
| GX | Guo Xi (郭熙), *Early Spring* (早春圖), 1072 | National Palace Museum https://theme.npm.edu.tw/selection/Article.aspx?lang=2&sNo=04000960; overview https://artsandculture.google.com/story/traveling-among-mountains-and-streams-national-palace-museum-taiwan/lAWB6l-7B5oWKg | Curled cloud-head texture strokes; twisting connected hill mass; crab-claw branching trees; mist and solid/void transitions. |
| FK | Fan Kuan (范寬), *Travelers Among Mountains and Streams* (谿山行旅圖), Northern Song | National Palace Museum special exhibition https://www.npm.gov.tw/Exhibition-Content.aspx?l=2&sno=04006295 and collection https://theme.npm.edu.tw/exh107/uptheriver/en/page-3.html | Monumental dark rocky silhouette; short loaded raindrop cun; three-depth construction separated by substantial cloud/mist void; radically smaller figures. |
| WM | Wang Meng (王蒙), *Forest Chamber Grotto at Juqu* (具區林屋圖), Yuan | National Palace Museum https://theme.npm.edu.tw/selection/Article.aspx?lang=2&sNo=04000991; original catalogue https://digitalarchive.npm.gov.tw/Collection/Detail?dep=P&id=609 | Densely interlocked gully/rock strata, dry ox-tail/ox-hair strokes, moss dots, layered ink/ochre; one navigable open passage despite near-claustrophobic density. |

These are authenticated institutional **craft references**, not exact geometric targets. We do not claim source pixel matching, calibrated quantitative brush width measurements, or a documented license to rehost the paintings. Original images remain external; the resulting painting and every SVG path are newly authored.

## Deconstruction — macro / meso / micro

**HG — spatial / curved hemp.** Macro: three broad, partially overlapping mountains and deliberate background reserves. Meso: multiple nested curved rock backs connect to each parent ridge; long downward hemp-lift gesture families are concentrated rather than uniform vertical rain. Micro: asymmetric taper and dry root-to-tail edge. Negative control: triangle with 6 straight hairs pasted over it. Current candidate: school `fuchun`, 3 parent rock planes and 78 new hemp gestures, integrated with the earlier 40 terrace and 33 face-bounded fibres, plus existing creases and ink wash.

**GX — rolling cloud-head / crab-claw.** Macro: dense centrally oriented crags separated by natural mist gulfs; old trees create irregular hooked silhouettes, not pine clip art. Meso: rock ridges curl/reverse horizontally, overlap and return downward; visual dark shadows occur at geological folds. Micro: interrupted, brush-pressure-variable curl edges and short dark recession strokes. Negative control: regular row of identical semicircle scallops. Current candidate: school `early-spring`, 3 parent rock planes and 52 medium loaded reversing cubic brush marks. **Missing**: independent crab-claw tree morphology and convincing cloud-head recess anatomy; avoid "Guo Xi-level" claim.

**FK — monument / raindrop.** Macro: vertically monumental weight and a white cloud break between foreground and distant massif; traveler is tiny relative to cliffs. Meso: dark overlapping cliff planes, irregular cap shelves and short dripped texture groups. Micro: individual loaded teardrop cun strokes with variable width/length and dry lift. Negative control: global speckle noise or translucent smooth mountain triangle. Current candidate: school `travelers`, 3 root-connected dark planes plus 187 short raindrop marks confined to their parent face. **Missing**: a true vertical monumental film composition and tiny caravan scale; the 16:9 studio uses only the ink language.

**WM — recursive rock density / ox-hair.** Macro: highly packed, twisting layered rock and forest, with a consciously retained right-side release passage. Meso: narrow serpentine rock contours, many fine anisotropic dry brush fibres, vegetation and eroded stone interleave; density changes rather than filling the entire page. Micro: split dry tails, uneven small ink deposits and fine moss dots. Negative control: regular parallel comb stripes covering all mountain regions. Current candidate: school `forest-grotto`, 3 face-anchored painted masses with 178 tapered curling ox-hair marks. **Missing**: rich figure/forest/building integration, independent anisotropic real-paper microtexture and fully credible nested eroded gully anatomy.

## Feature-to-code-to-visual gate matrix

| Key | Source evidence | Structural root / flow implementation | View and rejection |
| --- | --- | --- | --- |
| HG | NPM + annotated hemp/alum-head image | Quadratic original crest → 3 faced masses → 78 long asymmetric cubic hemp strokes; inherited full film ridge clipping | 960×540 mountain trail, aligned 1.75× / 2.4× / 3.45×. Reject sparse straight crossing wires and uniform pale polygons. |
| GX | NPM *Early Spring* | Distinct multi-saddle crest with a secondary curled summit / 3 parent crag anchors, 52 reversing loaded cubic marks with lateral counterturns | Reject identical scallops or generic wiggly decorations not reading as rock. |
| FK | NPM Fan Kuan exhibition + museum description | Wide rounded monolithic summit and steep shoulder / dark rock underwash with 187 short load-graded raindrop cun | Reject random screen-dot texture or loss of distant blank mist. |
| WM | NPM *Forest Chamber* catalogue | Two interacting off-center summits with a twisting saddle, 3 dark cheek contours, 178 long fine curling ox-tail strokes and dry lifts, clipped per positive cheek | Reject comb-like parallel strokes, unreadable wet mass or fully filled paper. |

The **control variables** `inkSchool`, `detail`, `mist`, `ink`, `seed`, `frame` are independent. The historical mode **changes both authored middle-mountain silhouette and interior path geometry / pressure distribution**, not merely CSS opacity or bitmap filters. The **far/near depth bands**, path, trees, characters, film camera and absolute clock remain identical while each source mode owns a distinct middle ridge and rock-face anatomy. The 3 positive source planes have independent dark-to-dilute linear gradient shading and instance-local SVG clip paths. Child strokes are sampled on a specific named quadratic contour and may not paint into the sky or be accidentally reused across adjacent Storybook stages.

## Practical QA protocol and release blockers

1. At film frame 145, seed 71, ink .9, mist .35, detail 1, compare all four **native 960×540 scene crops** in `Four masters · brushwork source comparisons`, which is inside the existing Chinese Ink / Shanshui Film Gallery Storybook folder.
2. Inspect native full-frame and 1.75×, 2.4× and 3.45× crops, then seed 87, frames 84 and 215. Confirm that the four schools have noticeably *different* stroke silhouettes, not just different darkness.
3. Negative control: detail 0 must remove the four masters' ink entirely, while leaving the original structural mountain silhouette. Low-ink control must not move a single root/path or change the absolute timeline. Repeated renders must be identical.
4. Verify 3 source-attached rock masses in each school, **78/52/187/178** named brush gestures, one clip per face, unique IDs for 4 previews mounted in the same DOM, no `<image>` tags and no remote textures.
5. **Artistic gate remains independent.** The current geological painting is a technique study, not a visually faithful copy or a completed masterwork. Only approve if the dark rock, irregular landform and source-specific material density are convincing in actual native output. Otherwise keep PR #338 draft and document exact defects; preserve all already-working bamboo, pine and scholar architecture.

## Risk assessment

- **Cultural technique mixing:** Specific schools are selectable; don't arbitrarily combine Wang Meng ox-tail, Fan Kuan raindrops and Guo Xi cloud-heads into one named historical painting.
- **Procedural flattening:** Source classification and counts do not prove high visual quality. Clipped stickers and regular rows may still fail; render/inspect each native crop.
- **Scale:** A close-up with convincing lines but no legible mass at 960×540 is rejected. More high-frequency marks cannot repair missing macro anatomy.
- **Copyright:** External institutional reference images are linked for study; no museum image is embedded in the JavaScript registry, Storybook package, or video exporter.

**Next priority:** pass the independent native art review for each school's geological mass before expanding into animal/human figures or claiming this engine is production-level for all Chinese ink aesthetics.


## Second source-geometry pass — silhouettes must differ (native screenshot reviewed)

The first *actual browser screenshot* showed four school styles with recognizably different stroke lengths/curvature, but **all painted on the same smooth triangular mountain silhouette**. At normal 960×540 viewing size this defeats the studied structural differences: Fan Kuan is not visually monumental, Guo Xi lacks a curled multiple-peak topology, and Wang Meng is not densely layered within actual twisting rock banks. Counts alone could not pass ArtCraft.

**Correction made in code, still a candidate:**
- `fuchun`: preserve the existing source-rooted middle-ridge composition for backward-compatible film scenes and tests.
- `early-spring` / Guo Xi: 24 explicitly authored middle-ridge nodes with two subtly interlocking summits and curved saddles; three distinct broader/lifted rock cheek planes.
- `travelers` / Fan Kuan: 24 authored nodes for a wider, higher, nearly plateaued monumental massif with steep sides; physically broader and deeper root-connected rock cheek planes.
- `forest-grotto` / Wang Meng: 24 authored nodes tracing two unequal high summits with intervening gullies, 3 differently oriented compressed crag planes and long fine ox-tail texture.
- All three use the existing span-sensitive fracture damping to prevent sawtooth peaks; vegetation/rock children attach to the real regenerated crest; far and near ridges, camera, actor, river and story timing do not change. The browser source-geometry test now **rejects identical crest paths** across the four schools.

**Technical incident addressed:** A screenshot determinism test saw stale frame pixels after programmatically setting the slider while the larger new SVG painting was still committing to the DOM. The test helper now waits for the *stage* to confirm its frame and for two paint cycles before hashing. This fixes a real race in the test rather than relaxing its equality assertion.

**Next release judgment:** Capture and inspect a new exact-head four-master Storybook screenshot at 960 native stage pixels and at 1.65× art crop. Reject if the five critical forms—summit, cliff planes, clouds/paper, underbrush geometry, trees—still read like a pasted layer of brushes on a colored triangle. Never mark museum-style fidelity approved from code/CI counts.
