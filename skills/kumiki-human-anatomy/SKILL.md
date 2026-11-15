---
name: kumiki-human-anatomy
description: Use when drawing, painting, rigging or reviewing any human figure, face, hand, hair, skin colour or pose in Kumiki in any art style (pencil, ink, collage, riso, cel, paint, 3D) — for realistic proportions by age/sex/build, believable joint angles, depth and silhouette from any camera angle, light and shadow shapes, facial feature placement, or checking a drawing against measured human ranges.
---

# Kumiki human anatomy (ANAT1)

The pack `human-anatomy` decides *where a person's forms are*; your style decides *how they look*. Read the
[spec](../../docs/component-specs/human-anatomy.md) for the API; this is the working order.

1. **Choose the person** — `createHumanBody(model, { sex, age, muscle, weight, height, stature? })` from
   `registry/anatomy/anatomy-body.ts` (load `assets/models/anatomy/human-body-lattice.bin` with `loadHumanBodyModel` or
   `decodeHumanBodyModel`). Start from `HUMAN_PRESETS`. For a named height use `stature`; children and teens follow CDC
   stature automatically. Check adults with `predictFromStature` (ANSUR II).
2. **Pose with clinical angles** — `poseHumanBody(body, pose)`; begin from `POSE_PRESETS` and `HAND_POSES`. Keep
   clamping on; read `outOfRange`. Look up ranges in `JOINTS` (sources graded) and `CDC_ROM` for age/sex.
3. **Frame it like a photographer** — `renderHumanFrame(body, posed.points, { yaw, pitch, distance }, viewport)`.
   Orthographic for model sheets; `distance` ≥ 3× height for photo-like perspective.
4. **Paint in layers from the frame** — silhouette → `contours` (use `weight`) → `terminators` → `triangles[].band`
   (five values) → details. `rasterizeHumanFrame` gives clay/tonal/cel/silhouette pixels; `HumanFigure` is the
   reference painter. Use `projectPoint` to place props and guides in 3D.
5. **Faces** — `createFace({ norm, sex, ...z-scores })` in `anatomy-face.ts`; `FACE_LANDMARKS`, `FACE_FEATURES`,
   `faceFeatureLines`, irises from `eyeCentres` at `IRIS_DIAMETER_MM`, upper lid overlapping the iris.
6. **Hair and colour** — `growHair(body, posed.points, { length, curl, parting, flow, fringe })` and pass it to
   `HumanFigure` (`hair`, `hairColor` with eumelanin/pheomelanin/grey) or stroke `renderHairSegments` yourself; never
   draw hair as one flat shape — clumps, a white highlight near the root side and a tinted one toward the tip. Skin:
   pick a `MONK_SKIN_TONES` swatch, shade with `skinShade`/`skinRamp` (warm band at the terminator), add
   `skinZoneColor` for cheeks, nose, ears, lips, beard shadow and palms. Eyes: `IRIS_COLORS`, `EYE_NOTES`.
7. **Check before you claim realism** — `measureHumanBody` (headsTall, crotch, girths), `MODEL_TABLES.byAge`,
   `CANON_CHECKS` (no idealised 8-head bodies or equal face thirds unless the style asks), `SURFACE_FORMS` for the
   bony and muscle landmarks your medium should show. Study the plates in `data/anatomy-references.json`.

Rules: no consumer-specific people or names; ancestry morphs are coarse averages, never identities; the framework
does not pass a style's art gates for you (CP-F1, ArtCraft v7 portrait gate) — record actual visual review.
Storybook: Video production → Art Foundations → Human Anatomy.
