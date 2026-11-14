/**
 * INK2 directing grammar. Independent of React and real-time clocks.
 * Ink-only shots and arbitrary externally rendered media share FilmStage's frame axis.
 * FilmDocument remains the sole timeline/cut owner.
 */
import type { FilmDocument } from "./film-document";
import { inkHash } from "./ink-wash";

export type InkRevealKind = "brush" | "bloom" | "instant";
export type InkDirection = "left" | "right" | "up" | "down";
export type InkPaperKind = "raw-xuan" | "semi-sized" | "sized-xuan";
export type InkLookId = "literati" | "splash-ink" | "meticulous" | "mineral-accent" | "editorial";

export interface InkLook {
  paperKind: InkPaperKind;
  paper: string;
  ink: string;
  accent: string;
  absorption: number;
  grain: number;
  /** Target fraction of sparse canvas occupied by meaningful marks; a direction, not a pixel pass/fail threshold. */
  compositionalDensity: number;
  /** Basic story cadence, in film frames at 30 fps. */
  holdFrames: number;
}
export const INK_LOOKS: Record<InkLookId, InkLook> = {
  literati: { paperKind: "raw-xuan", paper: "#F3EFE3", ink: "#242720", accent: "#9A3D30",
    absorption: .84, grain: .72, compositionalDensity: .27, holdFrames: 72 },
  "splash-ink": { paperKind: "raw-xuan", paper: "#F4F1E6", ink: "#1B2427", accent: "#A24A36",
    absorption: .96, grain: .84, compositionalDensity: .48, holdFrames: 54 },
  meticulous: { paperKind: "sized-xuan", paper: "#F8F3E7", ink: "#303431", accent: "#A84A3D",
    absorption: .18, grain: .31, compositionalDensity: .41, holdFrames: 88 },
  "mineral-accent": { paperKind: "semi-sized", paper: "#F1E9DA", ink: "#283632", accent: "#A86440",
    absorption: .48, grain: .60, compositionalDensity: .36, holdFrames: 75 },
  editorial: { paperKind: "semi-sized", paper: "#F7F2E7", ink: "#252B2B", accent: "#A83D33",
    absorption: .41, grain: .40, compositionalDensity: .36, holdFrames: 64 },
};
export function inkLook(id: InkLookId): InkLook {
  const style = INK_LOOKS[id];
  if (!style) throw new RangeError("Unknown Chinese ink style: " + id);
  return style;
}

export interface InkLayerPlan {
  /** Semantic layer ID, used to find its React/3D/video content. */
  id: string;
  /** Local frame of the layer's onset (not global film frame). */
  startFrame: number;
  /** Length of the incoming ink reveal; 1 for instantaneous. */
  durationFrames: number;
  reveal: InkRevealKind;
  direction?: InkDirection;
  seed?: number;
  /** Where an ink bloom starts, 0..1 across the underlying artboard. */
  origin?: readonly [number, number];
  /** Gentle parallax factor, 0..2. 0 is static; 1 follows the authored camera. */
  parallax?: number;
  /** "wash" produces a graphic monochrome treatment; "original" preserves live source color. */
  treatment?: "wash" | "original";
  /** Opt-in pointer events for quiz controls, video transport and interactive overlays. */
  interactive?: boolean;
}
export interface InkCameraKeyframe {
  frame: number;
  /** Positions in authored art pixels, not viewport percentages. */
  x: number;
  y: number;
  /** Magnification; 1 is no zoom. */
  zoom: number;
}
export interface InkCameraPlan { keyframes: readonly InkCameraKeyframe[] }
export interface InkShot {
  id: string;
  label: string;
  durationFrames: number;
  layers: readonly InkLayerPlan[];
  camera?: InkCameraPlan;
}
export interface InkFilmPlan {
  id: string;
  fps?: number;
  outputs: readonly { id: string; width: number; height: number }[];
  shots: readonly InkShot[];
}
export interface InkPlanIssue { path: string; message: string }
const numeric = (x: number, min: number, max: number) => Number.isFinite(x) && x >= min && x <= max;
const ident = (id: unknown) => typeof id === "string" && /^[a-z][a-z0-9_-]{0,63}$/i.test(id);
const directionValid = (x: unknown): x is InkDirection => x === "left" || x === "right" || x === "up" || x === "down";
const revealValid = (x: unknown): x is InkRevealKind => x === "brush" || x === "bloom" || x === "instant";

export function inspectInkFilm(plan: InkFilmPlan): InkPlanIssue[] {
  const issues: InkPlanIssue[] = [];
  const error = (path: string, message: string) => issues.push({ path, message });
  if (!plan || !ident(plan.id)) error("/id", "Film id must be a nonempty safe identifier.");
  if (plan?.fps !== undefined && (!Number.isSafeInteger(plan.fps) || plan.fps < 1 || plan.fps > 120))
    error("/fps", "FPS must be an integer from 1 to 120.");
  if (!Array.isArray(plan?.outputs) || !plan.outputs.length)
    error("/outputs", "At least one output size is required.");
  else {
    const ids = new Set<string>();
    plan.outputs.forEach((o,i) => {
      if (!o || !ident(o.id) || ids.has(o.id)) error("/outputs/" + i + "/id", "Output IDs must be unique.");
      if (o) ids.add(o.id);
      if (!o || !Number.isSafeInteger(o.width) || !Number.isSafeInteger(o.height) ||
          o.width < 200 || o.height < 200 || o.width > 7680 || o.height > 4320 ||
          o.width % 2 !== 0 || o.height % 2 !== 0)
        error("/outputs/" + i, "Output dimensions must be even positive film dimensions.");
    });
  }
  if (!Array.isArray(plan?.shots) || !plan.shots.length || plan.shots.length > 500)
    return [...issues,{path:"/shots",message:"Provide 1..500 film shots."}];
  const shotIds = new Set<string>();
  plan.shots.forEach((shot,i) => {
    const at="/shots/"+i;
    if(!shot || !ident(shot.id) || shotIds.has(shot.id))
      error(at+"/id","Shot ID must be unique and safe.");
    if(shot) shotIds.add(shot.id);
    if(!shot || typeof shot.label!=="string" || shot.label.trim().length===0 || shot.label.length>180)
      error(at+"/label","Shot label must be a nonempty description, max 180 characters.");
    if(!shot || !Number.isSafeInteger(shot.durationFrames) || shot.durationFrames<1 || shot.durationFrames>36000)
      error(at+"/durationFrames","Duration must be 1..36000 frames.");
    if(!Array.isArray(shot?.layers) || shot.layers.length>80)
      error(at+"/layers","Provide up to 80 visual layers per shot.");
    else {
      const layerIds = new Set<string>();
      shot.layers.forEach((layer: InkLayerPlan, j: number) => {
        const loc=at+"/layers/"+j;
        if(!layer || !ident(layer.id) || layerIds.has(layer.id)) error(loc+"/id","Layer IDs must be unique per shot.");
        if(layer) layerIds.add(layer.id);
        if(!layer || !Number.isSafeInteger(layer.startFrame) || layer.startFrame<0 ||
            layer.startFrame>=shot.durationFrames)
          error(loc+"/startFrame","Layer onset must be a valid frame within the shot.");
        if(!layer || !Number.isSafeInteger(layer.durationFrames) || layer.durationFrames<1 ||
            layer.durationFrames>36000 || layer.startFrame+layer.durationFrames>shot.durationFrames)
          error(loc+"/durationFrames","Layer reveal must fit entirely inside the shot.");
        if(!layer || !revealValid(layer.reveal)) error(loc+"/reveal","Expected brush, bloom, or instant.");
        if(layer?.direction !== undefined && !directionValid(layer.direction))
          error(loc+"/direction","Expected left, right, up or down.");
        if(layer?.seed !== undefined && (!Number.isSafeInteger(layer.seed) || layer.seed<0 || layer.seed>2147483647))
          error(loc+"/seed","Seed must be a 0..2147483647 integer.");
        if(layer?.origin !== undefined && (!Array.isArray(layer.origin) || layer.origin.length!==2 ||
            !layer.origin.every((p:number)=>numeric(p,0,1))))
          error(loc+"/origin","Bloom origin must have two normalized coordinates.");
        if(layer?.parallax !== undefined && !numeric(layer.parallax,0,2))
          error(loc+"/parallax","Parallax must be 0..2.");
        if(layer?.interactive !== undefined && typeof layer.interactive !== "boolean")
          error(loc+"/interactive","Interactive must be a boolean.");
        if(layer?.treatment !== undefined && layer.treatment!=="original" && layer.treatment!=="wash")
          error(loc+"/treatment","Treatment must be original or wash.");
      });
    }
    if(shot?.camera) {
      const keys=shot.camera.keyframes;
      if(!Array.isArray(keys)||!keys.length||keys.length>200) error(at+"/camera/keyframes","Camera needs 1..200 keyframes.");
      else {
        let previous=-1;
        keys.forEach((k,j)=>{
          if(!k || !Number.isSafeInteger(k.frame)||k.frame<0||k.frame>=shot.durationFrames||k.frame<=previous||
              !numeric(k.x,-8192,8192)||!numeric(k.y,-8192,8192)||!numeric(k.zoom,.2,6))
            error(at+"/camera/keyframes/"+j,"Camera frames must increase, remain in the shot, and contain finite x/y/zoom.");
          if(k) previous=k.frame;
        });
      }
    }
  });
  return issues;
}
export function assertInkFilm(plan: InkFilmPlan) {
  const issues=inspectInkFilm(plan);
  if(issues.length) throw new Error("Invalid INK2 film: "+issues.map(i=>i.path+" "+i.message).join("; "));
}
/**
 * Frame-accurate shot spec on FilmDocument. Client authors provide media by layer id;
 * this function does not create a competing cut engine.
 */
export function createInkFilmDocument(plan: InkFilmPlan): FilmDocument {
  assertInkFilm(plan);
  return {
    schemaVersion: 1,
    id: plan.id,
    fps: { num: plan.fps??30, den: 1 },
    drift: 0,
    outputs: plan.outputs.map(o=>({...o})),
    scenes: plan.shots.map((s,i)=>({
      id:s.id,recipeId:"slot" as const,durationFrames:s.durationFrames,
      ...(i>0?{transition:{kind:"cut" as const}}:{}),
      content:{slot:"ink-story",label:s.label,props:{shotId:s.id}},
    })),
  };
}
/** Direct layer progress: no clocks, history, or opacity bounce after a seek. */
export function inkLayerProgress(layer: InkLayerPlan, frame: number,reducedMotion=false): number {
  if(!Number.isSafeInteger(frame)||frame<0) throw new RangeError("Ink layer frame must be nonnegative.");
  if(reducedMotion) return 1;
  if(frame<layer.startFrame) return 0;
  if(layer.reveal==="instant") return 1;
  const v=(frame-layer.startFrame)/layer.durationFrames;
  return Math.max(0,Math.min(1,v));
}
const ease=(t:number)=>{const a=Math.max(0,Math.min(1,t));return a*a*(3-2*a);};
/** Deterministic camera motion; default hold at first and last keyframe. */
export function inkCameraAt(plan: InkCameraPlan|undefined,frame:number): {x:number;y:number;zoom:number} {
  if(!Number.isFinite(frame)||frame<0) throw new RangeError("Camera frame must be nonnegative.");
  if(!plan||!plan.keyframes.length)return {x:0,y:0,zoom:1};
  const keys=plan.keyframes;
  if(frame<=keys[0].frame)return {...keys[0]};
  for(let i=1;i<keys.length;i++){
    const end=keys[i];
    if(frame>end.frame)continue;
    const a=keys[i-1],t=ease((frame-a.frame)/(end.frame-a.frame));
    return {x:a.x+(end.x-a.x)*t,y:a.y+(end.y-a.y)*t,
      zoom:Math.exp(Math.log(a.zoom)+(Math.log(end.zoom)-Math.log(a.zoom))*t)};
  }
  return {...keys[keys.length-1]};
}
/**
 * Native feathered brush / organic bloom matte, from 0..1.
 * Brush follows the sweep direction; bloom grows from an authored subject origin.
 * Both produce an exact full-frame mask at the terminal frame.
 */
export function inkRevealPath(width:number,height:number,progress:number,kind:InkRevealKind,seed=1,
  direction:InkDirection="right",origin:readonly[number,number]=[.5,.5]):string {
  if(!numeric(width,1,8192)||!numeric(height,1,8192)||!numeric(progress,0,1)||
      !Number.isSafeInteger(seed)||seed<0||seed>2147483647||
      !directionValid(direction)||!revealValid(kind)||!Array.isArray(origin)||origin.length!==2||
      !origin.every(p=>numeric(p,0,1)))
    throw new RangeError("Ink reveal parameters are invalid.");
  if(progress===0)return "M0 0 Z";
  if(progress===1||kind==="instant")return "M0 0 H"+width+" V"+height+" H0 Z";
  const fmt=(n:number)=>Number(n.toFixed(2));
  if(kind==="bloom"){
    const cx=width*origin[0],cy=height*origin[1];
    // Radius reaches the furthest corner at t=1. Irregular outline stays
    // stable under arbitrary seeking because angular noise is tied to seed.
    const maxR=Math.max(Math.hypot(cx,cy),Math.hypot(width-cx,cy),
      Math.hypot(cx,height-cy),Math.hypot(width-cx,height-cy));
    const radius=maxR*(.12*progress+.88*progress*progress);
    const angular=Array.from({length:65},(_,i)=>{
      const a=i*Math.PI*2/64;
      const wave=.88+.13*inkHash(seed,i%64,17)+.06*Math.sin(a*7+seed*.013);
      return fmt(cx+Math.cos(a)*radius*wave)+" "+fmt(cy+Math.sin(a)*radius*wave);
    });
    return "M"+angular.join(" L")+" Z";
  }
  const vertical=direction==="right"||direction==="left";
  const extent=vertical?width:height,perpendicular=vertical?height:width;
  const sign=direction==="right"||direction==="down"?1:-1;
  const base=sign===1?extent*progress:extent*(1-progress);
  const cells=44,edge:Array<string>=[];
  for(let i=0;i<=cells;i++){
    const n=i/cells,spacing=n*perpendicular;
    const h=inkHash(seed,i,41),low=Math.sin(n*6.4+seed*.075),high=Math.sin(n*24.1+seed*.013);
    const feather=(h-.5)*extent*.018+low*extent*.012+high*extent*.003;
    const across=Math.max(0,Math.min(extent,base+feather));
    edge.push(vertical?fmt(across)+" "+fmt(spacing):fmt(spacing)+" "+fmt(across));
  }
  if(vertical)
    return direction==="right"?"M0 0 L"+edge.join(" L")+" L0 "+height+" Z":
      "M"+width+" 0 L"+edge.join(" L")+" L"+width+" "+height+" Z";
  return direction==="down"?"M0 0 L"+edge.join(" L")+" L"+width+" 0 Z":
    "M0 "+height+" L"+edge.join(" L")+" L"+width+" "+height+" Z";
}
