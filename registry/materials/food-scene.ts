/**
 * FOOD1 still-life renderer: a table-top scene of food meshes (`food-mesh.ts`) rendered on the CPU like a food
 * photograph painted for a picture book.
 *
 * - **Camera.** A long lens (about 100 mm on full frame) looking down at the table from a set elevation, so plates
 *   read as ellipses and the far table falls out of focus.
 * - **Light.** A low warm sun behind the food (the golden-hour backlight food photographers use), a soft window
 *   round it, a white fill card in front (so the food is not a silhouette) and a dim room. Moods change these.
 * - **Shadows.** A shadow map from the sun, softened by the sun's size and the distance to the blocker (PCSS).
 * - **Ambient occlusion.** Screen-space, at two scales: crevices and contact with the table.
 * - **Surfaces.** Each part's surface function (`food-surfaces.ts`) gives albedo, roughness, micro-relief (bump by
 *   the surface gradient), subsurface mean free path, thin translucency, sheen, a clear coat and baked cavities.
 * - **Subsurface scattering.** Diffuse light spreads under the skin by each colour's mean free path (Jensen et al.
 *   2001 measured apple, milk, cream, potato, chicken, ketchup), within the same part only.
 * - **Translucency.** Backlight passing through thin parts (grape rims, leaves, onion skin) by the thickness the
 *   shadow map gives, falling off exponentially.
 * - **Liquids and glass.** One transparent layer over the opaque scene: Fresnel reflection, refraction, absorption
 *   with depth (Beer–Lambert) and in-scattering (cloudy broth).
 * - **Finish.** Steam over hot food, depth of field, bloom, a warm storybook grade and a vignette, then filmic tone
 *   mapping. Everything is seeded and deterministic.
 */
import { fbm, gaussianBlur, linearOf, rasterizeTriangles, srgbEncode } from "../anatomy/foundation-raster";
import type { Mesh, V3 } from "./food-mesh";

// ---- Surfaces ------------------------------------------------------------------------------------------------------------------

/** What a surface function writes for one sample (linear colours). Reset to defaults before each call. */
export interface Surface {
  albedo: V3;
  /** GGX roughness 0.02 (glassy) … 1 (chalky). */
  rough: number;
  /** Normal-incidence reflectance (0.02–0.05 for food and ceramics). */
  spec: number;
  /** Micro-relief, mm, for bump shading (pores, crumbs, grains, blisters). */
  height: number;
  /** Subsurface mean free path per channel, mm (0 = none). */
  mfp: V3;
  /** Thin translucency: backlight passing through (0…1). */
  trans: number;
  /** Velvet sheen at grazing angles (dust, fuzz, flour) 0…1, and its colour. */
  sheen: number; sheenTint: V3;
  /** Clear coat (glaze, syrup, wax) 0…1 and its roughness. */
  coat: number; coatRough: number;
  /** Baked cavity darkening (1 = none). */
  occl: number;
  /** Light given off (embers). */
  emit: V3;
  /** Transparent parts only: absorption per mm, in-scattering colour and density per mm, refraction strength. */
  absorb: V3; scatter: V3; density: number; refract: number;
}
export interface Sample {
  /** World position, object position (mm), world normal, direction to the camera. */
  p: V3; o: V3; n: V3; v: V3;
  uv: [number, number];
  seed: number;
  /** The part's own numbers (doneness, ripeness …). */
  k: Readonly<Record<string, number>>;
}
export type SurfaceFn = (s: Sample, out: Surface) => void;

export interface Part {
  name: string;
  mesh: Mesh;
  surface: SurfaceFn;
  /** Liquids, glass, syrups: drawn over the opaque scene. */
  transparent?: boolean;
  /** A thin transparent shell (glass walls): light crosses this many mm of it, not the whole depth behind. */
  thin?: number;
  /** Casts sun shadows (default true for opaque parts). */
  castShadow?: boolean;
  seed?: number;
  k?: Record<string, number>;
}

// ---- Light ---------------------------------------------------------------------------------------------------------------------

export interface Mood {
  id: string; label: string;
  /** The sun (or lamp): azimuth (degrees: 0 from the right, 90 from behind the food, 180 from the left), elevation, colour, power, angular size. */
  sun: { azimuth: number; elevation: number; colour: string; power: number; size: number };
  /** The soft window or sky round the key, as a broad area light and in reflections. */
  window: { azimuth: number; elevation: number; colour: string; power: number; width: number; height: number };
  /** The bounce card in front of the food. */
  fill: { colour: string; power: number };
  /** The room: sky above, bounce below. */
  ambient: { sky: string; ground: string; power: number };
  /** A pool of light: the key falls off with distance from the food (mm; 0 = none). */
  pool: number;
  /** The far background's glow and the haze over distance. */
  haze: { colour: string; power: number };
  exposure: number;
  grade: { warmth: number; lift: string; saturation: number; vignette: number; bloom: number };
}

export interface CameraSpec {
  /** Degrees above the table (food photographers' "hero" angle is about 25–45°; 90 is flat lay). */
  elevation: number;
  /** Orbit about the food, degrees. */
  azimuth?: number;
  /** Camera distance, mm (default 1100: a long lens). */
  distance?: number;
  /** The point looked at, mm. */
  target: V3;
  /** The width of the frame at the target, mm. */
  frame: number;
  /** Depth-of-field strength (blur px per 100 mm out of focus at 720 px wide; default 7). */
  aperture?: number;
  /** The point in focus (default the target). */
  focus?: V3;
  /** Depth kept fully sharp either side of the focus, mm (default 45: the whole dish). */
  sharpDepth?: number;
}

export interface StillLife {
  parts: Part[];
  /** The table top's surface (world Y = 0). */
  table: SurfaceFn;
  /** How far back the table goes (mm behind the food) before the background (default 700). */
  tableDepth?: number;
  camera: CameraSpec;
  mood: Mood;
  /** Steam over hot food: the liquid's centre, radius (mm) and strength 0…1. */
  steam?: { at: V3; radius: number; strength: number };
}

export interface StillLifeOptions { width?: number; height?: number; supersample?: number; seed?: number; debug?: "albedo" | "normal" | "ao" | "shadow" | "depth" }
export interface StillLifeRender { width: number; height: number; rgba: Uint8ClampedArray; ms: number }

// ---- Small vector helpers ------------------------------------------------------------------------------------------------------

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
const sst = (a: number, b: number, x: number) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const dirOf = (azDeg: number, elDeg: number): V3 => { const a = (azDeg * Math.PI) / 180, e = (elDeg * Math.PI) / 180; return [Math.cos(e) * Math.cos(a), Math.sin(e), -Math.cos(e) * Math.sin(a)]; };
const normalize = (v: V3): V3 => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const scaleC = (c: readonly number[], k: number): V3 => [c[0] * k, c[1] * k, c[2] * k];

export const newSurface = (): Surface => ({ albedo: [0.5, 0.5, 0.5], rough: 0.5, spec: 0.04, height: 0, mfp: [0, 0, 0], trans: 0, sheen: 0, sheenTint: [1, 1, 1], coat: 0, coatRough: 0.08, occl: 1, emit: [0, 0, 0], absorb: [0, 0, 0], scatter: [0, 0, 0], density: 0, refract: 0 });
function resetSurface(s: Surface) {
  s.albedo[0] = s.albedo[1] = s.albedo[2] = 0.5; s.rough = 0.5; s.spec = 0.04; s.height = 0; s.mfp[0] = s.mfp[1] = s.mfp[2] = 0; s.trans = 0; s.sheen = 0;
  s.sheenTint[0] = s.sheenTint[1] = s.sheenTint[2] = 1; s.coat = 0; s.coatRough = 0.08; s.occl = 1; s.emit[0] = s.emit[1] = s.emit[2] = 0;
  s.absorb[0] = s.absorb[1] = s.absorb[2] = 0; s.scatter[0] = s.scatter[1] = s.scatter[2] = 0; s.density = 0; s.refract = 0;
}

/** Environment-BRDF approximation (Karis 2014, after Lazarov): the scale and bias on F0 for a rough reflection. */
function envBrdf(rough: number, nv: number): [number, number] {
  const r0 = rough * -1 + 1, r1 = rough * -0.0275 + 0.0425, r2 = rough * -0.572 + 1.04, r3 = rough * 0.022 - 0.04;
  const a004 = Math.min(r0 * r0, Math.pow(2, -9.28 * nv)) * r0 + r1;
  return [a004 * -1.04 + r2, a004 * 1.04 + r3];
}

// ---- The renderer --------------------------------------------------------------------------------------------------------------

/** Render a still life to sRGB pixels. */
export function renderStillLife(scene: StillLife, o: StillLifeOptions = {}): StillLifeRender {
  const t0 = typeof performance !== "undefined" ? performance.now() : Date.now();
  const W = o.width ?? 480, H = o.height ?? 360, SS = Math.max(1, Math.round(o.supersample ?? 2)), w = W * SS, h = H * SS, N = w * h;
  const cam = scene.camera, mood = scene.mood, D = cam.distance ?? 1100, ppm = w / cam.frame;
  const el = (cam.elevation * Math.PI) / 180, az = ((cam.azimuth ?? 0) * Math.PI) / 180, ce = Math.cos(el), se = Math.sin(el), ca = Math.cos(az), sa = Math.sin(az);
  const [tx, ty, tz] = cam.target;
  // world → view (x right, y up, z towards the camera), then a perspective divide about the target plane
  const toView = (X: number, Y: number, Z: number, out: number[]) => {
    const x0 = X - tx, y0 = Y - ty, z0 = Z - tz, x1 = x0 * ca - z0 * sa, z1 = x0 * sa + z0 * ca;
    out[0] = x1; out[1] = y0 * ce - z1 * se; out[2] = y0 * se + z1 * ce;
  };
  const viewToWorld = (x: number, y: number, z: number): V3 => {
    const Y = y * ce + z * se, Z1 = -y * se + z * ce;
    return [x * ca + Z1 * sa + tx, Y + ty, -x * sa + Z1 * ca + tz];
  };
  const cx = w / 2, cy = h / 2, camWorld = viewToWorld(0, 0, D);
  const screenX: V3 = normalize(viewToWorld(1, 0, 0).map((v, i) => v - cam.target[i]) as V3), screenY: V3 = normalize(viewToWorld(0, 1, 0).map((v, i) => v - cam.target[i]) as V3);

  // ---- 1. Gather and project the meshes
  const parts = scene.parts;
  let nv = 0, ntO = 0, ntT = 0;
  for (const p of parts) { nv += p.mesh.pos.length / 3; if (p.transparent) ntT += p.mesh.tri.length / 3; else ntO += p.mesh.tri.length / 3; }
  const P = new Float32Array(nv * 3), Nn = new Float32Array(nv * 3), OB = new Float32Array(nv * 3), UV = new Float32Array(nv * 2), SX = new Float32Array(nv), SY = new Float32Array(nv), SZ = new Float32Array(nv);
  const trisO = new Int32Array(ntO * 3), trisT = new Int32Array(ntT * 3), partO = new Int32Array(ntO), partT = new Int32Array(ntT);
  {
    let vb = 0, to = 0, tt = 0;
    const tmp = [0, 0, 0];
    parts.forEach((p, pi) => {
      const m = p.mesh, n = m.pos.length / 3;
      for (let i = 0; i < n; i++) {
        const k = vb + i;
        P[k * 3] = m.pos[i * 3]; P[k * 3 + 1] = m.pos[i * 3 + 1]; P[k * 3 + 2] = m.pos[i * 3 + 2];
        Nn[k * 3] = m.nrm[i * 3]; Nn[k * 3 + 1] = m.nrm[i * 3 + 1]; Nn[k * 3 + 2] = m.nrm[i * 3 + 2];
        OB[k * 3] = m.obj[i * 3]; OB[k * 3 + 1] = m.obj[i * 3 + 1]; OB[k * 3 + 2] = m.obj[i * 3 + 2];
        UV[k * 2] = m.uv[i * 2] ?? 0; UV[k * 2 + 1] = m.uv[i * 2 + 1] ?? 0;
        toView(m.pos[i * 3], m.pos[i * 3 + 1], m.pos[i * 3 + 2], tmp);
        const s = D / Math.max(1, D - tmp[2]);
        SX[k] = cx + tmp[0] * s * ppm; SY[k] = cy - tmp[1] * s * ppm; SZ[k] = tmp[2];
      }
      const T = p.transparent ? trisT : trisO, PP = p.transparent ? partT : partO;
      for (let t = 0; t < m.tri.length; t += 3) {
        if (p.transparent) { T[tt * 3] = m.tri[t] + vb; T[tt * 3 + 1] = m.tri[t + 1] + vb; T[tt * 3 + 2] = m.tri[t + 2] + vb; PP[tt++] = pi; }
        else { T[to * 3] = m.tri[t] + vb; T[to * 3 + 1] = m.tri[t + 1] + vb; T[to * 3 + 2] = m.tri[t + 2] + vb; PP[to++] = pi; }
      }
      vb += n;
    });
  }
  const bufO = rasterizeTriangles(w, h, SX, SY, SZ, trisO);
  // transparent parts: each its own layer, with its nearest and farthest surfaces (the depth light crosses inside it)
  const layers: { pi: number; tris: Int32Array; front: ReturnType<typeof rasterizeTriangles>; back: Float32Array; depth: number }[] = [];
  if (ntT) {
    const negZ = SZ.map(z => -z);
    for (const pi of new Set(partT)) {
      const idx: number[] = [];
      // (layers sort by their nearest point: a glass's front wall goes over the honey inside it)
      let dz = -Infinity;
      for (let t = 0; t < ntT; t++) if (partT[t] === pi) { idx.push(trisT[t * 3], trisT[t * 3 + 1], trisT[t * 3 + 2]); dz = Math.max(dz, SZ[trisT[t * 3]]); }
      const tris = Int32Array.from(idx), front = rasterizeTriangles(w, h, SX, SY, SZ, tris), back = rasterizeTriangles(w, h, SX, SY, negZ, tris).depth.map(z => -z);
      layers.push({ pi, tris, front, back, depth: dz });
    }
    layers.sort((a, b) => a.depth - b.depth);
  }

  // ---- 2. Shadow maps (orthographic): the sun (PCSS by its size), and soft ones for the window, the fill card and
  // the sky, so food sits in its own occlusion even where the camera cannot see the contact
  const caster = (pi: number) => !parts[pi].transparent && parts[pi].castShadow !== false;
  const casterTris: number[] = [];
  for (let t = 0; t < ntO; t++) if (caster(partO[t])) casterTris.push(trisO[t * 3], trisO[t * 3 + 1], trisO[t * 3 + 2]);
  const casterVerts = new Uint8Array(nv);
  for (const v of casterTris) casterVerts[v] = 1;
  const POISSON = [[-0.94, -0.4], [0.95, -0.77], [-0.09, -0.93], [0.34, 0.29], [-0.92, 0.46], [-0.81, -0.88], [-0.38, 0.28], [0.97, 0.76], [0.44, -0.97], [0.54, -0.37], [-0.26, -0.42], [-0.16, 0.85]];
  interface ShadowMap { vis: (x: number, y: number, z: number, nx: number, ny: number, nz: number) => number; thick: (x: number, y: number, z: number) => number }
  const makeMap = (L: V3, SM: number, sizeDeg: number): ShadowMap => {
    const Lu = normalize(cross(Math.abs(L[1]) > 0.99 ? [1, 0, 0] : [0, 1, 0], L)), Lv = cross(L, Lu);
    let lu0 = Infinity, lu1 = -Infinity, lv0 = Infinity, lv1 = -Infinity;
    for (let i = 0; i < nv; i++) if (casterVerts[i]) {
      const u = P[i * 3] * Lu[0] + P[i * 3 + 1] * Lu[1] + P[i * 3 + 2] * Lu[2], v = P[i * 3] * Lv[0] + P[i * 3 + 1] * Lv[1] + P[i * 3 + 2] * Lv[2];
      lu0 = Math.min(lu0, u); lu1 = Math.max(lu1, u); lv0 = Math.min(lv0, v); lv1 = Math.max(lv1, v);
    }
    if (lu0 === Infinity) return { vis: () => 1, thick: () => 0 };
    const ext = Math.max(lu1 - lu0, lv1 - lv0, 1) * 1.04, smMm = ext / SM, lumid = (lu0 + lu1) / 2, lvmid = (lv0 + lv1) / 2;
    const LX = new Float32Array(nv), LY = new Float32Array(nv), LZ = new Float32Array(nv);
    for (let i = 0; i < nv; i++) {
      const x = P[i * 3], y = P[i * 3 + 1], z = P[i * 3 + 2];
      LX[i] = SM / 2 + (x * Lu[0] + y * Lu[1] + z * Lu[2] - lumid) / smMm;
      LY[i] = SM / 2 - (x * Lv[0] + y * Lv[1] + z * Lv[2] - lvmid) / smMm;
      LZ[i] = x * L[0] + y * L[1] + z * L[2];
    }
    const map = rasterizeTriangles(SM, SM, LX, LY, LZ, casterTris).depth;
    const at = (u: number, v: number) => { const x = u | 0, y = v | 0; return x < 0 || y < 0 || x >= SM || y >= SM ? -Infinity : map[y * SM + x]; };
    const tanH = Math.tan((sizeDeg * Math.PI) / 360), search = Math.max(6, Math.min(SM / 8, (tanH * 40) / smMm));
    return {
      vis: (x, y, z, nx, ny, nz) => {
        const off = smMm * 1.8, px = x + nx * off, py = y + ny * off, pz = z + nz * off;
        const u = SM / 2 + (px * Lu[0] + py * Lu[1] + pz * Lu[2] - lumid) / smMm, v = SM / 2 - (px * Lv[0] + py * Lv[1] + pz * Lv[2] - lvmid) / smMm, d = px * L[0] + py * L[1] + pz * L[2];
        if (u < -search || v < -search || u > SM + search || v > SM + search) return 1;
        // blocker search: the average distance to whatever lies between this point and the light
        let sum = 0, cnt = 0;
        for (const [a, b] of POISSON) { const z0 = at(u + a * search, v + b * search); if (z0 > d + smMm) { sum += z0 - d; cnt++; } }
        const zc = at(u, v);
        if (zc > d + smMm) { sum += zc - d; cnt++; }
        if (!cnt) return 1;
        const pen = Math.max(1.2, Math.min(search * 1.5, ((sum / cnt) * tanH * 2) / smMm));
        let lit = 0;
        for (const [a, b] of POISSON) lit += at(u + a * pen, v + b * pen) > d + smMm * 1.5 ? 0 : 1;
        for (const [a, b] of POISSON) lit += at(u - b * pen * 0.5, v + a * pen * 0.5) > d + smMm * 1.5 ? 0 : 1;
        lit += zc > d + smMm * 1.5 ? 0 : 1;
        return lit / (POISSON.length * 2 + 1);
      },
      thick: (x, y, z) => {
        const u = SM / 2 + (x * Lu[0] + y * Lu[1] + z * Lu[2] - lumid) / smMm, v = SM / 2 - (x * Lv[0] + y * Lv[1] + z * Lv[2] - lvmid) / smMm, z0 = at(u, v);
        return z0 === -Infinity ? 0 : Math.max(0, z0 - (x * L[0] + y * L[1] + z * L[2]));
      },
    };
  };
  const L = dirOf(mood.sun.azimuth, mood.sun.elevation);
  const sunMap = makeMap(L, 1024, mood.sun.size || 1);
  const shadowAt = sunMap.vis, thicknessAt = sunMap.thick, sunTan = Math.tan(((mood.sun.size || 1) * Math.PI) / 360);
  const winMap = makeMap(dirOf(mood.window.azimuth, mood.window.elevation), 384, Math.min(mood.window.width, mood.window.height) * 0.7);
  const fillDir = normalize([camWorld[0] - tx, Math.max(camWorld[1] - ty, 0) + 350, camWorld[2] - tz]);
  const fillMap = makeMap(fillDir, 384, 70);
  const skyMaps = [0, 1, 2, 3, 4, 5].map(k => makeMap(dirOf(k * 60 + 30, 48), 256, 50)).concat([makeMap([0, 1, 0], 256, 50)]);
  const skyVis = (x: number, y: number, z: number, nx: number, ny: number, nz: number) => { let v = 0; for (const m of skyMaps) v += m.vis(x, y, z, nx, ny, nz); return v / skyMaps.length; };

  // ---- 3. The G-buffer: world position, normal, object position, uv, part (−1 table, −2 background)
  const GP = new Float32Array(N * 3), GN = new Float32Array(N * 3), GO = new Float32Array(N * 3), GUV = new Float32Array(N * 2), GPART = new Int32Array(N), GZ = new Float32Array(N);
  const tableDepth = scene.tableDepth ?? 700;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x, t = bufO.tri[i];
    let ok = false;
    if (t >= 0) {
      const a = trisO[t * 3], b = trisO[t * 3 + 1], c = trisO[t * 3 + 2], b1 = bufO.b1[i], b2 = bufO.b2[i], b0 = 1 - b1 - b2;
      const py = P[a * 3 + 1] * b0 + P[b * 3 + 1] * b1 + P[c * 3 + 1] * b2;
      if (py > -0.6) {
        ok = true;
        for (let k = 0; k < 3; k++) {
          GP[i * 3 + k] = P[a * 3 + k] * b0 + P[b * 3 + k] * b1 + P[c * 3 + k] * b2;
          GN[i * 3 + k] = Nn[a * 3 + k] * b0 + Nn[b * 3 + k] * b1 + Nn[c * 3 + k] * b2;
          GO[i * 3 + k] = OB[a * 3 + k] * b0 + OB[b * 3 + k] * b1 + OB[c * 3 + k] * b2;
        }
        GUV[i * 2] = UV[a * 2] * b0 + UV[b * 2] * b1 + UV[c * 2] * b2; GUV[i * 2 + 1] = UV[a * 2 + 1] * b0 + UV[b * 2 + 1] * b1 + UV[c * 2 + 1] * b2;
        const l = Math.hypot(GN[i * 3], GN[i * 3 + 1], GN[i * 3 + 2]) || 1;
        GN[i * 3] /= l; GN[i * 3 + 1] /= l; GN[i * 3 + 2] /= l;
        GPART[i] = partO[t]; GZ[i] = bufO.depth[i];
      }
    }
    if (ok) continue;
    // the table: the camera ray through this pixel meets world Y = 0
    const xv = (x + 0.5 - cx) / ppm, yv = (cy - y - 0.5) / ppm, q = viewToWorld(xv, yv, 0), dx = q[0] - camWorld[0], dy = q[1] - camWorld[1], dz = q[2] - camWorld[2];
    const tHit = dy < -1e-6 ? -camWorld[1] / dy : -1, hz = camWorld[2] + dz * tHit;
    if (tHit > 0 && hz > cam.target[2] - tableDepth) {
      GP[i * 3] = camWorld[0] + dx * tHit; GP[i * 3 + 1] = 0; GP[i * 3 + 2] = hz;
      GN[i * 3 + 1] = 1; GO[i * 3] = GP[i * 3]; GO[i * 3 + 2] = GP[i * 3 + 2]; GUV[i * 2] = GP[i * 3]; GUV[i * 2 + 1] = GP[i * 3 + 2];
      GPART[i] = -1;
      const tv = [0, 0, 0]; toView(GP[i * 3], 0, GP[i * 3 + 2], tv); GZ[i] = tv[2];
    } else { GPART[i] = -2; GZ[i] = -tableDepth * 1.5; }
  }

  // ---- 4. Surfaces
  const ALB = new Float32Array(N * 3), ROUGH = new Float32Array(N), SPEC = new Float32Array(N), HGT = new Float32Array(N), MFP = new Float32Array(N * 3), TRANS = new Float32Array(N);
  const SHEEN = new Float32Array(N), SHT = new Float32Array(N * 3), COAT = new Float32Array(N), COATR = new Float32Array(N), OCC = new Float32Array(N), EMIT = new Float32Array(N * 3);
  const surf = newSurface(), smp: Sample = { p: [0, 0, 0], o: [0, 0, 0], n: [0, 1, 0], v: [0, 0, 1], uv: [0, 0], seed: o.seed ?? 1, k: {} };
  const fill = (i: number, fn: SurfaceFn, seed: number, k: Record<string, number> | undefined, Gp: Float32Array, Gn: Float32Array, Go: Float32Array, Guv: Float32Array) => {
    smp.p[0] = Gp[i * 3]; smp.p[1] = Gp[i * 3 + 1]; smp.p[2] = Gp[i * 3 + 2];
    smp.o[0] = Go[i * 3]; smp.o[1] = Go[i * 3 + 1]; smp.o[2] = Go[i * 3 + 2];
    smp.n[0] = Gn[i * 3]; smp.n[1] = Gn[i * 3 + 1]; smp.n[2] = Gn[i * 3 + 2];
    const vx = camWorld[0] - smp.p[0], vy = camWorld[1] - smp.p[1], vz = camWorld[2] - smp.p[2], vl = Math.hypot(vx, vy, vz) || 1;
    smp.v[0] = vx / vl; smp.v[1] = vy / vl; smp.v[2] = vz / vl;
    // thin sheets and the inside of things: shade the side that faces the camera
    if (smp.n[0] * smp.v[0] + smp.n[1] * smp.v[1] + smp.n[2] * smp.v[2] < 0) { smp.n[0] = -smp.n[0]; smp.n[1] = -smp.n[1]; smp.n[2] = -smp.n[2]; Gn[i * 3] = smp.n[0]; Gn[i * 3 + 1] = smp.n[1]; Gn[i * 3 + 2] = smp.n[2]; }
    smp.uv[0] = Guv[i * 2]; smp.uv[1] = Guv[i * 2 + 1]; smp.seed = seed; smp.k = k ?? {};
    resetSurface(surf);
    fn(smp, surf);
  };
  for (let i = 0; i < N; i++) {
    const pi = GPART[i];
    if (pi === -2) continue;
    const part = pi >= 0 ? parts[pi] : null;
    fill(i, part ? part.surface : scene.table, part?.seed ?? (o.seed ?? 1), part?.k, GP, GN, GO, GUV);
    ALB[i * 3] = surf.albedo[0]; ALB[i * 3 + 1] = surf.albedo[1]; ALB[i * 3 + 2] = surf.albedo[2];
    ROUGH[i] = surf.rough; SPEC[i] = surf.spec; HGT[i] = surf.height; TRANS[i] = surf.trans; SHEEN[i] = surf.sheen; COAT[i] = surf.coat; COATR[i] = surf.coatRough; OCC[i] = surf.occl;
    for (let c = 0; c < 3; c++) { MFP[i * 3 + c] = surf.mfp[c]; SHT[i * 3 + c] = surf.sheenTint[c]; EMIT[i * 3 + c] = surf.emit[c]; }
  }

  // ---- 5. Bump: perturb normals by the micro-relief's surface gradient (Mikkelsen 2010) with screen derivatives
  const BN = new Float32Array(N * 3);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x, pi = GPART[i];
    BN[i * 3] = GN[i * 3]; BN[i * 3 + 1] = GN[i * 3 + 1]; BN[i * 3 + 2] = GN[i * 3 + 2];
    if (pi === -2) continue;
    const same = (j: number) => GPART[j] === pi;
    const xl = x > 0 && same(i - 1) ? i - 1 : i, xr = x < w - 1 && same(i + 1) ? i + 1 : i, yu = y > 0 && same(i - w) ? i - w : i, yd = y < h - 1 && same(i + w) ? i + w : i;
    if (xl === xr || yu === yd) continue;
    const dpx: V3 = [GP[xr * 3] - GP[xl * 3], GP[xr * 3 + 1] - GP[xl * 3 + 1], GP[xr * 3 + 2] - GP[xl * 3 + 2]], dpy: V3 = [GP[yd * 3] - GP[yu * 3], GP[yd * 3 + 1] - GP[yu * 3 + 1], GP[yd * 3 + 2] - GP[yu * 3 + 2]];
    const dhx = HGT[xr] - HGT[xl], dhy = HGT[yd] - HGT[yu];
    if (dhx === 0 && dhy === 0) continue;
    const n: V3 = [GN[i * 3], GN[i * 3 + 1], GN[i * 3 + 2]], r1 = cross(dpy, n), r2 = cross(n, dpx), det = dpx[0] * r1[0] + dpx[1] * r1[1] + dpx[2] * r1[2];
    if (Math.abs(det) < 1e-9) continue;
    const sg = Math.sign(det), gx = sg * (dhx * r1[0] + dhy * r2[0]), gy = sg * (dhx * r1[1] + dhy * r2[1]), gz = sg * (dhx * r1[2] + dhy * r2[2]);
    const ad = Math.abs(det), bx = ad * n[0] - gx, by = ad * n[1] - gy, bz = ad * n[2] - gz, l = Math.hypot(bx, by, bz) || 1;
    BN[i * 3] = bx / l; BN[i * 3 + 1] = by / l; BN[i * 3 + 2] = bz / l;
  }

  // ---- 6. Ambient occlusion in screen space, at the output resolution, two radii (crevices, contact)
  const VPOS = new Float32Array(N * 3);
  { const tv = [0, 0, 0]; for (let i = 0; i < N; i++) { toView(GP[i * 3], GP[i * 3 + 1], GP[i * 3 + 2], tv); VPOS[i * 3] = tv[0]; VPOS[i * 3 + 1] = tv[1]; VPOS[i * 3 + 2] = tv[2]; } }
  const aw = Math.ceil(w / SS), ah = Math.ceil(h / SS), AOs = new Float32Array(aw * ah).fill(1), SKYs = new Float32Array(aw * ah).fill(1), WINs = new Float32Array(aw * ah).fill(1), FILLs = new Float32Array(aw * ah).fill(1);
  {
    const DIRS = 12, radii = [1.6, 6, 24], weights = [0.6, 0.8, 0.9], nvv = [0, 0, 0];
    for (let ay = 0; ay < ah; ay++) for (let ax = 0; ax < aw; ax++) {
      const sx = Math.min(w - 1, ax * SS + (SS >> 1)), sy = Math.min(h - 1, ay * SS + (SS >> 1)), i = sy * w + sx;
      if (GPART[i] === -2) continue;
      { const px = GP[i * 3], py = GP[i * 3 + 1], pz = GP[i * 3 + 2], gx = GN[i * 3], gy = GN[i * 3 + 1], gz = GN[i * 3 + 2], g = ay * aw + ax;
        SKYs[g] = skyVis(px, py, pz, gx, gy, gz); WINs[g] = winMap.vis(px, py, pz, gx, gy, gz); FILLs[g] = fillMap.vis(px, py, pz, gx, gy, gz); }
      // the normal in view space
      const n: V3 = [BN[i * 3], BN[i * 3 + 1], BN[i * 3 + 2]], q = [0, 0, 0];
      toView(GP[i * 3] + n[0], GP[i * 3 + 1] + n[1], GP[i * 3 + 2] + n[2], q);
      nvv[0] = q[0] - VPOS[i * 3]; nvv[1] = q[1] - VPOS[i * 3 + 1]; nvv[2] = q[2] - VPOS[i * 3 + 2];
      let occ = 0;
      const rot = ((ax * 7 + ay * 13) % 10) / 10 * Math.PI * 2 / DIRS;
      radii.forEach((R, ri) => {
        let o2 = 0;
        for (let d = 0; d < DIRS; d++) {
          const a = rot + (d / DIRS) * Math.PI * 2, rr = R * (0.35 + 0.65 * ((d * 0.618) % 1)), px = Math.round(sx + Math.cos(a) * rr * ppm), py = Math.round(sy + Math.sin(a) * rr * ppm);
          if (px < 0 || py < 0 || px >= w || py >= h) continue;
          const j = py * w + px;
          if (GPART[j] === -2) continue;
          const dx = VPOS[j * 3] - VPOS[i * 3], dy = VPOS[j * 3 + 1] - VPOS[i * 3 + 1], dz = VPOS[j * 3 + 2] - VPOS[i * 3 + 2], dl = Math.hypot(dx, dy, dz);
          if (dl < 1e-3) continue;
          const cos = (dx * nvv[0] + dy * nvv[1] + dz * nvv[2]) / dl;
          o2 += Math.max(0, cos - 0.12) * (1 - sst(R * 0.9, R * 2.2, dl));
        }
        occ += (o2 / DIRS) * weights[ri];
      });
      AOs[ay * aw + ax] = Math.pow(clamp01(1 - occ * 1.1), 1.5);
    }
  }
  const gridAt = (G: Float32Array, x: number, y: number) => {
    const fx = Math.min(aw - 1.001, Math.max(0, (x + 0.5) / SS - 0.5)), fy = Math.min(ah - 1.001, Math.max(0, (y + 0.5) / SS - 0.5)), x0 = fx | 0, y0 = fy | 0, u = fx - x0, v = fy - y0;
    const a = G[y0 * aw + x0], b = G[y0 * aw + Math.min(aw - 1, x0 + 1)], c = G[Math.min(ah - 1, y0 + 1) * aw + x0], d = G[Math.min(ah - 1, y0 + 1) * aw + Math.min(aw - 1, x0 + 1)];
    return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v;
  };
  const aoAt = (x: number, y: number) => gridAt(AOs, x, y);

  // ---- 7. Light
  const sunC = scaleC(linearOf(mood.sun.colour), mood.sun.power), winC = scaleC(linearOf(mood.window.colour), mood.window.power), fillC = scaleC(linearOf(mood.fill.colour), mood.fill.power);
  const skyC = scaleC(linearOf(mood.ambient.sky), mood.ambient.power), gndC = scaleC(linearOf(mood.ambient.ground), mood.ambient.power);
  const Wd = dirOf(mood.window.azimuth, mood.window.elevation), Wu = normalize(cross([0, 1, 0], Wd)), Wv = cross(Wd, Wu);
  const Fd = fillDir;
  const ww = (mood.window.width * Math.PI) / 360, wh = (mood.window.height * Math.PI) / 360;
  /** Radiance arriving from direction d, pre-blurred for a reflection of this roughness. */
  const env = (dx: number, dy: number, dz: number, rough: number, out: number[]) => {
    const soft = 0.06 + rough * 1.1;
    let win = 0;
    const f = dx * Wd[0] + dy * Wd[1] + dz * Wd[2];
    if (f > 0) {
      const a = Math.atan2(dx * Wu[0] + dy * Wu[1] + dz * Wu[2], f) / ww, b = Math.atan2(dx * Wv[0] + dy * Wv[1] + dz * Wv[2], f) / wh;
      win = (1 - sst(1 - soft, 1 + soft, Math.abs(a))) * (1 - sst(1 - soft, 1 + soft, Math.abs(b)));
      // window bars: two soft mullions, gone in rough reflections
      if (rough < 0.35) win *= 1 - (1 - sst(0, 0.05 + rough * 0.3, Math.abs(a))) * 0.55 * (1 - rough / 0.35);
    }
    const ff = Math.max(0, dx * Fd[0] + dy * Fd[1] + dz * Fd[2]), card = sst(0.75 - rough * 0.5, 0.95, ff) * 0.6;
    const room = clamp01(dy * 0.5 + 0.5), wide = Math.min(1, rough * rough * 1.4);
    for (let c = 0; c < 3; c++) {
      const base = gndC[c] * (1 - room) * 1.4 + skyC[c] * room * 1.2;
      out[c] = base + (winC[c] * win * (1 - wide) + winC[c] * 0.14 * wide) * 1.6 + fillC[c] * card * 1.2;
    }
  };
  const pool = mood.pool, sunAlpha = sunTan;
  const E = new Float32Array(N * 3), SPECL = new Float32Array(N * 3), SHD = new Float32Array(N), AOF = new Float32Array(N);
  const envc = [0, 0, 0];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x;
    if (GPART[i] === -2) continue;
    const px = GP[i * 3], py = GP[i * 3 + 1], pz = GP[i * 3 + 2], nx = BN[i * 3], ny = BN[i * 3 + 1], nz = BN[i * 3 + 2];
    const vx0 = camWorld[0] - px, vy0 = camWorld[1] - py, vz0 = camWorld[2] - pz, vl = Math.hypot(vx0, vy0, vz0), vx = vx0 / vl, vy = vy0 / vl, vz = vz0 / vl;
    const nv0 = Math.max(1e-3, nx * vx + ny * vy + nz * vz);
    const gnx = GN[i * 3], gny = GN[i * 3 + 1], gnz = GN[i * 3 + 2], sh = shadowAt(px, py, pz, gnx, gny, gnz), sky = gridAt(SKYs, x, y), ao = aoAt(x, y) * OCC[i] * (0.2 + 0.8 * sky);
    const vWin = gridAt(WINs, x, y), vFill = gridAt(FILLs, x, y);
    SHD[i] = sh; AOF[i] = ao;
    const poolK = pool > 0 ? Math.exp(-((px - tx) ** 2 + (pz - tz) ** 2) / (2 * pool * pool)) : 1;
    const hasSss = MFP[i * 3] + MFP[i * 3 + 1] + MFP[i * 3 + 2] > 0, wrap = hasSss ? 0.35 : 0.04;
    const nl = nx * L[0] + ny * L[1] + nz * L[2], diffSun = Math.max(0, (nl + wrap) / (1 + wrap)) * sh * poolK;
    const nw = nx * Wd[0] + ny * Wd[1] + nz * Wd[2], diffWin = Math.pow(Math.max(0, (nw + 0.3) / 1.3), 1.3) * 0.55;
    const nf = nx * Fd[0] + ny * Fd[1] + nz * Fd[2], diffFill = Math.max(0, (nf + 0.4) / 1.4);
    const hemi = clamp01(ny * 0.5 + 0.5);
    const aoS = aoAt(x, y) * OCC[i];
    for (let c = 0; c < 3; c++) E[i * 3 + c] = sunC[c] * diffSun + (winC[c] * diffWin * poolK * vWin + fillC[c] * diffFill * (0.4 + 0.6 * poolK) * (0.15 + 0.85 * vFill)) * aoS + (skyC[c] * hemi + gndC[c] * (1 - hemi)) * ao;
    // specular: the sun (GGX, widened by its size), the room in reflection, a clear coat on top
    const rough = Math.max(0.03, ROUGH[i]), F0 = SPEC[i], a = Math.min(1, rough * rough + sunAlpha), a2 = a * a;
    const hx0 = L[0] + vx, hy0 = L[1] + vy, hz0 = L[2] + vz, hl = Math.hypot(hx0, hy0, hz0) || 1, nh = Math.max(0, (nx * hx0 + ny * hy0 + nz * hz0) / hl), vh = Math.max(0, (vx * hx0 + vy * hy0 + vz * hz0) / hl);
    const nlc = Math.max(0, nl), k = ((rough + 1) * (rough + 1)) / 8, G = (nlc / (nlc * (1 - k) + k)) * (nv0 / (nv0 * (1 - k) + k));
    const Dd = a2 / (Math.PI * (nh * nh * (a2 - 1) + 1) ** 2), Fs = F0 + (1 - F0) * Math.pow(1 - vh, 5);
    let sunSpec = nlc > 0 ? (Dd * G * Fs) / (4 * nlc * nv0) * nlc * sh * poolK : 0;
    const rd = 2 * (nx * vx + ny * vy + nz * vz), rx = rd * nx - vx, ry = rd * ny - vy, rz = rd * nz - vz;
    env(rx, ry, rz, rough, envc);
    const [A, B] = envBrdf(rough, nv0), envK = (F0 * A + B) * (0.35 + 0.65 * ao);
    let cR = envc[0] * envK, cG = envc[1] * envK, cB = envc[2] * envK;
    if (COAT[i] > 0) {
      const cr = Math.max(0.03, COATR[i]), ac = Math.min(1, cr * cr + sunAlpha), ac2 = ac * ac, Dc = ac2 / (Math.PI * (nh * nh * (ac2 - 1) + 1) ** 2), Fc = 0.04 + 0.96 * Math.pow(1 - vh, 5);
      sunSpec += nlc > 0 ? Dc * Fc * 0.25 * COAT[i] * sh * poolK * Math.min(1, nlc * 4) : 0;
      env(rx, ry, rz, cr, envc);
      const [Ac, Bc] = envBrdf(cr, nv0), kc = (0.04 * Ac + Bc) * COAT[i] * (0.35 + 0.65 * ao);
      cR += envc[0] * kc; cG += envc[1] * kc; cB += envc[2] * kc;
    }
    SPECL[i * 3] = cR + sunC[0] * sunSpec; SPECL[i * 3 + 1] = cG + sunC[1] * sunSpec; SPECL[i * 3 + 2] = cB + sunC[2] * sunSpec;
  }

  // ---- 8. Subsurface scattering: spread each part's diffuse light by its mean free path (screen-space, same part)
  const ES = E.slice();
  {
    const taps = POISSON.length;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x, pi = GPART[i];
      if (pi === -2 || MFP[i * 3] + MFP[i * 3 + 1] + MFP[i * 3 + 2] <= 0) continue;
      const depthScale = D / Math.max(1, D - GZ[i]);
      for (let c = 0; c < 3; c++) {
        const r = MFP[i * 3 + c] * ppm * depthScale;
        if (r < 0.6) continue;
        let s = E[i * 3 + c] * 1.5, wsum = 1.5;
        for (let t = 0; t < taps; t++) {
          const dx = POISSON[t][0] * r, dy = POISSON[t][1] * r, sx = Math.round(x + dx), sy = Math.round(y + dy);
          if (sx < 0 || sy < 0 || sx >= w || sy >= h) continue;
          const j = sy * w + sx;
          if (GPART[j] !== pi) continue;
          const wt = Math.exp(-Math.hypot(POISSON[t][0], POISSON[t][1]) * 1.2);
          s += E[j * 3 + c] * wt; wsum += wt;
        }
        ES[i * 3 + c] = s / wsum;
      }
    }
  }

  // ---- 9. Compose the opaque scene
  const C = new Float32Array(N * 3);
  const hazeC = scaleC(linearOf(mood.haze.colour), mood.haze.power);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x, pi = GPART[i];
    if (pi === -2) {
      // beyond the table: the room, glowing towards the window
      const yy = y / h;
      for (let c = 0; c < 3; c++) C[i * 3 + c] = hazeC[c] * (0.55 + 0.45 * (1 - yy));
      continue;
    }
    const px = GP[i * 3], py = GP[i * 3 + 1], pz = GP[i * 3 + 2], nx = BN[i * 3], ny = BN[i * 3 + 1], nz = BN[i * 3 + 2];
    const vx0 = camWorld[0] - px, vy0 = camWorld[1] - py, vz0 = camWorld[2] - pz, vl = Math.hypot(vx0, vy0, vz0), vx = vx0 / vl, vy = vy0 / vl, vz = vz0 / vl;
    const nv0 = Math.max(0, nx * vx + ny * vy + nz * vz);
    for (let c = 0; c < 3; c++) C[i * 3 + c] = ALB[i * 3 + c] * ES[i * 3 + c] * (1 - SPEC[i]) + SPECL[i * 3 + c] + EMIT[i * 3 + c];
    // translucency: backlight through thin matter, forward-scattered towards the camera
    if (TRANS[i] > 0) {
      const th = thicknessAt(px, py, pz), back = Math.max(0, -(nx * L[0] + ny * L[1] + nz * L[2])), fwd = Math.max(0, -(vx * L[0] + vy * L[1] + vz * L[2]));
      const phase = 0.2 + 0.8 * Math.pow(fwd, 3), facing = 0.15 + 0.85 * back;
      for (let c = 0; c < 3; c++) {
        const mfp = Math.max(0.3, MFP[i * 3 + c] || 1.5), T = Math.exp(-th / mfp);
        C[i * 3 + c] += TRANS[i] * sunC[c] * T * phase * facing * ALB[i * 3 + c] * 1.3;
      }
    }
    // sheen: dust, fuzz and flour catch light at grazing angles
    if (SHEEN[i] > 0) {
      const rim = Math.pow(1 - nv0, 3), lit = SHD[i] * 0.7 + 0.3;
      for (let c = 0; c < 3; c++) C[i * 3 + c] += SHEEN[i] * SHT[i * 3 + c] * rim * (sunC[c] * 0.35 * lit + winC[c] * 0.6 + fillC[c] * 0.5) * AOF[i];
    }
    // haze: far table melts into the warm room light
    const far = sst(160, tableDepth, -(pz - tz)) * 0.45;
    for (let c = 0; c < 3; c++) C[i * 3 + c] = C[i * 3 + c] * (1 - far) + hazeC[c] * far;
  }

  // ---- 10. Transparent layers (liquids, glass, syrup), farthest first
  if (layers.length) {
    const tsurf = newSurface(), Gp1 = new Float32Array(3), Gn1 = new Float32Array(3), Go1 = new Float32Array(3), Guv1 = new Float32Array(2);
    const opaqueZ = GZ.slice();
    for (const layer of layers) {
      const under = C.slice(), part = parts[layer.pi], buf = layer.front;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const i = y * w + x, tl = buf.tri[i];
        if (tl < 0 || buf.depth[i] <= opaqueZ[i] + 0.05) continue;
        const a = layer.tris[tl * 3], b = layer.tris[tl * 3 + 1], c = layer.tris[tl * 3 + 2], b1 = buf.b1[i], b2 = buf.b2[i], b0 = 1 - b1 - b2;
        for (let k = 0; k < 3; k++) {
          Gp1[k] = P[a * 3 + k] * b0 + P[b * 3 + k] * b1 + P[c * 3 + k] * b2;
          Gn1[k] = Nn[a * 3 + k] * b0 + Nn[b * 3 + k] * b1 + Nn[c * 3 + k] * b2;
          Go1[k] = OB[a * 3 + k] * b0 + OB[b * 3 + k] * b1 + OB[c * 3 + k] * b2;
        }
        Guv1[0] = UV[a * 2] * b0 + UV[b * 2] * b1 + UV[c * 2] * b2; Guv1[1] = UV[a * 2 + 1] * b0 + UV[b * 2 + 1] * b1 + UV[c * 2 + 1] * b2;
        const nl0 = Math.hypot(Gn1[0], Gn1[1], Gn1[2]) || 1; Gn1[0] /= nl0; Gn1[1] /= nl0; Gn1[2] /= nl0;
        smp.p[0] = Gp1[0]; smp.p[1] = Gp1[1]; smp.p[2] = Gp1[2]; smp.o[0] = Go1[0]; smp.o[1] = Go1[1]; smp.o[2] = Go1[2];
        smp.n[0] = Gn1[0]; smp.n[1] = Gn1[1]; smp.n[2] = Gn1[2];
        const vx0 = camWorld[0] - Gp1[0], vy0 = camWorld[1] - Gp1[1], vz0 = camWorld[2] - Gp1[2], vl = Math.hypot(vx0, vy0, vz0);
        smp.v[0] = vx0 / vl; smp.v[1] = vy0 / vl; smp.v[2] = vz0 / vl;
        if (smp.n[0] * smp.v[0] + smp.n[1] * smp.v[1] + smp.n[2] * smp.v[2] < 0) { smp.n[0] = -smp.n[0]; smp.n[1] = -smp.n[1]; smp.n[2] = -smp.n[2]; }
        smp.uv[0] = Guv1[0]; smp.uv[1] = Guv1[1]; smp.seed = part.seed ?? 1; smp.k = part.k ?? {};
        resetSurface(tsurf); part.surface(smp, tsurf);
        // ripples and fat eyes: a bump from the surface's height, by a small finite difference in object space
        let nx = smp.n[0], ny = smp.n[1], nz = smp.n[2];
        if (tsurf.height !== 0) {
          const h0 = tsurf.height, eps = 0.35;
          smp.o[0] += eps; resetSurface(surf); part.surface(smp, surf); const hx = surf.height; smp.o[0] -= eps;
          smp.o[2] += eps; resetSurface(surf); part.surface(smp, surf); const hz = surf.height; smp.o[2] -= eps;
          nx -= (hx - h0) / eps; nz -= (hz - h0) / eps; const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
        }
        const vx = smp.v[0], vy = smp.v[1], vz = smp.v[2], nv0 = Math.max(0.02, nx * vx + ny * vy + nz * vz);
        const F = tsurf.spec + (1 - tsurf.spec) * Math.pow(1 - nv0, 5);
        // the depth light crosses inside: a thin shell's own thickness, a closed body's front to back, an open
        // surface (a liquid's top) down to whatever is under it
        const zf = buf.depth[i], zb = layer.back[i], closed = zb < zf - 0.5;
        const path = part.thin ? part.thin / Math.max(0.2, nv0) : Math.max(0, zf - Math.max(closed ? zb : -Infinity, opaqueZ[i])) / Math.max(0.25, closed ? 1 : nv0);
        const nvx = nx * screenX[0] + ny * screenX[1] + nz * screenX[2], nvy = nx * screenY[0] + ny * screenY[1] + nz * screenY[2];
        const offPx = tsurf.refract * Math.min(path, 30) * ppm * 0.12, ux = Math.min(w - 1, Math.max(0, Math.round(x - nvx * offPx))), uy = Math.min(h - 1, Math.max(0, Math.round(y + nvy * offPx))), j = uy * w + ux;
        const pl = Math.min(path, 400);
        // light inside the medium: sun (shadowed), window and room
        const sh = shadowAt(Gp1[0], Gp1[1], Gp1[2], nx, ny, nz), lin = [0, 0, 0];
        for (let k = 0; k < 3; k++) lin[k] = sunC[k] * sh * 0.55 + winC[k] * 0.35 + fillC[k] * 0.5 + skyC[k] * 0.8;
        const rough = Math.max(0.02, tsurf.rough), rd = 2 * (nx * vx + ny * vy + nz * vz), rx = rd * nx - vx, ry = rd * ny - vy, rz = rd * nz - vz;
        env(rx, ry, rz, rough, envc);
        const hx0 = L[0] + vx, hy0 = L[1] + vy, hz0 = L[2] + vz, hl = Math.hypot(hx0, hy0, hz0), nh = Math.max(0, (nx * hx0 + ny * hy0 + nz * hz0) / hl);
        const a2 = Math.min(1, rough * rough + sunAlpha) ** 2, Dd = a2 / (Math.PI * (nh * nh * (a2 - 1) + 1) ** 2), nl = Math.max(0, nx * L[0] + ny * L[1] + nz * L[2]);
        const glint = nl > 0 ? Dd * F * 0.25 * sh : 0;
        // backlight glowing through the body (honey, tea, jelly): the sun's light crossing it towards the camera
        const fwd = Math.max(0, -(vx * L[0] + vy * L[1] + vz * L[2])), glow = sh * Math.pow(fwd, 2) * 0.6;
        for (let k = 0; k < 3; k++) {
          const Tr = Math.exp(-tsurf.absorb[k] * pl), sc = 1 - Math.exp(-tsurf.density * pl);
          const body = under[j * 3 + k] * Tr * (1 - sc) + tsurf.scatter[k] * lin[k] * sc + sunC[k] * glow * Math.exp(-tsurf.absorb[k] * pl * 0.35) * (closed && !part.thin ? 1 : 0) + tsurf.emit[k];
          C[i * 3 + k] = body * (1 - F) + envc[k] * F + sunC[k] * glint;
        }
        GZ[i] = Math.max(GZ[i], zf);
      }
    }
  }

  // ---- 11. Steam: invisible at the surface, white a centimetre or two up, curling and thinning within ~15 cm
  if (scene.steam && scene.steam.strength > 0) {
    const st = scene.steam, tv = [0, 0, 0];
    toView(st.at[0], st.at[1], st.at[2], tv);
    const s0 = D / Math.max(1, D - tv[2]), sx0 = cx + tv[0] * s0 * ppm, sy0 = cy - tv[1] * s0 * ppm;
    const cf = normalize([tx - camWorld[0], ty - camWorld[1], tz - camWorld[2]]), fwd = 0.35 + 0.65 * Math.pow(Math.max(0, cf[0] * L[0] + cf[1] * L[1] + cf[2] * L[2]), 2);
    for (let y = 0; y < h; y++) {
      const hmm = (sy0 - y) / (ppm * s0) / Math.max(0.35, ce);
      if (hmm < 2 || hmm > 220) continue;
      for (let x = 0; x < w; x++) {
        const i = y * w + x, xm = (x - sx0) / (ppm * s0), spread = st.radius * (0.85 + hmm / 160);
        const sway = fbm((o.seed ?? 1) + 31, hmm / 90, 0.5, 2) * 18 * (hmm / 120);
        const lat = (xm - sway) / spread;
        if (Math.abs(lat) > 1.4) continue;
        const wisp = fbm((o.seed ?? 1) + 37, (xm - sway) / 14 + fbm((o.seed ?? 1) + 41, xm / 30, hmm / 40, 2) * 1.6, hmm / 34, 4);
        const fil = Math.pow(Math.max(0, wisp * 1.6 + 0.15), 1.8), env0 = (1 - sst(0.6, 1.4, Math.abs(lat))) * sst(2, 22, hmm) * Math.exp(-hmm / 95);
        const a = clamp01(fil * env0 * st.strength * 0.55);
        if (a <= 0.002) continue;
        for (let c = 0; c < 3; c++) C[i * 3 + c] = C[i * 3 + c] * (1 - a) + (sunC[c] * 0.3 * fwd + winC[c] * 0.5 + fillC[c] * 0.6 + 0.03) * a;
      }
    }
  }

  // ---- debug views
  if (o.debug) {
    for (let i = 0; i < N; i++) for (let c = 0; c < 3; c++) {
      const v = o.debug === "albedo" ? ALB[i * 3 + c] : o.debug === "normal" ? BN[i * 3 + c] * 0.5 + 0.5 : o.debug === "ao" ? AOF[i] : o.debug === "shadow" ? SHD[i] : clamp01((GZ[i] + 300) / 400);
      C[i * 3 + c] = GPART[i] === -2 ? 0 : v;
    }
  }

  // ---- 12. Down-sample, depth of field, bloom, grade, tone map
  const RGB = new Float32Array(W * H * 3), Z = new Float32Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let r = 0, g = 0, b = 0, z = 0;
    for (let j = 0; j < SS; j++) for (let k = 0; k < SS; k++) { const s = (y * SS + j) * w + x * SS + k; r += C[s * 3]; g += C[s * 3 + 1]; b += C[s * 3 + 2]; z += GZ[s]; }
    const d = y * W + x, q = SS * SS;
    RGB[d * 3] = r / q; RGB[d * 3 + 1] = g / q; RGB[d * 3 + 2] = b / q; Z[d] = z / q;
  }
  if (o.debug) return finish(RGB, W, H, null, t0);
  let img = RGB;
  const ap = (cam.aperture ?? 7) * (W / 720) / 100;
  if (ap > 0) {
    const tvf = [0, 0, 0];
    const f = cam.focus ?? cam.target;
    toView(f[0], f[1], f[2], tvf);
    const zf = tvf[2], sharp = cam.sharpDepth ?? 45, sig = [0, 1.6, 3.6, 7.5, 14].map(s => s * (W / 720)), levels = sig.map(s => (s < 0.3 ? RGB : gaussianBlur(RGB, W, H, 3, s)));
    img = new Float32Array(RGB.length);
    for (let i = 0; i < W * H; i++) {
      const coc = Math.min(sig[sig.length - 1], Math.max(0, Math.abs(Z[i] - zf) - sharp) * ap * (Z[i] < zf ? 1 : 0.8));
      let k = 0;
      while (k < sig.length - 2 && sig[k + 1] < coc) k++;
      const f2 = clamp01((coc - sig[k]) / Math.max(1e-6, sig[k + 1] - sig[k]));
      for (let c = 0; c < 3; c++) img[i * 3 + c] = levels[k][i * 3 + c] * (1 - f2) + levels[k + 1][i * 3 + c] * f2;
    }
  }
  return finish(img, W, H, mood, t0);
}

/** Bloom, the storybook grade, vignette and filmic tone mapping to 8-bit sRGB. */
function finish(img: Float32Array, W: number, H: number, mood: Mood | null, t0: number): StillLifeRender {
  const n = W * H, out = new Uint8ClampedArray(n * 4);
  if (!mood) {
    for (let i = 0; i < n; i++) { for (let c = 0; c < 3; c++) out[i * 4 + c] = Math.round(clamp01(srgbEncode(clamp01(img[i * 3 + c]))) * 255); out[i * 4 + 3] = 255; }
    return { width: W, height: H, rgba: out, ms: now() - t0 };
  }
  const ex = mood.exposure, g = mood.grade;
  // bloom: the brightest light spills a little (halation), warmer as it spreads
  if (g.bloom > 0) {
    const bright = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { const l = (img[i * 3] * 0.3 + img[i * 3 + 1] * 0.59 + img[i * 3 + 2] * 0.11) * ex, k = Math.max(0, l - 0.9) / Math.max(1e-6, l); for (let c = 0; c < 3; c++) bright[i * 3 + c] = img[i * 3 + c] * k; }
    const b1 = gaussianBlur(bright, W, H, 3, W * 0.012), b2 = gaussianBlur(bright, W, H, 3, W * 0.045), tint = [1.0, 0.86, 0.7];
    for (let i = 0; i < n * 3; i++) img[i] += (b1[i] * 0.6 + b2[i] * 0.4) * g.bloom * tint[i % 3];
  }
  const lift = linearOf(g.lift), hable = (x: number) => ((x * (0.15 * x + 0.05) + 0.004) / (x * (0.15 * x + 0.5) + 0.06)) - 0.0667, hw = hable(5);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x;
    let r = img[i * 3] * ex, gg = img[i * 3 + 1] * ex, b = img[i * 3 + 2] * ex;
    // warmth: highlights towards amber, shadows keep a little cool depth
    const l = r * 0.3 + gg * 0.59 + b * 0.11, hi = sst(0.15, 1.2, l);
    r *= 1 + g.warmth * 0.12 * hi; b *= 1 - g.warmth * 0.14 * hi;
    // saturation about luminance
    const l2 = r * 0.3 + gg * 0.59 + b * 0.11;
    r = l2 + (r - l2) * g.saturation; gg = l2 + (gg - l2) * g.saturation; b = l2 + (b - l2) * g.saturation;
    // vignette: an elliptical fall-off, the way a lens and a pool of light darken the corners
    const dx = (x / W - 0.5) * 1.15, dy = (y / H - 0.47), vg = 1 - g.vignette * sst(0.18, 0.62, dx * dx + dy * dy * 1.3);
    r *= vg; gg *= vg; b *= vg;
    const vals = [r, gg, b];
    for (let c = 0; c < 3; c++) {
      // lifted blacks: shadows settle on a warm umber rather than pure black (a painted, not printed, dark)
      const v = Math.max(0, vals[c]), t = hable(v) / hw, lifted = t + lift[c] * (1 - t) * (1 - sst(0, 0.5, t)) * 1.6;
      out[i * 4 + c] = Math.round(clamp01(srgbEncode(clamp01(lifted))) * 255);
    }
    out[i * 4 + 3] = 255;
  }
  return { width: W, height: H, rgba: out, ms: now() - t0 };
}
const now = () => (typeof performance !== "undefined" ? performance.now() : Date.now());
