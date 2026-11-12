/** Matte transitions: the next scene shows through a pattern that grows over the old one.
 *
 * - **Organic matte** (`{ "kind": "matte", "texture": "ink" }`): the next scene spreads in like ink in water, a brush stroke or smoke, from
 *   seeded noise. Its edge is soft and irregular; an optional `color` stains the edge as it travels.
 * - **Dither** (`{ "kind": "dither" }`): the next scene appears cell by cell in an ordered (Bayer) pattern of hard pixels, like an old
 *   screen or a print.
 *
 * Practice (doc 34, T4 and T5): stock libraries sell ink, paint and smoke mattes, and type-led titles use dithering to "lose information
 * on purpose". Stock mattes carry unclear licences and a look everyone recognises, so these are generated: the same seed and size give the
 * same matte, and every frame is a pure function of the transition's progress.
 *
 * A matte is a field of numbers over the frame. As the transition runs, a level rises through it, and the next scene shows wherever the
 * field is below the level, with a soft edge. The level starts below the field's lowest value and ends above its highest, so the first
 * frame shows only the old scene and the last only the new.
 */

export type MatteTexture = "ink" | "brush" | "smoke";
export interface FilmMatteSpec {
  /** @default "ink" */
  texture?: MatteTexture;
  /** A different seed gives a different matte of the same kind. @default 1 */
  seed?: number;
  /** A subject of the outgoing scene where ink starts. @default two seeded points */
  subject?: string;
  /** A stain on the travelling edge, in this colour. */
  color?: string;
}
export interface FilmDitherSpec {
  /** A dither cell's size, as a fraction of the frame's short side. @default 0.008 */
  cell?: number;
}
/** A matte as the stage draws it, by incoming scene ID. Origins are fractions of the frame. */
export interface FilmMatte { texture: MatteTexture; seed: number; origins: ReadonlyArray<{ x: number; y: number }>; edge?: string }
export interface FilmDither { cell: number }
export interface MatteProblem { severity: "error" | "warning"; code: string; path: string; message: string; hint?: string }

export const MATTE_FRAMES = 26, DITHER_FRAMES = 14;
const TEXTURES: readonly MatteTexture[] = ["ink", "brush", "smoke"];
const COLOR = /^#[0-9a-f]{6}$/i;
/** How soft each texture's edge is, in field units. */
const SOFT: Record<MatteTexture, number> = { ink: .035, brush: .02, smoke: .1 };

/** A seeded hash of a lattice point to 0..1. */
function hash(x: number, y: number, seed: number): number {
  let h = (x * 374761393 + y * 668265263 + seed * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}
/** Smooth value noise, 0..1. */
function noise(x: number, y: number, seed: number): number {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi, seed), b = hash(xi + 1, yi, seed), c = hash(xi, yi + 1, seed), d = hash(xi + 1, yi + 1, seed);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
/** Fractal noise: five octaves of value noise, 0..1. */
function fbm(x: number, y: number, seed: number): number {
  let sum = 0, amp = .5, total = 0;
  for (let o = 0; o < 5; o++) { sum += amp * noise(x, y, seed + o * 17); total += amp; x *= 2.03; y *= 2.03; amp *= .5; }
  return sum / total;
}

/** The two points ink starts from when no subject is named, placed by the seed away from the edges. */
export function inkOrigins(seed: number): Array<{ x: number; y: number }> {
  return [0, 1].map(i => ({ x: .22 + .56 * hash(i, 7, seed), y: .25 + .5 * hash(i, 11, seed) }));
}

/** The matte's field at `cols × rows` cells for a frame of `aspect` (width / height), with its lowest and highest values. Cache it: it does
 * not change across the transition. */
export function matteField(matte: Pick<FilmMatte, "texture" | "seed" | "origins">, cols: number, rows: number, aspect: number): { field: Float32Array; min: number; max: number } {
  const field = new Float32Array(cols * rows), reach = Math.hypot(aspect, 1);
  let min = Infinity, max = -Infinity;
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const x = (i + .5) / cols * aspect, y = (j + .5) / rows;
    let value: number;
    if (matte.texture === "ink") {
      // Distance from the nearest origin, pushed about by warped fractal noise, so the ink spreads in tendrils rather than circles.
      const wx = fbm(x * 2.2, y * 2.2, matte.seed + 3) - .5, wy = fbm(x * 2.2 + 5.2, y * 2.2 + 1.3, matte.seed + 5) - .5;
      const near = Math.min(...matte.origins.map(o => Math.hypot(x - o.x * aspect, y - o.y))) / reach;
      value = near + .42 * (fbm(x * 3.1 + wx * 1.6, y * 3.1 + wy * 1.6, matte.seed) - .5);
    } else if (matte.texture === "brush") {
      // A sweep from left to right whose edge breaks into horizontal streaks, like bristles dragged across.
      value = x / aspect + .3 * (fbm(x * 1.4, y * 11, matte.seed) - .5) + .08 * (fbm(x * 6, y * 30, matte.seed + 9) - .5);
    } else {
      value = fbm(x * 1.8 + .6 * fbm(x * 1.2, y * 1.2, matte.seed + 2), y * 1.8, matte.seed);
    }
    field[j * cols + i] = value;
    if (value < min) min = value;
    if (value > max) max = value;
  }
  return { field, min, max };
}
const ease = (t: number) => { const v = Math.min(1, Math.max(0, t)); return v < .5 ? 2 * v * v : 1 - (-2 * v + 2) ** 2 / 2; };
/** The incoming scene's opacity (0..255) in each cell at `progress`, and the edge stain's opacity in each cell. */
export function matteAlpha(texture: MatteTexture, field: { field: Float32Array; min: number; max: number }, progress: number): { reveal: Uint8ClampedArray; stain: Uint8ClampedArray } {
  const soft = SOFT[texture], level = field.min - soft + (field.max - field.min + 2 * soft) * ease(progress);
  const reveal = new Uint8ClampedArray(field.field.length), stain = new Uint8ClampedArray(field.field.length);
  for (let k = 0; k < field.field.length; k++) {
    const t = Math.min(1, Math.max(0, (level - field.field[k] + soft) / (2 * soft)));
    reveal[k] = Math.round(255 * t * t * (3 - 2 * t));
    // The stain sits just outside the revealed edge, where the ink is arriving.
    const s = 1 - Math.min(1, Math.abs(field.field[k] - level - soft * .6) / (soft * 1.8));
    stain[k] = Math.round(255 * s * s);
  }
  return { reveal, stain };
}

const BAYER = (() => {
  // The 8×8 ordered dither matrix, built from the 2×2 one, values 0..63.
  let m = [[0, 2], [3, 1]];
  while (m.length < 8) {
    const n = m.length;
    m = Array.from({ length: n * 2 }, (_, y) => Array.from({ length: n * 2 }, (_, x) => 4 * m[y % n][x % n] + [[0, 2], [3, 1]][Math.floor(y / n)][Math.floor(x / n)]));
  }
  return m;
})();
/** Which of the 8×8 cells of a dither tile show the incoming scene at `progress`. The tile repeats across the frame. */
export function ditherTile(progress: number): boolean[][] {
  const t = Math.min(1, Math.max(0, progress));
  return BAYER.map(row => row.map(v => (v + .5) / 64 < t));
}

/** Checks a matte transition. `origin` is its subject's centre as fractions of the frame, if it names one. */
export function inspectMatte(spec: FilmMatteSpec, frames: number, rate: number, path: string, origin: { x: number; y: number } | undefined | "unknown"): { matte?: FilmMatte; problems: MatteProblem[] } {
  const problems: MatteProblem[] = [], say = (severity: MatteProblem["severity"], code: string, at: string, message: string, hint?: string) => problems.push({ severity, code, path: path + at, message, hint });
  const texture = spec.texture ?? "ink", seed = spec.seed ?? 1;
  if (!TEXTURES.includes(texture)) say("error", "matte-texture", "/texture", `"${texture}" is not a matte texture.`, `Textures: ${TEXTURES.join(", ")}.`);
  if (!(Number.isSafeInteger(seed) && seed >= 0)) say("error", "matte-seed", "/seed", "A seed is a whole number, 0 or more.");
  if (spec.color !== undefined && !COLOR.test(spec.color)) say("error", "matte-color", "/color", "A stain's colour is a #rrggbb colour.");
  if (origin === "unknown") say("error", "matte-subject", "/subject", `"${spec.subject}" is not a subject of the scene before.`);
  if (spec.subject && texture !== "ink") say("warning", "matte-subject-unused", "/subject", `A ${texture} matte does not start from a point; only ink does.`);
  if (problems.some(item => item.severity === "error")) return { problems };
  if (frames < rate * .5 || frames > rate * 1.6) say("warning", "matte-timing", "/durationFrames", `A ${(frames / rate).toFixed(2)} s matte ${frames < rate * .5 ? "is gone before its texture can be seen" : "drags: the viewer watches the stain, not the scenes"}.`, "Run it over 0.6 to 1.2 s.");
  return { matte: { texture, seed, origins: texture === "ink" ? (origin && origin !== "unknown" ? [origin] : inkOrigins(seed)) : [], edge: spec.color }, problems };
}
export function inspectDither(spec: FilmDitherSpec, frames: number, rate: number, path: string): { dither?: FilmDither; problems: MatteProblem[] } {
  const problems: MatteProblem[] = [], cell = spec.cell ?? .008;
  if (!(cell >= .003 && cell <= .03)) problems.push({ severity: "error", code: "dither-cell", path: path + "/cell", message: "A dither cell is 0.003 to 0.03 of the frame's short side.", hint: "Smaller cells read as noise; larger ones as a grid of squares." });
  if (frames < rate * .25 || frames > rate * 1) problems.push({ severity: "warning", code: "dither-timing", path: path + "/durationFrames", message: `A ${(frames / rate).toFixed(2)} s dither is ${frames < rate * .25 ? "a flicker" : "slow enough to read as a loading screen"}.`, hint: "Run it over 8 to 30 frames." });
  return problems.some(item => item.severity === "error") ? { problems } : { dither: { cell }, problems };
}
