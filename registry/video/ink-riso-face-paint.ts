/**
 * A face painted with a loaded brush over the lines `poseInkHead` places. Each part is a few marks a wrist can make: a lid is one
 * pressed stroke, an iris one wet dab with the paper left for its light, a brow a half-dry sweep, lips three dabs round one line.
 * Nothing is shaded round like a rendering.
 *
 * Offsets below are in the units of a head posed at 0.78 units per mm; `z` carries them to any other size.
 */
import { inkHash2, inkNoise2, inkSpline } from "./ink-riso-press";
import type { InkRisoPen, PenPoint } from "./ink-riso-pen";
import { inkBlob, inkBloom, inkSide, inkThread } from "./ink-riso-wet";
import type { InkHead } from "./ink-riso-face";

export interface InkFaceStyle {
  /** Plates for line and for colour. */
  ink: string; warm: string;
  /** Colour on lids and cheeks, on the lips, and grey where the face turns and in the eye shadow; 1 is the default strength, 0 leaves it out. */
  rouge?: number; lip?: number; shade?: number;
  /** Darkness of the brows, 0–1 (default 0.74). */
  brow?: number;
  /** How far the corners of the mouth are drawn up, as a share of the upper lip's height (default 0.24). */
  smile?: number;
  /** Upper lashes toward the outer corner of each eye (default 6), and how long and heavy all lashes are (default 1). */
  lashes?: number; lashSize?: number;
  /** How dark the brow is at its head, 0–1 (default 0: it starts pale by the nose and gathers ink). A man's sword brow starts loaded. */
  browHead?: number;
  /** Weight of the lower lid's line and of the lashes on it (default 1), and of the fold over the eye (1). */
  lowerLid?: number; fold?: number;
  /** A line down the far side of the nose, from its root to the tip, 0–1 (default 0: the bridge is left to the light). */
  bridge?: number;
  /** The shadow under the tip of the nose, of `shade` (default 1). On a man's lip a strong one reads as hair. */
  underNose?: number;
  /** Weight of the face's outline (default 1), and how far along the near jaw the line runs before it is out of ink, 0 chin – 1 hinge (default 0.78). */
  contour?: number; jaw?: number;
  /** A breath of grey under the near cheekbone, 0–1 (default 0). */
  hollow?: number;
  /** How dark an ear seen from the side is inside its bowl (default 1). */
  bowl?: number;
  /**
   * A third plate, of thin earth colour (赭石, what portraits warm the skin with). It takes the light from the side the head is turned to:
   * the near side of the nose, the lids, the near cheek and the planes under nose, lip and chin get its water, the far side keeps the paper.
   * Left out, shade is grey and lines are black. `flesh` is its strength (default 1), `warmLine` how much of the outline, the nose, the
   * ear and the folds is drawn in it, 0 black – 1 (default 0.7).
   */
  earth?: string; flesh?: number; warmLine?: number;
  /** With `earth`: how much of the brow and of the iris is drawn in it, and how deep the crescents under the eyes are (default 1, 1; a man's brow is nearly all ink). */
  browWarm?: number; underEye?: number;
  /** With `earth`: how far the lips are let out into the skin, 0 edged – 1 a smear under the parting (default 0). */
  lipSoft?: number;
  /** How dark the iris is between its rim and its pupil, 0–1 (default 1: one wet black dab). Below that the pupil stands out of it and, with `earth`, it is brown. */
  iris?: number;
  /** A red line along the top of the lid's own and on past the corner, 0–1 (default 0). */
  liner?: number;
  /** How straight the far line of the nose's bridge runs, 0 a young hollow one (the default) to 1. */
  straight?: number;
  /** With `earth`: how far the one line of the nose runs out to its tip, 0 to the wing behind it (default) – 1. A long nose needs it. */
  noseTip?: number;
  /** Colour on the near cheek, in place of the breath under the eye: its middle and its reach in the face's frame, and how full it is. */
  blush?: { at: PenPoint; size: PenPoint; tone: number };
  /** A fuller lower lip: how far its foot is drawn out toward the corners, 0–1 (default 0). How heavy the line between the lips is (default 1). */
  lipFull?: number; lipLine?: number;
  seed?: number;
}
type P = readonly [number, number];
type N = readonly [number, number, number];
const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const ss = (a: number, b: number, v: number) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const mix = (a: PenPoint, b: PenPoint, t: number): P => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
const off = (a: PenPoint, dx: number, dy: number): P => [a[0] + dx, a[1] + dy];
const bump = (t: number, c: number, w: number) => Math.exp(-(((t - c) / w) ** 2));
const spot = (x: number, y: number, c: PenPoint, l: number, s: number, an = 0) => { const k = Math.cos(an), n = Math.sin(an), u = (x - c[0]) * k + (y - c[1]) * n, v = -(x - c[0]) * n + (y - c[1]) * k; return Math.exp(-((u / l) ** 2 + (v / s) ** 2)); };
const press = (pts: readonly PenPoint[], w: (t: number) => number): N[] => pts.map((q, i) => [q[0], q[1], w(i / (pts.length - 1))] as const);
const pick = (pts: readonly PenPoint[], n: number): P[] => Array.from({ length: n }, (_, i) => { const q = pts[Math.round((i / (n - 1)) * (pts.length - 1))]; return [q[0], q[1]] as const; });

type InkFullStyle = Required<Omit<InkFaceStyle, "blush">> & Pick<InkFaceStyle, "blush">;
/** `d` is the way the near side lies on the page (1: to the right). */
interface Hand {
  f: InkRisoPen; z: number; w: (v: number) => number; d: number; st: InkFullStyle; seed: () => number;
  /** A line of the skin: black, or with an earth plate that earth with some black laid into it. */
  thread: (pts: readonly N[], width: number, o: { ink?: number; inkEnd?: number; mid?: number; tone?: (t: number) => number; seed: number }) => void;
}
function hand(f: InkRisoPen, head: InkHead, style: InkFaceStyle): Hand {
  const a = f.at(0, 0), b = f.at(1, 0), page = Math.hypot(b[0] - a[0], b[1] - a[1]), z = head.unit / 0.78;
  let s = 1000 + (style.seed ?? 0) * 200;
  const st: InkFullStyle = { rouge: 1, lip: 1, shade: 1, brow: 0.74, smile: 0.24, lashes: 6, lashSize: 1, browHead: 0, lowerLid: 1, fold: 1, bridge: 0, underNose: 1, contour: 1, jaw: 0.78, hollow: 0, bowl: 1, earth: "", flesh: 1, warmLine: 0.7, browWarm: 1, underEye: 1, lipSoft: 0, noseTip: 0, iris: 1, liner: 0, straight: 0, lipFull: 0, lipLine: 1, seed: 0, ...style };
  const thread: Hand["thread"] = (pts, width, o) => {
    const k = st.earth ? clamp(st.warmLine) : 0;
    if (!k) { inkThread(f, st.ink, pts, width, o); return; }
    const of = (m: number, b: number) => ({ seed: o.seed, ...(o.tone ? { tone: (t: number) => clamp(m * o.tone!(t) + b) } : { ink: clamp(m * (o.ink ?? 0.9) + b), mid: clamp(m * (o.mid ?? o.ink ?? 0.9) + b), inkEnd: clamp(m * (o.inkEnd ?? o.ink ?? 0.9) + b) }) });
    inkThread(f, st.earth, pts, width, of(0.9, 0));
    inkThread(f, st.ink, pts, width, of(1 - 0.92 * k, 0));
  };
  return { f, z, w: v => v * z * page / 2.1, d: head.eyes.near.dir, st, seed: () => s++, thread };
}

/** The outline the face fills: far contour, jaw and hairline. */
export const inkFaceShape = (f: InkRisoPen, head: InkHead): number[][] => f.shape([...pick(head.contour, 30), ...pick(head.jaw, 18).slice(1), ...[...head.hairline].reverse().slice(1)].map(q => [q[0], q[1]] as const));

/** A wet dab: one touch of the brush, pooled at its edge, with a sliver of paper left where the light is. */
export function inkDab(f: InkRisoPen, plate: string, nodes: readonly N[], o: { tone?: number; foot?: number; light?: readonly N[]; lightWidth?: number; wander?: number; seed: number }): void {
  const a = f.at(0, 0), b = f.at(1, 0), k = Math.hypot(b[0] - a[0], b[1] - a[1]) / 2.1, shape = inkBlob(f, nodes), y0 = Math.min(...nodes.map(n => n[1] - n[2])), y1 = Math.max(...nodes.map(n => n[1] + n[2])), tone = o.tone ?? 0.9, foot = o.foot ?? tone;
  f.knock(shape);
  inkBloom(f, plate, shape, { tone: (X, Y) => lerp(tone, foot, ss(y0, y1, f.local(X, Y)[1])), soft: 0.7, wander: (o.wander ?? 0.3) * k, wave: 14 * k, fringe: 0.18 * k, tooth: 2.4, rim: 0.34, rimWidth: 1.8 * k, mottle: 0.34, cloud: 8 * k, seed: o.seed });
  if (o.light) f.lift(o.light, o.lightWidth ?? 2 * k, [plate]);
}

export function paintInkFace(f: InkRisoPen, head: InkHead, style: InkFaceStyle): void {
  const h = hand(f, head, style), face = inkFaceShape(f, head);
  f.knock(face);
  skin(h, head, face);
  brow(h, head, "near"); brow(h, head, "far");
  nose(h, head);
  eye(h, head, "near"); eye(h, head, "far");
  mouth(h, head);
  contour(h, head);
}

/**
 * The two sides of the bridge in the face's frame, top to bottom: they leave the brows' heads, close in to the root of the nose and part
 * again. The far one swings out over the tip to the wing; the near one slants away to the corner of its eye. Never two upright lines.
 */
function bridge(head: InkHead, straight = 0, out = 0): { far: (v: number) => number; near: (v: number) => number } {
  const L = (q: PenPoint) => head.local(q), fi = L(head.eyes.far.upper[0]), ni = L(head.eyes.near.upper[0]), bf = L(head.brows.far.mid[0]), bn = L(head.brows.near.mid[0]), fw = L(head.nose.wingFar[2]), tip = L(head.nose.tip), root = fi[0] + 0.066 + 0.03 * straight;
  /** A long nose runs straight to its tip; a short one only to the wing behind it. */
  const to = (u: number, v: number): P => [lerp(u, tip[0] + (root - tip[0]) * (1 - clamp((v - 0.08) / (tip[1] - 0.08))) + 0.004 * Math.sin(Math.PI * clamp((v - 0.08) / (tip[1] - 0.08))), out), v];
  const run = (k: readonly PenPoint[]) => { const q = inkSpline(k, 0.01); return (v: number) => { if (v <= q[0][1]) return q[0][0]; for (let i = 1; i < q.length; i++) if (q[i][1] >= v) { const t = (v - q[i - 1][1]) / (q[i][1] - q[i - 1][1] || 1); return lerp(q[i - 1][0], q[i][0], t); } return q[q.length - 1][0]; }; };
  return {
    far: run([[bf[0] + 0.004, bf[1] + 0.02], [fi[0] + 0.052, -0.08], [fi[0] + 0.07 + 0.03 * straight, 0], [root, 0.08], to(lerp(fi[0] + 0.06 + 0.03 * straight, fw[0] + 0.04 - 0.014 * straight, 0.6), 0.16), to(fw[0] + 0.036 - 0.014 * straight, fw[1] - 0.11), to(fw[0] + 0.012 - 0.006 * straight, fw[1] - 0.045), to(fw[0], fw[1] + 0.01)]),
    near: run([[bn[0] - 0.012, bn[1] + 0.02], [lerp(bn[0], ni[0], 0.3) - 0.016, -0.07], [ni[0] - 0.03, 0], [ni[0], 0.05], [ni[0] + 0.03, 0.1]]),
  };
}

/**
 * Skin is left to the paper. Two waters are laid on it: a thin warm one for the lids, a crescent under each eye and a breath on the cheeks,
 * and a grey one for the same lids, the sockets beside the bridge, the plane under the nose, the lip and the jaw. No ground tint: it would
 * take the light out of the whole face.
 */
function skin({ f, w, st, seed }: Hand, head: InkHead, face: number[][]): void {
  const lay = (plate: string, tone: (u: number, v: number) => number, mottle: number) => inkBloom(f, plate, face, { tone: (X, Y) => { const [u, v] = head.local(f.local(X, Y)); return Math.max(0, tone(u, v)); }, soft: 1, wander: 0, fringe: 0, rim: 0, mottle, cloud: w(26), seed: seed() });
  const L = (q: PenPoint) => head.local(q), { near, far } = head.eyes;
  const ni = L(near.upper[0]), fi = L(far.upper[0]), tip = L(head.nose.tip), base = L(head.nose.base), wn = L(head.nose.wingNear[2]), ml = L(head.lips.lower[5]), dip = L(head.lips.upper[5]), chin = L(head.contour[head.contour.length - 1]), by = L(head.brows.near.mid[2])[1], foot = Math.max(wn[1], L(head.nose.wingFar[2])[1]) + 0.066, hinge = L(head.jaw[head.jaw.length - 1]);
  const run = (pts: readonly PenPoint[]) => { const q = pts.map(L); return q[0][0] < q[q.length - 1][0] ? q : q.reverse(); };
  const at = (q: readonly PenPoint[], u: number) => { if (u <= q[0][0]) return q[0][1]; for (let i = 1; i < q.length; i++) if (q[i][0] >= u) return lerp(q[i - 1][1], q[i][1], (u - q[i - 1][0]) / (q[i][0] - q[i - 1][0] || 1)); return q[q.length - 1][1]; };
  const lids = ([[near, head.brows.near], [far, head.brows.far]] as const).map(([e, b]) => ({ fold: run(e.crease), lo: run([...e.lower, ...e.wing.slice(1)]), brow: run(b.mid), a: L(e.upper[0]), b: L(e.upper[8]) }));
  type Lid = (typeof lids)[number];
  const along = (l: Lid, u: number) => (u - l.a[0]) / (l.b[0] - l.a[0]);
  // Over the eye: from the fold up to the brow, deepest at the fold. Between the fold and the lid's line it is half as strong.
  const over = (l: Lid, u: number, v: number) => { const s = along(l, u); if (s < -0.3 || s > 1.5) return 0; const h = at(l.fold, u) - v, on = ss(-0.14, 0, h) * (1 - 0.55 * ss(-0.003, 0.01, -h) * ss(0, 0.2, s) * ss(1, 0.8, s)); return on * ss(-0.3, 0.06, s) * ss(1.5, 1, s) * ss(at(l.brow, u) - 0.01, at(l.brow, u) + 0.05, v) * (0.5 * Math.exp(-((h / 0.032) ** 2)) + 0.5 * Math.exp(-((Math.max(0, h) / 0.13) ** 2))); };
  // Under the eye: one narrow crescent a little way below the lower lid, which climbs to the end of the lid's line.
  const under = (l: Lid, u: number, v: number) => { const s = along(l, u); if (s < -0.1 || s > 1.36) return 0; const d = v - at(l.lo, u) - lerp(0.032, 0.012, ss(0.6, 1.15, s)); return Math.exp(-((d / (d < 0 ? 0.022 : 0.046)) ** 2)) * ss(-0.1, 0.34, s) * ss(1.36, 0.8, s); };
  const corner = (l: Lid, u: number, v: number) => spot(u, v, [l.a[0] - 0.03 * Math.sign(l.b[0] - l.a[0]), l.a[1] - 0.05], 0.06, 0.075);
  const cheek = (u: number, v: number, l: Lid, wide: number) => st.blush && l === lids[0] ? 0 : spot(u, v, [l.b[0] * 0.8, l.a[1] + 0.2], wide, 0.13);
  const blush = (u: number, v: number) => st.blush ? st.blush.tone * spot(u, v, st.blush.at, st.blush.size[0], st.blush.size[1], -0.25) : 0;
  if (st.rouge > 0) lay(st.warm, (u, v) => st.rouge * (1 - lids.reduce((k, l, i) => k * (1 - 0.16 * over(l, u, v)) * (1 - 0.12 * under(l, u, v)) * (1 - 0.06 * corner(l, u, v)) * (1 - 0.13 * cheek(u, v, l, i ? 0.17 : 0.21)), 1)
    + 0.06 * spot(u, v, [tip[0] + 0.02, tip[1] + 0.03], 0.06, 0.04) + 0.05 * spot(u, v, [chin[0], chin[1] - 0.05], 0.1, 0.05)), 0.12);
  if (st.shade <= 0) return;
  const edge = bridge(head, st.straight, st.noseTip), bf = L(head.brows.far.mid[0]), bn = L(head.brows.near.mid[0]), wet = (d: number, soft: number, hard: number) => Math.exp(-((d / (d < 0 ? soft : hard)) ** 2));
  // the near wing is a ball: its water starts crisp on the turn and lets go inward, so it needs no outline
  const wing = (u: number, v: number) => { const x = (u - wn[0] + 0.03) / 0.036, y = (v - wn[1] - 0.012) / 0.044, r = Math.hypot(x, y); return ss(1.12, 0.92, r) * ss(0.2, 0.96, r) * ss(0, 0.85, (x + 0.75 * y) / (r || 1)); };
  const side = (u: number, v: number) => ss(-0.16, 0.04, u - lerp(hinge[0] + 0.02, chin[0] + 0.17, ss(0.3, 0.97, v))) * ss(0.1, 0.5, v);
  if (st.earth && st.flesh > 0) {
    // The light comes from where the head is turned to. The near plane of the nose runs from its ridge, a little inside the far edge, over
    // the wing into the cheek; below it the near half of the lip and the chin lies in the same half light.
    const ridge = (v: number) => edge.far(v) + lerp(0.065, 0.05, ss(0, 0.3, v)), plane = (u: number, v: number) => { const d = u - ridge(v), low = ss(0.06, wn[1] + 0.02, v), crisp = (1 - 0.8 * st.noseTip) * ss(wn[1] - 0.14, wn[1], v), end = lerp(0.13, 0.29, low); return ss(-0.02, 0.04, d) * ss(end + lerp(0.09, 0.008, crisp), end - lerp(0.1, 0.03, crisp), d) * ss(by + 0.02, by + 0.2, v) * ss(foot + 0.06, foot - 0.07, v); };
    const middle = (v: number) => v < foot ? ridge(v) : v < ml[1] ? lerp(base[0] + 0.02, dip[0] + 0.03, ss(foot, dip[1], v)) : lerp(dip[0] + 0.06, chin[0] + 0.06, ss(ml[1], chin[1], v)), half = (u: number, v: number) => ss(-0.02, 0.1, u - middle(v)) * ss(0.02, 0.2, v);
    const back = (u: number, v: number) => ss(hinge[0] - 0.36, hinge[0] + 0.02, u) * ss(-0.5, 0.1, v) + 0.4 * side(u, v), lip = (u: number, v: number) => spot(u, v, [ml[0] + 0.02, ml[1] + 0.028], 0.1, 0.026);
    const flesh = (u: number, v: number) => st.flesh * (0.1 * plane(u, v) + 0.075 * half(u, v) + 0.12 * back(u, v) + 0.13 * spot(u, v, [ni[0] + 0.02, ni[1] - 0.03], 0.085, 0.095)
      + 0.2 * over(lids[0], u, v) + 0.12 * over(lids[1], u, v) + st.underEye * (0.2 * under(lids[0], u, v) + 0.16 * under(lids[1], u, v)) + (st.blush ? 0.07 : 0.02) * cheek(u, v, lids[0], 0.3)
      + 0.1 * wet(u - edge.far(v), 0.07, 0.03) * ss(bf[1] - 0.03, bf[1] + 0.08, v) * ss(0.2, -0.02, v) + 0.13 * wet(edge.near(v) - u, 0.12, 0.07) * ss(bn[1] - 0.06, bn[1] + 0.1, v) * ss(0.16, -0.08, v)
      + 0.04 * wing(u, v) + 0.13 * spot(u, v, [lerp(base[0], wn[0], 0.35), foot - 0.02], 0.1, 0.036, 0.1) + 0.05 * spot(u, v, [lerp(base[0], dip[0], 0.5) + 0.02, lerp(foot, dip[1], 0.5)], 0.04, 0.05) + 0.17 * lip(u, v) + 0.05 * spot(u, v, [chin[0] + 0.16, chin[1] - 0.03], 0.16, 0.05));
    // alone the earth is clay: with a breath of the warm ink in it, it is skin
    lay(st.earth, (u, v) => 0.85 * flesh(u, v), 0.2); lay(st.warm, (u, v) => 0.42 * flesh(u, v) + blush(u, v), 0.16);
  }
  // the hollow under the near cheekbone: crisp above, along the bone, and let out toward the mouth
  const bone = (u: number) => lerp(0.2, 0.36, ss(hinge[0], ml[0], u)), cheekbone = (u: number, v: number) => { const d = v - bone(u); return ss(-0.02, 0.02, d) * Math.exp(-((Math.max(0, d) / 0.12) ** 2)) * ss(ml[0] + 0.16, hinge[0] - 0.16, u) * ss(hinge[0] + 0.02, hinge[0] - 0.12, u); };
  lay(st.ink, (u, v) => st.shade * (0.025 * side(u, v) + (st.hollow > 0 ? 0.1 * st.hollow * cheekbone(u, v) : 0)
    // the colour on the lids is broken with grey: alone it is rouge, with grey it is shadow
    + 0.09 * over(lids[0], u, v) * ss(1, 0.3, along(lids[0], u)) + 0.16 * over(lids[1], u, v) * lerp(0.35, 1, ss(0, 0.4, along(lids[1], u))) + 0.06 * under(lids[0], u, v) + 0.06 * under(lids[1], u, v)
    // sockets: water set down at the brow's head and drawn round the hollow, soft toward the eye, sharper on the bridge; it lets go under the corner of the eye
    + 0.14 * wet(u - edge.far(v), 0.09, 0.036) * ss(bf[1] - 0.03, bf[1] + 0.08, v) * ss(0.125, -0.05, v) + 0.045 * spot(u, v, [fi[0] - 0.035, by + 0.105], 0.07, 0.036, 0.2)
    + 0.105 * wet(edge.near(v) - u, 0.095, 0.048) * ss(bn[1] - 0.03, bn[1] + 0.08, v) * ss(0.08, -0.08, v) + 0.045 * spot(u, v, [ni[0] + 0.05, by + 0.1], 0.085, 0.038, -0.2)
    // the bridge between root and tip is nearly bare: a breath on its far side, pressed again where the tip stands out
    + 0.045 * wet(u - edge.far(v), 0.034, 0.016) * ss(0, 0.1, v) * ss(tip[1] + 0.02, tip[1] - 0.08, v) + 0.05 * wet(u - edge.far(v), 0.026, 0.012) * bump(v, tip[1] - 0.03, 0.06)
    // the nose: the crease over the near wing, and the plane under the tip that runs on to the lip
    + (st.earth ? 0.03 : 0.1) * wing(u, v) + 0.07 * spot(u, v, [lerp(base[0], wn[0], 0.2), wn[1] + 0.012], 0.092, 0.034, 0.1)
    + st.underNose * 0.14 * ss(foot - 0.014, foot + 0.008, v) * (1 - ss(0.62, 1.08, Math.hypot((u - lerp(base[0], dip[0], 0.3) + 0.004) / 0.046, clamp(v - foot, 0, 1) / 0.078)))
    + 0.16 * spot(u, v, [ml[0] + 0.012, ml[1] + 0.03], 0.07, 0.018)), 0.16);
}

/** One soft wet shape, pale at the head, loaded past its middle, drawn to a point; then the hairs' own direction, barely seen. */
function brow({ f, w, st, seed }: Hand, head: InkHead, which: "near" | "far"): void {
  const b = head.brows[which], up = inkSpline(b.upper, 0.5), lo = inkSpline(b.lower, 0.5), tail = b.mid[b.mid.length - 1], a = head.local(b.mid[0]), z = head.local(tail);
  const along = (X: number, Y: number) => { const [u] = head.local(f.local(X, Y)); return clamp((u - a[0]) / (z[0] - a[0])); }, n = (pts: number[][], t: number) => pts[Math.round(clamp(t) * (pts.length - 1))] as unknown as P;
  const lay = (k: number, tone: (t: number) => number, soft: (t: number) => number, plate = st.ink) => inkBloom(f, plate, f.shape([...b.upper.map((q, i) => mix(b.mid[i] as P, q as P, k)), [tail[0], tail[1]] as P, ...[...b.lower].reverse().map((q, i) => mix(b.mid[b.lower.length - 1 - i] as P, q as P, k))]), { tone: (X, Y) => st.brow * tone(along(X, Y)), soft: (X, Y) => w(soft(along(X, Y))), wander: 0, fringe: w(0.25), rim: 0, mottle: 0.12, cloud: w(12), seed: seed() });
  // where the ink has gathered: far along a soft brow, at once in a loaded one
  const B = st.browHead, g = (v: number) => v * (1 - B) + 0.06 * B, wet0 = (v: number, u: number) => lerp(v, u, B);
  const black = st.earth ? 1 - 0.55 * clamp(st.warmLine) * st.browWarm : 1;
  if (st.earth) lay(1.16, t => st.browWarm * (0.4 + 0.75 * ss(0, g(0.4), t)), t => lerp(wet0(8, 4), 3, ss(0, g(0.4), t)), st.earth);
  lay(1.2, t => black * (0.1 + 0.3 * ss(0, g(0.36), t)), t => lerp(wet0(6, 3.2), 2.6, ss(0, g(0.4), t)));
  lay(0.8, t => black * (0.14 + 0.56 * ss(0, g(0.4), t) + 0.16 * ss(g(0.4), g(0.7), t)), t => lerp(wet0(5, 2.2), 1.5, ss(0, g(0.36), t)));
  const id = seed(), N = 26;
  for (let i = 0; i < N; i++) {
    const t = 0.04 + 0.8 * (i + inkHash2(id, i, 0)) / N, e = 0.2 + 0.6 * inkHash2(id, i, 1), p = mix(n(lo, t), n(up, t), e * 0.8), q = mix(n(lo, t + 0.16), n(up, t + 0.16), clamp(e + lerp(0.36, -0.4, t))), l = lerp(0.7, 1, inkHash2(id, i, 2));
    inkThread(f, st.ink, [[p[0], p[1], 0.2], [lerp(p[0], q[0], 0.5 * l), lerp(p[1], q[1], 0.5 * l), 0.8], [lerp(p[0], q[0], l), lerp(p[1], q[1], l), 0.02]], w(0.9 + 0.5 * B), { ink: black * st.brow * lerp(0.1 + 0.5 * B, 0.4 + 0.5 * B, ss(0.04, 0.5, t)), inkEnd: 0.1, seed: seed() });
  }
}

function eye({ f, w, st, seed, thread }: Hand, head: InkHead, which: "near" | "far"): void {
  const e = head.eyes[which], near = which === "near", K = st.ink, S = head.span, dir = e.dir, n = e.upper.length - 1, up = inkSpline(e.upper, 0.35) as number[][], lo = inkSpline(e.lower, 0.35) as number[][], white = [...up, ...[...lo].reverse()].map(p => f.at(p[0], p[1])), T = (x: number) => x * S;
  // the pupils' line from left to right on the page, whichever way the head is turned
  const R = head.nearSide === "L" ? 1 : -1, roll = Math.atan2(R * (head.face(1, 0)[1] - head.face(0, 0)[1]), R * (head.face(1, 0)[0] - head.face(0, 0)[0])), dx: P = [Math.cos(roll), Math.sin(roll)], dy: P = [-dx[1], dx[0]], mv = (q: PenPoint, a: number, b: number): P => [q[0] + T(a) * dx[0] * dir + T(b) * dy[0], q[1] + T(a) * dx[1] * dir + T(b) * dy[1]];
  f.knock(white);
  const inside = (plate: string, tone: (x: number, y: number) => number) => inkBloom(f, plate, white, { tone: (X, Y) => { const [x, y] = f.local(X, Y); return tone(x, y); }, soft: 0.6, wander: 0, fringe: 0, rim: 0, mottle: 0, seed: seed() });
  const lidY = (x: number) => { let b = 0, k = 1e9; for (const p of up) if (Math.abs(p[0] - x) < k) { k = Math.abs(p[0] - x); b = p[1]; } return b; };
  const [cx, cy] = e.iris, id = seed(), inner = e.upper[0];
  // the white is a ball: pale grey under the lid and in the corner, the rest left to the paper
  inside(K, (x, y) => 0.3 * ss(T(0.05), T(0.006), y - lidY(x)) + 0.08 * ss(T(0.08), 0, Math.abs(x - inner[0])) + 0.02);
  inside(st.warm, x => 0.14 * ss(T(0.05), 0, Math.abs(x - inner[0])));
  // in a skin with earth in it the white is never white: it takes the lid's warmth under the lid, and more of it as the ball turns away into both corners
  if (st.earth) {
    const wide = Math.abs(e.upper[n][0] - inner[0]), turn = (x: number) => { const t = Math.abs(x - inner[0]) / wide; return 0.9 * ss(0.2, 0.02, t) + ss(0.7, 1, t); };
    inside(st.earth, (x, y) => 0.03 + 0.08 * ss(T(0.1), 0, y - lidY(x)) + 0.15 * turn(x)); inside(st.warm, x => 0.1 * turn(x)); inside(K, x => 0.05 * turn(x));
  }
  inside(st.warm, (x, y) => { const r = Math.hypot((x - cx) / e.rx, (y - cy) / e.ry), v = (y - cy) / e.ry; return 0.2 * st.rouge * ss(-0.5, 0.6, v) * ss(0.98, 0.84, r) * ss(0.4, 0.56, r); });
  inside(K, (x, y) => {
    const a = Math.atan2((y - cy) / e.ry, (x - cx) / e.rx), r = Math.hypot((x - cx) / e.rx, (y - cy) / e.ry) * (1 + 0.04 * (inkNoise2(id, Math.cos(a) * 1.6 + 4, Math.sin(a) * 1.6 + 4) - 0.5)), v = (y - cy) / e.ry;
    if (r > 1.06) return 0;
    const glow = spot(x, y, [cx + dir * 0.08 * e.rx, cy + 0.56 * e.ry], e.rx * 0.6, e.ry * 0.3), body = lerp(0.97, 0.86, ss(-0.4, 0.5, v)) * (0.94 + 0.1 * inkNoise2(id + 2, a * 5, r * 1.2)) * (1 - 0.3 * glow);
    // a pale iris is one wet dab: dark where the lid shades it, let down at its foot, and the pupil runs up into the shade
    if (st.iris < 1) {
      const pale = st.iris * lerp(0.55, 2.1, ss(0.6, -0.75, v)) * (0.82 + 0.36 * inkNoise2(id + 6, x / T(0.01), y / T(0.016))) * (1 - 0.34 * spot(x, y, [cx + dir * 0.4 * e.rx, cy + 0.4 * e.ry], 0.5 * e.rx, 0.4 * e.ry)) * (1 + 0.1 * ss(0.55, 0.9, inkNoise2(id + 7, a * 7, r * 0.6)));
      return clamp(Math.max(pale, lerp(st.iris, 0.97, 0.5) * ss(0.6, 0.98, r) * lerp(1, 0.6, ss(0, 0.9, v)), 0.97 * ss(0.6, 0.24, Math.hypot((x - cx) / e.rx, (y - cy) / e.ry + 0.08)), 0.92 * ss(T(0.1), T(0.016), y - lidY(x)))) * ss(1.06, 0.88, r);
    }
    return clamp(Math.max(body, 0.97 * ss(0.74, 0.95, r), 0.98 * ss(0.58, 0.46, r), 0.98 * ss(T(0.056), T(0.02), y - lidY(x)))) * ss(1.04, 0.95, r);
  });
  if (st.iris < 1 && st.earth) inside(st.earth, (x, y) => { const r = Math.hypot((x - cx) / e.rx, (y - cy) / e.ry); return 0.34 * st.browWarm * ss(1.02, 0.9, r); });
  const glint = st.earth ? [K, st.earth] : [K], lit = (x: number, y: number) => !st.earth || y > lidY(x) + T(0.01);
  // the light in it: one small touch of paper by the pupil, and two flicks of a dry brush round the pupil's foot, one long and one short
  const ring = (a0: number, a1: number, k: number, wd: number) => f.lift(Array.from({ length: 7 }, (_, i) => { const t = i / 6, a = lerp(a0, a1, t) * Math.PI / 180; return [cx + k * e.rx * Math.cos(a), cy + k * e.ry * Math.sin(a), Math.sin(Math.PI * lerp(0.04, 0.98, t)) ** 1.2] as const; }), w(wd), [K, st.warm]);
  if (lit(cx - 0.33 * e.rx, cy - 0.13 * e.ry)) f.lift([[cx - 0.36 * e.rx, cy - 0.04 * e.ry, 0.6], [cx - 0.33 * e.rx, cy - 0.13 * e.ry, 1], [cx - 0.26 * e.rx, cy - 0.18 * e.ry, 0.5]], w(near ? 2.3 : 2.1), glint);
  if (st.iris < 1) { if (lit(cx + 0.22 * e.rx, cy - 0.28 * e.ry)) f.lift([[cx + 0.2 * e.rx, cy - 0.2 * e.ry, 0.6], [cx + 0.22 * e.rx, cy - 0.28 * e.ry, 1], [cx + 0.25 * e.rx, cy - 0.33 * e.ry, 0.4]], w(near ? 1.5 : 1.4), glint); }
  else { ring(170, 108, 0.72, near ? 1.15 : 1.05); ring(38, 16, 0.6, near ? 0.9 : 0.8); }
  // Upper lid: the strongest mark of the face. A point inside the corner by the nose, thicker all the way out, a point past the outer corner.
  const over = e.line.slice(1) as P[], under: P[] = [...e.upper.map((q, i) => mv(q, 0, i ? 0.005 : 0.001)), ...e.wing.slice(1).map(q => [q[0], q[1]] as const)], m = over.length - 1;
  inkBloom(f, K, f.shape([e.line[0], ...over, ...[...under].reverse()]), { tone: (X, Y) => { const [x, y] = f.local(X, Y); return (0.98 - 0.05 * ss(0.5, 1, inkNoise2(id + 5, x / T(0.08), y / T(0.02)))) * (st.earth ? lerp(0.62, 1, ss(T(0.01), T(0.12), Math.abs(x - inner[0]))) * lerp(1, 0.42, ss(T(-0.02), T(0.1), (x - e.upper[n][0]) * dir)) : 1); }, soft: st.earth ? w(1) : 0.6, wander: st.earth ? 0 : 0.2, wave: 12, fringe: st.earth ? 0 : 0.3, rim: 0, mottle: 0.04, seed: seed() });
  // A lash leaves along the lid and turns away from it: long and swept at the outer corner, short further in.
  const lash = (from: P, a: number, b: number, wd: number, ink = 0.95) => inkThread(f, K, [[from[0], from[1], 0.3], [...mv(from, a * 0.18, b * 0.07), 0.95], [...mv(from, a * 0.4, b * 0.2), 0.84], [...mv(from, a * 0.72, b * 0.52), 0.5], [...mv(from, a, b), 0.02]], w(wd), { ink, inkEnd: ink * 0.8, seed: seed() });
  for (let i = 0; i < st.lashes; i++) { const g = i / Math.max(1, st.lashes - 1), t = 0.78 + 0.28 * g, j = Math.min(m - 1, t * n), k = Math.floor(j), q = mix(mix(under[k], under[k + 1], j % 1), mix(over[k], over[k + 1], j % 1), 0.8), l = st.lashSize * (near ? 1 : 0.84) * lerp(0.052, 0.1, ss(0, 0.8, g)) * (0.88 + 0.12 * inkHash2(id, i, 3)); lash(q, l * lerp(0.82, 1, g), -l * lerp(0.5, 0.3, g), 1.5); }
  // Lower lid: lost at the pupil, found again toward the corner, where the lashes lengthen.
  thread(press([...e.lower.slice(1), ...e.wing.slice(1, 3)], t => 0.14 + 0.3 * ss(0, 0.3, t) + 0.6 * ss(0.36, 0.76, t) - 0.9 * ss(0.8, 1, t)), w(2.3 * lerp(0.5, 1, st.lowerLid)), { tone: t => st.lowerLid * (0.3 + 0.67 * ss(0.12, 0.62, t)), seed: seed() });
  const N = Math.round(st.lowerLid >= 1 ? (near ? 11 : 10) : 0);
  for (let i = 0; i < N; i++) { const g = i / (N - 1), t = 0.5 + 0.48 * g + 0.02 * (inkHash2(id, i, 8) - 0.5), q = lo[Math.round(t * (lo.length - 1))], l = st.lashSize * (near ? 1 : 0.9) * (0.012 + 0.02 * ss(0, 0.7, g)) * lerp(0.7, 1.1, inkHash2(id, i, 9)); lash([q[0], q[1]], l * lerp(0.7, 1.4, g), l * lerp(0.9, 0.6, g), lerp(1, 1.4, g), lerp(0.42, 0.78, g)); }
  // The fold: one thin short line, well clear of the lid's.
  const fold = press(e.crease, t => 0.06 + 0.94 * Math.sin(Math.PI * Math.min(1, 0.06 + 0.86 * t)) ** 0.8);
  inkThread(f, st.warm, fold, w(1.2), { ink: 0.16 * st.rouge, mid: 0.2 * st.rouge, inkEnd: 0.12 * st.rouge, seed: seed() });
  thread(fold, w(1.2), { ink: 0.26 * st.fold, mid: 0.44 * st.fold, inkEnd: 0.24 * st.fold, seed: seed() });
  // a red line that rides on the lid's own, a hair above it, and runs on past the corner
  if (st.liner > 0) {
    const ends = [1, 3, 4, 5, 6, 7, 8, m - 1], ride: N[] = [...ends.map((j, i) => { const t = i / ends.length; return [...mv(over[j], 0, -0.013 - 0.005 * Math.sin(Math.PI * t)), 0.1 + 0.6 * ss(0, 0.4, t) + 0.3 * ss(0.5, 0.9, t)] as unknown as N; }), [...mv(over[m], near ? 0.03 : 0, -0.006), 0.04] as unknown as N];
    inkBloom(f, st.warm, inkBlob(f, ride.map(q => [q[0], q[1], w(0.5 + 1.1 * q[2])] as const)), { tone: 0.12 * st.liner, soft: w(2.4), wander: 0, fringe: 0, rim: 0, mottle: 0.2, seed: seed() });
    inkThread(f, st.warm, ride, w(1.7), { tone: t => st.liner * (0.34 + 0.42 * ss(0.1, 0.6, t)), seed: seed() });
    if (st.earth) inkThread(f, st.earth, ride, w(1.5), { tone: t => 0.5 * st.liner * (0.4 + 0.5 * ss(0.1, 0.6, t)), seed: seed() });
    inkThread(f, st.warm, press(e.lower.slice(5), t => 0.2 + 0.8 * t), w(1.5), { tone: t => 0.6 * st.liner * t, seed: seed() });
  }
}

/**
 * Two nostrils, the soft edge at the foot of the nose between them, and one short line where the tip stands against the far cheek.
 * The far nostril is a wedge, pressed on its outer side and let out toward the foot; the near one an open arch of one thickness. The
 * bridge is the light between two sockets: no line is drawn down it.
 */
function nose({ f, w, st, seed, thread }: Hand, head: InkHead): void {
  const K = st.ink, N0 = head.nose, L = (q: PenPoint) => head.local(q), B = L(N0.base), fw = L(N0.wingFar[2]), nw = L(N0.wingNear[2]), q = (u: number, v: number, p: number): N => [...head.face(u, v), p] as unknown as N;
  const vb = Math.max(fw[1], nw[1]) + 0.056, n = (t: number) => lerp(B[0], nw[0], t), c = (t: number) => lerp(fw[0], B[0], t);
  const fine = st.earth ? 1 - 0.4 * st.warmLine : 1, black = st.earth ? 0.95 - 0.5 * st.warmLine : 0.95, line = (pts: readonly N[], width: number) => { if (st.earth) f.line(st.earth, pts, width * 1.15, { ink: 0.95, rough: 0.14, bristles: 4 }); f.line(K, pts, width, { ink: black, rough: 0.14, bristles: 4 }); };
  const e = bridge(head, st.straight, st.noseTip), on = (v: number, p: number) => q(e.far(v), v, p);
  // in a warm hand the bridge, the tip and the foot of the nose are one thin stroke
  const tip = L(N0.tip), tu = e.far(tip[1]), tv = tip[1], far = st.earth ? st.noseTip : 0;
  if (far > 0) thread([on(-0.02, 0.02), on(0.05, 0.4), on(0.5 * tv, 0.46), on(0.76 * tv, 0.58), on(tv - 0.03, 0.84), q(tu, tv + 0.002, 1), q(tu + 0.011, tv + 0.024, 0.96), q(tu + 0.04, tv + 0.041, 0.8), q(tu + 0.078, tv + 0.053, 0.7), q(lerp(tu + 0.112, c(0.82), 0.3), lerp(tv + 0.078, vb + 0.004, 0.3), 0.5), q(c(0.96), vb, 0.02)], w(1.6), { tone: t => lerp(0.24 * st.bridge, 0.9, ss(0.3, 0.66, t)), seed: seed() });
  else if (st.earth) thread([on(-0.02, 0.02), on(0.05, 0.4), on(fw[1] - 0.2, 0.46), on(fw[1] - 0.12, 0.56), on(fw[1] - 0.06, 0.6), on(fw[1] - 0.02, 0.74), q(fw[0] + 0.002, fw[1] + 0.012, 0.86), q(c(0.13), fw[1] + 0.028, 0.66), q(c(0.34), vb - 0.012, 0.5), q(c(0.6), vb + 0.004, 0.5), q(c(0.82), vb + 0.012, 0.6), q(c(0.98), vb + 0.008, 0.02)], w(1.6), { tone: t => lerp(0.24 * st.bridge, 0.9, ss(0.3, 0.66, t)), seed: seed() });
  else line([q(c(0.16), fw[1] + 0.018, 0.2), q(c(0.26), fw[1] + 0.034, 1), q(c(0.44), vb - 0.012, 0.8), q(c(0.66), vb + 0.004, 0.34), q(c(0.84), vb + 0.016, 0.03)], w(2.4 * fine));
  const hole = (t: number, v: number, p: number) => q(n(lerp(t, 0.5, 0.2 * far)) - 0.04 * far, vb + v * (1 - 0.6 * far) - 0.03 * far, p * (st.earth ? 0.66 : 1));
  line([hole(0.27, -0.005, 0.34), hole(0.32, -0.0135, 0.62), hole(0.42, -0.0215, 0.84), hole(0.54, -0.0225, 0.94), hole(0.67, -0.0155, 1), hole(0.765, -0.003, 0.8), hole(0.79, 0.003, 0.4)], w(2.05 * fine));
  if (st.earth) return;
  thread([q(c(0.78), vb + 0.012, 0.02), q(c(0.92), vb + 0.018, 0.8), q(n(0.02), vb + 0.02, 1), q(n(0.14), vb + 0.016, 0.02)], w(1.2), { ink: 0.22, seed: seed() });
  thread([on(fw[1] - 0.112, 0.02), on(fw[1] - 0.08, 0.4), on(fw[1] - 0.045, 0.85), on(fw[1] - 0.01, 1), q(fw[0] - 0.001, fw[1] + 0.01, 0.9), q(c(0.14), fw[1] + 0.022, 0.5), q(c(0.24), fw[1] + 0.03, 0.06)], w(1.6), { ink: 0.03, mid: 0.28, inkEnd: 0.42, seed: seed() });
  if (st.bridge > 0) thread([on(-0.04, 0.02), on(0, 0.5), on(0.05, 0.75), on(fw[1] - 0.2, 0.7), on(fw[1] - 0.12, 0.85), on(fw[1] - 0.06, 1), on(fw[1] - 0.02, 0.9), q(fw[0] + 0.002, fw[1] + 0.012, 0.5), q(c(0.16), fw[1] + 0.024, 0.05)], w(2.1), { tone: t => st.bridge * (0.16 + 0.56 * ss(0.3, 0.8, t)), seed: seed() });
}

/** A bow with soft shoulders, deep where the lips meet; a fuller, paler lower lip that stops short of the corners; the parting pressed at its ends. */
function mouth({ f, w, st, seed, thread }: Hand, head: InkHead): void {
  const L = head.lips, L2 = (q: PenPoint) => head.local(q), turned = head.nearSide === "R", A = L2(L.line[turned ? 10 : 0]), Z = L2(L.line[turned ? 0 : 10]), C = L2(L.line[5]), dip = L2(L.upper[5]), low = L2(L.lower[5]), up = C[1] - dip[1], dn = low[1] - C[1], far = C[0] - A[0] > 0 ? 1 : -1;
  /** The corners come up, the near one more; the middle stays. */
  const lift = (t: number) => st.smile * up * (t * far > 0 ? 1.15 : 0.8) * t * t;
  const at = (t: number, v: number): P => { const c = t < 0 ? A : Z, k = Math.abs(t), q = head.face(lerp(C[0], c[0], k), lerp(C[1], c[1], k * k) - lift(t) + v); return [q[0], q[1]]; };
  // on a head turned far the dip would be carried over the far half of the bow: there it goes only part of the way
  const carry = 1 - 0.85 * clamp((Math.abs(head.yaw) - 20) / 5);
  const z0 = head.face(0, 0), q = (t: number, v: number): P => { const p = at(t, v), o = head.face((dip[0] - C[0]) * carry * (1 - Math.min(1, Math.abs(t) * 1.6)) * clamp(-v / up), 0); return [p[0] + o[0] - z0[0], p[1] + o[1] - z0[1]]; };
  const bow: P[] = ([[-0.9, 0.02], [-0.76, -0.24], [-0.58, -0.62], [-0.37, -1.02], [-0.22, -1.1], [-0.02, -0.88], [0.15, -1.08], [0.29, -1.06], [0.48, -0.7], [0.68, -0.3], [0.84, -0.06], [0.91, 0.02]] as const).map(([t, v]) => q(t, v * up));
  const part: P[] = ([[-1, 0], [-0.74, -0.03], [-0.42, -0.06], [-0.18, 0.03], [0, 0.07], [0.16, 0.03], [0.4, -0.05], [0.68, -0.03], [1, -0.06]] as const).map(([t, v]) => at(t, v * up * 1.3));
  const under: P[] = ([[0.84, 0.02], [0.7, 0.36], [0.52, 0.7], [0.32, 0.94], [0.1, 1.03], [-0.14, 1.03], [-0.38, 0.92], [-0.57, 0.66], [-0.72, 0.34], [-0.83, 0.04]] as const).map(([t, v]) => at(Math.sign(t) * Math.abs(t) ** (1 / (1 + 0.5 * st.lipFull)), v ** (1 / (1 + 0.4 * st.lipFull)) * dn * 0.96));
  const depth = (X: number, Y: number) => { const [u, v] = head.local(f.local(X, Y)), c = u < C[0] ? A : Z, t = (u - C[0]) / Math.abs(c[0] - C[0]); return [t, v - lerp(C[1], c[1], Math.min(1, t * t)) + lift(clamp(t, -1, 1))] as const; };
  const fill = (plate: string, pts: readonly PenPoint[], tone: (t: number, v: number) => number, soft = 1.6) => inkBloom(f, plate, f.shape(pts), { tone: (X, Y) => st.lip * Math.max(0, tone(...depth(X, Y))), soft: w(soft), wander: w(0.2), wave: w(16), fringe: 0, rim: 0, mottle: 0.08, cloud: w(14), seed: seed() });
  // rouge is dabbed where the lips meet and let out toward their edges
  const wet = st.earth ? 1 - 0.7 * st.lipSoft : 0, soft = st.lipSoft;
  fill(st.warm, [...bow, ...[...part].reverse()], (t, v) => (0.5 + 0.44 * ss(-1.1, -0.1, v / up) - 0.14 * ss(0.5, 1, Math.abs(t))) * (1 - 0.5 * soft * ss(-0.2, -1, v / up)) * (1 - 0.5 * soft * ss(0.3, 0.9, Math.abs(t))), lerp(0.9, 4, soft));
  const shine = (t: number, v: number) => Math.exp(-(((t + 0.06 * far) / lerp(0.36, 0.4, wet)) ** 2) - ((v / dn - lerp(0.5, 0.36, wet)) / lerp(0.15, 0.09, wet)) ** 2);
  fill(st.warm, [...part.slice(1, -1), ...under], (t, v) => (0.86 - lerp(0.44, 0.22, wet) * ss(0.04, 0.86, v / dn) - 0.2 * ss(0.4, 0.9, Math.abs(t))) * (1 - 0.46 * shine(t, v)) * (1 - 0.6 * soft * ss(0.3, 0.8, Math.abs(t - 0.1 * far))), lerp(lerp(1.4, 0.9, wet), 7, soft));
  fill(st.ink, [...bow, ...under], (t, v) => (st.earth ? 0.3 : 1) * 0.26 * Math.exp(-((v / (0.2 * up)) ** 2)) * ss(1, 0.7, Math.abs(t)) + 0.06 * Math.exp(-(((v / up + 0.5) / 0.6) ** 2)) * ss(0.2, 0.9, Math.abs(t)), 1.4);
  const parting = part.map((p, i) => { const t = i / (part.length - 1); return [p[0], p[1], 0.26 + 0.5 * bump(t, 0.1, 0.07) + 0.4 * bump(t, 0.48, 0.15) + 0.4 * bump(t, 0.9, 0.08) - 0.24 * ss(0.95, 1, t) - 0.22 * ss(0.05, 0, t)] as const; });
  if (st.earth) thread(parting.map(q => [q[0], q[1], q[2] * st.lipLine] as const), w(2.6), { tone: t => 0.72 + 0.26 * (bump(t, 0.06, 0.1) + bump(t, 0.94, 0.1)), seed: seed() });
  else f.line(st.ink, parting, w(2.4), { rough: 0.14, bristles: 4 });
  const k = head.face(C[0] + 0.01, low[1] + 0.026), g = head.span, R = turned ? -1 : 1;
  thread([[k[0] - 0.045 * g * R, k[1] + 0.006 * g, 0.02], [k[0], k[1] + 0.004 * g, 0.9], [k[0] + 0.05 * g * R, k[1] - 0.008 * g, 0.02]], w(1.8), { ink: st.earth ? 0.12 : 0.34, seed: seed() });
}

/** One stroke from under the hair at the far temple to the chin: present the whole way, easing over the cheekbone, pressed at the turn of the chin. Then the near jaw: at full strength from the chin to well past the mouth's corner, then out of ink before the jaw's own corner. */
function contour({ w, st, seed, thread }: Hand, head: InkHead): void {
  const far = pick(head.contour, 30), jaw = pick(head.jaw, head.earParts ? 64 : 40), [u, v] = head.local(far[0]), turn = head.local(jaw[0])[0], reach = turn + st.jaw * (head.local(jaw[jaw.length - 1])[0] - turn), run = jaw.slice(0, 1 + jaw.findIndex(q => head.local(q)[0] > reach));
  thread(press([head.face(u - 0.008, v - 0.08), ...far, ...jaw.slice(1, 5)], t => 0.03 + 0.42 * ss(0, 0.14, t) + 0.08 * bump(t, 0.2, 0.12) + 0.26 * ss(0.42, 0.68, t) - 0.08 * ss(0.8, 0.9, t) - 0.12 * ss(0.9, 1, t)), w(3.6 * st.contour), { ink: 0.82, mid: 0.9, inkEnd: 0.94, seed: seed() });
  // the jaw of a head whose side is seen runs on to the lobe: full along its foot, eased over the corner, thin where it meets the ear
  if (head.earParts) {
    const way = jaw.map((_, i) => (i ? Math.hypot(jaw[i][0] - jaw[i - 1][0], jaw[i][1] - jaw[i - 1][1]) : 0)), all = way.reduce((a, b) => a + b, 0), s = way.reduce<number[]>((a, b) => [...a, (a[a.length - 1] ?? 0) + b / all], []), end = clamp(st.jaw, 0.2, 1), to = jaw.filter((_, i) => s[i] <= end + 1e-6), share = s.filter(q => q <= end + 1e-6);
    thread(to.map((q, i) => { const t = share[i]; return [q[0], q[1], (0.5 + 0.5 * ss(0.03, 0.22, t) - 0.16 * ss(0.5, 0.64, t) - 0.42 * ss(0.6, 0.94, t)) * (1 - 0.94 * ss(end - 0.06, end, t) * (end < 1 ? 1 : 0.3))] as const; }), w(3.3 * st.contour), { tone: t => 0.95 - 0.16 * ss(0.6, 1, t), seed: seed() });
    return;
  }
  // a line drawn past the default run keeps its ink up to the corner of the jaw
  const hold = 0.3 * clamp((st.jaw - 0.78) / 0.2);
  thread(press(run, t => 0.5 + 0.5 * ss(0.04, 0.3, t) - 0.14 * ss(0.5 + hold, 0.7 + hold, t) - 0.5 * ss(0.7 + 0.9 * hold, 1, t)), w(3.3 * st.contour), { tone: t => 0.94 * (1 - ss(0.6 + hold, 0.98, t)) + 0.02, seed: seed() });
}

/** An ear seen from the side: water pooled in the bowl, warm on the lobe and the rim; one stroke round the rim, a thin one inside it, and the fold, which gathers its ink at the notch over the lobe. */
function sideEar({ f, w, d, st, seed, thread }: Hand, head: InkHead, parts: NonNullable<InkHead["earParts"]>): PenPoint {
  const E = head.ear, outer = E.slice(0, E.length - 3), lobe = E.reduce((a, q) => (q[1] > a[1] ? q : a)), fold = parts.fold, notch = fold[fold.length - 1], u = Math.hypot(notch[0] - fold[0][0], notch[1] - fold[0][1]);
  const ear = f.shape([...pick(outer, 40), ...E.slice(E.length - 3)]), bowl = f.shape(inkSpline(parts.bowl, 0.6).map(q => [q[0], q[1]] as const)), down = (X: number, Y: number) => { const [x, y] = f.local(X, Y); return clamp(1 - Math.hypot(x - notch[0], y - notch[1]) / (0.9 * u)); };
  // toward the cheek the ear has no edge: its water runs out there
  const front = [parts.join, ...E.slice(-3), E[0]], open = (x: number, y: number) => Math.min(...front.slice(1).map((b, i) => { const a = front[i], l = (b[0] - a[0]) ** 2 + (b[1] - a[1]) ** 2, k = clamp(((x - a[0]) * (b[0] - a[0]) + (y - a[1]) * (b[1] - a[1])) / l); return Math.hypot(x - lerp(a[0], b[0], k), y - lerp(a[1], b[1], k)); }));
  f.knock(ear);
  // skin thin enough for the light to come through: the lobe, the rim, the bowl
  inkBloom(f, st.warm, ear, { tone: (X, Y) => { const [x, y] = f.local(X, Y); return st.rouge * lerp(st.earth ? 0.7 : 0, 1, ss(0, 0.3 * u, open(x, y))) * (0.05 + 0.15 * spot(x, y, off(lobe, 0, -0.25 * u), 0.5 * u, 0.5 * u) + 0.1 * spot(x, y, fold[Math.round(fold.length * 0.4)], 0.5 * u, 0.7 * u)); }, soft: 1, wander: 0, fringe: 0, rim: 0.24, rimWidth: w(5), mottle: 0.36, cloud: w(12), seed: seed() });
  if (st.earth) inkBloom(f, st.earth, ear, { tone: (X, Y) => { const [x, y] = f.local(X, Y); return st.flesh * lerp(0.66, 1, ss(0, 0.3 * u, open(x, y))) * (0.13 + 0.16 * spot(x, y, fold[Math.round(fold.length * 0.5)], 0.45 * u, 0.6 * u)); }, soft: 1, wander: 0, fringe: 0, rim: 0.3, rimWidth: w(5), mottle: 0.3, cloud: w(12), seed: seed() });
  // the bowl: clear above, dark where it runs out under the flap
  inkBloom(f, st.warm, bowl, { tone: (X, Y) => st.rouge * lerp(0.08, 0.3 * Math.min(1, st.bowl), ss(0, 1, down(X, Y))), soft: w(1.2), wander: w(0.3), fringe: 0, rim: 0.2, mottle: 0.3, cloud: w(10), seed: seed() });
  inkBloom(f, st.ink, bowl, { tone: (X, Y) => { const t = down(X, Y); return st.bowl * (0.02 + 0.16 * ss(0, 0.7, t) + 0.3 * ss(0.55, 1, t)); }, soft: w(1.2), wander: w(0.3), fringe: 0, rim: 0.24, rimWidth: w(3), mottle: 0.3, cloud: w(10), seed: seed() });
  // the hollow under the rim
  inkSide(f, st.ink, press(pick(parts.rim, 14), t => 0.1 + 0.9 * Math.sin(Math.PI * t) ** 0.8), w(5), { tip: 0.16, belly: 0.02, side: d > 0 ? -1 : 1, head: 0, rim: 0, bleed: w(1), seed: seed() });
  thread(press(pick(outer, 32), t => 0.01 + 0.65 * ss(0.05, 0.22, t) + 0.24 * bump(t, 0.36, 0.14) + 0.34 * bump(t, 0.82, 0.12) - 0.5 * ss(0.9, 1, t)), w(2.8 * st.contour), { ink: 0.9, mid: 0.9, inkEnd: 0.8, seed: seed() });
  thread(press(pick(parts.rim, 18), t => 0.06 + 0.9 * ss(0, 0.2, t) - 0.9 * ss(0.5, 1, t)), w(2.1), { ink: 0.7, mid: 0.64, inkEnd: 0.4, seed: seed() });
  thread(press(pick(fold, 18), t => 0.05 + 0.5 * ss(0, 0.3, t) + 0.5 * bump(t, 0.86, 0.14) - 0.5 * ss(0.94, 1, t)), w(2.4), { ink: 0.5, mid: 0.7, inkEnd: 0.92, seed: seed() });
  thread(press(pick(parts.flap, 12), t => 0.05 + 0.5 * Math.sin(Math.PI * Math.min(1, t * 1.05)) + 0.4 * bump(t, 0.86, 0.14)), w(1.9), { ink: 0.5, mid: 0.6, inkEnd: 0.86, seed: seed() });
  return lobe;
}

/** The near ear: a warm water, one stroke round the rim, two for the fold inside. A head posed with `side` has its ear drawn in full. */
export function paintInkEar(f: InkRisoPen, head: InkHead, style: InkFaceStyle): PenPoint {
  const h = hand(f, head, { ...style, seed: (style.seed ?? 0) + 3 }), { z, w, d, st, seed } = h, E = head.ear;
  if (head.earParts) return sideEar(h, head, head.earParts);
  const r = head.earRidge, ear = f.shape(pick(E, 26)), lobe = E.reduce((a, q) => (q[1] > a[1] ? q : a));
  f.knock(ear);
  inkBloom(f, st.warm, ear, { tone: (X, Y) => { const [x, y] = f.local(X, Y); return st.rouge * (0.04 + 0.13 * spot(x, y, off(lobe, 0, -4 * z), 7 * z, 8 * z)); }, soft: 1, wander: 0, fringe: 0, rim: 0.2, mottle: 0.36, cloud: w(10), seed: seed() });
  inkSide(f, st.ink, [[...off(r[1], -d * 1.2 * z, 1.6 * z), 0.3], [...off(r[2], -d * 1.2 * z, 0), 1], [...off(r[3], -d * 1.4 * z, 0), 0.8], [...off(r[4], -d * 0.4 * z, -1.4 * z), 0.1]], w(7), { tip: 0.24, belly: 0.02, side: d > 0 ? 1 : -1, head: 0, rim: 0, bleed: w(1.4), seed: seed() });
  inkThread(f, st.ink, press(pick(E.slice(0, Math.round(E.length * 0.92)), 18), t => 0.2 + 0.6 * ss(0, 0.2, t) + 0.36 * bump(t, 0.72, 0.16) - 0.8 * ss(0.84, 1, t)), w(1.7), { ink: 0.8, mid: 0.8, inkEnd: 0.5, seed: seed() });
  inkThread(f, st.ink, press(r, t => 0.05 + 0.9 * Math.sin(Math.PI * t)), w(1.8), { ink: 0.5, seed: seed() });
  inkThread(f, st.ink, [[...off(mix(r[0], r[4], 0.3), -d * 4.5 * z, 0), 0.05], [...off(mix(r[1], r[4], 0.34), -d * 4 * z, 0), 0.8], [...off(mix(r[2], r[4], 0.4), -d * 2.6 * z, 0.6 * z), 0.9], [...off(mix(r[2], r[4], 0.7), -d * 4.4 * z, z), 0.05]], w(1.5), { ink: 0.55, seed: seed() });
  return lobe;
}

/** A drop earring in brush marks: hook, bead, a wet drop with its paper light, and a tassel of dry flicks. */
export function paintInkEarring(f: InkRisoPen, at: PenPoint, o: { ink: string; jewel: string; warm: string; size?: number; sway?: number; seed: number }): void {
  const a = f.at(0, 0), b = f.at(1, 0), k = o.size ?? 1, w = (v: number) => v * k * Math.hypot(b[0] - a[0], b[1] - a[1]) / 2.1, sway = o.sway ?? 0;
  const q = (x: number, y: number, p: number): N => [at[0] + k * (x + sway * y), at[1] + k * y, p];
  f.line(o.ink, [q(0, -3, 0.5), q(0.4, 0, 0.9), q(0, 4, 0.5)], w(1.3), { rough: 0.2, bristles: 3 });
  inkDab(f, o.ink, [q(-0.2, 5.6, 1.5 * k), q(0.2, 6.1, 1.6 * k)], { tone: 0.95, seed: o.seed });
  f.line(o.ink, [q(0, 7.6, 0.7), q(0.2, 11, 0.6)], w(1.2), { rough: 0.2, bristles: 3 });
  inkDab(f, o.jewel, [q(0, 11.6, 0.6 * k), q(0.06, 14, 1.6 * k), q(0.04, 17, 2.9 * k), q(0, 19, 3.1 * k), q(-0.04, 20.6, 2.5 * k)], { tone: 0.62, foot: 1, light: [q(-0.9, 15.2, 0.1), q(-1.6, 17.6, 1), q(-1.4, 19.6, 0.1)], lightWidth: w(1.8), seed: o.seed + 1 });
  inkDab(f, o.ink, [q(-0.2, 24.2, 1 * k), q(0.2, 24.5, 1.1 * k)], { tone: 0.95, seed: o.seed + 2 });
  for (let i = 0; i < 5; i++) { const v = (i - 2) / 2, l = 12 + 5 * inkHash2(o.seed, i, 0); f.line(o.warm, [q(0.2 * v, 25.4, 0.8), q(0.9 * v, 25.4 + l * 0.5, 1), q(1.5 * v + 0.5, 25.4 + l, 0.04)], w(1.5), { dry: 0.1, dryEnd: 0.8, rough: 0.3, bristles: 3 }); }
}
