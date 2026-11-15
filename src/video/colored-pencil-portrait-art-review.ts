/**
 * ArtCraft v7: observation/evidence boundary for the legacy pencil portrait.
 *
 * These coordinates describe the EXISTING GENERATED IMAGE ONLY, not a source
 * photograph or Elena Pancorbo's artwork. They enable honest artifact review
 * and do not authorize an artist-level or anatomy-fidelity claim.
 *
 * The source comparison lives in artcraft/scripts/portrait_fidelity_gate.py.
 * It requires a rights-verified photograph, independently annotated landmarks,
 * SHA-256 of the actual browser screenshots and tonal evidence.
 */
export const PENCIL_PORTRAIT_LANDMARKS = {
  "face-top":[231,99], "face-left":[133,203], "face-right":[324,203],
  "chin":[235,343],
  "eye-far-inner":[189,206],"eye-far-outer":[158,206],
  "eye-near-inner":[242,207],"eye-near-outer":[285,207],
  "brow-near-peak":[265,177],
  "nose-root":[228,196],"nose-tip":[240,275],"nostril-near":[252,267],
  "mouth-left":[211,297],"mouth-right":[263,297],
  "upper-lip":[236,292],"lower-lip":[238,312],
  "cheek-near":[279,255],"hairline-center":[221,126],
} as const satisfies Record<string,readonly [number,number]>;
export const PENCIL_PORTRAIT_ART_STATUS = "construction-rejected" as const;
export const PENCIL_PORTRAIT_ART_REASON =
  "Actual browser screenshots fail human reference anatomy, face volume and hair material fidelity. CP-F1 passing tests are material compliance only.";
export const PENCIL_PORTRAIT_LANDMARK_KEYS =
  Object.keys(PENCIL_PORTRAIT_LANDMARKS) as
    (keyof typeof PENCIL_PORTRAIT_LANDMARKS)[];
export interface PencilPortraitReviewEvidence {
  rights:"owned"|"licensed"|"public-domain";
  /** Verified actual licensed source image, not technique-only artist-owned art. */
  sourceSha256:string;
  /** Browser screenshot of generated artwork at the reviewed code revision. */
  candidateSha256:string;
  candidateCommit:string;
  /** Independently signed-off ArtCraft geometry + tonal evidence report. */
  measured:{
    status:"geometry_and_tone_pass"|"REJECT";
    source_sha256:string;candidate_sha256:string;
    issues:readonly string[];
    landmarks:Readonly<Record<string,unknown>>;
    value_regions:Readonly<Record<string,unknown>>;
  };
  /** Independent artistic review separate from test/metric verification. */
  reviewer?:{
    decision:"accepted"|"rejected";
    actualRenderSha256:string;
    reviewedSourceSha256:string;
    name:string;
    notes:string;
  };
}
const SHA=/^[0-9a-f]{64}$/i;
/**
 * Fail closed. 'measured' is never equivalent to professional art approval.
 * Metadata can be forged: release also requires actual source/render evidence
 * and an independent visual check outside JavaScript validation.
 */
export function inspectPortraitReviewEvidence(
  evidence?:PencilPortraitReviewEvidence,
):{status:"construction-only"|"measured"|"artist-reviewed";issues:string[]}{
  const issues:string[]=[];
  if(!evidence)return {status:"construction-only",
    issues:["Missing licensed source image, measured landmarks, tonal proof and independent visual review."]};
  if(!["owned","licensed","public-domain"].includes(evidence.rights))
    issues.push("No rights-verified anatomical source");
  if(!SHA.test(evidence.sourceSha256)||!SHA.test(evidence.candidateSha256))
    issues.push("Missing actual source/render SHA-256");
  if(!evidence.candidateCommit||evidence.candidateCommit.length<7)
    issues.push("Missing actual candidate commit");
  if(!evidence.measured||evidence.measured.status!=="geometry_and_tone_pass"||
     evidence.measured.issues.length>0||
     evidence.measured.source_sha256!==evidence.sourceSha256||
     evidence.measured.candidate_sha256!==evidence.candidateSha256)
    issues.push("Geometry and tonal comparison failed or does not belong to these pixels");
  const expected=["face_top","face_left","face_right","chin","eye_far_inner",
    "eye_far_outer","eye_near_inner","eye_near_outer","brow_near_peak",
    "nose_root","nose_tip","nostril_near","mouth_left","mouth_right",
    "upper_lip","lower_lip","cheek_near","hairline_center"];
  if(!evidence.measured?.landmarks||
     expected.some(x=>!Object.prototype.hasOwnProperty.call(
       evidence.measured.landmarks,x)))
    issues.push("Missing measured visible human landmark evidence");
  if(!evidence.measured?.value_regions||
     ["eye_socket","nose_planes","cheek_planes","lips","hair"].some(x=>
       !Object.prototype.hasOwnProperty.call(evidence.measured.value_regions,x)))
    issues.push("Missing observed face-value regions");
  if(issues.length)return {status:"construction-only",issues};
  const review=evidence.reviewer;
  if(!review||review.decision!=="accepted"||
    !review.name.trim()||review.notes.trim().length<40||
    review.actualRenderSha256!==evidence.candidateSha256||
    review.reviewedSourceSha256!==evidence.sourceSha256)
    return {status:"measured",issues:[
      "Independent actual-pixel artistic review is missing or has not accepted the portrait.",
    ]};
  return {status:"artist-reviewed",issues:[]};
}
