# PAPER1 — Paper Craft Theatre

**Status:** Art-directed, deterministic **2.5D prototype**. This is not a physically engineered V-fold or machine-ready cut pattern.

- Core `registry/video/paper-craft.ts`; renderer `registry/video/paper-craft-react.tsx`.
- Installable registry item `paper-craft` depends only on React.
- Original fixtures: `src/video/paper-craft-demo.ts` and `examples/film/paper-craft-garden.film.json`.
- Seven interactive pages live together in **Video production → Film Looks → Paper Craft**: Garden, Botanical & Butterfly, Kingfisher, Dragonfly, Canal Houses, Camera, Teacup & Citrus.

```tsx
import { PaperCraftStage } from "./components/video/paper-craft-react";
import type { PaperCraftSpec } from "./components/video/paper-craft";
const spec: PaperCraftSpec = {
  version:1, id:"cut-paper", style:"layered", width:960, height:540,
  fps:30, durationFrames:240, seed:4, backing:"#efe4d7", light:"#fff2d8",
  layers:[{id:"ridge",depth:3,color:"#5f7b74",
    path:"M0 380 Q300 180 570 360 L960 400 V540 H0 Z",
    motion:"rise",pivot:[480,400],enterFrame:12,durationFrames:42}]
};
<PaperCraftStage spec={spec} frame={120} tooth={0.5}
  shadowStrength={0.7} edgeStrength={0.6} />;
```

**Cut geometry:** 1–128 separate opaque layers, 0–32 depth, each a bounded, closed SVG contour with optional true even-odd cut-out `holes`. Use anchored pivot sheet coordinates for swing/unfold/rise. Invalid/malformed runtime input fails validation. **Frame time:** absolute nonnegative integer, repeatable seed, no local timers, reduced motion resolves to static assembled artwork and disables parallax. **Material controls:** `tooth`, `shadowStrength`, `edgeStrength` all clamped 0–1; paper colors are six-digit opaque hex.

**Film integration:** existing `paper-craft-study` slot accepts `medium` (layered, kirigami, pop-up, lightbox, shadow-puppet) and nonnegative integer `offsetFrame`; match portrait/landscape from output size. Custom films can pass their own `PaperCraftSpec` directly to the React stage.

**Material honesty:** edge catchlights, genuine geometric apertures, independent cut stock and deterministic contact shadows differ from a flat-paper video filter. But axis-specific physical folds, hinging constraints/tabs, translucent tissue optics, advanced actor rigs and user/ArtCraft visual approval are not yet implemented. Follow the [visual review log](../35b-paper-craft-theatre-visual-pass-log.md).

## Storybook navigation and controls

All Paper Craft demonstrations are organized under **Video production / Film Looks / Paper Craft**. There are seven pages, one per distinct subject, not one per palette, medium, orientation, rig or revision:

| Storybook page | Source artwork | Controls that change the actual geometry/material |
| --- | --- | --- |
| Garden | Original mixed paper-craft garden | Five paper media, aspect, frame/timeline, tooth, edge, shadow, seed, reduced motion |
| Botanical & Butterfly | Paper flowers, foliage, butterflies | Four stock palettes, color-layer density, detail, five media, aspect, frame and material controls |
| Kingfisher | Sculpted paper bird | Jewel/pastel/heritage stock, real feather detail, raised-tip relief, curvature, wing motion, five media, aspect and playback |
| Dragonfly | Wing lace and abdomen | Stock, venation detail, flutter amplitude, curvature, media, aspect and playback |
| Canal Houses | Facades and canals | Stock, architecture detail, paper folds, media, aspect and playback |
| Camera | Layered camera | Stock, lens/finish detail, curvature, media, aspect and playback |
| Teacup & Citrus | Paper table still life | Stock, citrus detail, napkin folds, media, aspect and playback |

Storybook rendering uses a single `PaperCraftLab` component and one source file (`src/video/paper-craft.stories.tsx`). Subject identity is fixed per page; unused Storybook controls are hidden for Garden and Botanical. The retained gallery buttons switch all five media without changing page. The landscape/portrait and material variations remain accessible as Storybook controls and through Storybook URL `args`.

`tests/e2e-storybook/paper-craft.spec.ts` and `paper-craft-objects.spec.ts` now exercise these variants on the consolidated pages, including 16:9, 9:16, material combinations, frame seeking, opacity and real cut geometry. This reorganizes Storybook navigation only; native FilmStage, exported object IDs and existing registry APIs remain unchanged.

## Character construction

For editable wildlife cutwork, construct a visually complete static animal before animating its parts. The garden bird now uses local coordinates multiplied by one uniform `birdScale` for horizontal and portrait outputs. The branch continues into the bird's perch and talons; anatomical regions include the head-body outline, breast/throat, pierced eye, crest, beak, wing with true feather apertures, coverts, tail feathers and feet. Depth order separates real paper stock. The moving wing's pivot stays at its shoulder. This illustrates a character-specific fixture rather than a generic anatomy solver.


## Native botanical sculpture generator

The installable paper-craft registry pack includes components/video/paper-botanical-kit.ts. This is a separate, original high-detail paper sculpture scene with sculpted flowers, lace-cut fern veins, pierced moth wings, layered stock, seed sprays and an engineered-looking shadowbox frame. No third-party source artwork is embedded.

Usage example:

    import { paperBotanicalSpec } from "./components/video/paper-botanical-kit";
    const spec = paperBotanicalSpec("layered", "landscape",
      { palette:"nocturne", detail:1, seed:37 });
    <PaperCraftStage spec={spec} frame={190} shadowStrength={.95}
      tooth={.6} edgeStrength={.7} />;

Choose palette = "ivory" for monochrome sculptural paper or "nocturne" for midnight colored cardstock. Detail 0–1 changes the amount of actual leaf and petal geometry. The scene has a bounded maximum of 128 separately drawn sheets, stable seed-derived imperfections, and a real portrait layout without nonuniformly stretching wings or petals.

FilmStage's existing paper-craft-study slot accepts artwork="botanical", palette, detail and seed alongside medium. Production film: examples/film/paper-craft-botanical.film.json. The single **Botanical & Butterfly** Storybook page exposes all four palette choices and both aspect ratios through controls.

See docs/research/paper-craft-artcraft-botanical-study.md for observed references, the source-to-geometry plan and artistic limitations.

### Chromatic cut-paper relief

Two new saturated paper-stock sets, **rainforest** and **wildflower**, complement the existing nocturne and ivory stock families. A new optional 0–1 `colorLayers` option controls the **quantity of real cut shapes**, not CSS opacity or a color grade.

```tsx
const spec = paperBotanicalSpec("layered", "landscape",
  { palette: "rainforest", detail: 1, colorLayers: 1, seed: 37 });
```

At full density, the generator adds more than 30 differently colored independent cardstock plates, including a concentric pressed-paper ring, accent leaflets attached to existing fronds, extended 13-petal outer crowns, nested flower hearts and stamen beads, satellite-bloom underlayers, and actual paper wing linings visible through apertures. Rendering remains bounded at `MAX_PAPER_LAYERS=128` and frames stay deterministic. Different palettes use indexed stock colors across individual blooms, not a uniform global hue change. `colorLayers=0` retains the simpler original silhouette.

Use the **Video production / Film Looks / Paper Craft / Botanical & Butterfly** page to compare color sets and adjust `colorLayers`, `detail`, `tooth`, `edge`, `shadow`, `seed`, paper medium and aspect ratio. Previously separate botanical and chromatic variants are selected through controls, without duplicate pages. The native dual-output, three-scene film is `examples/film/paper-craft-chromatic.film.json`.

These are expressive cinema cutouts; they are **not** manufacturer-ready laser/cutter paths, real physical pleating or calibrated 3D foam-board spacing.

## Reusable object sculptures

The installable Paper Craft registry includes a second reusable generator, `registry/video/paper-object-kit.ts`, for five ORIGINAL subjects, developed from actual cut-paper references rather than copying image geometry.

- **Kingfisher:** individual feathers, orange/blue anatomical body plates, crest, pierced eye and long folded beak, tail and gripping toes on a continuous branch
- **Dragonfly:** four separate window-punched wings, paper vein filigree, 12 segmented abdomen plates, compound eyes, legs and grounded flowering reeds
- **Canal houses:** three differentiated pastel facades, layered gables, pierced windows with joinery/crossbars, roof oculi, arched doors, continuous street, fences, canal and lamp
- **Camera:** separate cardboard slabs, rolled-look seven-ring lens with physical openings, viewfinder, dials, stitched seams and punched paper strap
- **Teacup and citrus:** physically hollow handle and cup rim, raised paper botanical decal, folded napkin, saucer, spoon and segmented citrus slice

```tsx
import { paperObjectSpec } from "./components/video/paper-object-kit";
import { PaperCraftStage } from "./components/video/paper-craft-react";
const spec = paperObjectSpec("layered", "landscape",
  { object: "kingfisher", palette: "jewel", detail: 1, seed: 37 });
<PaperCraftStage spec={spec} frame={195} shadowStrength={.9}
  tooth={.55} edgeStrength={.6} />;
```

Controls: `object` = kingfisher | dragonfly | canal-houses | camera | teacup; `palette` = jewel | pastel | heritage; `detail` = 0–1; `seed` integer. All cut pieces are bounded opaque cardstock; depth is integer 0–32. The entire original material scene stays within 128 paper layers. The exact same geometry is composed in 16:9 and 9:16 without distorting object proportions, and supports arbitrary absolute-frame seeking and reduced-motion presentation.

Use `artwork:"object"`, `object`, and `objectPalette` on the existing `paper-craft-study` FilmStage slot. See `examples/film/paper-craft-objects.film.json` (five cuts and dual output formats). The five objects have one configurable Storybook page each in **Video production / Film Looks / Paper Craft**, with no duplicate portrait, animation or material variants. For each object, adjust paper medium, stock, detail, motion, curl, relief, aspect, frame and lighting controls in its own page. For original reference links, design audits and remaining work, read `docs/research/paper-craft-objects-study.md`.

This produces cinematographic 2.5D cardstock illustrations, **not** physically folded and dimensionally manufactured 3D objects, die templates or articulated skeleton rigs.

## Sculptural curled-stock lighting and coordinated subject rigs

The paper-object library adds an **authored curvature cue** to individual `PaperCutLayer` records (`curl?: number`, 0–1) and a renderer intensity `curlStrength?: number` (0–1). The renderer builds fixed, **fully opaque five-stop paper-pigment gradients** for only the pieces that request curvature. Separate feather, wing, roof, strap, cup and fruit layers retain their real apertures, cut path and material depth. This is a paper-bending *lighting approximation* rather than a true 3D ribbon or cloth simulation. `curlStrength=0` disables the gradient and restores solid stock.

For moving subjects, `PaperMotion` now supports `flutter`, with `rigGroup`, `flapHz` (0.1–8 Hz), `flapPhase` (0–360°), shared `pivot`, and signed `swingDegrees` (±30°). Every paper layer in a named rig must share **exactly the same pivot, frequency, phase and amplitude** or `inspectPaperCraft` rejects it. Flutter is calculated exclusively from absolute film frames; it does not drift as layers enter at different times or when Storybook scrubs backward. Mild x-axis foreshortening approximates rotating cardstock in 2.5D. In reduced motion, the completed artwork is completely still across any frame seek.

The kingfisher's coverts, large wing and all individual attached feathers now share one slow wing rig. The dragonfly's left/right fore/hind wing membranes, perforated lace and paper veins share four distinct wing rigs, with phase offset between fore and hind pairs. Cardstock curl values are applied to specific independently cut sheets (not raster filters or global overlays).

```tsx
const spec = paperObjectSpec("layered", "landscape", {
  object:"dragonfly",palette:"jewel",detail:1,
  curl:1,   // 0–1 physical-stock curvature lighting
  motion:1, // 0–1 oscillation amplitude; 0 freezes the authored rig
  seed:37,
});
<PaperCraftStage spec={spec} frame={198} curlStrength={1}
  shadowStrength={.92} edgeStrength={.68} />;
```

`artwork:"object"` FilmStage props `curl` and `motion` accept finite 0–1 numbers and reject untrusted malformed values. Storybook exposes `curl`/`motion` alongside other controls on the single Kingfisher and Dragonfly pages; their motion-specific looks no longer need separate stories. The five-scene portable `examples/film/paper-craft-objects.film.json` renders at both 16:9 and 9:16, with frame-exact dynamics. No 3D fold rig, extrusion, material thickness solver or die-ready cut templates are claimed.

## Pass 17 — real separate hinged terminal cardstock

`PaperCutLayer.liftedTip?: PaperLiftedTip` is a separate closed die-cut shape (not a filter or texture), with sheet-space `hinge`, `rotateDegrees` (±25°) and `lift` (0–18 px). The parent and terminal surfaces share the same rigid motion rig, yet the distal stock receives its own projected rotation, fully opaque underside color and contact shadow. Unlike the older gradient-only `curl` hint, this moves actual visible geometry outside the base mask.

```tsx
const spec=paperObjectSpec("layered","landscape",{
  object:"kingfisher",detail:1,curl:1,motion:.45,relief:1,seed:37
});
<PaperCraftStage spec={spec} frame={198} liftStrength={1}
  shadowStrength={.95} edgeStrength={.75}/>;
```

Eighteen individually shaped primary feather bases and tips use distinct contours and joined authored hinges; the same primitive adds eave lip folds to three houses and a corner fold to the teacup's napkin. `relief` (0–1) is validated in object generation and FilmStage. The Kingfisher page exposes `relief` and a portrait aspect control; previously separate landscape/portrait relief examples are consolidated. The design stays under the 128-layer budget because the distal piece belongs to its parent cut. Source study and candid limitations: `docs/research/paper-craft-lifted-tip-study.md`.

This is hinge-projecting 2.5D paper construction, **not** a continuous elastic 3D curved sheet or cutter-ready pattern.

## Pass 18: anatomically credible sculpted paper kingfisher

The original kingfisher has been rebuilt after comparing real *Alcedo atthis* side profiles against handmade layered paper kingfishers. The previous circular head, oversized white stomach, very long tail strands, wire-like wing feathers and human-like legs were anatomically weak. The new construction has a **compact joined body and head**, layered chestnut breast and tiny cream belly inset, discrete white throat and orange cheek, reduced tapered bill, red gripping toes, short tail, and overlapping blue-green wing plumage.

A full rebuild of `kingfisher(...)` in `paper-object-kit.ts` keeps the public object/rig API, 18 lifted primary-tip pieces, 10 crown strips, 12 breast scales, seeded absolute-frame motion and both aspect modes. The shape now adds twelve packed multi-contour layers for fine covert, back, crown and breast feather tracts—many dozens of small true paper cuts without exceeding PAPER1's 128-layer budget. All paper colors remain fully opaque, and the wing still uses one shared hinge. The 9:16 portrait uses uniform scales.

The **Kingfisher** page in **Video production / Film Looks / Paper Craft** combines the anatomy study and portrait variant through its aspect and material controls.

This is artistic reference-guided code generation, not a copy of Diana Beltrán Herrera's sculpture, and not a 3D bird scan or physics model.


## Pass 19 — hand-snipped feather vane edges

The kingfisher's 18 primary feathers now carry a detail-responsive, true die-cut vane-edge microstructure, based on observing individually hand-trimmed feather sheets in Diana Beltrán Herrera's paper birds. Each feather retains a smooth Bézier root, the same separately hinged raised tip, underlying shaft aperture, and shared wing rig. At full detail, each closed root contour has five shallow asymmetric V-snips per side following the taper of the paper vane. These are cuts in the cardstock silhouette, not painted strokes, alpha effects, translucency or procedural noise.

The detail control varies true incision count from zero to five per side. Fixed seeded grain subtly varies notches across different feathers without adding frame-dependent randomness. Landscape and portrait are uniformly scaled; the bounded cardstock-layer count and the palette-independent silhouettes are unchanged.

The fine vane cutwork is available on the **Kingfisher** page in the Paper Craft Storybook folder at `detail=1`; it does not require a separate page. Focused construction tests check edge geometry at minimum and maximum detail, physical tip/hinge continuity, rig identity, deterministic frames and paper validation. The existing PR-scoped visual workflow captures real Storybook and native film images.

**Limit:** This is original 2.5D reference-guided cut-paper illustration, not manufacturing geometry or a reconstruction of another artist's protected sculpture. Browser-capture review and independent artistic inspection are still needed before asserting visual parity.
