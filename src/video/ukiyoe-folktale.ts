/**
 * "The Peach and the Oni" — an original three-shot UKIYO1 folktale homage (after the public-domain Momotarō tradition):
 * a peach comes down the river past ripe rice terraces and splits open; a handscroll pan along the road of old stories
 * (a fox wedding with foxfire, a drumming tanuki, cranes, a rabbit, a kappa, a packhorse, tengu, the dog, monkey and pheasant, the oni gate, a dragon in
 * the clouds); and the island of the oni in a great-wave sea, where the oni lay down their clubs.
 */
import { scrollPan } from "../../registry/video/ukiyoe/ukiyoe-core";
import type { UkiyoeNode } from "../../registry/video/ukiyoe/ukiyoe-scene";
import type { UkiyoeAspect, UkiyoeShot } from "./ukiyoe-night-ferry";
import { base, caption, DIM, fig } from "./ukiyoe-night-ferry";

const creature = (id: string, species: string, x: number, y: number, extra: Record<string, unknown> = {}): UkiyoeNode =>
  ({ id, kind: "creature", species, x, y, ...extra } as UkiyoeNode);

// ---- 1. The peach on the river -----------------------------------------------------------------------------------------------------------

const peachRiver: UkiyoeShot = { id: "peach-river", title: "A peach on the river", sound: { sound: "bed-river-fast", gainDb: -14 }, build: (aspect, t = {}) => {
  const P = aspect === "portrait", hz = 470, dur = 330, openAt = 196;
  return base("peach-river", aspect, dur, t, "spring", {
    mount: { kind: "print" },
    camera: { keys: [{ frame: 0, x: 900, y: P ? 600 : 540, zoom: P ? 1.15 : 1 }, { frame: 180, x: 1050, y: P ? 640 : 560, zoom: P ? 1.25 : 1.08, ease: "inOut" }, { frame: dur - 1, x: 1080, y: P ? 640 : 560, zoom: P ? 1.3 : 1.12, ease: "inOut" }] },
    wind: { base: .25, turbulence: .3 },
    nodes: [
      { id: "sky", kind: "motif", motif: "sky", depth: .25, x: -900, y: -900, params: { width: 4200, height: hz + 1500, band: .45, horizon: "beni" } },
      { id: "fuji", kind: "motif", motif: "mountain", depth: .3, x: 1350, y: hz - 40, params: { width: 420, height: 190 } },
      { id: "terraces", kind: "motif", motif: "ricefield", depth: .55, x: -800, y: hz - 60, params: { width: 3800, height: 230, crop: "ripe", terraces: 4 } },
      { id: "river", kind: "motif", motif: "sea", depth: .85, x: -800, y: hz + 230, params: { width: 4000, height: 1200, rows: 16, swell: .6, foam: .1, deepAt: 420, speed: .9 } },
      { id: "bank", kind: "block", depth: .85, x: 300, y: hz + 520, shape: { type: "polygon", points: [[-900, -260], [520, -210], [700, 60], [-900, 200]] }, fill: { type: "linear", angle: 90, stops: [[0, "kusa", 1], [1, "matsu", 1]] }, grain: .7, line: 1.6 },
      { id: "willow", kind: "motif", motif: "willow", depth: .85, x: 120, y: hz + 300, params: { height: 460 } },
      { id: "cranes", kind: "creature", species: "crane", depth: .4, x: 1700, y: 160, scale: .55, actions: [{ type: "fly", start: 0, end: dur, to: -1500, toY: -40 }] } as UkiyoeNode,
      { id: "cranes2", kind: "creature", species: "crane", depth: .4, x: 1880, y: 230, scale: .45, actions: [{ type: "fly", start: 10, end: dur, to: -1500, toY: -60 }] } as UkiyoeNode,
      fig("grandmother", "grandmother", 600, hz + 340, { scale: 1.05, facing: "right", actions: [{ type: "kneel", start: 0, end: dur }, { type: "sweep", start: 0, end: 120 }, { type: "look", start: 120, end: 180, angle: -6 }, { type: "point", start: 150, end: 200, angle: 70 }, { type: "startle", start: openAt, end: openAt + 24 }, { type: "pray", start: openAt + 40, end: dur }] }),
      { id: "peach", kind: "motif", motif: "peach", depth: .85, x: 1900, y: hz + 420, params: { size: 78, openAt, openDuration: 34 },
        keys: [{ frame: 0, x: 2100 }, { frame: 170, x: 1050, ease: "out" }], loops: [{ kind: "rock", amplitude: 1.2, period: 54 }] },
      { id: "ripples", kind: "particles", type: "ripples", depth: .85, area: [800, hz + 410, 600, 60], count: 8, size: 1.6 },
      fig("momo", "momo", 1050, hz + 440, { depth: .85, scale: 1, facing: "left", from: openAt + 14, enter: { preset: "mist", frame: openAt + 14, duration: 16 },
        actions: [{ type: "cheer", start: openAt + 26, end: openAt + 80 }, { type: "wave", start: openAt + 84, end: dur }] }),
      ...caption("cap-peach-1", aspect, "Long ago, a peach came down the river.", 20, 170, t),
      ...caption("cap-peach-2", aspect, "Inside it was a child, laughing.", 226, dur, t),
    ],
  });
} };

// ---- 2. The road of old stories: a handscroll pan ------------------------------------------------------------------------------------------

const road: UkiyoeShot = { id: "road", title: "The road of old stories", sound: { sound: "bed-stream-close", gainDb: -22 }, build: (aspect, t = {}) => {
  const P = aspect === "portrait", gy = 820, dur = 480;
  const keys = scrollPan({ from: P ? 5200 : 5000, to: P ? 900 : 1050, y: P ? 470 : 540, start: 0, end: dur - 1, zoom: P ? 1.1 : 1,
    stations: [{ x: P ? 4300 : 4250, hold: 50 }, { x: P ? 2900 : 2950, hold: 50 }, { x: P ? 1700 : 1750, hold: 40 }] });
  return base("road", aspect, dur, t, "twilight", {
    mount: { kind: "scroll", color: "kincha" },
    camera: { keys },
    wind: { base: .2, turbulence: .3 },
    nodes: [
      { id: "sky", kind: "motif", motif: "sky", depth: .3, x: -600, y: -900, params: { width: 7600, height: 1600, top: "bero", horizon: "beni", band: .45 } },
      { id: "fuji", kind: "motif", motif: "mountain", depth: .3, x: 1800, y: 600, params: { width: 700, height: 300 } },
      { id: "far-hills", kind: "motif", motif: "hills", depth: .5, x: 3000, y: 640, params: { width: 7600, height: 110, trees: .7, treeKind: "cedar" } },
      { id: "rice", kind: "motif", motif: "ricefield", depth: .7, x: -800, y: 630, params: { width: 7800, height: 200, crop: "young", terraces: 3 } },
      { id: "road", kind: "block", depth: 1, x: 3000, y: gy + 300, shape: { type: "rect", width: 8000, height: 640 }, fill: { type: "linear", angle: 90, stops: [[0, "ki", .85], [.12, "kincha", .9], [1, "kusa", .9]] }, grain: 1, line: 1.2 },
      // The fox wedding: a procession of foxes under a sun-shower, each with foxfire.
      { id: "sunshower", kind: "particles", type: "rain", depth: 1.05, area: [4100, -200, 1300, 1400], count: 120, speed: 30, opacity: .35, color: "ai" },
      creature("fox-1", "fox", 4700, gy + 60, { scale: 1.1, look: { foxfire: true }, actions: [{ type: "walk", start: 0, end: dur, to: -900 }] }),
      creature("fox-2", "fox", 4920, gy + 80, { scale: 1.1, look: { color: "gofun", foxfire: true }, actions: [{ type: "walk", start: 0, end: dur, to: -900 }] }),
      creature("fox-3", "fox", 5160, gy + 60, { scale: 1.2, look: { color: "gofun", tails: 9, foxfire: true }, actions: [{ type: "walk", start: 0, end: dur, to: -900 }] }),
      { id: "torii", kind: "motif", motif: "torii", x: 4250, y: gy + 20, params: { width: 300, height: 340 } },
      // Tanuki drumming under the temple pine; a cat watches; a rabbit hops by.
      { id: "pine", kind: "motif", motif: "pine", x: 3300, y: gy + 30, params: { height: 520, lean: 8 } },
      { id: "temple", kind: "motif", motif: "house", x: 3700, y: gy + 20, params: { width: 380, height: 170, roof: "tile", noren: "shu", doors: 5 } },
      creature("tanuki", "tanuki", 3080, gy + 70, { scale: 1.3, look: { hat: true, bottle: true }, actions: [{ type: "drum", start: 0, end: dur }] }),
      creature("tanuki-2", "tanuki", 2880, gy + 80, { scale: 1.1, facing: "right", actions: [{ type: "sit", start: 0, end: 260 }, { type: "transform", start: 262, end: 300 }] }),
      fig("monk", "monk", 2880, gy + 80, { scale: .85, facing: "right", from: 281, enter: { preset: "mist", frame: 281, duration: 10 }, actions: [{ type: "bow", start: 300, end: 360, angle: 30 }, { type: "walk", start: 370, end: dur, to: -500 }] }),
      creature("cat", "cat", 3560, gy + 30, { scale: 1, facing: "left", actions: [{ type: "sit", start: 0, end: dur }, { type: "look", start: 120, end: 300, angle: -14 }] }),
      creature("rabbit", "rabbit", 2500, gy + 120, { scale: 1, facing: "left", actions: [{ type: "hop", start: 40, end: 400, to: -700 }] }),
      // The companions: a dog, a monkey and a pheasant, the boy with his peach.
      creature("pheasant", "pheasant", 2150, gy + 90, { scale: 1.1, facing: "left", actions: [{ type: "walk", start: 0, end: dur, to: -620 }] }),
      creature("monkey", "monkey", 2250, gy + 100, { scale: 1.15, facing: "left", actions: [{ type: "walk", start: 0, end: dur, to: -620 }] }),
      creature("dog", "dog", 2350, gy + 110, { scale: 1.1, facing: "left", actions: [{ type: "walk", start: 0, end: dur, to: -620 }] }),
      fig("momo", "momo", 2600, gy + 110, { scale: .85, facing: "left", actions: [{ type: "walk", start: 0, end: dur, to: -620 }] }),
      creature("cranes", "crane", 2400, gy + 60, { scale: .9, facing: "right", actions: [{ type: "dance", start: 0, end: dur }] }),
      // A kappa at the edge of the paddy bows to the travellers, spilling its dish; a packhorse waits with its load.
      creature("kappa", "kappa", 2000, gy + 40, { scale: 1, facing: "right", actions: [{ type: "stand", start: 0, end: 330 }, { type: "bow", start: 330, end: 400 }, { type: "dance", start: 400, end: dur }] }),
      creature("horse", "horse", 3900, gy + 110, { scale: .8, facing: "left", look: { tack: true }, actions: [{ type: "look", start: 60, end: 160, angle: 12 }] }),
      // A tengu watches from the pine, fanning up the wind; a karasu-tengu circles over the temple.
      creature("tengu", "tengu", 3300, gy - 300, { depth: .95, scale: .7, facing: "left", actions: [{ type: "fly", start: 0, end: dur, to: 0 }, { type: "fan", start: 140, end: 230 }] }),
      creature("karasu", "karasutengu", 3900, 260, { depth: .8, scale: .55, facing: "left", actions: [{ type: "fly", start: 0, end: dur, to: -900, toY: 60 }] }),
      // The oni gate.
      { id: "gate", kind: "motif", motif: "torii", x: 1500, y: gy + 20, params: { width: 380, height: 420, color: "sumi" } },
      fig("oni-a", "oni-red", 1300, gy + 70, { scale: .95, facing: "right", actions: [{ type: "hold", start: 0, end: dur, angle: 60, amount: 70 }, { type: "talk", start: 380, end: dur }] }),
      fig("oni-b", "oni-blue", 1720, gy + 70, { scale: .95, facing: "left", actions: [{ type: "hold", start: 0, end: dur, angle: 60, amount: 70 }, { type: "look", start: 380, end: dur, angle: -10 }] }),
      // A dragon riding the clouds above it all.
      { id: "cloud-a", kind: "motif", motif: "cloud", depth: .55, x: 2100, y: 200, params: { style: "billow", width: 900, height: 150, shade: "usuzumi" } },
      creature("dragon", "dragon", 2900, 340, { depth: .6, look: { size: 950, pearl: true }, actions: [{ type: "fly", start: 0, end: dur, to: -1300, toY: 30 }] }),
      { id: "cloud-b", kind: "motif", motif: "cloud", depth: .62, x: 1500, y: 330, params: { style: "billow", width: 700, height: 120, shade: "usuzumi", variant: 3 } },
      { id: "kin-top", kind: "motif", motif: "cloud", depth: 1.15, x: 3800, y: 110, params: { width: 1600, height: 90, color: "kin", steps: 3 } },
      { id: "kin-bottom", kind: "motif", motif: "cloud", depth: 1.2, x: 2300, y: gy + 300, params: { width: 1900, height: 110, color: "kin", steps: 3, variant: 3 } },
      ...caption("cap-road-1", aspect, "Every creature from the old stories walked that road.", 24, 200, t),
      ...caption("cap-road-2", aspect, "Some were not what they seemed.", 250, 360, t),
      ...caption("cap-road-3", aspect, "And at the end of it, the oni kept their gate.", 380, dur, t),
    ],
  });
} };

// ---- 3. The island of the oni --------------------------------------------------------------------------------------------------------------

const island: UkiyoeShot = { id: "island", title: "The island of the oni", sound: { sound: "bed-wind-mountain", gainDb: -12 }, build: (aspect, t = {}) => {
  const P = aspect === "portrait", [w] = DIM[aspect as UkiyoeAspect], hz = 520, dur = 360, by = 880;
  return base("island", aspect, dur, t, "edo", {
    camera: { keys: [{ frame: 0, x: 900, y: P ? 600 : 540, zoom: P ? 1.15 : 1 }, { frame: 200, x: 1100, y: P ? 600 : 540, zoom: P ? 1.15 : 1.04, ease: "inOut" }, { frame: dur - 1, x: 1180, y: P ? 560 : 520, zoom: P ? 1.1 : 1, ease: "inOut" }] },
    wind: { base: .3, turbulence: .5 },
    nodes: [
      { id: "sky", kind: "motif", motif: "sky", depth: .25, x: -900, y: -900, params: { width: 4400, height: hz + 1500, style: "horizon", top: "usuzumi", horizonAt: .8 } },
      { id: "cloud", kind: "motif", motif: "cloud", depth: .3, x: 600, y: 230, params: { style: "billow", width: 900, height: 160, shade: "usuzumi" } },
      creature("dragon", "dragon", 1900, 200, { depth: .35, look: { size: 900, pearl: true, color: "ai", belly: "ki" }, actions: [{ type: "fly", start: 0, end: dur, to: -1400, toY: 80 }, { type: "roar", start: 230, end: 270 }] }),
      { id: "fuji", kind: "motif", motif: "mountain", depth: .45, x: 380, y: hz + 6, params: { width: 260, height: 120 } },
      { id: "sea", kind: "motif", motif: "sea", depth: .7, x: -800, y: hz, params: { width: 4200, height: 1400, rows: 18, swell: 1.8, foam: .6, deepAt: 500 } },
      { id: "island", kind: "motif", motif: "rock", depth: .75, x: 1500, y: hz + 60, params: { width: 860, height: 260, color: "kogecha", light: "usuzumi" } },
      { id: "island-pine", kind: "motif", motif: "pine", depth: .75, x: 1760, y: hz - 150, params: { height: 260, lean: 14, pads: 5 } },
      { id: "island-gate", kind: "motif", motif: "torii", depth: .75, x: 1300, y: hz - 150, scale: .5, params: { color: "sumi" } },
      fig("oni-1", "oni-red", 1430, hz - 120, { depth: .75, scale: .55, facing: "left", actions: [{ type: "cheer", start: 0, end: 150 }, { type: "startle", start: 160, end: 190 }, { type: "bow", start: 220, end: dur, angle: 40 }] }),
      fig("oni-2", "oni-blue", 1620, hz - 110, { depth: .75, scale: .55, facing: "left", actions: [{ type: "talk", start: 0, end: 150 }, { type: "startle", start: 166, end: 196 }, { type: "bow", start: 226, end: dur, angle: 44 }] }),
      { id: "wave-back", kind: "motif", motif: "wave", depth: .85, x: 2250, y: by + 100, params: { width: 760, height: 360, variant: 2 }, keys: [{ frame: 0, progress: .55 }, { frame: 160, progress: 1, ease: "sine" }] },
      { id: "boat", kind: "group", depth: .95, x: 300, y: by, keys: [{ frame: 0, x: 300 }, { frame: 150, x: 720, ease: "linear" }, { frame: 215, x: 810, ease: "outQuad" }], loops: [{ kind: "rock", amplitude: 1.4, period: 44 }] },
      { id: "hull", kind: "motif", motif: "boat", parent: "boat", params: { length: 460, kind: "ferry", sail: true, wake: 1 }, keys: [{ frame: 0, progress: 1 }, { frame: 170, progress: 1 }, { frame: 215, progress: 0 }] },
      { ...fig("momo", "momo", 60, -18, { facing: "right", actions: [{ type: "point", start: 120, end: 210, angle: 110 }, { type: "cheer", start: 260, end: dur }] }), parent: "boat" } as UkiyoeNode,
      { ...creature("dog", "dog", -100, -18, { scale: .9, actions: [{ type: "howl", start: 150, end: 190 }, { type: "sit", start: 200, end: dur }] }), parent: "boat" } as UkiyoeNode,
      { ...creature("pheasant", "pheasant", 170, -18, { scale: .9, actions: [{ type: "stand", start: 0, end: 160 }, { type: "fly", start: 170, end: dur, to: 500, toY: -380 }] }), parent: "boat" } as UkiyoeNode,
      { id: "wave-front", kind: "motif", motif: "wave", depth: 1.15, x: 160, y: by + 300, flip: true, params: { width: 700, height: 320, variant: 4 }, keys: [{ frame: 0, progress: .2 }, { frame: 240, progress: 1, ease: "sine" }] },
      { id: "end", kind: "text", style: "cartouche", depth: 0, align: "end", x: P ? w - 90 : w - 110, y: P ? 150 : 96, text: "めでたし", sub: "And so it ended well", size: P ? 46 : 40, enter: { preset: "stamp", frame: 290, duration: 10 } },
      ...caption("cap-island-1", aspect, "The boy sailed out to the island of the oni.", 20, 170, t),
      ...caption("cap-island-2", aspect, "The oni had never seen a peach-boy before. They put down their clubs.", 220, dur, t),
    ],
  });
} };

export const FOLKTALE_SHOTS: readonly UkiyoeShot[] = [peachRiver, road, island];
export const FOLKTALE_KASUMI: Readonly<Record<string, number>> = { road: 30, island: 30 };
