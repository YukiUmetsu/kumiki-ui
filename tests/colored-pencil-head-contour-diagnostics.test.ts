import {describe,expect,it} from "vitest";
import {
  inspectPencilHeadContourDifference,
} from "../src/video/colored-pencil-head-contour-diagnostics";
import {
  HEAD_FIDELITY_LANDMARK_IDS,
  type HeadFidelityLandmarkId,
} from "../src/video/colored-pencil-head-fidelity";
import {emptyHeadAnnotations} from "../src/video/colored-pencil-head-annotation";

const layout:Record<HeadFidelityLandmarkId,readonly[number,number]>={
  "cranial-apex":[.53,.08],
  "parietal-near":[.23,.14],"parietal-far":[.76,.13],
  "frontal-near":[.16,.25],"frontal-far":[.84,.24],
  "upper-temple-near":[.16,.32],"upper-temple-far":[.83,.31],
  "temple-near":[.16,.42],"temple-far":[.83,.42],
  "zygion-near":[.14,.57],"zygion-far":[.84,.55],
  "malar-near":[.16,.66],"malar-far":[.80,.64],
  "gonion-near":[.26,.83],"gonion-far":[.74,.81],
  "mandible-near":[.37,.89],"mandible-far":[.68,.88],
  "menton":[.53,.94],
};
const dims={source:{width:1200,height:1000},output:{width:1600,height:1400}};
function fixture(){
  const s=emptyHeadAnnotations();
  s.source.landmarks=HEAD_FIDELITY_LANDMARK_IDS.map(id=>({
    id,x:120+layout[id][0]*600,y:100+layout[id][1]*720,
  }));
  s.output.landmarks=s.source.landmarks.map(p=>({
    id:p.id,x:80+1.25*p.x,y:40+1.25*p.y,
  }));
  return s;
}
describe("Original vs native head contour: no anisotropic hiding or artist approval",()=>{
  it("accepts differently framed but uniformly scaled 18-point synthetic controls as a diagnostic only",()=>{
    const d=inspectPencilHeadContourDifference(fixture(),dims);
    expect(d.state).toBe("review-needed");
    expect(d.artistApproved).toBe(false);
    expect(d.alignment).toBe("apex-anchored-isotropic");
    expect(d.sourceToOutputScale).toBeCloseTo(1.25,6);
    expect(d.rmsInHeadHeights).toBeCloseTo(0,10);
    expect(d.maxInHeadHeights).toBeCloseTo(0,10);
    expect(d.aspectLogChange).toBeCloseTo(0,10);
    expect(d.differences).toHaveLength(18);
    expect(d.reasons.join(" ")).toMatch(/independent ArtCraft/i);
  });
  it("exposes real x-only widening and locates the worst landmarks, not erasing it with axis-specific fits",()=>{
    const s=fixture();
    const apex=s.output.landmarks.find(p=>p.id==="cranial-apex")!;
    s.output.landmarks=s.output.landmarks.map(p=>({
      ...p,x:apex.x+(p.x-apex.x)*1.22,
    }));
    const d=inspectPencilHeadContourDifference(s,dims);
    expect(d.state).toBe("review-needed");
    expect(d.artistApproved).toBe(false);
    expect(d.aspectLogChange).toBeGreaterThan(.105);
    expect(d.rmsInHeadHeights!).toBeGreaterThan(.045);
    expect(d.reasons).toHaveLength(2);
    expect(d.differences.some(p=>p.id==="zygion-near"&&p.distancePixels>25)).toBe(true);
    expect(d.differences[0].distancePixels).toBe(0);
  });
  it("does not compare partial, crossed, duplicated or flipped contour data",()=>{
    const s=fixture();
    const x=inspectPencilHeadContourDifference(s,null);
    expect(x.state).toBe("incomplete");
    expect(x.differences).toHaveLength(0);
    expect(x.artistApproved).toBe(false);
    s.source.landmarks.pop();
    expect(inspectPencilHeadContourDifference(s,dims).reasons[0]).toMatch(/18/i);
    s.source.landmarks.push({...s.source.landmarks[0]});
    expect(inspectPencilHeadContourDifference(s,dims).reasons[0]).toMatch(/duplicate/i);
    const swapped=fixture();
    const apex=swapped.output.landmarks.find(p=>p.id==="cranial-apex")!;
    swapped.output.landmarks=swapped.output.landmarks.map(p=>({
      ...p,x:2*apex.x-p.x,
    }));
    expect(inspectPencilHeadContourDifference(swapped,dims).reasons[0])
      .toMatch(/orientation/i);
    const crossed=fixture();
    crossed.source.landmarks.find(p=>p.id==="malar-near")!.x=999;
    expect(inspectPencilHeadContourDifference(crossed,dims).reasons[0])
      .toMatch(/crossed/i);
  });
  it("rejects impossible coordinates and degenerate head dimensions",()=>{
    const s=fixture();
    s.output.landmarks[0].x=1700;
    expect(inspectPencilHeadContourDifference(s,dims).reasons[0])
      .toMatch(/bounds/i);
    s.output.landmarks[0].x=15;
    s.output.landmarks.find(p=>p.id==="menton")!.y=20;
    expect(inspectPencilHeadContourDifference(s,dims).reasons[0])
      .toMatch(/apex|chin/i);
  });
});
