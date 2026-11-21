/** Subject mattes (VE1.5): a raw per-frame mask of the subject (from a segmentation model, a colour selection or an artist's matte)
 * refined into a clean, steady matte, and the subject cut out with its true colours, for effects that put things between the subject
 * and its background: words behind a person, an outline, a new background, clones.
 *
 * Stages, each a pure function on typed arrays:
 *   1. `refineMatte`: clean levels (near-black to 0, near-white to 1); snap the edge to the picture with the guided filter (He et al.
 *      2013, the same filter selective colour uses); steady it over time by blending with the last matte only where the picture did not
 *      change, so a still subject stops shimmering and a moving one leaves no trail.
 *   2. `estimateForeground`: the subject's own colour in its soft edges, without the background mixed in (blur fusion, Germer et al.,
 *      "Fast Multi-Level Foreground Estimation", ICPR 2020): a coarse then a fine pass of box blurs. Without it, hair and feathers carry a
 *      fringe of the old background onto the new one.
 *   3. `cutout`: RGBA with the matte as alpha and the estimated foreground as colour.
 */
import { boxMean, guidedFilter } from "./selective-color";

export interface MatteFrame { width: number; height: number; data: Uint8ClampedArray | Uint8Array }
export interface MatteRefineOptions {
  /** Below this a mask value is background, above `1 - clean` it is subject. Segmentation models leave a faint haze over shadows and
   * gaps (between a bird's legs); 0.12 clears it and keeps feather and hair tips. @default 0.12 */
  clean: number;
  /** The guided filter's radius as a fraction of the frame's short side, and its regularisation. @default 0.006, 0.0008 */
  edgeRadius: number;
  epsilon: number;
  /** How much of the last matte a still pixel keeps, 0 to 0.9. @default 0.5 */
  smoothing: number;
  /** The change in luma (0 to 1) at which a pixel counts as moving and keeps none of the last matte. @default 0.05 */
  motion: number;
}
export const MATTE_DEFAULTS: MatteRefineOptions = { clean: .12, edgeRadius: .006, epsilon: .0008, smoothing: .5, motion: .05 };
export interface MatteState { mask?: Float32Array; luma?: Float32Array }

/** Rec. 709 luma of an RGBA frame, 0 to 1. */
export function frameLuma(frame: MatteFrame): Float32Array {
  const out = new Float32Array(frame.width * frame.height), d = frame.data;
  for (let p = 0; p < out.length; p++) out[p] = (.2126 * d[4 * p] + .7152 * d[4 * p + 1] + .0722 * d[4 * p + 2]) / 255;
  return out;
}

/** Problems with refine options, as messages; empty when they are usable. */
export function inspectMatteOptions(options: Partial<MatteRefineOptions>): string[] {
  const o = { ...MATTE_DEFAULTS, ...options }, problems: string[] = [];
  if (!(o.clean >= 0 && o.clean < .45)) problems.push("`clean` runs from 0 to 0.45.");
  if (!(o.edgeRadius >= 0 && o.edgeRadius <= .05)) problems.push("`edgeRadius` runs from 0 to 0.05 of the short side.");
  if (!(o.epsilon > 0 && o.epsilon <= .1)) problems.push("`epsilon` runs above 0 to 0.1.");
  if (!(o.smoothing >= 0 && o.smoothing <= .9)) problems.push("`smoothing` runs from 0 to 0.9.");
  if (!(o.motion > 0 && o.motion <= 1)) problems.push("`motion` runs above 0 to 1.");
  return problems;
}

/** A clean, edge-snapped, steady matte from a raw mask (0 to 1 per pixel) and its frame. `state` carries the last frame's matte. */
export function refineMatte(mask: Float32Array, frame: MatteFrame, state: MatteState, options: Partial<MatteRefineOptions> = {}): Float32Array {
  const o = { ...MATTE_DEFAULTS, ...options }, { width, height } = frame, n = width * height, span = Math.max(1e-6, 1 - 2 * o.clean);
  if (mask.length !== n) throw new Error(`The mask has ${mask.length} values for a ${width}×${height} frame.`);
  let out: Float32Array = new Float32Array(n);
  for (let k = 0; k < n; k++) out[k] = Math.min(1, Math.max(0, (mask[k] - o.clean) / span));
  const luma = frameLuma(frame), r = Math.round(o.edgeRadius * Math.min(width, height));
  if (r > 0) {
    out = guidedFilter(luma, out, width, height, r, o.epsilon);
    for (let k = 0; k < n; k++) out[k] = Math.min(1, Math.max(0, out[k]));
  }
  if (o.smoothing > 0 && state.mask?.length === n && state.luma?.length === n) {
    for (let k = 0; k < n; k++) {
      const change = (luma[k] - state.luma[k]) / o.motion, keep = o.smoothing * Math.exp(-change * change);
      out[k] = (1 - keep) * out[k] + keep * state.mask[k];
    }
  }
  state.mask = out;
  state.luma = luma;
  return out;
}

/** One blur-fusion pass: the foreground and background colours at each pixel, from box blurs of radius `r` weighted by the matte. */
function blurFusion(image: Float32Array[], fg: Float32Array[], bg: Float32Array[], alpha: Float32Array, width: number, height: number, r: number) {
  const n = alpha.length, blurredAlpha = boxMean(alpha, width, height, r), outF: Float32Array[] = [], outB: Float32Array[] = [];
  for (let c = 0; c < 3; c++) {
    const fa = new Float32Array(n), b1a = new Float32Array(n);
    for (let k = 0; k < n; k++) { fa[k] = fg[c][k] * alpha[k]; b1a[k] = bg[c][k] * (1 - alpha[k]); }
    const bfa = boxMean(fa, width, height, r), bb1a = boxMean(b1a, width, height, r), f = new Float32Array(n), b = new Float32Array(n);
    for (let k = 0; k < n; k++) {
      const meanF = bfa[k] / (blurredAlpha[k] + 1e-5), meanB = bb1a[k] / (1 - blurredAlpha[k] + 1e-5), a = alpha[k];
      f[k] = Math.min(1, Math.max(0, meanF + a * (image[c][k] - a * meanF - (1 - a) * meanB)));
      b[k] = meanB;
    }
    outF.push(f); outB.push(b);
  }
  return { fg: outF, bg: outB };
}

/** The subject's own colour (RGB planes, 0 to 1) under its matte: a coarse pass (about 8 % of the short side) then a fine one (0.6 %). */
export function estimateForeground(frame: MatteFrame, alpha: Float32Array): Float32Array[] {
  const { width, height } = frame, n = width * height, image = [0, 1, 2].map(c => { const plane = new Float32Array(n); for (let k = 0; k < n; k++) plane[k] = frame.data[4 * k + c] / 255; return plane; });
  const short = Math.min(width, height), coarse = blurFusion(image, image, image, alpha, width, height, Math.max(2, Math.round(short * .08)));
  return blurFusion(image, coarse.fg, coarse.bg, alpha, width, height, Math.max(1, Math.round(short * .006))).fg;
}

/** The subject cut out: RGBA with the matte as alpha and, where the matte is soft, the estimated foreground colour. */
export function cutout(frame: MatteFrame, alpha: Float32Array): Uint8ClampedArray {
  const fg = estimateForeground(frame, alpha), out = new Uint8ClampedArray(frame.width * frame.height * 4);
  for (let k = 0; k < alpha.length; k++) {
    const a = alpha[k];
    // Solid subject keeps its pixels exactly; only partial pixels take the estimate.
    for (let c = 0; c < 3; c++) out[4 * k + c] = a > .995 ? frame.data[4 * k + c] : Math.round(fg[c][k] * 255);
    out[4 * k + 3] = Math.round(a * 255);
  }
  return out;
}
