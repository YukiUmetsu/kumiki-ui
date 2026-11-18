/**
 * Material transitions (registry item `material-transitions`): the next scene arrives the way a real material moves.
 *
 * - **bleed**: ink soaking into paper. The front runs along the fibres faster than across them and feathers down fast
 *   channels; it advances as √t (Lucas–Washburn capillary penetration), quickly at first, then slowing. Pigment piles up
 *   at the wet edge (the coffee-ring effect, Deegan et al. 1997) and the fresh ink darkens the paper until it dries.
 * - **burn**: paper burning away. A smouldering front moves at a steady speed through uneven paper, so its edge is ragged
 *   and fingered (Zik, Olami & Moses 1998). Ahead of it the paper scorches brown; at it the embers glow at blackbody
 *   colours; behind it a band of char crumbles away to the next scene.
 * - **paint**: paint poured from the top runs down the frame. A viscous film on a slope breaks into fingers of a fixed
 *   spacing whose tips run ahead faster and faster (Huppert 1982); a capillary ridge at the front catches the light.
 * - **frost**: breath on glass. Condensation spreads from where the breath lands, its droplets growing as t^(1/3) (breath
 *   figures, Beysens & Knobler 1986), until the old scene is lost behind frosted glass; the scenes change behind it and
 *   the frost clears to the next one.
 *
 * Every field is solved once per transition; each frame is a pure function of the transition's progress, so the same
 * seed and size give the same frames, and any frame renders on its own. A `shape` (circle, diamond, square, star) makes
 * the front keep that shape while the material roughens it, so a shape wipe can burn or bleed open.
 */

export type MaterialKind = "bleed" | "burn" | "paint" | "frost";
export type MaterialShape = "circle" | "diamond" | "square" | "star";

export interface MaterialSpec {
  material: MaterialKind;
  /** A different seed gives a different sheet of the same material. @default 1 */
  seed?: number;
  /** Where the front starts, as fractions of the frame (bleed, burn, frost). @default seeded points */
  origins?: readonly { x: number; y: number }[];
  /** bleed: the ink. burn: the char. paint: the gloss. frost: the frost's tint. */
  color?: string;
  /** bleed and burn: the paper's grain (fibre direction), degrees from the frame's x axis. @default 90 */
  grain?: number;
  /** The front keeps this shape around the first origin while the material roughens it. */
  shape?: MaterialShape;
}

/** Everything a material needs on every frame, solved once. Fields are `cols × rows`, row-major. */
export interface MaterialPlan {
  material: MaterialKind;
  cols: number;
  rows: number;
  aspect: number;
  /** When the front reaches each cell, 0 (first) to 1 (last). */
  arrival: Float32Array;
  /** A texture in 0..1 the material uses for grain (fibres, char, droplets). */
  grainField: Float32Array;
  /** bleed: thin fibre streaks along the grain (0..1) that pull the wet edge into hairs (feathering). */
  featherField?: Float32Array;
  /** paint: the finger profile per column (−1..1, tips positive). */
  fingers?: Float32Array;
  /** frost: droplets as [x, y, size, phase] in cell units. */
  droplets?: Float32Array;
  color: string;
  seed: number;
}

/** One overlay over the frame: a colour shown through `alpha`, blended onto what is below. */
export interface MaterialLayer {
  id: string;
  color: string;
  alpha: Uint8ClampedArray;
  blend: "normal" | "multiply" | "screen";
  /** Blur what is behind the layer by this many pixels per 1000 px of frame height (frosted glass). */
  backdropBlur?: number;
}

export interface MaterialFrame {
  /** The incoming scene's opacity, 0..255 per cell. */
  reveal: Uint8ClampedArray;
  layers: MaterialLayer[];
}

export const MATERIAL_KINDS: readonly MaterialKind[] = ["bleed", "burn", "paint", "frost"];
export const MATERIAL_SHAPES: readonly MaterialShape[] = ["circle", "diamond", "square", "star"];
/** Default length of each material, frames at 30 fps: capillary and burning fronts read slower than a matte. */
export const MATERIAL_FRAMES: Readonly<Record<MaterialKind, number>> = { bleed: 40, burn: 44, paint: 36, frost: 48 };
const DEFAULT_COLOR: Record<MaterialKind, string> = { bleed: "#162033", burn: "#15110f", paint: "#ffffff", frost: "#e8eef2" };

/* ------------------------------------------------------------------ *
 * Noise
 * ------------------------------------------------------------------ */

function hash(x: number, y: number, seed: number): number {
  let h = (x * 374761393 + y * 668265263 + seed * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

function noise(x: number, y: number, seed: number): number {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi, seed), b = hash(xi + 1, yi, seed), c = hash(xi, yi + 1, seed), d = hash(xi + 1, yi + 1, seed);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

function fbm(x: number, y: number, seed: number, octaves = 5): number {
  let sum = 0, amp = 0.5, total = 0;
  for (let o = 0; o < octaves; o++) {
    sum += amp * noise(x, y, seed + o * 17);
    total += amp;
    x *= 2.03;
    y *= 2.03;
    amp *= 0.5;
  }
  return sum / total;
}

/* ------------------------------------------------------------------ *
 * Fronts: the eikonal arrival distance through a speed field
 * ------------------------------------------------------------------ */

/** A binary min-heap of cell indices keyed by distance. */
class Heap {
  private items: number[] = [];
  constructor(private readonly key: Float32Array) {}
  get size() { return this.items.length; }
  push(i: number) {
    const a = this.items;
    a.push(i);
    let c = a.length - 1;
    while (c > 0) {
      const p = (c - 1) >> 1;
      if (this.key[a[p]] <= this.key[a[c]]) break;
      [a[p], a[c]] = [a[c], a[p]];
      c = p;
    }
  }
  pop(): number {
    const a = this.items, top = a[0], last = a.pop()!;
    if (a.length) {
      a[0] = last;
      let p = 0;
      for (;;) {
        const l = 2 * p + 1, r = l + 1;
        let m = p;
        if (l < a.length && this.key[a[l]] < this.key[a[m]]) m = l;
        if (r < a.length && this.key[a[r]] < this.key[a[m]]) m = r;
        if (m === p) break;
        [a[p], a[m]] = [a[m], a[p]];
        p = m;
      }
    }
    return top;
  }
}

/** 16 directions: the 8 neighbours and the knight moves, so fronts stay round instead of octagonal. */
const STENCIL: readonly [number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1], [2, 1], [2, -1], [-2, 1], [-2, -1], [1, 2], [1, -2], [-1, 2], [-1, -2]];

/**
 * Shortest travel time from the sources through `speed` (Dijkstra on a 16-direction stencil). `along` > 1 makes the
 * front faster along the direction `angle` (paper grain) than across it.
 */
export function eikonal(speed: Float32Array, cols: number, rows: number, h: number, sources: readonly [number, number][], along = 1, angle = 0): Float32Array {
  const dist = new Float32Array(cols * rows).fill(Infinity);
  const done = new Uint8Array(cols * rows);
  const heap = new Heap(dist);
  const ca = Math.cos(angle), sa = Math.sin(angle);
  const steps = STENCIL.map(([dx, dy]) => {
    const len = Math.hypot(dx, dy);
    // Directional speed of an ellipse: `along` on the grain axis, 1 across it.
    const c = (dx * ca + dy * sa) / len, s = (-dx * sa + dy * ca) / len;
    const k = 1 / Math.sqrt((c * c) / (along * along) + s * s);
    return { dx, dy, cost: (len * h) / k };
  });
  for (const [x, y] of sources) {
    const i = Math.min(cols - 1, Math.max(0, Math.round(x))) + Math.min(rows - 1, Math.max(0, Math.round(y))) * cols;
    dist[i] = 0;
    heap.push(i);
  }
  while (heap.size) {
    const i = heap.pop();
    if (done[i]) continue;
    done[i] = 1;
    const x = i % cols, y = (i - x) / cols, si = speed[i];
    for (const { dx, dy, cost } of steps) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
      const j = nx + ny * cols;
      if (done[j]) continue;
      // Harmonic mean of the two speeds: a slow cell slows any step through it.
      const d = dist[i] + cost * 0.5 * (1 / si + 1 / speed[j]);
      if (d < dist[j]) {
        dist[j] = d;
        heap.push(j);
      }
    }
  }
  return dist;
}

/** How far out a point is for a shape grown from the origin: the shape's size when its edge passes the point. */
function gauge(shape: MaterialShape, dx: number, dy: number): number {
  if (shape === "circle") return Math.hypot(dx, dy);
  if (shape === "diamond") return Math.abs(dx) + Math.abs(dy);
  if (shape === "square") return Math.max(Math.abs(dx), Math.abs(dy));
  // A five-pointed star pointing up, tips at radius 1 and dents at 0.5: the gauge is the radius over the edge's radius
  // in that direction, found where the ray meets the straight edge from a tip to its neighbouring dent.
  const r = Math.hypot(dx, dy);
  if (r < 1e-9) return 0;
  const sector = (2 * Math.PI) / 5;
  let phi = (((Math.atan2(dy, dx) + Math.PI / 2) % sector) + sector) % sector;
  if (phi > sector / 2) phi = sector - phi;
  const p2x = 0.5 * Math.cos(sector / 2) - 1, p2y = 0.5 * Math.sin(sector / 2);
  const dirX = Math.cos(phi), dirY = Math.sin(phi);
  // t·dir = (1, 0) + u·(p2 − p1): t = cross(p1, e) / cross(dir, e).
  const edgeRadius = (1 * p2y - 0 * p2x) / (dirX * p2y - dirY * p2x);
  return r / edgeRadius;
}

function normalise(field: Float32Array): Float32Array {
  let lo = Infinity, hi = -Infinity;
  for (const v of field) if (Number.isFinite(v)) { lo = Math.min(lo, v); hi = Math.max(hi, v); }
  const out = new Float32Array(field.length);
  const span = hi - lo || 1;
  for (let k = 0; k < field.length; k++) out[k] = Number.isFinite(field[k]) ? (field[k] - lo) / span : 1;
  return out;
}

/** Seeded start points away from the edges. */
export function materialOrigins(seed: number, count = 2): { x: number; y: number }[] {
  return Array.from({ length: count }, (_, i) => ({ x: 0.22 + 0.56 * hash(i, 7, seed), y: 0.25 + 0.5 * hash(i, 11, seed) }));
}

/* ------------------------------------------------------------------ *
 * Plans
 * ------------------------------------------------------------------ */

/**
 * Arrival of a front from origins through a material's speed field. With a shape, the shape's own growth is kept and
 * only the delay the material adds (its heterogeneous travel time minus a uniform one) roughens it.
 */
function frontArrival(speed: Float32Array, cols: number, rows: number, aspect: number, origins: readonly { x: number; y: number }[], along: number, angle: number, shape?: MaterialShape, roughness = 0.35): Float32Array {
  const h = aspect / cols;
  const sources = origins.map((o) => [o.x * cols - 0.5, o.y * rows - 0.5] as [number, number]);
  const heterogeneous = eikonal(speed, cols, rows, h, sources, along, angle);
  if (!shape) return normalise(heterogeneous);
  let mean = 0;
  for (const v of speed) mean += v;
  mean /= speed.length;
  const uniform = eikonal(new Float32Array(speed.length).fill(mean), cols, rows, h, sources, along, angle);
  const base = new Float32Array(cols * rows);
  const o = origins[0];
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) base[i + j * cols] = gauge(shape, ((i + 0.5) / cols - o.x) * aspect, (j + 0.5) / rows - o.y);
  }
  const nb = normalise(base), nh = normalise(heterogeneous), nu = normalise(uniform);
  const out = new Float32Array(cols * rows);
  for (let k = 0; k < out.length; k++) out[k] = nb[k] + roughness * (nh[k] - nu[k]);
  return normalise(out);
}

/** Plan a material transition for a `cols × rows` grid on a frame of `aspect` (width / height). */
export function planMaterial(spec: MaterialSpec, cols: number, rows: number, aspect: number): MaterialPlan {
  const seed = spec.seed ?? 1;
  const color = spec.color ?? DEFAULT_COLOR[spec.material];
  const n = cols * rows;
  const grainField = new Float32Array(n);
  const angle = ((spec.grain ?? 90) * Math.PI) / 180;
  const ca = Math.cos(angle), sa = Math.sin(angle);
  const origins = spec.origins && spec.origins.length ? spec.origins : materialOrigins(seed, spec.material === "frost" ? 1 : 2);
  const at = (i: number, j: number) => [((i + 0.5) / cols) * aspect, (j + 0.5) / rows] as const;
  if (spec.material === "bleed") {
    // Paper: fibres run along the grain. Coordinates along (u) and across (v) the grain; fibres are long in u, fine in v.
    const speed = new Float32Array(n);
    const featherField = new Float32Array(n);
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        const [x, y] = at(i, j);
        const u = x * ca + y * sa, v = -x * sa + y * ca;
        // Single fibres: long along the grain, a few pixels across; only the open ones carry ink ahead.
        // About three cells per fibre across the grain at 384 columns: finer would alias into pixel noise.
        featherField[i + j * cols] = Math.max(0, fbm(u * 4.5, v * 72, seed + 15, 2) - 0.52) / 0.48;
        const fibre = fbm(u * 3, v * 22, seed + 3, 4);
        const channel = Math.max(0, fbm(u * 1.6, v * 70, seed + 9, 3) - 0.62) / 0.38;
        const clump = fbm(x * 5, y * 5, seed + 21, 4);
        grainField[i + j * cols] = 0.6 * fibre + 0.4 * clump;
        // Open fibre channels wick fast (feathering); dense clumps slowly.
        speed[i + j * cols] = 0.32 + 1.1 * fibre * fibre + 2.4 * channel * channel + 0.35 * (clump - 0.5);
      }
    }
    const arrival = frontArrival(speed, cols, rows, aspect, origins, 1.35, angle, spec.shape, 0.45);
    return { material: "bleed", cols, rows, aspect, arrival, grainField, featherField, color, seed };
  }
  if (spec.material === "burn") {
    // Paper burns unevenly: thicker or damper patches hold the front back; thin fibres let it run ahead in fingers.
    const speed = new Float32Array(n);
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        const [x, y] = at(i, j);
        const u = x * ca + y * sa, v = -x * sa + y * ca;
        const patch = fbm(x * 2.4, y * 2.4, seed + 5, 5);
        const streak = fbm(u * 2, v * 9, seed + 11, 4);
        grainField[i + j * cols] = fbm(x * 18, y * 18, seed + 33, 3);
        // Steep contrast: the front stalls in dense patches and runs out in fingers through thin ones.
        speed[i + j * cols] = 0.12 + 2.6 * patch * patch * patch + 0.9 * streak * streak;
      }
    }
    const arrival = frontArrival(speed, cols, rows, aspect, origins, 1.15, angle, spec.shape, 0.55);
    return { material: "burn", cols, rows, aspect, arrival, grainField, color, seed };
  }
  if (spec.material === "paint") {
    // A film running down a slope breaks into fingers of one spacing (about 8–12 per frame width here).
    const count = 8 + Math.floor(hash(1, 2, seed) * 5);
    const fingers = new Float32Array(cols);
    const centres = Array.from({ length: count }, (_, k) => (k + 0.3 + 0.4 * hash(k, 3, seed)) / count);
    const heights = centres.map((_, k) => 0.35 + 0.65 * hash(k, 5, seed));
    const widths = centres.map((_, k) => (0.18 + 0.12 * hash(k, 9, seed)) / count);
    for (let i = 0; i < cols; i++) {
      const x = (i + 0.5) / cols;
      let f = -0.35;
      centres.forEach((c, k) => {
        const d = (x - c) / widths[k];
        // Flat-topped: a drip keeps its width down its length and ends in a rounded head.
        f = Math.max(f, heights[k] * Math.exp(-(d * d) * (d * d)) * 1.35 - 0.35);
      });
      fingers[i] = Math.min(1, f + 0.08 * (fbm(x * 30, 0, seed + 4, 3) - 0.5));
    }
    // The front: y_f(x, t) = v·t + a·t²·φ(x). Arrival t where y_f = y; the slowest column reaches the bottom at t = 1.
    const amp = 0.32;
    let lowest = Infinity;
    for (const f of fingers) lowest = Math.min(lowest, f);
    const v = 1 - amp * lowest;
    const arrival = new Float32Array(n);
    for (let j = 0; j < rows; j++) {
      const y = (j + 0.5) / rows;
      for (let i = 0; i < cols; i++) {
        const a = amp * fingers[i];
        const wobble = 0.006 * (fbm(i * 0.4, j * 0.08, seed + 7, 3) - 0.5);
        // Solve a·t² + v·t − y = 0 for t ≥ 0.
        const t = Math.abs(a) < 1e-6 ? y / v : (-v + Math.sqrt(Math.max(0, v * v + 4 * a * y))) / (2 * a);
        arrival[i + j * cols] = Math.min(1, Math.max(0, t + wobble));
        grainField[i + j * cols] = fbm(i * 0.35, j * 0.05, seed + 13, 3);
      }
    }
    return { material: "paint", cols, rows, aspect, arrival, grainField, fingers, color, seed };
  }
  // frost: breath spreads quickly from where it lands, with uneven edges.
  const speed = new Float32Array(n);
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const [x, y] = at(i, j);
      speed[i + j * cols] = 0.6 + 0.8 * fbm(x * 3.2, y * 3.2, seed + 2, 4);
      grainField[i + j * cols] = fbm(x * 9, y * 9, seed + 8, 4);
    }
  }
  const arrival = frontArrival(speed, cols, rows, aspect, origins, 1, 0, spec.shape, 0.4);
  // Breath-figure droplets: a jittered lattice, sizes spread like a coalesced population.
  const pitch = 2.2;
  const list: number[] = [];
  for (let gy = 0; gy < rows / pitch; gy++) {
    for (let gx = 0; gx < cols / pitch; gx++) {
      const x = (gx + hash(gx, gy, seed + 40)) * pitch, y = (gy + hash(gx, gy, seed + 41)) * pitch;
      const r = hash(gx, gy, seed + 42);
      list.push(x, y, 0.35 + 1.25 * r * r, hash(gx, gy, seed + 43));
    }
  }
  return { material: "frost", cols, rows, aspect, arrival, grainField, droplets: Float32Array.from(list), color, seed };
}

/* ------------------------------------------------------------------ *
 * Frames
 * ------------------------------------------------------------------ */

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const smooth = (e0: number, e1: number, v: number) => {
  const t = clamp01((v - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
};
const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
const byte = (v: number) => Math.round(255 * clamp01(v));

/** Blackbody colours of glowing paper embers, sampled from FX1 `blackbodyRGB` (CIE 1931) and sRGB-encoded. */
const EMBER = { hot: "#ffb15a", warm: "#ff7a2a", dull: "#b32a10" } as const;
const SCORCH = "#7a5326";

/** The frame of a material transition at `progress` (0 = only the old scene, 1 = only the new). */
export function materialFrame(plan: MaterialPlan, progress: number): MaterialFrame {
  const p = clamp01(progress);
  const n = plan.cols * plan.rows;
  const reveal = new Uint8ClampedArray(n);
  const { arrival, grainField } = plan;
  if (plan.material === "bleed") {
    // The ink races out first (Lucas–Washburn: wetted distance ∝ √t) and the next scene develops inside it as the ink sinks
    // into the paper, a short way behind the wet front; the gap closes as the spreading slows, so the last cell is covered.
    const edge = 0.004;
    const lag = 0.13 * (1 - smooth(0.55, 1, p));
    const inkLevel = Math.sqrt(p) * (1 + 2 * edge) - edge + lag * (1 - Math.sqrt(p)) * 0.2;
    const revealLevel = inkLevel - lag;
    const ink = new Uint8ClampedArray(n), wet = new Uint8ClampedArray(n);
    const feather = plan.featherField;
    for (let k = 0; k < n; k++) {
      const g = grainField[k];
      // Open fibres wick ahead of the wet edge: the edge grows hairs along the grain.
      const d = arrival[k] - (feather ? 0.045 * feather[k] : 0);
      reveal[k] = byte(smooth(revealLevel + 0.02, revealLevel - 0.02, d));
      const wetted = smooth(inkLevel + edge, inkLevel - edge, d);
      if (wetted > 0) {
        // Pigment: granular, and densest at the wet edge where the flow carries it (coffee ring, Deegan 1997).
        const toEdge = inkLevel - d;
        const density = 0.74 + 0.2 * g + 0.4 * Math.exp(-Math.max(0, toEdge) / 0.008);
        const sinking = 1 - smooth(revealLevel - 0.025, revealLevel + 0.03, d);
        ink[k] = byte(wetted * Math.min(1, density) * (1 - sinking) * (1 - smooth(0.92, 1, p)));
        // Behind the ink, the paper stays damp and darker for a while.
        wet[k] = byte(0.35 * sinking * Math.exp(-Math.max(0, revealLevel - d) / 0.06) * (1 - smooth(0.8, 1, p)));
      }
    }
    return { reveal, layers: [{ id: "wet", color: plan.color, alpha: wet, blend: "multiply" }, { id: "ink", color: plan.color, alpha: ink, blend: "normal" }] };
  }
  if (plan.material === "burn") {
    // A steady smouldering front: scorch ahead, embers at the front, a band of char, then the next scene.
    const scorch = 0.07, ember = 0.016, char = 0.035;
    const t = easeInOut(p);
    const front = -scorch * 0.3 + t * (1 + ember + char + scorch * 0.3 + 0.02);
    const brown = new Uint8ClampedArray(n), glow = new Uint8ClampedArray(n), deep = new Uint8ClampedArray(n), black = new Uint8ClampedArray(n), halo = new Uint8ClampedArray(n);
    const flicker = 0.85 + 0.15 * Math.sin(p * 47 + plan.seed);
    for (let k = 0; k < n; k++) {
      const d = arrival[k], g = grainField[k];
      const behind = front - d;
      // The char's inner edge is ragged: flakes break off unevenly.
      const charEnd = ember + char * (0.35 + 1.4 * g * g);
      reveal[k] = byte(smooth(charEnd, charEnd + 0.008, behind));
      if (behind > -0.03 && behind < ember * 1.6) halo[k] = byte(0.5 * flicker * (1 - Math.abs(behind - ember * 0.3) / (ember * 1.3 + 0.012)));
      if (behind < 0) brown[k] = byte(0.7 * smooth(-scorch, 0, behind));
      else if (behind < ember) {
        glow[k] = byte(flicker * (1 - behind / ember) * (0.7 + 0.5 * g));
        deep[k] = byte(0.95 * smooth(0, ember * 0.4, behind));
      } else if (behind < charEnd + 0.008) {
        black[k] = byte(1);
        deep[k] = byte(0.6 * Math.max(0, 1 - (behind - ember) / (char * 0.4)) * g);
      }
    }
    return {
      reveal,
      layers: [
        { id: "scorch", color: SCORCH, alpha: brown, blend: "multiply" },
        { id: "char", color: plan.color, alpha: black, blend: "normal" },
        // Glowing paper is opaque where it burns: the ember line is drawn in its own colour, with a screened halo, so it
        // stays orange over a bright scene instead of washing out.
        { id: "ember-deep", color: EMBER.dull, alpha: deep, blend: "normal" },
        { id: "ember", color: EMBER.warm, alpha: glow, blend: "normal" },
        { id: "ember-halo", color: EMBER.hot, alpha: halo, blend: "screen" },
      ],
    };
  }
  if (plan.material === "paint") {
    // The painted area is wherever the front has passed; a capillary ridge at the front is thicker and catches the light.
    const t = easeInOut(p) * 1.02;
    const gloss = new Uint8ClampedArray(n), shade = new Uint8ClampedArray(n);
    const ridge = 0.035;
    for (let j = 0; j < plan.rows; j++) {
      for (let i = 0; i < plan.cols; i++) {
        const k = i + j * plan.cols, a = arrival[k];
        const behind = t - a;
        reveal[k] = byte(smooth(-0.004, 0.004, behind));
        if (behind > 0 && t < 1.01) {
          // Thickness h: a flat film behind a bulging ridge; its slope lights the top of the bulge and shades the lip.
          const tip = plan.fingers ? 0.6 + 0.6 * Math.max(0, plan.fingers[i]) : 1;
          const x = behind / (ridge * tip);
          const slope = x < 1 ? Math.cos(x * Math.PI) : 0;
          const fade = 1 - smooth(0.9, 1, p);
          gloss[k] = byte((Math.max(0, slope) ** 2 * 0.55 * (0.7 + 0.6 * grainField[k]) + 0.06 * (1 - x / 6)) * fade);
          shade[k] = byte((x < 0.35 ? 0.35 * (1 - x / 0.35) : 0) * fade);
        }
      }
    }
    return { reveal, layers: [{ id: "lip", color: "#000000", alpha: shade, blend: "multiply" }, { id: "gloss", color: plan.color, alpha: gloss, blend: "screen" }] };
  }
  // frost: forms over the first half, the scenes cross behind it at the middle, then it clears.
  const forming = p < 0.5;
  const phase = forming ? p / 0.5 : (p - 0.5) / 0.5;
  const level = phase * 1.15 - 0.1;
  const veil = new Uint8ClampedArray(n), bright = new Uint8ClampedArray(n), dark = new Uint8ClampedArray(n);
  const cover = new Float32Array(n), age = new Float32Array(n);
  // The scenes cross over a few frames while the glass is fully frosted, so the change is never seen.
  const swap = byte(smooth(0.46, 0.54, p));
  for (let k = 0; k < n; k++) {
    const d = arrival[k];
    // Fog covers a cell once the breath reaches it; it clears in the same order it formed.
    const c = forming ? smooth(level + 0.02, level - 0.05, d) : smooth(level - 0.05, level + 0.02, d);
    cover[k] = c;
    age[k] = forming ? clamp01((level - d) / 0.35) : c;
    reveal[k] = swap;
    veil[k] = byte(c * (0.92 + 0.06 * grainField[k]));
  }
  // Droplets: each grows as (time since the fog arrived)^(1/3) and shrinks as it clears.
  const drops = plan.droplets!;
  for (let q = 0; q < drops.length; q += 4) {
    const x = drops[q], y = drops[q + 1], size = drops[q + 2], phase0 = drops[q + 3];
    const ci = Math.min(plan.cols - 1, Math.floor(x)), cj = Math.min(plan.rows - 1, Math.floor(y));
    const c = cover[ci + cj * plan.cols];
    if (c < 0.05) continue;
    const r = size * Math.cbrt(Math.max(age[ci + cj * plan.cols], 0.02)) * (0.8 + 0.4 * phase0);
    const i0 = Math.max(0, Math.floor(x - r - 1)), i1 = Math.min(plan.cols - 1, Math.ceil(x + r + 1));
    const j0 = Math.max(0, Math.floor(y - r - 1)), j1 = Math.min(plan.rows - 1, Math.ceil(y + r + 1));
    for (let j = j0; j <= j1; j++) {
      for (let i = i0; i <= i1; i++) {
        const dx = i + 0.5 - x, dy = j + 0.5 - y, dd = Math.hypot(dx, dy) / Math.max(r, 0.3);
        if (dd > 1.2) continue;
        const k = i + j * plan.cols;
        // A droplet is a tiny lens: a bright catch-light toward the top, a darker rim below.
        const highlight = Math.max(0, 1 - Math.hypot(dx + r * 0.3, dy + r * 0.35) / (r * 0.45));
        bright[k] = Math.max(bright[k], byte(0.55 * highlight * c));
        dark[k] = Math.max(dark[k], byte(0.22 * smooth(0.65, 1, dd) * (dd < 1.15 ? 1 : 0) * c));
      }
    }
  }
  return {
    reveal,
    layers: [
      { id: "frost", color: plan.color, alpha: veil, blend: "normal", backdropBlur: 14 },
      { id: "droplet-rim", color: "#2a3640", alpha: dark, blend: "multiply" },
      { id: "droplet-light", color: "#ffffff", alpha: bright, blend: "screen" },
    ],
  };
}

/* ------------------------------------------------------------------ *
 * Checks
 * ------------------------------------------------------------------ */

export interface MaterialProblem {
  severity: "error" | "warning";
  code: string;
  path: string;
  message: string;
  hint?: string;
}

const COLOR = /^#[0-9a-f]{6}$/i;

/** Problems with a material spec at `path`, given its length in frames at `rate` fps. */
export function inspectMaterial(spec: Partial<MaterialSpec>, frames: number, rate: number, path: string): MaterialProblem[] {
  const problems: MaterialProblem[] = [];
  const say = (severity: MaterialProblem["severity"], code: string, at: string, message: string, hint?: string) => problems.push({ severity, code, path: path + at, message, hint });
  if (!spec.material || !MATERIAL_KINDS.includes(spec.material)) say("error", "material-kind", "/material", `"${spec.material}" is not a material.`, `Materials: ${MATERIAL_KINDS.join(", ")}.`);
  if (spec.seed !== undefined && !(Number.isSafeInteger(spec.seed) && spec.seed >= 0)) say("error", "material-seed", "/seed", "A seed is a whole number, 0 or more.");
  if (spec.color !== undefined && !COLOR.test(spec.color)) say("error", "material-color", "/color", "A material colour is a #rrggbb colour.");
  if (spec.grain !== undefined && !Number.isFinite(spec.grain)) say("error", "material-grain", "/grain", "The grain is an angle in degrees.");
  if (spec.shape !== undefined && !MATERIAL_SHAPES.includes(spec.shape)) say("error", "material-shape", "/shape", `"${spec.shape}" is not a shape a material front can keep.`, `Shapes: ${MATERIAL_SHAPES.join(", ")}.`);
  if (spec.material === "paint" && spec.shape) say("warning", "material-shape-unused", "/shape", "Paint runs down under gravity; it does not grow a shape.");
  if (spec.origins?.some((o) => !(o.x >= 0 && o.x <= 1 && o.y >= 0 && o.y <= 1))) say("error", "material-origin", "/origins", "Origins are fractions of the frame, 0 to 1.");
  if (problems.some((p) => p.severity === "error") || !spec.material) return problems;
  const seconds = frames / rate;
  const [lo, hi] = spec.material === "frost" ? [1, 2.4] : spec.material === "paint" ? [0.7, 1.8] : [0.8, 2.2];
  if (seconds < lo) say("warning", "material-timing", "/durationFrames", `A ${seconds.toFixed(2)} s ${spec.material} is too fast to read as ${spec.material === "frost" ? "breath on glass" : spec.material === "paint" ? "running paint" : spec.material === "burn" ? "burning paper" : "ink soaking into paper"}.`, `Run it over ${lo} to ${hi} s.`);
  if (seconds > hi) say("warning", "material-timing", "/durationFrames", `A ${seconds.toFixed(2)} s ${spec.material} drags: the viewer watches the material, not the scenes.`, `Run it over ${lo} to ${hi} s.`);
  return problems;
}
