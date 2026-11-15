/**
 * PAPER-D1: source-backed paper-film director.
 *
 * A shot is a composition of real PAPER1 cutouts, not a filtered bitmap.
 * Two independently art-directed aspects share a frame budget and edit rhythm.
 * The existing FilmStage owns the outside clock, sound, captions and transitions.
 */
import { inspectPaperCraft } from "./paper-craft";
import type { PaperCraftSpec, PaperIssue } from "./paper-craft";

export type PaperDirectorAspect = "landscape" | "portrait";
export interface PaperCurtainTransition {
  kind: "paper-curtain";
  /** Even frame count, split across outgoing closure and incoming reveal. */
  durationFrames: number;
  /** Fully opaque six-digit pigment for a solid cut-paper sheet. */
  color: string;
  direction: "left-to-right" | "right-to-left";
}
export interface PaperDirectorShot {
  id: string;
  /** Physical paper sheet moves across the edit; no alpha blending. */
  transitionOut?: PaperCurtainTransition;
  scenes: Readonly<Record<PaperDirectorAspect, PaperCraftSpec>>;
}
export interface PaperDirectorFilm {
  version: 1;
  id: string;
  shots: readonly PaperDirectorShot[];
}
export interface PaperDirectorPlan {
  readonly id: string;
  readonly fps: number;
  readonly durationFrames: number;
  readonly shots: readonly {
    id: string;
    startFrame: number;
    durationFrames: number;
    scenes: Readonly<Record<PaperDirectorAspect, PaperCraftSpec>>;
    transitionOut?: PaperCurtainTransition;
  }[];
}
export interface PaperDirectorFrame {
  readonly shotId: string;
  readonly shotIndex: number;
  readonly localFrame: number;
  readonly durationFrames: number;
  readonly spec: PaperCraftSpec;
  /** Opaque material animation in the frames surrounding an editorial edit. */
  readonly curtain?: {
    spec: PaperCurtainTransition;
    phase: "closing" | "opening";
    progress: number;
  };
}
const validId = /^[a-zA-Z0-9_-]{1,80}$/;
/** Reject unknown films before the browser is given SVG path data. */
export function inspectPaperDirector(film: unknown): PaperIssue[] {
  const errors: PaperIssue[] = [];
  const bad = (path: string, message: string) => errors.push({path,message});
  if (!film || typeof film !== "object") return [{path:"film",message:"director film object required"}];
  const f = film as Partial<PaperDirectorFilm>;
  if (f.version !== 1) bad("version","director requires version 1");
  if (typeof f.id !== "string" || !validId.test(f.id)) bad("id","stable ASCII film id required");
  if (!Array.isArray(f.shots) || f.shots.length < 1 || f.shots.length > 24) {
    bad("shots","1–24 paper film shots required"); return errors;
  }
  const seen = new Set<string>();
  let total = 0, fps: number | undefined, sizes: {landscape:string;portrait:string}|undefined;
  f.shots.forEach((shot: unknown, i: number) => {
    const where = "shots["+i+"]";
    if (!shot || typeof shot !== "object") {bad(where,"shot object required");return;}
    const s = shot as Partial<PaperDirectorShot>;
    if (typeof s.id !== "string" || !validId.test(s.id) || seen.has(s.id)) bad(where+".id","unique stable shot id required");
    else seen.add(s.id);
    if (!s.scenes || typeof s.scenes !== "object") {bad(where+".scenes","two aspect scenes required");return;}
    const land = s.scenes.landscape, port = s.scenes.portrait;
    for (const aspect of ["landscape","portrait"] as const) {
      const spec = s.scenes[aspect];
      if (!spec || typeof spec !== "object") {bad(where+"."+aspect,"paper scene required");continue;}
      for (const error of inspectPaperCraft(spec))
        bad(where+"."+aspect+"."+error.path,error.message);
      if (spec.width <= 0 || spec.height <= 0 ||
          (aspect === "landscape" ? spec.width <= spec.height : spec.height <= spec.width))
        bad(where+"."+aspect+".size","scene orientation must match aspect");
      if (fps === undefined) fps = spec.fps;
      else if (spec.fps !== fps) bad(where+"."+aspect+".fps","all shots must have same FPS");
      const size = spec.width+"x"+spec.height;
      if (!sizes) sizes={landscape:land?.width+"x"+land?.height,portrait:port?.width+"x"+port?.height};
      else if (sizes[aspect] !== size) bad(where+"."+aspect+".size","paper output dimensions must be consistent");
    }
    if (s.transitionOut !== undefined) {
      const transition=s.transitionOut;
      if (!transition || typeof transition !== "object" ||
          transition.kind !== "paper-curtain" ||
          transition.direction !== "left-to-right" && transition.direction !== "right-to-left" ||
          typeof transition.color !== "string" || !/^#[0-9a-fA-F]{6}$/.test(transition.color) ||
          !Number.isSafeInteger(transition.durationFrames) ||
          transition.durationFrames < 8 || transition.durationFrames > 60 ||
          transition.durationFrames % 2 !== 0)
        bad(where+".transitionOut","paper curtain needs valid color, direction and even 8–60-frame duration");
      if (i === f.shots!.length-1) bad(where+".transitionOut","final shot cannot transition out");
      if (land && transition?.durationFrames >= land.durationFrames)
        bad(where+".transitionOut","transition duration must fit shot");
      const nextDuration=f.shots![i+1]?.scenes?.landscape?.durationFrames;
      if (Number.isSafeInteger(transition?.durationFrames) &&
          typeof nextDuration==="number" && nextDuration < transition.durationFrames/2)
        bad(where+".transitionOut","incoming shot is shorter than its opening curtain");
    }
    if (land?.durationFrames !== port?.durationFrames)
      bad(where+".durationFrames","both aspect shots must have the same duration");
    if (Number.isSafeInteger(land?.durationFrames) && land.durationFrames > 0)
      total += land.durationFrames;
  });
  // Both halves of adjacent curtains must not compete for the same paper frame.
  for(let i=1;i<f.shots.length-1;i++) {
    // Invalid JSON shot entries have already been reported above: error
    // aggregation must never turn into an uncaught null dereference.
    const left=f.shots[i-1]?.transitionOut?.durationFrames??0;
    const right=f.shots[i]?.transitionOut?.durationFrames??0;
    const duration=f.shots[i]?.scenes?.landscape?.durationFrames??0;
    if ((left+right)/2 >= duration)
      bad("shots["+i+"].transitionOut","incoming/outgoing curtain beats overlap");
  }
  if (total > 36000) bad("durationFrames","paper film exceeds 36000 frames");
  return errors;
}
/** Compile once per revision; resolve every timeline frame in constant bounded work. */
export function compilePaperDirector(film: PaperDirectorFilm): PaperDirectorPlan {
  const errors = inspectPaperDirector(film);
  if (errors.length) throw new RangeError("Invalid paper film: "+errors.map(e=>e.path+": "+e.message).join("; "));
  let start = 0;
  const shots = film.shots.map(shot => {
    const durationFrames = shot.scenes.landscape.durationFrames;
    const item={id:shot.id,startFrame:start,durationFrames,scenes:shot.scenes,
      transitionOut:shot.transitionOut};
    start += durationFrames;
    return item;
  });
  return {id:film.id,fps:film.shots[0].scenes.landscape.fps,durationFrames:start,shots};
}
/** No alpha crossfade: every paper-shot boundary is an editorial hard cut.
 * FD1 FilmStage retains authority over external shot transitions/audio.
 */
export function resolvePaperDirector(
  plan: PaperDirectorPlan, frame: number, aspect: PaperDirectorAspect,
): PaperDirectorFrame {
  if (!Number.isSafeInteger(frame) || frame < 0) throw new RangeError("Paper director frame must be nonnegative and integer");
  if (aspect !== "landscape" && aspect !== "portrait") throw new RangeError("Unknown paper film aspect");
  const index = plan.shots.findIndex((shot,i) =>
    frame < shot.startFrame + shot.durationFrames || i === plan.shots.length-1);
  const shot = plan.shots[index];
  const localFrame = Math.min(shot.durationFrames-1,Math.max(0,frame-shot.startFrame));
  let curtain: PaperDirectorFrame["curtain"];
  // The outgoing cutstock closes across the final half; after the hard
  // picture cut it uncovers the incoming shot over the first half.
  if(index<plan.shots.length-1 && shot.transitionOut) {
    const half=shot.transitionOut.durationFrames/2;
    if(localFrame>=shot.durationFrames-half) {
      curtain={spec:shot.transitionOut,phase:"closing",
        progress:(localFrame-(shot.durationFrames-half))/(half-1)};
    }
  }
  if(!curtain && index>0 && plan.shots[index-1].transitionOut) {
    const outgoing=plan.shots[index-1].transitionOut!;
    const half=outgoing.durationFrames/2;
    if(localFrame<half)curtain={spec:outgoing,phase:"opening",
      progress:localFrame/(half-1)};
  }
  return {shotId:shot.id,shotIndex:index,localFrame,
    durationFrames:plan.durationFrames,spec:shot.scenes[aspect],curtain};
}
/** Minimal die-cut path authoring: any content can use explicit geometry and holes. */
export const paperCut = {
  polygon(points: readonly (readonly [number,number])[]): string {
    if (points.length < 3 || points.length > 512 ||
        points.some(p=>p.length!==2||p.some(n=>!Number.isFinite(n)||Math.abs(n)>8192)))
      throw new RangeError("Paper polygon requires 3–512 finite points");
    return points.map(([x,y],i)=>(i?"L":"M")+x+" "+y).join(" ")+" Z";
  },
  ellipse(cx:number,cy:number,rx:number,ry:number): string {
    if (![cx,cy,rx,ry].every(Number.isFinite)||rx<=0||ry<=0||
        Math.max(Math.abs(cx),Math.abs(cy),rx,ry)>8192)
      throw new RangeError("Paper ellipse requires finite positive dimensions");
    const k=.5522847498307936;
    return [
      "M"+(cx-rx)+" "+cy,
      "C"+(cx-rx)+" "+(cy-k*ry)+" "+(cx-k*rx)+" "+(cy-ry)+" "+cx+" "+(cy-ry),
      "C"+(cx+k*rx)+" "+(cy-ry)+" "+(cx+rx)+" "+(cy-k*ry)+" "+(cx+rx)+" "+cy,
      "C"+(cx+rx)+" "+(cy+k*ry)+" "+(cx+k*rx)+" "+(cy+ry)+" "+cx+" "+(cy+ry),
      "C"+(cx-k*rx)+" "+(cy+ry)+" "+(cx-rx)+" "+(cy+k*ry)+" "+(cx-rx)+" "+cy,"Z"
    ].join(" ");
  },
};
