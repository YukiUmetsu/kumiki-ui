/**
 * Stage-1 head-only artist annotation session.
 *
 * The source PHOTO and native SVG render are annotated separately. This
 * file does not infer anatomy landmarks from ANAT1, auto-sample pixel
 * values, fetch remote images or claim artist approval. The exported
 * manifest is fed into the exact-byte capture CLI after source review.
 */
import {
  HEAD_FIDELITY_LANDMARK_IDS, HEAD_FIDELITY_TONES,
  type HeadFidelityLandmarkId, type HeadFidelityToneId,
  type HeadFidelityPoint,
} from "./colored-pencil-head-fidelity";

export type HeadAnnotationSide="source"|"output";
export type NativeDimensions={width:number;height:number};
export type NativePoint={x:number;y:number};
export type NativeRect=NativePoint&{width:number;height:number};
export type NativeToneBox={id:HeadFidelityToneId;rect:NativeRect};
export type AnnotatedHeadSide={
  landmarks:HeadFidelityPoint[];
  tones:NativeToneBox[];
};
export type HeadAnnotationSession={
  source:AnnotatedHeadSide;
  output:AnnotatedHeadSide;
};
export type HeadAnnotationProvenance={
  url:string;license:string;credit:string;
};

const sideOf=(p:HeadAnnotationSession,which:HeadAnnotationSide)=>
  p[which];
const legalLandmarks=new Set<string>(HEAD_FIDELITY_LANDMARK_IDS);
const legalTones=new Set<string>(HEAD_FIDELITY_TONES);
const legalLicenses=new Set([
  "CC0-1.0","CC-BY-4.0","CC-BY-SA-4.0",
  "CC-BY-3.0","CC-BY-SA-3.0","PDM-1.0","PD-US",
]);
const finite=(x:number)=>Number.isFinite(x);
function assertDimensions(d:NativeDimensions){
  if(!Number.isSafeInteger(d.width)||!Number.isSafeInteger(d.height)||
    d.width<3||d.height<3)
    throw new RangeError("Original pixel dimensions must be positive integers");
}
function assertPoint(p:NativePoint,d:NativeDimensions){
  if(!finite(p.x)||!finite(p.y)||p.x<0||p.y<0||
    p.x>d.width||p.y>d.height)
    throw new RangeError("Point is outside original image bounds");
}
export function emptyHeadAnnotations():HeadAnnotationSession{
  return {source:{landmarks:[],tones:[]},
    output:{landmarks:[],tones:[]}};
}

/** The displayed image is rendered without letterboxing or CSS object-fit.
 * The bounding rectangle therefore maps exactly to the original pixels.
 * When the pointer leaves the image we clamp to valid native boundaries.
 */
export function clientToNativePoint(
  client:{clientX:number;clientY:number},
  element:{left:number;top:number;width:number;height:number},
  original:NativeDimensions,
):NativePoint{
  assertDimensions(original);
  if(!finite(element.width)||!finite(element.height)||
    element.width<=0||element.height<=0)
    throw new RangeError("Displayed image dimensions must be positive");
  const x=(client.clientX-element.left)/element.width*original.width;
  const y=(client.clientY-element.top)/element.height*original.height;
  return {x:Math.round(Math.max(0,Math.min(original.width,x))),
    y:Math.round(Math.max(0,Math.min(original.height,y)))};
}

function changedSide(
  original:HeadAnnotationSession,side:HeadAnnotationSide,
  next:AnnotatedHeadSide,
):HeadAnnotationSession{
  return {...original,[side]:next};
}

export function annotatedPoint(
  original:HeadAnnotationSession,side:HeadAnnotationSide,
  id:HeadFidelityLandmarkId,p:NativePoint,d:NativeDimensions,
):HeadAnnotationSession{
  assertDimensions(d);assertPoint(p,d);
  if(!legalLandmarks.has(id))throw new RangeError("Unknown head landmark ID");
  const existing=sideOf(original,side);
  return changedSide(original,side,{
    ...existing,
    landmarks:[
      ...existing.landmarks.filter(v=>v.id!==id),
      {id,x:Math.round(p.x),y:Math.round(p.y)},
    ],
  });
}

const intersects=(a:NativeRect,b:NativeRect)=>
  Math.min(a.x+a.width,b.x+b.width)>Math.max(a.x,b.x)&&
  Math.min(a.y+a.height,b.y+b.height)>Math.max(a.y,b.y);

export function annotatedTone(
  original:HeadAnnotationSession,side:HeadAnnotationSide,
  id:HeadFidelityToneId,a:NativePoint,b:NativePoint,d:NativeDimensions,
):HeadAnnotationSession{
  assertDimensions(d);
  if(!legalTones.has(id))throw new RangeError("Unknown tone ID");
  assertPoint(a,d);assertPoint(b,d);
  const x=Math.round(Math.min(a.x,b.x)),y=Math.round(Math.min(a.y,b.y));
  const width=Math.round(Math.abs(a.x-b.x));
  const height=Math.round(Math.abs(a.y-b.y));
  if(width<3||height<3)
    throw new RangeError("Tone rectangle must be at least 3 pixels per side");
  const rect={x,y,width,height};
  if(x<0||y<0||x+width>d.width||y+height>d.height)
    throw new RangeError("Tone rectangle is outside original image bounds");
  const existing=sideOf(original,side);
  const others=existing.tones.filter(v=>v.id!==id);
  if(others.some(other=>intersects(rect,other.rect)))
    throw new RangeError("Tone rectangles overlap: each physical value requires an independent ROI");
  return changedSide(original,side,{
    ...existing,tones:[...others,{id,rect}],
  });
}

/** Remove exactly ONE mistakenly annotated semantic point or tone box.
 * The other original image and every other mark are immutable; no "clear
 * source" operation may silently delete the independent output evidence.
 */
export function removeHeadAnnotation(
  session:HeadAnnotationSession,side:HeadAnnotationSide,
  kind:"landmark"|"tone",id:HeadFidelityLandmarkId|HeadFidelityToneId,
):HeadAnnotationSession{
  const expected=kind==="landmark"?legalLandmarks:legalTones;
  if(!expected.has(id))throw new RangeError("Unknown "+kind+" annotation ID");
  const previous=sideOf(session,side);
  if(kind==="landmark"){
    const remaining=previous.landmarks.filter(p=>p.id!==id);
    if(remaining.length===previous.landmarks.length)return session;
    return changedSide(session,side,{...previous,landmarks:remaining});
  }
  const remaining=previous.tones.filter(p=>p.id!==id);
  if(remaining.length===previous.tones.length)return session;
  return changedSide(session,side,{...previous,tones:remaining});
}

/** Manifest only: no source pixels, synthetic RGB or invented hashes.
 * The exact-byte capture CLI will hash and mean-sample BOTH real files.
 */
export function compileHeadAnnotationManifest(
  session:HeadAnnotationSession,origin:HeadAnnotationProvenance,
){
  let url:URL;
  try{url=new URL(origin.url);}
  catch{throw new Error("A valid HTTPS original source URL is required");}
  if(url.protocol!=="https:"||!url.hostname||url.username||url.password)
    throw new Error("A valid HTTPS original source URL is required");
  if(!legalLicenses.has(origin.license))
    throw new Error("The original photo must have a verified supported license");
  if(!origin.credit?.trim())
    throw new Error("Original photographer credit is required");
  for(const side of ["source","output"] as const){
    const annotated=session[side];
    if(annotated.landmarks.length!==18||
       HEAD_FIDELITY_LANDMARK_IDS.some(id=>
         !annotated.landmarks.some(point=>point.id===id)))
      throw new Error(side+" must have all 18 separately annotated head landmarks");
    if(annotated.tones.length!==5||
       HEAD_FIDELITY_TONES.some(id=>
         !annotated.tones.some(tone=>tone.id===id)))
      throw new Error(side+" must have all five independently drawn tone boxes");
  }
  return {
    source:{url:origin.url,license:origin.license,credit:origin.credit},
    sourceLandmarks:HEAD_FIDELITY_LANDMARK_IDS.map(id=>
      session.source.landmarks.find(p=>p.id===id)!),
    outputLandmarks:HEAD_FIDELITY_LANDMARK_IDS.map(id=>
      session.output.landmarks.find(p=>p.id===id)!),
    sourceTones:HEAD_FIDELITY_TONES.map(id=>
      session.source.tones.find(t=>t.id===id)!),
    outputTones:HEAD_FIDELITY_TONES.map(id=>
      session.output.tones.find(t=>t.id===id)!),
  };
}
