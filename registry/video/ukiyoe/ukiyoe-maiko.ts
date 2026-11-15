/**
 * UKIYO1 maiko dress, after Meiji and later photographs of Kyoto's apprentice dancers and Kuroda Seiki's maiko studies:
 * the parts the figure rig asks for when a look sets `hair: "wareshinobu"`, `obiTie: "darari"`, `feet: "okobo"` or
 * `prop: "maiogi"`, in each view (profile, three-quarter, front, back).
 *
 * - Wareshinobu: the apprentice's "split" bun, its two lobes parted over a band of red tie-dyed silk (kanoko), a small
 *   pompadour and full side-wings, a bun at the nape, and the hana-kanzashi (a cluster of silk flowers at the temple with
 *   strands of tiny flowers, the bira, that swing as she moves), with a silver pin at the back.
 * - The darari obi: tied high, its knot a folded loop at the shoulder blades and its two long ends hanging nearly to the
 *   hem, each weighted at the tip with a woven crest; they swing behind her with every step and turn. In front, the
 *   red obiage above the obi and the jewelled clasp (pocchiri) on the cord.
 * - Okobo: tall wooden clogs with the toe cut away in a slope and a red thong, on which she takes small steps.
 * - The eri-ashi: from behind, the white make-up of the nape stops in two points, the bare skin showing between them.
 * - The maiōgi: the dancer's large folding fan, gold-leafed with a red border.
 */
import type { Pt } from "./ukiyoe-core";
import { add, carvedLine, DEG, lerp, polar, quad, smoothD } from "./ukiyoe-core";
import type { Prim } from "./ukiyoe-prims";
import { circleD, ellipseD } from "./ukiyoe-prims";
import type { UkiyoeFill, UkiyoePaint } from "./ukiyoe-pigments";
import type { UkiyoeFigureLook } from "./ukiyoe-figure";

export const OKOBO_HEIGHT = .06;
const WOOD: UkiyoeFill = { type: "linear", angle: 90, stops: [[0, "ki", 1], [.6, "kincha", 1], [1, "cha", 1]] };
const KANOKO = { type: "kanoko" as const, color: "gofun" as const, scale: .22, opacity: .9 };

type Scale = (x: number, y: number) => Pt;

/** A five-petalled silk flower (plum or cherry) with a gold centre. */
function blossom(c: Pt, r: number, color: UkiyoePaint, lw: number, turn = 0): Prim[] {
  const petals = [0, 72, 144, 216, 288].map(a => ellipseD(...polar(c, a + turn - 90, r * .55), r * .48, r * .48)).join("");
  return [{ t: "fill", d: petals, fill: color, outline: lw * .5 }, { t: "dots", d: circleD(c[0], c[1], r * .28), color: "kin" }];
}

/**
 * The hana-kanzashi: a cluster of flowers and leaves at `c`, and strands of tiny flowers (bira) hanging from it, swung
 * `sway` (in units of `r`) by her motion and the wind.
 */
export function hanaKanzashi(c: Pt, r: number, colors: readonly UkiyoePaint[], lw: number, sway: number, strands = 4): Prim[] {
  const out: Prim[] = [];
  for (const [dx, dy, a] of [[-1.3, .6, -30], [1.2, .9, 40], [0, -1.1, 0]] as const) out.push({ t: "fill", d: smoothD([add(c, [dx * r * .5, dy * r * .5]), polar(add(c, [dx * r * .5, dy * r * .5]), a - 60, r * 1.4), polar(add(c, [dx * r * .5, dy * r * .5]), a - 90, r * 2.1), polar(add(c, [dx * r * .5, dy * r * .5]), a - 120, r * 1.4)], true, .5), fill: "matsu", outline: lw * .5 });
  // Strands first, so the cluster sits over their tops.
  for (let i = 0; i < strands; i++) {
    const x0 = c[0] + (i - (strands - 1) / 2) * r * .55, top: Pt = [x0, c[1] + r * .6], len = r * (4.2 + (i % 2) * 1.4), bot: Pt = [x0 + sway * r * (1 + i * .15), top[1] + len];
    out.push({ t: "line", d: carvedLine(quad(top, [lerp(top[0], bot[0], .3), lerp(top[1], bot[1], .5)], bot, 6), Math.max(.4, r * .08), { taper: "none", smooth: true }), color: "kin", opacity: .9 });
    for (let j = 1; j <= 4; j++) { const u = j / 4.4, q: Pt = [lerp(top[0], bot[0], u * u), lerp(top[1], bot[1], u)]; out.push(...blossom(q, r * .36, colors[(i + j) % colors.length], lw * .6, j * 20)); }
  }
  const spots: [number, number, number][] = [[0, 0, 1], [-1, -.6, .8], [1, -.5, .85], [-.8, .7, .75], [.9, .6, .8], [0, -1.2, .7], [.1, 1, .7]];
  spots.forEach(([dx, dy, s], i) => out.push(...blossom([c[0] + dx * r, c[1] + dy * r], r * s, colors[i % colors.length], lw, i * 13)));
  return out;
}

/** A silver bira-kanzashi: a pin with a fan-shaped head and dangling silver strips. */
function silverPin(from: Pt, to: Pt, w: number, sway: number): Prim[] {
  const a = Math.atan2(to[1] - from[1], to[0] - from[0]) / DEG, out: Prim[] = [
    { t: "line", d: carvedLine([from, to], w * 1.5, { taper: "start", minRatio: .5 }), color: "sumi", opacity: .8 },
    { t: "line", d: carvedLine([from, to], w, { taper: "start", minRatio: .5 }), color: "gofun" },
    { t: "fill", d: smoothD([to, polar(to, a - 40, w * 6), polar(to, a, w * 7), polar(to, a + 40, w * 6)], true, .3), fill: { type: "linear", angle: 0, stops: [[0, "gofun", 1], [1, "usuzumi", 1]] }, outline: w * .5 },
  ];
  const strips: string[] = [];
  for (let i = -2; i <= 2; i++) { const s = polar(to, a + i * 16, w * 6); strips.push(`M${s[0].toFixed(1)} ${s[1].toFixed(1)}l${(sway * w * 2).toFixed(1)} ${(w * 9).toFixed(1)}`); }
  out.push({ t: "stroke", d: strips.join(""), color: "usuzumi", width: Math.max(.4, w * .4), opacity: .9 });
  return out;
}

// ---- Wareshinobu -----------------------------------------------------------------------------------------------------------------

/** The wareshinobu in profile or three-quarter (head unit box, facing right, ±20 ≈ head height). */
export function wareshinobuSide(P: Scale, k: number, lw: number, hairC: UkiyoePaint, look: UkiyoeFigureLook, tq: boolean, sway: number): { behind: Prim[]; over: Prim[] } {
  const behind: Prim[] = [], over: Prim[] = [], kan = look.accent ?? "beni";
  // The nape bun, pointed a little downward, and the split bun on the crown with its red silk.
  behind.push({ t: "fill", d: smoothD([P(-9, 1), P(-19, 3), P(-24, 10), P(-20, 18), P(-11, 18), P(-6, 12)], true, .45), fill: hairC, outline: lw });
  over.push({ t: "fill", d: smoothD([P(-1, -21.5), P(8, -21.5), P(14.5, -18.5), P(17.5, -14), P(15.5, -11), P(11, -11.5), P(6, -11), P(2.5, -7), P(2, 0), P(-1, 5), P(-7, 9), P(-14, 6), P(-17.5, -4), P(-14, -15)], true, .4), fill: hairC, outline: lw });
  // The side-wing: a full, solid puff from the temple back over the ear.
  over.push({ t: "fill", d: smoothD([P(2.5, -10), P(-6, -14), P(-16, -9), P(-19, 0), P(-15, 8), P(-6, 9), P(0, 3), P(2, -4)], true, .4), fill: hairC, outline: lw * .8 });
  over.push({ t: "stroke", d: [0, 1, 2, 3].map(i => smoothD(quad(P(1.5, -8 + i * 3.5), P(-9, -11 + i * 4.5), P(-16, -6 + i * 4), 6), false, .4)).join(""), color: "usuzumi", width: Math.max(.4, k * .3), opacity: .55 });
  // Split bun: two lobes on the crown, the red kanoko silk showing between them.
  over.push({ t: "fill", d: smoothD([P(-6, -19), P(-8, -28), P(-1, -32), P(5, -28), P(4, -20)], true, .45), fill: hairC, outline: lw });
  over.push({ t: "fill", d: smoothD([P(-18, -14), P(-24, -22), P(-19, -30), P(-11, -29), P(-9, -20)], true, .45), fill: hairC, outline: lw });
  over.push({ t: "fill", d: smoothD([P(-10, -20), P(-11, -28.5), P(-7.5, -29.5), P(-6, -20)], true, .4), fill: kan, outline: lw * .6, pattern: KANOKO });
  over.push({ t: "stroke", d: smoothD(quad(P(-3, -29), P(1, -26), P(2, -21), 5), false, .4) + smoothD(quad(P(-20, -27), P(-21, -22), P(-17, -16), 5), false, .4), color: "usuzumi", width: Math.max(.4, k * .3), opacity: .55 });
  // A silver pin at the back of the bun, the flowers at the front of it, falling toward the temple.
  over.push(...silverPin(P(-14, -24), P(-26, -33), k * .8 + .2, sway));
  over.push(...hanaKanzashi(P(tq ? 7 : 6, -22), 3.4 * k, ["sakura", "beni", "gofun", "shu"], lw * .8, sway, 4));
  return { behind, over };
}

/** The wareshinobu square on, from the front or from behind (unit = head radius). */
export function wareshinobuSquare(r: number, lw: number, hairC: UkiyoePaint, look: UkiyoeFigureLook, back: boolean, sway: number): { behind: Prim[]; over: Prim[] } {
  const P = (x: number, y: number): Pt => [x * r, y * r], behind: Prim[] = [], over: Prim[] = [], kan = look.accent ?? "beni";
  // Full side-wings framing the face (behind it from the front).
  for (const s of [-1, 1]) behind.push({ t: "fill", d: smoothD([P(s * .7, -.8), P(s * 1.15, -.55), P(s * 1.3, .05), P(s * 1.12, .6), P(s * .82, .6), P(s * .86, -.2)], true, .45), fill: hairC, outline: lw });
  if (back) {
    over.push({ t: "fill", d: smoothD([P(-.95, -.4), P(-1.05, .35), P(-.6, .68), P(.6, .68), P(1.05, .35), P(.95, -.4), P(.62, -1.0), P(0, -1.14), P(-.62, -1.0)], true, .4), fill: hairC, outline: lw });
    over.push({ t: "fill", d: smoothD([P(-.55, .45), P(-.62, .85), P(0, 1.1), P(.62, .85), P(.55, .45), P(0, .55)], true, .45), fill: hairC, outline: lw });
    // Seen from behind the bun is split in two, the red silk showing down the middle.
    over.push({ t: "fill", d: smoothD([P(-.15, -1.0), P(-.85, -1.15), P(-.95, -1.65), P(-.5, -1.95), P(-.12, -1.75)], true, .45), fill: hairC, outline: lw });
    over.push({ t: "fill", d: smoothD([P(.15, -1.0), P(.85, -1.15), P(.95, -1.65), P(.5, -1.95), P(.12, -1.75)], true, .45), fill: hairC, outline: lw });
    over.push({ t: "fill", d: smoothD([P(-.16, -1.05), P(-.2, -1.8), P(0, -1.9), P(.2, -1.8), P(.16, -1.05)], true, .4), fill: kan, outline: lw * .6, pattern: KANOKO });
  } else {
    over.push({ t: "fill", d: smoothD([P(-.85, -.35), P(-.8, -.95), P(-.4, -1.25), P(0, -1.3), P(.4, -1.25), P(.8, -.95), P(.85, -.35), P(.72, -.55), P(.45, -.68), P(0, -.72), P(-.45, -.68), P(-.72, -.55)], true, .4), fill: hairC, outline: lw });
    over.push({ t: "fill", d: smoothD([P(-.85, -1.15), P(-.8, -1.75), P(0, -1.95), P(.8, -1.75), P(.85, -1.15), P(0, -1.25)], true, .45), fill: hairC, outline: lw });
    over.push({ t: "fill", d: smoothD([P(-.2, -1.68), P(0, -1.9), P(.2, -1.68), P(0, -1.55)], true, .4), fill: kan, outline: lw * .6, pattern: KANOKO });
  }
  over.push({ t: "stroke", d: [-.5, 0, .5].map(x => smoothD(quad(P(x * 1.3, -1.2), P(x * 1.1, -1.6), P(x * .4, -1.85), 6), false, .4)).join(""), color: "usuzumi", width: Math.max(.4, r * .02), opacity: .5 });
  // The flowers sit at her left temple: our right from the front, our left from behind; the silver pin opposite.
  const fs = back ? -1 : 1;
  over.push(...silverPin(P(-fs * .5, -1.6), P(-fs * 1.2, -2.15), r * .05 + .2, sway));
  over.push(...hanaKanzashi(P(fs * .8, -1.2), .26 * r, ["sakura", "beni", "gofun", "shu"], lw * .8, sway, 4));
  return { behind, over };
}

/** The eri-ashi: the white of the nape stops in two points, bare skin between them (head unit, from behind). */
export function eriAshi(r: number): Prim[] {
  const P = (x: number, y: number): Pt => [x * r, y * r];
  return [{ t: "fill", d: smoothD([P(-.3, .98), P(-.18, 1.55), P(-.08, 1.15), P(0, 1.02), P(.08, 1.15), P(.18, 1.55), P(.3, .98)], true, .2), fill: "hada", opacity: .95 }];
}

// ---- Darari obi ------------------------------------------------------------------------------------------------------------------

/** A woven crest at the tip of a darari end: a plum blossom in a ring. */
function crest(c: Pt, r: number, lw: number): Prim[] {
  return [{ t: "fill", d: ellipseD(c[0], c[1], r, r), fill: "gofun", outline: lw * .6 },
    { t: "fill", d: [0, 72, 144, 216, 288].map(a => ellipseD(...polar(c, a - 90, r * .42), r * .3, r * .3)).join(""), fill: "kin", outline: lw * .4 }];
}

/**
 * The darari obi in profile: the knot's folded loop standing out at the shoulder blades and the long ends hanging
 * against the back nearly to the hem, swinging away from her by `swing` (px) when she moves.
 */
export function darariSide(top: Pt, bottomY: number, H: number, lw: number, obiC: UkiyoePaint, patternC: UkiyoePaint, swing: number, wide: boolean): Prim[] {
  const out: Prim[] = [], w = H * (wide ? .07 : .045), pat = { type: "sakura" as const, color: patternC, scale: .4, opacity: .8 };
  for (const [dx, extra] of [[-.012, 0], [0, .03]] as const) {
    const a: Pt = [top[0] + H * dx, top[1] + H * .03], b: Pt = [top[0] + H * dx - swing - H * .015, bottomY - H * extra];
    const m: Pt = [lerp(a[0], b[0], .5) - swing * .25, lerp(a[1], b[1], .5)];
    out.push({ t: "fill", d: carvedLine([a, m, b], w, { taper: "none", smooth: true }), fill: obiC, outline: lw, pattern: pat, grain: .3 });
    out.push({ t: "line", d: carvedLine([add(a, [w * .35, 0]), add(m, [w * .35, 0]), add(b, [w * .35, 0])], lw * .8, { taper: "none", smooth: true }), color: patternC, opacity: .8 });
    if (wide) out.push(...crest(add(b, [0, -w * .7]), w * .3, lw));
  }
  // The folded loop of the knot, standing out from the back at the top.
  out.push({ t: "fill", d: smoothD([add(top, [H * .01, -H * .045]), add(top, [-H * .055, -H * .05]), add(top, [-H * .06, H * .03]), add(top, [H * .005, H * .035])], true, .3), fill: obiC, outline: lw, pattern: pat, grain: .3 });
  return out;
}

/** The darari obi from behind: the wide band, the knot's loop at the top and the two long ends side by side. */
export function darariBack(waistY: number, halfW: number, bottomY: number, H: number, lw: number, obiC: UkiyoePaint, patternC: UkiyoePaint, swing: number): Prim[] {
  const out: Prim[] = [], oh = H * .09, pat = { type: "sakura" as const, color: patternC, scale: .4, opacity: .8 };
  out.push({ t: "fill", d: smoothD([[-halfW, waistY - oh * .55], [halfW, waistY - oh * .55], [halfW * 1.02, waistY + oh * .45], [-halfW * 1.02, waistY + oh * .45]], true, .15), fill: obiC, outline: lw, pattern: pat, grain: .3 });
  const pw = H * .068;
  for (const [x, extra, s] of [[-pw * .52, .035, -1], [pw * .52, 0, 1]] as const) {
    const top: Pt = [x, waistY - oh * .3], bot: Pt = [x + swing * (1 + s * .15), bottomY - H * extra];
    const d = smoothD([[top[0] - pw / 2, top[1]], [top[0] + pw / 2, top[1]], [bot[0] + pw / 2, bot[1] - H * .01], [bot[0], bot[1] + H * .012], [bot[0] - pw / 2, bot[1] - H * .01]], true, .15);
    out.push({ t: "fill", d, fill: obiC, outline: lw, pattern: pat, grain: .3 });
    out.push({ t: "stroke", d: `M${(top[0] - pw * .38).toFixed(1)} ${top[1].toFixed(1)}L${(bot[0] - pw * .38).toFixed(1)} ${(bot[1] - H * .01).toFixed(1)}M${(top[0] + pw * .38).toFixed(1)} ${top[1].toFixed(1)}L${(bot[0] + pw * .38).toFixed(1)} ${(bot[1] - H * .01).toFixed(1)}`, color: patternC, width: lw * .8, opacity: .85 });
    out.push(...crest([bot[0], bot[1] - H * .045], pw * .26, lw));
  }
  // The knot: a folded loop across the top of the ends, a little wider than them.
  out.push({ t: "fill", d: smoothD([[-pw * 1.25, waistY - oh * .95], [pw * 1.25, waistY - oh * .95], [pw * 1.3, waistY + oh * .1], [-pw * 1.3, waistY + oh * .1]], true, .25), fill: obiC, outline: lw * 1.1, pattern: pat, grain: .3 });
  out.push({ t: "stroke", d: `M${(-pw * 1.1).toFixed(1)} ${(waistY - oh * .45).toFixed(1)}Q0 ${(waistY - oh * .2).toFixed(1)} ${(pw * 1.1).toFixed(1)} ${(waistY - oh * .45).toFixed(1)}`, color: "sumi", width: lw * .8, opacity: .5 });
  return out;
}

/** The front of a maiko's obi: the red obiage above it, the cord and the jewelled clasp (pocchiri). */
export function obiFront(waistY: number, halfW: number, H: number, lw: number, obiC: UkiyoePaint, patternC: UkiyoePaint, accent: UkiyoePaint): Prim[] {
  const oh = H * .09;
  return [
    { t: "fill", d: smoothD([[-halfW * .9, waistY - oh * .62], [halfW * .9, waistY - oh * .62], [halfW * .85, waistY - oh * .45], [-halfW * .85, waistY - oh * .45]], true, .3), fill: accent, outline: lw * .7, pattern: KANOKO },
    { t: "fill", d: smoothD([[-halfW, waistY - oh * .5], [halfW, waistY - oh * .5], [halfW * 1.02, waistY + oh * .5], [-halfW * 1.02, waistY + oh * .5]], true, .15), fill: obiC, outline: lw, pattern: { type: "sakura", color: patternC, scale: .4, opacity: .8 }, grain: .3 },
    { t: "line", d: carvedLine([[-halfW * .98, waistY + oh * .12], [halfW * .98, waistY + oh * .12]], H * .007, { taper: "none" }), color: accent },
    { t: "fill", d: ellipseD(0, waistY + oh * .12, H * .03, H * .021), fill: { type: "radial", center: [.4, .35], stops: [[0, "gofun", 1], [.35, "kin", 1], [1, "kincha", 1]] }, outline: lw * .8 },
    { t: "fill", d: ellipseD(0, waistY + oh * .12, H * .013, H * .01), fill: "matsu", outline: lw * .4 },
  ];
}

// ---- Okobo ------------------------------------------------------------------------------------------------------------------------

/** A tall wooden okobo from the side, the toe cut away in a slope: `heel` and `toe` are the sole's ends. */
export function okoboSide(heel: Pt, toe: Pt, gh: number, lw: number, far: boolean): Prim[] {
  const L = Math.hypot(toe[0] - heel[0], toe[1] - heel[1]) || 1, u: Pt = [(toe[0] - heel[0]) / L, (toe[1] - heel[1]) / L], n: Pt = [-u[1], u[0]];
  const sg = u[0] >= 0 ? 1 : -1, at = (t: number, d: number): Pt => [heel[0] + u[0] * L * t + n[0] * d * sg, heel[1] + u[1] * L * t + n[1] * d * sg];
  const block = [at(-.06, 0), at(1.08, 0), at(.8, gh), at(-.04, gh)];
  const out: Prim[] = [{ t: "fill", d: smoothD(block, true, .12), fill: WOOD, outline: lw, grain: .9 }];
  out.push({ t: "stroke", d: [.3, .6].map(f => { const a = at(-.04, gh * f), b = at(1.08 - .28 * f, gh * f); return `M${a[0].toFixed(1)} ${a[1].toFixed(1)}L${b[0].toFixed(1)} ${b[1].toFixed(1)}`; }).join(""), color: "cha", width: lw * .5, opacity: .5 });
  out.push({ t: "line", d: carvedLine([at(.82, 0), at(.62, -gh * .4), at(.35, 0)], Math.max(.8, gh * .11), { taper: "none", smooth: true }), color: "beni" });
  if (far) out.push({ t: "fill", d: smoothD(block, true, .12), fill: "sumi", opacity: .15, noPrint: true });
  return out;
}

/** The okobo square on: the wooden block under the foot, its sloped toe a lighter face from the front. */
export function okoboSquare(c: Pt, w: number, gh: number, lw: number, back: boolean): Prim[] {
  const out: Prim[] = [{ t: "fill", d: smoothD([[c[0] - w, c[1]], [c[0] + w, c[1]], [c[0] + w * .92, c[1] + gh], [c[0] - w * .92, c[1] + gh]], true, .15), fill: WOOD, outline: lw, grain: .9 }];
  if (!back) {
    out.push({ t: "fill", d: smoothD([[c[0] - w * .85, c[1] + gh * .45], [c[0] + w * .85, c[1] + gh * .45], [c[0] + w * .8, c[1] + gh * .95], [c[0] - w * .8, c[1] + gh * .95]], true, .2), fill: "ki", opacity: .7 });
    out.push({ t: "line", d: carvedLine([[c[0] - w * .75, c[1] + gh * .02], [c[0], c[1] - gh * .32], [c[0] + w * .75, c[1] + gh * .02]], Math.max(.8, gh * .11), { taper: "none" }), color: "beni" });
  }
  return out;
}

// ---- Maiōgi ------------------------------------------------------------------------------------------------------------------------

/**
 * The dance fan held at `hand`, its axis pointing at `axisDeg`: gold leaf, a red border, dark ribs. `open` 0..1 spreads
 * it from a closed slat (carried at rest) to a full 150° (dancing).
 */
export function maiogi(hand: Pt, axisDeg: number, R: number, lw: number, accent: UkiyoePaint, open = 1): Prim[] {
  const spread = 8 + 142 * open, outer: Pt[] = [], inner: Pt[] = [];
  for (let i = 0; i <= 12; i++) { const a = axisDeg - spread / 2 + spread * i / 12; outer.push(polar(hand, a, R)); inner.push(polar(hand, a, R * .38)); }
  const face = smoothD([...outer, ...[...inner].reverse()], true, .2), band: Pt[] = [], bandIn: Pt[] = [];
  for (let i = 0; i <= 12; i++) { const a = axisDeg - spread / 2 + spread * i / 12; band.push(polar(hand, a, R)); bandIn.push(polar(hand, a, R * .86)); }
  return [
    { t: "fill", d: face, fill: { type: "radial", center: [.5, .5], radius: .9, stops: [[0, "ki", 1], [.6, "kin", 1], [1, "kincha", 1]] }, outline: lw },
    { t: "fill", d: smoothD([...band, ...[...bandIn].reverse()], true, .2), fill: accent, opacity: .95 },
    { t: "stroke", d: outer.map((q, i) => { const s = inner[i]; return `M${s[0].toFixed(1)} ${s[1].toFixed(1)}L${q[0].toFixed(1)} ${q[1].toFixed(1)}`; }).join(""), color: "kogecha", width: Math.max(.4, lw * .45), opacity: .6 },
    { t: "stroke", d: inner.map(q => `M${hand[0].toFixed(1)} ${hand[1].toFixed(1)}L${q[0].toFixed(1)} ${q[1].toFixed(1)}`).join(""), color: "kogecha", width: Math.max(.5, lw * .6) },
    { t: "dots", d: circleD(hand[0], hand[1], Math.max(.8, R * .04)), color: "kin" },
  ];
}

/**
 * A maiko, dressed as in the photographs: white make-up with red lips, the wareshinobu with its flowers, a pale kimono
 * with long sleeves and a trailing hem over red under-layers and a red collar, the black-and-gold darari obi, okobo and
 * the dance fan. A generic look: restyle any field.
 */
export const UKIYOE_MAIKO_LOOK: UkiyoeFigureLook = {
  build: "slim", hair: "wareshinobu", skin: "gofun", lips: "beni", robe: "asagi", robePattern: { type: "sakura", color: "gofun", scale: .5, opacity: .85 },
  layers: ["beni"], under: "beni", obiTie: "darari", obi: "sumi", obiPattern: "kin", sleeves: "long", feet: "okobo", accent: "beni", prop: "maiogi",
};
