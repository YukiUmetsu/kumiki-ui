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

All Paper Craft demonstrations are organized under **Video production / Film Looks / Paper Craft**. There are eight pages, one per distinct subject group, not one per palette, medium, orientation, rig or revision:

| Storybook page | Source artwork | Controls that change the actual geometry/material |
| --- | --- | --- |
| Garden | Original mixed paper-craft garden | Five paper media, aspect, frame/timeline, tooth, edge, shadow, seed, reduced motion |
| Botanical & Butterfly | Paper flowers, foliage, butterflies | Four stock palettes, color-layer density, detail, five media, aspect, frame and material controls |
| Scenery | Original woodland and alpine-lake shadowboxes | Scenery preset, sage/ember/moonlight stock, leaf/rock/snow detail, breeze, five media, aspect and playback |
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


## Pass 20 — reusable scenic paper-cut theatre

Original reference-led **landscape dioramas** are implemented by the installable `paper-scenery-kit.ts` alongside the existing PAPER1 renderer. Two authored scenes are available: `woodland` (forest canopy, lit horizon, winding stream, fine-cut ferns) and `alpine-lake` (separate peaks, snow caps, glacial lake, conifers, terraced rock and reflections). They use real opaque paper cutouts and separate depth layers, with a die-cut front frame and true apertures rather than semitransparent stacked scene images.

```tsx
import { paperScenerySpec } from "./components/video/paper-scenery-kit";
import { PaperCraftStage } from "./components/video/paper-craft-react";

const spec = paperScenerySpec("layered", "landscape", {
  scenery:"woodland",palette:"sage",detail:1,breeze:.45,seed:37,
});
<PaperCraftStage spec={spec} frame={216} shadowStrength={1} edgeStrength={.75}/>;
```

Public options: `scenery` = `woodland | alpine-lake`; `palette` = `sage | ember | moonlight`; `detail` and `breeze` are finite 0–1; `seed` is a safe integer. Palette changes affect complete opaque stock colors; detail adjusts individual cut geometry. Breezes use bounded, deterministic absolute-frame `flutter` swings (never random frame noise). A portrait version is composed with a taller die-cut opening and **preserves local geometry scale**. Scenes remain bounded at 128 cardstock layers and support all five paper media.

The **single Scenery page** in `Video production / Film Looks / Paper Craft` exposes scene, palette, detail, breeze, medium, aspect, frame, light/shadow, tooth and reduced-motion controls. It does not create separate pages per landscape, material, palette or aspect.

Native FilmStage supports `artwork:"scenery"` with `scenery`, `sceneryPalette`, `detail`, `breeze`, `seed` and `medium` in the existing `paper-craft-study` slot. A complete two-scene dual-aspect film is `examples/film/paper-craft-scenery.film.json`. The research and honest limitations are recorded at `docs/research/paper-craft-scenery-artcraft-study.md`.

This is premium-intent **2.5D illustrative paper theatre**, not a photogrammetric 3D world, laser cutter-ready contour plan, or validated reproduction of another artist's work. Rendered browser and video evidence must be reviewed before artistic quality sign-off.

## Pass 21 — architectural botanical cutwork and scenic relief

The **same Scenery story** has deeper hand-made morphology in both presets, with **no new Storybook folder**. The woodland now includes full scalloped canopy-card silhouettes with real punched leaf-shaped negative space, attached crown ribs, irregular grouped understory stems, and longer naturally fanning fern leaflets. The alpine scene features a continuous **visible lake**, narrow die-cut shore, physical islet and reeds, mountain-specific folded cardstock shelves, and uneven foreground wildflowers rather than generic texture overlays.

\`paperScenerySpec(style,aspect,{scenery,palette,detail,breeze,relief,seed})\` adds \`relief\` (finite 0–1, default 1). It scales actual integer layer separation, shadow offset and lightbox parallax without changing closed geometry, color or opacity. A value of \`0\` is a flat but still fully opaque stacked paper illustration; \`1\` is maximum existing depth. Storybook exposes the **Relief** slider alongside scene, palette, detail, breeze, medium, orientation and frame; FilmStage accepts the same control on \`paper-craft-study\`. Values outside 0–1 throw \`RangeError\`.

Physical shape budgets remain within the existing 128 independent cardstock layers even with detail=1. The paper's microdetail is **contour-authored** inside groups, not repeated raster stickers. Tests enforce punched canopy apertures, island/reed geometry, no fully hidden lake, both outputs, all media, deterministic frame evaluation, relief geometry invariance and no ghost layers.

Example: \`paperScenerySpec("lightbox","portrait",{scenery:"alpine-lake",palette:"moonlight",detail:1,breeze:.25,relief:.9,seed:37})\`.


## Pass 22 — mixed conifer species and naturally varied foliage

The Scenery generator now constructs *spruce, fir and larch* as separately authored tree grammars instead of resizing a generic pine. Each tree is a connected, closed cutout with whorl-specific shape, left/right asymmetry, distinctive needle gaps, species-specific taper and seeded stature. The alpine and woodland tree stands have less uniform spacing, stature and leaf/fern contours.

API: paperScenerySpec(style, aspect, { scenery, palette, detail, breeze, relief, treeVariety, seed }).

treeVariety must be finite between 0 and 1 (default 0.9). Zero gives a consistent spruce stand; one mixes three species with stronger placement variation. This changes actual cardstock path geometry, not opacity or texture noise. Only the existing Scenery page exposes this control; unrelated Paper Craft pages hide it. The FilmStage paper-craft-study slot passes it through for both 16:9 and 9:16 outputs.

The original PAPER1 128-layer cap, all five media, scene identifiers, and deterministic seek contract remain unchanged.


## Pass 23 — sculpted foreground vegetation and flowers

The same Scenery Storybook page now renders broadleaf understory plants with sculpted closed cardstock serrations, continuous rooted stems, lateral forks and a raised opaque vein plane; woodland adds eight and alpine adds six high-detail herb sheets. Flowers gain seed-specific asymmetrical petals and physical contrasting centers. These details are formed from code-authored contours, not noise or translucent collage overlays. The scene generator's existing detail control governs actual cut density, and seed governs repeatable plant morphology.

No new public property, Storybook folder, renderer or film slot. The native two-aspect film, five PAPER1 material styles, existing options and 128-layer budget remain supported. New unit/browser checks cover geometry complexity, physical layering, palette opacity and deterministic frame seeking.


## Pass 24 — actual arched tree stock and canopy filigree

The existing Video production / Film Looks / Paper Craft → Scenery story includes two new middle-distance arched trees in the woodland preset. Their real closed paper contours form a continuous root/trunk, 5–8 attached main boughs, further secondary forks and leaf tips; a darker underlayer casts offset stock depth. Material layering is shadow sheet (depth 16), wood body (depth 18), lighter terminal leaf stock (depth 19). Existing foreground trunks have several short bark-score cuts instead of one straight full-height stripe.

The existing Detail slider controls 5–18 true punched upper-canopy openings, under the 32-hole per-layer contract. No new user-facing controls, Storybook folder, film slot, dependency or renderer. All existing seed, five media, lightbox, physical relief, landscape/portrait export and 128-sheet safety rules remain in force. New unit/browser tests verify actual cut geometry, shadow-stock hierarchy, stable IDs, fully opaque cardstock and deterministic absolute-frame rendering.


## Pass 25 — native woodland leafwork with structural branch tiers

The existing Video production / Film Looks / Paper Craft / Scenery story uses multilevel cut-paper canopies rather than radial leaf spokes. canopyBranchLace constructs 5–9 parent branches per side, and each has 2–3 connected twig forks with asymmetric paired leaves. nestedLeafCrown constructs 3–5 leaders for each existing foreground bough and adds 2–3 connected twig junctions with real terminal leaves. Each network is authored as grouped opaque cut paper SVG geometry; no floating stickers or alpha effects.

No new API, external asset, story folder, renderer or dependency. Existing detail scales real cut density; seed is frame-invariant; breeze retains coherent whole-stock hinge motion. All five media, palette/aspect controls, native FilmStage scene presets and the global 128-layer limit are preserved. Updated unit and Playwright checks assert topology density, unchanged stock count and repeatability.


## Pass 26 — Alpine Lake die-cut ridge reconstruction

The existing **Video production / Film Looks / Paper Craft / Scenery** page now uses an original connected knife-cut mountain silhouette instead of smooth convex domes. Each peak has a seeded but fixed asymmetric sequence of shoulders, ledges and sharp crest breaks. Its fitted snow stock shares summit and shoulder stations with the rock beneath rather than floating as a generic triangular sticker. Two actual cut-through snow apertures per summit reveal the underlying rock, with deliberate bridges between the openings and the outer snow edge. A companion raised cardstock sheet carries two facing folded rock planes per peak.

The public `paperScenerySpec` contract is unchanged. All six Alpine combinations (two aspects × three palettes) retain deterministic absolute-frame motion, opaque cut paper, two valid punched holes per snowcap, and the 128-layer budget. No additional Storybook page, package, raster reference or animation technique was introduced. The shape-led ArtCraft review remains conditional on actual browser screenshots and native film frames, rather than path-count tests alone.

## PAPER-D1 — reusable shot-based paper film framework (ArtCraft v7)

The installable `paper-craft` registry pack now also exports `registry/video/paper-director.ts` and `paper-director-react.tsx`. This is a **composer over the existing PAPER1 physical renderer**, not a sixth material style. Authors can provide arbitrary original closed SVG cutouts, true holes, stock depth and pivots; position/angle keys and a shallow overhead camera animate these assets with absolute-frame determinism. A sequence contains 1–24 shots, two independently authored aspects, consistent fps/shot timing, and a hard editorial cut at each boundary. Subject drawing quality remains the author's responsibility.

```tsx
import { paperCut, compilePaperDirector } from "./components/video/paper-director";
import { PaperDirectorStage } from "./components/video/paper-director-react";
import type { PaperDirectorFilm } from "./components/video/paper-director";

const makeScene=(width:number,height:number) => ({
  version:1 as const, id:"paper-card-"+width,style:"layered" as const,
  width,height,fps:30,durationFrames:90,seed:12,
  backing:"#142F37",light:"#FAE9C8",
  layers:[{
    id:"paper-disc",color:"#F6DEB0",depth:8,
    path:paperCut.ellipse(width/2,height/2,45,45),
    holes:[paperCut.ellipse(width/2,height/2,12,12)],
    motion:"still" as const,enterFrame:0,durationFrames:1,
    poseKeys:[
      {frame:0,x:-55,y:0,angle:0,ease:"smooth" as const},
      {frame:44,x:0,y:0,angle:0,ease:"hold" as const},
      {frame:89,x:0,y:0,angle:22},
    ],
  }],
  cameraKeys:[{frame:0,x:0,y:0,zoom:1},{frame:89,x:0,y:0,zoom:1.05}],
});
const film:PaperDirectorFilm={
  version:1,id:"original-cut-paper",
  shots:[{id:"opening",scenes:{
    landscape:makeScene(960,540),
    portrait:makeScene(540,960),
  }}],
};
const plan=compilePaperDirector(film);
// <PaperDirectorStage film={film} aspect="landscape" frame={42}/>
```

The Stage takes the **absolute full-film frame** and resolves shot-local frames; frame seeking is stable when played backwards or jumped arbitrarily. Internally FD1 `paper-craft-director` accepts `content.props.storyboard` containing the `PaperDirectorFilm` JSON object, or app-level `preset:"four-chapters"` with `medium`, `motion` and `seed` controls. FD1 retains captions, audio, aspect outputs and rendering. See [example 32s, dual-format film](../../examples/film/paper-craft-director.film.json).

Storybook: **Video production → Film Looks → Paper Craft → Film Director · Four Chapters**. It provides chapter buttons, full-length frame scrubbing, play/pause, all five physical media, aspect, camera/prop motion intensity, seed, tooth, shadows and edges. Existing Paper Craft pages and IDs remain unchanged, and there is no new sidebar folder.

ArtCraft source, construction table, rights and non-goals: [PAPER-D1 film study](../research/paper-director-artcraft-film-study.md) and [structured reference ledger](../research/paper-director-artcraft-reference-study.json). Native FilmStage proof of all four subjects/ratios and a cross-cut encoded clip is required before merging. Passing technical tests does not imply finished character art or true engineered folds.

### PAPER-D1 assembled-set entries

Use `PaperCraftSpec.startAssembled: true` when a hard film edit must reveal an entire constructed paper set immediately. This **does not** disable the cut-piece pose keys, flutter hinges, texture, shadows or overhead camera tracks. The default is false, preserving the existing progressive cut-paper assembly demos. PAPER-D1's four sample chapters opt in.

An actual first-run 30-frame film crossing global f239→240 exposed a completely empty purple incoming stage, followed by an isolated paper ellipse. This is a production blocker even though the film encoded and browser tests passed. New tests enforce all paper layers at progress=1 and opacity=1 at the first chapter frame in **both** output aspects. Re-inspect native final-head evidence before release.

## PAPER-D2 — Connected puppet joints and material-native curtain edits

**Rigging:** any `PaperCutLayer` may name an existing `parentId` with an explicit `pivot: [x,y]`. Coordinates are defined in the shared authored **rest-sheet** space, not local bounding-box pixels. The parent sheet’s full rigid transform is composed with each child’s local pose and its existing `motion` (swing, flutter, rise); all sheets still paint in the original global `depth` order. This preserves physical overlap of fabric/wing feathers. Parent links are validated for existence, unique stable IDs, explicit child pivot and cycles. Bounds/keys stay frame-pure. The engine exports `paperAffinePoint` and `paperAffineMultiply` for verifying actual pin landmarks in tests.

```ts
const layers = [
  {
    id:"body",path:"M80 60 L180 60 L170 130 L70 130 Z",
    color:"#EBD7A9",depth:12,pivot:[120,90] as const,motion:"still" as const,
    poseKeys:[{frame:0,x:0,y:0,angle:-8},
      {frame:30,x:28,y:-4,angle:8}],
  },
  {
    id:"front-arm",parentId:"body",pivot:[164,80] as const,
    path:"M156 76 L188 88 L208 140 L183 135 Z",
    color:"#C68765",depth:14,motion:"swing" as const,
    swingDegrees:12,
  },
];
```

Use separate real artwork and hidden joint overlaps for expressive actors. This parent-child system is **rigid hinged cut stock**, not skinning, IK, human anatomy or automatically generated high-quality puppets. A nested puppet’s root needs its own cut contour and rest-sheet pivot. Parent transforms use continuous affine matrices; no duplicated body track is needed on every child. The botanical moth in the existing four-chapter demo now has one moving `moth-abdomen` parent; all remaining moth wings, antennae and accents inherit it.

**Physical edit:** each `PaperDirectorShot` optionally sets `transitionOut: {kind:"paper-curtain",durationFrames:24,color:"#E8CEAA",direction:"left-to-right"}`. Frames are even, 8–60, with half closing on the outgoing scene and half uncovering the incoming scene. This is a true full-opacity moving cardstock sheet with a nonuniform die-cut edge and sheet-anchored tooth, **not two composited translucent drawings**. Alternate directions and palettes are supported. The final shot cannot transition out; overlapping beat windows, color and duration errors fail validation. With reduced motion the curtain is skipped so no static full-coverage blank image remains.

Sample film `examples/film/paper-craft-director.film.json` enables paper curtains by default. In Storybook **Film Director · Four Chapters**, `curtains` toggles them without moving the page to a new folder. FD1's preset accepts `curtains:boolean` (default true); a custom author-provided `storyboard` embeds each shot's transition settings directly. Its existing clock/labels/audio remain untouched. Material details stay with the underlying PAPER1 renderer.

**ArtCraft:** [rig and curtain source/structure study](../research/paper-puppet-curtain-artcraft-study.md). Reference previews were linked rather than redistributed: source image rights and reliable frame-accurate video examples were not established. Qualitative construction, not claim of pixel-match fidelity.

## PAPER-D3 — hinged printed page as a film transition

An authored director shot can select `transitionOut:{kind:"paper-page-turn",durationFrames:24,color:"#E8CEAA",direction:"right-to-left"}`. This is a **real two-sided paper leaf with artwork on its front**, rotating about a fixed book gutter in browser 3D. During the outgoing 12-frame half it carries the previous paper scene (including all its real holes and materials) while revealing the already constructed *next* scene underneath. During the incoming half its reverse stock finishes the turn. The previous scene remains available across the edit even though the primary shot ID has switched. No illustrated content is blended with alpha.

`PaperDirectorFrame.pageTurn` exposes outgoing/incoming specs and local frame numbers for deterministic external renderers. It is distinct from `curtain` (which stays backward-compatible). Validation rejects unknown kinds, invalid material colors/directions, odd/out-of-range frame counts, missing final shot destinations and too-short incoming windows.

The FD1 slot `paper-craft-director` adds `transitionStyle:"page-turn"|"curtain"` for its four-chapter preset; existing documents default to curtain. An authored `storyboard` uses the per-shot `kind` directly and needs no separate setting. [Portable page-turn film example](../../examples/film/paper-craft-page-turn.film.json). The existing Storybook **Film Director · Four Chapters** page adds `pageTurn` and frame-range controls without introducing a new folder or changing existing studies.

During a page turn, assistive technology receives one illustration: the outgoing shot before the edit and the incoming shot after it. The consumer's label and `aria-hidden` setting continue to apply throughout the transition.

This is a **rigid leaf with one spine**, not a V-fold engine or dynamic bending-paper finite-element solver. The artist-authored next scene must be preassembled for a seamless edit. ArtCraft research/limitations: [PAPER-D3 physical page study](../research/paper-page-turn-artcraft-study.md).

### Sheet-specific cut-edge intensity

`PaperCutLayer.edgeIntensity?: number` scales the authored sheet's existing dark cut line and illuminated edge (finite 0–1; omitted defaults to 1). The stage's `edgeStrength` still controls the global highlight; the sheet multiplier applies in addition to it. At zero, that sheet has neither the base cut line nor the highlight, while its opaque fill, holes, fibre, shadow, geometry and animation remain unchanged. Other sheets retain their own edges; an independently rendered `liftedTip` keeps its own tip edge. This is a rendering control, not a thickness or contact simulation; split semantic pieces into separate sheets when they need different treatments. The existing Garden Storybook page exposes **Wing cut edge** for comparison.

### Sheet-specific paper fibre

`PaperCutLayer.fibreScale?: number` sets the relative size of the seeded, sheet-anchored fibre pattern (finite 0.25–2; default 1), and `fibreIntensity?: number` multiplies that sheet's tooth opacity (finite 0–1; default 1). The stage's `tooth` remains the global control. Different sheets may use different values without changing geometry, fill or other sheets. The existing Garden page exposes wing controls; royal face/neck stock uses smaller, lighter marks as an experimental visual treatment. The repeated horizontal fibre approximation is not a calibrated paper scan, physical microstructure, or an artistic approval.
