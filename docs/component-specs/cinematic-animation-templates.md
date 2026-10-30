# Cinematic Animation Templates — implementation preview

**Status:** Work in progress, not visually accepted. Six editable, absolute-frame React compositions exist with a Storybook playback/export surface. The Walking on Earth story now uses a real Three.js rotating globe, modeled scenery and a rigged in-place walker; the other stories retain their earlier approaches. The cave identity reveal lives in the registered `cave-identity-reveal` scene template rather than in this reel.

## Reference brief

The user supplied seven visual references; six are implemented as templates in this reel. These videos are **review references only**; their source frames, names, logos, audio and watermarks are not redistributed in this repository.

| Template | Visual contract in the reference | Implemented in the first pass | Remaining acceptance gap |
|---|---|---|---|
| Nature logo | Deep forest, foreground leaves, real light beams, camera dolly, reveal through plants | Original cinematic forest plate, separate foreground motion, light/dust, editable logo | True independent 3D vegetation, richer animal/leaf animation and occlusion |
| Liquid glass | Multiple scenes with refractive widgets, soft material motion and particle networks | Original ribbon plate, refracted CSS-glass panel, chart growth and title state | Real distortion/refraction, multiple distinct shot transitions, 3D material motion |
| History timeline | Archival footage montage, tracked years, red headline cuts and fine film graphics | Six original archival stills, animated chronology, photo push, editorial red titles, grain | More varied typography/layout, historic footage and longer rhythm |
| Epic book | Fully modeled book/page-turn on a richly furnished desk, ink/photo reveals, lighting | Original book and desk, timed print reveal, perspective page turn, dust | Physically curled pages, meaningful shadows through the turn, multi-page storytelling |
| Fly around Earth | Actual flight path around 3D mini-globe with famous architectural miniatures | Original 3D-style world plate, plane flight path, banner reveal | Dynamic 3D globe and plane geometry, occlusion and orbiting camera |
| Walk on Earth | Person walking on a turning miniature world while environments and billboards change | **New 3D Storybook variant:** actual rotating textured sphere, desert/forest/suburb models from Kenney CC0, physical billboards, and an MIT Rocketbox walker with frame-seekable gait and fixed foot-position parent | Human visual acceptance, exact shot/style likeness, more elaborate environment transitions and billboards; legacy 2.5D renderer remains as fallback |

The Storybook stories are at **Video production / Cinematic Templates**. The `Preview reel` plays all scenes at their authored 30fps speed; individual stories allow longer inspection. User-facing controls are a play/pause button and a draggable progress bar. The old diagnostic frame-button idiom is not used in this new preview.

## Contract

- `CinematicTemplate` accepts `kind`, `frame`, `assets`, `title`, `subtitle` and `reducedMotion` plus forwarded div props/ref.
- The Storybook Walking on Earth scene mounts `CinematicWalk3D`, which accepts replaceable GLB/texture URLs via `models` and `groundTexture`. Its `createMiniatureWorld` and `walkingWorldPoseAtFrame` can be reused by a consumer importing the registry component directly. Animation remains driven exclusively by absolute frame; no continuous physics ticker.
- Frame is an absolute 30fps integer. All visible changes derive solely from it; no component-local ticker or CSS keyframe timebase.
- Original scene plates are supplied as media URLs by the consumer, not hard-coded into the renderer. The sample art is located at `src/video/assets/cinematic-templates/`.
- A realistic transparent explorer cutout can be supplied as optional `assets.walker`; if it is absent, a tiny vector stand-in remains available.
- Layout is 16:9, fluid in the preview and exactly 1280×720 during export. The `VideoExportStage` wrapper is the sole frame capture source.
- Text inputs are editable; production scenes should add an explicit text-fit/ink-bounds acceptance pass before release.
- Reduced motion freezes the scene at its communicated final-state frame.
- Missing media and unsupported fonts must fail preflight before export. The current export manifest lists every original sample image with a rights reference.
- No reference footage or music is used in the deliverable. The first-pass MP4 export is silent.
- External demo 3D assets are all logged in `assets/THIRD_PARTY_ASSETS.json`: Poly Haven Aerial Grass Rock (CC0), Kenney Nature Kit (CC0), Kenney City Kit (Suburban) (CC0), and the existing Microsoft Rocketbox walker (MIT with retained notice).

## Verification and export

```bash
npm ci
npm run typecheck
npx vitest run tests/cinematic-templates.test.tsx
npm run storybook -- --ci --no-open
npm run video:export -- --story=video-cinematic-templates--preview-reel --output=dist/cinematic-template-reel.mp4
# Or export just one scene:
npm run video:export -- --story=video-cinematic-templates--nature-logo --output=dist/nature-logo.mp4
```

The last two commands require a locally installed Playwright Chromium. A QA reviewer must still watch the whole film at normal speed, compare shots with the provided videos, inspect the first/middle/last frames for clipping, and evaluate the material-depth limitations before declaring any template approved. Do not confuse tests for render fidelity.

### Offline playable motion proof

Where Playwright Chromium is unavailable, an alternative local compositor can generate a playable MP4 **without uploading the repository or any art to a browser service**:

```bash
python scripts/render-cinematic-qa.py --stills
python scripts/render-cinematic-qa.py --output=dist/qa/cinematic-motion-reel.mp4
python scripts/render-cinematic-qa.py --scene=epic-book --output=dist/qa/epic-book.mp4
ffprobe -v error -show_entries format=duration:stream=width,height,r_frame_rate -of json dist/qa/cinematic-motion-reel.mp4
```

Requires Pillow and FFmpeg. This deterministic, **independently rendered 2.5D motion-direction proof** uses the same original art, scene order, shot durations and broad cues as the React compositions at 1280×720/30fps. It is **not pixel-identical** to the React renderer. Use the Storybook export above for exact component-pixel video QA after local Chromium is installed, and do not treat either preview as evidence of full 3D fidelity. The offline reel contains no audio.

## Asset provenance

All 12 WebP assets in `src/video/assets/cinematic-templates/` were generated as original sample plates and a transparent explorer cutout for this project from scene-specific prompts based on the user's *style* brief. They are not captures, edits, trace copies or crops of the commercial reference videos. Image generation was used for environment/detail plates and the walker cutout only; motion controls, typography and composition are code-native.

- **Source:** original AI-generated scene artwork created for Kumiki on 2026-10-28.
- **Rights reference for exports:** project-generated art; no external asset repository or third-party footage.
- **Intended output:** demonstration and user-replaceable video templates.
- **Attribution:** no external artist or stock attribution required for the generated artwork.
- **Redistribution:** the output is included as sample art; the uploaded reference videos are not included.

Before a public release, create component catalog metadata, clean registry install fixture and full visual evidence for all six. Keep the distinction between these first-pass 2.5D stages and the user's requested fully cinematic 3D examples explicit.
