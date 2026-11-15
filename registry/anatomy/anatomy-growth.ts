/**
 * ANAT1 growth: CDC 2000 stature-for-age (2–20 years, LMS) — small enough for the body evaluator to import.
 */
import statureData from "./data/stature-for-age-cdc.json";
import type { Sex } from "./anatomy-reference";

/** Inverse standard normal CDF (Acklam's rational approximation; |error| < 1.2e-9). */
export function normalQuantile(p: number): number {
  const a = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716, 2.506628277459239];
  const b = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155288572];
  const c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416];
  const q = Math.min(1 - 1e-12, Math.max(1e-12, p));
  if (q < 0.02425) { const r = Math.sqrt(-2 * Math.log(q)); return (((((c[0] * r + c[1]) * r + c[2]) * r + c[3]) * r + c[4]) * r + c[5]) / ((((d[0] * r + d[1]) * r + d[2]) * r + d[3]) * r + 1); }
  if (q > 1 - 0.02425) { const r = Math.sqrt(-2 * Math.log(1 - q)); return -(((((c[0] * r + c[1]) * r + c[2]) * r + c[3]) * r + c[4]) * r + c[5]) / ((((d[0] * r + d[1]) * r + d[2]) * r + d[3]) * r + 1); }
  const r = q - 0.5, s = r * r;
  return (((((a[0] * s + a[1]) * s + a[2]) * s + a[3]) * s + a[4]) * s + a[5]) * r / (((((b[0] * s + b[1]) * s + b[2]) * s + b[3]) * s + b[4]) * s + 1);
}

interface LmsRow { age: number; L: number; M: number; S: number; p5: number; p50: number; p95: number }
export const STATURE_FOR_AGE = statureData as unknown as { source: Record<string, string>; female: LmsRow[]; male: LmsRow[] };
/** CDC 2000 stature (mm) for age 2–20 at a percentile (0–1), interpolated between whole years. */
export function statureForAge(sex: Sex, age: number, percentile = 0.5): number {
  const rows = STATURE_FOR_AGE[sex];
  const a = Math.min(rows[rows.length - 1].age, Math.max(rows[0].age, age));
  let i = rows.findIndex(r => r.age >= a); if (i <= 0) i = 1;
  const r0 = rows[i - 1], r1 = rows[i], t = r1.age === r0.age ? 0 : (a - r0.age) / (r1.age - r0.age);
  const L = r0.L + (r1.L - r0.L) * t, M = r0.M + (r1.M - r0.M) * t, S = r0.S + (r1.S - r0.S) * t, z = normalQuantile(percentile);
  return Math.abs(L) < 1e-6 ? M * Math.exp(S * z) : M * Math.pow(1 + L * S * z, 1 / L);
}

