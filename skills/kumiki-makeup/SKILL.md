---
name: kumiki-makeup
description: Use when drawing, rendering, designing or reviewing makeup or beauty on any face in Kumiki in any art style (rendered portrait, pencil, woodblock, cel, riso, photo) — foundation, concealer, contour, highlight, bronzer, blush, eyeshadow, eyeliner, mascara, brows, lipstick, gloss, face charts, colour for a skin tone or undertone, looks for face and eye shapes, or applying makeup to a photograph.
---

# Kumiki makeup (MAKEUP1)

The pack `makeup` decides *where each product goes on this face, which colour suits this skin, and how strong the
light and shadow are*. Your style decides how it looks. Read the [spec](../../docs/component-specs/makeup.md) for the
API. This is the working order.

1. **Start from a look, not from colours.** Pick one of the 17 `MAKEUP_LOOKS`:
   - bare, no-makeup, fresh dewy, soft glam, sculpted, classic red, smoky eye, sun-kissed, igari, monochrome rose,
     grooming, maiko.
   - five East Asian looks that transform the eyes: `c-glam` (Chinese social-video glam, "Douyin makeup"), `k-idol`,
     `jirai`, `neo-gyaru` and `ryousangata`.

   A look is colour rules and zones, so it adapts to any skin.
2. **Design for the face.** `designMakeup({ look, skin, face, eyes, eyeShape, hair, intensity })`:
   - `face` is a rest-frame landmark set: ANAT1's `beautifulFace(...).vertices`, or a photo's `restFrame(landmarks).rest`
     with `faceReference: "photo"`.
   - Read `plan.rationale` (undertone, face shape, eye shape) and keep it with the work.
3. **Check before you show it.** Run `checkMakeup(plan, face)` and fix each "Check" result:
   - contour that reaches the iris, or blush below the nose base.
   - a highlight under the contour, or a wing outside 10-45 degrees.
   - a foundation that does not match, or low lip contrast.
   - an aegyo-sal out of proportion, a puppy wing that rises, or a lens larger than 14.5 mm.
4. **Paint it.**
   - Eye tools: a look's `lashes` (`style` wispy, spiky or doll, `lower` lashes), `eyes.lens` (a circle lens),
     `eyes.tape` (double-eyelid tape) and `brows.straight` transform the eyes. Use
     `renderPortrait(makeupPortraitOptions(portrait, plan))` so the tape reaches the face.
   - Rendered portrait: use `renderPortrait({ ...portrait, paint: makeupPaint(plan) })` or `<MakeupPortrait>`. The
     renderer's own makeup (`makeup: "natural"`) is then off. Set `makeup` only to combine the two.
   - Photograph: `paintPhoto({ width, height, data, landmarks, skinMask }, plan)`. Get the landmarks with
     `python3 -I scripts/makeup/makeup.py landmarks photo.jpg --out photo.json`.
   - Another style: draw `zoneOutline(zone, face)` in your medium (the face chart), and use `planSwatches(plan)` for
     the colours. Keep contour cool and greyed, highlight on the planes that face the light.
5. **Change things as data.** Use `overrides: { "cheek-contour": { coverage: 0.9 }, lips: false }` (a new zone with a
   colour adds a layer), or a whole `Look`. Zones take `adjust` (`shift`, `rotate`, `scale`, `radius`, `soft`, `grow`) in eye widths.
6. **Learn from a photograph.** Use the Python pipeline (`scripts/makeup/README.md`): `ingest` (licence gate), `analyze`
   (blueprint), `learn`, then `apply --blueprint` for a parametric transfer. Do not commit photographs of people. Ship
   only aggregates from CC0, PDM, US-Gov or CC BY sources (`learn --ship`).

**Rules that come from evidence:**

- Eyes and lips carry the contrast (Russell 2009, Jones et al. 2015).
- Even the skin colour first (Matts et al. 2007, and the learned beauty correlations).
- Blush adds redness on the apples: about +5 a* for natural, +10 for evident.
- Concealer lightens about +5 L* (Jones et al. 2016).
- The brow peak sits at 71% of the eye width (Griffin & Kim review).
- Use liner or mascara for eye size. Their effects do not add (Matsushita et al. 2015).

**Find things fast:**

- The file map is in [`registry/anatomy/README.md`](../../registry/anatomy/README.md).
- Search with `npm run catalog:find -- --query="contour"` (also "blush", "lipstick", "undertone", "face chart").
- Get the exact exports with `npm run catalog:api -- --id=makeup --format=json`.
- Storybook: Video production → Art Foundations → Makeup.

Rules:

- Put no consumer-specific people, brands or product names in library code.
- The rendered portraits are constructions, not approved realistic portraits (AGENTS.md rule 14).
- Record actual human visual review before you claim a finished look.
