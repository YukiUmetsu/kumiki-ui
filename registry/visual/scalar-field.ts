/** V05 `ScalarFieldOverlay` — supplied scalar fields as calibrated colors, contours and bands.
 *
 * Draws **supplied** grids (temperature, moisture, relative pressure,
 * concentration). Kumiki never computes the physics behind them. Rules:
 *
 * - Units and the color domain are always explicit. A `fixed` domain keeps
 *   colors comparable across frames; a `dynamic` domain rescales each frame
 *   and says colors are not comparable (`domain-dynamic`).
 * - Values outside a fixed domain are clamped to its end colors and
 *   disclosed with their share (`values-clipped`).
 * - `null` is missing: drawn as a hatch, never as the zero color, and
 *   excluded from contours.
 * - Fields may change over time through keyframes (blended between
 *   neighbors); evaluation is pure per frame.
 *
 * Grids map onto a planar surface (origin, `u`, `v`, size) so the same field
 * can lie on a 3D wall or roof, or on a 2D plan.
 */

export type FieldGrid = (number | null)[][]; // rows (v) × cols (u); row 0 at v = −size/2 … last at +size/2

export interface ScalarFieldSpec {
  id: string;
  label: string;
  /** Unit text, e.g. "°C", "% moisture content", "Pa". */
  unit: string;
  /** One or more fields over time. Grids must share dimensions. */
  keyframes: { frame: number; grid: FieldGrid; label?: string }[];
  /** Where the grid lies: col axis along `u`, row axis along `v`. */
  surface: { origin: readonly [number, number, number]; u: readonly [number, number, number]; v: readonly [number, number, number]; size: readonly [number, number] };
  /** Color domain: `fixed` [min, max], or `dynamic` (per-frame data range). @default dynamic over all keyframes ("fixed-auto") */
  domain?: { mode: "fixed"; range: readonly [number, number] } | { mode: "dynamic" };
  ramp?: "thermal" | "moisture" | "diverging" | "viridis";
  /** Sampling between grid points. @default "bilinear" */
  interpolation?: "nearest" | "bilinear";
  /** Contour levels (value units). */
  contours?: number[];
  /** Threshold bands, e.g. "above 19% MC: decay risk". */
  bands?: { above?: number; below?: number; label: string }[];
  /** Where the data came from; printed with the legend. */
  source: string;
}

export interface FieldPlan {
  spec: ScalarFieldSpec;
  rows: number;
  cols: number;
  domain: [number, number];
  domainMode: "fixed" | "fixed-auto" | "dynamic";
  diagnostics: { code: string; severity: "error" | "warning" | "info"; message: string }[];
  /** Printed notes: domain policy, clipping, missing data, interpolation, provenance. */
  notes: string[];
}

export interface FieldFrame {
  grid: FieldGrid;
  domain: [number, number];
  label?: string;
  /** Share of known samples clamped to the domain ends. */
  clipped: { below: number; above: number };
  missing: number;
}

const RAMPS: Record<NonNullable<ScalarFieldSpec["ramp"]>, [number, number, number][]> = {
  thermal: [[38, 48, 140], [42, 120, 200], [88, 196, 210], [242, 230, 120], [240, 140, 50], [196, 40, 40]],
  moisture: [[214, 190, 150], [190, 200, 170], [120, 190, 200], [50, 130, 200], [24, 60, 150]],
  diverging: [[40, 90, 190], [140, 180, 230], [245, 245, 245], [235, 150, 120], [190, 40, 40]],
  viridis: [[68, 1, 84], [59, 82, 139], [33, 145, 140], [94, 201, 98], [253, 231, 37]],
};

/** Color for a normalized value t ∈ [0, 1] on a ramp. */
export function rampColor(ramp: ScalarFieldSpec["ramp"], t: number): [number, number, number] {
  const stops = RAMPS[ramp ?? "thermal"], x = Math.max(0, Math.min(1, t)) * (stops.length - 1), i = Math.min(stops.length - 2, Math.floor(x)), f = x - i;
  return [0, 1, 2].map((k) => Math.round(stops[i][k] + (stops[i + 1][k] - stops[i][k]) * f)) as [number, number, number];
}

const known = (g: FieldGrid) => g.flat().filter((v): v is number => v !== null && Number.isFinite(v));

export function planScalarField(spec: ScalarFieldSpec): FieldPlan {
  const diagnostics: FieldPlan["diagnostics"] = [];
  if (!spec.keyframes.length) throw new Error(`Scalar field "${spec.id}" needs at least one grid.`);
  const rows = spec.keyframes[0].grid.length, cols = spec.keyframes[0].grid[0]?.length ?? 0;
  if (rows < 2 || cols < 2) throw new Error(`Scalar field "${spec.id}" needs at least a 2 × 2 grid.`);
  for (const k of spec.keyframes) if (k.grid.length !== rows || k.grid.some((r) => r.length !== cols)) throw new Error(`Scalar field "${spec.id}": every keyframe grid must be ${rows} × ${cols}.`);
  for (let i = 1; i < spec.keyframes.length; i++) if (!(spec.keyframes[i].frame > spec.keyframes[i - 1].frame)) throw new Error(`Scalar field "${spec.id}": keyframe frames must increase.`);
  if (!spec.unit.trim()) diagnostics.push({ code: "unit-missing", severity: "error", message: "A scalar field needs a unit." });
  if (!spec.source.trim()) diagnostics.push({ code: "source-missing", severity: "error", message: "A scalar field needs a data source." });
  const all = spec.keyframes.flatMap((k) => known(k.grid));
  const lo = all.length ? Math.min(...all) : 0, hi = all.length ? Math.max(...all) : 1;
  let domain: [number, number], domainMode: FieldPlan["domainMode"];
  if (spec.domain?.mode === "fixed") { domain = [spec.domain.range[0], spec.domain.range[1]]; domainMode = "fixed"; }
  else if (spec.domain?.mode === "dynamic") { domain = [lo, hi]; domainMode = "dynamic"; diagnostics.push({ code: "domain-dynamic", severity: "warning", message: "The color scale is rescaled each frame; colors are not comparable across frames." }); }
  else { domain = [lo, hi]; domainMode = "fixed-auto"; }
  if (!(domain[1] > domain[0])) { domain = [domain[0], domain[0] + 1]; diagnostics.push({ code: "domain-flat", severity: "warning", message: "All known values are equal; the color scale is widened by one unit." }); }
  const missing = spec.keyframes[0].grid.flat().filter((v) => v === null).length;
  const notes = [
    `Supplied data: ${spec.source || "source not declared"}. Not simulated by Kumiki.`,
    domainMode === "dynamic" ? "Color scale rescales every frame; compare values, not colors." : `Color scale fixed at ${fmt(domain[0])}–${fmt(domain[1])} ${spec.unit}${domainMode === "fixed-auto" ? " (the data's full range across all frames)" : ""}.`,
    `${(spec.interpolation ?? "bilinear") === "bilinear" ? "Smoothed (bilinear) between" : "Nearest"} ${cols} × ${rows} samples.`,
  ];
  if (missing) notes.push(`Hatched: no data (${missing} of ${rows * cols} samples); not zero.`);
  const outside = domainMode === "fixed" ? all.filter((v) => v < domain[0] || v > domain[1]).length : 0;
  if (outside) { notes.push(`${Math.round((outside / all.length) * 1000) / 10}% of values fall outside the scale and are shown at its end colors.`); diagnostics.push({ code: "values-clipped", severity: "warning", message: `${outside} sample values are outside the fixed scale and are clamped to its end colors (disclosed).` }); }
  return { spec, rows, cols, domain, domainMode, diagnostics, notes };
}

const fmt = (v: number) => (Math.abs(v) >= 100 ? Math.round(v).toString() : (Math.round(v * 10) / 10).toString());

/** The field at a frame: blended between neighboring keyframes (missing if either neighbor is missing). */
export function evaluateScalarField(plan: FieldPlan, frame: number): FieldFrame {
  const ks = plan.spec.keyframes;
  let i = 0;
  while (i < ks.length - 1 && ks[i + 1].frame <= frame) i++;
  const a = ks[i], b = ks[Math.min(ks.length - 1, i + 1)];
  const t = b === a || frame <= a.frame ? 0 : Math.min(1, (frame - a.frame) / (b.frame - a.frame));
  const e = t * t * (3 - 2 * t);
  // Known on both sides: blend. Otherwise switch at the midpoint (never invent values from missing data).
  const grid: FieldGrid = a.grid.map((row, r) => row.map((v, c) => { const w = b.grid[r][c]; return v !== null && w !== null ? v + (w - v) * e : e < .5 ? v : w; }));
  const vals = known(grid);
  const domain: [number, number] = plan.domainMode === "dynamic" && vals.length ? [Math.min(...vals), Math.max(...vals) > Math.min(...vals) ? Math.max(...vals) : Math.min(...vals) + 1] : plan.domain;
  const below = vals.filter((v) => v < domain[0]).length, above = vals.filter((v) => v > domain[1]).length;
  return { grid, domain, label: e < .5 ? a.label : b.label, clipped: { below: vals.length ? below / vals.length : 0, above: vals.length ? above / vals.length : 0 }, missing: grid.flat().filter((v) => v === null).length };
}

/** Sample at normalized surface coords (s, t) ∈ [0, 1]² (s along u/cols, t along v/rows). */
export function sampleField(plan: FieldPlan, f: FieldFrame, s: number, t: number): number | null {
  const x = Math.max(0, Math.min(1, s)) * (plan.cols - 1), y = Math.max(0, Math.min(1, t)) * (plan.rows - 1);
  if ((plan.spec.interpolation ?? "bilinear") === "nearest") return f.grid[Math.round(y)][Math.round(x)];
  const c0 = Math.floor(x), r0 = Math.floor(y), c1 = Math.min(plan.cols - 1, c0 + 1), r1 = Math.min(plan.rows - 1, r0 + 1), fx = x - c0, fy = y - r0;
  const q = [f.grid[r0][c0], f.grid[r0][c1], f.grid[r1][c0], f.grid[r1][c1]];
  if (q.some((v) => v === null)) return fx < .5 ? (fy < .5 ? q[0] : q[2]) : fy < .5 ? q[1] : q[3]; // no blending into missing data
  const [a, b, c, d] = q as number[];
  return a * (1 - fx) * (1 - fy) + b * fx * (1 - fy) + c * (1 - fx) * fy + d * fx * fy;
}

/** RGBA raster (row 0 = t = 0) for textures; missing samples get a diagonal hatch. */
export function rasterizeField(plan: FieldPlan, f: FieldFrame, width: number, height: number, alpha = 210): Uint8ClampedArray {
  const out = new Uint8ClampedArray(width * height * 4), [d0, d1] = f.domain;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const v = sampleField(plan, f, (x + .5) / width, (y + .5) / height), o = (y * width + x) * 4;
    if (v === null) { const h = (x + y) % 10 < 2; out.set(h ? [120, 120, 120, 170] : [200, 200, 200, 70], o); continue; }
    const [r, g, b] = rampColor(plan.spec.ramp, (v - d0) / (d1 - d0));
    out.set([r, g, b, alpha], o);
  }
  return out;
}

/** Marching-squares contour segments in normalized (s, t) coords for a level. Missing cells are skipped. */
export function fieldContours(plan: FieldPlan, f: FieldFrame, level: number, resolution = 2): [number, number][][] {
  const W = (plan.cols - 1) * resolution + 1, H = (plan.rows - 1) * resolution + 1;
  const val = (i: number, j: number) => sampleField(plan, f, i / (W - 1), j / (H - 1));
  const segs: [number, number][][] = [];
  for (let j = 0; j < H - 1; j++) for (let i = 0; i < W - 1; i++) {
    const v = [val(i, j), val(i + 1, j), val(i + 1, j + 1), val(i, j + 1)];
    if (v.some((x) => x === null)) continue;
    const [a, b, c, d] = v as number[];
    const pts: [number, number][] = [];
    const edge = (x0: number, y0: number, x1: number, y1: number, p: number, q: number) => { if ((p < level) !== (q < level)) { const t = (level - p) / (q - p); pts.push([(x0 + (x1 - x0) * t) / (W - 1), (y0 + (y1 - y0) * t) / (H - 1)]); } };
    edge(i, j, i + 1, j, a, b); edge(i + 1, j, i + 1, j + 1, b, c); edge(i + 1, j + 1, i, j + 1, c, d); edge(i, j + 1, i, j, d, a);
    if (pts.length === 2) segs.push(pts); else if (pts.length === 4) segs.push([pts[0], pts[1]], [pts[2], pts[3]]);
  }
  return segs;
}

/** World point for normalized surface coords. */
export function fieldPoint(spec: ScalarFieldSpec, s: number, t: number): [number, number, number] {
  const { origin, u, v, size } = spec.surface;
  return [0, 1, 2].map((k) => origin[k] + u[k] * (s - .5) * size[0] + v[k] * (t - .5) * size[1]) as [number, number, number];
}
