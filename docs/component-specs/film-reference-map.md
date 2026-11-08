# Reference Lab → FD1 film: explicit review mapping

This is the **next stage after** [Kumiki Reference Lab's evidence-only film handoff](https://github.com/YukiUmetsu/kumiki-reference-lab/blob/main/docs/film-handoff.md). It links **manually selected source-video PTS anchors** to frames of an **independently authored, validated FD1 film**, with reproducible rational timestamps. It does **not** infer storytelling, reconstruct camera motion, synchronize source audio, copy a reference video, compare pixels, or certify visual quality.

## Three inputs, one review map

1. Run `kumiki-ref study-reference` then `kumiki-ref export-film-handoff` in `kumiki-reference-lab`. Keep the immutable study bundle and source video for verification.
2. Study the actual source frames and full-motion footage. Author an **original** `*.film.json` using this repo's [Film Document](film-document.md). Use `npm run catalog:find` and `npm run catalog:api` to resolve installed recipe APIs. Run `npm run film:check` on the film.
3. Write a separate `anchors.json`; each anchor names an **interior** (cut-to-cut) source interval from the handoff, exact source video PTS in that interval, an existing authored scene, and a frame offset inside that scene. State the editorial relationship and *why* the pair is worth reviewing.

Example `anchors.json` (**illustrative only**, replace IDs, hash and PTS with those from your own handoff):

```json
{
  "schemaVersion": "kumiki.reference-anchors.v1",
  "sourceSha256": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  "anchors": [
    {
      "id": "mechanism-turn",
      "sourceWindowId": "candidate-interval-001",
      "sourcePts": 99000,
      "filmSceneId": "explanation",
      "filmFrameOffset": 84,
      "relationship": "inspired-by",
      "note": "Compare the timing of the visible cause-and-effect transition."
    }
  ]
}
```

Relationship values: `inspired-by`, `visual-analogy`, or `intended-match`. The last is an **editorial intention**, not a measured match. Every anchor requires a specific explanatory note; the command never auto-selects anchors.

```bash
npm run film:reference-map -- \
  ../kumiki-reference-lab/runs/handoff/film-handoff.json \
  my-film/original.film.json \
  my-film/anchors.json \
  --out=my-film/reference-film-map.json
```

The command reruns **the live FD1 film compiler** in `film:check` mode, rejects invalid documents and source/film IDs, refuses source PTS outside an observed interior window, and checks the handoff's source timebase against both interval boundaries. It calculates the absolute film frame from preceding scene durations; timestamp arithmetic uses integers and exact fractions, not cumulative float rounding. The result carries SHA-256 digests of all three input files, plus source and study hash claims from the handoff. An existing output is only reusable if its bytes match; it is not silently overwritten.

The resulting `kumiki.reference-film-map.v1` artifact includes `source.seconds` and `film.seconds` as rational `{numerator,denominator}` values. They are **two different clock domains**. The output does not claim to prove the study's stored hash claims; verify the original source and study manifest separately when reviewing.

## What to do with the map

1. Render and review the authored film using `npm run film:review -- <film.json>` and `npm run film:render -- <film.json>`. Preserve contact sheets and any reviewer findings.
2. Extract source frames by **source-video PTS** and film frames by their absolute frame indices. Account for video decode/keyframe seeking and confirm the actual source PTS when extracting.
3. Place pairs side by side. Compare visible object state, teaching clarity, continuity, camera direction, typography, lighting and actual motion at full speed. If the relationship is `intended-match`, evaluate it explicitly, without assuming identical pixels or timing.
4. Record reviewer observations, then fix the original film and regenerate the map. The film digest changes when any authored content changes.

`film:compare` is deliberately **not** used here: it measures frame-level PSNR for *two renders of the same film*, which is not a meaningful similarity measure between a reference and an original production. Reference Lab's `compare-frames` and `compare-appearance` tools provide independent image evidence when supplied with explicit anchors.

## Quality and CI

Run `node --test tests/film-reference-map.test.mjs` locally. It covers rational clock mapping, invalid/censored intervals, duplicate or missing author selections, SHA identity disagreement, live FD1 validation and write-once behavior. These tests remain in the repo; heavyweight browser/movie rendering and reference visual review are **not** added to hosted CI.
