/**
 * ArtCraft CP-F1 source-to-render proof contract for the unfinished HEAD.
 *
 * Distinguishes two kinds of evidence that had been conflated:
 *  - ANAT1's generated mesh points and theoretical lighting (NOT a reference).
 *  - Independently measured head-only silhouette points and tonal patches on a legally sourced PHOTO and an
 *    ACTUAL native-resolution output image (potential matching evidence).
 *
 * This is a strict STRUCTURAL and NUMERICAL preflight, not an image decoder:
 * SHA-256 digests must first be computed against the exact source/render
 * bytes by an external capture tool and swatches measured from those pixels.
 * A plausible hash string is never cryptographic proof by itself.
 *
 * There is deliberately NO artistApproved=true path in this module.
 * ArtCraft's independent artist review and exact source-image verification
 * remain mandatory even for a "measurement-ready" result.
 */
/** Stage 1 ONLY: 18 independently visible contour anchors. Do not
 * require pupils, nose, lips, eyelids or any other UN-DRAWN feature to
 * validate the one freshly authored human head. The later full-portrait
 * ArtCraft gate will have its own independent feature measurements.
 */
export const HEAD_FIDELITY_LANDMARK_IDS=[
  "cranial-apex",
  "parietal-near","parietal-far",
  "frontal-near","frontal-far",
  "upper-temple-near","upper-temple-far",
  "temple-near","temple-far",
  "zygion-near","zygion-far",
  "malar-near","malar-far",
  "gonion-near","gonion-far",
  "mandible-near","mandible-far",
  "menton",
] as const;
export type HeadFidelityLandmarkId=typeof HEAD_FIDELITY_LANDMARK_IDS[number];

export const HEAD_FIDELITY_TONES=[
  "highlight","light","halftone","core-shadow","reflected-light",
] as const;
export type HeadFidelityToneId=typeof HEAD_FIDELITY_TONES[number];

export type HeadImageEvidence={
  width:number;
  height:number;
  /** SHA-256 of the EXACT original file, not the Commons SHA-1 field. */
  sha256:string;
};
export type HeadReferenceImageEvidence=HeadImageEvidence&{
  /** Stable origin page, not just an unattributed image URL. */
  url:string;
  /** Explicit license reviewed at source, not an inferred stock-image right. */
  license:string;
  credit:string;
};
export type HeadFidelityPoint={
  id:HeadFidelityLandmarkId;
  /** Source / output pixel coordinates; annotators must work separately. */
  x:number;
  y:number;
};
export type HeadFidelityTone={
  id:HeadFidelityToneId;
  rect:{x:number;y:number;width:number;height:number};
  /** Mean native sRGB pixels from the actual reference/output ROI. */
  meanRgb:[number,number,number];
};
export type PencilHeadFidelityEvidence={
  source:HeadReferenceImageEvidence;
  output:HeadImageEvidence;
  sourceLandmarks:HeadFidelityPoint[];
  outputLandmarks:HeadFidelityPoint[];
  sourceTones:HeadFidelityTone[];
  outputTones:HeadFidelityTone[];
};
export type PencilHeadFidelityReport={
  status:"blocked"|"measurement-ready";
  errors:string[];
  /** Shape-normalized RMS, not arbitrary artboard placement error. */
  geometryRms:number|null;
  /** Mean luminance disagreement of 5 real paired swatches, 0–1. */
  tonalMeanError:number|null;
  sourceSha256:string|null;
  outputSha256:string|null;
  /** No code-generated metric can substitute for a real artist. */
  artistApproved:false;
};

const LICENSES=new Set([
  "CC0-1.0","CC-BY-4.0","CC-BY-SA-4.0",
  "CC-BY-3.0","CC-BY-SA-3.0","PDM-1.0","PD-US",
]);
const SHA256=/^[0-9a-f]{64}$/i;
const finite=(n:number)=>Number.isFinite(n);
const validDimensions=(f:HeadImageEvidence)=>
  Number.isSafeInteger(f.width)&&Number.isSafeInteger(f.height)&&
  f.width>=64&&f.height>=64&&f.width<=50000&&f.height<=50000;
const allowedUrl=(s:string)=>{
  try{const url=new URL(s);return url.protocol==="https:"||url.protocol==="http:";}
  catch{return false;}
};
const unique=(values:string[])=>new Set(values).size===values.length;

function checkPoints(
  points:HeadFidelityPoint[],file:HeadImageEvidence,
  label:"SOURCE"|"RENDER",errors:string[],
):Map<HeadFidelityLandmarkId,HeadFidelityPoint>|null{
  if(!Array.isArray(points)){
    errors.push(label+"_LANDMARK_MISSING");
    return null;
  }
  const ids=points.map(p=>p?.id);
  if(!unique(ids)){
    errors.push(label+"_LANDMARK_DUPLICATE");
  }
  const expected=new Set<string>(HEAD_FIDELITY_LANDMARK_IDS);
  if(HEAD_FIDELITY_LANDMARK_IDS.some(id=>!ids.includes(id))||
    points.length!==HEAD_FIDELITY_LANDMARK_IDS.length)
    errors.push(label+"_LANDMARK_MISSING");
  if(ids.some(id=>!expected.has(id)))
    errors.push(label+"_LANDMARK_UNKNOWN");
  if(points.some(p=>!p||!finite(p.x)||!finite(p.y)||
    p.x<0||p.y<0||p.x>file.width||p.y>file.height))
    errors.push(label+"_LANDMARK_OUT_OF_BOUNDS");
  const initialErrors=errors.some(error=>error.startsWith(label+"_LANDMARK"));
  if(initialErrors||!validDimensions(file))return null;
  const map=new Map(points.map(point=>[point.id,point]));
  const apex=map.get("cranial-apex")!,chin=map.get("menton")!;
  const near=map.get("zygion-near")!,far=map.get("zygion-far")!;
  if(chin.y-apex.y<Math.max(20,file.height*.055)||
     Math.abs(near.x-far.x)<Math.max(15,file.width*.045)){
    errors.push(label+"_HEAD_EXTENTS_INVALID");
    return null;
  }
  // The near and far surface chains must preserve left-to-right order
  // all the way from parietal dome to mandibular turn.  Looking only at
  // apex/chin/zygions allows a crossed cheek or flipped temple while the
  // rest of the report still returns plausible normalized distances.
  const lateralPairs=[
    ["parietal-near","parietal-far"],
    ["frontal-near","frontal-far"],
    ["upper-temple-near","upper-temple-far"],
    ["temple-near","temple-far"],
    ["malar-near","malar-far"],
    ["gonion-near","gonion-far"],
    ["mandible-near","mandible-far"],
  ] as const satisfies readonly (readonly[HeadFidelityLandmarkId,HeadFidelityLandmarkId])[];
  const orientation=Math.sign(far.x-near.x);
  const zygionSpan=Math.abs(far.x-near.x);
  if(lateralPairs.some(([a,b])=>
    orientation*(map.get(b)!.x-map.get(a)!.x)<Math.max(2,zygionSpan*.06))){
    errors.push(label+"_CONTOUR_TOPOLOGY_INVALID");
    return null;
  }
  return map;
}

function checkTones(
  tones:HeadFidelityTone[],file:HeadImageEvidence,
  label:"SOURCE"|"RENDER",errors:string[],
):Map<HeadFidelityToneId,HeadFidelityTone>|null{
  if(!Array.isArray(tones)){
    errors.push(label+"_TONE_MISSING");return null;
  }
  const ids=tones.map(t=>t?.id);
  if(!unique(ids))errors.push(label+"_TONE_DUPLICATE");
  const expected=new Set<string>(HEAD_FIDELITY_TONES);
  if(HEAD_FIDELITY_TONES.some(id=>!ids.includes(id))||
    tones.length!==HEAD_FIDELITY_TONES.length)
    errors.push(label+"_TONE_MISSING");
  if(ids.some(id=>!expected.has(id)))errors.push(label+"_TONE_UNKNOWN");
  for(const tone of tones){
    if(!tone)continue;
    const {rect,meanRgb}=tone;
    if(!rect||!finite(rect.x)||!finite(rect.y)||
      !finite(rect.width)||!finite(rect.height)||
      rect.x<0||rect.y<0||rect.width<3||rect.height<3||
      rect.x+rect.width>file.width||rect.y+rect.height>file.height)
      errors.push(label+"_TONE_RECT_OUT_OF_BOUNDS");
    if(!Array.isArray(meanRgb)||meanRgb.length!==3||
      meanRgb.some(x=>!finite(x)||x<0||x>255))
      errors.push(label+"_TONE_RGB_INVALID");
  }
  // Mean RGB can match perfectly on BOTH sides of a proof even when all
  // five ROIs sampled the same background patch. Forbid rectangle overlap
  // before comparing any luminance statistic.
  for(let a=0;a<tones.length;a++)for(let b=a+1;b<tones.length;b++){
    const p=tones[a]?.rect,q=tones[b]?.rect;
    if(!p||!q||!finite(p.x)||!finite(p.y)||!finite(p.width)||
      !finite(p.height)||!finite(q.x)||!finite(q.y)||
      !finite(q.width)||!finite(q.height))continue;
    const dx=Math.min(p.x+p.width,q.x+q.width)-Math.max(p.x,q.x);
    const dy=Math.min(p.y+p.height,q.y+q.height)-Math.max(p.y,q.y);
    if(dx>0&&dy>0){
      errors.push(label+"_TONE_REGIONS_OVERLAP");
      break;
    }
  }
  if(errors.some(error=>error.startsWith(label+"_TONE"))||
    !validDimensions(file))return null;
  return new Map(tones.map(tone=>[tone.id,tone]));
}

/** Normalize independent source and render points by actual cranial/cheek extents.
 * The image can shift or scale between the source photo and the export.
 * Head WIDTH / HEIGHT and internal bony relationships cannot be shuffled.
 */
function normalizedPoint(
  points:Map<HeadFidelityLandmarkId,HeadFidelityPoint>,
  id:HeadFidelityLandmarkId,
):readonly[number,number]{
  const near=points.get("zygion-near")!,far=points.get("zygion-far")!;
  const apex=points.get("cranial-apex")!,chin=points.get("menton")!;
  const width=Math.abs(far.x-near.x);
  const height=chin.y-apex.y;
  return [
    (points.get(id)!.x-(near.x+far.x)/2)/width,
    (points.get(id)!.y-apex.y)/height,
  ];
}

const luma=(rgb:readonly[number,number,number])=>
  (rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722)/255;

/** Real-source tonal hierarchy: five differently named patches must
 * measure as distinct physical values, not five labels on flat gray.
 * This gate tests value roles only; an independent artist must still
 * examine the photographed surface and judge texture, color, and beauty.
 */
function validateTonalHierarchy(
  values:Map<HeadFidelityToneId,HeadFidelityTone>,
  label:"SOURCE"|"RENDER",errors:string[],
){
  const lum=(id:HeadFidelityToneId)=>luma(values.get(id)!.meanRgb);
  const h=lum("highlight"),l=lum("light"),mid=lum("halftone");
  const c=lum("core-shadow"),ref=lum("reflected-light");
  if(h-c<.22)errors.push(label+"_TONAL_RANGE_COLLAPSED");
  if(!(h>l+.025&&l>mid+.025&&mid>c+.045&&
    ref>c+.025&&ref<l-.015))
    errors.push(label+"_TONE_ORDER_INVALID");
}

/** A passing result is only "measurements are ready for independent review". */
export function evaluatePencilHeadFidelity(
  evidence?:PencilHeadFidelityEvidence|null,
):PencilHeadFidelityReport{
  const errors:string[]=[];
  if(!evidence)return{
    status:"blocked",errors:["SOURCE_AND_RENDER_REQUIRED"],
    geometryRms:null,tonalMeanError:null,
    sourceSha256:null,outputSha256:null,artistApproved:false,
  };
  const {source,output}=evidence;
  if(!source||!output)return{
    status:"blocked",errors:["SOURCE_AND_RENDER_REQUIRED"],
    geometryRms:null,tonalMeanError:null,
    sourceSha256:source?.sha256??null,outputSha256:output?.sha256??null,
    artistApproved:false,
  };
  if(!validDimensions(source))errors.push("SOURCE_DIMENSIONS_INVALID");
  if(!validDimensions(output))errors.push("RENDER_DIMENSIONS_INVALID");
  if(!SHA256.test(source.sha256))errors.push("SOURCE_SHA256_INVALID");
  if(!SHA256.test(output.sha256))errors.push("RENDER_SHA256_INVALID");
  if(source.sha256===output.sha256)errors.push("SOURCE_RENDER_SAME_HASH");
  if(!allowedUrl(source.url))errors.push("SOURCE_URL_INVALID");
  if(!LICENSES.has(source.license))errors.push("SOURCE_LICENSE_UNVERIFIED");
  if(!source.credit?.trim())errors.push("SOURCE_CREDIT_REQUIRED");
  const srcPoints=checkPoints(evidence.sourceLandmarks,source,"SOURCE",errors);
  const outPoints=checkPoints(evidence.outputLandmarks,output,"RENDER",errors);
  const srcTones=checkTones(evidence.sourceTones,source,"SOURCE",errors);
  const outTones=checkTones(evidence.outputTones,output,"RENDER",errors);
  let geometryRms:number|null=null,tonalMeanError:number|null=null;
  if(srcPoints&&outPoints){
    let sum=0;
    for(const id of HEAD_FIDELITY_LANDMARK_IDS){
      const a=normalizedPoint(srcPoints,id);
      const b=normalizedPoint(outPoints,id);
      sum+=(a[0]-b[0])**2+(a[1]-b[1])**2;
    }
    geometryRms=Math.sqrt(sum/HEAD_FIDELITY_LANDMARK_IDS.length);
    // Comparing x and y independently normalizes away ALL anisotropic
    // distortion, so an obviously squashed head could otherwise get RMS=0.
    // Require the head's measured width/height ratio to survive the
    // source-photo -> SVG-artboard transform under UNIFORM scaling.
    const headAspect=(points:Map<HeadFidelityLandmarkId,HeadFidelityPoint>)=>{
      const zNear=points.get("zygion-near")!,zFar=points.get("zygion-far")!;
      const apex=points.get("cranial-apex")!,chin=points.get("menton")!;
      return Math.abs(zNear.x-zFar.x)/(chin.y-apex.y);
    };
    const shapeChange=Math.abs(Math.log(
      headAspect(outPoints)/headAspect(srcPoints)));
    if(shapeChange>.105)errors.push("HEAD_ASPECT_MISMATCH");
    if(geometryRms>.045)errors.push("GEOMETRY_MISMATCH");
  }
  if(srcTones&&outTones){
    validateTonalHierarchy(srcTones,"SOURCE",errors);
    validateTonalHierarchy(outTones,"RENDER",errors);
    tonalMeanError=HEAD_FIDELITY_TONES.reduce((acc,id)=>acc+
      Math.abs(luma(srcTones.get(id)!.meanRgb)-
        luma(outTones.get(id)!.meanRgb)),0)/HEAD_FIDELITY_TONES.length;
    if(tonalMeanError>.10)errors.push("TONAL_MISMATCH");
  }
  return {
    status:errors.length===0&&geometryRms!==null&&
      tonalMeanError!==null?"measurement-ready":"blocked",
    errors,geometryRms,tonalMeanError,
    sourceSha256:source.sha256,outputSha256:output.sha256,
    artistApproved:false,
  };
}
