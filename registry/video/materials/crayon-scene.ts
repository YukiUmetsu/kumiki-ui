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
/** World-space grip/foot plant: lock a point of the original drawing at its position on start. */
export interface CrayonContact {
  start: number; end: number;
  /** Anchor expressed in the element's original local drawing coordinates. */
  anchor: {x:number; y:number};
}
export interface CrayonBase {
  id: string;
  timing: CrayonTiming;
  placement?: CrayonPlacement;
  screenSpace?: boolean;
  /** Optional articulated parent. Order of artwork stays independent of the rig hierarchy. */
  parentId?: string;
  /** Local rotation/scale pivot in authored drawing coordinates. */
  pivot?: { x: number; y: number };
  motion?: readonly CrayonMotionKey[];
  /** Authored, non-overlapping stance/hold ranges; leaves the camera and draw order unchanged. */
  contacts?: readonly CrayonContact[];
  /** Number of held source frames per drawing pose. Camera and brush remain frame-accurate. */
  poseCadence?: 1 | 2 | 3 | 4;
}
/** Discrete original redraws; unlike rigging, each key can change the silhouette. */
export interface CrayonWaxDrawing { frame: number; d: string; bounds: CrayonBounds }
export interface CrayonContourDrawing { frame: number; d: string }
/** Reusable original drawings addressed by a semantic acting cue, e.g. "mbp", "oh", "blink". */
export interface CrayonNamedPose { id: string; d: string }
export interface CrayonPoseCue { frame: number; pose: string }
export interface CrayonWaxElement extends CrayonBase {
  kind: "wax";
  /** Original drawings selected at absolute frames. */
  drawings?: readonly CrayonWaxDrawing[];
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
  /** Chronological redraws without named reuse. Mutually exclusive with poses/poseCues. */
  drawings?: readonly CrayonContourDrawing[];
  /** Author-defined visemes/expressions; "base" always means the initial d. */
  poses?: readonly CrayonNamedPose[];
  /** Aligned absolute-frame acting/exposure-sheet cues. No audio decoder or clock is implied. */
  poseCues?: readonly CrayonPoseCue[];
  d: string;
  color: CrayonColor;
  width: number;
  opacity?: number;
}
/** Authored drawing anchor on a moving element, prior to camera framing. */
export interface CrayonAnchorRef { elementId: string; anchor: {x:number; y:number} }
/** A wax-outline connector follows two independently animated anchors. */
export interface CrayonConnectorElement extends CrayonBase {
  kind: "connector";
  from: CrayonAnchorRef;
  to: CrayonAnchorRef;
  color: CrayonColor;
  width: number;
  opacity?: number;
  /** Signed knee/elbow curvature normal to the line between the endpoints. */
  bend?: number;
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
export type CrayonElement = CrayonWaxElement | CrayonContourElement | CrayonLetteringElement | CrayonConnectorElement;

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
      if (node.parentId !== undefined && (typeof node.parentId !== "string" || !/^[a-z][a-z0-9-]{1,63}$/.test(node.parentId)))
        errors.push(p + ".parentId must be an element slug");
      if (node.pivot !== undefined && (!node.pivot || ![node.pivot.x,node.pivot.y].every(finite) ||
        Math.abs(node.pivot.x) > 8192 || Math.abs(node.pivot.y) > 8192))
        errors.push(p + ".pivot must be bounded finite coordinates");
      const place = node.placement;
      if (place && ([place.x,place.y,place.scale,place.rotate].some(v => v !== undefined && !finite(v)) ||
        (place.scale !== undefined && (place.scale < .05 || place.scale > 15)) ||
        (place.rotate !== undefined && Math.abs(place.rotate) > 360)))
        errors.push(p + ".placement is out of bounds");
      if (node.contacts !== undefined) {
        if (node.screenSpace) errors.push(p + ".contacts require a world-space drawing");
        if (!Array.isArray(node.contacts) || node.contacts.length < 1 || node.contacts.length > 16)
          errors.push(p + ".contacts must contain 1..16 non-overlapping ranges");
        else {
          let previous=-1;
          for(const [j,contact] of node.contacts.entries()) {
            const q=p+".contacts["+j+"]";
            if (!contact || !int(contact.start) || !int(contact.end) ||
              contact.start < 0 || contact.end < contact.start ||
              contact.start <= previous || contact.end >= (v.durationFrames ?? 0))
              errors.push(q+".range must be sorted, non-overlapping and within duration");
            previous=contact?.end ?? previous;
            if (!contact || !contact.anchor ||
              ![contact.anchor.x,contact.anchor.y].every(finite) ||
              Math.abs(contact.anchor.x)>8192 || Math.abs(contact.anchor.y)>8192)
              errors.push(q+".anchor must be bounded finite drawing coordinates");
          }
        }
      }
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
      if (node.kind === "wax" || node.kind === "contour") {
        const drawings=node.drawings;
        if (drawings !== undefined) {
          if (!Array.isArray(drawings) || drawings.length < 1 || drawings.length > 48)
            errors.push(p + ".drawings must contain 1..48 replacement drawings");
          else {
            let previous=0;
            for (const [j,drawing] of drawings.entries()) {
              const q=p+".drawings["+j+"]";
              if (!drawing || !int(drawing.frame) || drawing.frame <= previous ||
                drawing.frame >= (v.durationFrames ?? 0))
                errors.push(q+".frame must be sorted and within the scene after frame 0");
              previous=drawing?.frame ?? previous;
              if (!drawing || typeof drawing.d !== "string" || !pathSafe(drawing.d))
                errors.push(q+".d must contain a bounded SVG path");
              const bounds=drawing && "bounds" in drawing ? drawing.bounds : undefined;
              if (node.kind === "wax" && (!bounds ||
                ![bounds.x,bounds.y,bounds.width,bounds.height].every(finite) ||
                bounds.width <= 0 || bounds.height <= 0 ||
                bounds.width > 4096 || bounds.height > 4096))
                errors.push(q+".bounds must be finite and positive");
            }
          }
        }
      }
      if (node.kind === "wax") {
        if (!pathSafe(node.d)) errors.push(p + ".d must contain a bounded SVG path");
        if (!node.bounds || ![node.bounds.x,node.bounds.y,node.bounds.width,node.bounds.height].every(finite) ||
          node.bounds.width <= 0 || node.bounds.height <= 0 || node.bounds.width > 4096 || node.bounds.height > 4096)
          errors.push(p + ".bounds are invalid");
        if (!Array.isArray(node.colors) || node.colors.length !== 3) errors.push(p + ".colors must have 3 wax colors");
        else node.colors.forEach((color: string,i: number)=>checkColor(String(color),p + ".colors["+i+"]",errors));
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
        if (node.poses !== undefined || node.poseCues !== undefined) {
          if (node.drawings !== undefined)
            errors.push(p + ".drawings and named poses cannot be combined");
          if (!Array.isArray(node.poses) || node.poses.length < 1 || node.poses.length > 24)
            errors.push(p + ".poses must contain 1..24 named paths");
          if (!Array.isArray(node.poseCues) || node.poseCues.length < 1 || node.poseCues.length > 600)
            errors.push(p + ".poseCues must contain 1..600 cues");
          if (Array.isArray(node.poses)) {
            const ids=new Set<string>(["base"]);
            for (const [j,pose] of node.poses.entries()) {
              if (!pose || typeof pose.id !== "string" || !/^[a-z][a-z0-9-]{0,31}$/.test(pose.id) ||
                ids.has(pose.id)) errors.push(p + ".poses["+j+"].id must be a unique slug (not base)");
              else ids.add(pose.id);
              if (!pose || typeof pose.d !== "string" || !pathSafe(pose.d))
                errors.push(p + ".poses["+j+"].d must contain a bounded SVG path");
            }
            if (Array.isArray(node.poseCues)) {
              let previous=-1;
              for (const [j,cue] of node.poseCues.entries()) {
                if (!cue || !int(cue.frame) || cue.frame <= previous ||
                  cue.frame >= (v.durationFrames ?? 0))
                  errors.push(p + ".poseCues["+j+"].frame must be sorted and within scene");
                previous=cue?.frame ?? previous;
                if (!cue || typeof cue.pose !== "string" || !ids.has(cue.pose))
                  errors.push(p + ".poseCues["+j+"].pose is not a declared pose");
              }
            }
          }
        }
      } else if (node.kind === "connector") {
        if (node.parentId !== undefined || node.placement !== undefined ||
          node.motion !== undefined || node.pivot !== undefined || node.contacts !== undefined ||
          node.screenSpace)
          errors.push(p + ".connector is evaluated in world-space and cannot inherit local transforms");
        checkColor(String(node.color),"color for "+p,errors);
        if (!finite(node.width) || node.width <= 0 || node.width > 64)
          errors.push(p + ".width out of bounds");
        if (node.opacity !== undefined && (!finite(node.opacity) || node.opacity < 0 || node.opacity > 1))
          errors.push(p + ".opacity out of bounds");
        if (node.bend !== undefined && (!finite(node.bend) || Math.abs(node.bend)>500))
          errors.push(p + ".bend must be a bounded finite offset");
        for(const end of ["from","to"] as const){
          const ref=node[end];
          if(!ref || typeof ref.elementId !== "string" ||
            !/^[a-z][a-z0-9-]{1,63}$/.test(ref.elementId) ||
            !ref.anchor || ![ref.anchor.x,ref.anchor.y].every(finite) ||
            Math.abs(ref.anchor.x)>8192 || Math.abs(ref.anchor.y)>8192)
            errors.push(p+"."+end+" must reference a bounded drawing anchor");
        }
      } else if (node.kind === "lettering") {
        if (!Array.isArray(node.lines) || node.lines.length === 0 || node.lines.length > 6 ||
          node.lines.some((line: string) => typeof line !== "string" || line.length < 1 || line.length > 160))
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
  // A character rig is a directed forest: missing parents, self-links and cycles are errors.
  // Screen-space overlays may not inherit world-camera transforms or vice versa.
  if (Array.isArray(v.elements)) {
    const byId = new Map(v.elements.filter((e): e is CrayonElement => !!e && typeof e.id === "string").map(e => [e.id,e]));
    for (const [index,node] of v.elements.entries()) {
      if (!node || typeof node !== "object") continue;
      if (node.kind === "connector") {
        for(const end of ["from","to"] as const){
          const ref=node[end];
          const target=ref && typeof ref.elementId==="string" ? byId.get(ref.elementId) : undefined;
          if (!target || target.kind==="connector" || !!target.screenSpace)
            errors.push("elements["+index+"]."+end+" must target a world-space non-connector element");
        }
      }
      if (!node.parentId) continue;
      const parent=byId.get(node.parentId);
      if (!parent) { errors.push("elements["+index+"].parentId does not exist"); continue; }
      if (!!parent.screenSpace !== !!node.screenSpace)
        errors.push("elements["+index+"].parentId crosses screenSpace boundary");
      const visited=new Set<string>([node.id]);
      let cursor:CrayonElement | undefined=parent;
      while (cursor) {
        if (visited.has(cursor.id)) { errors.push("elements["+index+"].parentId creates a cycle"); break; }
        visited.add(cursor.id);
        if (Array.isArray(node.contacts)&&Array.isArray(cursor.contacts) &&
          node.contacts.some((c:CrayonContact)=>c&&cursor!.contacts!.some((p:CrayonContact)=>p&&c.start<=p.end&&p.start<=c.end)))
          errors.push("elements["+index+"].contacts overlap ancestor contacts");
        if (visited.size > 240) break;
        cursor=cursor.parentId ? byId.get(cursor.parentId) : undefined;
      }
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

/**
 * Absolute-frame articulated hierarchy. The outermost transform is the root;
 * DOM paint order remains authored element order, so accessories may appear behind limbs.
 * No incremental physics, mutable animation state or drawing-seed changes on a seek.
 */
/** Find the root-to-leaf rig path without depending on DOM/painter order. */
function crayonRigChain(spec: CrayonSceneSpec,node: CrayonElement): CrayonElement[] {
  const index=new Map(spec.elements.map(e=>[e.id,e]));
  const chain:CrayonElement[]=[];
  const visited=new Set<string>();
  let cursor:CrayonElement|undefined=node;
  while(cursor) {
    if(visited.has(cursor.id)||chain.length>=spec.elements.length)
      throw new RangeError("Invalid CRAYON1 rig: cyclic parentId");
    visited.add(cursor.id);
    chain.unshift(cursor);
    if(cursor.parentId&&!index.has(cursor.parentId))
      throw new RangeError("Invalid CRAYON1 rig: missing parentId");
    cursor=cursor.parentId?index.get(cursor.parentId):undefined;
  }
  return chain;
}

/**
 * Resolve a local anchor to camera-independent world coordinates.
 * Reverse-apply the same translate / pivot / rotate / scale operations as SVG.
 * Absolute evaluation means backward seeks and browser/film exports agree.
 */
export function crayonWorldPoint(
  spec:CrayonSceneSpec,node:CrayonElement,frame:number,
  point:Readonly<{x:number;y:number}>,reducedMotion=false,
): {x:number;y:number} {
  if(!Number.isFinite(point.x)||!Number.isFinite(point.y))
    throw new RangeError("Crayon world point must be finite");
  let x=point.x,y=point.y;
  const chain=crayonRigChain(spec,node);
  for(let i=chain.length-1;i>=0;i--) {
    const part=chain[i],placement=crayonElementPlacement(part,frame,reducedMotion);
    const cx=part.pivot?.x??0,cy=part.pivot?.y??0;
    const a=placement.rotate*Math.PI/180,co=Math.cos(a),si=Math.sin(a);
    const localX=(x-cx)*placement.scale,localY=(y-cy)*placement.scale;
    x=placement.x+cx+localX*co-localY*si;
    y=placement.y+cy+localX*si+localY*co;
  }
  return {x,y};
}

/** Offset a pinned local anchor back to its world position at contact start. */
export function crayonContactOffset(
  spec:CrayonSceneSpec,node:CrayonElement,frame:number,reducedMotion=false,
): {x:number;y:number}|null {
  const at=reducedMotion?spec.durationFrames-1:frame;
  // Parent contact corrections are inherited by all descendants, including
  // held props. Two concurrent contacts on one branch are deliberately invalid.
  let correction:{x:number;y:number}|null=null;
  for(const part of crayonRigChain(spec,node)) {
    const contact=part.contacts?.find(c=>c.start<=at&&at<=c.end);
    if(!contact)continue;
    if(correction)throw new RangeError("Invalid CRAYON1 rig: overlapping nested contacts");
    const fixed=crayonWorldPoint(spec,part,contact.start,contact.anchor);
    const moving=crayonWorldPoint(spec,part,at,contact.anchor,reducedMotion);
    correction={x:fixed.x-moving.x,y:fixed.y-moving.y};
  }
  return correction;
}

/**
 * World-space contact correction precedes the articulated transform chain,
 * so local toe/hand detail and ordinary parent rotation are still applied.
 * Contact is a single pinned anchor, not full IK or a multi-point sole solver.
 */
export function crayonElementTransform(
  spec: CrayonSceneSpec, node: CrayonElement, frame: number, reducedMotion = false,
): string {
  const chain=crayonRigChain(spec,node);
  const transforms=chain.map(part=>{
    const p=crayonElementPlacement(part,frame,reducedMotion);
    const cx=part.pivot?.x??0,cy=part.pivot?.y??0;
    return "translate("+p.x+" "+p.y+") translate("+cx+" "+cy+") rotate("+p.rotate+
      ") scale("+p.scale+") translate("+(-cx)+" "+(-cy)+")";
  }).join(" ");
  const delta=crayonContactOffset(spec,node,frame,reducedMotion);
  return delta ? "translate("+delta.x+" "+delta.y+") "+transforms : transforms;
}

/**
 * Evaluate replacement artwork from an absolute frame, independent of render order.
 * The base path is drawing zero; replacements hold until the next authored key.
 * Joint motion and drawing cadence share the same stepped source-frame sampling.
 */
export function crayonDrawingAt<T extends CrayonWaxElement | CrayonContourElement>(
  node: T, frame: number, reducedMotion = false, durationFrames?: number,
): { d: string; bounds?: CrayonBounds; index: number; poseId?: string } {
  if (!int(frame) || frame < 0) throw new RangeError("Drawing frame must be a nonnegative safe integer");
  if (reducedMotion && (!durationFrames || !int(durationFrames) || durationFrames < 2))
    throw new RangeError("Reduced motion drawing requires a valid scene duration");
  const source = reducedMotion ? durationFrames! - 1 : frame;
  const sampled = Math.floor(source / (node.poseCadence ?? 1)) * (node.poseCadence ?? 1);
  if (node.kind === "contour" && node.poses && node.poseCues) {
    let selected:CrayonPoseCue | undefined;
    let cueIndex=0;
    for(const cue of node.poseCues) {
      if(cue.frame>sampled) break;
      selected=cue;
      cueIndex++;
    }
    if (!selected || selected.pose === "base") return {d:node.d,index:cueIndex,poseId:"base"};
    const pose=node.poses.find(value=>value.id===selected.pose);
    if(!pose) throw new RangeError("Unknown CRAYON1 performance pose: "+selected.pose);
    return {d:pose.d,index:cueIndex,poseId:selected.pose};
  }
  const drawings=node.drawings ?? [];
  let index=0;
  for (let i=0;i<drawings.length;i++) {
    if (drawings[i].frame > sampled) break;
    index=i+1;
  }
  const selected=index ? drawings[index-1] : node;
  return {d:selected.d, bounds:node.kind==="wax" ?
    (index ? (selected as CrayonWaxDrawing).bounds : node.bounds) : undefined, index};
}


/** Camera-independent anchor position including inherited planted-parent offsets. */
export function crayonVisiblePoint(
  spec:CrayonSceneSpec,node:CrayonElement,frame:number,anchor:Readonly<{x:number;y:number}>,
  reducedMotion=false,
):{x:number;y:number}{
  const raw=crayonWorldPoint(spec,node,frame,anchor,reducedMotion);
  const delta=crayonContactOffset(spec,node,frame,reducedMotion);
  return {x:raw.x+(delta?.x??0),y:raw.y+(delta?.y??0)};
}

/**
 * Material-native connecting contour between any two authored character parts.
 * Curvature is a signed, fixed-size perpendicular offset; no implicit IK solver,
 * mutable physics integration or SVG injection from source data.
 */
export function crayonConnectorPath(
  spec:CrayonSceneSpec,node:CrayonConnectorElement,frame:number,reducedMotion=false,
):string{
  if(!int(frame)||frame<0)throw new RangeError("Connector frame must be nonnegative integer");
  const byId=new Map(spec.elements.map(x=>[x.id,x]));
  const a=byId.get(node.from.elementId),b=byId.get(node.to.elementId);
  if(!a||!b||a.kind==="connector"||b.kind==="connector")
    throw new RangeError("Crayon connector requires two valid source anchors");
  const at=reducedMotion?spec.durationFrames-1:
    Math.floor(frame/(node.poseCadence??1))*(node.poseCadence??1);
  const from=crayonVisiblePoint(spec,a,at,node.from.anchor,reducedMotion);
  const to=crayonVisiblePoint(spec,b,at,node.to.anchor,reducedMotion);
  const dx=to.x-from.x,dy=to.y-from.y,dist=Math.hypot(dx,dy);
  const bend=node.bend??0;
  const midX=(from.x+to.x)/2+(dist>0?-dy/dist*bend:0);
  const midY=(from.y+to.y)/2+(dist>0?dx/dist*bend:0);
  return "M"+from.x+" "+from.y+" Q"+midX+" "+midY+" "+to.x+" "+to.y;
}
