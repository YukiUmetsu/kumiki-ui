# People 3D — realistic rigged people with shared actions

**Scope:** Realistic, textured, rigged 3D people for scenes and explainers. Every person has the same seven actions, so you can swap one person for another without re-authoring the timeline. The people are third-party models (MIT, Microsoft Rocketbox) loaded through `loadGltfHero`. Nothing here is procedurally modeled.

## Install and inspect
- Registry item: `people-3d`. It depends on `crafted-3d-hero`, which ships `loadGltfHero`, the viewer and the studio.
  - `people-model.ts`: `PEOPLE_3D`, `PERSON_ACTIONS`, `personSpec`, `personWalkSpeed`. Data only; no Three.js.
  - `people-3d.ts`: `loadPerson3D(kind, options)`.
- **Models are hosted by you.** Copy `assets/models/people/*.glb` and `LICENSE-Microsoft-Rocketbox.txt` into your static files. The registry ships source text, not 6 MB binaries.
- Catalog: `npm run catalog:find -- --query="construction worker"` (or `--domain=people`).
- Storybook: **Domains → People 3D** (Casual Adult, Contractor). It has action buttons, play/pause and a frame scrubber.

## Minimal usage
~~~tsx
const contractor = await loadPerson3D("contractor");                         // serves /models/people/<file>
const custom = await loadPerson3D("casual-adult", { resolveUrl: file => cdn + file });
<HeroAssetViewer createAsset={contractor} width={1280} height={720} action="walk" actionFrame={frame} />
// Move a walking figure at the cycle's own speed so the feet don't slide:
group.position.z = personWalkSpeed("contractor") * (frame / 30);
contractor.release();                                                          // after every instance is disposed
~~~

## Contracts
| Area | Contract |
|---|---|
| People | `casual-adult` (everyday adult in a shirt and jeans) and `contractor` (bib overalls, hard hat, tool belt). Real-world scale in metres, feet on y = 0. |
| Actions | `idle`, `talk`, `walk`, `wave`, `look-around`, `think`, `crouch`. All are frame-addressable and pure in the frame, so they are deterministic for video export. |
| Rest pose | The first frame of `idle`, never the T/A bind pose. Camera bounds are measured in that pose. |
| Walk | Plays in place. `personWalkSpeed(kind)` is the measured root travel per cycle: casual adult 1.21 m/s, contractor 1.01 m/s. |
| Parts | Bones are exposed as `asset.parts` by name, using the Biped skeleton (`Bip01_Head`, `Bip01_R_Hand`, `Bip01_MJaw`, `Bip01_LEyeBlinkTop`, …). Attach props or retarget gaze from these. |
| Materials | PBR at 1024 textures. Specular is remapped to roughness. Hair and lashes use an alpha cutout. |
| Provenance | Every model is recorded in `assets/THIRD_PARTY_ASSETS.json` with a pinned source revision, every clip source and every modification. |

## Limits
- There is no pointing clip in the source library. Layer a bone pose with `onPose` for a point.
- Facial blendshapes (visemes/FACS) are not included, to keep each model under 6 MB. The jaw, blink and brow bones are present.
- Converting more people: [ASSET_SOURCING.md](../ASSET_SOURCING.md#people-and-characters).

## Acceptance evidence
- Renders: quarter, front, side and face close-up views, plus 4 frames of every contractor action and 1 frame of every casual-adult action, captured with `hero:capture` and reviewed by eye (2026-10-21).
- UI: the action buttons, play/pause, scrubber and rest were driven in a real browser with no page errors.
- Visual 3D approval (rule 10): **not recorded**. The catalog lists these entries as `not-reviewed`.
