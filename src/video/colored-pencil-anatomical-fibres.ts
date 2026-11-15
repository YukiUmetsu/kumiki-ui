import { pencilHash } from "../../registry/video/colored-pencil";
import type { PencilTrace } from "../../registry/video/colored-pencil";

/**
 * ArtCraft: source-guided ANATOMICAL (not image-filtered) guard hair and vane field.
 *
 * An illustrator authors a root-to-tip *growth curve*, the width of that
 * follicle/feather tract and its three pencil pigments. Seeds only supply
 * quiet, stable local irregularity. All roots stay on the sampled tract.
 * The main actor silhouette is independent, editable and keeps its opaque
 * paper backing; the renderer clips these details to the same anatomical part.
 */
export type FibreGrowthAxis = readonly [
  number,number,number,number,number,number
];
export interface PencilFibreField {
  id: string;
  axis: FibreGrowthAxis;
  /** Brush width orthogonal to the authored growth centreline, in paper units. */
  spread: number;
  /** Mean root-to-tip stroke length, in paper units. */
  length: number;
  /** Actual individual root-to-tip lines, divided into 3 pigment groups. */
  count: number;
  seed: number;
  palette: readonly [string,string,string];
  startFrame?: number;
}
export const pencilFibreNames=(id:string)=>[
  id+"-shadow",id+"-body",id+"-light",
] as const;
const fixed=(x:number)=>x.toFixed(2);
const qPoint=(a:FibreGrowthAxis,t:number):readonly[number,number]=>{
  const u=1-t;
  return [
    u*u*a[0]+2*u*t*a[2]+t*t*a[4],
    u*u*a[1]+2*u*t*a[3]+t*t*a[5],
  ];
};
const qTangent=(a:FibreGrowthAxis,t:number):readonly[number,number]=>{
  const dx=2*(1-t)*(a[2]-a[0])+2*t*(a[4]-a[2]);
  const dy=2*(1-t)*(a[3]-a[1])+2*t*(a[5]-a[3]);
  const magnitude=Math.hypot(dx,dy);
  if(magnitude<1e-5)throw new RangeError("Degenerate anatomical hair-growth curve");
  return [dx/magnitude,dy/magnitude];
};
const HEX=/^#[\da-f]{6}$/i;
const name=/^[a-z][\w-]{0,26}$/;

/**
 * Root-to-tip flow, not horizontal stipples: follows the authored quadratic.
 * Width/opacity remain optical-pencil thin; no black contour stickers.
 */
export function anatomicalFibreTraces(spec:PencilFibreField):PencilTrace[]{
  if(!name.test(spec.id)||spec.axis.length!==6||
    spec.axis.some(x=>!Number.isFinite(x)||Math.abs(x)>4096)||
    Math.hypot(spec.axis[4]-spec.axis[0],spec.axis[5]-spec.axis[1])<10||
    !Number.isFinite(spec.spread)||spec.spread<.4||spec.spread>40||
    !Number.isFinite(spec.length)||spec.length<2||spec.length>23||
    !Number.isSafeInteger(spec.count)||spec.count<18||spec.count>240||
    !Number.isSafeInteger(spec.seed)||spec.seed<0||spec.seed>2147483647||
    !Array.isArray(spec.palette)||spec.palette.length!==3||
    spec.palette.some(c=>!HEX.test(c))||
    (spec.startFrame!==undefined&&(!Number.isSafeInteger(spec.startFrame)||
      spec.startFrame<0||spec.startFrame>320)))
    throw new RangeError("Invalid anatomical pencil fibre field");
  const groups:string[][]=[[],[],[]];
  const portions=[.43,.38,.19];
  const starts=[0,Math.floor(spec.count*portions[0]),
    Math.floor(spec.count*(portions[0]+portions[1]))];
  const split=spec.count-starts[2];
  if(split<3)throw new RangeError("Not enough guard fibres");
  for(let i=0;i<spec.count;i++){
    const group=i<starts[1]?0:i<starts[2]?1:2;
    const t=.03+.90*pencilHash(spec.seed,i,59);
    const [px,py]=qPoint(spec.axis,t);
    const [dx,dy]=qTangent(spec.axis,t);
    const [nx,ny]=[-dy,dx];
    // Golden-angle phase prevents identical follicle spacing while respecting
    // the authored tract boundary. No disjoint floating ornamental strokes.
    const lateral=((i*.61803398875+
      (pencilHash(spec.seed,i,60)-.5)*.13)%1)*2-1;
    const offset=lateral*spec.spread*(.68+.27*Math.sin(Math.PI*t));
    const x=px+nx*offset,y=py+ny*offset;
    const length=spec.length*(.44+.86*pencilHash(spec.seed,i,61))*
      (group===2?1.27:group===0?.83:1);
    const fan=(pencilHash(spec.seed,i,62)-.5)*.32+lateral*.22;
    const gx=dx*Math.cos(fan)-dy*Math.sin(fan);
    const gy=dx*Math.sin(fan)+dy*Math.cos(fan);
    const curl=(pencilHash(spec.seed,i,63)-.5)*length*.22;
    const cx=x+gx*length*.52+nx*curl,cy=y+gy*length*.52+ny*curl;
    const tipX=x+gx*length,tipY=y+gy*length;
    groups[group].push("M"+fixed(x)+" "+fixed(y)+
      " Q"+fixed(cx)+" "+fixed(cy)+
      " "+fixed(tipX)+" "+fixed(tipY));
  }
  const names=pencilFibreNames(spec.id);
  return groups.map((strokes,j)=>{
    const path=strokes.join(" ");
    if(path.length>12000)throw new RangeError("Fibre SVG exceeds CP1 trace budget");
    return {
      id:names[j],path,color:spec.palette[j],
      width:j===0?.49:j===1?.38:.31,
      opacity:j===0?.63:j===1?.68:.77,
      startFrame:(spec.startFrame??190)+j*13,
      durationFrames:j===0?66:j===1?76:86,
    };
  });
}
