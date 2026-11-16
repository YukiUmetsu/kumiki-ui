import { describe, expect, it } from "vitest";
import {
  HEAD_FIDELITY_LANDMARK_IDS, HEAD_FIDELITY_TONES,
  evaluatePencilHeadFidelity,
} from "../src/video/colored-pencil-head-fidelity";
import type { PencilHeadFidelityEvidence } from "../src/video/colored-pencil-head-fidelity";

const xy:Record<string,readonly[number,number]>={
  "cranial-apex":[.53,.08], "cranial-near-edge":[.18,.26],
  "cranial-far-edge":[.82,.25], "temple-near":[.16,.42],
  "temple-far":[.83,.42], "zygion-near":[.14,.57],
  "zygion-far":[.84,.55], "gonion-near":[.26,.83],
  "gonion-far":[.74,.81], "menton":[.53,.94],
  "glabella":[.52,.45], "sellion":[.54,.54],
  "pronasale":[.59,.65], "subnasale":[.56,.70],
  "orbit-near":[.36,.48], "orbit-far":[.69,.47],
  "mouth-near":[.44,.79], "mouth-far":[.66,.78],
};
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
    outputLandmarks:points(output.width,output.height,[.05,.03],[.87,.90]),
    sourceTones:tones(source.width,source.height),
    outputTones:tones(output.width,output.height),
  };
}

describe("ArtCraft head reference fidelity (independent photo vs final SVG export)",()=>{
  it("requires all 18 independently annotated anatomical points and 5 tonal regions",()=>{
    expect(HEAD_FIDELITY_LANDMARK_IDS).toHaveLength(18);
    expect(new Set(HEAD_FIDELITY_LANDMARK_IDS).size).toBe(18);
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
