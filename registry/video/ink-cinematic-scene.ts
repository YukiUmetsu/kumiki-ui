/**
 * INK7 — a data-first cinematic shan-shui scene director.
 *
 * The whole scene is code-authored, with independent painted subjects rather
 * than a full-frame raster or a monochrome filter over footage.
 * All acting, weather and camera parameters evaluate from an absolute film frame.
 * Samples are safe to seek in any order and to render in parallel for MP4 export.
 *
 * Scene templates are ORIGINAL demonstrations, not traced source photographs.
 */
export type InkCinematicComposition = "mountain-path" | "riverside-scroll";
export type InkCinematicOutput = "landscape" | "portrait";
export type InkCinematicMotifKind =
  "mountain" | "pine" | "willow" | "bamboo" | "rock" | "pavilion" |
  "bridge" | "water" | "cloud" | "birds" | "grass";
export interface InkCinematicMotif {
  id: string;
  kind: InkCinematicMotifKind;
  /** Original painting canvas uses 1280 × 720 paper coordinates. */
  x: number;
  y: number;
  /** One independent local-geometry scale for a reusable motif. */
  scale: number;
  /** 0: distant mist layer; 1: middle-ground; 2: foreground. */
  depth: 0 | 1 | 2;
  /** Optional horizontal flip of a painting motif, preserving local contours. */
  flipped?: boolean;
}
export interface InkCinematicArtDirection {
  /** 0..1, density of original brush marks, texture strokes and botanical detail. */
  detail: number;
  /** 0..1, tonal strength; pale forms remain pale even at full value. */
  ink: number;
  /** 0..1, keeps a light unpainted opening between distant mountain planes. */
  mist: number;
  /** 0..1, subtle independent leaf, robe and scroll motion. */
  wind: number;
  /** 0..1, quiet 2.5D multiplane film camera drift. */
  camera: number;
  /** 0..1, fine paper grain drawn with a stable image-space seed. */
  grain: number;
}
export interface InkCinematicActor {
  id: string;
  x: number;
  y: number;
  scale: number;
  /** Signed distance in paper coordinates over the walking beat. */
  travel: number;
  /** The pose and prop are independently painted and animated. */
  gesture: "contemplate" | "read-scroll";
  startFrame: number;
  stopFrame: number;
}
export interface InkCinematicSceneSpec {
  version: 1;
  id: string;
  composition: InkCinematicComposition;
  output: InkCinematicOutput;
  seed: number;
  durationFrames: number;
  art: InkCinematicArtDirection;
  actor: InkCinematicActor;
  motifs: readonly InkCinematicMotif[];
}
export interface InkCinematicFrame {
  frame: number;
  actorX: number;
  actorY: number;
  actorBob: number;
  actorStep: number;
  robeSway: number;
  armSway: number;
  scrollTilt: number;
  foliageSway: number;
  mistOffset: number;
  birdOffset: number;
  riverPhase: number;
  cameraX: number;
  cameraY: number;
  gaitWeight: number;
}

export const INK_CINEMATIC_ART: Readonly<InkCinematicArtDirection> = Object.freeze({
  detail:.9,ink:.84,mist:.72,wind:.47,camera:.52,grain:.44,
});
const palette = {
  paper:"#f4ecda", paperBright:"#fff9eb", line:"#423c32", linePale:"#8f7f68",
  wash:"#ab967d", washDeep:"#6c5c4c", stone:"#c2af92", robe:"#d8c3a4",
} as const;
export const INK_CINEMATIC_PALETTE = palette;
const at=(x:number,y:number,kind:InkCinematicMotifKind,scale:number,depth:0|1|2=1):InkCinematicMotif=>({
  id:kind+"-"+x+"-"+y,kind,x,y,scale,depth,
});
const templates:Readonly<Record<InkCinematicComposition,readonly InkCinematicMotif[]>>={
  "mountain-path":[
    // An open mist valley between unequal left and right cliff families.
    at(265,473,"mountain",1.09,0),at(1040,465,"mountain",1.28,0),
    at(797,478,"mountain",.76,0),at(430,542,"mountain",.76,1),
    at(91,673,"pine",1.28,2),at(1173,561,"bamboo",1.01,2),
    at(203,647,"rock",1.17,2),at(1075,658,"rock",1.40,2),
    at(586,694,"grass",1.02,2),at(955,672,"grass",1.1,2),
    at(431,385,"pavilion",.54,1),at(641,227,"cloud",1.17,0),
    at(1001,355,"cloud",.92,0),at(691,204,"birds",.81,0),
  ],
  "riverside-scroll":[
    // Open river and arched bridge; asymmetrical wash cliffs at right.
    at(993,435,"mountain",1.35,0),at(795,484,"mountain",.91,0),
    at(1173,467,"mountain",.84,1),at(99,673,"willow",1.18,2),
    at(55,641,"bamboo",.58,2),at(129,664,"rock",1.02,2),
    at(1060,681,"rock",1.20,2),at(637,670,"grass",1.22,2),
    at(834,552,"bridge",.75,1),at(1134,477,"pavilion",.63,1),
    at(659,610,"water",1.13,1),at(960,269,"cloud",.94,0),
    at(754,204,"birds",.74,0),
  ],
};
const integer=(v:number,lo:number,hi:number)=>Number.isSafeInteger(v)&&v>=lo&&v<=hi;
const bounded=(v:number,lo:number,hi:number)=>Number.isFinite(v)&&v>=lo&&v<=hi;
const safe=(s:string)=>typeof s==="string"&&/^[a-z][a-z0-9._-]{0,63}$/i.test(s) &&
  !["__proto__","constructor","prototype"].includes(s);
const kinds=new Set<InkCinematicMotifKind>([
  "mountain","pine","willow","bamboo","rock","pavilion","bridge","water","cloud","birds","grass",
]);
const compositions=new Set<InkCinematicComposition>(["mountain-path","riverside-scroll"]);
const outputs=new Set<InkCinematicOutput>(["landscape","portrait"]);
export function inspectInkCinematicSpec(spec:InkCinematicSceneSpec):string[]{
  const issues:string[]=[];
  if(!spec||spec.version!==1)return ["version: expected INK7 version 1"];
  if(!safe(spec.id))issues.push("id: expected a safe scene ID");
  if(!compositions.has(spec.composition))issues.push("composition: unknown paint composition");
  if(!outputs.has(spec.output))issues.push("output: expected landscape or portrait");
  if(!integer(spec.seed,0,2147483647))issues.push("seed: expected a bounded integer");
  if(!integer(spec.durationFrames,60,3600))issues.push("durationFrames: expected 60..3600");
  if(!spec.art)issues.push("art: missing");
  else for(const k of ["detail","ink","mist","wind","camera","grain"] as const){
    if(!bounded(spec.art[k],0,1))issues.push("art."+k+": must be 0..1");
  }
  const a=spec.actor;
  if(!a||!safe(a.id)||!bounded(a.x,-1024,2304)||!bounded(a.y,-1024,1720)||
    !bounded(a.scale,.15,4)||!bounded(a.travel,-512,512)||
    (a.gesture!=="contemplate"&&a.gesture!=="read-scroll")||
    !integer(a.startFrame,0,3600)||!integer(a.stopFrame,1,3600)||
    a.startFrame>=a.stopFrame||a.stopFrame>spec.durationFrames)
    issues.push("actor: invalid identity, pose, scale, gesture or travel timing");
  if(!Array.isArray(spec.motifs)||spec.motifs.length>90||spec.motifs.length===0)
    issues.push("motifs: expected 1..90 authored motifs");
  else {
    const seen=new Set<string>();
    for(const [i,m] of spec.motifs.entries()){
      if(!m||!safe(m.id)||seen.has(m.id)||!kinds.has(m.kind)||
        !bounded(m.x,-2048,4096)||!bounded(m.y,-2048,4096)||
        !bounded(m.scale,.05,5)||![0,1,2].includes(m.depth)||
        (m.flipped!==undefined&&typeof m.flipped!=="boolean"))
        issues.push("motifs["+i+"]: invalid unique ID, geometry or kind");
      else seen.add(m.id);
    }
  }
  return issues;
}
export function assertInkCinematicSpec(spec:InkCinematicSceneSpec):void {
  const issues=inspectInkCinematicSpec(spec);
  if(issues.length)throw new RangeError("INK7 invalid scene: "+issues.join("; "));
}

/** Reusable recipes: users may replace, add or reorder individual motifs with
 * their own original paint programs; nothing depends on the two demo captions.
 */
export function makeInkCinematicSpec(
  composition:InkCinematicComposition,
  options?:{output?:InkCinematicOutput;seed?:number;durationFrames?:number;
    art?:Partial<InkCinematicArtDirection>;actor?:Partial<InkCinematicActor>;
    motifs?:readonly InkCinematicMotif[]},
):InkCinematicSceneSpec{
  const output=options?.output??"landscape";
  if(!compositions.has(composition)||!outputs.has(output))
    throw new RangeError("Unknown ink cinematic composition or output.");
  const river=composition==="riverside-scroll";
  const spec:InkCinematicSceneSpec={
    version:1,id:"ink-cinema-"+composition,composition,output,
    seed:options?.seed??113,durationFrames:options?.durationFrames??180,
    art:{...INK_CINEMATIC_ART,...options?.art},
    actor:{
      id:"scholar",x:river?(output==="portrait"?610:400):645,
      y:river?652:654,scale:river?1.33:.83,
      travel:river?94:-86,gesture:river?"read-scroll":"contemplate",
      startFrame:6,stopFrame:146,...options?.actor,
    },
    motifs:options?.motifs??templates[composition],
  };
  assertInkCinematicSpec(spec);
  return spec;
}
const clamp01=(v:number)=>Math.max(0,Math.min(1,v));
const smooth=(v:number)=>{const t=clamp01(v);return t*t*(3-2*t);};
/** The scene, camera and actor are wholly seek-stable; time never accumulates. */
export function inkCinematicAt(
  spec:InkCinematicSceneSpec,frame:number,reducedMotion=false,
):InkCinematicFrame {
  assertInkCinematicSpec(spec);
  if(!Number.isSafeInteger(frame)||frame<0||frame>=spec.durationFrames)
    throw new RangeError("INK7 frame outside the authored shot.");
  const f=reducedMotion?spec.durationFrames-1:frame;
  const a=spec.actor;
  const u=smooth((f-a.startFrame)/(a.stopFrame-a.startFrame));
  const gaitWeight=reducedMotion?0:smooth((f-a.startFrame)/13)*(1-smooth((f-a.stopFrame+1)/18));
  const phase=f*.31;
  const wind=reducedMotion?0:spec.art.wind;
  return {
    frame:f,actorX:a.x+a.travel*u,actorY:a.y,
    actorBob:gaitWeight?gaitWeight*Math.sin(phase*2)*1.9:0,
    actorStep:gaitWeight?gaitWeight*Math.sin(phase)*8.5:0,
    robeSway:wind*(Math.sin(f*.085-.7)*3.2+gaitWeight*Math.sin(phase-1.0)*5),
    armSway:wind*(Math.sin(f*.064+.7)*1.65+gaitWeight*Math.sin(phase+.7)*2),
    scrollTilt:wind*Math.sin(f*.055)*.92,
    foliageSway:wind*Math.sin(f*.041)*2.6,
    mistOffset:wind*(f/Math.max(1,spec.durationFrames))*14,
    birdOffset:reducedMotion?0:f*.16,
    riverPhase:reducedMotion?0:f*.044,
    cameraX:reducedMotion?0:spec.art.camera*(f/(spec.durationFrames-1)-.5)*17,
    cameraY:reducedMotion?0:spec.art.camera*Math.sin(f*.018)*2.8,
    gaitWeight,
  };
}
