import { describe, expect, it } from "vitest";
import {
  HEAD_FIDELITY_LANDMARK_IDS, HEAD_FIDELITY_TONES,
  evaluatePencilHeadFidelity,
} from "../src/video/colored-pencil-head-fidelity";
import type { PencilHeadFidelityEvidence } from "../src/video/colored-pencil-head-fidelity";

const xy:Record<string,readonly[number,number]>={
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
}
const COLORS:Record<string,readonly[number,number,number]>={
  "highlight":[224,203,188], "light":[187,157,147],
  "halftone":[142,114,109], "core-shadow":[53,42,49],
  "reflected-light":[92,74,79],
};
const SHA1="0".repeat(63)+"1",SHA2="f".repeat(64);

function fixture():PencilHeadFidelityEvidence{
  const source={width:1024,height:1536,sha256:SHA1,
    url:"https://commons.wikimedia.org/wiki/File:Example.jpg",
    license:"CC0-1.0",credit:"Example / Commons",
  };
  const output={width:960,height:540,sha256:SHA2};
  const points=(width:number,height:number,shift:[number,number]=[0,0],
    scale:[number,number]=[1,1])=>
    HEAD_FIDELITY_LANDMARK_IDS.map(id=>({
      id,x:(xy[id][0]*scale[0]+shift[0])*width,
      y:(xy[id][1]*scale[1]+shift[1])*height,
    }));
  const tones=(width:number,height:number)=>
    HEAD_FIDELITY_TONES.map((id,i)=>({
      id,rect:{x:Math.floor(width*(.12+i*.155)),y:Math.floor(height*.37),
        width:Math.floor(width*.08),height:Math.floor(height*.05)},
      meanRgb:[...COLORS[id]] as [number,number,number],
    }));
  return {
    source,output,
    sourceLandmarks:points(source.width,source.height),
    // A genuine camera/export resize is an isotropic (one-factor) scale,
    // never independently stretched to fit source and film aspect ratios.
    outputLandmarks:points(source.width,source.height)
      .map(p=>({id:p.id,x:420+.29*p.x,y:55+.29*p.y})),
    sourceTones:tones(source.width,source.height),
    outputTones:tones(output.width,output.height),
  };
}

describe("ArtCraft head reference fidelity (independent photo vs final SVG export)",()=>{
  it("requires all 18 independently annotated anatomical points and 5 tonal regions",()=>{
    expect(HEAD_FIDELITY_LANDMARK_IDS).toHaveLength(18);
    expect(new Set(HEAD_FIDELITY_LANDMARK_IDS).size).toBe(18);
    // STAGE 1 has no eyes, nose, lips, mouth or hair yet. Source/output
    // points must be independently observable on the ONE finished head
    // silhouette; feature-point requirements would make this gate
    // impossible to satisfy before drawing those features.
    expect(HEAD_FIDELITY_LANDMARK_IDS.some(id=>
      /orbit|eye|nose|pronasale|subnasale|mouth|lip|cheilion/.test(id)))
      .toBe(false);
    for(const id of Object.keys(xy))
      expect(HEAD_FIDELITY_LANDMARK_IDS).toContain(id);
    expect(HEAD_FIDELITY_TONES).toEqual([
      "highlight","light","halftone","core-shadow","reflected-light",
    ]);
  });

  it("fails closed without an actual photo and native render, even if the ANAT1 drawing exists",()=>{
    const missing=evaluatePencilHeadFidelity();
    expect(missing.status).toBe("blocked");
    expect(missing.errors).toContain("SOURCE_AND_RENDER_REQUIRED");
    expect(missing.artistApproved).toBe(false);
    expect(missing.geometryRms).toBeNull();
    expect(missing.tonalMeanError).toBeNull();
  });

  it("handles translated / scaled output without falsely judging frame placement",()=>{
    const result=evaluatePencilHeadFidelity(fixture());
    expect(result.errors).toEqual([]);
    expect(result.geometryRms).toBeCloseTo(0,8);
    expect(result.tonalMeanError).toBeCloseTo(0,8);
    expect(result.status).toBe("measurement-ready");
    expect(result.artistApproved).toBe(false);
    expect(result.sourceSha256).toBe(SHA1);
    expect(result.outputSha256).toBe(SHA2);
  });

  it("rejects unlicensed, uncredited and invalid source hashes, without approving art",()=>{
    const f=fixture();f.source.license="unknown";
    f.source.credit=" ";f.source.sha256="md5";f.output.sha256="different";
    const r=evaluatePencilHeadFidelity(f);
    expect(r.status).toBe("blocked");
    expect(r.errors).toContain("SOURCE_LICENSE_UNVERIFIED");
    expect(r.errors).toContain("SOURCE_CREDIT_REQUIRED");
    expect(r.errors).toContain("SOURCE_SHA256_INVALID");
    expect(r.errors).toContain("RENDER_SHA256_INVALID");
    expect(r.artistApproved).toBe(false);
  });

  it("rejects malformed landmarks, duplicates, missing values and coordinates outside the image",()=>{
    const f=fixture();
    f.sourceLandmarks[0].x=-10;
    f.sourceLandmarks[1].id=f.sourceLandmarks[0].id;
    f.outputLandmarks.pop();
    const r=evaluatePencilHeadFidelity(f);
    expect(r.errors).toContain("SOURCE_LANDMARK_OUT_OF_BOUNDS");
    expect(r.errors).toContain("SOURCE_LANDMARK_DUPLICATE");
    expect(r.errors).toContain("SOURCE_LANDMARK_MISSING");
    expect(r.errors).toContain("RENDER_LANDMARK_MISSING");
    expect(r.geometryRms).toBeNull();
    expect(r.artistApproved).toBe(false);
  });

  it("rejects squashed skull proportions even if both axes independently normalize",()=>{
    const f=fixture();
    const mid=f.outputLandmarks.find(p=>p.id==="cranial-apex")!.x;
    for(const p of f.outputLandmarks)p.x=mid+(p.x-mid)*.53;
    const r=evaluatePencilHeadFidelity(f);
    expect(r.status).toBe("blocked");
    expect(r.errors).toContain("HEAD_ASPECT_MISMATCH");
    expect(r.artistApproved).toBe(false);
  });

  it("rejects geometric distortion and exposes a normalized, nonvisual fail condition",()=>{
    const f=fixture();
    f.outputLandmarks.find(p=>p.id==="gonion-near")!.x+=100;
    f.outputLandmarks.find(p=>p.id==="temple-far")!.x-=75;
    const r=evaluatePencilHeadFidelity(f);
    expect(r.status).toBe("blocked");
    expect(r.geometryRms).toBeGreaterThan(.045);
    expect(r.errors).toContain("GEOMETRY_MISMATCH");
  });

  it("rejects tonal collapse, missing tonal samples and invalid RGB/regions",()=>{
    const f=fixture();
    f.outputTones.find(p=>p.id==="core-shadow")!.meanRgb=[210,210,210];
    const first=evaluatePencilHeadFidelity(f);
    expect(first.status).toBe("blocked");
    expect(first.tonalMeanError).toBeGreaterThan(.10);
    expect(first.errors).toContain("TONAL_MISMATCH");
    const bad=fixture();
    bad.sourceTones[0].rect.x=100000;
    bad.sourceTones[1].meanRgb[0]=300;
    bad.outputTones.pop();
    const r=evaluatePencilHeadFidelity(bad);
    expect(r.errors).toContain("SOURCE_TONE_RECT_OUT_OF_BOUNDS");
    expect(r.errors).toContain("SOURCE_TONE_RGB_INVALID");
    expect(r.errors).toContain("RENDER_TONE_MISSING");
    expect(r.tonalMeanError).toBeNull();
  });

  it("rejects identical flat five-tone photo and export even when their swatches numerically match",()=>{
    const f=fixture();
    for(const t of [...f.sourceTones,...f.outputTones])
      t.meanRgb=[128,128,128];
    const r=evaluatePencilHeadFidelity(f);
    expect(r.status).toBe("blocked");
    expect(r.errors).toContain("SOURCE_TONAL_RANGE_COLLAPSED");
    expect(r.errors).toContain("RENDER_TONAL_RANGE_COLLAPSED");
    expect(r.artistApproved).toBe(false);
    // Similarity does not imply material quality.
    expect(r.tonalMeanError).toBeCloseTo(0,8);
  });

  it("rejects implausible tonal role ordering when both images share the same invalid structure",()=>{
    const f=fixture();
    for(const values of [f.sourceTones,f.outputTones]){
      values.find(v=>v.id==="highlight")!.meanRgb=[20,20,20];
      values.find(v=>v.id==="core-shadow")!.meanRgb=[240,240,240];
    }
    const r=evaluatePencilHeadFidelity(f);
    expect(r.status).toBe("blocked");
    expect(r.errors).toContain("SOURCE_TONE_ORDER_INVALID");
    expect(r.errors).toContain("RENDER_TONE_ORDER_INVALID");
    expect(r.tonalMeanError).toBeCloseTo(0,8);
  });

  it("rejects duplicated or overlapping tonal swatch ROIs and near-zero-sized ROIs",()=>{
    const f=fixture();
    const tone=f.sourceTones[1],prior=f.sourceTones[0];
    tone.rect={...prior.rect};
    f.outputTones[3].rect.width=2;
    const r=evaluatePencilHeadFidelity(f);
    expect(r.status).toBe("blocked");
    expect(r.errors).toContain("SOURCE_TONE_REGIONS_OVERLAP");
    expect(r.errors).toContain("RENDER_TONE_RECT_OUT_OF_BOUNDS");
    expect(r.tonalMeanError).toBeNull();
  });

  it("fails closed on distorted contour sequencing, not just on valid endpoints",()=>{
    const f=fixture();
    const near=f.sourceLandmarks.find(p=>p.id==="malar-near")!;
    const far=f.sourceLandmarks.find(p=>p.id==="malar-far")!;
    const tmp=near.x;near.x=far.x;far.x=tmp;
    // Mirrored or crisscrossed contour landmarks cannot be meaningful
    // even if geometry RMS coincidentally matches the exported image.
    const r=evaluatePencilHeadFidelity(f);
    expect(r.status).toBe("blocked");
    expect(r.errors).toContain("SOURCE_CONTOUR_TOPOLOGY_INVALID");
  });

  it("rejects duplicate/source-as-render hashes and impossible head reference extents",()=>{
    const f=fixture();
    f.output.sha256=f.source.sha256;
    f.sourceLandmarks.find(p=>p.id==="menton")!.y=
      f.sourceLandmarks.find(p=>p.id==="cranial-apex")!.y;
    const r=evaluatePencilHeadFidelity(f);
    expect(r.errors).toContain("SOURCE_RENDER_SAME_HASH");
    expect(r.errors).toContain("SOURCE_HEAD_EXTENTS_INVALID");
    expect(r.artistApproved).toBe(false);
  });
});
