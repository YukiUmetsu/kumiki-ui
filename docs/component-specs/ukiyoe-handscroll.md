# UKIYO1 — ukiyo-e woodblock & emaki handscroll

**Registry pack:** `ukiyoe-handscroll`
**Files:** `registry/video/ukiyoe/`:
- `ukiyoe-core.ts`: noise, eases, keys, entrances, loops, cadence, wind, camera, `scrollPan`, carved lines, colour.
- `ukiyoe-pigments.ts`: pigment roles and presets.
- `ukiyoe-prims.ts`: drawing primitives and patterns.
- `ukiyoe-texture.ts`: washi, wood-grain and baren-mottle PNG tiles.
- `ukiyoe-motifs.ts`
- `ukiyoe-particles.ts`
- `ukiyoe-figure.ts`
- `ukiyoe-scene.ts`: the contract and validation.
- `ukiyoe-react.tsx`: `UkiyoeScene`.
- `ukiyoe-transitions.tsx`: `UkiyoeKasumi`.

**Storybook:** Video Production → Film Looks → Ukiyo-e Handscroll:
- **The Night Ferry (film)**
- **Printer's proof**
- **Cast & actions**
- **Motif library**
- **Scene JSON editor**

**Showcase:** `src/video/ukiyoe-night-ferry.ts` (six shots, 1770 frames at 30 fps, 16:9 and 9:16), `ukiyoe-film.ts` (FD1 film), `ukiyoe-slot.tsx` (FilmStage slots)
**Research:** [reference study](../research/ukiyoe-handscroll-reference-study.md)
**Status:** implemented. The visual review recorded below is the agent's, **not** a human sign-off.

A film look that behaves like the medium. Scenes are printed from a carved key block and colour blocks on washi. The camera unrolls a picture scroll. Edo-period figures act on twos inside one shared wind field.

## Contract

A scene (`UkiyoeSceneSpec`) is JSON-safe: size, duration, seed, `palette` (preset plus role overrides), `paper` (tone, fibre, age), `print` (registration px, mottle, grain, key-line weight), optional `printIn` (print-pass reveal), `mount` (`none` | `print` sheet margin | `scroll` brocade bands), default figure `cadence`, `wind` (base, gusts, turbulence), `camera` (keys, shake, drift) and up to 1500 `nodes`. No clocks, callbacks or remote code. `UkiyoeScene` draws one SVG from the spec and an absolute `frame`. `inspectUkiyoeScene` returns every problem with a JSON path, and the renderer throws on invalid scenes.

Colours are pigment **roles**: `sumi`, `usuzumi`, `ai`, `bero`, `sora`, `asagi`, `kusa`, `matsu`, `ki`, `kincha`, `beni`, `shu`, `tan`, `sakura`, `murasaki`, `cha`, `kogecha`, `gofun`, `hada`, `kin`, `yoru` and `paper`, or a literal `#rrggbb`. The presets are `edo`, `twilight`, `night`, `snow`, `spring`, `autumn` and `aizuri` (the blue print style).

### Print model

- Each colour fill is assigned to one of 8 **impressions** by its lightness (light first, as printers worked). Each impression lands with a fixed seeded **registration** offset against the key line.
- Fills with `grain` show **itame** wood grain. Each parallax layer gets **baren mottle** clipped to its own ink.
- A **washi** skin lies over the finished print, anchored to the scroll so it pans with the paper. `emboss` gives a light karazuri relief.
- **Key-block lines** are filled ribbons that swell and taper (`carvedLine`). Outlines take `print.line` as a weight multiplier.
- `printIn` and the `printProgress` prop reveal the key block first, then each colour impression with a baren sweep. The `proof` prop pulls a proof up to impression *n*.

### Node kinds

| Kind | What it is |
| --- | --- |
| `block` | Any flat printed shape (`d` path, rect, ellipse or polygon). Takes a `fill` (paint or bokashi gradient), key-line width, textile `pattern`, `grain` and `emboss`. |
| `line` | A carved key line through points, with taper and draw-on via `progress`. |
| `group` | A container. Children (figures in a boat, a whole rig of blocks) ride its transform. |
| `motif` | A generated subject: `sky`, `mountain`, `hills`, `sea`, `wave`, `pine`, `sakura`, `willow`, `reeds`, `rock`, `cloud` (band or billow), `sun`, `moon`, `house` (tile, thatch, two storeys, noren, **fukinuki-yatai cutaway**), `pagoda`, `torii`, `bridge` (taiko or trestle), `boat` (ferry, sampan, yakata), `lantern` (paper or stone; `progress` lights it), `field`, `pier`. |
| `particles` | Closed-form weather and effects: `rain` (two Hiroshige line families), `snow`, `embers`, `petals`, `leaves`, `fireflies`, `birds`, `ripples`, `fireworks` (gold rocket trail, rayed stars, peony, willow or ring), `spray` (ballistic burst). |
| `figure` | An articulated Edo figure with a `look` and layered `actions`. |
| `text` | `cartouche` (framed title slip; vertical CJK with the Latin sub set sideways), `caption` (subtitle slip), `seal`, `plain`. `align: "end"` anchors right edges. |

Every node has placement, pivot, parallax `depth` (0 pins it to the frame), visibility window, `enter`/`exit` (`print`, `mist`, `rise`, `sink`, `slide`, `grow`, `unroll`, `stamp`, `fade`), sparse `keys` (x, y, rotate, scale, scaleX, scaleY, opacity, progress), `loops` (`sway`, `bob`, `rock`, `drift`, `flutter`, `breathe`, `spin`, `pulse`, `float`), `cadence`, `flip`, `windScale` and `blend` (`multiply` for dusk washes, `screen` for light).

### Motion

The camera is smooth. `scrollPan` builds right → left handscroll keys that linger at stations. Figures and animated motifs hold drawings on the scene cadence (twos by default). One **wind** field (base + gusts + turbulence) bends pines, willows and reeds, tilts rain, lifts hat brims, blows long hair and headband tails, and swings sleeves and hems, so a gust reads as one event. The wave rises with `progress` and collapses after `breakAt`, with a foam boil and spray.

### Figures

**Look:** `build` (slim / average / stout / child), `hair` (chonmage with shaved pate, shimada with kanzashi, child, bald, long, elder, topknot), `hat` (kasa, conical, eboshi, hood, headband), `robe`, `robePattern` (seigaiha, asanoha, ichimatsu, shima, kanoko, kikko, yagasuri, uroko, nami, sakura), `under`, `obi` (taiko knot for shimada and long hair), `coat` (haori), `lower` (robe, tucked over leggings, hakama), `feet`, `sleeves` (short or long furisode), `prop` (staff, umbrella, lantern, fan, pole, basket-pole, bundle, fishing-rod, scroll, pipe), `accent`, `lips`, `beard`.

**Actions:** `walk` and `run` travel to `to`/`toY`, with phase from distance so feet do not skate, and set facing. The others are `bow`, `wave`, `point`, `talk` (syllable mouth), `look` (incl. `back`), `kneel` (seiza), `pole`, `row`, `brace`, `dance`, `jump`, `turn` (squeeze flip), `cheer`, `startle`, `carry`, `hold`, `sweep` and `pray`. They blend over 6 frames. Blinks are seeded.

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
npx vitest run --project unit tests/ukiyoe.test.tsx     # 15 tests: contract, purity, motifs, wave, particles, figures, print pass, camera, kasumi, film compile, slots, playback
npx eslint registry/video/ukiyoe src/video/ukiyoe-*.ts* tests/ukiyoe.test.tsx
npm run registry:validate
node scripts/registry-fixture.js --item=ukiyoe-handscroll   # clean consumer install + usage typecheck
```

**Interactive playback:** Storybook in headless Chromium played the film at 30 distinct frames per second over 4 s samples in the town pan, the squall and the fireworks. The playhead is time-based, so a slow paint drops frames instead of slowing the story.

**Visual review:** the agent reviewed Chromium captures of every shot (contact sheets at 0.5×), the 2× cast sheet, and the motif gallery in both palettes. Portrait framing was checked on the title shot. **A human normal-speed review has not been recorded**, so the style is `not-reviewed`. No full-length render was made; render a draft only on request.

## Limits

- SVG renderer: very dense scenes (thousands of figures) will slow interactive playback. Textures are generated PNG tiles (~1.8 MB of data URIs per scene, cached).
- Figures are profile rigs with one face design per hairstyle. There is no lip-sync from audio (time `talk` to narration) and no IK; stance feet are approximately planted.
- Mottle is a feImage filter per parallax layer. A moving figure inside a layer moves over that layer's mottle tile.
- There is no soundtrack yet.
