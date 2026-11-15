/**
 * UKIYO1 small creatures of the folktales: the crab (Saru Kani Gassen), the sea turtle with its trailing seaweed tail
 * (minogame: Urashima Tarō), the snake, the frog, the carp (koi climbing the falls) and the octopus of the Dragon
 * Palace. Each has its own way of moving, a pure function of the frame. Origin: the ground (or water) point under the
 * creature; authored facing right. Look: `color`, `size`, `accent`.
 *
 * - crab: a red carapace on eight jointed legs scuttling sideways, eyes on stalks, two claws that open and snap.
 * - turtle: a domed shell of hexagonal scutes, a beaked head, flippers that row when it moves, the minogame's long
 *   streaming tail of seaweed.
 * - snake: a body in a travelling S-wave that slithers forward when moving; scales, a raised head and a flickering
 *   tongue; `coil` winds it into a spiral with the head raised.
 * - frog: squat, a big eye on top of the head, the throat sac pulsing; `hop` springs it forward with the legs flung out;
 *   `howl` croaks.
 * - carp: a scaled body undulating as it swims, fins and barbels; `leap` arcs it out of the water.
 * - octopus: a bulbous head with heavy-lidded eyes, eight curling arms with suckers waving.
 */
import type { Pt } from "./ukiyoe-core";
import { carvedLine, clamp01, hash01, lerp, smoothD } from "./ukiyoe-core";
import type { Prim } from "./ukiyoe-prims";
import { circleD, ellipseD } from "./ukiyoe-prims";
import type { UkiyoePaint } from "./ukiyoe-pigments";

export type UkiyoeCritter = "crab" | "turtle" | "snake" | "frog" | "carp" | "octopus";
export const UKIYOE_CRITTERS: readonly UkiyoeCritter[] = ["crab", "turtle", "snake", "frog", "carp", "octopus"];
type W = (type: string) => { w: number; t: number };
interface Look { color?: UkiyoePaint; size?: number; accent?: UkiyoePaint }
const f1 = (n: number) => n.toFixed(1);

/** A ribbon along a spine, width from `w(u)` (u 0 → 1 along it). */
function ribbon(spine: readonly Pt[], w: (u: number) => number): string {
  const L: Pt[] = [], R: Pt[] = [];
  spine.forEach((q, i) => {
    const a = spine[Math.max(0, i - 1)], b = spine[Math.min(spine.length - 1, i + 1)], l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, u = i / (spine.length - 1);
    const nx = -(b[1] - a[1]) / l, ny = (b[0] - a[0]) / l, h = w(u) / 2;
    L.push([q[0] + nx * h, q[1] + ny * h]); R.push([q[0] - nx * h, q[1] - ny * h]);
  });
  return smoothD([...L, ...R.reverse()], true, .35);
}

function crab(look: Look, w: W, s: { moving: boolean; dist: number }, frame: number, seed: number): Prim[] {
  const S = look.size ?? 56, color = look.color ?? "shu", lw = Math.max(.8, S * .02), out: Prim[] = [];
  const ph = s.dist / (S * .25) * Math.PI, bodyY = -S * .38, snap = Math.max(w("roar").w, w("dance").w), open = snap > 0 ? .5 + .5 * Math.sin(frame / 3) : .2 + .1 * Math.sin(frame / 20 + seed);
  // Legs: four a side, each a bent two-segment line from under the carapace to the ground; far legs first, paler.
  const legs = (near: boolean) => {
    const d: string[] = [];
    for (let i = 0; i < 4; i++) {
      const x0 = (i - 1.5) * S * .18, side = near ? 1 : -1, lift = s.moving ? Math.max(0, Math.sin(ph + i * 1.6 + (near ? 0 : Math.PI))) * S * .08 : 0;
      const root: Pt = [x0, bodyY + S * .08], knee: Pt = [x0 * 1.6 + side * S * .03, bodyY - S * .12 - lift * .4], foot: Pt = [x0 * 2.1 + (i < 2 ? -S * .06 : S * .06), -lift];
      d.push(carvedLine([root, knee, foot], S * .045, { taper: "end", minRatio: .3 }));
    }
    return d.join("");
  };
  out.push({ t: "fill", d: legs(false), fill: color, outline: lw * .6, opacity: .8 });
  // Carapace: a broad rounded trapezoid, ridged, darker on top; eyes up on short stalks.
  const cara = smoothD([[-S * .48, bodyY + S * .06], [-S * .42, bodyY - S * .14], [0, bodyY - S * .22], [S * .42, bodyY - S * .14], [S * .48, bodyY + S * .06], [0, bodyY + S * .14]], true, .4);
  out.push({ t: "fill", d: cara, fill: { type: "linear", angle: 90, stops: [[0, color, 1], [1, "tan", 1]] }, outline: lw * 1.2 });
  out.push({ t: "stroke", d: smoothD([[-S * .3, bodyY - S * .08], [0, bodyY - S * .14], [S * .3, bodyY - S * .08]], false, .4) + smoothD([[-S * .15, bodyY + S * .02], [0, bodyY - S * .02], [S * .15, bodyY + S * .02]], false, .4), color: "kogecha", width: lw * .8, opacity: .6 });
  for (const ex of [-.1, .1]) out.push({ t: "stroke", d: `M${f1(ex * S)} ${f1(bodyY - S * .18)}l0 ${f1(-S * .1)}`, color: color, width: lw * 1.6 }, { t: "fill", d: circleD(ex * S, bodyY - S * .29, S * .035), fill: "sumi" });
  out.push({ t: "fill", d: legs(true), fill: color, outline: lw * .6 });
  // Claws: forearm, palm and two fingers that open and snap.
  for (const sd of [-1, 1]) {
    const base: Pt = [sd * S * .4, bodyY], palm: Pt = [sd * S * .62, bodyY - S * .2], a = open * .6;
    out.push({ t: "fill", d: carvedLine([base, palm], S * .08, { taper: "none" }), fill: color, outline: lw * .7 });
    out.push({ t: "fill", d: ellipseD(palm[0], palm[1], S * .1, S * .07), fill: color, outline: lw });
    const up: Pt = [palm[0] + sd * S * .14, palm[1] - S * .06 - a * S * .08], dn: Pt = [palm[0] + sd * S * .14, palm[1] + S * .04 + a * S * .04];
    out.push({ t: "fill", d: carvedLine([palm, up], S * .06, { taper: "end", minRatio: .2 }) + carvedLine([palm, dn], S * .05, { taper: "end", minRatio: .2 }), fill: color, outline: lw * .7 });
  }
  return out;
}

function turtle(look: Look, w: W, s: { moving: boolean; dist: number }, frame: number, seed: number): Prim[] {
  const S = look.size ?? 100, color = look.color ?? "matsu", lw = Math.max(.8, S * .012), out: Prim[] = [];
  const swim = s.moving || w("float").w > 0, row = Math.sin((s.moving ? s.dist / (S * .3) : frame / 10) * Math.PI) * (swim ? 1 : .15);
  const by = -S * .25 - (swim ? S * .05 + Math.sin(frame / 18 + seed) * S * .02 : 0);
  // The minogame's tail: a long fan of seaweed strands streaming behind, waving.
  const strands: string[] = [];
  for (let i = 0; i < 9; i++) {
    const pts: Pt[] = [];
    for (let j = 0; j <= 10; j++) { const u = j / 10; pts.push([-S * .45 - u * S * (1.1 + .2 * hash01(seed, i, 1)), by + S * .05 + (i - 4) * S * .02 * u - u * S * .15 + Math.sin(u * 5 - frame / 8 + i) * S * .05 * u]); }
    strands.push(carvedLine(pts, S * .035, { taper: "end", minRatio: .1, smooth: true }));
  }
  out.push({ t: "fill", d: strands.join(""), fill: { type: "linear", angle: 0, stops: [[0, "matsu", .4], [1, "kusa", .95]] }, outline: lw * .5, outlineColor: "matsu" });
  // Flippers: the far fore flipper, the hind flippers, then the shell, then the near fore flipper rowing.
  const flipper = (root: Pt, len: number, a: number): string => {
    const tip: Pt = [root[0] + Math.cos(a) * len, root[1] + Math.sin(a) * len];
    return smoothD([root, [lerp(root[0], tip[0], .4) - Math.sin(a) * len * .25, lerp(root[1], tip[1], .4) + Math.cos(a) * len * .25], tip, [lerp(root[0], tip[0], .5) + Math.sin(a) * len * .1, lerp(root[1], tip[1], .5) - Math.cos(a) * len * .1]], true, .4);
  };
  out.push({ t: "fill", d: flipper([S * .2, by + S * .05], S * .45, (.5 - row * .5) * Math.PI * .5 + .3) + flipper([-S * .35, by + S * .08], S * .25, Math.PI * .7 + row * .2), fill: "kusa", outline: lw, opacity: .85 });
  // Shell: a dome of hexagonal scutes ringed by marginal plates.
  const shell = smoothD([[-S * .5, by + S * .08], [-S * .4, by - S * .2], [0, by - S * .32], [S * .4, by - S * .2], [S * .5, by + S * .08], [0, by + S * .14]], true, .4);
  out.push({ t: "fill", d: shell, fill: { type: "linear", angle: 90, stops: [[0, color, 1], [1, "kincha", 1]] }, outline: lw * 1.4, pattern: { type: "kikko", color: "kogecha", scale: S * .006, opacity: .7 } });
  out.push({ t: "stroke", d: smoothD([[-S * .48, by + S * .04], [0, by + S * .09], [S * .48, by + S * .04]], false, .4), color: "kogecha", width: lw * 1.2 });
  // Head and neck: a wrinkled neck, a beaked head, an eye.
  const head: Pt = [S * .62, by - S * .02 + Math.sin(frame / 25 + seed) * S * .02];
  out.push({ t: "fill", d: ribbon([[S * .42, by + S * .02], [S * .52, by], head], () => S * .12), fill: "kusa", outline: lw });
  out.push({ t: "fill", d: smoothD([[head[0] - S * .06, head[1] - S * .06], [head[0] + S * .06, head[1] - S * .07], [head[0] + S * .13, head[1] - S * .01], [head[0] + S * .1, head[1] + S * .04], [head[0] - S * .04, head[1] + S * .06]], true, .4), fill: "kusa", outline: lw });
  out.push({ t: "fill", d: circleD(head[0] + S * .04, head[1] - S * .025, S * .018), fill: "sumi" }, { t: "stroke", d: `M${f1(head[0] + S * .02)} ${f1(head[1] + S * .02)}l${f1(S * .1)} ${f1(-S * .015)}`, color: "sumi", width: lw });
  out.push({ t: "fill", d: flipper([S * .28, by + S * .08], S * .5, (.55 + row * .55) * Math.PI * .5 + .2), fill: "kusa", outline: lw });
  return out;
}

function snake(look: Look, w: W, s: { moving: boolean; dist: number }, frame: number, seed: number): Prim[] {
  const S = look.size ?? 220, color = look.color ?? "usuzumi", lw = Math.max(.8, S * .006), out: Prim[] = [];
  const coil = w("coil").w, wave = s.moving ? s.dist / (S * .5) * Math.PI * 2 : frame / 30, n = 40, spine: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    // Slithering: a travelling sine along the body (head at u = 1), flattened near the head which is lifted.
    const sx = (u - .5) * S, sy = -S * .05 - Math.sin(u * Math.PI * 3 - wave) * S * .08 * (1 - u * .4) * (1 - coil);
    // Coiled: a spiral from the tail inward, the head rising from the middle.
    const a = u * Math.PI * 4.2, r = S * (.22 - .17 * u), cx = Math.cos(a) * r, cy = -S * .06 + Math.sin(a) * r * .38;
    spine.push([lerp(sx, cx, coil), lerp(sy, cy, coil)]);
  }
  const headLift = S * (.06 + .16 * coil) + Math.sin(frame / 20 + seed) * S * .01;
  for (let i = n - 5; i <= n; i++) { const k = (i - (n - 5)) / 5; spine[i] = [spine[i][0] + k * S * .03, spine[i][1] - headLift * k * k]; }
  const body = ribbon(spine, u => S * .07 * (u < .15 ? .2 + u / .15 * .8 : u > .92 ? 1.1 : 1));
  out.push({ t: "fill", d: body, fill: { type: "linear", angle: 90, stops: [[0, color, 1], [1, "gofun", 1]] }, outline: lw * 1.4, pattern: { type: "uroko", color: "sumi", scale: S * .002, opacity: .35 } });
  const head = spine[n], prev = spine[n - 2], a = Math.atan2(head[1] - prev[1], head[0] - prev[0]);
  const H = (x: number, y: number): Pt => [head[0] + Math.cos(a) * x - Math.sin(a) * y, head[1] + Math.sin(a) * x + Math.cos(a) * y];
  out.push({ t: "fill", d: smoothD([H(-S * .03, -S * .045), H(S * .05, -S * .04), H(S * .09, -S * .01), H(S * .08, S * .025), H(-S * .02, S * .04)], true, .4), fill: color, outline: lw * 1.2 });
  out.push({ t: "fill", d: circleD(...H(S * .04, -S * .018), S * .011), fill: look.accent ?? "ki" }, { t: "fill", d: ellipseD(...H(S * .042, -S * .018), S * .003, S * .008), fill: "sumi" });
  if (Math.sin(frame / 6 + seed) > .4) { const t0 = H(S * .09, S * .005), t1 = H(S * .14, S * .005); out.push({ t: "stroke", d: `M${f1(t0[0])} ${f1(t0[1])}L${f1(t1[0])} ${f1(t1[1])}l${f1(S * .015)} ${f1(-S * .01)}M${f1(t1[0])} ${f1(t1[1])}l${f1(S * .015)} ${f1(S * .01)}`, color: "beni", width: lw }); }
  return out;
}

function frog(look: Look, w: W, s: { moving: boolean; dist: number }, frame: number, seed: number): Prim[] {
  const S = look.size ?? 56, color = look.color ?? "kusa", lw = Math.max(.8, S * .02), out: Prim[] = [];
  const hopW = Math.max(w("hop").w, w("leap").w), ph = s.moving ? (s.dist / (S * 1.4)) % 1 : 0, air = hopW * (s.moving ? Math.sin(Math.PI * ph) : 0);
  const lift = air * S * .8, stretch = air, croak = w("howl").w * (.5 + .5 * Math.sin(frame / 2.5));
  const by = -S * .3 - lift;
  // Hind leg: folded in a Z under the haunch when sitting, flung out straight behind in the air.
  const hip: Pt = [-S * .25, by + S * .05], knee: Pt = [lerp(-S * .05, -S * .55, stretch), lerp(by + S * .12, by + S * .05, stretch)], foot: Pt = [lerp(-S * .4, -S * .85, stretch), lerp(-lift, by + S * .12, stretch)];
  out.push({ t: "fill", d: carvedLine([hip, knee, foot], S * .14, { taper: "end", minRatio: .35 }), fill: color, outline: lw });
  out.push({ t: "fill", d: smoothD([foot, [foot[0] - S * .12, foot[1] + S * .02], [foot[0] - S * .1, foot[1] + S * .05], [foot[0] + S * .02, foot[1] + S * .03]], true, .3), fill: color, outline: lw * .8 });
  // Body: squat and wide, warty on the back, pale belly, the throat sac swelling as it croaks.
  const body = smoothD([[-S * .38, by + S * .1], [-S * .3, by - S * .14], [S * .05, by - S * .2], [S * .32, by - S * .12], [S * .42, by + S * .02], [S * .3, by + S * .16], [-S * .1, by + S * .2]], true, .4);
  out.push({ t: "fill", d: body, fill: { type: "linear", angle: 90, stops: [[0, color, 1], [.7, color, 1], [1, "ki", 1]] }, outline: lw * 1.2 });
  out.push({ t: "dots", d: Array.from({ length: 9 }, (_, i) => circleD(-S * .25 + i * S * .06, by - S * (.1 + .05 * hash01(seed, i, 2)), S * (.015 + .01 * hash01(seed, i, 3)))).join(""), color: "matsu", opacity: .8 });
  if (croak > .05) out.push({ t: "fill", d: ellipseD(S * .3, by + S * .14, S * .1 * (1 + croak), S * .08 * (1 + croak)), fill: "ki", outline: lw * .8 });
  // Front leg propped under the chest; the big eye on top with a gold iris; the wide mouth line.
  out.push({ t: "fill", d: carvedLine([[S * .2, by + S * .1], [S * .26, -lift], [S * .34, -lift]], S * .08, { taper: "end", minRatio: .4 }), fill: color, outline: lw });
  out.push({ t: "fill", d: ellipseD(S * .2, by - S * .2, S * .09, S * .08), fill: color, outline: lw }, { t: "fill", d: ellipseD(S * .21, by - S * .2, S * .06, S * .055), fill: "ki" }, { t: "fill", d: ellipseD(S * .21, by - S * .2, S * .04, S * .02), fill: "sumi" });
  out.push({ t: "line", d: carvedLine([[S * .42, by + S * .02], [S * .25, by + S * .04], [S * .05, by]], lw * 1.4, { taper: "end" }), color: "sumi" });
  return out;
}

function carp(look: Look, w: W, s: { moving: boolean; dist: number }, frame: number, seed: number): Prim[] {
  const S = look.size ?? 120, color = look.color ?? "ai", lw = Math.max(.8, S * .01), out: Prim[] = [];
  const leap = w("leap"), arc = leap.w > 0 ? Math.sin(Math.PI * clamp01(leap.t / 40)) : 0, swim = (s.moving ? s.dist / (S * .6) : frame / 12 + seed) * Math.PI;
  const n = 20, spine: Pt[] = [], by = -S * .15 - arc * S * 1.2, tilt = leap.w > 0 ? (clamp01(leap.t / 40) - .5) * -1.2 : 0;
  for (let i = 0; i <= n; i++) {
    const u = i / n, x = (u - .5) * S, y = Math.sin(u * Math.PI * 1.4 - swim) * S * .05 * (1 - u) ** 1.2;
    spine.push([x * Math.cos(tilt) - y * Math.sin(tilt), by + x * Math.sin(tilt) + y * Math.cos(tilt)]);
  }
  const width = (u: number) => S * .42 * Math.sin(Math.PI * Math.min(1, .12 + u * .95)) ** .7 * (u < .12 ? .5 + u * 4 : 1);
  // Tail fin, then the body with its scales, the dorsal fin, the gill line, the eye and barbels.
  const t0 = spine[0], t1 = spine[2], ta = Math.atan2(t0[1] - t1[1], t0[0] - t1[0]), fl = Math.sin(swim) * .4;
  const T = (r: number, a: number): Pt => [t0[0] + Math.cos(ta + a) * r, t0[1] + Math.sin(ta + a) * r];
  out.push({ t: "fill", d: smoothD([t0, T(S * .26, -.7 + fl), T(S * .14, fl * .5), T(S * .26, .7 + fl)], true, .3), fill: color, outline: lw, opacity: .95 });
  const bodyD = ribbon(spine, width);
  out.push({ t: "fill", d: bodyD, fill: { type: "linear", angle: 90, stops: [[0, color, 1], [.65, color, 1], [1, "gofun", 1]] }, outline: lw * 1.4 });
  // Scales as Gakutei carves them: a net of crossing diagonals over the body, each diamond a scale.
  const edge = (i: number, side: 1 | -1): Pt => { const a2 = spine[Math.max(0, i - 1)], b2 = spine[Math.min(n, i + 1)], l = Math.hypot(b2[0] - a2[0], b2[1] - a2[1]) || 1, h = width(i / n) / 2 * side; return [spine[i][0] - (b2[1] - a2[1]) / l * h, spine[i][1] + (b2[0] - a2[0]) / l * h]; };
  const net: string[] = [];
  for (let i = 1; i + 3 <= n - 3; i++) { const t1 = edge(i, 1), b1 = edge(i + 3, -1), t2 = edge(i + 3, 1), b2 = edge(i, -1); net.push(`M${f1(t1[0])} ${f1(t1[1])}L${f1(b1[0])} ${f1(b1[1])}M${f1(b2[0])} ${f1(b2[1])}L${f1(t2[0])} ${f1(t2[1])}`); }
  out.push({ t: "clip", d: bodyD, key: `carp-${seed}`, prims: [{ t: "stroke", d: net.join(""), color: "sumi", width: lw * .8, opacity: .55 }, { t: "dots", d: Array.from({ length: 8 }, (_, i) => circleD(...spine[3 + i * 2], S * .012)).join(""), color: "gofun", opacity: .5 }] });
  // Pectoral and pelvic fins below, ribbed with rays, sculling as it swims.
  for (const [k, sz] of [[.68, .2], [.42, .16]] as const) {
    const root = edge(Math.round(n * k), 1), sw = Math.sin(swim + k * 4) * .3, fin: Pt[] = [root, [root[0] - S * sz * .4, root[1] + S * sz * (.9 + sw)], [root[0] - S * sz, root[1] + S * sz * (.6 + sw)]];
    out.push({ t: "fill", d: smoothD([fin[0], fin[1], fin[2]], true, .4), fill: color, outline: lw, opacity: .95 });
    out.push({ t: "stroke", d: [.3, .55, .8].map(u => `M${f1(root[0])} ${f1(root[1])}L${f1(lerp(fin[1][0], fin[2][0], u))} ${f1(lerp(fin[1][1], fin[2][1], u))}`).join(""), color: "sumi", width: lw * .6, opacity: .6 });
  }
  const mid = spine[Math.round(n * .55)], head = spine[n];
  out.push({ t: "fill", d: smoothD([[mid[0] - S * .2, mid[1] - S * .12], [mid[0] - S * .05, mid[1] - S * .24], [mid[0] + S * .1, mid[1] - S * .13]], true, .4), fill: color, outline: lw });
  out.push({ t: "stroke", d: smoothD([[head[0] - S * .16, head[1] - S * .1], [head[0] - S * .19, head[1]], [head[0] - S * .15, head[1] + S * .09]], false, .5), color: "sumi", width: lw * 1.2 });
  out.push({ t: "fill", d: circleD(head[0] - S * .06, head[1] - S * .03, S * .025), fill: "ki", outline: lw * .6 }, { t: "fill", d: circleD(head[0] - S * .055, head[1] - S * .03, S * .012), fill: "sumi" });
  out.push({ t: "stroke", d: `M${f1(head[0] - S * .01)} ${f1(head[1] + S * .03)}q${f1(S * .06)} ${f1(S * .03)} ${f1(S * .09)} ${f1(S * .1)}`, color: "sumi", width: lw });
  return out;
}

function octopus(look: Look, w: W, s: { moving: boolean; dist: number }, frame: number, seed: number): Prim[] {
  const S = look.size ?? 100, color = look.color ?? "shu", lw = Math.max(.8, S * .012), out: Prim[] = [];
  const dance = Math.max(w("dance").w, s.moving ? .8 : .3), by = -S * .55 + Math.sin(frame / 20 + seed) * S * .03;
  // Eight arms from under the head, each curling and uncurling, suckers along the underside.
  const arms: string[] = [], suckers: string[] = [];
  for (let i = 0; i < 8; i++) {
    const base: Pt = [(i - 3.5) * S * .06, by + S * .15], dir = (i - 3.5) / 3.5, pts: Pt[] = [base];
    for (let j = 1; j <= 10; j++) {
      const u = j / 10, curl = Math.sin(frame / 14 + i * .9 + seed) * dance * 2.2 * u;
      const prev = pts[j - 1], a = Math.PI / 2 - dir * .9 + curl * (i % 2 ? 1 : -1);
      pts.push([prev[0] + Math.cos(a) * S * .06, prev[1] + Math.sin(a) * S * .06 * (1 - u * .3)]);
    }
    arms.push(carvedLine(pts, S * .08, { taper: "end", minRatio: .1, smooth: true }));
    for (let j = 2; j < 9; j += 2) suckers.push(circleD(pts[j][0] + S * .01, pts[j][1] + S * .01, S * .012 * (1 - j / 12)));
  }
  out.push({ t: "fill", d: arms.join(""), fill: color, outline: lw, union: true });
  out.push({ t: "dots", d: suckers.join(""), color: "gofun", opacity: .85 });
  // The mantle: a big rounded head leaning back, mottled; heavy-lidded eyes; the siphon like pursed lips.
  out.push({ t: "fill", d: smoothD([[-S * .22, by + S * .15], [-S * .28, by - S * .15], [-S * .1, by - S * .42], [S * .12, by - S * .38], [S * .24, by - S * .05], [S * .2, by + S * .15]], true, .45), fill: { type: "radial", stops: [[0, "tan", 1], [1, color, 1]] }, outline: lw * 1.3 });
  out.push({ t: "dots", d: Array.from({ length: 10 }, (_, i) => circleD(-S * .15 + (i % 5) * S * .07, by - S * (.12 + .1 * Math.floor(i / 5)) , S * .015)).join(""), color: "beni", opacity: .6 });
  for (const ex of [-.08, .1]) out.push({ t: "fill", d: ellipseD(ex * S, by + S * .02, S * .05, S * .04), fill: "gofun", outline: lw }, { t: "fill", d: ellipseD(ex * S + S * .01, by + S * .025, S * .02, S * .02), fill: "sumi" },
    { t: "stroke", d: `M${f1(ex * S - S * .05)} ${f1(by)}q${f1(S * .05)} ${f1(-S * .04)} ${f1(S * .1)} 0`, color: "sumi", width: lw * 1.4 });
  out.push({ t: "fill", d: ellipseD(S * .2, by + S * .08, S * .05, S * .035), fill: color, outline: lw });
  return out;
}

/** Draw a critter at a frame. `w` gives each action's weight and time; `s` the travel state. */
export function drawCritter(kind: UkiyoeCritter, look: Look, w: W, s: { moving: boolean; dist: number }, frame: number, _wind: number, seed: number): Prim[] {
  switch (kind) {
    case "crab": return crab(look, w, s, frame, seed);
    case "turtle": return turtle(look, w, s, frame, seed);
    case "snake": return snake(look, w, s, frame, seed);
    case "frog": return frog(look, w, s, frame, seed);
    case "carp": return carp(look, w, s, frame, seed);
    case "octopus": return octopus(look, w, s, frame, seed);
  }
}

// ---- Habitat scenes ----------------------------------------------------------------------------------------------------------------

/** The folktale animals in their places (scenes for the story and for films). */
export type UkiyoeAnimalHabitat = "mountain" | "pond" | "shore" | "farm";
export const UKIYOE_ANIMAL_HABITATS: readonly UkiyoeAnimalHabitat[] = ["mountain", "pond", "shore", "farm"];

/**
 * `mountain`: a bear, a boar, a stag and a wolf crossing a mountain slope under pines. `pond`: carp under the water,
 * a pair of mandarin ducks floating, a frog hopping along the bank, a snake sliding through the reeds. `shore`: a crab
 * scuttling, the minogame turtle crawling down to the sea, an octopus in the shallows. `farm`: the black ox by a
 * farmhouse, a hawk on a post, mice running.
 */
export function animalScene(kind: UkiyoeAnimalHabitat = "mountain", frames = 300): import("./ukiyoe-scene").UkiyoeSceneSpec {
  type N = import("./ukiyoe-scene").UkiyoeNode;
  const nodes: N[] = [{ id: "sky", kind: "motif", motif: "sky", params: { width: 1920, height: 1080, band: .45, horizon: kind === "shore" ? "sora" : "beni" } }];
  const c = (id: string, species: string, x: number, y: number, scale: number, actions: unknown[], facing: "left" | "right" = "right", look: Record<string, unknown> = {}) =>
    nodes.push({ id, kind: "creature", species, x, y, scale, facing, look, actions } as unknown as N);
  const ground = (y: number, fill: unknown) => nodes.push({ id: "ground", kind: "block", x: 960, y: y + 270, shape: { type: "rect", width: 1920, height: 540 }, fill, line: 0 } as unknown as N);
  if (kind === "mountain") {
    nodes.push({ id: "range", kind: "motif", motif: "range", x: 960, y: 700, depth: .5, params: { width: 2200, height: 360, layers: 3, snow: .3 } } as N);
    ground(760, { type: "linear", angle: 90, stops: [[0, "kusa", 1], [1, "matsu", 1]] });
    for (const [i, x] of [180, 1650].entries()) nodes.push({ id: "pine" + i, kind: "motif", motif: "pine", x, y: 900, params: { height: 520 + i * 60 } } as N);
    c("deer", "deer", 1300, 820, 1.3, [{ type: "walk", start: 0, end: frames, to: -400 }], "left");
    c("bear", "bear", 300, 960, 1.4, [{ type: "walk", start: 20, end: frames, to: 420 }]);
    c("boar", "boar", 1500, 990, 1.3, [{ type: "run", start: 60, end: 200, to: -700 }], "left");
    c("wolf", "wolf", 900, 880, 1.2, [{ type: "sit", start: 0, end: 120 }, { type: "howl", start: 130, end: 220 }]);
  } else if (kind === "pond") {
    ground(700, { type: "linear", angle: 90, stops: [[0, "kusa", 1], [1, "matsu", 1]] });
    nodes.push({ id: "water", kind: "block", x: 960, y: 900, shape: { type: "ellipse", rx: 820, ry: 150 }, fill: { type: "linear", angle: 90, stops: [[0, "sora", 1], [1, "asagi", 1]] }, line: 2, pattern: { type: "nami", color: "gofun", scale: .6, opacity: .35 } } as unknown as N);
    c("carp1", "carp", 700, 940, 1.4, [{ type: "float", start: 0, end: frames, to: 300 }], "right", { color: "gofun", accent: "beni" });
    c("carp2", "carp", 1300, 880, 1.1, [{ type: "float", start: 0, end: frames, to: -260 }], "left");
    // The water's surface over the carp, so they swim beneath it (the ducks ride on top).
    nodes.push({ id: "surface", kind: "block", x: 960, y: 905, shape: { type: "ellipse", rx: 810, ry: 140 }, fill: "sora", opacity: .45, line: 0 } as unknown as N);
    c("drake", "oshidori", 900, 840, 1.4, [{ type: "float", start: 0, end: frames, to: 120 }]);
    c("duck", "oshidori", 820, 850, 1.3, [{ type: "float", start: 0, end: frames, to: 120 }], "right", { color: "cha" });
    c("frog", "frog", 300, 760, 1.6, [{ type: "hop", start: 30, end: 200, to: 300 }, { type: "howl", start: 220, end: frames }]);
    c("snake", "snake", 1550, 740, 1.2, [{ type: "walk", start: 0, end: frames, to: -300 }], "left");
    nodes.push({ id: "reeds", kind: "motif", motif: "reeds", x: 1700, y: 760, params: { width: 300, height: 180 } } as N);
  } else if (kind === "shore") {
    nodes.push({ id: "sea", kind: "motif", motif: "sea", y: 620, params: { width: 1920, height: 260, rows: 8 } } as N);
    ground(820, { type: "linear", angle: 90, stops: [[0, "kincha", 1], [1, "cha", 1]] });
    c("turtle", "turtle", 600, 870, 1.8, [{ type: "walk", start: 0, end: frames, to: 400 }]);
    c("crab", "crab", 1300, 960, 2.2, [{ type: "walk", start: 0, end: 150, to: 200 }, { type: "dance", start: 160, end: frames }], "left");
    c("octopus", "octopus", 1600, 840, 1.6, [{ type: "dance", start: 0, end: frames }]);
  } else {
    ground(760, { type: "linear", angle: 90, stops: [[0, "kincha", 1], [1, "kusa", 1]] });
    nodes.push({ id: "house", kind: "motif", motif: "minka", x: 1450, y: 800, params: { width: 520 } } as N);
    c("ox", "ox", 600, 940, 1.5, [{ type: "walk", start: 0, end: frames, to: 220 }]);
    nodes.push({ id: "post", kind: "block", x: 1150, y: 860, shape: { type: "rect", width: 22, height: 220 }, fill: "cha", line: 2 } as unknown as N);
    c("hawk", "hawk", 1150, 752, 2, [{ type: "look", start: 0, end: frames }], "left");
    for (let i = 0; i < 3; i++) c("mouse" + i, "mouse", 1250 + i * 80, 1040, 1.4, [{ type: "run", start: 20 + i * 12, end: 220, to: -1100 }], "left");
  }
  return { version: 1, id: `animals-${kind}`, width: 1920, height: 1080, durationFrames: frames, seed: 41, cadence: 2, palette: { preset: "edo" }, wind: { base: .3, turbulence: .3 }, nodes };
}
