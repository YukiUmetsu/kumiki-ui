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
- `registry/video/stages/page-turn-{story-stage,book,book-canvas}.tsx` (book geometry is `.ts`): page painting, geometry and optional direct Three.js rendering.
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

Remaining: real browser capture, broader regression checks and final evidence.
Human visual/audio review: pending. M0 audit is partial; M1/M2/M3 and CQ-09
are not marked complete.
