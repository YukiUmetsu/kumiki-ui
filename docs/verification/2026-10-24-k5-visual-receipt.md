# K5 — visual dependency receipt (2026-10-24)

**Scope:** [19 — Clip-Led Production](../19-clip-led-production-and-revision-handoff.md) §3 K5: a small, non-secret receipt that says which visual parts depend on which inputs, so a changed input re-proves only what it affects. No persistent job graph, database or cache manager.
**Code:** [`src/video/visual-receipt.ts`](../../src/video/visual-receipt.ts) (generic: fingerprints, diff, verification) and [`src/video/visual-receipt-k2.ts`](../../src/video/visual-receipt-k2.ts) (the K2/K3 composition's nodes).
**Tests:** [`tests/visual-receipt.test.ts`](../../tests/visual-receipt.test.ts) — 17 tests.
**Example receipt:** [`k5-receipt-k2-youtube-shorts.json`](k5-receipt-k2-youtube-shorts.json), built from the reviewed 9:16 export.
**Status:** automated checks, and the owner's recorded review of the K3 re-exports (accepted). The receipt's review field records that acceptance; no new review was done.

## 1. Design

- Each node has a kind (`asset`, `profile`, `shot`, `boundary`, `proof`, `audio`), a `visual` flag, non-secret inputs, and the nodes it depends on.
- A node's fingerprint is the SHA-256 of its kind, visual flag, inputs and its dependencies' fingerprints (a Merkle-style chain). A change propagates downstream automatically, so the receipt itself is the only stored dependency graph.
- **Diff** between two receipts: visual nodes whose fingerprint changed are *affected* (re-prove them); identical visual nodes are *unchanged*; non-visual changes (audio) are reported separately and invalidate no visual proof.
- **Verify** recomputes every fingerprint from the stored inputs. A node whose stored fingerprint no longer matches is *stale*, and so is everything downstream of it. Stale means re-prove; a file path is never accepted as a cache hit.
- **Non-secret:** no absolute paths, keys or personal data. Footage is identified by file name, SHA-256 and rights reference.
- **Review and structural results** are recorded beside the fingerprints, not inside them, so recording a review never invalidates a proof.

The K2/K3 receipt has these nodes: `renderer`, `footage`, `profile` (preset, size, FPS, safe area, framing, typography), `chart-spec`, `scan-shot`, `payoff-shot`, `boundary` (the dissolve), `music` (audio, non-visual), and optional `proof-*` nodes for decoded frames.

## 2. Two-version results

| Change between versions | Affected visual nodes | Non-visual | Test |
| --- | --- | --- | --- |
| None | none | none | identical inputs |
| Background music replaced | **none** | `music` | doc requirement: no visual proof invalidated |
| Footage replaced | `footage`, `scan-shot`, `boundary`, `proof-scan-*` | — | payoff shot and chart untouched |
| Chart value edited | `chart-spec`, `payoff-shot`, `boundary`, `proof-payoff-*` | — | footage shot untouched |
| Profile framing changed | `profile`, both shots, `boundary`, all proofs | — | footage and chart spec untouched |
| Renderer changed | `renderer`, both shots, `boundary`, all proofs | — | footage file and profile untouched |
| One proof frame's hash changed | that proof only | — | the other proofs stay valid |
| Structural results recorded | none | — | structural results are not fingerprinted |
| Review recorded | none | — | review is not fingerprinted |

## 3. Stale, corrupt and invalid receipts

| Case | Result |
| --- | --- |
| A node's inputs edited without re-proving | that node and everything downstream are reported stale; unrelated nodes are not |
| A stored fingerprint damaged | only that node is reported stale |
| A dependency on an unknown node | build refuses |
| A dependency cycle | build refuses |
| Duplicate node ids | build refuses |

## 4. Example receipt (reviewed 9:16 export)

`k5-receipt-k2-youtube-shorts.json` (4.9 KB) records:
- structural: 360 decoded frames, 1080×1920, 12.0 s, and the export file's SHA-256 (`5a77bd93…`), measured with ffprobe;
- proofs: SHA-256 of decoded RGB frames at 0, 90 (scan shot) and 260, 359 (payoff shot);
- review: accepted, owner, 2026-10-24.

Frame 157 (mid-dissolve, where both shots are visible) is left out of the proofs. The builder assigns each proof to one shot, so a mid-dissolve frame would be attributed wrongly.

## 5. Limits

- **Not in the receipt:** caption and voice timing (the composition has no captions or narration), so the doc's "change caption or voice timing" row is not exercised.
- **Renderer identity** is recorded as the browser and FFmpeg versions the example was built with, plus the exporter name. The exporter's own source hash is not recorded, so a change to the exporter script alone would not re-prove anything.
- **Proof hashes** are of raw decoded frames, so they depend on the decoder. The example was produced by FFmpeg 9.0.2; a different decoder can produce different hashes for the same file.
- **Not a cache manager:** the receipt says what to re-prove. Re-rendering, storing outputs and deciding what to ship stay with the caller.
- **Not in the registry:** the modules live under `src/video/`, like the K2/K3 layout code, not in `registry/`.

## 6. Checks run

| Check | Result |
| --- | --- |
| `npx vitest run --project unit tests/visual-receipt.test.ts tests/clip-explanation.test.ts tests/clip-explanation-profiles.test.ts` | 45 pass (17 K5, 28 K2/K3) |
| Example receipt written by the test with the real footage hash and the export's proof and structural values | written, and verified clean |
| Typecheck | 15 errors, the same as `main`; none in the K5 files |
| eslint on the new files | clean |

## 7. Reproduce

```sh
npx vitest run --project unit tests/visual-receipt.test.ts
# write the example receipt (needs a proof JSON and a structural JSON for a real export)
K5_RECEIPT_OUT=<out.json> K5_PROOFS=<proofs.json> K5_STRUCTURAL=<structural.json> npx vitest run --project unit tests/visual-receipt.test.ts
```
