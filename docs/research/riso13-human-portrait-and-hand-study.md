# RISO13 — Figure anatomy and source-linked performance

Status: implementation candidate, **artistic approval pending**. Based on the nine Risograph print studies in [RISO12](riso12-human-character-reference-atlas.md). No third-party artwork is copied, bundled, traced, or used as character data. All SVG geometry below is original.

## Research to geometry handoff

| Required shape grammar | Authored geometry/animation | Anti-example / QA |
| --- | --- | --- |
| Organic eye sockets, distinct lid edge and tear/lower-plane relationship | `eye-socket-planes` screen ink, expression-aware `eye-upper-lid-folds`; existing lower lid and irises preserved | An identical almond symbol for every face state; test separately at 46/78/160/198 |
| Connected nose bridge and alar region | Updated nose contour, nose-bridge tonal shape, right nostril-wing, tiny philtrum marks | Floating solid nose triangle or whole-face semi-transparency |
| Facial mass and hair growth | Forelock with root whorl hatching, temple shading, asymmetrical left ear and chin tonal mass | Hair as an uninterrupted helmet with decorative disconnected lines |
| Opposable thumb and separated fingers | Left/right palms; independently jointed thumb, index, middle, ring, attached inside each palm contour; separate small knuckle lines | Mitt-shaped palm with painted four strokes simulating four fingers |
| Fabric drape tied to stress locations | Two neck/lapel shadow folds, independent chest-to-hem pleat shafts, preserved underarm and waist areas | Arbitrarily aligned stripes outside coat silhouette |
| Material-native spot printing | Blue/red spot separations, original paper-backed face knockout and stage-anchored halftone dots; interactive density probe in study | Lower actor alpha or global additive grain masquerading as print |

## Source regions and actual rig

- `COURIER` preserves its original root, torso, head, limb IK, satchel handhold and 240-frame, 2-frame cadence. Eight added named digit joints are descendants of left/right hands. Each digit has its own pose keys that do not affect the FK/IK wrist placement. The palm contour covers each digit's root; its natural grouping is documented in `src/video/riso-character-mesh-sheets.ts`.
- Five body/face regions and source-contour edge placement are independently authored per region. Newly added brow/eyelid, nose, jaw and hair planes are not static sprites.
- A four-column neutral/blink/speak/smile construction contact sheet, with face and hand crops, is an additional story in the **existing** `Video production/Film Looks/Risograph` Storybook CSF. No new folders or runtime engines.
- Study-only dot-size controls explore the spot density visually but do not change production printer profiles, measured halftone calibration, or registration in physical output.

## ArtCraft five-axis review gate

This is a style-guided, not a pixel-copying task.

1. **Topology:** every digit root must remain within the authored palm; all named regions map to the construction sheet; face paper clearance remains intact across ink passes.
2. **Flow:** cheek/eye/nose curvature follows head anatomy, while coat strokes orient from neck/shoulder/waist; digit attachment pivots follow the parent hand's transform.
3. **Stroke pressure:** closed tapered curves use intentionally varied widths, including in finger creases and chin shadows; printed spot ink remains at full authored opacity.
4. **Optical rhythm:** preserve varied hair-whorl and garment pleat lengths; avoid uniform parallel lines as a substitute for anatomic forms.
5. **Microtexture:** test default halftone and sample at altered dot densities. No quantitative reference-relative texture gate is claimed without aligned source/candidate image crops and professional acceptance.

Automated validators can check structure, joint parentage, path validity, determinism, opacity and some collision invariants, but **cannot certify world-class figure drawing**. Preserve any critical review failures as defects, never lower geometry gates to declare success. For multi-view turnaround or realistic three-segment finger motion, independently authored studies are still required.

## Scope accomplished vs outstanding

- P0 facial geometry: **first source-linked hero-face pass**, not a certified 3/4, true side or back design.
- P1 hand: **independent digit-root joints** for index/middle/ring/thumb on each hand; intermediate and fingertip knuckle-joint chains and physical grip-force/collision solving are not implemented.
- P2 garment: **more anatomical folds**, not dynamic cloth simulation; body yaw/torso turns remain unapproved.
- P3 ensemble: **not part of this source-geometry slice**. A second independently designed human with an interaction/contact sheet is still required; duplicating the Courier and calling it a new person fails the ArtCraft bar.
- P4 medium: **interactive spot density study** integrated into existing Storybook. Physical plate-trap calibration, raster loss/ink gain and screen-angle measurement remain outstanding.

## Verification checklist

1. `npm run typecheck`; `npx vitest run --project unit tests/riso13-anatomy.test.tsx tests/riso-artcraft-characters.test.tsx tests/riso-character-model-sheets.test.tsx tests/riso-opaque-characters.test.tsx tests/riso-character-paper-clearance.test.tsx`.
2. `npm run build-storybook`; Playwright tests for the new anatomy sheet and existing ArtCraft/film actor/opacity/Storybook navigation in real Chromium.
3. Real forward/shuffled/reverse frame seek checks; 16:9 and 9:16 production stills; real exported 240-frame (8s) MP4; independently inspect face visibility, joint/skin overlap and scene readability.
4. Only after quality proof passes and expensive QA workflow returns to manual-only, merge. Do not bundle third-party reference pixels.

## References (technique only)

- [Uma Joana — *Let's Look at the Trailer II*](https://ogaleria.com/products/lets-look-at-the-trailer-ii-by-uma-joana): cheek/face and hair tonal hierarchy.
- [Mayumi Tsuzuki — *Spring Spring*](https://www.tagboat.com/products/detail.php?product_id=62444): face/garment depth through separations.
- [Amy Matsushita-Beal — *Hold on a Sec*](https://www.giantrobot.com/products/giant-risobots-amy-matsushita-beal-hold-on-a-sec-risograph): hand and body overlap.
- [Mina Braun — *Group Hug*](https://peopleofprint.com/best-of/pop-member-showcase-21-riso-prints/): ensemble silhouette and contact topology.
- [Natalie Andrewson — *The Seamstress*](https://www.natalieandrewson.com/products/6-makers-series-risograph-prints): figure-to-ground contact and fabric stress.
