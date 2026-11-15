/**
 * UKIYO1 creatures: the animals and spirits of Japanese folktales, drawn as a print would draw them (flat fills, a
 * fine key line, fur and feather hatching) and animated by small rigs that share the figure conventions.
 *
 * - Four-legged rig: fox (kitsune, up to nine tails and foxfire), tanuki (also upright, belly-drumming), dog, cat, rabbit.
 * - Bird rig: crane, heron, crow, pheasant, sparrow — standing, walking, pecking, dancing and flapping flight.
 * - Dragon: a serpentine body with travelling undulation, scales, belly plates, dorsal flames, clawed legs, whiskers.
 * Every pose is a pure function of the frame. Origin: ground point under the body; authored facing right.
 */
import type { Pt } from "./ukiyoe-core";
import { add, alongPath, carvedLine, clamp, clamp01, DEG, hash01, hashSigned, lerp, noise1, polar, polyD, polylineLength, smooth, smoothD, span } from "./ukiyoe-core";
import type { Prim } from "./ukiyoe-prims";
import { circleD, ellipseD } from "./ukiyoe-prims";
import type { UkiyoeYokai } from "./ukiyoe-yokai";
import { drawYokai, UKIYOE_YOKAI } from "./ukiyoe-yokai";
import type { UkiyoeFill, UkiyoePaint } from "./ukiyoe-pigments";

export type UkiyoeSpecies = "fox" | "tanuki" | "dog" | "cat" | "rabbit" | "monkey" | "horse" | "crane" | "heron" | "crow" | "pheasant" | "sparrow" | "dragon" | UkiyoeYokai;
export const UKIYOE_SPECIES: readonly UkiyoeSpecies[] = ["fox", "tanuki", "dog", "cat", "rabbit", "monkey", "horse", "crane", "heron", "crow", "pheasant", "sparrow", "dragon", ...UKIYOE_YOKAI];
export type UkiyoeCreatureActionType = "walk" | "run" | "fly" | "hop" | "float" | "sit" | "stand" | "look" | "leap" | "howl" | "drum" | "peck" | "dance" | "coil" | "roar" | "transform" | "sleep"
  | "beckon" | "blow" | "vanish" | "appear" | "bow" | "fan" | "stretch";
export const UKIYOE_CREATURE_ACTIONS: readonly UkiyoeCreatureActionType[] = ["walk", "run", "fly", "hop", "float", "sit", "stand", "look", "leap", "howl", "drum", "peck", "dance", "coil", "roar", "transform", "sleep",
  "beckon", "blow", "vanish", "appear", "bow", "fan", "stretch"];

export interface UkiyoeCreatureLook {
  color?: UkiyoePaint;
  belly?: UkiyoePaint;
  dark?: UkiyoePaint;
  accent?: UkiyoePaint;
  /** Body length in px at scale 1 (dragons: total length). */
  size?: number;
  /** Fox: 1–9 tails (kyūbi). */
  tails?: number;
  /** Fox: floating foxfire orbs. */
  foxfire?: boolean;
  /** Tanuki: straw hat and sake bottle (the folk-statue tanuki). */
  hat?: boolean;
  bottle?: boolean;
  /** Dragon: the flaming pearl it chases. */
  pearl?: boolean;
  /** Horse: harness, saddle cloth and pack (a Tōkaidō packhorse). */
  tack?: boolean;
}
export interface UkiyoeCreatureAction { type: UkiyoeCreatureActionType; start: number; end: number; to?: number; toY?: number; via?: readonly (readonly [number, number])[]; angle?: number; amount?: number; blend?: number }
export interface UkiyoeCreatureSpec { species: UkiyoeSpecies; look?: UkiyoeCreatureLook; actions?: readonly UkiyoeCreatureAction[]; facing?: "left" | "right" }
export interface DrawnCreature { prims: Prim[]; x: number; y: number; dir: 1 | -1 }

const TRAVEL = new Set<UkiyoeCreatureActionType>(["walk", "run", "fly", "hop", "float"]);

function weight(a: UkiyoeCreatureAction, frame: number): number {
  const b = Math.max(1, a.blend ?? 6);
  if (frame < a.start || frame > a.end + b) return 0;
  return Math.min(smooth((frame - a.start) / b), frame <= a.end ? 1 : smooth(1 - (frame - a.end) / b));
}
/** Root offset and travel state from walk/run/fly/hop segments (each starts where the previous left off). */
export function creatureTravel(actions: readonly UkiyoeCreatureAction[], frame: number): { x: number; y: number; dist: number; moving?: UkiyoeCreatureAction; dir: 1 | -1; lastDir: 1 | -1 } {
  let x = 0, y = 0, dist = 0, moving: UkiyoeCreatureAction | undefined, dir: 1 | -1 = 1;
  for (const a of actions) {
    if (!TRAVEL.has(a.type) || a.start > frame) continue;
    const tx = a.to ?? x, ty = a.toY ?? y, len = Math.max(1, a.end - a.start), u = clamp01((frame - a.start) / len);
    const accel = Math.min(.2, 10 / len), e = u < accel ? u * u / (2 * accel * (1 - accel)) : u > 1 - accel ? 1 - (1 - u) ** 2 / (2 * accel * (1 - accel)) : (u - accel / 2) / (1 - accel);
    if (tx !== x) dir = tx > x ? 1 : -1;
    const path: Pt[] = [[x, y], ...(a.via ?? []), [tx, ty]], total = polylineLength(path);
    if (frame <= a.end) { moving = a; dist += total * e; [x, y] = alongPath(path, total * e); break; }
    dist += total; x = tx; y = ty;
  }
  return { x, y, dist, moving, dir, lastDir: dir };
}

/** Blended action weights by type (0..1) and the time inside each. */
function actionState(actions: readonly UkiyoeCreatureAction[], frame: number) {
  const w: Partial<Record<UkiyoeCreatureActionType, { w: number; t: number; a: UkiyoeCreatureAction }>> = {};
  for (const a of actions) {
    const k = weight(a, frame);
    if (k > (w[a.type]?.w ?? 0)) w[a.type] = { w: k, t: frame - a.start, a };
  }
  return (type: UkiyoeCreatureActionType) => w[type] ?? { w: 0, t: 0, a: undefined };
}

// ---- Shared drawing helpers ------------------------------------------------------------------------------------------------------------

function limb(a: Pt, b: Pt, w0: number, w1: number): string {
  const tx = b[0] - a[0], ty = b[1] - a[1], len = Math.hypot(tx, ty) || 1, nx = -ty / len, ny = tx / len;
  return smoothD([[a[0] + nx * w0, a[1] + ny * w0], [b[0] + nx * w1, b[1] + ny * w1], [b[0] + tx / len * w1 * .7, b[1] + ty / len * w1 * .7], [b[0] - nx * w1, b[1] - ny * w1], [a[0] - nx * w0, a[1] - ny * w0], [a[0] - tx / len * w0 * .6, a[1] - ty / len * w0 * .6]], true, .3);
}
const rot = (p: Pt, deg: number, about: Pt): Pt => { const r = deg * DEG, c = Math.cos(r), s = Math.sin(r), x = p[0] - about[0], y = p[1] - about[1]; return [about[0] + x * c - y * s, about[1] + x * s + y * c]; };
// ---- Four-legged animals ------------------------------------------------------------------------------------------------------------------
//
// Built the way the animal prints of Koson and Kuniyoshi read: one continuous body (deep chest, tucked waist, a haunch
// and a shoulder that the legs grow out of), legs with real joints (the hind leg's hock angles back, the fore leg has a
// wrist and a short pastern, each paw has toes), fur shown by carved hairlines that follow the body and by tufted edges
// where the coat is long (ruff, cheeks, belly, breeches, tail), and a face with a stop, a muzzle, lips, nose leather and
// an eye with rim, iris, pupil and catchlight.

interface Beast {
  L: number; bh: number; leg: number; color: UkiyoePaint; belly: UkiyoePaint; dark: UkiyoePaint; head: number; tail: number; tailW: number;
  ears: "fox" | "round" | "cat" | "rabbit" | "dog" | "horse" | "monkey"; snout: number;
  /** Neck length (× the usual), head tilt (deg, + turns the face down), mane colour, hooves, bare-skinned face colour. */
  neck?: number; headTilt?: number; mane?: UkiyoePaint; hoof?: boolean; face?: UkiyoePaint;
  /** Belly tuck (+ up at the waist, − sagging), chest depth, fur length (fraction of body height), hairline density. */
  tuck: number; chest: number; fur: number; hairs: number;
  /** Long-coat colour for ruff, cheeks and belly fringe; lower-leg colour ("stockings"); eye iris; slit pupil. */
  ruff: UkiyoePaint; stocking?: UkiyoePaint; iris: UkiyoePaint; slit: boolean; tailTip?: UkiyoePaint;
}
type QuadSpecies = "fox" | "tanuki" | "dog" | "cat" | "rabbit" | "monkey" | "horse";
const BEASTS: Readonly<Record<QuadSpecies, Beast>> = {
  fox: { L: 150, bh: 46, leg: 54, color: "tan", belly: "gofun", dark: "kogecha", head: 34, tail: 118, tailW: 36, ears: "fox", snout: 1.25,
    tuck: .2, chest: .14, fur: .2, hairs: 1, ruff: "gofun", stocking: "sumi", iris: "ki", slit: true, tailTip: "gofun" },
  tanuki: { L: 128, bh: 60, leg: 34, color: "cha", belly: "kincha", dark: "kogecha", head: 32, tail: 70, tailW: 32, ears: "round", snout: .75,
    tuck: -.12, chest: .06, fur: .26, hairs: 1.2, ruff: "kincha", stocking: "kogecha", iris: "kogecha", slit: false },
  dog: { L: 138, bh: 50, leg: 52, color: "kincha", belly: "gofun", dark: "cha", head: 30, tail: 48, tailW: 16, ears: "dog", snout: 1,
    tuck: .16, chest: .14, fur: .12, hairs: .8, ruff: "gofun", iris: "cha", slit: false },
  cat: { L: 112, bh: 40, leg: 40, color: "gofun", belly: "gofun", dark: "sumi", head: 27, tail: 92, tailW: 10, ears: "cat", snout: .6,
    tuck: .1, chest: .08, fur: .07, hairs: .6, ruff: "gofun", iris: "ki", slit: true },
  rabbit: { L: 86, bh: 48, leg: 26, color: "gofun", belly: "gofun", dark: "usuzumi", head: 26, tail: 14, tailW: 14, ears: "rabbit", snout: .6,
    tuck: 0, chest: .04, fur: .14, hairs: .8, ruff: "gofun", iris: "beni", slit: false },
  // The Japanese macaque of Koson's prints: shaggy grey-brown coat, a bare red face, small ears at the side, a stub tail.
  monkey: { L: 92, bh: 44, leg: 64, head: 30, tail: 16, tailW: 12, ears: "monkey", snout: .25, tuck: .06, chest: .1, fur: .12, hairs: 1.3,
    color: "usuzumi", belly: "usuzumi", dark: "kogecha", ruff: "usuzumi", iris: "cha", slit: false, face: "beni", headTilt: 6, neck: .2 },
  // A bay packhorse: long legs, a long arched neck and long head, black mane, tail and stockings, hooves.
  horse: { L: 200, bh: 76, leg: 118, head: 40, tail: 110, tailW: 30, ears: "horse", snout: 1.75, tuck: .1, chest: .18, fur: .03, hairs: .45,
    color: "cha", belly: "cha", dark: "kogecha", ruff: "cha", stocking: "sumi", iris: "kogecha", slit: false, neck: 2.3, headTilt: 48, mane: "sumi", hoof: true },
};

const lerp2 = (a: Pt, b: Pt, t: number): Pt => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
/** Densify a polyline through a Catmull-Rom spline (closed: wraps around). */
function smoothPts(points: readonly Pt[], per = 6, closed = true): Pt[] {
  const n = points.length, out: Pt[] = [], at = (i: number) => closed ? points[(i + n) % n] : points[Math.max(0, Math.min(n - 1, i))];
  for (let i = 0; i < (closed ? n : n - 1); i++) {
    const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
    for (let k = 0; k < per; k++) {
      const t = k / per, t2 = t * t, t3 = t2 * t;
      out.push([.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
        .5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3)]);
    }
  }
  if (!closed) out.push(points[n - 1]);
  return out;
}
/** A ribbon along a spine, tapering from w0 to w1, as a closed path. */
function ribbonQ(spine: readonly Pt[], w0: number, w1: number): string {
  const L: Pt[] = [], Rr: Pt[] = [];
  spine.forEach((q, i) => {
    const a = spine[Math.max(0, i - 1)], c = spine[Math.min(spine.length - 1, i + 1)], l = Math.hypot(c[0] - a[0], c[1] - a[1]) || 1, w = lerp(w0, w1, i / Math.max(1, spine.length - 1)) / 2;
    L.push([q[0] - (c[1] - a[1]) / l * w, q[1] + (c[0] - a[0]) / l * w]); Rr.push([q[0] + (c[1] - a[1]) / l * w, q[1] - (c[0] - a[0]) / l * w]);
  });
  return smoothD([...L, ...Rr.reverse()], true, .35);
}
/** Tangent (unit) of a polyline at arc length s. */
function tangentAt(pts: readonly Pt[], s: number): Pt {
  const L = polylineLength(pts), a = alongPath(pts, Math.max(0, s - 1.5)), b = alongPath(pts, Math.min(L, s + 1.5)), l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
  return [(b[0] - a[0]) / l, (b[1] - a[1]) / l];
}
/**
 * A tufted fur edge along an open contour: a band whose outer side breaks into pointed tufts lying along the contour
 * (`lay` 1 with its direction, −1 against it). `side` 1 puts the tufts on the left of travel (y down: outward for a
 * contour running clockwise). Returns the band and the hairlines that run up each tuft.
 */
function furEdge(pts: readonly Pt[], depth: number, side: 1 | -1, lay: number, seed: number, every = 1): { band: string; hairs: string } {
  const L = polylineLength(pts);
  if (L < 2 || depth < .4) return { band: "", hairs: "" };
  const n = Math.max(3, Math.round(L / Math.max(2.5, depth * .9 * every))), inner: Pt[] = [], outer: Pt[] = [], hairs: string[] = [];
  for (let i = 0; i <= n; i++) {
    const s = L * i / n, q = alongPath(pts, s), t = tangentAt(pts, s), nx = -t[1] * side, ny = t[0] * side;
    inner.push([q[0] - nx * depth * .35, q[1] - ny * depth * .35]);
    if (i === n) { outer.push(q); break; }
    const d = depth * (.55 + .6 * hash01(seed, i, 301)) * Math.sin(Math.PI * Math.min(1, (i + .5) / n * 1.15)) ** .3;
    const tip: Pt = [q[0] + nx * d + t[0] * lay * d * .7, q[1] + ny * d + t[1] * lay * d * .7];
    const s2 = L * (i + .55) / n, q2 = alongPath(pts, s2), notch: Pt = [q2[0] + nx * d * .12, q2[1] + ny * d * .12];
    outer.push(q, tip, notch);
    hairs.push(`M${(q[0] - nx * depth * .2).toFixed(1)} ${(q[1] - ny * depth * .2).toFixed(1)}Q${(q[0] + nx * d * .45).toFixed(1)} ${(q[1] + ny * d * .45).toFixed(1)} ${(tip[0] - (t[0] * lay * d * .15)).toFixed(1)} ${(tip[1] - t[1] * lay * d * .15).toFixed(1)}`);
  }
  return { band: polyD([...outer, ...inner.reverse()]), hairs: hairs.join("") };
}
/**
 * Carved hairlines filling the coat between a back line and a belly line (both running rump → chest): short, slightly
 * curved strokes lying toward the tail and turning downward toward the belly, denser along the back.
 */
function furField(back: readonly Pt[], belly: readonly Pt[], count: number, len: number, seed: number): string {
  const Lb = polylineLength(back), Lu = polylineLength(belly), out: string[] = [];
  for (let i = 0; i < count; i++) {
    const u = hash01(seed, i, 311), v = hash01(seed, i, 312) ** 1.3 * .92 + .04;
    const a = alongPath(back, Lb * u), b = alongPath(belly, Lu * u), p: Pt = [lerp(a[0], b[0], v), lerp(a[1], b[1], v)];
    const t = tangentAt(back, Lb * u), ang = Math.atan2(-t[1], -t[0]) + (v * .6 + hashSigned(seed, i, 313) * .25) * -Math.sign(t[0] || 1);
    const l = len * (.6 + .7 * hash01(seed, i, 314)) * (1 - v * .3), bend = hashSigned(seed, i, 315) * .35;
    const e: Pt = [p[0] + Math.cos(ang) * l, p[1] + Math.sin(ang) * l], m: Pt = [p[0] + Math.cos(ang + bend) * l * .5, p[1] + Math.sin(ang + bend) * l * .5];
    out.push(`M${p[0].toFixed(1)} ${p[1].toFixed(1)}Q${m[0].toFixed(1)} ${m[1].toFixed(1)} ${e[0].toFixed(1)} ${e[1].toFixed(1)}`);
  }
  return out.join("");
}
/** Hairlines along a limb or tail spine: strokes lying down the length, staggered across the width. */
function furAlong(spine: readonly Pt[], width: number, count: number, len: number, seed: number): string {
  const L = polylineLength(spine), out: string[] = [];
  for (let i = 0; i < count; i++) {
    const s = L * hash01(seed, i, 321), q = alongPath(spine, s), t = tangentAt(spine, s), off = hashSigned(seed, i, 322) * width * .42;
    const p: Pt = [q[0] - t[1] * off, q[1] + t[0] * off], l = len * (.6 + .6 * hash01(seed, i, 323));
    out.push(`M${p[0].toFixed(1)} ${p[1].toFixed(1)}l${(t[0] * l + t[1] * off * .15).toFixed(1)} ${(t[1] * l - t[0] * off * .15).toFixed(1)}`);
  }
  return out.join("");
}

/**
 * A contour whose long-haired stretches break into tufts: `depth(u)` (px, by arc-length fraction 0..1) is the hair
 * length along the contour; where it is above zero the edge zigzags out into pointed tufts lying along `lay(u)` (1 with
 * the contour's direction, −1 against it). `side` 1 puts the tufts on the left of travel. Returns the new polyline.
 */
function tufted(pts: readonly Pt[], depth: (u: number) => number, side: 1 | -1, lay: (u: number) => number, seed: number, closed = false): Pt[] {
  const ring = closed ? [...pts, pts[0]] : pts, L = polylineLength(ring), out: Pt[] = [];
  const step = Math.max(2, Math.min(9, L / 90));
  let s = 0, i = 0;
  while (s < L) {
    const u = s / L, d = depth(u), q = alongPath(ring, s);
    if (d < .8) { out.push(q); s += step * 2; continue; }
    // A lock of hair: uneven length (now and then a long one), its front edge bowed, its tip lying along the coat.
    const r = hash01(seed, i, 331), t = tangentAt(ring, s), nx = -t[1] * side, ny = t[0] * side, ly = lay(u);
    const h = d * (r > .86 ? 1.25 : .35 + .55 * hash01(seed, i, 333)), w = Math.max(step * .7, d * (.35 + .4 * hash01(seed, i, 332)));
    out.push(q, [q[0] + nx * h * .55 + t[0] * ly * h * .15, q[1] + ny * h * .55 + t[1] * ly * h * .15], [q[0] + nx * h + t[0] * ly * h * .8, q[1] + ny * h + t[1] * ly * h * .8]);
    s += w; i++;
  }
  if (!closed) out.push(ring[ring.length - 1]);
  return out;
}

function beastHead(b: Beast, species: string, hs: number, open: number, blink: boolean, look: UkiyoeCreatureLook, seed: number): Prim[] {
  const P = (x: number, y: number): Pt => [x * hs, y * hs];
  const color = look.color ?? b.color, belly = look.belly ?? b.belly, dark = look.dark ?? b.dark, out: Prim[] = [];
  const sn = b.snout, ruff = look.belly ?? b.ruff, longMuzzle = species === "fox" || species === "dog";
  // Ears behind the skull: a curved front edge, a dark back (fox), the inner ear pale with long hairs.
  const ear = (dx: number, tall: number, wide: number, tip: number, back: boolean): Prim[] => {
    const base: Pt[] = [P(dx - wide, -.5), P(dx - wide * .55 + tip * .4, -.55 - tall * .6), P(dx + tip, -.55 - tall), P(dx + wide * .7, -.62 - tall * .35), P(dx + wide, -.48)];
    const inner: Pt[] = [P(dx - wide * .5, -.56), P(dx - wide * .25 + tip * .5, -.55 - tall * .55), P(dx + tip * .92, -.55 - tall * .86), P(dx + wide * .45, -.6 - tall * .3), P(dx + wide * .55, -.52)];
    const hairs = [0, 1, 2, 3].map(i => { const a = P(dx - wide * .3 + i * wide * .25, -.56), e = P(dx + tip * .6 + (i - 1.5) * wide * .12, -.55 - tall * (.55 + .07 * i)); return `M${a[0].toFixed(1)} ${a[1].toFixed(1)}L${e[0].toFixed(1)} ${e[1].toFixed(1)}`; }).join("");
    return [{ t: "fill", d: smoothD(base, true, .2), fill: back && species === "fox" ? dark : color, outline: 1.1 },
      { t: "fill", d: smoothD(inner, true, .2), fill: species === "rabbit" ? "sakura" : species === "fox" || species === "dog" ? "gofun" : dark, opacity: species === "rabbit" ? .85 : .9, noPrint: true },
      { t: "stroke", d: hairs, color: species === "rabbit" ? "beni" : "usuzumi", width: .7, opacity: .5 }];
  };
  if (b.ears === "fox") out.push(...ear(-.38, .95, .34, .06, true), ...ear(.04, 1.05, .32, .14, false));
  else if (b.ears === "dog") out.push(...ear(-.32, .66, .32, .1, true), ...ear(.04, .74, .3, .16, false));
  else if (b.ears === "cat") out.push(...ear(-.36, .6, .32, -.02, true), ...ear(.12, .64, .3, .06, false));
  else if (b.ears === "round") out.push({ t: "fill", d: ellipseD(-.46 * hs, -.6 * hs, .27 * hs, .25 * hs) + ellipseD(.08 * hs, -.72 * hs, .25 * hs, .23 * hs), fill: dark, outline: 1.1 },
    { t: "fill", d: ellipseD(-.44 * hs, -.58 * hs, .14 * hs, .12 * hs) + ellipseD(.09 * hs, -.69 * hs, .13 * hs, .11 * hs), fill: belly, opacity: .7, noPrint: true });
  else if (b.ears === "horse") {
    // Tall, narrow, pointed ears on top of the poll, turning a little now and then.
    const flick = Math.sin(seed + 1) * .08;
    const hEar = (dx: number, lean: number): Prim[] => {
      const base: Pt[] = [P(dx - .13, -.62), P(dx - .12 + lean, -1.05), P(dx + .02 + lean * 1.4, -1.32), P(dx + .1 + lean, -1.02), P(dx + .14, -.6)];
      return [{ t: "fill", d: smoothD(base, true, .3), fill: color, outline: 1.1 }, { t: "fill", d: smoothD([P(dx - .05, -.68), P(dx - .03 + lean, -1.05), P(dx + .02 + lean * 1.3, -1.22), P(dx + .06 + lean, -1.0), P(dx + .07, -.66)], true, .3), fill: dark, opacity: .8, noPrint: true }];
    };
    out.push(...hEar(-.42, -.06 + flick), ...hEar(-.22, .05 - flick));
  } else if (b.ears === "monkey") {
    // Small, rounded, nearly bare ears low at the side of the head.
    out.push({ t: "fill", d: smoothD([P(-.42, -.32), P(-.58, -.42), P(-.68, -.22), P(-.6, -.02), P(-.44, -.06)], true, .5), fill: b.face ?? "hada", outline: 1, opacity: .95 },
      { t: "stroke", d: smoothD([P(-.5, -.3), P(-.6, -.22), P(-.54, -.1)], false, .5), color: "kogecha", width: .7, opacity: .7 });
  } else if (b.ears === "rabbit") {
    const flop = Math.sin(seed) * .1;
    const longEar = (x0: number, x1: number, tipX: number, tipY: number): Prim[] => {
      const outerE: Pt[] = [P(x0, -.5), P(x0 - .22 + flop, -1.3), P(tipX + flop, tipY), P(x1 + .1 + flop * .5, -1.3), P(x1, -.52)];
      const innerE: Pt[] = [P(x0 + .07, -.62), P(x0 - .12 + flop, -1.3), P(tipX + flop + .02, tipY + .2), P(x1 + .02 + flop * .5, -1.3), P(x1 - .06, -.6)];
      return [{ t: "fill", d: smoothD(outerE, true, .42), fill: color, outline: 1.1 }, { t: "fill", d: smoothD(innerE, true, .42), fill: "sakura", opacity: .85, noPrint: true },
        { t: "stroke", d: furAlong([P((x0 + x1) / 2, -.6), P(tipX + flop, tipY + .25)], hs * .16, 7, hs * .25, seed + Math.round(x0 * 100)), color: "beni", width: .6, opacity: .35 }];
    };
    out.push(...longEar(-.52, -.18, -.5, -2.0), ...longEar(-.16, .14, .1, -2.05));
  }
  // Skull: occiput, crown, forehead, the stop between the eyes, the muzzle down to the nose, the jaw and the throat.
  // The horse's head is its own shape: a flat forehead and a straight nose, a deep rounded muzzle and chin, and the
  // big round jowl at the back of the jaw.
  const skull: Pt[] = species === "horse"
    ? [P(-.62, .02), P(-.5, -.5), P(-.15, -.62), P(.4, -.52), P(1.1, -.36), P(1.6, -.22), P(1.78, -.02), P(1.74, .22), P(1.56, .36), P(1.36, .36), P(1.2, .44), P(.75, .42), P(.15, .6), P(-.3, .55)]
    : [P(-.72, .08), P(-.62, -.5), P(-.2, -.72), P(.24, -.62), P(.46, -.4), P(.5 + .62 * sn, -.12), P(.6 + .72 * sn, .04), P(.56 + .66 * sn, .16),
      P(.44 + .5 * sn, .26), P(.12, .44), P(-.36, .52)];
  // No key line under the skull, where the head flows into the neck: the line runs from the nape over the crown and down
  // the face to the jaw.
  out.push({ t: "fill", d: smoothD(skull, true, .36), fill: color, grain: .2 });
  const faceLine = smoothPts(skull.slice(0, species === "horse" ? 13 : 10), 5, false);
  out.push({ t: "line", d: carvedLine(faceLine, hs * .05, { taper: "both", minRatio: .25, smooth: true }), color: "sumi" });
  // Pale muzzle and cheek (fox, dog: urajiro), or a dark mask (tanuki).
  if (longMuzzle || species === "cat" || species === "rabbit")
    out.push({ t: "fill", d: smoothD([P(-.5, .38), P(-.1, .06), P(.3, .04), P(.5 + .6 * sn, .06), P(.56 + .66 * sn, .16), P(.42 + .48 * sn, .28), P(.1, .45), P(-.36, .52)], true, .4), fill: ruff, noPrint: true });
  if (species === "tanuki") out.push({ t: "fill", d: smoothD([P(-.38, -.28), P(-.05, -.44), P(.36, -.32), P(.62, -.08), P(.42, .14), P(.1, .04), P(-.25, .14), P(-.45, .02)], true, .45), fill: dark, opacity: .95 });
  if (b.face) {
    // The macaque's bare red face: a heart-shaped mask from the brow over the eyes and muzzle, ringed by grey fur.
    out.push({ t: "fill", d: smoothD([P(.12, -.42), P(.38, -.48), P(.62, -.32), P(.72, -.04), P(.64, .22), P(.42, .36), P(.2, .3), P(.1, .06), P(.04, -.2)], true, .4), fill: b.face, outline: .8, grain: .3 });
    out.push({ t: "fill", d: smoothD([P(.06, -.42), P(.34, -.5), P(.6, -.34), P(.36, -.36)], true, .4), fill: "sumi", opacity: .18, noPrint: true });
  }
  if (species === "horse") {
    // The long face: the cheek's round jowl, the bony line down the nose, the soft muzzle and the chin.
    out.push({ t: "line", d: carvedLine(smoothPts([P(-.35, -.1), P(-.25, .3), P(.1, .5), P(.5, .35), P(.6, .1)], 5, false), hs * .035, { taper: "both", minRatio: .2, smooth: true }), color: "sumi", opacity: .7 });
    out.push({ t: "fill", d: smoothD([P(1.25, -.3), P(1.6, -.22), P(1.78, -.02), P(1.74, .22), P(1.56, .36), P(1.3, .3)], true, .4), fill: "sumi", opacity: .32, noPrint: true });
    out.push({ t: "line", d: carvedLine([P(.15, -.48), P(.8, -.36), P(1.3, -.24)], hs * .02, { taper: "both", minRatio: .3, smooth: true }), color: dark, opacity: .5 });
    out.push({ t: "line", d: carvedLine([P(1.72, .22), P(1.5, .26), P(1.34, .3)], hs * .035, { taper: "end", minRatio: .3, smooth: true }), color: "sumi" });
    out.push({ t: "fill", d: smoothD([P(-.5, -.5), P(-.25, -.75), P(.05, -.72), P(.1, -.5), P(-.1, -.38)], true, .4), fill: b.mane ?? "sumi", outline: .7 });
  }
  // Cheek ruff: long fur flaring back from the jaw (fox, tanuki, rabbit).
  if (b.fur > .1) {
    // A pale lobe of long hair from the cheek back under the ear, its edge breaking into locks lying back.
    const lobe = [P(.25, .32), P(-.05, .3), P(-.4, .18), P(-.66, .1)], under = [P(-.66, .1), P(-.55, .45), P(-.2, .56), P(.18, .44)];
    const edge = tufted(smoothPts(under, 4, false), () => hs * b.fur * .9, 1, () => -1, seed + 41);
    out.push({ t: "fill", d: polyD([...smoothPts(lobe, 4, false), ...edge]), fill: species === "tanuki" ? belly : ruff, noPrint: true });
    out.push({ t: "stroke", d: furAlong([P(.1, .38), P(-.5, .32)], hs * .3, 8, hs * .2, seed + 42), color: "usuzumi", width: .55, opacity: .45 });
  }
  // Fur on the face: short strokes from the forehead back over the crown, and along the muzzle.
  out.push({ t: "stroke", d: furField([P(-.6, -.42), P(-.1, -.62), P(.38, -.42)], [P(-.6, .1), P(-.1, -.12), P(.38, -.2)], 14, hs * .16, seed + 43), color: dark, width: .65, opacity: .45 });
  // Mouth: the jaw opens below a black lip line that runs from the nose back to the corner of the mouth.
  if (open > .05) out.push({ t: "fill", d: smoothD([P(.16, .24), P(.5 + .6 * sn, .14), P(.44 + .48 * sn, .26 + .36 * open), P(.1, .34 + .1 * open)], true, .3), fill: "shu", outline: 1 },
    { t: "fill", d: polyD([P(.38 + .46 * sn, .15), P(.42 + .5 * sn, .25), P(.34 + .42 * sn, .17)]), fill: "gofun", noPrint: true });
  if (species !== "horse") out.push({ t: "line", d: carvedLine([P(.58 + .68 * sn, .12), P(.4 + .45 * sn, .24), P(.14, .26)], hs * .05, { taper: "end", minRatio: .3, smooth: true }), color: "sumi" });
  // Nose leather with a nostril, and a line up the bridge of the muzzle.
  if (species === "horse") out.push({ t: "fill", d: smoothD([P(1.5, -.06), P(1.66, -.06), P(1.64, .06), P(1.52, .05)], true, .5), fill: "sumi", opacity: .85 });
  else if (species === "monkey") out.push({ t: "dots", d: circleD((.56 + .7 * sn) * hs, .06 * hs, hs * .035) + circleD((.5 + .7 * sn) * hs, .08 * hs, hs * .035), color: "sumi" });
  else out.push({ t: "fill", d: smoothD([P(.52 + .66 * sn, -.04), P(.63 + .74 * sn, .0), P(.62 + .72 * sn, .1), P(.53 + .64 * sn, .1)], true, .4), fill: species === "rabbit" ? "sakura" : "sumi", outline: .6 });
  if (species !== "horse") out.push({ t: "line", d: carvedLine([P(.42, -.36), P(.52 + .6 * sn, -.12)], hs * .03, { taper: "both", minRatio: .3 }), color: dark, opacity: .55 });
  // Eye: dark rim (heavier on the upper lid), iris, pupil (slit for fox and cat), catchlight; brow hairs above it.
  // The monkey's eyes look forward from under a heavy brow; the horse's sit high and far back on its long head.
  const ex = species === "tanuki" ? .14 : species === "monkey" ? .36 : species === "horse" ? .04 : .1, ey = species === "horse" ? -.3 : species === "monkey" ? -.22 : -.24;
  const ew = species === "rabbit" ? .13 : species === "monkey" ? .12 : .16, eh = species === "rabbit" ? .11 : species === "monkey" ? .1 : .09;
  if (blink) out.push({ t: "line", d: carvedLine([P(ex - ew, ey), P(ex, ey + .05), P(ex + ew * 1.05, ey - .01)], hs * .055, { taper: "both", minRatio: .4 }), color: "sumi" });
  else {
    const almond = smoothD([P(ex - ew, ey + .02), P(ex - ew * .2, ey - eh), P(ex + ew * 1.05, ey - .02), P(ex + ew * .1, ey + eh * .85)], true, .5);
    out.push({ t: "fill", d: almond, fill: look.accent ?? b.iris, outline: 1.2 });
    out.push(b.slit ? { t: "fill", d: ellipseD((ex + .02) * hs, ey * hs, hs * .025, hs * eh * .8), fill: "sumi" } : { t: "dots", d: circleD((ex + .02) * hs, ey * hs, hs * eh * .62), color: "sumi" });
    out.push({ t: "dots", d: circleD((ex + .05) * hs, (ey - eh * .35) * hs, Math.max(.7, hs * .022)), color: "gofun" });
    out.push({ t: "line", d: carvedLine([P(ex - ew * 1.05, ey - .01), P(ex - ew * .1, ey - eh * 1.05), P(ex + ew * 1.1, ey - .03)], hs * .045, { taper: "both", minRatio: .3, smooth: true }), color: "sumi" });
  }
  out.push({ t: "stroke", d: [0, 1, 2].map(i => { const a = P(ex - .06 + i * .09, ey - .16), e = P(ex - .12 + i * .1, ey - .28 - i * .02); return `M${a[0].toFixed(1)} ${a[1].toFixed(1)}L${e[0].toFixed(1)} ${e[1].toFixed(1)}`; }).join(""), color: dark, width: .7, opacity: .6 });
  // Whisker pads and whiskers.
  if (species !== "horse" && species !== "monkey") out.push({ t: "dots", d: [0, 1, 2].map(i => circleD((.36 + .42 * sn + i * .05) * hs, (.14 + (i % 2) * .05) * hs, hs * .018)).join(""), color: "sumi" });
  if (species === "cat" || species === "rabbit" || species === "tanuki" || species === "fox")
    out.push({ t: "stroke", d: [0, 1, 2].map(i => `M${((.38 + .44 * sn) * hs).toFixed(1)} ${((.15 + i * .05) * hs).toFixed(1)}q${(hs * .4).toFixed(1)} ${(hs * (i - 1) * .05).toFixed(1)} ${(hs * .8).toFixed(1)} ${(hs * ((i - 1) * .16 + .04)).toFixed(1)}`).join(""), color: "sumi", width: .7, opacity: .55 });
  return out;
}

function quadruped(species: QuadSpecies, spec: UkiyoeCreatureSpec, frame: number, wind: number, seed: number): Prim[] {
  const b = BEASTS[species], look = spec.look ?? {}, k = (look.size ?? b.L) / b.L;
  const L = b.L * k, leg = b.leg * k, bh = b.bh * k, hs = b.head * k, fur = bh * b.fur;
  const color = look.color ?? b.color, belly = look.belly ?? b.belly, dark = look.dark ?? b.dark;
  const stocking = look.color ? undefined : b.stocking;
  const st = actionState(spec.actions ?? [], frame), tr = creatureTravel(spec.actions ?? [], frame);
  const run = st("run").w, hop = st("hop").w, sit = Math.max(st("sit").w, st("sleep").w), stand = Math.max(st("stand").w, st("drum").w), sleep = st("sleep").w;
  const gaitLen = L * (run > .5 ? 1.6 : hop > .5 ? 1.2 : .9);
  const ph = tr.dist / gaitLen * Math.PI * 2, moving = tr.moving ? 1 : 0;
  // Body pitch: sitting raises the chest just enough for straight front legs to reach the ground; standing (tanuki)
  // turns the body upright on its hind legs; sleeping lays it flat.
  const sitPitch = species === "rabbit" ? -22 : -46;
  const pitch = sitPitch * sit * (1 - sleep) - 80 * stand + (hop > 0 ? -Math.sin(ph) * 14 * hop * moving : 0);
  const bob = moving * (run > .5 ? Math.abs(Math.sin(ph)) * leg * .18 : Math.abs(Math.sin(ph * 2)) * leg * .04) + (hop > 0 ? Math.max(0, Math.sin(ph)) * leg * 1.2 * hop * moving : 0);
  const leap = st("leap"), leapT = leap.w > 0 && leap.a ? span(leap.t, 0, leap.a.end - leap.a.start) : 0, leapH = leap.w * Math.sin(Math.PI * leapT) * leg * 2.4;
  // Standing, the legs reach the ground exactly (hind: upper .52 at 78°, lower .58 at 112° from a root .1·bh below the hip).
  const hipStand = -leg * (.52 * Math.sin(78 * DEG) + .58 * Math.sin(112 * DEG)) - bh * .1, hipLow = -bh * .45;
  const hipY = lerp(lerp(lerp(hipStand, hipLow, sit), -leg * 1.02, stand), hipLow * .9, sleep) - bob - leapH;
  const hip: Pt = [-L * .34, hipY], pivot = hip;
  const R = (p: Pt) => rot(p, pitch, pivot);
  const shoulder = R([L * .3, hip[1] + bh * .06]);
  const by = hip[1] + bh * .45, top = hip[1] - bh * .5;
  // The body's contour, in three runs: the back (rump → withers → neck), the front of the chest down to the brisket,
  // and the belly back to the rump (a deep chest, a tucked waist, the flank rising into the thigh).
  const backLine = ([[-L * .52, hip[1] + bh * .02], [-L * .47, top + bh * .1], [-L * .34, top - bh * .04], [-L * .12, top + bh * .07], [L * .12, top + bh * .04],
    [L * .3, top - bh * .06], [L * .45, top + bh * .04]] as Pt[]).map(R);
  const chestLine = ([[L * .45, top + bh * .04], [L * .53, hip[1] - bh * .04], [L * .48, by - bh * .02], [L * .32, by + bh * b.chest]] as Pt[]).map(R);
  const bellyLine = ([[L * .32, by + bh * b.chest], [L * .12, by + bh * (b.chest * .6 - b.tuck * .2)], [-L * .08, by - bh * b.tuck * .6], [-L * .22, by - bh * b.tuck],
    [-L * .36, by - bh * b.tuck * .3], [-L * .5, hip[1] + bh * .24], [-L * .52, hip[1] + bh * .02]] as Pt[]).map(R);
  const torsoPts = [...backLine, ...chestLine.slice(1), ...bellyLine.slice(1, -1)];
  // The coat's silhouette: the same contour, its long-haired stretches (chest ruff, belly fringe, a little along the
  // back) breaking into tufts lying toward the tail and down. One shape, one key line, as the prints carve it.
  const ring = smoothPts(torsoPts, 4), nB = (backLine.length - 1) / torsoPts.length, nC = (backLine.length + chestLine.length - 2) / torsoPts.length;
  const hairAt = (u: number) => .7 * (u < nB ? fur * .35 * smooth(span(u, .05, .2)) * (1 - smooth(span(u, nB - .08, nB))) : u < nC ? fur * 1.25 * smooth(span(u, nB, nB + .04)) : fur * (1.1 - .7 * smooth(span(u, .82, .97))));
  const coatPts = fur > 1.2 ? tufted(ring, hairAt, -1, u => u < nB ? -1 : 1, seed + 71, true) : ring;
  const coatD = polyD(coatPts);
  // Everything but the coat: a frame around the creature with the coat cut out (wound the other way), for clipping.
  const area = (q: readonly Pt[]) => q.reduce((acc, p2, i2) => { const n2 = q[(i2 + 1) % q.length]; return acc + p2[0] * n2[1] - n2[0] * p2[1]; }, 0);
  const F = L * 4, box: Pt[] = [[-F, -F * 1.5], [F, -F * 1.5], [F, F], [-F, F]];
  const outsideCoat = polyD(area(box) > 0 === area(coatPts) > 0 ? box : box.slice().reverse()) + polyD(coatPts.slice().reverse());
  // The coat colour shades from the back to a pale underside: a narrow band, so the white reads as the chest and belly.
  const coatFill = { type: "linear" as const, angle: 90, stops: [[0, color, 1], [.62, color, 1], [.8, belly, 1], [1, belly, 1]] as [number, UkiyoePaint, number][] };
  const legColor = species === "tanuki" ? dark : color;
  // Legs in world angles (0 = forward, 90 = straight down). Lateral-sequence walk, bounding run, rabbit hop. The rig
  // solves two segments (upper, lower); the drawing adds the hock (hind) and the wrist (fore) along the lower segment.
  const legPrims = (near: boolean): Prim[] => {
    const out: Prim[] = [];
    for (const [hind, phase] of [[true, near ? 0 : .5], [false, near ? .25 : .75]] as const) {
      const p = ph / (Math.PI * 2) + (run > .5 ? (hind ? 0 : .5) + (near ? .08 : 0) : hop > .5 ? (hind ? 0 : .5) : phase);
      const swing = Math.sin(p * Math.PI * 2) * (run > .5 ? 38 : hop > .5 ? 30 : 22) * moving;
      const lift = Math.max(0, Math.cos(p * Math.PI * 2)) * moving;
      const root = hind ? R([-L * .33, hip[1] + bh * .1]) : shoulder;
      const reach = !hind && sit > 0 ? lerp(1, clamp((-root[1]) / (leg * 1.06), 1, 2.4), sit * (1 - sleep)) : 1;
      const seg1 = leg * (hind ? .52 : .5) * reach, seg2 = leg * (hind ? .58 : .56) * reach;
      let a1 = hind ? 78 - swing : 92 - swing, a2 = hind ? 112 - swing * .3 + lift * 25 : 88 - swing * .2 - lift * 45;
      const mix = (w: number, t1: number, t2: number) => { if (w > 0) { a1 = lerp(a1, t1, w); a2 = lerp(a2, t2, w); } };
      mix(sit * (1 - sleep), hind ? 6 : 90, hind ? 168 : 90);
      if (!hind) mix(stand, 30 + Math.sin(frame / (st("drum").w > .5 ? 2.4 : 22)) * 35 * Math.max(st("drum").w, .2), 110);
      else mix(stand, near ? 84 : 96, near ? 96 : 84);
      mix(sleep, hind ? 8 : 12, hind ? 170 : 4);
      if (leap.w > 0) { const k2 = leap.w * Math.sin(Math.PI * leapT); a1 = lerp(a1, hind ? 160 : 25, k2); a2 = lerp(a2, hind ? 175 : 15, k2); }
      const knee = polar(root, a1, seg1), paw = polar(knee, a2, seg2);
      // The hock bends back from the line knee → paw; the wrist sits low on the fore leg with the pastern angled forward.
      const dx = paw[0] - knee[0], dy = paw[1] - knee[1], dl = Math.hypot(dx, dy) || 1, back: Pt = [dy / dl, -dx / dl];
      const sideSign = back[0] > 0 ? -1 : 1;   // perpendicular pointing toward the tail
      const joint: Pt = hind ? [lerp(knee[0], paw[0], .55) + back[0] * sideSign * leg * .1, lerp(knee[1], paw[1], .55) + back[1] * sideSign * leg * .1]
        : [lerp(knee[0], paw[0], .8) - back[0] * sideSign * leg * .02, lerp(knee[1], paw[1], .8) - back[1] * sideSign * leg * .02];
      const w0 = (hind ? bh * .36 : bh * .25) * (species === "rabbit" && hind ? 1.35 : 1), w1 = bh * .085;
      // Upper leg: the thigh (or the shoulder and upper arm) as a tapering mass rising into the body; the lower leg slim.
      const massTop = hind ? R([-L * .3, top + bh * .32]) : R([L * .26, top + bh * .3]);
      const upper = carvedLine([massTop, root, knee], w0 * 2, { taper: "end", minRatio: .36, smooth: true, wobble: .03 });
      const lower = carvedLine([knee, joint, paw], w0 * .62, { taper: "end", minRatio: w1 * 2 / (w0 * .62), smooth: true, wobble: .03 });
      if (!near) out.push({ t: "fill", d: upper + lower, fill: legColor, outline: 1, union: true, grain: .2 });
      else {
        // Inside the body the thigh carries no key line: it is the coat itself, its edge shown by one carved contour
        // sweeping down its front (as the prints draw a haunch or a shoulder). Outside the body it is outlined.
        out.push({ t: "clip", d: outsideCoat, key: "legout", prims: [{ t: "fill", d: upper + lower, fill: legColor, outline: 1, union: true, grain: .2 }] });
        // (Inside the body the mass is the coat colour even where the lower leg is dark, as on the tanuki.)
        out.push({ t: "clip", d: coatD, key: "legin", prims: [{ t: "fill", d: upper + lower, fill: color, grain: .3 }] });
        const front = hind ? [polar(massTop, a1 - 70, w0 * .55), polar(root, a1 - 80, w0 * .95), polar(knee, a1 - 90, w0 * .38)] : [polar(massTop, a1 + 60, w0 * .4), polar(root, a1 - 85, w0 * .9), polar(knee, a1 - 90, w0 * .38)];
        out.push({ t: "line", d: carvedLine(front, Math.max(1, bh * .035), { taper: "both", minRatio: .15, smooth: true }), color: "sumi", opacity: .85 });
      }
      // Breeches: long fur on the back of the thigh (fox, tanuki), tufts lying down the leg.
      if (hind && fur > 2) {
        const br = furEdge([polar(root, a1 + 100, w0 * .7), polar(knee, a1 + 90, w0 * .3)], fur * .8, sideSign > 0 ? -1 : 1, 1, seed + (near ? 7 : 9));
        out.push({ t: "fill", d: br.band, fill: legColor, noPrint: true });
      }
      // Stockings: the dark lower leg of the fox.
      if (stocking) out.push({ t: "fill", d: carvedLine([[lerp(knee[0], joint[0], .55), lerp(knee[1], joint[1], .55)], joint, paw], w0 * .44, { taper: "end", minRatio: .6, smooth: true }), fill: stocking, opacity: .92 });
      // Paw with toes.
      if (b.hoof) {
        // A hoof: the fetlock's tuft over a dark horn cap, wider at the ground, the toe forward.
        const hw = w1 * 1.25;
        out.push({ t: "fill", d: polyD([[paw[0] - hw * .8, paw[1] - hw * 1.3], [paw[0] + hw * .7, paw[1] - hw * 1.3], [paw[0] + hw * 1.25, paw[1] + hw * .35], [paw[0] - hw * 1, paw[1] + hw * .35]]), fill: "sumi", outline: 1 });
        out.push({ t: "fill", d: smoothD([[paw[0] - hw * 1.1, paw[1] - hw * 1.2], [paw[0] - hw * .3, paw[1] - hw * 2.2], [paw[0] + hw * .9, paw[1] - hw * 1.5], [paw[0] + hw * .2, paw[1] - hw * 1.1]], true, .4), fill: stocking ?? legColor, noPrint: true });
        out.push({ t: "stroke", d: `M${(paw[0] - hw * .6).toFixed(1)} ${(paw[1] - hw * .4).toFixed(1)}l${(hw * 1.4).toFixed(1)} 0`, color: "usuzumi", width: .7, opacity: .6 });
      } else {
        const pawD = smoothD([[paw[0] - w1 * .9, paw[1] - w1 * .3], [paw[0] + w1 * .2, paw[1] - w1 * .85], [paw[0] + w1 * 1.9, paw[1] - w1 * .3], [paw[0] + w1 * 1.7, paw[1] + w1 * .45], [paw[0] - w1 * .7, paw[1] + w1 * .45]], true, .45);
        out.push({ t: "fill", d: pawD, fill: species === "monkey" ? "kogecha" : stocking ?? legColor, outline: 1 });
        out.push({ t: "stroke", d: (species === "monkey" ? [.3, .75, 1.2] : [.55, 1.15]).map(f => `M${(paw[0] + w1 * f).toFixed(1)} ${(paw[1] + w1 * .45).toFixed(1)}l${(-w1 * .15).toFixed(1)} ${(-w1 * .55).toFixed(1)}`).join(""), color: "sumi", width: .8, opacity: .8 });
      }
      // Hairlines down the leg.
      out.push({ t: "stroke", d: (near ? furAlong([massTop, root, knee], w0 * 1.4, Math.round(16 * b.hairs), bh * .13, seed + (hind ? 1 : 2)) : "") + furAlong([knee, joint, paw], w0 * .45, Math.round(6 * b.hairs), bh * .09, seed + 3), color: dark, width: .55, opacity: .42 });
      if (!near) out.push({ t: "fill", d: upper + lower, fill: "sumi", opacity: .22, noPrint: true });
    }
    return out;
  };
  // Tail(s): a chain swinging with the gait, the wind and its own lag; long-haired tails are tufted at the edges.
  const tails = species === "fox" ? clamp(Math.round(look.tails ?? 1), 1, 9) : 1;
  const tailPrims: Prim[] = [];
  const tailRoot = R([-L * .48, hip[1] - bh * .22]);
  for (let t = 0; t < tails; t++) {
    const fan = tails > 1 ? (t / (tails - 1) - .5) * 110 : 0;
    const pts: Pt[] = [tailRoot];
    let a = (species === "dog" ? -60 : species === "rabbit" ? -150 : species === "cat" ? -120 : species === "horse" ? -178 : species === "monkey" ? -140 : -165) + fan + pitch * .6, at = tailRoot;
    const segs = 10, len = b.tail * k;
    for (let i = 0; i < segs; i++) {
      const u = i / segs;
      a += (species === "dog" ? -24 : species === "cat" ? 6 + Math.sin(frame / 14 + t) * 10 : species === "horse" ? -13 * (1 - u * .5) + (moving ? 2 : 0) : 3) + Math.sin(frame / 9 + i * .6 + t + seed) * (4 + 8 * u) * (1 + moving)
        - wind * 8 * u * (species === "rabbit" ? 0 : 1) + (sit * 12);
      at = polar(at, a, len / segs);
      pts.push(at);
    }
    if (species === "horse") {
      // A horse's tail: a short dock, then a long fall of hair in strands, swinging and parting as it moves.
      const strands: string[] = [];
      for (let k2 = 0; k2 < 9; k2++) {
        const off = (k2 - 4) / 4, sp: Pt[] = pts.map((q, i) => { const u = i / (pts.length - 1); return add(q, [off * b.tailW * k * .25 * u + Math.sin(frame / 10 + k2 + u * 3) * b.tailW * k * .08 * u, off * b.tailW * k * .1 * u]); });
        strands.push(ribbonQ(sp.slice(1), b.tailW * k * .32, b.tailW * k * .03));
      }
      tailPrims.push({ t: "fill", d: carvedLine(pts.slice(0, 3), b.tailW * k * .45, { taper: "end", minRatio: .6, smooth: true }), fill: color, outline: 1 });
      tailPrims.push({ t: "stroke", d: strands.join(""), color: "sumi", width: 1.6 }, { t: "fill", d: strands.join(""), fill: b.mane ?? "sumi" });
      tailPrims.push({ t: "stroke", d: strands.join(""), color: "usuzumi", width: .5, opacity: .35 });
      continue;
    }
    if (species === "rabbit") {
      const puffD = furEdge(Array.from({ length: 13 }, (_, i) => polar([tailRoot[0] - 4 * k, tailRoot[1]], i * 30, b.tailW * k * .45)), b.tailW * k * .3, 1, 1, seed + 51);
      tailPrims.push({ t: "fill", d: ellipseD(tailRoot[0] - 4 * k, tailRoot[1], b.tailW * k * .5, b.tailW * k * .46), fill: "gofun", outline: 1 }, { t: "fill", d: puffD.band, fill: "gofun", noPrint: true });
      continue;
    }
    const wd = b.tailW * k * (tails > 1 ? .75 : 1), long = fur > 2 && species !== "dog";
    // One shape: both edges of the tail (swelling for brush tails), tufted where the hair is long, round the tip.
    const swell = species === "fox" || species === "tanuki";
    const edge = (side: 1 | -1) => pts.map((q, i) => {
      const a2 = pts[Math.max(0, i - 1)], b2 = pts[Math.min(pts.length - 1, i + 1)], l = Math.hypot(b2[0] - a2[0], b2[1] - a2[1]) || 1, u = i / (pts.length - 1);
      const w = wd * .5 * (swell ? .45 + 1.1 * Math.sin(Math.PI * Math.min(1, u * .9 + .08)) ** .8 * (1 - .5 * u ** 4) : 1 - .7 * u);
      return [q[0] - (b2[1] - a2[1]) / l * w * side, q[1] + (b2[0] - a2[0]) / l * w * side] as Pt;
    });
    const tip = polar(pts[pts.length - 1], a, wd * (swell ? .25 : .15));
    const outline = [...edge(1), tip, ...edge(-1).reverse()];
    // Many tails (kyūbi) overlap, so each is drawn lighter: shorter locks and a finer line.
    const many = tails > 1;
    const tailPts = long ? tufted(smoothPts(outline, 3, false), u => wd * (many ? .1 : .2) * Math.sin(Math.PI * u) ** .4, 1, u => u < .5 ? 1 : -1, seed + t * 13) : smoothPts(outline, 3, false);
    const tailD = polyD(tailPts);
    tailPrims.push({ t: "fill", d: tailD, fill: color, outline: many ? .7 : 1.1, grain: .3 });
    // The white tip and the tanuki's rings ride inside the tail shape.
    const inside: Prim[] = [];
    if (b.tailTip && !look.color) inside.push({ t: "fill", d: ellipseD(...polar(pts[pts.length - 1], a, wd * .1), wd * 1.15, wd * .95), fill: b.tailTip });
    if (species === "tanuki") for (let r = 3; r < pts.length - 1; r += 3) inside.push({ t: "line", d: carvedLine([polar(pts[r], a + 90, wd * .6), polar(pts[r], a - 90, wd * .6)], wd * .2, { taper: "none" }), color: dark, opacity: .85 });
    inside.push({ t: "stroke", d: furAlong(pts, wd * .8, Math.round((many ? 10 : 26) * b.hairs), wd * .45, seed + t), color: many ? "usuzumi" : dark, width: .55, opacity: many ? .35 : .45 });
    tailPrims.push({ t: "clip", d: tailD, key: "tail" + t, prims: inside });
  }
  // Head on the neck: pitch for howl/look, lowered for sleep.
  const howl = st("howl").w, lk = st("look"), roar = st("roar").w;
  const headPitch = -55 * howl + (lk.a?.angle ?? -10) * lk.w + 30 * sleep + 10 * sit - pitch * .55;
  const neck = R([L * .44, top + bh * .05]), nl = b.neck ?? 1, headRot = headPitch + (b.headTilt ?? 0) * (1 - .6 * sleep);
  // A long neck (the horse's) rises steeply from the withers; the head hangs from its end, tilted face-down.
  const headC = add(neck, rot([hs * .9 * (nl > 1 ? .55 * nl : 1), -hs * (.55 - .8 * sleep) * (nl > 1 ? 1.25 * nl : nl)], -headPitch * .3 + pitch * .45, [0, 0]));
  const blink = (frame + (seed % 97)) % 97 < 4 || sleep > .5;
  const open = Math.max(howl * (.6 + .3 * Math.sin(frame / 3)), roar);
  const out: Prim[] = [];
  out.push({ t: "fill", d: ellipseD(hip[0] + L * .15, 2, L * .5 * (1 - leapH / (leg * 6)), L * .05), fill: "sumi", opacity: .1, noPrint: true });
  out.push(...legPrims(false), ...tailPrims);
  // Neck and coat: one silhouette with one key line. The neck sweeps up from the withers and the chest to the nape and
  // the throat; long-coated animals carry a pale throat ruff from the cheeks down to the chest.
  const hp = (x: number, y: number) => add(headC, rot([x * hs, y * hs], headRot, [0, 0]));
  const withers = R([L * .28, top - bh * .05]), chestFront = R([L * .5, hip[1] + bh * .05]), nape = hp(-.5, -.42), throat = hp(-.05, .42);
  const throatEdge = smoothPts([throat, add(lerp2(throat, chestFront, .5), rot([bh * .08, 0], pitch, [0, 0])), chestFront], 4, false);
  const throatTufts = fur > 1.2 ? tufted(throatEdge, u => fur * .8 * Math.sin(Math.PI * Math.min(1, u * 1.2 + .1)) ** .5, -1, () => 1, seed + 77) : throatEdge;
  const neckD = polyD([...smoothPts([withers, lerp2(withers, nape, .5), nape], 4, false), ...throatTufts, R([L * .3, hip[1]])]);
  const ruffD = polyD([...throatTufts, R([L * .36, hip[1] + bh * .1]), hp(-.3, .3)]);
  out.push({ t: "fill", d: neckD + coatD, fill: coatFill, outline: 1.2, union: true, grain: .3 });
  // Shading and hair, clipped to the coat: the back a shade darker, the underside in shadow, carved hairlines lying
  // toward the tail, a few pale ones catching the light, and hairlines up each tuft of the long fur.
  const hairsN = Math.round(110 * b.hairs * Math.min(1.8, k));
  out.push({ t: "clip", d: coatD + neckD, union: true, key: "coat", prims: [
    { t: "line", d: carvedLine(backLine, bh * .42, { taper: "both", minRatio: .5, smooth: true }), color: dark, opacity: species === "fox" ? .18 : .12 },
    { t: "line", d: carvedLine(bellyLine.slice(1, -1), bh * .26, { taper: "both", minRatio: .4, smooth: true }), color: "sumi", opacity: .06 },
    { t: "stroke", d: furField(backLine.slice().reverse(), bellyLine.slice(1, -1), hairsN, bh * .18, seed + 61), color: dark, width: .55, opacity: .5 },
    { t: "stroke", d: furField(backLine.slice().reverse(), bellyLine.slice(1, -1), Math.round(hairsN * .3), bh * .15, seed + 67), color: "gofun", width: .5, opacity: .4 },
    { t: "stroke", d: furAlong([withers, nape], bh * .5, Math.round(14 * b.hairs), bh * .14, seed + 69), color: dark, width: .5, opacity: .45 },
  ] });
  if (b.ruff !== color && !look.color) out.push({ t: "fill", d: ruffD, fill: b.ruff, noPrint: true });
  if (fur > 1.2) {
    const ruffHairs = furEdge(chestLine.slice(1), fur * 1.1, 1, 1, seed + 71).hairs + furEdge(bellyLine.slice(1, -2), fur * .9, 1, 1, seed + 73).hairs;
    out.push({ t: "stroke", d: ruffHairs, color: "usuzumi", width: .55, opacity: .45 });
  }
  // Calico patches (cat) and the tanuki's pale belly.
  if (species === "cat" && !look.color) out.push({ t: "clip", d: coatD, key: "calico", prims: [
    { t: "fill", d: smoothD([R([-L * .38, top]), R([-L * .12, top - bh * .05]), R([-L * .02, top + bh * .5]), R([-L * .3, top + bh * .55])], true, .5), fill: "ki", opacity: .92 },
    { t: "fill", d: smoothD([R([-L * .06, top - bh * .1]), R([L * .14, top - bh * .05]), R([L * .2, top + bh * .4]), R([0, top + bh * .45])], true, .5), fill: "sumi", opacity: .88 },
    { t: "fill", d: smoothD([R([L * .22, top]), R([L * .42, top + bh * .05]), R([L * .38, top + bh * .3]), R([L * .25, top + bh * .3])], true, .5), fill: "ki", opacity: .9 }] });
  if (species === "tanuki") out.push({ t: "clip", d: coatD, key: "tbelly", prims: [{ t: "fill", d: ellipseD(...R([L * .05, by - bh * .1]), L * .3, bh * .38), fill: belly, opacity: .9 }] });
  out.push(...legPrims(true));
  // The horse's mane falls from the crest of the neck in long locks over its side, the forelock between the ears.
  if (b.mane) {
    const crest = smoothPts([lerp2(withers, nape, .02), lerp2(withers, nape, .5), lerp2(nape, hp(-.1, -.62), .6)], 6, false);
    const fall = crest.map((q, i) => { const u = i / (crest.length - 1); return add(q, [-hs * (.18 + .1 * Math.sin(frame / 13 + u * 5)) - wind * hs * .1, hs * (.5 - .2 * u) + (moving ? Math.sin(ph + u * 3) * hs * .06 : 0)]); });
    const locks = tufted(fall, () => hs * .2, 1, () => 1, seed + 91);
    const maneD = polyD([...crest, ...locks.slice().reverse()]);
    out.push({ t: "fill", d: maneD, fill: b.mane, outline: .8, grain: .3 }, { t: "stroke", d: crest.slice(1, -1).map((q, i) => { const e = fall[i + 1]; return `M${q[0].toFixed(1)} ${q[1].toFixed(1)}L${lerp(q[0], e[0], .9).toFixed(1)} ${lerp(q[1], e[1], .9).toFixed(1)}`; }).join(""), color: "usuzumi", width: .6, opacity: .5 });
  }
  if (look.tack && species === "horse") {
    // Harness of the packhorses on the Tōkaidō: a red breast strap and crupper, a striped saddle cloth, a pack on top.
    const strap = (pts: Pt[], w: number) => carvedLine(pts, w, { taper: "none", smooth: true });
    out.push({ t: "fill", d: smoothD([R([-L * .22, top - bh * .02]), R([L * .2, top - bh * .04]), R([L * .22, top + bh * .62]), R([-L * .24, top + bh * .62])], true, .2), fill: "ai", outline: 1, pattern: { type: "shima", color: "gofun", scale: .5, opacity: .7 } });
    out.push({ t: "fill", d: smoothD([R([-L * .14, top - bh * .32]), R([L * .12, top - bh * .34]), R([L * .16, top + bh * .05]), R([-L * .18, top + bh * .06])], true, .3), fill: "kincha", outline: 1, grain: .7 });
    out.push({ t: "stroke", d: [-.08, 0, .08].map(f => `M${R([L * f, top - bh * .33])[0].toFixed(1)} ${R([L * f, top - bh * .33])[1].toFixed(1)}L${R([L * (f + .02), top + bh * .05])[0].toFixed(1)} ${R([L * (f + .02), top + bh * .05])[1].toFixed(1)}`).join(""), color: "cha", width: 1, opacity: .7 });
    out.push({ t: "fill", d: strap([R([L * .2, top + bh * .1]), R([L * .5, hip[1] - bh * .02]), R([L * .48, by - bh * .1])], bh * .08) + strap([R([-L * .22, top + bh * .1]), R([-L * .48, hip[1] - bh * .1]), R([-L * .44, hip[1] + bh * .2])], bh * .08), fill: "shu", outline: .7 });
    out.push({ t: "dots", d: [R([L * .38, hip[1] - bh * .12]), R([L * .46, hip[1] + bh * .02]), R([-L * .38, hip[1] - bh * .14])].map(q => circleD(q[0], q[1], bh * .05)).join(""), color: "kin" });
  }
  out.push({ t: "group", transform: `translate(${headC[0].toFixed(1)} ${headC[1].toFixed(1)}) rotate(${headRot.toFixed(1)})`, prims: beastHead(b, species, hs, open, blink, look, seed) });
  if (look.tack && species === "horse") out.push({ t: "group", transform: `translate(${headC[0].toFixed(1)} ${headC[1].toFixed(1)}) rotate(${headRot.toFixed(1)})`, prims: [
    { t: "stroke", d: `M${(-.35 * hs).toFixed(1)} ${(-.55 * hs).toFixed(1)}Q${(-.2 * hs).toFixed(1)} ${(.1 * hs).toFixed(1)} ${(-.1 * hs).toFixed(1)} ${(.45 * hs).toFixed(1)}M${(-.15 * hs).toFixed(1)} ${(-.1 * hs).toFixed(1)}L${(1.6 * hs).toFixed(1)} ${(.02 * hs).toFixed(1)}`, color: "shu", width: Math.max(1.5, hs * .07) },
    { t: "dots", d: circleD(-.15 * hs, -.1 * hs, hs * .06), color: "kin" }] });
  if (species === "tanuki" && look.hat) out.push({ t: "group", transform: `translate(${headC[0].toFixed(1)} ${(headC[1] - hs * .7).toFixed(1)}) rotate(${(headPitch - 8).toFixed(1)})`,
    prims: [{ t: "fill", d: smoothD([[-hs * 1.4, hs * .2], [0, -hs * .7], [hs * 1.4, hs * .15], [0, hs * .05]], true, .2), fill: "kincha", outline: 1.2, grain: .7 },
      { t: "stroke", d: [-.9, -.45, 0, .45, .9].map(f => `M${(f * hs * .3).toFixed(1)} ${(-hs * .62).toFixed(1)}L${(f * hs * 1.35).toFixed(1)} ${(hs * .16).toFixed(1)}`).join(""), color: "cha", width: .7, opacity: .6 }] });
  if (species === "tanuki" && look.bottle) {
    const hand = R([L * .5, hip[1] + bh * .1]);
    out.push({ t: "fill", d: smoothD([add(hand, [-8 * k, 0]), add(hand, [-6 * k, -16 * k]), add(hand, [-2 * k, -20 * k]), add(hand, [2 * k, -16 * k]), add(hand, [8 * k, 0]), add(hand, [6 * k, 16 * k]), add(hand, [-6 * k, 16 * k])], true, .4), fill: "gofun", outline: 1.1, pattern: { type: "shima", color: "ai", scale: .3 } });
  }
  if (look.foxfire || (species === "fox" && tails > 1)) for (let i = 0; i < 3 + tails; i++) {
    const a = frame / 40 + i * 2.1, c: Pt = [hip[0] + Math.cos(a) * L * (.7 + .2 * hash01(seed, i)), hip[1] - bh * 1.4 + Math.sin(a * 1.3) * bh * .9];
    const fl = .7 + .3 * Math.abs(noise1(seed + i, frame / 4));
    out.push({ t: "glow", cx: c[0], cy: c[1], r: hs * 1.6, color: "sora", opacity: .55 * fl });
    out.push({ t: "fill", d: smoothD([add(c, [-hs * .2, 0]), add(c, [0, -hs * .55 * fl]), add(c, [hs * .2, 0]), add(c, [0, hs * .18])], true, .5), fill: "gofun", opacity: .95, noPrint: true });
  }
  return out;
}

// ---- Birds ----------------------------------------------------------------------------------------------------------------------------------
//
// Built as Koson's bird prints read: one silhouette from the breast up the neck into the head; a wing made of real
// feathers on a bone frame (shoulder, wrist, hand) — individual primaries and secondaries under two scalloped rows of
// coverts — folding along the body with the primaries crossing over the tail, spreading in flight with the hand
// lagging the wrist; legs with the backward heel joint, scaled shanks and toes (three forward, one back) with claws.

interface Bird {
  body: number; neck: number; leg: number; tail: number;
  color: UkiyoePaint; back: UkiyoePaint; neckColor: UkiyoePaint; head: UkiyoePaint; beak: UkiyoePaint; legColor: UkiyoePaint;
  primary: UkiyoePaint; secondary: UkiyoePaint; covert: UkiyoePaint; tailColor: UkiyoePaint; eye: UkiyoePaint;
  crown?: UkiyoePaint; cheek?: UkiyoePaint; bib?: UkiyoePaint; slim: number; beakLen: number; beakDepth: number; headR: number; scallop: number; sheen?: UkiyoePaint; plume?: boolean; bustle?: boolean; bars?: UkiyoePaint;
}
const BIRDS: Readonly<Record<"crane" | "heron" | "crow" | "pheasant" | "sparrow", Bird>> = {
  crane: { body: 70, neck: 66, leg: 82, tail: 26, color: "gofun", back: "gofun", neckColor: "sumi", head: "sumi", beak: "kusa", legColor: "sumi", primary: "gofun", secondary: "sumi", covert: "gofun",
    tailColor: "gofun", eye: "kogecha", crown: "shu", cheek: "gofun", slim: .85, beakLen: .62, beakDepth: .13, headR: .17, scallop: 0, bustle: true },
  heron: { body: 58, neck: 62, leg: 72, tail: 18, color: "gofun", back: "gofun", neckColor: "gofun", head: "gofun", beak: "ki", legColor: "sumi", primary: "gofun", secondary: "gofun", covert: "gofun",
    tailColor: "gofun", eye: "ki", slim: .78, beakLen: .62, beakDepth: .1, headR: .15, scallop: 0, plume: true },
  crow: { body: 46, neck: 14, leg: 28, tail: 32, color: "sumi", back: "sumi", neckColor: "sumi", head: "sumi", beak: "sumi", legColor: "sumi", primary: "sumi", secondary: "sumi", covert: "sumi",
    tailColor: "sumi", eye: "kogecha", slim: 1, beakLen: .42, beakDepth: .2, headR: .27, scallop: 1, sheen: "ai" },
  pheasant: { body: 56, neck: 22, leg: 34, tail: 96, color: "matsu", back: "cha", neckColor: "matsu", head: "matsu", beak: "kincha", legColor: "kincha", primary: "kogecha", secondary: "cha", covert: "kincha",
    tailColor: "kincha", eye: "ki", crown: "shu", slim: 1, beakLen: .2, beakDepth: .14, headR: .2, scallop: .8, sheen: "asagi", bars: "kogecha" },
  sparrow: { body: 24, neck: 6, leg: 10, tail: 15, color: "gofun", back: "cha", neckColor: "cha", head: "kogecha", beak: "sumi", legColor: "kincha", primary: "kogecha", secondary: "cha", covert: "kincha",
    tailColor: "kogecha", eye: "sumi", cheek: "gofun", bib: "sumi", slim: 1.1, beakLen: .2, beakDepth: .16, headR: .34, scallop: .7, bars: "kogecha" },
};

/**
 * Overlapping parts drawn as one outlined shape whatever their winding: the key line of every part is painted first at
 * double width, then each part is filled on its own, so only the outer half of the outer contour survives.
 */
function silhouette(parts: readonly string[], fills: readonly UkiyoeFill[], line: number, color: UkiyoePaint = "sumi", opacity?: number): Prim[] {
  return [{ t: "stroke", d: parts.join(""), color, width: line * 2, opacity }, ...parts.map((d, i): Prim => ({ t: "fill", d, fill: fills[Math.min(i, fills.length - 1)], grain: .2, opacity }))];
}
/** The angle a feather lies at when it trails behind a bone pointing at `a`: rotated `f` (0..1) of the way to the rear. */
function trail(a: number, f: number): number {
  const n = ((a % 360) + 540) % 360 - 180, rear = n >= 0 ? 180 : -180;
  return n + (rear - n) * f;
}

/** One feather: a narrow leaf from base to tip, the shaft along it. */
function feather(base: Pt, angle: number, len: number, width: number): string {
  const tip = polar(base, angle, len), mid = polar(base, angle, len * .55), n = (angle + 90) * DEG, nx = Math.cos(n), ny = Math.sin(n);
  return smoothD([[base[0] + nx * width * .3, base[1] + ny * width * .3], [mid[0] + nx * width * .5, mid[1] + ny * width * .5], tip,
    [mid[0] - nx * width * .42, mid[1] - ny * width * .42], [base[0] - nx * width * .3, base[1] - ny * width * .3]], true, .4);
}
/** A row of scalloped feather edges between two lines (coverts, breast or back feathering), as open arcs. */
function scallops(from: Pt, to: Pt, size: number, sag: number, seed: number): string {
  const L = Math.hypot(to[0] - from[0], to[1] - from[1]), n = Math.max(2, Math.round(L / size)), out: string[] = [];
  for (let i = 0; i < n; i++) {
    const a = lerp2(from, to, i / n), b = lerp2(from, to, (i + 1) / n), m = lerp2(a, b, .5);
    const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, s = sag * (.8 + .4 * hash01(seed, i, 341));
    out.push(`M${a[0].toFixed(1)} ${a[1].toFixed(1)}Q${(m[0] - dy / l * s).toFixed(1)} ${(m[1] + dx / l * s).toFixed(1)} ${b[0].toFixed(1)} ${b[1].toFixed(1)}`);
  }
  return out.join("");
}

function bird(species: keyof typeof BIRDS, spec: UkiyoeCreatureSpec, frame: number, wind: number, seed: number): Prim[] {
  const b = BIRDS[species], look = spec.look ?? {}, k = (look.size ?? b.body) / b.body;
  const st = actionState(spec.actions ?? [], frame), tr = creatureTravel(spec.actions ?? [], frame);
  const fly = st("fly").w, dance = st("dance").w, peck = st("peck"), walk = Math.max(st("walk").w, st("run").w) * (tr.moving ? 1 : 0);
  const B = b.body * k, N = b.neck * k, Lg = b.leg * k, out: Prim[] = [];
  const color = look.color ?? b.color, back = look.color ?? b.back, line = Math.max(.8, Math.min(1.3, B * .02));
  const flapRate = species === "sparrow" ? 2.2 : species === "crow" ? 4.5 : 6.5;
  const beat = (frame / flapRate + seed) % (Math.PI * 2), down = .5 - .5 * Math.cos(beat);   // 0 top of stroke … 1 bottom
  const lift = fly * (Lg * .9 + Math.sin(frame / (flapRate * 2)) * B * .08);
  const bodyC: Pt = [0, -Lg * (1 - fly) - B * .42 - lift + dance * Math.abs(Math.sin(frame / 10)) * B * .3];
  const tilt = fly * 6 - (1 - fly) * (species === "crane" || species === "heron" ? 6 : 16);
  const T = (x: number, y: number): Pt => rot(add(bodyC, [x * B, y * B]), tilt, bodyC);
  // Body: breast, back, rump; slimmer birds are longer and shallower.
  const sl = b.slim;
  const bodyPts: Pt[] = [T(.5, -.06), T(.38, -.27 * sl), T(.08, -.34 * sl), T(-.28, -.28 * sl), T(-.56, -.08), T(-.5, .05), T(-.2, .26 * sl), T(.18, .3 * sl), T(.46, .14)];
  // Neck: an S for crane and heron (stretched forward in flight), dipping to peck; short and thick for the rest.
  const pk = peck.w > 0 ? Math.max(0, Math.sin(peck.t / 5)) * peck.w : 0;
  const neckBase = T(.4, -.12), longNeck = species === "crane" || species === "heron";
  const tuck = species === "heron" && fly > .5;   // herons fly with the neck drawn back into an S; cranes stretch it out
  const headP: Pt = add(neckBase, tuck ? [N * .42, -N * .22] : fly > .5 ? [N * 1.05, -N * .05] : [N * (longNeck ? .32 : .55) + pk * N * .6, -N * (longNeck ? .95 : .6) + pk * N * 1.6 + dance * Math.sin(frame / 6) * N * .1]);
  const n1: Pt = add(neckBase, tuck ? [-N * .05, -N * .32] : fly > .5 ? [N * .5, -N * .02] : longNeck ? [N * .02 + pk * N * .3, -N * .5 + pk * N * .8] : [N * .3, -N * .35 + pk * N * .7]);
  const neckPath = smoothPts3([neckBase, n1, headP]);
  const hr = B * b.headR, neckW = Math.max(3, B * (longNeck ? .16 : .44));
  const ba = fly > .5 ? 2 : 8 + pk * 62, beakLen = B * b.beakLen;
  const tailBase = T(-.5, -.02);
  const tailTip = add(tailBase, [-b.tail * k * (fly > .5 ? 1 : .92) * Math.cos(tilt * DEG), (species === "pheasant" ? .1 : -.04) * b.tail * k + Math.sin(frame / 11) * 2 - wind * 6]);
  // Legs: the heel bends backward; flying, they trail behind (crane, heron) or tuck up.
  const legRoot = T(-.02, .26 * sl);
  const gait = tr.dist / (B * 1.2) * Math.PI * 2;
  const legPrim = (near: boolean): Prim[] => {
    const res: Prim[] = [];
    const sw = walk * Math.sin(gait + (near ? 0 : Math.PI)) * 24 + dance * Math.sin(frame / 8 + (near ? 0 : 2)) * 30;
    const raised = walk * Math.max(0, Math.sin(gait + (near ? 0 : Math.PI))) ;
    let heel = polar(legRoot, 98 - sw * .6, Lg * .48), foot = polar(heel, 84 + sw * .4 - raised * 30, Lg * .52 * (1 - raised * .15));
    if (fly > 0) {
      const trail = longNeck ? 1 : .35;
      heel = lerp2(heel, add(legRoot, [-Lg * .4 * trail, Lg * .12]), fly); foot = lerp2(foot, add(legRoot, [-Lg * .95 * trail, Lg * (longNeck ? .14 : .1)]), fly);
    }
    const w = Math.max(1.4, B * (longNeck ? .03 : .045));
    res.push({ t: "fill", d: carvedLine([legRoot, heel], w * 1.6, { taper: "end", minRatio: .7 }) + carvedLine([heel, foot], w * 1.1, { taper: "none" }), fill: b.legColor, opacity: near ? 1 : .75, union: true, outline: .5 });
    // Scales on the shank.
    if (B > 18) res.push({ t: "stroke", d: Array.from({ length: Math.round(Lg / 6) }, (_, i) => { const q = lerp2(heel, foot, (i + .5) / Math.round(Lg / 6)); return `M${(q[0] - w * .6).toFixed(1)} ${q[1].toFixed(1)}l${(w * 1.2).toFixed(1)} ${(w * .3).toFixed(1)}`; }).join(""), color: "gofun", width: .5, opacity: b.legColor === "sumi" ? .35 : .25 });
    if (fly < .6) {
      const toes = [-14, 6, 26].map(a => carvedLine([foot, polar(foot, a, B * (longNeck ? .2 : .26))], w * .9, { taper: "end", minRatio: .4 }));
      toes.push(carvedLine([foot, polar(foot, 170, B * .1)], w * .8, { taper: "end", minRatio: .4 }));
      res.push({ t: "fill", d: toes.join(""), fill: b.legColor, opacity: near ? 1 : .75 });
    }
    return res;
  };
  // A wing on its bone frame. Folded: arm forward along the side, hand back over the tail. Spread: the arm rises and
  // falls with the stroke; the hand lags behind the wrist; the primaries fan from the hand, the secondaries hang from
  // the forearm along the trailing edge.
  const wingPrims = (near: boolean): Prim[] => {
    const open = Math.max(fly, dance * .9), res: Prim[] = [];
    const shoulder = T(.16, -.2 * sl), span2 = B * (longNeck ? 1.25 : species === "sparrow" ? .9 : 1.05);
    // In flight the arm sweeps from up-and-back at the top of the stroke to down at the bottom; dancing, it waves.
    const strokeA = dance > fly ? -95 + Math.sin(frame / 7) * 50 : lerp(-112, 78, down) + (near ? 0 : -8);
    // Folded, the wrist (the bend of the wing) sits forward and down the bird's side, so the wing covers the upper flank.
    const armA = lerp(64, strokeA, open), lag = dance > fly ? 0 : lerp(-26, 20, down);
    const handA = open > .02 ? lerp(182, strokeA + lag, open) : 182;
    const wrist = polar(shoulder, armA, lerp(B * .3, span2 * .42, open)), hand = polar(wrist, handA, lerp(B * .1, span2 * .18, open));
    const pN = species === "sparrow" ? 6 : 9, sN = species === "sparrow" ? 5 : 9;
    const fw = B * (longNeck ? .12 : .14);
    const prim: string[] = [], sec: string[] = [];
    // Secondaries hang from the forearm (wrist → shoulder) along the trailing edge, always toward the rear.
    for (let i = 0; i < sN; i++) {
      const u = (i + .5) / sN, base = lerp2(wrist, shoulder, u * .92);
      const a = lerp(184 - i * 1.6, trail(armA, .5 + u * .12), open) + hashSigned(seed, i, 351) * 3;
      sec.push(feather(base, a, lerp(B * (.5 - .04 * u), span2 * (.4 - .06 * u), open), fw));
    }
    // Primaries spring from the hand: the outermost along the hand, the inner ones fanning back toward the secondaries.
    for (let i = 0; i < pN; i++) {
      const u = i / (pN - 1), base = lerp2(hand, wrist, u * .45);
      const a = lerp(181 - i * 1.4, trail(handA, u * lerp(.25, .5, open * down)), open) + hashSigned(seed, i, 352) * 2;
      prim.push(feather(base, a, lerp(B * (.95 - .22 * u), span2 * (.62 - .2 * u), open), fw * (1 - .2 * u)));
    }
    // Coverts: the shoulder-to-wrist band over the feather bases.
    const rearArm = trail(armA, .5);
    const cov = smoothD([shoulder, polar(shoulder, armA - 90 * Math.sign(rearArm - armA || 1) * -1, B * .1), wrist, polar(wrist, handA, B * .12), polar(lerp2(wrist, shoulder, .45), rearArm, lerp(B * .22, span2 * .2, open)), polar(shoulder, rearArm, B * .14)], true, .4);
    const shade = near ? 0 : .2;
    if (open < .35) {
      // Folded: one clean wing shape (one key line) with the feather edges carved inside it, primaries crossing the tail.
      const parts = [...sec, ...prim, cov];
      res.push(...silhouette(parts, [...sec.map(() => look.accent ?? b.secondary), ...prim.map(() => b.primary), b.covert], line * .8));
      res.push({ t: "stroke", d: [...sec, ...prim].join(""), color: b.secondary === "sumi" && b.primary === "sumi" ? "usuzumi" : "sumi", width: .5, opacity: .35 });
    } else {
      // Spread: each flight feather separate and outlined; coverts over their bases.
      res.push({ t: "fill", d: sec.join(""), fill: look.accent ?? b.secondary, outline: line * .8 });
      res.push({ t: "fill", d: prim.join(""), fill: b.primary, outline: line * .8 });
      res.push({ t: "fill", d: cov, fill: b.covert, outline: line * .8 });
    }
    for (let r = 0; r < 2; r++) {
      const off = lerp(B * .07, span2 * .07, open) * (r + 1);
      res.push({ t: "stroke", d: scallops(polar(shoulder, rearArm, off), polar(wrist, rearArm, off * .8), B * .1, B * .035, seed + r + (near ? 0 : 9)), color: b.covert === "sumi" ? "usuzumi" : "sumi", width: .55, opacity: b.covert === "sumi" ? .55 : .4 });
    }
    if (b.sheen) res.push({ t: "fill", d: cov, fill: b.sheen, opacity: .18, noPrint: true });
    if (shade) res.push({ t: "fill", d: sec.join("") + prim.join("") + cov, fill: "sumi", opacity: shade, noPrint: true });
    return res;
  };
  out.push({ t: "fill", d: ellipseD(0, 1, B * .6 * (1 - fly), B * .06), fill: "sumi", opacity: .1 * (1 - fly), noPrint: true });
  out.push(...legPrim(false), ...wingPrims(false));
  // Tail: a fan of feathers (barred on the pheasant); the crane's black bustle of plumes droops over it.
  const tailA = Math.atan2(tailTip[1] - tailBase[1], tailTip[0] - tailBase[0]) / DEG, tl = Math.hypot(tailTip[0] - tailBase[0], tailTip[1] - tailBase[1]);
  const tailF: string[] = [];
  const tn = species === "pheasant" ? 4 : 6;
  for (let i = 0; i < tn; i++) tailF.push(feather(add(tailBase, [0, (i - tn / 2) * B * .02]), tailA + (i - (tn - 1) / 2) * (species === "pheasant" ? 2.5 : 5), tl * (1 - Math.abs(i - (tn - 1) / 2) * .08), B * (species === "pheasant" ? .1 : .16)));
  out.push({ t: "fill", d: tailF.join(""), fill: b.tailColor, outline: line * .8 });
  if (b.bars) out.push({ t: "clip", d: tailF.join(""), key: "tailbars", prims: [{ t: "stroke", d: Array.from({ length: Math.round(tl / (B * .1)) }, (_, i) => { const q = polar(tailBase, tailA, (i + .6) * B * .1), a = polar(q, tailA + 90, B * .2), c = polar(q, tailA - 90, B * .2); return `M${a[0].toFixed(1)} ${a[1].toFixed(1)}L${c[0].toFixed(1)} ${c[1].toFixed(1)}`; }).join(""), color: b.bars, width: Math.max(.8, B * .025), opacity: .8 }] });
  // Body + neck + head: one silhouette, one key line.
  const skull = smoothD([add(headP, [-hr, hr * .2]), add(headP, [-hr * .7, -hr * .85]), add(headP, [hr * .2, -hr * 1.05]), add(headP, [hr * .95, -hr * .3]), add(headP, [hr * .9, hr * .45]), add(headP, [-hr * .1, hr * .95])], true, .45);
  const neckD = carvedLine(neckPath, neckW, { taper: longNeck ? "end" : "none", minRatio: longNeck ? hr * 1.5 / neckW : 1, smooth: true });
  const bodyD = smoothD(bodyPts, true, .45);
  out.push(...silhouette([bodyD, neckD, skull], [{ type: "linear", angle: 90, stops: [[0, back, 1], [.5, color, 1], [1, color, 1]] }, color, color], line));
  // Markings and feathering, clipped to the bird: neck colour, breast scallops or fine hairlines, cheek, bib, crown.
  const marks: Prim[] = [];
  if (b.neckColor !== color && !look.color) marks.push({ t: "fill", d: neckD + skull, fill: b.neckColor });
  if (species === "crane" && !look.color) marks.push({ t: "line", d: carvedLine(neckPath.slice(4), neckW * .4, { taper: "start", minRatio: .2, smooth: true }), color: "gofun" });   // the white nape
  if (b.head !== b.neckColor && !look.color) marks.push({ t: "fill", d: skull, fill: b.head });
  if (b.cheek && !look.color) marks.push({ t: "fill", d: ellipseD(headP[0] - hr * .15, headP[1] + hr * .25, hr * .6, hr * .45), fill: b.cheek });
  if (species === "sparrow" && !look.color) marks.push({ t: "dots", d: circleD(headP[0] - hr * .25, headP[1] + hr * .32, hr * .17), color: "sumi" });
  if (b.bib && !look.color) marks.push({ t: "fill", d: ellipseD(headP[0] + hr * .25, headP[1] + hr * 1.05, hr * .38, hr * .42), fill: b.bib });
  if (b.scallop > 0) for (let r = 0; r < 5; r++) {
    const y = -.16 + r * .1;
    marks.push({ t: "stroke", d: scallops(T(.38 - r * .02, y), T(-.36, y + .06), B * .09, B * .035 * b.scallop, seed + 60 + r), color: color === "sumi" ? "usuzumi" : "sumi", width: .55, opacity: color === "sumi" ? .45 : .3 });
  } else marks.push({ t: "stroke", d: furField([T(-.5, -.12), T(0, -.28), T(.42, -.1)], [T(-.4, .08), T(0, .24), T(.4, .12)], Math.round(40 * Math.min(2, k)), B * .12, seed + 63), color: "usuzumi", width: .5, opacity: .3 });
  if (b.sheen) marks.push({ t: "fill", d: smoothD([T(.35, -.24), T(0, -.32), T(-.3, -.24), T(-.05, -.18)], true, .5), fill: b.sheen, opacity: .25 });
  out.push({ t: "clip", d: bodyD + neckD + skull, union: true, key: "plumage", prims: marks });
  // The pheasant's red face wattle; the crane's red crown; the heron's plumes.
  if (b.crown && species === "crane") out.push({ t: "fill", d: ellipseD(headP[0] + hr * .1, headP[1] - hr * .72, hr * .48, hr * .32), fill: b.crown, noPrint: true });
  if (b.crown && species === "pheasant") out.push({ t: "fill", d: smoothD([add(headP, [-hr * .2, -hr * .55]), add(headP, [hr * .55, -hr * .5]), add(headP, [hr * .6, hr * .25]), add(headP, [-hr * .1, hr * .35])], true, .5), fill: b.crown, noPrint: true });
  if (b.plume) out.push({ t: "line", d: carvedLine([add(headP, [-hr * .5, -hr * .4]), add(headP, [-hr * 2, -hr * .1]), add(headP, [-hr * 3.2, hr * .5 + Math.sin(frame / 9) * hr * .3 - wind * hr])], hr * .2, { taper: "end", minRatio: .1, smooth: true }), color: "gofun" },
    { t: "stroke", d: `M${(headP[0] - hr * .5).toFixed(1)} ${(headP[1] - hr * .4).toFixed(1)}Q${(headP[0] - hr * 2).toFixed(1)} ${(headP[1] - hr * .1).toFixed(1)} ${(headP[0] - hr * 3.2).toFixed(1)} ${(headP[1] + hr * .5).toFixed(1)}`, color: "usuzumi", width: .5, opacity: .5 });
  // Beak (upper and lower mandibles with the gape line), eye with a ring and catchlight.
  const bTip = polar(add(headP, [hr * .75, hr * .05]), ba, beakLen), bRoot = add(headP, [hr * .7, hr * .05]);
  const upperB = smoothD([polar(bRoot, ba - 90, hr * .55 * b.beakDepth / .15), polar(lerp2(bRoot, bTip, .5), ba - 90, hr * .2 * b.beakDepth / .15), bTip, polar(lerp2(bRoot, bTip, .4), ba + 90, hr * .05), bRoot], true, .3);
  const lowerB = smoothD([bRoot, polar(lerp2(bRoot, bTip, .5), ba + 90, hr * .06), polar(bTip, ba + 180, beakLen * .06), polar(lerp2(bRoot, bTip, .4), ba + 90, hr * .32 * b.beakDepth / .15), polar(bRoot, ba + 90, hr * .4)], true, .3);
  out.push({ t: "fill", d: lowerB, fill: b.beak, outline: line * .8 }, { t: "fill", d: upperB, fill: b.beak, outline: line * .8 });
  if (species === "crow") out.push({ t: "stroke", d: furAlong([polar(bRoot, ba - 90, hr * .3), polar(lerp2(bRoot, bTip, .35), ba - 90, hr * .2)], hr * .3, 6, hr * .3, seed + 81), color: "usuzumi", width: .5, opacity: .6 });
  const eyeC = add(headP, [hr * .25, -hr * .2]), er = Math.max(1.2, hr * .2);
  out.push({ t: "dots", d: circleD(eyeC[0], eyeC[1], er * 1.25), color: color === "sumi" || b.head === "sumi" ? "kogecha" : "gofun" });
  out.push({ t: "dots", d: circleD(eyeC[0], eyeC[1], er), color: b.eye }, { t: "dots", d: circleD(eyeC[0], eyeC[1], er * .55), color: "sumi" }, { t: "dots", d: circleD(eyeC[0] + er * .3, eyeC[1] - er * .3, er * .22), color: "gofun" });
  out.push(...legPrim(true));
  if (b.bustle) {
    // The crane's black tertials: a drooping bustle of plumes over the white tail.
    const bus: string[] = [];
    for (let i = 0; i < 6; i++) bus.push(feather(T(-.22 + i * .02, -.18 + i * .03), 160 + i * 6 + Math.sin(frame / 13 + i) * 3, B * (.42 - i * .03) * (1 - fly * .4), B * .14));
    out.push({ t: "fill", d: bus.join(""), fill: "sumi", outline: line * .7, outlineColor: "sumi" }, { t: "stroke", d: bus.join(""), color: "usuzumi", width: .5, opacity: .5 });
  }
  out.push(...wingPrims(true));
  return out;
}
function smoothPts3(p: Pt[]): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i <= 10; i++) { const t = i / 10, u = 1 - t; out.push([u * u * p[0][0] + 2 * u * t * p[1][0] + t * t * p[2][0], u * u * p[0][1] + 2 * u * t * p[1][1] + t * t * p[2][1]]); }
  return out;
}

// ---- Dragon ----------------------------------------------------------------------------------------------------------------------------------

/**
 * A ryū: the body is a centreline carrying a travelling wave (head leads, tail follows), widened into a tube with
 * a ribbed belly, scale pattern, a crest of flame-like dorsal fins, four clawed legs that paddle the air, a horned
 * head with an open jaw, long whiskers that trail and curl, and an optional flaming pearl.
 */
function dragon(spec: UkiyoeCreatureSpec, frame: number, wind: number, seed: number): Prim[] {
  const look = spec.look ?? {}, Lt = look.size ?? 900, st = actionState(spec.actions ?? [], frame), tr = creatureTravel(spec.actions ?? [], frame);
  const color = look.color ?? "matsu", belly = look.belly ?? "ki", fin = look.accent ?? "shu", dark = look.dark ?? "ai";
  const coil = st("coil").w, roar = st("roar").w, moving = tr.moving ? 1 : 0;
  const n = 72, amp = Lt * (.11 + .05 * coil), waves = 1.25 + coil * .8, speed = .03 + .02 * moving;
  const spine: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n, ph = (u * waves - frame * speed + hash01(seed, 5)) * Math.PI * 2;
    const x = -u * Lt * (1 - coil * .45), y = Math.sin(ph) * amp * (.35 + .65 * Math.min(1, u * 3)) + coil * Math.sin(u * Math.PI * 3) * Lt * .12 - wind * u * u * 20;
    spine.push([x, y - Lt * .12]);
  }
  const width = (u: number) => Lt * .055 * (u < .08 ? .75 + u * 3 : u < .55 ? 1 : Math.max(.08, 1 - (u - .55) / .45 * .95));
  const left: Pt[] = [], right: Pt[] = [], normals: Pt[] = [];
  spine.forEach((q, i) => {
    const a = spine[Math.max(0, i - 1)], b2 = spine[Math.min(n, i + 1)], tx = b2[0] - a[0], ty = b2[1] - a[1], len = Math.hypot(tx, ty) || 1;
    const nx = -ty / len, ny = tx / len, w = width(i / n);
    normals.push([nx, ny]);
    left.push([q[0] + nx * w, q[1] + ny * w]); right.push([q[0] - nx * w, q[1] - ny * w]);
  });
  const out: Prim[] = [];
  // Far legs, dorsal fins (behind the body edge), body, belly plates, near legs, head.
  const legAt = [.16, .5];
  const legs = (near: boolean): Prim[] => {
    const res: Prim[] = [];
    for (const [j, u] of legAt.entries()) {
      const i = Math.round(u * n), q = spine[i], nn = normals[i];
      const root: Pt = [q[0] - nn[0] * width(u) * (near ? .2 : -.2), q[1] - nn[1] * width(u) * (near ? .2 : -.2)];
      const paddle = Math.sin(frame / 8 + j * 1.7 + (near ? 0 : 1.3)) * 30;
      const elbow = polar(root, 110 + paddle + (j ? -20 : 0), Lt * .07), foot = polar(elbow, 40 + paddle * .6, Lt * .06);
      res.push({ t: "fill", d: limb(root, elbow, Lt * .022, Lt * .016) + limb(elbow, foot, Lt * .016, Lt * .012), fill: color, outline: 1.2, pattern: { type: "uroko", color: dark, scale: .35, opacity: .5 } });
      const claws: string[] = [];
      for (let c = -1; c <= 1; c++) {
        const base = polar(foot, 40 + c * 40, Lt * .008), pts: Pt[] = [base];
        let a = 40 + paddle * .6 + c * 45, at = base;
        for (let s = 0; s < 5; s++) { at = polar(at, a, Lt * .007); pts.push(at); a += 22; }
        claws.push(carvedLine(pts, Lt * .006, { taper: "end" }));
      }
      res.push({ t: "fill", d: claws.join(""), fill: "gofun", outline: .8 });
      if (!near) res.push({ t: "fill", d: limb(root, elbow, Lt * .022, Lt * .016) + limb(elbow, foot, Lt * .016, Lt * .012), fill: "sumi", opacity: .2, noPrint: true });
    }
    return res;
  };
  out.push(...legs(false));
  const fins: string[] = [];
  for (let i = 3; i < n - 4; i += 2) {
    const u = i / n, q = left[i], nn = normals[i], h = width(u) * (.55 + .25 * Math.sin(i * 1.3 + frame / 6));
    const back = left[i + 2];
    fins.push(polyD([q, [q[0] + nn[0] * h + (back[0] - q[0]) * 1.4, q[1] + nn[1] * h + (back[1] - q[1]) * 1.4], [q[0] + nn[0] * h * .3 + (back[0] - q[0]) * 1.1, q[1] + nn[1] * h * .3 + (back[1] - q[1]) * 1.1], back]));
  }
  out.push({ t: "fill", d: fins.join(""), fill: { type: "linear", angle: 90, stops: [[0, "ki", 1], [1, fin, 1]] }, outline: 1, outlineColor: "kogecha" });
  const bodyD = smoothD([...left, ...right.slice().reverse()], true, .3);
  out.push({ t: "fill", d: bodyD, fill: { type: "linear", angle: 90, stops: [[0, color, 1], [1, dark, 1]] }, outline: 1.6, pattern: { type: "uroko", color: dark, scale: .55, opacity: .55 }, grain: .3 });
  // Belly plates along the lower edge.
  const plates: string[] = [];
  const bellyLine = right.map((q, i) => [q[0] + normals[i][0] * width(i / n) * .45, q[1] + normals[i][1] * width(i / n) * .45] as Pt);
  out.push({ t: "fill", d: smoothD([...right.slice(2, n - 3), ...bellyLine.slice(2, n - 3).reverse()], true, .3), fill: belly, outline: 1 });
  for (let i = 3; i < n - 4; i += 1) plates.push(`M${right[i][0].toFixed(1)} ${right[i][1].toFixed(1)}L${bellyLine[i][0].toFixed(1)} ${bellyLine[i][1].toFixed(1)}`);
  out.push({ t: "stroke", d: plates.join(""), color: "kogecha", width: 1, opacity: .7 });
  out.push(...legs(true));
  // Tail flame tuft.
  const tail = spine[n], tn = normals[n];
  const tuft: string[] = [];
  for (let i = 0; i < 5; i++) {
    const a0 = 180 + (i - 2) * 22 + Math.sin(frame / 5 + i) * 10, pts: Pt[] = [tail];
    let a = a0, at = tail;
    for (let j = 0; j < 6; j++) { at = polar(at, a, Lt * (.016 - .002 * Math.abs(i - 2))); pts.push(at); a += (i - 2) * 6 + 10; }
    tuft.push(carvedLine(pts, Lt * .02, { taper: "end", smooth: true }));
  }
  out.push({ t: "fill", d: tuft.join(""), fill: fin, outline: 1, outlineColor: "kogecha" });
  void tn;
  // Head: snout, open jaw, eye, horns, mane, whiskers.
  const h = spine[0], hd = normals[0], ang = Math.atan2(spine[0][1] - spine[2][1], spine[0][0] - spine[2][0]) / DEG;
  const S = Lt * .055, open = .25 + .55 * roar + .1 * Math.sin(frame / 9);
  const headPrims: Prim[] = [];
  headPrims.push({ t: "fill", d: smoothD([[-S * 1.2, -S * .9], [S * .2, -S * 1.25], [S * 1.4, -S * .8], [S * 2.6, -S * .55], [S * 2.75, -S * .2], [S * 1.4, -S * .05], [0, S * .3], [-S * 1.1, S * .6]], true, .35), fill: color, outline: 1.5, pattern: { type: "uroko", color: dark, scale: .3, opacity: .4 } });
  headPrims.push({ t: "fill", d: smoothD([[S * .1, S * .2], [S * 1.4, S * (.05 + open * .6)], [S * 2.4, S * (.15 + open * .9)], [S * 2.2, S * (.4 + open * .9)], [S * .8, S * (.6 + open * .3)], [-S * .4, S * .7]], true, .35), fill: color, outline: 1.4 });
  headPrims.push({ t: "fill", d: smoothD([[S * .9, S * .08], [S * 2.6, -S * .12], [S * 2.2, S * (.12 + open * .8)], [S * 1.1, S * (.2 + open * .5)]], true, .3), fill: "shu", noPrint: true });
  const teeth: string[] = [];
  for (let i = 0; i < 4; i++) { const x = S * (1.3 + i * .32); teeth.push(polyD([[x, -S * .12], [x + S * .1, S * .12], [x + S * .2, -S * .12]])); }
  headPrims.push({ t: "fill", d: teeth.join(""), fill: "gofun", outline: .6 });
  headPrims.push({ t: "fill", d: ellipseD(S * .6, -S * .62, S * .32, S * .22), fill: "ki", outline: 1.2 });
  headPrims.push({ t: "dots", d: circleD(S * .68, -S * .62, S * .12), color: "sumi" });
  headPrims.push({ t: "line", d: carvedLine([[S * .1, -S * .9], [S * .6, -S * .95], [S * 1.1, -S * .8]], S * .14, { taper: "both" }), color: "sumi" });
  for (const [x0, len, a0] of [[-S * .3, S * 2.2, -150], [S * .1, S * 1.8, -140]] as const) {
    const pts: Pt[] = [[x0, -S * 1.05]];
    let a = a0, at = pts[0];
    for (let i = 0; i < 6; i++) { at = polar(at, a, len / 6); pts.push(at); a += i === 3 ? 40 : 8; }
    headPrims.push({ t: "fill", d: carvedLine(pts, S * .22, { taper: "end", smooth: true }), fill: "kincha", outline: 1.1 });
  }
  const mane: string[] = [];
  for (let i = 0; i < 9; i++) {
    const base: Pt = [-S * (.3 + i * .32), -S * (.55 - i * .12)], pts: Pt[] = [base];
    let a = 185 + i * 6 + Math.sin(frame / 7 + i) * 14, at = base;
    for (let s = 0; s < 8; s++) { at = polar(at, a, S * .38); pts.push(at); a += 14 + (i % 2) * 6; }
    mane.push(carvedLine(pts, S * .38, { taper: "end", smooth: true }));
  }
  headPrims.unshift({ t: "fill", d: mane.join(""), fill: fin, outline: 1, outlineColor: "kogecha" });
  const whisk: string[] = [];
  for (const [y0, dir] of [[-S * .35, -1], [S * .1, 1]] as const) {
    const pts: Pt[] = [[S * 2.3, y0]];
    let at = pts[0];
    for (let i = 0; i < 14; i++) {
      at = [at[0] - S * .38, at[1] + dir * S * .1 + Math.sin(frame / 6 + i * .7 + dir) * S * .28 - wind * S * .05 * i];
      pts.push(at);
    }
    whisk.push(carvedLine(pts, S * .1, { taper: "end", smooth: true }));
  }
  headPrims.push({ t: "fill", d: whisk.join(""), fill: "sumi", opacity: .9 });
  out.push({ t: "group", transform: `translate(${h[0].toFixed(1)} ${h[1].toFixed(1)}) rotate(${ang.toFixed(1)})`, prims: headPrims });
  if (look.pearl) {
    const pc = polar(h, ang, S * 5);
    out.push({ t: "glow", cx: pc[0], cy: pc[1], r: S * 2.4, color: "ki", opacity: .6 });
    const flames: string[] = [];
    for (let i = 0; i < 7; i++) { const a = i * 360 / 7 + frame * 3; flames.push(smoothD([polar(pc, a - 18, S * .5), polar(pc, a + Math.sin(frame / 4 + i) * 10, S * (1.1 + .3 * Math.sin(frame / 3 + i))), polar(pc, a + 18, S * .5)], true, .4)); }
    out.push({ t: "fill", d: flames.join(""), fill: "shu", opacity: .9, noPrint: true });
    out.push({ t: "fill", d: ellipseD(pc[0], pc[1], S * .55, S * .55), fill: { type: "radial", center: [.4, .4], stops: [[0, "gofun", 1], [1, "sora", 1]] }, outline: 1 });
  }
  void hd;
  return out;
}

// ---- Transform puff (henge) ------------------------------------------------------------------------------------------------------------

function puff(frame: number, a: UkiyoeCreatureAction, size: number, seed: number): { prims: Prim[]; cover: number } {
  const len = Math.max(1, a.end - a.start), t = clamp01((frame - a.start) / len);
  if (t <= 0 || t >= 1) return { prims: [], cover: 0 };
  const grow = smooth(Math.min(1, t * 2.5)), fade = 1 - smooth(Math.max(0, (t - .55) / .45));
  const blobs: string[] = [];
  for (let i = 0; i < 11; i++) {
    const a2 = i * 360 / 11 + hash01(seed, i) * 20, r = size * (.35 + .4 * hash01(seed, i, 2)) * grow;
    const c = polar([0, -size * .5], a2, size * .45 * grow);
    blobs.push(ellipseD(c[0], c[1], r, r * .85));
  }
  return { prims: [{ t: "fill", d: blobs.join(""), fill: "gofun", opacity: fade, outline: 1.2, outlineColor: "usuzumi", noPrint: true }], cover: Math.sin(Math.PI * t) };
}

export function drawCreature(spec: UkiyoeCreatureSpec, frame: number, wind: number, seed: number): DrawnCreature {
  const tr = creatureTravel(spec.actions ?? [], frame);
  let dir: 1 | -1 = spec.facing === "left" ? -1 : 1;
  let x = 0;
  for (const a of spec.actions ?? []) { if (a.start > frame) break; if (TRAVEL.has(a.type) && a.to !== undefined && a.to !== x) { dir = a.to > x ? 1 : -1; x = a.to; } }
  let prims: Prim[];
  switch (spec.species) {
    case "fox": case "tanuki": case "dog": case "cat": case "rabbit": case "monkey": case "horse": prims = quadruped(spec.species, spec, frame, wind * dir, seed); break;
    case "dragon": prims = dragon(spec, frame, wind * dir, seed); break;
    case "yukionna": case "yurei": case "rokurokubi": case "kasaobake": case "chochinobake": case "hitodama": case "kappa": case "tengu": case "karasutengu": {
      const acts = spec.actions ?? [], st = actionState(acts, frame);
      const w = (type: string) => { const e = st(type as UkiyoeCreatureActionType); return { w: e.w, t: e.t, len: e.a ? e.a.end - e.a.start : 1 }; };
      // A spirit with an `appear` is unseen until it first appears; after a `vanish` has run it stays gone (until the next
      // `appear`). The fades themselves are drawn by the yōkai.
      let seen = !acts.some(a => a.type === "appear");
      for (const a of [...acts].sort((x, y) => x.start - y.start)) {
        if (a.start > frame) break;
        if (a.type === "appear") seen = true;
        else if (a.type === "vanish") seen = frame <= a.end;
      }
      prims = seen ? drawYokai(spec.species, spec.look ?? {}, { w, moving: !!tr.moving, dist: tr.dist }, frame, wind * dir, seed) : [];
      break;
    }
    default: prims = bird(spec.species, spec, frame, wind * dir, seed);
  }
  // Henge: a puff of smoke; from the puff's midpoint the creature is gone (place what it becomes as its own node).
  for (const tf of (spec.actions ?? []).filter(a => a.type === "transform" && frame >= a.start)) {
    if (frame >= (tf.start + tf.end) / 2) prims = [];
    if (frame <= tf.end) prims = [...prims, ...puff(frame, tf, (spec.look?.size ?? 120) * 1.2, seed).prims];
  }
  return { prims, x: tr.x, y: tr.y, dir };
}
