/** SL1: collision-aware labels anchored to real semantic targets.
 * Consumers measure loaded font glyphs first; no character-count guessing.
 * Re-evaluate at chosen motion keyframes (not every frame) if geometry moves.
 */
import type { Rect } from "../motion/types";
export type LabelSide="right"|"left"|"above"|"below";
export interface SemanticLabelRequest {
  id:string;
  targetId:string;
  /** Actual measured text box, including its own padding, in design px. */
  width:number;
  height:number;
  priority?:number;
  preferred?:readonly LabelSide[];
  /** Clearance from the target and other labels (defaults to 12px). */
  gap?:number;
}
export interface LabelLayoutInput {
  viewport: {width:number;height:number};
  /** E.g., source card, data cluster, 3D object projected bounds. */
  subjects:readonly {id:string;bounds:Rect}[];
  labels:readonly SemanticLabelRequest[];
  safeInset?:number;
}
export interface PlacedSemanticLabel {
  id:string;
  targetId:string;
  side:LabelSide;
  bounds:Rect;
}
export interface SemanticLabelLayout {
  placed:PlacedSemanticLabel[];
  unplaced:string[];
  ok:boolean;
}
const finite=(n:number)=>Number.isFinite(n);
const validRect=(r:Rect)=>[r.x,r.y,r.width,r.height].every(finite)&&r.width>0&&r.height>0;
const sides:readonly LabelSide[]=["right","above","below","left"];
const intersect=(a:Rect,b:Rect,gap=0)=>
  a.x < b.x+b.width+gap&&a.x+a.width+gap>b.x &&
  a.y < b.y+b.height+gap&&a.y+a.height+gap>b.y;
function proposed(side:LabelSide,target:Rect,label:SemanticLabelRequest,space:number):Rect {
  const midX=target.x+target.width/2,midY=target.y+target.height/2;
  if(side==="right")return {x:target.x+target.width+space,y:midY-label.height/2,width:label.width,height:label.height};
  if(side==="left")return {x:target.x-label.width-space,y:midY-label.height/2,width:label.width,height:label.height};
  if(side==="below")return {x:midX-label.width/2,y:target.y+target.height+space,width:label.width,height:label.height};
  return {x:midX-label.width/2,y:target.y-label.height-space,width:label.width,height:label.height};
}
/** Greedy by explicit priority, then source order; no backtracking or DOM.
 * Unlike raw SVG text anchors, failure is explicit rather than clipped.
 * This function never invents a new label position far from its target.
 */
export function layoutSemanticLabels(input:LabelLayoutInput):SemanticLabelLayout {
  const {viewport,subjects,labels}=input,margin=input.safeInset??12;
  if(!finite(viewport.width)||!finite(viewport.height)||viewport.width<=0||
    viewport.height<=0||!finite(margin)||margin<0)
    throw new Error("Label layout requires a positive viewport and valid safe inset.");
  const byId=new Map<string,Rect>();
  for(const sub of subjects) {
    if(!sub.id.trim()||byId.has(sub.id)||!validRect(sub.bounds))
      throw new Error(`Invalid or duplicate semantic target "${sub.id}".`);
    byId.set(sub.id,sub.bounds);
  }
  const seen=new Set<string>(),placed:PlacedSemanticLabel[]=[],unplaced:string[]=[];
  const sorted=labels.map((label,index)=>({label,index}))
    .sort((a,b)=>(b.label.priority??0)-(a.label.priority??0)||a.index-b.index);
  for(const {label} of sorted){
    if(!label.id.trim()||seen.has(label.id)||!finite(label.width)||
      !finite(label.height)||label.width<=0||label.height<=0||
      !finite(label.gap??12)||(label.gap??12)<0)
      throw new Error(`Invalid or duplicate semantic label "${label.id}".`);
    seen.add(label.id);
    const target=byId.get(label.targetId);
    if(!target){unplaced.push(label.id);continue;}
    const preferred=label.preferred?.length?label.preferred:sides;
    let result:PlacedSemanticLabel|undefined;
    for(const side of [...new Set(preferred)]) {
      if(!sides.includes(side))throw new Error(`Unknown label attachment side "${side}".`);
      const box=proposed(side,target,label,label.gap??12);
      if(box.x<margin||box.y<margin||
        box.x+box.width>viewport.width-margin||
        box.y+box.height>viewport.height-margin)continue;
      if([...byId.entries()].some(([id,rect])=>id!==label.targetId&&intersect(box,rect,4)))continue;
      if(placed.some(other=>intersect(box,other.bounds,4)))continue;
      result={id:label.id,targetId:label.targetId,side,bounds:box};
      break;
    }
    if(result)placed.push(result);
    else unplaced.push(label.id);
  }
  return {placed,unplaced,ok:unplaced.length===0};
}
