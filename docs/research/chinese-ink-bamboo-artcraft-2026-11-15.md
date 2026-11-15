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
five-leaf star. The seven-level cluster budget `[0, 3, 8, 1, 10, 2, 10]`
gives **102** brush leaves across three culms: deliberate bare nodes,
small transitional pairs, and loaded dark masses toward the crown.
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
