/**
 * RISO2: general ink-separated, pose-keyed animation character.
 * The character is data. All anatomy, plate composition, motion, expressions,
 * and layer ordering are supplied by authors; there is no fixed "person" skeleton.
 */
export type RisoInkLayer = "solid" | "screen";
export interface RisoJointKey {
  frame: number;
  x?: number;
  y?: number;
  rotate?: number;
  scale?: number;
  /** Hold pose exactly until the next key, useful for printed-frame cadence. */
  easing?: "linear" | "ease" | "hold";
}
export interface RisoJoint {
  id: string;
  parent?: string;
  x: number;
  y: number;
  rotate?: number;
  scale?: number;
  /** Local keys offset from base transform; keys do not replace the rest pose. */
  keys?: readonly RisoJointKey[];
}
export interface RisoExpressionKey { frame: number; name: string }
export interface RisoCharacterPart {
  id: string;
  joint: string;
  plate: string;
  /** Author-painted SVG path. Only inert SVG path tokens are permitted. */
  d: string;
  /** Paths for discrete character turns, eyelids, visemes and redraws. */
  expressions?: Readonly<Record<string, string>>;
  paint: RisoInkLayer;
  opacity?: number;
}
export interface RisoCharacterSpec {
  version: 1;
  id: string;
  durationFrames: number;
  /** Object-space drawing coordinates. Authors can use any anatomy or subject. */
  joints: readonly RisoJoint[];
  parts: readonly RisoCharacterPart[];
  expressions?: readonly RisoExpressionKey[];
  /** Printed flipbook holds frames. 1 means native film cadence. */
  cadence?: 1 | 2 | 3 | 4;
}
export interface RisoCharacterIssue { path: string; message: string }
export interface RisoMatrix { a: number; b: number; c: number; d: number; e: number; f: number }
export interface RisoPartFrame {
  id: string;
  plate: string;
  paint: RisoInkLayer;
  opacity: number;
  d: string;
  transform: string;
}
export interface RisoCharacterFrame {
  expression: string;
  parts: readonly RisoPartFrame[];
  sampledFrame: number;
}
const SLUG = /^[a-z][a-z0-9-]{0,47}$/;
const PATH = /^[\d.,+\-\sMmLlHhVvCcSsQqTtAaZzEe]+$/;
const finite = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n);
const safeNumber = (n: unknown, min: number, max: number) => finite(n) && n >= min && n <= max;
const integer = (n: unknown) => Number.isSafeInteger(n);
const pathValid = (d: unknown): d is string => typeof d === "string" && d.length > 0 && d.length <= 20000 && PATH.test(d) && /[Mm]/.test(d);
const smooth = (t: number) => t * t * (3 - 2 * t);
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const number = (n: number) => Number(n.toFixed(5));
const identity = (): RisoMatrix => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 });
function multiply(a: RisoMatrix, b: RisoMatrix): RisoMatrix {
  return {
    a: a.a * b.a + a.c * b.b, b: a.b * b.a + a.d * b.b,
    c: a.a * b.c + a.c * b.d, d: a.b * b.c + a.d * b.d,
    e: a.a * b.e + a.c * b.f + a.e, f: a.b * b.e + a.d * b.f + a.f,
  };
}
function matrix(x: number, y: number, rotate: number, scale: number): RisoMatrix {
  const a = rotate * Math.PI / 180, cos = Math.cos(a) * scale, sin = Math.sin(a) * scale;
  return { a: cos, b: sin, c: -sin, d: cos, e: x, f: y };
}
export function inspectRisoCharacter(input: unknown, allowedPlates?: readonly string[]): RisoCharacterIssue[] {
  const problems: RisoCharacterIssue[] = [];
  const err = (path: string, message: string) => problems.push({ path, message });
  if (!input || typeof input !== "object" || Array.isArray(input)) return [{ path: "/", message: "RISO2 must be an object" }];
  const s = input as Partial<RisoCharacterSpec>;
  if (s.version !== 1) err("/version", "RISO2 version must be 1");
  if (typeof s.id !== "string" || !SLUG.test(s.id)) err("/id", "character ID must be a slug");
  if (!integer(s.durationFrames) || !safeNumber(s.durationFrames, 2, 36000)) err("/durationFrames", "durationFrames must be 2..36000");
  if (s.cadence !== undefined && ![1, 2, 3, 4].includes(s.cadence)) err("/cadence", "cadence must be 1..4");
  if (!Array.isArray(s.joints) || s.joints.length < 1 || s.joints.length > 80)
    err("/joints", "provide 1..80 joints");
  if (!Array.isArray(s.parts) || s.parts.length < 1 || s.parts.length > 160)
    err("/parts", "provide 1..160 authored ink parts");
  if (problems.some(p => p.path === "/joints" || p.path === "/parts")) return problems;
  const jointIds = new Set<string>(), parts = new Set<string>();
  for (const [i, j] of s.joints!.entries()) {
    const path = "/joints/" + i;
    if (!j || typeof j.id !== "string" || !SLUG.test(j.id) || jointIds.has(j.id))
      err(path + "/id", "joint ID must be a unique slug");
    else jointIds.add(j.id);
    if (!j || !safeNumber(j.x, -8192, 8192) || !safeNumber(j.y, -8192, 8192) ||
      !safeNumber(j.rotate ?? 0, -360, 360) || !safeNumber(j.scale ?? 1, .02, 50))
      err(path + "/transform", "invalid finite rest transform");
    if (j?.keys !== undefined) {
      if (!Array.isArray(j.keys) || j.keys.length > 120) err(path + "/keys", "keys must contain at most 120 entries");
      else {
        let previous = -1;
        for (const [k, key] of j.keys.entries()) {
          if (!key || !integer(key.frame) || key.frame <= previous || key.frame < 0 ||
            key.frame >= (s.durationFrames ?? 0) ||
            !safeNumber(key.x ?? 0, -8192, 8192) || !safeNumber(key.y ?? 0, -8192, 8192) ||
            !safeNumber(key.rotate ?? 0, -360, 360) || !safeNumber(key.scale ?? 1, .02, 50) ||
            (key.easing !== undefined && !["linear", "ease", "hold"].includes(key.easing)))
            err(path + "/keys/" + k, "keys must be sorted and finite inside the timeline");
          previous = key?.frame ?? previous;
        }
      }
    }
  }
  const links = new Map<string, string>();
  for (const [i, j] of s.joints!.entries()) {
    if (j?.parent !== undefined) {
      if (!jointIds.has(j.parent)) err("/joints/" + i + "/parent", "parent joint is missing");
      else links.set(j.id, j.parent);
    }
  }
  for (const [id] of links) {
    const visited = new Set<string>(), active = new Set<string>();
    const visit = (node: string): boolean => {
      if (active.has(node)) return true;
      if (visited.has(node)) return false;
      visited.add(node); active.add(node);
      const p = links.get(node);
      const cycle = p !== undefined && visit(p);
      active.delete(node);
      return cycle;
    };
    if (visit(id)) { err("/joints", "parent hierarchy contains a cycle"); break; }
  }
  for (const [i, part] of s.parts!.entries()) {
    const p = "/parts/" + i;
    if (!part || typeof part.id !== "string" || !SLUG.test(part.id) || parts.has(part.id))
      err(p + "/id", "part ID must be a unique slug");
    else parts.add(part.id);
    if (!part || !jointIds.has(part.joint)) err(p + "/joint", "part needs an existing joint");
    if (!part || typeof part.plate !== "string" || !SLUG.test(part.plate) ||
      (allowedPlates && !allowedPlates.includes(part.plate))) err(p + "/plate", "unknown ink plate");
    if (!part || !pathValid(part.d)) err(p + "/d", "SVG path must be a safe nonempty SVG path");
    if (part?.paint !== "solid" && part?.paint !== "screen") err(p + "/paint", "paint must be solid or screen");
    if (part?.opacity !== undefined && !safeNumber(part.opacity, 0, 1))
      err(p + "/opacity", "opacity must be 0..1");
    if (part?.expressions !== undefined) {
      if (!part.expressions || typeof part.expressions !== "object" || Array.isArray(part.expressions) ||
          Object.keys(part.expressions).length > 32) err(p + "/expressions", "invalid expression variants");
      else for (const [name, d] of Object.entries(part.expressions)) {
        if (!SLUG.test(name) || !pathValid(d)) err(p + "/expressions/" + name, "invalid expression path");
      }
    }
  }
  if (s.expressions !== undefined) {
    if (!Array.isArray(s.expressions) || s.expressions.length > 120) err("/expressions", "expression keys must be an array of at most 120");
    else {
      let previous = -1;
      for (const [i, e] of s.expressions.entries()) {
        if (!e || !integer(e.frame) || e.frame <= previous || e.frame < 0 ||
          e.frame >= (s.durationFrames ?? 0) || typeof e.name !== "string" || !SLUG.test(e.name))
          err("/expressions/" + i, "expression keys must be sorted and named");
        previous = e?.frame ?? previous;
      }
    }
  }
  return problems;
}
function jointAt(j: RisoJoint, frame: number): RisoMatrix {
  const keys = j.keys ?? [];
  if (!keys.length || frame < keys[0].frame) return matrix(j.x, j.y, j.rotate ?? 0, j.scale ?? 1);
  let i = 0;
  while (i + 1 < keys.length && keys[i + 1].frame <= frame) i++;
  const current = keys[i], next = keys[i + 1];
  const t = !next || current.easing === "hold" ? 0 :
    Math.max(0, Math.min(1, (frame - current.frame) / (next.frame - current.frame)));
  const easing = current.easing === "ease" ? smooth(t) : t;
  const get = (key: RisoJointKey, prop: "x" | "y" | "rotate" | "scale", fallback: number): number => key[prop] ?? fallback;
  const x = mix(get(current, "x", 0), next ? get(next, "x", 0) : get(current, "x", 0), easing);
  const y = mix(get(current, "y", 0), next ? get(next, "y", 0) : get(current, "y", 0), easing);
  const rot = mix(get(current, "rotate", 0), next ? get(next, "rotate", 0) : get(current, "rotate", 0), easing);
  const scale = mix(get(current, "scale", 1), next ? get(next, "scale", 1) : get(current, "scale", 1), easing);
  return matrix(j.x + x, j.y + y, (j.rotate ?? 0) + rot, (j.scale ?? 1) * scale);
}
export function evaluateRisoCharacter(
  spec: RisoCharacterSpec, frame: number, options: { reducedMotion?: boolean; allowedPlates?: readonly string[] } = {},
): RisoCharacterFrame {
  const issues = inspectRisoCharacter(spec, options.allowedPlates);
  if (issues.length) throw new RangeError(issues.map(p => p.path + ": " + p.message).join("; "));
  if (!integer(frame) || frame < 0) throw new RangeError("character frame must be a nonnegative integer");
  const raw = options.reducedMotion ? spec.durationFrames - 1 : Math.min(frame, spec.durationFrames - 1);
  // Reduced motion resolves the same final *printed cel* as ordinary playback.
  // Sampling an unheld final subframe makes the supposedly stable poster change.
  const sampledFrame = Math.floor(raw / (spec.cadence ?? 1)) * (spec.cadence ?? 1);
  let expression = "neutral";
  for (const key of spec.expressions ?? []) {
    if (key.frame <= sampledFrame) expression = key.name;
    else break;
  }
  const index = new Map(spec.joints.map(j => [j.id, j]));
  const world = new Map<string, RisoMatrix>();
  const resolve = (id: string): RisoMatrix => {
    const cached = world.get(id);
    if (cached) return cached;
    const j = index.get(id)!;
    const result = multiply(j.parent ? resolve(j.parent) : identity(), jointAt(j, sampledFrame));
    world.set(id, result);
    return result;
  };
  return {
    expression, sampledFrame,
    parts: spec.parts.map(p => {
      const m = resolve(p.joint);
      return {
        id: p.id, plate: p.plate, paint: p.paint, opacity: p.opacity ?? 1,
        d: p.expressions?.[expression] ?? p.d,
        transform: "matrix(" + [m.a, m.b, m.c, m.d, m.e, m.f].map(number).join(" ") + ")",
      };
    }),
  };
}
