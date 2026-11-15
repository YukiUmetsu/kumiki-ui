# Coloured Pencil / Scientific Field Notes (CP1)

**Status:** Implementation candidate; technical checks and normal-speed artistic acceptance are separate. **Visual approval: pending.**  
**Roadmap:** [35](../35-material-native-film-styles-implementation-roadmap.md), "Colour-pencil science art" in [35A](../35a-material-native-style-reference-gallery.md). This user-requested experimental slice does **not** complete Phase 3 brush, Phase 4 watercolor, or Phase 7 calibrated sensor imaging.

## Creative direction

An original field-notebook plate: archival warm paper, graphite construction, successive directional colour-pencil passes, pressure-dependent pigment density, a visible paper tooth, fine contour and vein/facet detail, and sparse scientific labels with no fictional numbers. The film starts with a graphite sketch, physically adds thousands of clipped pencil marks, resolves its details, then holds still. Botanical leaf and mineral facet subjects are independently authored; neither is adapted from a reference-film frame.

Palette roles: archival ivory paper `#F8F2E6`, graphite `#4C5148`, leaf sage `#94A985`, forest `#5C7560`, mineral slate `#718AA0`, amethyst-gray `#9C899B`, muted ochre `#AA9160`. These are **demo colours only**. The public material accepts authored hexadecimal colours.

Reference principles—not copied art:

- [Reference gallery, coloured pencil](../35a-material-native-style-reference-gallery.md): stroke-direction geometry, original graphite contour, texture held during camera motion and cutaways. Gallery includes a comparison film and checkpoints 00:06/00:19/00:30/00:41; these are listed checkpoints, **not claimed playback inspections**.
- [Massachusetts Horticultural Society botanical art](https://www.masshort.org/botanical-art): botanical specimen, restrained annotations, veining and specimen-specific shading. Referenced as observational design, with **no reuse** of source images.
- [Crayola, Claudia Nice: coloured-pencil techniques](https://www.crayola.com/docs/default-source/default-document-library/colored-pencils-tips-techniques-by-claudia-nice.pdf): variable pressure, layering, point sharpness and textured paper. Technique principles only; no copied artwork or text.

## Surface contract

- `registry/video/colored-pencil.ts`: CP1 data types, strict bounded `inspectPencilDrawing`, deterministic seeded hatch geometry and `evaluatePencilMark(frame, timing)`.
- `registry/video/colored-pencil-react.tsx`: standalone SVG `PencilDrawing` with per-region geometric clips, rotated stroke passes, unique instance IDs, paper-space grain and pure frame addressing. `children` is an optional caption/annotation composition slot.
- `src/video/colored-pencil-science.tsx`: original sample artwork: one leaf with vascular traces and a secondary leaf, or differently angled crystal faces. Responsive separately authored type/reading regions in 960×540 and 540×960.
- `src/video/colored-pencil-film.ts` and `examples/film/colored-pencil-science.film.json`: identical three-shot, 353-frame, 30 fps FD1 film. Existing FilmStage owns cuts, frame pacing and formats; `src/film/film-slots.tsx` is only an art-slot adapter.
- `src/video/colored-pencil-science.stories.tsx`: interactive specimen, aspect, paper-tooth, paper-seed, reduced-motion, frame seek and playback; separate FD1 film sample.

### Visual invariants

1. Pencil shade is made of *independent marks clipped to local geometry*, not a photographic overlay; angle, pitch, load and colour are authored per region.
2. Pressure changes the width and optical density; directional layers intersect to build chroma; each line has its own temporal onset.
3. Paper tooth is seeded in paper coordinates and does not change across frames or after the hold. Revisiting a frame must reproduce it.
4. Invalid bounds, excessive mark density, unsupported colours and invalid time inputs fail explicitly; no fallback to generic cards.
5. Graphite contours and specimen details are never read as sensor values; no fabricated labels, species determinations or experimental data.
6. End state is available at `reducedMotion=true` regardless of frame. No instance owns a timer, global counter or asynchronous renderer.
7. Base UI packages do not gain any dependency, image download, font download or render clock.

## Verification and art-review gate

Automated: `npm run typecheck`, `npx vitest run --project unit tests/colored-pencil-science.test.tsx`, `npm run catalog:check`, `npm run registry:validate`. Browser: `npx playwright test -c playwright.storybook.config.ts tests/e2e-storybook/colored-pencil-science.spec.ts` and capture leaf/crystal at initial/deposition/completed frames for **both** formats. Export: `npm run film:check -- examples/film/colored-pencil-science.film.json`, then actual 16:9/9:16 `film:review` and normal-speed `film:render` with a bounded reference comparison.

**Art-review questions:** Are individual strokes clearly visible at full delivery size, or do they merge into a flat vector fill? Is graphite beneath rather than an overly strong digital outline? Do facet-specific directions and leaf venation read organically? Are the hero silhouette and all caption safe zones legible? Is 9:16 still intentionally composed? Do lines show shimmer, moiré, blown-out whites or flicker? Do notes appear only after supporting drawing? Examine at least 0, 34, 100, 180, 275 and 352, plus an out-of-order seek.

**Not accepted merely because tests pass:** human review of encoded horizontal and vertical playback, iterative pencil tooth tuning based on actual pixels, camera/zoom microtexture QA, high-resolution export and measured runtime. Do not mark this style visually approved until those are recorded.


## CP2/CP3 extension — form-aware pigments and character scenes (2026-11-14)

**Implementation:** candidate for testing; **human art acceptance remains pending**.

- `PencilPigmentLayer.flow` accepts an optional finite −60° to +60° form-following fan. It rotates each stable deposited row relative to the layer direction; values outside the range fail preflight.
- `PencilPigmentLayer.tone` accepts `even`, `core`, `rim`: optical density is distributed across rows before individual seeded pressure variation. Even remains backward compatible.
- `createPencilRegion` supports the same `flow` and `tone` as topic-neutral authoring options.
- `PencilAnnotationBase.transform` positions callouts/strokes in either screen or paper coordinates. The authored scene guides use the **same** placement as their illustrated objects.
- `PencilSceneSpec.actors` composes 1–6 original rigs without a new film timeline, subject to the shared **24 CP1 region** limit.
- `PencilActorSpec` is a hierarchy of authored pencil regions. `PencilActorPart.parent` names an earlier part; `pivot` and increasing `PencilPoseKey.frame` values drive translation, rotation and independent X/Y scaling. These cover blink/squash, head turn, wave, bird-wing movement and walk-cycle poses without manufacturing natural-history claims.
- `evaluatePencilPose` and `evaluatePencilActorRegions` evaluate **only the supplied absolute frame** (or the final authored pose for reduced motion); no internal timer or mutable animation state.
- Original neutral character example: `pencilCharacterScene(aspect)`. A portable 320-frame 30fps film exists at `examples/film/colored-pencil-character.film.json` and uses the `colored-pencil-character` FilmStage slot.
- Storybook stories are grouped under **Video Production/Film Looks/Colour-pencil**; illustrated worlds, independent character poses and the complete character film have actual playback and two aspect ratios.

**Targeted verification:** `tests/colored-pencil-science.test.tsx`, `tests/colored-pencil-scene.test.tsx`, `tests/colored-pencil-actor.test.tsx`, and their corresponding coloured-pencil Storybook browser suites. The focused GitHub workflow also checks both portable film files and exports proof frames.

**Not yet complete:** calibrated scientific diagrams, broad motion libraries, deformation-aware hair/feathers, anatomically realistic animals, page-turn/erase scenes, pixel-grounded professional art approval and clean package-install acceptance. Do not describe the new example rig as a mature universal character animation system.

## Wildlife ArtCraft follow-up — feather-tract microgeometry (2026-11-14)

The original twenty-part copperbird remains in `src/video/colored-pencil-wildlife.ts`.
Twelve explicitly positioned feather rachises now carry five paired curved barbs each;
all marks are joined to the rachis rather than distributed as floating pencil noise.
The near-wing, primary-feather and covert tracery inherits existing articulated
transforms and retains the 24-region CP1 / 20-part actor budgets. A small upper-eyelid
and lower-reflection pass adds iris depth without altering the existing blink contract.
Details are timed to resolve after pigment deposition; low-detail study mode suppresses
half of the graphite embellishments.

**Existing Storybook path remains unchanged:** Video Production / Film Looks /
Colour-pencil / Wildlife. Both established Wildlife stories remain in place;
the illustration story adds non-exportable Wing/Eye macro inspection at 2.5×/3.4×
for actual 16:9 and 9:16 vector detail checks. Browser proof captures both macros.
The FD1 film and native graphics API are unchanged; no new Storybook folder.

See [wildlife craft study](../research/colour-pencil-wildlife-craft-2026-11-14.md)
for the ArtCraft reference/attachment ledger. Automated topology and contract
checks can establish only technical invariants; the full ArtCraft five-axis
source-relative measurement and human normal-speed visual acceptance are **pending**.

## CP wildlife follow-up 2 — source-constrained contour feathers and clipping (2026-11-14)

- `PencilRegion.clipDetails?: boolean` and `PencilObjectInput.clipDetails?: boolean` opt in to clipping **only** interior traces to the region silhouette. The enclosing graphite contour and intended external construction marks remain visible when left at the default `false` behavior. The inspector rejects nonboolean input. No new engine, renderer, dependencies or film format.
- `src/video/colored-pencil-wildlife.ts` authors ten anatomical flow guides (32 copper breast, 8 throat, 26 mantle/flank, 18 crown and 10 cheek fibre-pairs). Unlike uniform screen-space texture, every pigmented shadow/tip pair uses a shared quadratic path. The light segment is a subcurve of its dark root, so static highlights remain physically attached during posed animation. All geometry and timing are paper-space, seeded and bounded.
- **Storybook stays in Video Production / Film Looks / Colour-pencil / Wildlife**, with no new folder: the established interactive Wildlife story adds a 3.1× breast-detail mode alongside the previously existing 2.5× wing and 3.4× eye. The FilmStage proof and both landscape/portrait JSON presets remain unchanged.
- Focused Vitest verifies silhouette clipping and backwards compatibility, the ten guide groups, paired geometry, single-frame deterministic composition, valid scene contracts and two-aspect identity. Existing opt-in browser QA now captures breast crops in both aspect ratios.
- Source study and known limitations are recorded in [the wildlife craftsmanship ledger](../research/colour-pencil-wildlife-craft-2026-11-14.md). **Not yet art-approved:** pixel-grounded ArtCraft five-axis measurements, full-size browser screenshot critique, complete normal-speed films and detailed toe/silhouette critique.

## CP wildlife follow-up 3 — articulated branch-grip illustration

The same twenty-part bird actor now has two original separately authored **opaque, curved perching feet**. Each foot remains one actor region with five connected/overlapping local subpaths (tarsus + four toes), two-tone pencil shading and four clipped scale/contact detail groups; its local transform fixes an ankle at the existing torso attachment. The shapes replace the old coarse Y fork rather than simply adding decorative lines. The foot keys remain motion-stable so head/wing acting does not cause contact sliding.

Storybook remains **Video Production / Film Looks / Colour-pencil / Wildlife** with a new 4.2× **Foot and perch contact** inspection option in the established interactive story. The browser suite captures macro frames for both 16:9 and 9:16; existing film, rigs, JSON and Storybook hierarchy are unchanged. [ArtCraft perching-foot critique and remaining QA](../research/colour-pencil-wildlife-craft-2026-11-14.md).

Unit tests prove topology/opacity and contact transform invariants only. **Actual browser close-up review, natural-history source comparison, final-resolution contact shadow, and human normal-speed artistic acceptance remain pending.**

## CP material extension — original object atlas (2026-11-14)

**Source of truth:** `registry/video/colored-pencil-materials.ts` provides the topic-neutral `createPencilMaterialRegion` helper. It accepts a valid **authored** SVG contour + local bounds, 3-pigment palette, semantic surface, stable seed, optional explicit direction/flow, details, transform and frame timing. A material recipe selects three independent physical pencil-mark passes, pigment density, core/rim value, support opacity, graphite and detail clipping. This does **not** auto-trace or semantically recognize an arbitrary photo, mesh or text request.

The eleven supported surface **mark recipes** are petal, leaf, citrus skin, transparent glass, polished metal, masonry, woven fabric, wood, stone, fur and cast shadow. Glass and cast shadow deliberately keep `opaqueSupport=false`, because background is meant to remain visible through them; every solid surface instead fills an opaque paper silhouette before its coloured-pencil marks arrive. Realistic reflection/refraction, anatomy, window apertures and part hierarchy remain the author's responsibility.

The authored original samples in `src/video/colored-pencil-object-studies.ts` are rose, citrus + glass still life, brick storefront façade and folded blue fabric + brass. Each composes semantic materials through the same public helper and supports both landscape/portrait native 960×540 / 540×960 drawings, frame seek, pressure and paper tooth. No downloaded artwork or dependencies are included.

The **existing** Storybook root `Video Production / Film Looks / Colour-pencil` adds a single *Objects · Rose, glass, masonry and fabric* story. All source and API files remain in existing registry/video and src/video folders; **no new Storybook folder**. Controls include subject, aspect, pressure, tooth, seed, absolute frame, speed, reduced-motion and authored checkpoint playback.

Reference/implementation matrix, licensing cautions and explicit pending ArtCraft numeric/visual gates: [Object materials study](../research/colour-pencil-objects-artcraft-study-2026-11-14.md). Verification: `tests/colored-pencil-materials.test.tsx` (all families, 4×2 aspects, transparent/solid separation, boundary inputs), `tests/e2e-storybook/colored-pencil-materials.spec.ts` (browser screenshot and reseek; local/manual proof). Full normal-speed export, source-relative crop fidelity and human artistic approval remain pending.



## CP living-subject ArtCraft extension — portraits, wildlife and scenery (2026-11-14)

The geometry-agnostic surface authoring API in registry/video/colored-pencil-materials.ts now supports **16 material recipes**. Added **skin** (pressure-controlled opaque hatch/stipple), **hair** (rooted fibre passes), **water** (directional liquid surface marks) and **foliage** (hierarchical needle/fibre marks with fine granules). The previous 11 recipes are unchanged. This is material syntax, not an image-to-object recognition engine.

The original authored sample in src/video/colored-pencil-living-studies.ts offers three separate subject constructions: a 22-plane head/shoulder portrait with named eye whites, irises, eyelid/brow, nose bridge, lips, skin planes, neck, hair/collar; a 21-part seated red fox with separate ear inserts, cheek ruff, eyes, muzzle, nose, legs, whiskers and tail; and a 17-region alpine valley with two mountain layers, six branching pines, stream, banks and stones. Authored curved fibre guides follow anatomical root→control→tip trajectories. Every frame is absolute, seed-based and stable under out-of-order seeking.

**Storybook:** the existing Video Production / Film Looks / Colour-pencil root adds one story named **ArtCraft · Portrait, fox and landscape**; no new storybook folder. Controls cover subject, aspect, pressure, grain, seed, speed, reduced motion and frame; Storybook-only close inspection does not affect production exports. Test source: tests/colored-pencil-living-studies.test.tsx, tests/colored-pencil-materials.test.tsx and optional tests/e2e-storybook/colored-pencil-living-studies.spec.ts. Original source-study board, limitations, anatomical anchors and ArtCraft acceptance gates: [living subjects research](../research/colour-pencil-living-artcraft-study-2026-11-14.md).

**Do not claim photorealism or arbitrary reconstruction:** actual full-resolution Chromium review, human face likeness, 3/4 rotation, articulated full bodies, frame-time profiling, source-relative five-axis metrics and normal-speed video proof remain open.


A follow-up ArtCraft review adds an opt-in **glaze** surface (sixteenth recipe) for non-occluding highlights over existing skin masses, correcting paper-coloured silhouette sticker artifacts. Near/far pupil subforms now add independently coloured dark centers and highlights. The fox contact shadow is drawn after opaque earth, and the dark nose after muzzle-rooted whisker base, correcting two compositing order defects.

## ArtCraft character replacement — original fox and kingfisher (2026-11-14)

The legacy cartoon fox and round blue bird in the former character scene, and the separate copper songbird in Wildlife, have been **removed**. Their old source import paths remain as forwards to the new scene so existing consumers do not break. Production still uses the existing CP1 render materials, CP3 relative-pivot rig, CP2 scene and FD1 film adapters.

- **Fox:** 12 original animal anatomical parts with a horizontal long-body silhouette, tall inset ears, ivory muzzle/ruff, dark planted limbs, independent black nose and warm eye. Locally rooted curved colour-pencil fur groups follow cheek, ear, shoulder, tail and undercoat; one forepaw lifts briefly rather than waving a human arm.
- **Kingfisher:** 11 original parts with blue/teal back, orange cheek/breast, dark tapered beak, clear pupil, near/far articulated wings and branch-gripping toes. Reused from one actor factory by the Character Performance, Character Film and Wildlife Storybooks. Wildlife adds two extra crown/wing fibre groups and an original four-region branch/leaf composition. All actor and solid scenery parts retain opaque support.
- **Storybook:** existing Film Looks / Colour-pencil and Film Looks / Colour-pencil / Wildlife entries only; no new folder. The previous old-character examples are no longer available. Control selectors, portrait/landscape support and frame scrub remain, while copy and macro coordinates refer to the new animals.
- **Film:** existing 320-frame, 420-frame, 30fps/dual-aspect portable FD1 timings unchanged; humanlike walking/waving metadata replaced with honest fox-paw/wing descriptions.
- **QA:** tests/colored-pencil-actor.test.tsx and tests/colored-pencil-wildlife.test.tsx enforce named structural region inventory, opacity, attached details, eye squeeze, head/wing/foot transform invariants, budget (1 + 12 + 11 = 24), deterministic out-of-order seek, and source/film equality. Local-only Storybook screenshot suite captures animated macro crops.

References, bounds/pivots, region adjacency graph, negative controls and candid ArtCraft acceptance status: [character rebuild craft ledger](../research/colour-pencil-character-rebuild-artcraft-2026-11-14.md). **Independent full-resolution and normal-speed review remains pending.**
