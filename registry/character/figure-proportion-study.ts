/**
 * Reference-image character proportion studies.
 *
 * The input landmarks are ARTIST-ESTIMATED 2D positions in an original source
 * image, never inferred anatomical 3D measurements. Occluded joints are absent,
 * rather than invented. This library holds NO embedded copyrighted imagery.
 */
export type FigureVec2={x:number;y:number};
export type FigureBox={x:number;y:number;width:number;height:number};
export type FigureConfidence="clear"|"estimated";
export type FigureRegion=
  |"hair"|"skull"|"face"|"brow-screen-left"|"brow-screen-right"
  |"eye-screen-left"|"eye-screen-right"|"nose"|"mouth"|"neck"
  |"torso"|"arm-screen-left"|"arm-screen-right"
  |"hand-screen-left"|"hand-screen-right"
  |"sleeve-screen-left"|"sleeve-screen-right"
  |"waist"|"hip"|"robe"|"leg-screen-left"|"leg-screen-right"
  |"foot-screen-left"|"foot-screen-right"|"ornament";
export type FigureLandmark=
  |"head-top"|"chin"|"face-left"|"face-right"
  |"hairline"|"bun-top"|"bun-center"|"ribbon-tip"
  |"brow-left-inner"|"brow-left-outer"|"brow-right-inner"|"brow-right-outer"
  |"eye-left-inner"|"eye-left-outer"|"eye-right-inner"|"eye-right-outer"
  |"nose-root"|"nose-tip"|"nostril"|"mouth-left"|"mouth-right"
  |"neck-left"|"neck-right"
  |"shoulder-left"|"shoulder-right"|"elbow-left"|"elbow-right"
  |"wrist-left"|"wrist-right"|"hand-left"|"hand-right"
  |"waist-left"|"waist-right"|"hip-left"|"hip-right"
  |"knee-left"|"knee-right"|"ankle-left"|"ankle-right"
  |"foot-left"|"foot-right"
  |"sleeve-left-top"|"sleeve-left-bottom"
  |"sleeve-right-top"|"sleeve-right-bottom"
  |"robe-hem-left"|"robe-hem-right";
export interface ObservedLandmark{
  point:FigureVec2;
  confidence:FigureConfidence;
  /** Measured position uncertainty in original image pixels; not 3D accuracy. */
  tolerancePx:number;
}
export interface FigureReferenceMesh {
  id:string;
  /** The uploaded image stays private; only the artist's measured coordinates are stored. */
  source:{name:string;width:number;height:number};
  figure:FigureBox;
  /** Decorative elements such as hair ribbons can extend beyond figure bounds. */
  fullSilhouette:FigureBox;
  view:"three-quarter-left"|"three-quarter-right"|"profile-left"|"front";
  pose:string;
  /** Screen-left/right are IMAGE coordinates, not anatomical left/right. */
  regions:Partial<Record<FigureRegion,FigureBox>>;
  landmarks:Partial<Record<FigureLandmark,ObservedLandmark>>;
  /** Explicitly unknown landmarks/regions, never silently synthesized. */
  occluded:Partial<Record<FigureLandmark|string,string>>;
  /** Low-sampling certainty, artwork style, handedness and pose notes. */
  notes:readonly string[];
}
export interface ProportionMetric {
  id:string;label:string;value:number|null;
  support:"measured"|"estimated"|"unobservable";
  note:string;
}
export interface ProportionDifference extends ProportionMetric {
  teacher:number|null;student:number|null;delta:number|null;
  relativeError:number|null;
  /** Not graded if either measurement is missing or incomparable in pose. */
  status:"within-tolerance"|"review-required"|"unobservable";
}
const finite=(x:number)=>Number.isFinite(x);
const validBox=(b:FigureBox)=>[b.x,b.y,b.width,b.height].every(finite)&&
  b.width>0&&b.height>0;
export function validateFigureReference(mesh:FigureReferenceMesh):string[]{
  const errors:string[]=[];
  if(!mesh||!Number.isFinite(mesh.source.width)||!Number.isFinite(mesh.source.height)||
     mesh.source.width<=0||mesh.source.height<=0)
    return ["Source image dimensions must be positive."];
  for(const [name,b] of Object.entries({
    figure:mesh.figure,fullSilhouette:mesh.fullSilhouette,...mesh.regions,
  })){
    if(!validBox(b)||b.x<0||b.y<0||
      b.x+b.width>mesh.source.width+1||
      b.y+b.height>mesh.source.height+1)
      errors.push("Invalid "+name+" rectangle.");
  }
  for(const [name,m] of Object.entries(mesh.landmarks)){
    if(!m||!finite(m.point.x)||!finite(m.point.y)||
      m.point.x<0||m.point.x>mesh.source.width||
      m.point.y<0||m.point.y>mesh.source.height||
      !finite(m.tolerancePx)||m.tolerancePx<0||
      (m.confidence!=="clear"&&m.confidence!=="estimated"))
      errors.push("Invalid landmark "+name+".");
  }
  for(const id of Object.keys(mesh.occluded)){
    if(id in mesh.landmarks)errors.push(id+" is simultaneously measured and occluded.");
  }
  return errors;
}
export function normalizeFigurePoint(mesh:FigureReferenceMesh,p:FigureVec2):FigureVec2{
  if(!finite(p.x)||!finite(p.y)||!validBox(mesh.figure))
    throw new RangeError("Finite source point and positive figure dimensions required.");
  return {x:(p.x-mesh.figure.x)/mesh.figure.width,
    y:(p.y-mesh.figure.y)/mesh.figure.height};
}
const norm=(n:number)=>Math.round(n*10000)/10000;
function measure(
  id:string,label:string,mesh:FigureReferenceMesh,
  compute:()=>number|null,estimated=false,note="Projected image-space ratio",
):ProportionMetric {
  const value=compute();
  return {id,label,value:value===null?null:norm(value),
    support:value===null?"unobservable":estimated?"estimated":"measured",
    note:value===null?"Not visible in the source painting; no anatomical guess.":note};
}
const region=(m:FigureReferenceMesh,id:FigureRegion)=>m.regions[id];
const lmk=(m:FigureReferenceMesh,id:FigureLandmark)=>m.landmarks[id]?.point;
const span=(a?:number,b?:number)=>a===undefined||b===undefined?null:Math.abs(a-b);
const length=(a?:FigureVec2,b?:FigureVec2)=>
  a&&b?Math.hypot(a.x-b.x,a.y-b.y):null;
/** Human-readable, projected proportions only. Perspective, foreshortening and
 * robe coverage are explicitly not treated as anatomical ground truth.
 */
export function figureRatios(m:FigureReferenceMesh):ProportionMetric[]{
  const fh=m.figure.height;
  const skull=region(m,"skull"),face=region(m,"face"),
    torso=region(m,"torso"),robe=region(m,"robe");
  const sl=region(m,"sleeve-screen-left"),sr=region(m,"sleeve-screen-right");
  const brow=length(lmk(m,"brow-left-inner"),lmk(m,"eye-left-inner"));
  const metrics:ProportionMetric[]=[
    measure("head-to-height","Skull height / total figure",m,()=>skull?skull.height/fh:null,
      false,"Hair/bun excluded from skull height"),
    measure("face-to-height","Face height / total figure",m,()=>face?face.height/fh:null),
    measure("face-width-to-head","Face width / skull width",m,
      ()=>skull&&face?face.width/skull.width:null),
    measure("eye-spacing-to-face","Eye-centre spacing / face width",m,()=>{
      const a=lmk(m,"eye-left-inner"),b=lmk(m,"eye-right-inner");
      return a&&b&&face?Math.abs(a.x-b.x)/face.width:null;
    },true,"Three-quarter view projects eye spacing; not a frontal anthropometric ratio"),
    measure("brow-eye-gap","Brow/eye projected distance / skull height",m,
      ()=>brow!==null&&skull?brow/skull.height:null,true),
    measure("nose-face-length","Nose length / face height",m,()=>{
      const d=length(lmk(m,"nose-root"),lmk(m,"nose-tip"));
      return d!==null&&face?d/face.height:null;
    },true),
    measure("mouth-face-width","Mouth width / face width",m,()=>{
      const d=length(lmk(m,"mouth-left"),lmk(m,"mouth-right"));
      return d!==null&&face?d/face.width:null;
    },true),
    measure("neck-width","Neck width / shoulder span",m,()=>{
      const neck=span(lmk(m,"neck-left")?.x,lmk(m,"neck-right")?.x);
      const shoulder=span(lmk(m,"shoulder-left")?.x,lmk(m,"shoulder-right")?.x);
      return neck!==null&&shoulder!==null&&shoulder>0?neck/shoulder:null;
    },true),
    measure("shoulder-height","Shoulder span / figure height",m,()=>{
      const d=length(lmk(m,"shoulder-left"),lmk(m,"shoulder-right"));
      return d!==null?d/fh:null;
    },true),
    measure("torso-height","Torso box height / figure height",m,()=>torso?torso.height/fh:null),
    measure("waist-shoulder","Waist width / shoulder width",m,()=>{
      const w=length(lmk(m,"waist-left"),lmk(m,"waist-right"));
      const sh=length(lmk(m,"shoulder-left"),lmk(m,"shoulder-right"));
      return w!==null&&sh!==null&&sh>0?w/sh:null;
    },true),
    measure("sleeve-to-height","Tallest sleeve / figure height",m,
      ()=>sl&&sr?Math.max(sl.height,sr.height)/fh:null),
    measure("sleeve-to-shoulder","Combined sleeve spread / shoulder width",m,()=>{
      const sh=length(lmk(m,"shoulder-left"),lmk(m,"shoulder-right"));
      return sl&&sr&&sh!==null&&sh>0
        ?(sr.x+sr.width-sl.x)/sh:null;
    },true),
    measure("robe-hem-to-height","Robe hem span / total height",m,()=>{
      const a=lmk(m,"robe-hem-left"),b=lmk(m,"robe-hem-right");
      return a&&b?Math.abs(a.x-b.x)/fh:null;
    },true),
    measure("robe-height","Robe visual length / figure height",m,
      ()=>robe?robe.height/fh:null),
    measure("foot-span","Shoe-centre span / figure height",m,()=>{
      const d=length(lmk(m,"foot-left"),lmk(m,"foot-right"));
      return d!==null?d/fh:null;
    },true),
    measure("knee-height","Knee to hip / figure height",m,()=>{
      const k=lmk(m,"knee-left"),hip=lmk(m,"hip-left");
      return k&&hip?Math.abs(k.y-hip.y)/fh:null;
    },true),
    measure("shin-length","Knee to ankle / figure height",m,()=>{
      const d=length(lmk(m,"knee-left"),lmk(m,"ankle-left"));
      return d!==null?d/fh:null;
    },true),
    measure("forearm-length","Elbow to wrist / figure height",m,()=>{
      const d=length(lmk(m,"elbow-left"),lmk(m,"wrist-left"));
      return d!==null?d/fh:null;
    },true),
    measure("hand-face-distance","Visible hand to nose / figure height",m,()=>{
      const d=length(lmk(m,"hand-left"),lmk(m,"nose-tip"));
      return d!==null?d/fh:null;
    },true),
  ];
  return metrics;
}
export function compareFigureRatios(
  teacher:FigureReferenceMesh,student:FigureReferenceMesh,
  tolerance=.13,
):ProportionDifference[]{
  if(!finite(tolerance)||tolerance<0||tolerance>1)throw new RangeError("Invalid tolerance.");
  const a=figureRatios(teacher),b=figureRatios(student);
  return a.map((metric,i)=>{
    const current=b[i],hasBoth=metric.value!==null&&current.value!==null;
    const delta=hasBoth?norm(current.value!-metric.value!):null;
    const relative=hasBoth?norm(Math.abs(delta!)/Math.max(.01,Math.abs(metric.value!))):null;
    return {...metric,teacher:metric.value,student:current.value,
      delta,relativeError:relative,
      status:relative===null?"unobservable":
        relative>tolerance?"review-required":"within-tolerance"};
  });
}
