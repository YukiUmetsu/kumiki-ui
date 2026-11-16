/**
 * MATL1 swatch renderer: a material as a ball in a photographer's studio, or as a flat tile under raking light, from
 * its procedural texture (`materials-texture.ts`), on the CPU.
 *
 * - Studio: a large softbox up and to the left, a strip light behind on the right, a grey cyclorama with a dark floor
 *   and ceiling. Reflections blur with roughness (the environment is analytic, so it is pre-filtered exactly); the
 *   split-sum approximation (Karis 2014) scales them by Fresnel and the GGX lobe.
 * - Relief: the texture's height (mm) bends the normals (surface-gradient bump mapping, Mikkelsen 2010, on the ball),
 *   casts soft shadows from the raking key (a horizon march, on the tile) and darkens hollows (multi-scale cavity
 *   occlusion).
 * - Translucent materials scatter light below the surface (the irradiance blurred by their scattering radius); clear
 *   ones refract the studio through the ball (Snell, Fresnel and Beer–Lambert absorption); nacre adds thin-film colour;
 *   crystal facets glint; brushed metal stretches its highlights across the strokes.
 * - Wet: porous materials darken (Ångström–Lekner–Dorf, as `wetMaterial`), all gain a water film, and on a tile water
 *   stands in the hollows.
 */
import { createRaster, encodeSrgb, gaussianBlur } from "../anatomy/foundation-raster";
import type { MaterialRecord } from "./materials-data";
import { MATERIALS } from "./materials-data";
import { wetMaterial } from "./materials-physics";
import { materialTexture } from "./materials-texture";
import type { MaterialTexture } from "./materials-texture";

export interface SwatchOptions {
  view?: "ball" | "tile";
  /** Output width and height, px. */
  size?: number;
  /** Samples per pixel along each axis (1–3). */
  supersample?: number;
  /** Tile width or ball diameter, mm (defaults to the texture's). */
  extentMm?: number;
  seed?: number;
  /** 0 dry … 1 soaked, with a water film. */
  wet?: number;
  /** A re-coloured record (aged, custom); defaults to the catalogue's. */
  record?: MaterialRecord;
  /** Key light direction on a tile: azimuth (degrees, 0 = from the right, 90 = from the top) and elevation above the surface. */
  lightAzimuth?: number;
  lightElevation?: number;
  exposure?: number;
  debug?: "albedo" | "height" | "normal" | "shadow" | "ao";
}
export interface MaterialSwatch { width: number; height: number; rgba: Uint8ClampedArray; extentMm: number; texture: MaterialTexture; ms: number }

type V3 = [number, number, number];
const dot = (a: readonly number[], b: readonly number[]) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const norm = (v: readonly number[]): V3 => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
const cross = (a: readonly number[], b: readonly number[]): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const mixc = (a: readonly number[], b: readonly number[], t: number): V3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const sst = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const now = () => (typeof performance !== "undefined" ? performance.now() : Date.now());

// ---- The studio ---------------------------------------------------------------------------------------------------------------

const WALL: V3 = [0.33, 0.335, 0.35], FLOOR: V3 = [0.075, 0.073, 0.07], CEIL: V3 = [0.035, 0.035, 0.04];
const KEY = norm([-0.58, 0.56, 0.6]), KU = norm(cross([0, 1, 0], KEY)), KV = cross(KEY, KU), KEY_RAD = 8, KH = [0.4, 0.27] as const;
const STRIP = norm([0.86, 0.12, -0.5]), SU = norm(cross([0, 1, 0], STRIP)), SV = cross(STRIP, SU), STRIP_RAD = 3.2, SH = [0.07, 0.42] as const;
const KEY_SOLID = 4 * KH[0] * KH[1] / (1 + KH[0] * KH[0] + KH[1] * KH[1]);
/** Radiance seen in direction d (x right, y up, z towards the camera), pre-filtered for roughness. */
function studio(d: readonly number[], rough: number): V3 {
  const b = 0.012 + 0.9 * rough * rough;
  let c = mixc(FLOOR, WALL, sst(-0.2 - b, 0.15 + b, d[1]));
  c = mixc(c, CEIL, sst(0.55 - b, 0.95 + b, d[1]));
  const w = dot(d, KEY);
  if (w > 0.05) {
    const u = Math.abs(dot(d, KU) / w), v = Math.abs(dot(d, KV) / w), k = sst(KH[0] + b, KH[0] - b, u) * sst(KH[1] + b, KH[1] - b, v);
    if (k > 0) { const e = KEY_RAD * (KH[0] * KH[1]) / ((KH[0] + b) * (KH[1] + b)); c = [c[0] + k * e, c[1] + k * e, c[2] + k * e * 0.97]; }
  }
  const ws = dot(d, STRIP);
  if (ws > 0.05) {
    const u = Math.abs(dot(d, SU) / ws), v = Math.abs(dot(d, SV) / ws), k = sst(SH[0] + b, SH[0] - b, u) * sst(SH[1] + b, SH[1] - b, v);
    if (k > 0) { const e = STRIP_RAD * (SH[0] * SH[1]) / ((SH[0] + b) * (SH[1] + b)); c = [c[0] + k * e * 0.95, c[1] + k * e, c[2] + k * e * 1.05]; }
  }
  return c;
}
/** Irradiance on a surface facing n (ambient part: walls, floor, ceiling; the key and strip are added directly). */
function studioAmbient(n: readonly number[]): V3 {
  const t = sst(-0.9, 0.9, n[1]);
  return [Math.PI * (FLOOR[0] * 1.6 + (WALL[0] * 0.75 - FLOOR[0] * 1.6) * t), Math.PI * (FLOOR[1] * 1.6 + (WALL[1] * 0.75 - FLOOR[1] * 1.6) * t), Math.PI * (FLOOR[2] * 1.6 + (WALL[2] * 0.75 - FLOOR[2] * 1.6) * t)];
}
/** The tile's room, seen from a tile on the floor: a large overhead diffuser, brightest up and to the upper left. */
const TBOX = norm([-0.19, 0.19, 1]);
function tileRoom(d: readonly number[], rough: number): V3 {
  const b = 0.03 + 0.9 * rough * rough, cosA = Math.min(1, Math.max(-1, dot(d, TBOX))), ang = Math.acos(cosA), w = 0.11;
  const lobe = 5 * Math.exp(-(ang * ang) / (2 * (w + b) * (w + b))) * (w * w) / ((w + b) * (w + b)) + 0.14 * Math.exp(-(ang * ang) / 0.25);
  const base = 0.025 + 0.06 * sst(-0.1, 0.8, d[2]);
  return [base + lobe, base + lobe, base * 1.03 + lobe];
}
/** Split-sum environment BRDF, Karis's analytic fit: the scale and bias applied to F0. */
function envBrdf(nv: number, rough: number): [number, number] {
  const r0 = rough * -1 + 1, r1 = rough * -0.0275 + 0.0425, r2 = rough * -0.572 + 1.04, r3 = rough * 0.022 - 0.04;
  const a004 = Math.min(r0 * r0, Math.pow(2, -9.28 * nv)) * r0 + r1;
  return [a004 * -1.04 + r2, a004 * 1.04 + r3];
}
const ggx = (nh: number, a: number) => { const a2 = a * a, d = nh * nh * (a2 - 1) + 1; return a2 / (Math.PI * d * d); };
/** Thin-film interference tint (nacre's platelets): reflectance at three wavelengths for a film of `d` µm, n 1.53. */
function thinFilm(d: number, cosI: number): V3 {
  const n = 1.53, cosT = Math.sqrt(Math.max(0, 1 - (1 - cosI * cosI) / (n * n)));
  return [0.61, 0.54, 0.46].map(l => 0.8 + 0.4 * (0.5 + 0.5 * Math.cos((4 * Math.PI * n * d * cosT) / l + Math.PI))) as V3;
}
function refract(i: readonly number[], n: readonly number[], eta: number): V3 | null {
  const c = -dot(n, i), k = 1 - eta * eta * (1 - c * c);
  if (k < 0) return null;
  const s = eta * c - Math.sqrt(k);
  return [eta * i[0] + s * n[0], eta * i[1] + s * n[1], eta * i[2] + s * n[2]];
}

// ---- Render -----------------------------------------------------------------------------------------------------------------

/** Render a material swatch: a ball in a studio or a tile under raking light. Returns 8-bit sRGBA. */
export function renderMaterialSwatch(id: string, o: SwatchOptions = {}): MaterialSwatch {
  const t0 = now(), base = MATERIALS.find(x => x.id === id);
  if (!base) throw new Error(`Unknown material ${id}`);
  const rec = o.record ?? base, tex = materialTexture(id, o.seed ?? 7, rec), view = o.view ?? "ball";
  const S = Math.max(1, Math.min(3, Math.round(o.supersample ?? 2))), size = Math.max(8, Math.round(o.size ?? 160)), N = size * S;
  const ext = o.extentMm ?? (view === "ball" ? tex.ballMm : tex.extentMm), wet = clamp01(o.wet ?? 0);
  const n2 = N * N, A = new Float32Array(n2 * 3), H = new Float32Array(n2), R = new Float32Array(n2), M = new Float32Array(n2), T = new Float32Array(n2 * 2), Fm = new Float32Array(n2), Sc = new Float32Array(n2), inside = new Uint8Array(n2);
  const P = view === "ball" ? new Float32Array(n2 * 3) : null, Nrm = new Float32Array(n2 * 3);
  const metalRec = rec.metal, ior = rec.ior ?? 1.5, F0d = ((ior - 1) / (ior + 1)) ** 2;
  // wet: the record's soaked albedo over its dry albedo, applied to every texel
  const wm = wet > 0 ? wetMaterial(rec, wet) : null, wk: V3 = wm ? [0, 1, 2].map(c => wm.albedo[c] / Math.max(1e-5, rec.albedo[c])) as V3 : [1, 1, 1];
  const cx = N / 2, cy = N * 0.47, Rpx = N * 0.4, ballR = ext / 2, mmpp = view === "ball" ? ballR / Rpx : ext / N;
  // 1. sample the texture
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const k = j * N + i;
    let s;
    if (view === "ball") {
      const sx = (i + 0.5 - cx) / Rpx, sy = (cy - (j + 0.5)) / Rpx, r2 = sx * sx + sy * sy;
      if (r2 > 1.0004) continue;
      const nz = Math.sqrt(Math.max(0, 1 - r2)), px = sx * ballR, py = sy * ballR, pz = nz * ballR;
      P![k * 3] = px; P![k * 3 + 1] = py; P![k * 3 + 2] = pz; Nrm[k * 3] = sx; Nrm[k * 3 + 1] = sy; Nrm[k * 3 + 2] = nz;
      s = tex.solid ? tex.solid(px, py, pz) : tex.sample(ballR * Math.atan2(sx, nz), ballR * Math.asin(Math.max(-1, Math.min(1, sy))), (mmpp * S) / Math.max(0.2, nz));
    } else {
      s = tex.sample(((i + 0.5) / N - 0.5) * ext, (0.5 - (j + 0.5) / N) * ext, mmpp * S);
    }
    inside[k] = 1;
    A[k * 3] = s.a[0] * wk[0]; A[k * 3 + 1] = s.a[1] * wk[1]; A[k * 3 + 2] = s.a[2] * wk[2];
    H[k] = s.h; R[k] = s.r; M[k] = s.m ?? metalRec;
    if (s.t) { T[k * 2] = s.t[0]; T[k * 2 + 1] = s.t[1]; }
    if (s.f) Fm[k] = s.f;
    if (s.s) Sc[k] = s.s;
  }
  // 2. hollows: multi-scale cavity occlusion from the height field
  const Hm = new Float32Array(n2);
  let hmin = Infinity, hmax = -Infinity;
  for (let k = 0; k < n2; k++) if (inside[k]) { hmin = Math.min(hmin, H[k]); hmax = Math.max(hmax, H[k]); }
  for (let k = 0; k < n2; k++) Hm[k] = inside[k] ? H[k] : (Number.isFinite(hmax) ? (hmin + hmax) / 2 : 0);
  const s1 = Math.max(1, 0.9 * S), s2 = Math.max(2, 5 * S), b1 = gaussianBlur(Hm, N, N, 1, s1), b2 = gaussianBlur(Hm, N, N, 1, s2);
  const AO = new Float32Array(n2);
  for (let k = 0; k < n2; k++) AO[k] = clamp01(1 - 1.1 * Math.max(0, b1[k] - Hm[k]) / (s1 * mmpp * 2) - 0.9 * Math.max(0, b2[k] - Hm[k]) / (s2 * mmpp * 2));
  // standing water on a wet tile: the lowest share of the surface fills
  let pool = -Infinity;
  if (wet > 0.3 && view === "tile" && hmax > hmin) {
    const sorted = Array.from(H).sort((a, b) => a - b);
    pool = sorted[Math.floor((wet - 0.3) * 0.35 * (sorted.length - 1))];
  }
  // 3. normals
  const at = (i: number, j: number) => Math.min(N - 1, Math.max(0, j)) * N + Math.min(N - 1, Math.max(0, i));
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const k = j * N + i;
    if (!inside[k]) continue;
    const kl = at(i - 1, j), kr = at(i + 1, j), ku = at(i, j - 1), kd = at(i, j + 1);
    const il = inside[kl] ? kl : k, ir = inside[kr] ? kr : k, iu = inside[ku] ? ku : k, id = inside[kd] ? kd : k;
    const dxs = (il === k ? 0 : 1) + (ir === k ? 0 : 1) || 1, dys = (iu === k ? 0 : 1) + (id === k ? 0 : 1) || 1;
    let hx = (H[ir] - H[il]) / dxs, hy = (H[iu] - H[id]) / dys; // per pixel, screen x right and y up
    if (H[k] < pool) { hx = 0; hy = 0; }
    if (view === "tile") {
      const n = norm([-hx / mmpp - T[k * 2], -hy / mmpp - T[k * 2 + 1], 1]);
      Nrm[k * 3] = n[0]; Nrm[k * 3 + 1] = n[1]; Nrm[k * 3 + 2] = n[2];
    } else {
      // surface gradient (Mikkelsen): bump the sphere's normal by the screen-space derivatives of height and position
      const n: V3 = [Nrm[k * 3], Nrm[k * 3 + 1], Nrm[k * 3 + 2]];
      const dPdx: V3 = [(P![ir * 3] - P![il * 3]) / dxs, (P![ir * 3 + 1] - P![il * 3 + 1]) / dxs, (P![ir * 3 + 2] - P![il * 3 + 2]) / dxs];
      const dPdy: V3 = [(P![iu * 3] - P![id * 3]) / dys, (P![iu * 3 + 1] - P![id * 3 + 1]) / dys, (P![iu * 3 + 2] - P![id * 3 + 2]) / dys];
      const r1 = cross(dPdy, n), r2 = cross(n, dPdx), det = dot(dPdx, r1), sg = det < 0 ? -1 : 1;
      const g: V3 = [sg * (hx * r1[0] + hy * r2[0]), sg * (hx * r1[1] + hy * r2[1]), sg * (hx * r1[2] + hy * r2[2])];
      const ad = Math.abs(det) || 1e-9;
      let nb = norm([ad * n[0] - g[0], ad * n[1] - g[1], ad * n[2] - g[2]]);
      if (T[k * 2] || T[k * 2 + 1]) { const tu = norm(dPdx), tv = norm(dPdy); nb = norm([nb[0] - T[k * 2] * tu[0] - T[k * 2 + 1] * tv[0], nb[1] - T[k * 2] * tu[1] - T[k * 2 + 1] * tv[1], nb[2] - T[k * 2] * tu[2] - T[k * 2 + 1] * tv[2]]); }
      Nrm[k * 3] = nb[0]; Nrm[k * 3 + 1] = nb[1]; Nrm[k * 3 + 2] = nb[2];
    }
  }
  // 4. the key light, its soft shadows on a tile (horizon march), and the diffuse irradiance
  const az = ((o.lightAzimuth ?? 135) * Math.PI) / 180, el = ((o.lightElevation ?? 24) * Math.PI) / 180;
  const Lt: V3 = [Math.cos(el) * Math.cos(az), Math.cos(el) * Math.sin(az), Math.sin(el)], keyT = 4.4;
  const SH = new Float32Array(n2).fill(1);
  if (view === "tile" && hmax - hmin > 1e-4) {
    const di = Math.cos(az), dj = -Math.sin(az), tanE = Math.tan(el), half = (3 * Math.PI) / 180;
    for (let k = 0; k < n2; k++) {
      const i0 = k % N, j0 = (k - i0) / N, h0 = H[k], tmax = Math.min(N * 0.5, (hmax - h0) / (mmpp * Math.max(0.05, tanE - half)) + 2);
      let horizon = -1;
      for (let t = 1; t <= tmax; t += t < 8 ? 1 : 1.5) {
        const ii = Math.round(i0 + di * t), jj = Math.round(j0 + dj * t);
        if (ii < 0 || jj < 0 || ii >= N || jj >= N) break;
        const tan = (H[jj * N + ii] - h0) / (t * mmpp);
        if (tan > horizon) horizon = tan;
      }
      SH[k] = sst(Math.atan(horizon) - half, Math.atan(horizon) + half, el);
    }
  }
  const sss = tex.optics.sss ?? 0, Irr = new Float32Array(n2 * 3);
  for (let k = 0; k < n2; k++) {
    if (!inside[k]) continue;
    const n = [Nrm[k * 3], Nrm[k * 3 + 1], Nrm[k * 3 + 2]], ao = AO[k];
    if (view === "tile") {
      const nl = dot(n, Lt), wrap = sss > 0 ? 0.25 : 0, key = Math.max(0, (nl + wrap) / (1 + wrap)) * keyT * SH[k], amb = (0.95 + 0.3 * n[2]) * ao;
      Irr[k * 3] = key + amb; Irr[k * 3 + 1] = key + amb; Irr[k * 3 + 2] = key + amb * 1.04;
    } else {
      const nl = dot(n, KEY), wrap = sss > 0 ? 0.3 : 0.06, key = KEY_RAD * KEY_SOLID * Math.max(0, (nl + wrap) / (1 + wrap)), rim = STRIP_RAD * 0.12 * Math.max(0, dot(n, STRIP)), amb = studioAmbient(n);
      Irr[k * 3] = key + rim + amb[0] * ao; Irr[k * 3 + 1] = key + rim + amb[1] * ao; Irr[k * 3 + 2] = key * 0.97 + rim + amb[2] * ao;
    }
  }
  // subsurface: light spreads under the surface by the scattering radius
  let IrrS = Irr;
  if (sss > 0) {
    const sig = (sss / mmpp) * 0.5;
    if (sig >= 0.5) {
      const W = new Float32Array(n2); for (let k = 0; k < n2; k++) W[k] = inside[k];
      const bl = gaussianBlur(Irr, N, N, 3, sig), wb = gaussianBlur(W, N, N, 1, sig);
      IrrS = new Float32Array(n2 * 3);
      for (let k = 0; k < n2; k++) if (inside[k]) for (let c = 0; c < 3; c++) IrrS[k * 3 + c] = 0.45 * Irr[k * 3 + c] + 0.55 * bl[k * 3 + c] / Math.max(1e-4, wb[k]);
    }
  }
  // 5. shade
  const out = createRaster(N, N, [0, 0, 0], 1), rgb = out.rgb, aniso = tex.optics.anisotropy ?? 0, film = tex.optics.thinFilm, transmit = !!tex.optics.transmit;
  const camH = ext * 2.6;
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const k = j * N + i;
    if (!inside[k]) {
      // the studio behind the ball: wall above, floor below, the ball's shadows on it
      const sx = (i + 0.5 - cx) / Rpx, sy = (cy - (j + 0.5)) / Rpx, fl = sst(-0.7, -1.15, sy);
      let c = mixc([0.3, 0.305, 0.315], [0.16, 0.158, 0.155], sst(0.9, -1.2, sy));
      const contact = Math.exp(-((sx * sx) / 0.22 + ((sy + 1.0) ** 2) / 0.0025)), cast = Math.exp(-(((sx - 0.55) ** 2) / 0.9 + ((sy + 1.03) ** 2) / 0.012));
      const shade = 1 - fl * (0.5 * cast + 0.75 * contact) - 0.35 * contact;
      c = [c[0] * shade, c[1] * shade, c[2] * shade];
      rgb[k * 3] = c[0]; rgb[k * 3 + 1] = c[1]; rgb[k * 3 + 2] = c[2];
      continue;
    }
    const n: V3 = [Nrm[k * 3], Nrm[k * 3 + 1], Nrm[k * 3 + 2]];
    const V: V3 = view === "ball" ? [0, 0, 1] : norm([-((i + 0.5) / N - 0.5) * ext, ((j + 0.5) / N - 0.5) * ext, camH]);
    const nv = Math.max(1e-3, dot(n, V)), Rv: V3 = [2 * nv * n[0] - V[0], 2 * nv * n[1] - V[1], 2 * nv * n[2] - V[2]];
    let rough = Math.min(1, Math.max(0.02, R[k]));
    const metal = M[k], alb: V3 = [A[k * 3], A[k * 3 + 1], A[k * 3 + 2]];
    if (wm) rough = Math.min(rough, rough + (wm.roughness - rec.roughness.typical));
    const water = H[k] < pool;
    if (water) rough = 0.02;
    const room = view === "ball" ? studio : tileRoom;
    // specular from the environment, stretched across brushing on brushed metal
    let env: V3;
    if (aniso > 0) {
      const tv: V3 = view === "ball" ? norm(cross(n, [1, 0, 0])) : [0, 1, 0];
      env = [0, 0, 0];
      for (let q = -2; q <= 2; q++) { const e = room(norm([Rv[0] + tv[0] * q * aniso * 0.12, Rv[1] + tv[1] * q * aniso * 0.12, Rv[2] + tv[2] * q * aniso * 0.12]), rough); env = [env[0] + e[0] / 5, env[1] + e[1] / 5, env[2] + e[2] / 5]; }
    } else env = room(Rv, rough);
    const [ea, eb] = envBrdf(nv, rough);
    let F0: V3 = metal > 0.5 ? alb : [F0d, F0d, F0d];
    if (metal > 0 && metal < 1) F0 = mixc([F0d, F0d, F0d], alb, metal);
    if (film) { const tint = thinFilm(Fm[k] || film, nv); F0 = [0.16 * tint[0] ** 3, 0.16 * tint[1] ** 3, 0.16 * tint[2] ** 3]; }
    const specOcc = view === "ball" ? 0.4 + 0.6 * AO[k] : 0.3 + 0.7 * AO[k] * (0.5 + 0.5 * SH[k]);
    let spec: V3 = [env[0] * (F0[0] * ea + eb) * specOcc, env[1] * (F0[1] * ea + eb) * specOcc, env[2] * (F0[2] * ea + eb) * specOcc];
    if (view === "tile") {
      // the raking key's own highlight (a small source: its size widens the lobe)
      const Hh = norm([Lt[0] + V[0], Lt[1] + V[1], Lt[2] + V[2]]), nh = Math.max(0, dot(n, Hh)), nl = Math.max(0, dot(n, Lt));
      const a = Math.min(1, rough * rough + 0.03), kk = a / 2, G = (nl / (nl * (1 - kk) + kk)) * (nv / (nv * (1 - kk) + kk)), D = ggx(nh, a), vh = Math.max(0, dot(V, Hh)), fr = Math.pow(1 - vh, 5);
      const s = Math.min(40, (D * G) / (4 * nv)) * nl * keyT * SH[k];
      spec = [spec[0] + s * (F0[0] + (1 - F0[0]) * fr), spec[1] + s * (F0[1] + (1 - F0[1]) * fr), spec[2] + s * (F0[2] + (1 - F0[2]) * fr)];
    }
    // facets that glint: a sharp extra lobe on the tilted crystal faces
    if (T[k * 2] || T[k * 2 + 1]) { const g = room(Rv, 0.04), wg = 0.06 * Math.min(1, Math.hypot(T[k * 2], T[k * 2 + 1]) / 0.25); spec = [spec[0] + g[0] * wg, spec[1] + g[1] * wg, spec[2] + g[2] * wg]; }
    if (water) { const g = room(Rv, 0.02); spec = [g[0] * 0.04 + spec[0] * 0.3, g[1] * 0.04 + spec[1] * 0.3, g[2] * 0.04 + spec[2] * 0.3]; }
    let c: V3;
    if (transmit && view === "ball") {
      // refract through the ball and out the far side; absorb along the chord (record albedo = transmittance per 100 mm)
      const Pv: V3 = [P![k * 3], P![k * 3 + 1], P![k * 3 + 2]], t1 = refract([0, 0, -1], n, 1 / ior);
      let back: V3;
      if (!t1) back = studio(Rv, rough);
      else {
        const t1n = norm(t1), L = Math.max(0, -2 * dot(Pv, t1n)), Q: V3 = [Pv[0] + t1n[0] * L, Pv[1] + t1n[1] * L, Pv[2] + t1n[2] * L], nq = norm(Q);
        const t2 = refract(t1n, [-nq[0], -nq[1], -nq[2]], ior), dir = t2 ? norm(t2) : norm([t1n[0] - 2 * dot(t1n, nq) * nq[0], t1n[1] - 2 * dot(t1n, nq) * nq[1], t1n[2] - 2 * dot(t1n, nq) * nq[2]]);
        const seen = studio(dir, rough * 0.5), tr = [0, 1, 2].map(ch => Math.pow(Math.max(1e-3, rec.albedo[ch]), L / 100));
        // inclusions along the chord whiten the light (cloudy ice): the texture's albedo above the record's
        let cloud = 0;
        if (tex.solid) for (let q = 1; q <= 8; q++) { const p = tex.solid(Pv[0] + t1n[0] * L * q / 9, Pv[1] + t1n[1] * L * q / 9, Pv[2] + t1n[2] * L * q / 9); cloud += (p.s ?? 0) / 8; }
        cloud = clamp01(cloud * (tex.optics.scatterDepth ? 2.2 : 1.2));
        const amb = studioAmbient(n), scat: V3 = [(amb[0] + KEY_RAD * KEY_SOLID * Math.max(0, dot(n, KEY))) / Math.PI, (amb[1] + KEY_RAD * KEY_SOLID * Math.max(0, dot(n, KEY))) / Math.PI, (amb[2] + KEY_RAD * KEY_SOLID * Math.max(0, dot(n, KEY))) / Math.PI];
        back = mixc([seen[0] * tr[0], seen[1] * tr[1], seen[2] * tr[2]], scat, cloud * 0.8);
      }
      const Fr = F0d + (1 - F0d) * Math.pow(1 - nv, 5);
      c = [back[0] * (1 - Fr) + spec[0], back[1] * (1 - Fr) + spec[1], back[2] * (1 - Fr) + spec[2]];
    } else if (transmit) {
      // a clear slab over a grey checker card 4 mm below: the card shifts with the surface's slope
      const depth = 4, sx = ((i + 0.5) / N - 0.5) * ext + n[0] * depth * (1 - 1 / ior) * 6, sy = (0.5 - (j + 0.5) / N) * ext + n[1] * depth * (1 - 1 / ior) * 6;
      const chk = ((Math.floor(sx / 10) + Math.floor(sy / 10)) & 1) ? 0.42 : 0.22, Fr = F0d + (1 - F0d) * Math.pow(1 - nv, 5), lit = 0.5 + keyT * 0.08 * SH[k];
      const cloud = clamp01(Sc[k] * 1.5), card = mixc([chk * lit * rec.albedo[0], chk * lit * rec.albedo[1], chk * lit * rec.albedo[2]], [lit * 0.9, lit * 0.9, lit * 0.92], cloud);
      c = [card[0] * (1 - Fr) + spec[0], card[1] * (1 - Fr) + spec[1], card[2] * (1 - Fr) + spec[2]];
    } else {
      const kd = (1 - metal) * (1 - (F0[1] * ea + eb) * 0.9);
      c = [alb[0] * IrrS[k * 3] / Math.PI * kd + spec[0], alb[1] * IrrS[k * 3 + 1] / Math.PI * kd + spec[1], alb[2] * IrrS[k * 3 + 2] / Math.PI * kd + spec[2]];
      if (film) { const tint = thinFilm(Fm[k] || film, nv); c = [c[0] * (0.8 + 0.2 * tint[0]), c[1] * (0.8 + 0.2 * tint[1]), c[2] * (0.8 + 0.2 * tint[2])]; }
    }
    if (o.debug) {
      if (o.debug === "albedo") c = alb;
      else if (o.debug === "normal") c = [n[0] * 0.5 + 0.5, n[1] * 0.5 + 0.5, n[2] * 0.5 + 0.5];
      else if (o.debug === "height") { const v = (H[k] - hmin) / Math.max(1e-6, hmax - hmin); c = [v, v, v]; }
      else if (o.debug === "shadow") c = [SH[k], SH[k], SH[k]];
      else c = [AO[k], AO[k], AO[k]];
    }
    rgb[k * 3] = c[0]; rgb[k * 3 + 1] = c[1]; rgb[k * 3 + 2] = c[2];
  }
  // 6. downsample in linear light, tone map, encode
  const small = createRaster(size, size, [0, 0, 0], 1), inv = 1 / (S * S);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    let r = 0, g = 0, b = 0;
    for (let q = 0; q < S; q++) for (let p = 0; p < S; p++) { const k = (y * S + q) * N + x * S + p; r += rgb[k * 3]; g += rgb[k * 3 + 1]; b += rgb[k * 3 + 2]; }
    const d = y * size + x; small.rgb[d * 3] = r * inv; small.rgb[d * 3 + 1] = g * inv; small.rgb[d * 3 + 2] = b * inv;
  }
  const rgba = o.debug ? encodeSrgb(small, { toneMap: "none" }) : encodeSrgb(small, { toneMap: "aces", exposure: o.exposure ?? (view === "tile" ? 0.82 : 0.9) });
  return { width: size, height: size, rgba, extentMm: ext, texture: tex, ms: now() - t0 };
}
