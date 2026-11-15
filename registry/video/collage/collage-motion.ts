/**
 * COLLAGE1 motion: keyframed channels, hand-placed entrances, idle loops, stop-motion cadence and camera.
 *
 * Paper collage animation is stop-motion in spirit: a hand moves each cutout between exposures, so poses
 * are held for two frames ("on twos") and each held pose sits a fraction of a pixel off ("boil"). The
 * camera, by contrast, is a smooth rostrum move. Every function here is pure in the absolute frame.
 */
import { fbm1, hashSigned } from "./collage-geometry";

export type CollageEase = "linear" | "in" | "out" | "inOut" | "back" | "snap" | "bounce" | "elastic" | "hold";

const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
export function ease(name: CollageEase | undefined, t: number): number {
  const x = clamp01(t);
  switch (name ?? "inOut") {
    case "linear": return x;
    case "in": return x * x * x;
    case "out": return 1 - (1 - x) ** 3;
    case "inOut": return x < .5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2;
    case "back": { const c = 1.9, y = x - 1; return 1 + (c + 1) * y * y * y + c * y * y; }
    case "snap": return x >= 1 ? 1 : 1 - 2 ** (-11 * x);
    case "bounce": {
      const n = 7.5625, d = 2.75;
      if (x < 1 / d) return n * x * x;
      if (x < 2 / d) { const y = x - 1.5 / d; return n * y * y + .75; }
      if (x < 2.5 / d) { const y = x - 2.25 / d; return n * y * y + .9375; }
      const y = x - 2.625 / d; return n * y * y + .984375;
    }
    case "elastic": return x === 0 || x === 1 ? x : 2 ** (-9 * x) * Math.sin((x * 10 - .75) * (2 * Math.PI / 3)) + 1;
    case "hold": return x >= 1 ? 1 : 0;
  }
}
export const COLLAGE_EASES: readonly CollageEase[] = ["linear", "in", "out", "inOut", "back", "snap", "bounce", "elastic", "hold"];

/** Every animatable channel of a placed piece of paper. `lift` is height above the board (0 = resting). */
export interface CollagePose { x: number; y: number; rotate: number; scale: number; scaleX: number; scaleY: number; opacity: number; lift: number; progress: number }
export type CollageChannel = keyof CollagePose;
export const COLLAGE_CHANNELS: readonly CollageChannel[] = ["x", "y", "rotate", "scale", "scaleX", "scaleY", "opacity", "lift", "progress"];
export const REST_POSE: CollagePose = { x: 0, y: 0, rotate: 0, scale: 1, scaleX: 1, scaleY: 1, opacity: 1, lift: 0, progress: 1 };

/** A key sets any subset of channels; the ease shapes the approach into this key. */
export type CollageKey = { frame: number; ease?: CollageEase } & Partial<CollagePose>;

/** Channel value at a frame from sparse keys, or `fallback` when no key sets it. */
export function channelAt(keys: readonly CollageKey[] | undefined, channel: CollageChannel, frame: number, fallback: number): number {
  if (!keys?.length) return fallback;
  let prev: CollageKey | undefined, next: CollageKey | undefined;
  for (const k of keys) {
    if (k[channel] === undefined) continue;
    if (k.frame <= frame) prev = k;
    else { next = k; break; }
  }
  if (!prev && !next) return fallback;
  if (!prev) return next![channel]!;
  if (!next) return prev[channel]!;
  const t = (frame - prev.frame) / (next.frame - prev.frame);
  return prev[channel]! + (next[channel]! - prev[channel]!) * ease(next.ease, t);
}

// ---- Entrances and exits ---------------------------------------------------------------------------------------------------------

export type CollageMovePreset =
  | "slide" | "drop" | "pop" | "flip" | "unfold" | "grow" | "fade" | "stamp" | "swing" | "draw" | "peel" | "none";
export type CollageDirection = "left" | "right" | "top" | "bottom";
export interface CollageMove {
  preset: CollageMovePreset;
  frame: number;
  duration: number;
  from?: CollageDirection;
  /** Slide distance in authored pixels. */
  distance?: number;
  ease?: CollageEase;
}

/**
 * Additive/multiplicative offsets for a move at progress `p` (0 = off the board, 1 = settled).
 * Offsets are expressed in the piece's parent space so a slide always comes from the stated screen edge.
 */
export function moveOffsets(move: CollageMove, p: number): Partial<CollagePose> {
  const t = clamp01(p), dist = move.distance ?? 1100;
  const dir = move.from ?? "left";
  const sx = dir === "left" ? -1 : dir === "right" ? 1 : 0, sy = dir === "top" ? -1 : dir === "bottom" ? 1 : 0;
  switch (move.preset) {
    case "slide": {
      // A hand slides the paper in flat, it overshoots a touch, and the lifted edge settles onto the board.
      const e = ease(move.ease ?? "back", t);
      return { x: sx * dist * (1 - e), y: sy * dist * (1 - e), rotate: (sx || sy) * 5 * (1 - ease("out", t)), lift: .55 * (1 - ease("out", t)) };
    }
    case "drop": {
      // Placed by hand from above: falls from lift, slightly larger and turned, lands, shadow tightens.
      const e = ease(move.ease ?? "out", t);
      return { lift: 1.6 * (1 - e), scale: 1 + .1 * (1 - e), rotate: 7 * (1 - ease("back", t)), opacity: clamp01(t * 5), y: -14 * (1 - e) };
    }
    case "pop": return { scale: ease(move.ease ?? "back", t), opacity: clamp01(t * 4), lift: .4 * (1 - t) };
    case "flip": return { scaleX: Math.max(.001, ease(move.ease ?? "out", t)), lift: .6 * Math.sin(t * Math.PI), opacity: t > 0 ? 1 : 0 };
    case "unfold": return { scaleY: Math.max(.001, ease(move.ease ?? "back", t)), opacity: t > 0 ? 1 : 0 };
    case "grow": return { scaleY: Math.max(.001, ease(move.ease ?? "out", t)), opacity: t > 0 ? 1 : 0 };
    case "fade": return { opacity: ease(move.ease ?? "inOut", t) };
    case "stamp": {
      // Slams down hard and fast: big and high, then a tiny rebound.
      const e = ease(move.ease ?? "snap", t);
      return { scale: 1 + .9 * (1 - e), lift: 1.2 * (1 - e), opacity: clamp01(t * 6), rotate: -6 * (1 - e) };
    }
    case "swing": {
      // Hangs from its top pivot and swings into rest, like a tag on a pin.
      const decay = Math.exp(-4 * t), swing = Math.cos(t * Math.PI * 3.2) * decay * (1 - t);
      return { rotate: 26 * swing * (sx || 1), opacity: clamp01(t * 6), lift: .3 * (1 - t) };
    }
    case "draw": return { progress: ease(move.ease ?? "inOut", t) };
    case "peel": {
      const e = ease(move.ease ?? "out", t);
      return { rotate: -14 * (1 - e), lift: 1.1 * (1 - e), scaleY: .7 + .3 * e, opacity: clamp01(t * 5), x: -30 * (1 - e) };
    }
    case "none": return {};
  }
}

// ---- Idle loops ------------------------------------------------------------------------------------------------------------------

export type CollageLoopKind = "bob" | "sway" | "spin" | "pulse" | "float" | "flutter" | "orbit";
export interface CollageLoop { kind: CollageLoopKind; amplitude?: number; period?: number; phase?: number; start?: number; end?: number }

export function loopOffsets(loop: CollageLoop, frame: number, seed: number): Partial<CollagePose> {
  if ((loop.start !== undefined && frame < loop.start) || (loop.end !== undefined && frame > loop.end)) return {};
  const period = Math.max(2, loop.period ?? 60), a = loop.amplitude ?? 1;
  const w = ((frame - (loop.start ?? 0)) / period + (loop.phase ?? 0)) * Math.PI * 2;
  switch (loop.kind) {
    case "bob": return { y: Math.sin(w) * 6 * a };
    case "sway": return { rotate: Math.sin(w) * 4 * a };
    case "spin": return { rotate: (w / (Math.PI * 2)) * 360 * a };
    case "pulse": return { scale: 1 + Math.sin(w) * .05 * a };
    case "float": return { x: fbm1(seed, frame / period, 2) * 10 * a, y: fbm1(seed + 3, frame / period, 2) * 8 * a, rotate: fbm1(seed + 5, frame / period, 2) * 2 * a };
    case "flutter": return { rotate: Math.sin(w) * 3 * a + Math.sin(w * 2.7) * 1.5 * a, scaleY: 1 + Math.sin(w * 1.9) * .04 * a };
    case "orbit": return { x: Math.cos(w) * 14 * a, y: Math.sin(w) * 9 * a };
  }
}

// ---- Stop-motion cadence and boil ------------------------------------------------------------------------------------------------

/** The source frame a stepped piece shows: the start of its current held pose. */
export const steppedFrame = (frame: number, cadence: number) => Math.floor(frame / Math.max(1, cadence)) * Math.max(1, cadence);

/** Sub-pixel placement error of a hand-moved cutout for one held pose. */
export function boilOffsets(seed: number, step: number, amount: number): Partial<CollagePose> {
  if (amount <= 0) return {};
  return { x: hashSigned(seed, step, 1) * amount, y: hashSigned(seed, step, 2) * amount, rotate: hashSigned(seed, step, 3) * amount * .22 };
}

// ---- Camera ----------------------------------------------------------------------------------------------------------------------

export interface CollageCameraKey { frame: number; x: number; y: number; zoom: number; rotate?: number; ease?: CollageEase }
export interface CollageCameraBump { frame: number; amount?: number; duration?: number }
export interface CollageCameraState { x: number; y: number; zoom: number; rotate: number }

/**
 * Rostrum camera: authored focus/zoom keys plus a slow handheld drift and short impact bumps.
 * `x`,`y` is the board point at frame centre.
 */
export function cameraAt(keys: readonly CollageCameraKey[] | undefined, frame: number, width: number, height: number,
  options: { drift?: number; bumps?: readonly CollageCameraBump[]; seed?: number } = {}): CollageCameraState {
  const k = keys?.length ? keys : [{ frame: 0, x: width / 2, y: height / 2, zoom: 1 }];
  const asKeys = k as unknown as CollageKey[];
  const x = channelAt(asKeys, "x", frame, width / 2), y = channelAt(asKeys, "y", frame, height / 2);
  const zoom = channelAt(asKeys.map(q => ({ ...q, scale: (q as unknown as CollageCameraKey).zoom })), "scale", frame, 1);
  const rotate = channelAt(asKeys, "rotate", frame, 0);
  const drift = options.drift ?? 0, seed = options.seed ?? 0;
  let bx = 0, by = 0, br = 0;
  for (const bump of options.bumps ?? []) {
    const d = Math.max(2, bump.duration ?? 10), t = (frame - bump.frame) / d;
    if (t < 0 || t > 1) continue;
    const decay = (1 - t) ** 2, a = (bump.amount ?? 1) * 5;
    bx += Math.sin(t * 31) * a * decay; by += Math.cos(t * 23) * a * decay * .8; br += Math.sin(t * 17) * a * .08 * decay;
  }
  return {
    x: x + fbm1(seed + 11, frame / 140, 2) * drift + bx,
    y: y + fbm1(seed + 17, frame / 160, 2) * drift * .7 + by,
    zoom, rotate: rotate + fbm1(seed + 23, frame / 180, 2) * drift * .015 + br,
  };
}

/**
 * SVG transform for a layer at parallax `depth` (1 = the board plane, <1 further back, >1 closer).
 * Deeper layers move and zoom less, so a push-in separates the cutouts the way stacked glass does.
 */
export function cameraTransform(camera: CollageCameraState, width: number, height: number, depth = 1): string {
  const cx = width / 2, cy = height / 2;
  const zoom = 1 + (camera.zoom - 1) * depth;
  const fx = cx + (camera.x - cx) * depth, fy = cy + (camera.y - cy) * depth;
  const r = (v: number) => Math.round(v * 1000) / 1000;
  return `translate(${r(cx)} ${r(cy)}) rotate(${r(camera.rotate * depth)}) scale(${r(zoom)}) translate(${r(-fx)} ${r(-fy)})`;
}
