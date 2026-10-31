# Procedural 3D Detail Kit — manufactured detail without hand-authored mesh loops

**Status:** Implementing; renderer and manual art-direction approval pending. **Registry ID:** `craft-detail-kit`. Depends on approved `crafted-3d` materials; no Blender dependency. **Source:** `registry/craft/detail-kit.ts`. **Storybook:** `3D asset toolkit / Procedural Detail Kit` (field instrument, architectural service hatch, audio enclosure).

## Why it exists

Kumiki already provides materials, PBR studios and a fully constructed example enclosure. Those parts were hard-coded for one object. This kit extracts reusable **functional construction details**, so an AI author can add credible manufacturing finish to many box-shaped objects by changing a short data spec, not generating hundreds of repetitive Three.js meshes.

The host geometry, semantic identity, camera, scene and export clock remain Kumiki's existing systems. `createCraftDetailKit` attaches independent geometry to the six faces of a host whose world dimensions are declared. No animation loop or separate 3D engine is introduced.

## Minimal implementation

```ts
import { createCraftDetailKit } from "./components/craft/detail-kit";

const detail = createCraftDetailKit({
  schemaVersion: 1, id: "housing-detail",
  body: { width: 4, height: 1.8, depth: 2.6 },
  quality: "hero",
  features: [
    { kind: "vent-bank", id: "cooling", face: "front",
      at: [0, -.15], width: 1.5, height: .32, slots: 12 },
    { kind: "fastener", id: "mount-a", face: "front",
      at: [-.42, .38], radius: .065, drive: "hex" },
    { kind: "ribbed-grip", id: "handle", face: "top",
      at: [0, 0], width: 2.4, height: 1.35, count: 26 },
  ],
});

scene.add(hostMesh, detail.group); // hostMesh is still separately authored.
// Use existing CameraViewport3D / HeroAssetViewer at an absolute frame.
// On unmount: detail.dispose().
```

Use `options.materials` to share an approved `CraftMaterialKit` with the host. Shared materials are never disposed by the detail kit; internally created materials are.

## Supported features

| Kind | Parameters | Actual geometry | Purpose |
|---|---|---|---|
| `fastener` | `radius`, `drive: cross/slot/hex`, `collar` | Circular metal head with a real drive opening, recessed dark socket and optional mounting collar | Assembly, serviceability |
| `vent-bank` | `width`, `height`, `slots`, `direction` | Extruded plate with actual rectangular apertures, dark backing and bezel | Designed airflow grille |
| `ribbed-grip` | `width`, `height`, `count`, `direction` | Rounded PBR ribs batched in one `InstancedMesh` | Ergonomics, tactile grip |
| `seam-frame` | `width`, `height`, `thickness` | Closed four-sided, extruded compression gasket with interior opening | Panel joint / weather seal |

Every feature has a unique ID, `face` (`front`, `back`, `top`, `bottom`, `left`, `right`) and `at: [u,v]` normalized to its face (both axes `−.5…+.5`, `[0,0]` is center). All feature sizes and the host box use **the same world units**. Face axes preserve local right/up orientation as viewed from outside. The validator rejects duplicate IDs, impossible dimensions, out-of-face placement, invalid directions and runaway counts before allocating GPU resources.

`quality: "supporting"` reduces circular and bevel segments while retaining the same named parts and functional geometry. It does not remove all detail from the scene.

## Important limitations

1. **Vent slots cut through the vent's own faceplate, not the host body.** Supply a separately modeled host aperture/cavity if the camera can see through to an interior. A dark backing plate makes the default grille plausible at modest angles, but it is not a boolean cutter.
2. The kit does not turn a primitive box into a finished product by itself. Purpose-specific proportions, real controls, joints, labels, electronics, or architecture must still be authored or supplied by `kumiki-blender` where appropriate.
3. These details are correct for planar box faces, not curved bodies or arbitrary scanned meshes. Curved-surface attachment needs a separate adapter with surface normals and collision checks.
4. The components are static geometry; animation uses existing motion/part rigs and absolute-frame cameras. No fake idle motion is added.
5. The kit contains original code-only geometry and no external stock asset, texture download or Blender executable.

## QA contract

- Inspect at close-up/grazing angles: screw-drive apertures, dark cavities, real vent holes, watertight-looking bezel, consistent scale, shadows and material response.
- Verify all six face orientations and make sure the authored features do not intersect unrelated host parts.
- Test intended 16:9 and independently composed 9:16 shots, reduced-motion holds, arbitrary-frame seek parity and subject framing in the host camera system.
- Confirm `createCraftDetailKit` owns only its own geometries and internally created materials. Caller-owned PBR material kits and host meshes survive `dispose()`.
- Human render inspection is **required** before calling any example premium. A compiling Storybook story or unit test is not aesthetic approval.

## Production use

Use for a subject that is **already structurally modeled**, when the close-up still looks like a bare primitive: an instrument, a device housing, machine panel, service hatch, furniture hardware or similar fabricated object. Do not sprinkle unrelated screws randomly; every detail should follow a plausible function. ContentGen can select a detail recipe when the shot calls for close inspection of a manufactured subject. For soft organic assets, image-based 2.5D or a real sculpt is more appropriate.

## Verification — 2026-10-31

| Command | Result |
|---|---|
| `npm run typecheck` | Passed |
| `npx vitest run --project unit tests/craft-detail-kit.test.ts tests/image-relief.test.ts` | 13/13 passed, including physical faceplate holes, six-face orientation and geometry reuse/disposal |
| `npm run scenes:test` | 192/192 existing scene tests passed |
| `npm run registry:validate` | 202 items valid |
| `npm run registry:smoke` | 202 items staged in isolation |
| `npm run registry:fixture -- --item=craft-detail-kit` | 2 dependency items / 8 files compile in a fresh consumer |
| `npm run registry:fixture -- --item=image-relief-2-5d` | 1 item / 2 files compile in a fresh consumer |
| `npm run catalog:check` | Passed; new pack assigned to 3D asset toolkit |
| `npm run build-storybook` | Passed, three examples bundled |
| Focused ESLint on new implementation, stories, tests and fixture | Passed |
| Browser capture / human art-direction approval | **Pending**: Chromium is unavailable in this environment; headless browser download previously returned an invalid archive. No approved visual claim. |

The already-existing repository-wide `npm run lint` failure (14 unrelated errors in a globe file and two scripts) was not modified or used to certify this component. The next quality gate is a real close-up/grazing-angle WebGL capture reviewed by a human, ideally alongside a production object with an independently modeled host aperture.
