import {describe,expect,it} from "vitest";
import {reviewMeasuredHeadEvidence} from
  "../src/video/colored-pencil-head-evidence-review";
import {HEAD_FIDELITY_LANDMARK_IDS,HEAD_FIDELITY_TONES} from
  "../src/video/colored-pencil-head-fidelity";
import type {HeadAnnotationSession} from
  "../src/video/colored-pencil-head-annotation";
import type {PencilHeadCheckpointImages} from
  "../src/video/colored-pencil-head-checkpoint";

const xy:Record<string,[number,number]>={
  "cranial-apex":[530,80],
  "parietal-near":[230,140],"parietal-far":[760,130],
  "frontal-near":[160,250],"frontal-far":[840,240],
  "upper-temple-near":[160,320],"upper-temple-far":[830,310],
  "temple-near":[160,420],"temple-far":[830,420],
  "zygion-near":[140,570],"zygion-far":[840,550],
  "malar-near":[160,660],"malar-far":[800,640],
  "gonion-near":[260,830],"gonion-far":[740,810],
  "mandible-near":[370,890],"mandible-far":[680,880],
  "menton":[530,940],
};
const rgb=[
  [245,225,205],[212,185,166],[165,133,117],
  [55,45,42],[122,95,90],
];
function fixture(){
  const sourceSha="a".repeat(64),outputSha="b".repeat(64);
  const images:PencilHeadCheckpointImages={
    source:{name:"original.jpg",sha256:sourceSha,dimensions:{width:1000,height:1000}},
    output:{name:"actual-native.png",sha256:outputSha,dimensions:{width:1000,height:1000}},
  };
  const landmarks=HEAD_FIDELITY_LANDMARK_IDS.map(id=>({
    id,x:xy[id][0],y:xy[id][1],
  }));
  const tones=HEAD_FIDELITY_TONES.map((id,i)=>({
    id,rect:{x:30+i*180,y:730,width:60,height:65},
  }));
  const annotations:HeadAnnotationSession={
    source:{landmarks:landmarks.map(x=>({...x})),tones:tones.map(x=>({
      id:x.id,rect:{...x.rect},
    }))},
    output:{landmarks:landmarks.map(x=>({...x})),tones:tones.map(x=>({
      id:x.id,rect:{...x.rect},
    }))},
  };
  const reference={url:"https://commons.wikimedia.org/wiki/File:Example.jpg",
    license:"CC0-1.0",credit:"Synthetic fixture photographer"};
  const samples=tones.map((t,i)=>({...t,meanRgb:[...rgb[i]]}));
  const raw={
    source:{url:reference.url,license:reference.license,credit:reference.credit,
      width:1000,height:1000,sha256:sourceSha},
    output:{width:1000,height:1000,sha256:outputSha},
    sourceLandmarks:landmarks.map(x=>({...x})),
    outputLandmarks:landmarks.map(x=>({...x})),
    sourceTones:samples.map(x=>({...x,rect:{...x.rect},meanRgb:[...x.meanRgb]})),
    outputTones:samples.map(x=>({...x,rect:{...x.rect},meanRgb:[...x.meanRgb]})),
  };
  return {raw,context:{images,annotations,reference}};
}
const copy=<T>(value:T):T=>JSON.parse(JSON.stringify(value)) as T;

describe("ArtCraft original/native source measured-evidence import",()=>{
  it("validates complete exact-byte and annotation parity but NEVER approves art",()=>{
    const {raw,context}=fixture();
    const result=reviewMeasuredHeadEvidence(raw,context);
    expect(result.sourceLandmarks).toHaveLength(18);
    expect(result.outputLandmarks).toHaveLength(18);
    expect(result.sourceTones).toHaveLength(5);
    expect(result.outputTones).toHaveLength(5);
    expect(result.report.status).toBe("measurement-ready");
    expect(result.report.geometryRms).toBe(0);
    expect(result.report.tonalMeanError).toBe(0);
    expect(result.report.artistApproved).toBe(false);
    expect("image" in result).toBe(false);
  });

  it("fails closed on stale/swapped source/render file bytes or dimensions",()=>{
    const {raw,context}=fixture();
    const stale=copy(raw);
    stale.source.sha256="f".repeat(64);
    expect(()=>reviewMeasuredHeadEvidence(stale,context)).toThrow(/SHA-256/i);
    const swap=copy(raw);
    [swap.source.sha256,swap.output.sha256]=
      [swap.output.sha256,swap.source.sha256];
    expect(()=>reviewMeasuredHeadEvidence(swap,context)).toThrow(/SHA-256/i);
    const wrong=copy(raw);
    wrong.output.width=999;
    expect(()=>reviewMeasuredHeadEvidence(wrong,context)).toThrow(/dimensions/i);
    const sameBytes=copy(context);
    sameBytes.images.output.sha256=sameBytes.images.source.sha256;
    const matching=copy(raw);
    matching.output.sha256=matching.source.sha256;
    const report=reviewMeasuredHeadEvidence(matching,sameBytes).report;
    expect(report.status).toBe("blocked");
    expect(report.errors).toContain("SOURCE_RENDER_SAME_HASH");
  });

  it("rejects stale independent source or native contour coordinates",()=>{
    const {raw,context}=fixture();
    const shifted=copy(raw);shifted.sourceLandmarks[0].x++;
    expect(()=>reviewMeasuredHeadEvidence(shifted,context))
      .toThrow(/landmark.*stale/i);
    const changedAnnotation=copy(context);
    changedAnnotation.annotations.output.landmarks[17].y--;
    expect(()=>reviewMeasuredHeadEvidence(raw,changedAnnotation))
      .toThrow(/landmark.*stale/i);
    const duplicated=copy(raw);
    duplicated.outputLandmarks[1].id=duplicated.outputLandmarks[0].id;
    expect(()=>reviewMeasuredHeadEvidence(duplicated,context))
      .toThrow(/duplicate/i);
  });

  it("rejects changed ROIs, invented/fractional RGB, forged credit and extra fields",()=>{
    const {raw,context}=fixture();
    const roi=copy(raw);roi.sourceTones[0].rect.x++;
    expect(()=>reviewMeasuredHeadEvidence(roi,context))
      .toThrow(/region.*stale/i);
    const badRgb=copy(raw);badRgb.outputTones[0].meanRgb=[20,100.4,50];
    expect(()=>reviewMeasuredHeadEvidence(badRgb,context))
      .toThrow(/8-bit/i);
    const forged=copy(raw);forged.source.credit="another author";
    expect(()=>reviewMeasuredHeadEvidence(forged,context))
      .toThrow(/photographer/i);
    const injected=copy(raw) as typeof raw&{artistApproved?:boolean};
    injected.artistApproved=true;
    expect(()=>reviewMeasuredHeadEvidence(injected,context))
      .toThrow(/unexpected/i);
    const noData=copy(raw);noData.outputTones=[];
    expect(()=>reviewMeasuredHeadEvidence(noData,context))
      .toThrow(/five measured/i);
  });

  it("reports technically blocked tonal mismatch without false source-image approvals",()=>{
    const {raw,context}=fixture();
    const pale=copy(raw);
    pale.outputTones=pale.outputTones.map(t=>({
      ...t,meanRgb:[240,240,240],
    }));
    const {report}=reviewMeasuredHeadEvidence(pale,context);
    expect(report.status).toBe("blocked");
    expect(report.errors).toContain("RENDER_TONAL_RANGE_COLLAPSED");
    expect(report.artistApproved).toBe(false);
  });
});
