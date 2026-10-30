# Cave identity and forest audio — 2026-10-29

## Delivered behavior

The forest retains the new foliage and stabilized dolly. The emblem no longer swivels,
scales in or blurs: it holds at a fixed shallow-relief angle and reveals through opacity.
Its wrapper now explicitly owns positioning. Rendered review caught escaped absolute
mask planes after removing the earlier transform; this was corrected, and the browser
check now measures the logo face against its own box and the name lane.

Forest audio is a real Guadeloupe rainforest field recording, credited to ezwa:
[Walk in the rainforest](https://commons.wikimedia.org/wiki/File:Walk_in_the_rainforest.ogg).
The primary Commons page identifies birds and a worldwide public-domain release by the
author. Source seconds 2–16 were high-pass filtered at 70 Hz, faded in over 0.8 seconds
and out over 1.5 seconds, and normalized with loudnorm I=-23 TP=-2 LRA=9. Output is
14-second 48 kHz PCM, two channels from an original mono recording. Actual measured mean
volume: −28.9 dB; peak: −10.8 dB. No synthesized or falsely species-labeled animal calls.
The preview exposes Sound on/off; native audio follows playback, pause and seeking,
pauses under frozen reduced motion and on unmount, and reports load/autoplay errors.
The frame-only library renderer does not own media playback.

`CaveIdentityRevealScene` is registered as `cave-identity-reveal`, sharing the existing
identity/depth schema and DOM stage. It adds no package dependency beyond the shared
foundation (which currently transitively declares Three.js for other paths). The new
single Storybook example uses the supplied cave image unchanged, AI-generated left wall,
right buttress and overhang alpha planes, a reused deeper wall, and an original aperture
emblem. The camera advances 4.5 units toward the plate at depth 10.5; rock depths are
2.8, 3.2, 4.1 and 7.4. Rock sway, camera bob and sideways truck are zero. Portrait is
authored separately; native-size export uses the same grade as preview.

The supplied commercial `cave-logo.mp4` reference was probed (640×360, 30 fps, ~14.094 s)
and inspected through extracted frames at two-second intervals. The entrance/chamber/payoff
progression informed the scene. Its branded hanging board, logo, pixels and audio were
not imported. This is frame sampling, not a claim of continuous human playback review.

## Verification

- `npm run typecheck` passed.
- `npx vitest run tests/nature-world-identity-reveal.test.tsx tests/cave-identity-reveal.test.tsx`
  passed: 16 tests across two files, including cave DOM customization/ref forwarding,
  geometric passage, stable emblem orientation, reverse seeking and reduced motion.
- `npm run catalog:check` passed: 344 entries, 706 verified story mappings.
- `npm run catalog:api -- --id=cave-identity-reveal --format=json` found the actual
  `CaveIdentityRevealScene` export and inherited props.
- `npm run registry:validate` passed: 174 items.
- `npm run registry:smoke` passed: 174 items / 2,410 files staged into isolation.
- `node scripts/verify-nature-cinematic.mjs` and the same command with `--cave` passed
  144 rendered bounds samples each, including 1440px/390px, landscape/portrait,
  long Latin/CJK text, face containment, reduced motion and full 14-second playback.
  No page errors. Forest additionally passed actual native audio play, pause at seek
  frame 168 (~7 seconds) and Sound off checks. Browser evidence is stored in each
  scene's `artifacts/*-cinematic/browser-checks.json`.
- Landscape start, mid-approach, final forest/cave frames and portrait holds were inspected.
- Existing Vite native-config / missing MDX pattern warnings were non-fatal.

No full repository suite, human cinematic approval or human listening acceptance is
claimed. Original image/AI derivative redistribution rights remain unverified and those
assets are excluded from registry packs. The audio is verified public domain. All
provenance is in `assets/THIRD_PARTY_ASSETS.json`.

## Completed exports

- Forest: `npm run video:export -- --story=video-production-scene-templates--nature-world-identity-reveal --audio=src/video/assets/nature-jungle-ambience.wav --output=artifacts/nature-cinematic/nature-identity-rainforest-audio-v5.mp4`
  completed; 336 decoded frames, 1920×1080, 24 fps, 14.000 seconds, with the edited
  rainforest audio muxed. 10,905,017 bytes. SHA-256:
  `4c2054d01f8ef0a05b7548143085d330845f22379829fdc39ce2792fd14c0186`.
- Cave: `npm run video:export -- --story=video-production-scene-templates--cave-identity-reveal --output=artifacts/cave-cinematic/cave-identity-1080p.mp4`
  completed; 336 decoded frames, 1920×1080, 24 fps, 14.000 seconds, silent.
  5,387,536 bytes. SHA-256:
  `d5978bdd75de71b7cdd1e47373d6945ba4909246a96ef87bfdeff99dd44293c1`.

Forest stream probe confirms H.264 video plus AAC audio, 48 kHz, two channels. Both outputs
are full verified MP4s, not partial captures. Portrait browser proof was inspected; a
portrait MP4 was not exported in this pass. No public release or commit was performed.

## Cave revision 2 — distinct left formations and darker exposure

The user accepted the forest film and requested cave-only changes. The forest preview
source, shared identity stage, shared playback shell and accepted forest MP4 have identical
SHA-256 hashes before and after this revision.

Created three new distinct alpha images matched to the supplied cave photo, each with its
own geological silhouette: `cave-fluted-pillar.png` (1024×1536),
`cave-flowstone-curtain.png` (1024×1536), and `cave-angular-ledge.png` (1678×937).
They occupy left planes at depths 7.9, 6.3 and 5.6 respectively. All seven rock planes
have rigid motion and explicit portrait placement. These are new generated images,
not crop/flip variants of the existing rock wall. Their local-only derivation and rights
limits are recorded in the asset manifest.

Cave background exposure reduced from 1.15 to 0.94 (~18%); rock exposure from 0.82 to
0.61 (~26%); haze from 0.12 to 0.06; vignette from 0.55 to 0.64. No shared renderer,
forest settings, camera schedule or logo behavior changed.

Fresh verification: `npm run typecheck`, `npx vitest run tests/cave-identity-reveal.test.tsx`
(1 test), `npm run catalog:check` (344 entries / 706 stories), and `git diff --check`
passed. `node scripts/verify-nature-cinematic.mjs --cave` passed 144 measured text/face
bounds samples, long Latin/CJK copy, reduced motion and full playback with no page errors.
Landscape frames 0, 96, 150, final hold and portrait hold were visually inspected.
The new formations reveal at separate speeds and the center remains clear for the name.
Human cinematic acceptance remains open. Existing non-fatal Vite/MDX warnings persisted.


## Cave revision 3 — removed formation and natural green moss (2026-10-30)

The user rejected the hanging flowstone image. Its scene plane, local PNG and active
asset-manifest entry were removed. The export in progress was stopped with SIGINT and
its partial file was cleaned by the exporter. The remaining new pillar and ledge retain
separate depths, giving six foreground/midground planes in total.

Following the user's moss correction, the five active cave rock textures were edited
with built-in image generation to use sparse natural dark forest-green moss under very
low neutral light. Gold/amber vegetation was removed without globally tinting the stone.
All PNG dimensions remain unchanged: three portrait 1024×1536 images and two landscape
1678×937 images. The cave light changed to neutral #bdc8bb; reduced exposure and haze
were kept. Original supplied photography and accepted forest files are unchanged.

The previous browser run after formation removal was interrupted by a source hot reload
during the playback interval and did not reach its final-hold assertion; that run is not
counted as a pass. The final assets were inspected in landscape start/mid/final frames
and the portrait hold before a clean re-run with source edits finished. Human cinematic
approval remains open.
