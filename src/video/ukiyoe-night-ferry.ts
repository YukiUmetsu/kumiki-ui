/**
 * "The Night Ferry" — an original six-shot UKIYO1 film: a title printed block by block, a handscroll pan through a
 * riverside town at dusk, boarding the ferry, a squall with a breaking wave, moonrise and fireworks after the storm,
 * and the arrival. Every shot is a JSON scene; the same world is framed for 16:9 and 9:16.
 */
import type { UkiyoeFigureLook } from "../../registry/video/ukiyoe/ukiyoe-figure";
import { scrollPan } from "../../registry/video/ukiyoe/ukiyoe-core";
import type { UkiyoeNode, UkiyoeSceneSpec } from "../../registry/video/ukiyoe/ukiyoe-scene";
import type { UkiyoePresetName } from "../../registry/video/ukiyoe/ukiyoe-pigments";

export type UkiyoeAspect = "landscape" | "portrait";
export interface UkiyoeShot { id: string; title: string; build: (aspect: UkiyoeAspect, tweaks?: UkiyoeFilmTweaks) => UkiyoeSceneSpec }
/** Whole-film overrides exposed in Storybook. Every value is an input to the real renderer. */
export interface UkiyoeFilmTweaks {
  preset?: UkiyoePresetName;
  registration?: number;
  mottle?: number;
  grain?: number;
  line?: number;
  fibre?: number;
  cadence?: 1 | 2 | 3 | 4;
  wind?: number;
  captions?: boolean;
}

/** The recurring cast: identities stay fixed across shots. */
export const CAST: Readonly<Record<string, UkiyoeFigureLook>> = {
  traveller: { robe: "ai", robePattern: { type: "kanoko", color: "gofun", scale: .45, opacity: .8 }, hat: "kasa", lower: "tucked", legs: "gofun", feet: "waraji", prop: "staff", obi: "kogecha", under: "sora" },
  ferryman: { robe: "asagi", robePattern: { type: "shima", color: "ai", scale: .5, opacity: .7 }, hair: "chonmage", hat: "headband", hatColor: "gofun", lower: "tucked", legs: "hada", feet: "bare", prop: "pole", propColor: "kincha", obi: "ai" },
  mother: { robe: "beni", robePattern: { type: "asanoha", color: "gofun", scale: .45, opacity: .75 }, hair: "shimada", obi: "kincha", under: "ki", sleeves: "long", prop: "umbrella", accent: "ai", feet: "geta" },
  child: { robe: "ki", robePattern: { type: "ichimatsu", color: "shu", scale: .5, opacity: .9 }, hair: "child", build: "child", obi: "shu", feet: "geta" },
  porter: { robe: "cha", hair: "chonmage", hat: "headband", hatColor: "ai", lower: "tucked", legs: "hada", feet: "waraji", prop: "basket-pole", propColor: "kincha" },
  merchant: { robe: "kusa", hair: "chonmage", coat: "kogecha", coatPattern: { type: "kikko", color: "cha", scale: .4, opacity: .6 }, lower: "hakama", hakama: "usuzumi", feet: "tabi", prop: "fan", accent: "shu" },
  elder: { robe: "cha", hair: "elder", beard: true, lower: "tucked", legs: "hada", feet: "waraji", prop: "lantern", accent: "shu" },
  maiko: { robe: "murasaki", robePattern: { type: "sakura", color: "sakura", scale: .6, opacity: .9 }, hair: "shimada", obi: "ki", under: "beni", sleeves: "long", feet: "geta", prop: "fan", accent: "beni" },
  monk: { robe: "usuzumi", hair: "bald", hat: "conical", hatColor: "kincha", lower: "robe", feet: "waraji", prop: "staff" },
  boy: { robe: "sora", robePattern: { type: "yagasuri", color: "ai", scale: .45, opacity: .8 }, hair: "child", build: "child", obi: "kogecha", feet: "waraji" },
};

const DIM = { landscape: [1920, 1080], portrait: [1080, 1920] } as const;
const fig = (id: string, who: keyof typeof CAST, x: number, y: number, extra: Partial<Extract<UkiyoeNode, { kind: "figure" }>> = {}): UkiyoeNode =>
  ({ id, kind: "figure", look: CAST[who], x, y, ...extra } as UkiyoeNode);

function base(id: string, aspect: UkiyoeAspect, durationFrames: number, t: UkiyoeFilmTweaks, preset: UkiyoePresetName, extra: Partial<UkiyoeSceneSpec>): UkiyoeSceneSpec {
  const [width, height] = DIM[aspect];
  return {
    version: 1, id: `${id}-${aspect}`, width, height, durationFrames, seed: 1847 + id.length * 31,
    palette: { preset: t.preset ?? preset },
    paper: { fibre: t.fibre ?? .55, age: .4 },
    print: { registration: t.registration ?? 1.6, mottle: t.mottle ?? .55, grain: t.grain ?? .7, line: t.line ?? 1 },
    cadence: t.cadence ?? 2,
    nodes: [],
    ...extra,
    wind: extra.wind ? { ...extra.wind, base: (extra.wind.base ?? 0) + (t.wind ?? 0) } : { base: t.wind ?? 0 },
  };
}
const caption = (id: string, aspect: UkiyoeAspect, text: string, from: number, to: number, t: UkiyoeFilmTweaks): UkiyoeNode[] => {
  if (t.captions === false) return [];
  const [w, h] = DIM[aspect];
  return [{ id, kind: "text", style: "caption", text, depth: 0, x: w / 2, y: h - (aspect === "portrait" ? 230 : 70), size: aspect === "portrait" ? 40 : 32, max: aspect === "portrait" ? 900 : 1300,
    from, to, enter: { preset: "mist", frame: from, duration: 12 }, exit: { preset: "fade", frame: to - 12, duration: 12 } }];
};

/** The river world shared by the ferry shots: sky, far bank, water. World x 0..1920+, the portrait frame shows more sky and water. */
function riverWorld(opts: { horizon: number; storm?: boolean; night?: boolean; width?: number }): UkiyoeNode[] {
  const w = opts.width ?? 2600, hz = opts.horizon;
  return [
    { id: "sky", kind: "motif", motif: "sky", depth: .25, x: -900, y: -900, params: { width: w + 1800, height: hz + 1500, top: opts.night ? "yoru" : "bero", horizon: opts.night ? "murasaki" : "beni", band: opts.night ? .62 : .42, mid: opts.night ? "ai" : "paper" } },
    { id: "far-hills", kind: "motif", motif: "hills", depth: .7, x: 960, y: hz + 6, params: { width: w + 1400, height: 90, color: opts.night ? "ai" : "kusa", dark: opts.night ? "yoru" : "matsu", trees: .7, treeKind: "cedar", variant: 2 } },
    { id: "river", kind: "motif", motif: "sea", depth: .7, x: -700, y: hz, params: { width: w + 1400, height: 1400, deepAt: 560, rows: 22, color: opts.night ? "yoru" : "bero", light: opts.night ? "ai" : "sora", foam: opts.storm ? .7 : .15, swell: opts.storm ? 2.2 : .8, speed: .5 } },
  ];
}

/** The ferry: a group riding the river with its ferryman and passengers aboard. */
function ferry(id: string, x: number, y: number, passengers: UkiyoeNode[], extra: Partial<UkiyoeNode> = {}): UkiyoeNode[] {
  return [
    { id, kind: "group", x, y, ...extra } as UkiyoeNode,
    { id: id + "-hull", kind: "motif", motif: "boat", parent: id, params: { length: 520, kind: "ferry" } },
    ...passengers.map(p => ({ ...p, parent: id }) as UkiyoeNode),
  ];
}

// ---- 1. Title: printed block by block ---------------------------------------------------------------------------------------------

const title: UkiyoeShot = { id: "title", title: "The print", build: (aspect, t = {}) => {
  const P = aspect === "portrait", [w] = DIM[aspect], hz = 640;
  return base("title", aspect, 180, t, "twilight", {
    mount: { kind: "print" },
    printIn: { frame: 6, duration: 96 },
    camera: { keys: [{ frame: 0, x: 960, y: P ? 380 : 560, zoom: P ? 1 : 1 }, { frame: 179, x: 960, y: P ? 360 : 540, zoom: 1.06, ease: "sine" }] },
    nodes: [
      ...riverWorld({ horizon: hz }),
      { id: "moon", kind: "motif", motif: "moon", depth: .25, x: 1380, y: 250, params: { radius: 46, halo: .5, phase: 1 } },
      { id: "fuji", kind: "motif", motif: "mountain", depth: .32, x: 760, y: hz + 4, params: { width: 760, height: 330, snow: .3, mist: .45 } },
      { id: "kasumi", kind: "motif", motif: "cloud", depth: .4, x: 520, y: 470, params: { width: 760, height: 64, color: "kin", steps: 3 }, loops: [{ kind: "drift", amplitude: .4, period: 120 }] },
      { id: "birds", kind: "particles", type: "birds", depth: .5, area: [1500, 300, 0, 0], count: 7, angle: 192, speed: 2.2, size: 1.1 },
      { id: "willow", kind: "motif", motif: "willow", x: 240, y: hz + 120, params: { height: 520, strands: 26 } },
      { id: "pier", kind: "motif", motif: "pier", x: 1450, y: hz + 210, params: { length: 700 } },
      ...ferry("boat", 1180, hz + 250, [fig("ferryman", "ferryman", 170, -18, { scale: .8, facing: "left", actions: [{ type: "hold", start: 0, end: 179, angle: 70, amount: 30 }] })], { loops: [{ kind: "rock", amplitude: .6, period: 80 }] }),
      { id: "reeds", kind: "motif", motif: "reeds", depth: 1.25, x: 160, y: P ? 1500 : 1090, params: { width: 520, height: 210, count: 30 } },
      { id: "reeds2", kind: "motif", motif: "reeds", depth: 1.25, x: 1820, y: P ? 1500 : 1090, params: { width: 380, height: 170, count: 22, variant: 3 } },
      { id: "cartouche", kind: "text", style: "cartouche", align: "end", depth: 0, x: P ? w - 90 : w - 110, y: P ? 140 : 96, text: "夜の渡し", sub: "The Night Ferry", size: P ? 46 : 40, enter: { preset: "stamp", frame: 104, duration: 10 } },
      { id: "seal", kind: "text", style: "seal", align: "end", depth: 0, x: P ? w - 230 : w - 236, y: P ? 560 : 470, text: "組木", size: P ? 30 : 26, enter: { preset: "stamp", frame: 118, duration: 8 } },
      ...caption("cap-title", aspect, "Every evening, one boat crossed the river.", 126, 180, t),
    ],
  });
} };

// ---- 2. The riverside town: a handscroll pan ---------------------------------------------------------------------------------------

const town: UkiyoeShot = { id: "town", title: "The riverside town", build: (aspect, t = {}) => {
  const P = aspect === "portrait", gy = 840, dur = 390;
  const camY = P ? 470 : 560;
  const keys = scrollPan({ from: P ? 4950 : 4700, to: P ? 860 : 1050, y: camY, start: 0, end: dur - 1, zoom: P ? 1.15 : 1,
    stations: [{ x: P ? 4250 : 4200, hold: 40 }, { x: P ? 2650 : 2700, hold: 30 }] });
  const lantern = (id: string, x: number, at: number, kind: "chochin" | "stone" = "chochin", y = gy - 150): UkiyoeNode =>
    ({ id, kind: "motif", motif: "lantern", x, y, params: { kind, size: kind === "stone" ? 1.2 : 1 }, keys: [{ frame: 0, progress: 0 }, { frame: at, progress: 0 }, { frame: at + 16, progress: 1 }] });
  return base("town", aspect, dur, t, "twilight", {
    mount: { kind: "scroll", color: "kincha" },
    camera: { keys },
    wind: { base: .25, turbulence: .3 },
    nodes: [
      { id: "sky", kind: "motif", motif: "sky", depth: .3, x: -600, y: -900, params: { width: 7400, height: 1560, top: "bero", horizon: "beni", band: .45 } },
      { id: "fuji", kind: "motif", motif: "mountain", depth: .3, x: 3600, y: 600, params: { width: 900, height: 360, mist: .5 } },
      { id: "far-hills", kind: "motif", motif: "hills", depth: .5, x: 3000, y: 640, params: { width: 7200, height: 120, trees: .8, treeKind: "cedar" } },
      { id: "pagoda", kind: "motif", motif: "pagoda", depth: .55, x: 2300, y: 660, params: { height: 420, width: 150 } },
      { id: "river", kind: "motif", motif: "sea", depth: .9, x: -800, y: 640, params: { width: 7400, height: 150, rows: 8, swell: .5, foam: 0 } },
      { id: "bank", kind: "block", depth: 1, x: 3000, y: gy + 380, shape: { type: "rect", width: 8000, height: 900 }, fill: { type: "linear", angle: 90, stops: [[0, "kincha", 1], [.1, "kusa", .9], [1, "matsu", 1]] }, grain: .8, line: 0 },
      { id: "street", kind: "block", depth: 1, x: 3000, y: gy + 44, shape: { type: "rect", width: 8000, height: 90 }, fill: { type: "linear", angle: 90, stops: [[0, "ki", .8], [1, "kincha", .9]] }, grain: 1, line: 1.4 },
      { id: "mist-far", kind: "motif", motif: "cloud", depth: .6, x: 3400, y: 630, params: { width: 2200, height: 44, color: "gofun", steps: 2 }, opacity: .7 },
      // The town, right to left (the direction a handscroll is read).
      { id: "teahouse", kind: "motif", motif: "house", x: 4300, y: gy, params: { width: 460, height: 190, roof: "cutaway", floor: "ki" } },
      fig("guest-a", "merchant", 4210, gy - 30, { scale: .78, facing: "right", actions: [{ type: "kneel", start: 0, end: dur }, { type: "talk", start: 20, end: 120 }, { type: "talk", start: 180, end: 260 }] }),
      fig("guest-b", "maiko", 4400, gy - 30, { scale: .78, facing: "left", actions: [{ type: "kneel", start: 0, end: dur }, { type: "pray", start: 120, end: 175 }, { type: "dance", start: 280, end: dur }] }),
      lantern("lt-tea", 4560, 70),
      { id: "shop-1", kind: "motif", motif: "house", x: 3720, y: gy, params: { width: 380, height: 190, stories: 2, noren: "ai", doors: 5 } },
      lantern("lt-shop1", 3520, 110),
      { id: "shop-2", kind: "motif", motif: "house", x: 3240, y: gy, params: { width: 360, height: 180, noren: "shu", doors: 4, roof: "thatch" } },
      { id: "sakura", kind: "motif", motif: "sakura", x: 2960, y: gy + 10, params: { height: 420, branches: 8 } },
      { id: "petals", kind: "particles", type: "petals", area: [2500, 300, 900, 600], count: 26, speed: 1.1 },
      { id: "torii", kind: "motif", motif: "torii", x: 2560, y: gy + 6, params: { width: 300, height: 330 } },
      lantern("lt-stone-a", 2340, 190, "stone", gy + 4), lantern("lt-stone-b", 2780, 180, "stone", gy + 4),
      { id: "willow", kind: "motif", motif: "willow", x: 2050, y: gy + 20, params: { height: 520, strands: 30 } },
      { id: "shop-3", kind: "motif", motif: "house", x: 1650, y: gy, params: { width: 400, height: 180, noren: "kincha", doors: 5 } },
      lantern("lt-shop3", 1420, 270),
      { id: "pier", kind: "motif", motif: "pier", x: 700, y: gy + 40, params: { length: 600 } },
      ...ferry("boat", 1050, gy + 70, [fig("ferryman", "ferryman", 170, -18, { scale: .78, facing: "right", actions: [{ type: "hold", start: 0, end: dur, angle: 70, amount: 30 }] })], { loops: [{ kind: "rock", amplitude: .5, period: 90 }] }),
      // Street life on twos; the traveller walks the whole scroll (continuous narration).
      fig("porter", "porter", 3950, gy + 40, { scale: .82, facing: "left", actions: [{ type: "walk", start: 10, end: 300, to: -980 }] }),
      fig("elder", "elder", 2470, gy + 44, { scale: .8, facing: "right", actions: [{ type: "talk", start: 140, end: 210 }, { type: "bow", start: 214, end: 270, angle: 30 }] }),
      fig("merchant", "merchant", 2650, gy + 44, { scale: .8, facing: "left", actions: [{ type: "bow", start: 150, end: 205, angle: 36 }, { type: "talk", start: 210, end: 270 }] }),
      fig("mother", "mother", 3420, gy + 46, { scale: .82, facing: "left", actions: [{ type: "walk", start: 0, end: dur, to: -1500 }] }),
      fig("child", "child", 3300, gy + 48, { scale: .82, facing: "left", actions: [{ type: "run", start: 0, end: 60, to: -150 }, { type: "walk", start: 60, end: dur, to: -1380 }] }),
      fig("boy", "boy", 1900, gy + 48, { scale: .82, facing: "right", actions: [{ type: "cheer", start: 230, end: 300 }, { type: "run", start: 300, end: dur, to: 420 }] }),
      fig("traveller", "traveller", 4820, gy + 50, { scale: .86, facing: "left", actions: [{ type: "walk", start: 0, end: dur - 10, to: -3620 }] }),
      // Emaki gold clouds sweep across the near plane, framing the passage of time.
      { id: "kin-top", kind: "motif", motif: "cloud", depth: 1.15, x: 3600, y: 120, params: { width: 1500, height: 90, color: "kin", steps: 3 }, loops: [{ kind: "drift", amplitude: -.6, period: 60 }] },
      { id: "kin-bottom", kind: "motif", motif: "cloud", depth: 1.2, x: 2200, y: gy + 260, params: { width: 1800, height: 110, color: "kin", steps: 3, variant: 3 }, loops: [{ kind: "drift", amplitude: .4, period: 60 }] },
      { id: "kin-mid", kind: "motif", motif: "cloud", depth: 1.18, x: 900, y: 200, params: { width: 1300, height: 80, color: "kin", steps: 2, variant: 5 } },
      // Dusk falls as the scroll unrolls.
      { id: "dusk", kind: "block", depth: 0, x: DIM[aspect][0] / 2, y: DIM[aspect][1] / 2, shape: { type: "rect", width: DIM[aspect][0] + 40, height: DIM[aspect][1] + 40 }, line: 0, blend: "multiply",
        fill: { type: "linear", angle: 90, stops: [[0, "ai", 1], [1, "murasaki", .6]] }, keys: [{ frame: 0, opacity: 0 }, { frame: dur - 1, opacity: .42, ease: "inOut" }] },
      ...caption("cap-town-1", aspect, "Along the river, the town was closing its shutters.", 24, 170, t),
      ...caption("cap-town-2", aspect, "The traveller had one more crossing to make.", 230, dur, t),
    ],
  });
} };

// ---- 3. Boarding ------------------------------------------------------------------------------------------------------------------

const boarding: UkiyoeShot = { id: "boarding", title: "Boarding", build: (aspect, t = {}) => {
  const P = aspect === "portrait", hz = 520, by = 860, dur = 240;
  return base("boarding", aspect, dur, t, "twilight", {
    camera: { keys: [{ frame: 0, x: P ? 1080 : 1000, y: P ? 640 : 560, zoom: P ? 1.1 : 1 }, { frame: 150, x: P ? 960 : 960, y: P ? 640 : 560, zoom: P ? 1.1 : 1.04 }, { frame: dur - 1, x: P ? 760 : 840, y: P ? 640 : 560, zoom: P ? 1.1 : 1.04, ease: "inOut" }] },
    wind: { base: .2 },
    nodes: [
      ...riverWorld({ horizon: hz }),
      { id: "fuji", kind: "motif", motif: "mountain", depth: .32, x: 600, y: hz + 4, params: { width: 700, height: 300, mist: .5 } },
      { id: "kasumi", kind: "motif", motif: "cloud", depth: .4, x: 1300, y: 330, params: { width: 900, height: 60, color: "gofun" }, loops: [{ kind: "drift", amplitude: .3, period: 90 }] },
      { id: "pier", kind: "motif", motif: "pier", x: 1240, y: by - 10, params: { length: 900, depth: 140 } },
      { id: "post-lantern", kind: "motif", motif: "lantern", x: 1700, y: by - 36, params: { kind: "stone", size: 1.3 } },
      ...ferry("boat", 880, by + 10, [
        fig("ferryman", "ferryman", -190, -18, { facing: "right", actions: [{ type: "bow", start: 20, end: 80, angle: 30 }, { type: "pole", start: 150, end: dur }] }),
        fig("mother", "mother", 900, -46, { facing: "left", actions: [{ type: "walk", start: 50, end: 136, to: -770, toY: 28 }, { type: "kneel", start: 138, end: dur }] }),
        fig("child", "child", 1010, -46, { facing: "left", actions: [{ type: "walk", start: 64, end: 150, to: -785, toY: 28 }, { type: "kneel", start: 152, end: dur }] }),
        fig("traveller", "traveller", 720, -46, { facing: "left", actions: [{ type: "walk", start: 26, end: 112, to: -700, toY: 28 }, { type: "kneel", start: 114, end: dur }] }),
      ], { keys: [{ frame: 0, x: 880 }, { frame: 150, x: 880 }, { frame: dur - 1, x: 560, ease: "in" }], loops: [{ kind: "rock", amplitude: .5, period: 80 }] }),
      { id: "ripples", kind: "particles", type: "ripples", depth: .9, area: [300, 900, 1400, 260], count: 16, size: 1.4 },
      { id: "reeds", kind: "motif", motif: "reeds", depth: 1.3, x: 150, y: P ? 1460 : 1100, params: { width: 460, height: 230, count: 30 } },
      ...caption("cap-board", aspect, "The ferryman bowed, and pushed off into the dark water.", 60, dur, t),
    ],
  });
} };

const STORM_SKY = (hz: number): UkiyoeNode => ({ id: "storm", kind: "motif", motif: "sky", depth: .25, x: -900, y: -900, params: { width: 4400, height: hz + 1500, top: "sumi", mid: "usuzumi", band: .4, storm: 1, stormAt: .5 }, keys: [{ frame: 0, opacity: 0 }, { frame: 40, opacity: 0 }, { frame: 140, opacity: .92 }] }) as UkiyoeNode;

// ---- 4. The squall -----------------------------------------------------------------------------------------------------------------

const squall: UkiyoeShot = { id: "squall", title: "The squall", build: (aspect, t = {}) => {
  const P = aspect === "portrait", hz = 520, by = 880, dur = 330, breakAt = 236;
  const brace = (start: number) => [{ type: "kneel" as const, start: 0, end: dur }, { type: "brace" as const, start, end: dur - 30, angle: 10 }];
  return base("squall", aspect, dur, t, "edo", {
    camera: { keys: [{ frame: 0, x: 960, y: P ? 660 : 560, zoom: P ? 1.15 : 1 }, { frame: 200, x: 960, y: P ? 620 : 520, zoom: P ? 1.08 : .96, ease: "inOut" }, { frame: dur - 1, x: 940, y: P ? 640 : 540, zoom: P ? 1.12 : 1, ease: "inOut" }],
      shake: [{ frame: breakAt + 8, duration: 26, amount: 1.4 }, { frame: 60, duration: 14, amount: .4 }] },
    wind: { base: .2, turbulence: .5, gusts: [{ frame: 50, duration: 150, strength: 1.6 }, { frame: 180, duration: 140, strength: 2.2 }] },
    nodes: [
      ...riverWorld({ horizon: hz, storm: true }).flatMap((n, i) => i === 0 ? [n, STORM_SKY(hz)] : [n]),
      { id: "far-hills2", kind: "motif", motif: "hills", depth: .7, x: 960, y: hz + 6, params: { width: 4000, height: 120, color: "usuzumi", dark: "sumi", trees: .5, treeKind: "cedar", variant: 6 }, keys: [{ frame: 0, opacity: 0 }, { frame: 140, opacity: 1 }] },
      { id: "pine", kind: "motif", motif: "pine", depth: .7, x: 1760, y: hz + 8, params: { height: 170, lean: -10, pads: 5 } },
      { id: "fuji", kind: "motif", motif: "mountain", depth: .7, x: 1380, y: hz + 8, params: { width: 300, height: 130 } },
      { id: "wave", kind: "motif", motif: "wave", depth: .95, x: 420, y: by + 140, flip: true, params: { width: 1250, height: 700, breakAt, breakDuration: 40 },
        keys: [{ frame: 0, progress: 0 }, { frame: 90, progress: 0 }, { frame: 225, progress: 1, ease: "inOut" }], enter: { preset: "rise", frame: 70, duration: 30, distance: 160 } },
      { id: "wave-small", kind: "motif", motif: "wave", depth: 1.15, x: 260, y: by + 330, flip: true, params: { width: 560, height: 260, variant: 3 },
        keys: [{ frame: 0, progress: 0 }, { frame: 120, progress: 0 }, { frame: 250, progress: 1, ease: "inOut" }] },
      ...ferry("boat", 1120, by, [
        fig("ferryman", "ferryman", -190, -18, { facing: "right", actions: [{ type: "pole", start: 0, end: dur }] }),
        fig("traveller", "traveller", 20, -18, { facing: "left", actions: [...brace(110), { type: "look", start: 170, end: 236, angle: -20, back: true }] }),
        fig("mother", "mother", 130, -18, { facing: "left", look: { ...CAST.mother, prop: "none" }, actions: brace(130) } as Partial<Extract<UkiyoeNode, { kind: "figure" }>>),
        fig("child", "child", 220, -18, { facing: "left", actions: [{ type: "kneel", start: 0, end: dur }, { type: "startle", start: breakAt, end: breakAt + 26 }] }),
      ], { loops: [{ kind: "rock", amplitude: 1.1, period: 46, start: 0 }, { kind: "rock", amplitude: 1.6, period: 30, start: 160 }],
        keys: [{ frame: 0, x: 1120 }, { frame: breakAt, x: 1060, rotate: 0 }, { frame: breakAt + 14, x: 1100, rotate: -6, ease: "out" }, { frame: breakAt + 50, x: 1080, rotate: 0, ease: "inOut" }] }),
      { id: "spray", kind: "particles", type: "spray", depth: .95, bursts: [{ frame: breakAt + 10, x: 980, y: by - 120, radius: 300, count: 110 }, { frame: breakAt + 20, x: 1100, y: by - 20, radius: 180, count: 60 }] },
      { id: "rain", kind: "particles", type: "rain", depth: 1.1, area: [-300, -500, 2600, 2600], count: 560, speed: 38, angle: 6, opacity: .6, keys: [{ frame: 0, opacity: 0 }, { frame: 70, opacity: 0 }, { frame: 130, opacity: 1 }] },
      { id: "storm-wash", kind: "block", depth: 0, x: DIM[aspect][0] / 2, y: DIM[aspect][1] / 2, shape: { type: "rect", width: DIM[aspect][0] + 40, height: DIM[aspect][1] + 40 }, line: 0, blend: "multiply",
        fill: { type: "linear", angle: 90, stops: [[0, "usuzumi", .6], [1, "ai", .8]] }, keys: [{ frame: 0, opacity: 0 }, { frame: 60, opacity: 0 }, { frame: 160, opacity: .38 }, { frame: 290, opacity: .38 }, { frame: 329, opacity: .2 }] },
      ...caption("cap-squall-1", aspect, "Halfway across, the wind turned.", 40, 170, t),
      ...caption("cap-squall-2", aspect, "Then the river stood up.", 196, dur, t),
    ],
  });
} };

// ---- 5. Moonrise and fireworks -----------------------------------------------------------------------------------------------------

const fireworks: UkiyoeShot = { id: "fireworks", title: "Moonrise and fireworks", build: (aspect, t = {}) => {
  const P = aspect === "portrait", hz = 560, by = 900, dur = 360;
  const bursts = [
    { frame: 96, x: 1300, y: 160, radius: 200, color: "ki", kind: "peony" as const },
    { frame: 128, x: 700, y: 120, radius: 170, color: "sakura", kind: "willow" as const },
    { frame: 150, x: 1560, y: 260, radius: 140, color: "gofun", kind: "ring" as const },
    { frame: 200, x: 980, y: 60, radius: 230, color: "ki", kind: "willow" as const },
    { frame: 236, x: 420, y: 240, radius: 150, color: "shu", kind: "peony" as const },
    { frame: 262, x: 1360, y: 90, radius: 190, color: "gofun", kind: "peony" as const },
  ];
  return base("fireworks", aspect, dur, t, "night", {
    camera: { keys: [{ frame: 0, x: 960, y: P ? 820 : 700, zoom: P ? 1.1 : 1 }, { frame: 110, x: 960, y: P ? 560 : 470, zoom: P ? 1.04 : .94, ease: "inOut" }, { frame: 300, x: 980, y: P ? 560 : 480, zoom: P ? 1.04 : .94 }, { frame: dur - 1, x: 1000, y: P ? 700 : 560, zoom: P ? 1.1 : 1, ease: "inOut" }] },
    wind: { base: .1 },
    nodes: [
      ...riverWorld({ horizon: hz, night: true }),
      { id: "moon", kind: "motif", motif: "moon", depth: .25, x: 1640, y: 640, params: { radius: 60, halo: .9 }, keys: [{ frame: 0, y: 640 }, { frame: 160, y: 150, ease: "out" }] },
      { id: "clouds-leaving", kind: "motif", motif: "cloud", depth: .35, x: 900, y: 120, params: { width: 1600, height: 120, color: "usuzumi", steps: 3 }, keys: [{ frame: 0, x: 900, opacity: .9 }, { frame: 150, x: -400, opacity: 0, ease: "in" }] },
      { id: "fireworks", kind: "particles", type: "fireworks", depth: .4, bursts: bursts.map(b => ({ ...b, launchFrom: hz + 20 })) },
      { id: "far-town", kind: "motif", motif: "house", depth: .7, x: 1500, y: hz + 6, scale: .32, params: { width: 1200, height: 150, noren: "shu", wall: "usuzumi", panel: "ki", roofColor: "sumi", doors: 9 } },
      { id: "far-pagoda", kind: "motif", motif: "pagoda", depth: .7, x: 1880, y: hz + 6, scale: .45, params: { height: 460, wood: "kogecha" } },
      { id: "yakata-1", kind: "motif", motif: "boat", depth: .7, x: 300, y: hz + 120, scale: .55, params: { kind: "yakata" }, keys: [{ frame: 0, x: 200 }, { frame: dur - 1, x: 700 }], loops: [{ kind: "rock", amplitude: .3, period: 70 }] },
      { id: "yakata-2", kind: "motif", motif: "boat", depth: .75, x: 1500, y: hz + 170, scale: .62, flip: true, params: { kind: "yakata" }, keys: [{ frame: 0, x: 1700 }, { frame: dur - 1, x: 1250 }], loops: [{ kind: "rock", amplitude: .3, period: 64, phase: .4 }] },
      { id: "floating-lanterns", kind: "particles", type: "fireflies", depth: .85, area: [-200, hz + 220, 2400, 260], count: 26, size: 1.4, color: "tan" },
      ...ferry("boat", 1000, by, [
        fig("ferryman", "ferryman", -190, -18, { facing: "right", actions: [{ type: "pole", start: 0, end: 80 }, { type: "look", start: 90, end: dur, angle: -30 }] }),
        fig("traveller", "traveller", 20, -18, { facing: "left", actions: [{ type: "kneel", start: 0, end: dur }, { type: "look", start: 70, end: dur, angle: -32 }] }),
        fig("mother", "mother", 130, -18, { facing: "left", look: { ...CAST.mother, prop: "fan" }, actions: [{ type: "kneel", start: 0, end: dur }, { type: "look", start: 84, end: dur, angle: -28 }, { type: "point", start: 200, end: 270, angle: 140 }] } as Partial<Extract<UkiyoeNode, { kind: "figure" }>>),
        fig("child", "child", 225, -18, { facing: "left", actions: [{ type: "kneel", start: 0, end: 130 }, { type: "cheer", start: 134, end: 230 }, { type: "jump", start: 236, end: 262, amount: .2 }] }),
      ], { keys: [{ frame: 0, x: 1100 }, { frame: dur - 1, x: 860 }], loops: [{ kind: "rock", amplitude: .4, period: 90 }] }),
      { id: "ripples", kind: "particles", type: "ripples", depth: .9, area: [200, by - 20, 1600, 300], count: 20, color: "kin", size: 1.4 },
      ...caption("cap-fw-1", aspect, "Then the clouds let the moon through.", 20, 150, t),
      ...caption("cap-fw-2", aspect, "On the far bank, someone was celebrating.", 176, dur, t),
    ],
  });
} };

// ---- 6. Arrival ----------------------------------------------------------------------------------------------------------------------

const arrival: UkiyoeShot = { id: "arrival", title: "Arrival", build: (aspect, t = {}) => {
  const P = aspect === "portrait", [w, h] = DIM[aspect], hz = 520, by = 860, dur = 270;
  return base("arrival", aspect, dur, t, "night", {
    camera: { keys: [{ frame: 0, x: 900, y: P ? 640 : 560, zoom: P ? 1.15 : 1.05 }, { frame: 200, x: 1060, y: P ? 640 : 560, zoom: P ? 1.15 : 1.05, ease: "inOut" }, { frame: dur - 1, x: 1000, y: P ? 600 : 540, zoom: P ? 1.02 : .96, ease: "inOut" }] },
    nodes: [
      ...riverWorld({ horizon: hz, night: true }),
      { id: "moon", kind: "motif", motif: "moon", depth: .25, x: 400, y: 160, params: { radius: 54, halo: .8 } },
      { id: "far-bank", kind: "motif", motif: "hills", depth: .7, x: 1400, y: hz + 30, params: { width: 2400, height: 140, color: "matsu", dark: "yoru", trees: .6 } },
      { id: "torii", kind: "motif", motif: "torii", depth: .9, x: 1720, y: by - 70, params: { width: 260, height: 300 } },
      { id: "lantern-a", kind: "motif", motif: "lantern", depth: .9, x: 1540, y: by - 64, params: { kind: "stone", size: 1.1 } },
      { id: "lantern-b", kind: "motif", motif: "lantern", depth: .9, x: 1900, y: by - 64, params: { kind: "stone", size: 1.1 } },
      { id: "pier", kind: "motif", motif: "pier", x: 1200, y: by - 10, params: { length: 1000, depth: 140 } },
      ...ferry("boat", 760, by + 10, [
        fig("ferryman", "ferryman", -190, -18, { facing: "right", actions: [{ type: "pole", start: 0, end: 70 }, { type: "bow", start: 196, end: 250, angle: 34 }] }),
        fig("traveller", "traveller", 20, -18, { facing: "right", actions: [{ type: "kneel", start: 0, end: 80 }, { type: "walk", start: 88, end: 170, to: 560, toY: -28 }, { type: "turn", start: 172, end: 182 }, { type: "bow", start: 186, end: 246, angle: 36 }] }),
        fig("mother", "mother", 130, -18, { facing: "right", actions: [{ type: "kneel", start: 0, end: 96 }, { type: "walk", start: 100, end: dur, to: 900, toY: -28 }] }),
        fig("child", "child", 225, -18, { facing: "right", actions: [{ type: "kneel", start: 0, end: 90 }, { type: "run", start: 94, end: 150, to: 600, toY: -28 }, { type: "wave", start: 156, end: 230 }, { type: "walk", start: 230, end: dur, to: 900, toY: -28 }] }),
      ], { keys: [{ frame: 0, x: 600 }, { frame: 80, x: 760, ease: "out" }], loops: [{ kind: "rock", amplitude: .35, period: 80 }] }),
      { id: "fireflies", kind: "particles", type: "fireflies", depth: 1, area: [1300, by - 340, 800, 260], count: 16 },
      { id: "end", kind: "text", style: "cartouche", depth: 0, x: P ? w / 2 - 70 : w / 2 - 60, y: P ? 260 : 120, text: "終", sub: "おわり", size: P ? 64 : 54, enter: { preset: "stamp", frame: 214, duration: 10 } },
      { id: "end-seal", kind: "text", style: "seal", depth: 0, x: P ? w / 2 + 100 : w / 2 + 104, y: P ? 330 : 190, text: "組木", size: P ? 30 : 26, enter: { preset: "stamp", frame: 230, duration: 8 } },
      ...caption("cap-arrive", aspect, "On the far bank, nobody was in a hurry any more.", 90, 206, t),
      ...(t.captions === false ? [] : [{ id: "credit", kind: "text", style: "plain", depth: 0, x: w / 2, y: P ? h - 260 : h - 96, align: "middle", text: "An original UKIYO1 film · Kumiki UI", size: P ? 30 : 24, color: "gofun", from: 226, enter: { preset: "mist", frame: 226, duration: 18 } } as UkiyoeNode]),
    ],
  });
} };

export const NIGHT_FERRY_SHOTS: readonly UkiyoeShot[] = [title, town, boarding, squall, fireworks, arrival];
