# Crayon ArtCraft F1 — V64 source-led oral aperture study

**Status:** opt-in `!dev` hypothesis; ART HOLD; not approved for release.

## Visual diagnosis

The V63 full-camera native screenshot shows a recognizable portrait, but the mouth reads as a digitally open smile. Three pale, detached enamel marks compete with the lip contour. In the frozen CC0 source, the visible mouth is a narrower oblique aperture: the upper vermilion partially occludes the teeth, the enamel glimpse is connected and low contrast, and the lower vermilion carries fine directional texture.

The V64 changes are a focused correction to this one local construction problem. They are not a claim that the face is anatomically complete or photorealistic.

## Implementation

`src/video/crayon-artcraft-f1-oral-aperture-v64.ts` patches only existing oral elements over V63:

- Narrows the mouth aperture with a tapered, oblique Bézier boundary.
- Replaces three bright enamel lozenges with smaller, warm-grey, low-contrast wax shapes.
- Adds a connected upper-vermilion overhang clipped to the aperture.
- Softens the upper/lower lip pigment transitions and increases lower-lip directional wax ribs.
- Preserves all non-mouth elements by object identity. No source pixels, face geometry, hair, paper, camera, seed or timing are introduced or changed.

V64 is selectable in the existing Crayon ArtCraft Source Lab and in the V60 native-PNG candidate manifest. It remains reversible; V63 is the unchanged negative control.

## Native evidence protocol

The source-native Playwright capture now renders V56, V57, V63 and V64 at 608×1082, frame 299, detail 1. Each captured PNG receives a V60 JSON sidecar containing the SHA-256 of the actual browser screenshot bytes. The same Actions artifact also includes the exact frozen CC0 source screenshot, after its SHA-256 is verified.

For an honest V64 review, use the exact three-file set from one artifact:

1. `artcraft-source/cc0-source-608x1082.png`
2. `v58-photo-native-V64-299.png`
3. `v60-native-candidate-V64-299.json`

The V62 paired review bench verifies the source PNG against the frozen hash and validates the candidate bytes against the V60 sidecar. Blue source anchors remain on the source image only; orange candidate observations must be entered manually on the V64 PNG. Do not copy the V63 or source coordinates.

## Acceptance gates

- Native capture must complete on the same commit as the V64 renderer and paired review UI.
- Inspect mouth at native 1× and 3× against the source; reject if the aperture reads as a smile sticker, if the tooth shapes remain detached, or if the upper/lower vermilion loses anatomical continuity.
- Check adjacent facial regions for seams or accidental overlap; the unit contract verifies non-mouth elements remain unchanged.
- Independently observe the 18 candidate landmarks on the actual V64 native PNG. A sidecar with 0/18 marks is capture provenance only, not geometry validation.
- Review the entire 300-frame film at normal speed for temporal flicker and wax-contact stability.
- Keep V64 experimental until a qualified independent artist approves the full composition and material behavior.

## Current limitations

V64 is a hand-authored shape/material hypothesis, not a source-measured mouth segmentation or a validated photometric reconstruction. Unit tests prove scoped mutation, clipping and microstructure contracts; they do not prove likeness. Whole-source SSIM remains below the research target and cannot by itself judge artistic quality.

**No release approval. No merge approval.** The next decision must be based on the byte-verified V64 native screenshot and independent visual review, not on the presence of the new component or passing unit tests.
