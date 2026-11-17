# FX1 — fire, smoke and effects for any art style

**Registry pack:** `fire-effects` (depends on `art-foundations`)
**Files:**

- `registry/nature/fx-data.ts`: fires, flame height, flicker, temperatures, blackbody colour, smoke, sparks,
  fireballs, firelight.
- `fx-render.ts`: volumetric fire.
- `fx-react.tsx`: `FireView`, `FlameColours`, `FireSheet`.
- `fx-render-pool.ts`, `fx-render-jobs.ts`, `fx-render-worker.ts`: rendering in workers.

**Storybook:** Video production → Art Foundations → Fire and Effects → **Sheet**, **Fires**.
**Status:** implemented; agent review of renders only — **human visual review not recorded**.

## Physics and data

- **Flame height** (`flameHeight(Q, D)`): L = 0.235 Q^(2/5) − 1.02 D (Heskestad 1983), for turbulent fires. Small
  laminar flames have measured sizes instead; a candle is about 3–4 cm.
- **Flicker** (`flickerHz(D)`): buoyant fires puff at about 1.5/√D Hz (Cetegen & Ahmed 1993). A campfire puffs about
  2 Hz, a bonfire about 1 Hz.
- **`FIRES`**: candle (80 W), match, torch, campfire (about 120 kW), bonfire (about 2 MW), oil pool fire, each with
  soot and smoke type.
- **Colour.** `blackbodyRGB(T)` is Planck's law through the CIE 1931 observer (Wyman et al. 2013 fit), and
  `blackbodyRadiance` rises steeply with temperature. `FLAME_TEMPERATURES`:
  - dull red embers about 900–1000 K;
  - orange embers about 1200 K;
  - wood flames about 1300–1600 K;
  - candle soot about 1400–1700 K;
  - the blue premixed base, which is chemiluminescence, not heat.
- **`SMOKE`**: plumes widen at about 7° each side (Morton, Taylor & Turner). Wood smoke is white-grey; oil and plastic
  smoke is black.
- **`SPARKS`**: they rise with the plume, cool from yellow to red and fade in about 1–2 s.
- **`fireball(M)`**: D ≈ 5.8 M^(1/3) m and t ≈ 0.45 M^(1/3) s.
- **`FIRELIGHT`**: about 1850–1900 K, flickering 10–30% in brightness, falling off with the square of the distance.

## Rendering (`renderFire`, `FireView`)

The flame is rendered as a volume:

- **Envelope:** a teardrop of the fire's flame height, puffing at its flicker rate.
- **Turbulence:** carried up at the plume speed (about 1.9 Q^(1/5) m/s, McCaffrey), with eddies scaled to the fire.
  Flames tear into tongues with gaps higher up; a candle stays laminar.
- **Emission and absorption:** soot emits at its temperature's colour and brightness and absorbs; small flames show a
  faint blue base.
- **Smoke:** billows above, lit warm from below.
- **Sparks:** motion-blurred over a 1/48 s shutter.
- **Firelight** on the ground or on the candle's wax, plus bloom.
- **Exposure:** set for the flame, so cores read yellow-white and edges orange.

`FireView` renders the frames in workers (cached) and loops them, with a still frame under reduced motion.

**Fireballs** (`renderFireball({ mass, t })`, `FireView fireball`):

- Size and burn time follow `fireball(M)`.
- The ball grows to full size in about a fifth of the burn, then lifts on buoyancy (about 0.55 √(g D)) over a stem.
- The burning gas cools from about 2200 K (yellow-white) toward orange and dull red, while soot thickens into a
  dark rising cloud.

## Limits

- Side views only.
- Fireballs are procedural: no shock wave and no debris.
- Smoke is lit simply.
- The flicker is procedural turbulence, not a fluid simulation.
