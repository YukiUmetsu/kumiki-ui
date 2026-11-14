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

## 6. Visual quality rubric and remaining gaps

Use the [interactive original ink study](../component-specs/chinese-ink-wash.md) and the **new reusable [multi-genre Storybook story](../../src/video/ink-wash-universal.stories.tsx)**. Compare 16:9 and 9:16 on the final five prescribed stages: blank/onset, opening wash, thick gesture, capillary settle, resolved still. Check a nonsequential seek for raster flicker.

**Acceptance questions:** Does the paper remain a physical surface? Are the dark and pale strokes structurally differentiated? Does every shape have material logic? Do camera moves show a connected world? Is the actual video better at normal speed than the static contact sheet? Does media source licensing survive export? Are the captions readable and keyboard UI unaffected? Is there a coherent end/hold rather than an abrupt mechanical finish?

**Known limits:** The code is deterministic stylization, not a calibrated fluid simulation. A vector diagram can be masked or painted with authored ink strokes, but an arbitrary live-action actor does not automatically become physically accurate ink animation. A production content agent still has to supply storyboards, scene-specific art, footage rights, typography and final human visual review. Future enhancements include speed-aware brush geometry, explicit paper fiber direction, real pigment granulation, character-performance grammar, robust CJK calligraphy font choices, and separate artist-accepted 1080p/4K films.
