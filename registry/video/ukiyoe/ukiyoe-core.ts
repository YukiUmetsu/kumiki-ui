/**
 * UKIYO1 core: seeded noise, easing, keyframed channels, entrances, idle loops, cadence, wind and the
 * handscroll camera. Every function is pure in the absolute frame so any seek order gives the same picture.
 */

// ---- Hashing and noise ------------------------------------------------------------------------------------------------------------

export function hashInts(a: number, b = 0, c = 0, d = 0): number {
  let h = (Math.imul(a | 0, 0x9e3779b1) ^ Math.imul(b | 0, 0x85ebca77) ^ Math.imul(c | 0, 0xc2b2ae3d) ^ Math.imul(d | 0, 0x27d4eb2f)) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d) >>> 0;
  h = Math.imul(h ^ (h >>> 12), 0x297a2d39) >>> 0;
  return (h ^ (h >>> 15)) >>> 0;
}
export const hash01 = (a: number, b = 0, c = 0, d = 0) => hashInts(a, b, c, d) / 4294967296;
export const hashSigned = (a: number, b = 0, c = 0, d = 0) => hash01(a, b, c, d) * 2 - 1;
export function seedOf(text: string, base = 0): number {
  let h = 2166136261 ^ base;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}
/** Smooth 1D value noise in [-1, 1]. */
export function noise1(seed: number, x: number): number {
  const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
  return hashSigned(seed, i) * (1 - u) + hashSigned(seed, i + 1) * u;
}
export function fbm1(seed: number, x: number, octaves = 3): number {
  let sum = 0, amp = 1, norm = 0, freq = 1;
  for (let o = 0; o < octaves; o++) { sum += noise1(seed + o * 131, x * freq) * amp; norm += amp; amp *= .5; freq *= 2.03; }
  return sum / norm;
}

// ---- Numbers ----------------------------------------------------------------------------------------------------------------------

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
export const clamp01 = (v: number) => clamp(v, 0, 1);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const smooth = (t: number) => { const x = clamp01(t); return x * x * (3 - 2 * x); };
/** 0 → 1 over [a, b]. */
export const span = (v: number, a: number, b: number) => b === a ? (v >= b ? 1 : 0) : clamp01((v - a) / (b - a));
export const r2 = (v: number) => Math.round(v * 100) / 100;
export const DEG = Math.PI / 180;

// ---- Easing -----------------------------------------------------------------------------------------------------------------------

export type UkiyoeEase = "linear" | "in" | "out" | "inOut" | "sine" | "back" | "snap" | "hold";
export const UKIYOE_EASES: readonly UkiyoeEase[] = ["linear", "in", "out", "inOut", "sine", "back", "snap", "hold"];
export function ease(name: UkiyoeEase | undefined, t: number): number {
  const x = clamp01(t);
  switch (name ?? "inOut") {
    case "linear": return x;
    case "in": return x * x * x;
    case "out": return 1 - (1 - x) ** 3;
    case "inOut": return x < .5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2;
    case "sine": return .5 - Math.cos(x * Math.PI) / 2;
    case "back": { const c = 1.6, y = x - 1; return 1 + (c + 1) * y * y * y + c * y * y; }
    case "snap": return x >= 1 ? 1 : 1 - 2 ** (-10 * x);
    case "hold": return x >= 1 ? 1 : 0;
  }
}

// ---- Channels ---------------------------------------------------------------------------------------------------------------------

/** Every animatable channel of a placed node. `progress` drives draw-on lines and motif phases (wave rise, bloom…). */
export interface UkiyoePose { x: number; y: number; rotate: number; scale: number; scaleX: number; scaleY: number; opacity: number; progress: number }
export type UkiyoeChannel = keyof UkiyoePose;
export const UKIYOE_CHANNELS: readonly UkiyoeChannel[] = ["x", "y", "rotate", "scale", "scaleX", "scaleY", "opacity", "progress"];
export const REST: UkiyoePose = { x: 0, y: 0, rotate: 0, scale: 1, scaleX: 1, scaleY: 1, opacity: 1, progress: 1 };
export type UkiyoeKey = { frame: number; ease?: UkiyoeEase } & Partial<UkiyoePose>;

export function channelAt(keys: readonly UkiyoeKey[] | undefined, channel: UkiyoeChannel, frame: number, fallback: number): number {
  if (!keys?.length) return fallback;
  let prev: UkiyoeKey | undefined, next: UkiyoeKey | undefined;
  for (const k of keys) {
    if (k[channel] === undefined) continue;
    if (k.frame <= frame) prev = k; else { next = k; break; }
  }
  if (!prev && !next) return fallback;
  if (!prev) return next![channel]!;
  if (!next) return prev[channel]!;
  return lerp(prev[channel]!, next[channel]!, ease(next.ease, (frame - prev.frame) / (next.frame - prev.frame)));
}

// ---- Entrances / exits native to the medium ----------------------------------------------------------------------------------------

/**
 * - `print`: the block lands like an impression — a baren sweep reveals it across its own bounds.
 * - `mist`: rises out of kasumi haze (fade with a slight lift and soft scale).
 * - `rise` / `sink`: travels up from / down below its rest place.
 * - `slide`: enters from a side.
 * - `grow`: unfolds vertically from its base (trees, banners, waves).
 * - `unroll`: unrolls horizontally from its left/right edge (scrolls, banners, cartouches).
 * - `stamp`: pressed down hard (seals).
 * - `fade`.
 */
export type UkiyoeMovePreset = "print" | "mist" | "rise" | "sink" | "slide" | "grow" | "unroll" | "stamp" | "fade" | "none";
export const UKIYOE_MOVES: readonly UkiyoeMovePreset[] = ["print", "mist", "rise", "sink", "slide", "grow", "unroll", "stamp", "fade", "none"];
export interface UkiyoeMove { preset: UkiyoeMovePreset; frame: number; duration: number; from?: "left" | "right" | "top" | "bottom"; distance?: number; ease?: UkiyoeEase }

export interface MoveEffect { pose: Partial<UkiyoePose>; sweep?: number }
export function moveEffect(move: UkiyoeMove, p: number): MoveEffect {
  const t = clamp01(p), d = move.distance ?? 120;
  const dir = move.from ?? "left", sx = dir === "left" ? -1 : dir === "right" ? 1 : 0, sy = dir === "top" ? -1 : dir === "bottom" ? 1 : 0;
  switch (move.preset) {
    case "print": return { pose: {}, sweep: ease(move.ease ?? "inOut", t) };
    case "mist": { const e = ease(move.ease ?? "out", t); return { pose: { opacity: e, y: 18 * (1 - e), scale: 1 + .03 * (1 - e) } }; }
    case "rise": { const e = ease(move.ease ?? "out", t); return { pose: { y: d * (1 - e), opacity: clamp01(t * 3) } }; }
    case "sink": { const e = ease(move.ease ?? "in", t); return { pose: { y: d * (1 - e), opacity: clamp01(t * 3) } }; }
    case "slide": { const e = ease(move.ease ?? "out", t); return { pose: { x: sx * d * (1 - e), y: sy * d * (1 - e), opacity: clamp01(t * 4) } }; }
    case "grow": return { pose: { scaleY: Math.max(.001, ease(move.ease ?? "out", t)), opacity: t > 0 ? 1 : 0 } };
    case "unroll": return { pose: { scaleX: Math.max(.001, ease(move.ease ?? "inOut", t)), opacity: t > 0 ? 1 : 0 } };
    case "stamp": { const e = ease(move.ease ?? "snap", t); return { pose: { scale: 1 + .6 * (1 - e), opacity: clamp01(t * 6), rotate: -4 * (1 - e) } }; }
    case "fade": return { pose: { opacity: ease(move.ease ?? "inOut", t) } };
    case "none": return { pose: {} };
  }
}

// ---- Idle loops --------------------------------------------------------------------------------------------------------------------

export type UkiyoeLoopKind = "sway" | "bob" | "rock" | "drift" | "flutter" | "breathe" | "spin" | "pulse" | "float";
export const UKIYOE_LOOPS: readonly UkiyoeLoopKind[] = ["sway", "bob", "rock", "drift", "flutter", "breathe", "spin", "pulse", "float"];
export interface UkiyoeLoop { kind: UkiyoeLoopKind; amplitude?: number; period?: number; phase?: number; start?: number; end?: number }

export function loopOffsets(loop: UkiyoeLoop, frame: number, seed: number): Partial<UkiyoePose> {
  if ((loop.start !== undefined && frame < loop.start) || (loop.end !== undefined && frame > loop.end)) return {};
  const period = Math.max(2, loop.period ?? 90), a = loop.amplitude ?? 1;
  const w = ((frame - (loop.start ?? 0)) / period + (loop.phase ?? 0)) * Math.PI * 2;
  switch (loop.kind) {
    case "sway": return { rotate: Math.sin(w) * 3 * a };
    case "bob": return { y: Math.sin(w) * 5 * a };
    // A moored boat: heave plus a lagging roll.
    case "rock": return { y: Math.sin(w) * 4 * a, rotate: Math.sin(w - .9) * 2.4 * a };
    case "drift": return { x: (frame - (loop.start ?? 0)) / period * 40 * a };
    case "flutter": return { rotate: Math.sin(w) * 2.5 * a + Math.sin(w * 2.6) * 1.2 * a, scaleY: 1 + Math.sin(w * 1.7) * .03 * a };
    case "breathe": return { scaleY: 1 + Math.sin(w) * .012 * a, y: -Math.sin(w) * .8 * a };
    case "spin": return { rotate: (w / (Math.PI * 2)) * 360 * a };
    case "pulse": return { scale: 1 + Math.sin(w) * .04 * a };
    case "float": return { x: fbm1(seed, frame / period, 2) * 10 * a, y: fbm1(seed + 3, frame / period, 2) * 7 * a, rotate: fbm1(seed + 7, frame / period, 2) * 2 * a };
  }
}

// ---- Cadence ----------------------------------------------------------------------------------------------------------------------

/** Limited animation: the frame an element on N's shows (the start of its held drawing). */
export const stepped = (frame: number, cadence: number) => Math.floor(frame / Math.max(1, cadence)) * Math.max(1, cadence);

// ---- Wind --------------------------------------------------------------------------------------------------------------------------

/** Global wind: one field shared by trees, sleeves, rain, smoke, banners and boats so a gust reads as one event. */
export interface UkiyoeWind { base?: number; gusts?: readonly { frame: number; duration: number; strength: number }[]; turbulence?: number }

/** Signed wind strength at a frame (+ blows to the right). Typically -2..2. */
export function windAt(wind: UkiyoeWind | undefined, frame: number, seed = 0): number {
  if (!wind) return 0;
  let w = wind.base ?? 0;
  for (const g of wind.gusts ?? []) {
    const t = (frame - g.frame) / Math.max(1, g.duration);
    if (t <= 0 || t >= 1) continue;
    // Fast build, long tail, small flutter inside the gust.
    const skew = t < .3 ? t / .3 * .5 : .5 + (t - .3) / .7 * .5, env = Math.sin(Math.PI * skew) ** 2;
    w += g.strength * env * (1 + .18 * Math.sin(frame * .9));
  }
  return w + fbm1(seed + 991, frame / 45, 2) * (wind.turbulence ?? .15) * (Math.abs(w) + .4);
}

// ---- Camera -----------------------------------------------------------------------------------------------------------------------

export interface UkiyoeCameraKey { frame: number; x: number; y: number; zoom?: number; rotate?: number; ease?: UkiyoeEase }
export interface UkiyoeCameraShake { frame: number; duration?: number; amount?: number }
export interface UkiyoeCamera { keys?: readonly UkiyoeCameraKey[]; shake?: readonly UkiyoeCameraShake[]; drift?: number }
export interface CameraState { x: number; y: number; zoom: number; rotate: number }

export function cameraAt(camera: UkiyoeCamera | undefined, frame: number, width: number, height: number, seed = 0): CameraState {
  const keys = camera?.keys?.length ? camera.keys : [{ frame: 0, x: width / 2, y: height / 2, zoom: 1 }];
  const as = keys.map(k => ({ frame: k.frame, ease: k.ease, x: k.x, y: k.y, scale: k.zoom ?? 1, rotate: k.rotate ?? 0 })) as UkiyoeKey[];
  let x = channelAt(as, "x", frame, width / 2), y = channelAt(as, "y", frame, height / 2);
  const zoom = channelAt(as, "scale", frame, 1);
  let rotate = channelAt(as, "rotate", frame, 0);
  const drift = camera?.drift ?? 0;
  if (drift) { x += fbm1(seed + 11, frame / 150, 2) * drift; y += fbm1(seed + 17, frame / 170, 2) * drift * .6; }
  for (const s of camera?.shake ?? []) {
    const t = (frame - s.frame) / Math.max(2, s.duration ?? 16);
    if (t < 0 || t > 1) continue;
    const decay = (1 - t) ** 2, a = (s.amount ?? 1) * 7;
    x += Math.sin(t * 37) * a * decay; y += Math.cos(t * 29) * a * .8 * decay; rotate += Math.sin(t * 21) * a * .05 * decay;
  }
  return { x, y, zoom, rotate };
}

/** Parallax: depth 1 is the scroll plane; < 1 is further away (moves less), > 1 nearer the lens. */
export function cameraTransform(c: CameraState, width: number, height: number, depth = 1): string {
  const cx = width / 2, cy = height / 2, zoom = 1 + (c.zoom - 1) * depth;
  const fx = cx + (c.x - cx) * depth, fy = cy + (c.y - cy) * depth;
  const r = (v: number) => Math.round(v * 1000) / 1000;
  return `translate(${r(cx)} ${r(cy)}) rotate(${r(c.rotate * depth)}) scale(${r(zoom)}) translate(${r(-fx)} ${r(-fy)})`;
}

/**
 * Handscroll pan: camera keys that travel the scroll at a reading pace with gentle easing at both ends,
 * optionally pausing at "stations" — the way a reader unrolls an emaki, lingers on a scene, then moves on.
 */
export function scrollPan(options: {
  from: number; to: number; y: number; start: number; end: number; zoom?: number;
  stations?: readonly { x: number; hold: number }[];
}): UkiyoeCameraKey[] {
  const { from, to, y, start, end, zoom = 1 } = options;
  const stations = [...(options.stations ?? [])].sort((a, b) => from < to ? a.x - b.x : b.x - a.x);
  const holdTotal = stations.reduce((s, st) => s + st.hold, 0);
  const travel = Math.max(1, end - start - holdTotal), dist = Math.abs(to - from) || 1;
  const keys: UkiyoeCameraKey[] = [{ frame: start, x: from, y, zoom }];
  let at = start, last = from;
  for (const st of stations) {
    at += Math.round(travel * Math.abs(st.x - last) / dist);
    keys.push({ frame: at, x: st.x, y, zoom, ease: keys.length === 1 ? "inOut" : "sine" });
    at += st.hold; keys.push({ frame: at, x: st.x, y, zoom, ease: "linear" });
    last = st.x;
  }
  keys.push({ frame: end, x: to, y, zoom, ease: "inOut" });
  return keys;
}

// ---- Geometry ---------------------------------------------------------------------------------------------------------------------

export type Pt = readonly [number, number];
const f = (v: number) => (Math.round(v * 10) / 10).toString();

export function polyD(points: readonly Pt[], closed = true): string {
  if (!points.length) return "";
  return "M" + points.map(p => f(p[0]) + " " + f(p[1])).join("L") + (closed ? "Z" : "");
}
/** Catmull-Rom spline through points as cubic Béziers. */
export function smoothD(points: readonly Pt[], closed = false, tension = .5): string {
  const n = points.length;
  if (n < 3) return polyD(points, closed);
  const at = (i: number) => closed ? points[(i + n) % n] : points[clamp(i, 0, n - 1)];
  let d = "M" + f(points[0][0]) + " " + f(points[0][1]);
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2), k = tension / 3;
    d += "C" + f(p1[0] + (p2[0] - p0[0]) * k) + " " + f(p1[1] + (p2[1] - p0[1]) * k) + " "
      + f(p2[0] - (p3[0] - p1[0]) * k) + " " + f(p2[1] - (p3[1] - p1[1]) * k) + " " + f(p2[0]) + " " + f(p2[1]);
  }
  return d + (closed ? "Z" : "");
}
export function polylineLength(points: readonly Pt[]): number {
  let s = 0;
  for (let i = 1; i < points.length; i++) s += Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]);
  return s;
}
/** Resample a polyline at roughly `step` spacing (keeps ends). */
export function resample(points: readonly Pt[], step: number): Pt[] {
  if (points.length < 2) return [...points];
  const out: Pt[] = [points[0]];
  let carry = 0;
  for (let i = 1; i < points.length; i++) {
    const [ax, ay] = points[i - 1], [bx, by] = points[i], len = Math.hypot(bx - ax, by - ay);
    let d = step - carry;
    while (d < len) { const t = d / len; out.push([ax + (bx - ax) * t, ay + (by - ay) * t]); d += step; }
    carry = len - (d - step);
  }
  const end = points[points.length - 1], tail = out[out.length - 1];
  if (Math.hypot(end[0] - tail[0], end[1] - tail[1]) > step * .25) out.push(end); else out[out.length - 1] = end;
  return out;
}
export function trim(points: readonly Pt[], fraction: number): Pt[] {
  if (fraction >= 1) return [...points];
  if (fraction <= 0 || points.length < 2) return points.slice(0, 1);
  const total = polylineLength(points) * fraction, out: Pt[] = [points[0]];
  let acc = 0;
  for (let i = 1; i < points.length; i++) {
    const [ax, ay] = points[i - 1], [bx, by] = points[i], len = Math.hypot(bx - ax, by - ay);
    if (acc + len >= total) { const t = (total - acc) / Math.max(1e-6, len); out.push([ax + (bx - ax) * t, ay + (by - ay) * t]); return out; }
    acc += len; out.push(points[i]);
  }
  return out;
}

/** Quadratic Bézier sampled as a polyline. */
export function quad(a: Pt, c: Pt, b: Pt, n = 12): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, u = 1 - t;
    out.push([u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]]);
  }
  return out;
}

export type Taper = "both" | "start" | "end" | "none" | "swell";
/**
 * A carved key-block line: a filled ribbon whose width swells and tapers like a line left standing by the
 * carver's knife. `wobble` adds tiny seeded irregularity so long lines are not ruler-straight.
 */
export function carvedLine(points: readonly Pt[], width: number, options: { taper?: Taper; seed?: number; wobble?: number; minRatio?: number } = {}): string {
  const pts = points.length > 2 ? points : points.length === 2 ? resample(points, Math.max(4, polylineLength(points) / 8)) : [...points];
  const n = pts.length;
  if (n < 2) return "";
  const taper = options.taper ?? "both", seed = options.seed ?? 1, wob = options.wobble ?? .12, min = options.minRatio ?? .28;
  const total = polylineLength(pts);
  const left: Pt[] = [], right: Pt[] = [];
  let acc = 0;
  for (let i = 0; i < n; i++) {
    if (i) acc += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    const t = total ? acc / total : 0;
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
    let tx = b[0] - a[0], ty = b[1] - a[1];
    const len = Math.hypot(tx, ty) || 1; tx /= len; ty /= len;
    let w = 1;
    if (taper === "both") w = min + (1 - min) * Math.sin(Math.PI * clamp01(t)) ** .55;
    else if (taper === "start") w = min + (1 - min) * Math.min(1, t * 3.2);
    else if (taper === "end") w = min + (1 - min) * Math.min(1, (1 - t) * 3.2);
    else if (taper === "swell") w = .55 + .45 * Math.sin(Math.PI * clamp01(t));
    w *= 1 + noise1(seed, acc / 22) * wob;
    const hw = Math.max(.15, width * w / 2);
    left.push([pts[i][0] - ty * hw, pts[i][1] + tx * hw]);
    right.push([pts[i][0] + ty * hw, pts[i][1] - tx * hw]);
  }
  return polyD([...left, ...right.reverse()], true);
}

export function rotatePt(p: Pt, deg: number, about: Pt = [0, 0]): Pt {
  const r = deg * DEG, c = Math.cos(r), s = Math.sin(r), x = p[0] - about[0], y = p[1] - about[1];
  return [about[0] + x * c - y * s, about[1] + x * s + y * c];
}
export const add = (a: Pt, b: Pt): Pt => [a[0] + b[0], a[1] + b[1]];
/** Point at `len` from `p` along angle `deg` (0 = +x, 90 = +y / down). */
export const polar = (p: Pt, deg: number, len: number): Pt => [p[0] + Math.cos(deg * DEG) * len, p[1] + Math.sin(deg * DEG) * len];

// ---- Colour -----------------------------------------------------------------------------------------------------------------------

export const isHex = (v: unknown): v is string => typeof v === "string" && /^#[0-9a-fA-F]{6}$/.test(v);
export function hexRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export const rgbHex = (r: number, g: number, b: number) => "#" + [r, g, b].map(v => clamp(Math.round(v), 0, 255).toString(16).padStart(2, "0")).join("");
export function mix(a: string, b: string, t: number): string {
  const x = hexRgb(a), y = hexRgb(b);
  return rgbHex(lerp(x[0], y[0], t), lerp(x[1], y[1], t), lerp(x[2], y[2], t));
}
/** Relative lightness 0..1 (perceptual approximation), used to order impressions light → dark. */
export function lightness(hex: string): number {
  const [r, g, b] = hexRgb(hex);
  return (.299 * r + .587 * g + .114 * b) / 255;
}
