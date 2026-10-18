# 14 — 3D Visual Fidelity & Asset Craftsmanship

**Status:** mandatory art-direction and acceptance contract for future 3D work; the typed schema and automated gates below are **proposals**, not implemented registry APIs. **Scope:** optional 3D components, models, scenes, thumbnails, product visuals, cinematics and explainers; **not** ordinary 2D/UI consumers. [08](08-motion-graphics.md) owns motion, [11](11-rendering-quality.md) owns scene/export and renderer QA, [13](13-content-creation-integrations.md) owns third-party assets/licenses. This document owns **what credible, crafted 3D geometry, materials, illumination and close-up results must demonstrate**.

## 1. Default: finished 3D assets, not primitive placeholders

**Do not mark a hero or prominent 3D object complete because a few boxes, tubes and a color identify it.** Details must follow function, manufacture, material and viewing distance. The target is deliberate, professional art direction, not universal photorealism. Deliberately abstract diagrams, blockouts and low-poly/stylized work are valid **when the creative direction says so**; label the intent and show that the simplification supports the lesson. Unreviewed primitive-only 3D is a draft, not an accepted final.

For each visible asset, establish its **semantic role** and **fidelity tier** before modeling:

| Tier | Visibility and required evidence | Quality expectations |
|---|---|---|
| **Hero** | Sustained focus, product reveal, readable close-up; inspect close/three-quarter/grazing-light views | Designed silhouette and believable proportions; macro + meso construction; purposeful small-scale details visible at the final screen size; multiple credible materials/surface responses; authored roughness/normal/bump detail where appropriate; finished back/side areas the camera reveals; correct joins and scale; professional light response. |
| **Supporting** | Recognizable in medium shots; can become hero after a camera move | Distinct construction, thickness/bevels, joints, ports/fasteners/vents where functionally relevant; at least meaningful material separation; roughness variation and purposeful detail; acceptable under zoom. |
| **Background** | Small screen footprint, never tightly inspected | Recognizable silhouette/material category, coherent scale and lighting; simplified geometry or instancing and appropriate LOD. No wasted tiny geometry at subpixel scale. |
| **Abstract / educational** | Intentional visual language instead of realism | Clear authored abstraction, readable topology, stable identities and material/color roles; no random complex decoration; complexity must clarify the concept. If zoomed into, it still needs carefully designed edges and surfaces. |

**Promotion rule:** when camera framing changes and an object becomes prominent, promote its fidelity tier or use a compatible high-detail LOD; never expose an unfinished low-detail asset in a close-up.

## 2. Six inseparable craft layers

1. **Silhouette and proportions:** study recognizable references or document original design intent. Model correct relative scale, mass, thickness, ergonomics, curvature and intentional negative space. Functional objects have fronts/backs, attachment points and plausible construction.
2. **Construction geometry:** model a meaningful hierarchy, not just a shell: housings, bevels, seams, layered panels, openings, slots, sockets, screws, rails, lens stacks, fasteners, legs, cabling and interfaces as appropriate. A surface with a visible cavity often needs geometry or a convincing normal/depth technique, not a painted rectangle. Avoid repeating decorative detail unrelated to the object's function.
3. **Surface identity:** distinguish polymer, glass, rubber, brushed/anodized metal, ceramic, paint, fabric and emissive elements through calibrated PBR roughness/metalness, normals/bump and optional AO/displacement. Give materials material-specific microstructure: machining direction on metal, molded grain on polymer, coherent glass/optics and edge response. Noise pasted uniformly across every material is not craftsmanship.
4. **Texture quality:** use purposeful, high-resolution and consistent-texel-density UVs when texturing; stable procedural alternatives are acceptable. Include meaningful roughness variation, normal/bump scale, coherent repeat scale, clean seams and controllable variation. Decals, fingerprints, wear, dust and scratches are **optional scene-specific storytelling details**, not default grunge. Pin assets and author their provenance/licenses. Keep texture resolution appropriate to camera distance, not universally maximal.
5. **Lighting and physical response:** use motivated key/fill/rim and contact cues, reflections, shadow softness, consistent exposure/color management and grounding. Validate with a neutral studio setup and the final cinematic setup. Lighting should reveal bevels and surface structure without excessive bloom/glow, blown highlights or crushed-black materials. Treat environment maps as licensed, versioned assets, not anonymous network downloads.
6. **Composition and motion:** test actual camera shots, silhouette against the background, depth and separation, annotation occlusion, focal hierarchy, motion speed and detail visibility. Close-up geometry must remain convincing while moving; no intersecting, levitating or clipping elements unless intentionally exploded and labeled.

For conceptual systems, structural detail is allowed to communicate **metaphor**, but captions must not claim invented internal components are real hardware.

## 3. Material and geometry should be reusable first-class resources

Build general-purpose optional 3D resources rather than creating private material helpers for each film. **Proposed contracts, not shipped APIs:**

```ts
type FidelityTier = "hero" | "supporting" | "background" | "abstract";
type ArtDirection = "studio-realistic" | "premium-stylized" | "technical-abstract";

interface SurfaceDefinition {
  id: string;
  family: "metal" | "polymer" | "glass" | "rubber" | "ceramic" | "paint" | "fabric" | "other";
  // Immutable references to pinned PBR maps or deterministic procedural recipes.
  maps?: { baseColor?: string; normal?: string; roughness?: string; metalness?: string; ao?: string };
  proceduralRecipeId?: string;
  physicalScale: number; // Document mapping to world units and UV scale.
  version: number;
}

interface AssetCraftSpec {
  id: string;
  tier: FidelityTier;
  artDirection: ArtDirection;
  role: "subject" | "support" | "environment" | "concept";
  geometryRef: string;
  surfaceIds: string[];
  details: Array<{ id: string; purpose: string; geometryRef?: string }>;
  lodRefs?: Array<{ level: number; geometryRef: string; intendedView: string }>;
  exceptions?: Array<{ requirement: string; reason: string }>;
  evidenceRefs?: string[]; // Captures/review notes; never substitute for inspection.
}
```

Design future source-distributed optional items only when reuse across several scenes warrants it:
- **SurfaceLibrary:** versioned brushed metal, polymer, coated metal, ceramics, optics, glass, rubber, fabric, emissive surfaces, with configurable physical scale and PBR controls.
- **DetailKit3D:** measured bevels, seams, panels, perforations/vents, grilles, ports, screw and fastener families, sockets, lens elements, gaskets, labels and edge trims. Components express function and sizing, not random ornament.
- **AssetAssembler3D:** layered named hierarchies, attachment transforms, stable semantic object IDs, predictable disposal and material/geometry sharing.
- **LightingRig3D:** reusable studio key/fill/rim setups and lighting diagnostics with explicit exposure/tonemapping; adapt to scenes, never force one look.
- **AssetFidelityInspector:** static metadata/asset/LOD checks plus camera-aware screenshot checklist; cannot assert visual quality solely from code.
- **Asset catalog and LOD policy:** polished reference models, instancing/shared meshes for repetitions, bounded triangle/texture/draw-call memory budgets, higher detail when subjects approach camera.

Allow GLB/glTF assets and authored external textures where licensed and pinned; procedural geometry can be excellent but is **not an obligation to generate every asset from primitives**. Use the most effective source method for the target quality. Isolate Three.js/GLB tooling behind optional adapters and preserve deterministic animation from existing MG1.

## 4. Generation and review workflow for AI coding agents

A 3D task has these deliverables **before** it may be called complete:

1. **Art direction brief:** subject role/tier, real-world or visual references, intended style, main camera distances, visual hierarchy, materials, detail density and performance target. For unfamiliar designs, inspect references; don't invent physical features that contradict the explanation.
2. **Geometry plan:** visible silhouette and at least the meaningful major subassemblies. Identify meso-scale physical details that provide authenticity and which ones can use surface/normal treatment instead of full geometry. Model layered parts with correct thickness/placement and deliberate variation.
3. **Material plan:** identify each material family, roughness/metalness, physical texture scale, map/procedural source, whether wear/decals are appropriate and how materials respond to the lighting rig. A base color plus arbitrary roughness number is **not** a finished hero material.
4. **Early render gate:** produce representative hero close-up and medium shot, including a grazing-light view that reveals surface and edge quality. Fix blank shapes, wrong scale and repetitive materials **before** implementing long animation sequences.
5. **Camera integration:** prove the final authored shots do not reveal missing faces or simplified proxy geometry; labels and silhouettes remain legible at intended output size and both aspect ratios. Camera planning should not conceal missing asset quality.
6. **Optimization:** share geometries/materials/textures, batch **static** details with matching materials/compatible vertex attributes where safe; instance large repetitions; add LOD/culling where beneficial. Measure GPU/browser impact, don't infer frame rate from CPU-only evaluation. Preserve independent semantic IDs on animated targets.
7. **Evidence and report:** link camera-close and whole-scene renders, selected frame numbers, asset source/provenance and actual test commands/results. State deliberate simplifications, unsupported surface effects, GPU/memory limitations and visual issues not inspected.

**Hard stops for prominent assets:** default primitive-only placeholder, untextured uniform material regardless of context, absent material differentiation, badly stretched/repeating texture, unrealistic part intersections, obviously wrong scale, missing close-up sides, essential detail invisible at final delivery size, arbitrary grunge/glow as substitute for detail, or a claim of realism without inspecting rendered frames.

**No cargo-cult thresholds:** a hero must have enough meaningful construction and surface nuance for its shot, not an arbitrary minimum count of screws, materials or polygons. Quality is judged from imagery plus asset intent, not merely source shape statistics.

## 5. Quality inspection matrix

For each **hero**, and for supporting assets that enter close/medium framing, examine:

| View / condition | What must be checked |
|---|---|
| Neutral studio, three-quarter | Silhouette, physical hierarchy, proportion, materials, natural edge highlights, plausible construction. |
| Close-up at delivery pixels | Bevels, seams, roughness/normal detail, texel density, decals, actual feature geometry and no polygon faceting. |
| Grazing-light side and back | Micro-surface response, normals, thickness, unintended intersections, material discontinuities, stretching/repetition. |
| Key film shots, start/mid/end | Detail visibility, shadow grounding, focus, occlusion, identity preservation, moving part clearance and stable textures. |
| 16:9 and 9:16 + reduced-motion | Subject visibility and readability without masking low-quality assets through distant framing. |
| Stress: zoomed camera / alternate light | No glaring missing topology or baked-in fake highlights; explain intentional stylization. |
| Performance and disposal | GPU frame-time, draw calls, triangles, texture memory, compilation time, stable seeking, no leaks under remount. |

Run testable static checks (missing material/texture refs, duplicate IDs, unsupported maps, zero bounds, missing LOD refs and disposal ownership); **manual or image-based visual review is still required**. Golden frames catch regressions, not universal beauty. Record numerical environment and thresholds per production; do not claim an unmeasured 30/60fps target.

## 6. Network Journey benchmark application

The reference film is a **stress test of this contract, not the home of its reusable algorithms**:
- **Phones:** real layered bezel/glass/body, functional side controls, camera lens stack, speaker/charging cutouts, believable reflections and brushed/painted surface differentiation.
- **Routers:** measured scale, vent banks, ports/contact pins, screws, antenna bases, status lights, feet and distinct polymer/metal response.
- **Messaging service:** three clearly labeled **conceptual** modules with structural hardware cues (enclosure, rails, connectors, faceplates and vents) without falsely representing an actual internal architecture.
- **Packet hero:** clear identity, deliberate trim/glow balance, readable foreground shape and controlled deformation/scale; background traffic uses inexpensive variants.
- **Environment:** intentional stage construction, seams/floor texture and grounding, coherent lights, subtle network paths and believable physical scale. Don't substitute neon pipes for informative forwarding structure.
- **Optimization:** share deterministic DataTextures and materials. Batch static details while retaining independent moving objects, release merged geometries and textures. Inspect close-ups after batching to ensure face normals/material indexing and shading survived.

Existing `src/network-journey/journey-surfaces.ts` and `journey-device-details.ts` are **first concrete prototypes**, not proof of this standard across Kumiki. Their generated roughness/bump data is a first pass, not a replacement for real normal/roughness/UV review, functional design, reference assets or human visual acceptance.

## 7. Agent completion criterion

For every new 3D asset or scene, answer in the completion report:

**What is this object made of? Which details prove its construction? What visible surface information differentiates its materials? What does its closest intended shot reveal? Which simplified views are intentional? What actual rendered views were inspected? What did realistic GPU playback cost?**

If the required evidence is missing, label the asset **WIP / not visually accepted**. Never label the system or asset premium, realistic or production-quality based on geometry code alone.
