# Crayon ArtCraft V59 — independent native-render 18-landmark observation workstation

**17 November 2026 — opt-in !dev experiment, PR #461. ART HOLD; do not merge.**

## Authentic visual references and provenance

- **Only identity reference:** [Christopher Campbell, `Brunette woman portrait (Unsplash)`, Wikimedia Commons, CC0 1.0](https://commons.wikimedia.org/wiki/File:Brunette_woman_portrait_(Unsplash).jpg). The registered image is the **608×1082 browser screenshot** with SHA-256 `f8d28cbede8c8c14f9902a328b6e979e353fd9ebe6efb454bda3152586b929c2`, from [Actions capture 43682633614](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43682633614); **not** the original full-resolution 5184×3456 camera JPEG. Do not assume a newly downloaded thumbnail has identical framing.
- **Real independent source points:** all 18 frozen photo observations in `src/video/crayon-artcraft-portrait-audit.ts`. These are **source-photo points**, not V57's actual painted-feature points.
- **Native candidate:** current experimental original-wax V54, V56 or V57, unzoomed 608×1082, frame 299, detail 0.2–1. Source anchors must never be copied to the candidate slots, inferred from ANAT1 or backfilled from the rejected synthetic 540×960 bust.

## ArtCraft deconstruction (source → measurable failure)

| Axis | Observed on the original | What V59 preserves and makes inspectable |
| --- | --- | --- |
| **Topology** | Asymmetric three-quarter eye canthi, malar height, jaw-to-chin, nasolabial structure and forehead-to-root contact | Eighteen named immutable photo anchors plus separately placed *actual-render* candidate marks; never interpolate a missing region. |
| **Vector / flow** | Forehead-hair sweep, oblique nose projection, uneven mouth axis and natural curtain fall | Full-source-camera pixel locations; reviewer can follow feature connectivity without a face-average warp. |
| **Edge** | Tapered hairline and lid contacts, nonuniform deposited material and greenery occlusion | No edges or pigments modified; original native SVG physical wax/paper remains behind a removable external HTML audit layer. |
| **Value / depth** | Five continuous face planes with warm highlights, soft socket depth, realistic iris, malar roll, undercheek and mouth occlusion | V59 **does not claim** a five-plane score: these remain separately unpassed source-photo release gates. |
| **Micro / time** | Individual hair roots and wax grain, paper tooth, foliage texture, continuous 300-frame animated deposition | Existing 267+ native hair microcurves and film untouched; the audit deliberately freezes f299 and cannot certify motion without full-film review. |

## Interactive experiment

Existing Storybook section: **Video production → Film Looks → Crayon → ArtCraft Source Lab**.

New `Cc0Anat1CandidateLandmarksV59` story: select V54, V56 or V57; 18 names in the original source order; optionally reveal/hide blue frozen source anchors; click the rendered **native** final portrait to place orange independently observed candidate feature marks; refine with accessible integer X/Y fields; clear one or all; inspect a copyable JSON worksheet. Switching candidate stages clears every candidate point (cross-version coordinates cannot silently carry over). All unmeasured fields remain missing and all output records explicitly say `independentPixelVerification:false` / `releaseApproved:false`. There is **no embedded image, baked alignment, blur, gradient replacement, extra decorative wax or new Storybook folder**.

The typed comparison in `crayon-artcraft-f1-candidate-landmarks-v59.ts` only accepts the original registered source SHA, 608×1082, f299 and 3 allowed versions. It rejects unknown/NaN/out-of-camera points and malformed render checksum. Independent candidate-pixel SHA is **not** produced by the live Storybook canvas; even an apparently perfect 18/18 observation reports `LANDMARKS_PROVISIONAL` and never verifies or approves the painting. Error is relative to original photographed face width `(501−72)=429` and height `(858−288)=570`: each candidate observation `(x,y)` is scored as `hypot((x−sx)/429,(y−sy)/570)`; inherited diagnostic threshold `0.085` is for *triage*, not production signoff.

## Release gates still open

1. Reviewer independently observes the **real final native 608×1082 PNG**, hashes its bytes, records all 18 actual candidate landmarks and audits provenance. Interactive Storybook annotations alone are not authenticated pixel measurements.
2. The exact same native screenshot must meet original-source color/shape metrics (whole original-photo SSIM ≥0.85) and five interconnected facial value planes; V57 was **0.515517**, so the quality gap is substantial.
3. Review original crayon drawing at 1× and ≥2.85× with a qualified artist, including paper tooth, hair root taper, iris and foliage contact, and **watch all 300 frames at natural rate**. Unit tests and HTML overlay are not substitutes.
4. Keep every candidate `!dev`, PR #461 **DRAFT / ART HOLD / UNMERGED** until these checks and independent artist approval are recorded.

## Engineering checks

- `tests/crayon-artcraft-f1-candidate-landmarks-v59.test.tsx` covers frozen 18-point source identity, empty default, error residuals, failure on fake evidence, CSS scale mapping, intentionally provisional all-18 results, and Storybook server render.
- This is an evidence/inspection tool, **not** a new finished crayon art asset. Do not claim portrait-quality improvement or SSIM gain based on it.
