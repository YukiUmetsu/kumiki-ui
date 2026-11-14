# Shanshui landscape video engine — reference-to-code craft study (2026-11-14)

## Visual targets supplied in the conversation

The three source images were inspected at their original horizontal resolutions (1280×720 and two 1672×941 images). They are *references*, not texture inputs, bundled images, tracing targets or imported scene assets.

| Supplied composition | Directly observable landmarks | Code direction |
| --- | --- | --- |
| **Image 1 — misty mountain hermit** | Small central scholar with contemplative hand gesture, pine trees on the left, bamboo on the right, thin floating cloud lines, several near and distant rock masses, a tiny pavilion, warm parchment and significant quiet mist | \`misty-hermit\`: broad negative space, atmospheric mountain silhouettes, asymmetrical pine/bamboo frame, very restrained camera drift |
| **Image 2 — riverside traveler** | A larger, slender scholar reading a scroll at the left foreground; hanging willow tree, still water, a low stone bridge, distant pavilion at the right, soft mountains, detailed near rocks, wind-suggestive flowing clothing | \`river-scholar\`: willow with drooping leaf groups, stone arch, rippled water and shoreline, warm scholar with trailing robe bands |
| **Image 3 — mountain pathway** | Tall layered peaks, pine with individually distinguishable needles at upper left, a small distant waterfall, a tiny hilltop pavilion, narrow winding rocky trail, scholar at center, right-edge bamboo, fading fog | \`mountain-trail\`: layered wet washes, slope-dependent dry \`cunfa\` texture, heavily staged old pine, path/rocks and waterfall |

### Material principles

1. **骨法用笔 and 皴法:** contours are not uniformly dark. Mountains are three separate warm wash masses with location-specific fine hemp-like contour lines and dark moss dots concentrated near the ridge.
2. **Ink's five tones:** pale distance; midtone woodland and rock; dark close branches, leaf silhouettes and figure line art. The paper stays a visible highlight.
3. **Branches must be constructed:** pine has winding trunk, structural branches and tufts of individually oriented needles; willow has independent trailing strands and individually drawn leaves; bamboo has culm bends, nodes and leaf bundles. No flat leafy decals.
4. **Hold the landscape:** mountains, path and rocks are stable at a film frame. Only the cinematic camera, bird wings, slowly moving clouds/mist, delicate leaves, water highlights and canonically rigged scholar perform.
5. **Fabric and body separate:** the scholar reuses INK4 foot-plant and split-knee constraints plus INK6 delayed cuff/hem corrections. New original sepia over-robe, sash, hair ribbons and hem each share relevant rig parents. This is a **partial refinement** of a stylized puppet, not a finished human anatomy rig.
6. **Original procedural artwork:** every foreground/background mark is a path, ellipse, gradient or seeded vector brush in code. No sampled pixels from the three supplied images are stored or rendered. No downloaded external film/stock assets.

### Implementation

- **Core score:** \`registry/video/ink-shanshui.ts\`: typed layouts, seed, detail, ink, mist, wind; independent pure scene motion at a single 0..299 absolute frame; scholar path.
- **Painter:** \`registry/video/ink-shanshui-react.tsx\`: mountain planes, internal rock hatching/dots, winding trunks, leaf clusters, rocks, stage path, lake and bridge, pavilion, clouds, bird and a stable paper-tooth filter.
- **Scholar host:** \`src/video/ink-shanshui-film.tsx\`: approved ink actor parts and action cues adapted with warm original robes and new follower parts, separate from the landscape's background brush passes.
- **Preview/export:** \`src/video/ink-shanshui.stories.tsx\`: Film Looks → Chinese Ink → Shanshui Landscapes. All controls are available in the gallery. The three export stories use the same source component, 960×540 30fps, and a frame-seek manifest.
- **Registry:** \`ink-shanshui-landscape\` installable core with existing \`ink-actor-director\` dependency.
- **Performance:** no WebGL, external image requests, runtime \`Math.random\`, time-based accumulating state, background polling, audio, third-party licenses or additional npm dependencies.

### Visual QA contract

Capture the *actual* Chromium Storybook scene at frames 125 and 210, all three variants, then produce MP4 with the existing \`video:export\` pipeline. Inspect with full-size images and ordinary-speed playback before declaring art quality.

Check: (a) the scholar's actual SVG parts appear inside the landscape rather than merely passing SSR, (b) both far/mid/near ink masses retain depth instead of merging to one brown blob, (c) the old pine needles look botanical and old bark looks cracked, (d) the willow does not resemble a fence of same-length strands, (e) the water/arch/pavilion remain legible without black outlines, (f) animation is subtle and nondestructive with backward seeking, (g) text-free full 16:9 art stays coherent.

**Not yet film-approved:** the references' human figures are more anatomically drawn, expressive and cloth-rich than the current canonical puppet. Accurate hand gesture/scroll contact, elbow geometry, turnarounds, true fluid edge bleeding and a properly art-directed portrait version are subsequent priorities. Avoid claiming photographic/painted equality on the basis of CI alone.


## Teacher artwork / exact-figure study (second source-grounded pass)

On 2026-11-14, the three full-resolution user-uploaded paintings were reopened
and studied as separate figure references:

| Source art (kept out of the public repository) | Figure and face characteristics | Sampled visible figure box (image px) | Skull:figure height (projected) |
| --- | --- | --- | --- |
| \`chinese art(1).jpeg\` — 1280×720 | Older scholar with **moustache and beard**, bent shoulders, hand at chin, slightly forward upper body, narrower low cuff; face is only ~50 px across and is uncertain | x=600, y=345, w=157, h=296 | 66/296 = **0.223** |
| \`ChatGPT Image Nov 14, 2026, 11_57_14 AM-2(1).png\` — 1672×941 | Young reader with **no beard**, long dark ribbon, small narrow chin, slanted eye-lids, BOTH hands holding an open scroll, long hanging cuffs | x=377, y=292, w=210, h=514 | 71/514 = **0.138** |
| \`ChatGPT Image Nov 14, 2026, 11_57_14 AM-1(1).png\` — 1672×941 | Young mountain walker with **no beard**, chin-resting near hand, downcast eyes, large gathered sleeve, trailing ribbons and trailing hem | x=895, y=342, w=239, h=481 | 77/481 = **0.160** |

These rectangles/landmarks are **manual art-direction estimates** from the
visible pixels, not exact anatomy or a trained face detection model. Three-quarter
perspective, foreshortening and occluded joints cannot be reconstructed without
new views. No invisible knee or ankle position was invented. The small first
figure has noticeably lower feature certainty. The two young men are not
designated as the same identity or as different camera views of one character.

### Reusable comparison and render integration

- \`registry/character/figure-proportion-study.ts\`: a typed, reusable image-space
  landmark/region mesh with pixel tolerances, visibility/occlusion, 20 projected
  measurement ratios, normalization, error handling, and side-by-side comparisons.
  It does **not** infer hidden depth or fabricate body joints.
- \`src/video/ink-shanshui-teacher-mesh.ts\`: three **different** manually
  measured source studies, preserving face, hair, eyes, brows, nose, mouth,
  shoulders, elbows/cuffs, hand and feet visibility; independent source image
  dimensions. The original generic puppet's 260×340 illustration is recorded
  as a fourth **student baseline**, not reinterpreted as a teacher.
- \`src/video/ink-shanshui-face-plates.ts\`: **new original code-drawn**
  elderly/reader/walker facial cels, including separately designed eyes,
  expressions, noses, brows, mouth visemes, top knots, hair ribbons, and a beard
  on the elderly actor **only**. These are rig-attached art assets and do not
  interfere with the existing speech/blink/gaze evaluator.
- \`src/video/ink-shanshui-film.tsx\`: \`makeShanshuiScholar(detail,contrast,scene)\`
  now uses the teacher's projected skull/figure ratio relative to the legacy
  puppet baseline to compute bounded, **per-scene head hierarchy rest scale**.
  This is a conservative rest-pose fit and does NOT solve neck construction,
  character anatomy or fully reference-accurate expressions by itself.
  The instance/definition pin matching profile-specific revisions.
- \`src/video/ink-shanshui-proportion.stories.tsx\`: a **Storybook art
  laboratory** under Video production → Film Looks → Chinese Ink. It displays
  the three reference mesh overlays, selectable face/body/sleeve/robe regions,
  real reported ratios and uncertainty. A user can choose their **local teacher
  image** with a browser file input; its temporary blob URL overlays the stored
  pixel-coordinates and is never uploaded or added to git. The schematic works
  without that file.

### Engineering vs visual acceptance

Engine tests should check that all three studies are valid, visible ratio
differences are measured, hidden joints are not invented, the elderly actor
retains a beard, both younger actors have none, the head/rest transformations
differ by scene, and all source identity/animation parts remain executable
without replacing the canonical rig. Playwright should inspect both the art
lab and the rendered film. **Passing these checks is not artistic approval.**
The current puppet still needs real 3/4 turnarounds, a correct anatomical
shoulder/sleeve/hand hierarchy, actual visible scroll grasp, true cloth-fold
deformation and improved original hand-painted face contours.


## Whole-figure recalibration (v4/v5 — reference student reconstruction)

The **head-only correction was insufficient**. The previous long-headed, wide-torso
puppet remained visually recognizable under new ink textures. This iteration
replaces the *actual rig art*, using one teacher-image-to-design projection for
**every visible body region**, rather than individual arbitrary scale modifiers.

### Architecture

- \`src/video/ink-shanshui-full-body.ts\`: \`shanshuiBodyFit(scene)\` solves
  body design coordinates and the 960×540 stage placement from the *same*
  projected source crop and landmarks. It includes full figure aspect, stage
  scale/ground position, shoulders, waist, hips, skirt/hem, sleeves, hands,
  exposed feet, and independently fitted head, scalp, brows, eyes, pupils,
  mouth and beard. Three profiles are separate identities.
- \`shanshuiBodyAssets(scene)\`: source-informed, **new original** curved sleeve
  silhouettes, continuous opaque robe, gathered belt and collar, 11
  overlapping fold lines, under-robe, paired visible hands, a reader's
  full-width scroll, and distinct wind ribbons/fabric trains for walker/reader.
  No external bitmap or proprietary artwork is embedded.
- \`applyShanshuiBodyFit\`: resets actual joint pivots for shoulder, sleeves,
  wrists, collar, belt, hem, face and hair. The canonical character hierarchy
  remains executable, including expression, blink and foot IK.
- **Head is anisotropic**, not globally shrunk. The face region supplies
  independent horizontal and vertical fit to the 260×340 design art.
  Eyebrows, eyes/pupils, mouth and hairline receive additional Y offsets
  from their own visible teacher landmarks. This is a projected image fit,
  not a facial likeness/identity guarantee.
- **Feet no longer depend on hidden shin art:** independent \`shoe-left\`
  and \`shoe-right\` vector parts track the authoritative
  \`inkWalkAt\` world-space foot targets through per-frame correction tracks.
  Concealed knees and ankles are not invented. A long under-robe plane now
  reaches down to the visible shoes, replacing the first pass's leg gap.
- \`shanshuiFittedRoute\` keeps every original film cue but computes figure
  size and final ground center directly from the original teacher image crop.
  Contact, composition and face size move together.

### Rig diagnostics & visual acceptance

The first whole-body render exposed severe problems: triangular sleeve hems,
flat robe contours, detached dark shoes, and an overlong, badly positioned
reader face that overlapped his scroll. Iterations changed sleeve Béziers,
added denser silk fold lines, grounded shoe targets and a lower undergarment,
and separately corrected face width/height and facial component placements.
All of these were made by reviewing actual rendered Storybook frames,
not by assuming TypeScript tests establish visual parity.

A Storybook **full-body figure panel** renders the actual original 260×340
SVG character assets and rest transforms beside the teacher-image region
overlay. Focused Vitest tests check complete source fit and grounded feet;
browser tests inspect each of the three full figures and films.

**Remaining:** the reference art depicts sophisticated historical costumes,
fabric folds, authentic 3/4 drafting, natural hands and expressive classical
ink lines. Current code vectors are a *controlled starting point*, not
painting-quality equivalence. Even an exact 2D contour fit cannot recover
unseen arm/leg 3D anatomy or achieve realistic walking without a custom
articulated garment rig. Review all three MP4s at native size before merging.


## Third pass: Chinese figure-painting craftsmanship, not another proportion resize

**Visual audit 2026-11-14:** At native 960×540, the source-fitted figures
were geometrically closer but still looked like *flat vector puppets*:
unweighted straight contours, wedge sleeves, long parallel skirt stripes,
smooth round hands with no finger information, nearly blank childlike faces,
scroll edges without believable ink, and flat flying ribbons. Applying
more noise/filtering to these shapes would *not* fix their construction.

### Technique research (external, not claims about our original paintings)

- Palace Museum: [十八描](https://www.dpm.org.cn/lemmas/241509.html) —
  classic families of figure and garment linework such as 高古游丝描
  (fine silk thread), 铁线描 (iron-wire), 行云流水描 (flowing cloud/water),
  柳叶描 (willow-leaf), 钉头鼠尾描 (nail-head, rat-tail),
  and 枯柴描 (dry, fibrous brush).
- Asian Art Museum:
  [A Visual Vocabulary of Brushstrokes](https://education.asianart.org/resources/a-visual-vocabulary-of-brushstrokes/)
  — distinguishes precise gongbi and baimiao outline drawing from wet
  xieyi, dry brush, and wet broken-ink layering. We are using fine
  contour hierarchy on FIGURES against more open landscape washes.
- Shanghai Museum's historical
  [scholar portrait](https://www.shanghaimuseum.net/mu/frontend/pg/m/article/id/RI00004057)
  is a useful independent reference for carefully outlined wide sleeves,
  small face, collar layering and mostly hidden hands. It is not embedded
  or traced in this code.

### Applied implementation

- \`src/video/ink-shanshui-fine-craft.ts\` supplies a strict,
  deterministic **pressure-sampled cubic brush outline**. The center curve
  is offset along its normal at variable pressure to produce an actual
  closed ink footprint with a fine release; it is NOT uniform-width
  SVG stroke + blur. Companion fine strokes, silk thread bundles and
  dry-edge hatching are separate primitives.
- Distinct character-specific facial detail: hair strands and knot grain,
  thin lower lids, brows, tear ducts, nose shading and mouth creases;
  the hermit's moustache/beard gains individual tapered strands,
  while the two younger scholars retain bare chins and separately
  wind-swept hair/ribbon designs. Existing blink, gaze and visemes
  are still connected to their true part transforms.
- \`src/video/ink-shanshui-garment-craft.ts\` adds **joint-native** thin
  inner cuffs/lining, shoulders-to-wrist silk tension folds,
  two-layer collar piping, waist knots/creases, robe wash volumes,
  irregular short stress folds and sparse hem hatching,
  hand knuckle/finger creases, shoe vamp stitching, and
  ruled scroll edging. Empty art for the walker’s hidden far hand
  and for a non-reader’s scroll is deliberate.
- \`makeShanshuiScholar(detail,...)\` binds **eleven extra native parts**
  to their actual parent body/arm/hand/shoe/collar/scroll nodes.
  Per-part material parameters keep fine dry linework sharp even
  when broader garment washes have bleed and grain. Storybook's
  scholar study has a direct 0–100% craft slider.
- The first high-detail test render was too striped and had stiff,
  wide ribbon tails. The next iteration reduced the long parallel
  folds in both the base garment and detail engine, introduced
  asymmetrical translucent wash-plane volumes, concentrated
  shorter strokes where cloth is compressed, and tapered the
  ribbon ends into lighter, curved silk shapes.

### Art-director acceptance (not determined by green CI)

Inspect a source-to-render contact sheet at face, cuffs, torso and hem
**at the same pixel dimensions**; compare the *quality* of mark-making,
not simply the number of paths. Invalid improvements include gratuitous
hatching unrelated to cloth gravity, transparent body parts,
static decorations detached during gait, hair detail that blurs into a blob,
and an unreadable scroll at the film viewing scale.

**Not solved yet:** a full historically credible 3/4 character model,
individual articulated phalanges, a true two-bone forearm-sleeve
deformation system with grasp constraints, 3D cloth occlusion,
and genuinely painterly wet-on-silk tonal transitions. The fine-line
engine is an explicit reusable quality improvement, not a replacement
for reference-accurate drawing. Keep PR #194 draft until it passes the
source-image visual gate, not merely TypeScript/Vitest/Chromium tests.


## Independent render audit: Storybook evidence and branch continuity

Reviewed the **actual** Chromium screenshot artifacts from the prior successful
Shanshui quality run (GitHub Actions run `43650098268`), including all three
landscape compositions at frames 125/210, face/crown studies and full-figure
asset panels. This was a rendered-image review, not a substitute for watching
new MP4s or a claim of parity with the supplied traditional paintings.

### Findings grounded in those frames

- **Pine:** Eight near-horizontal branch tiers read as repeated flat shelves.
  Their canopy sprays were spaced along interpolated x values rather than
  sampled from the same visible branch path. This weakens branch-to-foliage
  connectivity, even though the individual needles are authored paths.
- **Willow:** An attractive left-side silhouette, but the long arch supports
  overwhelm the leaf curtain. Independent randomly placed strand origins and
  leaves not evaluated on the hanging strand's quadratic path create
  disconnected-looking vegetation.
- **Scholar:** Figure identity, silhouette opacity and distinct headpieces are
  established. However the figure still reads as simplified at 960×540:
  small dark shoe contacts, flat wide sleeve silhouettes, relatively even
  robe folds and understated eyelid changes. These require further drawn
  anatomy, contact staging and independent visual approval.
- **Motion accessibility:** The Storybook player previously exposed a Play
  button in reduced-motion mode even though its RAF loop was disabled.
  Reduced-motion film scenery also inherited the requested frame's reveal
  opacity, so frame zero could display a partially completed wash.

### Corrections in the subsequent iteration

- Willow fronds now start at the **same quadratic Bézier** geometry as their
  six parent boughs; every alternating leaf is placed by sampling its parent
  hanging frond rather than by independent x/y offsets.
- Pine branches use less regular, asymmetric endpoints and cubic branch
  curves. Needle clusters are biased toward branch tips and positioned
  *on* those curves.
- Reduced-motion preview disables playback and samples the completed wash.
  The path-wash gradient ID is unique per rendered stage instance.
- Brush geometry validation now rejects non-finite opacity/start weight and
  malformed seeds before SVG coordinates can become `NaN`.
- Focused Vitest, Playwright and Storybook sidebar checks cover these
  contracts; the Shanshui-specific workflow includes the navigation test.

**Release status:** Updated foliage and motion-accessibility code needs fresh
CI, a new native-resolution screenshot audit and moving MP4 inspection.
Do not infer visual approval from code review or pre-change screenshots. The
next illustration pass should prioritize convincing planted feet, hand-scroll
grip, sleeve negative-space anatomy and controlled wet/dry line transitions
rather than simply increasing contour density.


## Structural craft iteration — shared ridge geometry and scroll grip (2026-11-14)

The previous contact sheet showed many tapered cliff lines that felt
detached from the mountain silhouette. Root cause: the filled ridges sampled
a fractured Catmull–Rom-style crest while `ridgeHeight` attached cunfa and
moss to straight interpolation between original coarse landmarks. That means
a line could originate in open sky or miss the crest entirely. The new
`ridgeStations` supplies **one ordered set of rounded sampled coordinates**
to the fill path and its pigment marks. Exact data, seed, and frame sampling
remain deterministic; artwork still uses authored geometry and no source
image texture.

The young scroll reader's hands looked like small round beads on the
parchment. This pass keeps both source-measured wrist anchors, but replaces
each former two-path oval with an opaque seven-shape grip: continuous thumb/
palm silhouette, bent thumb, differentiated finger creases, a warm turning
plane and a cuff contact. The right/left grips are deliberately mirrored and
remain on their original character joints. The far hand stays behind the
scroll; the near hand retains foreground occlusion. No arbitrary anatomical
joints have been inferred beneath the sleeves.

### Verification gate

- Unit checks: generated ridge groups and sampled cunfa root offsets,
  deterministic render, both mirrored reader hand plates, opaque silhouettes
  and the validated character hierarchy.
- Browser proof: every Shanshui scene at multiple frames and the reader
  proportion panel. Inspect mountain contour junctions for floating strokes
  and finger/scroll contacts at native 960×540, plus motion across frames.
- Film proof: an encoded reader film after the code changes. This new
  screenshot and MP4 review has **not yet been completed** at the time of
  writing; the older contact sheets do not certify the current changes.

Do not inflate tiny fingertip outlines into dark beads, turn the folds into
uniform lines, or weaken checks simply to claim aesthetic parity. A later
reference-led art pass should tune ink deposition on rocks, open paper reserve,
and changing hand anatomy in actual grasp/reading poses.
