/**
 * WATER1 ocean: the open sea for a wind, as a spectrum of real waves summed by FFT (Tessendorf 2001), rendered on the
 * CPU under the physical sky of SKY1.
 *
 * - The sea: a JONSWAP spectrum (Hasselmann et al. 1973; a fully developed Pierson–Moskowitz sea when the fetch is
 *   unlimited), spread over directions by cos^2s with s from Hasselmann et al. (1980), each wave moving at its own
 *   speed (deep water, ω² = gk, capillary correction for the shortest). Three cascades of different sizes cover swell
 *   to ripples without visible tiling. Crests sharpen by horizontal displacement ("choppy" waves); where the surface
 *   folds (the Jacobian drops), whitecaps form, set so that they cover the share Monahan & O'Muircheartaigh (1980)
 *   measured for the wind, with foam lingering about 5 s (measured in WATER1).
 * - The light: Fresnel reflection of the sky and its clouds (`skyEnvironment`); the sun's glitter from slopes finer
 *   than a pixel, with the mean square slope of Cox & Munk (1954); light coming back up out of the water from
 *   absorption and scattering (R ≈ 0.33 b_b ÷ a: blue for clear deep water); light through thin crests, green-blue;
 *   foam lit by sun and sky; haze to the horizon.
 */
import { fft2, hash2, worley } from "../anatomy/foundation-raster";
import { G, SLOPES, WATER_ABSORPTION, WHITECAPS, FOAM_DECAY, FULLY_DEVELOPED } from "./water-data";
import type { V3 } from "./sky-atmosphere";
import { norm3 } from "./sky-atmosphere";
import type { SkyRenderOptions } from "./sky-volume";
import { skyEnvironment } from "./sky-volume";

// ---- The spectrum -----------------------------------------------------------------------------------------------------------

export interface OceanOptions {
  /** Wind speed at 10 m, m/s. */
  wind?: number;
  /** Direction the wind blows towards, degrees (0 = away from the viewer, 90 = to the right). */
  windDirection?: number;
  /** Fetch, km; omit for a fully developed sea. */
  fetchKm?: number;
  /** How much crests sharpen (Tessendorf's λ; 0 = round sine-like waves). */
  choppiness?: number;
  time?: number;
  seed?: number;
}
/** Sea-spectrum parameters (reported, JONSWAP: Hasselmann et al. 1973, via Stewart, Introduction to Physical Oceanography 16.4). */
export const JONSWAP = { gamma: 3.3, sigmaBelow: 0.07, sigmaAbove: 0.09, alphaPM: 0.0081, source: "Hasselmann et al. 1973 (JONSWAP); Pierson & Moskowitz 1964; Stewart, Introduction to Physical Oceanography 16.4" } as const;
/** Spreading s(ω/ω_p) for cos^2s(θ/2) (estimated: the Hasselmann et al. 1980 fit as commonly quoted, 6.97 (f/f_p)^4.06 below the peak, 9.77 (f/f_p)^−2.33 above). */
export const spreading = (r: number) => (r < 1 ? 6.97 * Math.pow(r, 4.06) : 9.77 * Math.pow(r, -2.33));
/** Surface tension over density for water (m³/s²): the capillary correction ω² = gk + (T/ρ)k³. */
const TENSION = 7.4e-5;
const omegaOf = (k: number) => Math.sqrt(G * k + TENSION * k * k * k);
const dOmega = (k: number) => (G + 3 * TENSION * k * k) / (2 * omegaOf(k));
function lgamma(x: number): number {
  // Lanczos, g 7
  const c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
  if (x < 0.5) return Math.log(Math.PI / Math.abs(Math.sin(Math.PI * x))) - lgamma(1 - x);
  x -= 1;
  let a = c[0];
  const t = x + 7.5;
  for (let i = 1; i < 9; i++) a += c[i] / (x + i);
  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
}
/** Normalisation of cos^2s(θ/2) over the circle. */
const spreadNorm = (s: number) => Math.exp((2 * s - 1) * Math.LN2 + 2 * lgamma(s + 1) - lgamma(2 * s + 1)) / Math.PI;

export interface SeaSpectrum {
  /** Peak angular frequency (rad/s), period (s), wavelength (m) and significant height (m). */
  omegaPeak: number; peakPeriod: number; peakLength: number; significantHeight: number;
  alpha: number; gamma: number;
  /** Frequency spectrum S(ω), m²·s. */
  s: (omega: number) => number;
  /** Directional spectrum in wavenumber space Ψ(kx, kz), m⁴ (per rad² per m⁻²). */
  psi: (kx: number, kz: number) => number;
}
/** The sea for a wind (and fetch). Fully developed: ω_p = 0.877 g ÷ U₁₉.₅, α 0.0081 (Pierson–Moskowitz). Fetch-limited: JONSWAP's α and ω_p from the dimensionless fetch. */
export function seaSpectrum(o: OceanOptions = {}): SeaSpectrum {
  const U = Math.max(0.5, o.wind ?? 8), dir = ((o.windDirection ?? 80) * Math.PI) / 180;
  let alpha: number, omegaPeak: number, gamma: number;
  if (o.fetchKm && o.fetchKm > 0) {
    const X = (G * o.fetchKm * 1000) / (U * U);
    alpha = 0.076 * Math.pow(X, -0.22); omegaPeak = 22 * (G / U) * Math.pow(X, -1 / 3); gamma = JONSWAP.gamma;
    // a short fetch cannot make a sea beyond fully developed
    omegaPeak = Math.max(omegaPeak, (FULLY_DEVELOPED.peak * G) / (U * FULLY_DEVELOPED.u195));
  } else { alpha = JONSWAP.alphaPM; omegaPeak = (FULLY_DEVELOPED.peak * G) / (U * FULLY_DEVELOPED.u195); gamma = 1; }
  const s = (w: number) => {
    if (w <= 0) return 0;
    const sig = w <= omegaPeak ? JONSWAP.sigmaBelow : JONSWAP.sigmaAbove, r = Math.exp(-((w - omegaPeak) ** 2) / (2 * sig * sig * omegaPeak * omegaPeak));
    return (alpha * G * G) / Math.pow(w, 5) * Math.exp(-1.25 * Math.pow(omegaPeak / w, 4)) * Math.pow(gamma, r);
  };
  const psi = (kx: number, kz: number) => {
    const k = Math.hypot(kx, kz);
    if (k < 1e-6) return 0;
    const w = omegaOf(k), th = Math.atan2(kx, kz) - dir, sp = Math.max(0.5, spreading(w / omegaPeak)), d = spreadNorm(sp) * Math.pow(Math.abs(Math.cos(th / 2)), 2 * sp);
    return (s(w) * d * dOmega(k)) / k;
  };
  // significant height 4√m₀ by integrating S(ω)
  let m0 = 0;
  for (let i = 1; i < 4000; i++) { const w = (i / 4000) * omegaPeak * 8; m0 += s(w) * (omegaPeak * 8) / 4000; }
  const peakLength = (2 * Math.PI * G) / (omegaPeak * omegaPeak);
  return { omegaPeak, peakPeriod: (2 * Math.PI) / omegaPeak, peakLength, significantHeight: 4 * Math.sqrt(m0), alpha, gamma, s, psi };
}

// ---- The surface by FFT ------------------------------------------------------------------------------------------------------

interface Cascade { L: number; n: number; h: Float32Array; dx: Float32Array; dz: Float32Array; sx: Float32Array; sz: Float32Array; jxx: Float32Array; jzz: Float32Array; jxz: Float32Array; slopeVar: number; jPrev?: Float32Array }
export interface OceanField {
  spectrum: SeaSpectrum;
  cascades: readonly { L: number; n: number; slopeVar: number }[];
  /** Height (m), horizontal displacement, slopes and the Jacobian at (x, z) m; `fp` is a footprint (m): finer cascades fade. */
  sample: (x: number, z: number, fp?: number) => { h: number; dx: number; dz: number; sx: number; sz: number; jac: number; jacPrev: number; unresolvedSlopeVar: number };
  /** The Jacobian below which the surface is whitecapped (calibrated to Monahan's coverage). */
  foamThreshold: number;
  whitecapCover: number;
  /** Total mean square slope (Cox & Munk) and the share resolved by the cascades. */
  meanSquareSlope: number; resolvedSlopeVar: number;
}

function gaussPair(seed: number, i: number, j: number): [number, number] {
  const u1 = Math.max(1e-9, hash2(seed, i, j)), u2 = hash2(seed + 1, i, j), r = Math.sqrt(-2 * Math.log(u1));
  return [r * Math.cos(2 * Math.PI * u2), r * Math.sin(2 * Math.PI * u2)];
}

/** Build the sea surface: three FFT cascades of the spectrum at time t (and 2.5 s earlier, for foam). */
export function oceanField(o: OceanOptions = {}): OceanField {
  const spec = seaSpectrum(o), lam = o.choppiness ?? 1.25, t = o.time ?? 0, seed = o.seed ?? 1, U = Math.max(0.5, o.wind ?? 8);
  // cascade sizes: the first holds a few peak wavelengths; each next is about 8.3 times smaller (no common tile)
  const L0 = Math.max(48, spec.peakLength * 3.2), sizes = [L0, L0 / 8.3, L0 / 8.3 / 8.3], ns = [256, 128, 128];
  const kCut = sizes.map((L, i) => (i === 0 ? 0 : ((2 * Math.PI) / L) * 3.5));
  const cascades: Cascade[] = sizes.map((L, ci) => {
    const n = ns[ci], dk = (2 * Math.PI) / L, kLo = kCut[ci], kHi = ci < 2 ? kCut[ci + 1] : Infinity;
    const N2 = n * n, re = new Float64Array(N2), im = new Float64Array(N2);
    const h0r = new Float64Array(N2), h0i = new Float64Array(N2), wk = new Float64Array(N2), kxA = new Float64Array(N2), kzA = new Float64Array(N2);
    let slopeVar = 0;
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const mi = i < n / 2 ? i : i - n, mj = j < n / 2 ? j : j - n, kx = mi * dk, kz = mj * dk, k = Math.hypot(kx, kz), idx = j * n + i;
      kxA[idx] = kx; kzA[idx] = kz; wk[idx] = omegaOf(k);
      if (k < kLo || k >= kHi || k === 0) continue;
      const amp = Math.sqrt((spec.psi(kx, kz) * dk * dk) / 2), [g1, g2] = gaussPair(seed + ci * 101, mi, mj);
      h0r[idx] = (g1 * amp) / Math.SQRT2; h0i[idx] = (g2 * amp) / Math.SQRT2;
      slopeVar += 2 * amp * amp * k * k;
    }
    // h̃(k, t) = h̃0(k) e^{iωt} + conj(h̃0(−k)) e^{−iωt}
    const htAt = (time: number) => {
      const hr = new Float64Array(N2), hi = new Float64Array(N2);
      for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
        const idx = j * n + i, nidx = ((n - j) % n) * n + ((n - i) % n), w = wk[idx] * time, c = Math.cos(w), s = Math.sin(w);
        const ar = h0r[idx], ai = h0i[idx], br = h0r[nidx], bi = -h0i[nidx];
        hr[idx] = ar * c - ai * s + br * c + bi * s; hi[idx] = ar * s + ai * c - br * s + bi * c;
      }
      return [hr, hi] as const;
    };
    const field = (hr: Float64Array, hi: Float64Array, mulR: (idx: number) => number, mulI: (idx: number) => number) => {
      // multiply h̃ by (mulR + i mulI) and transform back
      for (let idx = 0; idx < N2; idx++) { const a = mulR(idx), b = mulI(idx); re[idx] = hr[idx] * a - hi[idx] * b; im[idx] = hr[idx] * b + hi[idx] * a; }
      fft2(re, im, n, true);
      const out = new Float32Array(N2);
      for (let idx = 0; idx < N2; idx++) out[idx] = re[idx] * N2;
      return out;
    };
    const kk = (idx: number) => Math.max(1e-9, Math.hypot(kxA[idx], kzA[idx]));
    const [hr, hi] = htAt(t);
    const one = () => 1, zero = () => 0;
    const h = field(hr, hi, one, zero);
    // D = −i (k/|k|) h̃ ; slopes = i k h̃ ; ∂D/∂x = (kx²/|k|) h̃ …
    const dx = field(hr, hi, zero, idx => -kxA[idx] / kk(idx)), dz = field(hr, hi, zero, idx => -kzA[idx] / kk(idx));
    const sx = field(hr, hi, zero, idx => kxA[idx]), sz = field(hr, hi, zero, idx => kzA[idx]);
    const jxx = field(hr, hi, idx => (kxA[idx] * kxA[idx]) / kk(idx), zero), jzz = field(hr, hi, idx => (kzA[idx] * kzA[idx]) / kk(idx), zero), jxz = field(hr, hi, idx => (kxA[idx] * kzA[idx]) / kk(idx), zero);
    const c: Cascade = { L, n, h, dx, dz, sx, sz, jxx, jzz, jxz, slopeVar };
    if (ci === 0) {
      // the Jacobian 2.5 s earlier: foam made then is still fading
      const [pr, pi] = htAt(t - FOAM_DECAY.median / 2);
      const pxx = field(pr, pi, idx => (kxA[idx] * kxA[idx]) / kk(idx), zero), pzz = field(pr, pi, idx => (kzA[idx] * kzA[idx]) / kk(idx), zero), pxz = field(pr, pi, idx => (kxA[idx] * kzA[idx]) / kk(idx), zero);
      c.jPrev = new Float32Array(N2);
      for (let idx = 0; idx < N2; idx++) c.jPrev[idx] = (1 - lam * pxx[idx]) * (1 - lam * pzz[idx]) - lam * lam * pxz[idx] * pxz[idx];
    }
    return c;
  });
  const bil = (a: Float32Array, n: number, L: number, x: number, z: number) => {
    const fx = (x / L) * n, fz = (z / L) * n, i0 = Math.floor(fx), j0 = Math.floor(fz), u = fx - i0, v = fz - j0, m = n - 1;
    const i1 = (i0 + 1) & m, j1 = (j0 + 1) & m, a0 = i0 & m, b0 = j0 & m;
    return (a[b0 * n + a0] * (1 - u) + a[b0 * n + i1] * u) * (1 - v) + (a[j1 * n + a0] * (1 - u) + a[j1 * n + i1] * u) * v;
  };
  const meanSquareSlope = SLOPES.base + SLOPES.perWind * U;
  // the spectrum's short waves can be steeper than the sea really is: scale the finer cascades so the resolved slopes
  // stay within 85% of Cox & Munk's measured mean square slope for this wind (the rest is left as sub-pixel roughness)
  {
    const allowed = 0.85 * meanSquareSlope, sv0 = cascades[0].slopeVar, rest = cascades.slice(1).reduce((s, c) => s + c.slopeVar, 0);
    const scaleArr = (c: Cascade, f: number) => { for (const a of [c.h, c.dx, c.dz, c.sx, c.sz, c.jxx, c.jzz, c.jxz]) for (let i = 0; i < a.length; i++) a[i] *= f; c.slopeVar *= f * f; };
    if (sv0 > allowed) { const f = Math.sqrt(allowed / sv0); scaleArr(cascades[0], f); for (const c of cascades.slice(1)) scaleArr(c, Math.sqrt(0.05)); }
    else if (sv0 + rest > allowed) { const f = Math.sqrt(Math.max(0.05, (allowed - sv0) / rest)); for (const c of cascades.slice(1)) scaleArr(c, f); }
  }
  const resolvedSlopeVar = cascades.reduce((s, c) => s + c.slopeVar, 0);
  const sample = (x: number, z: number, fp = 0) => {
    let h = 0, dx = 0, dz = 0, sx = 0, sz = 0, jxx = 0, jzz = 0, jxz = 0, kept = 0, jPrev = 1;
    for (const c of cascades) {
      // a cascade whose shortest waves are smaller than the footprint fades out (its slopes join the unresolved roughness)
      const shortest = c.L / c.n * 2.5, u = fp <= 0 ? 1 : Math.min(1, Math.max(0, (shortest * 3.2 - fp) / (shortest * 2.6))), w = u * u * (3 - 2 * u);
      if (w <= 0) continue;
      h += w * bil(c.h, c.n, c.L, x, z); dx += w * bil(c.dx, c.n, c.L, x, z); dz += w * bil(c.dz, c.n, c.L, x, z);
      sx += w * bil(c.sx, c.n, c.L, x, z); sz += w * bil(c.sz, c.n, c.L, x, z);
      jxx += w * bil(c.jxx, c.n, c.L, x, z); jzz += w * bil(c.jzz, c.n, c.L, x, z); jxz += w * bil(c.jxz, c.n, c.L, x, z);
      kept += w * c.slopeVar;
      if (c.jPrev) jPrev = bil(c.jPrev, c.n, c.L, x, z);
    }
    const jac = (1 - lam * jxx) * (1 - lam * jzz) - lam * lam * jxz * jxz;
    // points move by −λD (crests gather and sharpen, troughs flatten); slopes in world space follow the stretch
    const ex = Math.max(0.25, 1 - lam * jxx), ez = Math.max(0.25, 1 - lam * jzz);
    return { h, dx: -lam * dx, dz: -lam * dz, sx: sx / ex, sz: sz / ez, jac, jacPrev: jPrev, unresolvedSlopeVar: Math.max(0.0008, meanSquareSlope - kept) };
  };
  // foam threshold: the Jacobian quantile equal to Monahan's whitecap cover for this wind
  const whitecapCover = U < WHITECAPS.onset ? 0 : Math.min(0.3, WHITECAPS.a * Math.pow(U, WHITECAPS.b));
  const js: number[] = [];
  const c0 = cascades[0];
  for (let idx = 0; idx < c0.n * c0.n; idx += 3) { const x = (idx % c0.n) * (c0.L / c0.n), z = Math.floor(idx / c0.n) * (c0.L / c0.n); js.push(sample(x, z).jac); }
  js.sort((a, b) => a - b);
  const foamThreshold = whitecapCover > 0 ? js[Math.min(js.length - 1, Math.floor(whitecapCover * js.length))] : -Infinity;
  return { spectrum: spec, cascades: cascades.map(c => ({ L: c.L, n: c.n, slopeVar: c.slopeVar })), sample, foamThreshold, whitecapCover, meanSquareSlope, resolvedSlopeVar };
}

// ---- Optics of the water ----------------------------------------------------------------------------------------------------------

/** Absorption of pure water at a wavelength (nm), m⁻¹ (WATER1's table). */
export function waterAbsorption(nm: number): number {
  const t = WATER_ABSORPTION;
  if (nm <= t[0][0]) return t[0][1];
  for (let i = 1; i < t.length; i++) if (nm <= t[i][0]) { const [a, b] = [t[i - 1], t[i]], u = (nm - a[0]) / (b[0] - a[0]); return a[1] + (b[1] - a[1]) * u; }
  return t[t.length - 1][1];
}
/** Backscattering by seawater, m⁻¹: half of Morel's (1974) 0.00288 at 500 nm × (λ/500)^−4.32 (reported), plus a little from particles (estimated). */
export const backscatter = (nm: number, particles = 0.0006) => 0.5 * 0.00288 * Math.pow(nm / 500, -4.32) + particles * (550 / nm);
/** The three wavelengths the renderer uses for red, green and blue. */
export const RGB_NM = [610, 545, 465] as const;
/** Light coming back up out of deep water per unit downwelling light: R ≈ 0.33 b_b ÷ a (estimated: the Gordon et al. 1975 approximation as commonly quoted). */
export const subsurfaceReflectance = (particles = 0.0006): V3 => RGB_NM.map(nm => (0.33 * backscatter(nm, particles)) / (waterAbsorption(nm) + backscatter(nm, particles))) as V3;

// ---- Rendering ------------------------------------------------------------------------------------------------------------------

export interface OceanRenderOptions extends OceanOptions {
  width?: number; height?: number;
  /** Eye above the sea, m; look up (positive) or down, degrees; horizontal field of view, degrees. */
  eyeHeight?: number; pitch?: number; fov?: number;
  sunElevation?: number; sunAzimuth?: number; visibilityKm?: number;
  /** Cloud layers in the sky (reflected in the sea). */
  sky?: SkyRenderOptions["layers"];
  /** Suspended particles: more makes the water greener and lighter (backscatter, m⁻¹ at 550 nm). */
  particles?: number;
  exposure?: number;
}
export interface OceanRender { width: number; height: number; rgba: Uint8ClampedArray; ms: number; field: OceanField }

const RE = 6_371_000;
const ACES = (v: number) => Math.min(1, Math.max(0, (v * (2.51 * v + 0.03)) / (v * (2.43 * v + 0.59) + 0.14)));
const enc = (v: number) => Math.round(255 * (v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055));
/** Unpolarised Fresnel reflectance of water for the cosine of the incidence angle. */
export function fresnelWater(cosI: number, n = 1.333): number {
  const c = Math.min(1, Math.max(0, cosI)), s2 = 1 - c * c, t2 = 1 - s2 / (n * n);
  if (t2 <= 0) return 1;
  const ct = Math.sqrt(t2), rs = (c - n * ct) / (c + n * ct), rp = (n * c - ct) / (n * c + ct);
  return 0.5 * (rs * rs + rp * rp);
}

/** Render the open sea for a wind under a sky. Returns 8-bit sRGBA. */
export function renderOcean(o: OceanRenderOptions = {}): OceanRender {
  const t0 = typeof performance !== "undefined" ? performance.now() : Date.now();
  const W = Math.max(16, Math.round(o.width ?? 480)), H = Math.max(9, Math.round(o.height ?? 270)), eye = o.eyeHeight ?? 4;
  const field = oceanField(o), Hs = field.spectrum.significantHeight;
  const skyOpts: SkyRenderOptions = { layers: o.sky ?? [], sunElevation: o.sunElevation ?? 25, sunAzimuth: o.sunAzimuth ?? 10, visibilityKm: o.visibilityKm ?? 40, eyeHeight: eye, steps: 56, seed: o.seed, wind: o.windDirection };
  const env = skyEnvironment(skyOpts, 384, 96), { shader } = env, atm = shader.atm, sun = shader.sun;
  const pitch = ((o.pitch ?? -6) * Math.PI) / 180, fov = ((o.fov ?? 60) * Math.PI) / 180, tx = Math.tan(fov / 2), ty = tx * (H / W);
  const fwd: V3 = [0, Math.sin(pitch), Math.cos(pitch)], right: V3 = [1, 0, 0], up: V3 = [0, Math.cos(pitch), -Math.sin(pitch)];
  const pixelAngle = (2 * tx) / W;
  // light falling on the sea: sun (through the clouds) and sky
  const sunTop = atm.sunlight(0, Math.max(0, sun[1])), sunVis = shader.meanSun;
  const Ed: V3 = shader.groundLight;
  void sunTop;
  const Rsub = subsurfaceReflectance(o.particles ?? 0.0006), absorb = RGB_NM.map(nm => waterAbsorption(nm)) as V3;
  const vis = (o.visibilityKm ?? 40) * 1000;
  const hdr = new Float32Array(W * H * 3);
  const wdir = ((o.windDirection ?? 80) * Math.PI) / 180, wx = Math.sin(wdir), wz = Math.cos(wdir);
  // the sea's surface along a ray: altitude of the ray minus the displaced surface height (curved Earth)
  const surfaceAt = (x: number, z: number, fp: number) => {
    // undo the horizontal displacement: find the grid point that moved to (x, z)
    let px = x, pz = z, s = field.sample(px, pz, fp);
    for (let it = 0; it < 2; it++) { px = x - s.dx; pz = z - s.dz; s = field.sample(px, pz, fp); }
    return s;
  };
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const ux = ((i + 0.5) / W) * 2 - 1, uy = 1 - ((j + 0.5) / H) * 2;
    const d = norm3([fwd[0] + right[0] * ux * tx + up[0] * uy * ty, fwd[1] + right[1] * ux * tx + up[1] * uy * ty, fwd[2] + right[2] * ux * tx + up[2] * uy * ty]);
    let col: V3;
    const a = (d[0] * d[0] + d[2] * d[2]) / (2 * RE), horizonDy = -Math.sqrt((2 * eye) / RE);
    if (d[1] >= horizonDy) {
      // the sky; two rays near the horizon, where distant clouds are crossed in a few long steps
      const jit = ((i * 7 + j * 13) % 16) / 16;
      if (d[1] < 0.1) { const dd = (0.25 * 2 * ty) / H, a2 = shader.shade(norm3([d[0], d[1] + dd, d[2]]), jit), b2 = shader.shade(norm3([d[0], d[1] - dd, d[2]]), (jit + 0.5) % 1); col = [(a2[0] + b2[0]) / 2, (a2[1] + b2[1]) / 2, (a2[2] + b2[2]) / 2]; }
      else col = shader.shade(d, jit);
    }
    else {
      // march from where the ray is a wave height above the mean sea to where it is a wave height below; refine the crossing
      const top = Math.max(0.3, Hs * 1.1 + 0.2), tAt = (y: number) => { const c = eye - y, disc = d[1] * d[1] - 4 * a * c; return disc < 0 ? Infinity : (-d[1] - Math.sqrt(disc)) / (2 * a || 1e-12); };
      const flat = (y: number) => (a < 1e-15 ? (eye - y) / -d[1] : tAt(y));
      let tA = Math.max(0.01, flat(top)), tB = flat(-top);
      if (!Number.isFinite(tB)) tB = flat(0) * 1.2;
      const f = (tt: number, fp: number) => { const x = d[0] * tt, z = d[2] * tt, yRay = eye + d[1] * tt + a * tt * tt; return yRay - surfaceAt(x, z, fp).h; };
      // the pixel's footprint on the sea: stretched along the view by grazing, but the geometric mean of its two sides sets the detail
      const fpAt = (tt: number) => (pixelAngle * tt) / Math.sqrt(Math.max(0.02, -d[1]));
      let fA = f(tA, fpAt(tA)), hit = tB;
      const steps = 14;
      for (let s = 1; s <= steps; s++) {
        const tt = tA + (tB - tA) * (s / steps) ** 1.5, ft = f(tt, fpAt(tt));
        if (ft <= 0) {
          // secant refinement
          let lo = tA, hi = tt, flo = fA, fhi = ft;
          for (let r = 0; r < 4; r++) { const m = lo + (hi - lo) * flo / Math.max(1e-9, flo - fhi), fm = f(m, fpAt(m)); if (fm > 0) { lo = m; flo = fm; } else { hi = m; fhi = fm; } }
          hit = (lo + hi) / 2; break;
        }
        tA = tt; fA = ft;
      }
      const x = d[0] * hit, z = d[2] * hit, fp = fpAt(hit), s = surfaceAt(x, z, fp);
      // the displaced surface's normal; slopes finer than the footprint become roughness (Cox–Munk)
      const n = norm3([-s.sx, 1, -s.sz]), sig2 = s.unresolvedSlopeVar;
      const V: V3 = [-d[0], -d[1], -d[2]], cosV = Math.max(0.01, V[0] * n[0] + V[1] * n[1] + V[2] * n[2]);
      const F = fresnelWater(cosV);
      // reflection: the sky around the mirror direction, spread by the unresolved slopes (four samples)
      const refl: V3 = [0, 0, 0], sd = Math.sqrt(sig2) * 0.9;
      for (let q = 0; q < 4; q++) {
        const ox = (q & 1 ? 1 : -1) * sd * 0.7, oz = (q & 2 ? 1 : -1) * sd * 0.7, nq = norm3([n[0] - ox, n[1], n[2] - oz]), dn = d[0] * nq[0] + d[1] * nq[1] + d[2] * nq[2];
        let R: V3 = [d[0] - 2 * dn * nq[0], d[1] - 2 * dn * nq[1], d[2] - 2 * dn * nq[2]];
        let dim = 1;
        if (R[1] < 0.002) { R = [R[0], Math.max(0.002, -R[1] * 0.3), R[2]]; dim = 0.35; } // the reflection meets another wave
        const e = env.lookup(R);
        refl[0] += (e[0] * dim) / 4; refl[1] += (e[1] * dim) / 4; refl[2] += (e[2] * dim) / 4;
      }
      // the sun's glitter: facets tilted to mirror the sun, Cox–Munk's Gaussian slope density
      let glint = 0;
      if (sun[1] > -0.01) {
        const hv = norm3([sun[0] + V[0], sun[1] + V[1], sun[2] + V[2]]), cosB = Math.max(1e-3, hv[0] * n[0] + hv[1] * n[1] + hv[2] * n[2]);
        const tan2 = (1 - cosB * cosB) / (cosB * cosB), p = Math.exp(-tan2 / (2 * sig2)) / (2 * Math.PI * sig2);
        const cosHV = Math.max(0, hv[0] * V[0] + hv[1] * V[1] + hv[2] * V[2]);
        glint = (fresnelWater(cosHV) * p) / (4 * cosV * Math.pow(cosB, 4)) * sunVis;
      }
      const sunC = atm.sunlight(0, Math.max(0, sun[1]));
      // light from below: downwelling light that entered, scattered back up through the surface
      const up: V3 = [0, 1, 2].map(c => (Ed[c] * Rsub[c] * (1 - F) * 0.55) / Math.PI) as V3;
      // light through thin crests (backlit): green-blue, stronger on steep crests seen against the sun
      const crest = Math.max(0, s.h) / Math.max(0.2, Hs), toward = Math.max(0, (d[0] * sun[0] + d[2] * sun[2]) / Math.max(1e-3, Math.hypot(d[0], d[2]) * Math.hypot(sun[0], sun[2])));
      const sssW = crest * crest * toward * toward * Math.max(0, sun[1] + 0.15) * 0.05 * (1 - F) * sunVis;
      // foam: whitecaps where the surface folds, and foam from the last few seconds fading
      // the soft edge widens only as much as the cover allows (calm seas stay clear)
      const margin = Math.min(0.06, field.whitecapCover * 3), fresh = field.whitecapCover < 5e-4 ? 0 : Math.min(1, Math.max(0, (field.foamThreshold + margin - s.jac) / (0.04 + margin * 1.6))), old = field.whitecapCover < 5e-4 ? 0 : Math.min(1, Math.max(0, (field.foamThreshold + margin * 0.5 - s.jacPrev) / (0.06 + margin * 2))) * Math.exp(-0.5);
      let foam = Math.max(fresh, old * 0.8);
      if (foam > 0) {
        // bubbles and streaks along the wind
        const wu = x * wx + z * wz, wv = -x * wz + z * wx, b = worley(o.seed ?? 1, wu / 0.9, wv / 0.35, 1), streak = 0.55 + 0.45 * Math.sin(wv / 0.6 + 3 * b.id);
        foam *= Math.min(1, 0.45 + 0.75 * (1 - b.f1) * streak);
        foam *= 1 - Math.min(0.85, fp / 30); // sub-pixel foam at a distance merges into the surface
      }
      const foamC: V3 = [0, 1, 2].map(c => 0.65 * (sunC[c] * Math.max(0, n[0] * sun[0] + n[1] * sun[1] + n[2] * sun[2]) * sunVis + atm.skyIrradiance[c] * (0.3 + 0.7 * sunVis) + (1 - sunVis) * shader.groundLight[c]) / Math.PI) as V3;
      col = [0, 1, 2].map(c => {
        // light through a crest crosses a few metres of water: red is absorbed first, it glows turquoise
        const water = F * refl[c] + up[c] + glint * sunC[c] + sssW * sunC[c] * Math.exp(-absorb[c] * 4);
        return water * (1 - foam) + foamC[c] * foam;
      }) as V3;
      // haze towards the horizon
      const airT = Math.exp((-hit * 3.912) / vis), air = shader.shade([d[0], Math.max(0.002, -d[1] * 0.25), d[2]], 0.5);
      col = [col[0] * airT + air[0] * (1 - airT), col[1] * airT + air[1] * (1 - airT), col[2] * airT + air[2] * (1 - airT)];
    }
    const k = (j * W + i) * 3;
    hdr[k] = col[0]; hdr[k + 1] = col[1]; hdr[k + 2] = col[2];
  }
  // metering like the sky renderer
  let logSum = 0;
  for (let k = 0; k < W * H; k++) logSum += Math.log(1e-5 + 0.2126 * hdr[k * 3] + 0.7152 * hdr[k * 3 + 1] + 0.0722 * hdr[k * 3 + 2]);
  const meanL = Math.exp(logSum / (W * H)), ex = o.exposure ?? Math.exp(0.5 * Math.log(0.16 / meanL) + 0.5 * Math.log(Math.min(shader.sunny, shader.exposure)));
  const out = new Uint8ClampedArray(W * H * 4);
  for (let k = 0; k < W * H; k++) { out[k * 4] = enc(ACES(hdr[k * 3] * ex)); out[k * 4 + 1] = enc(ACES(hdr[k * 3 + 1] * ex)); out[k * 4 + 2] = enc(ACES(hdr[k * 3 + 2] * ex)); out[k * 4 + 3] = 255; }
  return { width: W, height: H, rgba: out, ms: (typeof performance !== "undefined" ? performance.now() : Date.now()) - t0, field };
}
