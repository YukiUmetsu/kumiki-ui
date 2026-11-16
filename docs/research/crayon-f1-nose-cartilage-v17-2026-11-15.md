# ArtCraft F1 V17 — native wax nasal cartilage, actual browser screenshot review

**Result:** genuine editable native CRAYON1 experiment, **ARTISTIC REJECT / NOT PROMOTED**. The prior default and every V2–V16 control stay available. [Draft PR #281](https://github.com/YukiUmetsu/kumiki-ui/pull/281).

## Actual source and rights / deconstruction

- Immutable source: [Christopher Campbell, *Brunette woman portrait* (Unsplash / CC0 1.0)](https://commons.wikimedia.org/wiki/File:Brunette_woman_portrait_(Unsplash).jpg); browser projection exactly **608×1082**, SHA256 `f8d28cbede8c8c14f9902a328b6e979e353fd9ebe6efb454bda3152586b929c2`. High-resolution photographed local review rectangle **x340–492,y570–683**; source upper nasal bridge/bulb x370–460, hooked near dark opening approx x390–423,y620–650 and far foreshortened vertical opening approx x445–466,y615–645. These observations are particular to this source, NOT idealized race/age nose rules.
- Wax-specific craft: [Stockmar, *Painting with Wax Crayons*](https://www.stockmar.de/en/service/publications/?cid=1237&file=files%2FContents%2FDownloads%2FKreativtipps%2FEN%2FSTOCKMAR_wax+crayons_getting-started_EN.pdf) on layered wax side-contact/point and paper tooth; [Philadelphia Museum of Art, *Descriptive Terminology for Art on Paper*](https://legacyweb.philamuseum.org/doc_downloads/conservation/DescriptiveTerminologyforArtonPaper.pdf), p.44, on wax binder clumping and raised irregular deposits. Material references are used to guide construction, not as copied raster textures.
- Baseline: **real V16 source-oral Chromium full-frame and native nose macro**, not a wireframe, a generated paint-over, or code intent. The V16 shape reads as two disconnected dark nostril disks amid weak alar shading. No hair/eyes/mouth changes were allowed.
- New exact head `877ce368` [native browser run 43791465485](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43791465485) **SUCCESS**, [actual PNG artifact 14192813052](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43791465485/artifacts/14192813052) with source-oral-sculpt vs source-nose-sculpt **same 3× camera** at frames 210 and 299 and full 1× f299. The correct source-to-screen mapping is `screenX=304+3*(sourceX-417)`, `screenY=541+3*(sourceY-629)`; wrongly cropping identical screen coordinates from zoomed vs source images is forbidden.

## Five-axis source decomposition and observed native V17 result

| ArtCraft axis | Source rule (photo) | V17 original native wax path construction | Independent screenshot review |
| --- | --- | --- | --- |
| Connectivity | Near alar hood and septal foot surround a dark **inset** opening; far wing shares central nasal tip | 11 hand-authored, connected, asymmetric semantic wax parts: `nose-tip`, 2 `nose-alar`, 2 `nasal-alar-attachment`, 2 `alar-roof`, 2 `alar-septum`, 2 `naris-shadow`; parent-clipped source-space surfaces | **FAIL**: broad skin planes too faint/flat; dark cavities still look pasted instead of under cartilage |
| Tangent/flow | Near cavity hooked into lower-left septum, far naris foreshortened vertical opening | Independent near hooked cubic and far upright cubic; source-specific turning and C-curve attachments, no mirroring | **PARTIAL**: dark contours more differentiated but still graphically disconnected from surrounding surface |
| Edge | Hard internal air-space shadow only, broad feathering at skin/cartilage contact | Open-wax feathered/pressure-built 9 skin masses; 2 separate opaque darker depth pockets; no extra vector outline | **FAIL**: bright fine halo/line on far opening and unnaturally hard/clean shadow perimeter |
| Width/rhythm | Near opening wider/organic, far narrower/upright; unequal lid pressures | Asymmetric 41×29 near shadow and 22×31 far shadow; independently varied pressure and spacing | **PARTIAL**: size asymmetry present; near hook still too fat and far hole too regular |
| Microtexture | Pigment wax clumps over paper grain, softer in skin planes than cavities | Inherited CRAYON1 paper-tooth, pressure, irregular wax color/grain, underpaint gradient on cavities, unmodified hair/cheek | **FAIL**: surface still reads procedural scratch/hatch rather than physically raised wax pickup |

The actual 3× source/photo/V16/V17 inspection board was generated using the **correct** source mapping. No separate paint-over was used to judge quality.

## Geometry, UI and isolation

- `src/video/crayon-artcraft-f1-nose-sculpt.ts` applies only 11 named source wax edits, adds **zero** new semantic nodes. Each original path remains independently curvilinear, with source-space bounds; near/far asymmetric. Skin uses open, variable-deposition native wax, dark recessed interiors use opaque wax with independent pressure and gradient.
- New opt-in `midfaceForm:"source-nose-sculpt"` builds after V16, which builds after previous V13. All 5 earlier form choices, eyelashes, eye material, hair, bust and camera remain preserved; current default remains **baseline**.
- Existing Crayon ArtCraft Adult Face Lab gains one selectable nasal experiment and a separate 3× close-up Storybook story. No new art-style folder or raster filter.
- New 4-case `tests/crayon-artcraft-f1-nose-sculpt.test.tsx` **PASS**: scene validity, unchanged unrelated anatomy, near/far nonmirrored cartilage, local anatomical overlaps, fail-closed missing/duplicate input, SSR material and absence of image shortcuts.
- Latest source code at `877ce368`: [native CRAYON1 film construction **PASS**](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43791465453); [typecheck/Storybook source guard **PASS**, 623 unit tests passed, 15 unrelated failures](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43791465457). The 15 failing tests include RISO23/26/30/31 source changes and timed-out colored-pencil/plant/ukiyoe cases. No Crayon test failure; do not weaken or edit other styles to hide these issues.

## ArtCraft 9.1 unmodified threshold audit

Full-frame deterministic `artcraft/skills/artcraft/scripts/portrait_fidelity_gate.py`, same exact reference and actual **1×** Chromium frame 299. No threshold relief and no source-image pixels copied:

| Metric | V16 control | V17 source-nose-sculpt | ArtCraft threshold |
| --- | ---: | ---: | ---: |
| Full-frame SSIM | 0.374609 | 0.375316 | ≥0.85 |
| Full-frame edge mismatch | 2.80209 | 2.80129 | ≤0.20 |
| Full-frame edge pixel diff | 28,175 | 28,167 | ≤6,000 |
| Full-frame histogram corr | −0.20710 | −0.20569 | ≥0.92 |
| Nose x340–492,y570–683 SSIM | 0.54412 | **0.57040** | localized style/identity, not whole-photo release score |
| Nose Canny XOR / reference edge count | 2.3549 | **1.8058** | localized diagnostic, not a standalone art pass |
| Mouth SSIM | 0.53534 | 0.53534 | unchanged negative control |

Nasal local matching improves, **but visual realism and actual ArtCraft portrait-fidelity remain FAIL**. A stronger component-overlap score is not proof that the near opening is anatomically attached or that wax resembles hand drawing. The renderer's artificial paper pattern and major overall 3/4 face/anatomy mistakes remain.

## Next priorities

1. **High priority: nasal skin→hole occlusion and volumetric turn.** Review source shadows as surfaces, not as two isolated masks. Rework 1× near alar-to-cheek gradual shading and actual nasal bulb projection, then soften far nostril’s unrealistic white halo/hard ellipse. Do not add arbitrary grain as camouflage.
2. **Mouth:** V16 tooth roots still floating and lips too triangular; fix upper vermilion overlap using actual source region masks/occlusions, lower lip fullness and commissure asymmetry, while retaining 10 wax ribs.
3. **Global human portrait:** correct the flat forehead/cheek planes, near/far eye negative space, brow/eyelid geometry, true jaw/neck connection, and realistic hair root flow. Use the real Kumiki anatomy framework and independent anatomy source/render landmarks.
4. Run ArtCraft v9 independent `human_anatomy_fidelity_gate.py` with **actual measured reference and candidate landmarks and source-render evidence**, five-axis structural-detail masks, final-size 1×/3× and 300-frame real-speed animation. The current native tests and screenshots validate rendering, not human likeness or medium mastery.
5. **Do not merge PR #281** or claim production-ready art until every critical source anatomy/medium gate passes and a separate visual reviewer approves.
