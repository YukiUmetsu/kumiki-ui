/** Subject reframe (VE1.12): a crop of another shape that follows a clip's subject, as a camera operator would, so a landscape clip
 * becomes a vertical one (9:16) and keeps its subject in view.
 *
 * The subject's place in each frame comes from its cutout (VE1.5): `subjectBox` reads one frame's alpha. `planReframe` reads the whole
 * clip before it moves the crop, as Google's AutoFlip does (Google Research, "AutoFlip: An Open Source Framework for Intelligent Video
 * Reframing", 2020). It picks the calmest of three moves that keeps the subject in:
 *   - **stationary**: one crop for the whole clip, like a camera on a tripod;
 *   - **panning**: a crop that moves at one even speed;
 *   - **tracking**: a crop that follows the subject smoothly. It sees the whole clip, so it starts to move before the subject reaches
 *     the edge.
 * The crop is as large as the frame allows at its shape, and moves along the one axis that has room: across, for a vertical crop of a
 * landscape clip.
 */

export interface SubjectBox {
  /** The box around the subject, in source pixels. */
  x: number; y: number; width: number; height: number;
  /** The subject's alpha-weighted centre, in source pixels. On a bird's long tail or a raised arm it stays with the body. */
  cx: number; cy: number;
  /** The subject's share of the frame, 0 to 1. */
  area: number;
}
/** A subject's place in each frame of a clip; null where no subject shows. */
export interface SubjectTrack { width: number; height: number; fps: number; frames: ReadonlyArray<SubjectBox | null> }

/** The subject in one frame of a cutout's alpha (one value from 0 to 255 a pixel, `width` × `height`, row by row). The box holds all but
 * `trim` of the subject's alpha on each side, so a stray speck of matte does not stretch it. Null when the subject covers less than
 * `least` of the frame. */
export function subjectBox(alpha: ArrayLike<number>, width: number, height: number, trim = .005, least = .0005): SubjectBox | null {
  const columns = new Float64Array(width), rows = new Float64Array(height);
  for (let y = 0, i = 0; y < height; y++) for (let x = 0; x < width; x++, i++) {
    const a = alpha[i];
    if (a) { columns[x] += a; rows[y] += a; }
  }
  let total = 0, sx = 0, sy = 0;
  for (let x = 0; x < width; x++) { total += columns[x]; sx += columns[x] * (x + .5); }
  for (let y = 0; y < height; y++) sy += rows[y] * (y + .5);
  if (total < least * width * height * 255) return null;
  const bounds = (mass: Float64Array): [number, number] => {
    let run = 0, lo = 0, hi = mass.length;
    for (let k = 0; k < mass.length; k++) { run += mass[k]; if (run > trim * total) { lo = k; break; } }
    run = 0;
    for (let k = mass.length - 1; k >= 0; k--) { run += mass[k]; if (run > trim * total) { hi = k + 1; break; } }
    return [lo, hi];
  };
  const [x0, x1] = bounds(columns), [y0, y1] = bounds(rows);
  return { x: x0, y: y0, width: x1 - x0, height: y1 - y0, cx: sx / total, cy: sy / total, area: total / 255 / (width * height) };
}

/** A track in a film document or a file: one row a frame, `[x, y, width, height, cx, cy]` in source pixels, or null. */
export type SubjectTrackRow = readonly [number, number, number, number, number, number] | null;
export const trackRows = (track: SubjectTrack): SubjectTrackRow[] => track.frames.map(box => box &&
  [box.x, box.y, box.width, box.height, Math.round(box.cx * 10) / 10, Math.round(box.cy * 10) / 10] as const);
export const trackFromRows = (rows: readonly SubjectTrackRow[], width: number, height: number, fps: number): SubjectTrack => ({ width, height, fps,
  frames: rows.map(row => row && { x: row[0], y: row[1], width: row[2], height: row[3], cx: row[4], cy: row[5], area: row[2] * row[3] / (width * height) }) });

export type ReframeMode = "stationary" | "panning" | "tracking";
export type ReframeMotion = "slower" | "default" | "faster";
export interface ReframeOptions {
  /** The crop's shape, width ÷ height: 9 / 16 for a vertical video. */
  aspect: number;
  /** `auto` picks the calmest move that keeps the subject in: stationary, then panning, then tracking. A named mode is used as asked, and
   * a warning says where it cuts the subject. @default "auto" */
  mode?: "auto" | ReframeMode;
  /** How closely a tracking crop follows: `slower` for calm subjects, `faster` for quick action. @default "default" */
  motion?: ReframeMotion;
  /** Room kept between the subject's box and the crop's edges, a fraction of the crop's length along the move. @default .06 */
  padding?: number;
}
export interface ReframeProblem { code: string; severity: "error" | "warning"; message: string }
export interface ReframePlan {
  mode: ReframeMode;
  /** The crop's size in source pixels: the largest the frame holds at the aspect. */
  width: number; height: number;
  /** The crop's top-left corner in each frame of the track. */
  path: ReadonlyArray<{ x: number; y: number }>;
  /** The crop's fastest move, in crop lengths (along the move) a second. */
  speed: number;
  problems: ReframeProblem[];
}

/** How long a tracking crop takes to answer the subject's moves, seconds: motion faster than about six times this is smoothed away. */
const REFRAME_RESPONSE: Readonly<Record<ReframeMotion, number>> = { slower: .9, default: .5, faster: .22 };
/** A panning crop may hold the subject this far from where it would be centred, on average, as a share of the crop's length. */
const PAN_OFF_CENTRE = .2;
/** A crop that moves faster than this many of its own lengths a second whips across the picture. */
const FAST = 1;
/** A subject up to this share of the crop's length is kept whole, with its padding. A larger one is framed by its centre, which stays in
 * the crop's middle half: keeping the edges of a subject that nearly fills the crop would chase every swing of a skirt or a tail. */
const FIT_SHARE = .8, WIDE_HOLD = .75;

/** Plans the crop for a whole track. Every value in the plan comes from the track and the options; the same input gives the same plan. */
export function planReframe(track: SubjectTrack, options: ReframeOptions): ReframePlan {
  const problems: ReframeProblem[] = [], { width: W, height: H, fps, frames } = track, n = frames.length;
  const aspect = options.aspect, motion = options.motion ?? "default", padding = options.padding ?? .06;
  const flat = (mode: ReframeMode, width: number, height: number): ReframePlan =>
    ({ mode, width, height, path: frames.map(() => ({ x: (W - width) / 2, y: (H - height) / 2 })), speed: 0, problems });
  if (!(aspect > 0 && Number.isFinite(aspect))) {
    problems.push({ code: "reframe-aspect", severity: "error", message: "The crop's shape is width ÷ height, a positive number: 9 / 16 for a vertical video." });
    return flat("stationary", W, H);
  }
  const tall = aspect < W / H, width = tall ? Math.min(W, H * aspect) : W, height = tall ? H : Math.min(H, W / aspect);
  const across = width < W - .5, S = across ? W : H, L = across ? width : height, room = S - L;
  if (room < 1) {
    problems.push({ code: "reframe-same-shape", severity: "warning", message: "The crop is the whole frame: the clip already has this shape, so there is nothing to follow." });
    return flat("stationary", width, height);
  }
  const seen = frames.map(box => box && (across ? { lo: box.x, hi: box.x + box.width, c: box.cx } : { lo: box.y, hi: box.y + box.height, c: box.cy }));
  if (!seen.some(Boolean)) {
    problems.push({ code: "reframe-no-subject", severity: "error", message: "No frame of the track shows a subject: check the cutout, or lower its threshold." });
    return flat("stationary", width, height);
  }
  // Where the crop may stand in each frame (its start along the move) to hold the subject with its padding, and where it would centre it.
  const lo = new Float64Array(n), hi = new Float64Array(n), target = new Float64Array(n), weight = new Float64Array(n);
  const pad = padding * L, clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
  let wide = 0, firstWide = -1;
  seen.forEach((s, i) => {
    if (!s) { lo[i] = 0; hi[i] = room; return; }
    let a = s.hi + pad - L, b = s.lo - pad;
    if (a > b) { a = s.hi - L; b = s.lo; }
    // A subject that nearly fills the crop or is wider (a dancer's flying skirt, a bird's long train): the crop holds its centre in the
    // crop's middle half and lets the ends leave the frame.
    if (a > b || s.hi - s.lo > FIT_SHARE * L) {
      [a, b] = [s.c - WIDE_HOLD * L, s.c - (1 - WIDE_HOLD) * L];
      if (s.hi - s.lo > L) { wide++; if (firstWide < 0) firstWide = i; }
    }
    lo[i] = clamp(a, 0, room); hi[i] = clamp(b, lo[i], room);
    target[i] = clamp(s.c - L / 2, lo[i], hi[i]); weight[i] = 1;
  });
  fillGaps(target, weight);
  let longest = 0;
  for (let i = 0, run = 0; i < n; i++) { run = seen[i] ? 0 : run + 1; longest = Math.max(longest, run); }
  if (longest > fps) problems.push({ code: "reframe-subject-lost", severity: "warning", message: `The subject is missing for ${(longest / fps).toFixed(1)} s in a row; the crop holds near where it last saw it.` });
  if (wide) problems.push({ code: "reframe-subject-wide", severity: "warning", message: `The subject is ${across ? "wider" : "taller"} than the crop in ${wide} frames (first at frame ${firstWide}); there the crop keeps its centre in the crop's middle half and cuts its ends.` });

  const inside = (path: Float64Array) => path.every((v, i) => v >= lo[i] - .5 && v <= hi[i] + .5);
  const offCentre = (path: Float64Array) => { let sum = 0, count = 0; path.forEach((v, i) => { if (weight[i]) { sum += Math.abs(v - target[i]); count++; } }); return sum / Math.max(1, count) / L; };
  const asked = options.mode ?? "auto";
  let mode: ReframeMode, path: Float64Array | undefined;
  // Stationary: one place inside every frame's range, nearest the subject's average centring.
  const still = stationaryPath(lo, hi, target, weight);
  if (asked === "stationary" || asked === "auto" && inside(still)) { mode = "stationary"; path = still; }
  else {
    const pan = asked === "panning" || asked === "auto" ? pinned(lo, hi, target, weight, (t, w) => fitLine(t, w)) : undefined;
    if (pan && (asked === "panning" || inside(pan) && offCentre(pan) <= PAN_OFF_CENTRE)) { mode = "panning"; path = pan; }
    else {
      mode = "tracking";
      const lambda = (REFRAME_RESPONSE[motion] * fps) ** 4;
      path = pinned(lo, hi, target, weight, (t, w) => whittaker(t, w, lambda));
      // The pins leave at most a quarter pixel outside; the clamp removes it.
      for (let i = 0; i < n; i++) path[i] = clamp(path[i], lo[i], hi[i]);
    }
  }
  if (asked !== "auto" && !inside(path)) {
    const cut = path.reduce((count, v, i) => count + (v < lo[i] - .5 || v > hi[i] + .5 ? 1 : 0), 0);
    problems.push({ code: "reframe-subject-cut", severity: "warning", message: `A ${asked} crop cuts into the subject's padding in ${cut} frames; "auto" would pick a move that keeps it in.` });
  }
  for (let i = 0; i < n; i++) path[i] = clamp(path[i], 0, room);
  let speed = 0;
  for (let i = 1; i < n; i++) speed = Math.max(speed, Math.abs(path[i] - path[i - 1]) * fps / L);
  if (speed > FAST) problems.push({ code: "reframe-fast", severity: "warning", message: `The crop moves up to ${speed.toFixed(1)} of its own ${across ? "widths" : "heights"} a second. `
    + "Over a still camera's picture that is a whip; where the source camera pans fast, the crop is following the subject against the pan. Watch the result, cut the clip shorter or keep a wider shape." });
  const fixed = across ? (H - height) / 2 : (W - width) / 2;
  return { mode, width, height, path: Array.from(path, v => across ? { x: v, y: fixed } : { x: fixed, y: v }), speed, problems };
}

/** The crop in source pixels at a frame of the track (frames outside it hold the first or last crop). */
export function reframeCrop(plan: ReframePlan, frame: number): { x: number; y: number; width: number; height: number } {
  const at = plan.path[Math.min(plan.path.length - 1, Math.max(0, Math.round(frame)))] ?? { x: 0, y: 0 };
  return { ...at, width: plan.width, height: plan.height };
}

/** Catmull-Rom: a cubic that passes through the pixels it samples, sharp without ringing much. */
const cubic = (x: number) => { const a = Math.abs(x); return a < 1 ? 1.5 * a ** 3 - 2.5 * a * a + 1 : a < 2 ? -.5 * a ** 3 + 2.5 * a * a - 4 * a + 2 : 0; };
/** For each output pixel along one axis, the source pixels it reads and their weights. The kernel widens when the crop is shrunk, so a
 * smaller output averages instead of aliasing. */
function axisWeights(start: number, length: number, size: number, out: number) {
  const scale = length / out, stretch = Math.max(1, scale), taps = 2 * Math.ceil(2 * stretch);
  const index = new Int32Array(out * taps), weight = new Float32Array(out * taps);
  for (let o = 0; o < out; o++) {
    const centre = start + (o + .5) * scale - .5, first = Math.floor(centre - 2 * stretch) + 1;
    let sum = 0;
    for (let k = 0; k < taps; k++) { const s = first + k, w = cubic((s - centre) / stretch); index[o * taps + k] = Math.min(size - 1, Math.max(0, s)); weight[o * taps + k] = w; sum += w; }
    for (let k = 0; k < taps; k++) weight[o * taps + k] /= sum;
  }
  return { index, weight, taps };
}
/** One output frame (RGB, 3 bytes a pixel) from a source frame (RGBA, 4 bytes a pixel) and a crop placed to a fraction of a pixel, so a
 * slow pan glides instead of stepping a whole pixel at a time. */
export function resampleCrop(source: Uint8Array | Uint8ClampedArray, width: number, height: number, crop: { x: number; y: number; width: number; height: number },
  outWidth: number, outHeight: number): Uint8Array {
  const across = axisWeights(crop.x, crop.width, width, outWidth), down = axisWeights(crop.y, crop.height, height, outHeight);
  let top = height, bottom = 0;
  for (const row of down.index) { top = Math.min(top, row); bottom = Math.max(bottom, row); }
  // Across first, only for the source rows the second pass reads.
  const rows = bottom - top + 1, mid = new Float32Array(rows * outWidth * 3);
  for (let r = 0; r < rows; r++) {
    const base = (top + r) * width * 4;
    for (let o = 0; o < outWidth; o++) {
      let red = 0, green = 0, blue = 0;
      for (let k = 0; k < across.taps; k++) { const w = across.weight[o * across.taps + k], p = base + across.index[o * across.taps + k] * 4; red += w * source[p]; green += w * source[p + 1]; blue += w * source[p + 2]; }
      const q = (r * outWidth + o) * 3; mid[q] = red; mid[q + 1] = green; mid[q + 2] = blue;
    }
  }
  const out = new Uint8Array(outWidth * outHeight * 3);
  for (let o = 0; o < outHeight; o++) for (let c = 0; c < outWidth; c++) {
    let red = 0, green = 0, blue = 0;
    for (let k = 0; k < down.taps; k++) { const w = down.weight[o * down.taps + k], q = ((down.index[o * down.taps + k] - top) * outWidth + c) * 3; red += w * mid[q]; green += w * mid[q + 1]; blue += w * mid[q + 2]; }
    const p = (o * outWidth + c) * 3;
    out[p] = Math.min(255, Math.max(0, Math.round(red))); out[p + 1] = Math.min(255, Math.max(0, Math.round(green))); out[p + 2] = Math.min(255, Math.max(0, Math.round(blue)));
  }
  return out;
}

/** Frames without a subject take the centring of the nearest frames with one, blended across the gap. */
function fillGaps(target: Float64Array, weight: Float64Array) {
  let before = -1;
  for (let i = 0; i < target.length; i++) {
    if (weight[i] > 0) { before = i; continue; }
    let after = i + 1;
    while (after < target.length && !(weight[after] > 0)) after++;
    target[i] = before < 0 ? target[after] : after >= target.length ? target[before] : target[before] + (target[after] - target[before]) * (i - before) / (after - before);
  }
}
function stationaryPath(lo: Float64Array, hi: Float64Array, target: Float64Array, weight: Float64Array): Float64Array {
  let sum = 0, count = 0, top = -Infinity, bottom = Infinity;
  for (let i = 0; i < target.length; i++) { top = Math.max(top, lo[i]); bottom = Math.min(bottom, hi[i]); if (weight[i]) { sum += target[i]; count++; } }
  const mean = sum / Math.max(1, count), place = top <= bottom ? Math.min(bottom, Math.max(top, mean)) : mean;
  return new Float64Array(target.length).fill(place);
}
/** Fits a path to the centring, then, in each run of frames where it leaves the subject's range, pins the frame furthest outside to the
 * edge it crossed, and fits again, until the path stays inside (or after 400 rounds). Pinning one frame a run, not the whole run, lets the
 * path touch the edge and curve away, as the smoothest path inside does; pinning the whole run would copy the edge's corners. */
function pinned(lo: Float64Array, hi: Float64Array, target: Float64Array, weight: Float64Array, fit: (target: Float64Array, weight: Float64Array) => Float64Array): Float64Array {
  const t = target.slice(), w = weight.slice(), PIN = 1e8;
  let path = fit(t, w);
  const outside = (k: number) => path[k] < lo[k] - .25 ? lo[k] - path[k] : path[k] > hi[k] + .25 ? path[k] - hi[k] : 0;
  for (let round = 0; round < 400; round++) {
    let added = false;
    for (let i = 0; i < path.length;) {
      if (!outside(i)) { i++; continue; }
      let worst = i, j = i;
      for (; j < path.length && outside(j); j++) if (outside(j) > outside(worst)) worst = j;
      t[worst] = path[worst] < lo[worst] ? lo[worst] : hi[worst]; w[worst] = PIN; added = true;
      i = j;
    }
    if (!added) break;
    path = fit(t, w);
  }
  return path;
}
/** The straight line a + b·i nearest the targets (weighted least squares). */
function fitLine(target: Float64Array, weight: Float64Array): Float64Array {
  let sw = 0, si = 0, st = 0, sii = 0, sit = 0;
  for (let i = 0; i < target.length; i++) { const w = weight[i]; sw += w; si += w * i; st += w * target[i]; sii += w * i * i; sit += w * i * target[i]; }
  const det = sw * sii - si * si, b = Math.abs(det) < 1e-9 ? 0 : (sw * sit - si * st) / det, a = (st - b * si) / Math.max(1e-9, sw);
  return Float64Array.from(target, (_, i) => a + b * i);
}
/** The Whittaker smoother (Whittaker 1923; Eilers, "A perfect smoother", Analytical Chemistry 2003): the path nearest the targets, by
 * weight, with its second differences (its acceleration) penalised by `lambda`. Frames with no weight are bridged smoothly. Solved
 * exactly as a banded system, (W + λ·DᵀD)·z = W·t. */
export function whittaker(target: Float64Array, weight: Float64Array, lambda: number): Float64Array {
  const n = target.length;
  if (n < 3) return target.slice();
  // The symmetric pentadiagonal matrix by its diagonals: d0 (main), d1 (first off), d2 (second off).
  const d0 = new Float64Array(n), d1 = new Float64Array(n), d2 = new Float64Array(n), rhs = new Float64Array(n);
  for (let i = 0; i < n; i++) { d0[i] = weight[i] + 1e-9; rhs[i] = weight[i] * target[i]; }
  for (let k = 0; k + 2 < n; k++) {
    // Row k of D is (1, -2, 1) at columns k, k+1, k+2; DᵀD adds its outer product.
    const c = [1, -2, 1];
    for (let a = 0; a < 3; a++) {
      d0[k + a] += lambda * c[a] * c[a];
      if (a < 2) d1[k + a] += lambda * c[a] * c[a + 1];
      if (a < 1) d2[k + a] += lambda * c[a] * c[a + 2];
    }
  }
  // LDLᵀ for a symmetric pentadiagonal matrix: L has two sub-diagonals (l1, l2).
  const D = new Float64Array(n), l1 = new Float64Array(n), l2 = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const a2 = i >= 2 ? l2[i - 2] * l2[i - 2] * D[i - 2] : 0, a1 = i >= 1 ? l1[i - 1] * l1[i - 1] * D[i - 1] : 0;
    D[i] = d0[i] - a1 - a2;
    if (i + 1 < n) l1[i] = (d1[i] - (i >= 1 ? l2[i - 1] * l1[i - 1] * D[i - 1] : 0)) / D[i];
    if (i + 2 < n) l2[i] = d2[i] / D[i];
  }
  const y = new Float64Array(n);
  for (let i = 0; i < n; i++) y[i] = rhs[i] - (i >= 1 ? l1[i - 1] * y[i - 1] : 0) - (i >= 2 ? l2[i - 2] * y[i - 2] : 0);
  const z = new Float64Array(n);
  for (let i = n - 1; i >= 0; i--) z[i] = y[i] / D[i] - (i + 1 < n ? l1[i] * z[i + 1] : 0) - (i + 2 < n ? l2[i] * z[i + 2] : 0);
  return z;
}
