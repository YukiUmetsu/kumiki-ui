# Cave geology replacement — 2026-10-30

The user rejected the generated foreground's folded, glossy, porous appearance. All five
active generated rock textures were removed and replaced with alpha plates rendered from
CC0 Poly Haven assets: Rock Face 01 (Dario Barresi), Rock Face 02 (Dario Barresi / Rico
Cilliers), and Rock Moss Set 01 (Kless Gyzen). The previously rejected hanging flowstone
remains absent. The original supplied cave photograph remains unchanged.

## Source and rendering

Primary sources: [Rock Face 01](https://polyhaven.com/a/rock_face_01),
[Rock Face 02](https://polyhaven.com/a/rock_face_02),
[Rock Moss Set 01](https://polyhaven.com/a/rock_moss_set_01), and
[Poly Haven license](https://polyhaven.com/license), checked at acquisition.
Only original model/texture downloads are used; website promotional renders are not
redistributed. The PNG manifest entries record source-model checksums and output SHA-256.

`scripts/cave-rock-sources.json` pins the glTF, binary and 2K diffuse/normal/roughness map
URLs and MD5 values. `scripts/render-cave-rocks.mjs` verifies cached/downloaded bytes,
loads the source geometry, and renders orthographic left/right/outcrop/overhang/ledge
plates under low neutral lighting with alpha. Downloads stay in ignored `.review`.
The material uses roughness 1, metalness 0 and normal strength 0.22. A luminance-based
stone grade removes blue/red mineral casts and retains subdued existing green. No
procedural pore noise, generated folds, glossy clearcoat or invented geometry is used.
The ledge combines distinct rock meshes; the deeper left outcrop uses a separate boulder.

The source structural check verifies nontrivial geometry, UVs and diffuse/normal maps
before rendering. Actual counts and texture-presence flags are in
`artifacts/cave-cinematic/rock-source-evidence.json`; the cliff meshes contain 20,174
and 29,566 triangles. These are source-asset preparation renders; the actual film remains
DOM photographic 2.5D and does not gain a runtime WebGL dependency.

The left outcrop was reframed after rendered review to avoid a straight PNG crop edge;
its portrait placement was moved left to clear the final identity. Camera timing and
six depth levels are preserved. Low exposure, neutral cave light and reduced haze remain.

## Verification

- `npm run typecheck` — passed.
- `npx vitest run tests/cave-identity-reveal.test.tsx` — 1 passed.
- `npm run catalog:check` — 344 entries / 706 story mappings passed.
- `git diff --check` — passed.
- `node --check scripts/render-cave-rocks.mjs` — passed.
- `node scripts/render-cave-rocks.mjs` — rendered all five alpha plates; geometry,
  UV and texture checks passed. Screenshots of the plates were inspected.
- `node scripts/verify-nature-cinematic.mjs --cave` — 144 bounds samples passed,
  including 1440px/390px, landscape/portrait, long Latin/CJK copy, logo containment,
  reduced motion and full playback; zero page errors after source edits settled.
- Cave opening, mid-passage and final/portrait framing were inspected. A transient
  Storybook initialization error during a hot-reloading capture was not counted as a
  passing browser run; the final static-source run above passed.
- `npm run hero:quality` — ran successfully and explicitly reported **0 human-approved
  assets**; this is not approval of these source renders or a photorealism certification.
  Human cinematic acceptance remains open. No full repository suite was run.

SHA-256 checks confirm the accepted forest preview, shared runtime, playback shell and
forest MP4 remain byte-for-byte unchanged. The old generated cave PNGs were removed from
the active asset manifest and workspace. Original cave-photo rights remain unverified;
the replacement rock renders are CC0 with provenance recorded separately.

## Final export

`npm run video:export -- --story=video-production-scene-templates--cave-identity-reveal --output=artifacts/cave-cinematic/cave-geological-rock-v3.mp4`
completed. Eight image declarations passed preflight. Decoded output verified: 336 frames,
1920×1080, 24 fps, 14.000 seconds, silent; 4,434,288 bytes.
SHA-256: `8547c0141264e04a7d96d0d5d513e32d84dfd7a20b67656aeae64464d552d4ea`.

The earlier cave-v2 export was interrupted to honor the user's removal/texture steering;
that attempted revision is not a verified finished deliverable. This v3 MP4 is the current
complete artifact. No source changes were made while its capture was running.
