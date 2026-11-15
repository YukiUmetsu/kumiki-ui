/**
 * UKIYO1 castle, after Meiji-era photographs of Nagoya, Kumamoto and Himeji castles and Hiroshige's castle views: a
 * keep (tenshu) of stacked tiers, each smaller than the one below, with deep tiled eaves turning up at the corners,
 * triangular chidori gables and a curved karahafu on the roof faces, white plaster walls (or black boarding below a
 * plaster band, `style: "black"`) with rows of small barred windows, and gold shachihoko on the top ridge; all on a tall
 * stone base (ishigaki) whose faces curve steeper toward the top like an opened fan, with interlocking long-and-short
 * corner stones. Before it run the outer wall with its tiled coping and loopholes, two corner turrets, a gate tower over
 * the gateway, a moat and a bridge to the gate.
 *
 * Same conventions as the other motifs: it stands on its base centre (0, 0), the foot of the outer wall at the water
 * line, and grows upward; the moat and the bridge lie in front, below the base line. Static (drawn once and cached).
 */
import type { Pt } from "./ukiyoe-core";
import { carvedLine, clamp, clamp01, hash01, lerp, smoothD } from "./ukiyoe-core";
import type { Prim } from "./ukiyoe-prims";
import { circleD, ellipseD, rectD } from "./ukiyoe-prims";
import type { UkiyoeFill, UkiyoePaint } from "./ukiyoe-pigments";

type P = Readonly<Record<string, unknown>>;
const num = (p: P, k: string, d: number) => typeof p[k] === "number" && Number.isFinite(p[k]) ? p[k] as number : d;
const str = (p: P, k: string, d: string): string => typeof p[k] === "string" ? p[k] as string : d;
const bool = (p: P, k: string, d: boolean) => typeof p[k] === "boolean" ? p[k] as boolean : d;
const paint = (p: P, k: string, d: UkiyoePaint): UkiyoePaint => typeof p[k] === "string" ? p[k] as string : d;

const TILE: UkiyoeFill = { type: "linear", angle: 90, stops: [[0, "usuzumi", 1], [.55, "sumi", 1], [1, "sumi", 1]] };
const STONE: UkiyoeFill = { type: "linear", angle: 90, stops: [[0, "usuzumi", .85], [1, "kogecha", .7]] };
const BOARD: UkiyoeFill = { type: "linear", angle: 0, stops: [[0, "sumi", 1], [.5, "kogecha", 1], [1, "sumi", 1]] };

export interface Ctx { seed: number; lw: number; style: "white" | "black"; snow: number; night: number; plaster: UkiyoePaint }

// ---- Stone base ---------------------------------------------------------------------------------------------------------------------

/**
 * A stone base from `x0` to `x1` at its foot (`yb`), `h` tall, seen a little from the side (`d` × width of receding
 * face): its faces curve in toward the top — shallow at the foot, steep at the top, like an opened fan — stones laid in
 * irregular courses that shrink toward the top, long-and-short blocks up the corners; the side face is in shadow.
 */
export function ishigaki(x0: number, x1: number, yb: number, h: number, c: Ctx, inset = .14, d = 0): Prim[] {
  const w = x1 - x0, ins = w * inset, N = 12, fan = (t: number) => ins * (1 - (1 - t) ** 2.2);
  const left: Pt[] = [], right: Pt[] = [];
  for (let i = 0; i <= N; i++) { const t = i / N; left.push([x0 + fan(t), yb - h * t]); right.push([x1 - fan(t), yb - h * t]); }
  const out: Prim[] = [];
  // The receding side face, behind the front, in shadow.
  if (d > 0) {
    const sd = w * d, sk = sd * .4, side: Pt[] = [...right, ...[...right].reverse().map(q => [q[0] + sd, q[1] - sk] as Pt)];
    const sideD = smoothD(side, true, .12);
    out.push({ t: "fill", d: sideD, fill: STONE, outline: c.lw, grain: 1 }, { t: "fill", d: sideD, fill: "sumi", opacity: .28, noPrint: true });
  }
  const face = smoothD([...left, ...[...right].reverse()], true, .12);
  out.push({ t: "fill", d: face, fill: STONE, outline: c.lw, grain: 1 });
  // Stones as the photographs show them: irregular blocks, each its own shape and tone, largest at the foot, laid so
  // the joints never line up from course to course.
  const tones: string[][] = [[], [], []], joints: string[] = [];
  let y = yb, row = 0;
  while (y > yb - h + 2) {
    const t = (yb - y) / h, rh = h * .1 * (1 - .45 * t), xl = x0 + fan(t), xr = x1 - fan(t), j = rh * .13;
    let x = xl - rh * hash01(c.seed, row, 1), k = 0;
    while (x < xr) {
      const sw = rh * (1.1 + 1.5 * hash01(c.seed, row, k)), jit = (a: number, b: number) => (hash01(c.seed, row, k, a) - .5) * 2 * j * b;
      const q: Pt[] = [[x + jit(1, 1), y + jit(2, .5)], [x + sw + jit(3, 1), y + jit(4, .5)], [x + sw + jit(5, 1) - rh * .05, y - rh + jit(6, .5)], [x + jit(7, 1) + rh * .05, y - rh + jit(8, .5)]];
      const d = smoothD(q, true, .18);
      tones[Math.floor(hash01(c.seed, row, k, 11) * 3)].push(d); joints.push(d);
      x += sw; k++;
    }
    y -= rh; row++;
  }
  const corners: string[] = [];
  for (const side of [-1, 1]) for (let i = 0; i < 10; i++) {
    const t0 = i / 10, t1 = (i + 1) / 10, long = i % 2 === 0, e0 = side < 0 ? x0 + fan(t0) : x1 - fan(t0), e1 = side < 0 ? x0 + fan(t1) : x1 - fan(t1);
    const reach = w * (long ? .07 : .035) * (1 - .3 * t0);
    corners.push(`M${e0.toFixed(1)} ${(yb - h * t0).toFixed(1)}L${(e0 - side * reach).toFixed(1)} ${(yb - h * t0).toFixed(1)}L${(e1 - side * reach).toFixed(1)} ${(yb - h * t1).toFixed(1)}`);
  }
  out.push({ t: "clip", d: face, key: "ishigaki", prims: [
    { t: "fill", d: tones[0].join(""), fill: "gofun", opacity: .16, noPrint: true },
    { t: "fill", d: tones[1].join(""), fill: "sumi", opacity: .14, noPrint: true },
    { t: "stroke", d: joints.join(""), color: "sumi", width: c.lw * .6, opacity: .5 },
    { t: "stroke", d: corners.join(""), color: "sumi", width: c.lw * .8, opacity: .6 },
    { t: "fill", d: rectD(x0 - 10, yb - h, w + 20, h * .07), fill: "matsu", opacity: .25, noPrint: true },
  ] });
  return out;
}

// ---- Walls, windows, roofs ----------------------------------------------------------------------------------------------------------

/** A box seen a little from the side: front face `x0..x0+w`, side face `sd` deep rising `sk`, from `y0` up `h`. */
export interface Box { x0: number; w: number; y0: number; h: number; sd: number; sk: number }

/** Barred windows in a row across a face from `a` to `b` (each a corner [x, y] of the face's bottom), at a height. */
function windows(a: Pt, b: Pt, h: number, n: number, c: Ctx, shade = 0): Prim[] {
  const panes: string[] = [], bars: string[] = [], out: Prim[] = [];
  const ww = Math.hypot(b[0] - a[0], b[1] - a[1]) / n * .32, wh = h * .3, rise = (b[1] - a[1]) / (b[0] - a[0] || 1);
  for (let i = 0; i < n; i++) {
    const t = (i + .5) / n, cx = lerp(a[0], b[0], t), cy = lerp(a[1], b[1], t) - h * .62;
    const q = (dx: number, dy: number): Pt => [cx + dx, cy + dy + dx * rise];
    panes.push(smoothD([q(-ww / 2, -wh / 2), q(ww / 2, -wh / 2), q(ww / 2, wh / 2), q(-ww / 2, wh / 2)], true, 0));
    for (let k = 1; k < 4; k++) { const p0 = q(-ww / 2 + ww * k / 4, -wh / 2), p1 = q(-ww / 2 + ww * k / 4, wh / 2); bars.push(`M${p0[0].toFixed(1)} ${p0[1].toFixed(1)}L${p1[0].toFixed(1)} ${p1[1].toFixed(1)}`); }
    if (c.night > 0) out.push({ t: "glow", cx, cy, r: h * .5, color: "ki", opacity: .35 * c.night * (1 - shade) });
  }
  out.unshift({ t: "fill", d: panes.join(""), fill: c.night > 0 ? "ki" : "sumi", outline: c.lw * .5, opacity: c.night > 0 ? (.55 + .45 * c.night) * (1 - shade * .5) : 1 });
  out.push({ t: "stroke", d: bars.join(""), color: c.night > 0 ? "kogecha" : "usuzumi", width: c.lw * .45, opacity: .9 });
  return out;
}

/** A storey: plaster front and side faces (black boarding below in the black style), barred windows on both. */
export function storey(b: Box, c: Ctx, withWindows = true): Prim[] {
  const { x0, w, y0, h, sd, sk } = b, out: Prim[] = [], x1 = x0 + w;
  const side = smoothD([[x1, y0], [x1 + sd, y0 - sk], [x1 + sd, y0 - sk - h], [x1, y0 - h]], true, 0);
  const front = rectD(x0, y0 - h, w, h);
  if (sd > 0) out.push({ t: "fill", d: side, fill: c.plaster, outline: c.lw, grain: .4 }, { t: "fill", d: side, fill: "usuzumi", opacity: .35, noPrint: true });
  out.push({ t: "fill", d: front, fill: c.plaster, outline: c.lw, grain: .4 });
  if (c.style === "black") {
    out.push({ t: "fill", d: rectD(x0, y0 - h * .62, w, h * .62), fill: BOARD, outline: c.lw * .8 });
    if (sd > 0) out.push({ t: "fill", d: smoothD([[x1, y0], [x1 + sd, y0 - sk], [x1 + sd, y0 - sk - h * .62], [x1, y0 - h * .62]], true, 0), fill: BOARD, outline: c.lw * .8 });
  }
  if (withWindows) {
    out.push(...windows([x0, y0], [x1, y0], h, Math.max(1, Math.round(w / (h * .8))), c));
    if (sd > h * .4) out.push(...windows([x1, y0], [x1 + sd, y0 - sk], h, Math.max(1, Math.round(sd / (h * .9))), c, .4));
  }
  return out;
}

/** The eave line's height at x (a polyline of [x, y], either direction). */
function yAt(from: readonly Pt[], x: number): number {
  for (let i = 0; i < from.length - 1; i++) if ((x - from[i][0]) * (x - from[i + 1][0]) <= 0) return lerp(from[i][1], from[i + 1][1], (x - from[i][0]) / ((from[i + 1][0] - from[i][0]) || 1));
  return from[x < from[0][0] === from[0][0] < from[from.length - 1][0] ? 0 : from.length - 1][1];
}

/**
 * Kawara tile rows over a roof face, to be clipped to it: rows straight down the slope from `top` to the eave polyline
 * `from` (round caps catching the light over dark troughs, an occasional brighter cap), crossed by courses whose
 * lower edges hang as small arcs between the troughs. `pitch` is the row spacing in px; `dark` (0–1) for a face in shade.
 */
export function kawaraRows(from: readonly Pt[], top: number, pitch: number, rh: number, seed: number, dark: number): Prim[] {
  const fine = pitch >= 3.5, caps: string[] = [], troughs: string[] = [], lit: string[] = [];
  const x1 = from[0][0], x2 = from[from.length - 1][0], n = Math.max(2, Math.floor(Math.abs(x2 - x1) / pitch));
  for (let i = 0; i <= n; i++) {
    const ex = lerp(x1, x2, i / n), ey = yAt(from, ex), lean = (ex - (x1 + x2) / 2) * .04;
    (hash01(seed, i, 3) > .8 ? lit : caps).push(`M${(ex - lean).toFixed(1)} ${top.toFixed(1)}L${ex.toFixed(1)} ${(ey + rh * .02).toFixed(1)}`);
    troughs.push(`M${(ex - lean + pitch * .5).toFixed(1)} ${top.toFixed(1)}L${(ex + pitch * .5).toFixed(1)} ${(ey + rh * .02).toFixed(1)}`);
  }
  // Courses: each tile's lower edge is a small arc hanging between two troughs, so the slope reads as scales, not as
  // corrugated sheet; on small roofs a plain line per course.
  const courses: string[] = [];
  if (fine) for (let k = 1; k < 14; k++) {
    const dy = k * pitch * 1.35;
    if (pitch >= 5) for (let i = 0; i < n; i++) {
      const xa = lerp(x1, x2, i / n) + pitch * .5, xb = lerp(x1, x2, (i + 1) / n) + pitch * .5, ya = yAt(from, xa) - dy, yb = yAt(from, xb) - dy;
      courses.push(`M${xa.toFixed(1)} ${ya.toFixed(1)}Q${((xa + xb) / 2).toFixed(1)} ${((ya + yb) / 2 + pitch * .45).toFixed(1)} ${xb.toFixed(1)} ${yb.toFixed(1)}`);
    }
    else courses.push("M" + from.map(q => `${q[0].toFixed(1)} ${(q[1] - dy).toFixed(1)}`).join("L"));
  }
  return [
    { t: "stroke", d: troughs.join(""), color: "sumi", width: pitch * .34, opacity: .55 + dark * .2 },
    { t: "stroke", d: caps.join(""), color: "usuzumi", width: pitch * .3, opacity: .55 - dark * .25 },
    { t: "stroke", d: lit.join(""), color: "gofun", width: pitch * .22, opacity: .28 - dark * .12 },
    ...fine ? [{ t: "stroke" as const, d: courses.join(""), color: "sumi", width: Math.max(.5, pitch * .16), opacity: .6 }, { t: "group" as const, transform: `translate(0 ${(-pitch * .18).toFixed(1)})`, prims: [{ t: "stroke" as const, d: courses.join(""), color: "gofun", width: Math.max(.4, pitch * .07), opacity: .18 }] }] : [],
  ];
}

/** The eave's front lip: a dark band beaded with round end tiles (nokigawara), each with its stamped boss. */
export function kawaraEave(eave: readonly Pt[], pitch: number, rh: number, lw: number): Prim[] {
  const out: Prim[] = [{ t: "line", d: carvedLine(eave.map(q => [q[0], q[1] + rh * .012] as Pt), Math.max(1.5, rh * .045), { taper: "none", smooth: true }), color: "sumi" }];
  if (pitch >= 3.5) {
    const beads: string[] = [], bosses: string[] = [], r = pitch * .42, a = Math.min(eave[0][0], eave[eave.length - 1][0]), b = Math.max(eave[0][0], eave[eave.length - 1][0]);
    for (let x = a + pitch * .5; x < b - pitch * .3; x += pitch) { const y = yAt(eave, x) + rh * .012; beads.push(circleD(x, y, r)); bosses.push(circleD(x - r * .15, y - r * .15, r * .38)); }
    out.push({ t: "fill", d: beads.join(""), fill: "usuzumi", outline: Math.max(.5, lw * .45) }, { t: "fill", d: bosses.join(""), fill: "sumi", opacity: .55 });
  }
  return out;
}

/** The sheen over a kawara face: the upper slope reflects the sky, the lower falls into the eave's shade. */
export const KAWARA_SHEEN: UkiyoeFill = { type: "linear", angle: 90, stops: [[0, "gofun", .22], [.45, "gofun", 0], [.8, "sumi", 0], [1, "sumi", .35]] };

export interface RoofOptions {
  gables?: number; kara?: boolean; shachi?: boolean; top?: boolean; long?: boolean;
  /** Under the eave: white plaster (castles, storehouses; the default) or dark wooden rafters (shops). */
  soffit?: "plaster" | "wood";
  /** A storehouse's massive ridge, which throws a shadow down the slope. */
  heavy?: boolean;
  /** A crest roundel on the gable end (the storehouse's family mark). */
  crest?: boolean;
  /** Gabled (kirizuma) instead of hipped: the receding end is the wall's plaster gable under a tiled verge. */
  gable?: boolean;
  /**
   * Curve (sori), 0–1: how much the eave sags and its corners and the ridge ends lift. Town houses, storehouses and
   * walls are straight (0, the default), as in Hiroshige's and Hokusai's street views and the period photographs;
   * castle keeps and temple halls curve gently (about .35).
   */
  sori?: number;
}

/**
 * A tiled roof over a box, seen a little from the side: hipped, or gabled (`gable`) with the wall's plaster gable under
 * a tiled verge. The edges are straight unless `sori` curves them (castle keeps, temple halls). Kawara rows run down
 * both faces with scalloped courses and sheen; the eave carries its bead of tile ends over plaster or wooden rafters;
 * the ridge is stacked with onigawara at its ends (gold shachihoko on a keep). Chidori gables or a karahafu stand on the
 * front; snow lies on the upper slope and caps the ridge, the onigawara and the eave.
 */
export function roof(b: Box, rh: number, c: Ctx, o: RoofOptions = {}, front: Prim[] = []): Prim[] {
  const out: Prim[] = [], { x0, w, sd, sk } = b, yE = b.y0 - b.h, ov = w * .2, sori = clamp01(o.sori ?? 0), lift = rh * .38 * sori;
  const L: Pt = [x0 - ov, yE + rh * .04], R: Pt = [x0 + w + ov * .7, yE + rh * .04], B: Pt = [x0 + w + sd + ov * .6, yE - sk + rh * .02];
  const rw = o.gable ? w + sd * .05 : o.long ? w * .94 : o.top ? w * .34 : w * .55, rx0 = x0 + (w - rw) / 2 + sd * .45, ridge: [Pt, Pt] = [[rx0, yE - rh - sk * .45], [rx0 + rw, yE - rh - sk * .45]];
  // The front eave sags a little between corners that turn up.
  const eave: Pt[] = [];
  for (let i = 0; i <= 24; i++) { const u = i / 24, e = Math.abs(u * 2 - 1); eave.push([lerp(L[0], R[0], u), lerp(L[1], R[1], u) - lift * e ** 6 + rh * .05 * sori * (1 - e * e)]); }
  const eaveAt = (x: number): number => { const u = clamp01((x - L[0]) / (R[0] - L[0])) * 24, i = Math.min(23, Math.floor(u)); return lerp(eave[i][1], eave[i + 1][1], u - i); };
  // The side eave starts from the front eave's upturned corner, so the two meet without a notch.
  const sideEave: Pt[] = [], Rt = eave[24];
  for (let i = 0; i <= 12; i++) { const u = i / 12; sideEave.push([lerp(Rt[0], B[0], u), lerp(Rt[1], B[1] - lift, u) + lift * (1 - Math.abs(u * 2 - 1) ** 2) * .55]); }
  const bend = sori > 0 ? .12 : 0, faceD = smoothD([...eave, ridge[1], ridge[0]], true, bend), side = smoothD([...sideEave, ridge[1]], true, bend);
  // Kawara, after Hiroshige's Suruga-chō, Hokusai's Nihonbashi storehouses and Kusakabe's street photographs: silver-grey
  // fired tiles laid in rows straight down the slope (round caps catching the light over dark troughs), courses that
  // follow the eave's sag, a bead of round tile ends along the eave, a stacked ridge whose ends lift into onigawara.
  const pitch = clamp(rh * .085, 2.2, 14), fine = pitch >= 3.5, seed = Math.round(x0 * 7 + yE * 3);
  const rowsAcross = (from: Pt[], top: number, dark: number): Prim[] => kawaraRows(from, top, pitch, rh, seed, dark);
  const gableTri: Pt[] = [[x0 + w, yE + rh * .02], ridge[1], [x0 + w + sd, yE - sk + rh * .02]];
  if (o.gable && sd > 0) {
    // The plaster gable, its upper part in the verge's shadow; the crest roundel on it.
    out.push({ t: "fill", d: smoothD(gableTri, true, 0), fill: c.plaster, outline: c.lw }, { t: "fill", d: smoothD(gableTri, true, 0), fill: { type: "linear", angle: 90, stops: [[0, "sumi", .35], [.5, "sumi", .12], [1, "sumi", .05]] }, noPrint: true });
    if (o.crest) {
      const gx = x0 + w + sd * .64, gy = yE - sk * .64 - rh * .14, r = Math.min(sd * .12, rh * .17);
      out.push({ t: "fill", d: circleD(gx, gy, r), fill: "gofun", outline: c.lw * .7 }, { t: "stroke", d: circleD(gx, gy, r * .62), color: "sumi", width: r * .22 }, { t: "fill", d: circleD(gx, gy, r * .22), fill: "sumi" });
    }
  }
  if (sd > 0 && !o.gable) {
    out.push({ t: "fill", d: side, fill: TILE, outline: c.lw, grain: .7 });
    out.push({ t: "clip", d: side, key: "roofside", prims: [...rowsAcross(sideEave, ridge[1][1] - rh, 1), { t: "fill", d: side, fill: "sumi", opacity: .32, noPrint: true }] });
  }
  out.push({ t: "fill", d: faceD, fill: TILE, outline: c.lw, grain: .7 });
  // Sheen: the upper slope reflects the sky, the lower falls into the eave's own shade.
  out.push({ t: "clip", d: faceD, key: "rooftiles", prims: [
    ...rowsAcross(eave, ridge[0][1] - rh * .2, 0),
    { t: "fill", d: faceD, fill: KAWARA_SHEEN },
  ] });
  // Under the eave: white plaster on castles and storehouses, dark rafters (taruki) on wooden shops.
  const under = eave.map(q => [q[0], q[1] + rh * .09] as Pt);
  if (o.soffit === "wood") {
    out.push({ t: "fill", d: smoothD([...eave, ...under.slice().reverse()], true, .1), fill: "kogecha", outline: c.lw * .6 });
    if (fine) out.push({ t: "stroke", d: under.filter((_, i) => i % 1 === 0).flatMap((q, i, a) => i < a.length - 1 ? [0, .5].map(f => { const x = lerp(q[0], a[i + 1][0], f); return `M${x.toFixed(1)} ${(eaveAt(x) + rh * .025).toFixed(1)}l0 ${(rh * .06).toFixed(1)}`; }) : []).join(""), color: "sumi", width: Math.max(.8, rh * .02), opacity: .8 });
  } else out.push({ t: "line", d: carvedLine(eave.map(q => [q[0], q[1] + rh * .055] as Pt), rh * .06, { taper: "none", smooth: true }), color: c.plaster, opacity: .95 });
  if (sd > 0 && !o.gable) out.push({ t: "line", d: carvedLine(sideEave.map(q => [q[0], q[1] + rh * .05] as Pt), rh * .05, { taper: "none", smooth: true }), color: o.soffit === "wood" ? "kogecha" : c.plaster, opacity: .75 });
  if (o.gable && sd > 0) {
    // The verge (kerabа): the roof's tiled edge running down the gable to the back eave, with its end tiles.
    const Bv: Pt = [x0 + w + sd + ov * .12, yE - sk + rh * .03], verge: Pt[] = [ridge[1], [lerp(ridge[1][0], Bv[0], .5), lerp(ridge[1][1], Bv[1], .5) - rh * .02], Bv];
    out.push({ t: "line", d: carvedLine(verge, rh * .1, { taper: "none", smooth: true }), color: "sumi" });
    out.push({ t: "line", d: carvedLine(verge.map(q => [q[0], q[1] - rh * .035] as Pt), rh * .03, { taper: "end", smooth: true }), color: "usuzumi", opacity: .8 });
  }
  // The eave's front lip of tile ends: a dark band beaded with round end tiles, each with its stamped boss.
  out.push(...kawaraEave(eave, pitch, rh, c.lw));
  // Hips (kudarimune): stacked tile ridges running down to each turned-up corner.
  const hip = (a: Pt, z: Pt, wgt: number) => {
    out.push({ t: "line", d: carvedLine([z, a], rh * .085 * wgt, { taper: "none" }), color: "sumi" });
    out.push({ t: "line", d: carvedLine([[z[0], z[1] - rh * .02], [a[0], a[1] - rh * .02]], rh * .025 * wgt, { taper: "none" }), color: "usuzumi", opacity: .7 });
    if (fine) out.push({ t: "fill", d: smoothD([[a[0] - rh * .05, a[1] + rh * .02], [a[0] - rh * .06, a[1] - rh * .09], [a[0], a[1] - rh * .14], [a[0] + rh * .06, a[1] - rh * .09], [a[0] + rh * .05, a[1] + rh * .02]], true, .3), fill: "usuzumi", outline: c.lw * .7 });
  };
  if (!o.gable) { hip(Rt, ridge[1], 1); hip(eave[0], ridge[0], .9); }
  else out.push({ t: "line", d: carvedLine([[eave[0][0], eave[0][1]], ridge[0]], rh * .09, { taper: "none" }), color: "sumi" }, { t: "line", d: carvedLine([[Rt[0], Rt[1]], ridge[1]], rh * .09, { taper: "none" }), color: "sumi" });
  // The ridge (munegawara): layers of flat noshi tiles under a round cap, its ends lifting a little, an onigawara at
  // each end with its curl and stamped roundel. A storehouse's ridge is heavier and throws a shadow down the slope.
  const heavy = o.heavy ? 1.7 : 1, rb = rh * .13 * heavy, up = rh * .07 * sori;
  const [r0, r1] = ridge, ridgeTop: Pt[] = [[r0[0] - rh * .06, r0[1] - rb - up], [lerp(r0[0], r1[0], .25), r0[1] - rb - up * .15], [lerp(r0[0], r1[0], .75), r1[1] - rb - up * .15], [r1[0] + rh * .06, r1[1] - rb - up]];
  const ridgeBase: Pt[] = [[r1[0] + rh * .06, r1[1] + rh * .02], [r0[0] - rh * .06, r0[1] + rh * .02]];
  if (o.heavy) out.push({ t: "clip", d: faceD, key: "ridgeshade", prims: [{ t: "fill", d: smoothD([[r0[0], r0[1]], [r1[0], r1[1]], [r1[0] + rh * .1, r1[1] + rh * .22], [r0[0] - rh * .1, r0[1] + rh * .22]], true, .3), fill: "sumi", opacity: .35, noPrint: true }] });
  out.push({ t: "fill", d: smoothD([...ridgeTop, ...ridgeBase], true, .2), fill: TILE, outline: c.lw });
  const layers: string[] = [];
  for (let k = 1; k <= 3; k++) { const f = k / 4; layers.push("M" + [ridgeBase[1], ...ridgeTop.slice(1, 3), ridgeBase[0]].map((q, i) => { const top = i === 0 ? ridgeTop[0] : i === 3 ? ridgeTop[3] : q, bot = i === 0 ? ridgeBase[1] : i === 3 ? ridgeBase[0] : [q[0], lerp(r0[1], r1[1], i / 3) + rh * .02] as Pt; return `${lerp(top[0], bot[0], f).toFixed(1)} ${lerp(top[1], bot[1], f).toFixed(1)}`; }).join("L")); }
  out.push({ t: "stroke", d: layers.join(""), color: "usuzumi", width: Math.max(.6, rh * .012 * heavy), opacity: .8 });
  out.push({ t: "line", d: carvedLine(ridgeTop, rh * .05 * heavy, { taper: "none", smooth: true }), color: "sumi" });
  out.push({ t: "line", d: carvedLine(ridgeTop.map(q => [q[0], q[1] - rh * .015 * heavy] as Pt), rh * .015 * heavy, { taper: "both", smooth: true }), color: "usuzumi", opacity: .7 });
  if (!o.shachi) for (const [end, sx] of [[ridgeTop[0], -1], [ridgeTop[3], 1]] as const) {
    // Onigawara: a tall block flaring outward at the top into a curl, the crest roundel on its face.
    const og = o.heavy ? 1.15 : 1, oh = rh * .3 * og, ow = rh * .15 * og, base: Pt = [end[0], end[1] + rb + up * .5];
    out.push({ t: "fill", d: smoothD([[base[0] - sx * ow * .2, base[1]], [base[0] - sx * ow * .25, base[1] - oh * .7], [base[0] + sx * ow * .15, base[1] - oh], [base[0] + sx * ow * 1.05, base[1] - oh * 1.05], [base[0] + sx * ow * .9, base[1] - oh * .72], [base[0] + sx * ow * .75, base[1]]], true, .35), fill: "usuzumi", outline: c.lw });
    out.push({ t: "fill", d: smoothD([[base[0] + sx * ow * .2, base[1] - oh * .9], [base[0] + sx * ow * .85, base[1] - oh * 1.02], [base[0] + sx * ow * .7, base[1] - oh * .78]], true, .4), fill: "sumi", opacity: .55 });
    out.push({ t: "fill", d: circleD(base[0] + sx * ow * .28, base[1] - oh * .4, ow * .3), fill: "usuzumi", outline: c.lw * .6 }, { t: "fill", d: circleD(base[0] + sx * ow * .28, base[1] - oh * .4, ow * .14), fill: "sumi", opacity: .7 });
  }
  const gables = o.gables ?? 0, mid = x0 + w / 2;
  if (o.kara) {
    // Karahafu: a cusped bow of a gable rising from the middle of the eave, its plaster panel below.
    const gw = w * .36, arc: Pt[] = [];
    for (let i = 0; i <= 12; i++) { const u = i / 12 * 2 - 1; arc.push([mid + u * gw / 2, yE + rh * .04 - rh * .6 * (1 - u * u) ** .55 + rh * .14 * Math.abs(u) ** 5]); }
    front.push({ t: "fill", d: smoothD([...arc, [mid + gw / 2, yE + rh * .1], [mid - gw / 2, yE + rh * .1]], true, .2), fill: c.plaster, outline: c.lw });
    front.push(...windows([mid - gw * .3, yE + rh * .05], [mid + gw * .3, yE + rh * .05], rh * .7, 2, c));
    front.push({ t: "line", d: carvedLine(arc, rh * .14, { taper: "none", smooth: true }), color: "sumi" });
    front.push({ t: "fill", d: ellipseD(mid, yE - rh * .38, rh * .07, rh * .06), fill: "kin", outline: c.lw * .5 });
  }
  for (let g = 0; g < gables; g++) {
    // Chidori gables: plaster triangles framed in heavy dark bargeboards, a gold gegyo hanging at the apex.
    const gx = gables === 1 ? mid : mid + (g ? 1 : -1) * w * .24, gw = w * (gables === 1 ? .36 : .26), apex: Pt = [gx, yE - rh * 1.15], l: Pt = [gx - gw / 2, yE + rh * .04], r: Pt = [gx + gw / 2, yE + rh * .04];
    // The gable's little tiled roof flares out over its bargeboards; a beam crosses the plaster panel.
    front.push({ t: "fill", d: smoothD([[l[0] - rh * .16, l[1] + rh * .08], apex, [r[0] + rh * .16, r[1] + rh * .08], [r[0] + rh * .02, r[1] + rh * .1], [gx, apex[1] + rh * .2], [l[0] - rh * .02, l[1] + rh * .1]], true, .05), fill: TILE, outline: c.lw });
    front.push({ t: "fill", d: smoothD([[l[0] + rh * .02, l[1] + rh * .06], [gx, apex[1] + rh * .22], [r[0] - rh * .02, r[1] + rh * .06]], true, 0), fill: c.plaster, outline: c.lw * .8 });
    front.push({ t: "stroke", d: `M${(gx - gw * .22).toFixed(1)} ${(yE - rh * .28).toFixed(1)}L${(gx + gw * .22).toFixed(1)} ${(yE - rh * .28).toFixed(1)}`, color: "usuzumi", width: c.lw * .7, opacity: .7 });
    front.push({ t: "fill", d: smoothD([[gx - rh * .1, apex[1] + rh * .22], [gx + rh * .1, apex[1] + rh * .22], [gx, apex[1] + rh * .42]], true, .2), fill: "kin", outline: c.lw * .5 });
    if (c.snow > 0) front.push({ t: "line", d: carvedLine([[l[0], l[1] - rh * .08], [apex[0], apex[1] - rh * .08], [r[0], r[1] - rh * .08]], rh * .1 * c.snow, { taper: "both" }), color: "gofun" });
  }
  // The top roof is hip-and-gable (irimoya): its big gable shows on the receding end face, a plaster triangle in dark
  // bargeboards with a gold gegyo.
  if (o.top && !o.long && sd > 0) {
    const a = sideEave[2], bq = sideEave[10], apex: Pt = [ridge[1][0] + rh * .05, ridge[1][1] + rh * .12];
    out.push({ t: "fill", d: smoothD([a, apex, bq], true, 0), fill: c.plaster, outline: c.lw }, { t: "fill", d: smoothD([a, apex, bq], true, 0), fill: "usuzumi", opacity: .3, noPrint: true });
    out.push({ t: "line", d: carvedLine([[a[0] - rh * .05, a[1] + rh * .04], apex, [bq[0] + rh * .05, bq[1] + rh * .04]], rh * .1, { taper: "none" }), color: "sumi" });
    if (!o.crest) out.push({ t: "fill", d: smoothD([[apex[0] - rh * .07, apex[1] + rh * .08], [apex[0] + rh * .07, apex[1] + rh * .06], [apex[0] + rh * .01, apex[1] + rh * .24]], true, .2), fill: "kin", outline: c.lw * .5 });
    if (o.crest) {
      // The family mark in a white roundel on the gable plaster, as on Hokusai's Nihonbashi storehouses.
      const cx2 = (a[0] + bq[0] + apex[0]) / 3, cy2 = (a[1] + bq[1] + apex[1]) / 3 + rh * .04, r = Math.min(Math.abs(bq[0] - a[0]) * .16, rh * .2);
      out.push({ t: "fill", d: circleD(cx2, cy2, r), fill: "gofun", outline: c.lw * .7 }, { t: "stroke", d: circleD(cx2, cy2, r * .62), color: "sumi", width: r * .22 }, { t: "fill", d: circleD(cx2, cy2, r * .22), fill: "sumi" });
    }
  }
  if (o.shachi) for (const [i, s2] of [[0, -1], [1, 1]] as const) {
    // Shachihoko: gold fish standing on their heads at the ridge ends, tails curled up and out.
    const base = ridge[i], fh = rh * .55, sx = s2;
    out.push({ t: "fill", d: smoothD([base, [base[0] - sx * fh * .28, base[1] - fh * .3], [base[0] - sx * fh * .14, base[1] - fh * .72], [base[0] + sx * fh * .3, base[1] - fh * 1.08], [base[0] + sx * fh * .2, base[1] - fh * .66], [base[0] + sx * fh * .24, base[1] - fh * .24]], true, .4), fill: "kin", outline: c.lw * .7 });
    out.push({ t: "stroke", d: [.35, .5, .65].map(t => `M${(base[0] - sx * fh * .12).toFixed(1)} ${(base[1] - fh * t).toFixed(1)}l${(sx * fh * .22).toFixed(1)} ${(-fh * .05).toFixed(1)}`).join(""), color: "kogecha", width: c.lw * .5, opacity: .7 });
    out.push({ t: "dots", d: circleD(base[0] - sx * fh * .04, base[1] - fh * .16, fh * .05), color: "sumi" });
  }
  if (c.snow > 0) {
    // Snow lies on the upper slope, its lower edge ragged where the tile rows break it, and caps the ridge and the
    // onigawara (Hiroshige's and Hokusai's snow scenes: thick rounded white on every ridge).
    const lo: Pt[] = [];
    for (let i = 0; i <= 16; i++) {
      const u = i / 16, a2 = lerp(lerp(ridge[0][0], L[0], .4 * c.snow), lerp(ridge[1][0], R[0], .4 * c.snow), u);
      lo.push([a2, lerp(lerp(ridge[0][1], L[1], .4 * c.snow), lerp(ridge[1][1], R[1], .4 * c.snow), u) + Math.sin(i * 2.3 + seed) * rh * .025]);
    }
    out.push({ t: "fill", d: smoothD([[ridge[0][0], ridge[0][1] - rh * .04], [ridge[1][0], ridge[1][1] - rh * .04], ...lo.reverse()], true, .3), fill: "gofun", opacity: .94 });
    out.push({ t: "line", d: carvedLine(ridgeTop.map(q => [q[0], q[1] - rh * .03] as Pt), rh * .09 * c.snow, { taper: "both", smooth: true }), color: "gofun" });
    if (!o.shachi) for (const [q, sx] of [[ridgeTop[0], -1], [ridgeTop[3], 1]] as const) {
      const og = o.heavy ? 1.15 : 1, oh = rh * .3 * og, ow = rh * .15 * og, top = q[1] + rb + up * .5 - oh * 1.03;
      out.push({ t: "fill", d: ellipseD(q[0] + sx * ow * .5, top, ow * .75, rh * .025 + rh * .02 * c.snow), fill: "gofun" });
    }
    out.push({ t: "line", d: carvedLine(eave.map(q => [q[0], q[1] - rh * .05] as Pt), rh * .09 * c.snow, { taper: "both", smooth: true }), color: "gofun" });
  }
  return out;
}

/** A tower: `tiers` storeys stacked from `y0`, each narrower, each under its roof (the next rising out of it). */
function tower(cx: number, y0: number, w: number, hs: number, tiers: number, c: Ctx, keep: boolean, d: number): { prims: Prim[]; top: number } {
  const out: Prim[] = [], fronts: Prim[] = [];
  let y = y0, wi = w;
  for (let i = 0; i < tiers; i++) {
    const top = i === tiers - 1, h = hs * (top ? .9 : i === 0 ? 1.05 : .78), sd = wi * d, box: Box = { x0: cx - (wi + sd) / 2, w: wi, y0: y, h, sd, sk: sd * .4 };
    out.push(...storey(box, c));
    const kara = keep && !top && i === Math.max(1, tiers - 2), g = keep ? (i === 0 ? 2 : top || kara ? 0 : 1) : (top ? 1 : 0);
    // Gables stand forward of the storey above, so they are drawn after the whole tower.
    out.push(...roof(box, hs * (top ? 1.05 : .82), c, { gables: g, kara, shachi: top && keep, top, sori: .35 }, fronts));
    y -= h + hs * (top ? 0 : .42);
    wi *= keep ? .82 : .76;
  }
  return { prims: [...out, ...fronts], top: y };
}

/** A small umbrella pine behind the wall: a leaning trunk and flat pads of needles, darker beneath. */
export function pine(x: number, y: number, h: number, c: Ctx, i: number): Prim[] {
  const lean = (hash01(c.seed, i, 41) - .5) * h * .5, top: Pt = [x + lean, y - h], out: Prim[] = [];
  out.push({ t: "fill", d: carvedLine([[x, y], [x + lean * .4, y - h * .5], top], h * .07, { taper: "end", minRatio: .5, smooth: true }), fill: "kogecha", outline: c.lw * .7 });
  for (let k = 0; k < 3; k++) {
    const cx = top[0] + (k - 1) * h * .32 + (hash01(c.seed, i, k, 42) - .5) * h * .1, cy = top[1] + k % 2 * h * .12 - (k === 1 ? h * .08 : 0), rx = h * (.26 + .08 * hash01(c.seed, i, k, 43)), ry = h * .1;
    out.push({ t: "fill", d: ellipseD(cx, cy, rx, ry), fill: "matsu", outline: c.lw * .7 }, { t: "fill", d: ellipseD(cx, cy + ry * .4, rx * .85, ry * .5), fill: "sumi", opacity: .25, noPrint: true });
  }
  return out;
}

// ---- The castle --------------------------------------------------------------------------------------------------------------------

export function castle(p: P, ctx: { seed: number }): Prim[] {
  const W = num(p, "width", 960), tiers = clamp(Math.round(num(p, "tiers", 5)), 1, 6), style = str(p, "style", "white") === "black" ? "black" : "white";
  const c: Ctx = { seed: ctx.seed, lw: Math.max(1, W * .0016), style, snow: clamp01(num(p, "snow", 0)), night: clamp01(num(p, "night", 0)), plaster: paint(p, "plaster", "gofun") };
  const walls = bool(p, "walls", true), moat = bool(p, "moat", walls), bridge = bool(p, "bridge", walls && moat), gate = bool(p, "gate", walls), turrets = bool(p, "turrets", walls);
  const out: Prim[] = [];
  // Proportions from the photographs: the outer stone wall about a seventh of the width tall, the keep's own base a
  // little taller and set back, its storeys about a twelfth of the width each.
  const wallH = W * .13, dobei = W * .04, keepW = W * .3, hs = W * .058, baseH = W * .14, d = clamp(num(p, "depth", .4), 0, .8);
  const keepFoot = walls ? -wallH - W * .05 : 0;
  // The keep, behind, on its own stone base.
  const kw = keepW * 1.25, ksd = kw * d * .6;
  out.push(...ishigaki(-(kw + ksd) / 2, (kw - ksd) / 2, keepFoot, baseH, c, .1, d * .6));
  out.push(...tower(-ksd * .1, keepFoot - baseH + baseH * .0, keepW, hs, tiers, c, true, d).prims);
  const wallOut: Prim[] = [];
  if (walls) {
    // Pines along the bailey behind the wall, as Hiroshige crowns his castle walls.
    const nP = clamp(Math.round(num(p, "pines", 5)), 0, 12);
    for (let i = 0; i < nP; i++) out.push(...pine(lerp(-W * .42, W * .42, nP > 1 ? i / (nP - 1) : .5) + W * .03 * (hash01(c.seed, i, 31) - .5), -wallH - dobei * .4, W * (.15 + .05 * hash01(c.seed, i, 32)), c, i));
    // The outer wall: stone, then on top either a long gallery building (tamon, as on Edo castle's walls) or a plastered
    // wall with its tiled coping and loopholes (dobei), broken by the gateway.
    const gw = W * .12, gx = 0, segs: [number, number][] = gate ? [[-W / 2, gx - gw / 2], [gx + gw / 2, W / 2]] : [[-W / 2, W / 2]], tamon = str(p, "wall", "tamon") !== "dobei";
    for (const [a, b] of segs) {
      wallOut.push(...ishigaki(a, b, 0, wallH, c, .04));
      const top = -wallH, inset = (b - a) * .04;
      if (tamon) {
        const box: Box = { x0: a + inset, w: b - a - inset * 2, y0: top, h: W * .05, sd: 0, sk: 0 };
        wallOut.push(...storey(box, c), ...roof(box, W * .034, c, { long: true }));
        continue;
      }
      wallOut.push({ t: "fill", d: rectD(a + inset, top - dobei, b - a - inset * 2, dobei), fill: c.plaster, outline: c.lw, grain: .4 });
      if (c.style === "black") wallOut.push({ t: "fill", d: rectD(a + inset, top - dobei * .55, b - a - inset * 2, dobei * .55), fill: BOARD, outline: c.lw * .7 });
      const loops: string[] = [];
      for (let x = a + inset + dobei; x < b - inset - dobei; x += dobei * 1.4) loops.push((Math.round(x) % 3 === 0) ? circleD(x, top - dobei * .45, dobei * .1) : rectD(x - dobei * .1, top - dobei * .56, dobei * .2, dobei * .22));
      wallOut.push({ t: "fill", d: loops.join(""), fill: "sumi" });
      wallOut.push({ t: "fill", d: smoothD([[a + inset - dobei * .3, top - dobei], [b - inset + dobei * .3, top - dobei], [b - inset, top - dobei * 1.45], [a + inset, top - dobei * 1.45]], true, .1), fill: TILE, outline: c.lw });
      if (c.snow > 0) wallOut.push({ t: "line", d: carvedLine([[a + inset, top - dobei * 1.47], [b - inset, top - dobei * 1.47]], dobei * .18 * c.snow, { taper: "both" }), color: "gofun" });
    }
    // Corner turrets on the wall's ends.
    if (turrets) for (const s of [-1, 1]) {
      const tx = s * (W / 2 - W * .07), tw = W * .1, foot = -wallH;
      wallOut.push(...tower(tx, foot, tw, hs * .95, 2, c, false, d * .8).prims);
    }
    // The gate tower straddling the gateway: dark doors in the passage below, a plastered room and its roof above.
    if (gate) {
      const gwid = gw * 1.5, gy = -wallH;
      wallOut.push({ t: "fill", d: rectD(gx - gw / 2, -wallH, gw, wallH), fill: { type: "linear", angle: 90, stops: [[0, "sumi", 1], [1, "kogecha", 1]] }, outline: c.lw });
      for (const s of [-1, 1]) {
        wallOut.push({ t: "fill", d: rectD(gx + (s < 0 ? -gw * .46 : gw * .02), -wallH * .78, gw * .44, wallH * .78), fill: BOARD, outline: c.lw * .8 });
        wallOut.push({ t: "dots", d: Array.from({ length: 12 }, (_, i) => circleD(gx + s * gw * (.08 + .3 * ((i % 3) / 2)), -wallH * (.1 + .2 * Math.floor(i / 3)), c.lw * 1.4)).join(""), color: "kin" });
      }
      const gbox: Box = { x0: gx - gwid / 2, w: gwid, y0: gy, h: hs * .9, sd: 0, sk: 0 };
      wallOut.push(...storey(gbox, c));
      const gf: Prim[] = [];
      wallOut.push(...roof(gbox, hs * .55, c, { gables: 1, top: true }, gf), ...gf);
    }
    out.push(...wallOut);
  }
  if (moat) {
    // The moat: water in front of the wall's foot, ripples, the wall's darker reflection.
    const mh = W * .1, mw = W * 1.15;
    out.push({ t: "fill", d: rectD(-mw / 2, 0, mw, mh), fill: { type: "linear", angle: 90, stops: [[0, "ai", 1], [1, "sora", 1]] }, grain: .5 });
    // The walls mirrored in the still water, fading with depth.
    if (wallOut.length) out.push({ t: "clip", d: rectD(-mw / 2, 0, mw, mh), key: "moat", prims: [{ t: "group", transform: "scale(1 -0.62)", opacity: .5, prims: wallOut }] });
    out.push({ t: "fill", d: rectD(-mw / 2, 0, mw, mh), fill: { type: "linear", angle: 90, stops: [[0, "ai", .12], [1, "sora", .6]] }, noPrint: true });
    const rip: string[] = [];
    for (let i = 0; i < 26; i++) { const x = -mw / 2 + mw * hash01(c.seed, i, 21), y = mh * (.2 + .75 * hash01(c.seed, i, 22)), l = W * (.03 + .05 * hash01(c.seed, i, 23)); rip.push(`M${x.toFixed(1)} ${y.toFixed(1)}l${l.toFixed(1)} 0`); }
    out.push({ t: "stroke", d: rip.join(""), color: "gofun", width: c.lw * .8, opacity: .45 });
    out.push({ t: "line", d: carvedLine([[-mw / 2, 0], [mw / 2, 0]], c.lw * 1.2, { taper: "none" }), color: "sumi", opacity: .6 });
    if (bridge && gate) {
      // The bridge comes toward us from the gate: its deck widening, planks, rails and posts on both sides.
      const gw = W * .12, near = gw * 1.7, deck = smoothD([[-gw * .45, 0], [gw * .45, 0], [near / 2, mh], [-near / 2, mh]], true, 0);
      out.push({ t: "fill", d: deck, fill: { type: "linear", angle: 90, stops: [[0, "kincha", 1], [1, "cha", 1]] }, outline: c.lw, grain: .8 });
      out.push({ t: "stroke", d: Array.from({ length: 7 }, (_, i) => { const t = (i + 1) / 8, hw = lerp(gw * .45, near / 2, t); return `M${(-hw).toFixed(1)} ${(mh * t).toFixed(1)}L${hw.toFixed(1)} ${(mh * t).toFixed(1)}`; }).join(""), color: "kogecha", width: c.lw * .6, opacity: .6 });
      for (const s of [-1, 1]) {
        const a: Pt = [s * gw * .45, -mh * .06], b: Pt = [s * near / 2, mh - mh * .2];
        out.push({ t: "line", d: carvedLine([a, b], c.lw * 2.2, { taper: "none" }), color: "kogecha" });
        out.push({ t: "stroke", d: [0, .33, .66, 1].map(t => { const x = lerp(a[0], b[0], t), y = lerp(a[1], b[1], t); return `M${x.toFixed(1)} ${y.toFixed(1)}l0 ${(mh * (.12 + .1 * t)).toFixed(1)}`; }).join(""), color: "kogecha", width: c.lw * 1.6 });
      }
    }
  }
  return out;
}

export const CASTLE_MOTIFS = { castle } as const;
