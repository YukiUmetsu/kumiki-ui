# CQ-01 / CQ-04 — book capture boundary

Source baseline: `6b671901ce5a34d9d67e67a829c32bbf76d6b174`, branch
`feat/premium-scene-templates`. PR #45 was queried with `gh pr view 45`:
merged, head `de34666a7c981415dda322076e87ab0922bec205`.

## Decision and scope

Keep the existing canonical frame/manifest/export pipeline. The smallest
verified defect is in the shared book capture boundary: painted page images
could be ready while the asynchronously created WebGL canvas was absent or
still reporting an earlier frame. Two settling animation frames did not prove
the requested draw happened. A book inside a reel also uses a local frame,
which must not be compared against the reel's absolute frame.

`PageTurnBookCanvas` now declares its requested local frame on its host.
`VideoExportStage` waits for that host's canvas to exist and report the same
local frame after rendering. No new clock, adapter schema, dependency or
public prop was introduced. This is a draw-readiness fence, not a claim of
pixel parity, physical realism or human visual acceptance.

Existing book art/story/spec/test edits in the worktree belong to prior work
and are excluded from this increment's commits.

## Owning source inventory (partial M0)

- `registry/motion/{types,constants,timeline}.ts`: rational FPS and pure MG1 evaluation.
- `registry/video/scene-templates.ts`: semantic recipe contract.
- `registry/video/cinematic-templates.ts`: six-scene local/absolute frame mapping.
- `registry/video/cinematic-templates-react.tsx`: cinematic scene composition.
- `registry/video/stages/page-turn-story-stage.tsx`, `page-turn-book.ts`, `page-turn-book-canvas.tsx`: page painting, geometry and optional direct Three.js rendering.
- `registry/video/video-export-stage.tsx`: browser seek/readiness handshake.
- `scripts/{export-video,video-export-core}.mjs`: streamed PNG capture and FFmpeg verification.
- `src/video/cinematic-templates.stories.tsx`: existing shared preview/export story.

React is 18.3.1, Three is pinned at 0.186.1 in package.json. Remotion/Theatre
are not installed. The existing exporter is sufficient for this correction;
M2/M3 remain unimplemented. Blender exists at the standard macOS application
path but was not started or used. ComfyUI was not needed or probed.

## Verification so far

- `npm run typecheck`: passed before this increment.
- `npx vitest run --project unit tests/video-export-stage.test.tsx`: observed
  two regression failures before implementation (returned after two paints,
  although the missing/stale renderer needed five).
- `npx vitest run --project unit tests/video-export-stage.test.tsx tests/page-turn-story.test.tsx tests/cinematic-templates.test.tsx`:
  3 files / 15 tests passed after implementation. Covers missing canvas, stale
  canvas and random/repeated/reverse requests with reel-local frame mapping.

Human visual/audio review: pending. M0 audit is partial; M1/M2/M3 and CQ-09
are not marked complete. The capture-fence correction is implemented and its
technical checks are recorded below.

## Subsequent checks

- Checkpoint commit: `790d07c`.
- `npm run typecheck`: passed after the change.
- Targeted ESLint over both changed runtime files and both new test files: passed.
- `npm run video:export:check`: 18 tests passed.
- `npm run registry:validate`: 195 items valid.
- `npm run registry:fixture -- --item=video-export-stage`: compiled 2 items /
  4 files; script warns there is no consumer usage template for that item.
- `npm run registry:fixture -- --item=page-turn-story`: compiled 2 items /
  29 files in a fresh consumer.
- `npm run hero:quality`: passed with **zero human-approved assets**; WIP remains WIP.
- `npm run build-storybook`: passed. Existing Vite `__dirname`, missing MDX,
  and chunk-size warnings remain.
- `npx vitest run --project unit`: 149 files passed, 1 failed; 2,126 tests
  passed, 1 failed. `tests/network-journey-composition.test.ts` / “protects
  actual scene subjects and enforces trajectory-based tracking in both aspects”
  exceeded its existing 90-second timeout. No network-journey source was changed.

First real export attempt (`book-fence-r01`) stopped after 61 captured frames:
Playwright reported “Execution context was destroyed, most likely because of a
navigation.” No final MP4 was produced. A dev-server reload is the suspected
cause, not proven. Retry uses the successful **static Storybook build** on
127.0.0.1:6017 to remove watcher/HMR navigation from the capture path.

## Real render and final evidence

- `npx vitest run --project unit tests/network-journey-composition.test.ts`:
  isolated rerun passed all 3 tests in 83.70 seconds. The original full-suite
  timeout remains reported; this does not claim a green full-suite run.
- `KUMIKI_STORYBOOK_BASE_URL=http://127.0.0.1:6017 npx playwright test -c playwright.storybook.config.ts tests/e2e-storybook/book-capture-fence.spec.ts --output=dist/scene-qa/book-fence-r02/browser-r02`:
  passed. Actual WebGL canvas frames `[80,4,80,240,4]` matched their requested
  frames; repeated-frame PNG bytes matched, and action-frame pixels changed.
  First browser test attempt exposed an extra `()` in the test assertion;
  corrected before the passing rerun. Production code was unchanged.
- Static export command (after `node scripts/serve-static.mjs storybook-static 6017`):

  ```sh
  npm run video:export -- '--url=http://127.0.0.1:6017/iframe.html?id=video-cinematic-templates--epic-book&viewMode=story&kmExport=1' --frames=360 --browser=chrome --output=dist/scene-qa/book-fence-r02/book.mp4
  ```

- [Actual MP4](../../dist/scene-qa/book-fence-r02/book.mp4): 360 decoded frames,
  1280×720, 30/1 fps, 12.000 seconds, 4,356,297 bytes, no audio. Export took
  160.7 seconds; exporter-process peak RSS 128 MB (not total GPU/browser memory).
- MP4 SHA256: `034f7a675cefbc62f8ae9c7791d723993416d3aaadbd5252c3bd0d41448e816d`.
- [Source hashes](../../dist/scene-qa/book-fence-r02/source-sha256.txt): all five
  hashes checked against the working tree after export. Includes the pre-existing
  uncommitted book art; the video is not attributable to commit `790d07c` alone.
- Ran the requested skill's `scripts/video_qa.py` on this actual MP4 with
  `--expect-audio no --expect-size 1280x720 --expect-fps 30 --min-duration 11.99 --max-duration 12.01`.
  **Technical pass**: full decode, zero black/frozen intervals; audio absent as
  declared for this diagnostic preview. Retained [JSON](../../dist/scene-qa/book-fence-r02/qa/report.json),
  [report](../../dist/scene-qa/book-fence-r02/qa/report.md),
  [contact sheet](../../dist/scene-qa/book-fence-r02/qa/contact-sheet.jpg) and
  [review player](../../dist/scene-qa/book-fence-r02/qa/review.html).
- Contact sheet inspected: photographic opening plate, dimensional folio, turn
  and changed spread are present. This sampled inspection is not normal-speed
  playback, geometric validation of every frame or human artistic acceptance.

Artifacts remain in ignored `dist/`, not Git; regenerate with the commands above
before cleaning build output. Existing asset sourcing is unchanged; preflight
checked 36 declared references, not independent legal clearance.

**Remaining gates:** 1080p30 final delivery, independently authored 9:16 sample,
paper/cover foley and editable mix, physical page/camera/art-direction acceptance,
and human playback with sound/muted/audio-only/phone-scale. The next smallest
scene task is one timecoded book look/motion revision from this baseline; do not
expand to cave/globe or mark CQ-09 complete.
