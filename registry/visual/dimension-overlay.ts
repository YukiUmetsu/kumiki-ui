/** V07 `DimensionOverlay` — dimension lines, thickness stacks, areas, angles and scale references.
 *
 * Two stages, both pure:
 *
 * 1. {@link resolveDimensions} turns authored specs into world geometry in the
 *    asset's units. Points are raw coordinates, InspectableAsset anchors or
 *    part-bounds corners. Values are **measured from those points** (times
 *    `metersPerUnit`) or **authored with a source**. When both exist and differ,
 *    a `dimension-mismatch` diagnostic is raised. Values never come from screen
 *    pixels.
 * 2. {@link layoutDimensions} projects the geometry through any projector (a
 *    Three.js camera, or identity for 2D SVG). It produces lines, ticks, arcs
 *    and labels, with draw-on progress for the frame. Labels are kept upright,
 *    moved outside short spans, and stacked with leaders for thin layers.
 *    Overlaps are resolved by flipping or stacking, or reported as
 *    `unplaceable`. Strongly foreshortened dimensions are flagged
 *    (`foreshortened`); their labels still show the true value.
 */
import type { InspectableAsset } from "./inspectable-asset";
import { formatAngle, formatArea, formatLength } from "./measure-units";
import type { MeasureUnits } from "./measure-units";

export type DimVec = readonly number[];
/** A point: raw coordinates, an anchor id, or a corner/face of a part's bounds (−1, 0, +1 per axis). */
export type DimPoint = DimVec | { anchor: string } | { part: string; at: readonly number[] };
export interface AuthoredValue { value: number; source: string }

interface DimBase {
  id: string;
  /** Prefix for the value, e.g. "Decking". */
  label?: string;
  /** Draw-on window. @default start 0, draw 18 frames */
  frames?: { start?: number; draw?: number };
  /** Direction to offset the dimension line from the measured points (asset units; normalized). */
  side?: DimVec;
  /** Offset distance in asset units. @default 0 */
  offset?: number;
}
export type DimensionSpec =
  | (DimBase & { kind: "length"; from: DimPoint; to: DimPoint; value?: AuthoredValue })
  /** Consecutive segments along one line (layer stacks): `points.length - 1` segments with `labels`. */
  | (DimBase & { kind: "chain"; points: DimPoint[]; labels: string[]; values?: (AuthoredValue | undefined)[]; total?: boolean })
  | (DimBase & { kind: "area"; polygon: DimPoint[]; value?: AuthoredValue })
  | (DimBase & { kind: "angle"; vertex: DimPoint; a: DimPoint; b: DimPoint; format?: "degrees" | "pitch"; radius?: number; value?: AuthoredValue })
  /** A known-size reference drawn at a point: a 1.75 m person or a bar of `meters`. */
  | (DimBase & { kind: "scale-reference"; at: DimPoint; reference: "person" | "bar"; meters?: number; up?: DimVec; along?: DimVec });

export interface ResolvedSegment { a: number[]; b: number[]; meters: number; text: string; label?: string; authored?: AuthoredValue }
export interface ResolvedDimension {
  id: string;
  kind: DimensionSpec["kind"];
  /** Measured points (where extension lines start). */
  anchors: number[][];
  /** Dimension-line segments (offset from anchors). */
  segments: ResolvedSegment[];
  /** Area polygon or angle arc samples, world space. */
  outline?: number[][];
  /** Text for areas/angles/totals. */
  text?: string;
  start: number;
  draw: number;
}
export interface DimensionDiagnostic { code: string; severity: "error" | "warning" | "info"; message: string; id?: string }

const sub = (a: DimVec, b: DimVec) => a.map((v, i) => v - b[i]);
const add = (a: DimVec, b: DimVec) => a.map((v, i) => v + b[i]);
const mul = (a: DimVec, k: number) => a.map((v) => v * k);
const len = (a: DimVec) => Math.hypot(...a);
const norm = (a: DimVec) => { const l = len(a) || 1; return a.map((v) => v / l); };
const dot = (a: DimVec, b: DimVec) => a.reduce((s, v, i) => s + v * (b[i] ?? 0), 0);

/** Resolve specs to world geometry and true values. */
export function resolveDimensions(
  specs: readonly DimensionSpec[],
  options: { asset?: InspectableAsset; frame?: number; metersPerUnit?: number; units?: MeasureUnits; tolerance?: number } = {}
): { dimensions: ResolvedDimension[]; diagnostics: DimensionDiagnostic[] } {
  const diagnostics: DimensionDiagnostic[] = [];
  const mpu = options.metersPerUnit ?? options.asset?.metersPerUnit ?? 1, units = options.units ?? "metric", frame = options.frame ?? 0;
  const tol = options.tolerance ?? 0.02;
  const point = (p: DimPoint, id: string): number[] | null => {
    if (Array.isArray(p)) return [...(p as DimVec)];
    if (!options.asset) { diagnostics.push({ code: "dimension-needs-asset", severity: "error", id, message: `"${id}" refers to an anchor or part but no InspectableAsset was given.` }); return null; }
    try {
      if ("anchor" in (p as object)) return [...options.asset.getAnchor((p as { anchor: string }).anchor, frame).position];
      const { part, at } = p as { part: string; at: readonly number[] };
      const b = options.asset.getBounds(part, frame);
      return b.min.map((mn, i) => mn + (b.max[i] - mn) * ((at[i] ?? 0) + 1) / 2);
    } catch (e) {
      diagnostics.push({ code: "dimension-ref-unknown", severity: "error", id, message: `"${id}": ${(e as Error).message}` });
      return null;
    }
  };
  const check = (id: string, measured: number, authored: AuthoredValue | undefined, kind: "length" | "area" | "angle") => {
    if (!authored) return;
    if (!authored.source?.trim()) diagnostics.push({ code: "dimension-unsourced", severity: "error", id, message: `"${id}" has an authored value without a source.` });
    if (Math.abs(authored.value - measured) > Math.max(1e-9, Math.abs(measured) * tol)) {
      const fmt = (v: number) => (kind === "area" ? formatArea(v, units) : kind === "angle" ? formatAngle(v) : formatLength(v, units));
      diagnostics.push({ code: "dimension-mismatch", severity: "warning", id, message: `"${id}": authored ${fmt(authored.value)} (${authored.source}) differs from the asset's ${fmt(measured)} by more than ${Math.round(tol * 100)}%. The authored value is shown.` });
    }
  };
  const dimensions: ResolvedDimension[] = [];
  for (const s of specs) {
    const start = s.frames?.start ?? 0, draw = s.frames?.draw ?? 18;
    const offsetVec = s.side ? mul(norm(s.side), s.offset ?? 0) : null;
    const shift = (p: number[]) => (offsetVec ? add(p, offsetVec) : p);
    if (s.kind === "length") {
      const a = point(s.from, s.id), b = point(s.to, s.id);
      if (!a || !b) continue;
      const meters = len(sub(b, a)) * mpu;
      if (meters <= 1e-9) { diagnostics.push({ code: "dimension-zero", severity: "error", id: s.id, message: `"${s.id}" has zero length.` }); continue; }
      check(s.id, meters, s.value, "length");
      const shown = s.value?.value ?? meters;
      dimensions.push({ id: s.id, kind: s.kind, anchors: [a, b], start, draw,
        segments: [{ a: shift(a), b: shift(b), meters: shown, text: formatLength(shown, units), label: s.label, authored: s.value }] });
    } else if (s.kind === "chain") {
      const pts = s.points.map((p) => point(p, s.id));
      if (pts.some((p) => !p) || pts.length < 2) continue;
      const P = pts as number[][];
      if (s.labels.length !== P.length - 1) diagnostics.push({ code: "chain-labels", severity: "warning", id: s.id, message: `"${s.id}" has ${P.length - 1} segments and ${s.labels.length} labels.` });
      const segments = P.slice(1).map((b, i) => {
        const a = P[i], meters = len(sub(b, a)) * mpu, authored = s.values?.[i];
        check(`${s.id}[${i}]`, meters, authored, "length");
        const shown = authored?.value ?? meters;
        return { a: shift(a), b: shift(b), meters: shown, text: formatLength(shown, units), label: s.labels[i], authored };
      });
      const total = segments.reduce((t, g) => t + g.meters, 0);
      dimensions.push({ id: s.id, kind: s.kind, anchors: P, segments, start, draw, text: s.total ? `${s.label ? `${s.label} ` : ""}${formatLength(total, units)} total` : undefined });
    } else if (s.kind === "area") {
      const pts = s.polygon.map((p) => point(p, s.id));
      if (pts.some((p) => !p) || pts.length < 3) continue;
      const P = pts as number[][];
      // Newell normal gives the planar polygon area in any orientation.
      const n = [0, 0, 0];
      for (let i = 0; i < P.length; i++) {
        const c = P[i], d = P[(i + 1) % P.length], cz = c[2] ?? 0, dz = d[2] ?? 0;
        n[0] += (c[1] - d[1]) * (cz + dz); n[1] += (cz - dz) * (c[0] + d[0]); n[2] += (c[0] - d[0]) * (c[1] + d[1]);
      }
      const area = (len(n) / 2) * mpu * mpu;
      check(s.id, area, s.value, "area");
      const shown = s.value?.value ?? area;
      dimensions.push({ id: s.id, kind: s.kind, anchors: P, segments: [], outline: P, start, draw, text: `${s.label ? `${s.label} ` : ""}${formatArea(shown, units)}` });
    } else if (s.kind === "angle") {
      const v = point(s.vertex, s.id), a = point(s.a, s.id), b = point(s.b, s.id);
      if (!v || !a || !b) continue;
      const ua = norm(sub(a, v)), ub = norm(sub(b, v));
      const angle = Math.acos(Math.max(-1, Math.min(1, dot(ua, ub))));
      check(s.id, angle, s.value, "angle");
      const shown = s.value?.value ?? angle;
      const r = s.radius ?? Math.min(len(sub(a, v)), len(sub(b, v))) * 0.6;
      const arc: number[][] = [];
      for (let i = 0; i <= 24; i++) {
        const t = i / 24, dir = norm(add(mul(ua, Math.sin((1 - t) * angle)), mul(ub, Math.sin(t * angle))));
        arc.push(add(v, mul(dir, r)));
      }
      dimensions.push({ id: s.id, kind: s.kind, anchors: [v, a, b], segments: [], outline: arc, start, draw, text: `${s.label ? `${s.label} ` : ""}${formatAngle(shown, s.format)}` });
    } else {
      const at = point(s.at, s.id);
      if (!at) continue;
      const meters = s.meters ?? (s.reference === "person" ? 1.75 : 1);
      const dir = norm(s.reference === "person" ? s.up ?? [0, 1, 0] : s.along ?? [1, 0, 0]);
      const top = add(at, mul(dir, meters / mpu));
      dimensions.push({ id: s.id, kind: s.kind, anchors: [at, top], start, draw,
        segments: [{ a: at, b: top, meters, text: s.reference === "person" ? `${formatLength(meters, units)} person` : formatLength(meters, units), label: s.label }] });
    }
  }
  return { dimensions, diagnostics };
}

/* ------------------------------------------------------------------ layout */

export interface DimProjection { x: number; y: number; inView: boolean }
export interface LaidLabel { id: string; text: string; x: number; y: number; width: number; height: number; angle: number; opacity: number; leader?: [number, number][] }
export interface LaidDimension {
  id: string;
  kind: DimensionSpec["kind"];
  status: "visible" | "outside" | "foreshortened" | "unplaceable" | "hidden";
  /** Draw-on progress in [0, 1]. */
  progress: number;
  lines: { a: [number, number]; b: [number, number]; role: "dimension" | "extension" | "tick" | "outline" | "figure" }[];
  polygon?: [number, number][];
  labels: LaidLabel[];
  /** Projected/ideal length ratio (1 = seen square-on). */
  foreshortening: number;
}

export interface DimensionLayoutOptions {
  project: (p: readonly number[]) => DimProjection;
  viewport: { width: number; height: number };
  frame?: number;
  /** Label font size in px. @default 15 */
  fontSize?: number;
  /** Text width in px; default is a deterministic estimate. */
  measure?: (text: string, fontSize: number) => number;
  /** Rects labels must avoid (protected subjects, titles). */
  avoid?: { x: number; y: number; width: number; height: number }[];
  /** Flag when the projected length is below this fraction of its square-on length. @default 0.5 */
  foreshortenLimit?: number;
}

const estimate = (text: string, size: number) => [...text].reduce((w, ch) => w + (/[⺀-鿿]/.test(ch) ? 1 : /[0-9]/.test(ch) ? 0.6 : /[A-Z]/.test(ch) ? 0.66 : ch === " " ? 0.3 : 0.54) * size, 0);
const clamp01 = (t: number) => Math.max(0, Math.min(1, t));

/** Project resolved dimensions into screen lines and placed labels for one frame. */
export function layoutDimensions(dimensions: readonly ResolvedDimension[], options: DimensionLayoutOptions): { dimensions: LaidDimension[]; diagnostics: DimensionDiagnostic[] } {
  const diagnostics: DimensionDiagnostic[] = [];
  const fs = options.fontSize ?? 15, lh = Math.round(fs * 1.35), measure = options.measure ?? estimate;
  const frame = options.frame ?? Infinity, limit = options.foreshortenLimit ?? 0.5;
  const placed: { x: number; y: number; width: number; height: number }[] = [...(options.avoid ?? [])];
  const P = (p: readonly number[]): [number, number] => { const q = options.project(p); return [q.x, q.y]; };
  const inside = (r: { x: number; y: number; width: number; height: number }) => r.x >= 0 && r.y >= 0 && r.x + r.width <= options.viewport.width && r.y + r.height <= options.viewport.height;
  const hits = (r: { x: number; y: number; width: number; height: number }) => placed.some((q) => r.x < q.x + q.width && q.x < r.x + r.width && r.y < q.y + q.height && q.y < r.y + r.height);
  // Local px-per-unit at a point: the best case over the three world axes (a square-on view).
  const scaleAt = (p: readonly number[], eps: number) => {
    const c = P(p);
    return Math.max(...[0, 1, 2].slice(0, p.length).map((k) => { const q = [...p]; q[k] += eps; const s = P(q); return Math.hypot(s[0] - c[0], s[1] - c[1]) / eps; }));
  };
  const out: LaidDimension[] = [];
  for (const d of dimensions) {
    const progress = frame === Infinity ? 1 : clamp01((frame - d.start) / Math.max(1, d.draw));
    const lines: LaidDimension["lines"] = [], labels: LaidLabel[] = [];
    const visible = d.anchors.every((a) => options.project(a).inView);
    let fore = 1;
    const labelOpacity = clamp01((progress - 0.65) / 0.35);
    const tryPlace = (id: string, text: string, cx: number, cy: number, angle: number, normal: [number, number], extra = 0): LaidLabel | null => {
      const w = measure(text, fs) + 10, h = lh;
      for (const side of [1, -1]) for (const push of [0, 1, 2, 3]) {
        const dist = h / 2 + 4 + extra + push * (h + 2);
        const x = cx + normal[0] * dist * side, y = cy + normal[1] * dist * side;
        const cos = Math.abs(Math.cos(angle)), sin = Math.abs(Math.sin(angle));
        const bw = w * cos + h * sin, bh = w * sin + h * cos;
        const box = { x: x - bw / 2, y: y - bh / 2, width: bw, height: bh };
        if (inside(box) && !hits(box)) { placed.push(box); return { id, text, x, y, width: w, height: h, angle, opacity: labelOpacity }; }
      }
      return null;
    };
    if (d.kind === "area" || d.kind === "angle") {
      const poly = (d.outline ?? []).map(P);
      const shown = poly.slice(0, Math.max(2, Math.ceil(poly.length * clamp01(progress / 0.7))));
      if (d.kind === "angle") {
        const [v, a, b] = d.anchors.map(P);
        lines.push({ a: v, b: a, role: "extension" }, { a: v, b: b, role: "extension" });
        for (let i = 1; i < shown.length; i++) lines.push({ a: shown[i - 1], b: shown[i], role: "outline" });
      }
      const c = poly.reduce((s, p) => [s[0] + p[0] / poly.length, s[1] + p[1] / poly.length], [0, 0]);
      const at = d.kind === "angle" ? poly[Math.floor(poly.length / 2)] : c;
      const lab = d.text ? tryPlace(d.id, d.text, at[0], at[1], 0, [0, -1], d.kind === "angle" ? 6 : -lh / 2 - 4) : null;
      if (d.text && !lab) diagnostics.push({ code: "dimension-unplaceable", severity: "warning", id: d.id, message: `No clear place for "${d.text}".` });
      if (lab) labels.push(lab);
      out.push({ id: d.id, kind: d.kind, status: !visible ? "outside" : lab || !d.text ? "visible" : "unplaceable", progress, lines, polygon: d.kind === "area" ? poly : undefined, labels, foreshortening: 1 });
      continue;
    }
    // Lines: extension lines from anchors to the offset dimension line, ticks at ends, labels.
    const segs = d.segments.map((s) => ({ ...s, A: P(s.a), B: P(s.b) }));
    if (!segs.length) continue;
    const first = segs[0], last = segs[segs.length - 1];
    const dir: [number, number] = [last.B[0] - first.A[0], last.B[1] - first.A[1]];
    const L = Math.hypot(dir[0], dir[1]) || 1;
    const t: [number, number] = [dir[0] / L, dir[1] / L], nrm: [number, number] = [-t[1], t[0]];
    const extP = clamp01(progress / 0.3), lineP = clamp01((progress - 0.15) / 0.55);
    if (d.kind !== "scale-reference") {
      d.anchors.forEach((an, i) => {
        const on = i < segs.length ? segs[i].A : segs[segs.length - 1].B;
        const from = P(an);
        if (Math.hypot(on[0] - from[0], on[1] - from[1]) > 2) lines.push({ a: from, b: [from[0] + (on[0] - from[0]) * extP, from[1] + (on[1] - from[1]) * extP], role: "extension" });
      });
    }
    // Foreshortening: projected length vs. square-on length at the midpoint.
    const totalUnits = d.segments.reduce((s, g) => s + Math.hypot(...g.b.map((v, i) => v - g.a[i])), 0);
    const mid = d.segments[0].a.map((v, i) => (v + d.segments[d.segments.length - 1].b[i]) / 2);
    const ideal = scaleAt(mid, Math.max(1e-4, totalUnits / 50)) * totalUnits;
    fore = ideal > 0 ? Math.min(1, L / ideal) : 1;
    // Upright label angle along the line.
    let angle = Math.atan2(t[1], t[0]);
    if (angle > Math.PI / 2) angle -= Math.PI; else if (angle < -Math.PI / 2) angle += Math.PI;
    const tick = (p: [number, number]) => { const k = 6; lines.push({ a: [p[0] - (t[0] + nrm[0]) * k * .7, p[1] - (t[1] + nrm[1]) * k * .7], b: [p[0] + (t[0] + nrm[0]) * k * .7, p[1] + (t[1] + nrm[1]) * k * .7], role: "tick" }); };
    const cx0 = (first.A[0] + last.B[0]) / 2, cy0 = (first.A[1] + last.B[1]) / 2;
    if (d.kind === "scale-reference" && d.segments[0].text.endsWith("person")) {
      // Person silhouette: head circle approximated by an octagon, body and legs as strokes.
      const base = first.A, top = first.B, h = Math.hypot(top[0] - base[0], top[1] - base[1]);
      const up: [number, number] = [(top[0] - base[0]) / (h || 1), (top[1] - base[1]) / (h || 1)], side: [number, number] = [-up[1], up[0]];
      const at = (u: number, s: number): [number, number] => [base[0] + up[0] * h * u + side[0] * h * s, base[1] + up[1] * h * u + side[1] * h * s];
      const k = lineP;
      const figure: [[number, number], [number, number]][] = [[at(0, -.09), at(.5 * k, 0)], [at(0, .09), at(.5 * k, 0)], [at(.5, 0), at(.5 + .32 * k, 0)], [at(.78, -.15), at(.68, -.02)], [at(.78, .15), at(.68, .02)], [at(.72, -.16), at(.5, -.2)], [at(.72, .16), at(.5, .2)]];
      for (const [a, b] of figure) lines.push({ a, b, role: "figure" });
      for (let i = 0; i < 8 && k >= 1; i++) { const a0 = (i / 8) * Math.PI * 2, a1 = ((i + 1) / 8) * Math.PI * 2; lines.push({ a: at(.91 + Math.cos(a0) * .075, Math.sin(a0) * .075), b: at(.91 + Math.cos(a1) * .075, Math.sin(a1) * .075), role: "figure" }); }
      const lab = tryPlace(d.id, d.segments[0].text, top[0], top[1], 0, [0, -1]);
      if (lab) labels.push(lab);
      out.push({ id: d.id, kind: d.kind, status: visible ? "visible" : "outside", progress, lines, labels, foreshortening: fore });
      continue;
    }
    // Dimension line grows from the center out.
    const grow = (p: [number, number]): [number, number] => [cx0 + (p[0] - cx0) * lineP, cy0 + (p[1] - cy0) * lineP];
    for (const s of segs) lines.push({ a: grow(s.A), b: grow(s.B), role: "dimension" });
    if (lineP > 0.98) { tick(segs[0].A); for (const s of segs) tick(s.B); }
    // Labels: centered on spans that fit; thin spans go to a stacked column with leaders.
    const outsideCol: { s: (typeof segs)[number]; text: string }[] = [];
    for (const s of segs) {
      const text = s.label ? `${s.label} ${s.text}` : s.text;
      const span = Math.hypot(s.B[0] - s.A[0], s.B[1] - s.A[1]);
      if (span >= measure(text, fs) + 14 || segs.length === 1) {
        const lab = tryPlace(`${d.id}:${s.label ?? ""}`, text, (s.A[0] + s.B[0]) / 2, (s.A[1] + s.B[1]) / 2, span >= measure(text, fs) + 14 ? angle : 0, nrm);
        if (lab) labels.push(lab); else outsideCol.push({ s, text });
      } else outsideCol.push({ s, text });
    }
    if (outsideCol.length) {
      // Column beside the chain's far end, on the outward normal side, one row per thin span.
      const endPt = last.B;
      const colX = endPt[0] + nrm[0] * 28 + t[0] * 18, baseY = endPt[1] + nrm[1] * 28 - (outsideCol.length * (lh + 4)) / 2;
      outsideCol.forEach(({ s, text }, i) => {
        const w = measure(text, fs) + 10;
        const left = nrm[0] >= 0;
        const box = { x: left ? colX : colX - w, y: baseY + i * (lh + 4), width: w, height: lh };
        const mx = (s.A[0] + s.B[0]) / 2, my = (s.A[1] + s.B[1]) / 2;
        if (inside(box) && !hits(box)) {
          placed.push(box);
          labels.push({ id: `${d.id}:${s.label ?? i}`, text, x: box.x + w / 2, y: box.y + lh / 2, width: w, height: lh, angle: 0, opacity: labelOpacity, leader: [[mx, my], [left ? box.x - 2 : box.x + w + 2, box.y + lh / 2]] });
        } else diagnostics.push({ code: "dimension-unplaceable", severity: "warning", id: d.id, message: `No clear place for "${text}" (thin span).` });
      });
    }
    if (d.text) {
      const lab = tryPlace(`${d.id}:total`, d.text, cx0, cy0, angle, nrm, lh + 4);
      if (lab) labels.push(lab);
    }
    let status: LaidDimension["status"] = visible ? "visible" : "outside";
    if (visible && fore < limit) {
      status = "foreshortened";
      diagnostics.push({ code: "foreshortened", severity: "info", id: d.id, message: `"${d.id}" is seen at ${Math.round(fore * 100)}% of its length from this view; the label shows the true value.` });
    }
    out.push({ id: d.id, kind: d.kind, status, progress, lines, labels, foreshortening: fore });
  }
  return { dimensions: out, diagnostics };
}
