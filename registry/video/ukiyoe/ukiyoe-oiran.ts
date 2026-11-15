/**
 * UKIYO1 courtesan dress (oiran), drawn after the procession prints of Kiyonaga, Eishi, Shunchō and Eisen: the parts the
 * figure rig asks for when a look sets `hair: "hyogo" | "kamuro"`, `uchikake`, `obiTie: "front"`, `layers`,
 * `feet: "koma-geta"` or `prop: "parasol"`, in each view (profile, three-quarter, front, back).
 *
 * - The hyōgo hairstyle: a pompadour over the brow (maegami), translucent lantern side-wings (tōrōbin) with the comb lines
 *   showing, a bun at the nape (tabo), two great loops on top bound with a crêpe band, two tortoiseshell combs, a long
 *   kōgai bar through the loops and a fan of kanzashi pins radiating out on both sides, tipped with coral and gold.
 * - The uchikake: an unbelted over-robe worn open, its heavy padded hem (fuki) rolling on the ground and trailing behind,
 *   the lining showing at the edges, with large roundel motifs over its pattern.
 * - The mae-obi: the obi tied in front in a great padded bundle, its ends hanging to the knee.
 * - Kasane: the layered under-robes, each colour showing as a band at the collar and at the hem.
 * - Koma-geta: tall black-lacquered three-toothed clogs, worn bare-foot with a red thong.
 * - The kamuro bob for the child attendants, and the long-handled procession parasol (nagae-gasa) the manservant holds.
 */
import type { Pt } from "./ukiyoe-core";
import { add, carvedLine, DEG, lerp, polar, quad, smoothD } from "./ukiyoe-core";
import type { Prim, UkiyoePattern } from "./ukiyoe-prims";
import { circleD, ellipseD } from "./ukiyoe-prims";
import type { UkiyoeFill, UkiyoePaint } from "./ukiyoe-pigments";
import type { UkiyoeAction, UkiyoeFigureLook } from "./ukiyoe-figure";
import type { UkiyoeFigureNode } from "./ukiyoe-scene";

/** Tortoiseshell (bekkō): warm amber with darker clouding. */
export const BEKKO: UkiyoeFill = { type: "linear", angle: 35, stops: [[0, "kincha", 1], [.35, "cha", 1], [.6, "kincha", 1], [.85, "kogecha", 1], [1, "cha", 1]] };
/** Black lacquer with a soft sheen. */
const LACQUER: UkiyoeFill = { type: "linear", angle: 0, stops: [[0, "sumi", 1], [.45, "kogecha", 1], [1, "sumi", 1]] };
export const KOMA_GETA_HEIGHT = .075;

type Scale = (x: number, y: number) => Pt;

/** A closed band drawn around an ellipse (a hair loop): an outer fill with the paper showing through the middle. */
function loopBand(c: Pt, rx: number, ry: number, rot: number, w: number, color: UkiyoePaint, lw: number): Prim[] {
  const pts: Pt[] = [];
  for (let i = 0; i <= 24; i++) {
    const a = i / 24 * Math.PI * 2, x = Math.cos(a) * rx, y = Math.sin(a) * ry;
    pts.push([c[0] + x * Math.cos(rot * DEG) - y * Math.sin(rot * DEG), c[1] + x * Math.sin(rot * DEG) + y * Math.cos(rot * DEG)]);
  }
  const ring = carvedLine(pts, w, { taper: "none", smooth: true });
  return [{ t: "fill", d: ring, fill: color, outline: lw }];
}

/** A hairpin: a lacquered shaft with an outline, and its head (a coral bead, a gold knob or a tortoiseshell blade). */
function pin(from: Pt, to: Pt, w: number, kind: number, accent: UkiyoePaint): Prim[] {
  const out: Prim[] = [
    { t: "line", d: carvedLine([from, to], w * 1.7, { taper: "start", minRatio: .5 }), color: "sumi", opacity: .85 },
    { t: "line", d: carvedLine([from, to], w, { taper: "start", minRatio: .5 }), color: "kincha" },
  ];
  const a = Math.atan2(to[1] - from[1], to[0] - from[0]) / DEG;
  if (kind % 3 === 0) out.push({ t: "fill", d: ellipseD(to[0], to[1], w * 1.9, w * 1.9), fill: { type: "radial", center: [.35, .35], stops: [[0, "sakura", 1], [.5, accent, 1], [1, accent, 1]] }, outline: w * .5 });
  else if (kind % 3 === 1) out.push({ t: "fill", d: smoothD([polar(to, a + 90, w * 1.2), polar(to, a, w * 3.2), polar(to, a - 90, w * 1.2), polar(to, a + 180, w * .6)], true, .4), fill: "kin", outline: w * .5 });
  else out.push({ t: "fill", d: smoothD([polar(to, a + 100, w * 1.6), polar(polar(to, a, w * 2.5), a + 90, w * 1.4), polar(to, a, w * 4.5), polar(polar(to, a, w * 2.5), a - 90, w * 1.4), polar(to, a - 100, w * 1.6)], true, .35), fill: BEKKO, outline: w * .5 });
  return out;
}

/** A tortoiseshell comb (kushi): a crescent with teeth along its lower edge and a gold makie line; `wide` turns it toward us. */
function comb(c: Pt, half: number, h: number, lw: number): Prim[] {
  const top: Pt[] = [], bot: Pt[] = [];
  for (let i = 0; i <= 10; i++) { const u = i / 10 * 2 - 1, arch = 1 - u * u; top.push([c[0] + u * half, c[1] - h * (.35 + .65 * arch)]); bot.push([c[0] + u * half * .96, c[1] - h * .12 * arch]); }
  const d = smoothD([...top, ...bot.reverse()], true, .3), teeth: string[] = [];
  for (let i = 1; i < 12; i++) { const u = i / 12 * 2 - 1, x = c[0] + u * half * .92, y = c[1] - h * .12 * (1 - u * u); teeth.push(`M${x.toFixed(2)} ${y.toFixed(2)}l0 ${(-h * .28).toFixed(2)}`); }
  return [{ t: "fill", d, fill: BEKKO, outline: lw },
    { t: "stroke", d: teeth.join(""), color: "kogecha", width: Math.max(.4, lw * .5), opacity: .7 },
    { t: "line", d: carvedLine(top.slice(2, 9).map(q => add(q, [0, h * .22])), Math.max(.5, h * .06), { taper: "both" }), color: "kin", opacity: .9 }];
}

// ---- Hyōgo hairstyle -------------------------------------------------------------------------------------------------------------

/**
 * The hyōgo hairstyle in profile (or three-quarter) in the head's unit box (facing right, ±20 ≈ head height): `behind` goes
 * under the face (the nape bun), `over` on top of it.
 */
export function hyogoSide(P: Scale, k: number, lw: number, hairC: UkiyoePaint, accent: UkiyoePaint, tq: boolean): { behind: Prim[]; over: Prim[] } {
  const behind: Prim[] = [], over: Prim[] = [];
  // Tabo: the nape bun swept back and up, with its sheen.
  behind.push({ t: "fill", d: smoothD([P(-9, 0), P(-23, 0), P(-33, 8), P(-30, 19), P(-16, 22), P(-7, 14)], true, .45), fill: hairC, outline: lw });
  behind.push({ t: "line", d: carvedLine([P(-12, 5), P(-23, 5), P(-29, 12)], k * .5 + .3, { taper: "both" }), color: "usuzumi", opacity: .55 });
  // Tōrōbin: the side-wing spread out from the temple like a lantern's paper, so thin the cheek shows through it.
  const wing: Pt[] = [P(3, -11), P(-6, -16), P(-19, -12), P(-27, -1), P(-26, 10), P(-15, 16), P(-5, 12), P(0, 3), P(2, -4)];
  over.push({ t: "fill", d: smoothD(wing, true, .4), fill: hairC, opacity: .5 });
  over.push({ t: "fill", d: smoothD([P(2.5, -10), P(-5, -13), P(-9, -2), P(-5, 9), P(0, 3), P(2, -4)], true, .4), fill: hairC, opacity: .55 });
  const combLines: string[] = [];
  for (let i = 0; i < 9; i++) {
    const u = i / 8, a: Pt = P(lerp(2.5, 0, u), lerp(-9, 5, u)), m: Pt = P(lerp(-11, -13, u), lerp(-15, 14, u) + (u - .5) * 3), b: Pt = P(lerp(-21, -19, u), lerp(-10, 12, u));
    combLines.push(smoothD(quad(a, m, b, 6), false, .4));
  }
  over.push({ t: "stroke", d: combLines.join(""), color: hairC, width: Math.max(.45, k * .32), opacity: .75 });
  over.push({ t: "line", d: carvedLine(wing.slice(1, 7), k * .9 + .4, { taper: "both", minRatio: .4, smooth: true }), color: hairC });
  // The hair over the skull: a full pompadour standing over the brow, the hairline at the temple and the sideburn.
  over.push({ t: "fill", d: smoothD([P(-1, -21.5), P(8, -22), P(15, -20), P(19.5, -15), P(17.5, -11.2), P(12, -11.5), P(7, -11), P(3, -7), P(2.5, 0), P(0, 5), P(-6, 8), P(-12, 4), P(-15, -6), P(-12, -17)], true, .4), fill: hairC, outline: lw });
  over.push({ t: "stroke", d: [0, 1, 2].map(i => smoothD(quad(P(3 + i * 3, -20.5 + i * .3), P(10 + i * 2.5, -21.5 + i), P(16 + i * 1.2, -15 + i * 1.2), 6), false, .4)).join(""), color: "usuzumi", width: Math.max(.4, k * .3), opacity: .6 });
  // The two great loops on top, bound at their root with a crêpe band (tegara).
  over.push(...loopBand(P(-11, -34), 8.5 * k, 11 * k, -24, 5.8 * k, hairC, lw));
  over.push(...loopBand(P(4, -37), 9.2 * k, 11.8 * k, 16, 6 * k, hairC, lw));
  over.push({ t: "fill", d: smoothD([P(-11, -21), P(-10, -27), P(1, -28.5), P(5, -23), P(-2, -20.5)], true, .4), fill: hairC, outline: lw });
  over.push({ t: "fill", d: smoothD([P(-6.5, -22.8), P(-5.5, -26.2), P(-2.5, -26.4), P(-3.5, -22.4)], true, .4), fill: accent === "beni" ? "shu" : "beni", outline: lw * .6, pattern: { type: "kanoko", color: "gofun", scale: .25, opacity: .8 } });
  // Combs: seen edge-on in profile, turned toward us in three-quarter.
  over.push(...comb(P(tq ? 7 : 10, -21.5), (tq ? 10 : 2.8) * k, 10.5 * k, lw * .9));
  over.push(...comb(P(tq ? -2 : 3.5, -23.5), (tq ? 9 : 2.6) * k, 9.5 * k, lw * .9));
  // The kōgai through the loops, then the fan of kanzashi: three forward, four back, the longest in the middle.
  over.push({ t: "line", d: carvedLine([P(-36, -27.5), P(32, -31)], 2.4 * k + .6, { taper: "none" }), color: "sumi", opacity: .85 });
  over.push({ t: "line", d: carvedLine([P(-36, -27.5), P(32, -31)], 1.7 * k + .3, { taper: "none" }), color: "kincha" });
  for (const end of [P(-37, -27.4), P(33, -31.1)]) over.push({ t: "fill", d: ellipseD(end[0], end[1], 2.2 * k, 1.6 * k), fill: "kin", outline: lw * .5 });
  const root: Pt = P(-3, -28);
  const fan = [[-14, 29], [-28, 32], [-42, 29], [194, 31], [207, 35], [221, 34], [236, 30]];
  fan.forEach(([a, L], i) => over.push(...pin(root, polar(root, a, L * k), k * 1.05 + .2, i, accent)));
  // A coral-bead pin at the front of the loops.
  over.push(...pin(P(4, -24), P(13, -31), k * .9 + .2, 0, accent));
  return { behind, over };
}

/** The hyōgo hairstyle square on, from the front or from behind (unit = head radius, centred on the head). */
export function hyogoSquare(r: number, lw: number, hairC: UkiyoePaint, accent: UkiyoePaint, back: boolean): { behind: Prim[]; over: Prim[] } {
  const P = (x: number, y: number): Pt => [x * r, y * r], behind: Prim[] = [], over: Prim[] = [];
  // The lantern wings stand out at both sides of the face; behind, they frame the nape bun.
  for (const s of [-1, 1]) {
    const wing: Pt[] = [P(s * .66, -.85), P(s * 1.3, -.6), P(s * 1.66, .0), P(s * 1.5, .6), P(s * 1.0, .85), P(s * .8, .5), P(s * .86, -.2)];
    behind.push({ t: "fill", d: smoothD(wing, true, .45), fill: hairC, opacity: .48 });
    behind.push({ t: "fill", d: smoothD([P(s * .66, -.85), P(s * 1.05, -.62), P(s * 1.12, .1), P(s * .95, .62), P(s * .8, .5), P(s * .86, -.2)], true, .45), fill: hairC, opacity: .6 });
    const lines: string[] = [];
    for (let i = 0; i < 9; i++) { const u = i / 8; lines.push(smoothD(quad(P(s * lerp(.7, .84, u), lerp(-.8, .45, u)), P(s * (1.35 + .18 * Math.sin(u * Math.PI)), lerp(-.5, .5, u)), P(s * lerp(1.3, 1.02, u), lerp(-.45, .8, u)), 6), false, .4)); }
    behind.push({ t: "stroke", d: lines.join(""), color: hairC, width: Math.max(.45, r * .022), opacity: .75 });
    behind.push({ t: "line", d: carvedLine(wing.slice(1, 5), r * .05 + .4, { taper: "both", minRatio: .4, smooth: true }), color: hairC });
  }
  if (back) {
    // From behind: the whole back of the hair and the tabo bun spreading over the nape.
    over.push({ t: "fill", d: smoothD([P(-.9, -.4), P(-.95, .35), P(-.6, .7), P(.6, .7), P(.95, .35), P(.9, -.4), P(.62, -1.0), P(0, -1.14), P(-.62, -1.0)], true, .4), fill: hairC, outline: lw });
    over.push({ t: "fill", d: smoothD([P(-.95, .45), P(-1.2, .8), P(-.8, 1.12), P(0, 1.18), P(.8, 1.12), P(1.2, .8), P(.95, .45), P(0, .55)], true, .45), fill: hairC, outline: lw });
    over.push({ t: "stroke", d: [-.5, 0, .5].map(x => smoothD(quad(P(x * .6, .2), P(x * 1.4, .7), P(x * 1.2, 1.05), 6), false, .4)).join(""), color: "usuzumi", width: Math.max(.4, r * .02), opacity: .55 });
  } else {
    // From the front: the pompadour over the brow, the hair at the temples.
    over.push({ t: "fill", d: smoothD([P(-.85, -.35), P(-.82, -.95), P(-.4, -1.32), P(0, -1.38), P(.4, -1.32), P(.82, -.95), P(.85, -.35), P(.72, -.55), P(.45, -.68), P(0, -.72), P(-.45, -.68), P(-.72, -.55)], true, .4), fill: hairC, outline: lw });
    over.push({ t: "stroke", d: [-.4, 0, .4].map(x => smoothD(quad(P(x * 1.4, -.8), P(x * 1.2, -1.2), P(x * .4, -1.3), 6), false, .4)).join(""), color: "usuzumi", width: Math.max(.4, r * .02), opacity: .55 });
  }
  // The two great loops spread like wings on top, the crêpe band at their knot.
  over.push(...loopBand(P(-.72, -2.0), .66 * r, .5 * r, -18, .36 * r, hairC, lw));
  over.push(...loopBand(P(.72, -2.0), .66 * r, .5 * r, 18, .36 * r, hairC, lw));
  over.push({ t: "fill", d: ellipseD(0, -1.65 * r, .38 * r, .32 * r), fill: hairC, outline: lw });
  over.push({ t: "fill", d: ellipseD(0, -1.65 * r, .18 * r, .24 * r), fill: accent === "beni" ? "shu" : "beni", outline: lw * .6, pattern: { type: "kanoko", color: "gofun", scale: .25, opacity: .8 } });
  // The kōgai across the loops, the kanzashi fanning out at both sides, then the combs in front (their backs from behind).
  over.push({ t: "line", d: carvedLine([P(-2.5, -1.58), P(2.5, -1.58)], r * .12 + .6, { taper: "none" }), color: "sumi", opacity: .85 });
  over.push({ t: "line", d: carvedLine([P(-2.5, -1.58), P(2.5, -1.58)], r * .08 + .3, { taper: "none" }), color: "kincha" });
  for (const s of [-1, 1]) over.push({ t: "fill", d: ellipseD(s * 2.55 * r, -1.58 * r, .12 * r, .09 * r), fill: "kin", outline: lw * .5 });
  for (const s of [-1, 1]) [[6, 2.2], [22, 2.4], [38, 2.3], [54, 2.0]].forEach(([a, L], i) => {
    const root: Pt = P(s * .3, -1.45), ang = s > 0 ? -a : 180 + a;
    over.push(...pin(root, polar(root, ang, L * r), r * .055 + .2, i + (s > 0 ? 1 : 0), accent));
  });
  over.push(...comb(P(0, -1.16), 1.05 * r, .5 * r, lw * .9));
  over.push(...comb(P(0, -1.38), .88 * r, .42 * r, lw * .9));
  if (!back) over.push(...pin(P(.25, -1.3), P(.55, -2.35), r * .05 + .2, 0, accent));
  return { behind, over };
}

// ---- Kamuro bob ------------------------------------------------------------------------------------------------------------------

/** The child attendant's bob in profile: a straight fringe, hair cut level at the jaw, a small knot with a flower pin. */
export function kamuroSide(P: Scale, k: number, lw: number, hairC: UkiyoePaint, accent: UkiyoePaint): Prim[] {
  return [
    { t: "fill", d: smoothD([P(-1, -21), P(9, -19.5), P(15, -12.5), P(15.2, -7.5), P(8, -7.2), P(4, -6.5), P(3, 3), P(2.5, 12), P(-4, 13), P(-14, 12.5), P(-17.5, 2), P(-16, -8), P(-11, -18)], true, .35), fill: hairC, outline: lw },
    { t: "stroke", d: [0, 1, 2, 3].map(i => `M${P(-12 + i * 4, 11)[0].toFixed(1)} ${P(0, 11)[1].toFixed(1)}l${(.6 * k).toFixed(1)} ${(-12 * k).toFixed(1)}`).join(""), color: "usuzumi", width: Math.max(.4, k * .3), opacity: .5 },
    ...loopBand(P(-4, -24), 4.2 * k, 3.4 * k, -10, 2.8 * k, hairC, lw),
    { t: "fill", d: [0, 72, 144, 216, 288].map(a => ellipseD(...polar(P(5, -24), a, 2.1 * k), 1.5 * k, 1.5 * k)).join(""), fill: accent, outline: lw * .5 },
    { t: "dots", d: circleD(...P(5, -24), 1.1 * k), color: "ki" },
    { t: "stroke", d: [-1, 0, 1].map(i => `M${P(5 + i * 1.2, -22)[0].toFixed(1)} ${P(0, -22)[1].toFixed(1)}l0 ${(7 * k).toFixed(1)}`).join(""), color: "kin", width: Math.max(.5, k * .35) },
  ];
}

/** The kamuro bob square on. */
export function kamuroSquare(r: number, lw: number, hairC: UkiyoePaint, accent: UkiyoePaint, back: boolean): Prim[] {
  const P = (x: number, y: number): Pt => [x * r, y * r];
  const out: Prim[] = [back
    ? { t: "fill", d: smoothD([P(-.95, -.4), P(-1.0, .62), P(0, .66), P(1.0, .62), P(.95, -.4), P(.62, -1.0), P(0, -1.14), P(-.62, -1.0)], true, .35), fill: hairC, outline: lw }
    : { t: "fill", d: smoothD([P(-1.0, .62), P(-.98, -.35), P(-.8, -.95), P(0, -1.15), P(.8, -.95), P(.98, -.35), P(1.0, .62), P(.8, .62), P(.78, -.42), P(0, -.4), P(-.78, -.42), P(-.8, .62)], true, .25), fill: hairC, outline: lw }];
  out.push(...loopBand(P(-.32, -1.3), .3 * r, .22 * r, -12, .18 * r, hairC, lw), ...loopBand(P(.32, -1.3), .3 * r, .22 * r, 12, .18 * r, hairC, lw));
  for (const s of [-1, 1]) {
    const c: Pt = P(s * .72, -1.05);
    out.push({ t: "fill", d: [0, 72, 144, 216, 288].map(a => ellipseD(...polar(c, a, .12 * r), .09 * r, .09 * r)).join(""), fill: accent, outline: lw * .5 }, { t: "dots", d: circleD(c[0], c[1], .06 * r), color: "ki" });
    out.push({ t: "stroke", d: [-1, 0, 1].map(i => `M${(c[0] + i * .06 * r).toFixed(1)} ${(c[1] + .1 * r).toFixed(1)}l0 ${(.4 * r).toFixed(1)}`).join(""), color: "kin", width: Math.max(.5, r * .025) });
  }
  return out;
}

// ---- Koma-geta -------------------------------------------------------------------------------------------------------------------

/** A tall three-toothed clog under a bare foot, seen from the side: `heel` and `toe` are the sole's ends, `gh` its height. */
export function komaGetaSide(heel: Pt, toe: Pt, gh: number, lw: number, far: boolean): Prim[] {
  const L = Math.hypot(toe[0] - heel[0], toe[1] - heel[1]) || 1, u: Pt = [(toe[0] - heel[0]) / L, (toe[1] - heel[1]) / L], n: Pt = [-u[1], u[0]];
  const at = (t: number, d: number): Pt => [heel[0] + u[0] * L * t + n[0] * d * (u[0] >= 0 ? 1 : -1), heel[1] + u[1] * L * t + n[1] * d * (u[0] >= 0 ? 1 : -1)];
  const board = [at(-.08, 0), at(1.1, 0), at(1.08, gh * .34), at(-.06, gh * .34)];
  const out: Prim[] = [{ t: "fill", d: smoothD(board, true, .15), fill: LACQUER, outline: lw }];
  for (const t of [.06, .5, .92]) out.push({ t: "fill", d: smoothD([at(t - .07, gh * .3), at(t + .07, gh * .3), at(t + .06, gh), at(t - .06, gh)], true, .1), fill: "sumi", outline: lw * .8 });
  out.push({ t: "line", d: carvedLine([at(0, gh * .06), at(1.02, gh * .06)], Math.max(.5, gh * .05), { taper: "both" }), color: "gofun", opacity: .35 });
  // The red thong over the instep.
  out.push({ t: "line", d: carvedLine([at(.82, 0), at(.62, -gh * .32), at(.35, 0)], Math.max(.8, gh * .09), { taper: "none", smooth: true }), color: "beni" });
  if (far) out.push({ t: "fill", d: smoothD(board, true, .15), fill: "sumi", opacity: .15, noPrint: true });
  return out;
}

/** The clog square on (front or back): the tall block under the foot, the thong's V over the toes from the front. */
export function komaGetaSquare(c: Pt, w: number, gh: number, lw: number, back: boolean): Prim[] {
  const out: Prim[] = [{ t: "fill", d: smoothD([[c[0] - w, c[1]], [c[0] + w, c[1]], [c[0] + w * .96, c[1] + gh], [c[0] - w * .96, c[1] + gh]], true, .12), fill: LACQUER, outline: lw }];
  out.push({ t: "line", d: carvedLine([[c[0] - w * .8, c[1] + gh * .08], [c[0] + w * .8, c[1] + gh * .08]], Math.max(.5, gh * .05), { taper: "both" }), color: "gofun", opacity: .35 });
  out.push({ t: "line", d: carvedLine([[c[0] - w * .85, c[1] + gh * .34], [c[0] + w * .85, c[1] + gh * .34]], lw * .7, { taper: "none" }), color: "kogecha", opacity: .8 });
  if (!back) out.push({ t: "line", d: carvedLine([[c[0] - w * .75, c[1] + gh * .02], [c[0], c[1] - gh * .28], [c[0] + w * .75, c[1] + gh * .02]], Math.max(.8, gh * .09), { taper: "none" }), color: "beni" });
  return out;
}

// ---- Roundel motifs ----------------------------------------------------------------------------------------------------------------

/** A large chrysanthemum roundel (kiku-maru), the kind scattered over an uchikake: a ring of petals round a centre. */
function kikuRoundel(c: Pt, r: number, color: UkiyoePaint, line: number): Prim[] {
  const petals: string[] = [];
  for (let i = 0; i < 16; i++) {
    const a = i / 16 * 360, tip = polar(c, a, r), l = polar(c, a - 8, r * .45), rr = polar(c, a + 8, r * .45);
    petals.push(smoothD([l, polar(c, a - 6, r * .85), tip, polar(c, a + 6, r * .85), rr], true, .35));
  }
  return [{ t: "fill", d: petals.join(""), fill: color, outline: line, opacity: .95 },
    { t: "fill", d: ellipseD(c[0], c[1], r * .32, r * .32), fill: "kin", outline: line },
    { t: "dots", d: [0, 60, 120, 180, 240, 300].map(a => circleD(...polar(c, a, r * .17), r * .05)).join(""), color: "kogecha" }];
}

/** Roundels scattered over a garment shape (clipped to it), placed at fractions of its bounding box. */
export function roundels(clipD: string, box: { x0: number; y0: number; x1: number; y1: number }, r: number, color: UkiyoePaint, line: number, at: readonly Pt[]): Prim {
  return { t: "clip", d: clipD, key: "roundels", prims: at.flatMap(([u, v]) => kikuRoundel([lerp(box.x0, box.x1, u), lerp(box.y0, box.y1, v)], r, color, line)) };
}

// ---- Fuki: the padded hem ------------------------------------------------------------------------------------------------------------

/** The uchikake's padded hem roll along `edge`: a fat band of the lining colour with its outline and a highlight. */
export function fuki(edge: readonly Pt[], w: number, lining: UkiyoePaint, lw: number): Prim[] {
  return [
    { t: "line", d: carvedLine(edge, w + lw * 2.2, { taper: "none", smooth: true }), color: "sumi" },
    { t: "line", d: carvedLine(edge, w, { taper: "none", smooth: true }), color: lining },
    { t: "line", d: carvedLine(edge.map(q => add(q, [0, -w * .22])), w * .22, { taper: "both", smooth: true }), color: "gofun", opacity: .3 },
  ];
}

/** Bands of the layered under-robes along an edge, each offset a little further in (kasane at a hem or a collar). */
export function kasane(edge: readonly Pt[], layers: readonly UkiyoePaint[], w: number, offset: Pt, lw: number): Prim[] {
  const out: Prim[] = [];
  layers.forEach((c, i) => {
    const e = edge.map(q => add(q, [offset[0] * i, offset[1] * i]));
    out.push({ t: "line", d: carvedLine(e, w + lw * 1.4, { taper: "none", smooth: true }), color: "sumi", opacity: .85 }, { t: "line", d: carvedLine(e, w, { taper: "none", smooth: true }), color: c });
  });
  return out;
}

// ---- Mae-obi ----------------------------------------------------------------------------------------------------------------------

const OBI_PATTERN = (color: UkiyoePaint): UkiyoePattern => ({ type: "kikko", color, scale: .32, opacity: .75 });

/** The obi tied in front, in profile: a great padded bundle standing out from the belly, its ends hanging to the knee. */
export function maeObiSide(waistF: Pt, waistB: Pt, H: number, lw: number, obiC: UkiyoePaint, patternC: UkiyoePaint, sway: number): Prim[] {
  const out: Prim[] = [], x = waistF[0], y = waistF[1];
  // The band round the waist.
  out.push({ t: "fill", d: smoothD([[waistB[0] - H * .005, waistB[1] - H * .035], [x + H * .01, y - H * .045], [x + H * .012, y + H * .045], [waistB[0] - H * .005, waistB[1] + H * .04]], true, .2), fill: obiC, outline: lw, pattern: OBI_PATTERN(patternC), grain: .3 });
  // The hanging ends (behind the bundle), swinging a little with the step.
  for (const [dx, len, wd] of [[.045, .36, .055], [.085, .3, .05]] as const) {
    const top: Pt = [x + H * dx, y + H * .03], bot: Pt = [x + H * (dx + .02) + sway * H * .02, y + H * len];
    out.push({ t: "fill", d: carvedLine([top, [lerp(top[0], bot[0], .5) + sway * H * .01, lerp(top[1], bot[1], .5)], bot], H * wd, { taper: "none", smooth: true }), fill: obiC, outline: lw, pattern: OBI_PATTERN(patternC), grain: .3 });
    out.push({ t: "line", d: carvedLine([add(bot, [-H * wd * .5, 0]), add(bot, [H * wd * .5, 0])], H * .008, { taper: "none" }), color: "kin" });
  }
  // The bundle: a cushion of folded silk with its knot and fold lines.
  const bundle: Pt[] = [[x - H * .005, y - H * .055], [x + H * .07, y - H * .075], [x + H * .125, y - H * .035], [x + H * .13, y + H * .03], [x + H * .09, y + H * .075], [x + H * .01, y + H * .06]];
  out.push({ t: "fill", d: smoothD(bundle, true, .45), fill: obiC, outline: lw * 1.1, pattern: OBI_PATTERN(patternC), grain: .3 });
  out.push({ t: "stroke", d: [smoothD(quad([x + H * .03, y - H * .06], [x + H * .09, y - H * .02], [x + H * .11, y + H * .06], 6), false, .4), smoothD(quad([x + H * .06, y - H * .07], [x + H * .12, y - H * .04], [x + H * .125, y + H * .02], 6), false, .4)].join(""), color: "sumi", width: lw * .8, opacity: .55 });
  out.push({ t: "fill", d: ellipseD(x + H * .085, y - H * .005, H * .02, H * .028), fill: obiC, outline: lw * .9 });
  return out;
}

/** The obi tied in front, square on: the band, the great bundle at the centre and its two ends hanging nearly to the knee. */
export function maeObiFront(waistY: number, halfW: number, H: number, lw: number, obiC: UkiyoePaint, patternC: UkiyoePaint, sway: number): Prim[] {
  const out: Prim[] = [], oh = H * .085;
  out.push({ t: "fill", d: smoothD([[-halfW, waistY - oh * .5], [halfW, waistY - oh * .5], [halfW * 1.02, waistY + oh * .5], [-halfW * 1.02, waistY + oh * .5]], true, .15), fill: obiC, outline: lw, pattern: OBI_PATTERN(patternC), grain: .3 });
  for (const s of [-1, 1]) {
    const top: Pt = [s * H * .035, waistY + oh * .4], bot: Pt = [s * H * .07 + sway * H * .015, waistY + H * .3];
    out.push({ t: "fill", d: carvedLine([top, [lerp(top[0], bot[0], .5), lerp(top[1], bot[1], .5)], bot], H * .07, { taper: "none", smooth: true }), fill: obiC, outline: lw, pattern: OBI_PATTERN(patternC), grain: .3 });
    out.push({ t: "line", d: carvedLine([add(bot, [-H * .036, 0]), add(bot, [H * .036, 0])], H * .008, { taper: "none" }), color: "kin" });
  }
  const bw = H * .15, bh = H * .1, cy = waistY + H * .01;
  out.push({ t: "fill", d: smoothD([[-bw, cy - bh * .2], [-bw * .7, cy - bh], [0, cy - bh * 1.12], [bw * .7, cy - bh], [bw, cy - bh * .2], [bw * .82, cy + bh * .8], [0, cy + bh * 1.05], [-bw * .82, cy + bh * .8]], true, .45), fill: obiC, outline: lw * 1.1, pattern: OBI_PATTERN(patternC), grain: .3 });
  out.push({ t: "stroke", d: [-1, 1].map(s => smoothD(quad([s * bw * .25, cy - bh * .95], [s * bw * .75, cy - bh * .2], [s * bw * .5, cy + bh * .9], 6), false, .4)).join(""), color: "sumi", width: lw * .8, opacity: .5 });
  out.push({ t: "fill", d: ellipseD(0, cy, bw * .26, bh * .42), fill: obiC, outline: lw * .9 });
  return out;
}

// ---- Procession parasol ------------------------------------------------------------------------------------------------------------

/**
 * The long-handled parasol (nagae-gasa) the manservant holds over the courtesan from behind: a long pole from his hands,
 * leaning forward, and a wide canopy with the janome ring, its ribs and a tassel. `toward` is +1 when the canopy leans
 * toward the figure's front (profile), 0 when it stands straight up over him (square views).
 */
export function parasol(hand: Pt, H: number, lw: number, accent: UkiyoePaint, toward: number, wind: number, frame: number, square: boolean): Prim[] {
  const out: Prim[] = [], lean = (toward * 30 + Math.sin(frame / 37) * 1.5 - wind * 4) * DEG, len = H * (square ? 1 : .92);
  const top: Pt = [hand[0] + Math.sin(lean) * len, hand[1] - H * .12 - Math.cos(lean) * len];
  out.push({ t: "line", d: carvedLine([[hand[0] - Math.sin(lean) * H * .1, hand[1] + Math.cos(lean) * H * .1], top], H * .016, { taper: "none" }), color: "cha" });
  out.push({ t: "line", d: carvedLine([[hand[0] - Math.sin(lean) * H * .1, hand[1] + Math.cos(lean) * H * .1], top], H * .006, { taper: "none" }), color: "kogecha", opacity: .6 });
  const R = H * .5, rise = square ? .22 : .3;
  // The canopy is carried nearly level, tipped only a little with the pole.
  const tip = lean * .25, rot = (x: number, y: number): Pt => [top[0] + x * Math.cos(tip) - y * Math.sin(tip), top[1] + x * Math.sin(tip) + y * Math.cos(tip)];
  const dome: Pt[] = [], rim: Pt[] = [];
  for (let i = 0; i <= 16; i++) { const u = i / 16 * 2 - 1; dome.push(rot(u * R, -R * rise * (1 - u * u) ** .6)); }
  for (let i = 16; i >= 0; i--) { const u = i / 16 * 2 - 1; rim.push(rot(u * R * .99, R * .05 * (1 - u * u))); }
  out.push({ t: "fill", d: smoothD([...dome, ...rim], true, .2), fill: accent, outline: lw, grain: .5 });
  const ring: Pt[] = [], ringIn: Pt[] = [];
  for (let i = 0; i <= 16; i++) { const u = i / 16 * 2 - 1; ring.push(rot(u * R * .82, -R * rise * (1 - (u * .82) ** 2) ** .6 * .38)); ringIn.push(rot(u * R * .62, -R * rise * (1 - (u * .62) ** 2) ** .6 * .62)); }
  out.push({ t: "fill", d: smoothD([...ring, ...ringIn.reverse()], true, .3), fill: "gofun", opacity: .93 });
  const apex = rot(0, -R * rise);
  out.push({ t: "stroke", d: dome.filter((_, i) => i % 2 === 0).map(q => `M${apex[0].toFixed(1)} ${apex[1].toFixed(1)}L${q[0].toFixed(1)} ${q[1].toFixed(1)}`).join(""), color: "sumi", width: .7, opacity: .35 });
  out.push({ t: "fill", d: ellipseD(apex[0], apex[1], H * .022, H * .014), fill: "sumi" });
  // Tassels from the rim's ends, swinging.
  for (const s of [-1, 1]) {
    const at = rot(s * R * .97, R * .02), sw = Math.sin(frame / 13 + s) * H * .01 + wind * H * .02;
    out.push({ t: "line", d: carvedLine([at, [at[0] + sw, at[1] + H * .1]], H * .008, { taper: "none" }), color: "kin" });
    out.push({ t: "fill", d: smoothD([[at[0] + sw - H * .012, at[1] + H * .1], [at[0] + sw + H * .012, at[1] + H * .1], [at[0] + sw * 1.2 + H * .01, at[1] + H * .16], [at[0] + sw * 1.2 - H * .01, at[1] + H * .16]], true, .3), fill: "beni", outline: lw * .6 });
  }
  return out;
}

// ---- The procession (oiran dōchū) ------------------------------------------------------------------------------------------------------

/**
 * The cast of a courtesan's procession, after the Yoshiwara prints: the oiran in her black uchikake with roundels over a
 * red robe and layered collars, the gold obi tied in front, the hyōgo hairstyle and koma-geta; two kamuro (child
 * attendants) dressed alike in red; a shinzō (young attendant courtesan) in long sleeves; the manservant with the
 * long-handled parasol; and the lantern bearer who walks ahead. Generic looks: restyle any field.
 */
export const UKIYOE_OIRAN_LOOKS: Readonly<Record<"oiran" | "kamuro" | "shinzo" | "parasol" | "lantern", UkiyoeFigureLook>> = {
  oiran: { build: "slim", hair: "hyogo", robe: "beni", robePattern: { type: "sakura", color: "gofun", scale: .5, opacity: .8 }, layers: ["ki", "sakura", "gofun"],
    uchikake: "sumi", uchikakePattern: { type: "nami", color: "kin", scale: .7, opacity: .5 }, lining: "beni", motif: "kin", obiTie: "front", obi: "ki", obiPattern: "cha",
    feet: "koma-geta", accent: "shu", lips: "beni" },
  kamuro: { build: "child", hair: "kamuro", robe: "beni", robePattern: { type: "sakura", color: "gofun", scale: .45, opacity: .85 }, obi: "ki", under: "gofun", sleeves: "long", feet: "geta", accent: "shu" },
  shinzo: { hair: "shimada", robe: "murasaki", robePattern: { type: "asanoha", color: "sakura", scale: .45, opacity: .7 }, under: "beni", obi: "kincha", sleeves: "long", feet: "geta", accent: "shu", view: "three-quarter" },
  parasol: { hair: "chonmage", robe: "ai", robePattern: { type: "shima", color: "sora", scale: .4, opacity: .5 }, coat: "sumi", lower: "tucked", legs: "hada", feet: "waraji", prop: "parasol", accent: "beni" },
  lantern: { hair: "chonmage", robe: "ai", coat: "sumi", lower: "tucked", legs: "hada", feet: "waraji", prop: "lantern", accent: "shu", hat: "headband", hatColor: "gofun" },
};

export interface OiranProcessionOptions {
  /** Id prefix for the procession's figures. */
  id: string;
  /** Where the oiran stands at `start` (her feet), in the parent's coordinates. */
  x: number;
  y: number;
  /** Figure scale (default 1). */
  scale?: number;
  /** Frames the procession walks, and how far (px, + to the right, − to the left). */
  start: number;
  end: number;
  distance: number;
  /** Mikaeri: the procession halts at this frame while the oiran looks back over her shoulder for `lookFor` frames. */
  lookBackAt?: number;
  lookFor?: number;
  /** Profile or three-quarter (the procession crosses the picture). */
  view?: "profile" | "three-quarter";
  /** Restyle the oiran. */
  oiran?: Partial<UkiyoeFigureLook>;
}

/**
 * The oiran's procession as figure nodes, drawn back to front: the far kamuro, the lantern bearer ahead, the parasol
 * bearer behind with the canopy over her, the shinzō, the oiran with her figure-eight step, and the near kamuro. All keep
 * her slow pace, and stop together while she looks back.
 */
export function oiranProcession(o: OiranProcessionOptions): UkiyoeFigureNode[] {
  const k = o.scale ?? 1, dir = Math.sign(o.distance) || 1, L = UKIYOE_OIRAN_LOOKS, view = o.view ?? "profile";
  const halt = o.lookBackAt !== undefined && o.lookBackAt > o.start && o.lookBackAt < o.end ? o.lookBackAt : undefined, hold = halt !== undefined ? Math.max(30, o.lookFor ?? 90) : 0;
  // Each member walks the same distance in the same frames, split round the halt.
  const moves = (type: "walk" | "dochu", extra: UkiyoeAction[] = []): UkiyoeAction[] => {
    if (halt === undefined) return [{ type, start: o.start, end: o.end, to: o.distance }];
    const walkFrames = o.end - o.start - hold, first = (halt - o.start) / Math.max(1, walkFrames);
    return [{ type, start: o.start, end: halt, to: o.distance * first }, ...extra, { type, start: halt + hold, end: o.end, to: o.distance }];
  };
  const look = halt !== undefined ? [{ type: "look" as const, start: halt + 8, end: halt + hold - 10, angle: -10, back: true, blend: 12 }] : [];
  const member = (name: string, lk: UkiyoeFigureLook, dx: number, dy: number, sc: number, type: "walk" | "dochu", extra: UkiyoeAction[] = []): UkiyoeFigureNode => ({
    id: `${o.id}-${name}`, kind: "figure", x: o.x + dir * dx * k, y: o.y + dy * k, scale: k * sc, look: { ...lk, view: lk.view === "three-quarter" ? lk.view : view },
    facing: dir > 0 ? "right" : "left", actions: moves(type, extra),
  });
  return [
    member("kamuro-far", L.kamuro, 175, -16, .95, "walk"),
    member("lantern", L.lantern, 300, -6, .97, "walk"),
    member("shinzo", L.shinzo, -250, -10, .97, "walk"),
    member("parasol", L.parasol, -125, -4, 1, "walk"),
    member("oiran", { ...L.oiran, ...o.oiran }, 0, 0, 1, "dochu", look),
    member("kamuro-near", L.kamuro, 105, 12, 1, "walk"),
  ];
}
