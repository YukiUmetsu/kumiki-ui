# ArtCraft F1 V38 — source-observed dark hair volumes, crown and curtain light fields

**2026-11-16 · NOT ART-APPROVED · !dev · PR #461 DRAFT.**

Source licensed CC0 1.0 photograph by Christopher Campbell: [Brunette woman portrait (Unsplash)](https://commons.wikimedia.org/wiki/File:Brunette_woman_portrait_(Unsplash).jpg). The only independently byte-verified source used is the **608×1082 browser screenshot** SHA256 `f8d28cbede8c8c14f9902a328b6e979e353fd9ebe6efb454bda3152586b929c2` (not full-resolution original camera JPEG). V37 source-native 1×/3× source comparison: [artifact 14273974764](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43963594146/artifacts/14273974764).

## Authentically observed hair, not a flat cartoon wig

The actual photographed hair has **strong value hierarchy**: brown-black eumelanin root masses, fine warm reflected strands at the left crown and side, very deep near-black at the center part and hanging side walls. V37's native hair has physically good 3D-contiguous four-volume silhouettes and numerous individually curved fibers, but its massive crown and hanging right curtain are uniform light taupe/gray. Source original and native V37 independent median 9×9 RGB at matching source pixels:

| Physical position | Original CC0 photo | V37 Chromium wax | Observed defect |
|---|---|---|---|
| Crown shadow x278,y215 | (47,36,30) | (162,133,112) | crown 100+ RGB too pale |
| Crown near root x295,y270 | (48,34,31) | (153,130,113) | missing dark root |
| Left shadow x36,y555 | (52,29,22) | (90,76,72) | too uniformly light |
| Left warm shine x40,y364 | (92,63,50) | (109,89,82) | highlights need to be sparse |
| Far hair roots x450,y354 | (61,44,37) | (123,102,89) | too pale and separated |
| Right vertical lock x532,y707 | (61,41,31) | (105,85,76) | too pale for face occlusion |
| Right lower lock x571,y894 | (46,28,21) | (122,97,84) | uniformly pale rather than black-brown |

**Five-axis physical art deconstruction**:
1. **Topology:** Reuse EXACT original four native hair wax regions `hair-back`, `hair-crown-surface`, `hair-left-curtain`, `hair-right-curtain` with unchanged spatial Bézier envelope and the complete original grouped source-directional hair subcurves. No new primitive wig, uniform stripe, speculative missing skull, hair fibers pasted over skin or new hair rig.
2. **Vector flow:** The original author's six source-traced crown, near and far directional hair guide bands remain exactly path-identical; 85 left, 130 right and 52 crown short cubic fibers at detail=1, clipped to their correct native parent hair wax in grouped CRAYON1 compounds. Root and angular glints change values only, not topology. Natural parting and gravity-dependent curved flow stays intact.
3. **Tactile medium:** Reuse native wax pressure/deposition/feather and native separate fine dry-wax `hair-rooted-(crown|left|right)-0..5` grouped contours. All 18 grouped microstructure strokes remain: their cubic d, parent, clip, timing, width and waxContact/pressure are unchanged. No custom SVG filters, alpha maps or sampled photographic pixels.
4. **Tonal volume:** Correct just four wax palettes/physical underpaint gradients: physically deep hair interior `#100d10–#20191a`, mid-brown curl `#3e2e29`, selective warm highlight `#825c46`. Use solid, tooth-bearing underpaint with native opaque burnish to avoid the broad translucent pale skin/background color leaking into the hair. Preserve separately differentiated muted warm 6-band contour pigment and existing hair strokes.
5. **Fine details / temporal art:** Every original V37 ANAT1 cheek, eyes, nose, mouth, individual rooted eyebrow hair, source photograph canthus, 300 frames, paper tooth, color continuity and original source camera untouched. This is one reversible opt-in `midfaceForm:"source-anat1-hair-values"` that follows V37 source-rooted brows, never overwrites default or rejected V33/V34.

**Verification**: New four-suite unit checks source SHA and independently sampled hair values, unchanged exact facial graph, hair paths/clip, fail-closed bounds, native detail=1 and .2, timing, Storybook full/face states. Native Chromium f299 source camera 1×/3× comparison V37↔V38 captures actual pixels; independent photographic SSIM must be measured in crown, left, right, whole portrait against the original screenshot with the V37 control on the same exact head. **Do not claim success based on typed tests or screenshots alone.** The hair being darker is not proof its outline, skin reflections, face identity or high-frequency grain resemble the photo.

**ArtCraft release gate**: previous global source-image SSIM ≈0.365 vs required ≥0.85. This standalone hair experiment cannot pass whole-face realism by itself. Independent final-render 18 landmarks, five matched facial value planes, full continuous natural-speed 300-frame review and human artist approval remain blockers. Keep PR #461 DRAFT / unmerged and !dev Storybook study quarantined.

## V38 follow-up — reproducible matched A/B Storybook (2026-11-16)

The existing **ArtCraft Adult Face Lab** now has an additional `Cc0HairValueABV38` story. It renders both the **V37 control** and the **V38 pigment experiment** at the same absolute frame, source dimensions, seed and CRAYON1 camera. Select independently inspected full (1×), crown, left curtain or right curtain (2.85×) views; scrub or play the shared 300-frame timeline. This is a diagnostic control, not another approved or exposed character.

The native hair color calibrator now rejects duplicate six-band source fiber ids and detached/missing source hair volumes, but correctly accepts sparse, non-contiguous allocated pigment bands at low detail. The source's seeded per-strand band selection is *not* guaranteed to fill all six slots at detail=0.2; falsely demanding contiguous bands broke earlier CI. Both material and source structure remain intact; no additional source image, CSS brightness filter, flattened silhouette or new render clock is introduced.

**Unchanged art hold:** V38's measured whole-photo SSIM ≈0.406 remains below the existing >=0.85 portrait acceptance threshold; source-registered final-render landmark measurement, five genuine tonal planes and complete continuous 300-frame artist review are still missing. A/B availability and CI do **not** replace independent 1×/3× visual comparison or establish artistic quality.
