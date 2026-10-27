# Character Joint & Pose Correction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make animal and other non-human character joints draggable and correct a paused animation frame without jumps, on the same Kumiki renderer used by ContentGen.

**Architecture:** Kumiki implements immutable rig geometry and frame correction sampling, with no playback clock. ContentGen vendors the registered performer and adds an accessible SVG-backed editing surface that uses these functions. PR #41 and #131 stay separate and open.

**Tech Stack:** TypeScript, React, SVG, Vitest, existing Kumiki registry; no extra runtime dependency.

**Spec:** `docs/superpowers/specs/2026-10-26-character-pose-correction-design.md`

## Global Constraints

- Animal proportions and arbitrary part hierarchy; no humanoid limb assumptions.
- Preserve source ZIP and immutable approved revisions.
- No duplicate character renderer, media clock, or private data transfer.
- Keep controls usable via pointer and keyboard, including reduced motion.

## Review Focus

- Nonidentity rotated/scaled pivot edits must not teleport the artwork.
- A transformed parent must not corrupt child/world drag coordinates.
- Editing existing corrections must not alter frames outside the selected influence window.
- Boundary frames 0 and last frames must not create negative or duplicate keys.
- Malformed user-supplied tracks (NaN, duplicate/out-of-order frames, unknown part IDs) must not contaminate renderer state.

---

### Task 1: Pure Rig and Correction Math

**Files:** `registry/character/authoring.ts` (new), `registry/character/definition.ts`, `tests/character-authoring.test.ts` (new).

**Interfaces:** `moveCharacterRest`, `moveCharacterPivot`, `insertPoseCorrection`, `samplePoseCorrection`; all return new values and accept typed character parts/tracks.

- [ ] Write tests: rotated joint preserves sprite points; flat joint shift leaves rest; transformed parent drag round-trips; sampled correction is zero outside radius; repeated frame edits dedupe; malformed input rejects.
- [ ] Verify the tests fail because APIs are absent.
- [ ] Implement minimal pure authoring functions.
- [ ] Verify tests pass; commit on Kumiki PR branch.

### Task 2: Deterministic Playback Corrections

**Files:** `registry/character/evaluate.ts`, `registry/character/definition.ts`, `tests/character-corrections.test.ts` (new).

**Interfaces:** `CharacterInstance.corrections?: CharacterPoseCorrectionTracks`, consumed automatically by existing `evaluateCharacter` and `CharacterPresenter`.

- [ ] Write tests: correction at key, smooth neighboring frame, random-seek parity, safety limit, unknown/invalid track diagnostics.
- [ ] Verify the tests fail before implementation.
- [ ] Sample corrections before final limits, without changing old callers.
- [ ] Run Kumiki test/typecheck/lint and commit on PR #41.

### Task 3: Drag Canvas and Timeline in ContentGen

**Files:** `apps/web/kumiki.config.json`, generated vendor lock/source via existing script, `apps/web/src/features/character-studio/RigCalibrationEditor.tsx`, a focused `CharacterRigCanvas.tsx`, tests.

**Interfaces:** Existing character ZIP preview feeds safe asset URLs and definition to vendored `CharacterPresenter`; authoring state feeds joint, rest and correction track functions.

- [ ] Test coordinate transform and pointer drag logic (including scaling and parent transforms), undo/reset, influence frame insertion and save/export boundaries.
- [ ] Verify failing tests; add interactive composed preview, joint handle, rig/animate switch, frame scrub/play/pause and corrections export.
- [ ] Run frontend tests, typecheck, lint, build and report manual visual QA gaps.
- [ ] Commit to ContentGen PR #131 without merging either PR.
