# Blender → Kumiki Revision Bridge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Import one existing `kumiki-blender` revision as reusable hero and inspectable assets without writing per-model code.

**Architecture:** A pure manifest validator surrounds the existing glTF hero factory. A thin factory wrapper indexes Blender `kumiki_part` extras per independent instance, retains the original animation binding/hierarchy, and returns a standard `InspectableAsset` adapter when requested.

**Tech Stack:** TypeScript, Three.js GLTFLoader, Vitest, React/Storybook, shadcn registry.

**Spec:** `docs/superpowers/specs/2026-11-02-blender-kumiki-revision-bridge-design.md`.

## Global Constraints

- Reuse `hero-gltf.ts` and `inspectable-asset-three.ts`; no new dependencies.
- Accept Blender revision manifest schema 1, not an invented new schema.
- Preserve glTF animation hierarchy, raw metric units and GPU resource ownership.
- Do not infer redistribution permissions from provenance text.

## Review Focus

- `files.model` escape attempts must be rejected before any fetch.
- Duplicate `kumiki_part` tags must produce individually inspectable nodes.
- A mismatched GLB byte count must reject the revision before parsing.
- Repeated factory instances must never share mutable transforms or actions.
- Releasing a factory after instance disposal must release shared GPU resources.

---

### Task 1: Validate Blender revision inputs

**Files:**
- Create: `registry/craft/blender-revision.ts`
- Test: `tests/blender-revision.test.ts`

**Interfaces:**
- Produces: `parseBlenderRevisionManifest(input: unknown): BlenderRevisionManifest`
- Produces: `resolveBlenderModelUrl(manifestUrl: string, manifest: BlenderRevisionManifest): string`
- Produces: `verifyBlenderModelBytes(model: ArrayBuffer, manifest: BlenderRevisionManifest): void`

- [ ] Write tests for known manifest fields, unsupported versions, malicious paths, invalid bounds/units, nonfinite or inconsistent counts, and byte-size mismatch.
- [ ] Run targeted Vitest and see expected failing imports.
- [ ] Implement the three pure functions and run the targeted tests green.
- [ ] Commit the contract and tests.

### Task 2: Wrap the GLB importer with semantic part indexing

**Files:**
- Create: `registry/craft/blender-asset-bridge.ts`
- Test: `tests/blender-asset-bridge.test.ts`

**Interfaces:**
- Consumes: `parseBlenderRevisionManifest`, `loadGltfHero`, `inspectHeroAsset`.
- Produces: `loadBlenderRevision({ manifest, model }, options?): Promise<BlenderRevisionFactory>`.
- Produces: `loadBlenderRevisionFromUrl(manifestUrl, options?): Promise<BlenderRevisionFactory>`.
- `BlenderRevisionFactory` creates independent `BlenderHeroAsset`s, exposes metadata, `createInspectable(hero)`, and `release()`.

- [ ] Test duplicate tags, part lookup, inspector bounds, behavior on absent tags and mismatched counts, independent instances and cleanup.
- [ ] Run tests to see expected failures.
- [ ] Implement wrapper without changing glTF node parentage or existing `loadGltfHero` API.
- [ ] Run targeted tests green and commit.

### Task 3: Public registry and Storybook proof

**Files:**
- Create: `src/craft/blender-asset-bridge.stories.tsx`
- Create: `docs/component-specs/blender-asset-bridge.md`
- Modify: `registry.json`, `docs/INDEX.md`

**Interfaces:**
- The registry ID `blender-asset-bridge` installs dependencies needed by the wrapper.
- Storybook demonstrates a real Blender-exported first-party fixture with camera + lighting inspector reuse.

- [ ] Register the exact public source files and dependency IDs.
- [ ] Add a Storybook fixture with a real first-party Blender GLB/manifest, semantic selection, and the reusable camera/lighting panel.
- [ ] Write usage, rights, axis, animation, ownership and incomplete parity notes.
- [ ] Run typecheck, targeted and full unit tests, Storybook build, catalog/registry validation and install smoke.
- [ ] Commit and open a PR without merging it.
