# Chinese Ink Historical Character Studies Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Add three source-led Ming/Qing Chinese-ink character studies using the ANAT1/EXPR1 foundations and an interactive Storybook reference atelier.

**Architecture:** A standalone portrait renderer starts from the 468-point ANAT1 face mesh and applies three reference-informed landmark morphs. EXPR1 drives live expressions. A dedicated Storybook atlas shows the redraws, source images and six-state expression strip without importing ANAT2/ANAT3 artwork or changing the Shanshui cast.

**Tech Stack:** React, TypeScript, SVG, ANAT1, EXPR1, Vitest, Storybook, Playwright.

**Spec:** docs/research/chinese-ink-ming-qing-character-study-2026-11-17.md

## Global Constraints
- Use ANAT1's 468-vertex face surface and EXPR1 action-unit deformation.
- Do not apply unvalidated population norms or infer ancestry from artwork.
- Build three independent identities; do not reuse ANAT2, ANAT3 or Shanshui character paths.
- Use only the Met Public Domain references documented in the spec.
- Preserve paper reserve, irregular washes, pressure variation, individual hair/beard fibers and source-aware garment silhouettes.
- Add no dependencies and do not replace production characters.
- Reject non-finite geometry and invalid character/expression/intensity/detail controls.

## Review Focus
- Yaw and far-eye foreshortening must not collapse eyelid/iris geometry.
- EXPR1 mouth opening and brow movement must remain coherent across all six expressions.
- External museum image failures must not break Storybook controls or source links.
- At 1×, hair/beard and washes must remain legible without hard stickers or parallel-line noise.
- Metadata must not identify unknown sitters or imply validated population measurements.

---

### Task 1: Reference-led geometry and expression contract

**Files:** create tests/ink-ming-qing-character-studies.test.tsx; create tests/e2e-storybook/ink-ming-qing-character-studies.spec.ts; modify .github/workflows/ink-shanshui-qa.yml.

**Interfaces:** consume ANAT1 createFace, FACE_FEATURES, FACE_LANDMARKS, faceFeatureLines, measureFace, eyeCentres; EXPR1 expressEmotion, expressionMarks, expressionFeatures, irisPositions; ANAT1 view renderMeshFrame, projectPoint, smoothPath. Produce INK_MING_QING_CHARACTERS, INK_MING_QING_EXPRESSIONS, buildMingQingPortraitGeometry(character, emotion, intensity), InkMingQingCharacterStudy.

- [ ] Write failing Vitest contract: three distinct source IDs, distinct measured proportions, separate beard/pinned-hair structures, projected ANAT1 feature curves, all six EXPR1 states, finite SVG output and invalid-control errors.
- [ ] Add unit and browser test paths/commands to the Chinese Ink workflow.
- [ ] Run targeted workflow and verify RED because the renderer module is absent, not because tests/workflow are malformed.
- [ ] Commit tests, workflow wiring and research study.

### Task 2: Original ANAT5 portrait renderer

**Files:** create src/video/ink-ming-qing-character-studies.tsx; test tests/ink-ming-qing-character-studies.test.tsx.

- [ ] Implement three source-specific ANAT1 morphs for scholar, seated writer and attendant using landmark-local falloffs for face width, lower third, jaw taper, eye spacing, nose width and mouth width.
- [ ] Implement 3D yaw projection and EXPR1 mapping for outline, eyelids, brows, nose, lips, gaze and expression marks.
- [ ] Draw independent attached ink layers for cap/pinned hair, ears, skin washes, beard/hair fibers, neck, collar and robe folds.
- [ ] Run targeted Vitest and typecheck; expect finite paths and visibly distinct geometry.
- [ ] Commit renderer.

### Task 3: Interactive Storybook atelier and browser evidence

**Files:** create src/video/ink-ming-qing-character-studies.stories.tsx; test tests/e2e-storybook/ink-ming-qing-character-studies.spec.ts; append implementation/evidence to the research study.

- [ ] Build source atlas with Met IIIF images, credits, rights labels, object-record links and technique notes. Controls must work if external images fail.
- [ ] Add live expression contact sheet and responsive portrait/reference layout.
- [ ] Add Playwright coverage for characters, expression selection, intensity, source cards and screenshots.
- [ ] Run the full Chinese Ink workflow: typecheck, unit, registry/catalog checks, Chromium Storybook and film export.
- [ ] Inspect actual browser screenshots at 1× and 3×; record concrete defects. Tests alone do not establish artistic acceptance.
- [ ] Commit Storybook and evidence.

## Execution Notes
- The existing PR branch is the isolated work branch; the default branch is untouched.
- ArtCraft v9 local SKILL.md bodies are not present in the connected repository/file library. This plan follows accessible Art Mastery v5/v6 guidance and the user's Library package inventory/installation notes; it does not claim to have loaded unavailable skill bodies.
- No local checkout or shell runner is exposed. Targeted RED/GREEN verification will use GitHub Actions; if the workflow or artifacts are unavailable, report that limitation.
- No merge until CI and actual browser evidence are reviewed. If source-relative 1×/3× artistic acceptance cannot be established, keep the PR in draft/ART HOLD.
