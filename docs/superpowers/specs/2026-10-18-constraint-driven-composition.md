# Phase 2: constraint-driven visual composition

Implement the requested additive public composition API over the merged visual constraints. Keep MG1 as the only clock and CC1 as the only camera planner. Existing consumers retain their behavior.

## Stage

`ExplainerStage` owns a bounded, responsive canvas (landscape, portrait or auto at 600 CSS px). `ExplainerVisual` fills it; authors declare normalized semantic subject regions, optionally with portrait bounds. `protect` resolves IDs explicitly. `ExplainerText` accepts essential plain text, typography through normal CSS, language and a line budget. One visual and one text slot keep the first API small. Direct slots only; invalid structures are actionable errors.

A pure `planExplainerLayout` resolves subjects and calls `placeProtectedText`. The React boundary measures actual loaded DOM typography, including letter spacing, and supplies the same metrics to the planner. Resize, content/style changes and font loading invalidate layout. Pending text is hidden, impossible text remains readable outside the scene with an alert, and no text is truncated or silently shrunk. Expose status and diagnostics, refs, DOM attributes and styles. No mandatory global CSS.

## Camera

An optional third compiler argument declares critical subject intervals and trajectory-based tracking windows. Reuse `inspectCriticalCameraFrames` and `deriveSemanticTrackingWindow`; strict default sampling is every integer MG1 frame for opted-in requirements. A tracking requirement must name a follow shot targeting the moving subject and covering the derived lead/tail interval. Failure returns existing compilation diagnostics, never an unverified plan. The controlled React director accepts the same contract and target registry to guard precompiled plans once per input change. No runtime pose solver or retiming engine.

## Verification and scope

Test landscape/portrait, multiple protected subjects, unknown IDs, invalid dimensions, missing metrics, long/CJK text, explicit impossible layouts, font/resize invalidation, moving-target tracking, critical subjects and unchanged two-argument compilation. Add Storybook examples and browser geometry assertions, CI on main/PRs, registry distribution and documentation. No new dependencies. Guarantees cover declared rectangles and sampled geometry, not arbitrary occlusion or aesthetics. No LLM calls or image recognition in checks.
