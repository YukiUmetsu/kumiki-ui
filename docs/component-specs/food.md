# FOOD1 — food for any art style

**Registry pack:** `food` (depends on `art-foundations`)
**Files:**

- `registry/materials/food-data.ts`: cooking temperatures, doneness, diffusivity, steam, gloss, dishes.
- `food-physics.ts`: `cookSteak`, `cookEgg`, `toastBrowning`, and the colours they leave.
- `food-render.ts`: rendered steak, egg and toast.
- `food-react.tsx`: `FoodView`, `Steam`, `FoodSheet`, `FoodStillLifeView`, `FoodLibrary`, `FoodStyleGuide`,
  `FoodMoodStudy`.
- `food-render-pool.ts`, `food-render-jobs.ts`, `food-render-worker.ts`: rendering in workers.
- Food textures: `food-textures.ts` in the `materials` pack (MATL1 family `food`, see the
  [materials spec](materials.md)). The still lifes and MATL1's swatches sample the same recipes.
- Storybook still lifes: `food-mesh.ts` (shapes), `food-scene.ts` (the renderer), `food-surfaces.ts` (surfaces),
  `food-stage.ts` (moods and vessels), `food-kit.ts` (produce), `food-dishes.ts` (cooked food), `food-library.ts`
  (the 200 foods) and `food-still-life.ts` (staging and `renderFoodStillLife`).

**Storybook:** Video production → Art Foundations → Food → **Sheet**, **Cooking lab**, **Doneness and boiling**,
**Steam**, **Rice ball**, **Storybook library**, **Style guide**, **Light moods**, **Texture close-ups**.
**Status:** implemented; agent review of renders only — **human visual review not recorded**.

## The idea

Food looks real when it looks cooked the way it was cooked. Colour follows the highest temperature each part reached,
and that follows the heat flow. So the framework cooks by heat conduction and paints the result.

## Data

- `COOKING_TEMPERATURES`:
  - myosin about 50 °C;
  - myoglobin fading from about 60 °C and grey-brown above 70 °C;
  - egg white sets at 62–65 °C and is firm at about 80 °C;
  - the yolk sets at 65–70 °C;
  - Maillard browning above about 140–165 °C;
  - sucrose caramelises at about 160 °C;
  - starch gelatinises at 55–85 °C.
- `DONENESS`: beef core temperatures, from blue (46–49 °C) to well done (71 °C and above), with cut-face colours.
- `DIFFUSIVITY`: beef and egg about 1.35–1.4 × 10⁻⁷ m²/s.
- `STEAM`, `FOOD_GLOSS` (roughness by food), and `DISHES`: onigiri, nigiri, ramen, dango, tempura, persimmon, toast.

## Physics (`food-physics.ts`)

- **`cookSteak({ thickness, pan, start, perSide, sides, rest })`.** 1D conduction with a pan contact coefficient and
  air on the free face. Moist meat is capped at 100 °C (its water boils), resting carries heat on, and Maillard
  browning accrues on each face. Calibrated against the usual guide: a 25 mm steak at 4–5 min a side comes out medium
  rare.
- **`cookEgg({ minutes, start, eggWidth })`.** Spherical conduction in boiling water, then an ice bath. From the
  fridge: 6 min gives a runny yolk, 7–7.5 min jammy, 9–10 min hard, and 12–13 min a grey-green ring.
- **`toastBrowning(seconds, power)`.** Estimated kinetics: a drying lag, then browning.
- **`meatColour`, `eggColours`, `crustColour`** turn a temperature or a browning index into colour.

## Rendering (`renderFood`, `FoodView`, `Steam`)

- **Steak.** The cut face on a board, coloured by the peak temperature at each depth under a ragged crust. Muscle
  fibres, fat marbling, a wet sheen, and a rough seared top.
- **Egg.** Halved, with a translucent-to-opaque white. The yolk is glossy and domed when runny, jammy, or matte and
  crumbly when set, with the green ring when overcooked.
- **Toast.** A shokupan slice, darker at the crust and on raised crumb, with pores.
- **Onigiri.** About 300 cooked short grains (about 5.5 × 3 mm), each glossy and a little translucent, packed into a
  rounded triangle, darker in the gaps, with a fibrous nori band round the base. Story: **Rice ball**.
- **`Steam`.** An animated plume, invisible at the surface and white a little above, rising about 0.4 m/s, curling,
  thinning within about 15 cm and bent by a draught. Under reduced motion it shows one still frame.

## Storybook still lifes

The style is storybook realism: tactile, detailed food with the warmth of a picture book. The light is a low warm
backlight with chiaroscuro. There are no outlines and no flat shading.

### The library (`FOOD_LIBRARY`)

- 200 foods. Each entry has a name, a region, an origin, an era, a state, a group, a vessel, a table, a light mood
  and `look`. The `look` text names the visual tells that make the food read.
- Regions: East Asia, South Asia, Southeast Asia, Middle East, Europe, Mediterranean, Africa, Latin America, North
  America and worldwide.
- Eras: ancient earthenware, traditional wares, vintage enamelware and modern minimal stoneware.
- States: raw, cooked, baked, fermented, preserved and prepared.
- Groups: fruit, vegetables, pantry, bread, sweets, dairy and preserves, meat, fish and seafood, soups, plated mains,
  street food and drinks.
- `foodStillLife(entry, { mood, seed, elevation, zoom })` stages an entry. The camera frames the food (the vessel can
  be cropped). The camera looks down into deep vessels. Hot dishes steam.
- Loose pieces settle (`settle`, default for fruit and vegetables, `settle: true` or `{ maxTilt }` on other
  entries). Each piece (a group: a fruit with its stem, leaves and dew) is tried at a few spots and tilts, pushed in
  from the vessel's inner wall, dropped onto the floor and onto the pieces already there, and the lowest resting pose
  is kept. No piece passes through the vessel or through another piece from above. `heap` drops its pieces the same
  way.
- `renderFoodStillLife({ id, width, height, supersample, … })` renders an entry. The worker job is `still-life`.

### Construction (`food-mesh.ts`, `food-kit.ts`, `food-dishes.ts`)

- Nothing is exact. Cut pieces (`slabPiece`, `steakCut`, `salmonFillet`, steak slices) have wandering outlines,
  uneven thickness and edges that sag. Each slice of a steak has its own thickness and wedge.
- Meat and fish have their anatomy: a ribeye's eye, cap seam, kernel and fat cap; a sirloin's fat strip; a salmon
  fillet thick along the back, thin at the belly with its fat stripe; a whole fish laid on its side with dorsal,
  pectoral, pelvic, anal and forked tail fins (rays), a gill cover and an eye with pupil, iris and cornea.
- Rice is grain by grain where it shows: `grainCoat` lays about 950 grains over an onigiri and about 260 over a
  nigiri's rice, each lying in the surface and half sunk. The onigiri is a closed rounded triangle with nori raised
  over its base.
- Bell peppers have lobes deepest at the shoulders and base (`ribProfile: "ends"`), a thick curved stem and calyx.
  Carrots have fine lateral root hairs.
- `bananaHand`: fingers fanned from one cut crown, the skin from MATL1 (`bananaSolid`: striations, sugar spots),
  greener at the neck, dark at the blossom tip.
- `herbSprig` / `herbLeaf`: basil, mint and shiso with opposite leaf pairs turned 90° at each node, on petioles, a
  bud of young leaves at the tip (basil cupped and glossy, mint serrated and rugose); parsley and coriander as fans of
  lobed leaflets; dill as thread fronds; thyme and rosemary on woody stems; bay alternate.
- `tempuraShrimp`: a straightened shrimp under lumpy batter with crisp frills (`surfaceScatter`), its coral tail bare.
- `gyozaPlate`: hanetsuki gyoza, flipped from the pan with their browned bases up under a lace wing. The wing is a
  thin transparent layer: the webbed batter scatters golden light and the holes show the plate.
- `riceMound`: fried rice, jollof, biryani and paella coated grain by grain (each grain tinted on its own), with egg
  curds, peas, carrot, scallion, fried onion or charred bits through it; `shape: "flat"` fills a pan or a pot.
- Flatbreads use MATL1's `flatbreadSolid` (leopard char with brown halos) and `injeraSolid`. Naan has a dozen or so
  big bubbles, scorched on top and glossed with ghee. Focaccia pools olive oil in its finger dimples. The pizza's
  cornicione is blistered, each blister scorched on top.

- All shapes are parametric surfaces in millimetres: `lathe` (round things), `sweep` (long things), `slab` (an
  extruded footprint with a bevel and a height-mapped top), `blade` (leaves and sheets), `ellipsoid` and `box`.
- Fruit and vegetable bodies come from silhouette profiles (`fruitBody`, 32 shapes). Lobes, sutures, lumps, lean and
  asymmetry come from a seed.
- Profiles are Catmull–Rom splines clamped to each segment, so corners (a jar base, a plate rim) do not overshoot.
- Surfaces use object-space solid textures, so textures do not stretch and stay on the food when it moves.
- The steak slices and the ramen egg use the FOOD1 physics (`cookSteak`, `cookEgg`): the cut face shows the colour
  of the peak temperature at each depth.

### Rendering (`food-scene.ts`)

- A long-lens perspective camera and a G-buffer from a triangle rasteriser.
- The table is a plane at Y = 0 that goes back into haze.
- The sun has a shadow map with soft shadows (PCSS). The penumbra grows with the distance to the blocker and the
  sun's size.
- Soft shadow maps for the window, the fill card and six sky directions give occlusion in world space. Food sits in
  its own contact shadow, also where the camera cannot see the contact. Screen-space occlusion adds the fine
  crevices.
- Bump shading uses the surface gradient (Mikkelsen 2010) with screen derivatives.
- Subsurface scattering spreads diffuse light by the mean free path of each colour, only inside the same part. The
  values come from Jensen et al. 2001 (SIGGRAPH), figure 5, measured σs′ and σa: apple, chicken, cream, ketchup,
  potato, skim milk and whole milk (`MFP`).
- Backlit translucency uses the thickness from the shadow map.
- Specular light: GGX, a pre-filtered room with a window, and a clear coat for glazes and wax. Velvet sheen for
  cocoa, flour and fuzz.
- Transparent parts are separate layers. A layer composites over the scene from far to near. Each layer has a front
  and a back depth:
  - a closed body (honey, tea) absorbs light over its own depth;
  - an open surface (broth) absorbs light down to the food below it;
  - a thin shell (`thin`, glass) absorbs light over its wall thickness.
- Steam, depth of field (with a sharp zone round the dish), bloom, a warm storybook grade, a vignette and a filmic
  tone curve finish the image.

### Light moods (`MOODS`)

- `golden-hour`: a low warm sun behind the food, a fill card, a warm haze. This is the default.
- `morning-market`: a high, cool, bright light.
- `midnight`: a warm lamp in a tight pool of light.
- `window`: soft north daylight.

## Limits

- Three cooked foods are physically modelled, plus a rice ball drawn grain by grain. Other dishes are data and notes
  only.
- The FOOD1 rasters (`renderFood`) are 2D. The still lifes are 3D scenes on the CPU, about 1–3 s for 300 × 225 at
  2× supersampling in a worker, and about 5–8 s for 720 × 540.
- One camera angle per entry (an orbit and a zoom can be set). Transparent layers sort per part, not per pixel.
- Settling stacks pieces on a height field: a piece cannot tuck under another's overhang, and it does not rotate
  as it rolls (it tries a few fixed tilts).
- The quality of the 200 still lifes is not equal. The agent reviewed contact sheets of all 200 renders after each
  round. **Human visual review is not recorded.**
