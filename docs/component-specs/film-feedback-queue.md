# FD1 film feedback queue: traceable scene corrections

Use this after [the Reference Lab film review and correction workflow](https://github.com/YukiUmetsu/kumiki-reference-lab/blob/main/docs/film-map-review.md). The lab provides both PTS-verified source/render frame pairs and a separate, human- or AI-authored `film-map-feedback.json` draft with actionable findings. **This command does not perform artistic judgments or edit the film.**

## Convert feedback into scene-linked tasks

```bash
npm run film:feedback-queue -- \
  ./reference-film-map.json \
  ./review-runs/film-map-review-.../film-map-review.json \
  ./film-map-feedback.json \
  ./original.film.json \
  --out=./film-edit-queue.json
```

The command runs the **live FD1 compiler** (`film:check`) before constructing the queue. It verifies:

1. The reference map, report and feedback are the expected versioned contract types, with SHA-256 calculated from the authored film, review map, review manifest and all paired JPEGs. The original/render video SHA-256 claims are compared **between the artifacts**, but the videos are not passed to this command and their actual bytes are **not** rehashed here. A modified or missing image rejects the entire queue.
2. Every reference map anchor still names the same source PTS, render frame, authored scene and scene frame offset. The reporter cannot invent an out-of-scene task or refer to a missing anchor.
3. Every feedback finding is unique, bounded, in an allowed category/severity, linked to a verified anchor and actionable if it identifies an issue.

Output `kumiki.film-feedback-queue.v1` contains a prioritized `tasks[]` list. Blocking issues appear first, followed by significant, polish and observational findings; tasks with equal severity are ordered by film frame. Each task carries `sceneId`, `sceneFrameOffset`, `filmFrame`, `referenceSourcePts`, `category`, `severity`, `observation`, and `suggestedChange` so a coding agent can inspect the exact FD1 section before making changes.

Existing output is immutable: an identical rerun may reuse it, while different content is rejected. The output cannot be written inside the immutable source/render review bundle.

## Creative-quality boundary

- Treat `suggestedChange` as **a reviewer's request**, not automatically correct film direction. The author identity is self-declared and does not authenticate a human reviewer.
- Inspect the original source clip and actual movie at full speed, especially for camera direction, continuity, pacing, sound and narration. Paired stills alone are insufficient for motion/audio approval.
- Use the [live catalog and film schema](film-document.md) to implement approved revisions. Rerun `film:check`, render, create a *new* reference map and paired review, and verify fixes against new rendered evidence.
- The queue has `artisticApproval: not-granted` and `status: evidence-bound-edit-tasks-not-applied`. It never promotes techniques into the production catalog.

## Validation and CI cost

Run `node --test tests/film-feedback-queue.test.mjs` locally. Tests exercise real FD1 validation, exact hash relations, image tampering, invalid anchors and immutable queue export, using small synthetic fixtures (no browser or FFmpeg). The tests are retained in the repository and not added to heavyweight hosted CI.
