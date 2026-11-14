import { inspectRisoPrint } from "./print-plates";
import type { RisoPrintSpec } from "./print-plates";

/** RISC1: story-independent actor rigs and layered scenery printed into existing RISO1 plates. */
export type RisoEase = "linear" | "smooth" | "hold";
export interface RisoTransform {
  x: number; y: number; rotate: number; scale: number;
}
export interface RisoPoseKey extends RisoTransform {
  frame: number;
  /** Interpolation from this key to the next key. */
  ease?: RisoEase;
}
export interface RisoMark {
  /** Original SVG silhouette. Authored in the local coordinates of its joint/layer. */
  d: string;
  ink: "solid" | "dots";
  opacity?: number;
}
export type RisoMarkSet = Readonly<Record<string, RisoMark>>;
export interface RisoVariantKey { frame: number; name: string }
export interface RisoJointSpec {
  id: string;
  parent?: string;
  /** Relative attachment point in parent space; [0,0] is the actor origin for roots. */
  pivot: readonly [number, number];
  /** Parts are drawn in ascending z-order within their own parent. */
  z?: number;
  marks?: RisoMarkSet;
  /** Authored silhouette redraws for mouth, eyes, turns, costumes, etc. */
  variants?: Readonly<Record<string, RisoMarkSet>>;
  variantKeys?: readonly RisoVariantKey[];
  motion?: readonly RisoPoseKey[];
  /** An authored seamless motion cycle; requires matching first/last keys. */
  cycleFrames?: number;
}
export interface RisoActorSpec {
  id: string;
  /** Absolute world origin; no rig, body structure, or species is hard-coded. */
  origin: readonly [number, number];
  cadence?: 1 | 2 | 3 | 4;
  motion?: readonly RisoPoseKey[];
  joints: readonly RisoJointSpec[];
}
export interface RisoPathLayer {
  id: string;
  kind: "path";
  plate: string;
  d: string;
  ink: "solid" | "dots";
  opacity?: number;
  z?: number;
  /** 0 means stationary world layer; 1 follows the regular scene camera. */
  parallax?: number;
  motion?: readonly RisoPoseKey[];
  screenSpace?: boolean;
}
export interface RisoTextLayer {
  id: string;
  kind: "text";
  plate: string;
  lines: readonly string[];
  x: number; y: number;
  fontSize: number;
  lineHeight?: number;
  fontFamily?: "serif" | "sans" | "mono";
  weight?: 400 | 500 | 600 | 700 | 800;
  anchor?: "start" | "middle" | "end";
  z?: number;
  screenSpace?: boolean;
  motion?: readonly RisoPoseKey[];
}
export type RisoSceneLayer = RisoPathLayer | RisoTextLayer;
export interface RisoCameraKey {
  frame: number; focusX: number; focusY: number; zoom: number;
  ease?: RisoEase;
}
export interface RisoCharacterSceneSpec {
  version: 1;
  id: string;
  durationFrames: number;
  /** Original printed background, with 2 or 3 named spot plates. */
  print: RisoPrintSpec;
  actors: readonly RisoActorSpec[];
  layers: readonly RisoSceneLayer[];
  camera?: readonly RisoCameraKey[];
}
export interface RisoSceneIssue {
  code: string;
  path: string;
  message: string;
}
export interface RisoEvaluatedJoint {
  id: string;
  parent?: string;
  pivot: readonly [number, number];
  pose: RisoTransform;
  marks: RisoMarkSet;
  z: number;
}
export interface RisoEvaluatedActor {
  id: string;
  poseFrame: number;
  origin: readonly [number, number];
  pose: RisoTransform;
  joints: readonly RisoEvaluatedJoint[];
}
export interface RisoEvaluatedCamera { x: number; y: number; zoom: number }
export interface RisoEvaluatedScene {
  frame: number;
  camera: RisoEvaluatedCamera;
  actors: readonly RisoEvaluatedActor[];
}
const SLUG = /^[a-z][a-z0-9-]{0,63}$/;
const SAFE_PATH = /^[0-9.eE,\s+\-MmLlHhVvCcSsQqTtAaZz]+$/;
const validPath = (d: unknown): d is string => typeof d === "string" &&
  d.length > 0 && d.length <= 20000 && SAFE_PATH.test(d) && /[Mm]/.test(d);
const validNumber = (x: unknown): x is number => typeof x === "number" && Number.isFinite(x);
const between = (x: unknown, a: number, b: number): boolean => validNumber(x) && x >= a && x <= b;
const inScene = (value: unknown, duration: number): boolean =>
  Number.isSafeInteger(value) && (value as number) >= 0 && (value as number) < duration;
const same = (a: RisoTransform, b: RisoTransform) =>
  a.x === b.x && a.y === b.y && a.rotate === b.rotate && a.scale === b.scale;
const validPose = (k: unknown): k is RisoPoseKey => {
  if (!k || typeof k !== "object") return false;
  const p = k as RisoPoseKey;
  return between(p.x, -8192, 8192) && between(p.y, -8192, 8192) &&
    between(p.rotate, -720, 720) && between(p.scale, .05, 8) &&
    (p.ease === undefined || ["linear","smooth","hold"].includes(p.ease));
};
const inspectKeys = (
  keys: readonly RisoPoseKey[] | undefined, duration: number, path: string,
  fail: (code: string, path: string, message: string) => void, cycle?: number,
) => {
  if (keys === undefined) return;
  if (!Array.isArray(keys) || keys.length < 1 || keys.length > 96) {
    fail("motion-keys", path, "Supply 1..96 ordered transform keys."); return;
  }
  let previous = -1;
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    if (!key || !inScene(key.frame, duration) || key.frame <= previous || !validPose(key))
      fail("motion-key", path + "/" + i, "Keys must be sorted, finite, and within the scene.");
    previous = key?.frame ?? previous;
  }
  if (cycle !== undefined && keys.length) {
    if (keys[0]?.frame !== 0 || keys[keys.length - 1]?.frame !== cycle ||
        !same(keys[0], keys[keys.length - 1]))
      fail("cycle-seam", path, "Cycle needs matching first/last keys at frames 0 and cycleFrames.");
  }
};
function marksOk(
  marks: RisoMarkSet | undefined, path: string, plates: Set<string>,
  fail: (code: string, path: string, message: string) => void,
) {
  if (!marks || typeof marks !== "object" || Array.isArray(marks) ||
      Object.keys(marks).length === 0) {
    fail("marks", path, "A visible part or variant requires at least one spot-ink mark."); return;
  }
  for (const [plate, mark] of Object.entries(marks)) {
    const at = path + "/" + plate;
    if (!plates.has(plate)) fail("unknown-plate", at, "The mark must target a declared spot-ink plate.");
    if (!mark || !validPath(mark.d)) fail("path", at + "/d", "Use an original valid SVG path of at most 20k characters.");
    if (!mark || (mark.ink !== "solid" && mark.ink !== "dots")) fail("ink", at + "/ink", "Ink must be solid or dots.");
    if (mark?.opacity !== undefined && !between(mark.opacity, 0, 1))
      fail("opacity", at + "/opacity", "Opacity must be in 0..1.");
  }
}
/** Validate untrusted JSON before rendering or compiling. No fake default actor is synthesized. */
export function inspectRisoCharacterScene(value: unknown): RisoSceneIssue[] {
  const errors: RisoSceneIssue[] = [];
  const fail = (code: string, path: string, message: string) => errors.push({ code, path, message });
  if (!value || typeof value !== "object" || Array.isArray(value))
    return [{ code: "scene", path: "/", message: "A RISC1 object is required." }];
  const scene = value as Partial<RisoCharacterSceneSpec>;
  if (scene.version !== 1) fail("version", "/version", "Scene version must be 1.");
  if (typeof scene.id !== "string" || !SLUG.test(scene.id))
    fail("id", "/id", "Scene requires a stable slug.");
  if (!Number.isSafeInteger(scene.durationFrames) || (scene.durationFrames ?? 0) < 2 ||
      (scene.durationFrames ?? 0) > 36000)
    fail("duration", "/durationFrames", "Scene duration must be 2..36000 frames.");
  const duration = Number.isSafeInteger(scene.durationFrames) ? scene.durationFrames! : 0;
  let plateIds = new Set<string>();
  if (!scene.print || typeof scene.print !== "object") fail("print", "/print", "A RISO1 printing spec is required.");
  else {
    try {
      for (const issue of inspectRisoPrint(scene.print))
        fail("print-" + issue.code, "/print" + issue.path, issue.message);
      if (Array.isArray(scene.print.plates))
        plateIds = new Set(scene.print.plates.filter(p => !!p && typeof p.id === "string").map(p => p.id));
    } catch { fail("print", "/print", "Malformed RISO1 specification."); }
  }
  if (!Array.isArray(scene.actors) || scene.actors.length > 24)
    fail("actors", "/actors", "Supply 0..24 actors.");
  else {
    const ids = new Set<string>();
    (scene.actors as RisoActorSpec[]).forEach((actor, i) => {
      const at = "/actors/" + i;
      if (!actor || typeof actor.id !== "string" || !SLUG.test(actor.id) || ids.has(actor.id))
        fail("actor-id", at + "/id", "Actor IDs must be unique slugs.");
      else ids.add(actor.id);
      if (!actor || !Array.isArray(actor.origin) || actor.origin.length !== 2 ||
          !actor.origin.every((n: number) => between(n, -8192, 8192)))
        fail("actor-origin", at + "/origin", "Origin needs two finite scene-space coordinates.");
      if (actor?.cadence !== undefined && ![1,2,3,4].includes(actor.cadence))
        fail("cadence", at + "/cadence", "Cadence must be 1..4 held frames.");
      inspectKeys(actor?.motion, duration, at + "/motion", fail);
      if (!Array.isArray(actor?.joints) || actor.joints.length === 0 || actor.joints.length > 72) {
        fail("joints", at + "/joints", "Rig requires 1..72 joint layers."); return;
      }
      const jointIds = new Set<string>();
      const joints = actor.joints as RisoJointSpec[];
      for (const [j, joint] of joints.entries()) {
        const p = at + "/joints/" + j;
        if (!joint || typeof joint.id !== "string" || !SLUG.test(joint.id) || jointIds.has(joint.id))
          fail("joint-id", p + "/id", "Each joint requires a unique slug.");
        else jointIds.add(joint.id);
        if (!joint || !Array.isArray(joint.pivot) || joint.pivot.length !== 2 ||
            !joint.pivot.every((n: number) => between(n, -8192, 8192)))
          fail("pivot", p + "/pivot", "Pivot must be a finite [x,y] attachment.");
        if (joint?.z !== undefined && (!Number.isSafeInteger(joint.z) || Math.abs(joint.z) > 100))
          fail("z", p + "/z", "Layer z must be an integer within -100..100.");
        if (joint?.cycleFrames !== undefined && (!Number.isSafeInteger(joint.cycleFrames) ||
            joint.cycleFrames < 2 || joint.cycleFrames >= duration))
          fail("cycle", p + "/cycleFrames", "Cycle length must be 2..duration-1.");
        inspectKeys(joint?.motion, duration, p + "/motion", fail, joint?.cycleFrames);
        if (!joint?.marks && !joint?.variants)
          fail("marks", p, "Joint needs authored marks or expression variants.");
        if (joint?.marks) marksOk(joint.marks, p + "/marks", plateIds, fail);
        if (joint?.variants) {
          if (typeof joint.variants !== "object" || Array.isArray(joint.variants) ||
              Object.keys(joint.variants).length < 1 || Object.keys(joint.variants).length > 24)
            fail("variants", p + "/variants", "Use 1..24 named expression variants.");
          else Object.entries(joint.variants).forEach(([name, marks]) => {
            if (!SLUG.test(name)) fail("variant-id", p + "/variants/" + name, "Variant IDs must be slugs.");
            marksOk(marks as RisoMarkSet, p + "/variants/" + name, plateIds, fail);
          });
        }
        if (joint?.variantKeys !== undefined) {
          if (!Array.isArray(joint.variantKeys) || joint.variantKeys.length > 96 ||
              joint.variantKeys.length < 1)
            fail("variant-keys", p + "/variantKeys", "Expression keys require 1..96 entries.");
          else {
            let prev = -1;
            (joint.variantKeys as RisoVariantKey[]).forEach((k, n) => {
              if (!k || !inScene(k.frame, duration) || k.frame <= prev ||
                  typeof k.name !== "string" || !joint.variants ||
                  !(k.name in joint.variants))
                fail("variant-key", p + "/variantKeys/" + n, "Expression keys must be sorted and reference existing variants.");
              prev = k?.frame ?? prev;
            });
          }
        }
      }
      // Parent links may be unordered but must be present and acyclic.
      const byId = new Map<string,RisoJointSpec>(joints.filter(j => !!j && typeof j.id === "string").map(j => [j.id, j]));
      for (const [j, joint] of joints.entries()) {
        const atJoint = at + "/joints/" + j;
        if (!joint) continue;
        if (joint.parent && !byId.has(joint.parent)) fail("parent", atJoint + "/parent", "Missing parent joint.");
        let cursor: RisoJointSpec | undefined = joint, depth = 0;
        const ancestors = new Set<string>();
        while (cursor?.parent && depth <= 72) {
          if (ancestors.has(cursor.id) || cursor.parent === cursor.id) {
            fail("cycle", atJoint + "/parent", "Joint hierarchy must not have cycles."); break;
          }
          ancestors.add(cursor.id);
          cursor = byId.get(cursor.parent);
          depth++;
        }
        if (depth > 16) fail("depth", atJoint, "Joint parenting depth must not exceed 16.");
      }
    });
  }
  if (!Array.isArray(scene.layers) || scene.layers.length > 160)
    fail("layers", "/layers", "Supply 0..160 original scene layers.");
  else {
    const layerIds = new Set<string>();
    (scene.layers as RisoSceneLayer[]).forEach((layer, i) => {
      const p = "/layers/" + i;
      if (!layer || typeof layer !== "object") {
        fail("layer", p, "Layer must be an object."); return;
      }
      if (typeof layer.id !== "string" || !SLUG.test(layer.id) || layerIds.has(layer.id))
        fail("layer-id", p + "/id", "Layer ID must be a unique slug.");
      else layerIds.add(layer.id);
      if (!plateIds.has(layer.plate)) fail("layer-plate", p + "/plate", "Layer plate must exist in RISO1 print.");
      if (layer.z !== undefined && (!Number.isSafeInteger(layer.z) || Math.abs(layer.z) > 100))
        fail("layer-z", p + "/z", "Layer z must be between -100..100.");
      inspectKeys(layer.motion, duration, p + "/motion", fail);
      if (layer.kind === "path") {
        if (!validPath(layer.d)) fail("layer-path", p + "/d", "Layer path is missing or unsafe.");
        if (layer.ink !== "solid" && layer.ink !== "dots") fail("layer-ink", p + "/ink", "Choose solid or dots.");
        if (layer.opacity !== undefined && !between(layer.opacity, 0, 1))
          fail("layer-opacity", p + "/opacity", "Layer opacity must be 0..1.");
        if (layer.parallax !== undefined && !between(layer.parallax, 0, 2))
          fail("parallax", p + "/parallax", "Parallax must be within 0..2.");
      } else if (layer.kind === "text") {
        if (!Array.isArray(layer.lines) || layer.lines.length < 1 || layer.lines.length > 6 ||
            layer.lines.some((s: string) => typeof s !== "string" || s.length === 0 || s.length > 160))
          fail("text", p + "/lines", "Supply 1..6 readable text lines (max 160 characters each).");
        if (!between(layer.x, -8192, 8192) || !between(layer.y, -8192, 8192) ||
            !between(layer.fontSize, 8, 240))
          fail("text-placement", p, "Text must have finite position and 8..240 font size.");
        if (layer.lineHeight !== undefined && !between(layer.lineHeight, .8, 2))
          fail("text-height", p + "/lineHeight", "Line height must be .8..2.");
        if (layer.fontFamily !== undefined && !["serif","sans","mono"].includes(layer.fontFamily))
          fail("text-family", p + "/fontFamily", "Only portable font-family roles are supported.");
        if (layer.anchor !== undefined && !["start","middle","end"].includes(layer.anchor))
          fail("text-anchor", p + "/anchor", "Choose start, middle or end.");
      } else fail("layer-kind", p + "/kind", "Layer kind must be path or text.");
    });
  }
  if (scene.camera !== undefined) {
    if (!Array.isArray(scene.camera) || scene.camera.length < 1 || scene.camera.length > 60)
      fail("camera", "/camera", "Camera needs 1..60 sorted keys.");
    else {
      let previous = -1;
      (scene.camera as RisoCameraKey[]).forEach((k, i) => {
        if (!k || !inScene(k.frame, duration) || k.frame <= previous ||
            !between(k.focusX, -8192, 8192) || !between(k.focusY, -8192, 8192) ||
            !between(k.zoom, .35, 5) ||
            (k.ease !== undefined && !["linear","smooth","hold"].includes(k.ease)))
          fail("camera-key", "/camera/" + i, "Invalid camera key, zoom, timing or easing.");
        previous = k?.frame ?? previous;
      });
    }
  }
  return errors;
}
export function assertRisoCharacterScene(value: unknown): asserts value is RisoCharacterSceneSpec {
  const issues = inspectRisoCharacterScene(value);
  if (issues.length) throw new RangeError(issues.map(i => i.path + ": " + i.message).join("; "));
}
const smooth = (t: number) => { const p = Math.max(0, Math.min(1, t)); return p*p*(3-2*p); };
const IDENTITY: RisoTransform = { x:0, y:0, rotate:0, scale:1 };
/** Immutable absolute-frame tween. The left key owns easing, with an explicit hold. */
export function sampleRisoMotion(keys: readonly RisoPoseKey[] | undefined, frame: number,
  cycleFrames?: number): RisoTransform {
  if (!keys?.length) return IDENTITY;
  const local = cycleFrames ? ((frame % cycleFrames) + cycleFrames) % cycleFrames : frame;
  if (local <= keys[0].frame) return keys[0];
  if (local >= keys[keys.length-1].frame) return keys[keys.length-1];
  let i = 0;
  while (i + 1 < keys.length && keys[i+1].frame <= local) i++;
  const a = keys[i], b = keys[Math.min(keys.length-1,i+1)];
  const fraction = (local-a.frame)/(b.frame-a.frame);
  const t = a.ease === "hold" ? 0 : a.ease === "linear" ? fraction : smooth(fraction);
  return { x:a.x+(b.x-a.x)*t, y:a.y+(b.y-a.y)*t,
    rotate:a.rotate+(b.rotate-a.rotate)*t, scale:a.scale+(b.scale-a.scale)*t };
}
export function evaluateRisoCharacterScene(
  spec: RisoCharacterSceneSpec, frame: number, reducedMotion = false,
): RisoEvaluatedScene {
  if (!Number.isSafeInteger(frame) || frame < 0) throw new RangeError("Scene frame must be a nonnegative integer.");
  const actual = reducedMotion ? spec.durationFrames-1 : Math.min(frame, spec.durationFrames-1);
  const camera = (() => {
    const keys = spec.camera;
    if (!keys?.length) return {x:spec.print.width/2,y:spec.print.height/2,zoom:1};
    if (actual <= keys[0].frame) return {x:keys[0].focusX,y:keys[0].focusY,zoom:keys[0].zoom};
    if (actual >= keys[keys.length-1].frame)
      return {x:keys[keys.length-1].focusX,y:keys[keys.length-1].focusY,zoom:keys[keys.length-1].zoom};
    let i=0;while (i+1<keys.length && keys[i+1].frame<=actual) i++;
    const a=keys[i], b=keys[i+1], f=(actual-a.frame)/(b.frame-a.frame);
    const t=a.ease==="hold"?0:a.ease==="linear"?f:smooth(f);
    return {x:a.focusX+(b.focusX-a.focusX)*t,y:a.focusY+(b.focusY-a.focusY)*t,
      zoom:a.zoom+(b.zoom-a.zoom)*t};
  })();
  const actors=spec.actors.map(actor=>{
    const poseFrame = Math.floor(actual/(actor.cadence??1))*(actor.cadence??1);
    return {id:actor.id,poseFrame,origin:actor.origin,
      pose:sampleRisoMotion(actor.motion,poseFrame),
      joints:actor.joints.map(joint=>{
        let variant: string | undefined;
        for (const key of joint.variantKeys??[]) if (key.frame<=poseFrame) variant=key.name;
        return {id:joint.id,parent:joint.parent,pivot:joint.pivot,
          pose:sampleRisoMotion(joint.motion,poseFrame,joint.cycleFrames),
          marks:(variant ? joint.variants?.[variant] : undefined) ?? joint.marks ??
            joint.variants?.[Object.keys(joint.variants)[0]] ?? {},
          z:joint.z??0};
      })};
  });
  return {frame:actual,camera,actors};
}
