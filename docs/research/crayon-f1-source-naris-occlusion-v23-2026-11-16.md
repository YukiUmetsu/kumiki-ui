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
