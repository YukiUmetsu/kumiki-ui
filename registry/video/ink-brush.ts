/**
 * INK1 — authored brush geometry, not a post-process ink matte or a fluid simulation.
 * Pure absolute-frame evaluation: control point pressure, segment pace, brush load,
 * five ink values, and paper-anchored flying-white bristle splits. No renderer clock.
 */
export interface InkBrushNode {
  x: number;
  y: number;
  /** Contact force, 0..1; varies the physical width of the mark. */
  pressure: number;
  /** Local travel speed multiplier, .25..4; greater is faster across this segment. */
  pace: number;
}
export interface InkBrushStroke {
  id: string;
  points: readonly InkBrushNode[];
  /** Maximum full-pressure brush width, 1..120 design pixels. */
  width: number;
  /** Available pigment 0..1; controls ink opacity, not blur. */
  load: number;
  /** Degree of bristle splitting, 0..1; the holes show actual paper. */
  dryness: number;
  /** Five deliberately separated ink densities, darkest (0) to palest (4). */
  tone: 0 | 1 | 2 | 3 | 4;
  startFrame: number;
  durationFrames: number;
}
export interface InkBrushSpec {
  version: 1;
  width: number;
  height: number;
  paper: string;
  seed: number;
  strokes: readonly InkBrushStroke[];
}
export interface InkIssue { code: string; path: string; message: string }
export interface InkGeometry {
  id: string;
  progress: number;
  outline: string;
  gaps: readonly { d: string; width: number }[];
  color: string;
  opacity: number;
  /** Tight authored-geometry bounds, before the full-sheet SVG clip. */
  bounds: readonly [number, number, number, number];
}
export const INK_DENSITIES = ["#20282A", "#475254", "#6E7B7C", "#9EA8A7", "#CBD0C7"] as const;
const HEX = /^#[0-9a-f]{6}$/i;
const finite = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n);
const between = (n: unknown, min: number, max: number) => finite(n) && n >= min && n <= max;
const clamp = (n: number, a: number, b: number) => Math.min(b, Math.max(a, n));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const fmt = (v: number) => v.toFixed(3);
/** Hash only paper-space indices and pinned seed; never a frame or wall clock. */
export function inkHash(seed: number, x: number, y: number): number {
  let n = (Math.imul((x | 0) + 101, 374761393) + Math.imul((y | 0) + 211, 668265263) + Math.imul((seed | 0) + 37, 1013904223)) | 0;
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}
export function inspectInkBrush(value: InkBrushSpec): InkIssue[] {
  const issues: InkIssue[] = [];
  const fail = (code: string, path: string, message: string) => issues.push({ code, path, message });
  if (!value || typeof value !== "object") return [{ code: "spec", path: "/", message: "An INK1 object is required." }];
  if (value.version !== 1) fail("version", "/version", "INK1 requires version 1.");
  if (!Number.isSafeInteger(value.width) || value.width < 240 || value.width > 4096) fail("width", "/width", "Width must be 240..4096.");
  if (!Number.isSafeInteger(value.height) || value.height < 240 || value.height > 4096) fail("height", "/height", "Height must be 240..4096.");
  if (typeof value.paper !== "string" || !HEX.test(value.paper)) fail("paper", "/paper", "Paper must be #RRGGBB.");
  if (!Number.isSafeInteger(value.seed) || value.seed < 0 || value.seed > 2147483647) fail("seed", "/seed", "Seed must be a nonnegative 31-bit integer.");
  if (!Array.isArray(value.strokes) || value.strokes.length < 1 || value.strokes.length > 72) {
    fail("strokes", "/strokes", "Supply 1..72 authored strokes; there is no fabricated brush fallback.");
    return issues;
  }
  const ids = new Set<string>();
  for (let i = 0; i < value.strokes.length; i++) {
    const s = value.strokes[i], at = "/strokes/" + i;
    if (!s || typeof s.id !== "string" || !/^[a-z][a-z0-9-]{0,47}$/.test(s.id) || ids.has(s.id))
      fail("stroke-id", at + "/id", "Use a unique lowercase stroke ID.");
    else ids.add(s.id);
    if (!s || !between(s.width, 1, 120)) fail("stroke-width", at + "/width", "Width must be 1..120.");
    if (!s || !between(s.load, 0, 1)) fail("stroke-load", at + "/load", "Load must be 0..1.");
    if (!s || !between(s.dryness, 0, 1)) fail("stroke-dryness", at + "/dryness", "Dryness must be 0..1.");
    if (!s || !Number.isInteger(s.tone) || s.tone < 0 || s.tone > 4)
      fail("stroke-tone", at + "/tone", "Tone must be one of 0, 1, 2, 3, 4.");
    if (!s || !Number.isSafeInteger(s.startFrame) || s.startFrame < 0)
      fail("stroke-start", at + "/startFrame", "Start must be a nonnegative integer.");
    if (!s || !Number.isSafeInteger(s.durationFrames) || s.durationFrames < 1 || s.durationFrames > 3600)
      fail("stroke-duration", at + "/durationFrames", "Duration must be 1..3600 frames.");
    if (!s || !Array.isArray(s.points) || s.points.length < 2 || s.points.length > 20) {
      fail("stroke-points", at + "/points", "Each stroke needs 2..20 ordered control points.");
      continue;
    }
    let travel = 0;
    for (let j = 0; j < s.points.length; j++) {
      const p = s.points[j], path = at + "/points/" + j;
      if (!p || !between(p.x, 0, value.width) || !between(p.y, 0, value.height))
        fail("point-position", path, "Control point must lie within the canvas.");
      if (!p || !between(p.pressure, 0, 1))
        fail("point-pressure", path + "/pressure", "Pressure must be within 0..1.");
      if (!p || !between(p.pace, .25, 4))
        fail("point-pace", path + "/pace", "Pace must be within .25..4.");
      if (j > 0 && p && s.points[j - 1] && finite(p.x) && finite(p.y) &&
          finite(s.points[j - 1].x) && finite(s.points[j - 1].y))
        travel += Math.hypot(p.x - s.points[j - 1].x, p.y - s.points[j - 1].y);
    }
    if (travel < .5) fail("stroke-length", at + "/points", "Control points need a visible travel distance.");
  }
  return issues;
}

interface Sample { x: number; y: number; pressure: number; pace: number; arc: number; time: number }
function cubic(a: number, b: number, c: number, d: number, t: number): number {
  return b + .5 * t * (c - a + t * (2 * a - 5 * b + 4 * c - d + t * (3 * (b - c) + d - a)));
}
function fullSamples(s: InkBrushStroke, width: number, height: number): Sample[] {
  const nodes = s.points, samples: Sample[] = [];
  for (let i = 0; i < nodes.length - 1; i++) {
    const a = nodes[Math.max(0, i - 1)], b = nodes[i], c = nodes[i + 1], d = nodes[Math.min(i + 2, nodes.length - 1)];
    // Bounded curve subdivision, independent of time, viewport and device pixel ratio.
    const steps = Math.max(8, Math.min(30, Math.ceil(Math.hypot(c.x - b.x, c.y - b.y) / 7)));
    for (let k = i === 0 ? 0 : 1; k <= steps; k++) {
      const t = k / steps;
      const sample: Sample = {
        x: clamp(cubic(a.x, b.x, c.x, d.x, t), 0, width),
        y: clamp(cubic(a.y, b.y, c.y, d.y, t), 0, height),
        pressure: clamp(cubic(a.pressure, b.pressure, c.pressure, d.pressure, t), 0, 1),
        pace: clamp(lerp(b.pace, c.pace, t), .25, 4), arc: 0, time: 0,
      };
      if (samples.length) {
        const prior = samples[samples.length - 1];
        const dist = Math.hypot(sample.x - prior.x, sample.y - prior.y);
        sample.arc = prior.arc + dist;
        sample.time = prior.time + dist / Math.max(.25, (sample.pace + prior.pace) / 2);
      }
      samples.push(sample);
    }
  }
  return samples;
}
function partialSamples(samples: Sample[], progress: number): Sample[] {
  if (progress <= 0) return [];
  if (progress >= 1) return samples;
  const target = samples[samples.length - 1].time * progress;
  const out: Sample[] = [samples[0]];
  for (let i = 1; i < samples.length; i++) {
    const p = samples[i], previous = samples[i - 1];
    if (p.time > target) {
      if (target > previous.time) {
        const t = (target - previous.time) / (p.time - previous.time);
        out.push({
          x: lerp(previous.x, p.x, t), y: lerp(previous.y, p.y, t),
          pressure: lerp(previous.pressure, p.pressure, t), pace: lerp(previous.pace, p.pace, t),
          arc: lerp(previous.arc, p.arc, t), time: target,
        });
      }
      break;
    }
    out.push(p);
  }
  return out;
}
interface OffsetSample extends Sample { nx: number; ny: number; radius: number }
function offsets(samples: Sample[], totalArc: number, s: InkBrushStroke, seed: number): OffsetSample[] {
  return samples.map((p, i) => {
    const before = samples[Math.max(0, i - 1)], after = samples[Math.min(samples.length - 1, i + 1)];
    const dx = after.x - before.x, dy = after.y - before.y, length = Math.hypot(dx, dy) || 1;
    const tipIn = clamp(p.arc / Math.max(.1, s.width * .65), .035, 1);
    const tipOut = clamp((totalArc - p.arc) / Math.max(.1, s.width * .8), .035, 1);
    const paperJitter = 1 + (inkHash(seed, i, 17) - .5) * (.04 + .13 * s.dryness);
    const radius = s.width * (.07 + .93 * p.pressure) * (.7 + .3 * s.load) * Math.min(tipIn, tipOut) * paperJitter / 2;
    return { ...p, nx: -dy / length, ny: dx / length, radius };
  });
}
function geometry(s: InkBrushStroke, seed: number, samples: Sample[], totalArc: number): Omit<InkGeometry, "id" | "progress" | "color" | "opacity"> {
  if (samples.length < 2) return { outline: "", gaps: [], bounds: [0, 0, 0, 0] };
  const pts = offsets(samples, totalArc, s, seed);
  const left = pts.map(p => [p.x + p.nx * p.radius, p.y + p.ny * p.radius]);
  const right = pts.map(p => [p.x - p.nx * p.radius, p.y - p.ny * p.radius]).reverse();
  const hull = [...left, ...right];
  const outline = "M" + hull.map((p, i) => (i === 0 ? "" : "L") + fmt(p[0]) + " " + fmt(p[1])).join(" ") + " Z";
  const gaps: { d: string; width: number }[] = [];
  // Stable bristle channels: render paper-colored holes through each individual stroke mask.
  // Segments use frozen sample indices; no sampled random value includes the current frame.
  const lanes = Math.round(s.dryness * 5);
  for (let lane = 0; lane < lanes; lane++) {
    const across = (lane - (lanes - 1) / 2) / Math.max(1, lanes) * 1.35;
    const path: string[] = [];
    for (let i = 0; i < pts.length - 1; i++) {
      if (inkHash(seed + lane * 149, Math.floor(i / 4), 71) > s.dryness * .93) continue;
      const a = pts[i], b = pts[i + 1];
      if (a.radius < .7 || b.radius < .7) continue;
      const xa = a.x + a.nx * across * a.radius, ya = a.y + a.ny * across * a.radius;
      const xb = b.x + b.nx * across * b.radius, yb = b.y + b.ny * across * b.radius;
      path.push("M" + fmt(xa) + " " + fmt(ya) + "L" + fmt(xb) + " " + fmt(yb));
    }
    if (path.length) gaps.push({ d: path.join(" "), width: Math.max(.42, s.width * (.015 + .035 * s.dryness)) });
  }
  const xs = hull.map(p => p[0]), ys = hull.map(p => p[1]);
  return { outline, gaps, bounds: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)] };
}
/** A frame can be evaluated in any order; geometry, fibres and dry gaps are paper anchored. */
export function evaluateInkBrush(spec: InkBrushSpec, frame: number, reducedMotion = false): InkGeometry[] {
  const issues = inspectInkBrush(spec);
  if (issues.length) throw new RangeError(issues.map(i => i.path + ": " + i.message).join("; "));
  if (!Number.isSafeInteger(frame) || frame < 0) throw new RangeError("Ink frame must be a nonnegative integer.");
  return spec.strokes.map((s, i) => {
    const progress = reducedMotion ? 1 : clamp((frame - s.startFrame) / s.durationFrames, 0, 1);
    if (progress === 0) return { id: s.id, progress, outline: "", gaps: [], color: INK_DENSITIES[s.tone],
      opacity: .3 + .7 * s.load, bounds: [0, 0, 0, 0] };
    const full = fullSamples(s, spec.width, spec.height);
    const drawn = partialSamples(full, progress);
    return { id: s.id, progress, color: INK_DENSITIES[s.tone],
      opacity: .3 + .7 * s.load, ...geometry(s, spec.seed + 101 * i, drawn, full[full.length - 1].arc) };
  });
}
