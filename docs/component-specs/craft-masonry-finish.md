# UV-independent Masonry Finish — object-space brickwork for WebGL

**Installable pack:** `craft-procedural-environments`. **API:** `applyCraftMasonryFinish`, `validateCraftMasonryFinish`, `CraftMasonryFinishOptions`; source `registry/craft/masonry-finish.ts`. Works with existing `MeshStandardMaterial` or `MeshPhysicalMaterial` under the installed Three.js WebGL renderer. No texture images, UV unwrap, Blender, external download, custom render loop or additional draw call. **Status:** structurally and shader-hook tested; actual GPU/human material appearance and performance review pending.

## When to use

Use for brick or small-block exterior walls in an establishing/medium architectural shot, especially where the flat masonry finish made the approved native façade geometry look unfinished. **Do not apply to glass, smooth stone trim, roofs or polished wall panels.** The adapter uses the surface normal to suppress the pattern on horizontal faces; material assignment must still be intentional. A close-up of historic brick, cracked mortar, wet walls, custom bonds or exact restoration work requires a sourced PBR finish or authored geometry.

`createCraftFacade` now uses this finish on its masonry zone by default. Turn it off with `masonry: false` for minimalist facades or custom replacements. The Street Corner Storybook has an on/off material comparison with the same camera, geometry, glass and road scene.

## Minimal recipe

```ts
import { createCraftFacade, applyCraftMasonryFinish } from "./components/craft/environment-generator";

const facade = createCraftFacade({
  schemaVersion: 1, id: "brick-block", seed: 41,
  height: 27, footprint: { width: 13, depth: 11 },
  masonry: {
    brickLength: .6, brickHeight: .3, jointWidth: .024,
    mortarColor: 0x6a6257, colorVariation: .08, relief: .009,
  },
});
scene.add(facade.mesh);
// On teardown: facade.dispose().

// Also works on a *separately owned* masonry MeshStandardMaterial:
applyCraftMasonryFinish(myMasonryMaterial, { brickLength: .6, brickHeight: .3 });
```

### What the shader does

| Part | Behavior |
|---|---|
| Scale | Object-space X/Z projection selected by the wall normal; brick courses follow local Y. Default module **.6 × .3** scene units, matching the native generator's coursing dimensions. |
| Bond | Alternate rows shifted by half a brick. Deterministic material-local variation by brick cell and seed, not a repeating image. |
| Mortar | Adjustable **.004 to 24%** of smaller brick dimension; neutral/muted mortar RGB. Small roughness increase and a shallow **normal-only** recessed seam. No real cut geometry. |
| Distance | Uses screen derivatives (`fwidth`) to antialias mortar and fade color/normal detail before the brick period becomes subpixel. |
| Materials | Applies after vertex color, before physical roughness/normal calculations. Doesn't touch glass, trim, interiors or per-frame scene state. |

Bounds: `brickLength` **.2–2**, `brickHeight` **.1–1**, `colorVariation` **0–.24**, `relief` **0–.025** scene units; `seed` is a safe integer. Bad inputs fail before modifying the material. A material may be decorated only once; the shader hook composes with existing `applySurfaceDetail` when masonry is applied first. A material being physically transmissive or glass-like is a caller error, not a masonry finish setting.

## Acceptance gate

In Storybook **3D asset toolkit / Procedural Environments / Masonry Detail**, inspect an oblique moving-camera close-up with adjustable joint width and brick variation. Then in **Street Corner** compare **Running-bond masonry** enabled/disabled, especially `detailed` vs `no-masonry` in `npm run craft:review`. Check brick scale against window bays, mortar seam width under close/medium output, corners and chamfers, no crawling/jagged lines on moving camera, sensible shading under a grazing light, and 16:9/9:16 pixel density. The renderer must be reviewed on actual GPU/browser output with human signoff; source compilation and frame hashes do not establish premium finish. [Visual review](../verification/craft-environment-visual-review.md).
