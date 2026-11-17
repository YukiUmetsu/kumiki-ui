import {clamp01,printHash} from "./print-plates";

/** Original continuous Risograph sheet, scored once at stable paper locations.
 * Panels are not unrelated postcards or flattened bitmap textures. */
export type RisoAccordionAxis="vertical"|"horizontal";
export type RisoAccordionAffine=readonly [number,number,number,number,number,number];
export interface RisoAccordionSpec{
  readonly width:number;
  readonly height:number;
  readonly panels:number;
  readonly axis:RisoAccordionAxis;
  readonly seed:number;
  /** 0 = concertina folded, 1 = original uncreased full-size print. */
  readonly openness:number;
}
export interface RisoAccordionFace{
  readonly index:number;
  readonly sourceRect:readonly [number,number,number,number];
  /** One rigid affine transform applies to ALL ink, paper pores and print text. */
  readonly matrix:RisoAccordionAffine;
  readonly leftEdge:readonly [number,number,number,number];
  readonly rightEdge:readonly [number,number,number,number];
  readonly shadeOpacity:number;
  readonly reverse:boolean;
}
export interface RisoAccordionProjection{
  readonly axis:RisoAccordionAxis;
  readonly width:number;
  readonly height:number;
  readonly panels:number;
  readonly openness:number;
  readonly angleDegrees:number;
  readonly projectedSpan:number;
  readonly faces:readonly RisoAccordionFace[];
}
const round=(n:number)=>Number(n.toFixed(5));
const number=(n:number)=>Number.isFinite(n);
export function risoAccordionPoint(m:RisoAccordionAffine,x:number,y:number):
  readonly [number,number]{
  return [round(m[0]*x+m[2]*y+m[4]),
    round(m[1]*x+m[3]*y+m[5])];
}
export function createRisoAccordionProjection({
  width,height,panels,axis,seed,openness,
}:RisoAccordionSpec):RisoAccordionProjection{
  if(!number(width)||!number(height)||width<240||height<240||
    width>8192||height>8192||
    !Number.isSafeInteger(panels)||panels<3||panels>8||
    axis!=="vertical"&&axis!=="horizontal"||
    !Number.isSafeInteger(seed)||seed<0||seed>2147483647||
    !number(openness)||openness<0||openness>1)
    throw new RangeError("RISO78 requires 240–8192 paper, 3–8 panels, vertical/horizontal creases, 31-bit seed and 0..1 openness.");

  const span=axis==="vertical"?width:height;
  const per=span/panels;
  // A 0.22 ratio retains a recognizable folded-paper edge. This represents
  // a projected page face, NOT an empirical paper-mechanism model.
  const projectedScale=.22+.78*openness;
  const flatten=1-openness;
  const offset=(span-span*projectedScale)/2;
  const angleDegrees=round(Math.acos(projectedScale)*180/Math.PI);
  const minor=axis==="vertical"?height:width;
  const amplitude=Math.min(23,minor*.047)*flatten;
  const edgeShift=(i:number)=>
    i===0||i===panels?0:
    ((i%2===1?1:-1)*amplitude*(.89+.11*printHash(seed,i+41,19)));
  const faces=Array.from({length:panels},(_,i):RisoAccordionFace=>{
    const lo=i*per,hi=(i+1)*per;
    const v0=edgeShift(i),v1=edgeShift(i+1);
    const slope=(v1-v0)/per;
    const matrix:RisoAccordionAffine=axis==="vertical"?
      [projectedScale,slope,0,1,offset,v0-slope*lo]:
      [1,0,slope,projectedScale,v0-slope*lo,offset];
    const sourceRect:readonly [number,number,number,number]=axis==="vertical"?
      [lo,0,per,height]:[0,lo,width,per];
    const edge=(coord:number):readonly [number,number,number,number]=>{
      const s=axis==="vertical"?
        [risoAccordionPoint(matrix,coord,0),
          risoAccordionPoint(matrix,coord,height)]:
        [risoAccordionPoint(matrix,0,coord),
          risoAccordionPoint(matrix,width,coord)];
      return [s[0][0],s[0][1],s[1][0],s[1][1]];
    };
    return {index:i,sourceRect,matrix,leftEdge:edge(lo),
      rightEdge:edge(hi),
      shadeOpacity:round(flatten*(i%2===0?.105:.20)),
      reverse:i%2===1};
  });
  return {axis,width,height,panels,openness,
    angleDegrees,projectedSpan:round(span*projectedScale),faces};
}

/** The source halftone never cycles with frame. Only physically projected
 * paper moves as an absolute FilmStage scene progresses. */
export function risoAccordionOpenness(
  frame:number,startFrame:number,durationFrames:number,
  reducedMotion=false,
):number{
  if(!Number.isSafeInteger(frame)||frame<0||
    !Number.isSafeInteger(startFrame)||startFrame<0||
    !Number.isSafeInteger(durationFrames)||durationFrames<1||
    durationFrames>3600)
    throw new RangeError("RISO78 requires absolute nonnegative frames and 1–3600 duration.");
  if(reducedMotion)return 1;
  const t=clamp01((frame-startFrame)/durationFrames);
  return t*t*(3-2*t);
}

/** Tiny scored paper fibre scuffs. Each is fixed to one scored edge of the
 * ORIGINAL continuous source sheet and bends from that precise crease,
 * not from an independently generated decorative noise overlay. */
export function risoAccordionCreaseFibres(
  seed:number,creaseIndex:number,axis:RisoAccordionAxis,
  coordinate:number,minorSpan:number,
):readonly string[]{
  if(!Number.isSafeInteger(seed)||seed<0||seed>2147483647||
    !Number.isSafeInteger(creaseIndex)||creaseIndex<1||creaseIndex>7||
    (axis!=="vertical"&&axis!=="horizontal")||
    !number(coordinate)||!number(minorSpan)||minorSpan<240)
    throw new RangeError("RISO78 paper score requires valid original crease and width.");
  return Array.from({length:58},(_,i)=>{
    const along=(.017+.966*printHash(seed+5,creaseIndex*107+i,17))*minorSpan;
    const displacement=(.19+2.3*printHash(seed,creaseIndex*311+i,29));
    const waviness=(printHash(seed+43,creaseIndex*101+i,31)-.5)*3.2;
    const mid=round(along+waviness*.42),end=round(along+waviness);
    if(axis==="vertical"){
      const x=round(coordinate-displacement);
      return `M${round(coordinate)} ${round(along)} Q${round(coordinate-displacement*.50)} ${mid} ${x} ${end}`;
    }
    const y=round(coordinate-displacement);
    return `M${round(along)} ${round(coordinate)} Q${mid} ${round(coordinate-displacement*.50)} ${end} ${y}`;
  });
}
