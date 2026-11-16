import type {RisoCharacterSpec} from "../../registry/video/riso-character";
import {evaluateRisoCharacter} from "../../registry/video/riso-character";
import {selectRisoSourceContour,risoPointInContour} from "../../registry/video/riso-path-geometry";
import {riso36ContourClearance,riso36WorldContour} from "./riso36-red-silhouette-gate";
import {riso43FrontIndexIds} from "./riso43-physical-paper-depth";
import type {Riso40GripStage} from "./riso40-paper-fingertip-contact";
type P=readonly [number,number];
const eps=1e-6;
const cross=(a:P,b:P,c:P)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
const on=(p:P,a:P,b:P)=>Math.abs(cross(a,b,p))<eps&&
  p[0]>=Math.min(a[0],b[0])-eps&&p[0]<=Math.max(a[0],b[0])+eps&&
  p[1]>=Math.min(a[1],b[1])-eps&&p[1]<=Math.max(a[1],b[1])+eps;
const intersects=(a:P,b:P,c:P,d:P)=>{
  const x=cross(a,b,c),y=cross(a,b,d),z=cross(c,d,a),w=cross(c,d,b);
  return ((x>eps&&y<-eps)||(x<-eps&&y>eps))&&
      ((z>eps&&w<-eps)||(z<-eps&&w>eps))||
    Math.abs(x)<eps&&on(c,a,b)||Math.abs(y)<eps&&on(d,a,b)||
    Math.abs(z)<eps&&on(a,c,d)||Math.abs(w)<eps&&on(b,c,d);
};
const boundaryTouches=(a:readonly P[],b:readonly P[])=>{
  for(let i=0;i<a.length;i++)for(let j=0;j<b.length;j++)
    if(intersects(a[i],a[(i+1)%a.length],b[j],b[(j+1)%b.length]))return true;
  return false;
};
const norm=(p:P,stage:Riso40GripStage):P=>[
  stage.x+p[0]*stage.scale,stage.y+p[1]*stage.scale,
];
export interface Riso44PrintContact {
  readonly actor:string;readonly frame:number;readonly side:"left"|"right";
  readonly indexRedSourceCount:number;
  /** Minimum real source-red-to-paper WHITE distance. 0 means contact
   * or overlap; positive means the named finger misses the physical page. */
  readonly nearestIndexPaperInkGap:number;
  readonly overPaperParts:readonly string[];
  readonly redIndexAreaTouchesPaper:boolean;
  readonly thumbUnderPaper:boolean;
  readonly material:"closed authored source ink and actual paper outline";
}
/** RISO44 tests actual PRINTABLE closed polygons in film space. The previous
 * RISO43 DOM source gate proved the correct six ink IDs were above the paper,
 * but not that any of those red shapes actually intersected the moving sheet.
 * Positive clearance makes the source "paper sandwich" visibly fake.
 */
export function inspectRiso44PrintedIndexContact(
  spec:RisoCharacterSpec,frame:number,side:"left"|"right",
  stage:Riso40GripStage,paperOutline:string,
):Riso44PrintContact{
  if(!Number.isFinite(stage?.scale)||stage.scale<=0||
    !Number.isFinite(stage.x)||!Number.isFinite(stage.y))
    throw new RangeError("RISO44 requires valid original film placement");
  const paper=paperOutline?
    selectRisoSourceContour(paperOutline,undefined,.25):[];
  const pose=evaluateRisoCharacter(spec,frame);
  const source=new Map(pose.parts.map(p=>[p.id,p]));
  const ids=riso43FrontIndexIds(side).filter(id=>source.get(id)?.plate==="red");
  const contacted:string[]=[];
  let gap=Infinity;
  if(paper.length){
    for(const id of ids){
      const src=source.get(id)!;
      if(src.plate!=="red"||src.paint!=="solid"||src.knockoutOnly)
        throw new Error("RISO44 missing real solid RED index "+id);
      const red=riso36WorldContour(src.d,src.transform,.25).map(p=>norm(p,stage));
      const distance=riso36ContourClearance(red,paper);
      gap=Math.min(gap,distance);
      // An edge crossing, polygon contained inside paper, or paper interior
      // inside ink all count as actual two-dimensional source-ink contact.
      if(distance<eps&&
        (boundaryTouches(red,paper)||red.some(pt=>risoPointInContour(pt,paper))||
          paper.some(pt=>risoPointInContour(pt,red))))contacted.push(id);
    }
  }
  const thumb=source.get(side+"-glove-thumb-distal-phalanx");
  if(!thumb||thumb.plate!=="red"||thumb.paint!=="solid")
    throw new Error("RISO44 missing real under-paper thumb");
  return {actor:spec.id,side,frame,indexRedSourceCount:ids.length,
    nearestIndexPaperInkGap:gap,overPaperParts:contacted,
    redIndexAreaTouchesPaper:contacted.length>0,
    thumbUnderPaper:!riso43FrontIndexIds(side).includes(thumb.id),
    material:"closed authored source ink and actual paper outline"};
}
