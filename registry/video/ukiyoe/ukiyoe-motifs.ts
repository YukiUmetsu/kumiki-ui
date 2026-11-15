/**
 * UKIYO1 motifs: the recurring subjects of landscape prints and picture scrolls, generated from a few meaningful
 * parameters instead of drawn by hand. Each motif returns prims in its own local space.
 *
 * Origins: `sky`, `sea` and `field` are anchored at their top-left corner; every other motif stands on its base
 * centre (0, 0) and grows upward (negative y). Motifs that move (waves, trees in wind, the sea) read the frame,
 * the scene wind and the node's `progress`; static ones are cached by the renderer.
 */
import type { Pt } from "./ukiyoe-core";
import { alongPath, carvedLine, clamp, clamp01, DEG, ease, fbm1, hash01, hashSigned, lerp, noise1, polar, polyD, polylineLength, quad, rotatePt, smooth, smoothD, span } from "./ukiyoe-core";
import type { Prim } from "./ukiyoe-prims";
import { circleD, ellipseD, rectD, tf } from "./ukiyoe-prims";
import type { UkiyoePaint } from "./ukiyoe-pigments";
import { SCENERY_MOTIFS } from "./ukiyoe-scenery";
import { CASTLE_MOTIFS } from "./ukiyoe-castle";
import { ANIMATED_TOWN, TOWN_MOTIFS } from "./ukiyoe-town";
import { ANIMATED_INTERIOR, INTERIOR_MOTIFS } from "./ukiyoe-interior";
import { ANIMATED_FOLK, FOLK_MOTIFS } from "./ukiyoe-folk";
import { ANIMATED_EFFECTS, EFFECT_MOTIFS } from "./ukiyoe-effects";
import { ANIMATED_KAMI, KAMI_MOTIFS } from "./ukiyoe-kami";
import { BUSHI_MOTIFS } from "./ukiyoe-bushi";
import { ANIMATED_TEMPLE, TEMPLE_MOTIFS } from "./ukiyoe-temple";
import { ANIMATED_TREES, TREE_MOTIFS } from "./ukiyoe-trees";
import { ANIMATED_HEIAN, HEIAN_MOTIFS } from "./ukiyoe-heian";
import { ANIMATED_TSUKUMO, TSUKUMO_MOTIFS } from "./ukiyoe-tsukumo";

export interface MotifContext { frame: number; wind: number; seed: number; progress: number }
type P = Readonly<Record<string, unknown>>;
const num = (p: P, k: string, d: number) => typeof p[k] === "number" && Number.isFinite(p[k]) ? p[k] as number : d;
const str = (p: P, k: string, d: string): string => typeof p[k] === "string" ? p[k] as string : d;
const paint = (p: P, k: string, d: UkiyoePaint): UkiyoePaint => typeof p[k] === "string" ? p[k] as string : d;
const bool = (p: P, k: string, d: boolean) => typeof p[k] === "boolean" ? p[k] as boolean : d;

// ---- Sky -----------------------------------------------------------------------------------------------------------------------------

/** Ichimonji bokashi band across the top, an optional horizon glow and an optional storm cloud mass. */
function sky(p: P, c: MotifContext): Prim[] {
  const w = num(p, "width", 1920), h = num(p, "height", 700), band = clamp(num(p, "band", .26), 0, 1);
  const top = paint(p, "top", "bero"), mid = paint(p, "mid", "paper"), glow = typeof p.horizon === "string" ? p.horizon as string : undefined;
  const out: Prim[] = [
    { t: "fill", d: rectD(0, 0, w, h), fill: { type: "linear", angle: 90, stops: [[0, mid, mid === "paper" ? 0 : 1], [1, mid, mid === "paper" ? 0 : 1]] }, grain: mid === "paper" ? 0 : .6 },
  ];
  if (str(p, "style", "band") === "horizon") {
    // The great-wave sky: bare paper above, a grey bokashi deepening toward the horizon (at `horizonAt` of the height).
    const at = clamp01(num(p, "horizonAt", .85)), grey = paint(p, "top", "usuzumi");
    out.push({ t: "fill", d: rectD(0, 0, w, h), grain: .9, fill: { type: "linear", angle: 90, stops: [[0, grey, 0], [at * .45, grey, .08], [at * .8, grey, .55], [at, grey, .85], [1, grey, .85]] } });
    return out;
  }
  if (glow) out.push({ t: "fill", d: rectD(0, 0, w, h), grain: .4, fill: { type: "linear", angle: 90, stops: [[0, glow, 0], [.55, glow, 0], [.86, glow, .62], [1, glow, .82]] } });
  out.push({ t: "fill", d: rectD(0, 0, w, h), grain: .9, fill: { type: "linear", angle: 90, stops: [[0, top, 1], [band * .45, top, .96], [band, top, .5], [band * 1.55, top, 0]] } });
  const storm = clamp01(num(p, "storm", 0));
  if (storm > 0) {
    // A low dark cloud mass with a soft ragged lower edge — the sudden shower sky.
    const y0 = h * num(p, "stormAt", .32), pts: Pt[] = [[0, 0], [w, 0]];
    for (let x = w; x >= 0; x -= w / 48) pts.push([x, y0 + fbm1(c.seed + 5, x / 220, 3) * h * .09 + Math.sin(x / w * 7) * h * .03]);
    out.push({ t: "fill", d: smoothD(pts, true, .4), grain: 1, opacity: storm, fill: { type: "linear", angle: 90, stops: [[0, "sumi", .6], [.6, "usuzumi", .75], [1, "usuzumi", .55]] } });
  }
  return out;
}

// ---- Mountain ------------------------------------------------------------------------------------------------------------------------

function mountainProfile(p: P, seed: number): Pt[] {
  const w = num(p, "width", 900), h = num(p, "height", 420), peaks = clamp(Math.round(num(p, "peaks", 1)), 1, 7), crater = num(p, "crater", .07);
  const pts: Pt[] = [];
  const n = 90;
  for (let i = 0; i <= n; i++) {
    const x = -w / 2 + w * i / n;
    let y = 0;
    if (peaks === 1) {
      const u = Math.abs(x) / (w / 2), s = clamp01((1 - u) / (1 - crater));
      y = -h * s ** 1.65 - (u < crater ? noise1(seed, x / 9) * h * .006 : 0);
    } else {
      for (let k = 0; k < peaks; k++) {
        const px = -w / 2 + w * (k + .5) / peaks + hashSigned(seed, k) * w / peaks * .25;
        const ph = h * (.55 + .45 * hash01(seed, k, 3)) * (k === Math.floor(peaks / 2) ? 1 : .85);
        const pw = w / peaks * (1.1 + hash01(seed, k, 7) * .6);
        const u = Math.abs(x - px) / pw;
        y = Math.min(y, -ph * clamp01(1 - u) ** 1.35);
      }
    }
    y += fbm1(seed + 3, x / 60, 3) * h * .012 * (y < -2 ? 1 : 0);
    pts.push([x, Math.min(0, y)]);
  }
  return pts;
}

/**
 * The great-wave Fuji: an almost-straight cone, mostly white snow, with blue "flames" of bare rock rising into the
 * snow from a dark base, scattered flecks either side of the line, a notched summit and a fine dark outline.
 */
function fujiHokusai(p: P, c: MotifContext): Prim[] {
  const w = num(p, "width", 600), h = num(p, "height", 280), color = paint(p, "color", "bero"), seed = c.seed + num(p, "variant", 0) * 97;
  const line = clamp01(num(p, "snowLine", .32)), top = .045;
  const prof: Pt[] = [[-w / 2, 0]];
  for (let i = 0; i <= 40; i++) {
    const t = i / 40, x = -w / 2 + w * (.5 - top) * t;
    prof.push([x, -h * (t ** 1.08) * (1 + .01 * noise1(seed, i))]);
  }
  for (let i = 0; i <= 6; i++) prof.push([-w * top + w * 2 * top * i / 6, -h - (i % 2 ? h * .012 : 0) - (i === 3 ? h * .006 : 0)]);
  for (let i = 40; i >= 0; i--) {
    const t = i / 40, x = w / 2 - w * (.5 - top) * t;
    prof.push([x, -h * (t ** 1.08) * (1 + .01 * noise1(seed + 3, i))]);
  }
  const outline = smoothD(prof, true, .2);
  const out: Prim[] = [{ t: "fill", d: outline, fill: { type: "linear", angle: 0, stops: [[0, "gofun", 1], [.6, "gofun", 1], [1, "sora", .55]] }, emboss: true }];
  // Rock flames: a jagged boundary of tall and short points rising from the base band.
  const flames: Pt[] = [[-w * .62, 4], [-w * .62, -h * line * .6]];
  const n = Math.round(num(p, "flames", 15));
  // Irregular spacing: a few broad rock faces, many narrow flames.
  const steps = Array.from({ length: n * 2 + 1 }, (_, i) => .4 + 1.4 * hash01(seed, i, 11) ** 2);
  const total = steps.reduce((a, b) => a + b, 0);
  let acc = 0;
  for (let i = 0; i <= n * 2; i++) {
    acc += steps[i];
    const t = acc / total, x = -w * .5 + w * t, peak = i % 2 === 1;
    const edge = h * (1 - Math.abs(x) / (w / 2)) * 1.0;
    const hgt = peak ? h * line * (.75 + .9 * hash01(seed, i, 1) ** 1.4) : h * line * (.35 + .25 * hash01(seed, i, 2));
    flames.push([x + hashSigned(seed, i, 3) * w * .012, -Math.min(edge * .95, hgt)]);
  }
  flames.push([w * .62, -h * line * .6], [w * .62, 4]);
  const rock: Prim[] = [{ t: "fill", d: smoothD(flames, true, .12), fill: { type: "linear", angle: 90, stops: [[0, color, 1], [1, "ai", 1]] }, grain: .6 }];
  const flecks: string[] = [];
  for (let i = 0; i < 40; i++) {
    const x = hashSigned(seed, i, 7) * w * .38, y = -h * line * (.6 + 1.1 * hash01(seed, i, 8)), r = 1.2 + 2.6 * hash01(seed, i, 9) ** 2;
    if (-y < h * (1 - Math.abs(x) / (w / 2)) * .92) flecks.push(circleD(x, y, r));
  }
  rock.push({ t: "dots", d: flecks.join(""), color });
  out.push({ t: "clip", d: outline, prims: rock, key: "fuji-rock" });
  out.push({ t: "fill", d: outline, fill: "gofun", opacity: 0, outline: 1.6, outlineColor: "sumi" });
  return out;
}

function mountain(p: P, c: MotifContext): Prim[] {
  if (str(p, "style", "hokusai") === "hokusai" && num(p, "peaks", 1) === 1) return fujiHokusai(p, c);
  const h = num(p, "height", 420), color = paint(p, "color", "bero"), snow = clamp01(num(p, "snow", .3));
  const seed = c.seed + num(p, "variant", 0) * 97, prof = mountainProfile(p, seed);
  const mist = clamp01(num(p, "mist", .35)), shade = clamp01(num(p, "shade", .28));
  const body: Pt[] = [...prof];
  const out: Prim[] = [{
    t: "fill", d: polyD(body), grain: .7,
    fill: { type: "linear", angle: 90, stops: [[0, color, 1], [1 - mist, color, .92], [1, color, 0]] },
  }];
  // The shadowed flank: a translucent second impression on one side of the summit.
  if (shade > 0) {
    const peakIdx = prof.reduce((best, q, i) => q[1] < prof[best][1] ? i : best, 0);
    const right = prof.slice(peakIdx);
    out.push({ t: "fill", d: polyD([...right, [prof[peakIdx][0] + (right[right.length - 1][0] - prof[peakIdx][0]) * .12, 0]]), opacity: shade, grain: .5,
      fill: { type: "linear", angle: 90, stops: [[0, "sumi", .9], [.7, "sumi", .4], [1, "sumi", 0]] } });
  }
  // Snow cap with the drip tongues that make a woodblock mountain read instantly.
  if (snow > 0) {
    const line = -h * (1 - snow);
    const top = prof.filter(q => q[1] <= line);
    if (top.length > 2) {
      const x0 = top[0][0], x1 = top[top.length - 1][0], tongues = Math.max(3, Math.round(num(p, "tongues", 9)));
      const edge: Pt[] = [];
      for (let i = 0; i <= tongues * 2; i++) {
        const t = i / (tongues * 2), x = lerp(x1, x0, t);
        const deep = i % 2 === 1;
        const centre = 1 - Math.abs(t - .5) * 1.6;
        const len = deep ? h * snow * (.25 + .55 * hash01(seed, i, 11)) * (.5 + .5 * centre) : -h * .015 * hash01(seed, i, 5);
        edge.push([x + hashSigned(seed, i, 2) * 4, line + len]);
      }
      const snowD = smoothD([...top, ...edge.map(q => [q[0], Math.max(q[1], line - h * .03)] as Pt)], true, .35);
      out.push({ t: "fill", d: snowD, fill: { type: "linear", angle: 0, stops: [[0, paint(p, "snowColor", "gofun"), 1], [.55, paint(p, "snowColor", "gofun"), 1], [1, "sora", .9]] }, emboss: true });
      out.push({ t: "line", d: carvedLine(edge.map(q => [q[0], Math.max(q[1], line - h * .03)] as Pt), 1.6, { taper: "none", seed }), color: color, opacity: .75 });
    }
  }
  // Ridge lines fall from the summit and fade.
  const ridges = Math.round(num(p, "ridges", 5));
  const peak = prof.reduce((best, q) => q[1] < best[1] ? q : best, prof[0]);
  for (let r = 0; r < ridges; r++) {
    const side = r % 2 ? 1 : -1, spread = (r + 1) / (ridges + 1);
    const end: Pt = [peak[0] + side * num(p, "width", 900) * .42 * spread, -h * (.05 + .25 * hash01(seed, r, 13))];
    const pts = quad([peak[0] + side * 6, peak[1] + h * .06], [lerp(peak[0], end[0], .35) + hashSigned(seed, r) * 20, lerp(peak[1], end[1], .6)], end, 16);
    out.push({ t: "line", d: carvedLine(pts, 2.2, { taper: "end", seed: seed + r }), color: "sumi", opacity: .28 });
  }
  out.push({ t: "line", d: carvedLine(prof.filter(q => q[1] < -h * .02), 2.4, { taper: "both", seed, minRatio: .1 }), color: "sumi", opacity: .82 });
  return out;
}

// ---- Hills -------------------------------------------------------------------------------------------------------------------------

function hills(p: P, c: MotifContext): Prim[] {
  const w = num(p, "width", 1600), h = num(p, "height", 180), seed = c.seed + num(p, "variant", 0) * 31;
  const color = paint(p, "color", "kusa"), dark = paint(p, "dark", "matsu"), density = clamp01(num(p, "trees", .5));
  const kind = str(p, "treeKind", "round");
  const top: Pt[] = [];
  for (let i = 0; i <= 64; i++) {
    const x = -w / 2 + w * i / 64;
    top.push([x, -h * (.55 + .45 * (fbm1(seed, x / (w * .22), 3) * .5 + .5)) * (1 - Math.abs(i / 64 - .5) * .3)]);
  }
  const out: Prim[] = [{ t: "fill", d: smoothD([[-w / 2, 0], ...top, [w / 2, 0]], true, .35), grain: .6,
    fill: { type: "linear", angle: 90, stops: [[0, dark, 1], [.35, color, 1], [1, color, .15]] } }];
  out.push({ t: "line", d: carvedLine(top, 2, { taper: "both", seed, minRatio: .15 }), color: "sumi", opacity: .6 });
  const trees = Math.round(w / 60 * density);
  const dots: string[] = [];
  for (let i = 0; i < trees; i++) {
    const x = -w / 2 + w * hash01(seed, i, 1), idx = clamp(Math.round((x + w / 2) / w * 64), 0, 64), y = top[idx][1] + 4;
    const s = 10 + 12 * hash01(seed, i, 2);
    if (kind === "cedar") out.push({ t: "fill", d: polyD([[x, y - s * 3.2], [x + s * .7, y], [x - s * .7, y]]), fill: dark, outline: 1 });
    else dots.push(ellipseD(x, y - s * .6, s * .8, s * .7));
  }
  if (dots.length) out.push({ t: "fill", d: dots.join(""), fill: dark, outline: 1.1 });
  return out;
}

// ---- Sea ---------------------------------------------------------------------------------------------------------------------------

/** Open water: perspective rows of wave lines drifting with the swell, plus foam hooks on the near rows. */
function sea(p: P, c: MotifContext): Prim[] {
  const w = num(p, "width", 1920), h = num(p, "height", 420), rows = clamp(Math.round(num(p, "rows", 14)), 2, 40);
  const color = paint(p, "color", "bero"), light = paint(p, "light", "sora"), foam = clamp01(num(p, "foam", .4));
  const speed = num(p, "speed", .6), swell = num(p, "swell", 1), t = c.frame, rough = clamp01(num(p, "rough", 0) * c.progress);
  // Bokashi in absolute depth below the horizon: pale at the far water, a deep band ~`deepAt` px down.
  const deep = clamp01(num(p, "deepAt", 520) / h);
  const out: Prim[] = [{ t: "fill", d: rectD(0, 0, w, h), grain: .8, fill: { type: "linear", angle: 90, stops: [[0, color, .82], [deep * .6, color, .92], [Math.min(1, deep), color, 1], [1, color, 1]] } },
    { t: "fill", d: rectD(0, 0, w, h), fill: { type: "linear", angle: 90, stops: [[0, light, 1], [deep * .3, light, .55], [deep * .75, light, 0], [1, light, 0]] } },
    { t: "fill", d: rectD(0, 0, w, h), fill: { type: "linear", angle: 90, stops: [[0, "sumi", 0], [deep * .75, "sumi", 0], [Math.min(1, deep * 1.05), "sumi", .28], [1, "sumi", .32]] } }];
  const lines: string[] = [], hooks: string[] = [];
  for (let r = 1; r <= rows; r++) {
    const k = r / rows, y = h * k ** 1.55, s = .25 + k * 1.25;
    const wl = 70 * s, amp = 3.2 * s * swell, phase = t * speed * s + hash01(c.seed, r) * wl + c.wind * t * .4 * s;
    const pts: Pt[] = [];
    for (let x = -wl; x <= w + wl; x += wl / 6) {
      const u = ((x + phase) / wl) % 1, crest = Math.sin(u * Math.PI * 2);
      pts.push([x, y - Math.abs(crest) ** .7 * amp * Math.sign(crest) - Math.sin(t / 40 + r) * amp * .5]);
    }
    lines.push(smoothD(pts, false, .5));
    if (foam > 0 && k > .35) {
      const count = Math.round(w / (wl * 3.2) * foam);
      for (let i = 0; i < count; i++) {
        const hx = ((hash01(c.seed, r, i) * (w + 200) + phase * .6) % (w + 200)) - 100, hy = y - amp * 1.2, hs = 5 * s;
        hooks.push(`M${hx - hs} ${hy + hs * .3}Q${hx - hs * .2} ${hy - hs * 1.3} ${hx + hs} ${hy - hs * .1}Q${hx + hs * .2} ${hy - hs * .2} ${hx + hs * .1} ${hy + hs * .5}Z`);
      }
    }
  }
  out.push({ t: "stroke", d: lines.join(""), color: light, width: 1.6, opacity: .85, ...(rough > 0 ? { opacity: .85 * (1 - rough) } : {}) });
  if (hooks.length && rough < 1) out.push({ t: "fill", d: hooks.join(""), fill: paint(p, "foamColor", "gofun"), outline: .8, outlineColor: color, ...(rough > 0 ? { opacity: 1 - rough } : {}) });
  if (rough > 0) out.push(...roughSea(p, c, w, h, rows, rough));
  return out;
}

/**
 * A rising sea: as `rough` × the node's progress grows, the flat wave lines become rows of travelling swells, as in the
 * background seas of the great-wave prints. Each row is a filled band whose top is a Gerstner (trochoidal) profile:
 * sharp crests, broad troughs. Nearer rows are bigger and are painted over farther ones, so the swells overlap in
 * depth. Swells come in groups that travel at half the speed of their crests (deep-water group velocity), so the sea
 * is never a uniform pattern; the biggest crests of each group grow white caps that curl the way the sea runs. Every
 * cap belongs to its crest and grows with it (nothing pops in). `direction` 1 runs the sea to the right, -1 to the left.
 */
function roughSea(p: P, c: MotifContext, w: number, h: number, rows: number, rough: number): Prim[] {
  const color = paint(p, "color", "bero"), mid = paint(p, "roughLight", "ai"), light = paint(p, "crestColor", "sora"), foamC = paint(p, "foamColor", "gofun");
  const dir = num(p, "direction", 1) >= 0 ? 1 : -1, drift = num(p, "drift", 1.4), t = c.frame, R = rough;
  const out: Prim[] = [], crests: string[] = [], caps: string[] = [];
  for (let r = 1; r <= rows; r++) {
    const k = r / rows, y = h * k ** 1.55, s = .25 + k * 1.25, next = h * Math.min(1, (r + 1.6) / rows) ** 1.55;
    const wl = 70 * s * (1 + 1.8 * R), amp = (2 + 28 * R) * s, v = drift * s * (.6 + .8 * R);
    const shift = dir * v * t + hash01(c.seed, r, 201) * wl, gShift = dir * v * .5 * t + hash01(c.seed, r, 202) * wl * 7;
    const env = (x: number) => .35 + .65 * (.5 + .5 * Math.sin(2 * Math.PI * (x - gShift) / (wl * 6.5)));
    const sharp = Math.min(.8, .2 + .6 * R) / (2 * Math.PI / wl);   // Gerstner steepness, kept below a loop
    const pts: Pt[] = [], step = Math.max(6, wl / 9);
    for (let a = -wl * 1.5; a <= w + wl * 1.5; a += step) {
      const th = 2 * Math.PI * (a - shift) / wl, A = amp * env(a);
      pts.push([a - sharp * (A / amp) * Math.sin(th), y - A * (Math.cos(th) * .5 + .5) + A * .15]);   // points gather under each crest
    }
    const band = smoothD([...pts, [w + wl * 1.5, next + 2], [-wl * 1.5, next + 2]], true, .4);
    // The face under each crest is in shadow, fading toward the next crest: the sea's own bokashi shows through.
    out.push({ t: "fill", d: band, fill: { type: "linear", angle: 90, stops: [[0, mid, .5 * R], [.35, color, .32 * R], [1, color, 0]] } });
    crests.push(smoothD(pts, false, .4));
    // White caps on the crests that stand highest in their group, grown with the crest (each crest has an identity).
    if (k > .25) {
      const n0 = Math.floor((-wl * 1.5 - shift) / wl), n1 = Math.ceil((w + wl * 1.5 - shift) / wl);
      for (let n = n0; n <= n1; n++) {
        const cx = shift + n * wl, A = amp * env(cx), grow = smooth(span(A / amp * R, .4, .85)) * (.7 + .5 * hash01(c.seed, r * 997 + n, 203));
        if (grow < .05) continue;
        const hs = 12 * s * grow, hy = y - A + A * .15;
        caps.push(`M${cx - dir * hs * 1.1} ${hy + hs * .45}Q${cx - dir * hs * .1} ${hy - hs * 1.2} ${cx + dir * hs} ${hy - hs * .05}Q${cx + dir * hs * .25} ${hy - hs * .15} ${cx + dir * hs * .15} ${hy + hs * .55}Z`);
      }
    }
  }
  out.push({ t: "stroke", d: crests.join(""), color: light, width: 1.6, opacity: .6 + .3 * R });
  if (caps.length) out.push({ t: "fill", d: caps.join(""), fill: foamC, outline: .8, outlineColor: color });
  return out;
}

// ---- Great wave -----------------------------------------------------------------------------------------------------------------------

// Normalised silhouette of the great wave, measured from the print and mirrored to curl left (x in widths from the
// centre, y in heights, up negative). A broad white back rises from far behind; the crest overhangs into a long lace
// lip; the blue column under it falls almost vertically before flaring out into the trough.
const WAVE_BACK: readonly Pt[] = [[.5, 0], [.385, -.333], [.301, -.577], [.217, -.66], [.126, -.746], [.042, -.846], [-.035, -.923], [-.119, -.977], [-.189, -1.003], [-.252, -.997]];
const WAVE_LIP: readonly Pt[] = [[-.308, -.936], [-.364, -.878], [-.427, -.782], [-.476, -.679], [-.497, -.59], [-.493, -.487]];
const WAVE_UNDER: readonly Pt[] = [[-.472, -.429], [-.42, -.436], [-.364, -.481], [-.304, -.558]];
const WAVE_FRONT: readonly Pt[] = [[-.278, -.603], [-.24, -.47], [-.214, -.34], [-.21, -.22], [-.232, -.12], [-.278, -.05], [-.34, -.014], [-.42, -.002], [-.5, 0]];
/**
 * The lower edge of the white dome that caps the wave: down from the crest beside the blue column, then back along a
 * row of claws to the rear slope. Everything below it is blue (in the print the white is only the wave's top).
 */
const WAVE_RIDGE: readonly Pt[] = [[-.027, -.779], [-.008, -.692], [-.007, -.59], [.017, -.513], [.077, -.481], [.147, -.436], [.217, -.385], [.301, -.314], [.406, -.179], [.5, -.006]];
/** The top of the blue column, where the crest foam ends: from the dome edge forward to the lip's underside. */
const WAVE_CREST_UNDER: readonly Pt[] = [[-.027, -.779], [-.07, -.797], [-.126, -.81], [-.182, -.8], [-.234, -.772], [-.271, -.728], [-.285, -.641], [-.301, -.562]];
/** The body's contour from the crest down to the column top on the curled wave: just inside the crest foam's lower edge. */
const TURN_CURLED: readonly Pt[] = [[-.258, -.94], [-.274, -.84], [-.292, -.73], [-.306, -.645]];
/** Where the lip's underside lies once the tube has collapsed after a break: along the column's foot. */
const TUBE_CLOSED: readonly Pt[] = [[-.62, -.03], [-.42, -.012], [-.26, -.07], [-.215, -.2]];
/** The column's forward guide for the stripes: from under the crest, down the front face, into the trough. */
const WAVE_STRIPE_FRONT: readonly Pt[] = [[-.252, -.769], [-.277, -.615], [-.24, -.47], [-.214, -.34], [-.21, -.22], [-.232, -.12], [-.278, -.05], [-.34, -.012]];

/**
 * Height, shape and break state of a wave at a frame — shared by the drawing and by anything floating on it.
 *
 * The life of the wave follows a plunging breaker (studied from breaking-wave diagrams and animated great-wave prints):
 * a low blue swell steepens until its front stands up (`steep`) and only then curls (`curl`); it advances as it grows
 * (`travel`); at `breakAt` the crest outruns its base (`lean`) and throws the lip out (`toss`), the lip falls under
 * gravity onto the water ahead of the face (`fall`), the impact boils up a whitewater roller (`impact`) and what is left
 * rolls on and settles into a low foaming swell (`settle`).
 */
function waveState(p: P, c: MotifContext) {
  const W = num(p, "width", 1100), Hmax = num(p, "height", 560), seed = c.seed + num(p, "variant", 0) * 17;
  // `progress` is already shaped by the node's keyframe eases; easing it again here made the wave snap from small to big
  // in the middle of its rise.
  const rise = clamp01(c.progress);
  const breakAt = typeof p.breakAt === "number" ? p.breakAt as number : undefined, breakDur = num(p, "breakDuration", 36);
  const settleDur = num(p, "settleDuration", breakDur * 1.6), settleTo = clamp01(num(p, "settleTo", 0));
  const b = breakAt === undefined ? 0 : span(c.frame, breakAt, breakAt + breakDur);
  const crash = ease("sine", b);
  // The lip is thrown out (starting from rest, so the break never jolts out of the held peak), then falls accelerating, as
  // a body under gravity does (an in-sine rather than a full quadratic, so the fastest frame stays readable). The crest
  // itself sinks evenly through the break.
  const toss = ease("sine", span(b, 0, .5)), fall = 1 - Math.cos(span(b, .15, .9) * Math.PI / 2);
  // The splash-up starts as the lip lands and boils on into the settle, slow enough to read.
  const impact = breakAt === undefined ? 0 : ease("sine", span(c.frame, breakAt + .8 * breakDur, breakAt + 1.35 * breakDur));
  const sink = ease("sine", span(b, .15, 1));
  const settle = breakAt === undefined ? 0 : ease("sine", span(c.frame, breakAt + breakDur, breakAt + breakDur + settleDur));
  const breathe = Math.sin(c.frame / 11 + seed) * .012 + Math.sin(c.frame / 4.3) * .004;
  // The fall takes 40% off the crest; the roller then sinks to `settleTo` of the risen wave (flat water by default).
  const H = Hmax * (.12 + .88 * rise) * (1 - .4 * sink) * (1 - (1 - settleTo / .6) * settle) * (1 + breathe * (1 - settle));
  // Forward travel (negative x: the wave curls left): half while rising, the rest through the break and the roll-on.
  // `speed` (px per frame) keeps it moving at an even pace from the scene's first frame, through the break and the roll-on:
  // a wave never stands still while it only changes shape.
  const dx = -num(p, "travel", 0) * W * (.5 * rise + .3 * smooth(b) + .2 * settle) - num(p, "speed", 0) * c.frame;
  // As the lip falls the whole water mass pitches forward and down after it (the column leans toward the impact, more
  // the higher it is), rather than sinking in place. It holds through the settle (water never slides back) while the
  // height goes to nothing.
  const pitch = .16 * fall;
  return { W, Hmax, H, seed, rise, crash, toss, fall, sink, impact, settle, dx, lean: .1 * toss, pitch, b, breakAt, breakDur, settleDur,
    steep: smooth(span(rise, .1, .8)), curl: smooth(span(rise, .3, 1)) };
}
type WaveState = ReturnType<typeof waveState>;
/** x (in widths) of a young swell's front at height fraction h: a cosine slope from the crest to a far foot. */
function youngFrontX(h: number): number {
  return -.252 + (-.62 + .252) * Math.acos(Math.max(-1, Math.min(1, 2 * h - 1))) / Math.PI;
}
/** The front at the wave's current steepness: young sloping swell → the print's near-vertical column. */
function steepen(q: Pt, st: WaveState): Pt { return [lerp(youngFrontX(-q[1]), q[0], st.steep), q[1]]; }
/** Height (fraction of Hmax) and span of the whitewater roller, by position s 0 (back) → 1 (front) along it. */
function waveRoller(st: WaveState) {
  // It boils up where the lip lands (about -.69 widths) and spreads both ways; as the wave settles it rolls on forward
  // and spreads back over the column's foot, filling the tube.
  const h = .2 * st.impact * (1 - st.settle), front = -.71 - .14 * st.impact - .14 * st.settle, back = lerp(-.64, -.36, st.impact) + .14 * st.settle;
  // Both ends rise gently (anything the roller reaches is lifted, not flung); the hump leans toward its front.
  return { h, front, back, at: (s: number) => h * Math.sin(Math.PI * clamp01(s)) ** 1.6 * (.55 + .45 * clamp01(s)) / .8 };
}
// Water height (fraction of H) along the wave, following its silhouette: the front face in the trough rising up the
// near-vertical column, the dome, and the long back. The front stops short of vertical so a rider is lifted steeply
// but smoothly (a boat never climbs an overhang).
const SURF_FRONT: readonly Pt[] = [[-.5, 0], [-.42, .002], [-.36, .012], [-.31, .035], [-.27, .075], [-.245, .13], [-.23, .19], [-.22, .26]];
const SURF_BACK: readonly Pt[] = [[-.15, .95], [-.035, .92], [.042, .85], [.126, .75], [.217, .66], [.301, .58], [.385, .33], [.44, .15], [.5, 0]];
/**
 * Water height (px, positive up) of a wave motif at local x, for the same params/frame/progress the motif is drawn
 * with: the concave face in front of the curl, the long back behind it, flat water beyond both feet.
 */
export function waveSurface(params: Readonly<Record<string, unknown>>, c: MotifContext, localX: number): number {
  const st = waveState(params, c), u0 = (localX - st.dx) / st.W;
  const at = (pts: readonly Pt[], u: number) => {
    if (u <= pts[0][0]) return 0;
    for (let i = 1; i < pts.length; i++) if (u <= pts[i][0]) return lerp(pts[i - 1][1], pts[i][1], smooth((u - pts[i - 1][0]) / (pts[i][0] - pts[i - 1][0])));
    return pts[pts.length - 1][1];
  };
  // Each piece meets its neighbours at the same height, including while the face sinks during the break. A young swell's
  // front slopes as drawn (see `steepen`).
  const sunk = 1 - st.sink * .3;
  // The fall's forward pitch moves the water forward by height up to the top of the ridable face (26% of the height);
  // above it the shift is held, so the steep crest slides rather than steepening (nothing rides there). Riders feel half
  // the drawn pitch: a boat in front of the face covers the difference, and is not tipped hard as the wave settles.
  const pitched = (q: Pt): Pt => [q[0] - st.pitch * .5 * Math.min(.26, Math.max(0, q[1])) ** 1.2, q[1]];
  const front = [...SURF_FRONT.map(q => [q[0], q[1] * sunk] as Pt), [-.15, .95] as Pt].map(q => pitched([lerp(youngFrontX(q[1]), q[0], st.steep), q[1]]));
  const back = SURF_BACK.map(pitched), split = back[0][0];
  const surf = (u: number) => u <= split ? at(front, u) : u <= back[back.length - 1][0] ? at(back, u) : 0;
  // The crest's forward lean is left out: it is weighted by height cubed, so on the lower face where anything rides it
  // moves the water by under 0.3% of the width, while near the crest it would only steepen a face nothing climbs.
  let px = surf(u0) * st.H;
  // The whitewater roller lifts anything on it.
  const roll = waveRoller(st);
  if (roll.h > 0 && u0 >= roll.front && u0 <= roll.back) px = Math.max(px, roll.at((roll.back - u0) / (roll.back - roll.front)) * st.Hmax);
  return px;
}

/**
 * A foam finger's spine: an arc that hooks over at the tip, with small seeded irregularities in its turning so no two
 * fingers are the same smooth curve (the carver's knife never was).
 */
function talonSpine(base: Pt, angle: number, len: number, sweep: number, seed: number, hook = 1.25): Pt[] {
  const n = 7, pts: Pt[] = [base];
  let at = base;
  for (let j = 1; j <= n; j++) {
    const t = (j - .5) / n, jitter = hashSigned(seed, j, 71) * 9 + Math.sin(j * 1.9 + seed) * 4;
    at = polar(at, angle + sweep * t ** hook + jitter, len / n * (1 + hashSigned(seed, j, 72) * .18));
    pts.push(at);
  }
  return pts;
}
/** The finger's outer (convex) edge from `from` to the tip, as an open line: the carved stroke that defines a claw. */
function outerEdge(spine: readonly Pt[], width: number, sweep: number, from: number): Pt[] {
  const side = -Math.sign(sweep) || 1, out: Pt[] = [];
  spine.forEach((q, i) => {
    const t = i / (spine.length - 1);
    if (t < from) return;
    const a = spine[Math.max(0, i - 1)], b = spine[Math.min(spine.length - 1, i + 1)], h = Math.atan2(b[1] - a[1], b[0] - a[0]) / DEG;
    out.push(polar(q, h + side * 90, width / 2 * (.05 + .95 * (1 - t) ** .7)));
  });
  return out;
}
/**
 * A foam claw, the unit the great wave's lace is built from. As carved in the print it is one thick arm that rises
 * forward from the foam, arcs over and drops into a hook whose tip points back and down. Most claws branch: a second
 * hook (sometimes a third) splits off the arm's upper side at the scale of the claw itself. Returns separate layers
 * so the wave can paint them as the print does: `d` is the white arm and branches; `pale` the light-blue tongue
 * inside the curl; `line` the bold open stroke along the arm's outer side and round each hook. The underside carries no
 * line, so the claw stays open to the white it grows from. `angle` is the direction the wave travels (forward).
 * `fingers` is the number of hooks (1 arm + branches).
 */
function foamHand(at: Pt, angle: number, size: number, fingers: number, seed: number): { d: string; pale: string; line: string } {
  const side = 1, up = angle + 90 * side;
  // A small claw's stroke thins with it, so an emerging claw never reads as a dark dot.
  const lineW = Math.max(Math.min(1.2, size * .1), size * .07);
  const parts: string[] = [], lines: string[] = [];
  // The arm: leaves the foam heading forward and up, arcs over, hooks back and down.
  const len = size * (1.5 + .3 * hash01(seed, 0, 31)), sweep = -(185 + 35 * hash01(seed, 0, 32));
  const arm = talonSpine(at, angle + side * (38 + hashSigned(seed, 0, 37) * 10), len, sweep, seed * 31, 1.55);
  const armW = len * .34;
  parts.push(carvedLine(arm, armW, { taper: "point", minRatio: .04, wobble: .3, smooth: true, coarse: true, seed: seed * 31 }));
  lines.push(carvedLine(outerEdge(arm, armW, sweep, .12), lineW, { taper: "both", minRatio: .3, wobble: .35, smooth: true, coarse: true, seed: seed + 7 }));
  // Branches: hooks splitting off the arm's upper (outer) side partway along it, each nearly the claw's own scale.
  for (let b = 1; b < fingers; b++) {
    const k = Math.min(arm.length - 3, 2 + b + Math.floor(hash01(seed, b, 34) * 2)), q = arm[k], nx = arm[k + 1];
    const h = Math.atan2(nx[1] - q[1], nx[0] - q[0]) / DEG;
    const bl = len * (.6 - .12 * (b - 1)) * (.85 + .3 * hash01(seed, b, 36)), bs = sweep * (1.02 + hashSigned(seed, b, 38) * .08);
    const br = talonSpine(q, h + side * (48 + hashSigned(seed, b, 39) * 10), bl, bs, seed * 31 + b * 97, 1.55), bw = bl * .32;
    parts.push(carvedLine(br, bw, { taper: "point", minRatio: .04, wobble: .3, smooth: true, coarse: true, seed: seed * 31 + b }));
    lines.push(carvedLine(outerEdge(br, bw, bs, .2), lineW * .85, { taper: "both", minRatio: .3, wobble: .35, smooth: true, coarse: true, seed: seed + 9 + b }));
  }
  // Fingered tips: as in the print, each hook ends not in one point but in two or three small curled fingers, like a
  // bird's foot. Each fingerlet splits off the hook's outer side near its end and curls the same way at a smaller scale.
  // Only on claws large enough for them to read (small claws stay single hooks, so the lace keeps its rhythm).
  if (size > 22) {
    const hooks: { spine: Pt[]; w: number; sw: number; s: number }[] = [{ spine: arm, w: armW, sw: sweep, s: seed * 31 }];
    const extra = parts.length - 1;
    for (let b = 1; b <= extra; b++) {
      const k = Math.min(arm.length - 3, 2 + b + Math.floor(hash01(seed, b, 34) * 2)), q = arm[k], nx = arm[k + 1], h = Math.atan2(nx[1] - q[1], nx[0] - q[0]) / DEG;
      const bl = len * (.6 - .12 * (b - 1)) * (.85 + .3 * hash01(seed, b, 36)), bs = sweep * (1.02 + hashSigned(seed, b, 38) * .08);
      hooks.push({ spine: talonSpine(q, h + side * (48 + hashSigned(seed, b, 39) * 10), bl, bs, seed * 31 + b * 97, 1.55), w: bl * .32, sw: bs, s: seed * 31 + b * 97 });
    }
    for (const hk of hooks) {
      // A smaller twin of the hook, splitting off a little behind its tip on the outer side and curling the same way.
      const L = hk.spine.length, nf = size > 34 && hash01(hk.s, 3, 81) < .4 ? 2 : 1;
      for (let f = 0; f < nf; f++) {
        const k = Math.max(1, L - 4 - f * 2), q = hk.spine[k], nx = hk.spine[k + 1], h = Math.atan2(nx[1] - q[1], nx[0] - q[0]) / DEG;
        const fl = polylineLength(hk.spine) * (.42 - .1 * f) * (.85 + .3 * hash01(hk.s, f, 82)), fs = hk.sw * (.95 + .1 * hash01(hk.s, f, 83));
        const fin = talonSpine(q, h + side * (24 + 12 * hash01(hk.s, f, 84)), fl, fs, hk.s + 500 + f, 1.5), fw = Math.max(1.6, hk.w * (.55 - .1 * f));
        parts.push(carvedLine(fin, fw, { taper: "point", minRatio: .05, wobble: .25, smooth: true, coarse: true, seed: hk.s + 501 + f }));
        lines.push(carvedLine(outerEdge(fin, fw, fs, .25), lineW * .7, { taper: "both", minRatio: .3, wobble: .3, smooth: true, coarse: true, seed: hk.s + 502 + f }));
      }
    }
  }
  // The pale-blue tongue inside the arm's curl.
  const mid = arm[Math.floor(arm.length * .55)], tipQ = arm[arm.length - 1], hc: Pt = [lerp(mid[0], tipQ[0], .3), lerp(mid[1], tipQ[1], .3)], hollow: Pt[] = [];
  const hcc = polar(hc, up + 180, size * .3);
  for (let i = 0; i < 10; i++) { const a = i * 36, r = size * (.6 + .1 * hashSigned(seed, i, 63)); hollow.push(polar(hcc, angle + a, r * (i % 2 ? .75 : 1))); }
  return { d: parts.join(""), pale: smoothD(hollow, true, .5, true), line: lines.join("") };
}

/**
 * A breaking wave in the manner of the great-wave prints, curling left (flip the node for right). Its parts follow the
 * print: a broad white back whose top rolls in soft, uneven bumps; a deep-navy column under the crest carrying curved
 * medium-blue stripes that bend with the face and converge toward the trough, scattered with snow-like flecks; and one
 * connected white foam of branching hooked claws with pale-blue hollows and open carved strokes. `progress` 0 → 1
 * raises a swell into the curled crest; `breakAt` (frame) collapses it with boiling foam and spray.
 */
/** Claw counts per row, measured once per parameter set on the fully risen wave (see `walk` in `wave`). */
const CLAW_COUNTS = new Map<string, number[]>();
let counting: number[] | undefined;
/** Facts about the last wave drawn (claw placements, stripe centrelines), for measurement and tests. */
export const WAVE_STATS: { claws: { at: Pt; angle: number; size: number; hooks: number }[]; stripes: { line: Pt[]; width: number }[]; H: number; W: number } = { claws: [], stripes: [], H: 0, W: 0 };
function wave(p: P, c: MotifContext): Prim[] {
  const countKey = JSON.stringify(p) + "|" + c.seed;
  let counts = CLAW_COUNTS.get(countKey);
  if (!counts && !counting) {
    counting = [];
    try { wave(p, { frame: 0, wind: 0, seed: c.seed, progress: 1 }); CLAW_COUNTS.set(countKey, counting); } finally { counting = undefined; }
    counts = CLAW_COUNTS.get(countKey);
  }
  WAVE_STATS.claws = []; WAVE_STATS.stripes = [];
  const W = num(p, "width", 1100), seed = c.seed + num(p, "variant", 0) * 17;
  const deep = paint(p, "color", "bero"), mid = paint(p, "light", "hanada"), pale = paint(p, "pale", "sora"), foamC = paint(p, "foam", "gofun"), lineC = paint(p, "line", "ai");
  const st = waveState(p, c), H = st.H, crash = st.crash, curl = st.curl;
  WAVE_STATS.H = H; WAVE_STATS.W = W;
  // Settled flat: only the last bubbles remain.
  if (st.settle > 0 && H < 1.5) return waveBubbles(p, c, st, paint(p, "foam", "gofun"));
  // The column's front sinks a little as the lip falls away from it.
  const sunk = (q: Pt): Pt => [q[0], q[1] * (1 - st.sink * .3)];
  const crest = WAVE_BACK[WAVE_BACK.length - 1], swell = steepen(sunk(WAVE_FRONT[0]), st);
  // Before it curls, the lip lies along the front itself (a curve on a young swell, not the chord to the column top).
  const front0At = sunk(WAVE_FRONT[0]);
  const mound = (i: number, n: number): Pt => steepen([lerp(crest[0], front0At[0], i / n), lerp(crest[1], front0At[1], i / n)], st);
  const lipN = WAVE_LIP.length + WAVE_UNDER.length;
  // The lip is thrown forward, then falls onto the water ahead of the face, the tip leading and the root (at the crest)
  // staying put; the underside follows the tip part of the way, so the tube under the lip stays open to the sky.
  const tipMove: Pt = [-.12 * st.toss - .07 * st.fall, .04 * st.toss + .5 * st.fall];
  const thrown = [...WAVE_LIP, ...WAVE_UNDER].map((q, i) => {
    const m = mound(i + 1, lipN + 1), w = i < WAVE_LIP.length ? (i / (WAVE_LIP.length - 1)) ** 1.4 : lerp(1, .4, (i - WAVE_LIP.length) / (WAVE_UNDER.length - 1));
    return [lerp(m[0], q[0], curl) + tipMove[0] * w, lerp(m[1], q[1], curl) + tipMove[1] * w] as Pt;
  });
  // A falling jet is a thin curtain: as it falls, the underside runs parallel to the outer edge, a fixed thickness back
  // from it, instead of staying behind and stretching the lip into a broad sheet. As the wave settles the tube collapses:
  // the underside closes down onto the column's foot.
  const outerLip = thrown.slice(0, WAVE_LIP.length);
  const lipPts = thrown.map((q, i) => {
    if (i < WAVE_LIP.length) return q;
    const k = i - WAVE_LIP.length, on = atU(outerLip, (WAVE_LIP.length - 1 - k * 1.3) / (WAVE_LIP.length - 1));
    // The curtain forms from the tip: the underside beside the column stays at the column's top, so neither the foam's
    // inner edge nor the blue under it folds back up toward the crest (that fold left a V of sky cut into the curl).
    const pull = st.fall * (1 - .85 * k / (WAVE_UNDER.length - 1));
    const curtain: Pt = [lerp(q[0], on[0] + .07, pull), lerp(q[1], on[1] + .02, pull)];
    return [lerp(curtain[0], TUBE_CLOSED[k][0], st.settle), lerp(curtain[1], TUBE_CLOSED[k][1], st.settle)] as Pt;
  });
  // Travel moves everything forward; the lean pushes the crest forward (steeply weighted by height, so the column keeps
  // its concave front), so the crest outruns the base; the pitch then tips the whole mass forward and down as the lip falls.
  const X = (q: Pt): Pt => { const h = Math.max(0, -q[1]); return [q[0] * W + st.dx - st.lean * W * h ** 3 - st.pitch * W * h ** 1.2, q[1] * H]; };
  // The back's top rolls in soft, uneven bumps (none near the base): displaced along its normal by smooth noise.
  const backPts = smoothPts(WAVE_BACK.map(X), 6), backN = backPts.length;
  const bumpy = backPts.map((q, i) => {
    const a = backPts[Math.max(0, i - 1)], b = backPts[Math.min(backN - 1, i + 1)], l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const t = i / (backN - 1), amp = H * .02 * smooth(span(t, .2, .45)) * (1 - smooth(span(t, .94, 1)));
    const bump = (noise1(seed + 91, t * 7) * .75 + noise1(seed + 97, t * 13) * .25) * amp;
    return [q[0] + (b[1] - a[1]) / l * bump, q[1] - (b[0] - a[0]) / l * bump] as Pt;
  });
  // The body (outlined, blue below, white dome above) stops at the crest: the lip that overhangs it is foam only, so
  // its silhouette is made by its claws, with sky between them, never by a smooth contour.
  // A young swell's front slopes from the crest to a far foot; it stands up into the column as the wave steepens.
  // The blue water is the inside of the curl, the white foam rides on its outer side: as it curls, the column's top runs
  // on along the lip's underside (its upper edge tucked under the white) and tapers to a point near the lip's tip, so it
  // bends with the white and moves with it, thrown, falling as the curtain's inner wall and closing as the tube does. It
  // never stops in a blunt corner with sky between it and the foam.
  const top0: Pt = [lerp(WAVE_FRONT[0][0], -.312, curl * (1 - st.sink)), WAVE_FRONT[0][1]];
  // k runs along the underside from the lip's tip (0) back to the column (3), fractional between its points.
  const under = (k: number): Pt => { const k0 = Math.min(2, Math.floor(k)), f = k - k0, a = lipPts[WAVE_LIP.length + k0], c = lipPts[WAVE_LIP.length + k0 + 1]; return [lerp(a[0], c[0], f), lerp(a[1], c[1], f)]; };
  const towardFoam = (k: number, d: number): Pt => {   // from the underside toward the lip's outer edge (into the white)
    const q = under(k), o = atU(outerLip, (WAVE_LIP.length - 1 - k * 1.3) / (WAVE_LIP.length - 1)), l = Math.hypot(o[0] - q[0], o[1] - q[1]) || 1;
    return [q[0] + (o[0] - q[0]) / l * d, q[1] + (o[1] - q[1]) / l * d];
  };
  // As the lip falls the blue lines only the upper curl (its tip slides back up the curtain), so the tube below stays an
  // open, rounded hollow and the contour never folds over itself.
  const tipK = lerp(.35, 2, st.fall), ks = [0, 1, 2, 3].map(i => lerp(3, tipK, i / 4));
  const upper = ks.map(k => towardFoam(k, .045)), tipQ = towardFoam(tipK, .02);
  const lower = ks.slice(1).reverse().map(k => towardFoam(k, -.11 * (k - tipK) / (3 - tipK)));
  const curlPts = [...upper, tipQ, ...lower];
  const plainTop = [top0, WAVE_FRONT[1], WAVE_FRONT[2]];
  const hook = curlPts.map((q, i) => { const pl = atU(plainTop, (i + 1) / (curlPts.length + 1)); return [lerp(pl[0], q[0], curl), lerp(pl[1], q[1], curl)] as Pt; });
  // From the crest the outline turns down to the curl's root (the column's top under the lip); points along that turn
  // keep the smooth curve from overshooting into a lobe above the crest. On the curled wave the turn runs just inside the
  // crest foam's lower edge, and it always ends at the curl's root: ending at the old column top, behind a thrown curl,
  // folded the outline and cut a wedge of sky between the blue and the white.
  const front0 = sunk(WAVE_FRONT[0]), root = upper[0], turnEnd: Pt = [lerp(front0[0], root[0], curl), lerp(front0[1], root[1], curl)];
  const turn = [.08, .2, .4, .65].map((t, i) => {
    const plain: Pt = [lerp(crest[0], turnEnd[0], t) + .012 * Math.sin(Math.PI * t), lerp(crest[1], turnEnd[1], t)];
    const k = curl * (1 - st.sink);   // eased back as the crest sinks, so the sunken column never juts into a beak
    return [lerp(plain[0], TURN_CURLED[i][0], k), lerp(plain[1], TURN_CURLED[i][1] * (1 - st.sink * .3), k)] as Pt;
  });
  const shape: Pt[] = [...bumpy, ...[...turn, ...hook, ...WAVE_FRONT.slice(2).map(sunk)].map(q => X(steepen(q, st)))];
  const bodyD = smoothD(shape, true, .32);
  // Painting order makes the foam read as one connected mass, as carved: (1) the indigo contour of the whole body,
  // (2) the blue column, (3) the indigo contour of all the foam, (4) the white back, (5) the white foam, (6) the pale
  // hollows, the fingers repainted white over them, and the open strokes. Each white covers the inner half of every
  // contour beneath it, so indigo survives only where white meets blue or sky.
  const out: Prim[] = [{ t: "stroke", d: bodyD, color: lineC, width: 4 }];

  // The blue column: everything forward of the ridge.
  // A young swell is blue with only a thin white cap along its top; the white spreads down the back as it steepens.
  const backY = (x: number) => {
    for (let i = 1; i < WAVE_BACK.length; i++) if (x >= WAVE_BACK[i][0]) return lerp(WAVE_BACK[i - 1][1], WAVE_BACK[i][1], (WAVE_BACK[i - 1][0] - x) / (WAVE_BACK[i - 1][0] - WAVE_BACK[i][0]));
    return crest[1];
  };
  // (The measured edge drops steeply beside the column; it takes that shape with the curl, as the column forms.)
  const ridgeRaw = WAVE_RIDGE.map(q => { const y = backY(q[0]); return [q[0], lerp(y + Math.min(.15, -.2 * y), q[1], curl)] as Pt; });
  const ridge = smoothPts(ridgeRaw.map(X), 5);
  const last = ridge[ridge.length - 1];
  const backD = polyD([...ridge, [.8 * W, last[1]], [.8 * W, -1.3 * H], [ridge[0][0], -1.3 * H]]);
  const face: Prim[] = [{ t: "fill", d: bodyD, fill: deep, grain: .6 }];
  // Stripes, as carved in the print: they run parallel to the column's front edge (the curve against the sky), each
  // one a copy of that edge shifted back into the column by a nearly constant amount (a touch wider under the crest),
  // so they lean and bend exactly as the column does and keep an even rhythm from crest to trough. Their tops run up under the white, which
  // covers them, exactly as the blue block sits under the foam block in the print.
  const front = resampleCount(smoothPts([[WAVE_STRIPE_FRONT[0][0] + .02, -1.05] as Pt, ...WAVE_STRIPE_FRONT].map(q => X(steepen(q, st))), 5), 44);
  const fn = front.map((_q, i) => {   // unit normal pointing back into the column
    const a = front[Math.max(0, i - 1)], b = front[Math.min(front.length - 1, i + 1)], l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    return [-(b[1] - a[1]) / l, (b[0] - a[0]) / l] as Pt;
  });
  const back0 = fn[Math.floor(fn.length / 2)][0] > 0 ? 1 : -1;   // make "back" point away from the sky side
  const arc = (k: number, wob: number): Pt[] => front.map((q, i) => {
    // Fan: wide under the crest, narrowing toward the trough (back stripes lean forward as they fall), plus a bow back
    // at mid-height so each stripe curves like the column itself.
    // Spread: the stripes fan out toward the trough so they fill the whole lower body, and bow back at mid-height so
    // each one curves with the column.
    // The bow scales with the wave's current height, so a small or collapsing wave keeps the same curve, never a zigzag.
    const t = i / (front.length - 1), bow = W * .2 * (H / st.Hmax) * Math.sin(Math.PI * Math.min(1, t * 1.05)) ** 1.1 * (.45 + .55 * k);
    const shift = (W * (.016 + k * (.3 + .28 * t)) + bow) * back0;
    // Shifted horizontally (back into the wave), not along the edge's normal: a normal offset larger than the curve's
    // radius folds into loops at the flare; a horizontal copy of the edge never does.
    return [q[0] + Math.abs(shift) + noise1(seed + Math.round(k * 100), t * 5) * W * .005 * wob, q[1]] as Pt;
  });
  // A broad medium-blue band hugs the front edge itself.
  face.push({ t: "line", d: carvedLine(arc(0, 0).slice(3, -1), W * .046, { taper: "both", minRatio: .35, seed: seed + 3, wobble: .2, smooth: true }), color: mid, opacity: .95 });
  const bandLines: Pt[][] = [];
  const nStripes = Math.round(num(p, "stripes", 8));
  for (let s = 0; s < nStripes; s++) {
    const k = (s + 1) / (nStripes + .3) + hashSigned(seed, s, 81) * .015, line = arc(k, 1);
    const from = 1 + Math.floor(hash01(seed, s, 82) * 3), to = line.length - 2 - Math.floor(hash01(seed, s, 83) * 5);
    face.push({ t: "line", d: carvedLine(line.slice(from, to), W * .019 * (.85 + .3 * hash01(seed, s, 84)), { taper: "both", minRatio: .2, seed: seed + s, wobble: .3, smooth: true }), color: mid, opacity: .95 });
    bandLines.push(line.slice(from, to));
    WAVE_STATS.stripes.push({ line: line.slice(from, to), width: W * .019 });
  }
  // The crest foam: deep over the column, from the top contour and the lip's outer edge down to the column's top and
  // the lip's underside. (Before the wave curls, the inner edge closes up toward the front of the swell.)
  // Before the curl, the band is a cap of even depth under the top contour, thinning to nothing where the lip lies on
  // the front (a straight chord here read as a white block).
  const capTop: Pt[] = [[-.027, backY(-.027)], [-.1, backY(-.1)], [-.18, backY(-.18)], crest, ...[1, 2, 3, 4, 5].map(i => mound(i, 6)), swell];
  const crestUnder = WAVE_CREST_UNDER.map((q, i, all) => {
    const t = i / (all.length - 1), top = atU(capTop, t), cap: Pt = [top[0], top[1] + .15 * (1 - t) ** .8];
    return [lerp(cap[0], q[0], curl), lerp(cap[1], q[1], curl)] as Pt;
  });
  const innerPts = [...crestUnder, ...lipPts.slice(WAVE_LIP.length).slice().reverse()];
  // The band's outer edge is the body's own bumpy top contour, then the lip: one edge, so nothing pokes out.
  const backFrom = (WAVE_BACK.length - 5) * 6;
  const rimEdge = [...bumpy.slice(backFrom, -1), ...smoothPts([WAVE_BACK[WAVE_BACK.length - 1], ...lipPts.slice(0, WAVE_LIP.length)].map(X), 6)], rimIn = smoothPts(innerPts.map(X), 6);
  // Along the lip, the solid band sits well inside the outer contour; the claws rooted on it reach out to the contour.
  const lipStart = (bumpy.length - 1 - backFrom) / (rimEdge.length - 1), fringe = H * .065;
  // Offsets a line along its normal; for these left-running edges `sign` +1 moves down/into the wave body (inward from
  // the top contour), -1 moves up (inward from the lip's underside, i.e. into the foam).
  const inward = (line: readonly Pt[], amount: (u: number) => number, sign: number) => line.map((q, i) => {
    const a = line[Math.max(0, i - 1)], b = line[Math.min(line.length - 1, i + 1)], l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, d = amount(i / (line.length - 1)) * sign;
    return [q[0] + (b[1] - a[1]) / l * d, q[1] - (b[0] - a[0]) / l * d] as Pt;
  });
  // The inset is full by the time the lace starts, so no claw pokes above the dome's measured outline.
  const coreOut = inward(rimEdge, u => fringe * smooth(span(u, lipStart - .14, lipStart - .02)), 1);
  const lipUnderStart = crestUnder.length / innerPts.length;
  const coreIn = inward(rimIn, u => fringe * .55 * smooth(span(u, lipUnderStart - .05, lipUnderStart + .1)), -1);
  const rimD = smoothD([...coreOut, ...coreIn.slice().reverse()], true, .35);
  const flecks: string[] = [];
  const nFleck = Math.round(190 * curl);
  for (let i = 0; i < nFleck; i++) {
    // Most flecks sit along the medium stripes (as in the print); the rest are scattered over the deep blue.
    const u = hash01(seed, i, 1), onBand = bandLines.length > 0 && hash01(seed, i, 12) < .72;
    const src = onBand ? bandLines[i % bandLines.length] : arc(hash01(seed, i, 13), 1), q = src[Math.floor(u * (src.length - 1))];
    const x = q[0] + hashSigned(seed, i, 2) * W * (onBand ? .014 : .03), y = q[1] + hashSigned(seed, i, 3) * H * .02;
    const r = W * (.0022 + .0055 * hash01(seed, i, 4) ** 2), k = 4 + Math.floor(hash01(seed, i, 5) * 3), pts: Pt[] = [];
    for (let v = 0; v < k; v++) pts.push(polar([x, y], v * 360 / k + hash01(seed, i, v + 6) * 40, r * (.7 + .6 * hash01(seed, i, v + 9))));
    flecks.push(smoothD(pts, true, .3));
  }
  if (flecks.length) face.push({ t: "fill", d: flecks.join(""), fill: foamC, noPrint: true });

  // Foam lace: hooked hands along the crest and lip reaching into the sky, hanging from the band's underside over the
  // blue, spilling down the ridge and cascading from the lip. With the band and the breaking trough they are ONE
  // shape; every hand overlaps the band, the white back or its neighbour, so none is isolated.
  // Hands are grouped in ranks. Each rank is painted pale, then white, then its strokes, from the outer fringe inward,
  // so each row of hands lies over the pale tongues under the row above it, like the print's overlapping lace. All of
  // them also join the one foam silhouette, so nothing reads as a separate cut-out.
  const foam: string[] = [rimD], shadows: string[] = [];
  const ranks = new Map<number, { white: string[]; pale: string[]; line: string[] }>();
  let hk = 0, rank = 0;
  // Claw scale relative to the wave: each claw is about a tenth of the lace's width, packed densely, as in the print.
  const CLAW = num(p, "clawScale", .9), GAP = 1.05;
  // Claws emerge from the band as the swell steepens (a young swell carries no lace), then grow with the curl.
  const grow = (.3 + .7 * curl) * smooth(span(st.rise, .12, .5)) * (1 + st.toss * .25);
  const hand = (at: Pt, angle: number, size: number) => {
    const id = hk++, sway = Math.sin(c.frame / 7 + id * 1.3) * 4 * (1 + crash);
    const sz = size * CLAW * grow * (.8 + .45 * hash01(seed, id, 23));
    const hooks = hash01(seed, id, 21) < .2 ? 1 : hash01(seed, id, 21) < .72 ? 2 : 3;
    const h = foamHand(at, angle + sway + hashSigned(seed, id, 22) * 8, sz, hooks, seed + id);
    WAVE_STATS.claws.push({ at, angle: angle + sway, size: sz, hooks });
    if (sz < 1) return;   // still emerging: nothing to draw yet (its id is kept, so no other claw shifts)
    const r = ranks.get(rank) ?? { white: [], pale: [], line: [] };
    r.white.push(h.d); r.pale.push(h.pale); r.line.push(h.line); ranks.set(rank, r);
    // Only hands on the foam's edges (against sky or blue) need to join the outlined silhouette.
    if (rank === 0 || rank === 5) foam.push(h.d);
    shadows.push(ellipseD(at[0] + sz * .12, at[1] + sz * .34, sz * .7, sz * .5));
  };
  // Every claw keeps its identity for the whole life of the wave: each row has a fixed number of claws (taken from the
  // fully risen wave with these params) at fixed fractions of its line. As the wave rises and breaks the lines stretch
  // and bend, and each claw rides its point and grows; nothing is re-spaced, added or dropped between frames.
  let walkIdx = 0;
  const walk = (line: readonly Pt[], spacing: number, from: number, to: number, fn: (q: Pt, n: Pt, u: number, i: number) => void) => {
    const L = polylineLength(line), call = walkIdx++;
    if (counting) { counting.push(Math.max(1, Math.round((to - from) * L / (spacing * GAP)))); return; }
    const n = counts![call] ?? 0;
    // Placement is by parameter along the line's fixed points (not arc length), so a claw moves only as its own stretch
    // of line moves; a fold elsewhere on the line can never shove it sideways.
    for (let i = 0; i < n; i++) {
      const u = from + (to - from) * (i + .5) / n, q = atU(line, u);
      const a = atU(line, Math.max(0, u - .01)), b = atU(line, Math.min(1, u + .01)), l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
      fn(q, [-(b[1] - a[1]) / l, (b[0] - a[0]) / l], u, i);   // n: outward normal
    }
  };
  // Along the crest and lip: hands reaching out and forward into the sky, hooking over. (The rounded top of the back
  // carries none: the lace starts where the crest tips forward.)
  rank = 0;
  walk(coreOut, H * .085, lipStart - .02, 1, (q, n, u, i) => { const r = seed * 13 + i, out2 = H * (-.012 + .02 * hash01(r, 6)); hand([q[0] + n[0] * out2, q[1] + n[1] * out2], lerp(196, 146, span(u, lipStart, 1)) + hashSigned(r, 7) * 8, H * .085 * (.85 + .3 * hash01(r, 8))); });
  // Under the lip: claws hanging from the band's underside, reaching down and forward over the hollow.
  rank = 5;
  walk(coreIn, H * .095, lipUnderStart, 1, (q, _n, _u, i) => hand(q, 140 + (i % 2 ? 8 : -6), H * .08));
  // From the crest foam's underside: hands hanging over the top of the blue column and, under the lip, over the hollow.
  rank = 5;
  walk(rimIn, H * .095, .02, lipUnderStart, (q, _n, u, i) => hand(q, 152 + (i % 2 ? 8 : -6), H * (.075 - .01 * u)));
  // Inside the foam mass: ranks of claws so the crest and lip read as lace, not a solid white block.
  const outer40 = Array.from({ length: 48 }, (_, i) => atU(coreOut, i / 47)), inner40 = Array.from({ length: 48 }, (_, i) => atU(coreIn, i / 47));
  // Placed loosely, never in tidy rows: each hand drifts along and across its rank, some are skipped, sizes vary.
  for (const k of [.38, .78]) {
    rank = 1 + Math.round(k * 3);
    const mid = outer40.map((q, i) => [lerp(q[0], inner40[i][0], k), lerp(q[1], inner40[i][1], k)] as Pt);
    walk(mid, H * .095, .22, 1, (q, n, u, i) => {
      const r = seed * 7 + i + Math.round(k * 100);
      if (hash01(r, 1) < .08) return;
      const along = hashSigned(r, 2) * H * .03, across = hashSigned(r, 3) * H * .035;
      hand([q[0] + n[1] * along + n[0] * across, q[1] - n[0] * along + n[1] * across], lerp(194, 146, span(u, lipStart, 1)) + hashSigned(r, 4) * 10, H * .085 * (.8 + .4 * hash01(r, 5)));
    });
  }
  // Along the dome's lower edge (down beside the column, then back along the wave's body): claws hanging over the
  // blue, reaching forward and down.
  rank = 5;
  walk(ridge, H * .1, .03, .86, (q, n, u, i) => hand([q[0] - n[0] * H * .01, q[1] - n[1] * H * .01], 156 + (i % 2 ? 8 : -6), H * (.085 - .02 * u)));
  rank = 0;
  // The cascade from the lip's tip: a chain of hands close enough that each overlaps the one above it.
  const tip = rimEdge[rimEdge.length - 1], cascade = 1;
  for (let k = 0; k < cascade; k++) {
    const at = polar(tip, 96 - k * 7, H * .03 * (k + .5));
    hand([at[0] + hashSigned(seed, k, 41) * H * .012, at[1]], 150 - k * 9, H * (.085 - .006 * k));
    if (k % 2 === 0) hand([at[0] + H * .035, at[1] - H * .01], 128 - k * 8, H * (.07 - .005 * k));
  }
  // The whitewater roller: where the falling lip lands, foam boils up ahead of the face and rolls on forward, lumpy and
  // clawed like the rest of the lace, joined to the one foam outline. Its claws are a fixed set that grows in with the
  // impact, so none pop in or out.
  const roll = waveRoller(st), rollerD: string[] = [];
  if (roll.h > .004) {
    const n = 24, top: Pt[] = [];
    for (let i = 0; i <= n; i++) {
      const s = i / n, lump = 1 + .22 * noise1(seed + 131, s * 6 + c.frame / 45);
      top.push([lerp(roll.back, roll.front, s) * W + st.dx, -roll.at(s) * st.Hmax * lump]);
    }
    const d = smoothD([[top[0][0], H * .03], ...top, [top[n][0], H * .03]], true, .45);
    foam.push(d); rollerD.push(d);
    // Each roller claw has its own place on the water (drifting forward with the roll) and grows as the roller reaches
    // and lifts it, so foam spreads by appearing, never by claws sliding along the growing roller.
    rank = 0;
    for (let i = 0; i < 9; i++) {
      const u = lerp(-.3, -.86, (i + .5 + .3 * hashSigned(seed, i, 141)) / 9) - .03 * st.settle, s = (roll.back - u) / (roll.back - roll.front);
      const inside = s >= 0 && s <= 1, lift = inside ? roll.at(s) : 0;
      const at: Pt = inside ? atU(top, s) : [u * W + st.dx, 0];
      hand(at, 160 + hashSigned(seed, i, 143) * 12, lift * st.Hmax * (.75 + .35 * hash01(seed, i, 142)) / (CLAW * Math.max(grow, .05)));
    }
  }
  // Pale-blue shadow where foam lies over the deep blue (on the face only: never a halo against the sky).
  face.push({ t: "fill", d: shadows.join(""), fill: pale, opacity: .62, noPrint: true });
  out.push({ t: "clip", d: bodyD, prims: face, key: "wave-face" });
  out.push({ t: "sandwich", d: foam.join(""), fill: foamC, line: lineC, lineWidth: 2.6, key: "wave-foam", between: [{ t: "clip", d: bodyD, key: "wave-back", prims: [
    { t: "fill", d: backD, fill: foamC, noPrint: true },
    // The crest band's full area inside the body is white too: where the lace is inset from the top contour, white (not
    // the blue face) shows between the claws.
    { t: "fill", d: smoothD([...rimEdge, ...rimIn.slice().reverse()], true, .35, true), fill: foamC, noPrint: true },
    // On the white back: a pale-blue wash along the ridge.
    { t: "line", d: carvedLine(smoothPts(ridgeRaw.map(q => [q[0] + .04, q[1]] as Pt).map(X), 4), W * .06, { taper: "both", seed: seed + 41 }), color: pale, opacity: .5 * st.steep },
  ] }] });
  // Under the lace the foam carries the pale-blue impression, so each white claw stands out whole against pale, as in
  // the print. (The dome's rounded top stays white: the pale starts where the lace does.)
  const laceFrom = Math.max(0, Math.floor((lipStart - .08) * (coreOut.length - 1)));
  const laceOut = inward(coreOut.slice(laceFrom), () => H * .004, 1);
  if (curl > .02) out.push({ t: "fill", d: smoothD([...laceOut, ...coreIn.slice(Math.floor(coreIn.length * .3)).reverse()], true, .35, true), fill: pale, opacity: .4 * curl * curl * (1 - .75 * st.settle), noPrint: true });
  // Pale tongues stay inside the foam's own area: the band, the roller and the claws themselves (never a halo against the
  // sky beyond the claws, and never cut by the band's straight edge where the lip thins to a falling curtain).
  const foamArea = smoothD([...rimEdge, ...rimIn.slice().reverse()], true, .35) + rollerD.join("") + [...ranks.values()].map(r => r.white.join("")).join("");
  for (const key of [...ranks.keys()].sort((x, y) => x - y)) {
    const r = ranks.get(key)!;
    out.push({ t: "clip", d: foamArea, union: true, key: "wave-pale-" + key, prims: [{ t: "fill", d: r.pale.join(""), fill: pale, noPrint: true }] });
    out.push({ t: "fill", d: r.white.join(""), fill: foamC, noPrint: true });
    out.push({ t: "line", d: r.line.join(""), color: lineC });
  }

  // Spray: a few snow-like droplets thrown forward and down from the front of the lip, never above the crest. The set
  // is fixed (a droplet fades in as the curl reaches it), so none pop in or out between frames.
  const sprayAmt = clamp01(num(p, "spray", .8)), dots: string[] = [];
  const crestTop = Math.min(...rimEdge.map(q => q[1]));
  const pool = Math.round(18 * sprayAmt), burst = Math.round(22 * sprayAmt);
  for (let i = 0; i < pool + burst; i++) {
    const isBurst = i >= pool, gate = (isBurst ? st.impact : curl) * (1 - st.settle);
    if (hash01(seed, i, 7) >= gate) continue;
    const base = atU(rimEdge, .72 + .28 * hash01(seed, i, 1));
    const life = (c.frame * (.4 + .5 * hash01(seed, i, 4)) / 46 + hash01(seed, i, 2)) % 1;
    const vx = -(40 + 110 * hash01(seed, i, 3)) * (1 + crash * .6), vy = -(4 + 22 * hash01(seed, i, 5)) * (isBurst ? 1.4 : 1);
    const x = base[0] + vx * life, y = base[1] + vy * life + 210 * life * life;
    if (y < crestTop + H * .02) continue;
    const r = (1.6 + 3 * hash01(seed, i, 6) ** 2) * (1 - life * .5) * (H / st.Hmax + .4);
    dots.push(circleD(x, y, r));
  }
  if (dots.length) out.push({ t: "dots", d: dots.join(""), color: foamC });
  out.push(...waveBubbles(p, c, st, foamC));
  return out;
}
/**
 * After the drop: a few weak foam bubbles on the water where the wave fell. Each is born as the roller passes, drifts
 * forward, swells a little and pops. They float on the water just behind the waterline (up the picture is further away
 * on the water; a scene's foreground sea in front of the wave's foot never hides them), never thrown into the air, small
 * and half transparent, and the last has gone soon after the water is flat. `bubbles` (0..1) scales how many.
 */
function waveBubbles(p: P, c: MotifContext, st: WaveState, color: UkiyoePaint): Prim[] {
  if (st.breakAt === undefined) return [];
  const n = Math.round(40 * clamp01(num(p, "bubbles", .8))), scale = Math.sqrt(st.Hmax / 720), dots: string[] = [], rings: string[] = [];
  for (let i = 0; i < n; i++) {
    const birth = st.breakAt + st.breakDur * .85 + hash01(st.seed, i, 151) * st.settleDur * .9, life = 50 + 60 * hash01(st.seed, i, 152);
    const age = (c.frame - birth) / life;
    if (age <= 0 || age >= 1) continue;
    const x = (lerp(-.25, -.95, hash01(st.seed, i, 153)) - (.03 + .05 * hash01(st.seed, i, 154)) * age) * st.W + st.dx;
    const y = -st.Hmax * (.004 + .07 * hash01(st.seed, i, 155) ** 1.4) + Math.sin(c.frame / 9 + i * 1.7) * 1.2;
    const r = (2.2 + 4.5 * hash01(st.seed, i, 156) ** 2) * scale * Math.sin(Math.PI * age) ** .6;
    (hash01(st.seed, i, 157) < .4 ? rings : dots).push(circleD(x, y, r));
  }
  const out: Prim[] = [];
  if (dots.length) out.push({ t: "dots", d: dots.join(""), color, opacity: .72 });
  if (rings.length) out.push({ t: "stroke", d: rings.join(""), color, width: 1.3, opacity: .68 });
  return out;
}
/** Point at parameter u (0..1) along a polyline's vertices, interpolating between neighbours. */
function atU(points: readonly Pt[], u: number): Pt {
  const k = clamp01(u) * (points.length - 1), i = Math.min(points.length - 2, Math.floor(k)), f = k - i;
  return [lerp(points[i][0], points[i + 1][0], f), lerp(points[i][1], points[i + 1][1], f)];
}
/** Resample a polyline to exactly `n` points evenly spaced by arc length. */
function resampleCount(points: readonly Pt[], n: number): Pt[] {
  let total = 0;
  for (let i = 1; i < points.length; i++) total += Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]);
  return Array.from({ length: n }, (_, i) => alongPath(points, total * i / (n - 1)));
}
/** Densify a polyline through a Catmull-Rom spline so offsets curve smoothly. */
function smoothPts(points: readonly Pt[], per = 6): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)], p1 = points[i], p2 = points[i + 1], p3 = points[Math.min(points.length - 1, i + 2)];
    for (let k = 0; k < per; k++) {
      const t = k / per, t2 = t * t, t3 = t2 * t;
      out.push([.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
        .5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3)]);
    }
  }
  out.push(points[points.length - 1]);
  return out;
}

// ---- Trees -------------------------------------------------------------------------------------------------------------------------

function trunkPath(base: Pt, height: number, lean: number, bend: number, seed: number, segs = 10): Pt[] {
  const pts: Pt[] = [];
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    pts.push([base[0] + Math.sin(lean * DEG) * height * t + noise1(seed, t * 3) * height * .06 * t + bend * height * t * t, base[1] - height * t * Math.cos(lean * DEG)]);
  }
  return pts;
}
function taperedBody(pts: readonly Pt[], w0: number, w1: number): string {
  const l: Pt[] = [], r: Pt[] = [];
  pts.forEach((q, i) => {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)], tx = b[0] - a[0], ty = b[1] - a[1], len = Math.hypot(tx, ty) || 1;
    const hw = lerp(w0, w1, i / (pts.length - 1)) / 2;
    l.push([q[0] - ty / len * hw, q[1] + tx / len * hw]); r.push([q[0] + ty / len * hw, q[1] - tx / len * hw]);
  });
  return smoothD([...l, ...r.reverse()], true, .4);
}
/** Flat-topped scalloped needle pad, the pine of the prints. */
function pinePad(cx: number, cy: number, rx: number, ry: number, seed: number): { d: string; top: Pt[] } {
  const lobes = 4 + Math.floor(hash01(seed) * 3), top: Pt[] = [];
  for (let i = 0; i <= lobes * 4; i++) {
    const t = i / (lobes * 4), x = cx - rx + 2 * rx * t;
    const lobe = Math.abs(Math.sin(t * lobes * Math.PI)) ** .6;
    top.push([x, cy - ry * (.35 + .65 * Math.sin(Math.PI * t) ** .5) * (.75 + .25 * lobe)]);
  }
  const bottom: Pt[] = [[cx + rx, cy], [cx + rx * .5, cy + ry * .22], [cx - rx * .5, cy + ry * .2], [cx - rx, cy]];
  return { d: smoothD([...top, ...bottom], true, .35), top };
}

function pine(p: P, c: MotifContext): Prim[] {
  const h = num(p, "height", 460), lean = num(p, "lean", -12), seed = c.seed + num(p, "variant", 0) * 23, spread = num(p, "spread", 1);
  const trunkC = paint(p, "trunk", "cha"), needle = paint(p, "needles", "matsu"), lightC = paint(p, "light", "kusa");
  const sway = c.wind * .9 + Math.sin(c.frame / 37 + seed) * .12;
  const trunk = trunkPath([0, 0], h, lean, sway * .05, seed);
  const out: Prim[] = [{ t: "fill", d: taperedBody(trunk, h * .085, h * .03), fill: { type: "linear", angle: 0, stops: [[0, trunkC, 1], [1, "kogecha", 1]] }, outline: 1.8 }];
  // Bark scales.
  const bark: string[] = [];
  for (let i = 0; i < 9; i++) {
    const q = trunk[1 + Math.floor(hash01(seed, i) * (trunk.length - 3))], s = h * .02;
    bark.push(carvedLine([[q[0] - s, q[1]], [q[0], q[1] - s * .5], [q[0] + s, q[1] + s * .2]], 1.3, { seed: seed + i }));
  }
  out.push({ t: "line", d: bark.join(""), color: "sumi", opacity: .6 });
  const pads = clamp(Math.round(num(p, "pads", 6)), 1, 14);
  const branchPrims: Prim[] = [], padPrims: Prim[] = [];
  for (let i = 0; i < pads; i++) {
    const top = i === pads - 1;
    const at = top ? trunk[trunk.length - 1] : trunk[Math.round(lerp(4, trunk.length - 2, i / Math.max(1, pads - 1)))];
    const side = top ? 0 : (i % 2 ? 1 : -1) * (hash01(seed, i, 2) < .2 ? -1 : 1);
    const blen = top ? 0 : h * (.18 + .22 * hash01(seed, i, 3)) * spread * (1 - i / pads * .4);
    const bendA = sway * 8 * (.5 + i / pads);
    const tip = rotatePt([at[0] + side * blen, at[1] - blen * .12 + hashSigned(seed, i, 4) * h * .04], bendA * .3, at);
    if (!top) {
      const mid: Pt = [lerp(at[0], tip[0], .5), lerp(at[1], tip[1], .5) + h * .03];
      branchPrims.push({ t: "fill", d: taperedBody(quad(at, mid, tip, 8), h * .03, h * .012), fill: trunkC, outline: 1.3 });
    }
    const rx = h * (.13 + .07 * hash01(seed, i, 5)) * spread, ry = rx * (.42 + .1 * hash01(seed, i, 6));
    const pad = pinePad(0, 0, rx, ry, seed + i * 7);
    const needles: string[] = [];
    for (let k = 2; k < pad.top.length - 2; k += 2) {
      const q = pad.top[k];
      for (let m = -1; m <= 1; m++) needles.push(`M${q[0]} ${q[1] + 2}l${m * 3} ${ry * .32}`);
    }
    padPrims.push({ t: "group", transform: tf(tip[0], tip[1] - ry * .25, bendA + Math.sin(c.frame / 23 + i) * c.wind * 2), prims: [
      { t: "fill", d: pad.d, grain: .4, fill: { type: "linear", angle: 90, stops: [[0, lightC, 1], [.4, needle, 1], [1, needle, 1]] }, outline: 1.4 },
      { t: "stroke", d: needles.join(""), color: "sumi", width: .9, opacity: .5 },
    ] });
  }
  return [...out, ...branchPrims, ...padPrims];
}

function sakura(p: P, c: MotifContext): Prim[] {
  const h = num(p, "height", 380), seed = c.seed + num(p, "variant", 0) * 29, bloom = clamp01(num(p, "bloom", 1) * c.progress);
  const trunkC = paint(p, "trunk", "kogecha"), petal = paint(p, "blossom", "sakura");
  const sway = c.wind * .6 + Math.sin(c.frame / 41 + seed) * .08;
  const trunk = trunkPath([0, 0], h * .55, num(p, "lean", 6), sway * .03, seed, 6);
  const out: Prim[] = [{ t: "fill", d: taperedBody(trunk, h * .07, h * .035), fill: trunkC, outline: 1.6 }];
  const tips: Pt[] = [];
  const branches = clamp(Math.round(num(p, "branches", 6)), 2, 12);
  for (let i = 0; i < branches; i++) {
    const at = trunk[Math.round(lerp(2, trunk.length - 1, hash01(seed, i)))];
    const ang = -90 + lerp(-70, 70, (i + .5) / branches) + hashSigned(seed, i, 2) * 12 + sway * 10;
    const len = h * (.25 + .25 * hash01(seed, i, 3)) * num(p, "spread", 1);
    const mid = polar(at, ang + hashSigned(seed, i, 5) * 25, len * .5), tip = polar(mid, ang - hashSigned(seed, i, 6) * 20, len * .5);
    out.push({ t: "fill", d: taperedBody(quad(at, mid, tip, 8), h * .028, h * .008), fill: trunkC, outline: 1.1 });
    tips.push(tip, mid);
  }
  const cloud: string[] = [], flowers: string[] = [];
  tips.forEach((tip, i) => {
    const r = h * .1 * (.6 + .5 * hash01(seed, i, 7)) * bloom;
    if (r < 1) return;
    for (let k = 0; k < 5; k++) cloud.push(circleD(tip[0] + hashSigned(seed, i, k) * r, tip[1] + hashSigned(seed, i, k + 9) * r * .7, r * (.55 + .3 * hash01(seed, i, k + 3))));
    for (let k = 0; k < 9; k++) {
      const fx = tip[0] + hashSigned(seed, i, k + 20) * r * 1.1, fy = tip[1] + hashSigned(seed, i, k + 30) * r * .8;
      for (let q = 0; q < 5; q++) flowers.push(circleD(fx + Math.cos(q * 1.2566 + k) * 2.6, fy + Math.sin(q * 1.2566 + k) * 2.6, 1.9));
    }
  });
  if (cloud.length) {
    // Blossom masses: a deeper pink underprint offset down-right, the pale mass over it, no outlines (as printed).
    out.push({ t: "group", transform: `translate(${h * .012} ${h * .016})`, prims: [{ t: "fill", d: cloud.join(""), fill: "beni", opacity: .35 }] });
    out.push({ t: "fill", d: cloud.join(""), fill: { type: "linear", angle: 90, stops: [[0, "gofun", 1], [.5, petal, 1], [1, petal, 1]] }, grain: .3 });
  }
  if (flowers.length) out.push({ t: "dots", d: flowers.join(""), color: "gofun", opacity: .85 });
  return out;
}

function willow(p: P, c: MotifContext): Prim[] {
  const h = num(p, "height", 420), seed = c.seed + num(p, "variant", 0) * 41, strands = clamp(Math.round(num(p, "strands", 22)), 3, 80);
  const trunkC = paint(p, "trunk", "kogecha"), leaf = paint(p, "leaves", "kusa");
  const trunk = trunkPath([0, 0], h * .62, num(p, "lean", 4), c.wind * .02, seed, 6);
  const crown = trunk[trunk.length - 1];
  const out: Prim[] = [{ t: "fill", d: taperedBody(trunk, h * .055, h * .025), fill: trunkC, outline: 1.5, grain: .6 }];
  for (let i = 0; i < 4; i++) {
    // Limbs arch up and over, then droop: the strands hang from the falling ends.
    const side = i % 2 ? 1 : -1, at = trunk[trunk.length - 2 - (i >> 1)], tip: Pt = [crown[0] + side * h * (.2 + .1 * hash01(seed, i, 7)), crown[1] + h * (.03 + .05 * hash01(seed, i, 8))];
    out.push({ t: "fill", d: taperedBody(quad(at, [lerp(at[0], tip[0], .45), crown[1] - h * (.12 + .05 * hash01(seed, i, 6))], tip, 10), h * .022, h * .006), fill: trunkC, outline: 1.1 });
  }
  const lines: string[] = [];
  for (let i = 0; i < strands; i++) {
    const a = lerp(-1, 1, (i + hash01(seed, i)) / strands);
    const anchor: Pt = [crown[0] + a * h * .32, crown[1] + Math.abs(a) ** 2 * h * .1 - h * .04];
    const len = h * (.45 + .4 * hash01(seed, i, 2)), segs = 9, pts: Pt[] = [anchor];
    let x = anchor[0], y = anchor[1];
    for (let j = 1; j <= segs; j++) {
      const t = j / segs;
      const swing = c.wind * .55 * t + Math.sin(c.frame / 24 + i * .7 + t * 2) * .09 * t + Math.sin(c.frame / 9 + i) * .03 * t * (Math.abs(c.wind) + .3);
      x += Math.sin(swing) * len / segs + a * len / segs * .18 * (1 - t); y += Math.cos(swing) * len / segs;
      pts.push([x, y]);
    }
    lines.push(smoothD(pts, false, .5));
  }
  out.push({ t: "stroke", d: lines.join(""), color: leaf, width: 2.2, opacity: .9, dash: "7 3" });
  out.push({ t: "stroke", d: lines.join(""), color: "matsu", width: .8, opacity: .55 });
  return out;
}

function reeds(p: P, c: MotifContext): Prim[] {
  const w = num(p, "width", 220), h = num(p, "height", 140), n = clamp(Math.round(num(p, "count", 18)), 1, 80), seed = c.seed + num(p, "variant", 0) * 7;
  const color = paint(p, "color", "kusa"), blades: string[] = [], heads: string[] = [];
  for (let i = 0; i < n; i++) {
    const x = -w / 2 + w * hash01(seed, i), len = h * (.55 + .45 * hash01(seed, i, 2));
    const bend = (c.wind * .6 + Math.sin(c.frame / 17 + i) * .12 + hashSigned(seed, i, 3) * .25);
    const tip: Pt = [x + Math.sin(bend) * len, -Math.cos(bend) * len];
    const pts = quad([x, 0], [x + Math.sin(bend * .4) * len * .5, -len * .55], tip, 8);
    blades.push(carvedLine(pts, 3.2, { taper: "end", seed: seed + i, minRatio: .1 }));
    if (hash01(seed, i, 4) < .35) heads.push(carvedLine(quad(tip, [tip[0] + Math.sin(bend) * 6, tip[1] - 8], [tip[0] + Math.sin(bend) * 10, tip[1] - 18], 4), 4.5, { taper: "both" }));
  }
  const out: Prim[] = [{ t: "fill", d: blades.join(""), fill: color, outline: .7 }];
  if (heads.length) out.push({ t: "fill", d: heads.join(""), fill: "kincha", outline: .7 });
  return out;
}

function rock(p: P, c: MotifContext): Prim[] {
  const w = num(p, "width", 260), h = num(p, "height", 170), seed = c.seed + num(p, "variant", 0) * 13;
  const pts: Pt[] = [];
  for (let i = 0; i <= 18; i++) {
    const t = i / 18, a = Math.PI * t;
    pts.push([-Math.cos(a) * w / 2 * (1 + hashSigned(seed, i) * .06), -(Math.sin(a) ** .8) * h * (1 + hashSigned(seed, i, 2) * .1)]);
  }
  const d = smoothD([...pts, [w / 2, 0]], true, .35);
  const out: Prim[] = [{ t: "fill", d, grain: .8, outline: 2, fill: { type: "linear", angle: 60, stops: [[0, paint(p, "light", "usuzumi"), 1], [1, paint(p, "color", "kogecha"), 1]] } }];
  const cracks: string[] = [];
  for (let i = 0; i < 6; i++) {
    const a: Pt = [hashSigned(seed, i, 4) * w * .35, -h * (.3 + .5 * hash01(seed, i, 5))];
    cracks.push(carvedLine(quad(a, [a[0] + hashSigned(seed, i, 6) * 30, a[1] + h * .2], [a[0] + hashSigned(seed, i, 7) * 20, a[1] + h * .35], 6), 2, { taper: "end", seed: seed + i }));
  }
  out.push({ t: "line", d: cracks.join(""), color: "sumi", opacity: .55 });
  if (bool(p, "moss", true)) {
    const dots: string[] = [];
    for (let i = 0; i < 26; i++) { const q = pts[1 + Math.floor(hash01(seed, i, 8) * 16)]; dots.push(circleD(q[0] + hashSigned(seed, i, 9) * 8, q[1] + 4 + hash01(seed, i, 10) * 8, 2 + hash01(seed, i, 11) * 2.5)); }
    out.push({ t: "dots", d: dots.join(""), color: "matsu", opacity: .85 });
  }
  return out;
}

// ---- Clouds, sun, moon ---------------------------------------------------------------------------------------------------------------

/** `band`: suyari-gasumi — long flat bands with stepped rounded ends. `billow`: a flat-printed cumulus. */
function cloud(p: P, c: MotifContext): Prim[] {
  const w = num(p, "width", 700), h = num(p, "height", 70), color = paint(p, "color", "gofun"), style = str(p, "style", "band");
  const seed = c.seed + num(p, "variant", 0) * 11, out: Prim[] = [];
  if (style === "billow") {
    const lobes = clamp(Math.round(num(p, "lobes", 6)), 2, 14), pts: Pt[] = [[w / 2, 0]];
    for (let i = lobes; i >= 0; i--) {
      const t = i / lobes, x = -w / 2 + w * t, bump = h * (.45 + .55 * Math.sin(Math.PI * t) ** .7) * (.8 + .4 * hash01(seed, i));
      pts.push([x, -bump]);
    }
    pts.push([-w / 2, 0]);
    out.push({ t: "fill", d: smoothD(pts, true, .9), outline: bool(p, "outline", true) ? 1.2 : undefined, outlineColor: "usuzumi",
      fill: { type: "linear", angle: 90, stops: [[0, color, 1], [.7, color, 1], [1, paint(p, "shade", "sora"), .8]] } });
    return out;
  }
  const steps = clamp(Math.round(num(p, "steps", 3)), 1, 5);
  const bands: string[] = [];
  for (let s = 0; s < steps; s++) {
    const bw = w * (1 - s * .22) * (1 - hash01(seed, s) * .08), bh = h / steps * 1.4, x = -w / 2 + (w - bw) * hash01(seed, s, 2), y = -h / 2 + s * h / steps * .8;
    const r = bh / 2;
    bands.push(`M${x + r} ${y}H${x + bw - r}A${r} ${r} 0 0 1 ${x + bw - r} ${y + bh}H${x + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z`);
  }
  out.push({ t: "fill", d: bands.join(""), fill: { type: "linear", angle: 0, stops: [[0, color, 0], [.1, color, .92], [.9, color, .92], [1, color, 0]] }, grain: .8, opacity: num(p, "opacity", 1),
    outline: bool(p, "outline", color === "kin") ? .9 : undefined, outlineColor: "kincha" });
  return out;
}

function sun(p: P): Prim[] {
  const r = num(p, "radius", 60), color = paint(p, "color", "shu"), out: Prim[] = [];
  if (num(p, "halo", 0) > 0) out.push({ t: "glow", cx: 0, cy: 0, r: r * (2 + 2 * num(p, "halo", 0)), color: paint(p, "haloColor", "ki"), opacity: .45 });
  out.push({ t: "fill", d: ellipseD(0, 0, r, r), fill: color });
  return out;
}
function moon(p: P): Prim[] {
  const r = num(p, "radius", 50), phase = clamp01(num(p, "phase", 1)), out: Prim[] = [];
  out.push({ t: "glow", cx: 0, cy: 0, r: r * (2.2 + 2 * num(p, "halo", .6)), color: paint(p, "haloColor", "gofun"), opacity: .5 });
  if (phase >= 1) out.push({ t: "fill", d: ellipseD(0, 0, r, r), fill: paint(p, "color", "gofun"), emboss: true });
  else {
    const k = 1 - 2 * phase;
    out.push({ t: "fill", d: `M0 ${-r}A${r} ${r} 0 1 1 0 ${r}A${Math.abs(k) * r} ${r} 0 1 ${k > 0 ? 1 : 0} 0 ${-r}Z`, fill: paint(p, "color", "gofun") });
  }
  return out;
}

// ---- Architecture ------------------------------------------------------------------------------------------------------------------

function tileRoof(x0: number, x1: number, yTop: number, yEave: number, over: number, color: UkiyoePaint, ridge = true): Prim[] {
  const pts: Pt[] = [[x0 - over, yEave], [x0 + (x1 - x0) * .1, yTop], [x1 - (x1 - x0) * .1, yTop], [x1 + over, yEave]];
  const d = polyD([...quad(pts[0], [x0 - over * .3, yEave - (yEave - yTop) * .25], pts[1], 6), pts[2], ...quad(pts[2], [x1 + over * .3, yEave - (yEave - yTop) * .25], pts[3], 6), [x1 + over, yEave + 6], [x0 - over, yEave + 6]]);
  const rows: string[] = [];
  for (let i = 1; i < 6; i++) { const t = i / 6, y = lerp(yTop, yEave, t); rows.push(`M${lerp(x0 + (x1 - x0) * .1, x0 - over, t)} ${y}H${lerp(x1 - (x1 - x0) * .1, x1 + over, t)}`); }
  const cols: string[] = [];
  for (let x = x0 - over + 8; x < x1 + over; x += 9) cols.push(`M${x} ${yEave + 6}v-6`);
  const out: Prim[] = [{ t: "fill", d, fill: { type: "linear", angle: 90, stops: [[0, color, 1], [1, "usuzumi", 1]] }, outline: 1.5, grain: .3 },
    { t: "stroke", d: rows.join("") + cols.join(""), color: "sumi", width: 1, opacity: .55 }];
  if (ridge) out.push({ t: "fill", d: rectD(x0 + (x1 - x0) * .08, yTop - 7, (x1 - x0) * .84, 8), fill: "sumi" });
  return out;
}

function house(p: P): Prim[] {
  const w = num(p, "width", 280), h = num(p, "height", 150), roof = str(p, "roof", "tile"), stories = clamp(Math.round(num(p, "stories", 1)), 1, 2);
  const wall = paint(p, "wall", "gofun"), wood = paint(p, "wood", "cha"), out: Prim[] = [];
  const x0 = -w / 2, top = -h * stories;
  if (roof === "cutaway") {
    // Fukinuki yatai: roof blown away, we look down into the room — floor, back wall, posts.
    const depth = h * .55;
    out.push({ t: "fill", d: rectD(x0, top, w, h * stories - depth), fill: wall, outline: 1.4, grain: .2 });
    const shoji: string[] = [];
    for (let x = x0 + 14; x < x0 + w - 4; x += 22) shoji.push(`M${x} ${top + 10}V${-depth - 4}`);
    for (let y = top + 22; y < -depth - 4; y += 18) shoji.push(`M${x0 + 6} ${y}H${x0 + w - 6}`);
    out.push({ t: "stroke", d: shoji.join(""), color: "usuzumi", width: 1, opacity: .7 });
    out.push({ t: "fill", d: polyD([[x0, -depth], [x0 + w, -depth], [x0 + w + depth * .35, 0], [x0 - depth * .35, 0]]), fill: paint(p, "floor", "ki"), outline: 1.4, grain: .5 });
    const mats: string[] = [];
    for (let i = 1; i < 4; i++) mats.push(`M${lerp(x0, x0 - depth * .35, i / 4)} ${-depth + depth * i / 4}H${lerp(x0 + w, x0 + w + depth * .35, i / 4)}`);
    for (let i = 1; i < 4; i++) mats.push(`M${x0 + w * i / 4} ${-depth}L${x0 + w * i / 4 + (i / 4 - .5) * depth * .7} 0`);
    out.push({ t: "stroke", d: mats.join(""), color: "kincha", width: 2, opacity: .8 });
    for (const x of [x0, x0 + w]) out.push({ t: "fill", d: rectD(x - 5, top - 10, 10, h * stories + 10 - depth), fill: wood, outline: 1.2 });
    out.push({ t: "fill", d: rectD(x0 - 8, top - 16, w + 16, 10), fill: wood, outline: 1.2 });
    return out;
  }
  out.push({ t: "fill", d: rectD(x0, top, w, h * stories), fill: wall, outline: 1.6, grain: .2 });
  // Lower storey: shoji panels and dark posts.
  const doors = clamp(Math.round(num(p, "doors", 4)), 1, 10), dw = w / doors;
  const lattice: string[] = [];
  for (let i = 0; i < doors; i++) {
    for (let k = 1; k < 3; k++) lattice.push(`M${x0 + i * dw + dw * k / 3} ${-h * .82}V0`);
    for (let y = -h * .82 + 16; y < 0; y += 16) lattice.push(`M${x0 + i * dw + 3} ${y}h${dw - 6}`);
  }
  out.push({ t: "fill", d: rectD(x0, -h * .82, w, h * .82), fill: paint(p, "panel", "gofun"), outline: 1.4 });
  out.push({ t: "stroke", d: lattice.join(""), color: wood, width: 1.2, opacity: .85 });
  for (let i = 0; i <= doors; i++) out.push({ t: "fill", d: rectD(x0 + i * dw - 3, -h * .86, 6, h * .86), fill: wood, outline: 1 });
  out.push({ t: "fill", d: rectD(x0 - 6, -h * .9, w + 12, 10), fill: wood, outline: 1.2 });
  if (typeof p.noren === "string") {
    const nw = Math.min(w * .45, 130), nx = x0 + w * .5 - nw / 2, strips = 3, sw = nw / strips;
    const nd: string[] = [];
    for (let i = 0; i < strips; i++) nd.push(rectD(nx + i * sw + 1.5, -h * .8, sw - 3, h * .42));
    out.push({ t: "fill", d: nd.join(""), fill: p.noren as string, outline: 1.2, grain: .3 });
    out.push({ t: "fill", d: ellipseD(nx + nw / 2, -h * .65, 12, 12), fill: "gofun", outline: 1 });
  }
  if (stories === 2) {
    out.push(...tileRoof(x0, x0 + w, -h * 1.02, -h * .9, 18, paint(p, "roofColor", "usuzumi"), false));
    const bars: string[] = [];
    for (let x = x0 + 10; x < x0 + w; x += 9) bars.push(`M${x} ${-h * 1.9}V${-h * 1.08}`);
    out.push({ t: "fill", d: rectD(x0 + 4, -h * 1.9, w - 8, h * .82), fill: wood, outline: 1.2 });
    out.push({ t: "stroke", d: bars.join(""), color: "kogecha", width: 2.4 });
  }
  if (roof === "thatch") {
    const d = polyD([[x0 - 26, top + 6], [x0 + w * .2, top - h * .7], [x0 + w * .8, top - h * .7], [x0 + w + 26, top + 6]]);
    out.push({ t: "fill", d, fill: { type: "linear", angle: 90, stops: [[0, "kogecha", 1], [1, "kincha", 1]] }, outline: 1.6, grain: 1 });
    const straw: string[] = [];
    for (let i = 0; i < 40; i++) { const x = x0 - 20 + (w + 40) * i / 40; straw.push(`M${x} ${top + 4}l${(i / 40 - .5) * 10} -${h * .3}`); }
    out.push({ t: "stroke", d: straw.join(""), color: "kogecha", width: 1, opacity: .5 });
  } else out.push(...tileRoof(x0, x0 + w, top - h * .42, top + 4, 24, paint(p, "roofColor", "usuzumi")));
  return out;
}

function pagoda(p: P): Prim[] {
  const tiers = clamp(Math.round(num(p, "tiers", 5)), 2, 9), w = num(p, "width", 200), h = num(p, "height", 560);
  const wood = paint(p, "wood", "shu"), roofC = paint(p, "roofColor", "usuzumi"), out: Prim[] = [];
  const th = h * .8 / tiers;
  for (let i = 0; i < tiers; i++) {
    const s = 1 - i * .09, bw = w * s * .62, y = -i * th;
    out.push({ t: "fill", d: rectD(-bw / 2, y - th * .62, bw, th * .62), fill: wood, outline: 1.3 });
    const rail: string[] = [];
    for (let x = -bw / 2 + 6; x < bw / 2; x += 8) rail.push(`M${x} ${y - th * .62}v${th * .22}`);
    out.push({ t: "stroke", d: rail.join(""), color: "sumi", width: 1, opacity: .7 });
    const rw = w * s / 2, ry = y - th * .62;
    out.push({ t: "fill", d: smoothD([[-rw - 14, ry - th * .12], [-rw * .5, ry - th * .02], [-rw * .2, ry - th * .32], [rw * .2, ry - th * .32], [rw * .5, ry - th * .02], [rw + 14, ry - th * .12], [rw * .9, ry + 4], [-rw * .9, ry + 4]], true, .25),
      fill: { type: "linear", angle: 90, stops: [[0, roofC, 1], [1, "sumi", 1]] }, outline: 1.5 });
  }
  const topY = -tiers * th - th * .25;
  out.push({ t: "fill", d: rectD(-3, topY - h * .2, 6, h * .2), fill: "kincha", outline: 1 });
  const rings: string[] = [];
  for (let i = 0; i < 9; i++) rings.push(ellipseD(0, topY - h * .02 - i * h * .018, 9 - i * .4, 2.4));
  out.push({ t: "fill", d: rings.join(""), fill: "kincha", outline: .8 });
  return out;
}

function torii(p: P): Prim[] {
  const w = num(p, "width", 280), h = num(p, "height", 300), color = paint(p, "color", "shu"), out: Prim[] = [];
  for (const s of [-1, 1]) out.push({ t: "fill", d: polyD([[s * w * .3 - 9, 0], [s * w * .3 + 9, 0], [s * w * .28 + 7, -h * .86], [s * w * .28 - 7, -h * .86]]), fill: color, outline: 1.6 });
  out.push({ t: "fill", d: rectD(-w * .38, -h * .7, w * .76, 13), fill: color, outline: 1.4 });
  out.push({ t: "fill", d: rectD(-8, -h * .86, 16, h * .16), fill: color, outline: 1.2 });
  const beam: Pt[] = [[-w / 2 - 8, -h * .98], ...quad([-w / 2 - 8, -h * .98], [0, -h * .86], [w / 2 + 8, -h * .98], 12).slice(1), [w / 2 - 6, -h * .87], [-w / 2 + 6, -h * .87]];
  out.push({ t: "fill", d: smoothD(beam, true, .2), fill: color, outline: 1.6 });
  out.push({ t: "fill", d: polyD([...quad([-w / 2 - 10, -h * 1.02], [0, -h * .9], [w / 2 + 10, -h * 1.02], 12), [w / 2 + 6, -h * .97], ...quad([w / 2 + 6, -h * .97], [0, -h * .86], [-w / 2 - 6, -h * .97], 12).slice(1)]), fill: "sumi" });
  return out;
}

/** Arched (taiko) bridge or a long low trestle bridge. Origin: the middle of the deck at water level. */
function bridge(p: P): Prim[] {
  const span0 = num(p, "span", 760), rise = num(p, "rise", 120), kind = str(p, "kind", "arch"), depth = num(p, "depth", 90);
  const deckC = paint(p, "deck", "cha"), railC = paint(p, "rail", kind === "arch" ? "shu" : "cha"), out: Prim[] = [];
  const deck = (x: number) => -rise * (1 - (2 * x / span0) ** 2) - (kind === "arch" ? 30 : 60);
  const pts: Pt[] = [], under: Pt[] = [];
  for (let i = 0; i <= 40; i++) { const x = -span0 / 2 + span0 * i / 40; pts.push([x, deck(x)]); under.push([x, deck(x) + 16]); }
  // Piers.
  const piers = clamp(Math.round(num(p, "piers", kind === "arch" ? 5 : 9)), 2, 30), legs: string[] = [], braces: string[] = [];
  for (let i = 0; i <= piers; i++) {
    const x = -span0 / 2 + span0 * i / piers, y = deck(x) + 14;
    legs.push(rectD(x - 7, y, 14, depth - y));
    if (i < piers && kind !== "arch") { const x2 = -span0 / 2 + span0 * (i + 1) / piers; braces.push(`M${x} ${y + 10}L${x2} ${depth - 20}M${x2} ${deck(x2) + 24}L${x} ${depth - 20}`); }
  }
  out.push({ t: "fill", d: legs.join(""), fill: "kogecha", outline: 1.4, grain: .5 });
  if (braces.length) out.push({ t: "stroke", d: braces.join(""), color: "kogecha", width: 6 });
  out.push({ t: "fill", d: polyD([...pts, ...under.reverse()]), fill: deckC, outline: 1.8, grain: .7 });
  // Railing: top rail, posts and a lower rail.
  const rail = pts.map(q => [q[0], q[1] - 34] as Pt), mid = pts.map(q => [q[0], q[1] - 16] as Pt);
  out.push({ t: "line", d: carvedLine(rail, 6, { taper: "none" }), color: railC });
  out.push({ t: "line", d: carvedLine(mid, 3.5, { taper: "none" }), color: railC });
  const posts: string[] = [];
  for (let i = 0; i <= 20; i++) { const q = pts[i * 2]; posts.push(rectD(q[0] - 2.5, q[1] - 36, 5, 36)); }
  out.push({ t: "fill", d: posts.join(""), fill: railC, outline: .8 });
  if (kind === "arch") for (const q of [rail[0], rail[rail.length - 1]]) out.push({ t: "fill", d: ellipseD(q[0], q[1] - 6, 7, 9), fill: "kincha", outline: 1 });
  return out;
}

/** Boats face right. `ferry` (open, low), `sampan` (with a mat awning) or `yakata` (pleasure boat with a cabin). */
function boat(p: P, c: MotifContext): Prim[] {
  const len = num(p, "length", 380), kind = str(p, "kind", "ferry"), hull = paint(p, "hull", "cha"), out: Prim[] = [];
  const L = len / 2, deck = -18;
  const hullPts: Pt[] = [[-L, deck - 6], [-L * .6, deck], [L * .55, deck], [L * .92, deck - 16], [L, deck - 28], [L * .82, 12], [-L * .7, 14], [-L * .96, 6]];
  const hullD = smoothD(hullPts, true, .25);
  out.push({ t: "fill", d: hullD, fill: { type: "linear", angle: 90, stops: [[0, hull, 1], [1, "kogecha", 1]] }, outline: 2, grain: .9 });
  out.push({ t: "line", d: carvedLine(quad([-L, deck - 4], [0, deck + 4], [L, deck - 26], 16), 4, { taper: "none" }), color: "kogecha" });
  const planks: string[] = [];
  for (let i = 1; i < 3; i++) planks.push(smoothD([[-L * .9, deck + i * 9], [0, deck + i * 10], [L * .78, deck + i * 6 - 8]], false));
  out.push({ t: "stroke", d: planks.join(""), color: "sumi", width: 1, opacity: .55 });
  if (kind === "sampan") {
    out.push({ t: "fill", d: smoothD([[-L * .45, deck], [-L * .4, deck - 46], [0, deck - 58], [L * .12, deck - 46], [L * .15, deck]], true, .4), fill: "kincha", outline: 1.5, grain: 1 });
    const mats: string[] = [];
    for (let x = -L * .4; x < L * .12; x += 9) mats.push(`M${x} ${deck - 50 + Math.abs(x + L * .1) * .06}V${deck}`);
    out.push({ t: "stroke", d: mats.join(""), color: "cha", width: 1, opacity: .6 });
  }
  if (kind === "yakata") {
    out.push({ t: "fill", d: rectD(-L * .55, deck - 70, L * .95, 70), fill: "gofun", outline: 1.4 });
    const lat: string[] = [];
    for (let x = -L * .55 + 12; x < L * .4; x += 14) lat.push(`M${x} ${deck - 70}V${deck}`);
    out.push({ t: "stroke", d: lat.join(""), color: hull, width: 1.2 });
    out.push(...tileRoof(-L * .55, L * .4, deck - 96, deck - 70, 16, paint(p, "roofColor", "kogecha"), false));
    if (bool(p, "lanterns", true)) for (let i = 0; i < 4; i++) {
      const x = -L * .48 + i * L * .27;
      out.push({ t: "glow", cx: x, cy: deck - 60, r: 34, color: "ki", opacity: .55 });
      out.push({ t: "fill", d: ellipseD(x, deck - 60, 9, 12), fill: "shu", outline: 1 });
    }
  }
  // A square sail on a single mast, bellying toward the bow with the wind and luffing gently.
  if (bool(p, "sail", false)) {
    const mx = -L * .08, top = deck - len * .62, yard = len * .2, belly = len * (.1 + .05 * clamp(Math.abs(c.wind), 0, 1.5)) + Math.sin(c.frame / 13) * len * .012;
    out.push({ t: "line", d: carvedLine([[mx, deck + 2], [mx, top - 10]], 7, { taper: "none" }), color: "kogecha" });
    const sailPts: Pt[] = [[mx - yard, top], [mx + yard, top], ...quad([mx + yard, top], [mx + yard + belly, lerp(top, deck - 34, .5)], [mx + yard * .9, deck - 34], 8).slice(1),
      ...quad([mx + yard * .9, deck - 34], [mx + belly * .6, deck - 26], [mx - yard * .9, deck - 34], 8).slice(1), ...quad([mx - yard * .9, deck - 34], [mx - yard + belly * .7, lerp(top, deck - 34, .5)], [mx - yard, top], 8).slice(1)];
    out.push({ t: "fill", d: polyD(sailPts), fill: { type: "linear", angle: 0, stops: [[0, "usuzumi", .5], [.3, paint(p, "sailColor", "gofun"), 1], [1, paint(p, "sailColor", "gofun"), 1]] }, outline: 1.6, grain: .5 });
    const seams: string[] = [];
    for (let i = 1; i < 4; i++) { const u = i / 4, x0 = lerp(mx - yard, mx + yard, u); seams.push(`M${x0.toFixed(1)} ${top.toFixed(1)}Q${(x0 + belly * .8).toFixed(1)} ${lerp(top, deck - 34, .5).toFixed(1)} ${lerp(mx - yard * .9, mx + yard * .9, u).toFixed(1)} ${(deck - 32).toFixed(1)}`); }
    out.push({ t: "stroke", d: seams.join(""), color: "usuzumi", width: 1, opacity: .7 });
    out.push({ t: "line", d: carvedLine([[mx - yard - 8, top], [mx + yard + 8, top]], 5, { taper: "none" }), color: "kogecha" });
    out.push({ t: "stroke", d: `M${mx + yard * .9} ${deck - 34}L${L * .7} ${deck - 14}M${mx - yard * .9} ${deck - 34}L${-L * .78} ${deck - 6}`, color: "kogecha", width: 1.1, opacity: .8 });
  }
  // Waterline: the keel sits in the water (a band of water inside the hull's outline, light ripples along it). Under
  // way (`wake` 0..1 × the node's progress) the bow throws up a small curled wave and foam streaks trail astern.
  if (bool(p, "waterline", true)) {
    const waterC = paint(p, "water", "bero"), wl = 7, t = c.frame, band: Pt[] = [];
    for (let i = 0; i <= 24; i++) { const x = lerp(-L * 1.05, L * 1.05, i / 24); band.push([x, wl + Math.sin(x / 30 + t / 8) * 1.8]); }
    out.push({ t: "clip", d: hullD, key: "boat-water", prims: [{ t: "fill", d: polyD([...band, [L * 1.05, 30], [-L * 1.05, 30]]), fill: waterC, opacity: .86, noPrint: true }] });
    out.push({ t: "stroke", d: smoothD(band.slice(1, -1), false, .5), color: "sora", width: 1.6, opacity: .9 });
    const wake = clamp01(num(p, "wake", 0) * c.progress);
    if (wake > .02) {
      const foam: string[] = [], streaks: string[] = [];
      for (const [k, sz] of [[0, 1], [1, .7], [2, .5]] as const) {
        const base: Pt = [L * (.86 - k * .07), wl + 2], size = (18 + 16 * wake) * sz * (1 + .15 * Math.sin(t / 5 + k)), pts: Pt[] = [base];
        let a = -62 - k * 8, at = base;
        for (let j = 0; j < 9; j++) { at = polar(at, a, size / 9 * (1.25 - .7 * j / 8)); pts.push(at); a -= 4 + 20 * (j / 8) ** 1.5; }
        foam.push(carvedLine(pts, size * .26, { taper: "end", minRatio: .05, smooth: true }));
      }
      out.push({ t: "fill", d: foam.join(""), fill: "gofun", outline: 1, outlineColor: waterC });
      for (let k = 0; k < 4; k++) {
        const y0 = wl + 3 + k * 4, x0 = -L * (.9 - k * .05), lenS = (90 + 150 * wake) * (1 - k * .15), pts: Pt[] = [];
        for (let j = 0; j <= 8; j++) { const u = j / 8; pts.push([x0 - lenS * u, y0 + u * (6 + k * 5) + Math.sin(u * 7 - t / 4 + k) * 2.2 * (1 - u)]); }
        streaks.push(carvedLine(pts, 3.2 - k * .4, { taper: "end", minRatio: .1 }));
      }
      out.push({ t: "fill", d: streaks.join(""), fill: "gofun", opacity: .55 + .35 * wake, noPrint: true });
    }
  }
  return out;
}

function lantern(p: P, c: MotifContext): Prim[] {
  const kind = str(p, "kind", "chochin"), color = paint(p, "color", "shu"), lit = bool(p, "lit", true), s = num(p, "size", 1), out: Prim[] = [];
  const flicker = lit ? (.85 + .15 * Math.abs(noise1(c.seed, c.frame / 3))) * clamp01(c.progress) : 0;
  if (kind === "stone") {
    out.push({ t: "fill", d: polyD([[-18 * s, 0], [18 * s, 0], [12 * s, -12 * s], [-12 * s, -12 * s]]), fill: "usuzumi", outline: 1.4, grain: 1 });
    out.push({ t: "fill", d: rectD(-6 * s, -70 * s, 12 * s, 58 * s), fill: "usuzumi", outline: 1.4, grain: 1 });
    if (flicker > .02) out.push({ t: "glow", cx: 0, cy: -88 * s, r: 60 * s, color: "ki", opacity: .5 * flicker });
    out.push({ t: "fill", d: rectD(-16 * s, -102 * s, 32 * s, 30 * s), fill: "usuzumi", outline: 1.4 });
    out.push({ t: "fill", d: rectD(-8 * s, -96 * s, 16 * s, 16 * s), fill: "sumi" });
    if (flicker > .02) out.push({ t: "fill", d: rectD(-8 * s, -96 * s, 16 * s, 16 * s), fill: "ki", opacity: flicker, noPrint: true });
    out.push({ t: "fill", d: polyD([[-30 * s, -100 * s], [30 * s, -100 * s], [6 * s, -122 * s], [-6 * s, -122 * s]]), fill: "usuzumi", outline: 1.4, grain: 1 });
    return out;
  }
  const rx = 20 * s, ry = 28 * s, cy = -ry - 8 * s;
  if (flicker > .02) out.push({ t: "glow", cx: 0, cy, r: 90 * s, color: "ki", opacity: .55 * flicker });
  out.push({ t: "fill", d: ellipseD(0, cy, rx, ry), fill: color, outline: 1.3 });
  if (flicker > .02) out.push({ t: "fill", d: ellipseD(0, cy, rx * .8, ry * .85), fill: { type: "radial", center: [.5, .5], radius: .6, stops: [[0, "ki", 1], [1, "ki", 0]] }, opacity: flicker, noPrint: true });
  const ribs: string[] = [];
  for (let i = 1; i < 6; i++) { const y = cy - ry + 2 * ry * i / 6, hw = rx * Math.sqrt(1 - ((y - cy) / ry) ** 2); ribs.push(`M${-hw} ${y}H${hw}`); }
  out.push({ t: "stroke", d: ribs.join(""), color: "sumi", width: .8, opacity: .5 });
  out.push({ t: "fill", d: rectD(-rx * .6, cy - ry - 5 * s, rx * 1.2, 6 * s) + rectD(-rx * .6, cy + ry - 1, rx * 1.2, 6 * s), fill: "sumi" });
  return out;
}

/** A plank landing stage on posts, origin at the shore end of the deck. Extends toward +x. */
function pier(p: P): Prim[] {
  const len = num(p, "length", 420), h = num(p, "height", 26), depth = num(p, "depth", 80), wood = paint(p, "wood", "cha"), out: Prim[] = [];
  const posts: string[] = [];
  for (let x = 20; x < len; x += 90) posts.push(rectD(x - 7, -4, 14, depth + 4));
  out.push({ t: "fill", d: posts.join(""), fill: "kogecha", outline: 1.3, grain: .6 });
  out.push({ t: "fill", d: rectD(0, -h, len, h), fill: { type: "linear", angle: 90, stops: [[0, "kincha", 1], [1, wood, 1]] }, outline: 1.6, grain: 1 });
  const planks: string[] = [];
  for (let x = 30; x < len; x += 30) planks.push(`M${x} ${-h}v${h}`);
  out.push({ t: "stroke", d: planks.join(""), color: "kogecha", width: 1, opacity: .6 });
  return out;
}

/**
 * The folktale peach (momo): a blushing, downy fruit with a crease and two leaves. With `openAt` (frame) it splits
 * along the crease, the halves tip apart and warm light pours out — whatever is born from it is its own node.
 */
function peach(p: P, c: MotifContext): Prim[] {
  const r = num(p, "size", 120), seed = c.seed;
  const openAt = typeof p.openAt === "number" ? p.openAt as number : undefined, dur = num(p, "openDuration", 30);
  const open = openAt === undefined ? 0 : ease("out", span(c.frame, openAt, openAt + dur));
  const half = (side: -1 | 1): Pt[] => {
    const pts: Pt[] = [];
    for (let i = 0; i <= 16; i++) {
      const t = i / 16, a = -90 + side * 180 * t;
      const bulge = 1 + .08 * Math.sin(t * Math.PI);
      pts.push([Math.cos(a * DEG) * r * bulge * (side > 0 ? 1 : 1) , Math.sin(a * DEG) * r * (t < .1 ? .92 : 1) + (t > .85 ? r * .08 * (t - .85) / .15 : 0)]);
    }
    pts[0] = [side * r * .04, -r * .86];
    return pts;
  };
  const out: Prim[] = [];
  if (open > 0) out.push({ t: "glow", cx: 0, cy: -r * .1, r: r * (1.6 + 1.6 * open), color: "ki", opacity: .7 * open });
  for (const side of [-1, 1] as const) {
    const pts = half(side), d = smoothD([[0, -r * .86], ...pts.slice(1), [0, r * 1.02]], true, .45);
    const tilt = side * 34 * open, shift = side * r * .35 * open;
    const prims: Prim[] = [{ t: "fill", d, fill: { type: "radial", center: [side > 0 ? .35 : .65, .35], radius: .8, stops: [[0, "sakura", 1], [.55, "beni", .85], [1, "shu", .9]] }, outline: 1.6, grain: .2 }];
    if (open > .05) prims.push({ t: "fill", d: smoothD([[0, -r * .8], [side * r * .25, -r * .1], [0, r * .95]], true, .5), fill: "ki", opacity: open });
    const fuzz: string[] = [];
    for (let i = 0; i < 40; i++) fuzz.push(circleD(side * r * hash01(seed, i, side + 2) * .8, r * hashSigned(seed, i, side + 5) * .8, .9));
    prims.push({ t: "dots", d: fuzz.join(""), color: "gofun", opacity: .45 });
    out.push({ t: "group", transform: `translate(${shift.toFixed(1)} ${(r * .1 * open).toFixed(1)}) rotate(${tilt.toFixed(1)} 0 ${r})`, prims });
  }
  if (open < .3) out.push({ t: "line", d: carvedLine(quad([0, -r * .86], [r * .14, -r * .1], [r * .02, r * .95], 10), 2.2, { taper: "both" }), color: "beni", opacity: .8 * (1 - open * 3) });
  // Stem and leaves (they ride on the right half as it opens).
  const leafStart = out.length;
  const stem: Pt = [-r * .02, -r * .88];
  out.push({ t: "line", d: carvedLine([stem, [-r * .05, -r * 1.05]], r * .06, { taper: "none" }), color: "kogecha" });
  for (const [a, l] of [[-150, .62], [-40, .5]] as const) {
    const sway = Math.sin(c.frame / 25 + a) * 4 + c.wind * 8;
    const tip = polar([-r * .05, -r * 1.02], a + sway, r * l);
    const mid1 = polar([-r * .05, -r * 1.02], a + sway - 18, r * l * .55), mid2 = polar([-r * .05, -r * 1.02], a + sway + 18, r * l * .55);
    out.push({ t: "fill", d: smoothD([[-r * .05, -r * 1.02], mid1, tip, mid2], true, .5), fill: { type: "linear", angle: 0, stops: [[0, "matsu", 1], [1, "kusa", 1]] }, outline: 1.2 });
    out.push({ t: "line", d: carvedLine([[-r * .05, -r * 1.02], tip], 1.2, { taper: "end" }), color: "matsu", opacity: .8 });
  }
  if (open > 0) { const leaves = out.splice(leafStart); out.push({ t: "group", transform: `translate(${(r * .35 * open).toFixed(1)} ${(r * .1 * open).toFixed(1)}) rotate(${(34 * open).toFixed(1)} 0 ${r})`, prims: leaves }); }
  return out;
}

/**
 * Rice paddies: terraced bands divided by raised paths (aze). `crop`: `flooded` (water mirroring the sky),
 * `young` (rows of green shoots in water) or `ripe` (heavy golden heads). Wind sends a wave rolling across the crop.
 * Origin top-left.
 */
function ricefield(p: P, c: MotifContext): Prim[] {
  const w = num(p, "width", 1920), h = num(p, "height", 360), bands = clamp(Math.round(num(p, "terraces", 4)), 1, 12), crop = str(p, "crop", "young");
  const seed = c.seed + num(p, "variant", 0) * 13, water = paint(p, "water", "sora"), out: Prim[] = [];
  const edges: Pt[][] = [];
  for (let b = 0; b <= bands; b++) {
    const y0 = h * (b / bands) ** 1.25, pts: Pt[] = [];
    for (let i = 0; i <= 24; i++) { const x = w * i / 24; pts.push([x, y0 + (b && b < bands ? fbm1(seed + b * 7, x / (w * .3), 2) * h / bands * .35 : 0)]); }
    edges.push(pts);
  }
  for (let b = 0; b < bands; b++) {
    const top = edges[b], bot = edges[b + 1], d = smoothD([...top, ...bot.slice().reverse()], true, .3), depth = (b + 1) / bands;
    if (crop === "ripe") out.push({ t: "fill", d, grain: .7, fill: { type: "linear", angle: 90, stops: [[0, "kincha", 1], [1, "ki", 1]] } });
    else out.push({ t: "fill", d, grain: .8, fill: { type: "linear", angle: 90, stops: [[0, water, .9], [1, crop === "flooded" ? "gofun" : "kusa", crop === "flooded" ? .7 : .55]] } });
    // Plants in rows, scaled by depth; a wind wave travels across them.
    if (crop !== "flooded") {
      const rows = 2 + Math.round(depth * 4), strokes: string[] = [], heads: string[] = [];
      for (let r = 0; r < rows; r++) {
        const u = (r + .5) / rows, gap = 14 + 26 * depth;
        for (let x = gap * hash01(seed, b, r); x < w; x += gap) {
          const i = Math.min(23, Math.floor(x / w * 24)), y = lerp(top[i][1], bot[i][1], u) + 2;
          const tall = (crop === "ripe" ? 16 : 9) * (.5 + depth * 1.1);
          const lean = c.wind * .5 + Math.sin(c.frame / 12 - x / 160 + b) * (.12 + .25 * Math.abs(c.wind)) * (crop === "ripe" ? 1.4 : 1);
          for (const k of [-1, 0, 1]) {
            const bx = x + k * tall * .18, tip: Pt = [bx + Math.sin(lean + k * .25) * tall, y - Math.cos(lean + k * .25) * tall];
            strokes.push(`M${bx.toFixed(1)} ${y.toFixed(1)}Q${(bx + Math.sin(lean) * tall * .3).toFixed(1)} ${(y - tall * .6).toFixed(1)} ${tip[0].toFixed(1)} ${tip[1].toFixed(1)}`);
            if (crop === "ripe" && k === 0) heads.push(`M${tip[0].toFixed(1)} ${tip[1].toFixed(1)}q${(tall * .35).toFixed(1)} ${(tall * .05).toFixed(1)} ${(tall * .45).toFixed(1)} ${(tall * .5).toFixed(1)}`);
          }
        }
      }
      out.push({ t: "stroke", d: strokes.join(""), color: crop === "ripe" ? "kincha" : "kusa", width: 1.2 + depth, opacity: .9 });
      if (heads.length) out.push({ t: "stroke", d: heads.join(""), color: "tan", width: 2 + depth * 2, opacity: .9 });
    } else {
      const glints: string[] = [];
      for (let i = 0; i < 6; i++) { const x = w * hash01(seed, b, i), y = lerp(top[0][1], bot[0][1], .3 + .5 * hash01(seed, b, i + 9)); glints.push(`M${x.toFixed(1)} ${y.toFixed(1)}h${(30 + 60 * depth).toFixed(1)}`); }
      out.push({ t: "stroke", d: glints.join(""), color: "gofun", width: 1.4, opacity: .7 });
    }
    // The raised path along the lower edge.
    out.push({ t: "line", d: carvedLine(bot, 4 + 6 * depth, { taper: "none", seed: seed + b }), color: "kincha" });
    out.push({ t: "line", d: carvedLine(bot.map(q => [q[0], q[1] + 2 + 3 * depth] as Pt), 1.4, { taper: "none" }), color: "kogecha", opacity: .7 });
  }
  return out;
}

/** Terraced rice paddies or a flat field with planted rows, origin top-left. */
function field(p: P): Prim[] {
  const w = num(p, "width", 1920), h = num(p, "height", 300), rows = clamp(Math.round(num(p, "rows", 7)), 1, 30);
  const color = paint(p, "color", "kusa"), water = paint(p, "water", "sora"), out: Prim[] = [];
  out.push({ t: "fill", d: rectD(0, 0, w, h), fill: { type: "linear", angle: 90, stops: [[0, water, .8], [1, color, .9]] }, grain: .6 });
  const lines: string[] = [], dots: string[] = [];
  for (let r = 1; r <= rows; r++) {
    const y = h * (r / rows) ** 1.4;
    lines.push(`M0 ${y}H${w}`);
    const gap = 14 + 22 * r / rows;
    for (let x = gap / 2; x < w; x += gap) dots.push(`M${x} ${y - 4 - r}v${3 + r * .8}`);
  }
  out.push({ t: "stroke", d: lines.join(""), color: "kogecha", width: 1.6, opacity: .7 });
  out.push({ t: "stroke", d: dots.join(""), color: "matsu", width: 1.4, opacity: .7 });
  return out;
}

export type UkiyoeMotifName =
  | "sky" | "mountain" | "hills" | "sea" | "wave" | "pine" | "sakura" | "willow" | "reeds" | "rock" | "cloud" | "sun" | "moon"
  | "house" | "pagoda" | "torii" | "bridge" | "boat" | "lantern" | "field" | "pier" | "peach" | "ricefield"
  | "range" | "minka" | "jizo" | "komainu" | "castle" | "shop" | "kura" | "yashiki" | "firetower"
  | "room" | "andon" | "irori" | "futon" | "loom" | "byobu" | "well" | "stump" | "usu" | "tarai" | "fire" | "halo" | "kumo" | "mato"
  | "belfry" | "hondo" | "gate" | "hokora" | "graves" | "toro" | "hut" | "bamboo" | "kaki" | "shinboku" | "jinmenju"
  | "gissha" | "sudare" | "kicho" | "shinden" | "ikou";
export const UKIYOE_MOTIFS: readonly UkiyoeMotifName[] = [
  "sky", "mountain", "hills", "sea", "wave", "pine", "sakura", "willow", "reeds", "rock", "cloud", "sun", "moon",
  "house", "pagoda", "torii", "bridge", "boat", "lantern", "field", "pier", "peach", "ricefield",
  "range", "minka", "jizo", "komainu", "castle", "shop", "kura", "yashiki", "firetower",
  "room", "andon", "irori", "futon", "loom", "byobu", "well", "stump", "usu", "tarai", "fire", "halo", "kumo", "mato", "belfry", "hondo", "gate", "hokora", "graves", "toro", "hut", "bamboo", "kaki", "shinboku", "jinmenju", "gissha", "sudare", "kicho", "shinden", "ikou",
];
/** Motifs whose drawing depends on the frame or wind (others are drawn once and cached). */
export const ANIMATED_MOTIFS: ReadonlySet<UkiyoeMotifName> = new Set(["sea", "wave", "pine", "sakura", "willow", "reeds", "lantern", "peach", "ricefield", "boat", "range", "minka", ...ANIMATED_TOWN, ...ANIMATED_INTERIOR, ...ANIMATED_FOLK, ...ANIMATED_EFFECTS, ...ANIMATED_KAMI, ...ANIMATED_TEMPLE, ...ANIMATED_TREES, ...ANIMATED_HEIAN, ...ANIMATED_TSUKUMO] as UkiyoeMotifName[]);

const MOTIFS: Readonly<Record<UkiyoeMotifName, (p: P, c: MotifContext) => Prim[]>> = {
  sky, mountain, hills, sea, wave, pine, sakura, willow, reeds, rock, cloud, sun, moon, house, pagoda, torii, bridge, boat, lantern, field, pier, peach, ricefield,
  ...SCENERY_MOTIFS,
  ...CASTLE_MOTIFS,
  ...TOWN_MOTIFS,
  ...INTERIOR_MOTIFS,
  ...FOLK_MOTIFS,
  ...EFFECT_MOTIFS,
  ...KAMI_MOTIFS,
  ...BUSHI_MOTIFS,
  ...TEMPLE_MOTIFS,
  ...TREE_MOTIFS,
  ...HEIAN_MOTIFS,
  ...TSUKUMO_MOTIFS,
};

export function drawMotif(name: UkiyoeMotifName, params: P, context: MotifContext): Prim[] {
  return MOTIFS[name](params, context);
}

