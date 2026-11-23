# Chinese ink wash — INK1 material-native brush study

**Status:** Implementation PR #156; separate material QA from artistic approval.

**Expanded system:** [36 — ink wash craft and any-content film grammar](../36-chinese-ink-wash-craft-and-film-system.md). Two source-distributed registry entries: `ink-wash-core` and optional `ink-wash-film`.

**Roadmap:** [35 — Material-native film styles](../35-material-native-film-styles-implementation-roadmap.md), Phase 3 (PRs 4–5).  
**Public code:** [ink-wash.ts](../../registry/video/ink-wash.ts) and [ink-wash-react.tsx](../../registry/video/ink-wash-react.tsx).  
**Production study:** [ink-wash-film.ts](../../src/video/ink-wash-film.ts) and [Storybook](../../src/video/ink-wash.stories.tsx).

## Distinct material behavior

- **Per-stroke artwork rather than a filter:** each stroke has authored control points with pressure, a brush diameter, tone, pigment load, water fraction and an absolute-frame deposition timeline.
- **Five tone controls:** \`INK_TONES\` defines whisper, pale, middle, dark and black values. Native pigment is monochrome by default. A separately declared red accent can create a seal.
- **Brush deposition:** Catmull–Rom-interpolated centerlines produce tapered variable-pressure pigment silhouettes. Drier brushes split into stable flying-white traces.
- **Paper:** grain and fibers are rooted in artwork coordinates, not advancing per frame. Paper masks remove small portions of core pigment.
- **Wet diffusion:** wash geometry expands outside the original pressure-derived path, modulated by authored moisture and paper absorbency. Only the wet capillary fringe gets an optical blur; dry centers, paper fibers and typography remain crisp.
- **Time:** deposition, absorption, spreading and drying are separate pure functions of an *absolute* film frame. Seeking from late to early gives identical material state to a forward pass.
- **Film integration:** the scenes are existing FD1 \`slot\` recipes rendered by \`FilmStage\`. No second timeline or mandatory WebGL dependency. The production story wraps the same renderer in the existing \`VideoExportStage\` handshake.
- **Legibility:** picture ink and caption layers do not share a pigment mask. Both aspect ratios retain reserved reading bands.

## Typical usage

\`\`\`tsx
import { InkWash } from "../../registry/video/ink-wash-react";
import type { InkWashSpec } from "../../registry/video/ink-wash";

const brush: InkWashSpec = {
  version: 1,
  width: 960, height: 540, paper: "#F4F0E5", ink: "#222621",
  seed: 47, absorption: 0.7, grain: 0.6,
  strokes: [{
    id: "gesture", points: [
      { x: 150, y: 320, pressure: .08 },
      { x: 340, y: 185, pressure: .92 },
      { x: 580, y: 275, pressure: .04 },
    ],
    width: 28, tone: .73, water: .38, load: .85,
    startFrame: 12, drawFrames: 48, spreadFrames: 26, dryFrames: 48,
  }],
};

export function Example({frame}:{frame:number}) {
  return <InkWash spec={brush} frame={frame} label="Ink brush gesture on absorbent paper" />;
}
\`\`\`

## Making a video in Chinese ink

Pick the pieces below; they share one absolute film frame, so any of them can be seeked and exported through `FilmStage`/`VideoExportStage`.

| Need | Entry point | Storybook (Video production / Film Looks) |
|---|---|---|
| Paper | `inkPaperGrain(seed, w, h)` (xuan fibres and pores, `ink-wash.ts`); `InkWash` and `InkBrushCanvas` draw it for you | Chinese Ink / Ink Wash Film Stage |
| Brush marks, vector | `InkWash` with authored `InkWashSpec` strokes (pressure, tone, water, load, oblique brush, flying white, timed deposit and spread); `inkOutline` / `flyingWhite` for single pressure strokes; `makeInkRockTexture` for axe-cut, hemp-fibre and moss-dot rock marks | Ink Wash Film Stage, Studio |
| Brush marks, wet paper | `InkBrushCanvas` / `sampleWetInk` (`ink-brush` pack): pigment and water deposited into a fixed paper-fibre raster, capillary halo, dry-brush split; the most convincing ink surface in the style | Chinese Ink / Ink Brush |
| Any subject (people, animals, birds, fish, dragons, vehicles…) | RIG1 `RigScene look="ink"` or `RigLayer look="ink"` (`registry/rig/rig-look-ink.tsx`): each part gets a pale first wash, side-brush strokes deposited by `sampleWetInk`, lost-and-found `inkOutline` contours on the silhouette, dark ink for eyes and hooves, a light traditional pigment from the palette hue; marks are cached per part in bone space, so they never swim | Universal Rig / In Chinese ink; Chinese Ink / Shanshui Film Gallery / Any RIG1 subject in the landscape |
| The style's own characters | `InkCharacter` (`ink-wash-character`), continuous walks and IK feet (`ink-actor-director`), garment brushwork (`ink-figure-craft`), cloth follow-through (`ink-figure-motion`), two-actor blocking (`InkEnsemble`) | Chinese Ink / Character Performance, Character Director, Ensemble |
| Landscapes | `InkShanshuiStage` (three compositions, four rock-brush schools, mist, wind; `children` is an HTML acting layer, so put rigs in their own `<svg viewBox="0 0 960 540">`); `makeInkCinematicSpec` + `InkCinematicScene` (editable motif lists, both aspects) | Shanshui Film Gallery, Cinematic Landscape Engine |
| Camera and transitions | `createInkFilmDocument(plan)` + `InkWashScene`: handscroll camera keys with per-layer parallax, `brush` / `bloom` / `instant` reveals of any React layer; `followCamera` for a tracked RIG1 subject | Multi-Genre Film, Studio |
| Text and seals | Captions go in `InkWashScene`'s `children` reading plane (never under a pigment mask). A seal is a few `accent: true` strokes with the spec's `accent` colour (example: `addSeal` in `src/video/ink-wash-demo.ts`) | Ink Wash Film Stage |

**Known gaps.** There is no reusable seal or calligraphic title component yet (seals are authored strokes; titles are plain DOM text). The RIG1 ink look paints each rigid part separately: rigs built from abutting panels (the horse's barrel and shoulders, the dragon's tail) still read as planes, joint caps read as balls, and stroke direction is each part's own long axis, not the animal's fur or the garment's folds. Its ink is neutral pine soot, so on the sepia shanshui stage it looks cooler than the scene, and inside the stage's HTML acting layer it cannot multiply into the painting. The first frame of a new rig pays for its wet-paper deposits (about 150 ms for a koi, more for a dragon); later frames reuse them. The InkWash vector renderer still reads as soft blurred shapes beside the wet-paper raster, and several Studio and Wash demos use star-shaped pine needles.

## Reproducible review

- Unit/SSR: \`npx vitest run --project unit tests/ink-wash.test.tsx\`.
- Type check: \`npm run typecheck\`.
- Browser contact sheet and frame-seek tests: \`npx playwright test -c playwright.storybook.config.ts tests/e2e-storybook/ink-wash.spec.ts\`.
- Interactive Storybook: \`/iframe.html?id=video-ink-wash--chinese-ink-wash&viewMode=story\`.
- Encoded proof story: \`/iframe.html?id=video-ink-wash--chinese-ink-wash-export&viewMode=story\`. Export command:
  \`npm run video:export -- --story=video-ink-wash--chinese-ink-wash-export --startFrame=60 --frames=300 --output=dist/ink-wash-proof.mp4\`.
- Screenshot/MP4 artifacts are generated by the [focused QA workflow](../../.github/workflows/ink-wash-qa.yml). Review separate **landscape mountain, portrait mountain, landscape bamboo, portrait bamboo** at opening, gestural, spreading and dry-hold frames. Scrub backwards and recheck pixels.
- **Acceptance is not automatic:** A successful browser or image test cannot establish that the strokes look hand-painted. Watch the actual encoded MP4 at normal speed and record remaining deficiencies before marking the art accepted.

## Deliberate limits

- The renderer is a stylized, deterministic approximation of brush and absorbent paper, **not** a physically calibrated fluid solver; it does not model watercolor pigment blooms, true fiber permeability, or chemically meaningful evaporation.
- Single-stroke point pressure is explicit; velocity within a stroke is inferred from point spacing, not a separately calibrated speed curve.
- No photorealistic medium claims, external artwork files, remote media, copied film reference scenes, or optional runtime downloads.
- The implementation is source-distributed and can be mounted as a FilmStage slot; publishing a registry catalog entry and measuring full HD/4K export throughput are future release gates, not achievements claimed here.

**References:** docs 35A ink-wash film (visual study only), real-world ink painting/brush technique process. All example artwork is independently authored and neutral.
