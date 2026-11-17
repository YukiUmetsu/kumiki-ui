/**
 * ARCH1 storybook scenes, part 3: the painter. A scene (`ArchScene`, built by `arch-kit.ts`) is ray-marched and lit,
 * then painted:
 *
 * - **Perspective.** A level view camera with a shifted lens, as architectural illustrators draw: verticals stay
 *   vertical, the eye at a person's height (or raised for a bird's-eye plate).
 * - **Light.** Sun with soft shadows (penumbrae widen with distance from the caster), sky light that reaches into
 *   corners only as far as ambient occlusion lets it, warm ground bounce, dappled sun through leaves (a canopy
 *   cookie, as film gaffers use), lanterns, windows and candles by colour temperature (candle about 1850 K) with
 *   inverse-square falloff, glow in the air round each lamp, sun shafts through interior windows with dust.
 * - **Surfaces.** Each hit is textured by `arch-surface.ts` in the building's own coordinates, bump-shaded, made
 *   wet (darker porous stone, mirror-like puddles and slates), snowed on, and reflects the sky and lamps in glass.
 * - **Paint.** Observed in classic architectural watercolours (Prout, Rudolf von Alt, Cotman): washes that soften
 *   texture inside each shape but keep its edges; warm light and cool, coloured shadows; the darkest darks inside
 *   openings; a thin, broken sepia line on edges (never a heavy outline); pigment pooling at the edges of washes,
 *   granulation in the shadows, and the paper showing through the lights.
 */
import { fbm, gradNoise, hash2, linearOf } from "./foundation-raster";
import type { Node } from "./arch-sdf";
import { dirToLocal, queryHit, sceneFrames, toLocal, wrapCentres } from "./arch-sdf";
import { ivyOver, newSurfOut, sootOver, surfaceFn } from "./arch-surface";
import type { SurfaceSpec, SurfFn, SurfIn } from "./arch-surface";

// ---- Scene description -------------------------------------------------------------------------------------------------------

export interface PointLight { x: number; y: number; z: number; /** Colour temperature, K (candle 1850, oil lamp 2000, fire 1600). */ kelvin: number; /** Illuminance at 1 m in units where full sun is about 3 (a street lamp is about 0.5, a candle 0.05). */ power: number; /** Cast shadows (costs a ray). */ shadow?: boolean; /** A street or door lamp: lit only at dusk and night (fires and candles always burn). */ lamp?: boolean }
/** Flat ground (a street, a yard, a field, water) as a rectangle at height `y`: intersected exactly, so rays that graze it stay cheap. */
export interface GroundZone { x0: number; x1: number; z0: number; z1: number; y: number; mat: number }
/** A canopy of leaves above the scene: sunlight through it falls in dapples. */
export interface Canopy { x: number; z: number; y: number; r: number; /** Share of light blocked, 0–1. */ density?: number }
/** A window that lets a sun shaft into a room: a rectangle on a wall plane (`axis` "z": the wall lies at constant z). */
export interface Portal { x: number; y: number; z: number; axis: "x" | "z"; hw: number; hh: number }
/** Ivy on a wall: a patch rooted at (x, z) on the ground, `w` wide and `h` tall, on the wall facing ±z (`axis` "z") or ±x. */
export interface IvyPatch { x: number; z: number; y0?: number; w: number; h: number; axis?: "x" | "z" }
export interface CameraSpec {
  /** Eye position, metres. */
  x: number; y: number; z: number;
  /** Heading, degrees: 0 looks toward −z, 90 toward +x. */
  yaw?: number;
  /** Tilt, degrees (0 keeps verticals parallel; use `shift` to frame instead). */
  pitch?: number;
  /** Horizontal field of view, degrees. */
  fov?: number;
  /** Lens shift: raise (+) or lower the frame without tilting, as a share of the half-height. */
  shift?: number;
}
export type MoodId = "morning" | "noon" | "golden" | "dusk" | "night" | "rain" | "rain-night" | "overcast" | "winter" | "interior-day" | "candle" | "studio";
export interface Mood {
  sunElevation: number; sunAzimuth: number; sunKelvin: number; sunPower: number;
  skyTop: string; skyHorizon: string; ambient: number; haze: string; visibility: number;
  wet: number; snow: number; night: number; cloud: number;
  /** White balance, K: the light a painter treats as white (a candlelit room is painted warm, not orange). */
  white?: number;
  /** A second, unshadowed light from behind that rims the silhouette: elevation°, azimuth°, K, strength. */
  rim?: readonly [number, number, number, number];
}
export const MOODS: Readonly<Record<MoodId, Mood>> = {
  morning: { sunElevation: 24, sunAzimuth: -58, sunKelvin: 4300, sunPower: 3.0, skyTop: "#5f8fc8", skyHorizon: "#f1e7d2", ambient: 1.15, haze: "#d9dde0", visibility: 1400, wet: 0, snow: 0, night: 0, cloud: 0.35 },
  noon: { sunElevation: 55, sunAzimuth: -35, sunKelvin: 5600, sunPower: 3.3, skyTop: "#5a8cca", skyHorizon: "#ebe8de", ambient: 1.2, haze: "#dde2e6", visibility: 1800, wet: 0, snow: 0, night: 0, cloud: 0.3 },
  golden: { sunElevation: 13, sunAzimuth: -62, sunKelvin: 3200, sunPower: 3.0, skyTop: "#6f95c4", skyHorizon: "#f5d6a2", ambient: 1.0, haze: "#efd7b4", visibility: 1100, wet: 0, snow: 0, night: 0, cloud: 0.4 },
  dusk: { sunElevation: 2, sunAzimuth: -80, sunKelvin: 2300, sunPower: 1.1, skyTop: "#4b5d8a", skyHorizon: "#e9a98a", ambient: 0.42, haze: "#b9a3a6", visibility: 900, wet: 0, snow: 0, night: 0.75, cloud: 0.45, white: 4800 },
  night: { sunElevation: 30, sunAzimuth: 40, sunKelvin: 7000, sunPower: 0.12, skyTop: "#121c33", skyHorizon: "#33405e", ambient: 0.12, haze: "#2b3550", visibility: 500, wet: 0, snow: 0, night: 1, cloud: 0.3, white: 3600 },
  "rain-night": { sunElevation: 30, sunAzimuth: 40, sunKelvin: 7000, sunPower: 0.08, skyTop: "#1a2236", skyHorizon: "#3a4458", ambient: 0.14, haze: "#2f3648", visibility: 260, wet: 1, snow: 0, night: 1, cloud: 0.9, white: 3600 },
  rain: { sunElevation: 30, sunAzimuth: -30, sunKelvin: 6500, sunPower: 0.15, skyTop: "#717b85", skyHorizon: "#aeb2b2", ambient: 0.75, haze: "#9da3a6", visibility: 500, wet: 1, snow: 0, night: 0.35, cloud: 0.9 },
  overcast: { sunElevation: 35, sunAzimuth: -40, sunKelvin: 6500, sunPower: 0.35, skyTop: "#9aa5ae", skyHorizon: "#d6d6d0", ambient: 1.1, haze: "#c9cbc8", visibility: 900, wet: 0.15, snow: 0, night: 0, cloud: 0.8 },
  winter: { sunElevation: 14, sunAzimuth: -55, sunKelvin: 3800, sunPower: 2.6, skyTop: "#7aa0cc", skyHorizon: "#efe4d6", ambient: 1.2, haze: "#dfe3e8", visibility: 1200, wet: 0, snow: 1, night: 0.2, cloud: 0.4 },
  "interior-day": { sunElevation: 28, sunAzimuth: -60, sunKelvin: 4800, sunPower: 4.2, skyTop: "#7aa0cc", skyHorizon: "#f1e9d8", ambient: 0.32, haze: "#e8dfcf", visibility: 3000, wet: 0, snow: 0, night: 0, cloud: 0.3 },
  // a model-maker's studio: a warm golden key from the front left, a warm rim from behind right, a parchment cove for fill
  studio: { sunElevation: 30, sunAzimuth: -48, sunKelvin: 3900, sunPower: 2.4, skyTop: "#dcd6cc", skyHorizon: "#f0ebe2", ambient: 1.25, haze: "#efe6d3", visibility: 1e6, wet: 0, snow: 0, night: 0, cloud: 0, rim: [24, 150, 3000, 1.6] },
  candle: { sunElevation: 10, sunAzimuth: -60, sunKelvin: 3000, sunPower: 0.05, skyTop: "#1b2540", skyHorizon: "#3a4766", ambient: 0.07, haze: "#3b3030", visibility: 3000, wet: 0, snow: 0, night: 1, cloud: 0.3, white: 2500 },
};

/** A scene ready to paint. */
export interface ArchScene {
  root: Node;
  surfaces: readonly SurfaceSpec[];
  camera: CameraSpec;
  mood: MoodId | Mood;
  lights?: readonly PointLight[];
  canopies?: readonly Canopy[];
  portals?: readonly Portal[];
  ivy?: readonly IvyPatch[];
  /** Flat ground zones (the highest zone that covers a point wins). */
  grounds?: readonly GroundZone[];
  /** Dust in the air of a room (sun shafts) 0–1. */
  dust?: number;
  /** A closed room: sky light enters only through its windows (`portals`), falling off with distance, so corners away from them stay dark. */
  interior?: boolean;
  /** Far plane, metres. */
  far?: number;
  seed?: number;
}

export interface PaintOptions {
  width?: number; height?: number; supersample?: number;
  /** Override the scene's mood. */
  mood?: MoodId;
  /** 0 a plain render … 1 the full watercolour treatment. */
  paint?: number;
  /** Ink line strength 0–1. */
  ink?: number;
  /** Draft quality (fewer shadow and AO samples). */
  draft?: boolean;
}

// ---- Colour helpers ------------------------------------------------------------------------------------------------------------

/** Linear RGB of a black body at `k` kelvin, normalised to unit luminance (after Tanner Helland's fit to CIE data). */
export function kelvinRgb(k: number): [number, number, number] {
  const t = k / 100;
  const r = t <= 66 ? 255 : 329.698727446 * Math.pow(t - 60, -0.1332047592);
  const g = t <= 66 ? 99.4708025861 * Math.log(t) - 161.1195681661 : 288.1221695283 * Math.pow(t - 60, -0.0755148492);
  const b = t >= 66 ? 255 : t <= 19 ? 0 : 138.5177312231 * Math.log(t - 10) - 305.0447927307;
  const lin = (c: number) => { const v = Math.min(255, Math.max(0, c)) / 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  const R = lin(r), G = lin(g), B = lin(b), Y = 0.2126 * R + 0.7152 * G + 0.0722 * B;
  return [R / Y, G / Y, B / Y];
}
const sst = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// ---- The painter --------------------------------------------------------------------------------------------------------------

export interface ArchPaintResult { width: number; height: number; rgba: Uint8ClampedArray; ms: number; meta: { steps: number; hits: number } }

/** Render and paint a scene. */
export function paintArchScene(scene: ArchScene, o: PaintOptions = {}): ArchPaintResult {
  const t0 = typeof performance !== "undefined" ? performance.now() : Date.now();
  const W = o.width ?? 640, H = o.height ?? 360, SS = Math.max(1, Math.round(o.supersample ?? 1)), w = W * SS, h = H * SS, n = w * h;
  const mood: Mood = typeof scene.mood === "string" ? MOODS[o.mood ?? scene.mood] : o.mood ? MOODS[o.mood] : scene.mood;
  const draft = !!o.draft, seed = scene.seed ?? 1, far = scene.far ?? 600;
  const root = scene.root, sdf = root.f;
  const surfaces = scene.surfaces, fns: SurfFn[] = surfaces.map((s, k) => surfaceFn(s, seed * 31 + k * 7));
  const canopies = scene.canopies ?? [], portals = scene.portals ?? [], ivy = scene.ivy ?? [];
  const frames = sceneFrames();

  // sun and sky
  const se = (mood.sunElevation * Math.PI) / 180, sa = (mood.sunAzimuth * Math.PI) / 180;
  const Lx = Math.sin(sa) * Math.cos(se), Ly = Math.sin(se), Lz = Math.cos(sa) * Math.cos(se);
  const sunK = kelvinRgb(mood.sunKelvin), sunP = mood.sunPower * sst(-0.06, 0.08, Ly);
  const sunC = [sunK[0] * sunP, sunK[1] * sunP, sunK[2] * sunP];
  const skyTop = linearOf(mood.skyTop), skyHor = linearOf(mood.skyHorizon), haze = linearOf(mood.haze);
  const amb = mood.ambient, wet = mood.wet, snow = mood.snow, night = mood.night;
  // lamps burn at dusk and night; by day they are out
  const lampOn = sst(0.2, 0.7, night);
  const lights = (scene.lights ?? []).map(l => ({ ...l, power: l.lamp ? l.power * lampOn : l.power })).filter(l => l.power > 0.01);
  const lightC = lights.map(l => { const c = kelvinRgb(l.kelvin); return [c[0] * l.power, c[1] * l.power, c[2] * l.power]; });
  const grounds = scene.grounds ?? [];
  const rim = mood.rim, rimC = rim ? kelvinRgb(rim[2]).map(c => c * rim[3]) : null;
  const rimD = rim ? [Math.sin((rim[1] * Math.PI) / 180) * Math.cos((rim[0] * Math.PI) / 180), Math.sin((rim[0] * Math.PI) / 180), Math.cos((rim[1] * Math.PI) / 180) * Math.cos((rim[0] * Math.PI) / 180)] : [0, 1, 0];

  const sky = (dx: number, dy: number, dz: number, out: Float32Array, k: number) => {
    const up = Math.max(0, dy), tH = Math.pow(1 - up, 2.4);
    let r = skyTop[0] + (skyHor[0] - skyTop[0]) * tH, g = skyTop[1] + (skyHor[1] - skyTop[1]) * tH, b = skyTop[2] + (skyHor[2] - skyTop[2]) * tH;
    // painted clouds: soft washes on a plane overhead, fading to the horizon
    if (dy > 0.01 && mood.cloud > 0) {
      const px = dx / (dy + 0.08), pz = dz / (dy + 0.08), c = fbm(seed + 91, px * 0.9, pz * 0.9 + 3, 5) * 0.5 + 0.5, c2 = fbm(seed + 97, px * 2.4, pz * 2.4, 3);
      const cov = sst(1 - mood.cloud * 0.8, 1.02 - mood.cloud * 0.5, c + c2 * 0.15) * sst(0.0, 0.18, dy);
      // a cloud is lit on its sun side and shaded below: brighter than the sky near its top, greyer beneath
      const lit = 0.82 + 0.4 * (c2 * 0.5 + 0.5), under = sst(0.2, -0.3, c2) * 0.25;
      const cr = (skyHor[0] * 1.1 + sunK[0] * 0.1) * lit * (1 - under), cg = (skyHor[1] * 1.08 + sunK[1] * 0.1) * lit * (1 - under), cb = (skyHor[2] * 1.05 + sunK[2] * 0.08) * lit * (1 - under * 0.6);
      r += (cr - r) * cov * 0.85; g += (cg - g) * cov * 0.85; b += (cb - b) * cov * 0.85;
    }
    // the sun's glow
    const cs = dx * Lx + dy * Ly + dz * Lz, glow = Math.pow(Math.max(0, cs), 18) * 0.5 * sunP + Math.pow(Math.max(0, cs), 3) * 0.12 * sunP;
    out[k] = r + sunK[0] * glow; out[k + 1] = g + sunK[1] * glow; out[k + 2] = b + sunK[2] * glow;
  };

  // camera
  const cam = scene.camera, yaw = ((cam.yaw ?? 0) * Math.PI) / 180, pitch = ((cam.pitch ?? 0) * Math.PI) / 180, fov = ((cam.fov ?? 60) * Math.PI) / 180;
  const fx = Math.sin(yaw) * Math.cos(pitch), fy = Math.sin(pitch), fz = -Math.cos(yaw) * Math.cos(pitch);
  const rx = Math.cos(yaw), rz = Math.sin(yaw);
  const ux = -Math.sin(yaw) * Math.sin(pitch) * 1, uy = Math.cos(pitch), uz = Math.cos(yaw) * Math.sin(pitch);
  const tanH = Math.tan(fov / 2), aspect = h / w, shift = cam.shift ?? 0;

  // G-buffer
  const col = new Float32Array(n * 3), depth = new Float32Array(n), nrm = new Float32Array(n * 3), ids = new Float32Array(n), sunVis = new Float32Array(n), emis = new Float32Array(n);
  const so = newSurfOut(), si: SurfIn = { tone: 0, fw: 0.01, ny: 0, y: 0, seed, wx: 0, wy: 0, wz: 0 };
  const so2 = newSurfOut();
  let steps = 0, hits = 0;

  const march = (ox: number, oy: number, oz: number, dx: number, dy: number, dz: number, tMax: number, maxSteps: number): number => {
    let t = 0.02;
    for (let i = 0; i < maxSteps; i++) {
      const d = sdf(ox + dx * t, oy + dy * t, oz + dz * t);
      if (d < 0.0005 + t * 0.0006) return t;
      t += d * 0.92;
      if (t > tMax) return -1;
    }
    steps += maxSteps;
    return -1;
  };
  /** The nearest ground zone along a ray: its t and index (−1 if none before tMax). */
  let gzHit = -1;
  const groundT = (ox: number, oy: number, oz: number, dx: number, dy: number, dz: number, tMax: number): number => {
    let best = tMax; gzHit = -1;
    if (Math.abs(dy) < 1e-6) return -1;
    for (let k = 0; k < grounds.length; k++) {
      const g = grounds[k], t = (g.y - oy) / dy;
      if (t <= 0.01 || t >= best) continue;
      const x = ox + dx * t, z = oz + dz * t;
      if (x < g.x0 || x > g.x1 || z < g.z0 || z > g.z1) continue;
      // a later zone over this point (a canal, a street, a pond) replaces this one there
      let covered = false;
      for (let j = k + 1; j < grounds.length; j++) { const q = grounds[j]; if (x >= q.x0 && x <= q.x1 && z >= q.z0 && z <= q.z1) { covered = true; break; } }
      if (covered) continue;
      best = t; gzHit = k;
    }
    return gzHit >= 0 ? best : -1;
  };
  /** Trace a ray against the parts and the ground: t, and the ground zone hit (−1 for a part). */
  let traceZone = -1;
  const trace = (ox: number, oy: number, oz: number, dx: number, dy: number, dz: number, tMax: number, maxSteps: number): number => {
    const tg = groundT(ox, oy, oz, dx, dy, dz, tMax), zone = gzHit;
    const ts = march(ox, oy, oz, dx, dy, dz, tg > 0 ? tg : tMax, maxSteps);
    if (ts > 0) { traceZone = -1; return ts; }
    traceZone = zone;
    return tg;
  };
  const softShadow = (px: number, py: number, pz: number, dx: number, dy: number, dz: number, tMax: number, k: number, maxSteps: number): number => {
    // the classic penumbra estimate (k·h/t): robust where distances are only bounds (cut openings, leaning frames)
    let res = 1, t = 0.04;
    for (let i = 0; i < maxSteps && t < tMax; i++) {
      const hh = sdf(px + dx * t, py + dy * t, pz + dz * t);
      if (hh < 0.0008) return 0;
      res = Math.min(res, (k * hh) / t);
      t += Math.min(Math.max(hh * 0.9, 0.015), 4);
    }
    const r = Math.max(0, Math.min(1, res));
    return r * r * (3 - 2 * r);
  };
  const ao = (px: number, py: number, pz: number, nx: number, ny: number, nz: number): number => {
    let occ = 0, sc = 1;
    const N = draft ? 3 : 5;
    for (let i = 0; i < N; i++) {
      const hh = 0.03 + 0.42 * (i / (N - 1)) ** 1.6 * 2.4;
      const d = sdf(px + nx * hh, py + ny * hh, pz + nz * hh);
      occ += (hh - d) * sc; sc *= 0.72;
    }
    return Math.max(0, Math.min(1, 1 - 0.9 * occ));
  };
  /** Height of the ground below a point (the highest zone covering it). */
  const groundBelow = (x: number, z: number): number => {
    for (let k = grounds.length - 1; k >= 0; k--) { const g = grounds[k]; if (x >= g.x0 && x <= g.x1 && z >= g.z0 && z <= g.z1) return g.y; }
    return 0;
  };
  /** Dapples: sunlight through any canopy above the point. */
  const cookie = (px: number, py: number, pz: number): number => {
    let tr = 1;
    for (const c of canopies) {
      if (py > c.y || Ly <= 0.01) continue;
      const t = (c.y - py) / Ly, qx = px + Lx * t - c.x, qz = pz + Lz * t - c.z, r = Math.hypot(qx, qz);
      if (r > c.r) continue;
      const edge = sst(c.r, c.r * 0.7, r), leaf = fbm(seed + 51, qx * 1.6, qz * 1.6, 3) * 0.5 + 0.5 + 0.3 * (gradNoise(seed + 53, qx * 5, qz * 5));
      const block = sst(0.38, 0.5, leaf) * (c.density ?? 0.85);
      tr *= 1 - block * edge;
    }
    return tr;
  };

  /** Shade a hit for a reflection: albedo under sun and sky, no shadows (keeps reflections cheap). */
  const shadeSimple = (px: number, py: number, pz: number, out: number[], zone: number) => {
    let nx = 0, ny = 1, nz = 0, hit: { mat: number; tone: number; frame: number; wrap: number };
    if (zone >= 0) hit = { mat: grounds[zone].mat, tone: 0, frame: 0, wrap: -1 };
    else {
      const e = 0.004, d0 = sdf(px, py, pz);
      const gx = sdf(px + e, py, pz) - d0, gy = sdf(px, py + e, pz) - d0, gz = sdf(px, py, pz + e) - d0, gl = Math.hypot(gx, gy, gz) || 1;
      nx = gx / gl; ny = gy / gl; nz = gz / gl;
      sdf(px, py, pz);
      hit = queryHit();
    }
    const [lx, ly, lz] = toLocal(hit.frame, px, py, pz), [lnx, lny, lnz] = dirToLocal(hit.frame, nx, ny, nz);
    const [u, v] = uvOf(lx, ly, lz, lnx, lny, lnz, hit.wrap);
    si.tone = hit.tone; si.fw = 0.05; si.ny = ny; si.y = ly; si.wx = px; si.wy = py; si.wz = pz;
    const fn = fns[hit.mat] ?? fns[0];
    fn(u, v, si, so2);
    const diff = Math.max(0, nx * Lx + ny * Ly + nz * Lz);
    let r = so2.r * (sunC[0] * diff + amb * (skyTop[0] * 0.5 + skyHor[0] * 0.5)) + so2.er, g = so2.g * (sunC[1] * diff + amb * (skyTop[1] * 0.5 + skyHor[1] * 0.5)) + so2.eg, b = so2.b * (sunC[2] * diff + amb * (skyTop[2] * 0.5 + skyHor[2] * 0.5)) + so2.eb;
    if (so2.glass > 0 && night > 0) { const lit = hash2(seed, Math.floor(hit.tone * 997), 3) > 0.35 ? 1 : 0; const gk = kelvinRgb(2200); r += gk[0] * 0.4 * night * lit; g += gk[1] * 0.4 * night * lit; b += gk[2] * 0.4 * night * lit; }
    for (let k = 0; k < lights.length; k++) {
      const L = lights[k], ddx = L.x - px, ddy = L.y - py, ddz = L.z - pz, d2 = ddx * ddx + ddy * ddy + ddz * ddz, dl = Math.sqrt(d2), nl = Math.max(0, (nx * ddx + ny * ddy + nz * ddz) / dl) * 0.8 + 0.2;
      const f = nl / (d2 + 0.3);
      r += so2.r * lightC[k][0] * f; g += so2.g * lightC[k][1] * f; b += so2.b * lightC[k][2] * f;
    }
    out[0] = r; out[1] = g; out[2] = b;
  };
  const tmp3 = [0, 0, 0], skyTmp = new Float32Array(3);

  for (let py = 0; py < h; py++) {
    for (let px = 0; px < w; px++) {
      const i = py * w + px, k3 = i * 3;
      const sx = ((2 * (px + 0.5)) / w - 1) * tanH, sy = ((1 - (2 * (py + 0.5)) / h) * aspect + shift * aspect) * tanH;
      let dx = fx + rx * sx + ux * sy, dy = fy + uy * sy, dz = fz + rz * sx + uz * sy;
      const dl = Math.hypot(dx, dy, dz); dx /= dl; dy /= dl; dz /= dl;
      const t = trace(cam.x, cam.y, cam.z, dx, dy, dz, far, 220), zoneHit = traceZone;
      if (t < 0) {
        sky(dx, dy, dz, col, k3);
        depth[i] = far * 2; ids[i] = -1; sunVis[i] = 1; nrm[k3] = 0; nrm[k3 + 1] = 0; nrm[k3 + 2] = 1;
        addGlow(i, dx, dy, dz, far);
        continue;
      }
      hits++;
      const hx = cam.x + dx * t, hy = cam.y + dy * t, hz = cam.z + dz * t;
      let nx = 0, ny = 1, nz = 0, hit: { mat: number; tone: number; frame: number; wrap: number };
      if (zoneHit >= 0) hit = { mat: grounds[zoneHit].mat, tone: 0, frame: 0, wrap: -1 };
      else {
        // normal (tetrahedron)
        const e = Math.max(0.0008, t * 0.0003);
        const a1 = sdf(hx + e, hy - e, hz - e), a2 = sdf(hx - e, hy - e, hz + e), a3 = sdf(hx - e, hy + e, hz - e), a4 = sdf(hx + e, hy + e, hz + e);
        nx = a1 - a2 - a3 + a4; ny = -a1 - a2 + a3 + a4; nz = -a1 + a2 - a3 + a4;
        const nl = Math.hypot(nx, ny, nz) || 1; nx /= nl; ny /= nl; nz /= nl;
        // the surface at the hit
        sdf(hx, hy, hz);
        hit = queryHit();
      }
      const spec = surfaces[hit.mat] ?? surfaces[0], fn = fns[hit.mat] ?? fns[0];
      const [lx, ly, lz] = toLocal(hit.frame, hx, hy, hz), [lnx, lny, lnz] = dirToLocal(hit.frame, nx, ny, nz);
      const [u, v, tu, tv] = uvOf(lx, ly, lz, lnx, lny, lnz, hit.wrap);
      const fw = (t * tanH * 2) / w;
      si.tone = hit.tone; si.fw = fw; si.ny = ny; si.y = ly; si.wx = hx; si.wy = hy; si.wz = hz;
      fn(u, v, si, so);
      const h0 = so.h;
      // overlays: soot, ivy, snow
      if (spec.soot) sootOver(so, ly, spec.soot, u, seed);
      if (ivy.length && Math.abs(ny) < 0.5) for (const p of ivy) {
        const along = p.axis === "x" ? hz - p.z : hx - p.x, off = p.axis === "x" ? Math.abs(hx - p.x) : Math.abs(hz - p.z);
        if (off > 1.5) continue;
        const yy = hy - (p.y0 ?? 0), rr = Math.hypot(along / (p.w / 2), Math.max(0, yy - p.h * 0.15) / (p.h * 0.85)) + 0.25 * fbm(seed + 61, along * 0.9, yy * 0.9, 3) - (yy < 0 ? -1 : 0);
        if (rr < 1.3 && yy > -0.1) ivyOver(so, u, v, rr - 0.55, seed);
      }
      // bump: relief differences across the face, in the building's own axes, then turned to the world
      let bnx = nx, bny = ny, bnz = nz;
      if (!draft || t < 40) {
        const du = Math.max(0.004, fw * 0.8);
        fn(u + du, v, si, so2); const hu = so2.h;
        fn(u, v + du, si, so2); const hv = so2.h;
        const gu = (hu - h0) / du, gv = (hv - h0) / du;
        let qx = lnx - (gu * tu[0] + gv * tv[0]), qy = lny - (gu * tu[1] + gv * tv[1]), qz = lnz - (gu * tu[2] + gv * tv[2]);
        const bl = Math.hypot(qx, qy, qz) || 1; qx /= bl; qy /= bl; qz /= bl;
        const fr = frames[hit.frame];
        if (fr && fr.yaw) { const a = (fr.yaw * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a); bnx = qx * c - qz * s; bny = qy; bnz = qx * s + qz * c; }
        else { bnx = qx; bny = qy; bnz = qz; }
      }
      let ar = so.r, ag = so.g, ab = so.b, rough = so.rough, spw = so.spec;
      // snow on what faces up
      if (snow > 0 && ny > 0.45) { const sn = sst(0.45, 0.75, ny + 0.15 * fbm(seed + 71, hx * 1.3, hz * 1.3, 3)) * snow; ar += (0.86 - ar) * sn; ag += (0.88 - ag) * sn; ab += (0.92 - ab) * sn; rough = rough * (1 - sn) + 0.6 * sn; spw = spw * (1 - sn) + 0.06 * sn; }
      // wet: porous surfaces darken; what faces up gathers water and turns to a mirror in puddles
      let mirror = 0;
      if (wet > 0) {
        const dk = 1 - 0.45 * so.porous * wet; ar *= dk; ag *= dk; ab *= dk;
        if (ny > 0.6) { const pud = sst(0.1, 0.3, fbm(seed + 81, hx * 0.35, hz * 0.35, 4) - (1 - so.cav) * 0.4 - so.h * 4) * wet; mirror = Math.max(pud, 0.3 * wet * so.porous); }
        else if (ny > 0.15) mirror = 0.25 * wet;
        rough *= 1 - 0.6 * wet;
      }
      // light: sun
      let vis = 0;
      const diff = bnx * Lx + bny * Ly + bnz * Lz;
      if (sunP > 0.01 && nx * Lx + ny * Ly + nz * Lz > -0.05) {
        vis = softShadow(hx + nx * 0.004, hy + ny * 0.004, hz + nz * 0.004, Lx, Ly, Lz, 120, 14, draft ? 32 : 72);
        if (canopies.length && vis > 0) vis *= cookie(hx, hy, hz);
      }
      let occ = ao(hx, hy, hz, nx, ny, nz) * (0.55 + 0.45 * so.cav);
      // where a wall meets the ground the sky is half hidden: contact shadow
      if (zoneHit < 0 && ny < 0.5 && grounds.length) { const gy = hy - groundBelow(hx, hz); occ *= 1 - 0.45 * Math.exp(-Math.max(0, gy) * 3.2) * (1 - Math.max(0, ny)); }
      const dsun = Math.max(0, diff) * vis;
      // sky: brighter from above; ground bounce warm from below
      let windowLight = 1;
      if (scene.interior) {
        // sky light through each window: its area, seen at an angle, over the square of the distance
        let wf = 0;
        for (const p of portals) { const vx = p.x - hx, vy = p.y - hy, vz = p.z - hz, d2 = vx * vx + vy * vy + vz * vz + 0.3, dl = Math.sqrt(d2), cs = Math.max(0, (bnx * vx + bny * vy + bnz * vz) / dl) * 0.8 + 0.2, cp = Math.abs(p.axis === "z" ? vz : vx) / dl; wf += (4 * p.hw * p.hh * cs * cp) / (Math.PI * d2); }
        windowLight = Math.min(1.2, 0.08 + wf * 5);
      }
      const skyK = amb * occ * (0.55 + 0.45 * bny) * windowLight, bounce = amb * occ * 0.35 * Math.max(0, -bny + 0.25) * sunP * 0.3;
      const skyR = skyTop[0] * 0.55 + skyHor[0] * 0.45, skyG = skyTop[1] * 0.55 + skyHor[1] * 0.45, skyB = skyTop[2] * 0.55 + skyHor[2] * 0.45;
      let lr = sunC[0] * dsun + skyR * skyK + 0.55 * bounce, lg = sunC[1] * dsun + skyG * skyK + 0.45 * bounce, lb = sunC[2] * dsun + skyB * skyK + 0.32 * bounce;
      // the rim light: catches edges that turn away from the camera, as a back light does in a studio
      if (rimC) { const nd = bnx * rimD[0] + bny * rimD[1] + bnz * rimD[2]; if (nd > 0) { const edge = 0.35 + 0.65 * Math.pow(1 - Math.max(0, -(dx * bnx + dy * bny + dz * bnz)), 2); const f = nd * edge * (0.5 + 0.5 * occ); lr += rimC[0] * f; lg += rimC[1] * f; lb += rimC[2] * f; } }
      // lamps, candles, fires
      for (let k = 0; k < lights.length; k++) {
        const L = lights[k], ddx = L.x - hx, ddy = L.y - hy, ddz = L.z - hz, d2 = ddx * ddx + ddy * ddy + ddz * ddz, dl2 = Math.sqrt(d2);
        const nd = (bnx * ddx + bny * ddy + bnz * ddz) / dl2;
        if (nd <= 0) continue;
        let f = nd / (d2 + 0.15);
        if (f * L.power < 0.002) continue;
        if (L.shadow && !draft) f *= softShadow(hx + nx * 0.01, hy + ny * 0.01, hz + nz * 0.01, ddx / dl2, ddy / dl2, ddz / dl2, dl2 - 0.15, 14, 32);
        f *= 0.4 + 0.6 * occ;
        lr += lightC[k][0] * f; lg += lightC[k][1] * f; lb += lightC[k][2] * f;
      }
      let cr = ar * lr + so.er, cg = ag * lg + so.eg, cb = ab * lb + so.eb;
      // speculars and reflections: glass, wet, water, metal
      const vdn = -(dx * bnx + dy * bny + dz * bnz), fres = 0.04 + 0.96 * Math.pow(1 - Math.max(0, vdn), 5);
      let refl = (so.glass > 0 ? so.glass * (0.08 + 0.92 * fres) : 0) + mirror * (0.15 + 0.85 * fres) + spw * fres * (1 - rough) * 0.5;
      if (so.metal > 0) refl = Math.max(refl, so.metal * (0.5 + 0.5 * fres) * (1 - rough * 0.6));
      if (refl > 0.02) {
        const rdx = dx + 2 * vdn * bnx, rdy = dy + 2 * vdn * bny, rdz = dz + 2 * vdn * bnz;
        let rr: number, rg: number, rb: number;
        const tr = !draft && (mirror > 0.2 || so.glass > 0.3) ? trace(hx + nx * 0.01, hy + ny * 0.01, hz + nz * 0.01, rdx, rdy, rdz, 80, 90) : -1;
        if (tr > 0) { shadeSimple(hx + rdx * tr, hy + rdy * tr, hz + rdz * tr, tmp3, traceZone); rr = tmp3[0]; rg = tmp3[1]; rb = tmp3[2]; }
        else { sky(rdx, Math.max(0.02, rdy), rdz, skyTmp, 0); rr = skyTmp[0]; rg = skyTmp[1]; rb = skyTmp[2]; }
        // lamps glint in reflections, stretched on wet ground
        for (let k = 0; k < lights.length; k++) {
          const L = lights[k], ddx = L.x - hx, ddy = L.y - hy, ddz = L.z - hz, dl2 = Math.hypot(ddx, ddy, ddz);
          const c = (rdx * ddx + rdy * ddy + rdz * ddz) / dl2, sharp = mirror > 0.2 ? 60 : 300;
          const gl = Math.pow(Math.max(0, c), sharp) * 1.6 / (1 + dl2 * 0.05);
          rr += lightC[k][0] * gl; rg += lightC[k][1] * gl; rb += lightC[k][2] * gl;
        }
        const tintK = so.metal > 0 ? 1 : 0;
        const mr = tintK ? ar : 1, mg = tintK ? ag : 1, mb = tintK ? ab : 1;
        const kk = Math.min(1, refl);
        cr = cr * (1 - kk * 0.85) + rr * mr * kk; cg = cg * (1 - kk * 0.85) + rg * mg * kk; cb = cb * (1 - kk * 0.85) + rb * mb * kk;
      }
      // clear glass: what lies behind shows through (plants in a glasshouse)
      if (so.clear > 0 && !draft) {
        const tb = trace(hx + dx * 0.06, hy + dy * 0.06, hz + dz * 0.06, dx, dy, dz, 60, 120);
        if (tb > 0) { shadeSimple(hx + dx * (tb + 0.06), hy + dy * (tb + 0.06), hz + dz * (tb + 0.06), tmp3, traceZone); }
        else { sky(dx, dy, dz, skyTmp, 0); tmp3[0] = skyTmp[0]; tmp3[1] = skyTmp[1]; tmp3[2] = skyTmp[2]; }
        const kc = so.clear * (1 - fres);
        cr = cr * (1 - kc) + tmp3[0] * kc * 0.85; cg = cg * (1 - kc) + tmp3[1] * kc * 0.88; cb = cb * (1 - kc) + tmp3[2] * kc * 0.86;
      }
      // sun highlight
      if (dsun > 0 && spw > 0.02) {
        const hxv = Lx - dx, hyv = Ly - dy, hzv = Lz - dz, hl = Math.hypot(hxv, hyv, hzv) || 1, nh = Math.max(0, (bnx * hxv + bny * hyv + bnz * hzv) / hl);
        const sp = Math.pow(nh, 2 + 200 * (1 - rough) ** 2) * spw * (1 - rough * 0.7) * vis * 2;
        cr += sunC[0] * sp; cg += sunC[1] * sp; cb += sunC[2] * sp;
      }
      // lit windows at dusk and night: warm light behind the glass
      if (so.glass > 0 && night > 0) {
        const lit = hash2(seed, Math.floor(hit.tone * 997), 3) > 0.3 ? 1 : 0.08, gk = kelvinRgb(2100), flick = 0.8 + 0.2 * fbm(seed + 5, hx * 2, hy * 2, 2);
        const em = 0.45 * night * lit * flick * so.glass;
        cr += gk[0] * em; cg += gk[1] * em; cb += gk[2] * em; emis[i] = em;
      }
      if (so.er + so.eg > 0.3) emis[i] = Math.max(emis[i], (so.er + so.eg) * 0.3);
      // sun shafts through room windows
      if (portals.length && sunP > 0.05) {
        const N = draft ? 10 : 22, dust = scene.dust ?? 0.5;
        let acc = 0;
        for (let s = 0; s < N; s++) {
          const ts = (t * (s + hash2(seed, px, py * 7 + s))) / N, qx = cam.x + dx * ts, qy = cam.y + dy * ts, qz = cam.z + dz * ts;
          for (const p of portals) {
            const nrmD = p.axis === "z" ? Lz : Lx; if (Math.abs(nrmD) < 0.01) continue;
            const tt = ((p.axis === "z" ? p.z - qz : p.x - qx)) / nrmD; if (tt <= 0) continue;
            const cx2 = qx + Lx * tt - p.x, cy2 = qy + Ly * tt - p.y, cz2 = qz + Lz * tt - p.z, a = p.axis === "z" ? cx2 : cz2;
            if (Math.abs(a) < p.hw && Math.abs(cy2) < p.hh) { const mote = hash2(seed + 9, Math.floor(qx * 40), Math.floor(qy * 40) + Math.floor(qz * 40) * 77) > 0.997 ? 6 : 1; acc += mote; break; }
          }
        }
        const sh = (acc / N) * dust * 0.09 * t * 0.25;
        cr += sunC[0] * sh; cg += sunC[1] * sh; cb += sunC[2] * sh;
      }
      // the air between: aerial perspective
      const fog = 1 - Math.exp(-t / mood.visibility);
      cr += (haze[0] * (0.6 + 0.4 * amb) - cr) * fog; cg += (haze[1] * (0.6 + 0.4 * amb) - cg) * fog; cb += (haze[2] * (0.6 + 0.4 * amb) - cb) * fog;
      col[k3] = cr; col[k3 + 1] = cg; col[k3 + 2] = cb;
      depth[i] = t; nrm[k3] = nx; nrm[k3 + 1] = ny; nrm[k3 + 2] = nz;
      ids[i] = hit.mat * 4096 + (hit.frame % 4096);
      sunVis[i] = sunP > 0.05 ? vis * Math.max(0, Math.min(1, diff * 3)) : 0.5;
      addGlow(i, dx, dy, dz, t);
    }
  }

  /** Lamps glow in the air along the ray (single scattering near each light). */
  function addGlow(i: number, dx: number, dy: number, dz: number, t: number) {
    if (!lights.length) return;
    const k3 = i * 3;
    for (let k = 0; k < lights.length; k++) {
      const L = lights[k], ox = L.x - cam.x, oy = L.y - cam.y, oz = L.z - cam.z, along = ox * dx + oy * dy + oz * dz;
      if (along < 0 || along > t + 0.3) continue;
      const px2 = ox - dx * along, py2 = oy - dy * along, pz2 = oz - dz * along, d2 = px2 * px2 + py2 * py2 + pz2 * pz2;
      const g = (L.power * 0.012) / (d2 + 0.02) * (1 + wet * 1.5 + night * 0.5);
      col[k3] += lightC[k][0] / L.power * g; col[k3 + 1] += lightC[k][1] / L.power * g; col[k3 + 2] += lightC[k][2] / L.power * g;
      emis[i] = Math.max(emis[i], g * 0.5);
    }
  }

  // ---- Paint ----------------------------------------------------------------------------------------------------------------
  if (mood.white) {
    // partial white balance: keep a little warmth, as a painter keeps candlelight golden but not orange
    const wb = kelvinRgb(mood.white), k0 = 0.75 / wb[0], k1 = 0.75 / wb[1], k2 = 0.75 / wb[2];
    for (let i = 0; i < n; i++) { col[i * 3] *= 0.25 + k0; col[i * 3 + 1] *= 0.25 + k1; col[i * 3 + 2] *= 0.25 + k2; }
  }
  const out = paintPass({ w, h, col, depth, nrm, ids, sunVis, emis }, { paint: o.paint ?? 1, ink: o.ink ?? 0.8, seed, night, SS, wet });
  const rgba = new Uint8ClampedArray(W * H * 4);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let r = 0, g = 0, b = 0;
    for (let j = 0; j < SS; j++) for (let i2 = 0; i2 < SS; i2++) { const q = ((y * SS + j) * w + x * SS + i2) * 3; r += out[q]; g += out[q + 1]; b += out[q + 2]; }
    const k = (y * W + x) * 4, inv = 1 / (SS * SS);
    rgba[k] = Math.round(Math.min(1, Math.max(0, r * inv)) * 255); rgba[k + 1] = Math.round(Math.min(1, Math.max(0, g * inv)) * 255); rgba[k + 2] = Math.round(Math.min(1, Math.max(0, b * inv)) * 255); rgba[k + 3] = 255;
  }
  return { width: W, height: H, rgba, ms: (typeof performance !== "undefined" ? performance.now() : Date.now()) - t0, meta: { steps, hits } };
}

/** Texture coordinates and world tangents at a hit (local point and normal; `wrap` ≥ 0 for round parts). */
function uvOf(lx: number, ly: number, lz: number, nx: number, ny: number, nz: number, wrap: number): [number, number, [number, number, number], [number, number, number]] {
  const any = Math.abs(ny);
  if (any > 0.9) return [lx, lz, [1, 0, 0], [0, 0, 1]];
  if (wrap >= 0) {
    const c = wrapCentres()[wrap];
    if (c) { const ax = lx - c.x, az = lz - c.z, r = Math.hypot(ax, az) || 1e-6, ang = Math.atan2(az, ax); const tx = -az / r, tz = ax / r; const vs = any > 0.25 ? 1 / Math.sqrt(1 - ny * ny) : 1; return [ang * r, ly * vs, [tx, 0, tz], [0, 1, 0]]; }
  }
  const hl = Math.hypot(nx, nz) || 1, tx = -nz / hl, tz = nx / hl;
  const u = lx * tx + lz * tz;
  if (any < 0.25) return [u, ly, [tx, 0, tz], [0, 1, 0]];
  // a roof slope: v is the distance up the slope
  const sp = Math.sqrt(1 - ny * ny), up: [number, number, number] = [-(nx / hl) * ny, sp, -(nz / hl) * ny];
  return [u, ly / sp, [tx, 0, tz], up];
}

// ---- The watercolour pass ---------------------------------------------------------------------------------------------------

interface GBuf { w: number; h: number; col: Float32Array; depth: Float32Array; nrm: Float32Array; ids: Float32Array; sunVis: Float32Array; emis: Float32Array }

function paintPass(g: GBuf, p: { paint: number; ink: number; seed: number; night: number; SS: number; wet: number }): Float32Array {
  const { w, h, depth, nrm, ids, sunVis, emis } = g, n = w * h, P = p.paint, SS = p.SS;
  // 1. exposure and a soft filmic curve: highlights roll off like paper white, never clip hard
  const disp = new Float32Array(n * 3);
  // meter the picture as a painter judges values: the lit surfaces set the key, the darkest darks stay transparent
  let sumLog = 0, cnt = 0;
  for (let i = 0; i < n; i += 3) { const L = 0.2126 * g.col[i * 3] + 0.7152 * g.col[i * 3 + 1] + 0.0722 * g.col[i * 3 + 2]; sumLog += Math.log(1e-4 + L); cnt++; }
  // ...but never so bright that the lights burn out: the brightest few per cent (windows, fire, sunlit stone) cap it, so a dark panelled room stays dark round its pools of light
  const lum: number[] = [];
  for (let i = 0; i < n; i += 7) lum.push(0.2126 * g.col[i * 3] + 0.7152 * g.col[i * 3 + 1] + 0.0722 * g.col[i * 3 + 2]);
  lum.sort((a, b2) => a - b2);
  const p97 = lum[Math.floor(lum.length * 0.97)] ?? 1, key = p.night > 0.5 ? 0.16 : 0.3, expo = Math.min(key / Math.exp(sumLog / Math.max(1, cnt)), 1.6 / Math.max(1e-4, p97));
  const lift = 0.45 * P * (1 - 0.6 * p.night);
  const curve = (x0: number) => { const x = x0 * expo, v = Math.max(0, x + lift * 0.06 * (1 - Math.min(1, x * 3))) * 0.92; const y = (v * (2.51 * v + 0.03)) / (v * (2.43 * v + 0.59) + 0.14); return Math.pow(Math.min(1, y), 1 / 2.2); };
  for (let i = 0; i < n * 3; i++) disp[i] = curve(g.col[i]);
  // specks: a lone far hit with sky nearly all round it is a grazing ray's noise, not detail; it takes the sky's colour
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const i = y * w + x;
    if (ids[i] < 0 || depth[i] < 60) continue;
    let sky = 0, r = 0, gg = 0, b = 0;
    for (let j = -1; j <= 1; j++) for (let k = -1; k <= 1; k++) { const q = i + j * w + k; if (q !== i && ids[q] < 0) { sky++; r += disp[q * 3]; gg += disp[q * 3 + 1]; b += disp[q * 3 + 2]; } }
    if (sky >= 5) { disp[i * 3] = r / sky; disp[i * 3 + 1] = gg / sky; disp[i * 3 + 2] = b / sky; ids[i] = -1; depth[i] = depth[i] * 4; }
  }
  if (P <= 0) return disp;

  // 2. washes: an edge-aware blur that stays inside each shape (same surface, near depth)
  const wash = new Float32Array(disp);
  const R = Math.max(1, Math.round(1.5 * SS));
  for (let pass = 0; pass < 2; pass++) {
    const src = pass === 0 ? disp : wash, dst = new Float32Array(n * 3);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x, id = ids[i], d0 = depth[i];
      let r = 0, gg = 0, b = 0, ws = 0;
      for (let j = -R; j <= R; j++) for (let k = -R; k <= R; k++) {
        const xx = x + k, yy = y + j; if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
        const q = yy * w + xx; if (ids[q] !== id) continue;
        if (Math.abs(depth[q] - d0) > d0 * 0.03 + 0.05) continue;
        const dc = Math.abs(src[q * 3] - src[i * 3]) + Math.abs(src[q * 3 + 1] - src[i * 3 + 1]) + Math.abs(src[q * 3 + 2] - src[i * 3 + 2]);
        const wt = Math.exp(-(k * k + j * j) / (R * R)) * Math.exp(-dc * dc * 18);
        r += src[q * 3] * wt; gg += src[q * 3 + 1] * wt; b += src[q * 3 + 2] * wt; ws += wt;
      }
      dst[i * 3] = r / ws; dst[i * 3 + 1] = gg / ws; dst[i * 3 + 2] = b / ws;
    }
    wash.set(dst);
  }
  const out = new Float32Array(n * 3), keep = 1 - 0.55 * P;
  for (let i = 0; i < n * 3; i++) out[i] = disp[i] * keep + wash[i] * (1 - keep);

  // 3. warm light, cool shadow: shadowed surfaces lean to violet-blue (lit by the sky), sunlit ones to cream
  const nightK = p.night;
  for (let i = 0; i < n; i++) {
    if (ids[i] < 0) continue;
    const s = sunVis[i], k = i * 3, L = 0.2126 * out[k] + 0.7152 * out[k + 1] + 0.0722 * out[k + 2];
    const sh = (1 - s) * (1 - nightK * 0.6) * P;
    out[k] += (-0.035 * sh + 0.03 * s * P) * (0.4 + L); out[k + 1] += (-0.01 * sh + 0.012 * s * P) * (0.4 + L); out[k + 2] += (0.05 * sh - 0.03 * s * P) * (0.4 + L);
    // gentle saturation in the mid-tones, as watercolour pigment reads richer than a photograph
    const m = (out[k] + out[k + 1] + out[k + 2]) / 3, sat = 1 + 0.2 * P * (1 - Math.abs(L - 0.5) * 2);
    out[k] = m + (out[k] - m) * sat; out[k + 1] = m + (out[k + 1] - m) * sat; out[k + 2] = m + (out[k + 2] - m) * sat;
  }

  // 4. edges: depth breaks (silhouettes), creases (normal turns), surface changes
  const edge = new Float32Array(n);
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const i = y * w + x, d0 = depth[i];
    let e = 0;
    for (const q of [i - 1, i + 1, i - w, i + w]) {
      const dq = depth[q];
      // the nearer side of a depth break carries the line
      if (dq > d0 * 1.03 + 0.04) e = Math.max(e, Math.min(1, ((dq - d0) / (d0 + 0.5)) * 12));
      if (ids[i] >= 0 && ids[q] >= 0) {
        const dn = 1 - (nrm[i * 3] * nrm[q * 3] + nrm[i * 3 + 1] * nrm[q * 3 + 1] + nrm[i * 3 + 2] * nrm[q * 3 + 2]);
        if (dn > 0.12) e = Math.max(e, Math.min(1, (dn - 0.12) * 2.5));
        if (ids[q] !== ids[i] && q > i) e = Math.max(e, 0.45);
      }
    }
    edge[i] = ids[i] < 0 ? 0 : e;
  }
  // pigment pools at the rim of each wash: a slight darkening just inside the edge
  const pool = new Float32Array(n);
  const RP = Math.max(1, Math.round(1.6 * SS));
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x; if (ids[i] < 0) continue;
    let near = 0;
    for (let j = -RP; j <= RP; j += 1) for (let k = -RP; k <= RP; k += 1) { const xx = x + k, yy = y + j; if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue; if (ids[yy * w + xx] !== ids[i]) { near = Math.max(near, 1 - Math.hypot(j, k) / (RP + 1)); } }
    pool[i] = near;
  }

  // 5. ink, pooling, granulation, paper
  const ink = [0.29, 0.2, 0.14], inkK = p.ink * P;
  const paper = [0.985, 0.968, 0.93];
  const blur = bloom(emis, w, h, Math.max(2, 5 * SS));
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x, k = i * 3;
    const fx = x / SS, fy = y / SS;
    // paper: a fine tooth and soft fibre clouds
    const tooth = fbm(p.seed + 101, fx * 0.45, fy * 0.45, 2), cloud = fbm(p.seed + 103, fx * 0.02, fy * 0.02, 3), fibre = gradNoise(p.seed + 107, fx * 0.08, fy * 0.9);
    const L = 0.2126 * out[k] + 0.7152 * out[k + 1] + 0.0722 * out[k + 2], dens = 1 - L;
    // granulation settles into the paper's tooth where pigment is dense (shadows)
    const gran = 1 - P * (0.09 * dens * (tooth * 0.5 + 0.5) + 0.025 * cloud * dens);
    // wet-in-wet: each wash varies a little in strength and temperature across its area, as pigment settles unevenly
    const bloomN = fbm(p.seed + 121, fx * 0.012, fy * 0.012, 3), drift = fbm(p.seed + 127, fx * 0.02 + 9, fy * 0.02, 2);
    const wv = 1 + P * 0.07 * bloomN * (ids[i] < 0 ? 0.5 : 1);
    let r = out[k] * gran * wv * (1 + P * 0.025 * drift), gg = out[k + 1] * gran * wv, b = out[k + 2] * gran * wv * (1 - P * 0.025 * drift);
    const pl = 1 - 0.08 * P * pool[i]; r *= pl; gg *= pl; b *= pl;
    // the ink line: thin, warm, broken where the pen lifted, a little stronger on the shadow side
    if (inkK > 0 && edge[i] > 0) {
      const lift = sst(-0.35, 0.25, fbm(p.seed + 111, fx * 0.035, fy * 0.035, 3)) * (0.55 + 0.45 * sst(0.1, 0.9, gradNoise(p.seed + 113, fx * 0.2, fy * 0.2) * 0.5 + 0.5));
      const far = sst(220, 60, depth[i]);
      const a = Math.min(1, edge[i]) * inkK * (0.35 + 0.65 * lift) * (0.55 + 0.45 * dens) * (1 - 0.5 * p.night) * far;
      r += (ink[0] * L * 0.9 - r) * a; gg += (ink[1] * L * 0.9 - gg) * a; b += (ink[2] * L * 0.9 - b) * a;
    }
    // lamp bloom
    const bl = blur[i] * 0.55;
    if (bl > 0) { r += bl * 1.0; gg += bl * 0.72; b += bl * 0.42; }
    // paper through the lights, fibre texture over everything
    const pk = 1 + P * (0.018 * fibre + 0.012 * tooth);
    r = (r * (1 - 0.06 * P) + 0.06 * P * paper[0] * L) * pk * (1 - P * 0.012 + P * 0.012 * paper[0]); gg = (gg * (1 - 0.06 * P) + 0.06 * P * paper[1] * L) * pk; b = (b * (1 - 0.06 * P) + 0.06 * P * paper[2] * L) * pk * (1 - 0.02 * P);
    // rain: thin slanting strokes of lighter air
    if (p.wet > 0.6) { const ru = fx * 0.9 + fy * 0.22, cell = Math.floor(ru / 3), off = (fy + hash2(p.seed + 131, cell, 0) * 400) % 37; if (hash2(p.seed + 137, cell, Math.floor((fy + hash2(p.seed + 139, cell, 1) * 400) / 37)) > 0.55 && off < 9 && Math.abs(ru - cell * 3 - 1.5) < 0.35) { const a = 0.16 * (p.wet - 0.6) * 2.5; r += (0.85 - r) * a; gg += (0.88 - gg) * a; b += (0.92 - b) * a; } }
    // a soft vignette, like the falloff at the edge of a painted plate
    const vx = x / w - 0.5, vy = y / h - 0.5, vig = 1 - P * 0.14 * Math.pow(vx * vx * 1.2 + vy * vy * 1.6, 1.4) * 4;
    out[k] = r * vig; out[k + 1] = gg * vig; out[k + 2] = b * vig;
  }
  return out;
}

/** Blur bright light for bloom (a box blur three times, close to a Gaussian). */
function bloom(src: Float32Array, w: number, h: number, r: number): Float32Array {
  const a = new Float32Array(src.length), b = new Float32Array(src.length);
  let any = false;
  for (let i = 0; i < src.length; i++) { a[i] = Math.max(0, src[i] - 0.15); if (a[i] > 0) any = true; }
  if (!any) return a;
  const line = new Float32Array(Math.max(w, h) + 1);
  for (let pass = 0; pass < 3; pass++) {
    for (let y = 0; y < h; y++) {
      line[0] = 0; for (let x = 0; x < w; x++) line[x + 1] = line[x] + a[y * w + x];
      for (let x = 0; x < w; x++) { const x0 = Math.max(0, x - r), x1 = Math.min(w, x + r + 1); b[y * w + x] = (line[x1] - line[x0]) / (2 * r + 1); }
    }
    for (let x = 0; x < w; x++) {
      line[0] = 0; for (let y = 0; y < h; y++) line[y + 1] = line[y] + b[y * w + x];
      for (let y = 0; y < h; y++) { const y0 = Math.max(0, y - r), y1 = Math.min(h, y + r + 1); a[y * w + x] = (line[y1] - line[y0]) / (2 * r + 1); }
    }
  }
  return a;
}
