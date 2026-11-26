# Verification: external libraries for the intake of a storybook person (2026-11-25)

Spec: [Add a person](../component-specs/storybook-character.md). Design: [character intake](../superpowers/specs/2026-11-25-storybook-character-intake-design.md).

The intake cuts a figure with MediaPipe (face and pose landmarks, selfie segmentation) and with the gaps and the ink of the painting. Three external libraries could do parts of this work. Each one ran in its own environment, outside the repository, on the 16 full-body paintings of the cast. A library goes into the intake only when it measures better and the licences of its code and its weights allow it.

| Library | Licence of the code | Licence of the weights | Decision |
|---|---|---|---|
| [SAM 2.1](https://github.com/facebookresearch/sam2) (masks from points and boxes) | Apache-2.0 | Apache-2.0 | not used |
| [DWPose](https://github.com/IDEA-Research/DWPose) (whole-body keypoints) | Apache-2.0 | tagged apache-2.0 on [Hugging Face](https://huggingface.co/yzd-v/DWPose); the model card is empty, and the terms of its training data (UBody) are not stated | evaluate more, as a check of rear views |
| See-through (layers of an illustration) | Apache-2.0 | LayerDiff3D and Marigold: openrail++ ([1](https://huggingface.co/layerdifforg/seethroughv0.0.2_layerdiff3d), [2](https://huggingface.co/24yearsold/seethroughv0.0.1_marigold)); its SAM: apache-2.0 ([3](https://huggingface.co/24yearsold/l2d_sam_iter2)) | not used |
| SDPose (pose on a diffusion model) | not run | not run | not run |

## How it was measured

- A painting and its cut figure were put in one frame of reference: x = 0 is the middle of the ankles, and the scale is the height of the card. The layers of the cut figures match the alpha of the paintings at IoU 0.957 to 0.977 in this frame.
- Masks were compared with the alpha of the painting (the whole figure) and with the layers of the cut figures (head, arms).
- Keypoints were compared with MediaPipe on the front paintings, and with the joints of the 4 rear cards, which were set by hand.
- Times are on this computer (Apple silicon), on the CPU unless stated.

## SAM 2.1

| Measure | Result |
|---|---|
| Size | 184 MB (small), 324 MB (base plus) |
| Time | 0.59 s for each painting, then 0.012 s for each prompt |
| Whole figure, one box | IoU 0.976 against the alpha |
| Head, 3 points | IoU 0.42 |
| Head, a box and points | IoU 0.91, when the best of its 3 masks is picked with our head layer; 0.58 to 0.64 when SAM's own score picks it |
| Arms, points | IoU 0.33; 0.67 with negative points on the body |
| Ears | no ear pixel of SAM's head mask is outside our head layer |

SAM's whole-figure mask is as good as the alpha, but every painting of the cast has an alpha. Its head and arm masks are worse than the cut, and its good head mask needs our cut to pick it. **Not used.** Its figure mask is worth a test only for a painting with no alpha and no white paper.

## DWPose

| Measure | Result |
|---|---|
| Size | 134 MB (keypoints, ONNX) and 217 MB (the person detector, YOLOX-L) |
| Time | 0.30 s on the CPU; MediaPipe 0.02 s |
| Front paintings: distance from MediaPipe | 15.6 px mean; hips 26 px |
| Rear views: distance from the hand-set joints | Leo 15.0 px (MediaPipe found no body); Daniel 15.1 px (MediaPipe 0.7 px: the joints of that card were set at MediaPipe's points, so this row is not an independent reference) |
| Rear views: sides | left and right are changed over on all 4 rear views |

DWPose finds a body where MediaPipe finds none (Leo from behind), but it names the sides wrongly on every rear view, so its points need the mirror that the rig gives rear views already. On front paintings it agrees with MediaPipe to 16 px and is 15 times slower. **Evaluate more**, as a check or a fallback for rear views only, after a read of the terms of its training data.

## See-through

It needs CUDA or ROCm and 8 to 16 GB of graphics memory, which this computer does not have. Its online demos would upload the owner's paintings, which is not allowed. **Not used.**

## SDPose

It is built on Stable Diffusion 2, and no licence for its weights was found. **Not run.**

## Limits

- 16 paintings, one style. A painting in another style can give other numbers.
- The head and arm references are our own cut. A library that cut better than our cut in some place would score lower there.
- The environments, the weights and the scripts of this evaluation are not in the repository.
