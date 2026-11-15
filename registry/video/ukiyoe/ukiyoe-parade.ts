/**
 * UKIYO1 processions and parades, after the Met's copy of the Shinjuan *Night Parade of One Hundred Demons* (816210: oni,
 * beasts and objects striding and dancing one after another across the scroll), the lacquer inrō *Fox Wedding Procession
 * in Rain* (Met 58612: foxes walking upright in kimono, one with a lantern on a pole, two carrying the bride's palanquin,
 * rain slanting through) and Yamamoto Shōun's *Fox wedding procession* (Wikimedia Commons: foxes in haori and hakama with
 * paper lanterns, walking through the rain).
 *
 * - Figure look `animal: "fox" | "mouse"`: the figure's head becomes the animal's, in every view, with fur-coloured hands
 *   and a tail behind (a fox's bushy brush, a mouse's long thin tail). It walks and carries like any figure.
 * - Motif `kago`: a palanquin (a lacquered box with blinds slung from a pole), for two bearers to carry.
 * - `procession(members, …)`: lines up creatures and figures one after another, spaced by their size, all travelling the
 *   same distance so they never walk into each other, in two depth rows (the far row smaller and fainter).
 */
import type { Pt } from "./ukiyoe-core";
import { carvedLine, smoothD } from "./ukiyoe-core";
import type { Prim } from "./ukiyoe-prims";
import { circleD, ellipseD, rectD } from "./ukiyoe-prims";
import type { UkiyoePaint } from "./ukiyoe-pigments";
import type { UkiyoeAction, UkiyoeFigureLook } from "./ukiyoe-figure";
import type { UkiyoeNode, UkiyoeSceneSpec } from "./ukiyoe-scene";

export type UkiyoeAnimalHead = "fox" | "mouse";
type Map2 = (x: number, y: number) => Pt;
const f1 = (n: number) => n.toFixed(1);
export const ANIMAL_FUR: Readonly<Record<UkiyoeAnimalHead, UkiyoePaint>> = { fox: "tan", mouse: "usuzumi" };

/** The animal's head in profile (head units: the face spans about ±20, facing +x). */
export function animalHeadSide(kind: UkiyoeAnimalHead, P: Map2, lw: number, blink: boolean): Prim[] {
  const fur = ANIMAL_FUR[kind], out: Prim[] = [];
  if (kind === "fox") {
    out.push({ t: "fill", d: smoothD([P(-6, -16), P(-2, -34), P(4, -18)], true, .2) + smoothD([P(4, -17), P(10, -33), P(13, -15)], true, .2), fill: fur, outline: lw });
    out.push({ t: "fill", d: smoothD([P(6, -18), P(10, -28), P(11, -17)], true, .2), fill: "gofun", opacity: .9 });
    out.push({ t: "fill", d: smoothD([P(-14, 6), P(-14, -10), P(0, -18), P(14, -12), P(36, -2), P(38, 3), P(20, 8), P(4, 16), P(-8, 14)], true, .35), fill: fur, outline: lw });
    out.push({ t: "fill", d: smoothD([P(-6, 14), P(8, 8), P(24, 5), P(37, 4), P(20, 10), P(4, 18)], true, .35), fill: "gofun" });
    out.push({ t: "fill", d: ellipseD(...P(37, 1), lw * 2, lw * 1.6), fill: "sumi" });
  } else {
    out.push({ t: "fill", d: ellipseD(...P(-4, -16), 11 * Math.abs(P(1, 0)[0] - P(0, 0)[0]), 10 * Math.abs(P(1, 0)[0] - P(0, 0)[0])), fill: fur, outline: lw }, { t: "fill", d: ellipseD(...P(-3, -16), 7 * Math.abs(P(1, 0)[0] - P(0, 0)[0]), 6.5 * Math.abs(P(1, 0)[0] - P(0, 0)[0])), fill: "sakura", opacity: .85 });
    out.push({ t: "fill", d: smoothD([P(-14, 8), P(-14, -8), P(0, -14), P(14, -8), P(28, 2), P(30, 6), P(14, 12), P(-4, 16)], true, .35), fill: fur, outline: lw });
    out.push({ t: "fill", d: ellipseD(...P(30, 4), lw * 2, lw * 1.8), fill: "beni" });
    out.push({ t: "stroke", d: [0, 1, 2].map(i => `M${f1(P(24, 5)[0])} ${f1(P(24, 5)[1])}l${f1(P(12, (i - 1) * 3)[0] - P(0, 0)[0])} ${f1(P(12, (i - 1) * 3)[1] - P(0, 0)[1])}`).join(""), color: "sumi", width: lw * .5, opacity: .7 });
  }
  const ex = kind === "fox" ? 10 : 9;
  out.push(blink ? { t: "line", d: carvedLine([P(ex - 3, -4), P(ex, -3), P(ex + 3, -4.5)], lw * 1.2, { taper: "both" }), color: "sumi" } : kind === "fox"
    ? { t: "line", d: carvedLine([P(ex - 4, -3), P(ex, -5), P(ex + 4, -6)], lw * 1.4, { taper: "both" }), color: "sumi" }
    : { t: "fill", d: circleD(...P(ex, -4), lw * 1.6), fill: "sumi" });
  return out;
}

/** The animal's head square on (radius 1): front with both eyes and the muzzle toward us, or the back of the head. */
export function animalHeadSquare(kind: UkiyoeAnimalHead, P: Map2, lw: number, back: boolean): Prim[] {
  const fur = ANIMAL_FUR[kind], out: Prim[] = [];
  if (kind === "fox") for (const s of [-1, 1]) out.push({ t: "fill", d: smoothD([P(s * .25, -.7), P(s * .7, -1.9), P(s * .95, -.5)], true, .2), fill: fur, outline: lw }, ...(back ? [] : [{ t: "fill" as const, d: smoothD([P(s * .4, -.8), P(s * .68, -1.6), P(s * .82, -.65)], true, .2), fill: "gofun" as UkiyoePaint }]));
  else for (const s of [-1, 1]) out.push({ t: "fill", d: ellipseD(...P(s * .85, -.8), Math.abs(P(.6, 0)[0] - P(0, 0)[0]), Math.abs(P(.55, 0)[0] - P(0, 0)[0])), fill: fur, outline: lw }, ...(back ? [] : [{ t: "fill" as const, d: ellipseD(...P(s * .85, -.78), Math.abs(P(.38, 0)[0] - P(0, 0)[0]), Math.abs(P(.35, 0)[0] - P(0, 0)[0])), fill: "sakura" as UkiyoePaint }]));
  out.push({ t: "fill", d: smoothD([P(-.95, -.2), P(-.7, -.9), P(0, -1.05), P(.7, -.9), P(.95, -.2), P(.5, .6), P(0, kind === "fox" ? 1.15 : .95), P(-.5, .6)], true, .4), fill: fur, outline: lw });
  if (!back) {
    out.push({ t: "fill", d: smoothD([P(-.5, .1), P(0, .2), P(.5, .1), P(.25, .8), P(0, kind === "fox" ? 1.1 : .9), P(-.25, .8)], true, .4), fill: "gofun" });
    out.push({ t: "fill", d: ellipseD(...P(0, kind === "fox" ? 1.02 : .82), Math.abs(P(.12, 0)[0] - P(0, 0)[0]), Math.abs(P(.09, 0)[0] - P(0, 0)[0])), fill: kind === "fox" ? "sumi" : "beni" });
    for (const s of [-1, 1]) out.push(kind === "fox" ? { t: "line", d: carvedLine([P(s * .55, -.25), P(s * .3, -.15), P(s * .12, -.2)], lw * 1.4, { taper: "both" }), color: "sumi" } : { t: "fill", d: circleD(...P(s * .32, -.15), lw * 1.8), fill: "sumi" });
  }
  return out;
}

/** The tail behind the figure: a fox's bushy brush with its white tip, or a mouse's long thin tail, swaying. */
export function animalTail(kind: UkiyoeAnimalHead, root: Pt, H: number, lw: number, frame: number, wind: number, moving: boolean): Prim[] {
  const pts: Pt[] = [root], sw = Math.sin(frame / (moving ? 6 : 14)) * H * .02 - wind * H * .03;
  for (let i = 1; i <= 8; i++) { const u = i / 8; pts.push([root[0] - u * H * (kind === "fox" ? .22 : .3) + sw * u, root[1] + (kind === "fox" ? -Math.sin(u * 2.2) * H * .08 : u * H * .12 - Math.sin(u * 4) * H * .03)]); }
  if (kind === "mouse") return [{ t: "line", d: carvedLine(pts, H * .008, { taper: "end", minRatio: .2, smooth: true }), color: "sakura" }];
  const brush = carvedLine(pts, H * .09, { taper: "both", minRatio: .25, smooth: true });
  const tip = pts[8];
  return [{ t: "fill", d: brush, fill: "tan", outline: lw }, { t: "fill", d: ellipseD(tip[0] + H * .01, tip[1], H * .035, H * .03), fill: "gofun", outline: lw * .6 }];
}

// ---- Motif: the palanquin ----------------------------------------------------------------------------------------------------------

type MP = Readonly<Record<string, unknown>>;
const num = (p: MP, k: string, d: number) => typeof p[k] === "number" && Number.isFinite(p[k]) ? p[k] as number : d;

/** A palanquin (kago): a lacquered box with a rolled blind and a curved roof, slung from a long pole. Origin: the pole's middle. Params: width, color. */
export function kago(p: MP, cx: { frame: number }): Prim[] {
  const W = num(p, "width", 260), lw = Math.max(1, W * .008), color = typeof p.color === "string" ? p.color as UkiyoePaint : "sumi", sway = Math.sin(cx.frame / 9) * W * .01, out: Prim[] = [];
  out.push({ t: "line", d: carvedLine([[-W * .95, -W * .02], [W * .95, W * .02]], W * .035, { taper: "none" }), color: "kincha" });
  const top = W * .06, h = W * .5;
  out.push({ t: "group", transform: `translate(${f1(sway)} 0)`, prims: [
    { t: "stroke", d: `M${f1(-W * .3)} 0V${f1(top)}M${f1(W * .3)} 0V${f1(top)}`, color: "sumi", width: lw * 1.6 },
    { t: "fill", d: smoothD([[-W * .46, top + W * .05], [-W * .3, top - W * .02], [W * .3, top - W * .02], [W * .46, top + W * .05]], true, .3), fill: color, outline: lw },
    { t: "fill", d: rectD(-W * .4, top + W * .05, W * .8, h), fill: color, outline: lw, pattern: { type: "kikko", color: "kin", scale: .4, opacity: .4 } },
    { t: "fill", d: rectD(-W * .25, top + W * .12, W * .5, h * .6), fill: { type: "linear", angle: 90, stops: [[0, "kincha", .8], [1, "ki", .6]] }, outline: lw * .7 },
    { t: "stroke", d: Array.from({ length: 10 }, (_, i) => `M${f1(-W * .25)} ${f1(top + W * .12 + i * h * .06)}h${f1(W * .5)}`).join(""), color: "cha", width: lw * .5, opacity: .7 },
    { t: "fill", d: rectD(-W * .42, top + W * .05 + h, W * .84, W * .04), fill: "kin", outline: lw * .7 }] });
  return out;
}
export const PARADE_MOTIFS = { kago };
export const ANIMATED_PARADE = ["kago"] as const;

// ---- Procession --------------------------------------------------------------------------------------------------------------------

/** A member of a procession: a creature (species + size) or a figure (look), with its footprint width in px. */
export type ProcessionMember = { species: string; look?: Record<string, unknown>; width: number; scale?: number; action?: string } | { look: UkiyoeFigureLook; width: number; scale?: number; actions?: (start: number, end: number) => UkiyoeAction[] };

/**
 * Line members up one after another heading `dir` (−1 left), spaced by their widths plus `gap`, alternating two depth
 * rows (the far row higher, smaller, fainter). Every member travels the same `distance` over the same frames, so the gaps
 * between them never close.
 */
export function procession(members: readonly ProcessionMember[], o: { id: string; x0: number; y: number; dir: -1 | 1; distance: number; start: number; end: number; gap?: number; rowGap?: number }): UkiyoeNode[] {
  const out: UkiyoeNode[] = [], gap = o.gap ?? 40, rowGap = o.rowGap ?? 70;
  const rows: { at: number; nodes: UkiyoeNode[] }[] = [{ at: o.x0, nodes: [] }, { at: o.x0 - o.dir * 120, nodes: [] }];
  members.forEach((m, i) => {
    const row = rows[i % 2], far = i % 2 === 1, k = far ? .78 : 1, x = row.at, y = o.y - (far ? rowGap : 0), facing = o.dir < 0 ? "left" : "right";
    row.at -= o.dir * (m.width * k + gap);
    const travel = o.dir * o.distance; // travel is in scene px, not scaled with the member
    if ("species" in m) row.nodes.push({ id: `${o.id}-${i}`, kind: "creature", species: m.species, x, y, scale: (m.scale ?? 1) * k, look: m.look ?? {}, facing, opacity: far ? .85 : 1, actions: [{ type: m.action ?? "walk", start: o.start, end: o.end, to: travel }] } as unknown as UkiyoeNode);
    else row.nodes.push({ id: `${o.id}-${i}`, kind: "figure", x, y, scale: (m.scale ?? 1) * k, look: m.look, facing, opacity: far ? .85 : 1, actions: [{ type: "walk", start: o.start, end: o.end, to: travel }, ...(m.actions?.(o.start, o.end) ?? [])] } as unknown as UkiyoeNode);
  });
  // The far row first so the near row draws over it.
  out.push(...rows[1].nodes, ...rows[0].nodes);
  return out;
}

// ---- Scenes ------------------------------------------------------------------------------------------------------------------------

export type UkiyoeParadeScene = "hyakki" | "foxwedding" | "mousewedding";
export const UKIYOE_PARADE_SCENES: readonly UkiyoeParadeScene[] = ["hyakki", "foxwedding", "mousewedding"];

/**
 * `hyakki`: the night parade of a hundred demons crossing a moonlit street: oni, tengu, kappa, the umbrella and lantern
 * spirits, the burning wheel, the biwa, the teakettle, the cotton strip overhead, soul-flames. `foxwedding`: foxes in
 * kimono walking upright through a sunshower with lanterns, the bride's palanquin on its pole between two bearers, the
 * bride in white. `mousewedding`: the mice's wedding, the bride's chest carried, the bride in white.
 */
export function paradeScene(kind: UkiyoeParadeScene = "hyakki", frames = 360): UkiyoeSceneSpec {
  const night = kind === "hyakki";
  const nodes: UkiyoeNode[] = [{ id: "sky", kind: "motif", motif: "sky", params: { width: 1920, height: 1080, band: .5, ...(night ? { top: "yoru", mid: "ai", horizon: "murasaki" } : kind === "foxwedding" ? { top: "ki", mid: "kin", horizon: "paper" } : { horizon: "beni" }) } } as UkiyoeNode];
  nodes.push({ id: "ground", kind: "block", x: 960, y: 1000, shape: { type: "rect", width: 1920, height: 300 }, fill: night ? { type: "linear", angle: 90, stops: [[0, "ai", 1], [1, "yoru", 1]] } : { type: "linear", angle: 90, stops: [[0, "kusa", 1], [1, "matsu", 1]] }, line: 0 } as unknown as UkiyoeNode);
  const y = 960;
  if (kind === "hyakki") {
    nodes.push({ id: "moon", kind: "motif", motif: "moon", x: 1550, y: 170, params: { radius: 60 } } as UkiyoeNode);
    nodes.push({ id: "street", kind: "motif", motif: "yashiki", x: 960, y: 850, params: { width: 2000, height: 200, pines: 4, night: 1 } } as UkiyoeNode);
    const oni = (robe: UkiyoePaint, skin: UkiyoePaint, prop?: string): UkiyoeFigureLook => ({ hair: "wild", skin, face: "oni", horns: 2, upper: "bare", lower: "loincloth", robe, build: "brute", feet: "bare", ...(prop ? { prop } : {}) } as UkiyoeFigureLook);
    const members: ProcessionMember[] = [
      { look: oni("ki", "shu", "kanabo"), width: 180, scale: 1.1, actions: (s, e) => [{ type: "dance", start: s, end: e }] },
      { species: "kasaobake", width: 120, scale: 1.4, action: "hop" },
      { species: "tengu", width: 160, scale: 1 },
      { species: "chagama", width: 150, look: { size: 170 } },
      { look: oni("ai", "ai"), width: 170, scale: 1.05, actions: (s, e) => [{ type: "cheer", start: s, end: e }] },
      { species: "chochinobake", width: 100, scale: 1.2 },
      { species: "kappa", width: 120, scale: 1.3 },
      { species: "biwabokuboku", width: 160, look: { size: 300 } },
      { species: "akaname", width: 160, look: { size: 200 } },
      { species: "wanyudo", width: 220, look: { size: 220 } },
      { species: "karasutengu", width: 160, scale: 1 },
      { species: "kasaobake", width: 120, scale: 1.3, action: "hop" },
    ];
    nodes.push(...procession(members, { id: "parade", x0: 1900, y, dir: -1, distance: 1500, start: 0, end: frames, gap: 70 }));
    nodes.push({ id: "cotton", kind: "creature", species: "ittanmomen", x: 2100, y: 520, look: { size: 480 }, facing: "left", actions: [{ type: "fly", start: 0, end: frames, to: -2000 }] } as unknown as UkiyoeNode);
    for (let i = 0; i < 4; i++) nodes.push({ id: "flame" + i, kind: "creature", species: "hitodama", x: 1700 + i * 250, y: 720 - (i % 2) * 60, look: { size: 40 }, actions: [{ type: "float", start: 0, end: frames, to: -1500 }] } as unknown as UkiyoeNode);
  } else {
    const animal = kind === "foxwedding" ? "fox" : "mouse";
    const coat = (robe: UkiyoePaint, extra: Partial<UkiyoeFigureLook> = {}): UkiyoeFigureLook => ({ animal, robe, coat: "sumi", lower: "hakama", hakama: kind === "foxwedding" ? "kogecha" : "ai", feet: "geta", build: "average", ...extra } as UkiyoeFigureLook);
    nodes.push({ id: "pines", kind: "motif", motif: "pine", x: 200, y: 900, params: { height: 520 } } as UkiyoeNode);
    // One line of units walking left at the same pace, laid out front to back so nobody walks into anyone: three lantern
    // bearers, the palanquin (fox) or trousseau chest (mouse) slung on its pole between two bearers, the bride in white
    // under her hood, two followers with umbrellas.
    const sc = 1.25, H = 250 * sc, travel = -1500, walk = (dist: number): UkiyoeAction => ({ type: "walk", start: 0, end: frames, to: dist });
    const fig = (id: string, x: number, look: UkiyoeFigureLook, extra: UkiyoeAction[] = []) => nodes.push({ id, kind: "figure", x, y, scale: sc, look, facing: "left", actions: [walk(travel), ...extra] } as unknown as UkiyoeNode);
    let x = 1500;
    for (let i = 0; i < 3; i++) { fig("lantern" + i, x, coat("gofun", { prop: "lantern", accent: "shu" })); x += 170; }
    x += 60;
    const bearer = coat("ai", { lower: "tucked", legs: ANIMAL_FUR[animal] });
    fig("bearer0", x, bearer, [{ type: "hold", start: 0, end: frames, angle: 150, amount: 150 }]);
    nodes.push({ id: "kago", kind: "motif", motif: "kago", x: x + 170, y: y - H * .8, params: { width: kind === "foxwedding" ? 230 : 190, color: kind === "foxwedding" ? "sumi" : "beni" }, keys: [{ frame: 0, x: x + 170 }, { frame: 10, x: x + 170 + travel * 5 / (frames - 10) * .5, ease: "linear" }, { frame: frames - 10, x: x + 170 + travel * (1 - 5 / (frames - 10) * .5), ease: "linear" }, { frame: frames, x: x + 170 + travel, ease: "linear" }] } as unknown as UkiyoeNode);
    fig("bearer1", x + 340, bearer, [{ type: "hold", start: 0, end: frames, angle: 150, amount: 150 }]);
    x += 340 + 220;
    fig("bride", x, { animal, robe: "gofun", robePattern: { type: "kikko", color: "gofun", scale: .5, opacity: .4 }, under: "beni", hat: "hood", hatColor: "gofun", feet: "geta", build: "slim", uchikake: "gofun", lining: "beni" } as UkiyoeFigureLook);
    x += 200;
    for (let i = 0; i < 2; i++) { fig("follower" + i, x, coat("cha", { prop: "umbrella", accent: "beni" })); x += 190; }
    if (kind === "foxwedding") nodes.push({ id: "rain", kind: "particles", type: "rain", count: 160, angle: 12, opacity: .6 } as unknown as UkiyoeNode, { id: "sun", kind: "motif", motif: "sun", x: 300, y: 200, params: { radius: 70 } } as UkiyoeNode);
  }
  return { version: 1, id: `parade-${kind}`, width: 1920, height: 1080, durationFrames: frames, seed: 79, cadence: 2, palette: { preset: night ? "night" : "edo" }, wind: { base: .3, turbulence: .3 }, nodes };
}
