import { applyRisoIK } from "./riso-rig-ik";
import { risoJointSkinPath } from "./riso-joint-skin";
import { evaluateRisoPathMorph, inspectRisoPathMorph } from "./riso-path-morph";
import type { RisoPathMorphKey } from "./riso-path-morph";
import type { RisoJointSkin } from "./riso-joint-skin";
import type { RisoIKDiagnostic, RisoTwoBoneIK } from "./riso-rig-ik";

/**
 * RISO2: general ink-separated, pose-keyed animation character.
 * The character is data. All anatomy, plate composition, motion, expressions,
 * and layer ordering are supplied by authors; there is no fixed "person" skeleton.
 */
export type RisoInkLayer = "solid" | "screen";
/** Source-authored value separation inside a single physical stencil plate.
 * Extra tones vary deposited DOT AREA, never artwork opacity or RGB blending.
 */
export type RisoScreenTone = "light" | "mid";
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
  /** Original 2D Bézier source-geometry keys, strict matching command topology.
   * RISO51 interpolates *the ink silhouette*, not transparency or a filter.
   * Used only when this part has no expression override or joint skin.
   */
  pathKeys?: readonly RisoPathMorphKey[];
  paint: RisoInkLayer;
  /** Optional physically screened finer facial value. Non-screen parts cannot carry it. */
  screenTone?: RisoScreenTone;
  opacity?: number;
  /** Draw this contour only as paper clearance, not as an ink deposit. */
  knockoutOnly?: boolean;
  /** Optional rounded, deforming contour from this joint to its child. */
  skin?: RisoJointSkin;
}
export interface RisoCharacterSpec {
  version: 1;
  id: string;
  durationFrames: number;
  /** Object-space drawing coordinates. Authors can use any anatomy or subject. */
  joints: readonly RisoJoint[];
  parts: readonly RisoCharacterPart[];
  expressions?: readonly RisoExpressionKey[];
  /** Optional, anatomy-independent analytic constraints for legs, arms or props. */
  ik?: readonly RisoTwoBoneIK[];
  /** Printed flipbook holds frames. 1 means native film cadence. */
  cadence?: 1 | 2 | 3 | 4;
}
export interface RisoCharacterIssue { path: string; message: string }
export interface RisoMatrix { a: number; b: number; c: number; d: number; e: number; f: number }
export interface RisoPartFrame {
  id: string;
  plate: string;
  paint: RisoInkLayer;
  screenTone?: RisoScreenTone;
  opacity: number;
  knockoutOnly: boolean;
  d: string;
  transform: string;
}
export interface RisoJointFrame { id: string; parent?: string; x: number; y: number; angle: number; /** Exact IK-solved world transform for geometry studies. */ matrix: RisoMatrix }
export interface RisoCharacterFrame {
  expression: string;
  parts: readonly RisoPartFrame[];
  sampledFrame: number;
  /** Unrounded joint positions support optional animator diagnostics. */
  joints: readonly RisoJointFrame[];
  ik: readonly RisoIKDiagnostic[];
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
  // RISO31: original detailed hands now contain PIP/DIP source plates, not
  // flattened textures. Keep an explicit finite budget while permitting up
  // to 192 genuinely named print paths in one full-film character.
  if (!Array.isArray(s.parts) || s.parts.length < 1 || s.parts.length > 192)
    err("/parts", "provide 1..192 authored ink parts");
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
  const byJoint = new Map(s.joints!.filter(Boolean).map(j => [j.id, j]));
  for (const [i, part] of s.parts!.entries()) {
    const p = "/parts/" + i;
    if (!part || typeof part.id !== "string" || !SLUG.test(part.id) || parts.has(part.id))
      err(p + "/id", "part ID must be a unique slug");
    else parts.add(part.id);
    if (!part || !jointIds.has(part.joint)) err(p + "/joint", "part needs an existing joint");
    if (!part || typeof part.plate !== "string" || !SLUG.test(part.plate) ||
      (allowedPlates && !allowedPlates.includes(part.plate))) err(p + "/plate", "unknown ink plate");
    if (!part || !pathValid(part.d)) err(p + "/d", "SVG path must be a safe nonempty SVG path");
    if (part?.pathKeys !== undefined) {
      if (!Array.isArray(part.pathKeys)) err(p + "/pathKeys", "morph source samples must be an array");
      else if (part.skin) err(p + "/pathKeys", "morph and joint skin cannot share a source part");
      else if (!pathValid(part.d)) err(p + "/pathKeys", "cannot morph an invalid original path");
      else {
        const issue = inspectRisoPathMorph(part.d, part.pathKeys, s.durationFrames ?? 0);
        if (issue) err(p + "/pathKeys", issue);
      }
    }
    if (part?.paint !== "solid" && part?.paint !== "screen") err(p + "/paint", "paint must be solid or screen");
    if (part?.screenTone !== undefined &&
        (part.paint !== "screen" || (part.screenTone !== "light" && part.screenTone !== "mid")))
      err(p + "/screenTone", "screenTone light/mid requires a screened ink part");
    if (part?.opacity !== undefined && !safeNumber(part.opacity, 0, 1))
      err(p + "/opacity", "opacity must be 0..1");
    if (part?.knockoutOnly !== undefined && typeof part.knockoutOnly !== "boolean")
      err(p + "/knockoutOnly", "knockoutOnly must be a boolean");
    if (part?.skin !== undefined) {
      const skin = part.skin;
      const tip = byJoint.get(skin?.tipJoint);
      if (!skin || !tip || tip.parent !== part.joint ||
          !safeNumber(skin.baseWidth, .5, 120) || !safeNumber(skin.tipWidth, .5, 120) ||
          !safeNumber(skin.overlap ?? 2, 0, 16) || !safeNumber(skin.bow ?? 0, -30, 30))
        err(p + "/skin", "skin requires a direct child joint and bounded positive contour dimensions");
    }
    if (part?.expressions !== undefined) {
      if (!part.expressions || typeof part.expressions !== "object" || Array.isArray(part.expressions) ||
          Object.keys(part.expressions).length > 32) err(p + "/expressions", "invalid expression variants");
      else for (const [name, d] of Object.entries(part.expressions)) {
        if (!SLUG.test(name) || !pathValid(d)) err(p + "/expressions/" + name, "invalid expression path");
      }
    }
  }
  if (s.ik !== undefined) {
    if (!Array.isArray(s.ik) || s.ik.length > 24) err("/ik", "IK must contain at most 24 two-bone constraints");
    else {
      const ids = new Set<string>(), used = new Set<string>();
      const byId = new Map(s.joints!.filter(Boolean).map(j => [j.id, j]));
      const ikRoots = new Set(s.ik.filter(Boolean).map(item => item.root));
      for (const [i, constraint] of s.ik.entries()) {
        const p = "/ik/" + i;
        if (!constraint || typeof constraint.id !== "string" || !SLUG.test(constraint.id) || ids.has(constraint.id))
          err(p + "/id", "IK constraint id must be a unique slug");
        else ids.add(constraint.id);
        if (!constraint || ![constraint.root, constraint.mid, constraint.end].every(id => byId.has(id)) ||
            byId.get(constraint.mid)?.parent !== constraint.root ||
            byId.get(constraint.end)?.parent !== constraint.mid)
          err(p + "/chain", "IK chain must be a direct root -> mid -> end parent hierarchy");
        else {
          for (const joint of [constraint.root, constraint.mid, constraint.end]) {
            if (used.has(joint)) err(p + "/chain", "IK chains cannot share constrained joints");
            used.add(joint);
          }
          const mid = byId.get(constraint.mid)!, end = byId.get(constraint.end)!;
          if (Math.hypot(mid.x, mid.y) < 1e-4 || Math.hypot(end.x, end.y) < 1e-4)
            err(p + "/chain", "IK upper and lower bones must have nonzero rest lengths");
        }
        if (constraint?.bend !== 1 && constraint?.bend !== -1) err(p + "/bend", "bend must be 1 or -1");
        if (constraint?.endRotation !== undefined && !safeNumber(constraint.endRotation, -360, 360))
          err(p + "/endRotation", "endRotation must be within -360..360 degrees");
        const target = constraint?.target;
        if (target?.kind === "walk") {
          if (!integer(target.startFrame) || !integer(target.endFrame) || target.startFrame < 0 ||
              target.endFrame <= target.startFrame || target.endFrame >= (s.durationFrames ?? 0) ||
              !integer(target.cycleFrames) || !safeNumber(target.cycleFrames, 8, 240) ||
              !integer(target.stanceFrames) || target.stanceFrames < 2 || target.stanceFrames >= target.cycleFrames - 1 ||
              !integer(target.phaseFrames ?? 0) || !safeNumber(target.phaseFrames ?? 0, 0, target.cycleFrames - 1) ||
              !safeNumber(target.initialX, -8192, 8192) || !safeNumber(target.groundY, -8192, 8192) ||
              !safeNumber(target.stride, -300, 300) || !safeNumber(target.lift, 0, 150) ||
              !safeNumber(target.footRoll ?? 0, 0, 45))
            err(p + "/target", "walk target requires finite bounds, a valid stance/swing cycle and film interval");
        } else if (target?.kind === "keys") {
          if (!Array.isArray(target.keys) || target.keys.length < 1 || target.keys.length > 240)
            err(p + "/target/keys", "IK position keys require 1..240 entries");
          else {
            let previous = -1;
            for (const [k, key] of target.keys.entries()) {
              if (!key || !integer(key.frame) || key.frame <= previous || key.frame < 0 ||
                  key.frame >= (s.durationFrames ?? 0) || !safeNumber(key.x, -8192, 8192) ||
                  !safeNumber(key.y, -8192, 8192) ||
                  (key.easing !== undefined && !["linear", "ease", "hold"].includes(key.easing)))
                err(p + "/target/keys/" + k, "IK keys must be increasing finite positions inside the film");
              previous = key?.frame ?? previous;
            }
          }
        } else if (target?.kind === "follow") {
          if (!byId.has(target.joint) || !safeNumber(target.x, -8192, 8192) ||
              !safeNumber(target.y, -8192, 8192))
            err(p + "/target", "follow target needs an existing joint and finite local attachment coordinates");
          else {
            // Prevent the target from being moved by the very IK chain following it.
            // A prop attached to a sibling/body joint is fine; a descendant of
            // the constrained root creates a feedback loop.
            const chainAncestors = new Set<string>();
            let ancestor: string | undefined = target.joint;
            while (ancestor && !chainAncestors.has(ancestor)) {
              chainAncestors.add(ancestor);
              ancestor = byId.get(ancestor)?.parent;
            }
            if ([...ikRoots].some(root => chainAncestors.has(root)))
              err(p + "/target", "follow target cannot be inside any IK-constrained joint subtree");
          }
        } else err(p + "/target", "IK target must be a keyed position, walk cycle or joint follower");
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
/**
 * Validation verdicts per spec object and plate list. A spec is immutable data (every field is readonly), and full
 * validation re-parses every path and morph key, which cost ~80% of each frame once RISO51 added path morphs. A film
 * evaluates the same spec hundreds of times, so the verdict is computed once per spec object.
 */
const validated = new WeakMap<object, Map<string, string>>();
function assertValidRisoCharacter(spec: RisoCharacterSpec, allowedPlates?: readonly string[]) {
  const cacheable = typeof spec === "object" && spec !== null;
  const key = allowedPlates ? allowedPlates.join("\u0000") : "";
  let byPlates = cacheable ? validated.get(spec) : undefined;
  let message = byPlates?.get(key);
  if (message === undefined) {
    message = inspectRisoCharacter(spec, allowedPlates).map(p => p.path + ": " + p.message).join("; ");
    if (cacheable) {
      if (!byPlates) validated.set(spec, byPlates = new Map());
      byPlates.set(key, message);
    }
  }
  if (message) throw new RangeError(message);
}
export function evaluateRisoCharacter(
  spec: RisoCharacterSpec, frame: number, options: {
    reducedMotion?: boolean; allowedPlates?: readonly string[]; disableIK?: boolean;
  } = {},
): RisoCharacterFrame {
  assertValidRisoCharacter(spec, options.allowedPlates);
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
  // Resolve all parents before applying a constrained rotation to a subtree.
  for (const joint of spec.joints) resolve(joint.id);
  const ik = options.disableIK ? [] : applyRisoIK(spec.joints, world, spec.ik ?? [], sampledFrame);
  // Many parts share a joint; format each joint's transform once per frame.
  const transforms = new Map<string, string>();
  const transformOf = (joint: string) => {
    let t = transforms.get(joint);
    if (t === undefined) {
      const m = resolve(joint);
      transforms.set(joint, t = "matrix(" + [m.a, m.b, m.c, m.d, m.e, m.f].map(number).join(" ") + ")");
    }
    return t;
  };
  return {
    expression, sampledFrame, ik,
    joints: spec.joints.map(j => {
      const m = world.get(j.id)!;
      return { id: j.id, parent: j.parent, x: m.e, y: m.f,
        angle: Math.atan2(m.b, m.a) * 180 / Math.PI, matrix: { ...m } };
    }),
    parts: spec.parts.map(p => {
      const m = resolve(p.joint);
      return {
        id: p.id, plate: p.plate, paint: p.paint, screenTone: p.screenTone, opacity: p.opacity ?? 1,
        knockoutOnly: p.knockoutOnly ?? false,
        // The skin already resolves into world-stage coordinates; a second
        // joint transform would incorrectly rotate or translate it twice.
        d: p.skin ? risoJointSkinPath(m, resolve(p.skin.tipJoint), p.skin)
          : (p.expressions?.[expression] ??
            (p.pathKeys ? evaluateRisoPathMorph(p.pathKeys, sampledFrame) : p.d)),
        transform: p.skin ? "matrix(1 0 0 1 0 0)" : transformOf(p.joint),
      };
    }),
  };
}
