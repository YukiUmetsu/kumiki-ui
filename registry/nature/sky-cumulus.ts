/**
 * SKY1 cumulus in detail: a heaped cloud as lumps on lumps on lumps, each lit by how deep it lies inside the cloud
 * toward the sun, so it can be painted the way cumulus look in photographs and time-lapses:
 * - a flat base at the condensation level;
 * - large rounded masses whose faces are covered in smaller lumps, and smaller lumps again along the silhouette
 *   (the cauliflower);
 * - sunlit crowns near white, falling through blue-grey half-tones to deep blue-grey shadow;
 * - crevices where a lower lump's bright crown stands in front of the shaded underside of the one above;
 * - lower flanks thinning where the cloud evaporates.
 *
 * Sources:
 * - Cloud perimeters are fractal with a dimension of about 1.35 from 1 to 1000 km (Lovejoy 1982, Science 216), so
 *   the outline keeps detail at every scale; `outlineDimension` measures it.
 * - The base sits at the lifting condensation level, about 125 m per °C of dew-point depression (Espy's
 *   approximation; Wikipedia, Lifted condensation level).
 * - Updrafts: fair-weather cumulus rise at under about 1 m/s (Penn State Meteo 3); in cumulus 0.7–4 km deep the
 *   median peak updraft was 4.9 m/s (ACP 16, 10159, 2016). The turret life is estimated.
 * - Light: clouds scatter all colours alike (white); thick parts transmit less, so shadowed parts and bases are grey,
 *   and shadows take the blue of the sky.
 * - The shading ladders were measured from the 5th to 95th luminance percentiles of cloud pixels in CC0 and
 *   public-domain photographs: cumulus mediocris (J. Naukkarinen, public domain) for fair cumulus, and cumulus
 *   congestus over Gåseberg (W. Carter, CC0) for towering cumulus.
 */
import type { FPoint } from "../anatomy/foundation-shapes";
import { seeded } from "../anatomy/foundation-shapes";

export interface Lump {
  c: FPoint; r: number;
  /** Light 0 (deep inside, away from the sun) to 1 (a sunlit crown). */
  light: number;
  /** 0 mass, 1 face lump, 2 cauliflower, 3 finest bumps. */
  level: 0 | 1 | 2 | 3;
  /** Lies on the silhouette (catches a silver lining when backlit), and the outward direction there (radians). */
  rim?: boolean; out?: number;
  /** Backlit glow on the silhouette, 0–1. */
  glow?: number;
  /** Opacity where the cloud is evaporating (1 solid). */
  opacity: number;
}
export interface CumulusModel {
  /** Back to front: paint in this order. */
  lumps: Lump[];
  width: number; height: number;
  /** The masses whose union is the cloud's body (for outlines and clipping). */
  masses: { c: FPoint; r: number }[];
}
export interface CumulusOptions {
  width?: number; seed?: number;
  /** Height ÷ width. */
  aspect?: number;
  /** "fair" (humilis, mediocris) or "towering" (congestus and cumulonimbus): thicker, darker shadows. */
  kind?: "fair" | "towering";
  /** The sun's side (−1 left, +1 right) and elevation in degrees. */
  sun?: -1 | 1; sunElevation?: number;
  /**
   * The sun's azimuth from the viewer's back, degrees: 0 behind the viewer (the face fully lit), 90 to the side, 180
   * behind the cloud (dark body, bright silver-lining rim). Default 60.
   */
  sunAzimuth?: number;
  /** Lean of the upper cloud downwind, as a share of the width over the full height (wind shear; estimated). */
  lean?: number;
  /** Seconds of growth: turrets rise, swell, then soften and fade (deterministic for a seed). */
  time?: number;
  /** The cloud's real width in metres (for the turrets' rise speed). */
  metres?: number;
  /** "full" (four levels), "medium" (masses, face and rim lumps, one cauliflower level) or "low" (far away). */
  detail?: "full" | "medium" | "low";
}

/**
 * Measured shading ladders, darkest to brightest: first the body of a backlit cumulus with no direct light (the
 * silver-lining photograph, Geelong, public domain), then the P10 to P95 luminance percentiles of cloud pixels, and a
 * highlight for the sunlit crown (estimated).
 */
export const CUMULUS_LADDERS = {
  fair: ["#344651", "#7892aa", "#88a0b5", "#92afcb", "#b7c2cd", "#dddde0", "#f5f5f3"],
  towering: ["#2f404a", "#3c5f7e", "#55718c", "#7690aa", "#9fb2c4", "#e2e5e6", "#f7f6f2"],
} as const;
/** Updraft speeds, m/s: fair-weather cumulus under about 1; cumulus 0.7–4 km deep, median peak 4.9 (reported). */
export const UPDRAFT = { fair: .8, towering: 4.9 } as const;
/** A turret's life from first bulge to fading, s (estimated from time-lapse; minutes). */
export const TURRET_LIFE = 480;

const smooth = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

/** A heaped cumulus as lumps with light, deterministic for a seed (and a time). */
export function cumulusModel(o: CumulusOptions = {}): CumulusModel {
  const w = o.width ?? 1, aspect = o.aspect ?? .7, h = w * aspect, rnd = seeded((o.seed ?? 1) * 9973 + 17), kind = o.kind ?? (aspect > 1 ? "towering" : "fair");
  const sunSide = o.sun ?? -1, elev = (o.sunElevation ?? 40) * Math.PI / 180, s: FPoint = [sunSide * Math.cos(elev), Math.sin(elev)];
  const lean = (o.lean ?? 0) * w, n = 2.4, time = o.time ?? 0;
  const halfAt = (y: number) => w / 2 * Math.max(0, 1 - Math.min(1, Math.max(0, y) / h) ** n) ** (1 / n) * (.82 + .18 * smooth(0, .25 * h, y));
  const xAt = (y: number) => lean * (Math.max(0, y) / h) ** 1.5;
  // Masses (level 0) as a tree of rising thermals: a row of bubbles on the base, each spawning one or two smaller
  // bubbles above it, leaning a little, until its column reaches its own height. Columns of different heights leave
  // the notches between towers that give a cumulus its outline.
  const masses: { c: FPoint; r: number }[] = [];
  const R0 = w * (aspect > 1 ? .15 : .17), baseCount = Math.max(2, Math.round(w / (R0 * 1.7)));
  const frontier: { c: FPoint; r: number; top: number }[] = [];
  for (let i = 0; i < baseCount; i++) {
    const u = baseCount === 1 ? 0 : i / (baseCount - 1) * 2 - 1, r = R0 * (.85 + rnd() * .35);
    // Fair cumulus columns stop at uneven heights; a towering cloud's central columns reach the top.
    const col = aspect > 1.2 ? h * (.6 + .4 * (1 - Math.abs(u)) ** .5) * (.9 + rnd() * .15) : h * (.45 + .55 * (1 - Math.abs(u)) ** .8) * (.75 + rnd() * .35);
    const m = { c: [u * (w / 2 - r * .8) + (rnd() - .5) * r * .3, r * .55] as FPoint, r, top: Math.min(h, col) };
    masses.push(m); frontier.push(m);
  }
  // Bridge the base bubbles so the base stays flat (no notches at the bottom).
  for (let i = 0; i < baseCount - 1; i++) {
    const a = masses[i], b = masses[i + 1], r = Math.max(a.r, b.r) * .75;
    masses.push({ c: [(a.c[0] + b.c[0]) / 2, r * .5], r, top: 0 } as typeof frontier[number]);
  }
  // Towering clouds keep their bubbles' size as they rise; fair cumulus taper (estimated from the photographs).
  const keep = aspect > 1 ? [.86, .14] : [.68, .24];
  while (frontier.length && masses.length < (aspect > 1 ? 130 : 34)) {
    const p = frontier.shift()!;
    if (p.c[1] + p.r >= p.top) continue;
    const kids = rnd() < (aspect > 1 ? .14 : .3) ? 2 : 1;
    for (let k = 0; k < kids; k++) {
      const ang = Math.PI / 2 + (rnd() - .5) * (kids === 2 ? 1.6 : .9) - lean / w * .6, d = p.r * (.62 + rnd() * .3), r = p.r * (keep[0] + rnd() * keep[1]);
      const c: FPoint = [p.c[0] + Math.cos(ang) * d, Math.min(p.top - r * .55, p.c[1] + Math.sin(ang) * d)];
      if (c[1] <= p.c[1]) continue;
      const m = { c: [Math.max(-w / 2 + r * .6, Math.min(w / 2 - r * .6, c[0] + xAt(c[1]) * .3)), c[1]] as FPoint, r, top: p.top };
      masses.push(m); frontier.push(m);
    }
  }
  const inside = (p: FPoint, list: readonly { c: FPoint; r: number }[]) => list.some(m => Math.hypot(p[0] - m.c[0], p[1] - m.c[1]) < m.r);
  type Raw = { c: FPoint; r: number; level: 0 | 1 | 2 | 3; mass: number };
  const lumps: Raw[] = masses.map((m, i) => ({ c: m.c, r: m.r, level: 0 as const, mass: i }));
  // Face lumps (level 1): on each mass's exposed upper rim, bulging past it (the turret heads of the middle scale),
  // and over its whole visible face, so no bare dome shows.
  const detail = o.detail ?? "full";
  masses.forEach((m, mi) => {
    const r1 = m.r * (.27 + rnd() * .08), around = Math.max(3, Math.round(Math.PI * m.r / (r1 * 1.35)));
    for (let i = 0; i <= around; i++) {
      const a = Math.PI * (.04 + .92 * i / around) + (rnd() - .5) * .25, rr = r1 * (.75 + rnd() * .7);
      const q: FPoint = [m.c[0] + Math.cos(a) * m.r, m.c[1] + Math.sin(a) * m.r];
      if (masses.some(o2 => o2 !== m && Math.hypot(q[0] - o2.c[0], q[1] - o2.c[1]) < o2.r * .9)) continue;
      lumps.push({ c: [m.c[0] + Math.cos(a) * (m.r - rr * .25), m.c[1] + Math.sin(a) * (m.r - rr * .25)], r: rr, level: 1, mass: mi });
    }
    if (detail === "low") return;
    const step = r1 * 1.25;
    for (let y = m.c[1] - m.r * .75; y < m.c[1] + m.r * .8; y += step * .87) for (let x = m.c[0] - m.r; x < m.c[0] + m.r; x += step) {
      const q: FPoint = [x + (rnd() - .5) * step * .5 + ((Math.round((y - m.c[1]) / step) & 1) * step * .5), y + (rnd() - .5) * step * .4];
      if (Math.hypot(q[0] - m.c[0], q[1] - m.c[1]) > m.r - r1 * .5) continue;
      // Skip what a nearer (lower) mass covers.
      if (masses.some(o2 => o2 !== m && o2.c[1] < m.c[1] - o2.r * .1 && Math.hypot(q[0] - o2.c[0], q[1] - o2.c[1]) < o2.r * .92)) continue;
      lumps.push({ c: q, r: r1 * (.75 + rnd() * .5), level: 1, mass: mi });
    }
  });
  // Cauliflower (levels 2 to 4): three children at about 0.45 of their parent's size on every exposed stretch of its
  // upper rim, so the edge is self-similar with dimension log 3 / log(1 / 0.45) ≈ 1.38, near Lovejoy's 1.35.
  const exposedAngles = (p: Raw) => {
    const out: number[] = [];
    for (let i = 0; i <= 24; i++) {
      const a = -.35 + (Math.PI + .7) * i / 24, q: FPoint = [p.c[0] + Math.cos(a) * p.r, p.c[1] + Math.sin(a) * p.r];
      if (q[1] > h * .04 && !lumps.some(m => m !== p && m.r > p.r * .5 && Math.hypot(q[0] - m.c[0], q[1] - m.c[1]) < m.r * .98)) out.push(a);
    }
    return out;
  };
  for (const level of (detail === "full" ? [2, 3, 4] : detail === "medium" ? [2] : []) as (2 | 3 | 4)[]) {
    for (const p of lumps.filter(l => l.level === level - 1 || (level === 4 && l.level === 3))) {
      if (level === 4 && p.r > w * .03) continue;
      const open = exposedAngles(p);
      if (open.length < 2) continue;
      const kids = 3 + (rnd() < .4 ? 1 : 0);
      for (let i = 0; i < kids; i++) {
        const a = open[Math.min(open.length - 1, Math.floor((i + .2 + rnd() * .6) / kids * open.length))], rr = p.r * (.42 + rnd() * .14);
        // Each child bulges well past its parent's rim, so the edge stays rough at every scale.
        lumps.push({ c: [p.c[0] + Math.cos(a) * (p.r - rr * .2), p.c[1] + Math.sin(a) * (p.r - rr * .2)], r: rr, level: Math.min(3, level) as 2 | 3, mass: p.mass });
      }
    }
  }
  // Growth: each upper mass is a turret that rises, swells, then softens and fades, carrying its own lumps with it
  // (one phase per turret, so nothing detaches).
  const metres = o.metres ?? 1200, rise = UPDRAFT[kind] * TURRET_LIFE / metres * w;
  const turret = masses.map((m, i) => {
    if (!time || m.c[1] < h * .5) return { dy: 0, k: 1, alpha: 1 };
    const phase = (Math.abs(Math.sin(i * 12.9898 + m.c[0] * 78.233)) * 43758.5453) % 1, age = (time / TURRET_LIFE + phase) % 1;
    const grow = .7 + .3 * smooth(0, .35, age) - .15 * smooth(.7, 1, age);
    return { dy: rise * .25 * (age - .3), k: grow, alpha: 1 - .8 * smooth(.8, 1, age) };
  });
  const grown = lumps.map(l => {
    const t = turret[l.mass], m = masses[l.mass];
    if (t.dy === 0 && t.k === 1) return { ...l, opacity: 1 };
    return { ...l, c: [m.c[0] + (l.c[0] - m.c[0]) * t.k, m.c[1] + t.dy + (l.c[1] - m.c[1]) * t.k] as FPoint, r: l.r * t.k, opacity: t.alpha };
  });
  // Light of the big forms. The sun's azimuth splits it into a frontal part (the face lit as a whole when the sun is
  // behind the viewer) and a side part (light dying away with the depth of cloud between the mass and the sun across
  // the picture). A mass overlapped from above sits in that mass's shadow; the base is darkest.
  const az = (o.sunAzimuth ?? 60) * Math.PI / 180, front = (1 + Math.cos(az)) / 2, side = Math.sin(az);
  const lambda = (kind === "towering" ? .16 : .24) * w, stepLen = w / 60;
  const sLen = Math.hypot(s[0], s[1]), s2: FPoint = [s[0] / sLen, s[1] / sLen];
  const massLight = masses.map(m => {
    const p0: FPoint = [m.c[0] + s2[0] * m.r, m.c[1] + s2[1] * m.r];
    let depth = 0;
    for (let t = 0; t < w * 1.5; t += stepLen) { const p: FPoint = [p0[0] + s2[0] * t, p0[1] + s2[1] * t]; if (inside(p, masses)) depth += stepLen; else if (t > w * .05) break; }
    const sideLight = Math.exp(-depth * side / lambda), height = .86 + .14 * Math.min(1, m.c[1] / h), base = .5 + .5 * smooth(0, .3 * h, m.c[1]);
    const overlapped = masses.some(q => q !== m && q.c[1] > m.c[1] + m.r * .3 && Math.hypot(q.c[0] - m.c[0], q.c[1] - m.c[1]) < q.r + m.r * .4) ? (kind === "towering" ? .8 : .88) : 1;
    // Backlit, light reaches the visible face only through the cloud: dark (estimated from the silver-lining photo).
    return Math.min(1, (front * (.86 + .14 * sideLight) + (1 - front) * .12 * sideLight) * height * base * overlapped);
  });
  // The cloud on a coarse grid, to tell which lump edges border the sky (the true silhouette).
  const gx0 = -w, gy1 = h * 1.5, gn = 320, cell = (gy1 + w * 2 - gx0) / gn / 1.5, cols = Math.ceil(w * 2 / cell), gRows = Math.ceil(gy1 / cell), occ = new Uint8Array(cols * gRows);
  for (const l of grown) {
    if (l.opacity < .5) continue;
    const i0 = Math.max(0, Math.floor((l.c[0] - l.r - gx0) / cell)), i1 = Math.min(cols - 1, Math.ceil((l.c[0] + l.r - gx0) / cell));
    const j0 = Math.max(0, Math.floor((l.c[1] - l.r) / cell)), j1 = Math.min(gRows - 1, Math.ceil((l.c[1] + l.r) / cell));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) if (Math.hypot(gx0 + (i + .5) * cell - l.c[0], (j + .5) * cell - l.c[1]) < l.r) occ[j * cols + i] = 1;
  }
  const isSky = (p: FPoint) => { const i = Math.floor((p[0] - gx0) / cell), j = Math.floor(p[1] / cell); return i < 0 || j < 0 || i >= cols || j >= gRows || !occ[j * cols + i]; };
  // Each lump takes its mass's light, brighter on the cap facing the sun and up, dimmer on the underside (the form);
  // backlit, lumps whose edge borders the sky glow (the silver lining).
  const lit = grown.map(l => {
    const m = masses[l.mass], dx = l.c[0] - m.c[0], dy = l.c[1] - m.c[1], d = Math.hypot(dx, dy) || 1, nx = dx / d, ny = dy / d;
    const toward = .5 + .5 * (nx * s2[0] + ny * s2[1]), up = .5 + .5 * ny;
    const form = l.level === 0 ? 1 : (front * (.8 + .2 * up) + side * (.62 + .38 * toward)) / (front + side);
    const silhouette = l.level > 0 && isSky([l.c[0] + nx * (l.r + cell * 1.5), l.c[1] + ny * (l.r + cell * 1.5)]);
    // The silver lining is strongest on the edge facing the sun behind the cloud and fades round the silhouette.
    const facing = Math.max(0, nx * s2[0] + ny * s2[1]), glow = silhouette ? (1 - front) * facing ** 1.5 : 0;
    // Evaporating lower flanks: thin at the outer edge low down (estimated).
    const flank = Math.abs(l.c[0] - xAt(l.c[1])) / Math.max(1e-6, halfAt(Math.max(0, l.c[1])));
    const evaporate = l.level > 0 && l.c[1] < h * .3 && flank > .8 ? .55 + .45 * (1 - smooth(.8, 1.1, flank)) : 1;
    // Backlit, the body darkens and the silhouette glows at its outer edge (the silver lining).
    return { c: l.c, r: l.r, level: l.level, rim: silhouette, out: Math.atan2(ny, nx), glow, light: Math.min(1, massLight[l.mass] * form), opacity: l.opacity * evaporate, mass: l.mass };
  });
  // Expose like a camera: the brightest sunlit crown is white.
  const peak = Math.max(...lit.map(l => l.light), front > .3 ? 1e-6 : 1);
  for (const l of lit) l.light = Math.min(1, l.light / peak);
  // Paint mass by mass, back (upper) to front (lower), each mass followed by its own lumps from the top down, so a
  // nearer mass covers the lumps of the masses behind it, and lower lumps' crowns stand in front of the ones above.
  const order = masses.map((m, i) => ({ i, key: m.c[1] + m.r * .3 })).sort((a, b) => b.key - a.key).map(x => x.i);
  const out: Lump[] = [];
  for (const mi of order) out.push(...lit.filter(l => l.mass === mi).sort((a, b) => (a.level === 0 ? -1 : b.level === 0 ? 1 : b.c[1] - a.c[1])).map(({ mass, ...l }) => { void mass; return l as Lump; }));
  return { lumps: out, width: w, height: h, masses };
}

/**
 * The box-counting dimension of the model's silhouette (above its flat base): the cloud is rasterised on a fine
 * grid, its boundary cells found, and boxes of 2 to 32 cells counted. Compare with Lovejoy's 1.35 for cloud
 * perimeters.
 */
export function outlineDimension(model: CumulusModel, cells = 512): number {
  const w = model.width, h = model.height, lumps = model.lumps.filter(l => l.opacity >= .5);
  const x0 = Math.min(...lumps.map(l => l.c[0] - l.r)), x1 = Math.max(...lumps.map(l => l.c[0] + l.r)), y1 = Math.max(...lumps.map(l => l.c[1] + l.r));
  const size = (x1 - x0) / cells, rows = Math.ceil(y1 / size) + 1, grid = new Uint8Array(cells * rows);
  for (const l of lumps) {
    const i0 = Math.max(0, Math.floor((l.c[0] - l.r - x0) / size)), i1 = Math.min(cells - 1, Math.ceil((l.c[0] + l.r - x0) / size));
    const j0 = Math.max(0, Math.floor((l.c[1] - l.r) / size)), j1 = Math.min(rows - 1, Math.ceil((l.c[1] + l.r) / size));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) if (Math.hypot(x0 + (i + .5) * size - l.c[0], (j + .5) * size - l.c[1]) < l.r) grid[j * cells + i] = 1;
  }
  const edge: [number, number][] = [], baseRow = Math.ceil(h * .05 / size);
  for (let j = baseRow; j < rows - 1; j++) for (let i = 1; i < cells - 1; i++) {
    if (!grid[j * cells + i]) continue;
    if (!grid[j * cells + i - 1] || !grid[j * cells + i + 1] || !grid[(j - 1) * cells + i] || !grid[(j + 1) * cells + i]) edge.push([i, j]);
  }
  void w;
  const boxes = [2, 4, 8, 16, 32], xs = boxes.map(b => Math.log(1 / b)), ys = boxes.map(b => Math.log(new Set(edge.map(([i, j]) => `${Math.floor(i / b)},${Math.floor(j / b)}`)).size));
  const mx = xs.reduce((a, c) => a + c) / xs.length, my = ys.reduce((a, c) => a + c) / ys.length;
  return xs.reduce((a, x, i) => a + (x - mx) * (ys[i] - my), 0) / xs.reduce((a, x) => a + (x - mx) ** 2, 0);
}

/** Interpolate a ladder of hex colours at t (0 darkest, 1 brightest). */
export function ladderColour(ladder: readonly string[], t: number): string {
  const x = Math.min(1, Math.max(0, t)) * (ladder.length - 1), i = Math.min(ladder.length - 2, Math.floor(x)), f = x - i;
  const a = ladder[i], b = ladder[i + 1], ch = (h: string, k: number) => parseInt(h.slice(1 + k * 2, 3 + k * 2), 16);
  return `#${[0, 1, 2].map(k => Math.round(ch(a, k) + (ch(b, k) - ch(a, k)) * f).toString(16).padStart(2, "0")).join("")}`;
}
