/**
 * FOOD1 still-life staging: the light moods, the vessels food is served in and the helpers that place food on them.
 *
 * - `MOODS`: golden-hour backlight, a bright morning market, a midnight lamp, soft window daylight.
 * - `vessel(kind, size)`: bowls, plates, pans, boards, jars, steamers and leaves from measured profiles (a lathe for
 *   anything round), each with the inner radius at a height and its rim, so food and liquid sit inside it.
 * - `dewOn(mesh)`: condensation beads on produce, sized and spaced like real dew (0.3–2.5 mm, clustered).
 * - `scatter`: non-overlapping placement of pieces on a support (berries in a bowl, grains on a board).
 */
import { blade, ellipsoid, lathe, merge, rng, slab, sweep, transform } from "./food-mesh";
import type { Mesh, V3 } from "./food-mesh";
import type { Mood, Part, SurfaceFn } from "./food-scene";
import { bambooWeave, bananaLeaf, castIron, copper, earthenware, enamel, glass, lacquer, porcelain, stoneware, water, woodBoard } from "./food-surfaces";

// ---- Moods -------------------------------------------------------------------------------------------------------------------------

export type MoodId = "golden-hour" | "morning-market" | "midnight" | "window";
export const MOODS: Record<MoodId, Mood> = {
  "golden-hour": {
    id: "golden-hour", label: "Golden-hour backlight",
    sun: { azimuth: 118, elevation: 21, colour: "#ffb768", power: 3.6, size: 2.2 },
    window: { azimuth: 122, elevation: 30, colour: "#ffdcae", power: 1.0, width: 70, height: 46 },
    fill: { colour: "#fff0de", power: 0.62 },
    ambient: { sky: "#95a3b8", ground: "#7a5638", power: 0.12 },
    pool: 460, haze: { colour: "#e9a86c", power: 0.42 }, exposure: 1.3,
    grade: { warmth: 0.6, lift: "#2b1c12", saturation: 1.08, vignette: 0.48, bloom: 0.35 },
  },
  "morning-market": {
    id: "morning-market", label: "Bright morning market",
    sun: { azimuth: 62, elevation: 34, colour: "#fff1da", power: 2.5, size: 3 },
    window: { azimuth: 90, elevation: 50, colour: "#d7e5ff", power: 0.75, width: 110, height: 70 },
    fill: { colour: "#f6f8ff", power: 0.42 },
    ambient: { sky: "#b9c8e2", ground: "#8a7660", power: 0.22 },
    pool: 0, haze: { colour: "#e3e7e6", power: 0.75 }, exposure: 0.95,
    grade: { warmth: 0.18, lift: "#1d2024", saturation: 1.06, vignette: 0.3, bloom: 0.25 },
  },
  midnight: {
    id: "midnight", label: "Midnight lamp",
    sun: { azimuth: 158, elevation: 36, colour: "#ff9a4c", power: 2.9, size: 7 },
    window: { azimuth: 35, elevation: 38, colour: "#6b80b4", power: 0.16, width: 60, height: 50 },
    fill: { colour: "#ffb070", power: 0.07 },
    ambient: { sky: "#1c2438", ground: "#2a1a10", power: 0.05 },
    pool: 230, haze: { colour: "#1b1520", power: 0.35 }, exposure: 1.15,
    grade: { warmth: 0.5, lift: "#100b15", saturation: 1.05, vignette: 0.62, bloom: 0.55 },
  },
  window: {
    id: "window", label: "Soft window daylight",
    sun: { azimuth: 168, elevation: 40, colour: "#f6f2ec", power: 1.5, size: 14 },
    window: { azimuth: 168, elevation: 34, colour: "#eef2f8", power: 1.0, width: 95, height: 70 },
    fill: { colour: "#ffffff", power: 0.46 },
    ambient: { sky: "#c9d2de", ground: "#8f8270", power: 0.18 },
    pool: 0, haze: { colour: "#d9d4cc", power: 0.65 }, exposure: 1.0,
    grade: { warmth: 0.12, lift: "#1c1b1a", saturation: 1.03, vignette: 0.26, bloom: 0.15 },
  },
};

// ---- Profiles ---------------------------------------------------------------------------------------------------------------------

/** A smooth profile through (radius, y) points, sampled evenly by length: for `lathe`. */
export function profile(pts: readonly (readonly [number, number])[]): (v: number) => readonly [number, number] {
  // Catmull-Rom through the points, then resampled by arc length so segments are even
  const dense: [number, number][] = [];
  const P = [pts[0], ...pts, pts[pts.length - 1]];
  for (let i = 1; i < P.length - 2; i++) for (let k = 0; k < 16; k++) {
    const f = k / 16, p0 = P[i - 1], p1 = P[i], p2 = P[i + 1], p3 = P[i + 2];
    // (clamped to the segment's box, so sharp corners — a jar's base, a plate's rim — do not overshoot)
    const at = (c: 0 | 1) => Math.min(Math.max(p1[c], p2[c]), Math.max(Math.min(p1[c], p2[c]), 0.5 * (2 * p1[c] + (-p0[c] + p2[c]) * f + (2 * p0[c] - 5 * p1[c] + 4 * p2[c] - p3[c]) * f * f + (-p0[c] + 3 * p1[c] - 3 * p2[c] + p3[c]) * f * f * f)));
    dense.push([Math.max(0, at(0)), at(1)]);
  }
  dense.push([pts[pts.length - 1][0], pts[pts.length - 1][1]]);
  const acc = [0];
  for (let i = 1; i < dense.length; i++) acc.push(acc[i - 1] + Math.hypot(dense[i][0] - dense[i - 1][0], dense[i][1] - dense[i - 1][1]));
  const total = acc[acc.length - 1];
  return v => {
    const t = Math.min(1, Math.max(0, v)) * total;
    let lo = 0, hi = acc.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (acc[m] < t) lo = m; else hi = m; }
    const f = (t - acc[lo]) / Math.max(1e-9, acc[hi] - acc[lo]);
    return [dense[lo][0] + (dense[hi][0] - dense[lo][0]) * f, dense[lo][1] + (dense[hi][1] - dense[lo][1]) * f];
  };
}

// ---- Vessels ----------------------------------------------------------------------------------------------------------------------

export type VesselKind =
  | "stoneware-bowl" | "celadon-bowl" | "tenmoku-bowl" | "earthenware-bowl" | "enamel-bowl" | "porcelain-bowl" | "lacquer-bowl" | "donburi"
  | "stoneware-plate" | "earthenware-plate" | "enamel-plate" | "porcelain-plate" | "minimal-plate" | "platter"
  | "cast-iron-pan" | "paella-pan" | "copper-pot" | "earthenware-pot" | "tagine" | "stone-bowl"
  | "board" | "round-board" | "slate" | "banana-leaf" | "basket" | "steamer" | "glass-jar" | "cup" | "glass" | "ramekin" | "tray" | "none";

export interface Vessel {
  parts: Part[];
  /** Where food sits: the floor's height at the centre, the inside radius at a height, and the rim. */
  floorY: number; rimY: number; rimR: number;
  innerR: (y: number) => number;
  /** A sensible frame width for the camera, mm. */
  frame: number;
}

const BOWL_GLAZE: Partial<Record<VesselKind, () => SurfaceFn>> = {
  "stoneware-bowl": () => stoneware("#e9e0cf", { speckle: 0.7, rim: "#b59a76", clay: "#a98a68" }),
  "celadon-bowl": () => stoneware("#a9bfa4", { speckle: 0.2, rim: "#7f9a80", clay: "#9c8670", rough: 0.12 }),
  "tenmoku-bowl": () => stoneware("#2a1a12", { speckle: 0.1, rim: "#9b5a2a", clay: "#8a6a4e", rough: 0.1, drip: 0.6 }),
  "earthenware-bowl": () => earthenware("#b4673f"),
  "enamel-bowl": () => enamel("#efece4", "#203a5c"),
  "porcelain-bowl": () => porcelain(),
  "lacquer-bowl": () => lacquer(),
  donburi: () => stoneware("#d9cdb8", { speckle: 0.4, rim: "#5a3b26", clay: "#9f8263", drip: 0.3 }),
  "stone-bowl": () => castIron(37),
};
const PLATE_GLAZE: Partial<Record<VesselKind, () => SurfaceFn>> = {
  "stoneware-plate": () => stoneware("#e6dccb", { speckle: 0.8, rim: "#a88a66", clay: "#a98a68", footY: 3 }),
  "earthenware-plate": () => earthenware("#a95e38"),
  "enamel-plate": () => enamel("#f0ede6", "#24364f"),
  "porcelain-plate": () => porcelain(),
  "minimal-plate": () => stoneware("#d8d4cd", { speckle: 0.35, rough: 0.55, clay: "#c2b8aa", footY: 3 }),
  platter: () => stoneware("#efe8da", { speckle: 0.3, rim: "#c8b08a", clay: "#b49a7a", footY: 3 }),
};

/** A bowl's profile: foot ring, outer wall, rounded lip, inner wall and floor. Diameter and height in mm. */
function bowlProfile(d: number, hgt: number, kind: VesselKind): (v: number) => readonly [number, number] {
  const R = d / 2, wall = Math.max(3, d * 0.028), foot = R * (kind === "donburi" ? 0.42 : kind === "stone-bowl" ? 0.62 : 0.38), fh = Math.max(4, hgt * 0.08);
  const flare = kind === "lacquer-bowl" ? 0.9 : kind === "earthenware-bowl" ? 0.94 : kind === "stone-bowl" ? 0.99 : 0.82;
  return profile([[0, fh * 0.6], [foot - 3, fh * 0.6], [foot - 2, 0], [foot + 1, 0], [foot + 2, fh], [R * flare * 0.9, hgt * 0.45], [R * 0.985, hgt * 0.9], [R, hgt], [R - wall * 0.5, hgt + wall * 0.25], [R - wall, hgt * 0.97], [(R - wall) * flare * 0.9, hgt * 0.5], [foot * 0.9, fh + wall], [0, fh + wall]]);
}
/** A plate's profile: foot, underside, raised rim and a flat well. */
function plateProfile(d: number, kind: VesselKind): (v: number) => readonly [number, number] {
  const R = d / 2, rimW = kind === "minimal-plate" ? d * 0.04 : d * 0.13, h = kind === "platter" ? 22 : kind === "minimal-plate" ? 14 : 20, th = 5;
  return profile([[0, 3], [R * 0.36, 3], [R * 0.37, 0], [R * 0.4, 0], [R * 0.45, 3.5], [R - rimW, h * 0.45], [R - 1, h], [R - 2.5, h + 1.2], [R - 4, h - 0.4], [R - rimW - 2, th + 4], [R - rimW * 1.4, th + 1], [0, th]]);
}

/** Build a vessel. `size` is its diameter (or length), mm. */
export function vessel(kind: VesselKind, size = 180, seed = 1): Vessel {
  const r = rng(seed);
  if (kind === "none") return { parts: [], floorY: 0, rimY: 0, rimR: size / 2, innerR: () => size / 2, frame: size * 1.5 };
  if (BOWL_GLAZE[kind]) {
    const hgt = size * (kind === "donburi" ? 0.5 : kind === "lacquer-bowl" ? 0.5 : kind === "stone-bowl" ? 0.42 : 0.38), R = size / 2, wall = Math.max(3, size * 0.028), fh = Math.max(4, hgt * 0.08);
    const prof = bowlProfile(size, hgt, kind), mesh = lathe(prof, { nu: 96, nv: 72, modulate: kind === "earthenware-bowl" ? (t) => 1 + 0.008 * Math.sin(t * 3 + seed) : undefined });
    const flare = kind === "lacquer-bowl" ? 0.9 : kind === "earthenware-bowl" ? 0.94 : kind === "stone-bowl" ? 0.99 : 0.82;
    const innerR = (y: number) => { const f = Math.min(1, Math.max(0, (y - fh - wall) / (hgt * 0.97 - fh - wall))); return (R - wall) * (flare * 0.9 + (1 - flare * 0.9) * Math.sqrt(f)) * (0.55 + 0.45 * Math.sqrt(f)) + 2; };
    return { parts: [{ name: "bowl", mesh, surface: BOWL_GLAZE[kind]!(), k: { rimY: hgt, innerR: R - wall } }], floorY: fh + wall, rimY: hgt, rimR: R, innerR, frame: size * 1.55 };
  }
  if (PLATE_GLAZE[kind]) {
    const prof = plateProfile(size, kind), R = size / 2, rimW = kind === "minimal-plate" ? size * 0.04 : size * 0.13;
    const mesh = lathe(prof, { nu: 180, nv: 64, squash: kind === "platter" ? 0.68 : 1 });
    return { parts: [{ name: "plate", mesh, surface: PLATE_GLAZE[kind]!(), k: kind === "porcelain-plate" ? { rimR: R } : { rimR: R, rimY: 20 } }], floorY: 5, rimY: 20, rimR: R, innerR: () => R - rimW * 1.2, frame: size * 1.35 };
  }
  switch (kind) {
    case "cast-iron-pan": case "paella-pan": {
      const R = size / 2, h = kind === "paella-pan" ? size * 0.12 : size * 0.2, t = kind === "paella-pan" ? 2 : 4.5;
      const prof = profile([[0, 0], [R * 0.85, 0], [R * 0.96, h * 0.3], [R, h], [R - t * 0.5, h + t * 0.3], [R - t, h * 0.95], [R * 0.85 - t, t + 0.5], [0, t]]);
      const pan = lathe(prof, { nu: 112, nv: 60 });
      const handles: Mesh[] = [];
      if (kind === "paella-pan") for (const s of [-1, 1]) handles.push(sweep([[s * (R - 4), h * 0.8, -14], [s * (R + 16), h * 0.85, -10], [s * (R + 22), h * 0.85, 0], [s * (R + 16), h * 0.85, 10], [s * (R - 4), h * 0.8, 14]], { radius: () => 2.6, nu: 10, nv: 40 }));
      else handles.push(sweep([[R - 6, h * 0.8, 0], [R + 40, h * 1.1, -6], [R + 110, h * 1.6, -14]], { radius: (t2) => 9 - t2 * 2, flatten: 0.55, nu: 14, nv: 30 }));
      const surf = kind === "paella-pan" ? castIron(41) : castIron(43);
      return { parts: [{ name: "pan", mesh: merge([pan, ...handles]), surface: surf }], floorY: t, rimY: h, rimR: R, innerR: (y) => R * 0.85 + (R * 0.15 - t) * Math.min(1, y / h), frame: size * 1.5 };
    }
    case "copper-pot": case "earthenware-pot": {
      const R = size / 2, h = size * 0.46, t = 3;
      const prof = profile([[0, 0], [R * 0.9, 0], [R, h * 0.15], [R * 1.02, h * 0.6], [R * 0.98, h], [R * 0.98 - t, h + 1.5], [R * 0.98 - t, h * 0.9], [R * 1.02 - t, h * 0.6], [R * 0.9 - t, t], [0, t]]);
      const pot = lathe(prof, { nu: 96, nv: 64 });
      const handles = [-1, 1].map(s => sweep([[s * R * 0.98, h * 0.78, -12], [s * (R + 18), h * 0.82, -8], [s * (R + 20), h * 0.82, 8], [s * R * 0.98, h * 0.78, 12]], { radius: () => 3.5, nu: 10, nv: 30 }));
      return { parts: [{ name: "pot", mesh: merge([pot, ...handles]), surface: kind === "copper-pot" ? copper() : earthenware("#9a5432", 47), k: { rimY: h } }], floorY: t, rimY: h, rimR: R, innerR: () => R * 0.98 - t, frame: size * 1.7 };
    }
    case "tagine": {
      const R = size / 2, base = lathe(profile([[0, 0], [R * 0.8, 0], [R, 18], [R - 2, 22], [R - 6, 16], [R * 0.75, 6], [0, 6]]), { nu: 96, nv: 48 });
      return { parts: [{ name: "tagine", mesh: base, surface: earthenware("#9c4a2a", 53) }], floorY: 6, rimY: 22, rimR: R, innerR: () => R * 0.85, frame: size * 1.45 };
    }
    case "ramekin": {
      const R = size / 2, h = size * 0.55, t = 3.5;
      const ribs = (th: number) => 1 + 0.018 * Math.pow(Math.abs(Math.cos(th * 14)), 0.5);
      const mesh = lathe(profile([[0, 0], [R - 1, 0], [R, 2], [R, h], [R - t * 0.5, h + 1.2], [R - t, h], [R - t, t + 1], [R - t - 1, t], [0, t]]), { nu: 140, nv: 48, modulate: (th, v) => (v < 0.45 ? ribs(th) : 1) });
      return { parts: [{ name: "ramekin", mesh, surface: stoneware("#f3f0ea", { speckle: 0.05, rough: 0.12 }), k: { rimY: h } }], floorY: t, rimY: h, rimR: R, innerR: () => R - t, frame: size * 2.2 };
    }
    case "cup": case "glass": {
      const R = size / 2, h = kind === "glass" ? size * 1.35 : size * 0.85, t = kind === "glass" ? 1.8 : 4;
      const mesh = lathe(profile([[0, 0], [R * 0.8, 0], [R * 0.86, 3], [R, h], [R - t * 0.5, h + 1], [R - t, h], [R * 0.86 - t, t + 3], [0, t + 2]]), { nu: 96, nv: 56 });
      const parts: Part[] = [{ name: kind, mesh, surface: kind === "glass" ? glass() : stoneware("#e8e1d4", { speckle: 0.4, rim: "#8f6f4c" }), transparent: kind === "glass", thin: kind === "glass" ? 2.5 : undefined, k: { rimY: h } }];
      if (kind === "cup") parts.push({ name: "handle", mesh: sweep([[R - 2, h * 0.78, 0], [R + 16, h * 0.74, 0], [R + 18, h * 0.4, 0], [R - 2, h * 0.3, 0]], { radius: () => 4, flatten: 0.6, nu: 12, nv: 30, up: [0, 0, 1] }), surface: parts[0].surface });
      return { parts, floorY: t + 2, rimY: h, rimR: R, innerR: (y) => R * 0.86 - t + (R * 0.14) * Math.min(1, y / h), frame: size * 2.3 };
    }
    case "glass-jar": {
      const R = size / 2, h = size * 1.35;
      const mesh = lathe(profile([[0, 0], [R * 0.95, 0], [R, 6], [R, h * 0.86], [R * 0.86, h * 0.93], [R * 0.86, h], [R * 0.84, h + 1], [R * 0.82, h], [R * 0.82, h * 0.93], [R * 0.97, h * 0.86], [R * 0.97, 6], [R * 0.9, 3], [0, 3]]), { nu: 96, nv: 60 });
      return { parts: [{ name: "jar", mesh, surface: glass(), transparent: true, thin: 3 }], floorY: 3, rimY: h, rimR: R, innerR: () => R * 0.96, frame: size * 2 };
    }
    case "steamer": {
      const R = size / 2, h = size * 0.32;
      const ring = lathe(profile([[R - 4, 0], [R, 0], [R, h], [R - 4, h], [R - 4, 0.5]]), { nu: 96, nv: 24 });
      const floor = slab({ outline: () => R - 3, top: () => 4, bottom: 2, bevel: 0.5, nu: 64, nv: 16 });
      return { parts: [{ name: "steamer", mesh: ring, surface: bambooWeave() }, { name: "steamer floor", mesh: floor, surface: bambooWeave(29) }], floorY: 4, rimY: h, rimR: R, innerR: () => R - 5, frame: size * 1.45 };
    }
    case "basket": {
      const R = size / 2, h = size * 0.3;
      const mesh = lathe(profile([[0, 2], [R * 0.7, 0], [R * 0.95, h * 0.5], [R, h], [R - 5, h], [R * 0.9, h * 0.5], [R * 0.66, 6], [0, 7]]), { nu: 120, nv: 40 });
      return { parts: [{ name: "basket", mesh, surface: bambooWeave(31) }], floorY: 7, rimY: h, rimR: R, innerR: (y) => R * 0.66 + R * 0.3 * Math.min(1, y / h), frame: size * 1.5 };
    }
    case "board": case "round-board": case "slate": case "tray": {
      const round = kind === "round-board", L = size, Wd = kind === "slate" ? size * 0.6 : size * 0.62, th = kind === "slate" ? 7 : kind === "tray" ? 5 : 18;
      const outline = round ? () => L / 2 : (t: number) => { const c = Math.cos(t), s = Math.sin(t), a = L / 2, b = Wd / 2, p = 8; return 1 / Math.pow(Math.pow(Math.abs(c) / a, p) + Math.pow(Math.abs(s) / b, p), 1 / p); };
      const mesh = slab({ outline, top: () => th, bevel: kind === "slate" ? 1.5 : 4, nu: 128, nv: 32 });
      const surf = kind === "slate" ? stoneware("#2c2f33", { speckle: 0.05, rough: 0.6, footY: -1 }) : kind === "tray" ? enamel("#e8e2d6", "#2c3a2e", { seed: 61 }) : woodBoard(round ? "#9a6a3c" : "#a5763f", 59 + seed);
      const parts: Part[] = [{ name: kind, mesh, surface: surf, k: { rawFoot: 0, rimR: L / 2, rimY: th } }];
      if (kind === "tray") parts[0].k = { rimY: th, rimR: L / 2 };
      return { parts, floorY: th, rimY: th, rimR: Math.min(L, Wd) / 2, innerR: () => Math.min(L, Wd) / 2 - 8, frame: size * 1.25 };
    }
    case "banana-leaf": {
      const L = size;
      const mesh = transform(blade({ length: L, halfWidth: s => (L * 0.3) * Math.pow(Math.sin(Math.PI * Math.min(1, s * 1.05 + 0.02)), 0.6), lift: (s, w) => Math.abs(w) * 4 + Math.sin(s * 9 + w * 2) * 0.8, nu: 24, nv: 48 }), { at: [-L / 2, 0.6, 0], ry: 8 + r() * 6 });
      return { parts: [{ name: "banana leaf", mesh, surface: bananaLeaf(), k: { edge: L * 0.3 } }], floorY: 1.5, rimY: 1.5, rimR: L * 0.3, innerR: () => L * 0.26, frame: L * 1.05 };
    }
  }
  return vessel("stoneware-bowl", size, seed);
}

/** A liquid filling a vessel up to `fill` (0…1 of the inside height): a disc whose edge meets the wall in a meniscus. */
export function liquidIn(v: Vessel, fill: number, surface: SurfaceFn, opts: { tilt?: number; name?: string } = {}): Part {
  const y = v.floorY + (v.rimY - v.floorY) * fill, R = v.innerR(y) - 0.4;
  const mesh = slab({ outline: () => R, top: (x, z) => y + 0.8 * Math.pow(Math.hypot(x, z) / R, 8) + (opts.tilt ?? 0) * x * 0.002, bottom: v.floorY, bevel: 1, nu: 96, nv: 40, noSide: true });
  return { name: opts.name ?? "liquid", mesh, surface, transparent: true };
}

/** The height of a liquid that fills `fill` of a vessel. */
export const levelIn = (v: Vessel, fill: number) => v.floorY + (v.rimY - v.floorY) * fill;

// ---- Placement --------------------------------------------------------------------------------------------------------------------

/**
 * Condensation and dew beads on a mesh: `count` droplets, clustered (dew gathers where it first formed), radius
 * 0.3–2.5 mm and flattened by surface tension, on the upper, camera-facing side. Transparent water lenses.
 */
export function dewOn(m: Mesh, count: number, seed = 1, maxR = 2.2): Part {
  const r = rng(seed), drops: Mesh[] = [], nv = m.pos.length / 3;
  if (!nv) return { name: "dew", mesh: merge([]), surface: water, transparent: true };
  const centres: number[] = [];
  for (let k = 0; k < Math.max(1, Math.round(count / 9)); k++) centres.push(Math.floor(r() * nv));
  let tries = 0;
  while (drops.length < count && tries++ < count * 30) {
    const c = centres[Math.floor(r() * centres.length)], i = r() < 0.65 ? c : Math.floor(r() * nv);
    const j = Math.min(nv - 1, Math.max(0, i + Math.floor((r() - 0.5) * 400)));
    const n: V3 = [m.nrm[j * 3], m.nrm[j * 3 + 1], m.nrm[j * 3 + 2]];
    if (n[1] < -0.35 || n[2] < -0.3) continue;
    const rad = 0.3 + Math.pow(r(), 2.2) * (maxR - 0.3);
    const p: V3 = [m.pos[j * 3], m.pos[j * 3 + 1], m.pos[j * 3 + 2]];
    // a flattened lens sitting on the surface, its axis along the normal
    const drop = ellipsoid(rad, rad * 0.55, rad, 14, 8);
    const ax = Math.atan2(Math.hypot(n[0], n[2]), n[1]) * 180 / Math.PI, ay = Math.atan2(n[0], n[2]) * 180 / Math.PI;
    drops.push(transform(drop, { rx: ax, ry: ay, at: [p[0] + n[0] * rad * 0.15, p[1] + n[1] * rad * 0.15, p[2] + n[2] * rad * 0.15] }));
  }
  return { name: "dew", mesh: merge(drops), surface: water, transparent: true, castShadow: false };
}

/**
 * Place `count` pieces without overlaps inside a disc of `radius` (mm) at height `y(x, z)`: each piece is built by
 * `make(i, random)` around the origin, then turned about Y and set down.
 */
export function scatter(count: number, radius: number, y: (x: number, z: number) => number, gap: number, make: (i: number, r: () => number) => Mesh, seed = 1, centre: V3 = [0, 0, 0]): Mesh {
  const r = rng(seed), placed: [number, number][] = [], ms: Mesh[] = [];
  let tries = 0;
  while (placed.length < count && tries++ < count * 60) {
    const a = r() * Math.PI * 2, d = Math.sqrt(r()) * radius, x = centre[0] + Math.cos(a) * d, z = centre[2] + Math.sin(a) * d;
    if (placed.some(([px, pz]) => Math.hypot(px - x, pz - z) < gap)) continue;
    placed.push([x, z]);
    ms.push(transform(make(placed.length - 1, r), { ry: r() * 360, at: [x, y(x, z), z] }));
  }
  return merge(ms);
}

// ---- Settling: pieces dropped into a vessel ----------------------------------------------------------------------------------

/**
 * The surface pieces come to rest on: a height field (mm) over the vessel's floor and its inner wall, raised by every
 * piece already settled, and the wall itself (no part of a piece may stand outside the inner radius at its height).
 */
export class RestingSurface {
  private readonly n: number; private readonly h: Float32Array;
  constructor(readonly v: Vessel | null, readonly extent: number, readonly cell = 1.5, readonly gap = 0.6) {
    this.n = Math.ceil((extent * 2) / cell);
    this.h = new Float32Array(this.n * this.n);
    for (let j = 0; j < this.n; j++) for (let i = 0; i < this.n; i++) this.h[j * this.n + i] = this.floorAt(Math.hypot((i + 0.5) * cell - extent, (j + 0.5) * cell - extent));
  }
  /** The vessel's own surface at radius r: the floor, then the inner wall rising (bowls), or the table beyond a dish. */
  floorAt(r: number): number {
    const v = this.v;
    if (!v) return 0;
    if (v.rimY <= 20) return r <= v.innerR(v.floorY) ? v.floorY : r <= v.rimR ? v.floorY + (v.rimY - v.floorY) * Math.min(1, (r - v.innerR(v.floorY)) / Math.max(1, v.rimR - v.innerR(v.floorY))) : 0;
    if (r <= v.innerR(v.floorY)) return v.floorY;
    // the inner wall: the lowest height whose inner radius reaches r
    let lo = v.floorY, hi = v.rimY;
    if (v.innerR(hi) < r) return v.rimY + 1e4;
    for (let k = 0; k < 24; k++) { const m = (lo + hi) / 2; if (v.innerR(m) >= r) hi = m; else lo = m; }
    return hi;
  }
  at(x: number, z: number): number {
    const i = Math.floor((x + this.extent) / this.cell), j = Math.floor((z + this.extent) / this.cell);
    return i < 0 || j < 0 || i >= this.n || j >= this.n ? this.floorAt(Math.hypot(x, z)) : this.h[j * this.n + i];
  }
  /** Raise the field under a settled piece. */
  add(m: Mesh): void {
    for (let k = 0; k < m.pos.length; k += 3) {
      const i = Math.floor((m.pos[k] + this.extent) / this.cell), j = Math.floor((m.pos[k + 2] + this.extent) / this.cell), y = m.pos[k + 1];
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
        const ii = i + di, jj = j + dj;
        if (ii >= 0 && jj >= 0 && ii < this.n && jj < this.n && this.h[jj * this.n + ii] < y) this.h[jj * this.n + ii] = y;
      }
    }
  }
  /** How far a piece must move up (positive) or may fall (negative) to rest on the field. */
  lift(m: Mesh): number { let d = -Infinity; for (let k = 0; k < m.pos.length; k += 3) d = Math.max(d, this.at(m.pos[k], m.pos[k + 2]) - m.pos[k + 1]); return d; }
  /** How far a piece pokes out of the vessel's inner wall (mm, 0 if inside). */
  outside(m: Mesh): number {
    const v = this.v;
    if (!v || v.rimY <= 20) return 0;
    let e = 0;
    for (let k = 0; k < m.pos.length; k += 3) { const y = Math.min(v.rimY, m.pos[k + 1]); e = Math.max(e, Math.hypot(m.pos[k], m.pos[k + 2]) - (v.innerR(y) - this.gap)); }
    return e;
  }
}

const shiftParts = (parts: readonly Part[], d: V3): Part[] => parts.map(p => ({ ...p, mesh: transform(p.mesh, { at: d }) }));
const turnParts = (parts: readonly Part[], pivot: V3, rx: number, rz: number): Part[] =>
  parts.map(p => ({ ...p, mesh: transform(transform(transform(p.mesh, { at: [-pivot[0], -pivot[1], -pivot[2]] }), { rx, rz }), { at: pivot }) }));
const centroid = (m: Mesh): V3 => { const c: V3 = [0, 0, 0], n = m.pos.length / 3; for (let k = 0; k < m.pos.length; k += 3) { c[0] += m.pos[k]; c[1] += m.pos[k + 1]; c[2] += m.pos[k + 2]; } return [c[0] / n, c[1] / n, c[2] / n]; };

/**
 * Settle pieces into a vessel (or onto a board, a plate or the table) one at a time, in order: each group (a fruit with
 * its stem and leaves) is tried at a few tilts, pushed in from the wall, dropped until it rests on the floor or on the
 * pieces below it, and the lowest resting pose is kept. Nothing passes through the vessel or another piece from above.
 * The first part of each group is its body, the part that collides.
 */
export function settle(v: Vessel | null, groups: readonly (readonly Part[])[], o: { seed?: number; tries?: number; maxTilt?: number; gap?: number; roam?: number } = {}): Part[] {
  const r = rng(o.seed ?? 3), extent = (v ? v.rimR * 1.15 : 0) + 160, field = new RestingSurface(v, extent, 1.5, o.gap ?? 0.6), out: Part[] = [];
  // how far a piece may roll from where it was put: within a bowl, anywhere on its floor; on a flat dish, nearby
  const roam = o.roam ?? (v && v.rimY > 20 ? v.innerR(v.floorY + (v.rimY - v.floorY) * 0.5) * 0.8 : 30);
  for (const g of groups) {
    if (!g.length) continue;
    const home = centroid(g[0].mesh);
    let best: Part[] | null = null, bestScore = Infinity;
    const tries = Math.max(1, o.tries ?? 12);
    for (let t = 0; t < tries; t++) {
      const mt = o.maxTilt ?? 40;
      let parts = t % 3 === 0 ? [...g] : turnParts(g, home, (r() - 0.5) * 2 * mt, (r() - 0.5) * 2 * mt);
      // roll: try nearby spots, the first where it was put
      if (t > 0) { const a = r() * Math.PI * 2, d = Math.sqrt(r()) * roam; parts = shiftParts(parts, [Math.cos(a) * d, 0, Math.sin(a) * d]); }
      for (let k = 0; k < 6; k++) {
        // in from the wall, towards the vessel's axis
        const e = field.outside(parts[0].mesh);
        if (e > 0) { const c = centroid(parts[0].mesh), d = Math.hypot(c[0], c[2]) || 1; parts = shiftParts(parts, [(-c[0] / d) * (e + 0.3), 0, (-c[2] / d) * (e + 0.3)]); }
        // then down (or up) onto whatever is below
        const dy = field.lift(parts[0].mesh);
        if (Math.abs(dy) > 0.05) parts = shiftParts(parts, [0, dy, 0]);
        if (e <= 0 && Math.abs(dy) <= 0.05) break;
      }
      const c = centroid(parts[0].mesh), score = c[1] + 0.04 * Math.hypot(c[0] - home[0], c[2] - home[2]);
      if (field.outside(parts[0].mesh) <= 0.5 && score < bestScore) { bestScore = score; best = parts; }
    }
    best ??= shiftParts(g, [0, field.lift(g[0].mesh), 0]);
    field.add(best[0].mesh);
    out.push(...best);
  }
  return out;
}

/** A heap: a mound of radius R and height Hh (smooth, a little lumpy) as a slab. */
export const mound = (R: number, Hh: number, base = 0, seed = 1, lump = 0.08) => slab({
  outline: t => R * (1 + 0.05 * Math.sin(t * 3 + seed) + 0.03 * Math.sin(t * 7 + seed * 2)),
  top: (x, z) => { const d = Math.hypot(x, z) / R; return base + Hh * Math.pow(Math.max(0, 1 - d * d), 0.9) * (1 + lump * Math.sin(x * 0.3 + seed) * Math.cos(z * 0.27)); },
  bottom: base, bevel: 1, nu: 96, nv: 48,
});

