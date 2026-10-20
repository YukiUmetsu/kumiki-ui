# Deterministic 3D hero quality gate (HQ1)

**Goal:** make invalid 3D construction and fabricated review signoffs harder to ship, without running visual inference on every commit. **No LLM, image recognition, perceptual score, GPU, browser, remote references or screenshot capture in CI.** The gate is intentionally narrower than artistic acceptance. Source of truth: `registry/craft/hero-quality-gate.ts`; release attestations: `docs/verification/hero-approvals.json`.

## Two independent checks

| Stage | When | Checks | What it cannot assert |
| --- | --- | --- | --- |
| `inspectHeroAsset(asset)` | Local authoring + selected CPU-only Vitest fixtures | Finite world bounds and physical scale, authored materials/construction detail, drawable meshes, finite object transforms, valid roughness/metalness, attached semantic parts, unique actions with frame-addressable `pose` | Photographic similarity, visible craftsmanship, pose collisions, GPU performance, textures at delivery pixels |
| `npm run hero:quality` | **Every CI run**, offline Node (typically milliseconds when no approvals) | Every **manually approved** asset has a dated named review, specific HTTPS reference URLs, named source files whose SHA256 still matches the working tree, and four valid **tracked PNGs** whose headers/dimensions/hash match the review | Whether photos and renders genuinely look similar, authenticity of a reviewer, performance on other hardware |

An **empty approvals manifest is valid** and means *nothing is human-approved*, not that all assets are acceptable. A review record is a release attestation, not a synthetic grading score. Separately, the finance vocabulary in `registry/domains/finance-object-review.ts` lists many assets still awaiting reference or render review; none are automatically promoted.

## Manual review workflow (only for assets proposed for release)

1. Read `docs/14-3d-visual-fidelity.md`. Choose an intentional art direction and fidelity tier, record the relevant manufacturing/photos reference(s), and verify legal attribution/licensing.
2. Use the fast structural gate when authoring a hero. Inspect `report.issues`; fix errors. Warnings are review guidance.
3. Run local Storybook and capture four actually distinct views, including one genuine macro view, for example:
   ```bash
   npm run storybook
   npm run hero:capture -- --asset=bank --views=front,quarter,side,close \
     --render=final --out=docs/verification/assets/hero/bank
   ```
   Capture is **manual opt-in**, never CI. You may also use `npm run finance:3d:audit`.
4. **A human compares** real photos and all four rendered views: silhouette, proportions, functional construction, material response, texture seams, lighting, and legibility at actual delivery pixels. Record named reviewer, review date, decision, shortcomings and real sources. A generated contact sheet alone is **not** approval.
5. If and only if accepted, add an entry to `hero-approvals.json` with the actual tracked PNG paths for `front`, `quarter`, `side`, `detail` (the capture tool calls the last image `close`; map it to `detail` in the manifest), pixel dimensions, `sha256` of each PNG, and an explicit set of source file paths + their `sha256`. Use `shasum -a 256 <path>` or `sha256sum <path>`. Include every asset source file whose changes materially affect its appearance: geometry, material recipe, studio/render pipeline and relevant shared shader helpers.
6. Run `npm run hero:quality`. It **fails** on tampered captures, changed source files, missing views, path traversal, wrong dimensions, expired review evidence, or missing signoff data. After modifying an asset, return it to WIP and recapture/reapprove; do not update the hashes to hide the modification.

```ts
import { inspectHeroAsset } from "./registry/craft/hero-quality-gate";
const asset = createSomeHero();
try {
  const report = inspectHeroAsset(asset);
  if (!report.ok) throw new Error(report.issues.map(x=>x.message).join("; "));
} finally {
  asset.dispose();
}
```

## Performance policy

- CI checks only explicit metadata, file contents and pure CPU object invariants. No extra renderer, GPU, network call, screenshot parsing beyond the 24-byte PNG header, or LLM token costs.
- Four-view screenshot captures and human approval are **release-time** work, not per-change checks. Once approved, CI verifies exact bytes using SHA256; no perceptual differences across OS/GPU can flake CI.
- Running `inspectHeroAsset` on real geometry is optional for local development and a few fast representative tests. Avoid constructing a full catalog of SDF meshes in every CI run.
- Capture regression baselines are useful after asset approval; visual diff tooling is optional and must not be confused with aesthetic proof.
- Do not claim an unmeasured GPU frame time, that warnings measure beauty, or that an empty manifest means release-ready 3D assets.

**Fail-safe:** if evidence is incomplete, status stays unapproved. The quality gate reports verifiable structural/evidence facts, not a subjective score.
