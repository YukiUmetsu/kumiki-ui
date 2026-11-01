# Premium Everyday 3D — implementation and visual QA

Date: 2026-10-31. Branch: `feat/premium-everyday-3d-scenes`. Scope: first-phase Cinematic Desk Kit, the original three films, and a fourth document investigation recipe; **not** all 55 proposed objects or all six requested templates.

## Continuation: document investigation and stronger production contracts

The same draft PR now includes a fourth recipe, **Document Investigation**. It uses the original printed invoice, a zero-based selected-row anchor, a translucent frame-seekable highlight, an authored camera push and a crisp 2D callout sourced from that exact row. Added scene-level lighting presets apply consistently to desk and book compositions. The physical hardcover's camera is now driven by the public `evaluateEverydayCamera` evaluator instead of a second independent formula.

Senior review found that original device actions could end at the wrong narrative point when the scene's FPS differed from the action reference rate; film-relative beats now map back into the 30 fps action reference before posing. The isolated consumer fixture also caught duplicate-property TypeScript errors and use of `Object.hasOwn` outside the configured compilation target; both were corrected before this review was updated. Rejected document highlight indices now fail before allocating GPU resources.

The first [hosted WebGL/browser and FFmpeg run](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/41211442990) **passed**. It produced four independently verified five-second H.264 demonstrations, including a real Document Investigation MP4 (150 decoded frames, 960×540, 30 fps, 5.000 seconds) and close-up inspection stills. Its [downloadable evidence artifact](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/41211442990/artifacts/13047425284) remains available for 14 days.

**Human/visual check of the encoded investigation frame caught more than the automated tests:** the pen crossed the final editorial value, and the push-in cropped the bottom of the paper. The follow-up removes the pen from this document-isolation recipe, widens the final camera and strengthens the selected-row emphasis. The second [hosted screenshot run](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/41212960873) confirms that the entire paper and the highlighted value are now visible without a pen obscuring the typography. That run passed seven of eight Chromium tests, but failed on an ambiguous Playwright selector (`Action` also matched `Action frame`), preventing its FFmpeg step. The selector has been narrowed to an exact combobox role for the next run; the second run is not advertised as a passing export.

The second inspection also found the desk and invoice captions spanning the front edge of the physical table, while the upper-left background remained empty. Their final callouts now occupy that clear negative space. The invoice handoff had a more serious continuity flaw: the laptop showed an unrelated analytics dashboard and "RECORD UPDATED" before the invoice physically arrived. The reused laptop now has high-resolution awaiting/received document-intake textures, a frame-addressed two-state action, and a received record populated by the authored invoice sender/reference/total. The success state appears after the paper reaches its endpoint. Unit tests check screen texture identity in both directions through nonsequential seeks and at different export FPS; the final hosted browser and encoded-video review below independently verifies the visible result.

### Final hosted encoded-video inspection

The [third GitHub Actions render](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/41213762049) **passed all eight Chromium browser tests and all four MP4 exports**. Its [video and screenshot artifact](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/41213762049/artifacts/13047559152) contains all nine object-gallery selections at two angles, sampled timeline frames, the 9:16 captures, and the four finished films. Artifact retention ends **2026-11-14**; the workflow remains reproducible after expiry.

Independent `ffprobe -count_frames` plus extraction from each encoded MP4 confirmed **150 actually decoded frames, 960×540, 30/1 fps, 5.000 seconds** for all four. Encoded invoice frame 85 shows a pending document intake and lifted invoice; frame 129 shows the received record. The closing desk/invoice captions now sit in the left editorial field rather than over the lower mat seam. Encoded investigation frame 149 shows the complete invoice, unobstructed selected-row detail and the paper total. Encoded book frame 85 shows the page clear of the mat. Those improvements were judged from decoded video pixels, not inferred from source code.

| Latest rendered MP4 in the hosted artifact | Bytes | SHA-256 |
|---|---:|---|
| `cinematic-desk-explainer.mp4` | 508,476 | `cec15b891e1c2240b67ed329277450fc8c699c41eb49ab42dfbb55ace0e31c6f` |
| `invoice-to-software.mp4` | 543,308 | `f57a154020267d60010b590ecdb086394e9ed8f9be9ddfd7397d8b22a3d06f55` |
| `epic-book-storytelling.mp4` | 715,967 | `046da70bac856a0f6c697c1ecffa9029b4ef92dd81466bcd710000940b731ebb` |
| `document-investigation.mp4` | 726,564 | `5935d69be7080d56376ef4b45f71a134b0789a7794ce80c41655a5c1c5a7660f` |

**Art-direction caveat:** the desk and metals read as authored procedural studio models, not photogrammetry; fine printed text is still too small to read across a wide desk shot. Final editorial text compensates where needed, but close-up realism, additional object sculpting and normal-speed human review remain open work. No human asset approval has been asserted.

An additional full-gallery close-up exposed a broad white key-light reflection washing over the left side of the dark laptop dashboard. The first anti-reflective revision raised roughness and reduced clearcoat: [its hosted render](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/41215797746) passed all browser/video tests, but visual comparison showed a larger dull gray reflection veiling the UI. That treatment was rejected on visual grounds despite green tests. The next material iteration instead reduces specular intensity sharply while restoring a smoother screen surface, keeping the phone's independently glossy glass. This latest coating requires a fresh visual rerender before approval.

## Real rendered evidence

All images below are actual WebGL captures from the Storybook capture stories or object inspector, not mockups. The source models/material prints are original procedural construction; no unlicensed external media is bundled.

Asset provenance: **original Kumiki procedural geometry and canvas prints** · project source license · distributable source plus commercial-video examples · no external creator attribution · no third-party redistribution restriction. The existing desk/laptop/phone systems are reused from the repository; no asset marketplace files were downloaded or repackaged.

| Film | Establishing | Mid-action | Final |
|---|---|---|---|
| Cinematic Desk Explainer | [frame 0](assets/everyday-3d/scene-desk-0.png) | [frame 85](assets/everyday-3d/scene-desk-85.png) | [frame 149](assets/everyday-3d/scene-desk-149.png) |
| Invoice to Software | [frame 0](assets/everyday-3d/scene-invoice-0.png) | [frame 85](assets/everyday-3d/scene-invoice-85.png) | [frame 149](assets/everyday-3d/scene-invoice-149.png) |
| Epic Book Storytelling | [closed](assets/everyday-3d/scene-book-0.png) | [cover half-open](assets/everyday-3d/scene-book-34.png) / [lifting leaf](assets/everyday-3d/scene-book-70.png) / [turning leaf](assets/everyday-3d/scene-book-85.png) | [frame 149](assets/everyday-3d/scene-book-149.png) |

Individual close-up stills: [walnut desk](assets/everyday-3d/object-desk-front.png), [white desk](assets/everyday-3d/object-white-desk-front.png), [laptop](assets/everyday-3d/object-laptop-detail.png), [smartphone](assets/everyday-3d/object-smartphone-front.png), [paper](assets/everyday-3d/object-paper-front.png), [invoice](assets/everyday-3d/object-invoice-detail.png), [folder opened with retained file](assets/everyday-3d/object-folder-front.png), [pen](assets/everyday-3d/object-pen-detail.png), [hardcover](assets/everyday-3d/object-hardcover-detail.png). The Playwright gallery test records two viewing angles for all nine choices.

The independently composed [9:16 invoice handoff at frame 85](assets/everyday-3d/scene-invoice-portrait-85.png) confirms device/document framing in portrait without cropping a landscape canvas.

All three MP4 exports were encoded from a Storybook capture scene and verified by the exporter's ffprobe decode gate, **150 decoded frames at 960×540, 30/1 fps, exactly 5.000 s each**. Selected opening/mid/closing frames were also extracted from the *encoded videos* and inspected after export.

| Finished video | File size | Node peak RSS during export | SHA-256 |
|---|---:|---:|---|
| [Epic Book Storytelling](assets/everyday-3d/epic-book-storytelling.mp4) | 734,433 B | 134 MB | `fe44dc415ec33c200813885d4da2442493b41e457617b118505fb72bead6f37e` |
| [Cinematic Desk Explainer](assets/everyday-3d/cinematic-desk-explainer.mp4) | 510,838 B | 132 MB | `220e16655ac63172de22b3f4cc5a99f436168dd65f3c70f4430874fe177d7f4b` |
| [Invoice to Software](assets/everyday-3d/invoice-to-software.mp4) | 544,855 B | 137 MB | `56f4a1f7fde6b347216539ed4e62beca2b3c416cf2ac92fd6107b5f9e544867c` |

Peak RSS here measures the Node export process, **not** all Chromium GPU/renderer memory. Exporter wall times were 141.4 s, 86.5 s, and 82.9 s respectively on this host; these are not hardware-independent performance budgets.

## Visual review iterations

| Finding during real frame review | Improvement implemented |
|---|---|
| Desktop shot too distant; insufficient emphasis | Re-authored scene camera establishes context then moves closer, with a separate portrait staging path |
| Phone upright and then intersecting the mat | Turned the physically authored phone onto its screen-up tabletop pose and moved its anchor entirely clear of mat and folder |
| Folder partially underneath mat, pale and empty | Gave it its own space, muted green cover stock, a real folding board/pocket and retained printed folio |
| Book upright/flat without a convincing cover opening | Added cloth-covered rounded front board, printed gilt cover, patterned lining, physical spine, stacked edges, 55-frame opening motion and a desk-grounded book pose |
| Book face blank during early opening | Retained the page block beneath the moving cover so the cover reveals the page instead of the page appearing late |
| A 150-frame MP4 technically passed, but its turning page remained visually hidden | Inspected frames decoded from the MP4, found the horizontal book used the vertical-display curl sign, reversed the desk-specific page arc and added a world-space geometry regression asserting the leaf clears the desktop |
| Invoice typography low contrast | Warmer paper stock, deeper ink, stronger row type and rules, and a readable total; retained planar detail for legibility |
| Minimal desk finish absent | Added satin-white finish with subtle surface pore relief and a Storybook variant |
| Document detail callout occluded, paper cropped during final camera push | Removed the unrelated pen, enlarged the camera envelope, strengthened selected-row highlight; visually verified the complete document in second Chromium capture |
| Invoice screen claimed successful record intake before source document arrived | Added a document-record screen view and deterministic pending/confirmed textures, switching at 80% of the shot after the transfer settles |
| Story captions crossed the table's front edge | Moved the final callouts into the unobstructed upper-left negative space pending rerender |
| Browser gallery selected two elements named "Action" | Replaced the ambiguous text selector with `getByRole('combobox', {name:'Action',exact:true})` |

These changes were judged from actual pixels. The remaining assets are stylized studio geometry, not scans of physical objects, and the broad tabletop views cannot make invoice body text readable at phone-video size without a tighter shot or an explicit 2D text layer.

## Engineering verification

| Check | Result |
|---|---|
| TypeScript (`npx tsc --noEmit`) | Pass |
| Feature unit tests | **23/23 pass** after invoice intake update; frame-addressable transfer, reversible pose, deterministic screen confirmation, physical cover and deterministic vertex curl |
| Entire unit suite (`npx vitest run --project unit`) | Latest: **153 files, 2,171 tests pass** |
| Custom Playwright Chromium browser tests | Latest hosted workflow: **8/8 pass** on real WebGL pixels, nonsequential/repeat seeks, portrait/light variants and two gallery angles for all nine object selections |
| Real FFmpeg output | Latest hosted workflow: **4/4 verified complete MP4s**, independently checked 150 decoded frames / resolution / rate / duration; encoded opening/mid/closing frames inspected |
| Storybook production bundle | `npm run build-storybook` pass |
| Registry dependency graph | `npm run registry:validate` pass, 201 items |
| 3D hero evidence gate | `npm run hero:quality` pass; **0 human-approved assets** — these remain WIP pending real human art-direction signoff |
| Isolated consumer compilation | `npm run registry:fixture -- --item=everyday-3d-scenes` pass, 3 bundled entries / 43 files |
| Catalog | `npm run catalog:check` pass, 371 entries / 795 Storybook stories |
| Lint for all touched TS/TSX files | Pass, no errors or warnings |
| Repository-wide lint | Fails on 14 **pre-existing** errors in unrelated `globe-projection.ts`, `render-cave-rocks.mjs`, `verify-nature-cinematic.mjs` (and 12 warnings); no modified source is implicated |

The repository-wide `npm test` invocation without a browser executable also attempted the existing Storybook browser project and could not launch its default Playwright download in this environment. The optional `KUMIKI_BROWSER_EXECUTABLE` setting now works for the Storybook Playwright config, Vitest browser provider, and MP4 exporter; the separate real-browser test suite above ran successfully using `/tmp/chromium`.

## Senior review, limits and follow-on work

Source review covered deterministic state ownership, data validation, material lifetime, placement units, module/registry reuse, aspect behavior, accessibility surface, external media rights and browser/FFmpeg export contracts.

- No new rendering engine or duplicate paper-curl implementation: this builds on the existing `HeroAssetViewer`, `HeroStageSet`, `technology-3d`, `paper-curl`, and `VideoExportStage` code.
- Named mesh pivots/parts and explicit `metersPerUnit` keep the scenes addressable; object and set resources implement `dispose()`.
- Scene recipes are JSON-serializable, validated, 150-frame examples that can be re-authored by ContentGen; no network or asset license dependencies in the example exports.
- Interactive actions are deterministic frame functions, not RAF state or unseeded loops. A repeated seek gives byte-identical WebGL capture in the browser test.
- Scope gaps are material: the full P0 list, scene templates 4–6, broad interaction vocabulary (stack/insert/fold/tap/connect), advanced camera/lighting authoring overrides, adaptive close-up text layout, performance budgets for large mixed-object scenes, and production-level photorealistic texture baking require further iterations. None are passed off as shipped.
- A human art director should still review the MP4s at normal playback speed before commercial publication. Automated checks and these selected stills establish reproducible rendering, not final subjective approval.

See [API and Storybook documentation](../component-specs/everyday-3d.md) for authoring examples, installation, model ownership and future boundaries.
