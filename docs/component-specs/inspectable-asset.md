# InspectableAsset (V01) — uniform inspection of 2D/3D assets

**Scope:** A small adapter contract from [16 — House Math](../16-house-math.md). It is not a third asset model. Existing `HeroAsset` and layout/illustration sources keep owning geometry. `InspectableAsset` exposes what cameras, callouts, section reveals and flow paths need.

## Install and inspect

- Registry items: `inspectable-asset` (renderer-neutral) and `inspectable-asset-three` (adapter for any `HeroAsset`).
- API: `npm run catalog:api -- --id=inspectable-asset --format=json`
- Storybook: **House Math → Inspectable Asset** shows a house, a bank and a laptop through one interface. Existing hero assets need no changes.

## Interface

~~~ts
interface InspectableAsset {
  id: string; dimension: 2 | 3; metersPerUnit?: number; revision: string;
  parts: InspectablePart[];            // id, parentId, label, role, hideable, ghostable, clippable, stateIds
  anchors: InspectableAnchor[];        // id, partId, kind: "label" | "focus" | "port", medium?
  capabilities: { sectioning: "none" | "isolate-ghost" | "clip" | "preauthored-caps"; explodable; canGhost; flowPorts; stateful };
  getPart(id); children(id); subtree(id);
  getBounds(partId, frame): { min, max };     // world, absolute integer frame
  getAnchor(anchorId, frame): { position, normal? };
  listStates(): string[];
}
~~~

- `createInspectableAsset(definition, samplers)` validates and wraps a definition. It throws on duplicate IDs, missing parents or parent cycles, anchors on missing parts, undeclared part states, and capabilities claimed without data: `flowPorts` with no port anchor, `stateful` with no states, clip sectioning with no clippable part, `canGhost` with nothing ghostable, or 2D depth clipping. `validateInspectableDefinition` returns the same findings as diagnostics.
- Samplers are called per absolute frame. Returned bounds are checked for dimension and finiteness, so an invalid sample throws rather than propagating.
- `inspectHeroAsset(hero, { parts, anchors, states, capabilities, poseAt })` measures real mesh bounds after the caller's deterministic pose. Anchors authored in rest space follow their part (rest → current transform), so a label on a sliding sash stays attached.
- `inspectableCameraTargets(asset, partIds, frames)` produces dense world-bound samples for `createCameraTargetRegistry`, linking parts to the existing cinematic camera system.
- 2D assets use `[x, y]` and never invent Z. `metersPerUnit` is only meaningful for physically scaled 3D.

## Limitations

- Bounds are axis-aligned and measured from visible meshes. A part whose meshes are all hidden reports its origin as a zero-size box.
- Anchor normals transform with the part's motion, but no occlusion is computed here. Callout layers decide visibility.
- Ownership and disposal stay with the source asset. The adapter holds no GPU resources.
