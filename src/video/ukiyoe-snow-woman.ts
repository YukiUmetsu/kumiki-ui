/**
 * "The Snow Woman" — an original three-shot UKIYO1 yōkai film (after the public-domain yuki-onna tradition):
 * a traveller crosses a snowbound mountain pass toward a village of thatched farmhouses, past a row of roadside jizō;
 * at night he passes the old shrine, where a lantern grins on its hook, an umbrella hops by on one leg and a ghost
 * stands among the pines; in the snowfield beyond, a woman in white comes out of the storm, breathes her cold over him
 * and is gone.
 */
import type { UkiyoeNode } from "../../registry/video/ukiyoe/ukiyoe-scene";
import type { UkiyoeShot } from "./ukiyoe-night-ferry";
import { base, caption, DIM, fig } from "./ukiyoe-night-ferry";

const creature = (id: string, species: string, x: number, y: number, extra: Record<string, unknown> = {}): UkiyoeNode =>
  ({ id, kind: "creature", species, x, y, ...extra } as UkiyoeNode);
const motif = (id: string, name: string, x: number, y: number, params: Record<string, unknown>, extra: Record<string, unknown> = {}): UkiyoeNode =>
  ({ id, kind: "motif", motif: name, x, y, params, ...extra } as UkiyoeNode);

// ---- 1. The mountain pass -----------------------------------------------------------------------------------------------------------------

const pass: UkiyoeShot = { id: "pass", title: "The mountain pass", build: (aspect, t = {}) => {
  const P = aspect === "portrait", hz = 560, dur = 300, road = 900;
  return base("pass", aspect, dur, t, "snow", {
    mount: { kind: "print" },
    // Portrait follows the traveller down the road; landscape holds the whole village.
    camera: { keys: [{ frame: 0, x: P ? 1650 : 1060, y: P ? 640 : 540, zoom: P ? 1.15 : 1 }, { frame: dur - 1, x: P ? 900 : 900, y: P ? 660 : 560, zoom: P ? 1.22 : 1.06, ease: "inOut" }] },
    wind: { base: .35, turbulence: .4, gusts: [{ frame: 120, duration: 90, strength: .8 }] },
    nodes: [
      motif("sky", "sky", -900, -900, { width: 4200, height: hz + 1500, style: "horizon", horizonAt: .78 }, { depth: .25 }),
      motif("range", "range", 960, hz + 40, { width: 3600, height: 640, layers: 4, snow: .85, mistColor: "gofun", trees: .45, variant: 1 }, { depth: .35 }),
      { id: "field", kind: "block", depth: .7, x: 960, y: hz + 420, shape: { type: "rect", width: 4400, height: 760 }, fill: { type: "linear", angle: 90, stops: [[0, "gofun", 1], [1, "sora", .9]] }, grain: .5, line: 0 } as UkiyoeNode,
      // The village: farmhouses half buried in snow, smoke rising, windows lit for the evening.
      motif("house-a", "minka", 520, hz + 150, { width: 380, snow: 1, smoke: .9, light: .7, variant: 1 }, { depth: .7 }),
      motif("house-b", "minka", 880, hz + 120, { width: 300, style: "gassho", snow: 1, light: 1, variant: 2 }, { depth: .7 }),
      motif("house-c", "minka", 1230, hz + 160, { width: 340, snow: 1, smoke: .6, light: .5, variant: 3 }, { depth: .7 }),
      motif("pine-l", "pine", 160, hz + 230, { height: 420, lean: 8, needles: "matsu" }, { depth: .8 }),
      // The road and its jizō, capped and bibbed in red under the snow.
      { id: "road", kind: "block", depth: 1, x: 960, y: road + 70, shape: { type: "polygon", points: [[-1400, -40], [1400, -70], [1400, 60], [-1400, 90]] }, fill: { type: "linear", angle: 90, stops: [[0, "gofun", 1], [1, "usuzumi", .35]] }, grain: .6, line: 0 } as UkiyoeNode,
      motif("jizo", "jizo", 1500, road + 30, { height: 120, count: 5, cap: true, snow: 1, moss: .3 }, { depth: 1 }),
      // A fox trots across the snow, stops and looks back at the traveller.
      creature("fox", "fox", 1900, road + 110, { depth: 1, scale: .9, actions: [{ type: "walk", start: 10, end: 140, to: -520 }, { type: "look", start: 140, end: 200, angle: -30 }, { type: "run", start: 200, end: dur, to: -1500 }] }),
      creature("crow-a", "crow", 1800, 230, { depth: .5, scale: .8, actions: [{ type: "fly", start: 0, end: dur, to: -1300, toY: -40 }] }),
      creature("crow-b", "crow", 2050, 300, { depth: .5, scale: .65, actions: [{ type: "fly", start: 20, end: dur, to: -1500, toY: -80 }] }),
      // On the far road a nurikabe has crouched across the way, a wall where no wall should be.
      creature("nurikabe", "nurikabe", 320, road + 30, { depth: 1, scale: .7, facing: "right", actions: [{ type: "stand", start: 0, end: 220 }, { type: "roar", start: 220, end: 260 }] }),
      fig("traveller", "traveller", 2150, road + 20, { depth: 1, scale: .95, facing: "left", actions: [{ type: "walk", start: 0, end: dur, to: -1350 }] }),
      { id: "snow", kind: "particles", type: "snow", depth: 1.1, area: [-300, -300, 2700, 1700], count: 260, speed: 1.4, size: 1.3 } as UkiyoeNode,
      ...caption("cap-pass-1", aspect, "In the mountains of the north, the snow fell for days.", 20, 150, t),
      ...caption("cap-pass-2", aspect, "A traveller hurried toward the village before dark.", 160, dur, t),
    ],
  });
} };

// ---- 2. The old shrine at night -----------------------------------------------------------------------------------------------------------

const shrine: UkiyoeShot = { id: "shrine", title: "The old shrine at night", build: (aspect, t = {}) => {
  const P = aspect === "portrait", hz = 600, dur = 330, gy = 930, hop = 90, ghostAt = 170;
  return base("shrine", aspect, dur, t, "night", {
    camera: { keys: [{ frame: 0, x: P ? 760 : 900, y: P ? 640 : 540, zoom: P ? 1.18 : 1 }, { frame: dur - 1, x: P ? 1080 : 1000, y: P ? 660 : 560, zoom: P ? 1.24 : 1.05, ease: "inOut" }] },
    wind: { base: .25, turbulence: .5 },
    nodes: [
      motif("sky", "sky", -900, -900, { width: 4200, height: hz + 1500, top: "yoru", mid: "ai", band: .7, horizon: "murasaki" }, { depth: .25 }),
      motif("moon", "moon", 1460, 210, { radius: 54, halo: .7 }, { depth: .25 }),
      motif("range", "range", 960, hz + 30, { width: 3600, height: 520, layers: 3, snow: .7, far: "ai", near: "yoru", green: "yoru", mistColor: "ai", mist: .5, variant: 4 }, { depth: .35 }),
      { id: "ground", kind: "block", depth: .9, x: 960, y: gy + 220, shape: { type: "rect", width: 4400, height: 640 }, fill: { type: "linear", angle: 90, stops: [[0, "ai", 1], [1, "yoru", 1]] }, grain: .6, line: 0 } as UkiyoeNode,
      motif("pine-a", "pine", 260, gy, { height: 620, lean: 10, needles: "yoru", light: "ai" }, { depth: .9 }),
      motif("pine-b", "pine", 1700, gy, { height: 560, lean: -12, needles: "yoru", light: "ai", variant: 2 }, { depth: .9 }),
      motif("torii", "torii", 960, gy - 10, { width: 520, height: 520, color: "shu" }, { depth: .9 }),
      motif("komainu", "komainu", 960, gy + 10, { height: 230, pair: true, gap: 820, moss: .6, snow: .4 }, { depth: .95 }),
      motif("toro", "lantern", 1560, gy + 30, { kind: "stone", size: 1.15, lit: true }, { depth: .95 }),
      // The lantern on the torii grins and sways; an umbrella hops across; soul-flames drift; a ghost by the pines.
      creature("chochin", "chochinobake", 1080, gy - 300, { depth: .9, scale: .9, actions: [{ type: "stand", start: 0, end: dur }, { type: "look", start: 120, end: 200 }] }),
      creature("kasa", "kasaobake", -120, gy + 60, { depth: 1, scale: 1, actions: [{ type: "hop", start: hop, end: hop + 170, to: 2100 }] }),
      creature("flame-a", "hitodama", 420, gy - 60, { depth: .95, scale: 1.1, actions: [{ type: "float", start: 0, end: dur, to: 520, toY: -60 }] }),
      creature("flame-b", "hitodama", 1600, gy - 120, { depth: .95, scale: .9, actions: [{ type: "float", start: 0, end: dur, to: -380, toY: 40 }] }),
      creature("yurei", "yurei", P ? 690 : 300, gy + 40, { depth: .9, scale: 1.05, facing: "right", actions: [{ type: "appear", start: ghostAt, end: ghostAt + 40 }, { type: "stand", start: ghostAt, end: dur }, { type: "vanish", start: dur - 50, end: dur - 5 }] }),
      // Up in the torii's shadow the earth spider hangs on its thread; the nue prowls the far edge of the precinct.
      creature("tsuchigumo", "tsuchigumo", 760, gy - 360, { depth: .9, scale: .7, actions: [{ type: "stand", start: 0, end: 200 }, { type: "roar", start: 200, end: 250 }] }),
      creature("nue", "nue", 2250, gy - 90, { depth: .8, scale: .6, facing: "left", actions: [{ type: "walk", start: 30, end: dur, to: -1900 }] }),
      // Behind the right-hand guardian a woman stands in the dark; as he passes, her neck begins to stretch.
      creature("rokuro", "rokurokubi", 1610, gy + 40, { depth: .93, scale: .95, facing: "left", actions: [{ type: "appear", start: 120, end: 150 }, { type: "stand", start: 120, end: 200 }, { type: "stretch", start: 200, end: dur }] }),
      fig("traveller", "traveller", 1950, gy + 70, { depth: 1, scale: 1, facing: "left", actions: [{ type: "walk", start: 0, end: hop + 60, to: -700 }, { type: "startle", start: hop + 62, end: hop + 90 }, { type: "look", start: hop + 90, end: ghostAt + 30, angle: 10 }, { type: "run", start: ghostAt + 40, end: dur, to: -1500 }] }),
      { id: "fireflies", kind: "particles", type: "fireflies", depth: 1, area: [0, gy - 400, 1920, 380], count: 14, size: 1.2 } as UkiyoeNode,
      ...caption("cap-shrine-1", aspect, "On the way he passed the old shrine. Things moved there at night.", 20, 160, t),
      ...caption("cap-shrine-2", aspect, "An umbrella hopped by. A ghost stood in the pines. A woman's neck grew long.", 170, dur, t),
    ],
  });
} };

// ---- 3. The snow woman ---------------------------------------------------------------------------------------------------------------------

const snowWoman: UkiyoeShot = { id: "snow-woman", title: "The snow woman", build: (aspect, t = {}) => {
  const P = aspect === "portrait", [w] = DIM[aspect], hz = 580, dur = 360, gy = 960, comes = 40, breath = 170, gone = 290;
  return base("snow-woman", aspect, dur, t, "snow", {
    camera: { keys: [{ frame: 0, x: P ? 1000 : 1000, y: P ? 700 : 600, zoom: P ? 1.2 : 1.05 }, { frame: breath, x: P ? 1000 : 1000, y: P ? 720 : 640, zoom: P ? 1.4 : 1.25, ease: "inOut" }, { frame: dur - 1, x: P ? 980 : 990, y: P ? 720 : 640, zoom: P ? 1.42 : 1.27, ease: "inOut" }],
      shake: [{ frame: breath, duration: 30, amount: .5 }] },
    wind: { base: .7, turbulence: .7, gusts: [{ frame: breath - 10, duration: 90, strength: 1.6 }] },
    nodes: [
      // Night snow: a slate sky and a blue-grey field, so the woman in white stands out as she does in the prints.
      motif("sky", "sky", -900, -900, { width: 4200, height: hz + 1500, top: "ai", mid: "usuzumi", band: .9 }, { depth: .25 }),
      motif("range", "range", 960, hz + 30, { width: 3600, height: 560, layers: 3, snow: .9, far: "usuzumi", near: "ai", green: "ai", mistColor: "usuzumi", mist: .7, trees: .35, variant: 7 }, { depth: .3 }),
      { id: "field", kind: "block", depth: .8, x: 960, y: gy + 200, shape: { type: "rect", width: 4400, height: 900 }, fill: { type: "linear", angle: 90, stops: [[0, "sora", 1], [.5, "sora", .85], [1, "ai", .9]] }, grain: .6, line: 0 } as UkiyoeNode,
      motif("house", "minka", 1520, hz + 190, { width: 300, snow: 1, smoke: .6, light: 1, variant: 5 }, { depth: .6 }),
      motif("jizo", "jizo", 420, gy + 10, { height: 110, count: 1, cap: true, snow: 1 }, { depth: .9 }),
      fig("traveller", "traveller", 700, gy + 40, { depth: 1, scale: 1.25, facing: "right", actions: [{ type: "kneel", start: 0, end: dur }, { type: "look", start: comes + 30, end: breath, angle: -12 }, { type: "startle", start: breath, end: breath + 30 }, { type: "brace", start: breath + 30, end: gone, angle: 14 }, { type: "pray", start: gone + 10, end: dur }, { type: "face", start: gone + 20, end: dur, blend: 14 }] }),
      creature("yuki", "yukionna", 1700, gy + 30, { depth: 1, scale: 1.75, facing: "left", actions: [{ type: "appear", start: comes, end: comes + 50 }, { type: "float", start: comes, end: breath - 10, to: -520 }, { type: "blow", start: breath, end: breath + 80 }, { type: "vanish", start: gone, end: gone + 45 }] }),
      { id: "snow", kind: "particles", type: "snow", depth: 1.1, area: [-300, -300, 2700, 1700], count: 420, speed: 2.2, size: 1.4, angle: 18 } as UkiyoeNode,
      { id: "end", kind: "text", style: "cartouche", depth: 0, align: "end", x: P ? w - 90 : w - 110, y: P ? 150 : 96, text: "雪女", sub: "The Snow Woman", size: P ? 46 : 40, enter: { preset: "stamp", frame: gone + 30, duration: 10 } },
      ...caption("cap-yuki-1", aspect, "Out of the storm came a woman dressed in white.", 30, breath - 10, t),
      ...caption("cap-yuki-2", aspect, "She breathed on him, cold as deep winter — and then she was gone.", breath, dur, t),
    ],
  });
} };

export const SNOW_WOMAN_SHOTS: readonly UkiyoeShot[] = [pass, shrine, snowWoman];
export const SNOW_WOMAN_KASUMI: Readonly<Record<string, number>> = { shrine: 30, "snow-woman": 30 };
