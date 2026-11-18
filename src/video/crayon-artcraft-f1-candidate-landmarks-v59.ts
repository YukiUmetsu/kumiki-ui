import {CRAYON_PORTRAIT_AUDIT} from "./crayon-artcraft-portrait-audit";

/**
 * V59: a source-registered measurement worksheet, NOT a generated face model
 * or a likeness certificate. Source points are independent observations on
 * the CC0 608x1082 screenshot; candidate points must be newly observed on
 * the ACTUAL full-camera native f299 render (never copied from source/ANAT1).
 */
export const CRAYON_F1_V59_SOURCE=Object.freeze({
  sha256:CRAYON_PORTRAIT_AUDIT.source.sha256,
  width:608,
  height:1082,
  frame:299,
  maxNormalizedFaceError:CRAYON_PORTRAIT_AUDIT.maxLandmarkError,
  approved:false,
  sourceUrl:CRAYON_PORTRAIT_AUDIT.source.link,
});
export type CrayonF1CandidateLandmark=
  keyof typeof CRAYON_PORTRAIT_AUDIT.sourcePoints;
export type CrayonF1Point=readonly [number,number];
export type CrayonF1CandidateVariant=
  "source-anat1-superior-tarsus-v54"|
  "source-anat1-hair-top-v56"|
  "source-anat1-hair-edge-v57"|"source-anat1-connected-face-v63";
export type CrayonF1CandidateMarks=
  Partial<Record<CrayonF1CandidateLandmark,CrayonF1Point>>;

export const CRAYON_F1_V59_NAMES=Object.freeze(
  Object.keys(CRAYON_PORTRAIT_AUDIT.sourcePoints) as
    CrayonF1CandidateLandmark[],
);
export interface CrayonF1CandidateEvidence {
  sourceSha256:string;
  variant:CrayonF1CandidateVariant;
  frame:number;
  width:number;
  height:number;
  /** Captured native f299 PNG SHA-256, *not* the source-photo hash. */
  renderedPngSha256?:string;
  marks:CrayonF1CandidateMarks;
}
const VARIANTS:readonly CrayonF1CandidateVariant[]=[
  "source-anat1-superior-tarsus-v54",
  "source-anat1-hair-top-v56",
  "source-anat1-hair-edge-v57",
  "source-anat1-connected-face-v63",
];
const HEX256=/^[a-f0-9]{64}$/i;
const isPoint=(value:unknown):value is CrayonF1Point=>
  Array.isArray(value)&&value.length===2&&
  value.every(Number.isFinite)&&
  value[0]>=0&&value[0]<CRAYON_F1_V59_SOURCE.width&&
  value[1]>=0&&value[1]<CRAYON_F1_V59_SOURCE.height;

/** Never infer missing candidate landmarks from source or canonical ANAT1. */
export function crayonF1CandidateLandmarkAudit(evidence:CrayonF1CandidateEvidence){
  const source=CRAYON_F1_V59_SOURCE;
  if(evidence.sourceSha256!==source.sha256||
    !VARIANTS.includes(evidence.variant)||
    evidence.frame!==source.frame||
    evidence.width!==source.width||evidence.height!==source.height||
    (evidence.renderedPngSha256!==undefined&&
      !HEX256.test(evidence.renderedPngSha256))||
    !evidence.marks||typeof evidence.marks!=="object"||
    Object.keys(evidence.marks).some(x=>!CRAYON_F1_V59_NAMES.includes(
      x as CrayonF1CandidateLandmark)))
    throw new RangeError("V59 source/camera/film/render evidence mismatch");
  const p=CRAYON_PORTRAIT_AUDIT.sourcePoints;
  const faceWidth=p.face_right[0]-p.face_left[0];
  const faceHeight=p.chin[1]-p.face_top[1];
  const landmarks=CRAYON_F1_V59_NAMES.map(name=>{
    const sourcePoint=p[name] as CrayonF1Point;
    const candidate=evidence.marks[name];
    if(candidate!==undefined&&!isPoint(candidate))
      throw new RangeError("V59 invalid actual-render mark: "+name);
    const error=candidate===undefined?null:
      Math.hypot((candidate[0]-sourcePoint[0])/faceWidth,
        (candidate[1]-sourcePoint[1])/faceHeight);
    return {name,source:sourcePoint,candidate:candidate??null,
      normalizedError:error,withinTolerance:error===null?null:
        error<=source.maxNormalizedFaceError};
  });
  const measured=landmarks.filter(x=>x.candidate!==null);
  const outliers=measured.filter(x=>!x.withinTolerance);
  const complete=measured.length===CRAYON_F1_V59_NAMES.length;
  const meanNormalizedError=measured.length?
    measured.reduce((sum,x)=>sum+(x.normalizedError??0),0)/measured.length:null;
  // Even 18/18 in tolerance means only manually entered coordinates are
  // plausible. Without an independently hashed real PNG they cannot be
  // authenticated; artist signoff, tone planes and full-film QA are separate.
  const status=!complete?"INCOMPLETE":
    outliers.length?"GEOMETRY_REVIEW_REQUIRED":
    "LANDMARKS_PROVISIONAL" as const;
  return {status,sourceSha256:source.sha256,renderedPngSha256:
    evidence.renderedPngSha256??null,sourcePoints:landmarks.length,
    measured:measured.length,missing:landmarks.filter(x=>!x.candidate)
      .map(x=>x.name),outliers:outliers.map(x=>x.name),
    meanNormalizedError,landmarks,
    verifiedRender:false as const,approvedForRelease:false as const};
}

/** Native full-camera CSS pointer to source pixel; rejects cropped/offset hits. */
export function crayonF1CandidatePointerPoint(
  clientX:number,clientY:number,
  rect:{left:number;top:number;width:number;height:number},
):CrayonF1Point{
  if(![clientX,clientY,rect.left,rect.top,rect.width,rect.height]
    .every(Number.isFinite)||rect.width<=0||rect.height<=0||
    clientX<rect.left||clientY<rect.top||
    clientX>=rect.left+rect.width||clientY>=rect.top+rect.height)
    throw new RangeError("V59 pointer outside unzoomed native source camera");
  return [Math.min(607,Math.round((clientX-rect.left)/rect.width*608)),
    Math.min(1081,Math.round((clientY-rect.top)/rect.height*1082))];
}

/**
 * V60 source-native browser capture handoff. The caller must SHA-256 the
 * ACTUAL Chromium PNG bytes; this function cannot attest that arbitrary
 * caller-supplied strings really belong to a rendered native frame.
 *
 * This is a provenance worksheet for independent reviewers, not automatic
 * feature detection, an artistic qualification or a licence to merge V57.
 */
export interface CrayonF1NativeCaptureInfo {
  variant:CrayonF1CandidateVariant;
  nativePngSha256:string;
  /** SHA of the workflow checkout, which may be a PR merge ref. */
  checkoutCommitSha:string;
  pngFileName:string;
}
export function crayonF1NativeCaptureWorksheetV60(info:CrayonF1NativeCaptureInfo){
  if(!HEX256.test(info.nativePngSha256)||
     info.nativePngSha256.toLowerCase()===CRAYON_F1_V59_SOURCE.sha256||
     !/^[a-f0-9]{40}$/i.test(info.checkoutCommitSha)||
     !/^[a-z0-9][a-z0-9._-]*\.png$/i.test(info.pngFileName)||
     info.pngFileName.includes(".."))
    throw new RangeError("V60 native capture provenance invalid");
  const evidence:CrayonF1CandidateEvidence={
    sourceSha256:CRAYON_F1_V59_SOURCE.sha256,
    variant:info.variant,
    renderedPngSha256:info.nativePngSha256.toLowerCase(),
    frame:CRAYON_F1_V59_SOURCE.frame,
    width:CRAYON_F1_V59_SOURCE.width,
    height:CRAYON_F1_V59_SOURCE.height,
    marks:{},
  };
  const audit=crayonF1CandidateLandmarkAudit(evidence);
  if(audit.measured!==0||audit.missing.length!==18)
    throw new RangeError("V60 false actual-render feature measurements");
  return {
    schema:"kumiki-crayon-artcraft-candidate-v60" as const,
    source:{
      url:CRAYON_F1_V59_SOURCE.sourceUrl,
      sha256:CRAYON_F1_V59_SOURCE.sha256,
      screenshotNotOriginalCameraJpeg:true,
      frozenPoints:CRAYON_PORTRAIT_AUDIT.sourcePoints,
    },
    native:{
      fileName:info.pngFileName,
      sha256:info.nativePngSha256.toLowerCase(),
      workflowCheckoutSha:info.checkoutCommitSha.toLowerCase(),
      variant:info.variant,
      detail:1,
      viewport:[608,1082] as const,
      fullSourceCamera:true,
      frame:299,
    },
    evidence,
    audit,
    independentRenderedPointObservations:0 as const,
    facialValuePlanesApproved:false as const,
    entire300FrameFilmReviewed:false as const,
    artistApproved:false as const,
    releaseApproved:false as const,
  };
}


/** Exact return shape of the V60 browser-generated provenance sidecar. */
export type CrayonF1NativeCaptureWorksheetV60=
  ReturnType<typeof crayonF1NativeCaptureWorksheetV60>;

/** Parse the fixed-camera PNG IHDR; do not trust the filename or MIME type. */
export function crayonF1NativePngDimensionsV61(
  bytes:Uint8Array,
):readonly [608,1082]{
  const signature=[137,80,78,71,13,10,26,10];
  if(bytes.byteLength<33||signature.some((value,index)=>bytes[index]!==value))
    throw new RangeError("V61 screenshot is not a complete PNG");
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  if(view.getUint32(8,false)!==13||
    String.fromCharCode(bytes[12],bytes[13],bytes[14],bytes[15])!=="IHDR")
    throw new RangeError("V61 screenshot has no canonical PNG IHDR");
  const width=view.getUint32(16,false),height=view.getUint32(20,false);
  if(width!==608||height!==1082)
    throw new RangeError("V61 screenshot must be the exact 608x1082 source camera");
  return [608,1082] as const;
}

/** Browser-native SHA-256 over the PNG bytes; no metadata-only hash claims. */
export async function crayonF1NativePngSha256V61(
  bytes:ArrayBuffer,
  cryptoProvider?:Pick<Crypto,"subtle">,
):Promise<string>{
  const subtle=cryptoProvider?.subtle??globalThis.crypto?.subtle;
  if(!subtle)throw new RangeError("V61 requires Web Crypto SHA-256 in a secure context");
  const digest=await subtle.digest("SHA-256",bytes);
  return Array.from(new Uint8Array(digest),value=>
    value.toString(16).padStart(2,"0")).join("");
}

/** Require the exact archived CC0 source screenshot before overlaying source landmarks. */
export function crayonF1ValidateSourcePngV62(
  fileName:string,actualPngSha256:string,width:number,height:number,
):void{
  if(fileName!=="cc0-source-608x1082.png"||
    actualPngSha256!==CRAYON_F1_V59_SOURCE.sha256||
    width!==CRAYON_F1_V59_SOURCE.width||
    height!==CRAYON_F1_V59_SOURCE.height)
    throw new RangeError("V62 source PNG does not match the frozen CC0 screenshot bytes/camera");
}

const isRecord=(value:unknown):value is Record<string,unknown>=>
  typeof value==="object"&&value!==null&&!Array.isArray(value);

/**
 * Validate the untrusted JSON sidecar against the independently computed
 * PNG byte digest and the exact frozen source observations. A screenshot
 * filename, JSON assertion or user-entered digest alone is never evidence.
 */
export function crayonF1ValidateNativePngManifestV61(
  raw:unknown,fileName:string,actualPngSha256:string,
  width:number,height:number,
):CrayonF1NativeCaptureWorksheetV60{
  const fail=():never=>{throw new RangeError(
    "V61 PNG/manifest/source/camera provenance mismatch");};
  if(!isRecord(raw)||!isRecord(raw.source)||!isRecord(raw.native)||
    !isRecord(raw.evidence)||!isRecord(raw.audit))return fail();
  const source=raw.source,native=raw.native,evidence=raw.evidence,audit=raw.audit;
  const variant=native.variant;
  if(!/^[a-z0-9][a-z0-9._-]*\.png$/i.test(fileName)||fileName.includes("..")||
    width!==608||height!==1082||
    !HEX256.test(actualPngSha256)||actualPngSha256===CRAYON_F1_V59_SOURCE.sha256||
    raw.schema!=="kumiki-crayon-artcraft-candidate-v60"||
    source.sha256!==CRAYON_F1_V59_SOURCE.sha256||
    source.url!==CRAYON_F1_V59_SOURCE.sourceUrl||
    source.screenshotNotOriginalCameraJpeg!==true||
    !isRecord(source.frozenPoints)||
    native.fileName!==fileName||native.sha256!==actualPngSha256||
    !HEX256.test(String(native.sha256??""))||
    !/^[a-f0-9]{40}$/i.test(String(native.workflowCheckoutSha??""))||
    !VARIANTS.includes(variant as CrayonF1CandidateVariant)||
    native.detail!==1||native.frame!==299||native.fullSourceCamera!==true||
    !Array.isArray(native.viewport)||native.viewport.length!==2||
    native.viewport[0]!==608||native.viewport[1]!==1082||
    evidence.sourceSha256!==CRAYON_F1_V59_SOURCE.sha256||
    evidence.renderedPngSha256!==actualPngSha256||
    evidence.variant!==variant||evidence.frame!==299||
    evidence.width!==608||evidence.height!==1082||
    !isRecord(evidence.marks)||Object.keys(evidence.marks).length!==0||
    audit.status!=="INCOMPLETE"||audit.sourceSha256!==CRAYON_F1_V59_SOURCE.sha256||
    audit.renderedPngSha256!==actualPngSha256||audit.sourcePoints!==18||
    audit.measured!==0||audit.meanNormalizedError!==null||
    audit.verifiedRender!==false||audit.approvedForRelease!==false||
    !Array.isArray(audit.missing)||audit.missing.length!==18||
    !audit.missing.every((name,index)=>name===CRAYON_F1_V59_NAMES[index])||
    !Array.isArray(audit.outliers)||audit.outliers.length!==0||
    raw.independentRenderedPointObservations!==0||
    raw.facialValuePlanesApproved!==false||
    raw.entire300FrameFilmReviewed!==false||
    raw.artistApproved!==false||raw.releaseApproved!==false)
    return fail();
  const frozen=source.frozenPoints;
  if(Object.keys(frozen).length!==CRAYON_F1_V59_NAMES.length)return fail();
  for(const name of CRAYON_F1_V59_NAMES){
    const observed=frozen[name];
    const expected=CRAYON_PORTRAIT_AUDIT.sourcePoints[name];
    if(!Array.isArray(observed)||observed.length!==2||
      observed[0]!==expected[0]||observed[1]!==expected[1])return fail();
  }
  return raw as unknown as CrayonF1NativeCaptureWorksheetV60;
}
