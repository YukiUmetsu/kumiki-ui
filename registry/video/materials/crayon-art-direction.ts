import {crayonHash} from "./crayon";
import {crayonWorldPoint,inspectCrayonScene} from "./crayon-scene";
import type {CrayonColor,CrayonContourElement,CrayonElement,CrayonSceneSpec} from "./crayon-scene";

/** Authored physical drawing operations, NOT texture presets or art approval. */
export type CrayonDrawingPhase="blocking"|"value"|"colour"|"detail";
export type CrayonPaintRole="solid"|"glaze"|"stroke";
export type CrayonSubjectKind="character"|"animal"|"botanical"|"object"|"environment";
export interface CrayonPartRule {
  nodeId:string;
  phase:CrayonDrawingPhase;
  role:CrayonPaintRole;
  /** Source-derived curve requirement; never an arbitrary global beauty score. */
  minCurves?:number;
}
export interface CrayonDrawAnchor {nodeId:string;point:{x:number;y:number}}
export interface CrayonAttachment {
  from:CrayonDrawAnchor;
  to:CrayonDrawAnchor;
  /** Camera-independent final-frame contact tolerance, in scene units. */
  tolerance:number;
}
export interface CrayonSubjectRule {
  id:string;kind:CrayonSubjectKind;rootId:string;
  parts:readonly CrayonPartRule[];
  attachments:readonly CrayonAttachment[];
}
export interface CrayonDrawingPlan {
  version:1;
  sceneId:string;
  /** Allowed START time for each construction pass; passes may overlap in deposition. */
  phases:Readonly<Record<CrayonDrawingPhase,{start:number;end:number}>>;
  subjects:readonly CrayonSubjectRule[];
  /** Explicitly excluded decorative or atmospheric elements; no hidden untracked art. */
  ambientIds:readonly string[];
}
const phaseOrder:readonly CrayonDrawingPhase[]=["blocking","value","colour","detail"];
const slug=(v:string)=>/^[a-z][a-z0-9-]{1,63}$/.test(v);
const point=(x:{x:number;y:number})=>!!x&&Number.isFinite(x.x)&&Number.isFinite(x.y)&&
  Math.abs(x.x)<=8192&&Math.abs(x.y)<=8192;

/**
 * Fail closed on untracked, ghost-like, detached or incorrectly ordered parts.
 * Structural evidence is necessary but never substitutes for reviewing pixels.
 */
export function inspectCrayonDrawingPlan(scene:CrayonSceneSpec,plan:CrayonDrawingPlan):string[]{
  const errors=inspectCrayonScene(scene).map(v=>"scene: "+v);
  if(errors.length)return errors;
  if(!plan||plan.version!==1||plan.sceneId!==scene.id||
    !Array.isArray(plan.subjects)||plan.subjects.length===0||
    !Array.isArray(plan.ambientIds)||!plan.phases)
    return ["plan must match the scene, contain subjects, phases and ambientIds"];
  const nodes=new Map(scene.elements.map(n=>[n.id,n]));
  const phaseWindows=new Map<CrayonDrawingPhase,{start:number;end:number}>();
  let previousStart=-1;
  for(const phase of phaseOrder){
    const w=plan.phases[phase];
    if(!w||!Number.isSafeInteger(w.start)||!Number.isSafeInteger(w.end)||
      w.start<0||w.end<w.start||w.end>=scene.durationFrames||w.start<=previousStart)
      errors.push("phases."+phase+" must be ordered bounded frames");
    else phaseWindows.set(phase,w);
    previousStart=w?.start??previousStart;
  }
  const claimed=new Set<string>();
  const subjectIds=new Set<string>();
  for(const subject of plan.subjects){
    if(!subject||typeof subject.id!=="string"||!slug(subject.id)||subjectIds.has(subject.id)||
      !["character","animal","botanical","object","environment"].includes(subject.kind))
      {errors.push("subject must have a unique slug and a supported kind");continue;}
    subjectIds.add(subject.id);
    const root=nodes.get(subject.rootId);
    if(root?.kind!=="wax"||root.coverage!=="opaque"||root.parentId)
      errors.push(subject.id+": root must be an unparented opaque wax mass");
    if(!Array.isArray(subject.parts)||subject.parts.length===0){
      errors.push(subject.id+": parts must be nonempty");continue;
    }
    if(!subject.parts.some(p=>p.nodeId===subject.rootId&&p.role==="solid"))
      errors.push(subject.id+": root must be declared as solid");
    for(const part of subject.parts){
      const n=nodes.get(part.nodeId);
      if(!n){errors.push(subject.id+": missing node "+part.nodeId);continue;}
      if(claimed.has(n.id))errors.push(subject.id+": duplicate claim "+n.id);
      claimed.add(n.id);
      const w=phaseWindows.get(part.phase);
      if(!w||n.timing.start<w.start||n.timing.start>w.end)
        errors.push(n.id+": construction phase start is outside "+part.phase);
      if(part.role==="solid"){
        if(n.kind!=="wax"||n.coverage!=="opaque")
          errors.push(n.id+": solid must use opaque wax");
      }else if(part.role==="glaze"){
        if(n.kind!=="wax"||n.coverage!=="open"||!n.clipToParent||
          nodes.get(n.parentId??"")?.kind!=="wax")
          errors.push(n.id+": tonal glaze must be open and clipped to a wax mass");
      }else if(part.role==="stroke"){
        if(n.kind!=="contour"||!n.clipToParent||nodes.get(n.parentId??"")?.kind!=="wax")
          errors.push(n.id+": form stroke must be clipped to a wax mass");
      }else errors.push(n.id+": unknown drawing role");
      if(part.minCurves!==undefined){
        if(!Number.isSafeInteger(part.minCurves)||part.minCurves<0||part.minCurves>80)
          errors.push(n.id+": minCurves must be a bounded integer");
        else if((n.kind==="wax"||n.kind==="contour")&&
          (n.d.match(/[CQcq]/g)??[]).length<part.minCurves)
          errors.push(n.id+": insufficient authored curves for studied anatomy");
      }
      if(n.id!==subject.rootId){
        let cursor:CrayonElement|undefined=n;
        const visited=new Set<string>();
        while(cursor&&cursor.id!==subject.rootId&&cursor.parentId&&!visited.has(cursor.id)){
          visited.add(cursor.id);
          cursor=nodes.get(cursor.parentId);
        }
        if(cursor?.id!==subject.rootId)
          errors.push(n.id+": not structurally rooted in "+subject.rootId);
      }
    }
    if(!Array.isArray(subject.attachments))errors.push(subject.id+": attachments must be an array");
    else for(const [i,link] of subject.attachments.entries()){
      const key=subject.id+": attachment["+i+"]";
      const a=link?.from,b=link?.to;
      if(!a||!b||!point(a.point)||!point(b.point)||
        !Number.isFinite(link.tolerance)||link.tolerance<0||link.tolerance>64){
        errors.push(key+": invalid anchors or tolerance");continue;
      }
      const from=nodes.get(a.nodeId),to=nodes.get(b.nodeId);
      if(!from||!to||!claimed.has(from.id)||!claimed.has(to.id)){
        errors.push(key+": anchors must belong to this subject");continue;
      }
      const pa=crayonWorldPoint(scene,from,scene.durationFrames-1,a.point);
      const pb=crayonWorldPoint(scene,to,scene.durationFrames-1,b.point);
      if(Math.hypot(pa.x-pb.x,pa.y-pb.y)>link.tolerance)
        errors.push(key+": attachment is disconnected");
    }
  }
  for(const id of plan.ambientIds){
    if(!slug(id)||!nodes.has(id)||claimed.has(id))
      errors.push("ambientIds: invalid or duplicate claim "+id);
    claimed.add(id);
  }
  for(const node of scene.elements)if(!claimed.has(node.id))
    errors.push("untracked scene element "+node.id);
  return errors;
}

/** Pressure-aware, source-guided wax marks using the normal CRAYON1 renderer. */
export interface CrayonDirectionalStrokeField {
  prefix:string;parentId:string;seed:number;count:number;
  guide:readonly [{x:number;y:number},{x:number;y:number},{x:number;y:number},{x:number;y:number}];
  spread:number;length:number;width:number;pressure:number;color:CrayonColor;
  startFrame:number;endFrame:number;
}
const at=(g:CrayonDirectionalStrokeField["guide"],t:number)=>{
  const s=1-t;
  return {x:s*s*s*g[0].x+3*s*s*t*g[1].x+3*s*t*t*g[2].x+t*t*t*g[3].x,
    y:s*s*s*g[0].y+3*s*s*t*g[1].y+3*s*t*t*g[2].y+t*t*t*g[3].y};
};
const tangent=(g:CrayonDirectionalStrokeField["guide"],t:number)=>{
  const s=1-t;
  let x=3*s*s*(g[1].x-g[0].x)+6*s*t*(g[2].x-g[1].x)+3*t*t*(g[3].x-g[2].x);
  let y=3*s*s*(g[1].y-g[0].y)+6*s*t*(g[2].y-g[1].y)+3*t*t*(g[3].y-g[2].y);
  let l=Math.hypot(x,y);
  if(l<.001){x=g[3].x-g[0].x;y=g[3].y-g[0].y;l=Math.hypot(x,y);}
  return {x:x/l,y:y/l};
};
export function crayonDirectionalStrokes(o:CrayonDirectionalStrokeField):CrayonContourElement[]{
  if(!o||!slug(o.prefix)||!slug(o.parentId)||
    !Number.isSafeInteger(o.seed)||!Number.isSafeInteger(o.count)||
    o.count<1||o.count>64||!Array.isArray(o.guide)||o.guide.length!==4||
    !o.guide.every(point)||!Number.isFinite(o.spread)||o.spread<0||o.spread>80||
    !Number.isFinite(o.length)||o.length<2||o.length>50||
    !Number.isFinite(o.width)||o.width<.2||o.width>6||
    !Number.isFinite(o.pressure)||o.pressure<.15||o.pressure>1||
    !/^#[0-9a-fA-F]{6}$/.test(o.color)||
    !Number.isSafeInteger(o.startFrame)||!Number.isSafeInteger(o.endFrame)||
    o.startFrame<0||o.endFrame<=o.startFrame||
    Math.hypot(o.guide[3].x-o.guide[0].x,o.guide[3].y-o.guide[0].y)<.01)
    throw new RangeError("Invalid directional wax stroke field");
  const marks:CrayonContourElement[]=[];
  for(let i=0;i<o.count;i++){
    const t=(i+.23+.54*crayonHash(o.seed,i,11))/(o.count+1);
    const p=at(o.guide,t),v=tangent(o.guide,t);
    const off=(crayonHash(o.seed,i,12)-.5)*o.spread;
    const n={x:-v.y,y:v.x};
    const l=o.length*(.55+.45*crayonHash(o.seed,i,13));
    const bend=(crayonHash(o.seed,i,14)-.5)*.22*l;
    const cx=p.x+n.x*off,cy=p.y+n.y*off;
    const format=(x:number)=>x.toFixed(2);
    const d="M"+format(cx-v.x*l*.5)+" "+format(cy-v.y*l*.5)+
      " Q"+format(cx+n.x*bend)+" "+format(cy+n.y*bend)+" "+
      format(cx+v.x*l*.5)+" "+format(cy+v.y*l*.5);
    marks.push({kind:"contour",id:o.prefix+"-"+(i+1),
      d,color:o.color,width:o.width*(.48+.52*o.pressure)*
      (.78+.22*crayonHash(o.seed,i,15)),
      opacity:.66+.28*o.pressure,
      parentId:o.parentId,clipToParent:true,
      timing:{start:o.startFrame,end:o.endFrame}});
  }
  return marks;
}
