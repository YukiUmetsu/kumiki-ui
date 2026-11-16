/**
 * SKY1 atmosphere: the colour of the sky and of sunlight anywhere in the air, by single scattering in a spherical
 * atmosphere (after Nishita et al. 1993), with the constants used in production sky models (Hillaire 2020):
 *
 * - Rayleigh scattering by air molecules, β = (5.802, 13.558, 33.1) × 10⁻⁶ m⁻¹ at sea level, scale height 8 km;
 * - Mie scattering by aerosol, set from the visibility (Koschmieder: extinction 3.912 / V), scale height 1.2 km,
 *   forward-peaked (Cornette–Shanks phase, g 0.8);
 * - ozone absorption, (0.650, 1.881, 0.085) × 10⁻⁶ m⁻¹ at its peak around 25 km, which keeps twilight blue.
 *
 * Wavelengths are three (red, green, blue). Multiple scattering is approximated by a small isotropic fill. Sky radiance
 * is tabulated over the sky (`skyTable`) so a whole frame costs a lookup per pixel.
 */
export type V3 = [number, number, number];

export const ATMOSPHERE = {
  earthRadius: 6_371_000,
  top: 100_000,
  rayleigh: [5.802e-6, 13.558e-6, 33.1e-6] as const,
  rayleighHeight: 8000,
  mieHeight: 1200,
  mieG: 0.8,
  /** Mie single-scattering albedo (the rest is absorbed). */
  mieAlbedo: 0.9,
  ozone: [0.65e-6, 1.881e-6, 0.085e-6] as const,
  ozoneCentre: 25_000, ozoneWidth: 15_000,
  /** Solar irradiance at the top of the atmosphere, relative (white sun, slightly warm). */
  sun: [1.0, 0.98, 0.94] as const,
  sunAngularRadius: (0.2666 * Math.PI) / 180,
  source: "Hillaire 2020, A Scalable and Production Ready Sky and Atmosphere Rendering Technique; Nishita et al. 1993; Koschmieder for visibility",
} as const;

const R0 = ATMOSPHERE.earthRadius, RT = R0 + ATMOSPHERE.top;
const dot = (a: readonly number[], b: readonly number[]) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const norm3 = (v: readonly number[]): V3 => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };

/** Mie extinction at sea level for a visibility in km (Koschmieder 3.912 / V, minus the air's own Rayleigh share). */
export const mieExtinction = (visibilityKm: number) => Math.max(2e-6, 3.912 / (visibilityKm * 1000) - 1.3e-5);
/** A direction from elevation and azimuth in degrees (azimuth 0 = straight ahead, +z; 90 = right, +x). */
export function direction(elevationDeg: number, azimuthDeg: number): V3 {
  const e = (elevationDeg * Math.PI) / 180, a = (azimuthDeg * Math.PI) / 180;
  return [Math.cos(e) * Math.sin(a), Math.sin(e), Math.cos(e) * Math.cos(a)];
}
/** Distance along a ray from height h (m above the ground) in direction with vertical component mu to the sphere of radius r, or −1. */
function toSphere(h: number, mu: number, r: number): number {
  const rr = R0 + h, b = rr * mu, c = rr * rr - r * r, disc = b * b - c;
  if (disc < 0) return -1;
  const s = Math.sqrt(disc), t1 = -b - s, t2 = -b + s;
  return t1 > 0 ? t1 : t2 > 0 ? t2 : -1;
}
const rayleighPhase = (c: number) => (3 / (16 * Math.PI)) * (1 + c * c);
export function miePhase(c: number, g: number): number {
  const g2 = g * g;
  return (3 / (8 * Math.PI)) * ((1 - g2) * (1 + c * c)) / ((2 + g2) * Math.pow(Math.max(1e-6, 1 + g2 - 2 * g * c), 1.5));
}

export interface Atmosphere {
  /** Sunlight arriving at height h (m) with the sun at elevation sinE (sine): the sun's colour there. */
  sunlight: (h: number, sinE: number) => V3;
  /** Radiance of the clear sky seen from the eye in direction d (unit, y up). */
  sky: (d: readonly number[]) => V3;
  /** Light the open sky sheds on a horizontal surface at the eye (irradiance, ÷π for radiance on white). */
  skyIrradiance: V3;
  /** Transmittance and in-scattered light along a level-ish path of length `m` metres from the eye towards d (aerial perspective). */
  aerial: (d: readonly number[], m: number) => { t: V3; add: V3 };
  sunDir: V3;
}

export interface AtmosphereOptions { sunElevation: number; sunAzimuth?: number; visibilityKm?: number; eyeHeight?: number; tableSize?: number }

/** Build the atmosphere for a sun position and a visibility; tabulates the sky and the transmittance. */
export function atmosphere(o: AtmosphereOptions): Atmosphere {
  const sunDir = direction(o.sunElevation, o.sunAzimuth ?? 0), eye = o.eyeHeight ?? 2, mie = mieExtinction(o.visibilityKm ?? 40), mieScat = mie * ATMOSPHERE.mieAlbedo;
  const RB = ATMOSPHERE.rayleigh, OZ = ATMOSPHERE.ozone;
  const density = (h: number): [number, number, number] => {
    const oz = Math.max(0, 1 - Math.abs(h - ATMOSPHERE.ozoneCentre) / ATMOSPHERE.ozoneWidth);
    return [Math.exp(-Math.max(0, h) / ATMOSPHERE.rayleighHeight), Math.exp(-Math.max(0, h) / ATMOSPHERE.mieHeight), oz];
  };
  const ext = (dr: number, dm: number, doz: number, c: number) => RB[c] * dr + mie * dm + OZ[c] * doz;
  // Transmittance to the top of the atmosphere from height h along sinE: a table over h and sinE
  const TH = 48, TM = 96, tTab = new Float32Array(TH * TM * 3);
  const hAt = (i: number) => (i / (TH - 1)) ** 2 * 60_000, muAt = (j: number) => -0.25 + (j / (TM - 1)) * 1.25;
  for (let i = 0; i < TH; i++) for (let j = 0; j < TM; j++) {
    const h = hAt(i), mu = muAt(j), toGround = toSphere(h, mu, R0);
    const k = (i * TM + j) * 3;
    if (toGround > 0 && mu < 0) { tTab[k] = tTab[k + 1] = tTab[k + 2] = 0; continue; }
    const L = toSphere(h, mu, RT), n = 40;
    let dr = 0, dm = 0, doz = 0;
    for (let s = 0; s < n; s++) {
      const t = ((s + 0.5) / n) * L, rr = Math.sqrt((R0 + h) ** 2 + t * t + 2 * (R0 + h) * t * mu), [a, b, c] = density(rr - R0);
      dr += a * L / n; dm += b * L / n; doz += c * L / n;
    }
    for (let c = 0; c < 3; c++) tTab[k + c] = Math.exp(-ext(dr, dm, doz, c));
  }
  const transmittance = (h: number, mu: number): V3 => {
    const fi = Math.sqrt(Math.min(1, Math.max(0, h / 60_000))) * (TH - 1), fj = Math.min(TM - 1, Math.max(0, ((mu + 0.25) / 1.25) * (TM - 1)));
    const i0 = Math.min(TH - 2, Math.floor(fi)), j0 = Math.min(TM - 2, Math.floor(fj)), u = fi - i0, v = fj - j0, out: V3 = [0, 0, 0];
    for (let c = 0; c < 3; c++) {
      const a = tTab[(i0 * TM + j0) * 3 + c], b = tTab[(i0 * TM + j0 + 1) * 3 + c], d = tTab[((i0 + 1) * TM + j0) * 3 + c], e = tTab[((i0 + 1) * TM + j0 + 1) * 3 + c];
      out[c] = (a * (1 - v) + b * v) * (1 - u) + (d * (1 - v) + e * v) * u;
    }
    return out;
  };
  // the sun disc just below the horizon still lights the clouds above: soften the cut with the sun's radius
  const sunlight = (h: number, sinE: number): V3 => {
    const t = transmittance(h, sinE), dip = Math.acos(Math.max(-1, Math.min(1, R0 / (R0 + Math.max(0, h))))), vis = Math.min(1, Math.max(0, (sinE + Math.sin(dip) + 0.006) / 0.012));
    return [t[0] * ATMOSPHERE.sun[0] * vis, t[1] * ATMOSPHERE.sun[1] * vis, t[2] * ATMOSPHERE.sun[2] * vis];
  };
  // single scattering along a view ray from the eye
  const singleScatter = (d: readonly number[], maxLen = Infinity): { L: V3; T: V3 } => {
    const mu = d[1], toGround = mu < 0 ? toSphere(eye, mu, R0) : -1, Lmax = Math.min(maxLen, toGround > 0 ? toGround : toSphere(eye, mu, RT));
    const n = 28, cosT = dot(d, sunDir), pr = rayleighPhase(cosT), pm = miePhase(cosT, ATMOSPHERE.mieG);
    const L: V3 = [0, 0, 0], tau: V3 = [0, 0, 0];
    for (let s = 0; s < n; s++) {
      // samples bunched near the eye where the air is dense
      const a0 = (s / n) ** 2, a1 = ((s + 1) / n) ** 2, t = ((a0 + a1) / 2) * Lmax, ds = (a1 - a0) * Lmax;
      const rr = Math.sqrt((R0 + eye) ** 2 + t * t + 2 * (R0 + eye) * t * mu), h = rr - R0, [dr, dm, doz] = density(h);
      for (let c = 0; c < 3; c++) tau[c] += ext(dr, dm, doz, c) * ds;
      // the sun's height seen from the sample point
      const upx = d[0] * t, upy = R0 + eye + d[1] * t, upz = d[2] * t, sinE = (upx * sunDir[0] + upy * sunDir[1] + upz * sunDir[2]) / rr;
      const sl = sunlight(h, sinE);
      for (let c = 0; c < 3; c++) L[c] += Math.exp(-tau[c]) * sl[c] * (RB[c] * dr * pr + mieScat * dm * pm) * ds;
    }
    return { L, T: [Math.exp(-tau[0]), Math.exp(-tau[1]), Math.exp(-tau[2])] };
  };
  // tabulate the sky over elevation (finer near the horizon) and azimuth from the sun
  const N = o.tableSize ?? 64, EL = N, AZ = N, sTab = new Float32Array(EL * AZ * 3);
  const sunAz = Math.atan2(sunDir[0], sunDir[2]);
  const elAt = (i: number) => Math.sign(i / (EL - 1) * 2 - 1) * ((Math.abs(i / (EL - 1) * 2 - 1)) ** 2) * (Math.PI / 2);
  const elIndex = (e: number) => { const s = e / (Math.PI / 2); return ((Math.sign(s) * Math.sqrt(Math.abs(s)) + 1) / 2) * (EL - 1); };
  for (let i = 0; i < EL; i++) for (let j = 0; j < AZ; j++) {
    const e = elAt(i), a = sunAz + (j / (AZ - 1)) * Math.PI, d: V3 = [Math.cos(e) * Math.sin(a), Math.sin(e), Math.cos(e) * Math.cos(a)];
    const { L } = singleScatter(d), k = (i * AZ + j) * 3;
    // multiple scattering adds a soft, bluish fill (estimated share of the single-scattered light)
    sTab[k] = L[0] * 1.15; sTab[k + 1] = L[1] * 1.2; sTab[k + 2] = L[2] * 1.3;
  }
  const sky = (d: readonly number[]): V3 => {
    const e = Math.asin(Math.max(-1, Math.min(1, d[1]))), a = Math.atan2(d[0], d[2]);
    let da = Math.abs(((a - sunAz + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
    da = Math.min(Math.PI, da);
    const fi = Math.min(EL - 1, Math.max(0, elIndex(e))), fj = (da / Math.PI) * (AZ - 1), i0 = Math.min(EL - 2, Math.floor(fi)), j0 = Math.min(AZ - 2, Math.floor(fj)), u = fi - i0, v = fj - j0, out: V3 = [0, 0, 0];
    for (let c = 0; c < 3; c++) {
      const p = sTab[(i0 * AZ + j0) * 3 + c], q = sTab[(i0 * AZ + j0 + 1) * 3 + c], r = sTab[((i0 + 1) * AZ + j0) * 3 + c], s = sTab[((i0 + 1) * AZ + j0 + 1) * 3 + c];
      out[c] = (p * (1 - v) + q * v) * (1 - u) + (r * (1 - v) + s * v) * u;
    }
    return out;
  };
  // irradiance from the sky dome on a horizontal surface (cosine-weighted average of the table)
  const irr: V3 = [0, 0, 0];
  let wsum = 0;
  for (let i = 0; i < 12; i++) for (let j = 0; j < 24; j++) {
    const e = ((i + 0.5) / 12) * (Math.PI / 2), a = (j / 24) * Math.PI * 2, d: V3 = [Math.cos(e) * Math.sin(a), Math.sin(e), Math.cos(e) * Math.cos(a)], w = Math.sin(e) * Math.cos(e), L = sky(d);
    irr[0] += L[0] * w; irr[1] += L[1] * w; irr[2] += L[2] * w; wsum += w;
  }
  const skyIrradiance: V3 = [(irr[0] / wsum) * Math.PI, (irr[1] / wsum) * Math.PI, (irr[2] / wsum) * Math.PI];
  // aerial perspective: transmittance over a path, and the light the air adds (a fraction of the sky behind)
  const aerial = (d: readonly number[], m: number) => {
    const { L, T } = singleScatter(d, m);
    return { t: T, add: [L[0] * 1.15, L[1] * 1.2, L[2] * 1.3] as V3 };
  };
  return { sunlight, sky, skyIrradiance, aerial, sunDir };
}
