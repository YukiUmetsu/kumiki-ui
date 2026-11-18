/**
 * Physical paper — bound books and magazines (registry item `paper-book`).
 *
 * A book is a stack of leaves bound at a spine. Turning a page moves one leaf from one stack to the other. Here every
 * moving leaf is a real sheet: a grid of particles held by stretch, shear and bending constraints whose stiffness
 * comes from the paper stock, pinned along the spine, pulled by gravity and slowed by air drag. A hand takes a corner
 * (so the corner leads and the page curls into a cone), or a thumb flicks the edge, and the leaf flies over and
 * settles on the other stack.
 *
 * **Contact.** Leaves never pass through each other or the stacks; they touch. Every leaf is hinged on the same
 * spine, so around the spine the leaves are ordered by angle: a leaf with a lower index is always at a larger angle
 * than the next one. Contact is that order, kept at every point (r, y) with a gap of the paper's thickness: a point
 * that crosses is turned back around the spine to the other leaf's surface, at the same radius and height.
 *
 * The solver uses small steps of extended position-based dynamics (XPBD): many substeps a frame, one constraint pass
 * each. It is deterministic, so the whole timeline is baked once and any frame can be read back exactly. Contact
 * events (lift, release, touch, landing, settling) come with their strength, for sound.
 *
 * Units: millimetres, kilograms, seconds. World: x across the spread (right pages at x > 0), y along the spine
 * (bottom edge 0, top edge `height`), z up from the table. The spine lies on the table along x = 0, z = 0.
 */

import { paperBendingStiffness, paperTransmittance, resolveStock } from "./paper-sheet-stock";
import type { PaperStock, PaperStockInput } from "./paper-sheet-stock";

export interface PaperBookTurn {
  /** Frame the turn starts. */
  frame: number;
  /** `grab`: a hand takes the page and carries it over. `flick`: a thumb pushes the edge and lets go. @default "grab" */
  kind?: "grab" | "flick";
  /** `forward` moves the top right leaf to the left. @default "forward" */
  direction?: "forward" | "back";
  /** Where the hand takes the page. @default "bottom" */
  grip?: "bottom" | "top" | "middle";
  /** Frames the hand takes to carry the page (grab). @default 24 */
  frames?: number;
  /** Fraction of the arc where the hand lets go (grab). @default 0.7 */
  release?: number;
  /** How far the hand draws the edge in toward the spine as it carries the page, 0–0.5. @default 0.22 */
  draw?: number;
  /**
   * Angular speed of a flick, degrees per second. Without air a page lying flat needs about 800°/s to pass the top;
   * in still air a magazine page needs about 3,000°/s (2,200°/s lifts it to about 80° and it falls back). @default 3000
   */
  speed?: number;
  /** Turn this many leaves one after another (a riffle). @default 1 */
  count?: number;
  /** Frames between the leaves of a riffle. @default 4 */
  interval?: number;
}

export interface PaperBookSpec {
  /** Leaves (sheets) in the book; each carries two pages. */
  leaves: number;
  /** Page width (spine to edge) and height, mm. */
  width: number;
  height: number;
  /** Stock of the leaves. @default "magazine" */
  stock?: PaperStockInput;
  /** Stock of the first and last leaf (the covers). @default the leaf stock */
  cover?: PaperStockInput;
  /** Leaves on the left (already turned) at frame 0. @default half */
  open?: number;
  turns: readonly PaperBookTurn[];
  /** @default 30 */
  fps?: number;
  durationFrames: number;
  /** Simulation resolution. @default "fine" */
  quality?: "draft" | "fine" | "ultra";
  /** Contact gap between leaves, mm. @default the caliper, at least 0.12 */
  gap?: number;
  /** Multiplier on bending stiffness. @default 1 */
  stiffness?: number;
  /** Multiplier on air drag. @default 1 */
  drag?: number;
}

export type PaperLeafPlace = "left" | "right" | "moving";

/** A leaf drawn from simulation on one frame. */
export interface PaperBookLeafFrame {
  index: number;
  place: PaperLeafPlace;
  /** Grid positions, x/y/z interleaved, `columns × rows`, column-major from the spine (u) then up the page (v). */
  positions: Float32Array;
}

export interface PaperBookFrame {
  frame: number;
  /** Leaves resting in the left and right stacks (drawn from the stack shape), counted from the table up. */
  leftCount: number;
  rightCount: number;
  /** Leaves that have their own simulated shape: moving, or settled on top of a stack. */
  leaves: PaperBookLeafFrame[];
}

export type PaperBookEventKind = "lift" | "release" | "touch" | "land" | "settle";

export interface PaperBookEvent {
  frame: number;
  kind: PaperBookEventKind;
  leaf: number;
  /** Strength, 0–1: lift and release by hand speed, touch and land by the closing speed of the contact. */
  strength: number;
  /** Closing speed (touch, land) or hand speed (lift, release), mm/s. */
  speed: number;
}

export interface PaperBookBake {
  spec: PaperBookSpec;
  stock: PaperStock;
  coverStock: PaperStock;
  columns: number;
  rows: number;
  /** Contact gap, mm. */
  gap: number;
  /** Length over which a resting leaf rises from the spine to its stack height, mm. */
  gutter: number;
  transmittance: number;
  frames: PaperBookFrame[];
  events: PaperBookEvent[];
  /** Mean and peak speed of each moving leaf per frame (for air sound), mm/s. */
  air: Float32Array;
  airPeak: number;
  /** Bake time, ms. */
  bakeMs: number;
}

export interface PaperBookIssue {
  path: string;
  message: string;
}

/**
 * Paper does not wrinkle at page scale: its detail is a smooth curl, which a renderer interpolates from a modest grid.
 * Finer grids need more solver work to stay inextensible, so substeps rise with resolution.
 */
const QUALITY = {
  draft: { columns: 10, rows: 13, substeps: 14 },
  fine: { columns: 13, rows: 17, substeps: 20 },
  ultra: { columns: 17, rows: 22, substeps: 28 },
} as const;

const GRAVITY = 9810; // mm/s²

/**
 * Angle of a point around the spine, from the right page (0) over the top (π/2) to the left page (π). It runs on
 * past both ends (below the table on the left reads just over π, not −π), so a leaf never jumps sides.
 */
export function paperSpineAngle(x: number, z: number): number {
  const a = Math.atan2(z, x);
  return a < -Math.PI / 2 ? a + 2 * Math.PI : a;
}
const AIR = 1.2e-9; // kg/mm³
const DRAG_COEFFICIENT = 1.2; // flat plate

/* ------------------------------------------------------------------ *
 * Validation
 * ------------------------------------------------------------------ */

const finite = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

export function inspectPaperBook(spec: PaperBookSpec): PaperBookIssue[] {
  const issues: PaperBookIssue[] = [];
  const bad = (path: string, message: string) => issues.push({ path, message });
  if (!spec || typeof spec !== "object") return [{ path: "book", message: "book object required" }];
  if (!Number.isInteger(spec.leaves) || spec.leaves < 2 || spec.leaves > 400) bad("leaves", "leaves must be an integer 2–400");
  if (!finite(spec.width) || spec.width < 20 || spec.width > 2000) bad("width", "width must be 20–2000 mm");
  if (!finite(spec.height) || spec.height < 20 || spec.height > 2000) bad("height", "height must be 20–2000 mm");
  if (spec.open !== undefined && (!Number.isInteger(spec.open) || spec.open < 0 || spec.open > spec.leaves)) bad("open", "open must be 0–leaves");
  if (spec.fps !== undefined && (!Number.isInteger(spec.fps) || spec.fps < 1 || spec.fps > 120)) bad("fps", "fps must be 1–120");
  if (!Number.isInteger(spec.durationFrames) || spec.durationFrames < 1 || spec.durationFrames > 3600) bad("durationFrames", "durationFrames must be 1–3600");
  if (spec.quality !== undefined && !(spec.quality in QUALITY)) bad("quality", 'quality must be "draft", "fine" or "ultra"');
  if (spec.gap !== undefined && (!finite(spec.gap) || spec.gap < 0.02 || spec.gap > 5)) bad("gap", "gap must be 0.02–5 mm");
  if (spec.stiffness !== undefined && (!finite(spec.stiffness) || spec.stiffness <= 0 || spec.stiffness > 100)) bad("stiffness", "stiffness must be positive, up to 100");
  if (spec.drag !== undefined && (!finite(spec.drag) || spec.drag < 0 || spec.drag > 20)) bad("drag", "drag must be 0–20");
  if (!Array.isArray(spec.turns) || spec.turns.length > 200) bad("turns", "turns must be an array of up to 200");
  (Array.isArray(spec.turns) ? spec.turns : []).forEach((turn, i) => {
    const at = `turns[${i}]`;
    if (!turn || typeof turn !== "object") return bad(at, "turn object required");
    if (!Number.isInteger(turn.frame) || turn.frame < 0) bad(at + ".frame", "frame must be a nonnegative integer");
    if (turn.kind !== undefined && turn.kind !== "grab" && turn.kind !== "flick") bad(at + ".kind", 'kind must be "grab" or "flick"');
    if (turn.direction !== undefined && turn.direction !== "forward" && turn.direction !== "back") bad(at + ".direction", 'direction must be "forward" or "back"');
    if (turn.grip !== undefined && !["bottom", "top", "middle"].includes(turn.grip)) bad(at + ".grip", 'grip must be "bottom", "top" or "middle"');
    if (turn.frames !== undefined && (!Number.isInteger(turn.frames) || turn.frames < 4 || turn.frames > 600)) bad(at + ".frames", "frames must be 4–600");
    if (turn.release !== undefined && (!finite(turn.release) || turn.release < 0.2 || turn.release > 1)) bad(at + ".release", "release must be 0.2–1");
    if (turn.draw !== undefined && (!finite(turn.draw) || turn.draw < 0 || turn.draw > 0.5)) bad(at + ".draw", "draw must be 0–0.5");
    if (turn.speed !== undefined && (!finite(turn.speed) || turn.speed < 30 || turn.speed > 3000)) bad(at + ".speed", "speed must be 30–3000 °/s");
    if (turn.count !== undefined && (!Number.isInteger(turn.count) || turn.count < 1 || turn.count > 100)) bad(at + ".count", "count must be 1–100");
    if (turn.interval !== undefined && (!Number.isInteger(turn.interval) || turn.interval < 1 || turn.interval > 600)) bad(at + ".interval", "interval must be 1–600");
  });
  return issues;
}

/* ------------------------------------------------------------------ *
 * Resting leaves: the shape of a stack
 * ------------------------------------------------------------------ */

/**
 * A resting leaf rises from the spine at angle α₀ and levels out over the gutter length G: its tangent angle is
 * α(s) = α₀ (1 − s/G)² for arc length s < G, then 0. Lengths along the leaf are kept exactly.
 */
interface RestProfile {
  /** Arc-length samples: x and z at s = k·step. */
  x: Float64Array;
  z: Float64Array;
  step: number;
}

function restProfile(height: number, gutter: number, width: number): RestProfile {
  const step = Math.max(gutter / 64, 0.25);
  const n = Math.ceil(width / step) + 2;
  // Solve α₀ so the leaf reaches `height` at the end of the gutter.
  const reach = (a0: number) => {
    let z = 0;
    const m = 128;
    for (let k = 0; k < m; k += 1) {
      const s = ((k + 0.5) / m) * gutter;
      z += Math.sin(a0 * (1 - s / gutter) ** 2) * (gutter / m);
    }
    return z;
  };
  let lo = 0;
  let hi = 1.5;
  const target = Math.min(height, reach(1.5) * 0.999);
  for (let it = 0; it < 40; it += 1) {
    const mid = (lo + hi) / 2;
    if (reach(mid) < target) lo = mid;
    else hi = mid;
  }
  const a0 = (lo + hi) / 2;
  const x = new Float64Array(n);
  const z = new Float64Array(n);
  for (let k = 1; k < n; k += 1) {
    const s = (k - 0.5) * step;
    const a = s < gutter ? a0 * (1 - s / gutter) ** 2 : 0;
    x[k] = x[k - 1] + Math.cos(a) * step;
    z[k] = z[k - 1] + Math.sin(a) * step;
  }
  return { x, z, step };
}

function profileAtArc(p: RestProfile, s: number): [number, number] {
  const f = Math.max(0, s / p.step);
  const k = Math.min(p.x.length - 2, Math.floor(f));
  const t = Math.min(1, f - k);
  return [p.x[k] + (p.x[k + 1] - p.x[k]) * t, p.z[k] + (p.z[k + 1] - p.z[k]) * t];
}

/** Height above the table of the leaf at `depth` from the top of a stack of `count` leaves (its flat part). */
const stackHeight = (count: number, depth: number, gap: number) => (count - 1 - depth) * gap + gap / 2;

/** The gutter length of a book: thicker books curve over a longer distance. */
export function paperBookGutter(spec: Pick<PaperBookSpec, "leaves">, gap: number): number {
  return Math.min(40, Math.max(10, 9 + spec.leaves * gap * 2.2));
}

/** Grid positions of a resting leaf: `side` +1 right stack, −1 left; `height` of its flat part above the table. */
export function paperBookRestingLeaf(columns: number, rows: number, width: number, pageHeight: number, side: 1 | -1, height: number, gutter: number, out?: Float32Array): Float32Array {
  const positions = out ?? new Float32Array(columns * rows * 3);
  const profile = restProfile(height, gutter, width);
  for (let i = 0; i < columns; i += 1) {
    const [x, z] = profileAtArc(profile, (i / (columns - 1)) * width);
    for (let j = 0; j < rows; j += 1) {
      const k = (i * rows + j) * 3;
      positions[k] = side * x;
      positions[k + 1] = (j / (rows - 1)) * pageHeight;
      positions[k + 2] = z;
    }
  }
  return positions;
}

/* ------------------------------------------------------------------ *
 * Polar contact fields
 * ------------------------------------------------------------------ */

/**
 * The surface of one leaf around the spine: for a point (r, y), the leaf's angle there. Built from the leaf's
 * triangles in (r, y); a cell lists the triangles over it, and a lookup interpolates inside the containing triangle.
 */
class PolarField {
  readonly cells: Int32Array;
  readonly counts: Uint8Array;
  readonly r: Float64Array;
  readonly y: Float64Array;
  readonly theta: Float64Array;
  /** Smallest and largest angle of the leaf, for a quick reject. */
  low = 0;
  high = 0;
  constructor(
    readonly columns: number,
    readonly rows: number,
    readonly nr: number,
    readonly ny: number,
    readonly rMax: number,
    readonly yMin: number,
    readonly yMax: number,
    readonly capacity = 8,
  ) {
    this.cells = new Int32Array(nr * ny * capacity);
    this.counts = new Uint8Array(nr * ny);
    const n = columns * rows;
    this.r = new Float64Array(n);
    this.y = new Float64Array(n);
    this.theta = new Float64Array(n);
  }

  build(positions: ArrayLike<number>): void {
    const { columns, rows, nr, ny, rMax, yMin, yMax, capacity } = this;
    this.counts.fill(0);
    const n = columns * rows;
    for (let p = 0; p < n; p += 1) {
      const x = positions[3 * p];
      const z = positions[3 * p + 2];
      this.r[p] = Math.hypot(x, z);
      this.y[p] = positions[3 * p + 1];
      this.theta[p] = paperSpineAngle(x, z);
    }
    this.low = Infinity;
    this.high = -Infinity;
    for (let p = rows; p < n; p += 1) {
      this.low = Math.min(this.low, this.theta[p]);
      this.high = Math.max(this.high, this.theta[p]);
    }
    const sr = nr / rMax;
    const sy = ny / (yMax - yMin);
    for (let i = 0; i + 1 < columns; i += 1) {
      for (let j = 0; j + 1 < rows; j += 1) {
        const a = i * rows + j;
        const b = (i + 1) * rows + j;
        const c = a + 1;
        const d = b + 1;
        for (let t = 0; t < 2; t += 1) {
          const p0 = a;
          const p1 = t === 0 ? b : d;
          const p2 = t === 0 ? d : c;
          const tri = ((i * (rows - 1) + j) << 1) | t;
          const r0 = Math.min(this.r[p0], this.r[p1], this.r[p2]);
          const r1 = Math.max(this.r[p0], this.r[p1], this.r[p2]);
          const y0 = Math.min(this.y[p0], this.y[p1], this.y[p2]);
          const y1 = Math.max(this.y[p0], this.y[p1], this.y[p2]);
          const ci0 = Math.max(0, Math.floor(r0 * sr));
          const ci1 = Math.min(nr - 1, Math.floor(r1 * sr));
          const cj0 = Math.max(0, Math.floor((y0 - yMin) * sy));
          const cj1 = Math.min(ny - 1, Math.floor((y1 - yMin) * sy));
          for (let ci = ci0; ci <= ci1; ci += 1) {
            for (let cj = cj0; cj <= cj1; cj += 1) {
              const cell = ci * ny + cj;
              const count = this.counts[cell];
              if (count < capacity) {
                this.cells[cell * capacity + count] = tri;
                this.counts[cell] = count + 1;
              }
            }
          }
        }
      }
    }
  }

  /** The leaf's angles at (r, y): smallest and largest over the triangles there (NaN when the leaf is not there). */
  angles(r: number, y: number, out: Float64Array): boolean {
    const { nr, ny, rMax, yMin, yMax, capacity, rows } = this;
    const ci = Math.floor((r / rMax) * nr);
    const cj = Math.floor(((y - yMin) / (yMax - yMin)) * ny);
    if (ci < 0 || ci >= nr || cj < 0 || cj >= ny) return false;
    const cell = ci * ny + cj;
    const count = this.counts[cell];
    let lo = Infinity;
    let hi = -Infinity;
    for (let k = 0; k < count; k += 1) {
      const tri = this.cells[cell * capacity + k];
      const t = tri & 1;
      const q = tri >> 1;
      const i = Math.floor(q / (rows - 1));
      const j = q - i * (rows - 1);
      const a = i * rows + j;
      const b = (i + 1) * rows + j;
      const p0 = a;
      const p1 = t === 0 ? b : b + 1;
      const p2 = t === 0 ? b + 1 : a + 1;
      const x0 = this.r[p0];
      const y0 = this.y[p0];
      const e1x = this.r[p1] - x0;
      const e1y = this.y[p1] - y0;
      const e2x = this.r[p2] - x0;
      const e2y = this.y[p2] - y0;
      const det = e1x * e2y - e1y * e2x;
      if (Math.abs(det) < 1e-12) continue;
      const px = r - x0;
      const py = y - y0;
      const w1 = (px * e2y - py * e2x) / det;
      const w2 = (e1x * py - e1y * px) / det;
      const eps = 1e-6;
      if (w1 < -eps || w2 < -eps || w1 + w2 > 1 + eps) continue;
      const theta = this.theta[p0] * (1 - w1 - w2) + this.theta[p1] * w1 + this.theta[p2] * w2;
      lo = Math.min(lo, theta);
      hi = Math.max(hi, theta);
    }
    if (lo === Infinity) return false;
    out[0] = lo;
    out[1] = hi;
    return true;
  }
}

/** A resting stack's top surface around the spine: angle as a function of radius (the same at every y). */
class StackField {
  readonly r: Float64Array;
  readonly theta: Float64Array;
  constructor(profile: RestProfile, side: 1 | -1, width: number) {
    const n = Math.ceil(width / profile.step) + 1;
    this.r = new Float64Array(n);
    this.theta = new Float64Array(n);
    for (let k = 0; k < n; k += 1) {
      const x = profile.x[Math.min(k, profile.x.length - 1)];
      const z = profile.z[Math.min(k, profile.z.length - 1)];
      this.r[k] = Math.hypot(x, z);
      this.theta[k] = paperSpineAngle(side > 0 ? x : -x, z);
    }
  }

  angle(r: number): number {
    const n = this.r.length;
    if (r >= this.r[n - 1]) return Number.NaN;
    let lo = 0;
    let hi = n - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (this.r[mid] <= r) lo = mid;
      else hi = mid;
    }
    const t = (r - this.r[lo]) / Math.max(this.r[hi] - this.r[lo], 1e-12);
    return this.theta[lo] + (this.theta[hi] - this.theta[lo]) * t;
  }
}

/* ------------------------------------------------------------------ *
 * Simulated leaves
 * ------------------------------------------------------------------ */

interface Grip {
  particles: number[];
  /** Each grip particle's offset from the hand point: radius, angle and height. */
  offsets: Float64Array;
  /** Where the hand holds each grip particle this substep. */
  target?: Float64Array;
  /** Start and end of the hand's arc around the spine. */
  theta0: number;
  theta1: number;
  r0: number;
  y0: number;
  start: number;
  frames: number;
  release: number;
  draw: number;
  ySlide: number;
  released: boolean;
}

interface Leaf {
  index: number;
  stock: PaperStock;
  x: Float64Array;
  prev: Float64Array;
  v: Float64Array;
  invMass: Float64Array;
  pinned: Uint8Array;
  field: PolarField;
  grip: Grip | null;
  destination: 1 | -1;
  startFrame: number;
  /** Frames the leaf has been nearly still on its destination. */
  still: number;
  settled: boolean;
  landed: boolean;
  /** Peak contact closing speed in the current frame, per neighbour side. */
  contactAhead: number;
  contactBehind: number;
  touching: boolean;
  /** Particles a contact moved in the current substep. */
  contacted: Uint8Array;
  /** Positions at the start of the frame, for settling. */
  frameStart: Float64Array;
  /** Bending stiffness across the spine direction (u) and along it (v), kg·mm²/s². */
  bendU: number;
  bendV: number;
  massPerArea: number;
}

/** Expand riffles into one entry per leaf, ordered by frame. */
function scheduledTurns(spec: PaperBookSpec): (PaperBookTurn & { frame: number })[] {
  const out: (PaperBookTurn & { frame: number })[] = [];
  for (const turn of spec.turns) {
    const count = turn.count ?? 1;
    for (let k = 0; k < count; k += 1) out.push({ ...turn, frame: turn.frame + k * (turn.interval ?? 4) });
  }
  return out.sort((a, b) => a.frame - b.frame);
}

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

/**
 * Simulate the whole timeline. Deterministic: the same spec bakes the same frames. Typical cost at `fine` quality
 * is a few hundred milliseconds per second of film with one or two leaves in the air.
 */
export function bakePaperBook(spec: PaperBookSpec): PaperBookBake {
  const issues = inspectPaperBook(spec);
  if (issues.length) throw new Error("Invalid paper book: " + issues.map((i) => `${i.path}: ${i.message}`).join("; "));
  const started = typeof performance !== "undefined" ? performance.now() : Date.now();
  const quality = QUALITY[spec.quality ?? "fine"];
  const columns = quality.columns;
  const rows = quality.rows;
  const n = columns * rows;
  const W = spec.width;
  const H = spec.height;
  const hu = W / (columns - 1);
  const hv = H / (rows - 1);
  const fps = spec.fps ?? 30;
  const substeps = quality.substeps;
  const dt = 1 / (fps * substeps);
  const stock = resolveStock(spec.stock ?? MAGAZINE_STOCK);
  const coverStock = resolveStock(spec.cover ?? spec.stock ?? MAGAZINE_STOCK);
  const gap = spec.gap ?? Math.max(stock.caliper / 1000, 0.12);
  const gutter = paperBookGutter(spec, gap);
  const stiffness = spec.stiffness ?? 1;
  const dragScale = spec.drag ?? 1;
  const rMax = Math.hypot(W, 20) * 1.08;
  const yMin = -0.08 * H;
  const yMax = 1.08 * H;
  const fieldCols = columns * 2;
  const fieldRows = rows * 2;

  // Which stack each leaf rests in, in index order: lower indices on the left.
  const place: PaperLeafPlace[] = Array.from({ length: spec.leaves }, (_, i) => (i < (spec.open ?? Math.floor(spec.leaves / 2)) ? "left" : "right"));
  const active: Leaf[] = [];
  const settledLeaves = new Map<number, { positions: Float32Array; side: 1 | -1 }>();
  const frames: PaperBookFrame[] = [];
  const events: PaperBookEvent[] = [];
  const airSamples: number[] = [];
  let airPeak = 0;
  const turns = scheduledTurns(spec);
  let nextTurn = 0;
  const angles = new Float64Array(2);

  const leafStock = (index: number) => (index === 0 || index === spec.leaves - 1 ? coverStock : stock);
  const restCount = (side: "left" | "right") => place.filter((p) => p === side).length;

  const startLeaf = (turn: PaperBookTurn & { frame: number }, frame: number) => {
    const forward = (turn.direction ?? "forward") === "forward";
    // The top leaf of the source stack: the lowest-index right leaf, or the highest-index left leaf.
    let index = -1;
    if (forward) index = place.indexOf("right");
    else for (let i = place.length - 1; i >= 0; i -= 1) if (place[i] === "left") { index = i; break; }
    if (index < 0) return;
    const side: 1 | -1 = forward ? 1 : -1;
    const count = restCount(forward ? "right" : "left");
    const settled = settledLeaves.get(index);
    const positions = settled ? Float64Array.from(settled.positions) : Float64Array.from(paperBookRestingLeaf(columns, rows, W, H, side, stackHeight(count, 0, gap), gutter));
    settledLeaves.delete(index);
    place[index] = "moving";
    const s = leafStock(index);
    const invMass = new Float64Array(n);
    const pinned = new Uint8Array(n);
    const massPerArea = s.grammage * 1e-9;
    for (let i = 0; i < columns; i += 1) {
      for (let j = 0; j < rows; j += 1) {
        const p = i * rows + j;
        const area = hu * hv * (i === 0 || i === columns - 1 ? 0.5 : 1) * (j === 0 || j === rows - 1 ? 0.5 : 1);
        if (i === 0) {
          pinned[p] = 1;
          invMass[p] = 0;
        } else invMass[p] = 1 / (massPerArea * area);
      }
    }
    // Grain runs along the spine: turning a page bends it along the grain (the easy way).
    const k = stiffness * 1e6;
    const leaf: Leaf = {
      index,
      stock: s,
      x: positions,
      prev: Float64Array.from(positions),
      v: new Float64Array(n * 3),
      invMass,
      pinned,
      field: new PolarField(columns, rows, fieldCols, fieldRows, rMax, yMin, yMax),
      grip: null,
      destination: forward ? -1 : 1,
      startFrame: frame,
      still: 0,
      settled: false,
      landed: false,
      contactAhead: 0,
      contactBehind: 0,
      touching: false,
      contacted: new Uint8Array(n),
      frameStart: Float64Array.from(positions),
      bendU: paperBendingStiffness(s, 90) * k,
      bendV: paperBendingStiffness(s, 0) * k,
      massPerArea,
    };
    const kind = turn.kind ?? "grab";
    if (kind === "grab") {
      const grip = turn.grip ?? "bottom";
      const gripRows = grip === "bottom" ? [0, 1] : grip === "top" ? [rows - 1, rows - 2] : [Math.floor(rows / 2) - 1, Math.floor(rows / 2), Math.floor(rows / 2) + 1];
      const particles: number[] = [];
      for (const j of gripRows) for (const i of [columns - 1, columns - 2]) particles.push(i * rows + j);
      const p0 = particles[0];
      const x0 = positions[3 * p0];
      const z0 = positions[3 * p0 + 2];
      const theta0 = paperSpineAngle(x0, z0);
      const offsets = new Float64Array(particles.length * 3);
      particles.forEach((p, k) => {
        offsets[3 * k] = Math.hypot(positions[3 * p], positions[3 * p + 2]) - Math.hypot(x0, z0);
        offsets[3 * k + 1] = paperSpineAngle(positions[3 * p], positions[3 * p + 2]) - theta0;
        offsets[3 * k + 2] = positions[3 * p + 1] - positions[3 * p0 + 1];
      });
      const target = forward ? Math.PI - Math.atan2(stackHeight(restCount("left") + 1, 0, gap) + gap, W) : Math.atan2(stackHeight(restCount("right") + 1, 0, gap) + gap, W);
      leaf.grip = {
        particles, offsets, theta0, theta1: target, r0: Math.hypot(x0, z0), y0: positions[3 * p0 + 1], start: frame,
        frames: turn.frames ?? 24, release: turn.release ?? 0.7, draw: turn.draw ?? 0.22,
        ySlide: grip === "bottom" ? 0.05 * H : grip === "top" ? -0.05 * H : 0, released: false,
      };
    } else {
      // A thumb flick: the edge moves fastest, so the page bends as it leaves.
      const omega = ((turn.speed ?? 3000) * Math.PI) / 180 * (forward ? 1 : -1);
      for (let i = 1; i < columns; i += 1) {
        const share = Math.sqrt(i / (columns - 1));
        for (let j = 0; j < rows; j += 1) {
          const p = i * rows + j;
          const x = positions[3 * p];
          const z = positions[3 * p + 2];
          // ω about the spine (y axis): v = ω × r, with r = (x, 0, z).
          leaf.v[3 * p] = -omega * share * z;
          leaf.v[3 * p + 2] = omega * share * x;
        }
      }
      events.push({ frame, kind: "release", leaf: index, strength: Math.min(1, Math.abs(omega) * W / 6000), speed: Math.abs(omega) * W });
    }
    events.push({ frame, kind: "lift", leaf: index, strength: kind === "grab" ? 0.5 : 0.7, speed: 0 });
    active.push(leaf);
    active.sort((a, b) => a.index - b.index);
  };

  // Bending stencils (linear, rotation invariant): x_a − 2 x_b + x_c along u and along v.
  const solveBending = (leaf: Leaf, a: number, b: number, c: number, compliance: number) => {
    const wa = leaf.invMass[a];
    const wb = leaf.invMass[b];
    const wc = leaf.invMass[c];
    const denom = wa + 4 * wb + wc + compliance;
    if (denom <= 0) return;
    const x = leaf.x;
    for (let d = 0; d < 3; d += 1) {
      const C = x[3 * a + d] - 2 * x[3 * b + d] + x[3 * c + d];
      const lambda = -C / denom;
      x[3 * a + d] += wa * lambda;
      x[3 * b + d] -= 2 * wb * lambda;
      x[3 * c + d] += wc * lambda;
    }
  };

  const solveDistance = (leaf: Leaf, a: number, b: number, rest: number) => {
    const wa = leaf.invMass[a];
    const wb = leaf.invMass[b];
    const w = wa + wb;
    if (w <= 0) return;
    const x = leaf.x;
    const dx = x[3 * b] - x[3 * a];
    const dy = x[3 * b + 1] - x[3 * a + 1];
    const dz = x[3 * b + 2] - x[3 * a + 2];
    const len = Math.hypot(dx, dy, dz);
    if (len < 1e-12) return;
    const s = (len - rest) / (len * w);
    x[3 * a] += dx * s * wa;
    x[3 * a + 1] += dy * s * wa;
    x[3 * a + 2] += dz * s * wa;
    x[3 * b] -= dx * s * wb;
    x[3 * b + 1] -= dy * s * wb;
    x[3 * b + 2] -= dz * s * wb;
  };

  const diag = Math.hypot(hu, hv);
  // The hand is firm but not rigid (compliance α): the paper's own stretch constraints win, so it never tears.
  const handCompliance = 0.01;
  const solveLeaf = (leaf: Leaf) => {
    const hand = leaf.grip;
    if (hand && !hand.released && hand.target) {
      hand.particles.forEach((p, k) => {
        const w = leaf.invMass[p];
        const f = w / (w + handCompliance / (dt * dt));
        for (let d = 0; d < 3; d += 1) leaf.x[3 * p + d] += (hand.target![3 * k + d] - leaf.x[3 * p + d]) * f;
      });
    }
    // Stretch and shear keep the paper from stretching: three Gauss–Seidel passes.
    for (let pass = 0; pass < 3; pass += 1) {
    for (let i = 0; i < columns; i += 1) {
      for (let j = 0; j < rows; j += 1) {
        const p = i * rows + j;
        if (i + 1 < columns) solveDistance(leaf, p, p + rows, hu);
        if (j + 1 < rows) solveDistance(leaf, p, p + 1, hv);
        if (i + 1 < columns && j + 1 < rows) {
          solveDistance(leaf, p, p + rows + 1, diag);
          solveDistance(leaf, p + 1, p + rows, diag);
        }
      }
    }
    }
    // Long-range tethers: no point may be farther from the spine than the paper between them (Kim et al. 2012).
    const x = leaf.x;
    for (let i = 2; i < columns; i += 1) {
      const rest = i * hu;
      for (let j = 0; j < rows; j += 1) {
        const p = i * rows + j;
        if (leaf.invMass[p] === 0) continue;
        const ax = x[3 * p];
        const ay = x[3 * p + 1] - (j / (rows - 1)) * H;
        const az = x[3 * p + 2];
        const d = Math.hypot(ax, ay, az);
        if (d > rest) {
          const k = rest / d;
          x[3 * p] = ax * k;
          x[3 * p + 1] = ay * k + (j / (rows - 1)) * H;
          x[3 * p + 2] = az * k;
        }
      }
    }
    // Tethers to the hand: while a grip holds the page, nothing is farther from it than the paper between them.
    const grip = leaf.grip;
    if (grip && !grip.released) {
      const g = grip.particles[0];
      const gi = Math.floor(g / rows);
      const gj = g - gi * rows;
      for (let p = rows; p < n; p += 1) {
        if (leaf.invMass[p] === 0) continue;
        const pi = Math.floor(p / rows);
        const pj = p - pi * rows;
        const rest = Math.hypot((pi - gi) * hu, (pj - gj) * hv);
        const dx = x[3 * p] - x[3 * g];
        const dy = x[3 * p + 1] - x[3 * g + 1];
        const dz = x[3 * p + 2] - x[3 * g + 2];
        const d = Math.hypot(dx, dy, dz);
        if (d > rest && d > 1e-9) {
          const k = rest / d;
          x[3 * p] = x[3 * g] + dx * k;
          x[3 * p + 1] = x[3 * g + 1] + dy * k;
          x[3 * p + 2] = x[3 * g + 2] + dz * k;
        }
      }
    }
    // Bending: stiffness k = D·w⊥ / h³ per stencil; compliance α = 1/k, scaled by 1/dt².
    const alphaU = 1 / (((leaf.bendU * hv) / (hu * hu * hu)) * dt * dt);
    const alphaV = 1 / (((leaf.bendV * hu) / (hv * hv * hv)) * dt * dt);
    for (let i = 1; i + 1 < columns; i += 1) for (let j = 0; j < rows; j += 1) solveBending(leaf, (i - 1) * rows + j, i * rows + j, (i + 1) * rows + j, alphaU);
    for (let i = 1; i < columns; i += 1) for (let j = 1; j + 1 < rows; j += 1) solveBending(leaf, i * rows + j - 1, i * rows + j, i * rows + j + 1, alphaV);
  };

  /** Turn a particle about the spine to angle θ, keeping its radius and height. */
  const turnTo = (x: Float64Array, p: number, theta: number) => {
    const r = Math.hypot(x[3 * p], x[3 * p + 2]);
    x[3 * p] = r * Math.cos(theta);
    x[3 * p + 2] = r * Math.sin(theta);
  };

  const binding = hu * 1.6;
  /** Keep every point of the leaves and the stacks in angular order around the spine, a gap apart. */
  const solveContacts = (leftField: StackField | null, rightField: StackField | null, kinematic: ReadonlyMap<number, PolarField>) => {
    for (const leaf of active) leaf.field.build(leaf.x);
    for (let a = 0; a < active.length; a += 1) {
      const leaf = active[a];
      const ahead = a > 0 && active[a - 1].index === leaf.index - 1 ? active[a - 1] : null;
      const behind = a + 1 < active.length && active[a + 1].index === leaf.index + 1 ? active[a + 1] : null;
      const aheadKinematic = ahead ? null : kinematic.get(leaf.index - 1) ?? null;
      const behindKinematic = behind ? null : kinematic.get(leaf.index + 1) ?? null;
      // Far apart in angle (in flight), the neighbours cannot touch: skip their lookups.
      const reach = 0.08;
      const aheadField = ahead ? ahead.field : aheadKinematic;
      const behindField = behind ? behind.field : behindKinematic;
      const aheadNear = !aheadField || aheadField.low - reach < leaf.field.high;
      const behindNear = !behindField || behindField.high + reach > leaf.field.low;
      for (let p = 0; p < n; p += 1) {
        if (leaf.invMass[p] === 0) continue;
        const x = leaf.x;
        const px = x[3 * p];
        const pz = x[3 * p + 2];
        const r = Math.hypot(px, pz);
        // At the spine itself every leaf meets the fold; inside the binding the leaves close at a constant angle.
        if (r < hu * 0.4) continue;
        const y = x[3 * p + 1];
        let theta = paperSpineAngle(px, pz);
        const margin = gap / Math.max(r, binding);
        // Ahead (lower index, larger angle): this leaf must stay below its smallest angle.
        let limitHigh = Infinity;
        let aheadDynamic = false;
        if (ahead) {
          if (aheadNear && ahead.field.angles(r, y, angles)) { limitHigh = angles[0] - margin; aheadDynamic = true; }
        } else if (aheadKinematic) {
          if (aheadNear && aheadKinematic.angles(r, y, angles)) limitHigh = angles[0] - margin;
        } else if (leftField && leaf.index - 1 >= 0 && place[leaf.index - 1] === "left") {
          const t = leftField.angle(r);
          if (!Number.isNaN(t)) limitHigh = t - margin;
        }
        // Behind (higher index, smaller angle): this leaf must stay above its largest angle.
        let limitLow = -Infinity;
        let behindDynamic = false;
        if (behind) {
          if (behindNear && behind.field.angles(r, y, angles)) { limitLow = angles[1] + margin; behindDynamic = true; }
        } else if (behindKinematic) {
          if (behindNear && behindKinematic.angles(r, y, angles)) limitLow = angles[1] + margin;
        } else if (rightField && leaf.index + 1 < spec.leaves && place[leaf.index + 1] === "right") {
          const t = rightField.angle(r);
          if (!Number.isNaN(t)) limitLow = t + margin;
        }
        // The table under the book, and the far side of the left stack.
        limitLow = Math.max(limitLow, margin);
        limitHigh = Math.min(limitHigh, Math.PI - margin);
        // How much of a crossing this leaf takes. In a landed pile the leaf beneath does not yield (shock
        // propagation), so a pile settles instead of fighting itself; a landed leaf yields less than one in the air.
        const share = (other: Leaf | null, otherAbove: boolean) => {
          if (!other) return 1;
          if (leaf.landed && other.landed && leaf.destination === other.destination) return otherAbove ? 0 : 1;
          return other.landed === leaf.landed ? 0.5 : leaf.landed ? 0.2 : 0.8;
        };
        // On the left pile, lower indices lie beneath; on the right pile, higher indices do.
        const aheadAbove = leaf.destination > 0;
        let target = theta;
        if (theta > limitHigh) target = aheadDynamic ? theta - (theta - limitHigh) * share(ahead, aheadAbove) : limitHigh;
        if (target < limitLow) target = behindDynamic ? target + (limitLow - target) * share(behind, !aheadAbove) : limitLow;
        if (target !== theta) {
          // Closing speed of the contact: the angular speed into the neighbour times the radius.
          const prevTheta = paperSpineAngle(leaf.prev[3 * p], leaf.prev[3 * p + 2]);
          const closing = Math.abs(theta - prevTheta) * r / dt;
          if (target < theta) leaf.contactAhead = Math.max(leaf.contactAhead, closing);
          else leaf.contactBehind = Math.max(leaf.contactBehind, closing);
          turnTo(x, p, target);
          leaf.contacted[p] = 1;
          theta = target;
        }
      }
    }
  };

  const normalAt = (x: Float64Array, i: number, j: number, out: Float64Array) => {
    const iL = Math.max(0, i - 1);
    const iR = Math.min(columns - 1, i + 1);
    const jD = Math.max(0, j - 1);
    const jU = Math.min(rows - 1, j + 1);
    const a = 3 * (iR * rows + j);
    const b = 3 * (iL * rows + j);
    const c = 3 * (i * rows + jU);
    const d = 3 * (i * rows + jD);
    const ux = x[a] - x[b];
    const uy = x[a + 1] - x[b + 1];
    const uz = x[a + 2] - x[b + 2];
    const vx = x[c] - x[d];
    const vy = x[c + 1] - x[d + 1];
    const vz = x[c + 2] - x[d + 2];
    out[0] = uy * vz - uz * vy;
    out[1] = uz * vx - ux * vz;
    out[2] = ux * vy - uy * vx;
    const l = Math.hypot(out[0], out[1], out[2]) || 1;
    out[0] /= l;
    out[1] /= l;
    out[2] /= l;
  };

  const normal = new Float64Array(3);
  for (let frame = 0; frame < spec.durationFrames; frame += 1) {
    while (nextTurn < turns.length && turns[nextTurn].frame <= frame) startLeaf(turns[nextTurn++], frame);
    const leftCount = place.filter((p, i) => p === "left" && !settledLeaves.has(i)).length;
    const rightCount = place.filter((p, i) => p === "right" && !settledLeaves.has(i)).length;
    // Settled leaves on top of the stacks do not move: their contact fields are built once a frame.
    const kinematic = new Map<number, PolarField>();
    for (const [index, settled] of settledLeaves) {
      const field = new PolarField(columns, rows, fieldCols, fieldRows, rMax, yMin, yMax);
      field.build(settled.positions);
      kinematic.set(index, field);
    }
    const leftField = leftCount > 0 ? new StackField(restProfile(stackHeight(leftCount, 0, gap), gutter, W * 1.02), -1, W * 1.02) : null;
    const rightField = rightCount > 0 ? new StackField(restProfile(stackHeight(rightCount, 0, gap), gutter, W * 1.02), 1, W * 1.02) : null;
    for (const leaf of active) {
      leaf.contactAhead = 0;
      leaf.contactBehind = 0;
      leaf.frameStart.set(leaf.x);
    }
    for (let step = 0; step < substeps; step += 1) {
      const time = frame + step / substeps;
      for (const leaf of active) {
        // The hand: grip points follow an arc around the spine, drawn in toward it, then let go.
        const grip = leaf.grip;
        if (grip && !grip.released) {
          const tau = Math.min(1, (time - grip.start) / grip.frames);
          if (tau >= grip.release) {
            grip.released = true;
            events.push({ frame, kind: "release", leaf: leaf.index, strength: 0.5, speed: (Math.abs(grip.theta1 - grip.theta0) * grip.r0 * fps) / grip.frames });
          } else {
            // The hand eases along the whole arc and lets go while still moving, so the page carries on.
            const e = easeInOut(tau);
            const theta = grip.theta0 + (grip.theta1 - grip.theta0) * e;
            const r = grip.r0 * (1 - grip.draw * Math.sin(Math.PI * Math.min(1, e)));
            const lift = Math.sin(Math.PI * Math.min(1, e));
            grip.target = grip.target ?? new Float64Array(grip.particles.length * 3);
            grip.particles.forEach((_, k) => {
              const rp = r + grip.offsets[3 * k];
              const tp = theta + grip.offsets[3 * k + 1];
              grip.target![3 * k] = rp * Math.cos(tp);
              grip.target![3 * k + 1] = grip.y0 + grip.offsets[3 * k + 2] + grip.ySlide * lift;
              grip.target![3 * k + 2] = rp * Math.sin(tp);
            });
          }
        }
        // Gravity, air drag and a little internal damping; then predict.
        const x = leaf.x;
        const v = leaf.v;
        for (let i = 1; i < columns; i += 1) {
          for (let j = 0; j < rows; j += 1) {
            const p = i * rows + j;
            const w = leaf.invMass[p];
            if (w === 0) continue;
            normalAt(x, i, j, normal);
            const vn = v[3 * p] * normal[0] + v[3 * p + 1] * normal[1] + v[3 * p + 2] * normal[2];
            const area = hu * hv * (i === columns - 1 ? 0.5 : 1) * (j === 0 || j === rows - 1 ? 0.5 : 1);
            const dragForce = -0.5 * AIR * DRAG_COEFFICIENT * dragScale * area * vn * Math.abs(vn);
            const damping = 1 - 0.8 * dt;
            v[3 * p] = (v[3 * p] + dragForce * normal[0] * w * dt) * damping;
            v[3 * p + 1] = (v[3 * p + 1] + dragForce * normal[1] * w * dt) * damping;
            v[3 * p + 2] = (v[3 * p + 2] + (dragForce * normal[2] * w - GRAVITY) * dt) * damping;
          }
        }
        leaf.prev.set(x);
        for (let p = 0; p < n; p += 1) {
          if (leaf.invMass[p] === 0) continue;
          x[3 * p] += v[3 * p] * dt;
          x[3 * p + 1] += v[3 * p + 1] * dt;
          x[3 * p + 2] += v[3 * p + 2] * dt;
        }
        // The spine holds its row.
        for (let j = 0; j < rows; j += 1) {
          const p = j;
          x[3 * p] = 0;
          x[3 * p + 1] = (j / (rows - 1)) * H;
          x[3 * p + 2] = 0;
        }
        solveLeaf(leaf);
      }
      // Three contact passes: leaves pressed between others meet both neighbours' corrected surfaces.
      for (const leaf of active) leaf.contacted.fill(0);
      for (let pass = 0; pass < 3; pass += 1) solveContacts(leftField, rightField, kinematic);
      for (const leaf of active) {
        const x = leaf.x;
        for (let p = 0; p < n; p += 1) {
          if (leaf.invMass[p] === 0) {
            leaf.v[3 * p] = 0;
            leaf.v[3 * p + 1] = 0;
            leaf.v[3 * p + 2] = 0;
            continue;
          }
          leaf.v[3 * p] = (x[3 * p] - leaf.prev[3 * p]) / dt;
          leaf.v[3 * p + 1] = (x[3 * p + 1] - leaf.prev[3 * p + 1]) / dt;
          leaf.v[3 * p + 2] = (x[3 * p + 2] - leaf.prev[3 * p + 2]) / dt;
          if (leaf.contacted[p] && leaf.landed) {
            // Paper does not bounce: a landed leaf loses its speed into its neighbour, and friction slows sliding.
            const theta = paperSpineAngle(x[3 * p], x[3 * p + 2]);
            const ex = -Math.sin(theta);
            const ez = Math.cos(theta);
            const vt = leaf.v[3 * p] * ex + leaf.v[3 * p + 2] * ez;
            leaf.v[3 * p] = (leaf.v[3 * p] - vt * ex) * 0.6;
            leaf.v[3 * p + 1] *= 0.6;
            leaf.v[3 * p + 2] = (leaf.v[3 * p + 2] - vt * ez) * 0.6;
          }
        }
      }
    }
    // Strain limiting (Provot 1995): pull any stretch left by fast motion back out, then re-check contact.
    for (const leaf of active) {
      for (let pass = 0; pass < 10; pass += 1) {
        for (let i = 0; i < columns; i += 1) {
          for (let j = 0; j < rows; j += 1) {
            const p = i * rows + j;
            if (i + 1 < columns) solveDistance(leaf, p, p + rows, hu);
            if (j + 1 < rows) solveDistance(leaf, p, p + 1, hv);
            if (i + 1 < columns && j + 1 < rows) {
              solveDistance(leaf, p, p + rows + 1, diag);
              solveDistance(leaf, p + 1, p + rows, diag);
            }
          }
        }
      }
    }
    solveContacts(leftField, rightField, kinematic);
    // Events, air and settling.
    let air = 0;
    for (const leaf of active) {
      // Speeds over the whole frame (substep velocities carry contact jitter).
      let sum = 0;
      let peak = 0;
      for (let p = 0; p < n; p += 1) {
        const s = Math.hypot(leaf.x[3 * p] - leaf.frameStart[3 * p], leaf.x[3 * p + 1] - leaf.frameStart[3 * p + 1], leaf.x[3 * p + 2] - leaf.frameStart[3 * p + 2]) * fps;
        sum += s;
        peak = Math.max(peak, s);
      }
      const mean = sum / n;
      air = Math.max(air, mean);
      const contact = Math.max(leaf.contactAhead, leaf.contactBehind);
      const destinationContact = leaf.destination < 0 ? leaf.contactAhead : leaf.contactBehind;
      const free = !leaf.grip || leaf.grip.released;
      if (free && !leaf.landed && destinationContact > 40 && frame > leaf.startFrame + 4) {
        leaf.landed = true;
        events.push({ frame, kind: "land", leaf: leaf.index, strength: Math.min(1, destinationContact / 1500), speed: destinationContact });
      } else if (contact > 150 && !leaf.touching && !leaf.landed) {
        events.push({ frame, kind: "touch", leaf: leaf.index, strength: Math.min(1, contact / 2000), speed: contact });
      }
      leaf.touching = contact > 150;
      // A leaf settles where it comes to rest: on the far stack, or back on its own if the turn was too weak.
      const theta = paperSpineAngle(leaf.x[3 * (n - 1)], leaf.x[3 * (n - 1) + 2]);
      const lying = theta > Math.PI * 0.85 ? -1 : theta < Math.PI * 0.15 ? 1 : 0;
      // Leaves settle in stack order: the one beneath must have settled first.
      const beneath = lying < 0 ? leaf.index - 1 : leaf.index + 1;
      const beneathMoving = active.some((other) => other.index === beneath && !other.settled);
      leaf.still = free && lying !== 0 && mean < 12 && peak < 120 && !beneathMoving ? leaf.still + 1 : 0;
      if (leaf.still >= 5) {
        leaf.settled = true;
        leaf.destination = lying as 1 | -1;
      }
    }
    airPeak = Math.max(airPeak, air);
    airSamples.push(air);
    // Settled leaves join their stack as kinematic tops; a covered settled leaf becomes part of the stack.
    for (const leaf of active.filter((l) => l.settled)) {
      const side: 1 | -1 = leaf.destination;
      for (const [index, s] of [...settledLeaves.entries()]) if (s.side === side) { settledLeaves.delete(index); place[index] = side < 0 ? "left" : "right"; }
      settledLeaves.set(leaf.index, { positions: Float32Array.from(leaf.x), side });
      place[leaf.index] = side < 0 ? "left" : "right";
      events.push({ frame, kind: "settle", leaf: leaf.index, strength: 0.2, speed: 0 });
    }
    for (let a = active.length - 1; a >= 0; a -= 1) if (active[a].settled) active.splice(a, 1);
    // Leaves with their own shape this frame.
    const leaves: PaperBookLeafFrame[] = [];
    for (const [index, s] of settledLeaves) leaves.push({ index, place: s.side < 0 ? "left" : "right", positions: s.positions });
    for (const leaf of active) leaves.push({ index: leaf.index, place: "moving", positions: Float32Array.from(leaf.x) });
    leaves.sort((a, b) => a.index - b.index);
    const restingLeft = place.filter((p, i) => p === "left" && !settledLeaves.has(i)).length;
    const restingRight = place.filter((p, i) => p === "right" && !settledLeaves.has(i)).length;
    frames.push({ frame, leftCount: restingLeft, rightCount: restingRight, leaves });
  }
  const ended = typeof performance !== "undefined" ? performance.now() : Date.now();
  return {
    spec, stock, coverStock, columns, rows, gap, gutter, transmittance: paperTransmittance(stock),
    frames, events, air: Float32Array.from(airSamples), airPeak, bakeMs: ended - started,
  };
}

/** Coated magazine paper (LWC/MWC): dense, smooth and glossy. Estimated from typical coated grades. */
export const MAGAZINE_STOCK: PaperStock = {
  grammage: 90, caliper: 75, modulusMD: 5.5, modulusCD: 2.5, opacity: 0.9, reflectance: 0.88, gloss: 0.32,
  fibre: 1.2, fringe: 0.5, core: "#f6f5f1", back: "same", creaseRadius: 100,
};

export interface PaperBookContactReport {
  /** Deepest crossing of one leaf into its neighbour or a stack over the whole bake, mm (0 when none). */
  maxPenetration: number;
  frame: number;
  leaf: number;
  /** Distance from the spine of the deepest crossing, mm (the gutter hides crossings close to the spine). */
  radius: number;
  /** Largest stretch of any grid edge, as a fraction of its rest length. */
  maxStretch: number;
}

/**
 * A CPU check of a bake: no leaf crosses its neighbour or a stack (in angular order around the spine) and no leaf
 * stretches. Points at the fold itself (within 0.4 grid spacings of the spine) are skipped, as the solver skips them.
 */
export function inspectPaperBookContacts(bake: PaperBookBake): PaperBookContactReport {
  const { columns, rows, spec, gap, gutter } = bake;
  const W = spec.width;
  const H = spec.height;
  const hu = W / (columns - 1);
  const hv = H / (rows - 1);
  const rMax = Math.hypot(W, 20) * 1.08;
  const report: PaperBookContactReport = { maxPenetration: 0, frame: -1, leaf: -1, radius: 0, maxStretch: 0 };
  const angles = new Float64Array(2);
  const fieldA = new PolarField(columns, rows, columns * 2, rows * 2, rMax, -0.08 * H, 1.08 * H);
  for (const frame of bake.frames) {
    const shaped = new Map(frame.leaves.map((l) => [l.index, l]));
    for (const leaf of frame.leaves) {
      const x = leaf.positions;
      for (let i = 0; i < columns; i += 1) {
        for (let j = 0; j < rows; j += 1) {
          const p = i * rows + j;
          const edge = (q: number, rest: number) => {
            const d = Math.hypot(x[3 * q] - x[3 * p], x[3 * q + 1] - x[3 * p + 1], x[3 * q + 2] - x[3 * p + 2]);
            report.maxStretch = Math.max(report.maxStretch, d / rest - 1);
          };
          if (i + 1 < columns) edge(p + rows, hu);
          if (j + 1 < rows) edge(p + 1, hv);
        }
      }
      // Both neighbours: ahead (lower index, a shaped leaf or the left stack) and behind (higher index, a shaped
      // leaf or the right stack). This leaf must stay below the one ahead and above the one behind.
      for (const side of [-1, 1] as const) {
        const other = shaped.get(leaf.index + side);
        let stack: StackField | null = null;
        if (other) fieldA.build(other.positions);
        else if (side < 0 && leaf.index > 0 && frame.leftCount > 0) stack = new StackField(restProfile(stackHeight(frame.leftCount, 0, gap), gutter, W * 1.02), -1, W * 1.02);
        else if (side > 0 && leaf.index < spec.leaves - 1 && frame.rightCount > 0) stack = new StackField(restProfile(stackHeight(frame.rightCount, 0, gap), gutter, W * 1.02), 1, W * 1.02);
        else continue;
        for (let p = rows; p < columns * rows; p += 1) {
          const r = Math.hypot(x[3 * p], x[3 * p + 2]);
          if (r < hu * 0.4) continue;
          const theta = paperSpineAngle(x[3 * p], x[3 * p + 2]);
          let limit = Number.NaN;
          if (other) {
            if (fieldA.angles(r, x[3 * p + 1], angles)) limit = side < 0 ? angles[0] : angles[1];
          } else if (stack) limit = stack.angle(r);
          if (Number.isNaN(limit)) continue;
          const depth = (side < 0 ? theta - limit : limit - theta) * r;
          if (depth > report.maxPenetration) {
            report.maxPenetration = depth;
            report.frame = frame.frame;
            report.leaf = leaf.index;
            report.radius = r;
          }
        }
      }
    }
  }
  return report;
}

/** A leaf surface for {@link paperBookSeparate}: grid positions in book millimetres (x, y, z), `columns × rows`. */
export interface PaperBookSurface {
  positions: Float64Array;
  columns: number;
  rows: number;
  /** How much this surface yields at a contact: 0 holds still (resting), 1 moves (in the air). */
  give: number;
}

/**
 * Keep drawn surfaces (for example the smooth surfaces a renderer interpolates from the simulation grid, which can
 * bulge past it on a tight curl) in angular order around the spine, a gap apart. `surfaces` are in leaf order, from the
 * left stack to the right; each consecutive pair is separated, moving the surface that gives.
 */
export function paperBookSeparate(surfaces: readonly PaperBookSurface[], width: number, height: number, gap: number, binding: number): void {
  if (surfaces.length < 2) return;
  const rMax = Math.hypot(width, 20) * 1.08;
  const fields = surfaces.map((s) => new PolarField(s.columns, s.rows, s.columns * 2, s.rows * 2, rMax, -0.08 * height, 1.08 * height));
  const angles = new Float64Array(2);
  const turn = (x: Float64Array, k: number, theta: number) => {
    const r = Math.hypot(x[3 * k], x[3 * k + 2]);
    x[3 * k] = r * Math.cos(theta);
    x[3 * k + 2] = r * Math.sin(theta);
  };
  for (let pass = 0; pass < 2; pass += 1) {
    surfaces.forEach((s, i) => fields[i].build(s.positions));
    for (let i = 0; i + 1 < surfaces.length; i += 1) {
      const a = surfaces[i];
      const b = surfaces[i + 1];
      const total = a.give + b.give;
      if (total <= 0) continue;
      if (fields[i].low - 0.08 > fields[i + 1].high) continue;
      // b must stay below a's smallest angle; a above b's largest. Each takes its share.
      if (b.give > 0) {
        const x = b.positions;
        for (let k = b.rows; k < b.columns * b.rows; k += 1) {
          const r = Math.hypot(x[3 * k], x[3 * k + 2]);
          if (r < 1e-6) continue;
          if (!fields[i].angles(r, x[3 * k + 1], angles)) continue;
          const limit = angles[0] - gap / Math.max(r, binding);
          const theta = paperSpineAngle(x[3 * k], x[3 * k + 2]);
          if (theta > limit) turn(x, k, theta - (theta - limit) * (b.give / total));
        }
      }
      if (a.give > 0) {
        const x = a.positions;
        for (let k = a.rows; k < a.columns * a.rows; k += 1) {
          const r = Math.hypot(x[3 * k], x[3 * k + 2]);
          if (r < 1e-6) continue;
          if (!fields[i + 1].angles(r, x[3 * k + 1], angles)) continue;
          const limit = angles[1] + gap / Math.max(r, binding);
          const theta = paperSpineAngle(x[3 * k], x[3 * k + 2]);
          if (theta < limit) turn(x, k, theta + (limit - theta) * (a.give / total));
        }
      }
    }
  }
}
