/**
 * UKIYO1 warriors of the Heian and Genpei wars: the great armour (ō-yoroi), the horned helmet, the bow and the
 * naginata, for Raikō, Yorimasa shooting the nue, Benkei on Gojō bridge and the ghostly Heike.
 *
 * - Look `armor`: the ō-yoroi in its lacing colour (odoshi). It has a box-like cuirass of lacquered lamellae laced in
 *   rows, the hanging skirt plates (kusazuri) that swing with the legs, and the great square shoulder board (ō-sode)
 *   over the upper arm. It is drawn in every view.
 * - Hat `kabuto`: the riveted helmet bowl with its flared neck guard (shikoro), the turned-back wings (fukigaeshi) and
 *   the gilt horns (kuwagata).
 * - Prop `yumi` with the action `shoot`. The bow is raised, the string drawn to the ear by IK and held, then released
 *   on `contact`. The arrow flies to `aim` (local px, facing right, feet at the origin) and stays stuck there.
 * - Prop `naginata`: the glaive held across the body in both hands, its curved blade up and forward.
 * - Motif `mato`: an archery target of black and white rings on a stand.
 */
import type { Pt } from "./ukiyoe-core";
import { carvedLine, clamp01, DEG, lerp, smoothD, span } from "./ukiyoe-core";
import type { Prim } from "./ukiyoe-prims";
import { ellipseD } from "./ukiyoe-prims";
import type { UkiyoePaint } from "./ukiyoe-pigments";
import type { UkiyoeAction, UkiyoeFigureLook } from "./ukiyoe-figure";
import type { UkiyoeNode, UkiyoeSceneSpec } from "./ukiyoe-scene";

const f1 = (n: number) => n.toFixed(1);
const lerp2 = (a: Pt, b: Pt, t: number): Pt => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
const smooth = (t: number) => { const u = clamp01(t); return u * u * (3 - 2 * u); };
type Map2 = (x: number, y: number) => Pt;

/** Laced lamellae over a quad (top-left, top-right, bottom-right, bottom-left): lacquered rows and the lacing between. */
function laced(q: readonly [Pt, Pt, Pt, Pt], rows: number, lace: UkiyoePaint, lw: number): Prim[] {
  const d = smoothD([...q], true, .05), out: Prim[] = [{ t: "fill", d, fill: lace, outline: lw }];
  const bands: string[] = [], ticks: string[] = [];
  for (let r = 0; r <= rows; r++) {
    const u = r / rows, a = lerp2(q[0], q[3], u), b = lerp2(q[1], q[2], u);
    bands.push(`M${f1(a[0])} ${f1(a[1])}L${f1(b[0])} ${f1(b[1])}`);
    if (r < rows) for (let c = 1; c < 8; c++) { const v = c / 8, p0 = lerp2(a, b, v), p1 = lerp2(lerp2(q[0], q[3], (r + 1) / rows), lerp2(q[1], q[2], (r + 1) / rows), v); ticks.push(`M${f1(p0[0])} ${f1(p0[1])}L${f1(p1[0])} ${f1(p1[1])}`); }
  }
  out.push({ t: "stroke", d: bands.join(""), color: "sumi", width: lw * 2.2 }, { t: "stroke", d: ticks.join(""), color: "gofun", width: lw * .45, opacity: .55 });
  return out;
}

/**
 * The ō-yoroi in profile, from the figure's landmarks: the cuirass over the torso, three skirt plates swinging with the
 * thighs, and the near shoulder board hanging from the shoulder along the upper arm (drawn last, over the arm).
 */
export function oyoroiSide(l: { neck: Pt; shF: Pt; shB: Pt; elF: Pt; waistF: Pt; waistB: Pt; knF: Pt; knB: Pt }, H: number, lw: number, lace: UkiyoePaint): { body: Prim[]; sode: Prim[] } {
  const body: Prim[] = [], top = lerp2(l.neck, l.shF, .3);
  // Cuirass: a box from the armpits to below the waist, the breastplate's leather (tsurubashiri) face at the front.
  const doQ: [Pt, Pt, Pt, Pt] = [[l.shB[0] - H * .015, l.shB[1] + H * .03], [top[0] + H * .05, top[1] + H * .02], [l.waistF[0] + H * .03, l.waistF[1] + H * .03], [l.waistB[0] - H * .03, l.waistB[1] + H * .03]];
  body.push(...laced(doQ, 5, lace, lw));
  body.push({ t: "fill", d: smoothD([doQ[1], [doQ[1][0] - H * .035, doQ[1][1]], [doQ[2][0] - H * .035, doQ[2][1] - H * .06], [doQ[2][0], doQ[2][1] - H * .06]], true, .1), fill: "kincha", outline: lw, pattern: { type: "kikko", color: "cha", scale: .3, opacity: .6 } });
  // Skirt plates (kusazuri): rear, side and front tassets hanging to mid-thigh, each following the leg behind it.
  const hang = (a: Pt, b: Pt, knee: Pt) => { const mid = lerp2(lerp2(a, b, .5), knee, .55), dx = mid[0] - (a[0] + b[0]) / 2; return laced([a, b, [b[0] + dx + H * .01, mid[1]], [a[0] + dx - H * .01, mid[1]]], 4, lace, lw); };
  const wy = (l.waistF[1] + l.waistB[1]) / 2 + H * .03;
  body.push(...hang([l.waistB[0] - H * .035, wy], [lerp(l.waistB[0], l.waistF[0], .4), wy], l.knB));
  body.push(...hang([lerp(l.waistB[0], l.waistF[0], .45), wy], [l.waistF[0] + H * .035, wy], l.knF));
  // Ō-sode: the big square shoulder board hanging from the near shoulder, swinging with the upper arm.
  const ua: Pt = [l.elF[0] - l.shF[0], l.elF[1] - l.shF[1]], L = Math.hypot(ua[0], ua[1]) || 1, u: Pt = [ua[0] / L, ua[1] / L], n: Pt = [-u[1], u[0]];
  const s0: Pt = [l.shF[0] - n[0] * H * .045 - u[0] * H * .01, l.shF[1] - n[1] * H * .045 - u[1] * H * .01];
  const sode = laced([s0, [s0[0] + n[0] * H * .1, s0[1] + n[1] * H * .1], [s0[0] + n[0] * H * .1 + u[0] * H * .2, s0[1] + n[1] * H * .1 + u[1] * H * .2], [s0[0] + u[0] * H * .2, s0[1] + u[1] * H * .2]], 6, lace, lw);
  return { body, sode };
}

/** The ō-yoroi square on (front or back): the cuirass, the shoulder boards out at both sides, the skirt plates. */
export function oyoroiSquare(sw: number, shY: number, waistY: number, H: number, lw: number, lace: UkiyoePaint, back: boolean): Prim[] {
  const out: Prim[] = [];
  out.push(...laced([[-sw * .95, shY + H * .02], [sw * .95, shY + H * .02], [sw * .9, waistY + H * .03], [-sw * .9, waistY + H * .03]], 5, lace, lw));
  if (!back) out.push({ t: "fill", d: smoothD([[-sw * .5, shY + H * .03], [sw * .5, shY + H * .03], [sw * .45, shY + H * .12], [-sw * .45, shY + H * .12]], true, .1), fill: "kincha", outline: lw, pattern: { type: "kikko", color: "cha", scale: .3, opacity: .6 } });
  for (const s of [-1.05, -.35, .35, 1.05]) out.push(...laced([[s * sw - sw * .34, waistY + H * .03], [s * sw + sw * .34, waistY + H * .03], [s * sw + sw * .38, waistY + H * .16], [s * sw - sw * .38, waistY + H * .16]], 4, lace, lw));
  for (const s of [-1, 1]) out.push(...laced([[s * sw * 1.02, shY - H * .005], [s * sw * 1.55, shY + H * .01], [s * sw * 1.5, shY + H * .2], [s * sw * 1.0, shY + H * .19]], 6, lace, lw));
  return out;
}

/** The kabuto, profile (head units ±20): bowl, rivet ribs, flared neck guard, turned-back wing and gilt horns. */
export function kabutoSide(P: Map2, k: number, lw: number, lace: UkiyoePaint): Prim[] {
  const out: Prim[] = [];
  // Neck guard: three flared tiers laced in the armour's colour, behind and below the bowl.
  for (let i = 0; i < 3; i++) out.push({ t: "fill", d: smoothD([P(-6 - i * 2, -10 + i * 6), P(-24 - i * 4, -2 + i * 8), P(-26 - i * 4, 4 + i * 8), P(-4 - i * 2, -4 + i * 6)], true, .2), fill: lace, outline: lw, pattern: { type: "shima", color: "sumi", scale: .25, opacity: .6 } });
  out.push({ t: "fill", d: smoothD([P(-16, -6), P(-15, -20), P(-2, -29), P(12, -24), P(17, -12), P(14, -9), P(0, -12), P(-10, -9)], true, .4), fill: { type: "linear", angle: 90, stops: [[0, "usuzumi", 1], [1, "sumi", 1]] }, outline: lw * 1.2 });
  out.push({ t: "stroke", d: [-9, -4, 1, 6, 11].map(x => `M${f1(x * k)} ${f1(-12 * k)}Q${f1((x - 1) * k)} ${f1(-22 * k)} ${f1((x * .4 - 2) * k)} ${f1(-28 * k)}`).join(""), color: "gofun", width: lw * .6, opacity: .45 });
  out.push({ t: "fill", d: smoothD([P(11, -12), P(17, -15), P(19, -8), P(14, -7)], true, .2), fill: lace, outline: lw });
  // The gilt horns (kuwagata) rise tall and nearly straight from a plate on the brow, far above the bowl (Met 23025).
  out.push({ t: "fill", d: smoothD([P(10, -20), P(13, -50), P(16, -64), P(18, -62), P(15, -48), P(13.5, -20)], true, .2) + smoothD([P(5, -22), P(5, -52), P(7, -66), P(9, -64), P(8.5, -50), P(8.5, -22)], true, .2), fill: { type: "linear", angle: 0, stops: [[0, "kincha", 1], [.5, "kin", 1], [1, "kincha", 1]] }, outline: lw });
  return out;
}

/** The kabuto square on (radius 1). */
export function kabutoSquare(P: Map2, _r: number, lw: number, lace: UkiyoePaint): Prim[] {
  const out: Prim[] = [];
  // The neck guard flares out at both sides of the face (its middle is behind the head).
  for (const s of [-1, 1]) out.push({ t: "fill", d: smoothD([P(s * .82, -.55), P(s * 1.5, -.5), P(s * 2.1, .25), P(s * .95, .3)], true, .3), fill: lace, outline: lw, pattern: { type: "shima", color: "sumi", scale: .25, opacity: .6 } });
  out.push({ t: "fill", d: smoothD([P(-1.0, -.5), P(-.95, -1.1), P(0, -1.45), P(.95, -1.1), P(1.0, -.5), P(0, -.62)], true, .4), fill: { type: "linear", angle: 90, stops: [[0, "usuzumi", 1], [1, "sumi", 1]] }, outline: lw * 1.2 });
  for (const s of [-1, 1]) {
    out.push({ t: "fill", d: smoothD([P(s * .15, -1.1), P(s * .5, -2.6), P(s * .7, -3.3), P(s * .82, -3.25), P(s * .62, -2.5), P(s * .32, -1.05)], true, .2), fill: "kin", outline: lw });
    out.push({ t: "fill", d: smoothD([P(s * 1.0, -.55), P(s * 1.45, -.75), P(s * 1.4, -.35), P(s * 1.05, -.3)], true, .2), fill: lace, outline: lw });
  }
  return out;
}

// ---- The bow ------------------------------------------------------------------------------------------------------------------------

/** Where a `shoot` action is: `draw` 0–1 (string to the ear), released yet, the arrow's flight 0–1, and its aim. */
export function shootAt(actions: readonly UkiyoeAction[], frame: number, H: number): { draw: number; raise: number; released: boolean; flight: number; aim: Pt; nockAt: number } | undefined {
  for (const a of actions) {
    if (a.type !== "shoot" || frame < a.start) continue;
    const contact = a.contact ?? Math.round(a.start + (a.end - a.start) * .6), aim: Pt = (a.aim as Pt | undefined) ?? [H * 3, -H * .7];
    if (frame > a.end && frame > contact + 60) continue;
    const raise = smooth(span(frame, a.start, a.start + 12)), draw = frame < contact ? smooth(span(frame, a.start + 12, contact - 8)) : 0;
    const flightFrames = Math.max(4, Math.hypot(aim[0], aim[1]) / (H * .16));
    return { draw, raise: frame < contact ? raise : raise * (1 - smooth(span(frame, contact + 10, contact + 24))), released: frame >= contact, flight: frame >= contact ? clamp01((frame - contact) / flightFrames) : 0, aim, nockAt: contact };
  }
  return undefined;
}

/** The longbow (yumi) held at `grip`: tall and asymmetric (the grip a third of the way up), the string pulled to `nock`. */
export function yumi(grip: Pt, nock: Pt, dir: Pt, H: number, lw: number, draw: number): Prim[] {
  const n: Pt = [-dir[1], dir[0]], up = H * .95, down = H * .5, bend = H * (.07 + .05 * draw);
  const top: Pt = [grip[0] - n[0] * up - dir[0] * bend * .8, grip[1] - n[1] * up - dir[1] * bend * .8], bot: Pt = [grip[0] + n[0] * down - dir[0] * bend * .6, grip[1] + n[1] * down - dir[1] * bend * .6];
  const midT: Pt = [grip[0] - n[0] * up * .55 + dir[0] * bend * .2, grip[1] - n[1] * up * .55 + dir[1] * bend * .2], midB: Pt = [grip[0] + n[0] * down * .5 + dir[0] * bend * .15, grip[1] + n[1] * down * .5 + dir[1] * bend * .15];
  return [{ t: "fill", d: carvedLine([top, midT, grip, midB, bot], H * .014, { taper: "both", minRatio: .5, smooth: true }), fill: "sumi", outline: lw * .6 },
    { t: "stroke", d: [.2, .4, .6, .8].map(u => { const q = lerp2(midT, grip, u); return `M${f1(q[0] - dir[0] * H * .008)} ${f1(q[1] - dir[1] * H * .008)}l${f1(dir[0] * H * .016)} ${f1(dir[1] * H * .016)}`; }).join(""), color: "beni", width: lw * 1.2 },
    { t: "stroke", d: `M${f1(top[0])} ${f1(top[1])}L${f1(nock[0])} ${f1(nock[1])}L${f1(bot[0])} ${f1(bot[1])}`, color: "gofun", width: lw * .7 }];
}

/** An arrow from `tail` toward `dir`, fletched with feathers at the tail. */
export function arrow(tail: Pt, dir: Pt, H: number, lw: number): Prim[] {
  const L = H * .42, tip: Pt = [tail[0] + dir[0] * L, tail[1] + dir[1] * L], n: Pt = [-dir[1], dir[0]];
  const fl = (s: number) => smoothD([tail, [tail[0] + dir[0] * H * .07 + n[0] * s * H * .018, tail[1] + dir[1] * H * .07 + n[1] * s * H * .018], [tail[0] + dir[0] * H * .1, tail[1] + dir[1] * H * .1]], true, .3);
  return [{ t: "stroke", d: `M${f1(tail[0])} ${f1(tail[1])}L${f1(tip[0])} ${f1(tip[1])}`, color: "kincha", width: lw * 1.3 },
    { t: "fill", d: fl(1) + fl(-1), fill: "gofun", outline: lw * .5 },
    { t: "fill", d: smoothD([[tip[0] + dir[0] * H * .03, tip[1] + dir[1] * H * .03], [tip[0] + n[0] * H * .008, tip[1] + n[1] * H * .008], [tip[0] - n[0] * H * .008, tip[1] - n[1] * H * .008]], true, .1), fill: "usuzumi", outline: lw * .5 }];
}

/** The naginata: a long shaft from below the back hand to a curved blade beyond the front hand. */
export function naginata(handF: Pt, a: number, H: number, lw: number): Prim[] {
  const u: Pt = [Math.cos(a * DEG), Math.sin(a * DEG)], n: Pt = [-u[1], u[0]], base: Pt = [handF[0] - u[0] * H * .55, handF[1] - u[1] * H * .55], end: Pt = [handF[0] + u[0] * H * .45, handF[1] + u[1] * H * .45];
  const tip: Pt = [end[0] + u[0] * H * .22 - n[0] * H * .04, end[1] + u[1] * H * .22 - n[1] * H * .04];
  return [{ t: "fill", d: carvedLine([base, end], H * .016, { taper: "none" }), fill: "kogecha", outline: lw * .7 },
    { t: "fill", d: ellipseD(end[0], end[1], H * .012, H * .012), fill: "kin" },
    { t: "fill", d: smoothD([[end[0] + n[0] * H * .012, end[1] + n[1] * H * .012], [end[0] + u[0] * H * .12 + n[0] * H * .02, end[1] + u[1] * H * .12 + n[1] * H * .02], tip, [end[0] + u[0] * H * .1 - n[0] * H * .01, end[1] + u[1] * H * .1 - n[1] * H * .01], [end[0] - n[0] * H * .01, end[1] - n[1] * H * .01]], true, .35), fill: { type: "linear", angle: 0, stops: [[0, "usuzumi", 1], [1, "gofun", 1]] }, outline: lw }];
}

// ---- Motif and scenes ---------------------------------------------------------------------------------------------------------------

type MP = Readonly<Record<string, unknown>>;
const num = (p: MP, k: string, d: number) => typeof p[k] === "number" && Number.isFinite(p[k]) ? p[k] as number : d;

/** An archery target (mato): black and white rings on a light frame. The centre is at (0, −height). Params: radius, height. */
export function mato(p: MP): Prim[] {
  const R = num(p, "radius", 50), h = num(p, "height", 90), lw = Math.max(1, R * .03), out: Prim[] = [];
  out.push({ t: "stroke", d: `M${f1(-R * .6)} 0L${f1(-R * .3)} ${f1(-h)}M${f1(R * .6)} 0L${f1(R * .3)} ${f1(-h)}`, color: "kincha", width: lw * 2.4 });
  [1, .78, .56, .34, .14].forEach((k, i) => out.push({ t: "fill", d: ellipseD(0, -h, R * k, R * k), fill: i % 2 ? "gofun" : "sumi", outline: i ? 0 : lw }));
  return out;
}
export const BUSHI_MOTIFS = { mato };

export type UkiyoeBushiScene = "archer" | "bridge" | "armour";
export const UKIYOE_BUSHI_SCENES: readonly UkiyoeBushiScene[] = ["archer", "bridge", "armour"];
export const UKIYOE_BUSHI_LOOKS = {
  general: { hair: "chonmage", hat: "kabuto", robe: "beni", lower: "hakama", hakama: "kogecha", armor: "beni", feet: "waraji", build: "stout", beard: true, prop: "yumi" },
  monk: { hair: "bald", hat: "hood", hatColor: "gofun", robe: "sumi", coat: "gofun", lower: "hakama", hakama: "gofun", armor: "sumi", feet: "geta", build: "brute", prop: "naginata" },
  youth: { hair: "topknot", robe: "gofun", robePattern: { type: "asanoha", color: "beni", scale: .5 }, lower: "hakama", hakama: "beni", feet: "geta", build: "slim", swords: "katana" },
} as const;

/**
 * `archer`: an armoured general shoots three arrows into a target, each drawn, held and loosed. `bridge`: the warrior-monk
 * with his naginata faces the young swordsman on a bridge (Benkei and Ushiwakamaru). `armour`: the general turning
 * through the four views.
 */
export function bushiScene(kind: UkiyoeBushiScene = "archer", frames = 300): UkiyoeSceneSpec {
  const look = (k: keyof typeof UKIYOE_BUSHI_LOOKS) => UKIYOE_BUSHI_LOOKS[k] as unknown as UkiyoeFigureLook;
  const nodes: UkiyoeNode[] = [{ id: "sky", kind: "motif", motif: "sky", params: { width: 1920, height: 1080, band: .5, horizon: kind === "bridge" ? "ai" : "beni", ...(kind === "bridge" ? { top: "yoru", mid: "ai" } : {}) } }];
  if (kind === "archer") {
    nodes.push({ id: "ground", kind: "block", x: 960, y: 960, shape: { type: "rect", width: 1920, height: 260 }, fill: { type: "linear", angle: 90, stops: [[0, "kincha", 1], [1, "cha", 1]] }, line: 0 });
    const x = 420, y = 900, sc = 1.9, tx = 1560, ty = y, R = 60, th = 160;
    nodes.push({ id: "target", kind: "motif", motif: "mato", x: tx, y: ty, params: { radius: R, height: th } });
    const aim: [number, number] = [(tx - x) / sc, -th / sc];
    nodes.push({ id: "archer", kind: "figure", x, y, scale: sc, look: look("general"), facing: "right",
      actions: [0, 1, 2].map(i => ({ type: "shoot" as const, start: 10 + i * 95, end: 95 + i * 95, contact: 70 + i * 95, aim: [aim[0], aim[1] + (i - 1) * 6] as [number, number] })) });
  } else if (kind === "bridge") {
    nodes.push({ id: "moon", kind: "motif", motif: "moon", x: 1500, y: 220, params: { radius: 60 } });
    nodes.push({ id: "river", kind: "motif", motif: "sea", y: 900, params: { width: 1920, height: 200, rows: 6 } });
    nodes.push({ id: "bridge", kind: "motif", motif: "bridge", x: 960, y: 880, params: { width: 1700, height: 160 } });
    nodes.push({ id: "monk", kind: "figure", x: 1240, y: 760, scale: 1.8, look: look("monk"), facing: "left", actions: [{ type: "walk", start: 20, end: 120, to: -80 }] });
    nodes.push({ id: "youth", kind: "figure", x: 640, y: 760, scale: 1.6, look: look("youth"), facing: "right", actions: [{ type: "draw", start: 140, end: 180 }, { type: "kamae", start: 180, end: frames, form: "hasso" }] });
  } else {
    nodes.push({ id: "ground", kind: "block", x: 960, y: 960, shape: { type: "rect", width: 1920, height: 260 }, fill: "kincha", line: 0 });
    (["profile", "three-quarter", "front", "back"] as const).forEach((view, i) => nodes.push({ id: "g" + i, kind: "figure", x: 300 + i * 440, y: 920, scale: 1.8, look: { ...look("general"), prop: "none", view } }));
  }
  return { version: 1, id: `bushi-${kind}`, width: 1920, height: 1080, durationFrames: frames, seed: 37, cadence: 2, palette: { preset: kind === "bridge" ? "night" : "edo" }, wind: { base: .3, turbulence: .4 }, nodes };
}
