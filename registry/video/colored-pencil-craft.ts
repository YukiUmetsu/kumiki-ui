import { pencilHash } from "./colored-pencil";
import type { PencilRegion } from "./colored-pencil";

/**
 * Optical medium study, not simulated wax physics. The main pencil challenge
 * is layering locally translucent pigment into paper tooth without flattening
 * the form into an SVG fill. Every mark remains fixed in paper coordinates.
 */
export type PencilCraftKind =
  "fur" | "feather" | "skin" | "hair" | "foliage" | "wood" | "fabric" |
  "stone" | "metal" | "water" | "keratin" | "ocular" | "general";
export interface PencilCraftFinish {
  kind: PencilCraftKind;
  /** 0 = dry paper shows through, 1 = many thin deposited layers/burnish. */
  burnish: number;
  /** 0 = light from left/up, 1 = light from right/down. Affects tonal roll-off. */
  light: number;
  /** 0 = minimal grain, 1 = pronounced visible paper tooth. */
  tooth: number;
  /** Optional physical overlap budget for authored hair/fur, 0..1.
   * At zero/missing all existing material output stays byte-identical.
   * This adds independent original pencil paths; it is NOT a photo blur.
   */
  pigmentDensity?: number;
  /** 0..1 optional multiplier for tonal support. Default 1 preserves every
   * legacy mark; reduces only SVG fill dominance, never pencil paths. */
  tonalSupportWeight?: number;
}
export interface PencilMicroGroup {
  path: string;
  color: string;
  width: number;
  opacity: number;
  count: number;
}
export const pencilCraftKinds:readonly PencilCraftKind[]=[
  "fur","feather","skin","hair","foliage","wood","fabric",
  "stone","metal","water","keratin","ocular","general",
];
export const isPencilCraftFinish=(value:unknown):value is PencilCraftFinish=>{
  if(!value||typeof value!=="object")return false;
  const v=value as Partial<PencilCraftFinish>;
  return typeof v.kind==="string"&&pencilCraftKinds.includes(v.kind as PencilCraftKind)&&
    typeof v.burnish==="number"&&Number.isFinite(v.burnish)&&v.burnish>=0&&v.burnish<=1&&
    typeof v.light==="number"&&Number.isFinite(v.light)&&v.light>=0&&v.light<=1&&
    typeof v.tooth==="number"&&Number.isFinite(v.tooth)&&v.tooth>=0&&v.tooth<=1&&
    (v.pigmentDensity===undefined||
      (typeof v.pigmentDensity==="number"&&Number.isFinite(v.pigmentDensity)&&
        v.pigmentDensity>=0&&v.pigmentDensity<=1))&&
    (v.tonalSupportWeight===undefined||
      (typeof v.tonalSupportWeight==="number"&&
        Number.isFinite(v.tonalSupportWeight)&&
        v.tonalSupportWeight>=0&&v.tonalSupportWeight<=1));
};
const clamp=(x:number,min:number,max:number)=>Math.max(min,Math.min(max,x));
const coordinate=(x:number)=>x.toFixed(2);

/**
 * Generate irregular, interleaved *short* pigment deposits, not continuous
 * engineering hatches. The geometry is deterministic at every frame.
 * Marks remain within an authored clipped silhouette; no inferred anatomy.
 * Each stroke grouping contains many independently jittered Bézier hairs.
 *
 * Hard cap = 3 groups x 700 segments to bound SSR and export performance.
 */
export function pencilMicroDeposit(region:Pick<PencilRegion,"bounds"|"layers">,
  craft:PencilCraftFinish, seed:number):PencilMicroGroup[]{
  if(!isPencilCraftFinish(craft)||!Number.isSafeInteger(seed)||seed<0||
    seed>2147483647)throw new RangeError("Invalid pencil craft deposition input");
  const [x,y,w,h]=region.bounds;
  if(![x,y,w,h].every(Number.isFinite)||w<=0||h<=0||
    w>4096||h>4096||!region.layers.length)
    throw new RangeError("Invalid pigment deposition bounds");
  const area=w*h;
  const hairlike=["fur","hair","feather","foliage"].includes(craft.kind);
  const tiny=["skin","ocular","keratin"].includes(craft.kind);
  const baseline=clamp(Math.floor(area*(hairlike?.11:tiny?.14:.075)),18,2100);
  // ArtCraft source-free physical pencil layering. Never increase wax
  // density for all consumers implicitly: high-detail hair/coat artists
  // must author this profile explicitly after checking form topology.
  const density=craft.pigmentDensity??0;
  const count=density===0?baseline:
    clamp(Math.floor(baseline*(1+density*2.2)),18,5500);
  const groupSize=[Math.floor(count*.40),Math.floor(count*.35)];
  groupSize.push(count-groupSize[0]-groupSize[1]);
  const palette=region.layers.map(l=>l.color);
  const angle=region.layers[0].angle*Math.PI/180;
  const flow=(region.layers[0].flow??0)*Math.PI/180;
  const scale=hairlike?1:tiny?.56:.82;
  const lengthBase=hairlike?10:tiny?2.4:6;
  const marks:PencilMicroGroup[]=[];
  let number=0;
  for(let group=0;group<3;group++){
    const paths:string[]=[];
    for(let i=0;i<groupSize[group];i++,number++){
      // Deterministic golden-angle jitter avoids a Cartesian grid and aliasing.
      const u=(pencilHash(seed,number,50)+number*.61803398875)%1;
      const v=(pencilHash(seed,number,51)+number*.41421356237)%1;
      const px=x+u*w,py=y+v*h;
      const value=.25+.5*(.5*u+.5*v);
      const turn=angle+flow*(v-.5)+
        (pencilHash(seed,number,53)-.5)*(hairlike?.40:.83);
      const length=lengthBase*(.5+1.15*pencilHash(seed,number,54))*
        (group===0?1.18:group===1?.9:.58);
      const dx=Math.cos(turn)*length*scale;
      const dy=Math.sin(turn)*length*scale;
      const curve=(pencilHash(seed,number,55)-.5)*length*.26;
      const cx=px+dx*.48-Math.sin(turn)*curve;
      const cy=py+dy*.48+Math.cos(turn)*curve;
      const ex=px+dx,ey=py+dy;
      // Very bright zones retain less surface pigment; never uniformly saturate.
      if(group===1&&value<.31&&pencilHash(seed,number,56)<.72)continue;
      paths.push("M"+coordinate(px)+" "+coordinate(py)+" Q"+
        coordinate(cx)+" "+coordinate(cy)+" "+coordinate(ex)+" "+coordinate(ey));
    }
    marks.push({
      path:paths.join(" "),
      color:palette[Math.min(palette.length-1,group)],
      width:(tiny?.34:hairlike?.51:.60)*(group===2?.75:1),
      opacity:clamp((.18+craft.burnish*.18)*(group===2?.8:1),.12,.43),
      count:paths.length,
    });
  }
  return marks;
}

/** Build pigment grain as one reusable fixed paper-space tile.
 * Each dot reads four consecutive hash indices. Reading x and y from one index
 * with two nearby salts made them correlated: every dot fell on two diagonal
 * lines per tile, which showed as pale diagonal streaks through the pigment. */
export interface PencilGrainDot {x:number;y:number;r:number;value:number;}
export function pencilGrainTile(seed:number,count=750):PencilGrainDot[]{
  if(!Number.isSafeInteger(seed)||seed<0||seed>2147483647||
    !Number.isSafeInteger(count)||count<0||count>1100)
    throw new RangeError("Invalid paper-grain tile request");
  return Array.from({length:count},(_,i)=>({
    x:pencilHash(seed,4*i,61)*64,
    y:pencilHash(seed,4*i+1,61)*64,
    r:.10+pencilHash(seed,4*i+2,61)*.50,
    value:.35+pencilHash(seed,4*i+3,61)*.65,
  }));
}
