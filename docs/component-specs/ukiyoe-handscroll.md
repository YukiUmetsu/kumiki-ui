# UKIYO1 — ukiyo-e woodblock & emaki handscroll

**Registry pack:** `ukiyoe-handscroll`
**Files:** `registry/video/ukiyoe/`:
- `ukiyoe-core.ts`: noise, eases, keys, entrances, loops, cadence, wind, camera, `scrollPan`, carved lines, colour.
- `ukiyoe-pigments.ts`: pigment roles and presets.
- `ukiyoe-prims.ts`: drawing primitives and patterns.
- `ukiyoe-texture.ts`: washi, wood-grain and baren-mottle PNG tiles.
- `ukiyoe-motifs.ts`
- `ukiyoe-particles.ts`
- `ukiyoe-figure.ts`: Edo figures, including oni.
- `ukiyoe-creatures.ts`: four-legged animals, birds and the dragon.
- `ukiyoe-scene.ts`: the contract and validation.
- `ukiyoe-react.tsx`: `UkiyoeScene`.
- `ukiyoe-transitions.tsx`: `UkiyoeKasumi`.

**Storybook:** Video Production → Film Looks → Ukiyo-e Handscroll:
- **The Night Ferry (film)**
- **The Peach and the Oni (folktale film)**
- **Folktale bestiary**
- **Printer's proof**
- **Cast & actions**
- **Motif library**
- **Scene JSON editor**

**Showcases:** `src/video/ukiyoe-night-ferry.ts` (six shots, 1770 frames at 30 fps, 16:9 and 9:16) and `src/video/ukiyoe-folktale.ts` (three shots, 1170 frames), `ukiyoe-film.ts` (FD1 film), `ukiyoe-slot.tsx` (FilmStage slots)
**Research:** [reference study](../research/ukiyoe-handscroll-reference-study.md)
**Status:** implemented. The visual review recorded below is the agent's, **not** a human sign-off.

A film look that behaves like the medium. Scenes are printed from a carved key block and colour blocks on washi. The camera unrolls a picture scroll. Edo-period figures act on twos inside one shared wind field.

## Contract

A scene (`UkiyoeSceneSpec`) is JSON-safe: size, duration, seed, `palette` (preset plus role overrides), `paper` (tone, fibre, age), `print` (registration px, mottle, grain, key-line weight), optional `printIn` (print-pass reveal), `mount` (`none` | `print` sheet margin | `scroll` brocade bands), default figure `cadence`, `wind` (base, gusts, turbulence), `camera` (keys, shake, drift) and up to 1500 `nodes`. No clocks, callbacks or remote code. `UkiyoeScene` draws one SVG from the spec and an absolute `frame`. `inspectUkiyoeScene` returns every problem with a JSON path, and the renderer throws on invalid scenes.

Colours are pigment **roles**: `sumi`, `usuzumi`, `ai`, `bero`, `sora`, `asagi`, `kusa`, `matsu`, `ki`, `kincha`, `beni`, `shu`, `tan`, `sakura`, `murasaki`, `cha`, `kogecha`, `gofun`, `hada`, `kin`, `yoru` and `paper`, or a literal `#rrggbb`. The presets are `edo`, `twilight`, `night`, `snow`, `spring`, `autumn` and `aizuri` (the blue print style).

### Print model

- Each colour fill is assigned to one of 8 **impressions** by its lightness (light first, as printers worked). Each impression lands with a fixed seeded **registration** offset against the key line.
- Fills with `grain` show **itame** wood grain. **Baren mottle** is one sheet of paper-coloured blots and specks laid over the printed picture in the paper's plane: invisible on bare paper, uneven pressure on ink. Closing captions and titles sit above it.
- A **washi** skin lies over the finished print, anchored to the scroll so it pans with the paper. `emboss` gives a light karazuri relief.
- **Great-wave idiom.** The `wave` motif follows the print's anatomy, with its silhouette measured from the scan:
  - **Dome.** A broad white dome whose top rolls in soft, uneven bumps, edged in fine indigo.
  - **Column.** A deep-navy column under the crest. Its thin medium-blue (`hanada`) stripes run parallel to the column's front edge, bow back at mid-height and fan from under the crest toward the trough, with thick dark bands between them. Snow-like flecks gather along the stripes.
  - **Lip.** A lace of foam claws, with no smooth contour. Each claw is one thick arm that rises forward from the foam, arcs over and drops into a hook whose tip points back and down, so every claw stretches forward and down with the wave's travel. About a quarter of the claws branch into a second hook at the claw's own scale.
  - **Foam colour.** Claws stand out against the pale-blue impression with a pale tongue inside each curl. All the foam is one connected white with a single outline (claws open into it; nothing is separately outlined), and the indigo line marks only white against blue or sky.
  - **Fuji and sky.** The default `mountain` is the great-wave Fuji. `sky` `style: "horizon"` is bare paper above a grey bokashi.
- **Key-block lines** are filled ribbons that swell and taper (`carvedLine`). Outlines take `print.line` as a weight multiplier.
- `printIn` and the `printProgress` prop reveal the key block first, then each colour impression with a baren sweep. The `proof` prop pulls a proof up to impression *n*.

### Node kinds

| Kind | What it is |
| --- | --- |
| `block` | Any flat printed shape (`d` path, rect, ellipse or polygon). Takes a `fill` (paint or bokashi gradient), key-line width, textile `pattern`, `grain` and `emboss`. |
| `line` | A carved key line through points, with taper and draw-on via `progress`. |
| `group` | A container. Children (figures in a boat, a whole rig of blocks) ride its transform. |
| `motif` | A generated subject: `sky`, `mountain`, `hills`, `sea`, `wave`, `pine`, `sakura`, `willow`, `reeds`, `rock`, `cloud` (band or billow), `sun`, `moon`, `house` (tile, thatch, two storeys, noren, **fukinuki-yatai cutaway**), `pagoda`, `torii`, `bridge` (taiko or trestle), `boat` (ferry, sampan, yakata; the hull sits in a waterline band, `wake` × `progress` adds a bow wave and stern streaks, `sail` adds a mast and square sail), `lantern` (paper or stone; `progress` lights it), `field`, `pier`, `peach` (splits open at `openAt`), `ricefield` (terraced paddies: `crop` `young`, `ripe` or `flooded`, swaying in the wind). |
| `particles` | Closed-form weather and effects: `rain` (two Hiroshige line families), `snow`, `embers`, `petals`, `leaves`, `fireflies`, `birds`, `ripples`, `fireworks` (gold rocket trail, rayed stars, peony, willow or ring), `spray` (ballistic burst). |
| `figure` | An articulated Edo figure with a `look` and layered `actions`. |
| `creature` | A folktale animal or spirit (`species`): `fox` (with `tails` 1–9 and `foxfire`), `tanuki` (with `hat` and `bottle`), `dog`, `cat`, `rabbit`, `crane`, `heron`, `crow`, `pheasant`, `sparrow`, `dragon` (with `pearl`). Actions: `walk`, `run`, `fly`, `hop` (travel to `to`/`toY`), `sit`, `stand` (upright), `look`, `leap`, `howl`, `drum`, `peck`, `dance`, `coil`, `roar`, `sleep`, `transform` (henge: a smoke puff, after which the creature is gone, so place what it becomes as a new node). |
| `text` | `cartouche` (framed title slip; vertical CJK with the Latin sub set sideways), `caption` (subtitle slip), `seal`, `plain`. `align: "end"` anchors right edges. |

Every node has placement, pivot, parallax `depth` (0 pins it to the frame), visibility window, `enter`/`exit` (`print`, `mist`, `rise`, `sink`, `slide`, `grow`, `unroll`, `stamp`, `fade`), sparse `keys` (x, y, rotate, scale, scaleX, scaleY, opacity, progress), `loops` (`sway`, `bob`, `rock`, `drift`, `flutter`, `breathe`, `spin`, `pulse`, `float`), `cadence`, `flip`, `windScale` and `blend` (`multiply` for dusk washes, `screen` for light).

### Motion

The camera is smooth. `scrollPan` builds right → left handscroll keys that linger at stations. Figures and animated motifs hold drawings on the scene cadence (twos by default). One **wind** field (base + gusts + turbulence) bends pines, willows and reeds, tilts rain, lifts hat brims, blows long hair and headband tails, and swings sleeves and hems, so a gust reads as one event. The `sea` motif can rise with a storm: `rough` (0–1, times the node's progress, so it can be keyed) turns its flat wave lines into rows of travelling swells with sharp crests, shaded troughs and white caps on the biggest crests. `direction` sets which way the sea runs and `drift` sets its pace. The wave lives like a plunging breaker. `progress` raises a blue swell that steepens and then curls; `speed` (px per frame) keeps it moving at an even pace for the whole scene, and `travel` (a fraction of its width) adds a surge with the rise and the break. At `breakAt` the crest leans and throws the lip, which falls over `breakDuration` onto the water ahead of the face. A whitewater roller boils up where it lands, then the wave sinks back to flat water (`settleTo`, default 0) over `settleDuration`, and a few weak foam bubbles drift and pop on the water where it fell (`bubbles`, 0–1). `waveSurface` follows the same water, so riders stay on it.

**Boats and water.** Three pieces keep boats honest:
- **Propulsion.** A `surge` loop pulses a hull's speed with each stroke of the figure `pole` action (same period, 44 frames). The `inQuad`/`outQuad` eases start and stop a heavy hull gently. Loops take `fade` so rocking eases in and out. The showcase helper `poled()` builds matching keys, so the hull is always advancing while the ferryman works and is at rest when he is not.
- **Riding a wave.** `ride: { on: "<wave node id>", amount, tilt, span }` floats a top-level node on a `wave` motif. The water height is sampled on every frame at nine points along the waterline (`waveSurface`), so the node climbs the face as the wave rises, pitches to its slope, and comes down smoothly when it breaks.
- **Boarding.** `walk`/`run` take `via` waypoints. Passengers walk along a pier to a point above their seat, then step down into a boat lying alongside, with the walk cycle tied to the distance covered. Mirror a boat group with `flip` to head left; child x then runs stern → bow.

### Figures

**Look:** `build` (slim / average / stout / child / brute), `hair` (chonmage with shaved pate, shimada with kanzashi, child, bald, long, elder, topknot, wild), `upper` (`bare` for a bare torso and arms), `face` (`oni`: glaring eye, heavy brow, fangs) with `horns` 0–2, `hat` (kasa, conical, eboshi, hood, headband), `robe`, `robePattern` (seigaiha, asanoha, ichimatsu, shima, kanoko, kikko, yagasuri, uroko, nami, sakura, tora), `under`, `obi` (taiko knot for shimada and long hair), `coat` (haori), `lower` (robe, tucked over leggings, hakama, loincloth), `feet`, `sleeves` (short or long furisode), `prop` (staff, umbrella, lantern, fan, pole, basket-pole, bundle, fishing-rod, scroll, pipe, kanabo, peach), `accent`, `lips`, `beard`.

**Actions:** `walk` and `run` travel to `to`/`toY` (optionally through `via` waypoints), with phase from distance so feet do not skate, and set facing. The others are `bow`, `wave`, `point`, `talk` (syllable mouth), `look` (incl. `back`), `kneel` (seiza), `pole`, `row`, `brace`, `dance`, `jump`, `turn` (squeeze flip), `cheer`, `startle`, `carry`, `hold`, `sweep` and `pray`. They blend over 6 frames. Blinks are seeded.

Sleeves hang as panels under gravity, slide toward the elbow when an arm rises, and lag behind arm motion (estimated from the pose two frames earlier, so they stay frame-pure).

### Transition

`UkiyoeKasumi` sweeps stepped gold mist bands (gradient, wood grain, sunago gold dust and kirikane flakes) from right to left across the frame. The incoming scene is revealed behind each band's trailing edge. The FilmStage slot is `ukiyoe-kasumi`; the incoming shot then resumes where the transition left it.

## Usage

```tsx
import { UkiyoeScene } from "./components/video/ukiyoe/ukiyoe-react";
import { scrollPan } from "./components/video/ukiyoe/ukiyoe-core";

const scene = { version: 1, id: "demo", width: 1920, height: 1080, durationFrames: 240, seed: 7,
  palette: { preset: "twilight" }, mount: { kind: "scroll" }, printIn: { frame: 0, duration: 60 },
  wind: { base: .2, gusts: [{ frame: 120, duration: 80, strength: 1.5 }] },
  camera: { keys: scrollPan({ from: 2600, to: 960, y: 540, start: 0, end: 239, stations: [{ x: 1800, hold: 40 }] }) },
  nodes: [
    { id: "sky", kind: "motif", motif: "sky", depth: .3, x: -600, y: -300, params: { width: 4200, height: 1100, horizon: "beni" } },
    { id: "fuji", kind: "motif", motif: "mountain", depth: .32, x: 1500, y: 640, params: { width: 800, height: 340 } },
    { id: "sea", kind: "motif", motif: "sea", depth: .8, x: -600, y: 640, params: { width: 4200, height: 600 } },
    { id: "boat", kind: "group", x: 1800, y: 900, loops: [{ kind: "rock", period: 60 }] },
    { id: "hull", kind: "motif", motif: "boat", parent: "boat", params: { kind: "ferry" } },
    { id: "ferryman", kind: "figure", parent: "boat", x: -180, y: -18, look: { robe: "asagi", hat: "headband", lower: "tucked", prop: "pole" }, actions: [{ type: "pole", start: 0, end: 239 }] },
    { id: "rain", kind: "particles", type: "rain", depth: 1.1, area: [-200, -200, 4000, 1600], count: 400, from: 120 },
    { id: "title", kind: "text", style: "cartouche", depth: 0, x: 1820, y: 90, align: "end", text: "渡し", sub: "The Ferry" },
  ] } as const;

<UkiyoeScene spec={scene} frame={frame} reducedMotion={prefersReducedMotion} />;
```

## Evidence

```bash
npx vitest run --project unit tests/ukiyoe.test.tsx     # 27 tests: contract, purity, motifs, wave (incl. foam drawn as one connected shape with a single outline), particles, figures, oni, creatures, henge, peach, Fuji, print pass, camera, kasumi, both films, slots, playback, and boats (hull advances whenever the pole works, passengers never leave the pier or deck, wave surface is seamless, a rider's per-frame steps stay small)
npx eslint registry/video/ukiyoe src/video/ukiyoe-*.ts* tests/ukiyoe.test.tsx
npm run registry:validate
node scripts/registry-fixture.js --item=ukiyoe-handscroll   # clean consumer install + usage typecheck
```

**Interactive playback:** in headless Chromium, Storybook played both films at 30 distinct frames per second, sampled over 4 s in the town pan, the squall, the fireworks and the folktale road. The playhead is time-based, so a slow paint drops frames instead of slowing the story.

**Visual review:** the agent reviewed Chromium captures of every shot (contact sheets at 0.5×), the 2× cast sheet, and the motif gallery in both palettes. Portrait framing was checked on the title shot. **A human normal-speed review has not been recorded**, so the style is `not-reviewed`. No full-length render was made; render a draft only on request.

## Limits

- SVG renderer: very dense scenes (thousands of figures) will slow interactive playback. Textures are generated PNG tiles (~1.8 MB of data URIs per scene, cached).
- Creature rigs are stylised profile rigs. Legs are straight-segment chains, dragons follow a sine-wave spine (no path following yet), and there is no monkey or horse rig yet.
- Figures are profile rigs with one face design per hairstyle. There is no lip-sync from audio (time `talk` to narration) and no IK; stance feet are approximately planted.
- Mottle lies in the paper plane, so on far parallax layers it slides against the ink during a pan, as the washi fibres do.
- `ride` works for top-level nodes in the same parallax layer as the wave. Only `wave` motifs can be ridden; the open `sea` does not lift boats beyond their own `rock` loop.
- There is no soundtrack yet.
