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
import type { UkiyoePaint } from "./ukiyoe-pigments";

export type UkiyoeSpecies = "fox" | "tanuki" | "dog" | "cat" | "rabbit" | "crane" | "heron" | "crow" | "pheasant" | "sparrow" | "dragon";
export const UKIYOE_SPECIES: readonly UkiyoeSpecies[] = ["fox", "tanuki", "dog", "cat", "rabbit", "crane", "heron", "crow", "pheasant", "sparrow", "dragon"];
export type UkiyoeCreatureActionType = "walk" | "run" | "fly" | "hop" | "sit" | "stand" | "look" | "leap" | "howl" | "drum" | "peck" | "dance" | "coil" | "roar" | "transform" | "sleep";
export const UKIYOE_CREATURE_ACTIONS: readonly UkiyoeCreatureActionType[] = ["walk", "run", "fly", "hop", "sit", "stand", "look", "leap", "howl", "drum", "peck", "dance", "coil", "roar", "transform", "sleep"];

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
}
export interface UkiyoeCreatureAction { type: UkiyoeCreatureActionType; start: number; end: number; to?: number; toY?: number; via?: readonly (readonly [number, number])[]; angle?: number; amount?: number; blend?: number }
export interface UkiyoeCreatureSpec { species: UkiyoeSpecies; look?: UkiyoeCreatureLook; actions?: readonly UkiyoeCreatureAction[]; facing?: "left" | "right" }
export interface DrawnCreature { prims: Prim[]; x: number; y: number; dir: 1 | -1 }

const TRAVEL = new Set<UkiyoeCreatureActionType>(["walk", "run", "fly", "hop"]);

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
/** Short hatch strokes along an outline: fur or feather texture in key-block line. */
function hatch(points: readonly Pt[], every: number, len: number, angle: number, seed: number): string {
  const out: string[] = [];
  for (let i = 1; i < points.length - 1; i += every) {
    const q = points[i], a = points[i - 1], b = points[i + 1], t = Math.atan2(b[1] - a[1], b[0] - a[0]) / DEG + angle + hashSigned(seed, i) * 14;
    const e = polar(q, t, len * (.6 + .5 * hash01(seed, i, 2)));
    out.push(`M${q[0].toFixed(1)} ${q[1].toFixed(1)}L${e[0].toFixed(1)} ${e[1].toFixed(1)}`);
  }
  return out.join("");
}

// ---- Four-legged animals ------------------------------------------------------------------------------------------------------------------

interface Beast { L: number; bh: number; leg: number; color: UkiyoePaint; belly: UkiyoePaint; dark: UkiyoePaint; head: number; tail: number; tailW: number; ears: "fox" | "round" | "cat" | "rabbit" | "dog"; snout: number }
const BEASTS: Readonly<Record<"fox" | "tanuki" | "dog" | "cat" | "rabbit", Beast>> = {
  fox: { L: 150, bh: 46, leg: 52, color: "tan", belly: "gofun", dark: "kogecha", head: 30, tail: 120, tailW: 34, ears: "fox", snout: 1.25 },
  tanuki: { L: 128, bh: 60, leg: 34, color: "cha", belly: "kincha", dark: "kogecha", head: 32, tail: 70, tailW: 30, ears: "round", snout: .75 },
  dog: { L: 138, bh: 50, leg: 50, color: "kincha", belly: "gofun", dark: "cha", head: 30, tail: 46, tailW: 12, ears: "dog", snout: 1 },
  cat: { L: 112, bh: 40, leg: 40, color: "gofun", belly: "gofun", dark: "sumi", head: 27, tail: 92, tailW: 9, ears: "cat", snout: .6 },
  rabbit: { L: 86, bh: 48, leg: 26, color: "gofun", belly: "gofun", dark: "usuzumi", head: 26, tail: 14, tailW: 14, ears: "rabbit", snout: .6 },
};

function beastHead(b: Beast, species: string, hs: number, open: number, blink: boolean, look: UkiyoeCreatureLook, seed: number): Prim[] {
  const P = (x: number, y: number): Pt => [x * hs, y * hs];
  const color = look.color ?? b.color, belly = look.belly ?? b.belly, dark = look.dark ?? b.dark, out: Prim[] = [];
  const sn = b.snout;
  // Ears behind the skull.
  const ear = (dx: number, tall: number, wide: number, tip: number): Prim[] => {
    const base: Pt[] = [P(dx - wide, -.55), P(dx + tip, -.55 - tall), P(dx + wide, -.5)];
    return [{ t: "fill", d: smoothD(base, true, .15), fill: color, outline: 1.2 },
      { t: "fill", d: smoothD([P(dx - wide * .5, -.6), P(dx + tip * .9, -.55 - tall * .8), P(dx + wide * .45, -.56)], true, .15), fill: species === "rabbit" ? "sakura" : dark, opacity: .7, noPrint: true }];
  };
  if (b.ears === "fox") out.push(...ear(-.35, .85, .32, .05), ...ear(.05, .95, .3, .12));
  else if (b.ears === "dog") out.push(...ear(-.3, .6, .3, .08), ...ear(.05, .7, .28, .14));
  else if (b.ears === "cat") out.push(...ear(-.35, .55, .3, -.02), ...ear(.12, .6, .28, .05));
  else if (b.ears === "round") { out.push({ t: "fill", d: ellipseD(-.45 * hs, -.62 * hs, .26 * hs, .24 * hs) + ellipseD(.1 * hs, -.72 * hs, .24 * hs, .22 * hs), fill: dark, outline: 1.2 }); }
  else if (b.ears === "rabbit") {
    const flop = Math.sin(seed) * .1;
    out.push({ t: "fill", d: smoothD([P(-.5, -.5), P(-.75 + flop, -1.6), P(-.45 + flop, -2.0), P(-.2, -1.5), P(-.15, -.55)], true, .4), fill: color, outline: 1.2 });
    out.push({ t: "fill", d: smoothD([P(-.42, -.6), P(-.6 + flop, -1.5), P(-.42 + flop, -1.85), P(-.28, -1.45), P(-.25, -.62)], true, .4), fill: "sakura", opacity: .8, noPrint: true });
    out.push({ t: "fill", d: smoothD([P(-.15, -.5), P(-.2, -1.7), P(.08, -2.05), P(.2, -1.55), P(.15, -.5)], true, .4), fill: color, outline: 1.2 });
  }
  // Skull, cheek and muzzle (jaw drops with `open`).
  const skull: Pt[] = [P(-.75, .05), P(-.6, -.55), P(-.05, -.75), P(.45, -.5), P(.55 + .65 * sn, -.05), P(.6 + .7 * sn, .12), P(.4 + .5 * sn, .3), P(.1, .45), P(-.45, .5)];
  out.push({ t: "fill", d: smoothD(skull, true, .38), fill: color, outline: 1.3, grain: .2 });
  out.push({ t: "fill", d: smoothD([P(-.55, .3), P(.05, .1), P(.45 + .5 * sn, .1), P(.35 + .45 * sn, .32), P(0, .48), P(-.4, .5)], true, .4), fill: belly, noPrint: true });
  if (open > .05) out.push({ t: "fill", d: smoothD([P(.15, .2), P(.5 + .6 * sn, .12 + .02), P(.42 + .45 * sn, .25 + .35 * open), P(.1, .32 + .1 * open)], true, .3), fill: "shu", outline: 1 });
  if (species === "tanuki") out.push({ t: "fill", d: smoothD([P(-.35, -.3), P(.05, -.42), P(.4, -.28), P(.32, .02), P(.05, -.05), P(-.25, .05)], true, .5), fill: dark, opacity: .92 });
  // Eye, nose, whiskers.
  const ex = species === "tanuki" ? .12 : .08, ey = -.22;
  if (blink) out.push({ t: "line", d: carvedLine([P(ex - .12, ey), P(ex, ey + .04), P(ex + .14, ey)], hs * .05), color: "sumi" });
  else {
    out.push({ t: "fill", d: smoothD([P(ex - .16, ey + .02), P(ex, ey - .09), P(ex + .17, ey - .02), P(ex, ey + .07)], true, .5), fill: species === "fox" ? "ki" : "gofun", outline: 1.1 });
    out.push({ t: "dots", d: circleD((ex + .03) * hs, (ey - .01) * hs, hs * .06), color: "sumi" });
  }
  out.push({ t: "dots", d: circleD((.58 + .7 * sn) * hs, .08 * hs, hs * .07), color: "sumi" });
  if (species === "cat" || species === "rabbit" || species === "tanuki")
    out.push({ t: "stroke", d: [0, 1, 2].map(i => `M${((.35 + .4 * sn) * hs).toFixed(1)} ${((.15 + i * .06) * hs).toFixed(1)}l${(hs * .7).toFixed(1)} ${(hs * (i - 1) * .14).toFixed(1)}`).join(""), color: "sumi", width: .8, opacity: .6 });
  return out;
}

function quadruped(species: "fox" | "tanuki" | "dog" | "cat" | "rabbit", spec: UkiyoeCreatureSpec, frame: number, wind: number, seed: number): Prim[] {
  const b = BEASTS[species], look = spec.look ?? {}, k = (look.size ?? b.L) / b.L;
  const L = b.L * k, leg = b.leg * k, bh = b.bh * k, hs = b.head * k;
  const color = look.color ?? b.color, belly = look.belly ?? b.belly, dark = look.dark ?? b.dark;
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
  const hipStand = -leg - bh * .45, hipLow = -bh * .45;
  const hipY = lerp(lerp(lerp(hipStand, hipLow, sit), -leg * 1.02, stand), hipLow * .9, sleep) - bob - leapH;
  const hip: Pt = [-L * .34, hipY], pivot = hip;
  const R = (p: Pt) => rot(p, pitch, pivot);
  const shoulder = R([L * .3, hip[1] - bh * .08]);
  const by = hip[1] + bh * .45, top = hip[1] - bh * .5;
  const torsoPts: Pt[] = ([[-L * .5, hip[1] + bh * .05], [-L * .46, top + bh * .12], [-L * .2, top - bh * .05], [L * .1, top + bh * .02], [L * .34, top - bh * .1], [L * .5, hip[1] - bh * .1],
    [L * .42, by - bh * .15], [L * .2, by + bh * .02], [-L * .1, by - (species === "tanuki" ? -bh * .12 : bh * .02)], [-L * .38, by - bh * .1]] as Pt[]).map(R);
  const torsoD = smoothD(torsoPts, true, .4);
  // Legs in world angles (0 = forward, 90 = straight down). Lateral-sequence walk, bounding run, rabbit hop.
  const legPrims = (near: boolean): Prim[] => {
    const out: Prim[] = [];
    for (const [hind, phase] of [[true, near ? 0 : .5], [false, near ? .25 : .75]] as const) {
      const p = ph / (Math.PI * 2) + (run > .5 ? (hind ? 0 : .5) + (near ? .08 : 0) : hop > .5 ? (hind ? 0 : .5) : phase);
      const swing = Math.sin(p * Math.PI * 2) * (run > .5 ? 38 : hop > .5 ? 30 : 22) * moving;
      const lift = Math.max(0, Math.cos(p * Math.PI * 2)) * moving;
      const root = hind ? R([-L * .33, hip[1] + bh * .1]) : shoulder;
      // Sitting: the front legs reach straight down from the raised chest to the ground.
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
      const w0 = (hind ? bh * .34 : bh * .22) * (species === "rabbit" && hind ? 1.3 : 1), w1 = bh * .09;
      const legColor = species === "tanuki" ? dark : color;
      out.push({ t: "fill", d: carvedLine([root, knee, paw], w0 * 2, { taper: "end", minRatio: w1 * 2 / (w0 * 2), smooth: true, wobble: .05 }), fill: legColor, outline: 1.1 });
      if (species === "fox") out.push({ t: "fill", d: carvedLine([[lerp(knee[0], paw[0], .3), lerp(knee[1], paw[1], .3)], paw], w1 * 2.2, { taper: "none", smooth: true }), fill: "sumi", opacity: .85 });
      out.push({ t: "fill", d: ellipseD(paw[0] + w1 * .5, paw[1] - w1 * .15, w1 * 1.35, w1 * .7), fill: species === "fox" ? "sumi" : legColor, outline: 1 });
      if (!near) out.push({ t: "fill", d: carvedLine([root, knee, paw], w0 * 2, { taper: "end", minRatio: w1 / w0, smooth: true }), fill: "sumi", opacity: .16, noPrint: true });
    }
    return out;
  };
  // Tail(s): a chain swinging with the gait, the wind and its own lag.
  const tails = species === "fox" ? clamp(Math.round(look.tails ?? 1), 1, 9) : 1;
  const tailPrims: Prim[] = [];
  const tailRoot = R([-L * .48, hip[1] - bh * .22]);
  for (let t = 0; t < tails; t++) {
    const fan = tails > 1 ? (t / (tails - 1) - .5) * 110 : 0;
    const pts: Pt[] = [tailRoot];
    let a = (species === "dog" ? -60 : species === "rabbit" ? -150 : species === "cat" ? -120 : -165) + fan + pitch * .6, at = tailRoot;
    const segs = 10, len = b.tail * k;
    for (let i = 0; i < segs; i++) {
      const u = i / segs;
      a += (species === "dog" ? -24 : species === "cat" ? 6 + Math.sin(frame / 14 + t) * 10 : 3) + Math.sin(frame / 9 + i * .6 + t + seed) * (4 + 8 * u) * (1 + moving)
        - wind * 8 * u * (species === "rabbit" ? 0 : 1) + (sit * 12);
      at = polar(at, a, len / segs);
      pts.push(at);
    }
    if (species === "rabbit") tailPrims.push({ t: "fill", d: ellipseD(tailRoot[0] - 4, tailRoot[1], b.tailW * k * .55, b.tailW * k * .5), fill: "gofun", outline: 1.1 });
    else {
      const wd = b.tailW * k * (tails > 1 ? .75 : 1);
      tailPrims.push({ t: "fill", d: carvedLine(pts, wd, { taper: species === "fox" || species === "tanuki" ? "swell" : "end", minRatio: .3, smooth: true }), fill: color, outline: 1.2, grain: .3 });
      if (species === "fox") tailPrims.push({ t: "fill", d: carvedLine(pts.slice(-4), wd * .7, { taper: "end", smooth: true }), fill: "gofun", outline: 1 });
      if (species === "tanuki") for (let r = 3; r < pts.length - 1; r += 3) tailPrims.push({ t: "line", d: carvedLine([polar(pts[r], a + 90, wd * .45), polar(pts[r], a - 90, wd * .45)], wd * .22, { taper: "none" }), color: dark, opacity: .85 });
      tailPrims.push({ t: "stroke", d: hatch(pts, 2, wd * .35, 150, seed + t), color: "sumi", width: .8, opacity: .45 });
    }
  }
  // Head on the neck: pitch for howl/look, lowered for sleep.
  const howl = st("howl").w, lk = st("look"), roar = st("roar").w;
  const headPitch = -55 * howl + (lk.a?.angle ?? -10) * lk.w + 30 * sleep + 10 * sit - pitch * .55;
  const neck = R([L * .44, top + bh * .05]);
  const headC = add(neck, rot([hs * .9, -hs * (.55 - .8 * sleep)], -headPitch * .3 + pitch * .45, [0, 0]));
  const blink = (frame + (seed % 97)) % 97 < 4 || sleep > .5;
  const open = Math.max(howl * (.6 + .3 * Math.sin(frame / 3)), roar);
  const out: Prim[] = [];
  out.push({ t: "fill", d: ellipseD(hip[0] + L * .15, 2, L * .5 * (1 - leapH / (leg * 6)), L * .05), fill: "sumi", opacity: .1, noPrint: true });
  out.push(...legPrims(false), ...tailPrims);
  out.push({ t: "fill", d: limb(neck, headC, bh * .34, hs * .5), fill: color, outline: 1.2 });
  out.push({ t: "fill", d: torsoD, fill: { type: "linear", angle: 90, stops: [[0, color, 1], [.62, color, 1], [1, belly, 1]] }, outline: 1.4, grain: .3 });
  if (species === "tanuki") out.push({ t: "fill", d: ellipseD(...R([L * .05, by - bh * .15]), L * .3, bh * .35), fill: belly, noPrint: true });
  if (species === "cat" && !look.color) out.push({ t: "fill", d: ellipseD(...R([-L * .2, top + bh * .3]), L * .16, bh * .28) + ellipseD(...R([L * .18, top + bh * .2]), L * .1, bh * .2), fill: "ki", opacity: .9 }, { t: "fill", d: ellipseD(...R([-L * .02, top + bh * .25]), L * .1, bh * .2), fill: "sumi", opacity: .85 });
  out.push({ t: "stroke", d: hatch(torsoPts, 1, bh * .16, -150, seed), color: "sumi", width: .8, opacity: .35 });
  out.push(...legPrims(true));
  out.push({ t: "group", transform: `translate(${headC[0].toFixed(1)} ${headC[1].toFixed(1)}) rotate(${(headPitch).toFixed(1)})`, prims: beastHead(b, species, hs, open, blink, look, seed) });
  if (species === "tanuki" && look.hat) out.push({ t: "group", transform: `translate(${headC[0].toFixed(1)} ${(headC[1] - hs * .7).toFixed(1)}) rotate(${(headPitch - 8).toFixed(1)})`,
    prims: [{ t: "fill", d: smoothD([[-hs * 1.4, hs * .2], [0, -hs * .7], [hs * 1.4, hs * .15], [0, hs * .05]], true, .2), fill: "kincha", outline: 1.2, grain: .7 }] });
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

interface Bird { body: number; neck: number; leg: number; color: UkiyoePaint; wing: UkiyoePaint; tip: UkiyoePaint; head: UkiyoePaint; beak: UkiyoePaint; tail: number; crown?: UkiyoePaint }
const BIRDS: Readonly<Record<"crane" | "heron" | "crow" | "pheasant" | "sparrow", Bird>> = {
  crane: { body: 70, neck: 64, leg: 80, color: "gofun", wing: "gofun", tip: "sumi", head: "sumi", beak: "kincha", tail: 26, crown: "shu" },
  heron: { body: 56, neck: 60, leg: 70, color: "gofun", wing: "gofun", tip: "gofun", head: "gofun", beak: "ki", tail: 18 },
  crow: { body: 44, neck: 12, leg: 26, color: "sumi", wing: "sumi", tip: "sumi", head: "sumi", beak: "sumi", tail: 30 },
  pheasant: { body: 54, neck: 20, leg: 32, color: "cha", wing: "kincha", tip: "kogecha", head: "matsu", beak: "kincha", tail: 90, crown: "shu" },
  sparrow: { body: 22, neck: 6, leg: 10, color: "cha", wing: "kincha", tip: "kogecha", head: "kogecha", beak: "sumi", tail: 14 },
};

function bird(species: keyof typeof BIRDS, spec: UkiyoeCreatureSpec, frame: number, wind: number, seed: number): Prim[] {
  const b = BIRDS[species], look = spec.look ?? {}, k = (look.size ?? b.body) / b.body;
  const st = actionState(spec.actions ?? [], frame), tr = creatureTravel(spec.actions ?? [], frame);
  const fly = st("fly").w, dance = st("dance").w, peck = st("peck"), walk = Math.max(st("walk").w, st("run").w) * (tr.moving ? 1 : 0);
  const B = b.body * k, N = b.neck * k, Lg = b.leg * k;
  const color = look.color ?? b.color, out: Prim[] = [];
  const flapRate = species === "sparrow" ? 2.2 : species === "crow" ? 4.5 : 6.5;
  const flap = Math.sin(frame / flapRate + seed);
  const lift = fly * (Lg * .9 + Math.sin(frame / (flapRate * 2)) * B * .08);
  const bodyC: Pt = [0, -Lg * (1 - fly) - B * .45 - lift + dance * Math.abs(Math.sin(frame / 10)) * B * .3];
  const tilt = fly * 4 - (1 - fly) * (species === "crane" || species === "heron" ? 8 : 18);
  // Legs (standing/walking) or trailing (crane in flight).
  const legs: Prim[] = [];
  const legRoot = add(bodyC, [-B * .05, B * .3]);
  const gait = tr.dist / (B * 1.2) * Math.PI * 2;
  for (const near of [false, true]) {
    const sw = walk * Math.sin(gait + (near ? 0 : Math.PI)) * 24 + dance * Math.sin(frame / 8 + (near ? 0 : 2)) * 30;
    let knee = polar(legRoot, 90 - sw * .6, Lg * .5), foot = polar(knee, 90 + sw * .4 + 4, Lg * .5);
    if (fly > 0) { knee = [lerp(knee[0], legRoot[0] - Lg * .45, fly), lerp(knee[1], legRoot[1] + Lg * .05, fly)]; foot = [lerp(foot[0], legRoot[0] - Lg * .95, fly), lerp(foot[1], legRoot[1] + Lg * .1, fly)]; }
    const legC = species === "crane" ? "sumi" : species === "heron" ? "sumi" : "kincha";
    legs.push({ t: "line", d: carvedLine([legRoot, knee, foot], Math.max(1.6, B * .035), { taper: "none" }), color: legC, opacity: near ? 1 : .75 });
    if (fly < .5) legs.push({ t: "stroke", d: [-20, 10, 40].map(a => { const e = polar(foot, a, B * .14); return `M${foot[0].toFixed(1)} ${foot[1].toFixed(1)}L${e[0].toFixed(1)} ${e[1].toFixed(1)}`; }).join(""), color: legC, width: Math.max(1.2, B * .025) });
  }
  // Wings: a fan of primaries from the shoulder; folded along the body when standing.
  const wing = (near: boolean): Prim[] => {
    const sh = add(bodyC, [B * .12, -B * .12]);
    const spread = fly > 0 ? lerp(-150, -30, (flap * (near ? 1 : .85) + 1) / 2) : dance > 0 ? -90 + Math.sin(frame / 7) * 50 : -178;
    const open = Math.max(fly, dance), len = B * (species === "crane" || species === "heron" ? 1.35 : 1.05) * (.55 + .45 * open);
    const angle = lerp(-178 + tilt, spread, open) + (near ? 0 : -8);
    const feathers = species === "sparrow" ? 4 : 7, pts: Pt[] = [sh];
    const fing: string[] = [];
    for (let i = 0; i <= feathers; i++) {
      const u = i / feathers, a = angle + lerp(-8, 70, u) * (.3 + .7 * open), l = len * (1 - u * .45);
      const tip = polar(sh, a, l);
      pts.push(tip);
      if (i < 4 && open > .3) fing.push(carvedLine([polar(sh, a, l * .55), tip], B * .07, { taper: "end" }));
    }
    pts.push(polar(sh, angle + 75, B * .3));
    const out2: Prim[] = [{ t: "fill", d: smoothD(pts, true, .25), fill: { type: "linear", angle: 0, stops: [[0, look.accent ?? b.wing, 1], [.6, look.accent ?? b.wing, 1], [1, b.tip, 1]] }, outline: 1.2, grain: .2 }];
    if (fing.length) out2.push({ t: "fill", d: fing.join(""), fill: b.tip, opacity: .9 });
    out2.push({ t: "stroke", d: pts.slice(2, -2).map(q => `M${(sh[0] + (q[0] - sh[0]) * .35).toFixed(1)} ${(sh[1] + (q[1] - sh[1]) * .35).toFixed(1)}L${q[0].toFixed(1)} ${q[1].toFixed(1)}`).join(""), color: "sumi", width: .8, opacity: .4 });
    if (!near) out2.push({ t: "fill", d: smoothD(pts, true, .25), fill: "sumi", opacity: .14, noPrint: true });
    return out2;
  };
  // Neck: S-curve for crane/heron, stretched forward in flight, dipping to peck.
  const pk = peck.w > 0 ? Math.max(0, Math.sin(peck.t / 5)) * peck.w : 0;
  const neckBase = add(bodyC, [B * .42, -B * .15]);
  const n1 = add(neckBase, fly > .5 ? [N * .5, -N * .02] : [N * .1 + pk * N * .3, -N * .5 + pk * N * .8]);
  const headP = add(neckBase, fly > .5 ? [N * 1.05, -N * .05] : [N * .32 + pk * N * .55, -N * .95 + pk * N * 1.5 + dance * Math.sin(frame / 6) * N * .1]);
  const tailBase = add(bodyC, [-B * .5, -B * .02]);
  const tailTip = add(tailBase, [-b.tail * k * (fly > .5 ? 1 : .9), (species === "pheasant" ? .12 : -.05) * b.tail * k + Math.sin(frame / 11) * 2 - wind * 6]);
  out.push({ t: "fill", d: ellipseD(0, 1, B * .6 * (1 - fly), B * .06), fill: "sumi", opacity: .1 * (1 - fly), noPrint: true });
  out.push(...legs.slice(0, 2), ...wing(false));
  out.push({ t: "fill", d: carvedLine([tailBase, add(tailBase, [(tailTip[0] - tailBase[0]) * .5, (tailTip[1] - tailBase[1]) * .5 + B * .04]), tailTip], B * (species === "pheasant" ? .14 : .32), { taper: "end", smooth: true }),
    fill: species === "crane" ? "sumi" : b.tip, outline: 1.1 });
  const bodyD = smoothD([add(bodyC, [-B * .55, -B * .02]), add(bodyC, [-B * .2, -B * .32]), add(bodyC, [B * .3, -B * .3]), add(bodyC, [B * .55, -B * .08]), add(bodyC, [B * .3, B * .3]), add(bodyC, [-B * .3, B * .25])].map(q => rot(q, tilt, bodyC)), true, .45);
  out.push({ t: "fill", d: bodyD, fill: { type: "linear", angle: 90, stops: [[0, color, 1], [1, species === "sparrow" ? "gofun" : color, 1]] }, outline: 1.3, grain: .2 });
  out.push(...legs.slice(2));
  out.push({ t: "fill", d: carvedLine(smoothPts3([neckBase, n1, headP]), Math.max(4, B * (species === "crane" || species === "heron" ? .2 : .42)), { taper: "none", smooth: true }), fill: species === "crane" ? "sumi" : species === "pheasant" ? "matsu" : color, outline: 1.2 });
  const hr = B * (species === "sparrow" ? .3 : species === "crow" ? .26 : .17);
  out.push({ t: "fill", d: ellipseD(headP[0], headP[1], hr * 1.1, hr), fill: b.head, outline: 1.2 });
  if (b.crown) out.push({ t: "fill", d: ellipseD(headP[0] + hr * .2, headP[1] - hr * (species === "crane" ? .55 : .1), hr * (species === "crane" ? .5 : .55), hr * .42), fill: b.crown, noPrint: true });
  const beakLen = B * (species === "crane" || species === "heron" ? .55 : species === "crow" ? .35 : .18);
  const ba = fly > .5 ? 2 : 10 + pk * 60;
  out.push({ t: "fill", d: polyD([polar(headP, ba - 80, hr * .45), polar(add(headP, [hr * .9, 0]), ba, beakLen), polar(headP, ba + 80, hr * .35)]), fill: b.beak, outline: 1 });
  out.push({ t: "dots", d: circleD(headP[0] + hr * .3, headP[1] - hr * .15, Math.max(1.2, hr * .16)), color: species === "crow" ? "kincha" : "sumi" });
  out.push(...wing(true));
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
    case "fox": case "tanuki": case "dog": case "cat": case "rabbit": prims = quadruped(spec.species, spec, frame, wind * dir, seed); break;
    case "dragon": prims = dragon(spec, frame, wind * dir, seed); break;
    default: prims = bird(spec.species, spec, frame, wind * dir, seed);
  }
  // Henge: a puff of smoke; from the puff's midpoint the creature is gone (place what it becomes as its own node).
  for (const tf of (spec.actions ?? []).filter(a => a.type === "transform" && frame >= a.start)) {
    if (frame >= (tf.start + tf.end) / 2) prims = [];
    if (frame <= tf.end) prims = [...prims, ...puff(frame, tf, (spec.look?.size ?? 120) * 1.2, seed).prims];
  }
  return { prims, x: tr.x, y: tr.y, dir };
}
