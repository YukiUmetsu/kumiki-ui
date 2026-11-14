import { assertCrayonOptions } from "./crayon";
import type { CrayonBounds } from "./crayon";

/**
 * Serializable, medium-native authored scene contract.
 * A scene can illustrate any subject with original SVG paths, contours, copy and camera keys.
 * There is no implicit clock, remote media, arbitrary executable hook or generated character identity.
 */
export type CrayonColor = `#${string}`;
export interface CrayonTiming { start: number; end: number }
export interface CrayonPlacement {
  x?: number; y?: number; scale?: number; rotate?: number;
}
/** Animate semantic elements independently while preserving a stable wax stroke seed. */
export interface CrayonMotionKey {
  frame: number;
  x: number; y: number;
  scale?: number; rotate?: number;
}
export interface CrayonBase {
  id: string;
  timing: CrayonTiming;
  placement?: CrayonPlacement;
  screenSpace?: boolean;
  motion?: readonly CrayonMotionKey[];
  /** Number of held source frames per drawing pose. Camera and brush remain frame-accurate. */
  poseCadence?: 1 | 2 | 3 | 4;
}
export interface CrayonWaxElement extends CrayonBase {
  kind: "wax";
  d: string;
  bounds: CrayonBounds;
  colors: readonly [CrayonColor, CrayonColor, CrayonColor];
  pressure?: number;
  spacing?: number;
  /** Authored wax-rubbing direction in degrees. */
  angle?: number;
}
export interface CrayonContourElement extends CrayonBase {
  kind: "contour";
  d: string;
  color: CrayonColor;
  width: number;
  opacity?: number;
}
export interface CrayonLetteringElement extends CrayonBase {
  kind: "lettering";
  lines: readonly string[];
  x: number; y: number;
  fontSize: number; lineHeight?: number;
  family?: "serif" | "sans" | "mono";
  weight?: 400 | 500 | 600 | 700 | 800;
  anchor?: "start" | "middle" | "end";
  color: CrayonColor;
  /** Contrast backing for captions against visually complex wax. */
  backing?: { color: CrayonColor; padding: number; width: number; height: number; radius?: number };
}
export type CrayonElement = CrayonWaxElement | CrayonContourElement | CrayonLetteringElement;

export interface CrayonCameraKey {
  frame: number;
  focusX: number; focusY: number; zoom: number;
}
export interface CrayonSceneSpec {
  version: 1;
  id: string;
  width: number; height: number;
  durationFrames: number;
  seed: number;
  paper: CrayonColor;
  paperTooth?: number;
  elements: readonly CrayonElement[];
  /** Camera keys live in authored scene coordinates; paper and drawing move as one. */
  camera?: readonly CrayonCameraKey[];
}
export interface CrayonCameraState {
  x: number; y: number; scale: number;
}
const validHex = (s: string): boolean => /^#[0-9a-fA-F]{6}$/.test(s);
const finite = (n: number): boolean => Number.isFinite(n);
const int = (n: number): boolean => Number.isSafeInteger(n);
const pathSafe = (d: string): boolean =>
  d.length > 0 && d.length <= 25000 &&
  /^[0-9.,+\-\sMmLlHhVvCcSsQqTtAaZzEe]+$/.test(d) &&
  /[Mm]/.test(d);
const checkColor = (s: string, what: string, errors: string[]) => {
  if (!validHex(s)) errors.push(what + " must be a 6-digit hex color");
};
const checkTime = (t: CrayonTiming, duration: number, prefix: string, errors: string[]) => {
  if (!t || !int(t.start) || !int(t.end) || t.start < 0 || t.end <= t.start || t.end > duration - 1)
    errors.push(prefix + ".timing must lie within the scene duration with end > start");
};
/** Accept JSON data at the public boundary; never trust TypeScript assertions for authored content. */
export function inspectCrayonScene(input: unknown): string[] {
  const errors: string[] = [];
  if (!input || typeof input !== "object" || Array.isArray(input)) return ["scene must be an object"];
  const v = input as Partial<CrayonSceneSpec>;
  if (v.version !== 1) errors.push("version must be 1");
  if (typeof v.id !== "string" || !/^[a-z][a-z0-9-]{1,63}$/.test(v.id)) errors.push("id must be a stable slug");
  if (!int(v.width!) || v.width! < 64 || v.width! > 4096 || !int(v.height!) || v.height! < 64 || v.height! > 4096)
    errors.push("width and height must be between 64 and 4096");
  if (!int(v.durationFrames!) || v.durationFrames! < 2 || v.durationFrames! > 36000)
    errors.push("durationFrames must be between 2 and 36000");
  if (!int(v.seed!)) errors.push("seed must be a safe integer");
  checkColor(String(v.paper ?? ""), "paper", errors);
  if (v.paperTooth !== undefined && (!finite(v.paperTooth) || v.paperTooth < 0 || v.paperTooth > 1))
    errors.push("paperTooth must be in [0,1]");
  if (!Array.isArray(v.elements) || v.elements.length === 0 || v.elements.length > 240) errors.push("elements must have 1..240 entries");
  else {
    const seen = new Set<string>();
    for (const [index, node] of v.elements.entries()) {
      const p = "elements[" + index + "]";
      if (!node || typeof node !== "object") { errors.push(p + " must be an object"); continue; }
      if (typeof node.id !== "string" || !/^[a-z][a-z0-9-]{1,63}$/.test(node.id) || seen.has(node.id)) errors.push(p + ".id must be a unique slug");
      else seen.add(node.id);
      checkTime(node.timing, v.durationFrames ?? 0, p, errors);
      const place = node.placement;
      if (place && ([place.x,place.y,place.scale,place.rotate].some(v => v !== undefined && !finite(v)) ||
        (place.scale !== undefined && (place.scale < .05 || place.scale > 15)) ||
        (place.rotate !== undefined && Math.abs(place.rotate) > 360)))
        errors.push(p + ".placement is out of bounds");
      if (node.poseCadence !== undefined && ![1,2,3,4].includes(node.poseCadence))
        errors.push(p + ".poseCadence must be 1..4");
      if (node.motion !== undefined) {
        if (!Array.isArray(node.motion) || node.motion.length === 0 || node.motion.length > 40)
          errors.push(p + ".motion must have 1..40 keys");
        else {
          let previous=-1;
          for (const [keyIndex,key] of node.motion.entries()) {
            if (!key || !int(key.frame) || key.frame < 0 || key.frame >= (v.durationFrames ?? 0) ||
              key.frame <= previous || ![key.x,key.y].every(finite) ||
              Math.abs(key.x)>8192 || Math.abs(key.y)>8192 ||
              (key.rotate!==undefined && (!finite(key.rotate)||Math.abs(key.rotate)>360)) ||
              (key.scale!==undefined && (!finite(key.scale)|| (key.scale)<.05 || key.scale>15)))
              errors.push(p + ".motion["+keyIndex+"] is invalid or unsorted");
            previous=key?.frame ?? previous;
          }
        }
      }
      if (node.kind === "wax") {
        if (!pathSafe(node.d)) errors.push(p + ".d must contain a bounded SVG path");
        if (!node.bounds || ![node.bounds.x,node.bounds.y,node.bounds.width,node.bounds.height].every(finite) ||
          node.bounds.width <= 0 || node.bounds.height <= 0 || node.bounds.width > 4096 || node.bounds.height > 4096)
          errors.push(p + ".bounds are invalid");
        if (!Array.isArray(node.colors) || node.colors.length !== 3) errors.push(p + ".colors must have 3 wax colors");
        else node.colors.forEach((color,i)=>checkColor(String(color),p + ".colors["+i+"]",errors));
        if (node.angle !== undefined && (!finite(node.angle) || node.angle < -89 || node.angle > 89))
          errors.push(p + ".angle must be in [-89,89]");
        try { assertCrayonOptions({seed:0,pressure:node.pressure ?? .84,spacing:node.spacing ?? 9}); }
        catch {errors.push(p + ".pressure/spacing is out of bounds");}
      } else if (node.kind === "contour") {
        if (!pathSafe(node.d)) errors.push(p + ".d must contain a bounded SVG path");
        checkColor(String(node.color),"color for "+p,errors);
        if (!finite(node.width) || node.width <= 0 || node.width > 64) errors.push(p + ".width out of bounds");
        if (node.opacity !== undefined && (!finite(node.opacity) || node.opacity < 0 || node.opacity > 1))
          errors.push(p + ".opacity out of bounds");
      } else if (node.kind === "lettering") {
        if (!Array.isArray(node.lines) || node.lines.length === 0 || node.lines.length > 6 ||
          node.lines.some(line => typeof line !== "string" || line.length < 1 || line.length > 160))
          errors.push(p + ".lines must contain 1..6 short lines");
        if (![node.x,node.y,node.fontSize].every(finite) || node.fontSize <= 0 || node.fontSize > 200)
          errors.push(p + ".text geometry is invalid");
        if (node.lineHeight !== undefined && (!finite(node.lineHeight) || node.lineHeight < .8 || node.lineHeight > 2.2))
          errors.push(p + ".lineHeight is invalid");
        if (node.family !== undefined && !["serif","sans","mono"].includes(node.family)) errors.push(p + ".family is unsupported");
        if (node.anchor !== undefined && !["start","middle","end"].includes(node.anchor)) errors.push(p + ".anchor is unsupported");
        if (node.weight !== undefined && ![400,500,600,700,800].includes(node.weight)) errors.push(p + ".weight is unsupported");
        checkColor(String(node.color),"color for "+p,errors);
        const b=node.backing;
        if (b) {
          checkColor(String(b.color), p + ".backing.color", errors);
          if (![b.width,b.height,b.padding].every(finite) || b.width <= 0 || b.height <= 0 || b.width > 4096 ||
            b.height > 4096 || b.padding < 0 || b.padding > 120 || (b.radius!==undefined && (!finite(b.radius)||b.radius<0||b.radius>200)))
            errors.push(p + ".backing geometry is invalid");
        }
      } else errors.push(p + ".kind is unsupported");
    }
  }
  const camera=v.camera;
  if (camera !== undefined) {
    if (!Array.isArray(camera) || camera.length === 0 || camera.length > 24) errors.push("camera must have 1..24 keys");
    else {
      let previous=-1;
      for (const [i,k] of camera.entries()) {
        if (!k || !int(k.frame) || k.frame < 0 || k.frame >= (v.durationFrames ?? 0) ||
            k.frame <= previous || ![k.focusX,k.focusY,k.zoom].every(finite) || k.zoom < 1 || k.zoom > 3 ||
            Math.abs(k.focusX)>8192 || Math.abs(k.focusY)>8192) errors.push("camera["+i+"] is invalid or unsorted");
        previous=k?.frame ?? previous;
      }
    }
  }
  return errors;
}
export function assertCrayonScene(input: unknown): asserts input is CrayonSceneSpec {
  const errors = inspectCrayonScene(input);
  if (errors.length) throw new RangeError("Invalid CRAYON1 scene: "+errors.join("; "));
}

/** Deterministic smooth camera, including nonsequential seeks and reduced-motion framing. */
export function crayonCamera(spec: CrayonSceneSpec, frame: number, reducedMotion = false): CrayonCameraState {
  assertCrayonScene(spec);
  if (!int(frame) || frame < 0) throw new RangeError("Crayon camera frame must be nonnegative integer");
  const keys=spec.camera ?? [{frame:0,focusX:spec.width/2,focusY:spec.height/2,zoom:1}];
  const t=reducedMotion ? spec.durationFrames-1 : frame;
  const prior=[...keys].reverse().find(k=>k.frame<=t) ?? keys[0];
  const next=keys.find(k=>k.frame>=t) ?? keys[keys.length-1];
  const f=next.frame===prior.frame?0:Math.max(0,Math.min(1,(t-prior.frame)/(next.frame-prior.frame)));
  const ease=f*f*(3-2*f);
  const mix=(a:number,b:number)=>a+(b-a)*ease;
  const scale=mix(prior.zoom,next.zoom), focusX=mix(prior.focusX,next.focusX), focusY=mix(prior.focusY,next.focusY);
  return {x:spec.width/2-focusX*scale,y:spec.height/2-focusY*scale,scale};
}

/** Pose interpolation never mutates a scene or integrates previous frames. */
export function crayonElementPlacement(node: CrayonElement, frame: number, reducedMotion = false): Required<CrayonPlacement> {
  if (!int(frame) || frame < 0) throw new RangeError("element frame must be nonnegative safe integer");
  const base = {x:node.placement?.x ?? 0,y:node.placement?.y ?? 0,
    scale:node.placement?.scale ?? 1,rotate:node.placement?.rotate ?? 0};
  const keys=node.motion;
  if (!keys?.length) return base;
  const sampled = reducedMotion ? keys[keys.length-1].frame :
    Math.floor(frame/(node.poseCadence ?? 1))*(node.poseCadence ?? 1);
  const previous=[...keys].reverse().find(k=>k.frame<=sampled) ?? keys[0];
  const next=keys.find(k=>k.frame>=sampled) ?? keys[keys.length-1];
  const t=previous.frame===next.frame?0:Math.max(0,Math.min(1,(sampled-previous.frame)/(next.frame-previous.frame)));
  const mix=(a:number,b:number)=>a+(b-a)*t*t*(3-2*t);
  return {
    x:base.x+mix(previous.x,next.x),
    y:base.y+mix(previous.y,next.y),
    scale:base.scale*mix(previous.scale ?? 1,next.scale ?? 1),
    rotate:base.rotate+mix(previous.rotate ?? 0,next.rotate ?? 0),
  };
}
