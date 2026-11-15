# Chinese ink bamboo — ArtCraft reference-led branch construction

Date: 2026-11-15
Status: **implementation candidate; visual release hold pending native 960×540 review**

## Art brief and constraints

Subject: botanical foreground bamboo for original Chinese ink-wash landscape films. The
medium is diluted/dry brush and reserved rice-paper ground, not postprocessed
vector clip art. The motif should read as bamboo at the 960×540 film size and
at a >2× cropped detail in the existing **Chinese Ink / Shanshui Film Gallery**.
Audience: animated history, poetry, nature and educational films.

Three independently testable visual invariants:

1. Each leaf attaches to a painted primary branch or its own secondary shoot;
   each branch starts at the same sampled culm joint that draws its collar.
2. Culm internodes and leaf angles vary while retaining a clear hierarchical
   thick-to-thin load: culm → primary branch → secondary shoot → leaf.
3. Solid stems remain opaque-looking against the paper ground; variation comes
   from different deposited tonal washes, blade belly, and fine tip release,
   **not** uniform opacity fading or random noise.

Stylized: compositional scale, three foreground stems, restrained warm sepia
in place of a strict pure-black painting. Not stylized: where a child shoot
connects or how leaf tips taper.

## Artwork study and rights

The following works were inspected as **style and botanical construction**
references only; original contours are not traced or imported:

- [Zheng Xie, *Misty Bamboo on a Distant Mountain* (1753), Met](https://www.metmuseum.org/art/collection/search/44620):
  strong/recessive stems coexist, dark branches are sharply distinct from
  ghosted distant foliage, and each branch group has intentional empty space.
- [Zheng Xie, *Orchids and Bamboo* (1742), Met](https://www.metmuseum.org/art/collection/search/49244):
  tiny lateral shoots break up fan repetition, with coherent calligraphic
  gesture and negative-space hierarchy.
- [Wu Zhen, *Bamboo, Old Tree, and Rock* (1338), Met](https://www.metmuseum.org/art/collection/search/39547):
  overlapping value masses imply recession without individually making
  every leaf gray and translucent.
- [*Ink Bamboo Album*, National Palace Museum](https://theme.npm.edu.tw/selection/Article.aspx?sNo=04009183):
  multiple blade pitch/length families around sparse, connected interior
  branch bones; broad-to-pointed pressure marks, not repeated clip-art stars.
- [Asian Art Museum, *Visual Vocabulary of Brushstrokes*](https://education.asianart.org/resources/a-visual-vocabulary-of-brushstrokes/):
  differences among line, dry brush, and wet loading motivate width and
  tonal hierarchy inside the marks.

Museum material is **reference only**; no externally hosted images or video
are bundled with the library.

## Pre-change visual diagnosis

The previous bamboo formed three similar oversized culms and 21 copies of
a one-branch/five-leaf pattern. Seven evenly-spaced collars per stem, leaves
inserted only on the primary branch, and near-constant fan volume made the
crowns schematic. A count-based test could prove 105 leaves existed but
could not say whether the branch anatomy was credible.

## Code translation

Within existing `registry/video/ink-shanshui-react.tsx` `Bamboo`:

- Sample seven slightly unequal internodes along the **existing** curved
  culm. Both collar and primary branch consume the same computed node.
- Add **two** short secondary brush shoots from sampled positions on each
  primary branch, never a floating decorative line.
- Place three of five leaf inserts on the parent and one on each secondary
  shoot. The leaf base is evaluated on the precise curve it follows.
- Vary branch reach, lift, lateral orientation, blade length and fullness
  deterministically from the original seed. Maintain five pressure-loaded
  blades per node to preserve density controls and legacy expectations.
- Keep the original wet/dry mark weights, absolute-frame rendering and wind
  transform hierarchy. Do not add dependencies or copied raster art.

The existing Storybook Brushwork studio gives the full-resolution frame plus
the **2.15× real-renderer bamboo crop** under detail, ink, mist, wind, seed,
and frame controls. The specific improvement must be judged in that existing
leaf rather than by adding another sidebar folder.

## ArtCraft five-axis review

| Axis | New check | Human/render evidence still required |
| --- | --- | --- |
| Topology | 21 primary node roots, 42 secondary shoot roots, 105 leaf bases and explicit parent identifiers | Inspect cropped attachment and overlap at 2.15× |
| Direction | unequal culm internodes and branch/leaf spread | Reject comb-like repeating rows |
| Pressure | slender shoots and closed tapered leaf blade curves | Reject flat opaque wedge or excessive filled belly |
| Optical spacing | nonidentical branch reach and mixed side orientation | Check no gray mass or crowding against distant ridge |
| Microtexture | existing two dry-lift marks per full-detail branch remain | Check that highlights resemble lifted paper, not stripes |

Unit tests cover topology, finite geometry, parent IDs, seed determinism,
and detail 0/1 behavior. Browser screenshot and production moving film remain
**separate gates**. Those checks cannot establish painterly parity.

## Actual native-render ArtCraft critique — first candidate rejected

Inspected the **real** Chromium screenshots from GitHub Actions
`43683567051` at 960×540 (misty hermit, mountain trail, river scholar)
and the existing four-motif 2.15× Storybook brushwork studio.
The first branch-rooted candidate **passed** TypeScript, Vitest,
registry checks, Storybook/Playwright and 96-frame river-scholar MP4
export, but the artistic result was still insufficient.

Three visible defects, in impact order:

1. Three foreground culms stood as a set of **parallel dark fence posts**,
   their repetitive heavy horizontal collars amplifying the problem;
   compare Zheng Xie's graded, fanning and receding stems.
2. The leaves appeared as isolated thin angular blades instead of
   coherent ink-loaded foliage groups. Local texture density is still
   far below the Wu Zhen/NPM references; hierarchy alone is not enough.
3. The distant mountain wash was too faint compared with the dark,
   mechanically outlined foreground vegetation; the figure/costume
   remains visibly constructed from line shapes.

**Second pass (culm silhouette/pressure only):** Changed the three stem
apex coordinates and cubic gesture to fan in different directions, changed
their width and ink weight by depth, and tied collars to the **same
calculated tangent** and decreasing local radius, rather than horizontal
one-size rings. Shared centerline node attachments and wind parentage
remain unchanged. This is a candidate to be re-rendered, not approved.

Remaining release gate: verify 2.15× and 960×540 second-pass crops plus
time-seeked scenes. If the leaves still read as isolated arrow clips,
do another shape/pressure/spacing pass before marking this PR ready.

## Second-pass rendered QA and third-pass leaf construction

Inspected Chromium evidence from successful workflow `43684098866`.
The fanned central culm and lighter flanking stems improved silhouette
variety and relieved the rigid node-ring repetition. The native 960×540
image and 2.15× crop still showed detached-looking, pointed *arrow* marks
with an undersized group rhythm compared with the source paintings.

**Third pass, targeted fix:** calculate the pressure belly using each
individual leaf's **local tangent normal** (instead of adding width only
in screen Y), then taper both sides into a fine tip. Attach up to three
smaller asymmetric satellite blades per node to their existing branch
curve. Keep their construction deterministic across frame seeks,
explicitly expose their root coordinates, and preserve all primary
blade/face/garment contracts. At low detail, satellite blades disappear.

This is a specific optical-spacing/pressure hypothesis. It must still
be tested against native output; it is **not** automatic proof of a
world-class painted appearance. Pine, rock and scholar detail remain
separate visible limitations.

## Fourth ArtCraft pass — source-led clusters and tangent flow

Compare the last actual native close-up in `43684518797` to
[Wu Zhen, *Manual of Ink Bamboo* (1350), National Palace Museum](https://theme.npm.edu.tw/selection/Article.aspx?lang=2&sNo=04009183)
and [Zheng Xie, *Bamboo and Rock*, NPM](https://digitalarchive.npm.gov.tw/Collection/Detail/18568?dep=P).
The source brush clusters are **not** standalone copies of identical
arrowhead shapes: paired long and short blades leave a living twig at
different pitches; their overlapping dark/dilute strokes resolve into
a canopy mass against substantial untouched paper.

The third candidate already had correct parent anatomy but too many
isolated straight-pointed strokes in the actual full-frame render.
The fourth pass therefore changes the structural **cause**:

- Derive each primary leaf direction from its actual parent twig's
  quadratic tangent, then vary relative fan pitch. Do not invent an
  independent screen-up vector for every leaf.
- Concentrate smaller echo strokes near the terminal 20% of the
  same real painted parent branch, instead of dispersing them along
  the entire branch. The code still exposes exact parent-root markers.
- Increase dark-blade belly and ink load on foreground groups while
  retaining lighter/diluted companion strokes.
- Redirect dry-lift filaments along the actual leaf's length; their
  previous screen-up curves were visibly detached from leaf geometry.
- Keep five primary leaves per bamboo node at full art detail and the
  same sparse/zero-detail contracts. A separate Storybook crop examines
  upper canopy groups alongside an existing culm-joint crop, **without
  creating an additional Chinese Ink sidebar story**.
- Add a cheap seeded heading-diversity check; it is a diagnostic,
  not a painterly quality metric.

ArtCraft acceptance: evaluate all three original landscape compositions,
individual 2.15× crops, motion frames and generated MP4. Reject the
iteration if leaf group silhouettes still resemble algorithmic stars
or clean triangles more than directional brush deposition.

## Fourth render rejection and fifth, shape-first iteration

Actual run `43685563041` passed TypeScript, scene/rig unit checks,
catalog installation, Chromium Storybook navigation and a real 96-frame
film encode. Inspected the recorded 960×540 hermit still plus both
2.15× bamboo crops. **Art review rejected** the new output: the
branched leaves were more numerous and closer to the foreground, but
their evenly distributed arrowhead silhouettes still looked like
clean geometric vector cutouts. Light background mountains and the
stiff hermit/pine remained unchanged. CI passing did **not** close
the artistic gap.

The [National Palace Museum Wu Zhen album leaf](https://theme.npm.edu.tw/selection/Article.aspx?lang=2&sNo=04009183)
shows curving, ink-loaded blade gestures and **terminal** clusters;
closer study of the dark junctions led to these original code changes:

- Place most main leaves on the final 40% of their connected branch;
  group spur leaves toward their own branch tips, rather than across
  equally spaced stations from trunk to endpoint.
- Narrow the fan-angle family and asymmetrically curve individual
  pressure contours, advancing the belly to an earlier variable
  contact station; less repeated symmetric arrow geometry.
- Keep all path roots, parent labels, sparse detail, the seeded
  960×540 film frame contract, and the existing single Storybook leaf.

**Fifth-release visual acceptance remains open.** The next actual
render must be checked for a recognizable brush cluster, no detached
blades, no lost negative space and no harder thumbnail-scale "star"
shapes. Do not use angle-count tests as a replacement for this review.

## Sixth pass — material-first paper absorption and ink controls

The fifth 960×540 film and 2.15× Chromium crop from run
`43685974961` were genuinely inspected. They show more coherent
terminal foliage and flowing blade tips, but the outlines are still
clean Bézier silhouettes on uniform flat fill. The 96-frame MP4
(960×540, 30fps, 3.2s) also shows the character's cutout-like gait.

Following the brush-material requirement of ArtCraft, a new
**instance-scoped paper absorption filter** is applied to the whole
native bamboo organism (culm, joints, child branches and leaves at
once). This prevents a filter applied separately to detached leaves
from breaking visual join continuity. It combines seeded fine
paper-fibre distortion, a small capillary Gaussian fringe, and a
stronger retained ink core; the filter expands bounds to avoid clipping
visible boughs. No raster paint image or third-party texture is used.

The existing Storybook `Brushwork ink` control now affects foreground
bamboo's actual accumulated ink load, not just the mountains. Unit
tests inspect live SVG filter isolation between two paintings and
ink=0/1 settings. Playwright changes the real slider and confirms the
actual foreground renders different values. The source-comparable
bamboo canopy/node cards remain in the same Storybook page.

**Release gate remains visual, not mathematical:** compare new dark
edges at 2.15× to original Wu Zhen ink-bamboo brushes. Reject a blurred
vector silhouette if the retained crisp core and capillary fringe do
not improve believable pressure/fibre deposition. Inspect both 16:9
full frames and encoded motion. The composition and figure need
their own dedicated ArtCraft rebuild after bamboo acceptance.

## Seventh pass — reference-shaped pressure profile and negative-space rhythm

Primary reference: National Palace Museum, Wu Zhen *Manual of Ink Bamboo*,
the original leaf *Bamboo in Wind and Rain*, at
https://theme.npm.edu.tw/exh105/oversized10/en/selectionZoom/img5.html
and the NPM https://theme.npm.edu.tw/selection/Article.aspx?lang=2&sNo=04009183.
Secondary technique study: https://files.eric.ed.gov/fulltext/ED358003.pdf
(brush tip / half-side / stalk / leaf loading techniques).

The sixth filtered crop at native 960×540 made the paint marginally
more fibrous, but there was little **structural** improvement: identical
five-blade motifs persisted at every bamboo joint. The original artwork
instead uses alternating voids and loaded clusters, with visibly
different tones between foreground and receding leaves.

Seventh pass: replace the two-cubic vector teardrop with ten asymmetric,
deterministically sampled brush-pressure stations and smoothly joined
cubic edges. The original source is **not** sampled as pixels; material
design remains style-guided. Heavy paint appears from roughly 30–60%
of stroke length, followed by a gradually thinning release. Slight
independent edge irregularity follows the local stroke tangent normal.

The 21 culm collars are retained but no longer all carry a uniform
five-leaf star. The three seven-level cluster budgets `[0,3,8,1,10,2,10]`,
`[10,0,3,10,1,8,2]`, and `[2,10,1,8,0,10,3]` provide
**102** pressure-painted leaves across three culms. Each stem has
34 leaves, but its heavy clusters and silent joints occur at different
heights; they deliberately avoid three synchronized comb-like
crowns. The unit test asserts all three distinct rhythms.
Spur attachment counts, sparse detail and finite path contracts
were updated to match this design instead of preserving a uniformity
bug through test expectations. Roots and branch hierarchy remain
shared and deterministic.

All material and morphology changes still require new actual 2.15×
crops, full-composition thumbnails, normal-speed MP4 QA and independent
ArtCraft review. No claim of stylistic equivalence is made from
passing count/curve tests.

## Required release evidence

Run from a clean repository checkout:

```bash
npm run typecheck
npx vitest run --project unit tests/ink-shanshui.test.tsx
npx playwright test -c playwright.storybook.config.ts tests/e2e-storybook/ink-shanshui.spec.ts
npm run video:export -- --story=video-ink-shanshui--misty-hermit-export --startFrame=44 --frames=96 --output=dist/ink-misty-hermit.mp4
```

The Storybook exporter uses the real Shanshui film renderer; this is an
encoded clip, not a static mockup. Inspect the bamboo crop in the gallery at 0/100% detail,
seeds 71 and 87, wind 0 and 1, and compare frames 145/210 at native size. Then
inspect the complete 960×540 river and hermit footage, including edge clipping.
No source-relative image score or final artistic approval is claimed here.

## Eighth pass — internal *fei-bai* deposition (candidate, not approved)

The native Chromium artifacts from [run 43688026010](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43688026010)
were inspected before this change, including the real 2.15× bamboo canopy
and node crops and complete 960×540 misty-hermit frame. **The material gate
failed despite passing CI:** dark bamboo leaves still look like clean filled
vector blades, and many leaf patches are too isolated against the already
weak distant mountain wash. More generic filter noise would not fix the
brush-material problem.

References studied for this limited pass:

- [Wu Zhen, *Manual of Ink Bamboo* (National Palace Museum)](https://theme.npm.edu.tw/exh105/oversized10/en/selectionZoom/img5.html):
  leaf silhouettes and the parent twig flow must be judged together;
  pressure mass must not be confused with separate geometric arrow tips.
- [Xia Chang, *The Serene Bank of the Xiang River* (Nelson-Atkins)](https://art.nelson-atkins.org/objects/6135/the-serene-bank-of-the-xiang-river):
  each bamboo blade is a single directed calligraphic gesture; the dark
  center and the released bristle edge are not independent paint stickers.
- [Asian Art Museum, *Introduction to Chinese Brushpainting Techniques*](https://education.asianart.org/resources/an-introduction-to-chinese-brushpainting-techniques/):
  fei-bai dry-brush and side-ink techniques explain why coherent strokes
  contain fine internal interruptions rather than random global speckling.

### Topology / flow / pressure / optical rhythm / microtexture

- **Topology:** each new dry bristle line is explicitly nested within the
  existing leaf's pressure-contour path. The twig and silhouette remain
  unchanged; no disconnected decoration is introduced on the paper.
- **Flow:** the dry marks are evaluated along the exact leaf chord and
  the **same deterministic curvature** as the loaded outer blade.
  Their sampled ends lie within the pressure belly.
- **Pressure:** three short, unequally spaced 0.18–0.4 px lines are
  placed inside each full-detail primary blade and, when detail > .85,
  each full-detail satellite blade. The marks are not a replacement
  for the 10 pressure stations, only a discrete dry-fibre contribution.
- **Optical rhythm:** seeded bristle starts, lengths and offset vary
  within the pressure belly. Deliberate blank internodes remain.
- **Microtexture:** retained instance-local absorption + within-blade
  bristle skips rather than large canvas blur or repeated parallel lines.

**Negative controls to reject:** dry strokes extending across untouched
paper; outer silhouettes losing their taper; identical oblique hatching;
a jagged scatter of unrelated dots; texture hiding branch anatomy;
a dense blob covering all intentional spaces.

**Next inspection:** CI must produce actual native 960×540 captures in all
three compositions, 2.15× canopy/node crops with detail 0/.7/1,
ink 0/.5/1, wind 0/1 and seeds 71/87. Inspect the exact edited
head-SHA screenshots against the museum brush strokes and review the
96-frame encoded film. Automated bristle counts and passing typecheck
cannot approve painterly authenticity. If the underlying arrow-shaped
silhouette persists, adjust the **pressure contour shape**, not add
further pigment noise. This PR stays in draft until independent visual
approval.


## Ninth pass — shape-first press / drag / lift, subtractive dry brush

### Museum source observations (2026-11-15)

These are observed museum images, studied as visual/technical benchmarks only.
They are not embedded in the repository or traced:

| Source and canonical image | Structural observation | Prohibited shortcut |
| --- | --- | --- |
| [Wu Zhen, *Manual of Ink Bamboo*, NPM album, 1350](https://theme.npm.edu.tw/exh105/oversized10/en/index.html), especially [leaf 20](https://theme.npm.edu.tw/exh105/oversized10/common/images/selection/img1_1_20s.jpg) | One rooted brush trajectory per leaf; alternating dense dark junctions and long empty twig lengths; leaf belly load and release are directional, with dilute stalks behind heavier ink | Repeating identical geometric arrowheads with decorative gray scratch marks on top |
| [Wu Zhen album bending bamboo, NPM image](https://theme.npm.edu.tw/exh105/oversized10/common/images/selection/img1_1_12s.jpg) | Long loaded blade groups bend with their supporting branch; sparse terminal shoots do not crowd every joint equally | Disconnected or consistently vertical leaf shapes unaffected by supporting twig tangent |
| [Zheng Xie, *Orchids and Bamboo*, 1742, Met object 49244](https://www.metmuseum.org/art/collection/search/49244), [detail](https://images.metmuseum.org/CRDImages/as/original/DP204894.jpg) | A few dense triangular *group silhouettes* are composed from many independent yet interlocking brush gestures. Sharp contact regions are balanced against soft partially depleted trailing edges | Single sharp triangles repeated at the same angle for each botanical cluster |
| [NGV curator essay on Wu Zhen’s *Bamboo in Spring Rain*](https://www.ngv.vic.gov.au/essay/wu-zhens-bamboo-in-spring-rain/) | Distinct negative-space windows between wet and wind-bent leaves, and calligraphic one-pull stroke order | Applying uniform all-over noise as a substitute for the stroke hierarchy |

Source usage: **style-guided** construction and artwork provenance; the linked
images remain third-party material. No pixel matching or externally downloaded
raster art is claimed. The previous actual native [2.15× canopy/node inspection](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43693088562)
demonstrated black flat-filled arrow-like bamboo leaves and lighter discrete
decorative lines; both are materially at odds with the cited source.

### Structure before surface

The canonical unit is **parent painted twig → pressure-loaded leaf trajectory
→ ink-filled outline with taper → optional split-bristle reserve**.
Branch roots, shared culm nodes, wind transforms, multi-seed determinism,
21 rhythmic budgets, 102 primary leaves, and 63 satellite leaves are preserved.

The new continuous stroke kernel uses fifteen press/drag/lift pressure samples
rather than ten, three **different** contact and release families, unequal
left/right ink load, and a small seeded second-order wrist curve. All 28+
spline segments belong to **one closed deposited stroke**. Source geometry
is only a qualitative reference; all contours are authored procedural shapes,
not copied paths from a museum artwork.

For each visible blade the renderer now adds an **axially oriented, per-stroke
ink-concentration gradient** with wet dark contact and dilute/drying release.
This is a shading approximation, not a fluid solver. In the detailed state,
three short centreline-following bristle splits are **black negative space in a
luminance mask** against a white leaf silhouette: the paper/backdrop remains
visible through real holes instead of using light-colored stroke overlays.
Masks have per-component stable React IDs and explicit user-space bounds
to avoid cross-scene collisions and crop clipping. The existing outer
instance-scoped fibre-absorption filter is preserved. Dark silhouettes remain
materially legible; this is not arbitrary entire-character transparency.

### Five-axis review

- **Topology:** compare each branch/root intersection and local split-bristle
  mask. Added deterministic assertions for named parent attachments, 165
  uniquely addressed negative-space masks and gradient references.
- **Flow:** the new stroke's centerline and its reserved bristles share one
  computed wrist-curve offset. Inspect mixed wind poses; reject stray white
  dots in the negative space unrelated to stroke pressure.
- **Pressure:** three hand-designed sampled profiles vary early load, belly
  and lift. The 15 stations are a geometry instrument, not a craftsmanship
  score; reject blob/arrow silhouettes on actual renders.
- **Optical spacing:** budgets intentionally include empty culm joints;
  inspect overlap in the native frame, not count 102 leaves as a visual pass.
- **Microtexture:** masked paper reserves, gradient and retained organic
  fibre filter. Verify that bristles can be seen in the final film without
  becoming bright uniformly spaced stripes.

### Evidence and release gate

Browser: existing five Storybook crop cards plus three working material
presets for high-load, dry-lift and sparse geometry, retaining existing
**Video production / Film Looks / Chinese Ink** story IDs and folder.
Static code tests are expanded for mask count/IDs and live gradient use.
Chromium must inspect actual material masks and interactive presets.

**Unapproved until the final head's native evidence is inspected.** Typecheck,
unit tests, Playwright screenshots from both source seeds, detailed/zero state,
and 960×540 normal-speed encoded MP4 are separate from visual art approval.
This pass intentionally avoids changing the human face: ArtCraft v7 requires
a rights-cleared measured human source and independently reviewed anatomy before
portrait edits. If the branch conflicts with newer main, resolve with scoped
conflict analysis before merging; never silently replace other open art PRs.


## Tenth pass — remove phantom twigs from intentional paper-reserve nodes

**Actual inspected predecessor:** [native browser evidence from successful exact
head `8a73e9ef`](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43711313634);
both 2.15× bamboo motif crops and 960×540 misty-hermit view were reviewed,
alongside the earlier `c3021a` screenshots. The new asymmetric pressure/ink
gradients visibly soften the former flat-filled blades and the masked bristles
appear as genuine internal reserves. However the canopy still looks sparse
and stylized, with unnecessary pale branch twigs crossing empty regions.

**Source morphology correction:** unlike genuine Wu Zhen's bamboo groups,
the earlier implementation always rendered a painted primary twig at all 21
culm joints, even though three deliberately authored joints had **zero**
foliage. These were not negative-space pauses; they were phantom lines.
The main branch is now rendered **only when it carries at least one visible
leaf**. The seven internode samples, collar root geometry, 102 full-detail
blades, 63 satellites, closed pressure shape, paper-reserve masks, and all
existing wind paths stay intact. At full detail, 18 true painted twigs remain;
at detail zero, no branch twig survives. No artist texture is removed from a
live painted branch.

Visual hypothesis: this will recover open paper channels near the stems and
reduce the 'spidery wireframe' impression. It is not a full remedy for
unconvincing foliage silhouettes or the schematic background mountains.
**Release still requires a new exact-head render and independent ArtCraft
comparison.** Unit/browser tests assert both the 18 live branches and the
zero-detail omission. This is structural deletion of incorrectly floating
motifs, not general shape simplification.

## Eleventh pass — source-observed terminal foliage grammar (2026-11-15)

### Evidence and reconstruction contract

Primary images inspected (technique references, not traced, rasterized or bundled):

1. [Wu Zhen, *Manual of Ink Bamboo*, National Palace Museum — leaf 20](https://theme.npm.edu.tw/exh105/oversized10/common/images/selection/img1_1_20s.jpg). Distinct short and long leaf families meet their supporting terminal twig at close stations, while two culms retain visible bare intervals. The already-rendered algorithmic work kept leaves spaced out along every brush branch, so each blade looked like an isolated spear.
2. [Wu Zhen, *Manual of Ink Bamboo* — leaf 12](https://theme.npm.edu.tw/exh105/oversized10/common/images/selection/img1_1_12s.jpg). A diagonal bent culm carries secondary shoots with curved leading edges and clustered leaves; the branch hierarchy reads across one continuous gesture, not repeated radial suns.
3. [Zheng Xie, *Orchids and Bamboo* (1742), Metropolitan Museum](https://www.metmuseum.org/art/collection/search/49244). Dark loaded strokes alternate with open ground; the density does not come from a seamless black fill. Technique is examined only; no image data appears in the renderer.

### Source → shape graph

| Observed structure | Previous defect (native v10 inspection) | Implemented controlled correction | Negative QA |
| --- | --- | --- | --- |
| Parent stem → branching arm → closely rooted fan | First lateral arm at parent t=.35, three main leaf bases stretched t≈.66–.93 | Lateral arms now at parent t=.59/.78. Three main leaves root at t≈.75/.82/.89 with narrow seeded variation and milder second-layer stagger | No floating leaf attachment or indiscriminate clumping at every node |
| Unequal long and short calligraphic leaves | Five nearly equally sized rays and abrupt arrow groups | Five gesture families: length multipliers 1.12/.81/1.06/.70/.79; narrower asymmetric angular fan with small deterministic seeded pitch changes | Do not replace distinctive foliage with identical radial wedges |
| Attached companion leaf within one twig family | Satellite root independently jumped to a separate t≈.79 segment | Satellite root moves by no more than ≈.04 in parent parameter from its own main leaf root, and echo rotates relative to the leaf's actual heading | No visually detached echo blades over untouched paper |
| Layered dark-to-dilute medium | Bright overlays / flat fill in prior images | Retain existing asymmetric fifteen-station ink profiles, ink-direction gradients, and negative-luminance paper reserve masks | Do not claim a pigment simulator or reference-level visual match |

**Geometry invariant:** 21 culm joints, three independently phased seven-joint budgets,
102 full-detail primary leaves, 63 satellites, parent-twig and satellite
root attributes, full/partial/zero detail semantics, all scene/frame seeds
and wind transformations remain compatible. New per-leaf station and
cluster IDs permit checking that the resulting terminal mass occupies a
restricted section of the actual branch rather than a random screen-space
cloud. Branch roots and leaf roots still derive from the same Bézier
points. The revised cluster pattern changes no public API and adds no
new Storybook folder.

The **final ArtCraft gate remains a native visual review**: full 960×540
frames at seeds 71/87, brushwork closeups at 2.15×, sparse/full detail,
normal-speed 96-frame film and seed/frame reproducibility.
This iteration improves structural clustering, not facial anatomy or
mid-range mountain texture; full-scene acceptance is not presumed.


## Twelfth pass — actual native visual rejection of upright spray geometry

The [eleventh-pass-exact-head film/Chromium render](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43726792573) was captured at the real 960×540 resolution and as the original five 2.15× Storybook inspection cards. The bamboo canopy crop gained substantial painted density (an 11,270-pixel region-local change at >10 mean RGB difference in 320×255 pixels, under a same-crop comparison; this is **not** a source fidelity metric). The pine crop remained pixel-identical, which helps isolate the change. The full scene, however, showed too many vertically upright heavy leaves like pointed knives.

Comparison to [Wu Zhen's bending bamboo source leaf 17010703, NPM](https://theme.npm.edu.tw/selection/att/collection/04009183/17010703.jpg) suggests a more convincing calligraphic **horizontal and hanging** rhythm beneath bent branches, interrupted by only a couple of upward gestures. The original v11 hero plan used relative headings
`[-.76,.38,-.24,.86,-1.04,.12,-.54]`; this was a poor directional hierarchy. The v12 correction replaces them with
`[.32,.92,-.29,1.2,-.67,.52,-.06]`, under the same parent tangent and handed fan sign. It retains the **same seven** loaded leaf strokes, same branch roots and normalized stations, same 15-station brush pressure, same dry-fibre masks, same ink gradation, and the same absolute-frame scene behavior.

**ArtCraft result: unresolved until new native evidence** and five-axis source-specific crop study. The sampled source is not a contour trace or an exact numerical calibration. The brushwork still must be evaluated against real paintings; stronger image contrast alone does not prove natural brush hierarchy. The distant mountains and scholar are outside this narrowly scoped botanical pass.


## Thirteenth pass — Huang Gongwang geological bone (2026-11-15)

### Primary source review

**Canonical source:** [Huang Gongwang, *Dwelling in the Fuchun
Mountains*, 1350, National Palace Museum (Google Arts & Culture
museum-authored feature)](https://artsandculture.google.com/story/GwUhSlv0zyTfKg?hl=en).
The original handscroll uses successive dry and wet brushwork to build
mountains, valleys and foliage. Closely inspect [Smarthistory's original
mountain-section detail](https://smarthistory.org/wp-content/uploads/2023/06/National-Palace_lrg-det-6.jpeg)
and [its side-by-side labeled *hemp fibre* / *alum-head* crop](https://smarthistory.org/wp-content/uploads/2023/10/National_Palace_brushstroke_labeled-copy.jpg)
([article, including attribution](https://smarthistory.org/huang-gongwang-dwelling-in-the-fuchun-mountains/)).
**Secondary institutional comparator:** [Wang Hui, *Dwelling in the Fuchun
Mountains, after Huang Gongwang*, Smithsonian NMAA](https://asia-archive.si.edu/object/F1950.19/),
which explicitly describes Wang Hui's smooth brushstrokes and carefully
placed dots. The latter is a later copy, *not* a photograph of Huang's original.

References above are links for study only; no image data, raster crops,
traced paths or third-party artwork are included in the renderer.
Reuse rights vary across museums; explicit asset clearance is a separate
process. This is a **style-guided construction**, not a claimed pixel
match to source.

### Real prior-render diagnostic

Reviewed real v12 native `shanshui-misty-hermit-125.png` and the
2.15× Storybook geological crop. The five high-value issues were:

1. Three distant bands read as stacked rounded **flat beige layers**.
2. Fractures existed as a few independent hairline scratches rather than
   a connected system of bedrock folds.
3. Rock wash was too dilute and often did not describe any volume on the
   ridges at normal 960×540 playback.
4. Most texture appeared as small isolated lines: no clear progression
   from core ink bone → secondary folding hemps → pale rubbed wash.
5. The sky/mountain/near-plane ink hierarchy did not establish convincing
   distance even though total branch and moss mark counts were high.

### Topological and material reconstruction

New `MountainRockShoulders` is a structural addition to the
*existing* `Mountains` component and existing five-card Shanshui
Storybook folder, not a scattering-noise shader.

- **Peak anchors:** sample local uphill extrema from the very same
  authored RIDGES silhouette arrays, then take each root's exact
  sampled `ridgeHeight(stations,x)`. The root is 2.5 paper units
  *below the actual crest*. All additional shapes are clipped to the
  current band's own ridge silhouette to prevent painting across sky.
- **Positive ink mass:** asymmetric four-side wet-loaded shoulder
  with a three-stop decaying brush wash, darkest at the root and
  released near the base. Same single geological fold as the
  attached bone curve; no random external shadow triangles.
- **Attached anatomy:** one broken fracture/bone curve and 3/5/7
  fine hemp fibre children from mathematically sampled local
  positions on that very curve (far/mid/near). No detached roots.
- **Value recession:** preserve far/mid/near parent band opacity
  and detail/ink/mist controls. An additional wash layer must
  *not* indiscriminately darken distant paper; far pigment load
  is explicitly 0.22–0, mid 0.43–0, near 0.62–0 within the
  underlying group opacity and atmospheric ink control.
- **Motion:** landscape geometry and ink remain absolute-frame
  stable. No new temporal randomness, external raster textures,
  new scene components or public slider types.

### Five ArtCraft inspection axes

| Axis | Required proof | Rejection test |
| --- | --- | --- |
| Topology | Each shoulder `root_y = crest_y + 2.5`; exactly one clipping contour and non-detached root per peak | Visible sky-crossing floating shadow wedge |
| Flow | Veins start on the source parent's quadratic ink-bone tangent, and vary in length/direction with the parent | Parallel evenly spaced rain scratches |
| Pressure | Broad wash decays from loaded root to exhausted tip; fractured middle spine and thin secondary line widths | Opaque dark triangles or smooth plastic gradients |
| Rhythm | Dark and bare paper spots alternate at different mountain depths and between clipped peak shoulders | All peaks become the same repeated stamp |
| Microtexture | Existing fibre filter plus mixed narrow/dry lines, moss on actual ledges and multiple wet/dry tonal channels | Increasing line count without credible rock surface |

**Current acceptance:** implementation candidate, not an artistic pass.
First re-run TypeScript and connected-root unit tests; then inspect the
actual 2.15× geology crop plus all three 960×540 full scene screenshots
and encoded 96-frame film. A green suite or increased dark-pixel count
does **not** authorize a merge. Record the after-render weakness and
change no more than three high-impact causes before another comparison.


## Fourteenth pass — refuse hard-rock SVG wedge material (native visual critique)

**Actual rendering studied:** [v13 technical-success Chromium and
96-frame MP4](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43729067826).
Inspected the real film-scale `misty-hermit` and `mountain-trail` frames
and existing 2.15× `皴法 · Geological texture` Storybook crop. The
source-derived crest attachments and hemp fibre vectors behave correctly
and TypeScript/27 Shanshui regression tests pass, but the previously
new wide wash surfaces retain visibly hard polygon-like edges. On
an unchanged 700×150 distant-range crop, fewer than 1% of pixels
changed by >10/255 versus the v12 film: the apparent depth improvement
is small. The last pass is **not** artist-approved.

**Correction:** retain the geometrically complete mountain bone and
all 3/5/7 ridge-attached child fibres, then pass only the broad
ink-water shoulder `path` through a single *per-band* paper response
filter. A small seeded fractal displacement of its existing SVG edge
(scale 2.1 paper pixels) followed by Gaussian absorption
(std deviation 0.72) softens the overly precise vector edge;
bone/child fracture marks are **not blurred or flattened**.
The wash has a more concentrated root with mid/near tonal weight
(0.58/0.78 at root before parent-group opacity) and a deliberately
depleted release (opacity zero at tip), preserving separate
distant haze and nearby rock darkness. The original negative
paper channels between peaks remain unpainted.

This is an observable wet-ink/paper-edge approximation, not a fluid
simulation, and it is not a substitute for correctly measured
rock contour shape. The larger source-to-render failure is still
geometric and compositional: the lower slope remains too smooth,
supporting stones too simplified, and terrain has too many
repeated curving sweep motifs. The final head **must** be re-rendered
and reviewed before applying any 'approved' status or merging.


## Fifteenth pass — alum-head shape anatomy, not more wash transparency

The [v14 native browser and encoded film evidence](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43729839428)
was directly reviewed at original 960×540 and 2.15× rock-crop scale.
The filter produced a soft watercolor shoulder but still changed fewer
than 1.2% of pixels in the geology crop by more than 6/255, while
the major mountains remained overly schematic. **Art failure
remains structural**; stronger blur and random texture would not fix it.

Compare the [labeled Huang Gongwang alum-head/hemp-fibre
crop](https://smarthistory.org/wp-content/uploads/2023/10/National_Palace_brushstroke_labeled-copy.jpg).
Its key motif is a small **rough cap over a darker recessed plane**,
attached to a larger geological root and surrounded by near-white paper
areas. The existing algorithm had ledge *lines* but almost no physical
outcrop thickness. Under ArtCraft structure-first rules, a new
`shelves` graph now grows **1/2/3 selective small uneven
rock faces** from the existing root-to-foot bone on far/middle/near
peaks, respectively. Every lip is a separately authored,
rounded/unequal convex+concave silhouette (two cubically smoothed
crest sections and two rear loading sections) rather than a
generic dark triangle or a random rock particle. Its root is on
the existing quadratic bone at t≈.24/.445/.65, and a dark material
fill has a narrow rim stroke at the same source coordinates.

This is a hypothesized *construction grammar*, not a traced museum
contour. Tests independently verify ledge count, attached root
coordinates, closed finite faces and individually painted rims.
The scene retains interstitial paper, existing distinct far/middle/near
band inks, unchanged animation and artistically necessary gaps.
Native re-render is mandatory to determine whether this meaningfully
improves volume without creating code-drawn generic pebbles.
Do not call it source parity or merge solely because the tests pass.


## Sixteenth pass — single high-value source-directed massif hero (2026-11-15)

Primary source: [Huang Gongwang, *Dwelling in the Fuchun Mountains* — an actual National Palace Museum painting detail](https://theme.npm.edu.tw/selection/Article.aspx?sNo=04000975), also discussed and illustrated by [Smarthistory](https://smarthistory.org/huang-gongwang-dwelling-in-the-fuchun-mountains/). The source shows nested rounded hill-backs, connected long hemp-fibre sweeps, dark absorbing pockets, contrasting near-white channels and irregular bundled brush motions, **not** parallel rows of cliffs. Reference crops were visually studied only; no third-party image bytes are copied into assets.

From the native previous 2.15x geology crop, the smooth stacked mountain masses lack a continuous, dark, **source-led hero rock face**. The current isolated alum caps and texture strands cannot substitute for this larger form. This pass therefore introduces **exactly one** composed cliff in the mountain's middle ridge band, attached to its highest existing peak. A sampled parent bone descends 116 film units, and four unequal brush-plane ribbons start at 0.08/0.25/0.43/0.62 of that *exact* curve. Their unequal bellies, oppositely bending headings, open-paper channels, split inner creases, eight attached subsidiary cracks and a source-attached recess make a single local mesh-like geometry instead of repetitive random markings. All forms are clipped by the current ridgeline. That crest is chosen from existing peaks, so different scene designs retain their authored landscape hierarchy.

**Adversarial controls:** (1) avoid four identical straight ribbons; (2) avoid detached decorative dark shapes; (3) don't stamp the hero cliff at every ridge; (4) leave the sky and the full sparse-detail terrain unpainted; (5) don't bury the structural fix under more random filter noise. All new paths have root and leaf/crease instrumentation. Real 960×540 film-scale and native 2.15x crop review are still mandatory before any quality claim. These proportions are authored source-guided original shapes, not a pixel match or a quantitative source contour reconstruction.


## Seventeenth pass — native image shows rock wedges; replace with true two-edge fibres

The [actual iteration-16 Chromium 2.15× geological crop](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43732964343) was inspected as an image, not just a test artifact. **The supposed "interlocking" rock mass failed the visual gate:** the four dark rock faces became conspicuous long, straight-sided spear/wedge shapes. They were more obvious than the source-like hemp-fibre network and visually dominated the original hill. The failure was caused by independently authored front and back Bézier curves of the same brush path, which diverged wildly from the desired loaded centreline at lower stations.

**Correction:** replace those four two-C wedge faces with true 14-station, smooth Catmull-derived *two-edge* ribbons: a shared quadratic centreline, normal offsets from its actual tangent, asymmetric ink-load weights, a root–belly–release pressure profile, and tiny material-edge variations. The width is deliberately only 48% of the previous load parameter (maximum total stroke width at the pressure belly ≈ 1.26×width parameter). Preserve the same source-rooted bone, four authentic branch attachments, eight secondary fibres, controlled recession and zero-detail behavior. Do **not** add arbitrary rock dots or new wash filters to conceal geometric failure.

The new tests require at least 22 smooth contour transitions per hero rock face. **A visual pass is not claimed.** Re-render native film and crop, then measure the difference at the exact same scene/seed/detail/viewport; reject if the corrected strokes remain recognizable as flat geometric blades rather than curved ink fibres.


## Eighteenth pass — ArtCraft v7, nested hill-back structural study

**Skill source used:** `artcraft` v7 from the locally available
`artcraft-v7.zip` package, together with
`art-reference-research`, `art-reference-structural-study`,
`art-material-study`, `art-fidelity-review` and
`art-mathematical-art-fidelity`. The source research, shape graph and
adversarial rejection criteria are recorded in the dedicated
`chinese-ink-fuchun-structural-study.json`.

**Observed source:** Huang Gongwang, *Dwelling in the Fuchun Mountains*
(National Palace Museum), [full institutional collection](https://digitalarchive.npm.gov.tw/Collection/Detail?dep=P&id=1194),
and [Smarthistory's mountain detail](https://smarthistory.org/wp-content/uploads/2023/06/National-Palace_lrg-det-6.jpeg).
The mountainous terrain does not resolve into loose vertical scratches:
it has consecutive curving hill-backs, intertwined dark cliff fracture
bands, and changing negative-space windows with clustered ink along
actual geological descenders.

**Construction:** the existing one-rock hero now gains exactly three
distinct linked *horizontal/rolling* structures at t=.13/.36/.59 on
the same crest-rooted descending parent spine, without replacing
the four descending pressure ribs. Their unequal local control
heights, long side spreads, opposite bending directions, 14-pressure-
station tapered contours, attached diagonal subsidiary fibres and
separately painted undersides are intentionally **macro/meso** detail,
not random marks. Parent-clipping and large nonpainted paper channels
are preserved; no new global scene geometry or API.

**Refusal:** This is a style-guided original reconstruction, not a
pixel-traced Huang Gongwang facsimile. No source-to-candidate
quantitative parity claim is made until a high-resolution source
crop and semantically aligned candidate mask have been independently
validated. The next actual browser 960×540 and 2.15× crop render
must be inspected before approving or merging anything.
