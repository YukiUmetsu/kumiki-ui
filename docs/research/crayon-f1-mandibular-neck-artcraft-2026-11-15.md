# ArtCraft 9.1 — F1 source-registered jaw and neck (research, REJECT until visual proof)

Date: 2026-11-15. Owner: Crayon / ArtCraft. Status: **prototype only, not approved for production or merge**. Existing [PR #281](https://github.com/YukiUmetsu/kumiki-ui/pull/281) remains draft. This is a 2D human portrait study informed by the **actual source** and native CRAYON1 engine, not a generic front-face model or an image filter.

## Source gate and rights

- Anatomical reference: [Christopher Campbell, *Brunette woman portrait (Unsplash)*, CC0](https://commons.wikimedia.org/wiki/File:Brunette_woman_portrait_(Unsplash).jpg). Frozen **608×1082 browser screenshot** from GitHub Actions [43682633614](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43682633614), SHA-256 `f8d28cbede8c8c14f9902a328b6e979e353fd9ebe6efb454bda3152586b929c2`. This is **not** the original full-resolution camera JPEG. Do not silently realign, rescale, substitute a different crop, or claim source landmark fidelity from made-up hidden features.
- Material/process evidence: [Philadelphia Museum of Art (2014), wax-crayon technical terminology](https://legacyweb.philamuseum.org/doc_downloads/conservation/DescriptiveTerminologyforArtonPaper.pdf), p.44: uneven clumped wax deposits with cohesive/visible binder. Also [Stockmar technical notes on wax layering and paper tooth](https://www.stockmar.de/en/service/publications/?cid=1237&file=files%2FContents%2FDownloads%2FKreativtipps%2FEN%2FSTOCKMAR_wax+crayons_getting-started_EN.pdf). Do **not** treat chalk/oil pastel as mechanically identical to wax crayon.
- Model-construction guidance: installed `art-human-anatomy` / Kumiki `registry`, **observed anatomy first**. Source jaw curvature and neck attachments override population averages and stylized 8-head canons.

## Reference image deconstruction

The actual 608×1082 source and its jaw/neck zoom were inspected before this code pass. Source face is slightly low-angled and three-quarter view, hair obscures the screen-right neck. Do not pretend hidden right clavicle, sternum or far ear are observed.

| Region | Source observations (approx. screenshot pixels) | What failed in prior native render | Specific construction |
| --- | --- | --- | --- |
| Cheek → jaw | Screen-left ear/cheek ~x120/y750 flows to near mandibular angle ~x175/y808, then lower shelf x280–360/y847–865 | jaw appears as a symmetric cartoon oval, too uniformly inflated | `face-outline` asymmetric cubic contour with left low cheek, right deeper chin; `jaw-underside` feathered pressure mass |
| Chin | Independently frozen `chin` annotation **(398,858)**; visible right-shifted lower point | old path forms a broad bottom flattening x275–405 with no source asymmetry | `chin-plane` narrow, source-right, independently glazed volume; retains original face root and painted fine detail |
| Submandibular shadow | dark cast spans x~150–445/y~830–925 **under the jaw**, fades into the neck, not a sharp ink contour | neck looks like a dark paper triangle, detached at the chin | `neck-submandibular-cast` parent-clipped to `neck-attached`, 18-unit feathered open wax, naturally curved contact line |
| Neck root / cervical turn | screen-left neck roots under near jaw/ear, screen-right largely covered by long hair | long vertically uniform trapezoid; abrupt jaw-to-neck color separation | `neck-attached` remains opaque, modulated with directional underpaint; `neck-cervical-turn` open wax layered beneath skin and behind hair |

### ArtCraft five-axis construction

1. **Topology:** `neck-attached` remains a continuous opaque source-neck mass; `neck-submandibular-cast` and `neck-cervical-turn` are clipped children of that same root. The facial `face-outline` remains continuous; cheek, chin and jaw overlays retain original `parentId="face-outline"` and clip to it. There are no disconnected floating ink jaw ribbons or separate neck slabs.
2. **Flow:** two asymmetric lower-face turns (near cheek → projected mental eminence → far jaw root), directional wax following curved jaw/neck shadows, not repeated hatch strips on one flat quadrilateral.
3. **Edges:** sharp enough opaque base to preserve a solid subject; open jaw/neck *contact pigment* feathered to 10–18 source units. No pure path outline of the lower face; keep contact grain rather than blurring entire character mask.
4. **Width/rhythm:** broad near cheek and narrow source-right chin; submandibular cast pressure ~.69 and cervical turn ~.47 avoid a uniform monolithic value stripe. Values are **artist hypotheses**, not population measurements.
5. **Microtexture:** source is a photograph and does not demonstrate crayon texture. Medium reference demonstrates clumpy, cohesive crayon. All candidate fills remain editable native `stroke-built` CRAYON1: directional contact marks, simulated tooth, overlaid muted shadow/glaze without photo pixels.

### Implementation and adversarial negative control

- `src/video/crayon-artcraft-f1-jaw-neck-geometry.ts` modifies **six** existing native wax semantic regions: face, chin, jaw underside, attached neck, submandibular cast, cervical turn. No paths, micro-hair, eye features, mouth, timestamps, camera or other elements are removed.
- `jawNeckForm:"baseline" | "source-contour"` defaults to `"baseline"` to avoid silently promoting an unreviewed experiment. The baseline option is byte-for-byte the former element sequence; experimental option keeps the same IDs, parent links, 300-frame timeline, seed and grain engine.
- Existing Crayon Storybook folder exposes the toggle and **jaw-neck 2.4× source camera** beside source/experimental eye, midface and lash controls. One folder only.
- `tests/crayon-artcraft-f1-jaw-neck.test.ts`: no existing element other than six geometric roots may change; validates jaw/neck containment, paint order, open/opaque material, frame and detail invariance, and invalid option rejection.
- `tests/e2e-artcraft/crayon-adult-face.spec.ts`: new native 608×1082 Chromium **frame299**, 2.4× source-camera baseline/candidate PNG pair. Screenshots are pixel *evidence*, **not** artistic acceptance. The existing multi-macro film test is marked slow instead of failing at 60 seconds while capturing 11 image proofs.

## Required review and release blockers

1. Compare 1× and 2.4× actual source screenshot, exact unmodified negative control and the new native render. Inspect contour turning points, chin (398,858) proximity, ear/neck root, absence of isolated dark stripe and hair overlap. Do not approve based only on an SVG string or green CI.
2. Run ArtCraft v9 anatomy fidelity gate with measured **source and candidate** chin/cheek/jaw and neck-root landmarks, a connected jaw/neck mask, SVG structural audit and source-specific occlusion notes; use the exact output SHA. Identify unobservable anatomy as occluded; never fabricate unavailable right shoulder/clavicle.
3. Contrast, silhouette and microtexture: inspect native 1×, 2.4×, intermediate animation frames (120/210/299) and normal-speed 300-frame playback for silhouette popping or feather-edge aliasing. Compare source photographic shading with real wax-material examples separately.
4. Release **REJECT** while original photo vs generated wax fails critical silhouette, anatomy, face realism and wax stroke grammar. Retain native source and numeric evidence; do not weaken ArtCraft thresholds to manufacture a pass. Fix largest visible structural defect before new cosmetic micro-hatching.

**Next iteration target:** inspect the new native jaw candidate, correct its actual silhouette and value defects, then revise eyelid/iris or midface only when a source-matched A/B demonstrates improvement.
