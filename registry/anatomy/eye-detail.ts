/**
 * ANAT1 eyes in detail: eye shapes measured on real people, and iris colours measured in public-domain photographs,
 * drawn as a real iris is built.
 *
 * - `EYE_SHAPES`: almond, round, hooded, monolid, inner-fold double lid, upturned, downturned, deep-set, prominent,
 *   close-set and wide-set. Each sets the lid opening (height, width, canthal tilt, the upper lid's peak, a rounder
 *   lower lid), the upper-lid crease (height, or none), hooding, an epicanthal fold, depth and spacing.
 *   `applyEyeShape` moves a face mesh to the shape; the portrait draws the crease, fold and hood from it.
 * - `IRIS_TYPES`: fourteen irises from near-black to light blue, with central heterochromia and amber. Each has a
 *   pupillary zone and a ciliary zone in their own colours, measured zone by zone in twelve public-domain or CC0
 *   photographs; fibres, crypts, furrows, a limbal ring and a pupillary ruff set the texture.
 *   `irisAlbedo(type, r, θ, seed)` gives the colour at a point.
 *
 * Sources and grades are in `EYE_EVIDENCE` and docs/research/eye-detail-2026-11-16.md.
 */
import type { Vec3 } from "./anatomy-body";
import { FACE_LANDMARKS } from "./anatomy-face";
import type { FaceLandmark } from "./anatomy-face";

// ---- Eye shapes ----------------------------------------------------------------------------------------------------------------------

export interface EyeShapeSpec {
  id: string; label: string;
  /** Lid opening at its middle (palpebral fissure height), mm, for a woman (men about 0.5 mm less). */
  height: number;
  /** Change in the opening's width, corner to corner, mm. */
  width: number;
  /** Canthal tilt: the outer corner above the inner, degrees. */
  tilt: number;
  /** Upper-lid crease above the lash line at its middle, mm; 0 = none (a single lid). */
  crease: number;
  /** A low crease that starts at the epicanthal fold (an in-fold double lid) rather than running parallel to the lid. */
  infold?: boolean;
  /** Skin above the crease hanging over it: 0 none … 1 the lid hidden. */
  hood: number;
  /** An epicanthal fold over the inner corner: 0 none … 1 hiding the caruncle. */
  epicanthal: number;
  /** Set deeper (+) or forward (−) of average, mm. */
  depth: number;
  /** Each eye moved out (+) or in (−) from average, mm. */
  spacing: number;
  /** The upper lid's highest point toward the inner (−) or outer (+) corner. */
  peak: number;
  /** A lower lid curving lower at the middle (white showing below the iris), 0 … 1. */
  lowerRound: number;
  note: string;
  grade: "reported" | "estimated";
}

/**
 * Eye shapes with the measured ranges they sit in:
 * - opening heights of 8–11.5 mm by population;
 * - opening widths of 31–33 mm and inner-corner spacing of 31–35 mm (Alberto & Soriano 2024; Lu et al. 2017);
 * - a canthal tilt of about 8° in a Korean clinical sample;
 * - upper-lid creases of 6–9 mm in Malay and European lids and about 4–6 mm in Chinese double lids, with 30% of
 *   Chinese adults having none (Lu et al. 2017).
 * Each shape's numbers are estimated within those ranges and checked against public-domain photographs.
 */
export const EYE_SHAPES: readonly EyeShapeSpec[] = [
  { id: "almond", label: "Almond", height: 9.5, width: 0, tilt: 5, crease: 7.5, hood: 0, epicanthal: 0, depth: 0, spacing: 0, peak: -0.1, lowerRound: 0, grade: "estimated", note: "Longer than tall and tapering to both corners, a slight upward tilt, a crease about 7–8 mm above the lashes." },
  { id: "round", label: "Round", height: 11, width: -1.5, tilt: 2, crease: 8.5, hood: 0, epicanthal: 0, depth: -0.5, spacing: 0, peak: -0.05, lowerRound: 0.7, grade: "estimated", note: "A taller opening that shows more of the iris and often a little white below it; the lids curve evenly." },
  { id: "hooded", label: "Hooded", height: 8.8, width: 0, tilt: 2, crease: 8, hood: 1, epicanthal: 0, depth: 0.5, spacing: 0, peak: 0, lowerRound: 0, grade: "estimated", note: "A fold of skin above the crease hangs over it and hides most of the lid; common with age and in some families." },
  { id: "monolid", label: "Monolid (single lid)", height: 8, width: -0.5, tilt: 8, crease: 0, hood: 0.15, epicanthal: 0.75, depth: -0.8, spacing: 0, peak: 0, lowerRound: 0, grade: "reported", note: "No crease: the lid is smooth from the brow to the lashes, usually with an epicanthal fold over the inner corner (about 30% of Chinese adults in Lu et al. 2017)." },
  { id: "inner-double", label: "In-fold double lid", height: 8.8, width: 0, tilt: 7, crease: 4.5, infold: true, hood: 0.1, epicanthal: 0.55, depth: -0.5, spacing: 0, peak: 0.05, lowerRound: 0, grade: "reported", note: "A low crease (Chinese lids 4–6 mm, Lu et al. 2017) that starts at the epicanthal fold and runs out to the outer corner." },
  { id: "upturned", label: "Upturned", height: 9.3, width: 0, tilt: 10, crease: 7.5, hood: 0, epicanthal: 0, depth: 0, spacing: 0, peak: 0.05, lowerRound: 0, grade: "estimated", note: "The outer corner well above the inner (around 8–10°; a Korean clinical sample averaged 8.4°)." },
  { id: "downturned", label: "Downturned", height: 9.3, width: 0, tilt: -4, crease: 7.5, hood: 0.3, epicanthal: 0, depth: 0, spacing: 0, peak: -0.3, lowerRound: 0.15, grade: "estimated", note: "The outer corner level with or below the inner, the upper lid falling over the outer third." },
  { id: "deep-set", label: "Deep-set", height: 9.2, width: 0, tilt: 4, crease: 9.5, hood: 0.3, epicanthal: 0, depth: 2.5, spacing: 0, peak: 0, lowerRound: 0, grade: "estimated", note: "The eye sits back under the brow (the low end of the 12–20 mm normal eye prominence): a high crease in shadow." },
  { id: "prominent", label: "Prominent", height: 10.5, width: 0, tilt: 3, crease: 6.5, hood: 0, epicanthal: 0, depth: -2.5, spacing: 0, peak: 0, lowerRound: 0.4, grade: "estimated", note: "The eye sits forward (the high end of the normal range): more lid and white show, the lids hug a rounder curve." },
  { id: "close-set", label: "Close-set", height: 9.5, width: 0, tilt: 5, crease: 7.5, hood: 0, epicanthal: 0, depth: 0, spacing: -2.5, peak: 0, lowerRound: 0, grade: "estimated", note: "The inner corners about 5 mm closer than the mean (31–35 mm apart)." },
  { id: "wide-set", label: "Wide-set", height: 9.5, width: 0, tilt: 5, crease: 7.5, hood: 0, epicanthal: 0, depth: 0, spacing: 2.5, peak: 0, lowerRound: 0, grade: "estimated", note: "The inner corners about 5 mm further apart than the mean." },
];
export const findEyeShape = (id: string) => EYE_SHAPES.find(s => s.id === id) ?? EYE_SHAPES[0];

const smooth = (t: number) => { const x = Math.min(1, Math.max(0, t)); return x * x * (3 - 2 * x); };

/**
 * Move a face mesh (MediaPipe topology, mm) toward an eye shape: the opening's height, width, tilt and peak, a
 * rounder lower lid, the eyes' depth and spacing, and the skin of an epicanthal fold or a hood. `sex` 0–1 lowers the
 * opening height for men by up to 0.5 mm.
 */
export function applyEyeShape(v: Vec3[], shape: EyeShapeSpec, sex = 0): void {
  const L = (k: FaceLandmark) => v[FACE_LANDMARKS[k]];
  const upper = { R: [246, 161, 160, 159, 158, 157, 173], L: [466, 388, 387, 386, 385, 384, 398] }, lower = { R: [7, 163, 144, 145, 153, 154, 155], L: [249, 390, 373, 374, 380, 381, 382] };
  for (const s of ["L", "R"] as const) {
    const en = L(`endocanthion.${s}` as FaceLandmark), ex = L(`exocanthion.${s}` as FaceLandmark), ps = L(`palpebrale-superius.${s}` as FaceLandmark), pi = L(`palpebrale-inferius.${s}` as FaceLandmark);
    const c: Vec3 = [(en[0] + ex[0]) / 2, (en[1] + ex[1] + ps[1] + pi[1]) / 4, Math.max(ps[2], pi[2])];
    const lat = Math.sign(ex[0] - en[0]) || 1, halfW = Math.abs(ex[0] - en[0]) / 2;
    const upSet = new Set(upper[s]), loSet = new Set(lower[s]);
    // the region the eye's shape moves: the lids and the skin round them, fading by 16 mm out
    const wOf = (p: Vec3) => smooth(1 - Math.hypot((p[0] - c[0]) / (halfW + 9), (p[1] - c[1]) / 13) + 0.35);
    // 1. height: the upper lid and the skin above it rise (most at the middle), the lower lid drops a little
    const target = shape.height - 0.5 * sex, add = target - (ps[1] - pi[1]);
    v.forEach((p, i) => {
      const dx = (p[0] - c[0]) / (halfW * 1.15), along = Math.max(0, 1 - dx * dx);
      if (along <= 0) return;
      const above = p[1] - c[1];
      if (upSet.has(i) || (above > 0 && above < 14)) p[1] += add * 0.7 * along * (upSet.has(i) ? 1 : smooth(1 - (above - 2) / 12));
      else if (loSet.has(i) || (above <= 0 && above > -9)) p[1] -= add * 0.3 * along * (loSet.has(i) ? 1 : smooth(1 + (above + 2) / 7));
    });
    // 2. a rounder lower lid: its middle lower, showing white below the iris
    if (shape.lowerRound) v.forEach((p, i) => { const dx = (p[0] - c[0]) / halfW, along = Math.max(0, 1 - dx * dx); const below = c[1] - p[1]; if (along > 0 && (loSet.has(i) || (below > 0 && below < 8))) p[1] -= shape.lowerRound * 1.1 * along * along * (loSet.has(i) ? 1 : smooth(1 - (below - 3) / 5)); });
    // 3. the upper lid's peak toward the inner or outer corner
    if (shape.peak) v.forEach((p, i) => { const dx = (p[0] - c[0]) / halfW; if (Math.abs(dx) < 1.1 && (upSet.has(i) || (p[1] > c[1] && p[1] - c[1] < 9))) p[1] += shape.peak * 1.6 * dx * lat * Math.max(0, 1 - dx * dx) * (upSet.has(i) ? 1 : smooth(1 - (p[1] - c[1] - 3) / 6)); });
    // 4. tilt: the opening turns about its centre (a shear, so the corners move up and down)
    const curTilt = Math.atan2(ex[1] - en[1], Math.abs(ex[0] - en[0])), dT = Math.tan((shape.tilt * Math.PI) / 180) - Math.tan(curTilt);
    v.forEach(p => { const w = wOf(p); if (w > 0) p[1] += (p[0] - c[0]) * lat * dT * w; });
    // 5. width: the corners move out or in along the lid line
    if (shape.width) v.forEach(p => { const w = wOf(p); if (w > 0) p[0] += ((p[0] - c[0]) / halfW) * (shape.width / 2) * w; });
    // 6. spacing and depth move the whole eye and its socket
    v.forEach(p => { const w = wOf(p); if (w <= 0) return; p[0] += lat * shape.spacing * w; p[2] -= shape.depth * w; });
    // 7. an epicanthal fold: the upper lid's inner end comes down over the inner corner
    if (shape.epicanthal) v.forEach((p, i) => { const d = Math.hypot(p[0] - en[0], p[1] - en[1]); if (d < 7 && (upSet.has(i) || p[1] > en[1])) { const k = shape.epicanthal * smooth(1 - d / 7); p[1] -= 1.1 * k; p[0] -= lat * 0.6 * k; p[2] += 0.5 * k; } });
    // 8. a hood: the skin above the crease comes down and forward over it
    if (shape.hood) v.forEach((p, i) => { const dx = (p[0] - c[0]) / (halfW * 1.2), above = p[1] - c[1]; if (upSet.has(i) || Math.abs(dx) > 1 || above < 4 || above > 16) return; const k = shape.hood * (1 - dx * dx) * smooth(1 - Math.abs(above - 9) / 7); p[1] -= 1.6 * k; p[2] += 1.2 * k; });
  }
}

// ---- Iris colours ----------------------------------------------------------------------------------------------------------------------

export interface IrisType {
  id: string; label: string;
  /** Colour (sRGB) of the pupillary zone (between the pupil and the collarette) and the ciliary zone (out to the limbus). */
  pupillary: string; ciliary: string;
  /** Colour of the light radial fibres, and how strongly they show (0–1). */
  fibre: string; fibres: number;
  /** Dark crypts and contraction furrows (0–1), the dark limbal ring (0–1) and the pupillary ruff (0–1). */
  crypts: number; furrows: number; limbal: number; ruff: number;
  /** Where the collarette lies between the pupil (0) and the limbus (1). */
  collarette: number;
  /** Freckles (naevi) on the iris. */
  freckles: number;
  /** Where the colours come from (the reference photographs, `EYE_REFERENCES`). */
  source: string;
  grade: "measured" | "estimated";
}

/**
 * Iris colours. The measured ones were sampled zone by zone in public-domain or CC0 photographs (`EYE_REFERENCES`),
 * averaged in linear light in the side sectors (clear of lids and lashes), and set to the lightness an iris has
 * under the portrait's light. Blue was not in the photographs and is estimated.
 */
export const IRIS_TYPES: readonly IrisType[] = [
  { id: "black-brown", label: "Black-brown", pupillary: "#24130b", ciliary: "#301b10", fibre: "#4a3020", fibres: 0.12, crypts: 0.25, furrows: 0.15, limbal: 0.35, ruff: 0.6, collarette: 0.36, freckles: 0, source: "estimated from the brown photographs, darker", grade: "estimated" },
  { id: "dark-brown", label: "Dark brown", pupillary: "#33190f", ciliary: "#472716", fibre: "#6a4228", fibres: 0.16, crypts: 0.3, furrows: 0.2, limbal: 0.4, ruff: 0.6, collarette: 0.36, freckles: 1, source: "eye-brown (darkened)", grade: "measured" },
  { id: "brown", label: "Brown (chestnut)", pupillary: "#4e2214", ciliary: "#6e3420", fibre: "#9a5a38", fibres: 0.22, crypts: 0.35, furrows: 0.25, limbal: 0.45, ruff: 0.55, collarette: 0.35, freckles: 1, source: "eye-brown: pupillary #723025, middle #883b2b (L* 29–35, a* +29–32)", grade: "measured" },
  { id: "light-brown", label: "Light brown", pupillary: "#5a3018", ciliary: "#80522c", fibre: "#a8743e", fibres: 0.24, crypts: 0.35, furrows: 0.3, limbal: 0.45, ruff: 0.5, collarette: 0.36, freckles: 1, source: "eye-amber-light, eye-amber (darkened)", grade: "measured" },
  { id: "amber", label: "Amber", pupillary: "#7a4a1c", ciliary: "#a87430", fibre: "#d0a050", fibres: 0.28, crypts: 0.3, furrows: 0.3, limbal: 0.55, ruff: 0.5, collarette: 0.34, freckles: 0, source: "eye-amber: middle #7a592e (b* +30); eye-amber-light: middle #b68c62", grade: "measured" },
  { id: "hazel", label: "Hazel", pupillary: "#6e4a1e", ciliary: "#6f7046", fibre: "#a89a62", fibres: 0.28, crypts: 0.35, furrows: 0.3, limbal: 0.5, ruff: 0.5, collarette: 0.42, freckles: 1, source: "eye-pupil-blue (pupillary #533d1f, outer #746e68), eye-green-hazel (#5c5336 → #636245)", grade: "measured" },
  { id: "green", label: "Green", pupillary: "#8a7432", ciliary: "#5f8240", fibre: "#a8c06a", fibres: 0.3, crypts: 0.3, furrows: 0.3, limbal: 0.55, ruff: 0.4, collarette: 0.4, freckles: 0, source: "eye-green: pupillary #5c624c, middle #7a7e5d, outer #74794d (a* −8 to −10, b* +17 to +24)", grade: "measured" },
  { id: "yellow-green", label: "Yellow-green (chartreuse)", pupillary: "#9a7c2c", ciliary: "#80903e", fibre: "#c0c070", fibres: 0.28, crypts: 0.25, furrows: 0.25, limbal: 0.6, ruff: 0.4, collarette: 0.38, freckles: 0, source: "eye-chartreuse: pupillary #635b43 (b* +15), a dark limbal ring #47433a", grade: "measured" },
  { id: "central-heterochromia", label: "Green with a brown centre", pupillary: "#6a3e1a", ciliary: "#5f7a42", fibre: "#a0b468", fibres: 0.26, crypts: 0.3, furrows: 0.3, limbal: 0.5, ruff: 0.5, collarette: 0.5, freckles: 0, source: "eye-central-het (olive overall #7b6e50); eye-green", grade: "measured" },
  { id: "grey-green", label: "Grey-green", pupillary: "#6a6648", ciliary: "#5f716c", fibre: "#9cb0aa", fibres: 0.32, crypts: 0.25, furrows: 0.3, limbal: 0.45, ruff: 0.4, collarette: 0.38, freckles: 0, source: "eye-grey2: pupillary #525d5d, middle #5d6d6c (a* −6)", grade: "measured" },
  { id: "grey", label: "Grey", pupillary: "#77745e", ciliary: "#8b9496", fibre: "#d4dcdc", fibres: 0.42, crypts: 0.2, furrows: 0.35, limbal: 0.55, ruff: 0.45, collarette: 0.36, freckles: 0, source: "eye-grey: pupillary #7b7b72, middle #838985 (a* −3, b* +1)", grade: "measured" },
  { id: "blue-grey", label: "Blue-grey", pupillary: "#6e6a52", ciliary: "#788aa0", fibre: "#d0dce8", fibres: 0.42, crypts: 0.2, furrows: 0.35, limbal: 0.6, ruff: 0.5, collarette: 0.35, freckles: 0, source: "eye-blue-grey: pupillary #67666e, middle #7c7d83 (b* −3 to −5), a brown ruff", grade: "measured" },
  { id: "blue", label: "Blue", pupillary: "#5c6e80", ciliary: "#4f83bf", fibre: "#c6dcf2", fibres: 0.45, crypts: 0.2, furrows: 0.3, limbal: 0.7, ruff: 0.45, collarette: 0.34, freckles: 0, source: "estimated (no blue photograph in the set)", grade: "estimated" },
  { id: "light-blue", label: "Light blue", pupillary: "#7a8a98", ciliary: "#7fb0dc", fibre: "#e4f0fa", fibres: 0.5, crypts: 0.15, furrows: 0.3, limbal: 0.7, ruff: 0.4, collarette: 0.34, freckles: 0, source: "estimated (no blue photograph in the set)", grade: "estimated" },
];
/** Older names: "brown", "dark-brown", "hazel", "green", "blue" and "grey" are iris ids too. */
export const findIris = (id: string) => IRIS_TYPES.find(t => t.id === id) ?? IRIS_TYPES[3];

const lin1 = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const linHex = (h: string): [number, number, number] => [lin1(parseInt(h.slice(1, 3), 16) / 255), lin1(parseInt(h.slice(3, 5), 16) / 255), lin1(parseInt(h.slice(5, 7), 16) / 255)];
const hashN = (a: number, b: number) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };
const vnoise = (x: number, y: number) => {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), w = yf * yf * (3 - 2 * yf);
  const a = hashN(xi, yi), b = hashN(xi + 1, yi), c = hashN(xi, yi + 1), d = hashN(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * w + (a - b - c + d) * u * w;
};

/**
 * The iris's colour (linear RGB) at radius `r` (0 at the pupil's edge, 1 at the limbus) and angle `theta` (radians):
 * the pupillary zone inside a jagged collarette, the ciliary zone outside it, light radial fibres that wander a little,
 * dark crypts near the collarette, concentric contraction furrows toward the edge, the dark limbal ring, the dark
 * pupillary ruff, and the odd freckle. Deterministic for a seed.
 */
export function irisAlbedo(t: IrisType, r: number, theta: number, seed = 1): [number, number, number] {
  const P = linHex(t.pupillary), C = linHex(t.ciliary), F = linHex(t.fibre);
  const a = (theta / (2 * Math.PI) + 1) % 1, s = seed * 7.31;
  // the collarette: a jagged ring a third of the way out
  const coll = t.collarette + 0.035 * Math.sin(theta * 7 + s) + 0.025 * (vnoise(a * 24 + s, 0.5) - 0.5) * 2;
  // the zones blend across the collarette, and the pupillary colour runs out along the fibres in streaks (in life it
  // is not a painted ring)
  const streak = smooth((vnoise(a * 110 + 0.7 * Math.sin(r * 6 + s), r * 1.4 + s + 2) - 0.42) / 0.3);
  const inner = Math.min(1, smooth((coll + 0.05 - r) / 0.12) * (0.55 + 0.45 * streak) + streak * 0.45 * smooth((coll + 0.28 - r) / 0.28) * smooth((r - coll + 0.02) / 0.04));
  let col: [number, number, number] = [C[0] + (P[0] - C[0]) * inner, C[1] + (P[1] - C[1]) * inner, C[2] + (P[2] - C[2]) * inner];
  // radial fibres (trabeculae): thin light strands, wandering a little with radius
  const fa = a * 240 + 1.6 * Math.sin(r * 9 + a * 20 + s) + 0.8 * vnoise(a * 30 + s, r * 3), fb = a * 90 + 0.9 * Math.sin(r * 7 + a * 13 + s);
  const fib = Math.min(1, smooth((vnoise(fa, r * 2.5 + s) - 0.5) / 0.28) * 0.75 + smooth((vnoise(fb, r * 1.6 + s + 4) - 0.55) / 0.25) * 0.55) * t.fibres * (0.6 + 0.4 * (1 - inner)) * (1 - smooth((r - 0.9) / 0.08));
  col = [col[0] + (F[0] - col[0]) * fib, col[1] + (F[1] - col[1]) * fib, col[2] + (F[2] - col[2]) * fib];
  // the collarette itself is a little raised and lighter
  const ridge = Math.exp(-((r - coll) ** 2) / 0.0012) * 0.18;
  // crypts: dark lozenges just outside the collarette and through the middle of the ciliary zone
  let crypt = 0;
  if (t.crypts > 0 && r > coll - 0.02 && r < 0.86) {
    const cx = a * 22 + s, cy = (r - coll) * 6, ci = Math.floor(cx), cj = Math.floor(cy);
    for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) {
      const px = ci + di + 0.2 + 0.6 * hashN(ci + di, cj + dj), py = cj + dj + 0.2 + 0.6 * hashN(cj + dj + 9, ci + di), d = Math.hypot((cx - px) * 1.2, (cy - py) * 2.2);
      if (hashN(ci + di + 3, cj + dj + 5) < 0.45) crypt = Math.max(crypt, 1 - smooth((d - 0.12) / 0.2));
    }
    crypt *= t.crypts * (1 - smooth((r - 0.75) / 0.12));
  }
  // contraction furrows: concentric dark arcs, broken, toward the edge
  let furrow = 0;
  for (const fr of [0.66, 0.77, 0.86]) furrow = Math.max(furrow, Math.exp(-((r - fr - 0.01 * Math.sin(theta * 5 + s)) ** 2) / 0.00025) * smooth((vnoise(a * 9 + fr * 7 + s, 0.3) - 0.35) / 0.2));
  furrow *= t.furrows;
  // the limbal ring and the pupillary ruff
  const limb = t.limbal * smooth((r - 0.84) / 0.16), ruff = t.ruff * (1 - smooth(r / 0.07));
  let k = (1 + ridge) * (1 - 0.6 * crypt) * (1 - 0.35 * furrow) * (1 - 0.75 * limb);
  // freckles: a few small dark-brown spots
  if (t.freckles > 0) for (let q = 0; q < t.freckles + 1; q++) { const fa2 = hashN(seed + q, 3.3), fr2 = 0.35 + 0.45 * hashN(seed + q, 7.7); const d = Math.hypot((a - fa2) * 2 * Math.PI * (0.5 + fr2), r - fr2); if (hashN(seed + q, 1.1) < 0.6 * t.freckles) k *= 1 - 0.5 * (1 - smooth((d - 0.02) / 0.025)); }
  col = [col[0] * k, col[1] * k, col[2] * k];
  const R2: [number, number, number] = [0.025, 0.014, 0.01];
  return [col[0] + (R2[0] - col[0]) * ruff, col[1] + (R2[1] - col[1]) * ruff, col[2] + (R2[2] - col[2]) * ruff];
}

// ---- Evidence and references -------------------------------------------------------------------------------------------------------------

export const EYE_EVIDENCE: readonly { id: string; grade: "reported" | "measured" | "estimated"; finding: string; source: string; url?: string }[] = [
  { id: "crease", grade: "reported", finding: "Upper-eyelid crease heights of 8.05 mm (men) and 8.56 mm (women) in Malays, 3.95 and 5.89 mm in Chinese; 70.1% of Chinese and all Malays had a double lid on both eyes.", source: "Lu, Kadir, Ngeow & Othman 2017, Sci Rep 7:14819", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC5665901/" },
  { id: "infold", grade: "reported", finding: "Double-lid creases are classed by how they meet the epicanthal fold: in-fold (lower than the fold), on-fold and out-fold.", source: "Lu et al. 2017 (as above)", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC5665901/" },
  { id: "spacing", grade: "reported", finding: "Inner intercanthal distance 34.9 ± 1.4 mm (men) and 31.2 ± 1.5 mm (women); palpebral fissure length 32.6 ± 1.3 and 31.1 ± 1.0 mm; interpupillary distance 62.6 and 60.3 mm (300 Filipino adults).", source: "Alberto & Soriano 2024, Philipp J Otolaryngol Head Neck Surg 39(1)", url: "https://pjohns.pso-hns.org/index.php/pjohns/article/view/2113" },
  { id: "tilt", grade: "reported", finding: "Canthal tilt about 8.4° on each side in 76 Korean patients (mean age 23), with no significant difference between the sexes.", source: "J Korean Assoc Oral Maxillofac Surg 46(6), 2020", url: "https://synapse.koreamed.org/articles/1145916" },
  { id: "height", grade: "reported", finding: "Palpebral fissure height about 8–11.5 mm by population.", source: "BEAUTY_EVIDENCE (face-beauty.ts)" },
  { id: "iris-continuous", grade: "reported", finding: "Iris colour measured in CIELAB from photographs varies continuously; brown, blue and green categories hide much of it.", source: "Edwards et al. 2016, Pigment Cell Melanoma Res 29:141–162" },
  { id: "iris-zones", grade: "measured", finding: "In twelve public-domain or CC0 eye photographs the pupillary zone is warmer than the ciliary zone in green, hazel and blue-grey eyes (b* +15 to +22 against +4 to +6); brown eyes reach a* +32; L* runs from 27 (chestnut) to 67 (light amber); texture varies by 5–19 L* units round the ring.", source: "EYE_REFERENCES, measured with scripts/anatomy/measure-iris-colour.py (docs/research/eye-detail-2026-11-16.md)" },
];

/** Public-domain and CC0 photographs the colours and shapes were taken from (Wikimedia Commons). */
export const EYE_REFERENCES: readonly { id: string; title: string; author: string; licence: "Public domain" | "CC0"; shows: string }[] = [
  { id: "eye-green", title: "File:GreenEye3.jpg", author: "Skitterphoto", licence: "CC0", shows: "green iris with a golden collarette; almond shape" },
  { id: "eye-pupil-blue", title: "File:030608 Pupil.jpg", author: "Ylem", licence: "Public domain", shows: "hazel-green iris with a golden-brown pupillary zone; round opening" },
  { id: "eye-amber-light", title: "File:Light brown.amber eye.JPG", author: "Whitenoise7293", licence: "Public domain", shows: "light amber iris" },
  { id: "eye-green-hazel", title: "File:Green Hazel Iris.jpg", author: "Irbeel", licence: "Public domain", shows: "olive-hazel iris" },
  { id: "eye-brown", title: "File:A human male brown eye.jpg", author: "Bobbyphotographer", licence: "CC0", shows: "chestnut brown iris, dark pupillary ruff" },
  { id: "eye-amber", title: "File:AmberEye.jpg", author: "Samb7293", licence: "CC0", shows: "copper-amber iris with a dark limbal ring" },
  { id: "eye-blue-green", title: "File:Blue-green eyes.jpg", author: "Alyson hill (English Wikipedia)", licence: "Public domain", shows: "blue-green irises with a yellow-brown centre; double lids" },
  { id: "eye-grey", title: "File:Grey eye G5wCD.jpg", author: "Nether Animal", licence: "Public domain", shows: "grey iris, white fibres; a round open eye" },
  { id: "eye-grey2", title: "File:Grey eye 29-11-25.jpg", author: "Monkeymoo458", licence: "CC0", shows: "grey-green iris" },
  { id: "eye-blue-grey", title: "File:Mybluishgrayeye.JPG", author: "Nick4gwen (English Wikipedia)", licence: "Public domain", shows: "blue-grey iris, white fibres, brown ruff" },
  { id: "eye-chartreuse", title: "File:Chartreuse eye color (human).jpg", author: "Squeaks 41", licence: "CC0", shows: "yellow-green iris with a dark limbal ring" },
  { id: "eye-central-het", title: "File:Green eyes with brown central heterochromia.jpg", author: "Hasa59", licence: "CC0", shows: "green irises with brown centres; hooded upper lids" },
  { id: "eye-epicanthic-00", title: "File:Epicanthic KR00.jpg", author: "Sarang", licence: "Public domain", shows: "single lids with epicanthal folds, upturned" },
  { id: "eye-epicanthic-01", title: "File:Epicanthic KR01.jpg", author: "Sarang", licence: "Public domain", shows: "a single lid close up: no crease, the fold over the inner corner" },
  { id: "eye-epicanthic-08", title: "File:Epicanthic KR08.jpg", author: "Sarang", licence: "Public domain", shows: "in-fold double lids: a low crease starting at the fold" },
  { id: "eye-epicanthic-cc0", title: "File:Epicanthic Fold.jpg", author: "RebeccaLi292", licence: "CC0", shows: "an epicanthal fold covering the caruncle; a low double lid" },
];
