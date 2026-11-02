# Blender → Kumiki Revision Bridge

## Intent

An agent that creates an asset in `kumiki-blender` should be able to use the
result in any Kumiki-UI 3D viewer, story, or video without reimplementing a
model-specific Three.js loader, semantic part index, inspection hooks, or
animation adapter. The existing Blender exporter already writes a portable
`model.glb` and a versioned `manifest.json`; the existing Kumiki GLB loader
already provides frame-addressed animation and asset lifecycle management.

## Approaches

1. **Bare GLB import:** simplest, but discards the revision integrity metadata,
   authored part roles, provenance, and the difference between duplicate part
   instances. Not selected.
2. **Manifest-aware consumer bridge:** validate the existing Blender revision,
   import the existing GLB, expose stable per-instance and role-based part
   lookup, and create an `InspectableAsset` on demand. **Selected:** one
   reusable boundary and no Blender-side schema or output migration.
3. **New producer and consumer formats:** could support authored anchor and
   camera metadata later, but introduces two synchronized schemas and risks
   diverging from the already-audited revision manifest. Deferred.

## Contract

- Read `schema_version: 1` revisions produced by `kumiki-blender`'s
  `export_revision`, including `asset_id`, the contained `files.model` path,
  `output_bytes`, `glb_audit`, `named_parts`, and metric units. Optionally read
  `bounds_m`, generation details, and source provenance. No generic execution
  or parsing of Blender Python files.
- A strict validation function rejects unsupported schema versions, missing
  or unsafe paths, invalid sizes/IDs/bounds, and contradictory audit counts.
- A ready-to-use async factory loads the GLB from a supplied ArrayBuffer or
  URL and returns independent `HeroAsset` instances, exposing source revision
  metadata and deterministic named `kumiki_part` grouping. Repeated tags
  remain separate instances; nothing reparents animated nodes.
- `createInspectable` builds the existing V01 inspector over the live instance,
  with instance IDs and renderer-native bounds. Camera/lighting presets remain
  owned by the reusable inspector added in PR #54.
- The convenience URL loader resolves the model relative to the manifest,
  fetches a bounded buffer and checks its exact recorded byte size before
  invoking GLTFLoader. Reject traversal and foreign absolute asset paths.
- A caller is responsible for an accurate license declaration. Manifest
  provenance is surfaced, never interpreted as independent rights clearance.
- The factory owns shared GPU resources and exposes `release()`; each instance
  exposes its ordinary `dispose()`.

## Scope

One registry-installable adapter, a focused Storybook demonstration with a
clearly identified original first-party Blender revision, unit tests for invalid
metadata, multiple tagged instances, animation compatibility and cleanup,
and a consumer example. No dependency on Blender at runtime. No alteration
to Blender's exporter or its revision format. No claim of Blender/Three
lighting parity, automatic rig retargeting, or photorealism.

## Verification

Unit tests, TypeScript typecheck, Storybook build, registry validation and
clean install smoke. A real Blender export/structural import is required, with
real offline preview stills. Browser WebGL and Blender material/lighting
parity remain separate visual signoff gates.
