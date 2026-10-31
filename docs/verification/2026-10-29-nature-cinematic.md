# Nature photographic identity reveal — 2026-10-29

Implemented the opt-in `cinematic` treatment and switched the existing single Storybook
story to the user's jungle photograph. Previous grounded/depth-plane and optional Three.js
paths remain available. No new dependencies. The supplied JPEG is byte-for-byte unchanged;
all grading, camera movement, atmosphere and typography are runtime layers.

## Evidence

- `npm run typecheck` — passed.
- `npx vitest run tests/nature-world-identity-reveal.test.tsx` — 12 passed, including
  cinematic reveal, reverse seeking and stationary reduced motion.
- `npm run catalog:check` — passed, 343 entries / 705 verified story mappings.
- `npm run registry:smoke` — passed, 173 items / 2,384 files staged in isolation.
  This is source-install smoke evidence, not a fresh dependency download.
- `node scripts/verify-nature-cinematic.mjs` — 144 rendered geometry checks passed
  across 1440px and 390px viewports, landscape/portrait, long Latin and CJK text.
  Reduced motion showed the complete title; a 14-second browser playback reached frame
  335; no page errors. Results: `artifacts/nature-cinematic/browser-checks.json`.
- Screenshots inspected: establishing/reveal/final landscape, final portrait, mobile
  preview, long Latin portrait and CJK landscape. The identity occupies a centered,
  bounded vertical lockup, with no detected text overlaps or truncation in tested copy.
- `npm run video:export -- --story=video-production-scene-templates--nature-world-identity-reveal --output=artifacts/nature-cinematic/nature-identity-1080p.mp4`
  — passed. Encoder output verified by decoded frame count: 336 frames, 24 fps,
  1920×1080, 14.000 seconds; silent; 15,670,338 bytes.
- `git diff --check` — passed.

Output SHA-256: `721c62ce95d491f5d1ead82539a97d6b1818191060363ea785371f49e669a75b`.

## Review limits

Screenshot inspection and geometric/browser checks are agent evidence. They do not
constitute human approval of normal-speed cinematic quality. Human review remains open.
No claim of reconstructed 3D, simulated volumetrics, or animated source foliage.
The image's redistribution rights are unverified; it is a user-supplied local demo asset,
not included in the installable component pack. No public release was performed.

Existing Vite native-config and missing MDX pattern warnings appeared during tests;
the focused tests passed. The full repository suite was not run.

Export can also be driven through the same handshake with `portrait=1` appended to the
Storybook iframe URL, producing the authored 1080×1920 composition. That portrait MP4
was not exported in this pass; portrait browser frames were inspected.

## Revision 2 — entering the forest

The user rejected the single-plane motion as flat. The current demo supersedes that
render with a clean plate and an independently projected foreground leaf, both AI-derived
from the supplied reference. The original JPEG is retained. The leaf is a photographic
reconstruction with alpha; the plate removes the original two heart-shaped leaves and
fills the understory to avoid duplicate subjects during parallax.

One shared camera travels 4.3 units toward the plate at depth 10 and the leaf at depth
3.8. The far plate ends around 1.82× (including overscan). The leaf grows faster,
softens near the lens and exits geometrically, revealing the filled plate. Small
speed-linked walking roll/bob and stem-anchored flex replace the earlier uniform drift.
The camera integrator now includes partial sample bins; the previous 240-bin integration
repeated positions during a 288-frame shot. A failing regression test demonstrated this
before the fix; all 289 sampled positions now advance strictly.

Fresh verification: 14 focused tests and typecheck passed; 144 browser bounds samples,
long Latin/CJK copy, reduced motion and full 14-second playback passed with no page
errors. Landscape frames 0, 96 and 150 and final portrait were inspected for leaf shape,
passage, revealed ground and final framing. Catalog check and isolated registry smoke
passed again. No full repository suite or human cinematic approval is claimed.

The first v2 export was interrupted at frame 121 by Storybook hot reload during a source
formatting edit (`Execution context was destroyed`). It was restarted after the source
settled. The existing v1 MP4 remains available for comparison.

## Revision 3 — layered forest corridor

Added three AI-generated photographic alpha assets matched to the supplied rainforest
reference: a mossy trunk with epiphytes (938×1676), overhead branch with attached leaves
and vines (1678×937), and a fern cluster (1132×1390). The cluster is reused smaller and
mirrored on the opposite side. Their planes use depths 7.8, 2.8, 5.7 and 6.4, around the
existing near leaf at 3.8 and distant plate at 10. Explicit portrait placements retain an
open central corridor. `NatureDepthLayer.sway` (0..1) lets rigid subjects opt out of
foliage flex. Trunk and branch use zero; ferns use 0.35–0.45.

Fresh checks on the layered scene:

- `npm run typecheck` — passed.
- `npx vitest run tests/nature-world-identity-reveal.test.tsx` — 14 passed,
  including rejection of out-of-range layer sway.
- `npm run catalog:check` — passed (343 entries / 705 story mappings).
- `npm run registry:smoke` — passed (173 items / 2,384 files).
- `git diff --check` — passed.
- `node scripts/verify-nature-cinematic.mjs` — 144 bounds checks, reduced motion,
  long Latin/CJK copy and full playback passed, zero page errors.
- Rendered landscape opening, frame 96, frame 150, final hold, final portrait and
  390px preview inspected. Opening branch framing was lowered during visual iteration
  so the overhead arch is visible. No human cinematic approval is claimed.

New assets are local demo content, with underlying reference redistribution rights
unverified. The asset manifest records AI derivation and alpha cutout provenance.
No new dependencies or external 3D assets were added. The original supplied JPEG is retained.

Revision 3 export completed with `npm run video:export -- --story=video-production-scene-templates--nature-world-identity-reveal --output=artifacts/nature-cinematic/nature-identity-forest-depth-v3.mp4`.
Preflight passed for seven asset declarations. Output decoded and verified: 336 frames,
24 fps, 1920×1080, 14.000 seconds, silent, 9,513,115 bytes.
SHA-256: `b5a284854bf44d75afedc7656ea60500827c41d1d0e838b3fe575e5b31185859`.
The prior v2 export was interrupted by the user turn and remains a partial file, not a
verified deliverable. The v3 MP4 is the current complete proof.

## Revision 4 — sapling, stable camera and identity relief

Added `nature-sapling-depth.png` (1024×1536), an AI-generated photographic alpha sapling
matched to the supplied reference. It sits at depth 5 behind the near leaf at 3.8;
portrait placement is farther left so the enlarged foliage clears the identity hold.
Underlying reference rights remain unverified; the local derivative is in the asset manifest.

Set the demo's `walk.truck` and `walk.bob` to zero, and made zero the defaults of the
cinematic treatment. This removes side travel and speed-linked roll/bob while retaining
the same forward dolly and relative plane speeds. The generic walking rig still supports
explicitly requested sway for other scenes.

Replaced the emblem's flat face with a CSS perspective relief: stacked silhouette masks,
shaded ivory edges, a warm front face and a restrained rim. The emblem turns from −44°
to −16° yaw and 12° to 6° pitch after its reveal and holds; name and tagline stay in the
existing text lane. `material.color` and `material.thickness` apply. This is explicitly a
2.5D mask extrusion, not a mesh, PBR renderer or physically simulated bevel.

Typecheck passed; the focused suite passed 15 tests, including a level default camera,
logo turning/settling, reverse seeking and stationary reduced motion. Catalog and isolated
registry smoke passed again. The initial browser pass returned 144 clean text bounds
samples, reduced motion and full playback with no page errors. Landscape opening,
frame 96, the angled emblem during reveal, final landscape and portrait were inspected;
portrait sapling placement was then moved left to clear the final lockup.
Human cinematic acceptance is not claimed.

After the portrait placement adjustment, the browser suite passed all 144 bounds samples
again, including reduced motion and complete playback, with zero page errors. The final
portrait screenshot was inspected and the sapling clears the lockup. `git diff --check`
passed. Vite's existing native-config and missing-MDX-pattern warnings remained non-fatal.

Revision 4 export completed with `npm run video:export -- --story=video-production-scene-templates--nature-world-identity-reveal --output=artifacts/nature-cinematic/nature-identity-stable-relief-v4.mp4`.
Preflight passed for eight asset declarations. Decoded output verified: 336 frames,
24 fps, 1920×1080, 14.000 seconds, silent, 10,575,886 bytes.
SHA-256: `4fbae5242b000ffd2d67c9a714a018e196c44879dd00ca2f117d19089b1db592`.
