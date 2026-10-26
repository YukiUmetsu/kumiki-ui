# Drawer and Sheet Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver accessible, configurable, premium edge overlays called Sheet and Drawer through Kumiki's registry.

**Architecture:** Reuse Base UI Dialog for Sheet and Base UI Drawer for gestures/snapping. Share motion presets and panel styling/parts, but preserve distinct behavior contracts. Expose compound parts and registrable source files with no new runtime dependency.

**Tech Stack:** React 18, TypeScript, @base-ui/react 1.9, Motion 14, Tailwind 4, Vitest, Storybook 10.

**Spec:** `docs/superpowers/specs/2026-10-26-drawer-sheet-design.md`

## Global Constraints

- Four edges; distinct Sheet and Drawer primitives; `smooth` by default; honor reduced motion.
- Source-distributed registry install must not depend on app-specific CSS or other components unless declared.
- Preserve existing Dialog/Sidebar and avoid extra production dependencies.
- No claims of visual or touch QA unless actually exercised.

## Review Focus

- Rapid controlled open→close→open cannot orphan an invisible focus trap.
- Dismissal from keyboard or backdrop restores trigger focus; modal=false allows outside interaction.
- Narrow viewport/long scrolling body does not hide footer actions or close affordance.
- User-supplied dimensions/resizing clamp at min/max and do not become negative or NaN.
- Drawer gestures cannot fight enter/exit transforms or swallow scrolling in marked swipe-ignore content.

---

### Task 1: Shared motion and panel parts

**Files:** Create `registry/ui/panel-motion.ts`, `registry/ui/panel-parts.tsx`; test `tests/panel-motion.test.ts`.

**Interfaces:** Produce `PanelSide`, `PanelMotion` and resolved CSS/Motion values; shared `PanelHeader`, `PanelBody`, `PanelFooter` and accessible close visual styles used by both overlay components.

- [ ] Write focused failing tests for presets, custom overrides, invalid dimensions, and reduced-motion fallback.
- [ ] Run `npx vitest run tests/panel-motion.test.ts` and observe expected failure.
- [ ] Implement typed motion resolution and tokenized parts with no product-specific content.
- [ ] Run the test and TypeScript typecheck; make green before moving on.

### Task 2: Desktop Sheet

**Files:** Create `registry/ui/sheet.tsx`, `src/ui/sheet.tsx`, `tests/sheet.test.tsx`, `src/ui/sheet.stories.tsx`.

**Interfaces:** Export compound `Sheet` Root/Trigger/Content/Header/Title/Description/Body/Footer/Close plus optional keyboard/pointer ResizeHandle; accepts `side`, `motion`, modal and state props.

- [ ] Write failing consumer-behavior tests for accessibility, dismissals, all edges, motion overrides, scrolling and resize.
- [ ] Run `npx vitest run tests/sheet.test.tsx` and observe expected missing API failure.
- [ ] Implement using Base UI Dialog, existing tokens and shared motion/parts; wire tested state and UI semantics.
- [ ] Run focused tests/typecheck and add interactive Storybook examples for editing, directions, long CJK and reduced motion.

### Task 3: Swipeable Drawer

**Files:** Create `registry/ui/drawer.tsx`, `src/ui/drawer.tsx`, `tests/drawer.test.tsx`, `src/ui/drawer.stories.tsx`.

**Interfaces:** Export compound Drawer parts using Base UI Drawer primitives, with direction, gestures, snap-point props, swipe-ignore support, motion contract and backdrop customization.

- [ ] Write failing behavior tests for direction, state changes, modal behavior, content semantics, snap options and swipe-ignore.
- [ ] Run `npx vitest run tests/drawer.test.tsx` and confirm expected failure.
- [ ] Implement gesture-friendly transitions and tokenized compound API; avoid duplicate focus/gesture state machines.
- [ ] Run focused tests/typecheck and add Storybook examples for bottom/mobile, side, nested content and motion presets.

### Task 4: Registry, documentation and hardening

**Files:** Modify `registry.json`, `docs/02-component-catalog.md`, `docs/INDEX.md`; create `docs/component-specs/sheet-spec.md`, `docs/component-specs/drawer-spec.md`; fix tests/files only as verified.

**Interfaces:** Install IDs `sheet` and `drawer` with all shared source dependencies; document public props, a11y, customization, limits and Storybook examples.

- [ ] Write/check a failing registry lookup/consumer fixture test before adding manifest entries.
- [ ] Register the two components, document APIs, test behavior and actual limitations.
- [ ] Run `npm run catalog:check`, `npm run registry:validate`, `npm run registry:smoke`, `npm run registry:fixture`, `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build-storybook` where supported.
- [ ] Skeptically review entire diff, reproduce/fix actionable defects with regression tests, rerun affected checks, then commit and create a PR.
