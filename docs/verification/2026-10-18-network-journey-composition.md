# Network Journey — complete Phase 2 integration

Continues feature branch `feat/constraint-driven-composition` and PR #2. Main is unchanged.

## Behavior

The two formerly failing camera shots now use existing CC1 target fitting instead of locked position paths. All moving-signal shots use the same solver so aspect-specific reading space remains available. The B-to-C follow starts from `deriveSemanticTrackingWindow` over the actual animated signal and router bounds, rather than an independently guessed camera frame. Earlier shots give it room while the server chapter still starts at frame 1710.

World scenes reserve subject space on the left in landscape and above in portrait. The `JourneyWorldComposition` adapter uses public `ExplainerStage`, `ExplainerVisual` and `ExplainerText`. It replaces fixed SVG concept headlines/details; preserved educational facts remain plain, measured text. CPU projection records actual semantic target rectangles at each world frame before disposing the build world. Playback uses those rectangles and the same MG1 frame without rebuilding geometry or introducing another clock. The viewport canvas remains mounted through frame changes. Director View preserves that DOM canvas; its existing renderer setup may reinitialize when debug geometry changes.

Production creation automatically rejects failed critical-subject/tracking contracts. Critical checks run every integer world frame after explicitly partial camera handoffs. The handoffs remain declared exceptions, not hidden guarantees. Clipping projected rectangles to the output during handoffs only reserves visible subject space for text; it does not certify visibility.

If a viewport cannot accommodate the explanation, the diagnostic and complete essential text also appear outside the cinematic crop. The film never certifies that failed composition as ready. Existing phone/DNS/protocol/recap renderers and the eight-chapter structure remain intact. Director View exposes the applied contract and actual tracking window.

## Local verification

- `npm test -- --project unit`: **95 files / 1354 tests passed**, including the original Network Journey regression in both aspects, scenario extremes, measured-layout integration and persistent visual identity.
- `npm run typecheck`: passed.
- `npm run lint`: zero errors; one existing unused-disable warning in `tests/e2e/probe-overflow.spec.ts`.
- `npm run build` and `npm run build-storybook`: passed. The application build retains its existing large-chunk warning.
- No registry implementation or manifest changes were needed for this integration.
- Local Chromium remains blocked by macOS sandbox permissions; GitHub Actions runs actual browser/WebGL checks.

## Browser/CI gate

CI now runs the entire unit project and all Storybook browser suites. The new browser suite checks ten world frames in each aspect, including the original failure frames 1448 and 2360; real text/subject bounds, overflow and font size; playback/Director View canvas retention; offline delivery and reduced-motion captions. Existing phone, DNS, OSI, transition and recap browser checks remain enabled. The run uploads screenshots and traces. Actual run results are recorded in the PR checks and PR description after execution.

## Limits

Checks protect declared semantic bounds and text metrics. They do not certify arbitrary occlusion, realism, networking accuracy beyond the authored explanation, or every possible typography/viewport combination. Existing conservative-geometry and explicit partial-transition diagnostics remain visible. No model calls or image recognition are used by the automated checks.
