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
  "source-anat1-hair-edge-v57";
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
