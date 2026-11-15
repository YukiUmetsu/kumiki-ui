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

interface Ctx { seed: number; lw: number; style: "white" | "black"; snow: number; night: number; plaster: UkiyoePaint }

// ---- Stone base ---------------------------------------------------------------------------------------------------------------------

/**
 * A stone base from `x0` to `x1` at its foot (`yb`), `h` tall, seen a little from the side (`d` × width of receding
 * face): its faces curve in toward the top — shallow at the foot, steep at the top, like an opened fan — stones laid in
 * irregular courses that shrink toward the top, long-and-short blocks up the corners; the side face is in shadow.
 */
function ishigaki(x0: number, x1: number, yb: number, h: number, c: Ctx, inset = .14, d = 0): Prim[] {
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
interface Box { x0: number; w: number; y0: number; h: number; sd: number; sk: number }

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
function storey(b: Box, c: Ctx): Prim[] {
  const { x0, w, y0, h, sd, sk } = b, out: Prim[] = [], x1 = x0 + w;
  const side = smoothD([[x1, y0], [x1 + sd, y0 - sk], [x1 + sd, y0 - sk - h], [x1, y0 - h]], true, 0);
  const front = rectD(x0, y0 - h, w, h);
  if (sd > 0) out.push({ t: "fill", d: side, fill: c.plaster, outline: c.lw, grain: .4 }, { t: "fill", d: side, fill: "usuzumi", opacity: .35, noPrint: true });
  out.push({ t: "fill", d: front, fill: c.plaster, outline: c.lw, grain: .4 });
  if (c.style === "black") {
    out.push({ t: "fill", d: rectD(x0, y0 - h * .62, w, h * .62), fill: BOARD, outline: c.lw * .8 });
    if (sd > 0) out.push({ t: "fill", d: smoothD([[x1, y0], [x1 + sd, y0 - sk], [x1 + sd, y0 - sk - h * .62], [x1, y0 - h * .62]], true, 0), fill: BOARD, outline: c.lw * .8 });
  }
  out.push(...windows([x0, y0], [x1, y0], h, Math.max(1, Math.round(w / (h * .8))), c));
  if (sd > h * .4) out.push(...windows([x1, y0], [x1 + sd, y0 - sk], h, Math.max(1, Math.round(sd / (h * .9))), c, .4));
  return out;
}

/**
 * A hipped tiled roof over a box, seen a little from the side: deep eaves turning up at the corners, the front face up
 * to a short ridge, the side face in shadow, tile rows down both; chidori gables or a curved karahafu on the front; gold
 * shachihoko on the ridge ends; snow on the ridge and along the eaves.
 */
function roof(b: Box, rh: number, c: Ctx, o: { gables?: number; kara?: boolean; shachi?: boolean; top?: boolean; long?: boolean } = {}, front: Prim[] = []): Prim[] {
  const out: Prim[] = [], { x0, w, sd, sk } = b, yE = b.y0 - b.h, ov = w * .2, lift = rh * .38;
  const L: Pt = [x0 - ov, yE + rh * .04], R: Pt = [x0 + w + ov * .7, yE + rh * .04], B: Pt = [x0 + w + sd + ov * .6, yE - sk + rh * .02];
  const rw = o.long ? w * .94 : o.top ? w * .34 : w * .55, rx0 = x0 + (w - rw) / 2 + sd * .45, ridge: [Pt, Pt] = [[rx0, yE - rh - sk * .45], [rx0 + rw, yE - rh - sk * .45]];
  // The front eave sags a little between corners that turn up.
  const eave: Pt[] = [];
  for (let i = 0; i <= 12; i++) { const u = i / 12, e = Math.abs(u * 2 - 1); eave.push([lerp(L[0], R[0], u), lerp(L[1], R[1], u) - lift * e ** 6 + rh * .05 * (1 - e * e)]); }
  // The side eave starts from the front eave's upturned corner, so the two meet without a notch.
  const sideEave: Pt[] = [], Rt = eave[12];
  for (let i = 0; i <= 6; i++) { const u = i / 6; sideEave.push([lerp(Rt[0], B[0], u), lerp(Rt[1], B[1] - lift, u) + lift * (1 - Math.abs(u * 2 - 1) ** 2) * .55]); }
  const faceD = smoothD([...eave, ridge[1], ridge[0]], true, .12), side = smoothD([...sideEave, ridge[1]], true, .12);
  if (sd > 0) out.push({ t: "fill", d: side, fill: TILE, outline: c.lw, grain: .5 }, { t: "fill", d: side, fill: "sumi", opacity: .3, noPrint: true });
  out.push({ t: "fill", d: faceD, fill: TILE, outline: c.lw, grain: .5 });
  const rows: string[] = [];
  for (let i = 1; i < 18; i++) { const u = i / 18, top = lerp(ridge[0][0], ridge[1][0], u), e = eave[Math.round(u * 12)]; rows.push(`M${top.toFixed(1)} ${ridge[0][1].toFixed(1)}L${e[0].toFixed(1)} ${(e[1] - rh * .05).toFixed(1)}`); }
  out.push({ t: "clip", d: faceD, key: "rooftiles", prims: [{ t: "stroke", d: rows.join(""), color: "usuzumi", width: c.lw * .45, opacity: .5 }] });
  // The pale eave fascia, the hip line, the ridge with its end tiles.
  out.push({ t: "line", d: carvedLine(eave.map(q => [q[0], q[1] + rh * .06] as Pt), rh * .07, { taper: "none", smooth: true }), color: c.plaster, opacity: .95 });
  if (sd > 0) out.push({ t: "line", d: carvedLine(sideEave.map(q => [q[0], q[1] + rh * .06] as Pt), rh * .06, { taper: "none", smooth: true }), color: c.plaster, opacity: .7 });
  out.push({ t: "line", d: carvedLine([Rt, ridge[1]], rh * .06, { taper: "start" }), color: "sumi" });
  out.push({ t: "line", d: carvedLine([eave[0], ridge[0]], rh * .05, { taper: "start" }), color: "sumi", opacity: .8 });
  out.push({ t: "line", d: carvedLine([[ridge[0][0] - rh * .05, ridge[0][1]], [ridge[1][0] + rh * .05, ridge[1][1]]], rh * .11, { taper: "none" }), color: "sumi" });
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
    const a = sideEave[1], bq = sideEave[5], apex: Pt = [ridge[1][0] + rh * .05, ridge[1][1] + rh * .12];
    out.push({ t: "fill", d: smoothD([a, apex, bq], true, 0), fill: c.plaster, outline: c.lw }, { t: "fill", d: smoothD([a, apex, bq], true, 0), fill: "usuzumi", opacity: .3, noPrint: true });
    out.push({ t: "line", d: carvedLine([[a[0] - rh * .05, a[1] + rh * .04], apex, [bq[0] + rh * .05, bq[1] + rh * .04]], rh * .1, { taper: "none" }), color: "sumi" });
    out.push({ t: "fill", d: smoothD([[apex[0] - rh * .07, apex[1] + rh * .08], [apex[0] + rh * .07, apex[1] + rh * .06], [apex[0] + rh * .01, apex[1] + rh * .24]], true, .2), fill: "kin", outline: c.lw * .5 });
  }
  if (o.shachi) for (const [i, s2] of [[0, -1], [1, 1]] as const) {
    // Shachihoko: gold fish standing on their heads at the ridge ends, tails curled up and out.
    const base = ridge[i], fh = rh * .55, sx = s2;
    out.push({ t: "fill", d: smoothD([base, [base[0] - sx * fh * .28, base[1] - fh * .3], [base[0] - sx * fh * .14, base[1] - fh * .72], [base[0] + sx * fh * .3, base[1] - fh * 1.08], [base[0] + sx * fh * .2, base[1] - fh * .66], [base[0] + sx * fh * .24, base[1] - fh * .24]], true, .4), fill: "kin", outline: c.lw * .7 });
    out.push({ t: "stroke", d: [.35, .5, .65].map(t => `M${(base[0] - sx * fh * .12).toFixed(1)} ${(base[1] - fh * t).toFixed(1)}l${(sx * fh * .22).toFixed(1)} ${(-fh * .05).toFixed(1)}`).join(""), color: "kogecha", width: c.lw * .5, opacity: .7 });
    out.push({ t: "dots", d: circleD(base[0] - sx * fh * .04, base[1] - fh * .16, fh * .05), color: "sumi" });
  }
  if (c.snow > 0) {
    out.push({ t: "fill", d: smoothD([[ridge[0][0], ridge[0][1] - rh * .06], [ridge[1][0], ridge[1][1] - rh * .06], [lerp(ridge[1][0], R[0], .4 * c.snow), lerp(ridge[1][1], R[1], .4 * c.snow)], [lerp(ridge[0][0], L[0], .4 * c.snow), lerp(ridge[0][1], L[1], .4 * c.snow)]], true, .3), fill: "gofun", opacity: .93 });
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
    out.push(...roof(box, hs * (top ? 1.05 : .82), c, { gables: g, kara, shachi: top && keep, top }, fronts));
    y -= h + hs * (top ? 0 : .42);
    wi *= keep ? .82 : .76;
  }
  return { prims: [...out, ...fronts], top: y };
}

/** A small umbrella pine behind the wall: a leaning trunk and flat pads of needles, darker beneath. */
function pine(x: number, y: number, h: number, c: Ctx, i: number): Prim[] {
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
