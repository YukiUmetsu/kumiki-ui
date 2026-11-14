# Chinese ink wash — craft and generalized film-direction guide

**Reviewed:** 2026-11-14  
**Roadmap:** [35 — Material-native film styles](35-material-native-film-styles-implementation-roadmap.md)  
**Implementation:** \`ink-wash-core\` (no WebGL) + optional \`ink-wash-film\` (FilmDocument adapter).

## 1. Reference study and evidence limits

Reference material was used to study *technique and motion*, not to copy scenes, drawings, camera shots, copyrighted footage, or text. Pages, supplied descriptions/timecodes and accessible study imagery were inspected; do not claim that each hosted streaming video was watched in full at normal speed. The actual Kumiki MP4 requires separate playback QA.

| Real-world source | Technique / footage worth studying | Generalized design decision |
|---|---|---|
| [Asian Art Museum: Chinese brush-painting techniques](https://education.aamstage.org/resources/an-introduction-to-chinese-brushpainting-techniques/) | Upright versus oblique brush, fast versus slow motion, loaded tip, dry flying-white | Expose brush orientation, \`tipInk\`, \`drag\`, pressure/width and varying opacity *inside* the stroke; never treat it as a postprocess |
| [Asian Art Museum: brushstrokes, paper and size](https://education.asianart.org/wp-content/uploads/sites/6/2019/09/Brushstrokes.pdf) | Wet unsized versus more controlled sized paper; brushwork as a shape-making language | Style presets have distinct paper absorption; no identically blurred brush preset |
| [Oriental Art Supply: ink loading/shades demonstration](https://www.youtube.com/watch?v=WWAS9JHKWPU) | Tonal loading and dilution while a mark is deposited | Five tones and cross-brush tip loading; wash has lower core opacity, dark accents hold structure |
| [BlueHeronArts: Yao Jurong painting a landscape](https://www.youtube.com/watch?v=VTsQ83IlkEU) | Mountain mass, water, foreground detail painted in a deliberate sequence | Defer intricate dark accents until the broad diluted landscape is established; allow quiet holds |
| [Basic rock and mountain painting: Gou / Cun / Ran / Dian](https://www.youtube.com/watch?v=REFx8Vi1Te8) | Outline, rock texture, wash, structural dots | Separate \`axe-cut\`, \`hemp-fiber\` and \`moss-dot\` local rock marks |
| [Jingxi Huangcaoliang: axe-cut landscape](https://www.youtube.com/watch?v=dNcPi7TK-n8) | Broad side-brush structural rock gestures and depth staging | Angle-specific rock texture, different spatial density and treatment by distance |
| [Inkston: bamboo in the Mustard Seed Garden tradition](https://www.inkston.com/stories/mustard-seed-garden/4gentlemen-bamboo/) | Leaf grouping and five shades | Avoid repeated X/star leaf silhouettes; varied branch length, overlap, density, orientation |
| [Christie's: Zhang Daqian's lotus demonstration](https://www.christies.com/en/stories/capturing-light-and-shadow-moving-images-of-zhang-7b44c0edfeb1469b8f6909402451324c) | Large wet gestures and purposeful material application | Favor a finite set of confident strokes, not thousands of animated particle dots |
| [National Palace Museum: Traveling Through Brush and Ink](https://www.taiwanplus.com/shows/documentary/arts/368/traveling-through-brush-and-ink) | Camera travels through painting and negative space | Handscroll camera motion and layer parallax independent from paint deposition |
| [The Herd Boy's Flute: ink animation cinematography study](https://doi.org/10.1080/17508061.2026.2749963) | Painted layers moving under an animation camera and sustained washes | Use fixed painted layers + camera/characters rather than re-simulating a whole raster every frame |

**Licensing:** The linked demonstrations are references, not reusable assets. The in-repo mountain photograph used for the generic proof is an existing licensed asset; see the repository's third-party asset manifest.

## 2. Material direction: what must be true

Chinese ink painting is not monochrome film grading. An authentic stylized shot has *a source of marks*, local tonal contrast and paper behavior.

- **Upright brush (中鋒 / 中锋):** balanced tapered contour, strong tip, distinct pressure at the beginning and the release.
- **Oblique/side brush (側鋒 / 侧锋):** uneven broad contact and dark pigment on one side, lighter toward the other; helpful for slopes, leaves and expressive rocks.
- **Flying white (飛白 / 飞白):** coherent bristle-direction gaps when dragged quickly with little moisture. Scattered point noise alone is not this technique.
- **Moist wash:** pale, broad color; the capillary fringe spreads into absorbent paper while a stronger local core remains identifiable. Avoid a uniform gaussian blur applied to a finished illustration.
- **Rock construction:** outline → axe cut or hemp fiber texture → diluted wash → structural dark dots. The four methods occupy different *regions and layers*, not a flat all-over surface texture.
- **Bamboo:** joints and leaves obey the branch and gravity; strong asymmetry, reserved air and changes in tone across front/back branches.
- **Negative space (留白):** white is a subject: mist, water, sky, passage between hills, reading room. Do not fill it with algorithmic noise.
- **Cinnabar seal:** a sparse ending accent. Do not turn every slide into multiple decorative red labels.

## 3. Installable capabilities

### \`ink-wash-core\`: just the paint medium

Files: \`registry/video/ink-wash.ts\`, \`ink-wash-react.tsx\`, \`ink-wash-marks.ts\`.  
Use it with any original centerline array; rendered SVG is stable at an absolute frame. \`InkWashSpec\` accepts zero strokes when the shot only needs paper. Its ink marks can cover distant mountains, botanicals, diagrams, maps, physical strokes or freehand visual annotations. \`makeInkRockTexture\` adds authored-region axe-cut/hemp/moss structures.

### \`ink-wash-film\`: compose arbitrary video layers

Files: \`registry/video/ink-wash-story.ts\`, \`ink-wash-story-react.tsx\`.  
Depends on \`ink-wash-core\` and the repository's existing \`film-document\` registry entry.

The host creates a data-only \`InkFilmPlan\` containing multiple \`InkShot\` entries. \`createInkFilmDocument(plan)\` compiles the shots to existing FilmDocument \`slot\` scenes. Use \`InkWashScene\` from the slot callback. The host provides each scene layer's content through \`renderLayer\`: JSX containing **video, image, 2D diagrams, labels, actor rigs or 3D canvases**. No images are created automatically by this package.

The same layer supports:
- **brush reveal**: a material sweep with paper-space irregularity and explicit direction
- **ink bloom**: irregular spreading originating at a chosen normalized subject position
- **instant/held**: finished mark, text or film content without an animation
- **editable tonal look**: original media color or opt-in monochrome treatment
- **handscroll camera**: frame-keyed x/y/zoom and per-layer parallax, with protected static captions
- **reduced motion**: reveal the resolved composition directly

This is a medium-aware composition tool, not a claim that generic video is converted into genuine brush painting. Make the *hero subjects* as separately authored brush art/rigs; use external media as purposeful inserts or source material.

## 4. Recipes for different genres

| Video need | Suggested composition | Native material action |
|---|---|---|
| Landscape or travel documentary | An authored ink mountain frame + optionally licensed landscape footage | Pale wash, rock texture, slow handscroll, a restrained seal |
| Science explainer | Clean readable labels on a protected overlay + ink paths/arrows + a host-rendered vector chart | Brush reveal along causality, an organic circular ink bloom |
| History / mythology | Multiple paper planes, accurate sourced images, ink-style drawn establishing contours | Lateral unscroll into a new environment; retain chronology and cite facts |
| Animated story | Host-rendered rigged characters over authored paint backdrop | Painted background is stable while characters move; let action create one brushed transition |
| Product introduction | Clearly legible product footage/3D inserted as a layer, custom branded title in protected area | Ink bloom selectively reveals the subject, not an unreadable gray veil |
| Poetry / title motion | Few strong brush gestures with generous whitespace and carefully checked CJK glyphs | One pressure-led ink pull, then a long final hold |
| Educational quiz | Readable plain DOM question, optional media and diagram, independent response controls | Apply ink to scene transitions and answers *without* hiding interaction state |

## 5. Integration sketch

\`\`\`tsx
import { compileFilm } from "./components/video/film-document";
import { FilmStage } from "./components/video/film-stage";
import { createInkFilmDocument } from "./components/video/ink-wash-story";
import { InkWashScene } from "./components/video/ink-wash-story-react";

const plan = {
  id: "example-ink-film",
  outputs: [{ id: "landscape", width: 960, height: 540 }],
  shots: [{
    id: "opening", label: "A subject is revealed", durationFrames: 120,
    layers: [{
      id: "supplied-footage", startFrame: 5, durationFrames: 65,
      reveal: "bloom", origin: [.5, .5], treatment: "wash",
    }],
  }],
} as const;
const document = createInkFilmDocument(plan);
const result = compileFilm(document, { outputId: "landscape" });
// An application mounts FilmStage only after result.ok, and passes InkWashScene
// from renderSlot: the host must supply its authored InkWashSpec and renderLayer.
\`\`\`

### Character animation / INK3

Use the existing `CharacterDefinition` + `evaluateCharacter` + `CharacterPresenter` rig, not a second skeleton or animation clock. The `ink-wash-character` pack positions an approved rig in paper/film coordinates; `CharacterPresenter.inkMaterial` adds subtle paper-space displacement and controlled wet edges to each separately animated shape. Optional `partFinish` lets artists keep mouth, eyes and hair dry/crisp while allowing robe or sleeve pigment to bleed. Unknown part IDs and out-of-range values are errors. The example uses one original 19-part traveler with coordinated blink, gesture, speech and expression cues in both output aspects.

The larger reference audit and remaining priorities are recorded in [Chinese ink animation: acting, brushcraft and production reference expansion](research/ink-animation-acting-and-visual-language.md). External film pages and published technique studies were analyzed for visual principles; **no frame-by-frame video playback or film-quality artistic certification is claimed**.


## Live Film Looks Storybook studio

All three original working films are interactive in the existing **Video production / Film Looks** group:

- `video-film-looks--chinese-ink-painting`: original landscape or bamboo, wet brush deposition, stroke pressure, tone, orientation, load and drying
- `video-film-looks--chinese-ink-documentary`: complete documentary, explanatory diagram and closing title with editable `InkFilm` paper/camera/reveal controls
- `video-film-looks--chinese-ink-character`: rigged 19-part traveller with adjustable cloth/face ink, blink cadence, gestures, speech, stage placement and acting time-remap

The component `src/video/ink-film-looks-studio.tsx` exposes **play, pause, restart, frame seeking, 0.25–2× speed, loop, 16:9/9:16, reduced motion, independent art presets** and collapsible live art-direction panels. Every numerical input is bounded; hex pigments and the deterministic random seed are validated. Each mode retains its own settings when switching. The configuration JSON pane can be copied, edited and reapplied, with inline errors instead of crashes.

Editable source parameters are implemented by `src/video/ink-film-config.ts`: material (`configureInkSpec`), camera keyframes (`configureInkCamera`), layer kind/duration/parallax (`configureInkLayer`). The character panel additionally adjusts location, scale, body/face absorption, explicit acting rate, blink cadence and individual speech/gaze/greeting/bowing/blink channels. These are **actual inputs to the production renderer**, not a simulation of an animation video or a blanket postprocess filter. Advanced rig geometry, source footage, dialogue timestamps and raw asset definitions remain authored by their respective host APIs; the Storybook UI is not a complete rig editor.

### QA and maintenance

`tests/ink-film-config.test.ts` validates color/number bounds, geometry changes and shuffled seeks. `tests/e2e-storybook/ink-wash-film-looks.spec.ts` exercises each animation in both aspects, material and camera interactions, actor controls and JSON parsing. SVG screenshot comparisons require exact evaluated DOM source state at a frame, not pixel-identical turbulence rasterization across unrelated Chromium renders. Film export handshakes and encoded MP4 motion evidence are also required before merge.

## 6. Visual quality rubric and remaining gaps

Use the [interactive original ink study](../component-specs/chinese-ink-wash.md) and the **new reusable [multi-genre Storybook story](../../src/video/ink-wash-universal.stories.tsx)**. Compare 16:9 and 9:16 on the final five prescribed stages: blank/onset, opening wash, thick gesture, capillary settle, resolved still. Check a nonsequential seek for raster flicker.

**Acceptance questions:** Does the paper remain a physical surface? Are the dark and pale strokes structurally differentiated? Does every shape have material logic? Do camera moves show a connected world? Is the actual video better at normal speed than the static contact sheet? Does media source licensing survive export? Are the captions readable and keyboard UI unaffected? Is there a coherent end/hold rather than an abrupt mechanical finish?

**Known limits:** The code is deterministic stylization, not a calibrated fluid simulation. A vector diagram can be masked or painted with authored ink strokes, but an arbitrary live-action actor does not automatically become physically accurate ink animation. A production content agent still has to supply storyboards, scene-specific art, footage rights, typography and final human visual review. Future enhancements include speed-aware brush geometry, explicit paper fiber direction, real pigment granulation, character-performance grammar, robust CJK calligraphy font choices, and separate artist-accepted 1080p/4K films.

## 7. INK4 — continuous travel and planted-foot acting

The optional `ink-actor-director` registry pack extends existing `ink-wash-character`, not the animation clock. `InkRoutePlan` interpolates scene-space waypoints continuously; `bakeInkActorTrack` preserves authored stop/facing keys while using linear playback between densely sampled C1 stations. For a rig with *separately authored upper/lower legs*, `InkWalkPlan` solves two-bone inverse kinematics against scene-space planted contacts and emits per-part `CharacterPoseCorrectionTracks` that combine with existing gaze, blink, visemes and gestures.

Storybook: **Video production / Film Looks / Chinese Ink / Character Director** has a frame-scrubbable 16:9/9:16 performance and separate frame-addressable production-export stories. These are original art/neutral character examples, not copies of historical animation characters. The centered controls are a production prototype; ground contact, motion arcs and encoded-film aesthetics still require visual scrutiny at normal speed.

**Important authoring constraints:** A true planted contact depends on the approved leg pivot positions, authored thigh/shin lengths, root travel speed and allowed body scale. The pure solver clamps out-of-reach targets; use `auditInkWalkContacts` to measure kinematic reach and reject plans with planted-foot error above the target tolerance. The proof traveler uses a 24-frame cadence and tests both output aspects at a 0.5 px tolerance. This is not yet certified no-slip animation: independently verify the actual rendered foot-tip and rig pivots in 16:9 and 9:16 at normal playback speed. Do not reuse the static one-piece `step` action simultaneously with INK4 IK corrections. Use the same absolute frame for rig, paint and shot camera, and preserve facial-part sharpness independently of garment capillary bleed.

**Craft references:** The [Asian Art Museum's brush technique primer](https://education.asianart.org/resources/an-introduction-to-chinese-brushpainting-techniques/) explains pressure, speed and flying-white on paper; [National Gallery of Victoria's Wu Zhen bamboo study](https://www.ngv.vic.gov.au/essay/wu-zhens-bamboo-in-spring-rain/) shows how asymmetric bamboo gestures and negative space convey motion. These inform material direction, not reusable film art. Formal animation context: [Duan Xiaoxuan's ink-wash cinematography study](https://doi.org/10.1080/17508061.2026.2749963) describes moving painted planes beneath an animation camera.

## 8. Independent painted backgrounds and ground-contact artwork

`InkWashScene.paintFrame` is an optional, validated absolute pigment frame, independent of its shot-local `frame`. This allows a fully dry, pre-painted background to stay constant while the existing character evaluator, film camera, layer reveal, speech and cue timeline continue moving normally. It does not invent a second playback clock. For a visible brush-painting scene, omit `paintFrame` to keep the original progressive drawing. For character directing, supply the completed pigment frame so actors no longer enter an accidentally blank landscape.

The INK4 traveller proof adds three original pressure-shaped ground-path pigment passes to the existing landscape, tied to the same authored foot-contact route and independently sampled from the pose solver. The source character asset reserves 10 design pixels under its boot silhouettes; the demonstration applies a visual 10 px baseline correction without modifying the world-space IK plan. Facial contours remain dry and crisp; robe and sleeves absorb pigment. **A visible ground path and an IK target audit are not proof that rendered shoe silhouettes are perfectly locked.** Inspect the two aspect-ratio exports at real playback speed and verify actual toe placement before any artistic certification.

## 9. INK5 — authored figure brushwork and articulated costume detail

The optional `ink-figure-craft` registry pack draws original, **pressure-native** garments and figure marks onto already-authored `CharacterShapeAsset` SVG parts, using the existing INK1 `inkOutline` and `flyingWhite` helpers. This follows the **bimo fenjie** (brush/value separation) production principle without adding another character rig or clock: contours remain children of the original knee, sleeve, body and hand transforms. Exactly the same custom fold objects can be used for a scholar, animal clothing, narrative characters, or product costume rigs. There are three documented gesture families: `silk-thread` narrow tensile lines, `fold` layered dilute wash and darker core, `dry-brush` short granulated/fractured bristle marks.

The INK4 traveler demonstration now authors robe radial pleats, hip folds, hem, both sleeves, cuffs, fingers/knuckles, hair/beard detail, and independent boot creases as vector source geometry. The original artwork, facial viseme shapes, character action channels, rig pivots, and rights statements remain unchanged; added marks are also independently authored. `inkFigureCraftShapes` validates every source point/pressure, pigment token, width, water fraction, seed, stroke count, detail threshold and tone before emitting bounded safe SVG paths. Its result is pure and seek-stable.

**Storybook:** `Video production / Film Looks / Chinese Ink / Character Director` exposes garment brush detail (0–100%) and fold pigment density (0–200%) with normal playback, single-frame seek and reduced-motion final hold. Production video exports retain the crafted default. The knob selects authored marks; it does not pretend to regenerate a new costume or reconstruct missing perspectives.

**Craft provenance:** Asian Art Museum, [Linear techniques for figure painting](https://education.asianart.org/wp-content/uploads/sites/6/2019/09/Brushstrokes.pdf) describes garment line languages; [brush-painting techniques](https://education.asianart.org/resources/an-introduction-to-chinese-brushpainting-techniques/) explains pressure, moisture and flying-white. The research on [layered cel brushwork](https://journals.library.columbia.edu/index.php/cja/article/download/9275/4850/22666) explains why isolated value/contour marks should move with the figure instead of being a whole-frame postprocess. No reference illustration was traced or redistributed.

**Limit:** Fine figure lines do not, by themselves, make physically calibrated xuan-paper ink. Hands remain stylized source shapes, and their precise grip and walking toe contacts must be judged at actual output scale during normal-speed review; IK reach is only a kinematic check.
