/**
 * UKIYO1 effects and magic, after the *Kitano Tenjin engi* scroll's hell fire (Met 45428: long streaming tongues of
 * vermilion with curled tips, pale smoke billowing in scalloped bands), Hiroshige's *Fox Fires on New Year's Eve at Ōji*
 * (Met DP121555: small teardrop flames, yellow inside and red at the rim, floating by each fox's head) and the curling
 * cloud scrolls the prints use for a shape-shifter's smoke.
 *
 * Motifs: `fire` (a burning bundle, house or field: flames, smoke, embers) and `halo` (a divine radiance of gold rays
 * and a ring). Particles: `smoke` (a henge puff of curling cloud scrolls at each burst), `lightning` (a forked bolt
 * from the sky to each burst point with a flash), `ash` (a stream of ash poured from each burst point and carried on the
 * wind, as the old man scatters it over the dead trees) and `foxfire` (kitsunebi, bobbing in the area).
 */
import type { Pt } from "./ukiyoe-core";
import { carvedLine, clamp01, DEG, hash01, lerp, noise1, smoothD } from "./ukiyoe-core";
import type { Prim } from "./ukiyoe-prims";
import { circleD, ellipseD } from "./ukiyoe-prims";
import type { UkiyoeBurst } from "./ukiyoe-particles";
import type { UkiyoeAction, UkiyoeFigureLook } from "./ukiyoe-figure";
import type { UkiyoeNode, UkiyoeSceneSpec } from "./ukiyoe-scene";

type P = Readonly<Record<string, unknown>>;
const num = (p: P, k: string, d: number) => typeof p[k] === "number" && Number.isFinite(p[k]) ? p[k] as number : d;
const bool = (p: P, k: string, d: boolean) => typeof p[k] === "boolean" ? p[k] as boolean : d;
const f1 = (n: number) => n.toFixed(1);

/** One flame tongue rising from `base`: a body swelling and narrowing to a tip that hooks over, flickering with time. */
function tongue(base: Pt, w: number, h: number, lean: number, curl: number, frame: number, seed: number): { outer: string; inner: string } {
  const fl = 1 + .18 * noise1(seed, frame * .21), hh = h * fl, sw = w * .3 * noise1(seed + 5, frame * .17) + lean * hh;
  const pts: Pt[] = [[base[0] - w, base[1]], [base[0] - w * .85 + sw * .2, base[1] - hh * .3], [base[0] - w * .4 + sw * .55, base[1] - hh * .62], [base[0] + sw, base[1] - hh],
    [base[0] + sw + curl * w * .9, base[1] - hh * .86], [base[0] + w * .35 + sw * .6, base[1] - hh * .6], [base[0] + w * .8 + sw * .25, base[1] - hh * .3], [base[0] + w, base[1]]];
  const inn: Pt[] = [[base[0] - w * .5, base[1]], [base[0] - w * .3 + sw * .3, base[1] - hh * .35], [base[0] + sw * .6, base[1] - hh * .62], [base[0] + w * .3 + sw * .25, base[1] - hh * .3], [base[0] + w * .5, base[1]]];
  return { outer: smoothD(pts, true, .42), inner: smoothD(inn, true, .45) };
}

/** A smoke billow: a cluster of round lobes (drawn as one outlined union), the way the scrolls draw smoke and cloud. */
export function billow(c: Pt, r: number, seed: number): string {
  const lobes: string[] = [circleD(c[0], c[1], r * .7)];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6 + hash01(seed, i, 1) * .08) * Math.PI * 2, d = r * (.55 + .15 * hash01(seed, i, 2)), rr = r * (.42 + .16 * hash01(seed, i, 3));
    lobes.push(circleD(c[0] + Math.cos(a) * d * 1.25, c[1] + Math.sin(a) * d * .75, rr));
  }
  return lobes.join("");
}

/**
 * Fire: tongues of flame along the base line, the tallest in the middle, streaming with the wind; billows of smoke
 * above; embers rising. Params: width, height, intensity (0–1), smoke, lean (−1…1, plus the scene wind).
 */
export function fire(p: P, c: { frame: number; wind: number; seed: number }): Prim[] {
  const W = num(p, "width", 300), H = num(p, "height", 200), k = clamp01(num(p, "intensity", 1)), lean = num(p, "lean", 0) + c.wind * .25;
  if (k <= 0) return [];
  const out: Prim[] = [], lw = Math.max(1, H * .008), n = Math.max(3, Math.round(W / (H * .26)));
  out.push({ t: "glow", cx: 0, cy: -H * .4, r: Math.max(W, H) * 1.1, color: "tan", opacity: .45 * k });
  if (bool(p, "smoke", true)) {
    // Smoke rolls up and away downwind, each billow rising and swelling on its own loop.
    const sm: string[] = [];
    for (let i = 0; i < 7; i++) {
      const u = ((c.frame / 90 + i / 7) % 1), x = (hash01(c.seed, i, 1) - .5) * W * .8 + lean * H * 1.6 * u + u * W * .15, y = -H * (.8 + 1.6 * u);
      sm.push(billow([x, y], H * (.18 + .3 * u) * k, c.seed + i));
    }
    out.push({ t: "group", opacity: .7, prims: [{ t: "fill", d: sm.join(""), fill: { type: "linear", angle: 90, stops: [[0, "usuzumi", 1], [1, "paper", 1]] }, outline: lw * .8, outlineColor: "usuzumi", union: true, noPrint: true }] });
  }
  const outer: string[] = [], inner: string[] = [], cores: string[] = [];
  for (let i = 0; i < n; i++) {
    const u = n > 1 ? i / (n - 1) : .5, x = (u - .5) * W + (hash01(c.seed, i, 6) - .5) * W / n * .6, tall = (.45 + .55 * Math.sin(Math.PI * u)) * k * (.55 + .7 * hash01(c.seed, i, 2));
    const t = tongue([x, 0], W / n * (.7 + .5 * hash01(c.seed, i, 7)), H * tall, lean * .3, (i % 2 ? 1 : -1) * .5, c.frame, c.seed + i * 13);
    outer.push(t.outer); inner.push(t.inner);
    if (i % 2 === 0) cores.push(tongue([x, 0], W / n * .3, H * tall * .45, lean * .2, 0, c.frame, c.seed + i * 7).inner);
  }
  out.push({ t: "fill", d: outer.join(""), fill: "shu", outline: lw, outlineColor: "kogecha", union: true });
  out.push({ t: "fill", d: inner.join(""), fill: "tan", union: true }, { t: "fill", d: cores.join(""), fill: "ki", union: true });
  // Embers lifting off the flames and drifting with the smoke.
  const em: string[] = [];
  for (let i = 0; i < 22; i++) {
    const u = ((c.frame / (40 + 30 * hash01(c.seed, i, 3)) + hash01(c.seed, i, 4)) % 1), x = (hash01(c.seed, i, 5) - .5) * W + lean * H * u * 1.2 + Math.sin(u * 9 + i) * H * .05, y = -H * (.4 + 1.4 * u);
    em.push(circleD(x, y, Math.max(.8, H * .008 * (1 - u))));
  }
  out.push({ t: "dots", d: em.join(""), color: "ki", opacity: .9 * k });
  return out;
}

/** A divine radiance behind a head or body: gold rays of two lengths and a ring, slowly breathing. Params: radius, rays. */
export function halo(p: P, c: { frame: number }): Prim[] {
  const R = num(p, "radius", 90), n = Math.max(8, Math.round(num(p, "rays", 24))), b = 1 + .04 * Math.sin(c.frame / 20), lw = Math.max(1, R * .012);
  const rays: string[] = [];
  for (let i = 0; i < n; i++) {
    const a = i / n * Math.PI * 2, r0 = R * .55, r1 = R * (i % 2 ? .85 : 1.12) * b, w = Math.PI / n * .45;
    rays.push(`M${f1(Math.cos(a - w) * r0)} ${f1(Math.sin(a - w) * r0)}L${f1(Math.cos(a) * r1)} ${f1(Math.sin(a) * r1)}L${f1(Math.cos(a + w) * r0)} ${f1(Math.sin(a + w) * r0)}Z`);
  }
  return [{ t: "glow", cx: 0, cy: 0, r: R * 1.6 * b, color: "kin", opacity: .45 },
    { t: "fill", d: rays.join(""), fill: { type: "radial", stops: [[0, "ki", 1], [1, "kin", .7]] }, outline: lw * .6, outlineColor: "kincha" },
    { t: "fill", d: ellipseD(0, 0, R * .58, R * .58), fill: { type: "radial", stops: [[0, "gofun", .9], [1, "kin", .6]] }, outline: lw, outlineColor: "kincha" },
    { t: "stroke", d: ellipseD(0, 0, R * .5, R * .5), color: "shu", width: lw * 1.4, opacity: .8 }];
}

export const EFFECT_MOTIFS = { fire, halo };
export const ANIMATED_EFFECTS = ["fire", "halo"] as const;

// ---- Particles ---------------------------------------------------------------------------------------------------------------------

/** A henge puff: curling cloud scrolls burst out from the point, swell, roll upward and thin away over ~40 frames. */
export function smokePuffs(bursts: readonly UkiyoeBurst[], frame: number, seed: number, size: number): Prim[] {
  const out: Prim[] = [];
  for (const [bi, b] of bursts.entries()) {
    const t = frame - b.frame, R = (b.radius ?? 90) * size, n = b.count ?? 7;
    if (t < 0 || t > 44) continue;
    const grow = 1 - (1 - Math.min(1, t / 14)) ** 3, fade = 1 - clamp01((t - 18) / 26), clouds: string[] = [], curls: string[] = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n * 360 + hash01(seed + bi, i, 1) * 40) * DEG, d = R * .55 * grow, r = R * (.32 + .12 * hash01(seed + bi, i, 2)) * (.5 + .5 * grow);
      const c: Pt = [b.x + Math.cos(a) * d, b.y + Math.sin(a) * d * .7 - t * R * .012];
      clouds.push(billow(c, r, seed + bi * 17 + i));
      // A spiral curl inside each puff (the scrolled cloud the prints draw).
      const sp: Pt[] = [];
      for (let j = 0; j <= 10; j++) { const q = j / 10, aa = a + q * Math.PI * 1.6; sp.push([c[0] + Math.cos(aa) * r * .6 * (1 - q * .7), c[1] + Math.sin(aa) * r * .4 * (1 - q * .7)]); }
      curls.push(carvedLine(sp, Math.max(.8, R * .02), { taper: "end", minRatio: .2, smooth: true }));
    }
    out.push({ t: "group", opacity: fade, prims: [{ t: "fill", d: clouds.join(""), fill: { type: "radial", stops: [[0, "gofun", 1], [1, "paper", 1]] }, outline: 1.4, outlineColor: "usuzumi", union: true },
      { t: "fill", d: curls.join(""), fill: "usuzumi", opacity: .7 }] });
  }
  return out;
}

/** Lightning: at each burst a forked bolt strikes from above the frame down to the point, white-hot, with a flash. */
export function lightning(bursts: readonly UkiyoeBurst[], frame: number, seed: number, size: number, area: readonly [number, number, number, number]): Prim[] {
  const out: Prim[] = [];
  for (const [bi, b] of bursts.entries()) {
    const t = frame - b.frame;
    if (t < 0 || t > 9) continue;
    const flick = t < 2 ? 1 : t < 4 ? .35 : t < 6 ? .8 : .25 * (1 - (t - 6) / 3), s = seed + bi * 71;
    out.push({ t: "fill", d: `M${area[0]} ${area[1]}h${area[2]}v${area[3]}h${-area[2]}Z`, fill: "gofun", opacity: .22 * flick, noPrint: true });
    const top: Pt = [b.x + (hash01(s, 0, 1) - .5) * 200, area[1] - 20], main: Pt[] = [top];
    const steps = 9;
    for (let i = 1; i <= steps; i++) { const u = i / steps; main.push([lerp(top[0], b.x, u) + (i < steps ? (hash01(s, i, 2) - .5) * 70 : 0), lerp(top[1], b.y, u)]); }
    const branches: Pt[][] = [];
    for (let k = 0; k < 3; k++) {
      const from = main[2 + Math.floor(hash01(s, k, 3) * 5)], br: Pt[] = [from];
      for (let i = 1; i <= 4; i++) br.push([from[0] + (hash01(s, k * 9 + i, 4) - .3) * 60 * i * (k % 2 ? 1 : -1), from[1] + i * 38]);
      branches.push(br);
    }
    const d = [main, ...branches].map((pts, i) => carvedLine(pts, (i ? 5 : 13) * size, { taper: "end", minRatio: .3 })).join("");
    out.push({ t: "glow", cx: b.x, cy: b.y, r: (b.radius ?? 160) * size, color: "ki", opacity: .6 * flick });
    out.push({ t: "fill", d, fill: "ki", outline: 1.5, outlineColor: "kincha", opacity: flick }, { t: "line", d: [main].map(pts => carvedLine(pts, 4.5 * size, { taper: "end" })).join(""), color: "gofun", opacity: flick });
  }
  return out;
}

/** Ash poured from each burst point and carried downwind in a widening, falling plume (Hanasaka Jiisan's magic ash). */
export function ash(bursts: readonly UkiyoeBurst[], frame: number, seed: number, wind: number, size: number): Prim[] {
  const out: Prim[] = [];
  for (const [bi, b] of bursts.entries()) {
    const t = frame - b.frame, dur = b.launchFrom ?? 90, n = b.count ?? 70;
    if (t < 0 || t > dur + 60) continue;
    const pts: string[] = [];
    for (let i = 0; i < n; i++) {
      const born = hash01(seed + bi, i, 1) * dur, age = t - born;
      if (age < 0 || age > 60) continue;
      const spread = (hash01(seed + bi, i, 2) - .5), vx = (2.6 + 2 * hash01(seed + bi, i, 3)) * (wind >= 0 ? 1 : -1) + wind * 1.5;
      const x = b.x + vx * age + spread * age * 1.2, y = b.y - age * 1.6 + .05 * age * age + Math.sin(age / 6 + i) * 4;
      pts.push(circleD(x, y, (1 + 1.5 * hash01(seed + bi, i, 4)) * size * (1 - age / 80)));
    }
    out.push({ t: "dots", d: pts.join("") || "M0 0", color: "gofun", opacity: .9 }, { t: "dots", d: pts.slice(0, Math.floor(pts.length / 3)).join("") || "M0 0", color: "usuzumi", opacity: .6 });
  }
  return out;
}

/** Fox-fires: small teardrop flames, yellow within and red at the rim, each bobbing and flickering where it floats. */
export function foxfire(count: number, area: readonly [number, number, number, number], frame: number, seed: number, size: number): Prim[] {
  const outer: string[] = [], inner: string[] = [], glows: Prim[] = [];
  for (let i = 0; i < count; i++) {
    const x = area[0] + area[2] * hash01(seed, i, 1) + Math.sin(frame / 23 + i) * 6, y = area[1] + area[3] * hash01(seed, i, 2) + Math.sin(frame / 17 + i * 2) * 8;
    const r = (6 + 4 * hash01(seed, i, 3)) * size * (1 + .15 * Math.sin(frame / 4 + i)), lean = Math.sin(frame / 9 + i) * r * .4;
    const drop = (s: number) => smoothD([[x - r * s, y], [x - r * .7 * s, y - r * 1.2 * s], [x + lean, y - r * 2.6 * s], [x + r * .7 * s, y - r * 1.2 * s], [x + r * s, y], [x, y + r * .9 * s]], true, .45);
    outer.push(drop(1)); inner.push(drop(.55));
    if (i % 3 === 0) glows.push({ t: "glow", cx: x, cy: y - r, r: r * 5, color: "tan", opacity: .35 });
  }
  return [...glows, { t: "fill", d: outer.join("") || "M0 0", fill: "shu", opacity: .95 }, { t: "fill", d: inner.join("") || "M0 0", fill: "ki" }];
}

/**
 * A whirlwind as Sekien draws the kamaitachi's: a great flat spiral of wind bands seen face on, turning, leaves and
 * twigs caught along the bands; `slashes` adds the sickle-flashes cutting across it.
 */
export function whirlwind(area: readonly [number, number, number, number], frame: number, seed: number, size: number, slashes: boolean): Prim[] {
  const [ax, ay, aw, ah] = area, c: Pt = [ax + aw / 2, ay + ah / 2], R = Math.min(aw, ah) / 2, spin = frame / 14, out: Prim[] = [], bands: string[] = [], leaves: string[] = [];
  // Three spiral arms, each a band thinning toward the centre.
  for (let k = 0; k < 3; k++) {
    const pts: Pt[] = [];
    for (let j = 0; j <= 40; j++) { const u = j / 40, a = spin + k * 2.1 + u * Math.PI * 3.2, r = R * (1 - u * .85); pts.push([c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r * .8]); }
    bands.push(carvedLine(pts, R * .12 * size, { taper: "both", minRatio: .15, smooth: true }));
    for (let j = 4; j < 38; j += 5) { const q = pts[j], s2 = R * (.03 + .015 * hash01(seed, k * 40 + j, 1)) * size; leaves.push(smoothD([[q[0] - s2, q[1]], [q[0], q[1] - s2 * .6], [q[0] + s2, q[1]], [q[0], q[1] + s2 * .6]], true, .4)); }
  }
  out.push({ t: "fill", d: bands.join(""), fill: { type: "radial", stops: [[0, "gofun", .95], [1, "usuzumi", .7]] }, outline: 1, outlineColor: "usuzumi", noPrint: true });
  out.push({ t: "stroke", d: bands.join(""), color: "usuzumi", width: .6, opacity: .5 }, { t: "fill", d: leaves.join(""), fill: "matsu", outline: .6 });
  if (slashes) {
    for (let i = 0; i < 3; i++) {
      const t = (frame + i * 17) % 50;
      if (t > 8) continue;
      const a = hash01(seed + Math.floor((frame + i * 17) / 50), i, 3) * Math.PI * 2, q: Pt = [c[0] + Math.cos(a) * R * .55, c[1] + Math.sin(a) * R * .45], r = R * .35;
      out.push({ t: "fill", d: smoothD([[q[0] - r, q[1]], [q[0], q[1] - r * .45], [q[0] + r, q[1] - r * .05], [q[0], q[1] - r * .3]], true, .5), fill: "gofun", opacity: 1 - t / 8 });
    }
  }
  return out;
}

// ---- Scene recipes -----------------------------------------------------------------------------------------------------------------

export type UkiyoeEffectDemo = "fire" | "henge" | "storm" | "blossom" | "foxfire" | "halo";
export const UKIYOE_EFFECT_DEMOS: readonly UkiyoeEffectDemo[] = ["fire", "henge", "storm", "blossom", "foxfire", "halo"];

/**
 * One effect shown in its story setting (1920 × 1080): `fire` (a field burning at night, as on Click-Clack Mountain),
 * `henge` (a fox walks into a puff of smoke and a woman walks out), `storm` (rain, lightning striking and the camera
 * jolting with the thunder), `blossom` (the old man scatters ash and the dead tree flowers), `foxfire` (foxes under a
 * bare tree on New Year's Eve with their fires), `halo` (a radiant figure).
 */
export function effectScene(kind: UkiyoeEffectDemo = "fire", frames = 240): UkiyoeSceneSpec {
  const night = kind !== "blossom" && kind !== "halo", nodes: UkiyoeNode[] = [
    { id: "sky", kind: "motif", motif: "sky", params: { width: 1920, height: 1080, band: .5, ...(night ? { top: "yoru", mid: "ai", horizon: kind === "fire" ? "beni" : "ai" } : { horizon: "beni" }) } },
    { id: "hills", kind: "motif", motif: "hills", x: 960, y: 760, params: { width: 2200, height: 200 } },
    { id: "ground", kind: "block", x: 960, y: 930, shape: { type: "rect", width: 1920, height: 360 }, fill: { type: "linear", angle: 90, stops: night ? [[0, "matsu", 1], [1, "sumi", 1]] : [[0, "kusa", 1], [1, "matsu", 1]] }, line: 0 },
  ];
  const elder: UkiyoeFigureLook = { hair: "elder", sleeves: "short", robe: "cha", robePattern: { type: "shima", color: "kogecha", scale: .5 }, obi: "kogecha", lower: "tucked", legs: "hada", feet: "waraji", build: "average", beard: true };
  const camera: UkiyoeSceneSpec["camera"] = kind === "storm" ? { shake: [40, 130, 200].map(f => ({ frame: f + 4, duration: 20, amount: 1.2 })) } : undefined;
  if (kind === "fire") {
    for (const [i, x] of [420, 900, 1400].entries()) nodes.push({ id: "fire" + i, kind: "motif", motif: "fire", x, y: 900 - i * 30, params: { width: 520, height: 260 + i * 40 } });
    nodes.push({ id: "embers", kind: "particles", type: "embers", area: [100, 300, 1700, 600], count: 60 } as UkiyoeNode);
  } else if (kind === "henge") {
    nodes.push({ id: "fox", kind: "creature", species: "fox", x: 400, y: 900, scale: 1.6, facing: "right", actions: [{ type: "walk", start: 0, end: 90, to: 400 }, { type: "transform", start: 96, end: 130 }] });
    nodes.push({ id: "puff", kind: "particles", type: "smoke", bursts: [{ frame: 100, x: 1050, y: 820, radius: 170 }] } as UkiyoeNode);
    nodes.push({ id: "woman", kind: "figure", x: 1050, y: 900, scale: 1.8, from: 114, look: { hair: "shimada", robe: "beni", robePattern: { type: "kanoko", color: "gofun", scale: .5 }, obi: "kin", under: "gofun", feet: "geta", build: "slim" }, facing: "right", actions: [{ type: "walk", start: 130, end: frames, to: 300 }] });
  } else if (kind === "storm") {
    nodes.push({ id: "pine", kind: "motif", motif: "pine", x: 1300, y: 860, params: { height: 520 } });
    nodes.push({ id: "rain", kind: "particles", type: "rain", count: 220, angle: 14 } as UkiyoeNode);
    nodes.push({ id: "bolt", kind: "particles", type: "lightning", area: [0, 0, 1920, 1080], bursts: [{ frame: 40, x: 1300, y: 420 }, { frame: 130, x: 600, y: 780 }, { frame: 200, x: 1500, y: 760 }] } as UkiyoeNode);
  } else if (kind === "blossom") {
    nodes.push({ id: "tree", kind: "motif", motif: "sakura", x: 1150, y: 880, params: { height: 560 }, keys: [{ frame: 0, progress: 0 }, { frame: 70, progress: 0 }, { frame: 200, progress: 1 }] });
    const actions: UkiyoeAction[] = [{ type: "point", start: 30, end: 120, angle: 140 }];
    nodes.push({ id: "elder", kind: "figure", x: 760, y: 920, scale: 1.9, look: elder, facing: "right", actions });
    nodes.push({ id: "ash", kind: "particles", type: "ash", bursts: [{ frame: 40, x: 860, y: 520, launchFrom: 80, count: 90 }] } as UkiyoeNode);
    nodes.push({ id: "petals", kind: "particles", type: "petals", area: [800, 300, 900, 600], count: 30, from: 150 } as UkiyoeNode);
  } else if (kind === "foxfire") {
    nodes.push({ id: "tree", kind: "motif", motif: "pine", x: 700, y: 860, params: { height: 640 } });
    for (let i = 0; i < 5; i++) nodes.push({ id: "fox" + i, kind: "creature", species: "fox", x: 600 + i * 190, y: 900 + (i % 2) * 40, scale: 1.1, facing: i % 2 ? "left" : "right", actions: [{ type: "sit", start: 0, end: frames }] });
    nodes.push({ id: "fires", kind: "particles", type: "foxfire", count: 9, area: [560, 640, 980, 140] } as UkiyoeNode);
    nodes.push({ id: "far", kind: "particles", type: "foxfire", count: 30, size: .45, area: [1200, 700, 600, 60] } as UkiyoeNode);
  } else {
    nodes.push({ id: "halo", kind: "motif", motif: "halo", x: 960, y: 420, params: { radius: 150 } });
    nodes.push({ id: "figure", kind: "figure", x: 960, y: 960, scale: 2.1, look: { hair: "long", robe: "gofun", under: "beni", obi: "kin", feet: "bare", build: "slim", view: "front" }, actions: [{ type: "pray", start: 0, end: frames }] });
  }
  return { version: 1, id: `effect-${kind}`, width: 1920, height: 1080, durationFrames: frames, seed: 29, cadence: 2, palette: { preset: night ? "night" : "spring" }, wind: { base: .4, turbulence: .4 }, ...(camera ? { camera } : {}), nodes };
}
