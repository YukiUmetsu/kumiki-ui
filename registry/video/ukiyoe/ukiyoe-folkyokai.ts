/**
 * UKIYO1 household and road yōkai, after Toriyama Sekien's *Akaname* (a wild-haired imp with a long tongue and one-toed
 * clawed feet, peeking into the bathhouse), *Nurarihyon* (an old gentleman with an enormous bald gourd of a head, in fine
 * robes) and *Dodomeki* (a veiled woman whose arms are covered with eyes), and Shunsen's *Azukiarai* (a squat, grinning
 * little man washing beans in a tub at the stream's edge). All Wikimedia Commons, public domain.
 *
 * - Hair `gourd`: Nurarihyon's head, bald and swelling far up and back, wrinkled.
 * - Look `mino`: a straw rain cape over the shoulders and back, fringed (farmers in snow, the snow child, Kasa Jizō).
 * - Look `eyes`: eyes opening along the forearms and the backs of the hands (Dodomeki), blinking in turn.
 * - Prop `zaru`: a shallow basket of red azuki beans held in both hands (the bean-washer).
 * - Action `throw`: a wind-up over the shoulder and a fling forward; with `prop: "sand"`-free figures the hand releases a
 *   spray of sand at the `contact` frame (Sunakake-baba) that flies forward and falls.
 * - Yōkai `akaname`: the filth-licker, crawling on all fours, its long tongue licking.
 */
import type { Pt } from "./ukiyoe-core";
import { carvedLine, clamp01, hash01, lerp, smoothD } from "./ukiyoe-core";
import type { Prim } from "./ukiyoe-prims";
import { circleD, ellipseD } from "./ukiyoe-prims";
import type { UkiyoePaint } from "./ukiyoe-pigments";

type Map2 = (x: number, y: number) => Pt;
const f1 = (n: number) => n.toFixed(1);

/** Nurarihyon's gourd head in profile (head units, ±20 the face): a bald dome swelling up and back, wrinkles, a fringe of white hair at the nape. */
export function gourdSide(P: Map2, lw: number, skin: UkiyoePaint): Prim[] {
  return [{ t: "fill", d: smoothD([P(12, -14), P(12, -34), P(0, -58), P(-26, -70), P(-52, -60), P(-62, -34), P(-50, -10), P(-28, 4), P(-12, 6), P(-4, -8)], true, .4), fill: skin, outline: lw },
    { t: "stroke", d: [[-14, -48], [-28, -54], [-42, -46], [-24, -38]].map(([x, y]) => `M${f1(P(x, y)[0])} ${f1(P(x, y)[1])}q${f1(P(4, -2)[0] - P(0, 0)[0])} ${f1(P(4, -2)[1] - P(0, 0)[1])} ${f1(P(8, 0)[0] - P(0, 0)[0])} 0`).join(""), color: "cha", width: lw * .6, opacity: .7 },
    { t: "fill", d: smoothD([P(-26, -6), P(-36, -10), P(-32, 2), P(-18, 6)], true, .4), fill: "gofun", outline: lw * .6 }];
}

/** The gourd head square on (radius 1): a tall wide bald dome above the face. */
export function gourdSquare(P: Map2, lw: number, skin: UkiyoePaint): Prim[] {
  return [{ t: "fill", d: smoothD([P(-.9, -.4), P(-1.5, -1.8), P(-.9, -3.3), P(.9, -3.3), P(1.5, -1.8), P(.9, -.4), P(0, -.8)], true, .45), fill: skin, outline: lw },
    { t: "stroke", d: [-2.6, -2.2, -1.8, -1.4].map(y => `M${f1(P(-.4, y)[0])} ${f1(P(-.4, y)[1])}q${f1(P(.4, -.08)[0] - P(0, 0)[0])} ${f1(P(.4, -.08)[1] - P(0, 0)[1])} ${f1(P(.8, 0)[0] - P(0, 0)[0])} 0`).join(""), color: "cha", width: lw * .6, opacity: .7 }];
}

/** A straw rain cape (mino) from the neck over the shoulders and back to the hips: layered straw, a ragged fringe. */
export function minoSide(neck: Pt, back: Pt, waistB: Pt, waistF: Pt, H: number, lw: number, frame: number, wind: number): Prim[] {
  const sway = Math.sin(frame / 13) * H * .004 - wind * H * .01, out: Prim[] = [];
  const hem: Pt[] = [];
  for (let i = 0; i <= 14; i++) { const u = i / 14, x = lerp(waistF[0] + H * .03, waistB[0] - H * .1, u) + sway * u, y = lerp(waistF[1], waistB[1], u) + H * .16 + (i % 2 ? H * .02 : 0); hem.push([x, y]); }
  const shape: Pt[] = [[neck[0] + H * .03, neck[1] + H * .03], [neck[0] - H * .05, neck[1] - H * .01], [back[0] - H * .08, back[1] + H * .03], ...hem.slice().reverse()];
  out.push({ t: "fill", d: smoothD(shape, true, .15), fill: { type: "linear", angle: 90, stops: [[0, "kincha", 1], [1, "cha", 1]] }, outline: lw, grain: .9 });
  const straw: string[] = [];
  for (let r = 0; r < 4; r++) for (let i = 0; i < 12; i++) { const u = i / 11, top: Pt = [lerp(neck[0] + H * .01, back[0] - H * .08, u), lerp(neck[1], back[1], u) + r * H * .055], len = H * .08; straw.push(`M${f1(top[0])} ${f1(top[1])}l${f1(-H * .01 + sway * .5)} ${f1(len)}`); }
  out.push({ t: "stroke", d: straw.join(""), color: "kogecha", width: lw * .6, opacity: .7 });
  return out;
}

/** The mino square on: fringed straw over both shoulders down to the hips. */
export function minoSquare(sw: number, shY: number, waistY: number, H: number, lw: number, frame: number): Prim[] {
  const hem: Pt[] = [];
  for (let i = 0; i <= 16; i++) hem.push([lerp(sw * 1.3, -sw * 1.3, i / 16), waistY + H * .15 + (i % 2 ? H * .02 : 0) + Math.sin(frame / 13 + i) * H * .002]);
  const d = smoothD([[-sw * .5, shY - H * .03], [sw * .5, shY - H * .03], [sw * 1.3, shY + H * .03], ...hem, [-sw * 1.3, shY + H * .03]], true, .15);
  return [{ t: "fill", d, fill: { type: "linear", angle: 90, stops: [[0, "kincha", 1], [1, "cha", 1]] }, outline: lw, grain: .9 },
    { t: "stroke", d: Array.from({ length: 22 }, (_, i) => { const x = lerp(-sw * 1.2, sw * 1.2, i / 21); return `M${f1(x)} ${f1(shY + H * .02)}l0 ${f1(waistY - shY + H * .02)}`; }).join(""), color: "kogecha", width: lw * .6, opacity: .6 }];
}

/** Eyes opening along an arm from `a` (elbow or cuff) to `b` (wrist) and on the hand, each blinking on its own beat. */
export function armEyes(a: Pt, b: Pt, H: number, lw: number, frame: number, seed: number): Prim[] {
  const out: Prim[] = [], n = 4, dx = b[0] - a[0], dy = b[1] - a[1], ang = Math.atan2(dy, dx) * 180 / Math.PI;
  for (let i = 0; i < n; i++) {
    const u = (i + .6) / (n + .2), c: Pt = [a[0] + dx * u, a[1] + dy * u], open = ((frame + i * 23 + seed) % 70) < 5 ? .1 : 1, w = H * .017, h = H * .01 * open;
    out.push({ t: "group", transform: `rotate(${f1(ang)} ${f1(c[0])} ${f1(c[1])})`, prims: [
      { t: "fill", d: smoothD([[c[0] - w, c[1]], [c[0], c[1] - h], [c[0] + w, c[1]], [c[0], c[1] + h]], true, .5), fill: "gofun", outline: lw * .6 },
      ...(open > .5 ? [{ t: "fill" as const, d: circleD(c[0], c[1], h * .7), fill: "sumi" as UkiyoePaint }] : [])] });
  }
  return out;
}

/** A shallow basket of azuki beans held at `c`. */
export function zaru(c: Pt, H: number, lw: number, frame: number): Prim[] {
  const w = H * .09, h = H * .03, beans: string[] = [];
  for (let i = 0; i < 18; i++) beans.push(ellipseD(c[0] + (hash01(7, i, 1) - .5) * w * 1.5, c[1] - h * .4 - hash01(7, i, 2) * h * .5 + Math.sin(frame / 3 + i) * h * .08, H * .006, H * .0045));
  return [{ t: "fill", d: smoothD([[c[0] - w, c[1] - h * .5], [c[0] + w, c[1] - h * .5], [c[0] + w * .7, c[1] + h * .5], [c[0] - w * .7, c[1] + h * .5]], true, .4), fill: "kincha", outline: lw, pattern: { type: "kikko", color: "cha", scale: .25, opacity: .7 } },
    { t: "fill", d: beans.join(""), fill: "beni", outline: lw * .3 }];
}

/** The throw: wind-up 0→1 and release flag at `t` frames into the action, `contact` frames in. */
export function throwPose(t: number, contact: number): { wind: number; fling: number } {
  const wind = t < contact - 6 ? clamp01(t / Math.max(1, contact - 6)) : clamp01(1 - (t - (contact - 6)) / 6);
  const fling = t >= contact - 6 ? clamp01((t - (contact - 6)) / 8) * (1 - clamp01((t - contact - 14) / 10)) : 0;
  return { wind, fling };
}

/** Sand flung from `from` forward (+x), `t` frames after the release: a fan of grains flying, slowing and falling. */
export function sandSpray(from: Pt, t: number, H: number, seed: number): Prim[] {
  if (t < 0 || t > 40) return [];
  const grains: string[] = [];
  for (let i = 0; i < 110; i++) {
    const a = (-35 + 60 * hash01(seed, i, 1)) * Math.PI / 180, v = H * (.008 + .014 * hash01(seed, i, 2));
    grains.push(circleD(from[0] + Math.cos(a) * v * t, from[1] + Math.sin(a) * v * t + .5 * H * .0009 * t * t, H * (.004 + .005 * hash01(seed, i, 3))));
  }
  return [{ t: "glow", cx: from[0] + H * .1 * Math.min(1, t / 10), cy: from[1], r: H * .12, color: "kincha", opacity: .4 * (1 - t / 40) }, { t: "dots", d: grains.join(""), color: "kincha", opacity: 1 - t / 40 }, { t: "dots", d: grains.slice(0, 40).join(""), color: "kogecha", opacity: .8 * (1 - t / 40) }];
}

/**
 * The akaname, profile, origin at its feet, after Sekien: a small crouching imp, red-skinned and lean, knees up, one arm
 * reaching down to the floor, a big head under a wild black mane, round eyes, the long tongue curling out to lick; its
 * feet one great clawed toe each.
 */
export function akaname(size: number, frame: number, moving: boolean, dist: number, seed: number): Prim[] {
  const S = size, lw = Math.max(.8, S * .012), out: Prim[] = [], ph = dist / (S * .3) * Math.PI, step = moving ? Math.sin(ph) : 0, bob = moving ? Math.abs(step) * S * .02 : 0;
  const lick = Math.max(0, Math.sin(frame / 6 + seed)), skin: UkiyoePaint = "shu";
  const hip: Pt = [-S * .08, -S * .32 - bob], neck: Pt = [S * .14, -S * .66 - bob], head: Pt = [S * .24, -S * .8 - bob];
  const limb = (pts: Pt[], w: number) => carvedLine(pts, w, { taper: "end", minRatio: .55, smooth: true });
  const toe = (f: Pt) => smoothD([f, [f[0] + S * .1, f[1] - S * .015], [f[0] + S * .15, f[1] + S * .01], [f[0] + S * .04, f[1] + S * .02]], true, .3);
  // Far leg and arm, darker; then the body; then the near leg (knee high) and the near arm reaching to the floor.
  const farFoot: Pt = [hip[0] - S * .12 - step * S * .06, 0], nearFoot: Pt = [hip[0] + S * .1 + step * S * .06, 0], hand: Pt = [S * .38 + step * S * .05, -S * .02];
  out.push({ t: "fill", d: limb([hip, [hip[0] + S * .12, -S * .5 - bob], farFoot], S * .1) + limb([neck, [S * .02, -S * .44 - bob], [S * .14, -S * .3]], S * .07), fill: "beni", outline: lw });
  out.push({ t: "fill", d: toe(farFoot), fill: "gofun", outline: lw * .7 });
  out.push({ t: "fill", d: smoothD([[hip[0] - S * .1, hip[1] + S * .04], [hip[0] - S * .1, hip[1] - S * .16], [neck[0] - S * .1, neck[1] + S * .02], [neck[0] + S * .06, neck[1] + S * .04], [hip[0] + S * .14, hip[1] - S * .04], [hip[0] + S * .08, hip[1] + S * .06]], true, .4), fill: { type: "linear", angle: 90, stops: [[0, "shu", 1], [1, "beni", 1]] }, outline: lw * 1.2 });
  out.push({ t: "stroke", d: [0, 1, 2].map(k => `M${f1(hip[0] - S * .02 + k * S * .05)} ${f1(hip[1] - S * .2 + k * S * .03)}q${f1(S * .03)} ${f1(S * .03)} ${f1(S * .06)} 0`).join(""), color: "kogecha", width: lw * .7, opacity: .6 });
  out.push({ t: "fill", d: limb([hip, [hip[0] + S * .22, -S * .58 - bob], nearFoot], S * .12), fill: skin, outline: lw }, { t: "fill", d: toe(nearFoot), fill: "gofun", outline: lw * .7 });
  out.push({ t: "fill", d: limb([[neck[0] + S * .02, neck[1] + S * .03], [S * .32, -S * .4 - bob], hand], S * .08), fill: skin, outline: lw });
  out.push({ t: "fill", d: smoothD([hand, [hand[0] + S * .08, hand[1] - S * .02], [hand[0] + S * .1, hand[1] + S * .015], [hand[0] + S * .02, hand[1] + S * .02]], true, .3), fill: "gofun", outline: lw * .7 });
  // Head: a wild mane of black spikes streaming back, the red face, round eyes, the tongue.
  const spikes: Pt[] = [];
  for (let i = 0; i <= 14; i++) { const u = i / 14, a = Math.PI * (.85 + u * 1.05), r = S * (.17 + (i % 2 ? .13 + .04 * Math.sin(frame / 7 + i) : 0)); spikes.push([head[0] - S * .06 + Math.cos(a) * r * 1.3, head[1] + Math.sin(a) * r]); }
  out.push({ t: "fill", d: smoothD([...spikes, [head[0] - S * .14, head[1] + S * .14]], true, .1), fill: "sumi", outline: lw });
  out.push({ t: "fill", d: smoothD([[head[0] - S * .1, head[1] - S * .1], [head[0] + S * .08, head[1] - S * .12], [head[0] + S * .16, head[1] - S * .02], [head[0] + S * .14, head[1] + S * .08], [head[0] - S * .04, head[1] + S * .12]], true, .4), fill: skin, outline: lw });
  out.push({ t: "fill", d: circleD(head[0] + S * .06, head[1] - S * .04, S * .035), fill: "ki", outline: lw * .6 }, { t: "fill", d: circleD(head[0] + S * .07, head[1] - S * .04, S * .016), fill: "sumi" });
  out.push({ t: "line", d: carvedLine([[head[0] + S * .02, head[1] - S * .1], [head[0] + S * .08, head[1] - S * .09], [head[0] + S * .12, head[1] - S * .06]], S * .02, { taper: "both" }), color: "sumi" });
  const t0: Pt = [head[0] + S * .13, head[1] + S * .06], pts: Pt[] = [t0];
  for (let i = 1; i <= 8; i++) { const u = i / 8; pts.push([t0[0] + u * S * (.12 + .1 * lick), t0[1] + u * S * (.28 + .1 * lick) - Math.sin(u * Math.PI) * S * .06]); }
  out.push({ t: "fill", d: carvedLine(pts, S * .05, { taper: "end", minRatio: .4, smooth: true }), fill: "sakura", outline: lw * .7 });
  return out;
}

// ---- Looks and scenes --------------------------------------------------------------------------------------------------------------

/** Generic looks for the household and road yōkai. */
export const UKIYOE_FOLK_YOKAI_LOOKS = {
  zashikiwarashi: { hair: "kamuro", robe: "beni", robePattern: { type: "kanoko", color: "gofun", scale: .5 }, obi: "ki", feet: "bare", build: "child" },
  amanojaku: { hair: "wild", robe: "ki", robePattern: { type: "tora", color: "sumi", scale: .5 }, lower: "loincloth", upper: "bare", skin: "beni", face: "oni", horns: 1, feet: "bare", build: "child" },
  azukiarai: { hair: "child", hairColor: "sumi", robe: "cha", lower: "tucked", legs: "hada", feet: "bare", build: "stout", prop: "zaru" },
  konakijiji: { hair: "elder", robe: "ai", robePattern: { type: "kanoko", color: "gofun", scale: .5 }, lower: "tucked", legs: "hada", feet: "bare", build: "child", beard: true },
  sunakakebaba: { hair: "long", hairColor: "gofun", robe: "usuzumi", robePattern: { type: "shima", color: "sumi", scale: .5, opacity: .5 }, lower: "tucked", legs: "hada", feet: "bare", build: "slim", face: "hag" },
  nurarihyon: { hair: "gourd", robe: "murasaki", robePattern: { type: "kikko", color: "kin", scale: .5, opacity: .5 }, coat: "sumi", lower: "hakama", hakama: "usuzumi", feet: "tabi", build: "average", prop: "pipe" },
  yukinko: { hair: "child", robe: "gofun", feet: "waraji", build: "child", mino: true, hat: "kasa" },
  dodomeki: { hair: "long", robe: "gofun", robePattern: { type: "sakura", color: "beni", scale: .5 }, under: "beni", feet: "bare", build: "slim", sleeves: "short", eyes: true, hat: "hood", hatColor: "gofun" },
} as const;

export type UkiyoeFolkYokaiScene = "house" | "stream" | "bath" | "road" | "snow";
export const UKIYOE_FOLK_YOKAI_SCENES: readonly UkiyoeFolkYokaiScene[] = ["house", "stream", "bath", "road", "snow"];

/**
 * `house`: Nurarihyon smoking on the veranda of a house as if he owned it, the zashiki-warashi running across the room,
 * the amanojaku peeking. `stream`: the azukiarai washing beans in his tub at a mountain stream. `bath`: the akaname
 * creeping into a bathhouse at night to lick the tub. `road`: on a bamboo road the sunakake-baba flings sand, the
 * konaki-jiji crying by the way, Dodomeki with her eyes. `snow`: the snow child in a straw cape.
 */
export function folkYokaiScene(kind: UkiyoeFolkYokaiScene = "house", frames = 300): import("./ukiyoe-scene").UkiyoeSceneSpec {
  type N = import("./ukiyoe-scene").UkiyoeNode;
  type L = import("./ukiyoe-figure").UkiyoeFigureLook;
  const look = (k: keyof typeof UKIYOE_FOLK_YOKAI_LOOKS) => UKIYOE_FOLK_YOKAI_LOOKS[k] as unknown as L;
  const night = kind === "bath" || kind === "house";
  const nodes: N[] = [{ id: "sky", kind: "motif", motif: "sky", params: { width: 1920, height: 1080, band: .5, ...(night ? { top: "yoru", mid: "ai", horizon: "ai" } : kind === "snow" ? { top: "usuzumi", mid: "paper", horizon: "paper" } : { horizon: "beni" }) } }];
  const fig = (id: string, k: keyof typeof UKIYOE_FOLK_YOKAI_LOOKS, x: number, y: number, scale: number, actions: unknown[], facing: "left" | "right" = "right", extra: Record<string, unknown> = {}) =>
    nodes.push({ id, kind: "figure", x, y, scale, look: look(k), facing, actions, ...extra } as unknown as N);
  const ground = (fill: unknown, y = 1000) => nodes.push({ id: "ground", kind: "block", x: 960, y, shape: { type: "rect", width: 1920, height: 300 }, fill, line: 0 } as unknown as N);
  if (kind === "house") {
    const R = { width: 1500, height: 600, depth: 210, back: ["fusuma", "tokonoma", "tana"], night: .6, veranda: 110, eave: "thatch" };
    nodes.push({ id: "room", kind: "motif", motif: "room", x: 960, y: 900, params: { ...R, part: "back" } } as N);
    nodes.push({ id: "lamp", kind: "motif", motif: "andon", x: 1180, y: 820, params: { height: 150 } } as N);
    fig("child", "zashikiwarashi", 500, 830, 1.6, [{ type: "run", start: 30, end: 200, to: 700 }]);
    fig("imp", "amanojaku", 1380, 830, 1.6, [{ type: "look", start: 0, end: frames, back: true }], "left");
    fig("nura", "nurarihyon", 820, 990, 1.8, [{ type: "kneel", start: 0, end: frames }, { type: "talk", start: 120, end: 200 }]);
    nodes.push({ id: "room-front", kind: "motif", motif: "room", x: 960, y: 900, params: { ...R, part: "front" } } as N);
  } else if (kind === "stream") {
    nodes.push({ id: "hills", kind: "motif", motif: "hills", x: 960, y: 760, params: { width: 2200, height: 260 } } as N);
    ground({ type: "linear", angle: 90, stops: [[0, "kusa", 1], [1, "matsu", 1]] }, 900);
    nodes.push({ id: "stream", kind: "motif", motif: "sea", y: 930, params: { width: 1920, height: 160, rows: 5 } } as N);
    nodes.push({ id: "tub", kind: "motif", motif: "tarai", x: 1080, y: 900, params: { radius: 90 } } as N);
    fig("azuki", "azukiarai", 900, 900, 1.9, [{ type: "wash", start: 0, end: frames, blend: 0, aim: [(1080 - 900) / 1.9, -90 * .32 / 1.9 + 2] }]);
    nodes.push({ id: "willow", kind: "motif", motif: "willow", x: 400, y: 900, params: { height: 520 } } as N);
  } else if (kind === "bath") {
    const R = { width: 1400, height: 560, depth: 200, back: ["wall", "shoji", "wall"], kind: "boards", night: .8, eave: "tile" };
    nodes.push({ id: "room", kind: "motif", motif: "room", x: 960, y: 920, params: { ...R, part: "back" } } as N);
    nodes.push({ id: "tub", kind: "motif", motif: "tarai", x: 1150, y: 860, params: { radius: 140 } } as N);
    nodes.push({ id: "akaname", kind: "creature", species: "akaname", x: 520, y: 870, look: { size: 220 }, actions: [{ type: "walk", start: 20, end: 160, to: 380 }, { type: "stand", start: 160, end: frames }] } as unknown as N);
    nodes.push({ id: "room-front", kind: "motif", motif: "room", x: 960, y: 920, params: { ...R, part: "front" } } as N);
  } else if (kind === "road") {
    ground({ type: "linear", angle: 90, stops: [[0, "kincha", 1], [1, "cha", 1]] });
    nodes.push({ id: "bamboo", kind: "motif", motif: "bamboo", x: 960, y: 860, params: { width: 2000, height: 760, stalks: 16 } } as N);
    fig("baba", "sunakakebaba", 1400, 920, 1.8, [{ type: "throw", start: 40, end: 120, contact: 90 }, { type: "throw", start: 170, end: 250, contact: 220 }], "left");
    fig("jiji", "konakijiji", 760, 940, 1.8, [{ type: "talk", start: 0, end: frames }, { type: "reveal", start: 0, end: 1 }]);
    fig("dodo", "dodomeki", 360, 930, 1.8, [{ type: "hold", start: 0, end: frames, angle: 60, amount: 30 }]);
  } else {
    ground("gofun");
    nodes.push({ id: "house", kind: "motif", motif: "minka", x: 1450, y: 820, params: { width: 520, snow: 1, light: 1 } } as N);
    fig("child", "yukinko", 600, 940, 1.8, [{ type: "walk", start: 0, end: 200, to: 300 }, { type: "wave", start: 210, end: frames }]);
    nodes.push({ id: "snowfall", kind: "particles", type: "snow", count: 160 } as unknown as N);
  }
  return { version: 1, id: `folk-yokai-${kind}`, width: 1920, height: 1080, durationFrames: frames, seed: 61, cadence: 2, palette: { preset: night ? "night" : kind === "snow" ? "snow" : "edo" }, wind: { base: .3, turbulence: .4 }, nodes };
}
