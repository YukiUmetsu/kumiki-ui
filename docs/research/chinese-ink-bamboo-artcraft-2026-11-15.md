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
