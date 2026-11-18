/**
 * PAPER1 — deterministic, material-native paper-craft scene evaluation.
 * Native cut-out shapes, exposed holes, hinges and folds: not a video filter.
 * Pure absolute-frame evaluation; no timers, global RNG or second timeline.
 */
import { evaluatePaperSheet, inspectPaperSheetMotion } from "../motion/paper-sheet";
import type { PaperSheetFrame, PaperSheetMotion, PaperSheetSpec, PaperVec3 } from "../motion/paper-sheet";
import { PAPER_LIGHTS } from "../motion/paper-sheet-light";
import type { PaperLight, PaperLightName, PaperView } from "../motion/paper-sheet-light";

export type PaperStyle = "layered" | "kirigami" | "pop-up" | "lightbox" | "shadow-puppet";
export type PaperMotion = "rise" | "swing" | "unfold" | "still" | "flutter";
/** Separate, actually hinged tip contour; unlike a gradient this changes silhouette. */
export interface PaperLiftedTip {
  /** Closed original cardstock contour adjoining the base at hinge. */
  path: string;
  /** Sheet-space attachment point; hinge remains fixed while the tip rotates. */
  hinge: readonly [number, number];
  /** In-plane projected cardstock fold, limited to 25 degrees. */
  rotateDegrees: number;
  /** Maximum shadow offset of the folded sheet, 0–18 output pixels. */
  lift: number;
}
/** A deterministic physical sheet pose. Values are offsets relative to its authored cut contour. */
export interface PaperPoseKey {
  frame: number;
  x: number;
  y: number;
  angle: number;
  ease?: "linear" | "smooth" | "hold";
}
/** Shallow overhead-camera choreography. Depth/parallax remain owned by PAPER1. */
export interface PaperCameraKey {
  frame: number;
  x: number;
  y: number;
  zoom: number;
  ease?: "linear" | "smooth" | "hold";
}
export interface PaperCutLayer {
  id: string;
  /** Parent sheet in the same authored world-space bind pose.
   * Its rigid transform is inherited without changing global draw order. */
  parentId?: string;
  /** Authored paper contour, in output-sheet coordinates. */
  path: string;
  /** Holes are empty physical cut-outs. They never receive the layer's fill. */
  holes?: readonly string[];
  color: string;
  /** Z-order and shadow separation (0 = at the backing). */
  depth: number;
  /** Hinge/pivot in the same coordinate system as path. */
  pivot?: readonly [number, number];
  motion?: PaperMotion;
  /** Optional authored maximum swing, in degrees (bounded to 30). */
  swingDegrees?: number;
  /** 0–1 authored curvature cue for opaque graded cardstock (not a 3D mesh). */
  curl?: number;
  /** Relative size of sheet-anchored fibre marks, 0.25–2; default 1. */
  fibreScale?: number;
  /** 0–1 multiplier for this sheet’s paper tooth; default 1. */
  fibreIntensity?: number;
  /** 0–1 multiplier for this sheet’s base cut line and edge highlight; default 1. */
  edgeIntensity?: number;
  /** Independently sculpted and shadowed opaque stock, attached to main cut. */
  liftedTip?: PaperLiftedTip;
  /** Stable named rig: connected wing pieces share a hinge, waveform and phase. */
  rigGroup?: string;
  /** Frequency of a fluttering rig, cycles per second (0.1–8). */
  flapHz?: number;
  /** Wing-beat phase in degrees (0–360). */
  flapPhase?: number;
  /** Authored puppet, prop or paper pull-tab poses; independent of assembly. */
  poseKeys?: readonly PaperPoseKey[];
  /** Local entry cue, absolute frames within this scene. */
  enterFrame?: number;
  /** Duration of local assembly beat (frames). */
  durationFrames?: number;
  /**
   * MC1.3 physical paper: the layer becomes a sheet of real stock that folds, bends, peels, rolls and tears in 3D,
   * with curvature shading, edge thickness and shadows cast on the backing. Bend and tear keys use scene frames.
   */
  sheet?: PaperSheetMotion;
}
/** Scene settings shared by every physical layer. */
export interface PaperPhysicalSettings {
  /** Real size of the scene. @default 4 (a 1280 px frame is a 32 cm diorama) */
  pxPerMm?: number;
  /** @default [0, 1, 0] (an upright diorama: down the screen) */
  gravity?: PaperVec3;
  /** @default the scene's own key: upper left, soft, matching the layer shadows */
  light?: PaperLight | PaperLightName;
  view?: PaperView;
}
export interface PaperCraftSpec {
  version: 1;
  id: string;
  style: PaperStyle;
  width: number;
  height: number;
  fps: number;
  durationFrames: number;
  seed: number;
  backing: string;
  /** Foreground-to-background light tint for the chosen paper stock. */
  light: string;
  layers: readonly PaperCutLayer[];
  /** A completed physical set is on stage at the first frame of a shot. */
  startAssembled?: boolean;
  /** Optional overhead-camera key poses. A bounded, solid-stock push/pan only. */
  cameraKeys?: readonly PaperCameraKey[];
  /** Settings for layers with a physical `sheet`. */
  physical?: PaperPhysicalSettings;
}
/** SVG affine [a,b,c,d,e,f], in global paper-sheet coordinates. */
export type PaperAffine = readonly [number,number,number,number,number,number];
export function paperAffineMultiply(a:PaperAffine,b:PaperAffine):PaperAffine {
  return [
    a[0]*b[0]+a[2]*b[1],a[1]*b[0]+a[3]*b[1],
    a[0]*b[2]+a[2]*b[3],a[1]*b[2]+a[3]*b[3],
    a[0]*b[4]+a[2]*b[5]+a[4],a[1]*b[4]+a[3]*b[5]+a[5],
  ];
}
export function paperAffinePoint(a:PaperAffine,p:readonly [number,number]):readonly [number,number] {
  return [a[0]*p[0]+a[2]*p[1]+a[4],a[1]*p[0]+a[3]*p[1]+a[5]];
}
export interface PaperLayerFrame {
  id: string;
  /** Full inherited sheet transform. Every cut remains a separately sorted opaque plane. */
  worldMatrix?: PaperAffine;
  /** Static once the cut-out is assembled. */
  progress: number;
  opacity: number;
  translateX: number;
  translateY: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  shadowX: number;
  shadowY: number;
  shadowBlur: number;
  /** The physical sheet on this frame, for layers with `sheet`. */
  sheet?: PaperSheetFrame;
}
export interface PaperCraftFrame {
  frame: number;
  layers: readonly PaperLayerFrame[];
  camera: { x: number; y: number; zoom: number };
}
export interface PaperIssue { path: string; message: string }
export const PAPER_STYLES: readonly PaperStyle[] = ["layered", "kirigami", "pop-up", "lightbox", "shadow-puppet"];
/** Bounded detailed cut-stock budget; the renderer remains deterministic and exportable. */
export const MAX_PAPER_LAYERS = 128;
/**
 * The scene's own key light for physical layers: upper left and soft, so flap shadows agree with the drop shadows
 * of flat layers. The sky is up the screen (an upright diorama).
 */
export const PAPER_CRAFT_LIGHT: PaperLight = { direction: [-0.55, -0.8, 1], size: 60, key: 0.8, ambient: 0.4, bounce: 0.25, up: [0, -1, 0] };
/** Height of a layer above the backing, px: the same rule as its drop shadow (offset 1.8 + 0.55 × depth, …). */
export const paperLayerHeight = (layer: Pick<PaperCutLayer, "depth">) => 3.3 + layer.depth;
/** The full sheet spec of a physical layer: its cut outline, the scene's size and gravity, its height. */
export function paperLayerSheetSpec(spec: PaperCraftSpec, layer: PaperCutLayer, index: number): PaperSheetSpec {
  const sheet = layer.sheet ?? {};
  return {
    outline: [layer.path, ...(layer.holes ?? [])].join(" "),
    fillRule: "evenodd",
    stock: sheet.stock ?? "cardstock",
    grain: sheet.grain,
    thickness: sheet.thickness,
    bends: sheet.bends,
    tears: sheet.tears,
    seed: sheet.seed ?? spec.seed + index * 17,
    pxPerMm: spec.physical?.pxPerMm ?? 4,
    gravity: spec.physical?.gravity ?? [0, 1, 0],
    support: paperLayerHeight(layer),
  };
}
/** The light physical layers use. */
export function paperCraftLight(spec: Pick<PaperCraftSpec, "physical">): PaperLight {
  const light = spec.physical?.light;
  return light === undefined ? PAPER_CRAFT_LIGHT : typeof light === "string" ? PAPER_LIGHTS[light] : light;
}
const hex = /^#[0-9a-fA-F]{6}$/;
const finite = (n: number) => Number.isFinite(n);
/** Closed, numeric SVG paths only: user data is never interpreted as SVG markup or CSS. */
const allowedPaperPath = /^[MmLlHhVvCcSsQqTtAaZz0-9eE+.,\-\s]+$/;
export function isPaperCutContour(value: unknown): value is string {
  if (typeof value !== "string" || value.length < 5 || value.length > 50000) return false;
  const p = value.trim();
  return /^[Mm]/.test(p) && /[Zz]$/.test(p) &&
    allowedPaperPath.test(p) && !/NaN|Infinity/i.test(p);
}
/** Interpolation is pure: no internal clock, DOM state or random phase. */
export function paperKeySample<K extends { frame: number; ease?: "linear" | "smooth" | "hold" }>(
  keys: readonly K[], frame: number, property: (key: K) => number,
): number {
  if (frame <= keys[0].frame) return property(keys[0]);
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i], b = keys[i + 1];
    if (frame <= b.frame) {
      const raw = (frame - a.frame) / (b.frame - a.frame);
      const t = a.ease === "hold" ? 0 : a.ease === "linear" ? raw :
        raw * raw * (3 - 2 * raw);
      return property(a) + (property(b) - property(a)) * t;
    }
  }
  return property(keys[keys.length - 1]);
}
function inspectKeys(
  keys: readonly { frame: number; ease?: string }[] | undefined,
  duration: number, path: string, issues: PaperIssue[],
  numeric: readonly string[], bounds: (name: string) => readonly [number, number],
): void {
  if (keys === undefined) return;
  if (!Array.isArray(keys) || keys.length < 1 || keys.length > 32) {
    issues.push({path,message:"1–32 paper key poses required"}); return;
  }
  let last = -1;
  keys.forEach((key, i) => {
    const id = path + "[" + i + "]";
    if (!key || typeof key !== "object") {
      issues.push({path:id,message:"key pose object required"}); return;
    }
    if (!Number.isSafeInteger(key.frame) || key.frame <= last || key.frame < 0 ||
        key.frame >= duration)
      issues.push({path:id+".frame",message:"strictly increasing frame within shot required"});
    last = key.frame;
    if (key.ease !== undefined && !["linear","smooth","hold"].includes(key.ease))
      issues.push({path:id+".ease",message:"unknown paper easing"});
    for (const name of numeric) {
      const n = (key as unknown as Record<string, unknown>)[name];
      const [min,max] = bounds(name);
      if (typeof n !== "number" || !Number.isFinite(n) || n < min || n > max)
        issues.push({path:id+"."+name,message:"finite bounded paper pose required"});
    }
  });
}
export const paperClamp = (v: number) => Math.max(0, Math.min(1, v));
export const paperEase = (v: number) => { const t = paperClamp(v); return t * t * (3 - 2 * t); };
/** Paper-safe independent hash: texture offsets do not evolve with the video clock. */
export function paperHash(seed: number, index: number, channel: number): number {
  let n = (seed ^ Math.imul(index + 1, 0x9e3779b1) ^ Math.imul(channel + 17, 0x85ebca6b)) | 0;
  n ^= n >>> 16; n = Math.imul(n, 0x7feb352d); n ^= n >>> 15;
  n = Math.imul(n, 0x846ca68b); n ^= n >>> 16;
  return (n >>> 0) / 4294967296;
}
export function inspectPaperCraft(spec: PaperCraftSpec): PaperIssue[] {
  const issues: PaperIssue[] = [], bad = (path: string, message: string) => issues.push({ path, message });
  if (!spec || typeof spec !== "object") return [{path:"spec",message:"PAPER1 scene object required"}];
  if (spec.version !== 1) bad("version", "PAPER1 requires version 1");
  if (!spec.id || !/^[a-zA-Z0-9_-]+$/.test(spec.id)) bad("id", "use a nonempty stable ASCII identifier");
  if (spec.startAssembled !== undefined && typeof spec.startAssembled !== "boolean")
    bad("startAssembled","startAssembled must be a boolean");
  if (!PAPER_STYLES.includes(spec.style)) bad("style", "unsupported paper medium");
  if (![spec.width, spec.height].every(n => Number.isInteger(n) && n >= 128 && n <= 4096)) bad("size", "width and height must be 128–4096");
  if (!Number.isInteger(spec.fps) || spec.fps < 1 || spec.fps > 120) bad("fps", "FPS must be 1–120");
  if (!Number.isInteger(spec.durationFrames) || spec.durationFrames < 1 || spec.durationFrames > 36000) bad("durationFrames", "duration must be 1–36000");
  if (!Number.isSafeInteger(spec.seed)) bad("seed", "seed must be a safe integer");
  if (!hex.test(spec.backing) || !hex.test(spec.light)) bad("paper", "paper colours must be opaque six-digit hex");
  if (spec.physical !== undefined) {
    const ph = spec.physical, fin = (v: unknown) => typeof v === "number" && Number.isFinite(v);
    if (!ph || typeof ph !== "object") bad("physical", "physical settings object required");
    else {
      if (ph.pxPerMm !== undefined && (!fin(ph.pxPerMm) || ph.pxPerMm < .05 || ph.pxPerMm > 200)) bad("physical.pxPerMm", "pxPerMm must be 0.05–200");
      if (ph.gravity !== undefined && !(Array.isArray(ph.gravity) && ph.gravity.length === 3 && ph.gravity.every(fin))) bad("physical.gravity", "gravity must be three finite numbers");
      const light = ph.light;
      if (typeof light === "string") { if (!(light in PAPER_LIGHTS)) bad("physical.light", "unknown light preset"); }
      else if (light !== undefined && !(light && Array.isArray(light.direction) && light.direction.length === 3 && light.direction.every(fin) &&
        [light.size, light.key, light.ambient, light.bounce].every(v => fin(v) && v >= 0) && light.size <= 179)) bad("physical.light", "light needs a direction and nonnegative size (<180°), key, ambient and bounce");
      if (ph.view !== undefined && !(ph.view && [ph.view.tilt ?? 0, ph.view.turn ?? 0].every(v => fin(v) && Math.abs(v) <= 89))) bad("physical.view", "tilt and turn must be within ±89°");
    }
  }
  if (!Array.isArray(spec.layers) || spec.layers.length < 1 || spec.layers.length > MAX_PAPER_LAYERS) bad("layers", "provide 1–128 separate cut-outs");
  inspectKeys(spec.cameraKeys, spec.durationFrames, "cameraKeys", issues,
    ["x","y","zoom"], name => name === "zoom" ? [1,1.18] : [-Math.max(spec.width, spec.height)*.12,Math.max(spec.width,spec.height)*.12]);
  const seen = new Set<string>();
  const rigs = new Map<string, PaperCutLayer>();
  const parents = new Map<string,string>();
  const layers: readonly PaperCutLayer[] = Array.isArray(spec.layers) ? spec.layers : [];
  for (const [i, layer] of layers.entries()) {
    const base = `layers[${i}]`;
    if (!layer || typeof layer !== "object") { bad(base, "cutout must be an object"); continue; }
    if (!layer.id || !/^[a-zA-Z0-9_-]+$/.test(layer.id) || seen.has(layer.id)) bad(base + ".id", "unique stable id required");
    seen.add(layer.id);
    if (layer.parentId !== undefined) {
      if (typeof layer.parentId !== "string" || !/^[a-zA-Z0-9_-]{1,64}$/.test(layer.parentId))
        bad(base+".parentId","parent id must be a stable ASCII sheet id");
      else parents.set(layer.id,layer.parentId);
      if (!layer.pivot) bad(base+".pivot","attached cutout requires an explicit hinge pivot");
    }
    if (!isPaperCutContour(layer.path))
      bad(base + ".path", "provide a closed bounded SVG cut contour");
    if (!hex.test(layer.color)) bad(base + ".color", "colour must be opaque hex");
    if (!Number.isInteger(layer.depth) || layer.depth < 0 || layer.depth > 32) bad(base + ".depth", "depth must be 0–32");
    if (layer.holes && (!Array.isArray(layer.holes) || layer.holes.length > 32 ||
      layer.holes.some((h: unknown) => !isPaperCutContour(h) || h.length > 10000)))
      bad(base + ".holes", "each hole must be an SVG contour; maximum 32 holes");
    if (layer.pivot && (!Array.isArray(layer.pivot) || layer.pivot.length !== 2 || layer.pivot.some((n: number) => !finite(n) || n < -4096 || n > 8192)))
      bad(base + ".pivot", "finite sheet-coordinate hinge required");
    if (layer.motion && !["rise", "swing", "unfold", "still", "flutter"].includes(layer.motion)) bad(base + ".motion", "unknown material motion");
    if (layer.swingDegrees !== undefined && (!finite(layer.swingDegrees) || Math.abs(layer.swingDegrees) > 30))
      bad(base + ".swingDegrees", "swing must be within ±30 degrees");
    if (layer.curl !== undefined && (!finite(layer.curl) || layer.curl < 0 || layer.curl > 1))
      bad(base + ".curl", "curl must be finite 0–1");
    if (layer.fibreScale !== undefined && (!finite(layer.fibreScale) || layer.fibreScale < .25 || layer.fibreScale > 2))
      bad(base + ".fibreScale", "fibreScale must be finite 0.25–2");
    if (layer.fibreIntensity !== undefined && (!finite(layer.fibreIntensity) || layer.fibreIntensity < 0 || layer.fibreIntensity > 1))
      bad(base + ".fibreIntensity", "fibreIntensity must be finite 0–1");
    if (layer.edgeIntensity !== undefined && (!finite(layer.edgeIntensity) || layer.edgeIntensity < 0 || layer.edgeIntensity > 1))
      bad(base + ".edgeIntensity", "edgeIntensity must be finite 0–1");
    if (layer.liftedTip !== undefined) {
      const tip = layer.liftedTip;
      if (!tip || typeof tip !== "object" || !isPaperCutContour(tip.path))
        bad(base + ".liftedTip.path", "a closed die-cut tip contour is required");
      if (!Array.isArray(tip?.hinge) || tip.hinge.length !== 2 ||
          tip.hinge.some((n:number) => !finite(n) || n < -4096 || n > 8192))
        bad(base + ".liftedTip.hinge", "finite two-coordinate paper hinge required");
      if (!finite(tip?.rotateDegrees) || Math.abs(tip.rotateDegrees) > 25)
        bad(base + ".liftedTip.rotateDegrees", "fold must be within ±25 degrees");
      if (!finite(tip?.lift) || tip.lift < 0 || tip.lift > 18)
        bad(base + ".liftedTip.lift", "paper relief must be 0–18 pixels");
    }
    if (layer.flapHz !== undefined && (!finite(layer.flapHz) || layer.flapHz < .1 || layer.flapHz > 8))
      bad(base + ".flapHz", "flapHz must be finite 0.1–8");
    if (layer.flapPhase !== undefined && (!finite(layer.flapPhase) || layer.flapPhase < 0 || layer.flapPhase > 360))
      bad(base + ".flapPhase", "flapPhase must be finite 0–360 degrees");
    if (layer.rigGroup !== undefined) {
      if (!/^[a-zA-Z0-9_-]{1,64}$/.test(layer.rigGroup))
        bad(base + ".rigGroup", "rigGroup must be a stable short ASCII identifier");
      if (layer.motion !== "flutter")
        bad(base + ".rigGroup", "named paper rigs require flutter motion");
      const previous = rigs.get(layer.rigGroup);
      if (previous) {
        const samePivot = previous.pivot && layer.pivot &&
          previous.pivot[0] === layer.pivot[0] && previous.pivot[1] === layer.pivot[1];
        if (!samePivot ||
            (previous.flapHz ?? 1.4) !== (layer.flapHz ?? 1.4) ||
            (previous.flapPhase ?? 0) !== (layer.flapPhase ?? 0) ||
            (previous.swingDegrees ?? 8) !== (layer.swingDegrees ?? 8))
          bad(base + ".rigGroup", "all sheets in one rig must share pivot and waveform");
      } else rigs.set(layer.rigGroup, layer);
    }
    if (layer.sheet !== undefined) issues.push(...inspectPaperSheetMotion(layer.sheet, base + ".sheet."));
    inspectKeys(layer.poseKeys, spec.durationFrames, base+".poseKeys", issues,
      ["x","y","angle"], name => name === "angle" ? [-180,180] : [-4096,4096]);
    if (layer.enterFrame !== undefined && (!Number.isInteger(layer.enterFrame) || layer.enterFrame < 0 || layer.enterFrame >= spec.durationFrames))
      bad(base + ".enterFrame", "entry must be inside the scene");
    if (layer.durationFrames !== undefined && (!Number.isInteger(layer.durationFrames) || layer.durationFrames < 1 || layer.durationFrames > spec.durationFrames))
      bad(base + ".durationFrames", "entry duration must be 1–durationFrames");
  }
  // Validation must remain total even for hostile JSON containing null entries.
  // The malformed layer is already recorded above; never dereference it here.
  const idIndex=new Map<string,number>();
  layers.forEach((l,i)=>{
    if(l && typeof l==="object" && typeof l.id==="string") idIndex.set(l.id,i);
  });
  for(const [child,parent] of parents) {
    if (!seen.has(parent)) bad("layers["+idIndex.get(child)+"].parentId","parent sheet does not exist");
    let cursor=child; const walked=new Set<string>();
    while(parents.has(cursor)) {
      if(walked.has(cursor)) {
        bad("layers["+idIndex.get(child)+"].parentId","paper rig cannot contain a cycle");
        break;
      }
      walked.add(cursor);
      cursor=parents.get(cursor)!;
    }
  }
  return issues;
}
export function evaluatePaperCraft(spec: PaperCraftSpec, frame: number, reducedMotion = false): PaperCraftFrame {
  const issues = inspectPaperCraft(spec);
  if (issues.length) throw new Error("Invalid PAPER1 scene: " + issues.map(x => x.path + ": " + x.message).join("; "));
  if (!Number.isSafeInteger(frame) || frame < 0) throw new RangeError("PAPER1 frame must be a nonnegative integer");
  const layers = spec.layers.map((layer, i): PaperLayerFrame => {
    const start = layer.enterFrame ?? (8 + i * 11);
    const duration = layer.durationFrames ?? 38;
    const progress = reducedMotion || spec.startAssembled ? 1 : paperEase((frame - start) / duration);
    const motion = layer.motion ?? (spec.style === "kirigami" ? "unfold" : spec.style === "pop-up" ? "rise" : "still");
    const age = Math.max(0, (frame - start) / spec.fps);
    const swing = reducedMotion || progress <= 0 ? 0 : (layer.swingDegrees ?? 8) *
      Math.exp(-age * .9) * Math.sin(age * 5.6 + paperHash(spec.seed, i, 11) * .6);
    // Rig components use absolute film time, NOT local assembly age:
    // every feather/vein remains in phase despite differing enterFrame values.
    const flutterWave = motion === "flutter" && !reducedMotion && progress > 0
      ? Math.sin(2 * Math.PI * frame / spec.fps * (layer.flapHz ?? 1.4) +
        (layer.flapPhase ?? 0) * Math.PI / 180)
      : 0;
    const fold = motion === "unfold" || (spec.style === "kirigami" && motion === "still");
    const rise = motion === "rise" || (spec.style === "pop-up" && motion === "still");
    // Kirigami uses a hinged projection. Pop-up rises from a paper crease.
    const rotation = motion === "flutter"
      ? (layer.swingDegrees ?? 8) * flutterWave * progress
      : motion === "swing" ? swing :
      spec.style === "layered" ? (1 - progress) * (i % 2 ? -3.5 : 3.5) : 0;
    const depth = layer.depth;
    const poseFrame = reducedMotion ? spec.durationFrames - 1 : frame;
    const pose = layer.poseKeys;
    const keyedX = pose ? paperKeySample(pose,poseFrame,k=>k.x) : 0;
    const keyedY = pose ? paperKeySample(pose,poseFrame,k=>k.y) : 0;
    const keyedAngle = pose ? paperKeySample(pose,poseFrame,k=>k.angle) : 0;
    // A reduced-motion frame must be static regardless of the requested seek position.
    const parallax = !reducedMotion && spec.style === "lightbox"
      ? Math.sin(frame / spec.fps * .35) * depth * .55 : 0;
    return {
      id: layer.id, progress, opacity: progress <= 0 ? 0 : 1,
      translateX: keyedX + parallax + (spec.style === "layered" ? (1 - progress) * (i % 2 ? -18 : 18) : 0),
      translateY: keyedY + (rise ? (1 - progress) * (24 + depth * 1.5) :
        spec.style === "layered" ? (1 - progress) * 24 : 0),
      rotation: rotation + keyedAngle,
      scaleX: fold ? Math.max(.015, progress) : motion === "flutter"
        ? 1 - .08 * Math.abs(flutterWave) * progress * Math.abs(layer.swingDegrees ?? 8) / 8 : 1,
      scaleY: rise ? Math.max(.015, progress) : 1,
      shadowX: 1.8 + depth * (spec.style === "lightbox" ? 1.05 : .55),
      shadowY: 2 + depth * (spec.style === "lightbox" ? 1.65 : .8),
      shadowBlur: 2.2 + depth * (spec.style === "lightbox" ? 1.9 : .85),
      sheet: layer.sheet ? evaluatePaperSheet(paperLayerSheetSpec(spec, layer, i), reducedMotion ? spec.durationFrames - 1 : frame) : undefined,
    };
  });
  // Parent-first rigid affine composition, independent of scene-wide Z ordering.
  // Artwork is specified in a common rest sheet, so inherited rotations carry
  // every attached paper piece without duplicated motion-key authoring.
  const byId=new Map(spec.layers.map((layer,i)=>[layer.id,i]));
  const cache=new Map<number,PaperAffine>();
  const matrixAt=(i:number):PaperAffine=>{
    const cached=cache.get(i);
    if(cached)return cached;
    const layer=spec.layers[i], pose=layers[i];
    const pivot=layer.pivot ?? [spec.width/2,spec.height/2];
    const rad=pose.rotation*Math.PI/180, cs=Math.cos(rad), sn=Math.sin(rad);
    const a=cs*pose.scaleX,b=sn*pose.scaleX,c=-sn*pose.scaleY,d=cs*pose.scaleY;
    const local:PaperAffine=[a,b,c,d,
      pose.translateX+pivot[0]-a*pivot[0]-c*pivot[1],
      pose.translateY+pivot[1]-b*pivot[0]-d*pivot[1]];
    const parent=layer.parentId;
    const result=parent===undefined?local:paperAffineMultiply(matrixAt(byId.get(parent)!),local);
    cache.set(i,result);
    return result;
  };
  const riggedLayers=layers.map((layer,i):PaperLayerFrame=>({...layer,worldMatrix:matrixAt(i)}));
  const cameraFrame = reducedMotion ? spec.durationFrames - 1 : frame;
  const camera = spec.cameraKeys ? {
    x: paperKeySample(spec.cameraKeys,cameraFrame,k=>k.x),
    y: paperKeySample(spec.cameraKeys,cameraFrame,k=>k.y),
    zoom: paperKeySample(spec.cameraKeys,cameraFrame,k=>k.zoom),
  } : {x:0,y:0,zoom:1};
  return { frame, layers:riggedLayers, camera };
}
