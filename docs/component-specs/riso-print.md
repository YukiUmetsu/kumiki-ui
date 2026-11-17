# Risograph spot-ink printing (RISO1)

**Registry item:** `riso-print`  
**Source:** `registry/video/print-plates.ts`, `print-plates-react.tsx`, `riso-sheet-feed.tsx`, `riso-overprint.tsx`  
**Storybook:** **Video production → Film Looks → Risograph**, with four original print stories: **Two-Ink Printing**, **3-Shot Film Stage**, **Paper Feed Transition**, and **Native Overprint Transition**. The existing character, rigging, ArtCraft, and construction-sheet demos share this same sidebar folder.

## Purpose

An artwork-native Risograph material, **not** another film-stock grade or a full-frame RGB halftone filter. Authors supply separate SVG artwork per spot-ink plate. The renderer prints each plate independently onto a single paper surface, with a distinct halftone screen, order-dependent multiply-like overprint, fixed misregistration, seeded paper fiber/pores and a plate-print reveal.

This is useful for graphic editorial explainers, limited-palette teaching scenes, print posters and semantic reveals. It is **not** automatic CMYK separation of photographs, a calibrated printing simulation, or source-quality color proofing.

## API

Install `riso-print`. `RisoPrint` props:

- `spec: RisoPrintSpec`: version 1, sheet `width`/`height`/`paper`, `seed`, `startFrame`, `passFrames`, `gapFrames`, and 2–3 independent plates.
- Each plate: stable `id`, ink `color`, `opacity`, `dotCell`, `dotAngle` and signed 2D `registration`.
- `artworks: Record<plateId, (paint: RisoPaint) => ReactNode>`: original SVG drawing for each plate. `paint.solid` is its ink; `paint.dots` is its independent screen fill.
- `frame: number`: an absolute nonnegative integer film frame; seeking is stateless and deterministic.
- `misregistration?: number` and `paperGrain?: number`: bounded seed-stable adjustments; grain never flickers with frame.
- `reducedMotion?: boolean`: skip all ink-print animation and display the completed print.
- `label?` and standard SVG HTML props (`className`, `style`, `aria-hidden`, etc.)

`inspectRisoPrint` reports actionable, path-specific errors for invalid sheets, timing, colors, plate counts, IDs, registration, dot screens and opacity. The renderer throws for missing authored artwork instead of silently substituting generic cards.

`evaluateRisoPrint(spec, frame)` resolves independent print progress on the same absolute clock, including nonsequential seek and reduced motion. `overprintColor` provides a CPU reference sample for multiplicative color mixing; real browser compositing uses SVG `mix-blend-mode: multiply` and the plate's opacity.

## Storybook artwork and production film

The demo is an original editorial poster, **THE HIDDEN CURRENT**, drawn as two separate SVG spot-ink layers in `src/video/riso-print-demo.tsx` with true landscape and portrait compositions. The previously overlapping **RISO / 02** stamp is larger and isolated below the subtitle. `RISO_STAMP` and `RISO_TEXT_ZONES` declare measured safe regions for both ratios; unit tests check their intersections with rotation considered.

The interactive story lets viewers scrub the printing timeline, play/replay, isolate blue/red plates, choose 16:9 or 9:16, change registration, paper grain and seed, and enable reduced motion.

A separate story in **the Risograph folder** compiles a 13-second three-scene FD1 film through `compileFilm` and `FilmStage`. It uses FilmStage's existing `renderSlot` callback to pass the scene's frame to `RisoPrint`—there is no independent film renderer or duplicate animation clock. The authored film is in `src/video/riso-print-film.ts`.

A third story in the same Risograph folder uses **`RisoSheetFeed`**, a paper-feed bridge between **THE HIDDEN CURRENT** and the independently drawn **FOLLOW THE FLOW**. Both incoming spot-ink plates are printed in sequence as the new sheet arrives, without adding a second timeline or a Film Document transition kind. The five-shot film is `RISO_SHEET_FEED_FILM` in `src/video/riso-print-film.ts`.

The production `film:render` path now resolves these three print slots in `src/film/film-slots.tsx`. A portable film file lives at `examples/film/riso-paper-feed.film.json`:

```bash
npm run film:check -- examples/film/riso-paper-feed.film.json
npm run film:render -- examples/film/riso-paper-feed.film.json
```

These commands are the intended production workflow; successful MP4 export is not implied by compilation or Storybook tests alone.

## Evidence and limitations

- Source and tests: `tests/print-plates.test.ts`, `tests/riso-print-demo.test.tsx`, `tests/riso-sheet-feed.test.tsx`, and the actual-browser `tests/e2e-storybook/riso-film-looks.spec.ts`.
- Physical technique reference: [Risograph demo film / stills](../35a-material-native-style-reference-gallery.md) and its independent printing-process sources.
- No external video, source artwork, images, fonts or sound are bundled. No added production dependencies.
- **Verified in captured Chromium stills:** both aspects and all ink passes render; the RISO / 02 text fits inside its border without collision in either layout. Printed sheets and transitional frames were inspected from captured browser PNGs. The browser test tolerates no more than 2/255 per color channel across at most 0.01% of pixels, based on measured 1–2-level Chromium SVG subpixel rounding seen after nonsequential seeks.
- **Still to qualify:** a passing final browser run, clean consumer install, actual normal-speed encoded film playback/export, and independent final release approval. Screenshots and code tests do not imply video-level visual acceptance.
- Future material extensions: auto-separation from supplied imagery, measured ink absorption, richer paper physics and physically calibrated ink mixing. The current sheet-feed bridge is authored as an existing FilmStage slot, not a universal FD1 transition kind.

## Native incoming-ink overprint transition (Phase 2)

`RisoOverprintTransition` provides the second native print handoff after sheet-feed. The incoming artwork's **selected spot-ink plate** is overprinted on the outgoing completed sheet through an authored expanding SVG ink motif. Its transparent, ink-only plate multiplies against the outgoing colored ink (rather than drawing the incoming artwork as an opaque RGB image). The next paper/artwork then resolves through a **second expanding, authored ink-contour knockout**, not alpha cross-fading: one sheet owns each pixel, avoiding ghosted letters and gray paper. The authored motif is only the *ink contact area*, not a generic wipe of the entire scene. The physical metaphor remains illustrative, not press-calibrated.

- `outgoing` / `incoming`: `RisoSheet` with matching resolution and paper hex, separate authored per-plate SVG artwork functions.
- `imprintPlateId`: ID of exactly one declared incoming ink plate. `imprintArtwork` is a required text-free SVG impression for the selected plate, separate from the complete incoming artwork. This prevents double-printed captions and stamp marks during ink contact.
- `imprintPath`: SVG path in local coordinates, with `imprintOrigin: [x,y]` in sheet design pixels and `imprintScale: 1..12`. Original illustrations may supply distinct motifs for separate aspect ratios.
- `frame`, `startFrame`, `durationFrames`: absolute, integer FilmStage local-frame contract; supply `durationFrames = sceneDuration - 1` so the last sampled scene frame reaches the exact incoming end state.
- `misregistration`, `paperGrain`: both in 0..1, fixed for every sample. `reducedMotion` returns the completed incoming print.
- `evaluateRisoOverprint`: pure frame-state evaluation; `inkOpacity`, `stamp`, `paperReveal` are deterministic and have exact 0/1 endpoints.
- `RisoPrint` adds `transparentPaper` and `visiblePlateIds` for ink-only overprinting. Unknown plate IDs raise errors.

The fixture `examples/film/riso-native-overprint.film.json` runs through **the same existing five-shot FilmStage/Film Document** flow and resolves `riso-overprint` via `src/film/film-slots.tsx`; it introduces no new timeline, filter preset or FD1 transition type. The source-artwork example, `RISO_OVERPRINT_FILM`, and original imprint motif live in `src/video/riso-print-film.ts`. Storybook: **Video production → Film Looks → Risograph → Risograph · Native Overprint Transition** with frame seeking, aspect, grain, registration and reduced motion.

```bash
npm run film:check -- examples/film/riso-native-overprint.film.json
npm run film:frame -- examples/film/riso-native-overprint.film.json --frame=480 --only=landscape --out=dist/riso-overprint-proof
npm run film:render -- examples/film/riso-native-overprint.film.json --only=landscape --out=dist/riso-overprint-proof
```

### Verification status and quality gate

The initial implementation includes `tests/riso-overprint.test.tsx` for frame/seek parity, 16:9 and 9:16 component/film compilation, transparent spot-ink separation, bad input diagnostics and the production FilmStage loader. Successful source-level unit tests alone do not certify **browser rendering**, a consumer registry install, a finished 16:9/9:16 MP4, or artistic quality. These remain `not-reviewed` until actual Chromium captures, normal-speed full-video review and explicit human acceptance are recorded. There is no bundled reference media, mascot or copyrighted imagery.

The relevant process-reference board is [35A](../35a-material-native-style-reference-gallery.md) (Risograph). Compare *ink order, fixed registration, overprint color, paper handling, caption legibility and continuity*, not the story or artwork of a third-party reference. A true ink absorption simulation, nonlinear spectral pigment mixing and automated photographic separation are out of scope.

**Next roadmap slice:** Phase 3's authored stroke geometry and dry-brush splintering; Phase 2's separate nonessential registration-kick, density and full browser/art validation tasks remain open.

## RISO23 — source-resolution-aware screen pitch

The native `PrintPlate.dotCell` and `createRisoScreenGeometry({cell})` minimum is now **2** instead of **3** design units (maximum remains **36**). This is a backward-compatible expansion needed by fine anatomically authored facial halftone at film/output stage resolution; previously a 6-unit pitch across a ~70-unit face turned intended print volume into large disconnected freckles. It does **not** change the default for any existing film scene or add RGB postprocessing.

For RISO23 the Storybook production-native two-portrait crop starts at `dotCell: 2` per plate; the interactive screen-pitch slider can compare 2..6 with genuine separate spot masters and independent registration. Values below 2, non-finite cells and values above 36 are still rejected. Verify on an actual rendered output at intended resolution because at low output scale dots may visually merge or alias.


## RISO26 — source-authored graduated stencil values on one spot plate

[Full ArtCraft reference and Chromium gate](../research/riso26-tonal-master-artcraft.md)

`RisoPaint` now optionally provides `lightDots` and `midDots` alongside existing `solid` and `dots`. The renderer produces the two additional *physical* screen patterns with the **same existing ink color, dot pitch, press angle, plate seed, plate registration and frame-independent paper space**. Only deposited dot area varies: light `screenDensity × .22`, mid `screenDensity × .55`, normal the original global `screenDensity`. AM varies circle radius; FM varies deterministic stable ranked dot occupancy. The original global screen density, ink gain and 2..36 screen-cell slider remain supported.

A character source part may set `screenTone:"light"|"mid"` only when `paint:"screen"`; this is validated before animation. `RisoCharacterInk` binds that region to the matching actual stencil pattern. Direct/legacy `RisoCharacterInk` with only `RisoPaint.dots` remains supported and safely uses it as fallback. **Do not use CSS opacity, translucent stickers or post-processed RGB highlights as substitute dot values.** Unspecified parts and all solid foreground artwork retain their original physical print appearance.

Original Courier/Paper Artist cheeks, orbital sockets, temples and jaw shadows have **distinct authored local tonal masters** while their original face/eye/lip geometry, rig, color palette and film frames are unchanged. The existing Risograph `OcularPrintCraft` story contains a reversible `RISO26 tonal master comparison` using the unchanged prior facial stencils as baseline; AM/FM, red-only/blue-only, pose, 16:9/9:16, physical pitch and gain all remain interactive.

Technical checks: `tests/riso26-tonal-press-artcraft.test.tsx` and actual `tests/e2e-storybook/riso21-ocular-print-artcraft.spec.ts`. This is a **digital-print simulation**, not empirical calibration of a Riso drum or independent human-likeness certification.


## RISO61 — continuous spot-ink dot gradients (original non-character scene)

Native helper files: registry/video/riso-gradient-ink.ts and registry/video/riso-gradient-ink-react.tsx. Installed by the same riso-print registry item, together with the preexisting required riso-screening.ts that the print renderer imports.

- createRisoGradientGeometry: pure generator with user-defined coverage stops (2..12; first 0, last 1), horizontal/vertical/radial spatial profiles, bounded AM lattice angle (per plate), 2..36 unit screen cell, optional 0..1 ink gain, irregularity and 0..0.2 low-coverage dropout. The generated dot sites, paper seed, per-plate offsets and sizes are source-space values. A maximum 40,000 candidate grid sites protects the renderer; split larger 4K fields into distinct bounded regions.
- risoGradientCoverage: inspect arbitrary profile values without a screenshot.
- risoGradientDotPath: combine every dot as two native elliptical SVG arcs, preserving exact small-radius physical detail without thousands of standalone DOM elements.
- RisoGradientInk: drop the component directly inside the existing RisoPrint artworks.blue / artworks.red callback, pass the matching paint.solid as color, plus its paper-space coordinate box and optionally a valid SVG shape contour. It clips to the source shape without reducing the contour's topological detail. All original background paper fiber, ink tooth, press order and full-frame clocks remain RisoPrint-owned.

The same Storybook folder now includes **Continuous Spot-Ink Gradient**: entirely original two-plate tidal contours in landscape/portrait, separate ink masters, absolute animation seek, independently adjustable registration, source tone direction, pickup and dropout. No anatomy changes or bundled external visual assets. Strict unit tests and native Chromium evidence are in tests/riso61-ink-gradient-artcraft.test.tsx and tests/e2e-storybook/riso61-ink-gradient.spec.ts. Read docs/research/riso61-variable-tone-gradient-artcraft.md for authentic printing references, exact topology, art gate and limitations. RISO61 is not a calibrated physical Riso press profile; do not claim print-color fidelity without a real test press.


## RISO62 — calligraphic dry-brush physical-stencil ink

The riso-print item also installs `riso-dry-brush.ts` and `riso-dry-brush-react.tsx`. `createRisoBrushGeometry` constructs a variable-pressure ribbon from an original 4-point cubic with 2–12 width stops, each source direction following the cubic's local tangents. `risoBrushInkPath` exposes the original closed SVG ribbon plus separate paper-white dry splinter channels; use `fillRule="evenodd"`. `RisoDryBrushInk` places it inside one existing `RisoPrint` spot-master artwork callback and uses the matching `paint.solid` color. No extra master, opacity-based brush, raster asset, screen filter or parallel clock.

Interactive Storybook: **Dry-Brush Ink Atelier**, same Risograph sidebar, non-human two-plate poster with physical registration, both separations, 16:9/9:16, an original 240-frame source gesture, pressure width, dried fibres and paper stock; strict pure unit, native Playwright and clean registry consumer tests. Reference provenance, topology, rights and limited/non-calibrated press fidelity: [RISO62 research](../research/riso62-dry-brush-artcraft.md). Any physical edition still requires press proof and normal-speed visual review.


## RISO63 — the original dry-brush artwork in production FilmStage

The reusable `RisoBrushArt` has an explicit `layout="film"` mode, which preserves the original 20 original-source stroke shapes, true evenodd paper channels and all other separate spot masters while filling the entire native film output. It remains the exact same drawing used by the existing **Dry-Brush Ink Atelier**, with no rasterized copies. Production `renderRisoBrushFilmSlot` connects this to `loadFilmSlots` as the `riso-dry-brush` recipe slot. The same render function is used by **Risograph → Dry-Brush Production Film** in Storybook.

The portable [10-second, 24fps Film Document](../../examples/film/riso-dry-brush-native.film.json) renders 240 frames to both 960×540 and 540×960. A clean CI job checks the doc, inspects exact source path/time parity and preview plate isolation, captures real Chromium Storybook views and invokes `npm run film:render` to produce actual MP4 files. See [source provenance, technical quality gates, commands and limits](../research/riso63-native-film-artcraft.md). Finished video is silent, no real press calibration is claimed, and no RISO60 human-hand study was changed.


## RISO64 — real source-native press / camera cinematic shots

The `RisoBrushArt.printFrame` optional prop defaults to **239**, preserving fully printed RISO62/63 visual/registry consumers. RISO64 composes the exact original source with the existing RisoPrint master-reveal clock and a separate deterministic paper-space camera matrix, evaluated from the FilmStage local scene frame. No new ink renderer or registry dependency.

`RISO_CINEMATIC_BEATS` defines five original 24fps shots: `cobalt-macro` (48f), `cobalt-pullback` (52f), `vermilion-pass` (74f), `overprint-macro` (48f), `original-hold` (66f). The final 288-frame / 12-second film prints to 960×540 and 540×960. `evaluateRisoCinematic` and `risoCinematicCamera` are pure, independently testable functions; `renderRisoCinematicFilmSlot` is shared by the native production FilmStage and the Storybook **Two-Drum Cinematic Journey**. Source strokes, paper-open fibre paths, 2 spot masters, text and registration remain unchanged.

`examples/film/riso-cinematic-two-plate.film.json` is the portable film. See [RISO64 research and source-deconstruction, guardrails, cinema shot list and actual video proof commands](../research/riso64-cinematic-press-artcraft.md). Reduced motion resolves to a stationary fully printed sheet. No video sound or physical Riso calibration is implied.

## RISO65 — original master registration displacement preflight (experimental)

RISO65 adds a reusable numerical `evaluateRisoRegistration` preflight in `registry/video/riso-registration-preflight.ts` for two/three plate RISO1 specs. It reports actual deterministic per-master transforms, all pairwise second-minus-first displacement vectors, magnitude and excess above a user-declared design allowance. Registration is a **paper-space plate transform**, not a deformation of original ink geometry. Source-native RISO62/63/64 remain byte-equivalent at default register.

Storybook **Risograph · Registration Preflight** provides original vs offset native ink panels, two aspect ratios, individual spot master isolation, source-frame seeking, paper tooth, register x/y and shared 1×/3× optical inspection. It never claims physical press colorimetry or true stencil trapping: budget numbers cannot certify adjacency, paper seam absence or real press repeatability. Source and release criteria: [RISO65 research](../research/riso65-registration-preflight-artcraft.md).

## RISO66 — opt-in native shared-edge trapping

Source-native, explicit edge-only geometry: `createRisoContactTrap(base,neighbor,{side,maximumGap,maximumExtension,overlap,minimumRun})` in `registry/video/riso-contact-trap.ts`. Only sustained near-parallel, opposite-facing physically adjacent outer edge segments qualify. The selected source outer path grows under a bounded locally eased ink extension. Every original dry-fibre cutout and paper pore, pressure stop, centerline, opposite edge and ink registration remain unchanged.

The `riso-print` registry item includes this module for consumer access. Full interactive source, two master isolation and original vs trapped A/B visual evidence live in the **Risograph · Native Shared-Edge Trapping** Storybook study. See [RISO66 source research and release caveats](../research/riso66-native-contact-trap-artcraft.md). Not a generic path Boolean/trapping solution or printer-approved output; printed register must be proven physically.

## RISO67 — source-native stencil topology safety (opt-in)

`auditRisoTrapTopology(original,candidate,flatness=.35)` inspects actual Q-curve SVG boundaries with bounded adaptive sampling. It measures newly introduced nonadjacent perimeter contacts, outer border–paper-hole cuts, newly outside holes, missing contours, and orientation flips. Existing baseline weaknesses remain visible in `inheritedDefects`; `noNewDefects` is a **differential** condition, not certification of zero holes or accurate real press alignment.

`createGuardedRisoContactTrap(base,neighbor,options,flatness)` wraps RISO66 and returns `accepted`, `reason`, `topology`, and `proposed`. If a candidate introduces modeled damage, it returns the untouched original `base` geometry for ink rendering, preserving every original pressure stop and source dry-brush paper opening. The existing non-guarded API is unchanged. For interactive full-sheet, 3× macro and rejection-proof review use Storybook **Risograph · Native Stencil Topology Guard**. Full source and limitations: [RISO67 ArtCraft](../research/riso67-stencil-topology-artcraft.md).


## RISO68 — grayscale press master SVG and print-shop setup

Independent physical master export is opt-in through the pure TypeScript registry module registry/video/riso-separation-master.ts. inspectRisoSeparation(spec,plates,layout) checks two or three declared ink-master files, exact original positive and paper-open winding paths, sheet vs trim aspect, physical bleed and printable area, critical-detail safe inset and optional crop/registration marks. All layout dimensions are in millimeters. The returned ready and issues values gate export.

serializeRisoSeparationMaster(spec,plates,layout,plateId) emits a standalone K-only vector SVG for one physical drum with original source paths, evenodd true unprinted dry holes, white sheet and physically aligned optional black print marks. Digital colored preview opacity, RGB compositing, paper filters and intentional registration shift are never baked into an independent production master. Grayscale coverage comes only from the individual source shape's density (1 is K100, .5 is K50). The ink ID and intended color are encoded in its filename.

See Storybook **Risograph · Native Grayscale Master Separation** and the [RISO68 original ArtCraft prepress research](../research/riso68-grayscale-print-separation-artcraft.md). The A4 layout is a declared demonstration profile, not a universal printer spec. SVG file delivery is not equivalent to a print-shop-approved PDF/TIFF, or proof of actual physical drum registration.
