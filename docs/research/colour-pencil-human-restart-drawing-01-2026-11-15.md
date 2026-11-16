# ArtCraft Colored Pencil: retire the old woman; one new human at a time

## Decision (2026-11-15)

The user rejected the previous woman portrait as a reference and instructed a **complete restart**, one character/drawing component at a time. The existing woman (hair, eyes, lips, ear, clothes, shadows and material marks) is **not a basis for the new character**. This PR deletes the entire old `face()` geometry and all its bespoke visual microhelpers from the active living-study renderer. The Studio does not offer any old portrait close-up, and unit/browser QA must reject all old woman part IDs.

## Drawing 01 — only the neutral head mass

Construct an anonymous *new* head from scratch, with a fresh ANAT1 468-vertex geometric base. Use the reusable public geometric source `createFace({calibrate:false,...})`, not the old `pencilPortraitAnatomy()` preset, its oval paths, or its original camera/seed/artist/color choices. Project the new base at a distinct 11.5° yaw using a new size and position, then extract the connected facial oval boundary. Build exactly one editable native colored-pencil region:

- `head-construction`: uninterrupted cranial/zygomatic/gonial/chin mass with three restrained contour/plane guides, three independent CP-F1 skin pigment layers, original paper tooth, and 16:9/9:16 animation timing.
- **Do not draw** eyes, nose, mouth, hair, accessories, clothing, or old portrait details yet. The purpose of Drawing 01 is to inspect the base head form. No photographic compositing or editing.
- The existing subject string `portrait` remains for Storybook/consumer compatibility, but now explicitly means *new human head construction*, not the old woman. The red fox and landscape remain unchanged.

## Five-axis ArtCraft inspection

| Axis | Drawing 01 gate | Reject |
| --- | --- | --- |
| Topological continuity | One continuous closed 468-mesh-derived outline, no child regions or detached feature islands. | Multiple legacy face/hair/eye/lips/cloth geometry layers. |
| Vector flow | Three small original pencil guides align along cranial midline and cheek/jaw contour. | Arbitrary original woman's eye/mouth/parting strokes. |
| Weight | Three shaded skin pressures define the major mass, subtly differentiated underjaw and cheeks. | Flat photographic fill or high-contrast makeup. |
| Rhythm | Natural asymmetric three-quarter jaw silhouette and independently timed guides. | Perfect icon oval or mirrored artificial symmetry. |
| Texture | True native CP-F1 stipple on skin, editable SVG, no bitmap, deterministic animation. | Source photo stylization or pasted generated image. |

## Gates and next drawing

- Unit: exact **one** named region, nonempty bounded silhouette, three physical layers, no old region IDs, seed/pressure determinism, both aspect ratios and invalid-control rejection.
- Playwright: the existing Studio focuses `human-head` at 1×/2.15× in both aspect ratios. Assert no old woman parts, no image/foreignObject, and reversible zoom.
- **ART HOLD** until exact-native browser render is actually inspected. This is not a finished human or full portrait.

**Next: review the head silhouette independently**, correct skull/zygomatic/chin proportions if the render looks flat, then draw *one* next anatomical component in a separate PR, using an appropriate new reference. Do not restore the discarded woman, reuse her face, or create several features at once.

## 2026-11-15 reconciliation with pencil reset PR #444

The original 'head-construction' (11.5° front-face-only ANAT1 mask) was a parallel, incomplete Drawing 01 and is superseded by [PR #444](https://github.com/YukiUmetsu/kumiki-ui/pull/444). The active head is now 'head-silhouette-01', in 'src/video/colored-pencil-first-character.ts'; it retains the underlying 468-point ANAT1 lower-face projection but adds a separate eight-anchor cranial vault instead of treating MediaPipe's clipped forehead as an entire skull. The old source image and character geometry remain prohibited. No facial feature is authorized yet.

The merged Storybook keeps the original fox/landscape QA and anatomical checkpoints, while replacing head checks with the new projected nine-point overlay. Actual native screenshots of the previous draft showed a weak geometric shield and global hatch grid; the latest unverified candidate changes ONLY the head's pencil deposition and contour. **Art gate remains REJECT / HOLD** pending fresh 1×/2.15× render, source-licensed comparison, code tests and independent approval. Neither the earlier opaque main head nor the new transparent candidate is a finished illustration.
