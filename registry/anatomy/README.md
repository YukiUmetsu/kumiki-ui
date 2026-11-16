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

# ANIM1 — animal anatomy framework (file map)

The same animal in any art style. Full guide: [spec](../../docs/component-specs/animal-anatomy.md) · agent workflow:
[skill](../../skills/kumiki-animal-anatomy/SKILL.md) · Storybook: Video production → Art Foundations → Animal Anatomy ·
find it: `npm run catalog:find -- --query="tanuki"` (or "gallop", "fur map", "animal proportions") · exact exports:
`npm run catalog:api -- --id=animal-anatomy --format=json`.

| I need… | File | Start with |
|---|---|---|
| What a whole group shares (feet, construction, gaits, parts, coat regions) | `animal-plans.ts` | `BODY_PLANS` |
| One animal: sizes, proportions, face, coat, palette, sounds, culture, references, where it is drawn | `animal-species.ts` | `findAnimal`, `ANIMAL_SPECIES`, `animalStyles` |
| Footfalls, body motion, speeds and stride times | `animal-gaits.ts` | `ANIMAL_GAITS`, `quadFootfalls`, `quadBody`, `footfallBars`, `gaitSpeed`, `strideFrames` |
| A posed side-view construction and region shapes to paint over | `animal-construct.ts` | `animalConstruction`, `poseAnimal`, `skeletonShapes` |
| Check a drawing or rig against the real animal | `animal-check.ts` | `measureAnimal`, `checkAnimalProportions`, `checkSpeciesData` |
| A painter or the character sheet (React) | `animal-react.tsx` | `AnimalFigure`, `AnimalSheet`, `FootfallDiagram` |

# FLORA1 — plant anatomy framework (file map)

Trees, bamboo, flowers and grasses in any art style. Full guide: [spec](../../docs/component-specs/plant-anatomy.md) ·
[skill](../../skills/kumiki-plant-anatomy/SKILL.md) · Storybook: Art Foundations → Plant Anatomy.

| I need… | File | Start with |
|---|---|---|
| How a group of plants is built (leader, buds, crown, branches, foliage) | `plant-forms.ts` | `GROWTH_FORMS` |
| One plant: sizes, leaf, flower, fruit, bark, calendar, colours, culture | `plant-species.ts` | `findPlant`, `PLANT_SPECIES`, `inSeason` |
| Leaf, flower, fruit and bark shapes | `plant-organs.ts` | `leafShape`, `flowerShape`, `fruitShape`, `barkMarks` |
| A whole plant for a month and a wind | `plant-construct.ts` | `plantConstruction`, `growPlant`, `plantShapes` |
| Checks | `plant-check.ts` | `checkPlantData`, `measurePlant`, `checkPlantProportions` |
| Painters and the sheet (React) | `plant-react.tsx` | `PlantFigure`, `OrganFigure`, `PlantSheet` |

Shared by ANIM1 and FLORA1 (`art-foundations`): `foundation-shapes.ts` (geometry, record types, the scale person) and
`foundation-react.tsx` (sheet cards, swatches, the to-scale chart).

# EXPR1 — facial expressions (file map)

Expressions for any style, on ANAT1's measured face. Guide: [spec](../../docs/component-specs/facial-expressions.md) ·
[skill](../../skills/kumiki-facial-expressions/SKILL.md) · Storybook: Art Foundations → Facial Expressions.

| I need… | File | Start with |
|---|---|---|
| Action units, emotions, kumadori, Noh tilt | `expression-facs.ts` | `ACTION_UNITS`, `EMOTIONS`, `KUMADORI`, `NOH_TILT` |
| A moved face, its features and creases, a check | `expression-face.ts` | `expressEmotion`, `expressFace`, `expressionFeatures`, `expressionMarks`, `nearestEmotion`, `blendWeights` |
| Painters (React) | `expression-react.tsx` | `ExpressionFace`, `ExpressionAtlas`, `ExpressionSheet` |
