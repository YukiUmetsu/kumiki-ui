/**
 * UKIYO1 castle town (jōkamachi), after Hiroshige's Edo street views (Suruga-chō, Asakusa), Beato's photographs of Edo's
 * moats and samurai quarters, and the fire-watch towers of the period. Four motifs built with the castle's storeys and
 * roofs, so the town and the castle share one hand:
 *
 * - `shop`: a merchant's two-storey shop: deep tiled eaves, indigo noren curtains with a white crest across the open
 *   front (swaying in the wind), a lattice and a standing sign, slit mushiko windows above, raised firewalls (udatsu).
 * - `kura`: a fireproof storehouse: thick white plaster over a base of namako tiles (a white lattice on grey), a heavy
 *   roof with a crested gable and an open iron-clad window.
 * - `yashiki`: a samurai residence's long wall with its gatehouse (nagaya-mon): plaster over black boarding, lattice
 *   windows, the great gate, a tiled cap all along, pines behind.
 * - `firetower`: a fire-watch tower (hinomi-yagura): tapering timber legs braced with crosses, a lashed ladder, a railed
 *   platform under a little roof and the alarm bell with its mallet.
 *
 * `castleTown()` composes them with the castle, a canal and its bridge, boats, crowds and mist into one handscroll scene
 * that pans from the keep down through the town. Conventions as the other motifs: each stands on its base centre.
 */
import type { Pt } from "./ukiyoe-core";
import { carvedLine, clamp, clamp01, hash01, lerp, scrollPan, smoothD } from "./ukiyoe-core";
import type { Prim } from "./ukiyoe-prims";
import { circleD, ellipseD, rectD } from "./ukiyoe-prims";
import type { UkiyoeFill, UkiyoePaint } from "./ukiyoe-pigments";
import type { Box, Ctx } from "./ukiyoe-castle";
import { pine, roof, storey } from "./ukiyoe-castle";
import type { UkiyoeNode, UkiyoeSceneSpec } from "./ukiyoe-scene";
import type { UkiyoeFigureLook } from "./ukiyoe-figure";
import { UKIYOE_SAMURAI_LOOK } from "./ukiyoe-katana";

type P = Readonly<Record<string, unknown>>;
const num = (p: P, k: string, d: number) => typeof p[k] === "number" && Number.isFinite(p[k]) ? p[k] as number : d;
const paint = (p: P, k: string, d: UkiyoePaint): UkiyoePaint => typeof p[k] === "string" ? p[k] as string : d;
const bool = (p: P, k: string, d: boolean) => typeof p[k] === "boolean" ? p[k] as boolean : d;
const ctx = (seed: number, W: number, p: P): Ctx => ({ seed, lw: Math.max(1, W * .004), style: "white", snow: clamp01(num(p, "snow", 0)), night: clamp01(num(p, "night", 0)), plaster: "gofun" });
const WOOD: UkiyoeFill = { type: "linear", angle: 0, stops: [[0, "kogecha", 1], [.5, "cha", 1], [1, "kogecha", 1]] };
const BOARD: UkiyoeFill = { type: "linear", angle: 0, stops: [[0, "sumi", 1], [.5, "kogecha", 1], [1, "sumi", 1]] };

/** A generic crest on the curtain: a white ring round a three-comma tomoe-like swirl (no shop's or family's real mark). */
function crest(c: Pt, r: number, color: UkiyoePaint): Prim[] {
  return [{ t: "fill", d: ellipseD(c[0], c[1], r, r), fill: color, opacity: .95 },
    { t: "fill", d: ellipseD(c[0], c[1], r * .72, r * .72), fill: "ai" },
    { t: "fill", d: [0, 120, 240].map(a => { const q: Pt = [c[0] + Math.cos(a * Math.PI / 180) * r * .32, c[1] + Math.sin(a * Math.PI / 180) * r * .32]; return ellipseD(q[0], q[1], r * .2, r * .2); }).join(""), fill: color }];
}

/** Namako walling: dark tiles set diagonally with raised white plaster joints, a lattice of diamonds. */
function namako(x0: number, y0: number, w: number, h: number, lw: number): Prim[] {
  const lines: string[] = [], s = h / 3.2;
  for (let k = -Math.ceil(h / s); k < Math.ceil(w / s) + 2; k++) {
    lines.push(`M${(x0 + k * s).toFixed(1)} ${y0.toFixed(1)}l${h.toFixed(1)} ${(-h).toFixed(1)}`);
    lines.push(`M${(x0 + k * s).toFixed(1)} ${(y0 - h).toFixed(1)}l${h.toFixed(1)} ${h.toFixed(1)}`);
  }
  const d = rectD(x0, y0 - h, w, h);
  return [{ t: "fill", d, fill: "usuzumi", outline: lw, grain: .4 }, { t: "clip", d, key: "namako", prims: [{ t: "stroke", d: lines.join(""), color: "gofun", width: Math.max(1.2, h * .07), opacity: .95 }] }];
}

// ---- Motifs -----------------------------------------------------------------------------------------------------------------------

/** A merchant's shop. Params: width, height, noren (curtain colour), crest (colour), sign, snow, night. */
export function shop(p: P, cx: { seed: number; frame: number; wind: number }): Prim[] {
  const W = num(p, "width", 320), H = num(p, "height", 240), c = ctx(cx.seed, W, p), out: Prim[] = [];
  const g = H * .48, u = H * .36, noren = paint(p, "noren", "ai"), sd = W * .18;
  // Upper storey with slit mushiko windows; the lower eave between floors; the open shop front below.
  const up: Box = { x0: -W / 2, w: W, y0: -g - H * .06, h: u, sd, sk: sd * .4 };
  out.push(...storey({ x0: -W / 2, w: W, y0: 0, h: g + H * .06, sd, sk: sd * .4 }, c, false));
  out.push({ t: "fill", d: rectD(-W / 2, -g, W, g), fill: { type: "linear", angle: 90, stops: [[0, "sumi", 1], [1, "kogecha", 1]] }, outline: c.lw });
  // Lattice (koshi) on one side of the front, the step up into the shop.
  out.push({ t: "stroke", d: Array.from({ length: 9 }, (_, i) => `M${(W * .18 + i * W * .035).toFixed(1)} ${(-g).toFixed(1)}l0 ${(g * .92).toFixed(1)}`).join(""), color: "cha", width: c.lw * 1.4 });
  out.push({ t: "fill", d: rectD(-W / 2, -H * .05, W * .66, H * .05), fill: WOOD, outline: c.lw * .7 });
  out.push(...storey(up, c, false));
  const slits: string[] = [];
  for (let i = 0; i < 14; i++) slits.push(rectD(-W * .4 + i * W * .056, -g - H * .06 - u * .78, W * .022, u * .5));
  out.push({ t: "fill", d: slits.join(""), fill: "sumi", opacity: .85 });
  out.push(...roof({ x0: -W / 2, w: W, y0: -g, h: 0, sd, sk: sd * .4 }, H * .12, c, { long: true }));
  out.push(...roof(up, H * .2, c, { long: true }));
  // Firewalls (udatsu) standing at both ends of the roof.
  for (const s of [-1, 1]) {
    const x = s * W * .5 + (s > 0 ? sd : 0), y = up.y0 - up.h - (s > 0 ? sd * .4 : 0);
    out.push({ t: "fill", d: rectD(x - W * .025, y - H * .17, W * .05, H * .2), fill: "gofun", outline: c.lw }, { t: "fill", d: smoothD([[x - W * .045, y - H * .17], [x + W * .045, y - H * .17], [x + W * .03, y - H * .22], [x - W * .03, y - H * .22]], true, .1), fill: "sumi", outline: c.lw });
  }
  // Noren across the open front, each panel swaying a little with the wind; the crest split across the middle panels.
  const panels = 5, pw = W * .62 / panels, sway = cx.wind * H * .03, top = -g + H * .02;
  for (let i = 0; i < panels; i++) {
    const x = -W * .48 + i * pw, s = sway * (1 + .3 * Math.sin(cx.frame / 13 + i)), len = g * .52;
    out.push({ t: "fill", d: smoothD([[x + pw * .04, top], [x + pw * .96, top], [x + pw * .96 + s, top + len], [x + pw * .04 + s, top + len]], true, .05), fill: noren, outline: c.lw * .8, grain: .3 });
  }
  out.push(...crest([-W * .48 + pw * 2.5 + sway * .6, top + g * .24], pw * .55, paint(p, "crest", "gofun")));
  out.push({ t: "line", d: carvedLine([[-W * .5, top], [W * .16, top]], c.lw * 2, { taper: "none" }), color: "cha" });
  // A standing sign by the door: a lacquered board on a stand, a gold painted fan on it (no writing).
  if (bool(p, "sign", true)) {
    const sx = W * .58, sh = H * .38;
    out.push({ t: "fill", d: rectD(sx - W * .035, -sh, W * .07, sh * .82), fill: "sumi", outline: c.lw });
    out.push({ t: "fill", d: smoothD([[sx, -sh * .38], [sx - W * .025, -sh * .62], [sx, -sh * .7], [sx + W * .025, -sh * .62]], true, .3), fill: "kin" });
    out.push({ t: "stroke", d: `M${(sx - W * .03).toFixed(1)} ${(-sh * .18).toFixed(1)}l${(-W * .015).toFixed(1)} ${(sh * .18).toFixed(1)}M${(sx + W * .03).toFixed(1)} ${(-sh * .18).toFixed(1)}l${(W * .015).toFixed(1)} ${(sh * .18).toFixed(1)}`, color: "kogecha", width: c.lw * 1.4 });
  }
  return out;
}

/** A storehouse. Params: width, height, snow. */
export function kura(p: P, cx: { seed: number }): Prim[] {
  const W = num(p, "width", 170), H = num(p, "height", 230), c = ctx(cx.seed, W, p), sd = W * .35, out: Prim[] = [];
  const box: Box = { x0: -W / 2, w: W, y0: 0, h: H * .8, sd, sk: sd * .4 };
  out.push(...storey(box, c, false));
  out.push(...namako(-W / 2, 0, W, H * .26, c.lw));
  // The window: iron-clad shutters standing open on either side of a barred opening.
  const wy = -H * .55, ww = W * .2, wh = H * .14;
  out.push({ t: "fill", d: rectD(-ww / 2, wy - wh / 2, ww, wh), fill: "sumi", outline: c.lw });
  out.push({ t: "stroke", d: [1, 2, 3].map(k => `M${(-ww / 2 + ww * k / 4).toFixed(1)} ${(wy - wh / 2).toFixed(1)}l0 ${wh.toFixed(1)}`).join(""), color: "usuzumi", width: c.lw * .8 });
  for (const s of [-1, 1]) out.push({ t: "fill", d: rectD(s < 0 ? -ww / 2 - ww * .55 : ww / 2, wy - wh * .6, ww * .55, wh * 1.2), fill: "gofun", outline: c.lw });
  out.push(...roof({ ...box, h: H * .8 }, H * .22, c, { top: true }));
  // The crest on the gable end, a white roundel.
  out.push({ t: "fill", d: ellipseD(W / 2 + sd * .5, -H * .78 - sd * .2, W * .07, W * .07), fill: "gofun", outline: c.lw * .7 }, { t: "fill", d: ellipseD(W / 2 + sd * .5, -H * .78 - sd * .2, W * .035, W * .035), fill: "sumi" });
  return out;
}

/** A samurai residence wall with its gatehouse. Params: width, height, pines, snow, night. */
export function yashiki(p: P, cx: { seed: number }): Prim[] {
  const W = num(p, "width", 900), H = num(p, "height", 150), c = ctx(cx.seed, W / 4, p), out: Prim[] = [];
  const nP = clamp(Math.round(num(p, "pines", 4)), 0, 10);
  for (let i = 0; i < nP; i++) out.push(...pine(lerp(-W * .42, W * .42, nP > 1 ? i / (nP - 1) : .5), -H * .62, H * (.62 + .2 * hash01(c.seed, i, 3)), c, i));
  const gw = W * .32, segs: [number, number][] = [[-W / 2, -gw / 2], [gw / 2, W / 2]];
  for (const [a, b] of segs) {
    const box: Box = { x0: a, w: b - a, y0: 0, h: H * .6, sd: 0, sk: 0 };
    out.push({ t: "fill", d: rectD(a, -H * .6, b - a, H * .6), fill: "gofun", outline: c.lw, grain: .4 });
    out.push({ t: "fill", d: rectD(a, -H * .3, b - a, H * .3), fill: BOARD, outline: c.lw });
    out.push({ t: "line", d: carvedLine([[a, -H * .3], [b, -H * .3]], c.lw * 1.6, { taper: "none" }), color: "sumi" });
    out.push(...roof(box, H * .16, c, { long: true }));
  }
  // The gatehouse (nagaya-mon): a taller block with lattice windows either side of the great gate.
  const gb: Box = { x0: -gw / 2, w: gw, y0: 0, h: H * .86, sd: 0, sk: 0 };
  out.push({ t: "fill", d: rectD(-gw / 2, -H * .86, gw, H * .86), fill: "gofun", outline: c.lw, grain: .4 });
  out.push({ t: "fill", d: rectD(-gw / 2, -H * .38, gw, H * .38), fill: BOARD, outline: c.lw });
  for (const s of [-1, 1]) {
    const x = s * gw * .34;
    out.push({ t: "fill", d: rectD(x - gw * .1, -H * .7, gw * .2, H * .18), fill: "sumi", outline: c.lw }, { t: "stroke", d: Array.from({ length: 5 }, (_, i) => `M${(x - gw * .1 + gw * .2 * (i + 1) / 6).toFixed(1)} ${(-H * .7).toFixed(1)}l0 ${(H * .18).toFixed(1)}`).join(""), color: "usuzumi", width: c.lw * .8 });
  }
  out.push({ t: "fill", d: rectD(-gw * .16, -H * .62, gw * .32, H * .62), fill: WOOD, outline: c.lw * 1.2, grain: .5 });
  out.push({ t: "line", d: carvedLine([[0, -H * .6], [0, 0]], c.lw, { taper: "none" }), color: "sumi" });
  out.push({ t: "dots", d: Array.from({ length: 10 }, (_, i) => circleD((i % 2 ? 1 : -1) * gw * .08, -H * (.08 + .11 * Math.floor(i / 2)), c.lw * 1.5)).join(""), color: "kin" });
  out.push(...roof(gb, H * .22, c, { long: true }));
  return out;
}

/** A fire-watch tower. Params: height, bell (colour), snow. */
export function firetower(p: P, cx: { seed: number; frame: number; wind: number }): Prim[] {
  const H = num(p, "height", 520), lw = Math.max(1, H * .004), out: Prim[] = [], b0 = H * .11, b1 = H * .045, top = -H * .82;
  const leg = (s: number): Pt[] => [[s * b0, 0], [s * b1, top]];
  for (const s of [-1, 1]) out.push({ t: "fill", d: carvedLine(leg(s), H * .018, { taper: "end", minRatio: .7 }), fill: WOOD, outline: lw });
  // Cross bracing in four bays, each bay an X between horizontal ties.
  const ties: string[] = [];
  for (let i = 0; i <= 4; i++) { const t = i / 4, y = lerp(0, top, t), x = lerp(b0, b1, t); ties.push(`M${(-x).toFixed(1)} ${y.toFixed(1)}L${x.toFixed(1)} ${y.toFixed(1)}`); if (i < 4) { const t2 = (i + 1) / 4, y2 = lerp(0, top, t2), x2 = lerp(b0, b1, t2); ties.push(`M${(-x).toFixed(1)} ${y.toFixed(1)}L${x2.toFixed(1)} ${y2.toFixed(1)}M${x.toFixed(1)} ${y.toFixed(1)}L${(-x2).toFixed(1)} ${y2.toFixed(1)}`); } }
  out.push({ t: "stroke", d: ties.join(""), color: "kogecha", width: lw * 1.6 });
  // The ladder up the front, its rungs lashed on.
  const rails = [-H * .022, H * .022], rungs: string[] = [];
  for (let y = -H * .03; y > top; y -= H * .03) rungs.push(`M${rails[0].toFixed(1)} ${y.toFixed(1)}L${rails[1].toFixed(1)} ${y.toFixed(1)}`);
  out.push({ t: "stroke", d: rails.map(x => `M${x.toFixed(1)} 0L${x.toFixed(1)} ${top.toFixed(1)}`).join("") + rungs.join(""), color: "cha", width: lw * 1.3 });
  // The platform with its railing, a little roof over it, and the bell with its mallet, swinging a touch in the wind.
  const pw = H * .1;
  out.push({ t: "fill", d: rectD(-pw, top - H * .015, pw * 2, H * .02), fill: WOOD, outline: lw });
  out.push({ t: "stroke", d: Array.from({ length: 7 }, (_, i) => `M${(-pw + i * pw / 3).toFixed(1)} ${(top - H * .015).toFixed(1)}l0 ${(-H * .045).toFixed(1)}`).join("") + `M${(-pw).toFixed(1)} ${(top - H * .06).toFixed(1)}L${pw.toFixed(1)} ${(top - H * .06).toFixed(1)}`, color: "kogecha", width: lw * 1.2 });
  for (const s of [-1, 1]) out.push({ t: "line", d: carvedLine([[s * pw * .9, top - H * .015], [s * pw * .9, top - H * .14]], lw * 1.6, { taper: "none" }), color: "kogecha" });
  out.push({ t: "fill", d: smoothD([[-pw * 1.45, top - H * .13], [0, top - H * .19], [pw * 1.45, top - H * .13], [pw * 1.2, top - H * .12], [-pw * 1.2, top - H * .12]], true, .15), fill: { type: "linear", angle: 90, stops: [[0, "usuzumi", 1], [1, "sumi", 1]] }, outline: lw });
  if (num(p, "snow", 0) > 0) out.push({ t: "line", d: carvedLine([[-pw * 1.3, top - H * .14], [0, top - H * .195], [pw * 1.3, top - H * .14]], H * .012, { taper: "both" }), color: "gofun" });
  const swing = Math.sin(cx.frame / 31) * .02 + cx.wind * .01, bx = Math.sin(swing) * H * .03, by = top - H * .085;
  out.push({ t: "line", d: carvedLine([[0, top - H * .12], [bx, by - H * .02]], lw, { taper: "none" }), color: "sumi" });
  out.push({ t: "fill", d: smoothD([[bx - H * .016, by - H * .02], [bx + H * .016, by - H * .02], [bx + H * .022, by + H * .025], [bx - H * .022, by + H * .025]], true, .35), fill: { type: "linear", angle: 0, stops: [[0, "kogecha", 1], [.5, paint(p, "bell", "kincha"), 1], [1, "kogecha", 1]] }, outline: lw });
  out.push({ t: "line", d: carvedLine([[bx + H * .03, by - H * .01], [bx + H * .055, by + H * .03]], lw * 1.5, { taper: "none" }), color: "cha" });
  return out;
}

export const TOWN_MOTIFS = { shop, kura, yashiki, firetower } as const;
export const ANIMATED_TOWN: ReadonlySet<string> = new Set(["shop", "firetower"]);

// ---- The castle town scene ---------------------------------------------------------------------------------------------------------

export interface CastleTownOptions {
  /** Frames the pan takes (default 900: 30 s at 30 fps). */
  frames?: number;
  /** Ground line of the street (default 900) in the 1080-high picture. */
  street?: number;
  seed?: number;
  snow?: number;
}

/**
 * A castle town as one handscroll, 6400 px wide, panned from the keep down through the town with holds at four
 * stations: the castle over its moat and grassy banks; the samurai quarter, residence walls under pines, retainers
 * passing; the canal and its arched bridge, boats below; the merchant street, shops and storehouses behind a busy crowd,
 * the fire-watch tower over the roofs. Mist bands (suyari-gasumi) drift across, as in the picture scrolls.
 */
export function castleTown(o: CastleTownOptions = {}): UkiyoeSceneSpec {
  const frames = o.frames ?? 900, gy = o.street ?? 900, snow = o.snow ?? 0, W = 6400;
  const samurai = (robe: UkiyoePaint, kataginu: UkiyoePaint): UkiyoeFigureLook => ({ ...UKIYOE_SAMURAI_LOOK, robe, kataginu, hakama: kataginu, crest: kataginu });
  const nodes: UkiyoeNode[] = [
    { id: "sky", kind: "motif", motif: "sky", depth: .2, params: { width: W, height: 1080, band: .36, horizon: "beni" } },
    { id: "range", kind: "motif", motif: "range", depth: .35, x: 2600, y: gy - 300, params: { width: 5600, height: 300, layers: 3, snow: snow > 0 ? .8 : 0 } },
    // The ground of the whole town, rising a little toward the castle's hill.
    { id: "ground", kind: "block", depth: .9, x: 3200, y: gy + 40, shape: { type: "polygon", points: [[-3400, -235], [-1100, -235], [-700, -130], [3400, -130], [3400, 300], [-3400, 300]] }, fill: { type: "linear", angle: 90, stops: [[0, "kusa", 1], [1, "matsu", 1]] }, line: 0, grain: .8 },
    // 1. The castle on its hill above the moat; a grassy bank and pines run along the water.
    { id: "castle", kind: "motif", motif: "castle", depth: .8, x: 960, y: gy - 190, params: { width: 880, tiers: 5, snow, pines: 5 } },
    { id: "bank", kind: "block", depth: .9, x: 1000, y: gy - 92, shape: { type: "polygon", points: [[-1100, 0], [1100, 0], [1260, 110], [-1260, 110]] }, fill: { type: "linear", angle: 90, stops: [[0, "kusa", 1], [1, "matsu", 1]] }, line: 1.2, grain: .8 },
    // 2. The samurai quarter.
    { id: "yashiki-1", kind: "motif", motif: "yashiki", depth: .95, x: 2350, y: gy - 40, params: { width: 1000, height: 170, snow } },
    { id: "yashiki-2", kind: "motif", motif: "yashiki", depth: .95, x: 3250, y: gy - 40, params: { width: 760, height: 160, pines: 3, snow } },

    // 4. The merchant street: shops and storehouses, the fire-watch tower behind.
    { id: "firetower", kind: "motif", motif: "firetower", depth: .97, x: 5420, y: gy - 120, params: { height: 640, snow } },
    ...[[4500, "ai"], [4840, "kogecha"], [5520, "ai"], [5860, "matsu"]].map(([x, n], i): UkiyoeNode => ({ id: "shop-" + i, kind: "motif", motif: "shop", depth: .98, x: x as number, y: gy - 60, params: { width: 320, height: 250, noren: n, snow, sign: i % 2 === 0 } })),
    ...[5180, 6180].map((x, i): UkiyoeNode => ({ id: "kura-" + i, kind: "motif", motif: "kura", depth: .98, x, y: gy - 60, params: { width: 170, height: 240, snow } })),
    // The street in front, broken by the canal; the canal's water between stone banks, a boat, the arched bridge over it.
    ...[[-100, 3680], [4220, W + 100]].map(([a, b], i): UkiyoeNode => ({ id: "street-" + i, kind: "block", depth: 1, x: (a + b) / 2, y: gy + 70, shape: { type: "rect", width: b - a, height: 260 }, fill: { type: "linear", angle: 90, stops: [[0, "kincha", .85], [1, "cha", .95]] }, line: 0, grain: 1 })),
    { id: "canal", kind: "block", depth: 1, x: 3950, y: gy + 60, shape: { type: "rect", width: 540, height: 280 }, fill: { type: "linear", angle: 90, stops: [[0, "ai", 1], [1, "sora", 1]] }, line: 0, grain: .5 },
    ...[3680, 4220].map((x, i): UkiyoeNode => ({ id: "canal-bank-" + i, kind: "line", depth: 1, points: [[x, gy - 60], [x + (i ? 8 : -8), 1080]], width: 10, color: "usuzumi" })),
    { id: "boat-1", kind: "motif", motif: "boat", depth: 1, x: 3870, y: gy + 95, scale: .5, params: { kind: "sampan", length: 300 }, loops: [{ kind: "bob", amplitude: 3, period: 70 }] },
    { id: "bridge", kind: "motif", motif: "bridge", depth: 1, x: 3950, y: gy + 20, scale: .78, params: { span: 760, rise: 100, depth: 70 } },
    // Walkers stay on the street: the retainers stop short of the canal, the townsfolk walk on away from it.
    { id: "retainers", kind: "crowd", depth: 1, x: 2450, y: gy + 40, width: 1000, count: 6, rows: 1, mood: "procession", direction: "right", scale: .62, frames, cast: [samurai("cha", "ai"), samurai("kogecha", "usuzumi"), samurai("ai", "kogecha")] },
    { id: "townsfolk", kind: "crowd", depth: 1, x: 5300, y: gy + 60, width: 1700, count: 30, rows: 3, rowGap: 40, mood: "busy", direction: "right", scale: .6, frames },
    // Mist bands drifting across, high and low.
    ...[[700, 200], [2300, 560], [3600, 240], [4900, 300], [6000, 600]].map(([x, y], i): UkiyoeNode => ({ id: "mist-" + i, kind: "motif", motif: "cloud", depth: .9 + (i % 2) * .1, x, y, params: { width: 1300, height: 70, color: "kin" }, loops: [{ kind: "drift", amplitude: 40, period: 400 + 60 * i }] })),
  ];
  return {
    version: 1, id: "castle-town", width: 1920, height: 1080, durationFrames: frames, seed: o.seed ?? 23, cadence: 2,
    wind: { base: .4, turbulence: .4 }, palette: { preset: snow > 0 ? "twilight" : "edo" }, mount: { kind: "scroll" },
    camera: { keys: scrollPan({ from: 960, to: W - 960, y: 540, start: 0, end: frames - 1, stations: [{ x: 1100, hold: 70 }, { x: 2800, hold: 50 }, { x: 3950, hold: 60 }, { x: 5300, hold: 90 }] }) },
    nodes,
  };
}
