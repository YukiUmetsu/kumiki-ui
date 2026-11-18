# ArtCraft F1 V23 — source-specific near/far naris occlusion

**Research / opt-in only. New PR after experimental foundation #281.**

Reference: [CC0 Christopher Campbell brunette portrait](https://commons.wikimedia.org/wiki/File:Brunette_woman_portrait_(Unsplash).jpg), exact 608×1082 source screenshot SHA256 `f8d28cbede8c8c14f9902a328b6e979e353fd9ebe6efb454bda3152586b929c2`. Real source nose observed in x320..505/y510..705: asymmetric hooked near undercut x388..423/y623..651; compressed far slit x448..462/y616..645. [V22 Chromium](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43810584516) failed human visual review; floating dark circles and weak columella, SSIM on native nose crop ≈0.556.

## Five axes
- **Continuity:** near/far roof and dark cavity each share exactly the same reverse Bezier controls and preserve native paint ordering. No new elements.
- **Flow:** near 24° alar wax marks and far 66° slanted wax follow unequal anatomical wing orientation, not mirrored two circles.
- **Edge:** deep core remains opaque wax under the cutout; overlying skin roof uses feathered *open* CRAYON1 dry wax, not bright pasted borders.
- **Width:** near cavity 42×36; far narrow 20×38; independent silhouettes, intensity and gradients.
- **Microtexture:** inherited fiber-to-paper wax contact, stochastic tooth, varied pressure/spacing, no photo filter/blur.

ANAT1 crosswalk: `FACE_LANDMARKS.sellion/pronasale/subnasale/alare.R/alare.L`. Labels are anatomical checks only, **not** a claim that canonical ideal geometry fits the real photo. All prior F1 human experiments remain available as negative controls. Five old source-native nodes plus three connecting underplane/value nodes reauthored in V23; no changes to character ID, paper, camera, text, unrelated detail, or 300-frame timing.

Storybook: same Video Production / Film Looks / Crayon / ArtCraft Adult Face Lab with reversible V23 selector and 3× focused story. Vitest covers ANAT1 mapping, joined cubic edges, original orders, CRAYON1 contracts and fail-closed malformed inputs. Playwright captures a source-native 608×1082 1× and 3× f299 A/B against V22; screenshot success is NOT a fidelity pass.

**Gate:** 18 independently annotated landmarks, native source SSIM ≥0.85 with official ArtCraft 9.1 script, five-value-plane match, real visual approval, and 300-frame playback remain unverified. Keep PR draft and implementation unapproved. Prioritize improving whole-face silhouette rather than further arbitrary hatching if V23 still reads as detached.

## First CI correction (native Node ESM)

Initial V23 browser proof [43814046830](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43814046830) failed before rendering: importing the ANAT1 runtime face module also imported a large JSON mesh that Node ESM requires a JSON import attribute for. The actual geometry uses only the landmark *keys*; replacing the unnecessary runtime import with a **type-only ANAT1 key contract** preserves compiler validation without loading the mesh JSON. This is a real compatibility correction, not a weakened test or an aesthetic claim. Re-run source-native browser proof after this change.

## Independent V23 screenshot comparison / artistic failure

[Native Chromium proof run 43814285587](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43814285587), artifact **14202291895**. V23 browser proof and typecheck **PASS**, tests 5/5 **PASS**, but actual reviewed 1×/3× screenshots against the exact CC0 source remain artistically **REJECTED**: cavities are still dark floating blob marks with almost no attached projecting nose silhouette, far lid structure flat; the visible eye, mouth, jaw, hair in the unmodified figure remain highly stylized and unqualified. No ArtCraft portrait-accuracy pass.

The following numbers are independent **scikit-image diagnostic RGB SSIM** on identically sized actual Chromium pixels (NOT official ArtCraft 9.1 measurement); higher is closer, and no score constitutes passing:

| Region | V22 previous control | V23 new | Observation |
|---|---:|---:|---|
| Full 608×1082 | 0.361942 | 0.362045 | Negligible gain, fails ArtCraft threshold |
| Nose x340..493/y570..684 | 0.556352 | 0.560533 | Small improvement but obviously planar |
| Near recess x389..415/y628..645 | 0.181470 | 0.191905 | Still badly off |
| Far recess x448..465/y620..645 | 0.133233 | 0.357623 | Directionally better but still looks a dark stamp |
| Dorsum x367..434/y554..620 | 0.679942 | 0.676100 | Regression |
| Underplane x412..451/y627..664 | 0.512152 | 0.546808 | Improved local tonal structural match |

## V24 — measured source nasal value relief

V23 dark negative-space by itself is insufficient. Independently sampled the actual CC0 photo and exact V23 native screenshot at the same original x/y pixel positions; 7×7 RGB medians: (386,615) source [242,203,182] vs V23 [201,155,142] (bulb too dark); (415,614) source [183,138,115] vs V23 [205,160,145] (far dorsum too light); (434,608) source [164,128,117] vs V23 [211,171,153]; (405,631) source [29,4,4] vs V23 [140,103,93] (core cavity overpainted); (427,644) source [149,97,75] vs V23 [184,138,125] (columella too light).

Experiment (opt-in `source-nasal-relief`): strengthen **original native wax-lit convex dorsal pad on the left**, add dark warm far-side turn using an existing `nose-sidewall-form` instead of a new oval, connect real columellar underplane, and preserve exact V23 near/far cavity topologies and all previous versions. Seven preexisting semantic CRAYON1 surfaces are reauthored. Changes are local, no photo pixel overlay, no new nodes, 300-frame pose and default figure stay unchanged. Same Storybook folder adds 3× macro, negative-control Vitest and actual Playwright comparison.

V24 unapproved; only actual render inspection, independent 18 landmarks and official ArtCraft 9.1 source SSIM ≥0.85 followed by original-source manual comparison can authorize promotion. This test must not silently relax human fidelity standards.
