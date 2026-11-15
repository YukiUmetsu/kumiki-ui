# ArtCraft v7 — real-person face and full-body reference study (15 Nov 2026)

**Status:** source-led research and executable CRAYON1 body specimen, **ARTISTIC REJECTION** until exact source/image review passes. Existing draft PR [#281](https://github.com/YukiUmetsu/kumiki-ui/pull/281), no new story folder, no production human assets. We reject cosmetic improvement claims for the previous face (17/18 landmark and 4/5 tonal-feature failures).

## Reference ledger

| ID | Subject / exact provenance | Rights and permissible use | Observed features and reliability | Destination |
| --- | --- | --- | --- | --- |
| F1 | [Christopher Campbell, *Brunette woman portrait* (Unsplash), 2015](https://commons.wikimedia.org/wiki/File:Brunette_woman_portrait_(Unsplash).jpg) | CC0 1.0; the actual **608×1082** reference screenshot is available in [pixel-evidence run 43682633614](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43682633614). This is a screenshot, not preserved full original camera JPEG. | Asymmetric three-quarter face, iris/lid occlusion, overlapping hair over cheek, directional nose and jaw shadows, lips resting asymmetrically. Crops source x160–370/y430–630 for eye, full face for separate gate. | **Isolated experimental face**; never graft onto a different identity by default |
| B1 | [Irawanthea92, *Free use human standing simple* (Wikimedia Commons)](https://commons.wikimedia.org/wiki/File:Free_use_human_standing_simple.jpg), originally photographed 2013; original **2348×3508** | **CC BY-SA 4.0**. Credit author, link license, disclose adaptation and comply with ShareAlike if the original image is reproduced/adapted. The photo is shown remotely and attributed in Storybook but **is not included in the repo**. | Examined *visible 669×1000 web display* with partially concealed right arm, asymmetrical stance, striped blue shirt, collar and cuffs, chest pockets, crossing pant legs and light sneakers. The 22 manual anchor guesses are approximate: no source-pixel hash or independently registered measurement proof. | **Standalone experimental body specimen only**, NOT the same person as F1 and not a free commercial hero identity |
| M1 | [Tiona Marco, crayon-painting process and subjects](https://linesandcolors.com/2009/02/22/tiona-marco/) | Professional artworks studied for medium and form handling only; no license to trace or package specific artist artwork | Convincing wax-crayon portraits and environments retain nuanced pigment layering and directional contact instead of uniform smooth vector decals | Wax technique benchmark |
| M2 | [Philadelphia Museum of Art paper medium taxonomy](https://legacyweb.philamuseum.org/doc_downloads/conservation/DescriptiveTerminologyforArtonPaper.pdf), p. 44; and [Rudolf et al., wax deposition model](https://doi.org/10.1111/j.1467-8659.2005.00826.x) | Technical references; cite the sources, implement independently | Waxy cohesive deposits, uneven pickup, side-nib contact, paper-height and pressure dependency | Medium-specific technical constraints |

**Do not compare body B1 to face F1 as if they depicted one anatomical identity.** Unregistered preview observations support a *construction study*, not a pixel-fidelity pass.

## B1 shape and anatomy deconstruction (visible photo, 669×1000)

### Macro: silhouettes, topology, proportion

- Hair crown around (380,8); chin (389,181), neck (386,203). One continuous skull/neck hierarchy; hair overlaps the side of the face instead of becoming an isolated round cap.
- Shoulders approximate (264,223) and (480,211), **not mirror symmetric**. Natural shoulder slope, right sleeve raised, neck offset relative to chest.
- Waist near x273..482/y479; pelvis occupies the waistband-to-crotch y480..610. Pelvis and sleeve ends must bridge attached skin and fabric without alpha holes.
- Left wrist ≈(258,519), left hand to y594. Right wrist ≈(489,516), mostly occluded and **must not invent a fully visible right upper arm**.
- Crossing trousers: knee_L ≈(328,772), knee_R ≈(425,760); ankles ≈(338,929) and (415,935). Two legs require independently described lower contours and ankle folds, not identical capsules.
- Shoes are grounded around y990 and have unequal toe widths, independent curved top stitching, lace arcs, and continuous sole seams.

### Meso: regional vector flow and contact graph

| Region | Connected geometry | Intrinsic stroke/edge flow | Forbidden simplification |
| --- | --- | --- | --- |
| Neck / shoulders | Face -> neck -> two sewn collar leaves -> shirt main volume | Collar leaves meet at split placket; shoulder slopes are unequal | Cylinder neck through a rectangle-shirt neckline |
| Sleeves / cuffs / arms | Root sleeve material overlaps forearm; each cuff wraps arm with an independent seam | Pinstripes bend along upper arm; crease elbows change direction; hand marks follow tendon/finger roots | Floating wrist circles, large opaque cylindrical sleeves, detached finger dots |
| Shirt | Structural shirt outline; two pocket bodies+flaps, placket, button strip, cuff layers, woven pinstripes | Vertical stripes bend toward torso seams and curve over chest; local creases converge at waist/underarm | Evenly spaced vertical grid pasted across unclipped garment |
| Pelvis / legs | Independent crossing leg silhouettes join waistband/pelvis, inner knee gaps distinct | Trouser fold shadow turns around knees; lower-leg seam bows over the shin | Mirror-image capsules for both legs or one slab for hips and calves |
| Shoes | Separate shoes, broad toe box, lace tracks and soles | Lace undercuts and outsole follow curved toe perimeter | Triangle feet or detached oval shoe stickers |
| Wax contact | Opaque first coat + medium-specific locally deposited pressure marks | Contact lingers around paper ridges and fabric folding volumes; no global grain field as substitute | Smooth digital gradient plus scattered dots |

### Micro and negative controls

- Irregular dark hair channels cluster along the crown flow; they are not identical comb teeth.
- The left palm and thumb establish a separate negative space along the trouser side; knuckle and finger folds are curved and asymmetric.
- Collar seam must remain connected at the neck with the placket; chest-pocket flaps must stay inside body color. 
- **Rejected shortcut controls:** dot eyes, a black smile line substituted for facial morphology, floating sleeves, checkerboard wax flecks, uniform pants cylinders, cropped shoes, perfectly symmetric knees, smooth silhouette hiding poor body geometry.
- Explicit **unresolved face**: the B1 full-body specimen uses a neutral head undercoat only. It must not fabricate a new realistic face with invented eyes/nose/mouth, and it must not be promoted to a production actor.

## Implementation to compare against evidence

- [\`crayon-artcraft-body-study.ts\`](../../src/video/crayon-artcraft-body-study.ts) exports 22 named research landmarks, 24+ opaque painted volumes, distinct skin/garment overlap geometry, deterministic cloth/denim/hair strokes and an optional construct-only shape graph. Source viewport is 669×1000.
- Existing \`Video production/Film Looks/Crayon/ArtCraft Adult Face Lab\` has **Full body · source geometry and garment art (ArtCraft experiment)**. Side-by-side remote B1 reference is optional; links, attribution, source/rights and the experimental warning remain visible. Adjustable detail and playhead; switch painted/landmarks.
- Unit checks: source provenance, no detached limb fallback, knee/shoulder asymmetry, all semantic garment pieces, opacity, determinism, invalid input.
- Real-browser checks: **669×1000** painterly/landmark screenshot at finished frame, plus mid-draw. Current tests verify rendering; **they do not match candidate to a source-photo mask**.

## Source-to-candidate numerical gate — still BLOCKED

1. **Original photo bytes** (not downloaded into working container), source file SHA-256, immutable source crop and exact 22+ manual pixel observations from *that image*.
2. Native candidate screenshot hash from latest PR head at exact source frame and dimensions, source/candidate normalized landmark pairs, independent semantic silhouettes (head, torso, sleeve, hands, pelvis, legs/shoes). Current observation points are tentative, *not certified image landmarks*.
3. ArtCraft five axes: connected garment/flesh attachment graph, curved pinstripe flow, pressure/width distributions, cloth motif spacing and optically significant microtexture. Thresholds must be derived from actual photo or legally usable wax art, not arbitrary optimistic values.
4. **Independent 1× and 3× visual review** against licensed references and extreme poses / motion at normal speed; actual high-fidelity face from F1 remains blocked at 17/18 landmark mismatch.
5. Only when these pass may a character be rebuilt for gallery/production; otherwise preserve this test specimen in \`!dev\` and keep PR #281 draft.

**Artist review notes from previous native portrait screenshot:** Oversized doll-like eyes, undifferentiated nose plane, almost invisible mouth volume, oversized broad head/neck attachment, short and overly rectangular sleeve arcs. New B1 specimen addresses the lack of a body-level construction reference but **does not repair F1 facial likeness** or prove wax-crayon fidelity.


## Post-implementation native-browser image review (evidence, not approval)

Actual 669x1000 Chromium screenshots after short-hair and textile-density revisions are preserved under [ArtCraft browser proof run 43712409681](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43712409681): `crayon-body-source-study-painted-299.png`, `crayon-body-source-study-construction-299.png`, and partial frame `crayon-body-source-study-painted-155.png`. The same run includes 540x960 CC0 eye screenshots. Tests passed, proving renderability and scene contract, NOT likeness or medium authenticity.

- **Body reference match:** The original B1 photo has short, irregular head hair and a relaxed pose. The old candidate had a shoulder-length bob that visibly contradicted the source. Revised geometry uses a short rooted cap, two sideburn masses and hair flow; actual downloaded PNG confirms that the bob is gone. This is a silhouette correction, not individual identity likeness.
- **Body artistic deficiencies:** Cuffs, collar leaves, pocket flaps, buttons, full hands, separately constructed jeans and sneakers all appear at correct approximate positions; however, hands remain mitt-shaped, torso folds resemble decorative squiggles, pants have mechanically scratched cross-hatching, and sneakers are overly symmetric. Native artwork remains unsuitable for release.
- **Wax material:** Lowering uncontrolled material contrast helps recover directional shirt pinstripes but the wax still resembles broken digital hatching, not rubbed wax with connected pressure accumulation. No genuine physical redeposition or source-aligned crayon microtexture evidence exists. Material fidelity REJECTED.
- **CC0 face:** The isolated F1 source eye now uses a darker iris and extra rooted brow fibers, but actual native renders still show a broadly symmetric white eye and oversized violet socket unlike the narrower source. Eye artistic gate FAIL. Never graft F1 eye onto separate B1 identity.
- **Source caution:** Wikimedia Commons describes B1 as a *boy standing*. Age cannot be established precisely by the current art study, so do not claim this is an adult identity. The study is labeled a standing figure; source photo remains remotely linked with Irawanthea92 credit and CC BY-SA 4.0. No source pixels shipped.

**Gate:** Keep this work in one Storybook `!dev` laboratory and leave PR #281 **draft**. It is not a production-ready crayon character. Next steps: a legally usable high-resolution face/body source of one subject, accurate registered landmarks and connected anatomy, actual wax stroke-micrograph baseline, and independent artist acceptance of native screenshots and moving poses.
