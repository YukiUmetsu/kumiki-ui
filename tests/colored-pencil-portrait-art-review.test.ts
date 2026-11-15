import {describe,expect,it} from "vitest";
import {
  inspectPortraitReviewEvidence,PENCIL_PORTRAIT_LANDMARKS,
  PENCIL_PORTRAIT_LANDMARK_KEYS,PENCIL_PORTRAIT_ART_STATUS,
} from "../src/video/colored-pencil-portrait-art-review";
import type {PencilPortraitReviewEvidence} from "../src/video/colored-pencil-portrait-art-review";
import {pencilLivingStudyDrawing} from "../src/video/colored-pencil-living-studies";

/**
 * This is a PROVENANCE + honesty contract, not a visual quality metric.
 * The ArtCraft v7 Python gate must open the real images and measure
 * independently annotated landmarks/tones. Never fabricate source metrics.
 */
describe("ArtCraft v7 portrait acceptance boundary",()=>{
  const sha=(letter:string)=>letter.repeat(64);
  const names=["face_top","face_left","face_right","chin",
    "eye_far_inner","eye_far_outer","eye_near_inner","eye_near_outer",
    "brow_near_peak","nose_root","nose_tip","nostril_near",
    "mouth_left","mouth_right","upper_lip","lower_lip",
    "cheek_near","hairline_center"];
  const groups=["eye_socket","nose_planes","cheek_planes","lips","hair"];
  const proof=():PencilPortraitReviewEvidence=>({
    rights:"owned",sourceSha256:sha("a"),candidateSha256:sha("b"),
    candidateCommit:"a1b2c3d4",
    measured:{status:"geometry_and_tone_pass",
      source_sha256:sha("a"),candidate_sha256:sha("b"),
      issues:[],landmarks:Object.fromEntries(names.map(n=>[n,{error:0}])),
      value_regions:Object.fromEntries(groups.map(n=>[n,{contrast:14}])),
    },
  });
  it("explicitly marks the existing geometric face as rejected art, CP-F1 still valid",()=>{
    expect(PENCIL_PORTRAIT_ART_STATUS).toBe("construction-rejected");
    const drawing=pencilLivingStudyDrawing({subject:"portrait",aspect:"landscape"});
    expect(drawing.foundation?.version).toBe(1);
    expect(drawing.foundation?.subject).toBe("human");
    // The artist's work is technique-only. No source photo for actual anatomy.
    expect(drawing.foundation?.references[0]?.rights).toBe("technique-only");
    expect(inspectPortraitReviewEvidence().status).toBe("construction-only");
  });
  it("requires all 18 source-independent geometry positions",()=>{
    expect(PENCIL_PORTRAIT_LANDMARK_KEYS).toHaveLength(18);
    for(const id of PENCIL_PORTRAIT_LANDMARK_KEYS){
      const p=PENCIL_PORTRAIT_LANDMARKS[id];
      expect(Number.isFinite(p[0])&&Number.isFinite(p[1])).toBe(true);
      expect(p[0]).toBeGreaterThan(0);expect(p[1]).toBeGreaterThan(0);
    }
  });
  it("rejects missing source-to-render and tonal evidence; cannot approve from CP-F1",()=>{
    let e=proof();
    expect(inspectPortraitReviewEvidence(e).status).toBe("measured");
    e={...e,measured:{...e.measured,source_sha256:sha("0")}};
    expect(inspectPortraitReviewEvidence(e).status).toBe("construction-only");
    e=proof();
    const landmark=Object.fromEntries(names.slice(1).map(n=>[n,{error:0}]));
    e={...e,measured:{...e.measured,landmarks:landmark}};
    expect(inspectPortraitReviewEvidence(e).issues.join(" ")).toMatch(/landmark/);
    e={...proof(),rights:"technique-only" as "owned"};
    expect(inspectPortraitReviewEvidence(e).status).toBe("construction-only");
  });
  it("requires an independently signed actual-render review before promoting art",()=>{
    const e=proof();
    expect(inspectPortraitReviewEvidence({
      ...e,reviewer:{decision:"accepted",actualRenderSha256:sha("0"),
        reviewedSourceSha256:sha("a"),name:"Art director",
        notes:"Both reference and candidate inspected at film and macro sizes; geometry and material genuinely verified."},
    }).status).toBe("measured");
    expect(inspectPortraitReviewEvidence({
      ...e,reviewer:{decision:"accepted",actualRenderSha256:sha("b"),
        reviewedSourceSha256:sha("a"),name:"Independent art reviewer",
        notes:"Actual output and licensed source compared, all structural problems independently resolved and visually approved."},
    }).status).toBe("artist-reviewed");
    // This test only establishes the API boundary. It does NOT sign off actual portrait.
  });
});
