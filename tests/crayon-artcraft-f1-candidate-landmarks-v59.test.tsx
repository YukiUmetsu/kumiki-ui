import {describe,it,expect} from "vitest";
import {renderToStaticMarkup} from "react-dom/server";
import {CRAYON_PORTRAIT_AUDIT} from "../src/video/crayon-artcraft-portrait-audit";
import {CRAYON_F1_V59_NAMES,CRAYON_F1_V59_SOURCE,
  crayonF1CandidateLandmarkAudit,crayonF1CandidatePointerPoint,
  type CrayonF1CandidateEvidence,type CrayonF1CandidateMarks}
  from "../src/video/crayon-artcraft-f1-candidate-landmarks-v59";
import {Cc0Anat1CandidateLandmarksV59}
  from "../src/video/crayon-artcraft-adult-face.stories";

const input=(marks:CrayonF1CandidateMarks={}):CrayonF1CandidateEvidence=>({
  sourceSha256:CRAYON_F1_V59_SOURCE.sha256,
  variant:"source-anat1-hair-edge-v57",frame:299,width:608,height:1082,
  marks,
});
describe("ArtCraft V59 actual rendered-landmark evidence quarantine",()=>{
  it("reuses exactly 18 genuine original CC0 source observations, never fabricates a candidate",()=>{
    expect(CRAYON_F1_V59_NAMES).toHaveLength(18);
    expect(new Set(CRAYON_F1_V59_NAMES).size).toBe(18);
    expect(CRAYON_F1_V59_SOURCE.sha256).toBe(
      "f8d28cbede8c8c14f9902a328b6e979e353fd9ebe6efb454bda3152586b929c2");
    expect(CRAYON_F1_V59_SOURCE.approved).toBe(false);
    const report=crayonF1CandidateLandmarkAudit(input());
    expect(report.status).toBe("INCOMPLETE");
    expect(report.measured).toBe(0);
    expect(report.missing).toEqual(CRAYON_F1_V59_NAMES);
    expect(report.landmarks.every(x=>x.candidate===null)).toBe(true);
    expect(report.verifiedRender).toBe(false);
    expect(report.approvedForRelease).toBe(false);
  });
  it("reports actual annotated residuals at original source camera pixel scale",()=>{
    const marks:CrayonF1CandidateMarks={
      nose_tip:[431,631],chin:[398,858],eye_near_inner:[298,549],
    };
    const report=crayonF1CandidateLandmarkAudit(input(marks));
    expect(report.measured).toBe(3);
    expect(report.missing).toHaveLength(15);
    expect(report.landmarks.find(x=>x.name==="nose_tip")?.normalizedError)
      .toBeCloseTo(20/429,7);
    expect(report.landmarks.find(x=>x.name==="chin")?.normalizedError)
      .toBe(0);
    expect(report.status).toBe("INCOMPLETE");
  });
  it("never treats hand-entered source coordinates as an independently proved native render",()=>{
    const marks=Object.fromEntries(CRAYON_F1_V59_NAMES.map(
      name=>[name,[...CRAYON_PORTRAIT_AUDIT.sourcePoints[name]]]))
      as CrayonF1CandidateMarks;
    const report=crayonF1CandidateLandmarkAudit(input(marks));
    expect(report.measured).toBe(18);
    expect(report.outliers).toEqual([]);
    expect(report.status).toBe("LANDMARKS_PROVISIONAL");
    expect(report.verifiedRender).toBe(false);
    expect(report.approvedForRelease).toBe(false);
    const bad=crayonF1CandidateLandmarkAudit(input({...marks,chin:[0,0]}));
    expect(bad.status).toBe("GEOMETRY_REVIEW_REQUIRED");
    expect(bad.outliers).toContain("chin");
  });
  it("fails closed on wrong source, frame, aspect, variant, ambiguous hash or marks",()=>{
    for(const changes of [
      {sourceSha256:"0".repeat(64)},{frame:298},{width:540},{height:960},
      {variant:"source-anat1-rooted-hair-v51"},{renderedPngSha256:"not-a-sha"},
      {marks:{bogus:[1,2]}},{marks:{nose_tip:[NaN,630]}},
      {marks:{chin:[608,900]}},{marks:{chin:[0]}},
      {marks:{chin:[-1,900]}},
    ])expect(()=>crayonF1CandidateLandmarkAudit(
      {...input(),...changes} as CrayonF1CandidateEvidence)).toThrow(RangeError);
  });
  it("maps CSS-scaled full-camera pointer to exact 608x1082 source pixel",()=>{
    const rect={left:20,top:35,width:304,height:541};
    expect(crayonF1CandidatePointerPoint(172,305.5,rect)).toEqual([304,541]);
    expect(crayonF1CandidatePointerPoint(20,35,rect)).toEqual([0,0]);
    expect(crayonF1CandidatePointerPoint(323.9,575.9,rect)).toEqual([607,1081]);
    for(const [x,y] of [[324,575],[19,36],[21,576],[NaN,40]])
      expect(()=>crayonF1CandidatePointerPoint(x,y,rect)).toThrow(RangeError);
  });
  it("retains isolated interactive !dev Storybook tool without image tracing",()=>{
    expect(Cc0Anat1CandidateLandmarksV59.name).toContain("!dev");
    const node=Cc0Anat1CandidateLandmarksV59.render?.(
      {aspect:"portrait",detail:.2,expression:"neutral",headScaleY:.82,
        startFrame:299,playbackRate:1,loop:false,inspection:"full",
        referenceReview:false,showCandidateLandmarks:false},{} as never);
    expect(node).toBeDefined();
    // The render function returns a React element; its unapproved
    // visual artwork must remain under the established Storybook section.
    const html=renderToStaticMarkup(node);
    expect(html).toContain("data-km-crayon-f1-landmark-audit");
    expect(html).toContain("18");
    expect(html).toContain("INCOMPLETE");
    expect(html).not.toContain("<image");
  },60_000);
});
