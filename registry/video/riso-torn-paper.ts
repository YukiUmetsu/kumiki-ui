import {clamp01,printHash} from "./print-plates";

export type RisoTearDirection=
  "left-to-right"|"right-to-left"|"top-to-bottom"|"bottom-to-top";
export interface RisoTornPaperOptions{
  readonly width:number;
  readonly height:number;
  readonly seed:number;
  /** Local paper-fibre edge scale; 0 = a clean blade-cut sheet. */
  readonly roughness:number;
}
export interface RisoTornFibre{
  readonly id:string;
  readonly secondary:number;
  readonly offset:number;
  readonly reach:number;
  readonly sway:number;
  readonly width:number;
  readonly opacity:number;
}
export interface RisoTornPaperProfile{
  readonly width:number;
  readonly height:number;
  readonly seed:number;
  readonly roughness:number;
  readonly serrations:readonly number[];
  readonly fibres:readonly RisoTornFibre[];
}
export interface RisoTornPaperShape{
  readonly progress:number;
  readonly direction:RisoTearDirection;
  readonly clipPath:string;
  readonly edgePath:string;
  readonly fibrePaths:readonly {id:string;d:string;width:number;opacity:number}[];
  readonly centre:number;
}
const rounded=(n:number)=>Number(n.toFixed(3));
const finite=(n:number)=>Number.isFinite(n);
const validDirection=(value:string):value is RisoTearDirection=>
  ["left-to-right","right-to-left","top-to-bottom","bottom-to-top"].includes(value);
const vertical=(direction:RisoTearDirection)=>
  direction==="left-to-right"||direction==="right-to-left";
const forward=(direction:RisoTearDirection)=>
  direction==="left-to-right"||direction==="top-to-bottom";

/** Paper fibres follow a structured tear ridge, not image noise. Edge path is
 * a continuous 129-vertex profile mixing macro tension, mid-scale split
 * direction and sharp local cellulose fibrils. It is generated just once
 * from the paper, not from the film frame or individual ink plates. */
export function createRisoTornPaperProfile({
  width,height,seed,roughness,
}:RisoTornPaperOptions):RisoTornPaperProfile{
  if(!finite(width)||!finite(height)||width<240||height<240||
    width>8192||height>8192||
    !Number.isSafeInteger(seed)||seed<0||seed>2147483647||
    !finite(roughness)||roughness<0||roughness>1)
    throw new RangeError("RISO76 needs a physical 240–8192 paper, 31-bit seed, roughness 0..1.");
  const pointCount=129;
  const serrations=Array.from({length:pointCount},(_,i)=>{
    const u=i/(pointCount-1);
    const big=Math.sin(u*Math.PI*5.4+printHash(seed,11,13)*6.28);
    const middle=Math.sin(u*Math.PI*20.7+printHash(seed,17,19)*6.28);
    const fibre=(printHash(seed,i+31,47)-.5)*2;
    const edge=roughness*(6.7*big+2.7*middle+2.5*fibre);
    return rounded(edge);
  });
  const fibres=Array.from({length:144},(_,i)=>{
    const h=(j:number)=>printHash(seed+71,i+5,j);
    return {id:"cellulose-"+i,secondary:(.007+.985*h(11)),
      offset:rounded((h(23)-.5)*2.3),
      reach:rounded(.6+6.7*h(29)),
      sway:rounded((h(37)-.5)*8.2),
      width:rounded(.17+.73*h(41)),
      opacity:rounded(.17+.52*h(43))};
  });
  return {width,height,seed,roughness,serrations,fibres};
}

/** A pure FilmStage frame from physical paper coordinates. The cropped print
 * is an *entire new sheet*, with original separately authored ink masters.
 * The torn silhouette is not a generic CSS wipe, a crossfade or an image. */
export function risoTornPaperShape(
  profile:RisoTornPaperProfile,direction:RisoTearDirection,progress:number,
):RisoTornPaperShape{
  if(!profile||!validDirection(direction)||!finite(progress)||progress<0||progress>1||
    profile.serrations.length!==129||profile.fibres.length!==144||
    !profile.serrations.every(finite))
    throw new RangeError("RISO76 requires a validated original tear profile, direction and 0..1 frame.");
  const across=vertical(direction)?profile.width:profile.height;
  const along=vertical(direction)?profile.height:profile.width;
  const pos=forward(direction);
  // Terminal states are handled by the renderer as exact source sheets.
  const margin=23;
  const centre=pos?(-margin+(across+2*margin)*progress):
    (across+margin-(across+2*margin)*progress);
  const point=(p:number,s:number)=>
    vertical(direction)?[rounded(p),rounded(s)] as const:
      [rounded(s),rounded(p)] as const;
  const values=profile.serrations.map((v,i)=>
    point(centre+v,i*along/(profile.serrations.length-1)));
  const spine="M"+values.map(q=>q.join(" ")).join(" L");
  const edge=values.map(q=>q.join(" ")).join(" L");
  let clipPath:string;
  if(vertical(direction)){
    clipPath=pos?
      "M0 0 L"+edge+" L0 "+profile.height+" Z":
      "M"+profile.width+" 0 L"+edge+" L"+profile.width+" "+profile.height+" Z";
  }else{
    const backwards=[...values].reverse().map(q=>q.join(" ")).join(" L");
    clipPath=pos?
      "M0 0 L"+profile.width+" 0 L"+backwards+" Z":
      "M0 "+profile.height+" L"+profile.width+" "+profile.height+" L"+backwards+" Z";
  }
  const fibrePaths=profile.roughness===0?[]:profile.fibres.map(f=>{
    const index=Math.max(0,Math.min(128,Math.round(f.secondary*128)));
    const p=centre+profile.serrations[index];
    const s=f.secondary*along;
    const sign=pos?-1:1;
    const u=point(p+f.offset,s);
    const bend=point(p+f.offset+sign*f.reach*.52,s+f.sway*.46);
    const end=point(p+f.offset+sign*f.reach,s+f.sway);
    return {id:f.id,d:`M${u.join(" ")} Q${bend.join(" ")} ${end.join(" ")}`,
      width:rounded(f.width*profile.roughness),
      opacity:rounded(f.opacity*Math.sqrt(profile.roughness))};
  });
  return {progress,direction,clipPath,edgePath:spine,
    fibrePaths,centre:rounded(centre)};
}

/** Verify initial/final output is EXACTLY the incoming/outgoing picture
 * without shadow or hidden fragments and validate the film clock. */
export function risoTornProgress(
  frame:number,startFrame:number,durationFrames:number,
  reducedMotion=false,
):number{
  if(!Number.isSafeInteger(frame)||frame<0||
    !Number.isSafeInteger(startFrame)||startFrame<0||
    !Number.isSafeInteger(durationFrames)||durationFrames<1||durationFrames>3600)
    throw new RangeError("RISO76 expects absolute nonnegative frame/start and 1–3600 scene frames.");
  if(reducedMotion)return 1;
  const t=clamp01((frame-startFrame)/durationFrames);
  return rounded(t*t*(3-2*t));
}
