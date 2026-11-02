# Blender Asset Bridge

**Registry item:** `blender-asset-bridge`  
**Storybook:** **3D asset toolkit / Blender Asset Bridge / Interchange Fixture**  
**Source:** `registry/craft/blender-revision.ts`, `registry/craft/blender-asset-bridge.ts`

Bring a revision exported by [kumiki-blender](https://github.com/YukiUmetsu/kumiki-blender)
into any Kumiki hero viewer, 3D scene, camera/lighting setup, inspectable part
UI, or frame-addressed video recipe using one loader. The companion project
already exports `model.glb` with glTF extras named `kumiki_part`, plus an
audited `manifest.json`. No new Blender exporter or runtime dependency is
needed in the browser.

## Build and import

```bash
# In kumiki-blender, with Blender 4.2+ installed and a reviewed original spec:
KUMIKI_RENDER_PROFILE=smoke python3 -m kumiki_blender build-asset \
  --spec examples/desk-lamp-assembly-v2.json --output /path/to/revisions/lamp/r01
python3 -m kumiki_blender audit-revision \
  --root /path/to/revisions/lamp/r01
```

Serve the intact directory at a stable URL (for example,
`/assets/lamp/r01/manifest.json` and `/assets/lamp/r01/model.glb`). In a
Three.js/Kumiki consumer:

```ts
import { loadBlenderRevisionFromUrl } from "./components/craft/blender-asset-bridge";

const factory = await loadBlenderRevisionFromUrl(
  new URL("/assets/lamp/r01/manifest.json", location.href).href,
  { license: "Original authored geometry; rights verified by the project." },
);
const hero = factory(); // standard HeroAsset, so existing viewers/recipes work
const screws = hero.semanticParts.get("base-fasteners") ?? [];
const inspected = factory.createInspectable(hero);
const firstScrew = inspected.parts.find(p => p.role === "base-fasteners");
if (firstScrew) console.log(inspected.getBounds(firstScrew.id, 0));

// The viewer/scene disposes hero; release only once all instances are gone:
hero.dispose();
factory.release();
```

In an editor use the same `CameraLightingInspector` and
`CameraLightingPreset` from the portable camera/lighting kit on the
`HeroAssetViewer` that already accepts `createAsset={factory}`. You do not
need a Blender-specific camera control implementation.

When the caller already has files or an ArrayBuffer, use
`loadBlenderRevision({ manifest, model: glbArrayBuffer }, options)`; both
entry points return the same factory. GLB animations automatically become
`factory.actions` and `HeroAsset.pose` actions. To sample an animated part
at a specified frame, use
`factory.createInspectable(hero, { actionId: "actual-clip-name", fps: 30 })`.
Without `actionId`, inspection measures the current pose of the instance.

If the Blender revision contains a physics bake and the manifest declares
`files.motion: "baked-actions.json"`, **the URL loader fetches and validates that
PM2 sidecar automatically**. The same one-line manifest import provides
`factory.actions` and `factory.bakedContactEvents(actionId)` without an agent
writing any asset-specific fetch or animation code. Hosted GLB/PM2 files must
remain at their paths relative to `manifest.json`. To disable auto-loading,
pass `{ bakedActions: [] }`; a supplied nonempty list overrides the sidecar.
See [offline physics and material-to-SFX integration](baked-physical-motion.md).

### Physically grounded actions

The optional `physicalActions` loader field adds validated PM1 physics-inspired
actions without editing Blender node hierarchies. Targets can be semantic roles,
individual `kumiki:<role>:<instance>` IDs, or grouped sibling parts rotating
about a shared semantic hinge. The adapter preserves imported glTF animation;
`sourceActionId` composes a physical action after a selected glTF clip.
The resulting actions work through `HeroAsset.pose`, `HeroAssetViewer`,
`createInspectable`, and `bakeHeroActionClip`. Exact ballistic impact timing and
speeds for sound design are returned by `factory.physicalEvents(actionId)`.
See [PM1 API, units, accuracy limits and Storybook QA](physical-motion.md).

## Asset semantics and normalization

- The Blender exporter writes metric coordinates in its native Z-up space;
  glTF/Three.js imports Y-up and the existing hero loader centers geometry
  horizontally and sets the lowest subject point on Y=0. `hero.bounds` and
  inspection bounds use this normalized hero group space. The manifest's
  `bounds_m` remains native Blender coordinates; do **not** compare them
  component by component to the normalized hero bounds.
- A `kumiki_part` tag may mark many nodes, e.g. dozens of fasteners.
  `hero.semanticParts.get("fastener")` returns all actual Object3Ds, and
  `hero.parts` contains individual aliases `kumiki:fastener:1`,
  `kumiki:fastener:2`, etc. The aliases refer to original loaded nodes;
  no animated hierarchy is flattened or reparented. Repeated tags are
  addressable individually in V01 inspection, SectionReveal and ghost/isolate
  effects. `hero.parts` intentionally uses only canonical semantic aliases;
  `hero.namedNodes` preserves original named glTF nodes for lookups without
  stealing mesh ownership from a tagged parent. The manifest's `named_parts`
  summary can group *component types* (e.g. `detail.radial-studs`), while
  GLB extras use authored component IDs (e.g. `base-fasteners`). Query the
  actual semantic map rather than treating type-count keys as object IDs.
- These IDs follow deterministic glTF traversal order. For stable
  cross-revision part identity, the Blender author should assign distinct
  semantic tags or stable named assembly nodes; ordinal instance IDs can
  change when the glTF node order changes. Inspection cache revisions include
  a deterministic GLB content fingerprint (not a security hash) so a rebuilt
  model with the same asset ID invalidates old inspection samples.
- Asset factories share immutable mesh/material data but allocate separate
  scene nodes, animations and transforms for each instance. Dispose each
  instance, then call `factory.release()` once to release shared GPU data.

## Safety, evidence and limits

- `manifest.json` must be schema 1 with safe contained GLB paths, meter
  units, nonempty named parts, and matching GLB/manifest byte counts and
  semantic node counts. URL import rejects path traversal or foreign model
  references, streams the manifest/GLB with immediate size limits (1 MiB
  manifest, 512 MiB hard model cap, exact declared model size). Declared PM2
  sidecars have safe relative `.json` paths, a 32 MiB cap and exact byte
  validation before being parsed. The loader verifies
  the **actual** GLB resource list for forbidden external buffer/image URIs
  before invoking GLTFLoader. This is an interop/integrity check, **not**
  cryptographic authenticity or visual QA.
- A producer-side `audit-revision` checks the actual files and GLB envelope;
  callers should run it before serving an asset. The browser cannot verify
  a `.blend` source file or automatically certify modeling quality.
- Manifest `provenance` is descriptive. A third-party imported model needs
  independently reviewed usage/redistribution rights, an accurate license
  declaration, and any required attribution. Showing a model is not proof
  that its source files may be redistributed in a public registry.
- The Storybook example uses a **real Blender 4.5.4-exported**, first-party
  procedural desk lamp and its original audited GLB/manifest; it is not a
  cinema-quality model. [Real-export QA and preview stills](../verification/2026-11-02-blender-bridge.md).
- Blender-to-Three lighting, exposure, tone mapping, Cycles shaders, camera
  focus and texture rendering can differ. Studio lights are intentionally
  excluded from the exported GLB. Use portable camera/lighting presets for
  the target viewer and review actual Blender and browser renders side by
  side. Supported Blender 4.5.4 export and structural Three.js import were
  checked, but browser material/render parity and human visual approval
  remain separate release gates.
