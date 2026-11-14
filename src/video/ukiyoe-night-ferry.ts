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
  grandmother: { robe: "cha", robePattern: { type: "shima", color: "kogecha", scale: .4, opacity: .6 }, hair: "topknot", hairColor: "usuzumi", obi: "ai", lower: "robe", feet: "waraji" },
  momo: { robe: "ki", robePattern: { type: "sakura", color: "beni", scale: .55, opacity: .9 }, hair: "child", build: "child", hat: "headband", hatColor: "gofun", lower: "hakama", hakama: "ai", feet: "waraji", obi: "shu", prop: "peach" },
  "oni-red": { build: "brute", skin: "shu", legs: "shu", upper: "bare", lower: "loincloth", robe: "ki", robePattern: { type: "tora", color: "sumi", scale: 1.1 }, hair: "wild", face: "oni", horns: 2, prop: "kanabo", feet: "bare", obi: "kogecha" },
  "oni-blue": { build: "brute", skin: "asagi", legs: "asagi", upper: "bare", lower: "loincloth", robe: "ki", robePattern: { type: "tora", color: "sumi", scale: 1.1 }, hair: "wild", hairColor: "kogecha", face: "oni", horns: 1, prop: "kanabo", feet: "bare", obi: "kogecha" },
  boy: { robe: "sora", robePattern: { type: "yagasuri", color: "ai", scale: .45, opacity: .8 }, hair: "child", build: "child", obi: "kogecha", feet: "waraji" },
};

export const DIM = { landscape: [1920, 1080], portrait: [1080, 1920] } as const;
export const fig = (id: string, who: keyof typeof CAST, x: number, y: number, extra: Partial<Extract<UkiyoeNode, { kind: "figure" }>> = {}): UkiyoeNode =>
  ({ id, kind: "figure", look: CAST[who], x, y, ...extra } as UkiyoeNode);

export function base(id: string, aspect: UkiyoeAspect, durationFrames: number, t: UkiyoeFilmTweaks, preset: UkiyoePresetName, extra: Partial<UkiyoeSceneSpec>): UkiyoeSceneSpec {
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
export const caption = (id: string, aspect: UkiyoeAspect, text: string, from: number, to: number, t: UkiyoeFilmTweaks): UkiyoeNode[] => {
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
      { id: "fuji", kind: "motif", motif: "mountain", depth: .32, x: 760, y: hz + 4, params: { width: 760, height: 330, flames: 26, snowLine: .2 } },
      { id: "kasumi", kind: "motif", motif: "cloud", depth: .4, x: 520, y: 470, params: { width: 760, height: 64, color: "kin", steps: 3 }, loops: [{ kind: "drift", amplitude: .4, period: 120 }] },
      { id: "birds", kind: "particles", type: "birds", depth: .5, area: [1500, 300, 0, 0], count: 7, angle: 192, speed: 2.2, size: 1.1 },
      { id: "willow", kind: "motif", motif: "willow", x: 240, y: hz + 120, params: { height: 520, strands: 26 } },
      { id: "pier", kind: "motif", motif: "pier", x: 1450, y: hz + 210, params: { length: 700 } },
      ...ferry("boat", 1180, hz + 250, [fig("ferryman", "ferryman", SEAT.ferryman, DECK, { scale: .8, facing: "right", actions: [{ type: "hold", start: 0, end: 179, angle: 70, amount: 30 }] })], { loops: [{ kind: "rock", amplitude: .6, period: 80 }] }),
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
  const keys = scrollPan({ from: P ? 4950 : 4700, to: P ? 1010 : 1050, y: camY, start: 0, end: dur - 1, zoom: P ? 1.15 : 1,
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
      // The street ends at the ferry landing: the river comes round in front of the bank here, so the boat floats.
      { id: "landing-water", kind: "motif", motif: "sea", x: -1100, y: gy + 52, params: { width: 2640, height: 700, rows: 9, swell: .6, foam: 0, deepAt: 260 } },
      { id: "landing-bank", kind: "block", x: 0, y: 0, shape: { type: "polygon", points: [[1500, gy + 46], [1760, gy + 46], [1760, gy + 760], [1380, gy + 760], [1440, gy + 300], [1470, gy + 120]] },
        fill: { type: "linear", angle: 90, stops: [[0, "kincha", 1], [.12, "kusa", 1], [1, "matsu", 1]] }, grain: .8, line: 1.6 },
      { id: "landing-reeds", kind: "motif", motif: "reeds", x: 1470, y: gy + 150, params: { width: 150, height: 110, count: 12 } },
      { id: "pier", kind: "motif", motif: "pier", x: 700, y: gy + 40, params: { length: 800, depth: 60 } },
      ...ferry("boat", 1050, gy + 70, [fig("ferryman", "ferryman", SEAT.ferryman, DECK, { scale: .78, facing: "left", actions: [{ type: "hold", start: 0, end: 330, angle: 70, amount: 30 }, { type: "bow", start: 336, end: dur, angle: 26 }] })], { loops: [{ kind: "rock", amplitude: .5, period: 90 }] }),
      // Street life on twos; the traveller walks the whole scroll (continuous narration).
      fig("porter", "porter", 3950, gy + 40, { scale: .82, facing: "left", actions: [{ type: "walk", start: 10, end: 300, to: -980 }] }),
      fig("elder", "elder", 2470, gy + 44, { scale: .8, facing: "right", actions: [{ type: "talk", start: 140, end: 210 }, { type: "bow", start: 214, end: 270, angle: 30 }] }),
      fig("merchant", "merchant", 2650, gy + 44, { scale: .8, facing: "left", actions: [{ type: "bow", start: 150, end: 205, angle: 36 }, { type: "talk", start: 210, end: 270 }] }),
      fig("mother", "mother", 3420, gy + 46, { scale: .82, facing: "left", actions: [{ type: "walk", start: 0, end: dur, to: -1500 }] }),
      fig("child", "child", 3300, gy + 48, { scale: .82, facing: "left", actions: [{ type: "run", start: 0, end: 60, to: -150 }, { type: "walk", start: 60, end: dur, to: -1380 }] }),
      fig("boy", "boy", 1900, gy + 48, { scale: .82, facing: "right", actions: [{ type: "cheer", start: 230, end: 300 }, { type: "run", start: 300, end: dur, to: 420 }] }),
      fig("traveller", "traveller", 4820, gy + 50, { scale: .86, facing: "left", actions: [{ type: "walk", start: 0, end: dur - 10, to: -3430 }] }),
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

// ---- The ferry ------------------------------------------------------------------------------------------------------------------------

/** Seats along the ferry's flat deck, in boat coordinates (the stern is negative, the bow positive). */
const SEAT = { ferryman: -190, traveller: -60, mother: 30, child: 112 } as const;
const DECK = -18;
/** One pole stroke (see the figure `pole` action); the hull's `surge` loop uses the same period. */
const STROKE = 44;

/**
 * The ferry heads left, the reading direction of the scroll, so the group is mirrored: child x runs from the stern
 * (negative) to the bow (positive) and "right" means "toward the bow". Crew are drawn in the order given.
 */
function ferry(id: string, x: number, y: number, crew: UkiyoeNode[], extra: Partial<UkiyoeNode> = {}, hull: { wake?: readonly { frame: number; progress: number }[] } = {}): UkiyoeNode[] {
  return [
    { id, kind: "group", x, y, flip: true, ...extra } as UkiyoeNode,
    { id: id + "-hull", kind: "motif", motif: "boat", parent: id, params: { length: 520, kind: "ferry", wake: hull.wake ? 1 : 0 }, ...(hull.wake ? { keys: hull.wake } : {}) } as UkiyoeNode,
    ...crew.map(p => ({ ...p, parent: id }) as UkiyoeNode),
  ];
}

/**
 * Keys and loops for a ferry poled leftward from `fromX` while the pole works (`start`..`end`). From rest it gathers
 * way within the first push (visibly moving after a few frames); `underway` starts at full speed for shots that open
 * mid-crossing. It runs at `speed` px/frame, surging on every stroke, then glides to rest over `glide` frames.
 * Speeds match across every key, so the hull never stalls while the ferryman is working.
 */
function poled(fromX: number, start: number, end: number, speed = 2.5, glide = 50, underway = false) {
  const gather = underway ? 0 : 30, under = fromX - speed * gather / 2, cruise = under - speed * (end - start - gather), rest = cruise - speed * glide / 2;
  return {
    cruiseX: cruise, restX: rest,
    /** Keys while the pole works (no glide): append your own continuation after these. */
    working: [{ frame: start, x: fromX }, ...(underway ? [] : [{ frame: start + gather, x: under, ease: "inQuad" as const }]), { frame: end, x: cruise, ease: "linear" as const }],
    get keys() { return [...this.working, { frame: end + glide, x: rest, ease: "outQuad" as const }]; },
    // The surge is proportional to the speed, so even a slow hull keeps advancing between pushes.
    surge: { kind: "surge" as const, amplitude: -.32 * speed, period: STROKE, end: end + 10, fade: 26, ...(underway ? { phase: -(start % STROKE) / STROKE } : { start }) },
    wake: [...(underway ? [{ frame: start, progress: 1 }] : [{ frame: start, progress: 0 }, { frame: start + gather, progress: 1 }]), { frame: end, progress: 1 }, { frame: end + glide, progress: 0 }],
  };
}

// ---- 3. Boarding ------------------------------------------------------------------------------------------------------------------

const boarding: UkiyoeShot = { id: "boarding", title: "Boarding", build: (aspect, t = {}) => {
  const P = aspect === "portrait", hz = 520, by = 860, dur = 300, depart = 196;
  // The ferry lies alongside the landing stage: the pier runs behind it, a step above its deck.
  const BX = 1000, BY = by + 10, pierTop = -52, go = poled(BX, depart, dur + 40);
  // A passenger walks the pier to a point above their seat, then steps down into the boat.
  const board = (who: "traveller" | "mother" | "child", fromWorldX: number, start: number, end: number, gait: "walk" | "run" = "walk") => {
    const from = BX - fromWorldX, seat = SEAT[who];
    return fig(who, who, from, pierTop, { facing: "right", actions: [
      { type: gait, start, end, to: seat - from, toY: DECK - pierTop, via: [[seat - from - 30, 0]] }, { type: "kneel", start: end + 2, end: dur }] });
  };
  return base("boarding", aspect, dur, t, "twilight", {
    camera: { keys: [{ frame: 0, x: P ? 1180 : 1140, y: P ? 640 : 560, zoom: P ? 1.1 : 1 }, { frame: depart, x: 1000, y: P ? 640 : 560, zoom: P ? 1.1 : 1.04, ease: "inOut" }, { frame: dur - 1, x: P ? 820 : 880, y: P ? 640 : 560, zoom: P ? 1.1 : 1.04, ease: "inOut" }] },
    wind: { base: .2 },
    nodes: [
      ...riverWorld({ horizon: hz }),
      { id: "fuji", kind: "motif", motif: "mountain", depth: .32, x: 600, y: hz + 4, params: { width: 560, height: 250 } },
      { id: "kasumi", kind: "motif", motif: "cloud", depth: .4, x: 1300, y: 330, params: { width: 900, height: 60, color: "gofun" }, loops: [{ kind: "drift", amplitude: .3, period: 90 }] },
      // The posts meet the water behind the boat, so they end at its waterline.
      { id: "pier", kind: "motif", motif: "pier", x: 640, y: BY + pierTop + 26, params: { length: 1900, depth: 36 } },
      { id: "post-lantern", kind: "motif", motif: "lantern", x: 1420, y: BY + pierTop, params: { kind: "stone", size: 1.2 } },
      ...ferry("boat", BX, BY, [
        board("child", 1760, 78, 156, "run"),
        board("mother", 1640, 44, 164),
        board("traveller", 1480, 22, 100),
        fig("ferryman", "ferryman", SEAT.ferryman, DECK, { facing: "right", actions: [{ type: "bow", start: 24, end: 84, angle: 28 }, { type: "pole", start: depart, end: dur + 40 }] }),
      ], { keys: go.keys, loops: [{ kind: "rock", amplitude: .5, period: 80, start: depart - 10, fade: 50 }, go.surge] }, { wake: go.wake }),
      { id: "ripples", kind: "particles", type: "ripples", depth: .9, area: [300, 900, 1400, 260], count: 16, size: 1.4 },
      { id: "reeds", kind: "motif", motif: "reeds", depth: 1.3, x: 150, y: P ? 1460 : 1100, params: { width: 460, height: 230, count: 30 } },
      ...caption("cap-board", aspect, "The ferryman bowed, and pushed off into the dark water.", 70, dur, t),
    ],
  });
} };

const STORM_SKY = (hz: number): UkiyoeNode => ({ id: "storm", kind: "motif", motif: "sky", depth: .25, x: -900, y: -900, params: { width: 4400, height: hz + 1500, top: "sumi", mid: "usuzumi", band: .4, storm: 1, stormAt: .5 }, keys: [{ frame: 0, opacity: 0 }, { frame: 40, opacity: 0 }, { frame: 140, opacity: .92 }] }) as UkiyoeNode;

// ---- 4. The squall -----------------------------------------------------------------------------------------------------------------

const squall: UkiyoeShot = { id: "squall", title: "The squall", build: (aspect, t = {}) => {
  const P = aspect === "portrait", hz = 520, by = 880, dur = 400, breakAt = 252, caught = 190;
  // The ferryman poles on until the wave catches the boat; the water then draws it up the face, the crest breaks,
  // and the collapse throws the boat back before he can pole again.
  const go = poled(1500, 0, caught, 2.5, 1, true), drawnX = go.cruiseX - 96, faceX = 772, thrownX = 1040, resume = 340, again = poled(thrownX, resume, dur + 40, 1.8);
  const brace = (start: number) => [{ type: "kneel" as const, start: 0, end: dur }, { type: "brace" as const, start, end: breakAt + 60, angle: 10 }];
  return base("squall", aspect, dur, t, "edo", {
    camera: { keys: [{ frame: 0, x: P ? 1420 : 1340, y: P ? 660 : 560, zoom: P ? 1.15 : 1 }, { frame: caught, x: P ? 930 : 940, y: P ? 630 : 530, zoom: P ? 1.1 : .97, ease: "inOut" },
      { frame: breakAt, x: P ? 820 : 890, y: P ? 600 : 510, zoom: P ? 1.06 : .95, ease: "inOut" }, { frame: dur - 1, x: P ? 960 : 930, y: P ? 640 : 540, zoom: P ? 1.12 : 1, ease: "inOut" }],
      shake: [{ frame: breakAt + 10, duration: 28, amount: 1.5 }, { frame: 60, duration: 14, amount: .4 }] },
    wind: { base: .2, turbulence: .5, gusts: [{ frame: 50, duration: 150, strength: 1.6 }, { frame: 180, duration: 150, strength: 2.2 }] },
    nodes: [
      ...riverWorld({ horizon: hz, storm: true }).flatMap((n, i) => i === 0 ? [n, STORM_SKY(hz)] : [n]),
      { id: "far-hills2", kind: "motif", motif: "hills", depth: .7, x: 960, y: hz + 6, params: { width: 4000, height: 120, color: "usuzumi", dark: "sumi", trees: .5, treeKind: "cedar", variant: 6 }, keys: [{ frame: 0, opacity: 0 }, { frame: 140, opacity: 1 }] },
      { id: "pine", kind: "motif", motif: "pine", depth: .7, x: 1900, y: hz + 8, params: { height: 170, lean: -10, pads: 5 } },
      { id: "fuji", kind: "motif", motif: "mountain", depth: .7, x: 1210, y: hz + 8, params: { width: 300, height: 130 } },
      { id: "wave", kind: "motif", motif: "wave", x: 358, y: by + 44, flip: true, params: { width: 1250, height: 720, breakAt, breakDuration: 40, travel: .1 },
        keys: [{ frame: 0, progress: 0 }, { frame: 56, progress: 0 }, { frame: breakAt - 12, progress: 1, ease: "sine" }], enter: { preset: "fade", frame: 50, duration: 30 } },
      ...ferry("boat", 1500, by, [
        fig("child", "child", SEAT.child, DECK, { facing: "right", actions: [{ type: "kneel", start: 0, end: dur }, { type: "point", start: 150, end: 196, angle: 120 }, { type: "startle", start: breakAt, end: breakAt + 26 }] }),
        fig("mother", "mother", SEAT.mother, DECK, { facing: "right", look: { ...CAST.mother, prop: "none" }, actions: brace(176) } as Partial<Extract<UkiyoeNode, { kind: "figure" }>>),
        fig("traveller", "traveller", SEAT.traveller, DECK, { facing: "right", actions: [...brace(186), { type: "look", start: 120, end: 180, angle: -24 }] }),
        fig("ferryman", "ferryman", SEAT.ferryman, DECK, { facing: "right", actions: [{ type: "pole", start: 0, end: caught }, { type: "brace", start: caught + 4, end: resume - 12, angle: 12 }, { type: "pole", start: resume, end: dur + 40 }] }),
      ], { ride: { on: "wave", amount: 1, tilt: .42, span: 320 },
        // Drawn in faster and faster, held a moment on the face as the crest breaks, then carried back down by the
        // collapse (a slow start and stop to the slide, so nothing pops), settling before the pole goes in again.
        keys: [...go.working, { frame: caught + 30, x: drawnX, ease: "linear" }, { frame: breakAt, x: faceX, ease: "linear" }, { frame: breakAt + 14, x: faceX - 14, rotate: 0, ease: "outQuad" },
          { frame: breakAt + 80, x: thrownX, rotate: 2, ease: "sine" }, { frame: resume, x: thrownX, rotate: 0, ease: "inOut" }, ...again.keys.slice(1)],
        loops: [go.surge, again.surge, { kind: "rock", amplitude: .9, period: 52, end: breakAt, fade: 40 }, { kind: "rock", amplitude: 2.1, period: 30, start: caught - 30, end: 372, fade: 56 }] },
        { wake: [...go.wake.slice(0, -1), { frame: caught + 30, progress: 0 }, ...again.wake] }),
      { id: "sea-front", kind: "motif", motif: "sea", x: -800, y: by + 36, params: { width: 4200, height: 500, rows: 6, swell: 2.4, foam: .8, deepAt: 60, color: "bero", light: "ai", speed: .8 } },
      { id: "wave-small", kind: "motif", motif: "wave", depth: 1.15, x: 240, y: by + 330, flip: true, params: { width: 560, height: 260, variant: 3 },
        keys: [{ frame: 0, progress: 0 }, { frame: 110, progress: 0 }, { frame: 270, progress: 1, ease: "sine" }] },
      { id: "spray", kind: "particles", type: "spray", bursts: [{ frame: breakAt + 12, x: faceX - 40, y: by - 60, radius: 150, count: 26 }, { frame: breakAt + 24, x: faceX + 150, y: by - 20, radius: 110, count: 16 }] },
      { id: "rain", kind: "particles", type: "rain", depth: 1.1, area: [-300, -500, 2900, 2600], count: 560, speed: 38, angle: 6, opacity: .6, keys: [{ frame: 0, opacity: 0 }, { frame: 70, opacity: 0 }, { frame: 130, opacity: 1 }] },
      { id: "storm-wash", kind: "block", depth: 0, x: DIM[aspect][0] / 2, y: DIM[aspect][1] / 2, shape: { type: "rect", width: DIM[aspect][0] + 40, height: DIM[aspect][1] + 40 }, line: 0, blend: "multiply",
        fill: { type: "linear", angle: 90, stops: [[0, "usuzumi", .6], [1, "ai", .8]] }, keys: [{ frame: 0, opacity: 0 }, { frame: 60, opacity: 0 }, { frame: 160, opacity: .38 }, { frame: 340, opacity: .38 }, { frame: dur - 1, opacity: .2 }] },
      ...caption("cap-squall-1", aspect, "Halfway across, the wind turned.", 40, 170, t),
      ...caption("cap-squall-2", aspect, "Then the river stood up.", 206, dur, t),
    ],
  });
} };

// ---- 5. Moonrise and fireworks -----------------------------------------------------------------------------------------------------

const fireworks: UkiyoeShot = { id: "fireworks", title: "Moonrise and fireworks", build: (aspect, t = {}) => {
  const P = aspect === "portrait", hz = 560, by = 900, dur = 360, rest = 112;
  const go = poled(1330, 0, rest, 2.4, 70, true);
  const bursts = [
    { frame: 96, x: 1300, y: 160, radius: 200, color: "ki", kind: "peony" as const },
    { frame: 128, x: 700, y: 120, radius: 170, color: "sakura", kind: "willow" as const },
    { frame: 150, x: 1560, y: 260, radius: 140, color: "gofun", kind: "ring" as const },
    { frame: 200, x: 980, y: 60, radius: 230, color: "ki", kind: "willow" as const },
    { frame: 236, x: 420, y: 240, radius: 150, color: "shu", kind: "peony" as const },
    { frame: 262, x: 1360, y: 90, radius: 190, color: "gofun", kind: "peony" as const },
  ];
  return base("fireworks", aspect, dur, t, "night", {
    camera: { keys: [{ frame: 0, x: 1040, y: P ? 820 : 700, zoom: P ? 1.1 : 1 }, { frame: 110, x: 960, y: P ? 560 : 470, zoom: P ? 1.04 : .94, ease: "inOut" }, { frame: 300, x: 960, y: P ? 560 : 480, zoom: P ? 1.04 : .94 }, { frame: dur - 1, x: 960, y: P ? 700 : 560, zoom: P ? 1.1 : 1, ease: "inOut" }] },
    wind: { base: .1 },
    nodes: [
      ...riverWorld({ horizon: hz, night: true }),
      { id: "moon", kind: "motif", motif: "moon", depth: .25, x: 1640, y: 640, params: { radius: 60, halo: .9 }, keys: [{ frame: 0, y: 640 }, { frame: 160, y: 150, ease: "out" }] },
      { id: "clouds-leaving", kind: "motif", motif: "cloud", depth: .35, x: 900, y: 120, params: { width: 1600, height: 120, color: "usuzumi", steps: 3 }, keys: [{ frame: 0, x: 900, opacity: .9 }, { frame: 150, x: -400, opacity: 0, ease: "in" }] },
      { id: "fireworks", kind: "particles", type: "fireworks", depth: .4, bursts: bursts.map(b => ({ ...b, launchFrom: hz + 20 })) },
      { id: "far-town", kind: "motif", motif: "house", depth: .7, x: 1500, y: hz + 6, scale: .32, params: { width: 1200, height: 150, noren: "shu", wall: "usuzumi", panel: "ki", roofColor: "sumi", doors: 9 } },
      { id: "far-pagoda", kind: "motif", motif: "pagoda", depth: .7, x: 1880, y: hz + 6, scale: .45, params: { height: 460, wood: "kogecha" } },
      { id: "yakata-1", kind: "motif", motif: "boat", depth: .7, x: 300, y: hz + 120, scale: .55, params: { kind: "yakata", water: "yoru", wake: .5 }, keys: [{ frame: 0, x: 200 }, { frame: dur - 1, x: 700 }], loops: [{ kind: "rock", amplitude: .3, period: 70 }] },
      { id: "yakata-2", kind: "motif", motif: "boat", depth: .75, x: 1500, y: hz + 170, scale: .62, flip: true, params: { kind: "yakata", water: "yoru", wake: .5 }, keys: [{ frame: 0, x: 1700 }, { frame: dur - 1, x: 1250 }], loops: [{ kind: "rock", amplitude: .3, period: 64, phase: .4 }] },
      { id: "floating-lanterns", kind: "particles", type: "fireflies", depth: .85, area: [-200, hz + 220, 2400, 260], count: 26, size: 1.4, color: "tan" },
      ...ferry("boat", 1330, by, [
        fig("child", "child", SEAT.child, DECK, { facing: "right", actions: [{ type: "kneel", start: 0, end: 130 }, { type: "cheer", start: 134, end: 230 }, { type: "jump", start: 236, end: 262, amount: .2 }] }),
        fig("mother", "mother", SEAT.mother, DECK, { facing: "right", look: { ...CAST.mother, prop: "fan" }, actions: [{ type: "kneel", start: 0, end: dur }, { type: "look", start: 84, end: dur, angle: -28 }, { type: "point", start: 200, end: 270, angle: 140 }] } as Partial<Extract<UkiyoeNode, { kind: "figure" }>>),
        fig("traveller", "traveller", SEAT.traveller, DECK, { facing: "right", actions: [{ type: "kneel", start: 0, end: dur }, { type: "look", start: 70, end: dur, angle: -32 }] }),
        fig("ferryman", "ferryman", SEAT.ferryman, DECK, { facing: "right", actions: [{ type: "pole", start: 0, end: rest }, { type: "look", start: rest + 10, end: dur, angle: -30 }] }),
      ], { keys: go.keys, loops: [{ kind: "rock", amplitude: .4, period: 90 }, go.surge] }, { wake: go.wake }),
      { id: "ripples", kind: "particles", type: "ripples", depth: .9, area: [200, by - 20, 1600, 300], count: 20, color: "kin", size: 1.4 },
      ...caption("cap-fw-1", aspect, "Then the clouds let the moon through.", 20, 150, t),
      ...caption("cap-fw-2", aspect, "On the far bank, someone was celebrating.", 176, dur, t),
    ],
  });
} };

// ---- 6. Arrival ----------------------------------------------------------------------------------------------------------------------

const arrival: UkiyoeShot = { id: "arrival", title: "Arrival", build: (aspect, t = {}) => {
  const P = aspect === "portrait", [w, h] = DIM[aspect], hz = 520, by = 860, dur = 366, landed = 150;
  // The ferry glides in alongside the far landing stage; nobody steps off until it lies still against the pier.
  const BY = by + 10, pierTop = -52, go = poled(1320, 0, landed, 2.6, 56, true), BX = go.restX, docked = landed + 56;
  // Step up from a seat onto the pier, then walk ashore (left).
  const ashore = (who: "traveller" | "mother" | "child", toWorldX: number, start: number, end: number, more: readonly unknown[] = [], gait: "walk" | "run" = "walk") =>
    fig(who, who, SEAT[who], DECK, { facing: "right", actions: [{ type: "kneel", start: 0, end: start - 8 },
      { type: gait, start, end, to: BX - toWorldX - SEAT[who], toY: pierTop - DECK, via: [[30, pierTop - DECK]] }, ...more] as never });
  return base("arrival", aspect, dur, t, "night", {
    camera: { keys: [{ frame: 0, x: 1040, y: P ? 640 : 560, zoom: P ? 1.15 : 1.05 }, { frame: docked + 40, x: P ? 620 : 700, y: P ? 640 : 560, zoom: P ? 1.15 : 1.05, ease: "inOut" }, { frame: dur - 1, x: P ? 640 : 740, y: P ? 600 : 540, zoom: P ? 1.02 : .96, ease: "inOut" }] },
    nodes: [
      ...riverWorld({ horizon: hz, night: true }),
      { id: "moon", kind: "motif", motif: "moon", depth: .25, x: 1500, y: 160, params: { radius: 54, halo: .8 } },
      { id: "far-bank", kind: "motif", motif: "hills", depth: .7, x: 300, y: hz + 30, params: { width: 2400, height: 140, color: "matsu", dark: "yoru", trees: .6 } },
      { id: "torii", kind: "motif", motif: "torii", depth: .9, x: 130, y: by - 70, params: { width: 260, height: 300 } },
      { id: "lantern-a", kind: "motif", motif: "lantern", depth: .9, x: -40, y: by - 64, params: { kind: "stone", size: 1.1 } },
      { id: "lantern-b", kind: "motif", motif: "lantern", depth: .9, x: 320, y: by - 64, params: { kind: "stone", size: 1.1 } },
      { id: "pier", kind: "motif", motif: "pier", x: -700, y: BY + pierTop + 26, params: { length: 700 + BX + 150, depth: 36 } },
      ...ferry("boat", 1240, BY, [
        ashore("child", 250, docked + 8, docked + 62, [{ type: "wave", start: docked + 70, end: docked + 120 }, { type: "walk", start: docked + 124, end: dur + 30, to: BX + 80 - SEAT.child }], "run"),
        ashore("mother", 60, docked + 18, dur + 30),
        ashore("traveller", 420, docked + 12, docked + 96, [{ type: "turn", start: docked + 100, end: docked + 110 }, { type: "bow", start: docked + 114, end: dur, angle: 34 }]),
        fig("ferryman", "ferryman", SEAT.ferryman, DECK, { facing: "right", actions: [{ type: "pole", start: 0, end: landed }, { type: "bow", start: docked + 100, end: dur, angle: 32 }] }),
      ], { keys: go.keys, loops: [{ kind: "rock", amplitude: .4, period: 80, end: docked, fade: 46 }, go.surge] }, { wake: go.wake }),
      { id: "fireflies", kind: "particles", type: "fireflies", depth: 1, area: [-100, by - 360, 800, 260], count: 16 },
      { id: "end", kind: "text", style: "cartouche", depth: 0, x: P ? w / 2 - 70 : w / 2 - 60, y: P ? 260 : 120, text: "終", sub: "おわり", size: P ? 64 : 54, enter: { preset: "stamp", frame: dur - 56, duration: 10 } },
      { id: "end-seal", kind: "text", style: "seal", depth: 0, x: P ? w / 2 + 100 : w / 2 + 104, y: P ? 330 : 190, text: "組木", size: P ? 30 : 26, enter: { preset: "stamp", frame: dur - 40, duration: 8 } },
      ...caption("cap-arrive", aspect, "On the far bank, nobody was in a hurry any more.", 120, dur - 64, t),
      ...(t.captions === false ? [] : [{ id: "credit", kind: "text", style: "plain", depth: 0, x: w / 2, y: P ? h - 260 : h - 96, align: "middle", text: "An original UKIYO1 film · Kumiki UI", size: P ? 30 : 24, color: "gofun", from: dur - 44, enter: { preset: "mist", frame: dur - 44, duration: 18 } } as UkiyoeNode]),
    ],
  });
} };

export const NIGHT_FERRY_SHOTS: readonly UkiyoeShot[] = [title, town, boarding, squall, fireworks, arrival];
