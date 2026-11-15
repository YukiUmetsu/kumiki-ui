/**
 * UKIYO1 faces: features, expressions and the variety that tells one face from another, after Kitagawa Utamaro's bust
 * portraits — *A Young Woman Reading a Letter* (Met 36626, CC0) and *Okita of the Naniwa-ya Teahouse* (Met 55867, CC0)
 * — and his *Hanaōgi of the Gomeirō* (Met 53654, CC0).
 *
 * What the prints show, and what is drawn here:
 * - The face is cut with the finest line on the block: the outline is a hair line, never a heavy stroke.
 * - A woman's eyes are long and narrow, a single upper-lid line lifting a little at the outer end, a small black iris
 *   hanging from it; almost no lower lid. Her brows are soft grey smudges set high, darker at the lower edge. The nose,
 *   seen three-quarters, is one fine line ending in a small hook. The mouth is tiny: a red upper lip shaped like a low
 *   M, a fuller lower lip, a dark line where they part. A touch of rouge sits at the outer corner of the eye.
 * - The hairline is drawn as hundreds of combed strands (kewari), so the hair fades into the skin instead of ending in an
 *   edge; the hair mass carries fine lines of sheen.
 * - Men's brows are darker and heavier; their eyes shorter. Age adds lines at the brow, the eye and the cheek.
 *
 * Expressions (`emote` action, blended like any action): smile, laugh, sad, cry, surprise, angry, fear, shy — brows
 * tilt and lift, lids curve, lower or open, the iris hides or shows, the mouth turns up, down or opens, tears run, the
 * cheeks colour. Kept within the prints' restraint.
 *
 * Face traits (`look.features`) — eye, brow, nose, mouth, jaw, age, mole — default from a hash of the look itself, so a
 * character keeps one face in every shot while the people of a crowd all differ.
 */
import type { Pt } from "./ukiyoe-core";
import { carvedLine, clamp01, hash01, lerp, smoothD } from "./ukiyoe-core";
import type { Prim } from "./ukiyoe-prims";
import { circleD, ellipseD } from "./ukiyoe-prims";
import type { UkiyoePaint } from "./ukiyoe-pigments";

type Map2 = (x: number, y: number) => Pt;
const f1 = (n: number) => n.toFixed(1);

export type UkiyoeMood = "smile" | "laugh" | "sad" | "cry" | "surprise" | "angry" | "fear" | "shy";
export const UKIYOE_MOODS: readonly UkiyoeMood[] = ["smile", "laugh", "sad", "cry", "surprise", "angry", "fear", "shy"];
/** Expression weights (0–1), carried on the figure pose. */
export interface FaceMoods { smile: number; laugh: number; sad: number; cry: number; surprise: number; angry: number; fear: number; shy: number }
export const NO_MOOD: FaceMoods = { smile: 0, laugh: 0, sad: 0, cry: 0, surprise: 0, angry: 0, fear: 0, shy: 0 };

/** Facial traits; any left out are chosen from the look's hash. */
export interface UkiyoeFaceFeatures {
  /** Eye length and set: long narrow (the bijin eye), almond, round, heavy-lidded. */
  eye?: "narrow" | "almond" | "round" | "heavy";
  brow?: "thin" | "soft" | "arched" | "straight" | "bushy";
  nose?: "small" | "straight" | "long" | "hooked" | "broad";
  mouth?: "small" | "wide" | "full";
  jaw?: "oval" | "round" | "square" | "long";
  /** 0 young → 1 old: lines at the brow, eye and cheek. */
  age?: number;
  mole?: boolean;
}
export interface FaceTraits { eye: number; eyeTilt: number; browW: number; browArch: number; browTilt: number; nose: number; hook: number; mouth: number; jaw: number; chin: number; age: number; mole: boolean; female: boolean }

/**
 * A stable number for a look's identity: hair, build, skin and the main robe and sash — not the view, props, hats or
 * other changeable things, so the face stays the same when a character turns, picks something up or puts on a cloak.
 */
function lookHash(look: object): number {
  const l = look as Record<string, unknown>;
  const s = JSON.stringify([l.hair, l.hairColor, l.build, l.skin, l.beard, l.robe, l.robePattern, l.obi, l.under, l.lower, l.face]);
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

/** Resolve the traits for a look (explicit features win, the rest from the look's hash, women toward the bijin ideal). */
export function faceTraits(look: object & { features?: UkiyoeFaceFeatures; hair?: string; beard?: boolean }, female: boolean): FaceTraits {
  const f = look.features ?? {}, s = lookHash(look) % 100000, r = (i: number) => hash01(s, i, 7);
  const elder = look.hair === "elder";
  const eye = f.eye === "narrow" ? 1.15 : f.eye === "almond" ? 1 : f.eye === "round" ? .82 : f.eye === "heavy" ? .95 : female ? 1.08 + r(1) * .1 : .85 + r(1) * .25;
  const brow = f.brow ?? (female ? (r(2) > .5 ? "soft" : "thin") : (["straight", "bushy", "arched", "straight", "thin"] as const)[Math.floor(r(2) * 5)]);
  const nose = f.nose ?? (female ? "small" : (["straight", "long", "hooked", "broad", "straight"] as const)[Math.floor(r(3) * 5)]);
  const jaw = f.jaw ?? (female ? (r(4) > .5 ? "oval" : "long") : (["oval", "square", "round", "long"] as const)[Math.floor(r(4) * 4)]);
  return {
    female, eye, eyeTilt: (female ? .35 : 0) + (r(5) - .5) * .5 + (f.eye === "heavy" ? -.3 : 0),
    browW: brow === "bushy" ? 1.7 : brow === "thin" ? .7 : brow === "soft" ? 1.15 : 1, browArch: brow === "arched" ? 1.5 : brow === "straight" ? .45 : 1, browTilt: (r(6) - .5) * .8,
    nose: nose === "long" ? 1.2 : nose === "small" ? .82 : nose === "broad" ? 1 : 1, hook: nose === "hooked" ? 1 : nose === "broad" ? .4 : 0,
    mouth: f.mouth === "wide" ? 1.3 : f.mouth === "full" ? 1.1 : f.mouth === "small" ? .8 : female ? .85 : .95 + r(8) * .25,
    jaw: jaw === "square" ? 1 : jaw === "round" ? -1 : 0, chin: jaw === "long" ? 1.6 : jaw === "round" ? -.8 : 0,
    age: clamp01(f.age ?? (elder ? .75 : 0)), mole: f.mole ?? (!female && r(9) > .88),
  };
}

/** The profile outline adjusted for the traits: nose length and hook, jaw and chin. `base` is the shared head outline. */
export function profileOutline(base: readonly Pt[], t: FaceTraits): Pt[] {
  return base.map(([x, y], i) => {
    // Nose (indices 4–7 in the shared outline): longer or shorter, hooked at the bridge.
    if (i === 5) return [x + (t.nose - 1) * 3, y + (t.nose - 1) * 1.2];
    if (i === 4) return [x + t.hook * .9, y - t.hook * .6];
    // Chin and jaw.
    if (i === 10) return [x + t.jaw * .8, y + t.chin * .6];
    if (i === 11) return [x + t.jaw * .6, y + t.chin];
    if (i === 12) return [x + t.jaw * .5, y + t.chin * .8];
    return [x, y];
  });
}

interface Ctx { P: Map2; k: number; lw: number; m: FaceMoods; t: FaceTraits; blink: number; mouth: number; hair: UkiyoePaint; lips?: UkiyoePaint }

/** One eye: the upper lid (curving with the mood), the iris hanging from it, lower lid when wide, lashes of the closed eye. */
function eye(c: Ctx, cx: number, cy: number, len: number, dir: 1 | -1, tilt: number): Prim[] {
  const { P, k, m, t } = c, out: Prim[] = [], w = len * t.eye;
  // Open (0 shut … 1 normal … >1 wide), lid curve (+ smile-arch, − droop), outer corner raise.
  const shut = clamp01(Math.max(c.blink, m.laugh * .95, m.cry * .55, m.shy * .45));
  const open = (1 - shut) * (1 + m.surprise * .8 + m.fear * .6 - m.angry * .35 - m.sad * .25);
  const arch = (m.smile * .9 + m.laugh) * 1.2 - m.sad * .4;
  const outerUp = tilt + t.eyeTilt - m.sad * .9 + m.angry * .5;
  const inner: Pt = [cx + dir * w * .5, cy], outer: Pt = [cx - dir * w * .5, cy - outerUp * .6];
  const lineW = k * (t.female ? .3 : .42) + .3;
  if (open < .12) {
    // Closed: a lid line curving down (laughing, an upturned crescent) with a hint of lashes.
    const mid: Pt = [cx, cy + (arch > .3 ? -.9 * arch : .5)];
    out.push({ t: "line", d: carvedLine([P(...inner), P(...mid), P(...outer)], lineW * 1.1, { taper: "both", smooth: true }), color: "sumi" });
    if (m.cry > .2) out.push({ t: "stroke", d: [0, 1, 2].map(i => { const q = P(cx - dir * w * (.1 + i * .16), cy + .6); return `M${f1(q[0])} ${f1(q[1])}l${f1(-dir * k * .3)} ${f1(k * .9)}`; }).join(""), color: "sumi", width: lineW * .5, opacity: .7 });
    return out;
  }
  const lift = -.55 - .45 * open - arch * .7;
  const mid: Pt = [cx + dir * w * .08, cy + lift];
  out.push({ t: "line", d: carvedLine([P(...inner), P(...mid), P(...outer), P(outer[0] - dir * w * .06, outer[1] - .2)], lineW, { taper: "both", minRatio: .2, smooth: true }), color: "sumi" });
  // Iris: a small black almond hanging from the lid toward the inner corner; hidden more as the lid lowers.
  const irisR = .66 * Math.min(1.3, .7 + open * .3), ix = cx + dir * w * .12, iy = cy + lift * .55 + irisR * .55;
  const hide = clamp01(1 - open) * .6 + m.shy * .3;
  out.push({ t: "clip", d: smoothD([P(...inner), P(...mid), P(...outer), P(cx, cy + 1.6 * open + .4)], true, .35), key: "iris", prims: [
    { t: "fill", d: ellipseD(...P(ix, iy + hide * irisR), irisR * k * .85, irisR * k), fill: "sumi" },
    { t: "fill", d: circleD(...P(ix - dir * irisR * .3, iy - irisR * .25 + hide * irisR), irisR * k * .22), fill: "gofun", opacity: .55 },
  ] });
  // Wide eyes show the lower lid.
  if (open > 1.2) out.push({ t: "line", d: carvedLine([P(inner[0] - dir * w * .05, inner[1] + .3), P(cx, cy + .9 + (open - 1) * 1.2), P(outer[0] + dir * w * .05, outer[1] + .5)], lineW * .55, { taper: "both", smooth: true }), color: "sumi", opacity: .75 });
  // Age: a crease under the eye and crow's feet.
  if (t.age > .3) out.push({ t: "stroke", d: `M${f1(P(cx + dir * w * .3, cy + 1.4)[0])} ${f1(P(cx, cy + 1.4)[1])}Q${f1(P(cx, cy + 2.2)[0])} ${f1(P(cx, cy + 2.2)[1])} ${f1(P(cx - dir * w * .45, cy + 1.2)[0])} ${f1(P(cx, cy + 1.2)[1])}` + [0, 1].map(i => { const q = P(outer[0] - dir * .5, outer[1] + i * .9); return `M${f1(q[0])} ${f1(q[1])}l${f1(-dir * k * 1.3)} ${f1(k * (i - .4) * .8)}`; }).join(""), color: "sumi", width: lineW * .45, opacity: .45 * t.age });
  return out;
}

/** One brow: a soft grey smudge for women, an inked stroke for men; tilts with the mood. */
function brow(c: Ctx, cx: number, cy: number, len: number, dir: 1 | -1): Prim[] {
  const { P, k, m, t } = c, w = len * (t.female ? 1.1 : 1);
  const raise = m.surprise * 1.6 + m.fear * 1.1 + m.sad * .4 - m.angry * .9;
  const innerTilt = (m.sad * 1.5 + m.fear * 1.2 + m.cry * 1.2) - m.angry * 1.6 + t.browTilt;
  const inner: Pt = [cx + dir * w * .5, cy - raise - innerTilt * .6], outer: Pt = [cx - dir * w * .5, cy - raise + .2 + t.browTilt * .3];
  const peak: Pt = [cx + dir * w * (.05 - m.angry * .1), cy - raise - .9 * t.browArch - m.surprise * .6 - innerTilt * .25];
  if (t.female && !m.angry) {
    // The soft grey smudge, darker along its lower edge.
    const th = .75 * t.browW;
    return [
      { t: "fill", d: smoothD([P(...inner), P(peak[0], peak[1] - th), P(...outer), P(outer[0] + dir * .3, outer[1] + th * .35), P(peak[0], peak[1] + th * .2), P(inner[0], inner[1] + th * .6)], true, .45), fill: c.hair === "usuzumi" ? "usuzumi" : "usuzumi", opacity: .78 },
      { t: "line", d: carvedLine([P(inner[0], inner[1] + th * .45), P(peak[0], peak[1] + th * .15), P(...outer)], k * .22 + .2, { taper: "both", smooth: true }), color: "sumi", opacity: .4 },
    ];
  }
  return [{ t: "line", d: carvedLine([P(...inner), P(...peak), P(...outer)], k * .42 * t.browW + .4, { taper: "end", minRatio: .35, smooth: true }), color: c.hair === "usuzumi" ? "usuzumi" : "sumi", opacity: .92 }];
}

/** The mouth at (cx, cy): lips (rouged on women), parting line turning up or down, open when talking or crying out. */
function mouth(c: Ctx, cx: number, cy: number, w0: number, dir: 1 | -1): Prim[] {
  const { P, k, m, t } = c, out: Prim[] = [], w = w0 * t.mouth, curve = m.smile * .9 + m.shy * .4 + m.laugh * .6 - m.sad * .8 - m.angry * .5 - m.cry * .6;
  const open = Math.max(c.mouth, m.laugh * .75, m.surprise * .5, m.fear * .45, m.cry * .4);
  const corner = (s: 1 | -1): Pt => [cx + s * dir * w * .5, cy - curve * .7];
  if (open > .08) {
    const h = (.5 + 1.5 * open) * (1 + m.surprise * .3);
    out.push({ t: "fill", d: smoothD([P(...corner(1)), P(cx, cy - h * .45 - curve * .2), P(...corner(-1)), P(cx, cy + h * .55)], true, .45), fill: "kogecha", outline: k * .2 + .25, outlineColor: "sumi" });
    if (t.female || c.lips) out.push({ t: "fill", d: smoothD([P(cx - w * .3, cy + h * .45), P(cx, cy + h * .75), P(cx + w * .3, cy + h * .45), P(cx, cy + h * .5)], true, .4), fill: c.lips ?? "beni", opacity: .9 });
    return out;
  }
  if (t.female || c.lips) {
    // The tiny rouged mouth: upper lip a low M, the lower fuller, a dark parting line.
    const lw = w * .5, lip = c.lips ?? "beni";
    out.push({ t: "fill", d: smoothD([P(cx - lw, cy - curve * .5), P(cx - lw * .45, cy - .75), P(cx, cy - .45), P(cx + lw * .45, cy - .75), P(cx + lw, cy - curve * .5), P(cx, cy - .05)], true, .3), fill: lip });
    out.push({ t: "fill", d: smoothD([P(cx - lw * .8, cy + .05 - curve * .3), P(cx, cy + 1), P(cx + lw * .8, cy + .05 - curve * .3), P(cx, cy + .15)], true, .4), fill: lip, opacity: .92 });
  }
  out.push({ t: "line", d: carvedLine([P(...corner(1)), P(cx, cy + curve * .25), P(...corner(-1))], k * (t.female ? .22 : .3) + .25, { taper: "both", smooth: true }), color: "sumi", opacity: t.female ? .85 : .7 });
  return out;
}

/** Rouge at the outer corner of the eye and on the cheek (women; more when shy or laughing), and tears. */
function colour(c: Ctx, eyeAt: Pt, cheekAt: Pt, dir: 1 | -1): Prim[] {
  const { P, k, m, t } = c, out: Prim[] = [];
  const blush = (t.female ? .14 : 0) + m.shy * .35 + m.laugh * .15 + m.smile * .08 + m.angry * (t.female ? 0 : .12);
  if (blush > .02) out.push({ t: "glow", cx: P(...cheekAt)[0], cy: P(...cheekAt)[1], r: k * 4.2, color: "beni", opacity: Math.min(.5, blush) });
  if (t.female) out.push({ t: "glow", cx: P(eyeAt[0] - dir * 2.2, eyeAt[1] - .4)[0], cy: P(eyeAt[0] - dir * 2.2, eyeAt[1] - .4)[1], r: k * 2.2, color: "beni", opacity: .22 });
  if (m.cry > .15) {
    const a = P(eyeAt[0] - dir * .8, eyeAt[1] + 1), b = P(eyeAt[0] - dir * 1.2, eyeAt[1] + 6 + 4 * m.cry);
    out.push({ t: "line", d: carvedLine([a, [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], b], k * .7 * m.cry + .3, { taper: "start", minRatio: .3, smooth: true }), color: "sora", opacity: .8 });
    out.push({ t: "fill", d: circleD(b[0], b[1], k * .6 * m.cry + .3), fill: "sora", opacity: .85 });
  }
  return out;
}

/** Age lines: the brow furrow, the fold from nose to mouth. */
function aged(c: Ctx, brow: Pt, fold: [Pt, Pt]): Prim[] {
  const { P, k, t, m } = c;
  const a = Math.max(t.age, m.angry * .5);
  if (a < .3) return [];
  return [{ t: "stroke", d: [0, 1].map(i => { const q = P(brow[0], brow[1] - 2.2 - i * 1.4); return `M${f1(q[0] - k * 2)} ${f1(q[1])}q${f1(k * 2)} ${f1(-k * .5)} ${f1(k * 4)} 0`; }).join("") + `M${f1(P(...fold[0])[0])} ${f1(P(...fold[0])[1])}Q${f1(P(fold[0][0], fold[1][1])[0])} ${f1(P(fold[0][0], fold[1][1])[1])} ${f1(P(...fold[1])[0])} ${f1(P(...fold[1])[1])}`, color: "sumi", width: k * .2 + .25, opacity: .4 * a }];
}

export interface FaceArgs { P: Map2; k: number; lw: number; moods: FaceMoods; traits: FaceTraits; blink: number; mouth: number; hair: UkiyoePaint; lips?: UkiyoePaint }

/** Features of a head in profile (head units, facing +x): eye, brow, nostril, mouth, rouge, age, mole. */
export function faceProfile(a: FaceArgs): Prim[] {
  const c: Ctx = { P: a.P, k: a.k, lw: a.lw, m: a.moods, t: a.traits, blink: a.blink, mouth: a.mouth, hair: a.hair, lips: a.lips }, t = a.traits, out: Prim[] = [];
  out.push(...colour(c, [10.2, -1.4], [12.5, 4.5], -1));
  out.push(...brow(c, 9.6, -6.9, 7.4, 1));
  out.push(...eye(c, 10, -1.4, 6.2, 1, .2));
  // Nostril: a small curl under the nose tip.
  const nx = 20.2 + (t.nose - 1) * 3 - 1.4;
  out.push({ t: "line", d: carvedLine([a.P(nx, 5.6), a.P(nx - 1.1, 6.1), a.P(nx - 1.2, 5.3)], a.k * .22 + .25, { taper: "both", smooth: true }), color: "sumi", opacity: .7 });
  out.push(...mouth(c, 16.5, 9.4, 2.3, 1));
  out.push(...aged(c, [9.6, -6.9], [[16.2, 6.4], [15.6, 10.6]]));
  if (t.mole) out.push({ t: "fill", d: circleD(...a.P(13.6, 7.2), a.k * .35), fill: "sumi", opacity: .8 });
  return out;
}

/** Features of a head turned three-quarters (head units): the near eye long, the far eye foreshortened; nose line. */
export function faceThreeQuarter(a: FaceArgs): Prim[] {
  const c: Ctx = { P: a.P, k: a.k, lw: a.lw, m: a.moods, t: a.traits, blink: a.blink, mouth: a.mouth, hair: a.hair, lips: a.lips }, t = a.traits, out: Prim[] = [];
  out.push(...colour(c, [6.8, -1.3], [5.5, 4.5], -1));
  out.push(...brow(c, 6.6, -7.2, 7, 1), ...brow(c, 14.2, -7.1, 3, 1));
  out.push(...eye(c, 6.8, -1.3, 5.6, 1, .25), ...eye(c, 14.1, -1.1, 2.7, 1, .1));
  // The nose: one fine line from the brow down to a small hook at the nostril.
  const tip = 5 + (t.nose - 1) * 2;
  out.push({ t: "line", d: carvedLine([a.P(12.4, -5.6), a.P(13.6, -1.5), a.P(15.4 + t.hook * .6, tip - 1), a.P(16.2, tip), a.P(15, tip + .9), a.P(13.9, tip + .6)], a.k * (t.female ? .24 : .34) + .3, { taper: "start", minRatio: .2, smooth: true }), color: "sumi" });
  out.push(...mouth(c, 12.8, 10.2, 2.6, 1));
  out.push(...aged(c, [8.6, -7.2], [[11, 6.5], [10.2, 11]]));
  if (t.mole) out.push({ t: "fill", d: circleD(...a.P(9.2, 7.4), a.k * .35), fill: "sumi", opacity: .8 });
  return out;
}

/** Features of a head seen square on (unit radius r): both eyes, brows, nose line, mouth. */
export function faceFront(a: FaceArgs): Prim[] {
  // Work in the profile helpers' units (≈ 18 units to the radius) and mirror for the two sides.
  const u = a.k / 18, P: Map2 = (x, y) => a.P(x / 18, y / 18), c: Ctx = { P, k: a.k / 18 * 1, lw: a.lw, m: a.moods, t: a.traits, blink: a.blink, mouth: a.mouth, hair: a.hair, lips: a.lips }, out: Prim[] = [];
  void u;
  for (const s of [-1, 1] as const) {
    out.push(...colour(c, [s * 6.4, -1.2], [s * 8.5, 5], s === 1 ? -1 : 1));
    out.push(...brow(c, s * 6.2, -8.6, 6.6, s === 1 ? -1 : 1));
    out.push(...eye(c, s * 6, -1.4, 7, s === 1 ? -1 : 1, .45));
  }
  out.push({ t: "line", d: carvedLine([P(.6, -3), P(1.1, 3.6 + (a.traits.nose - 1) * 2), P(.2, 5.8), P(-1, 5.4)], a.k / 18 * (a.traits.female ? .24 : .34) + .3, { taper: "start", minRatio: .25, smooth: true }), color: "sumi", opacity: .85 });
  out.push(...mouth(c, 0, 10.6, 3.4, 1));
  out.push(...aged(c, [0, -8], [[3.6, 5.6], [4.4, 10]]));
  if (a.traits.mole) out.push({ t: "fill", d: circleD(...P(-5, 7), a.k / 18 * .4), fill: "sumi", opacity: .8 });
  return out;
}

/**
 * Kewari: the combed strands at a hairline, drawn from the hair a little way onto the skin so the edge dissolves.
 * `edge` runs along the hairline (head units); strands point toward `toward` (the skin side).
 */
export function kewari(P: Map2, k: number, edge: readonly Pt[], toward: Pt, seed: number, density = 1, color: UkiyoePaint = "sumi", unit = 1): Prim[] {
  const strands: string[] = [], n = Math.round(10 * edge.length * density);
  // `unit`: the size of one head unit in the caller's coordinates (1 for the profile's ±20 head, 1/18 for a unit-radius face).
  for (let i = 0; i < n; i++) {
    const u = i / n * (edge.length - 1), j = Math.min(edge.length - 2, Math.floor(u)), f = u - j;
    const x = lerp(edge[j][0], edge[j + 1][0], f), y = lerp(edge[j][1], edge[j + 1][1], f);
    const dx = toward[0] - x, dy = toward[1] - y, d = Math.hypot(dx, dy) || 1, len = (.5 + 1.1 * hash01(seed, i, 1)) * unit;
    const a = P(x - dx / d * .6 * unit, y - dy / d * .6 * unit), b = P(x + dx / d * len + (hash01(seed, i, 2) - .5) * .4 * unit, y + dy / d * len);
    strands.push(`M${f1(a[0])} ${f1(a[1])}L${f1(b[0])} ${f1(b[1])}`);
  }
  return [{ t: "stroke", d: strands.join(""), color, width: Math.max(.25, k * .075), opacity: .6 }];
}

/** Fine lines of sheen combed through a hair mass, along the given flow curves (head units). */
export function hairSheen(P: Map2, k: number, flows: readonly (readonly Pt[])[]): Prim[] {
  return [{ t: "stroke", d: flows.map(fl => "M" + fl.map(q => { const p = P(q[0], q[1]); return `${f1(p[0])} ${f1(p[1])}`; }).join("L")).join(""), color: "usuzumi", width: Math.max(.3, k * .14), opacity: .55 }];
}
