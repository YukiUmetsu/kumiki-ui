# AssetStateSequence (V06) — transitions between an asset's supplied states

**Scope:** Coordinates frame-ranged changes between states that an asset **already provides**. These are variant builds (a house in `new`, `aged` and `damaged` condition, an old and a replacement appliance) and pose states driven by real actions ("lights on"). It never invents geometry or morphs between different meshes.

## Install and inspect
- Registry items:
  - `asset-state-sequence`: the pure plan and evaluator.
  - `asset-state-sequence-three`: a composite HeroAsset for `HeroAssetViewer`.
- Storybook: **House Math → Asset State Sequence**.
  - A house ages, a storm damages it, it is re-roofed, then the evening lights come on.
  - A water heater is replaced with a cut.
  - A non-home bull sculpture turns into a bear; interpolation was requested, so it falls back to a crossfade.

## Minimal usage
~~~tsx
const plan = compileAssetStateSequence({ id: "roof", initial: "new",
  states: [{ id: "new", kind: "variant" }, { id: "aged", kind: "variant" },
           { id: "night", kind: "pose", variant: "aged", pose: { action: "lights-on", frame: 36 } }],
  steps: [{ state: "aged", at: 30, duration: 60, transition: "wipe" }, { state: "night", at: 120, duration: 40 }] });
const create = () => createAssetStateAsset({ id: "roof", plan, variants: { new: createHouse3D(newSpec), aged: createHouse3D(agedSpec) } });
<HeroAssetViewer createAsset={create} action="sequence" actionFrame={frame} />;
evaluateAssetStateSequence(plan, frame);   // { from, to, mix, method, label, focus, variants: [{ id, opacity, clip, pose }] }
~~~

## Contracts
- **Capabilities decide the transition.**
  - `interpolate` is possible only between poses of the same build that share one action, or that build's rest pose. It blends the action frame.
  - Different builds can use `crossfade`, `wipe` (a moving clip plane) or `cut`.
  - `hold` keeps the current state for a labeled beat.
  - If no transition is given, the best supported one is used. An unsupported request falls back explicitly (`transition-fallback`), and the resolved step records both `method` and `requested`.
- **Fail clearly.** Unknown or duplicate states, pose states without a variant or action, and builds missing from the adapter all throw. Overlapping steps are moved to the end of the previous step with a `step-overlap` error.
- **Determinism.** `evaluateAssetStateSequence(plan, frame)` is pure, and the composite asset's `pose` calls it with the action frame, so any seek order gives the same image. Each step can carry a `label` and a `focus` part id for callouts or cameras.
- **Three.js adapter.**
  - Variants are added to one group; builds in a different `metersPerUnit` are wrapped in a scale group so true size is kept.
  - Crossfades pick a method per pair: `overlay` for same-shape builds (the same part set and bounds; the leaving build stays opaque and the arriving one blends over it) and `dissolve` for different shapes (hashed alpha with correct depth). Pass `crossfade: "overlay" | "dissolve"` to force one.
  - Wipes clip both builds with one plane, along a declared axis and direction.
  - Materials are cloned lazily per build only while a build is faded or clipped, and are restored afterwards. The composite disposes every build.
- **Identity.** Semantic part ids come from the initial build, and every build's own map is in `variantParts`. Replacement subjects should keep shared ids where the physical role persists (e.g. `unit` for a replaced water heater).

## Limitations
- Each variant is a full build, so memory grows with the number of states. Prefer pose states, or a few variants per sequence.
- Dissolves show dithered grain on surfaces both builds share (e.g. a plinth). Supersampling in `HeroAssetViewer`'s `render` options smooths it.
- Wipes have no cap or seam geometry. The visual quality of transitions needs human review.
