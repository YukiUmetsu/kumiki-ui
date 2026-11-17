# ArtCraft CRAYON1 V53 — source-continuous ocular profile, not cartoon eyeliner

**2026-11-17 · PR #461 · !dev / ART HOLD / do not merge.**

Original licensed photograph: [Christopher Campbell CC0 brunette portrait, Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Brunette_woman_portrait_(Unsplash).jpg). Exact photographed source screenshot **608×1082** SHA-256 `f8d28cbede8c8c14f9902a328b6e979e353fd9ebe6efb454bda3152586b929c2`; cannot claim original JPEG. Medium: [Mould et al., dry wax deposits and paper tooth](https://people.scs.carleton.ca/~mould/papers/crayon-cgf.pdf).

## Source observation and 3D anatomical constraints

The actual independently observed original CC0 near-eye crop `(197,500,326,592)` shows:
- Lateral eye junction around `(214,556)`, medial junction `(317,545)`. Eye axis tilts ~11 pixels upward to the medial corner; cannot replace with a symmetrical horizontal ellipse.
- Upper eyelid tarsal fold root near `(265,535)`, upper crease near `(275,519)`; lower palpebral roll near `(260,569)`.
- Iris center `(261,552)` under the real upper tarsal lip, partly occluded above, with much more continuous shaded lower contact than V52's icon-like perfect circle.
- Sclera is uneven: modest darker exposed lateral sclera, broad cool reflected medial patch, not flat white triangle. This is **one connected human eye** in ANAT1 perspective, not 2D symbols.
- Upper tarsal rim, lash roots and infraorbital crease follow the same oblique photographic axis and must be animated beneath the original brow and parent face. Distinct dark pigment contacts and natural lower-marginal turn remain native wax grain.

The candidate changes *only the source-space closed cubic path/bounds* of six existing ANAT1 wax surfaces: `sclera-near`, `iris-near`, `pupil-near`, `upper-lid-near`, `lash-root-near`, `lower-lid-near`. Each traces four connected original-source cubic sectors (no straight taper polygon); perspective and nesting derive from V46 `crayonF1Anat1OrbitalGeometryV46()`. It preserves every original surface material, pixel-tooth, colors, pressure, timing, hair/foliage/brow curve, iris masking, source registered V52 camera/seed, and original **300-frame film**. No added element or photo bitmap. Source geometry is a hand-traced hypothesis requiring independent pixel validation, not an automatically registered identity scan.

## Independent source-original native screenshot audit: V53 REJECTED (2026-11-17)

Native Chromium actual 608×1082 f299 screenshots at `fe17e4b1855b1139cad7cd107261a480ea9ab706`: [source-native V52/V53 PNG archive](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/44133632266/artifacts/14350428992); browser proof and drawing grammar passed. Independent original CC0 source SHA above, unmodified image coordinates, `skimage.metrics.structural_similarity(...channel_axis=2,data_range=255)`, raw RGB: whole source SSIM `.508340→.508173` (negative), near-eye `.457208→.447735` (negative), near iris `.531234→.458938` (**negative**), lower eyelid `.515208→.468721` (**negative**). Only superior eyelid source crop `.352696→.356361` (+.003665) and RGB MAE 42.645→39.592 improve. Original far eye, crown and foliage pixels identical. Actual 2.85× screenshot still shows a flat triangular sclera and disc-like iris; connected cubic geometry did not provide photographed realism. **ART REVIEW: V53 rejected as whole-eye candidate, leave opt-in only.** New V54 selectively tests upper lid/lash paths alone, retaining ALL V52 sclera/iris/pupil/lower-lid shapes. Do not mistake technical tests for art acceptance.

## Engineering and release QA

Three `!dev` interactive Storybook views (full, near-eye 2.85×, face 1.6×). Unit tests ensure all six modified shapes have connected cubic control structure and are source-bounded; other elements and all original 267+ hair fibers are byte-identical; bounds, parent/child topology, source SHA, repeated application protection, deterministic detail .2/1, all 300 frames, and physical wax contact remain correct. Real Chromium native 608×1082 f299 A/B screenshot vs V52 and 2.85× near-eye screenshot; independently compare same source SSIM/MAE near-eye, near iris and whole. Reject V53 if actual original likeness worsens: source fidelity is mandatory, passing typecheck/render is insufficient.

**ArtCraft original identity is still below approval** until five contiguous facial skin value planes, 18 *actual rendered* source landmarks, hair/face/foliage shape correctness, full natural-speed 300-frame playback and independent human artist review pass. Keep PR #461 **draft and unmerged**.
