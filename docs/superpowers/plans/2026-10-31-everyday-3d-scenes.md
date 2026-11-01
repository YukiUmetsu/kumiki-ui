# Everyday 3D Scenes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a first, quality-focused 3D everyday desk kit and reusable cinematic storytelling scenes.

**Architecture:** Extend the existing HeroAsset scene graph, stage set, physical laptop/phone, book renderer, frame evaluator, and VideoExportStage. Compose with pure frame-timed 3D actions and screen-space readable text. No new runtime engine or external raw asset download.

**Tech Stack:** TypeScript, React, Three.js, Storybook, Vitest, Playwright, FFmpeg.

**Spec:** `docs/superpowers/specs/2026-10-31-everyday-3d-scenes-design.md` and user request.

## Global Constraints

- Preserve one absolute-frame clock and authored object identities.
- Support desktop landscape and portrait without cropping content.
- Use authored PBR materials and original text textures; explicitly own/dispose GPU allocations.
- Remain under `Video Production/Scene Templates/3D Everyday Objects` in Storybook.
- Do not merge; finish with one PR and honest visual QA evidence.

## Review Focus

- Random-access seeks must produce identical object transforms, even when requested backwards.
- Paper must clear the tabletop when lifting; a moving document must not tunnel through laptop geometry.
- Invoice and software labels must be user-configurable and remain readable in portrait.
- Renderer teardown must dispose textures/materials and not duplicate state on remount.
- Export must refuse a missing GPU or stale frame instead of writing fabricated frames.

---

### Task 1: Paper-world assets and interactions

**Files:** `registry/craft/everyday-objects-3d.ts`, `registry/craft/everyday-interactions.ts`, `tests/everyday-3d.test.ts`.

**Interfaces:** `createEverydayObject(kind, options): HeroAsset`; `evaluateEverydayAction(action, frame): Transform`; stable names for document front, folder flap, pen tip.

- [ ] Add failing tests for each builder's bounds, parts, material identities, anchors and disposal; backwards-seek invariants and invalid timing.
- [ ] Run `npx vitest run --project unit tests/everyday-3d.test.ts` and verify expected failure.
- [ ] Implement geometry/materials, Canvas2D printable face and deterministic transforms; reuse the repo's crafted surfaces.
- [ ] Run focused tests; review for physical scale and collisions.
- [ ] Commit coherent code and tests.

### Task 2: Reusable recipes and camera

**Files:** `registry/video/everyday-scenes-3d.ts`, `tests/everyday-scenes-3d.test.ts`.

**Interfaces:** `createEverydayScene(spec): HeroAsset`; `evaluateEverydayCamera(spec, frame): {position,target,fov}`; `EVERYDAY_SCENE_RECIPES`.

- [ ] Add failing tests for three recipes, serializable content, bounds, invalid input and non-linear seek.
- [ ] Run focused tests to observe failure.
- [ ] Compose the existing desk/laptop/phone plus paper-world objects; use semantic actions and camera focus.
- [ ] Run focused tests and checks.
- [ ] Commit.

### Task 3: Stories, portrait, export and visual QA

**Files:** `src/components/video/everyday-3d.stories.tsx`, `tests/e2e-storybook/everyday-3d.spec.ts`, `docs/component-specs/everyday-3d.md`.

**Interfaces:** Named Storybook preview and capture IDs for three recipes, with slider and two aspect ratios.

- [ ] Add browser assertions for exact frame seek / WebGL canvas change / portrait visibility.
- [ ] Implement concise gallery, action controls, story variants, video capture handshake.
- [ ] Run typecheck, lint, targeted/full tests, Storybook browser checks and real MP4 export / ffprobe.
- [ ] Inspect close, three-quarter and final scene frames; fix concrete visual defects found; record limitations.
- [ ] Document ContentGen API, caveats, usage, QA output paths and review findings.
- [ ] Commit, push branch, open single PR; do not merge.
