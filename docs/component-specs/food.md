# FOOD1 — food for any art style

**Registry pack:** `food` (depends on `art-foundations`)
**Files:**

- `registry/materials/food-data.ts`: cooking temperatures, doneness, diffusivity, steam, gloss, dishes.
- `food-physics.ts`: `cookSteak`, `cookEgg`, `toastBrowning`, and the colours they leave.
- `food-render.ts`: rendered steak, egg and toast.
- `food-react.tsx`: `FoodView`, `Steam`, `FoodSheet`.
- `food-render-pool.ts`, `food-render-jobs.ts`, `food-render-worker.ts`: rendering in workers.

**Storybook:** Video production → Art Foundations → Food → **Sheet**, **Cooking lab**, **Doneness and boiling**,
**Steam**.
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
- **`Steam`.** An animated plume, invisible at the surface and white a little above, rising about 0.4 m/s, curling,
  thinning within about 15 cm and bent by a draught. Under reduced motion it shows one still frame.

## Limits

- Three cooked foods are physically modelled. Other dishes are data and notes only.
- The renders are 2D rasters, not 3D models.
