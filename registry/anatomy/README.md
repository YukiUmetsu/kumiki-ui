# ANAT1 — human anatomy framework (file map)

Measured, posable humans for drawing people in any art style. Full guide: [spec](../../docs/component-specs/human-anatomy.md) ·
agent workflow: [skill](../../skills/kumiki-human-anatomy/SKILL.md) · Storybook: Video production → Art Foundations → Human Anatomy ·
find it: `npm run catalog:find -- --query="hair"` (or "skin colour", "pose", "face proportions") · exact exports:
`npm run catalog:api -- --id=human-anatomy --format=json`.

| I need… | File | Start with |
|---|---|---|
| A body of any sex, age, build, height | `anatomy-body.ts` | `loadHumanBodyModel` / `decodeHumanBodyModel`, `createHumanBody`, `HUMAN_PRESETS`, `humanLandmarks`, `humanJoints` |
| Child/teen height for age | `anatomy-growth.ts` | `statureForAge` (CDC) |
| Measurements, girths, mass, heads tall | `anatomy-measure.ts` | `measureHumanBody`, `torsoSection`, `limbSection`, `ANSUR_KEYS` |
| A pose in real joint angles | `anatomy-pose.ts` | `poseHumanBody`, `POSE_PRESETS`, `HAND_POSES`, `JOINTS` (ranges), `CDC_ROM`, `mirrorPose`, `blendPoses` |
| A drawing from any camera | `anatomy-view.ts` | `renderHumanFrame`, `renderMeshFrame`, `rasterizeHumanFrame`, `projectPoint`, `smoothPath` |
| A face: landmarks, norms, variation | `anatomy-face.ts` | `createFace`, `measureFace`, `FACE_LANDMARKS`, `FACE_FEATURES`, `FACE_NORMS`, `eyeCentres` |
| Hair, brows, lashes | `anatomy-hair.ts` | `growHair`, `renderHairSegments`, `faceHair`, `CURL_TYPES`, `HAIR_GROUPS`, `HAIR_FACTS` |
| Skin, hair and eye colour | `anatomy-color.ts` | `MONK_SKIN_TONES`, `skinShade`, `skinRamp`, `skinZoneColor`, `SKIN_SCATTERING`, `hairColorHex`, `HAIR_COLOR_PRESETS`, `IRIS_COLORS` |
| Measured ranges, canon checks, surface anatomy | `anatomy-reference.ts` | `ANSUR`, `predictFromStature`, `CANON_CHECKS`, `SURFACE_FORMS`, `AGE_CHANGES`, `DRAWING_RECIPE`, `MODEL_TABLES` |
| A reference painter (React) | `anatomy-react.tsx` | `HumanFigure` (clay, tonal, cel, silhouette; contours, terminators, skeleton, landmarks, head grid, hair) |
| Raw data | `data/` | ANSUR II ranges, CDC stature, MediaPipe face mesh, model tables (presets' joints/landmarks by age), reference plates manifest |

Binary body model: `assets/models/anatomy/human-body-lattice.bin` (CC0 MakeHuman, see `NOTICE.md`). Reference images:
`assets/photos/anatomy-references/`. Bake scripts: `scripts/anatomy/`.
