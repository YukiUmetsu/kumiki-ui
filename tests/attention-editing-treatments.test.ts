import { describe, expect, it } from "vitest";
import {
  compileCameraDive, evaluateCameraDive, compileMatchTransformation,
  compileSearchEvidence, evaluateSearchEvidence, segmentGraphemes,
  compileImpactAccent, evaluateImpactAccent,
} from "../registry/motion/attention-editing-treatments";
import {
  composeHookVariants, alignBeatMontage, compileExactValueCascade,
  inspectLoopContinuity, evaluateCaptionImpact, compileSpeedCurve,
} from "../registry/motion/attention-editing-compositions";
import {
  compileHookVariant, compileBeatMontage, compileSpeedRamp, compileSplitScreen,
  compileValueCascade, compileEvidenceSpotlight, compileVisualContradiction,
} from "../registry/motion/attention-editing-recipes";

const fps = { num: 30000, den: 1001 };
const base = { id: "sample", fps, durationFrames: 90 };
const rect = (x:number,y:number,width:number,height:number)=>({x,y,width,height});
const hasError = (ds: readonly {severity:string}[]) => ds.some(d=>d.severity==="error");
const cameraSpec = { ...base, subjectId:"unit", stage:{width:1080,height:1920}, contextBounds:rect(0,0,1080,1920),targetBounds:rect(350,600,250,450),arrivalHoldFrames:20 };

describe("attention editing treatment compilers",()=>{
  it("moves the camera to a target deterministically and holds arrival",()=>{
    const c=compileCameraDive(cameraSpec);
    expect(hasError(c.plan.diagnostics)).toBe(false);
    const one=evaluateCameraDive(c,37);
    expect(evaluateCameraDive(c,37)).toEqual(one);
    expect(evaluateCameraDive(c,70).pose).toEqual(evaluateCameraDive(c,89).pose);
    expect(one.pose.scale).toBeGreaterThan(0);
  });
  it("does not substitute fake 2.5D layers or hide unsupported 3D adapters",()=>{
    const missing=compileCameraDive({...cameraSpec, mode:"layered-2.5d",layers:[{id:"near",assetRef:"photo",depth:.7}]});
    expect(missing.plan.diagnostics.some(d=>d.code==="camera-depth-unavailable")).toBe(true);
    const three=compileCameraDive({...cameraSpec,mode:"3d"});
    expect(three.plan.diagnostics.some(d=>d.code==="camera-3d-adapter-required")).toBe(true);
  });
  it("supports supplied layered parallax without a private clock",()=>{
    const c=compileCameraDive({...cameraSpec,mode:"layered-2.5d",layers:[{id:"near",assetRef:"owned.png",maskRef:"mask.png",fillRef:"fill.png",depth:.5}]});
    expect(hasError(c.plan.diagnostics)).toBe(false);
    expect(evaluateCameraDive(c,50).layers).toHaveLength(1);
    expect(evaluateCameraDive(c,50,true).progress).toBe(0);
  });
  it("requires match-cut anchor agreement or explicitly selected fallback",()=>{
    const s={...base,semanticId:"same-object",from:{sceneId:"a",subjectId:"x",rect:rect(.1,.1,.3,.3)},to:{sceneId:"b",subjectId:"y",rect:rect(.7,.7,.1,.1)},mode:"match-cut" as const};
    expect(compileMatchTransformation(s).plan.diagnostics.some(d=>d.code==="match-misaligned")).toBe(true);
    expect(hasError(compileMatchTransformation({...s,mode:"crossfade"}).plan.diagnostics)).toBe(false);
  });
  it("refuses unverified SVG morphs",()=>{
    const s={...base,semanticId:"same",from:{sceneId:"a",subjectId:"x",rect:rect(.1,.1,.3,.3)},to:{sceneId:"b",subjectId:"y",rect:rect(.1,.1,.3,.3)},mode:"morph" as const};
    expect(compileMatchTransformation(s).plan.diagnostics.some(d=>d.code==="match-topology-unknown")).toBe(true);
    expect(hasError(compileMatchTransformation({...s,hasTopologyMapping:true}).plan.diagnostics)).toBe(false);
  });
  it("types Japanese and emoji by graphemes without severing a cluster",()=>{
    const query="家🏠👩‍💻";
    expect(segmentGraphemes(query)).toEqual(["家","🏠","👩‍💻"]);
    const c=compileSearchEvidence({...base,query,result:{id:"result",title:"Example",summary:"Illustrative",illustrative:true},claimId:"finding",typingFrames:45});
    const frames=Array.from({length:46},(_,frame)=>evaluateSearchEvidence(c,frame).visibleQuery);
    expect(frames[0]).toBe("");
    expect(frames[45]).toBe(query);
    expect(evaluateSearchEvidence(c,89).showEvidence).toBe(true);
  });
  it("rejects unsourced results and undated captured evidence",()=>{
    const c=compileSearchEvidence({...base,query:"price",result:{id:"r",title:"Result",summary:"claim",capturedAssetRef:"capture.png"},claimId:"claim"});
    expect(c.plan.diagnostics.map(d=>d.code)).toContain("search-evidence-unsourced");
    expect(c.plan.diagnostics.map(d=>d.code)).toContain("search-capture-date-missing");
  });
  it("keeps impact envelopes stationary at first and last frames",()=>{
    const c=compileImpactAccent({...base,subjectId:"result",eventId:"reveal",purpose:"reveal",kind:"directional-shake"});
    expect(evaluateImpactAccent(c,0).offset.x).toBeCloseTo(0);
    expect(evaluateImpactAccent(c,89).offset.x).toBeCloseTo(0);
    expect(evaluateImpactAccent(c,40,true).offset.x).toBe(0);
  });
  it("limits flash repetition and removes flashes with reduced motion",()=>{
    const c=compileImpactAccent({...base,subjectId:"result",eventId:"reveal",purpose:"evidence",kind:"brief-luma-flash",flashCount:3});
    expect(c.plan.diagnostics.some(d=>d.code==="accent-flash-risk")).toBe(true);
    expect(evaluateImpactAccent(c,45,true).flash).toBe(0);
  });
});

describe("attention editing semantic compositions",()=>{
  it("checks that variants share the same payoff and handoff length",()=>{
    const variants=[
      {...base,claimId:"why",payoffId:"answer",subjectIds:["object","focus"],roles:{strategy:"action-first" as const,actor:"object",focus:"focus"}},
      {...base,id:"b",claimId:"why",payoffId:"answer",subjectIds:["object","focus"],roles:{strategy:"evidence-question" as const,evidence:"object",focus:"focus"}},
    ];
    const good=composeHookVariants({id:"variants",sharedClaimId:"why",sharedPayoffId:"answer",bodyStartFrame:90,variants,commonSubjectIds:["object"]});
    expect(good.variants).toHaveLength(2);
    expect(good.diagnostics.some(d=>d.code==="variant-claim-drift")).toBe(false);
    const drift=composeHookVariants({id:"variants",sharedClaimId:"different",sharedPayoffId:"answer",bodyStartFrame:90,variants,commonSubjectIds:["object"]});
    expect(drift.diagnostics.some(d=>d.code==="variant-claim-drift")).toBe(true);
  });
  it("preserves protected words rather than forcing a beat cut",()=>{
    const out=alignBeatMontage({id:"montage",fps,durationFrames:120,shots:[{id:"a",preferredFrame:46,minHoldFrames:24,subjectIds:["a"]}],audioBeatFrames:[48],
      protected:[{startFrame:44,endFrame:51,reason:"speech"}],maxShiftFrames:5,minFinalHoldFrames:30});
    expect(out.cutFrames).toHaveLength(0);
    expect(out.diagnostics.some(d=>d.code==="beat-sync-unsatisfiable")).toBe(true);
  });
  it("snaps to music when that does not violate the reading hold",()=>{
    const out=alignBeatMontage({id:"montage",fps,durationFrames:120,shots:[{id:"a",preferredFrame:46,minHoldFrames:24,subjectIds:["a"]}],audioBeatFrames:[48],
      protected:[],maxShiftFrames:5,minFinalHoldFrames:30});
    // Nearest safe musical boundary is selected after required anchors/reading holds.
    expect(out.cutFrames).toEqual([48]);
  });
  it("preserves exact minor currency units including signed contributors",()=>{
    const c=compileExactValueCascade({...base,unit:"USD-cent",basis:"30-year",claimedTotalMinor:"5000001",terms:[
      {id:"price",label:"price",valueMinor:"5000000",unit:"USD-cent",factRef:"a"},
      {id:"tax",label:"tax",valueMinor:"10",unit:"USD-cent",factRef:"b"},
      {id:"credit",label:"credit",valueMinor:"-9",unit:"USD-cent",factRef:"c"},
    ]});
    expect(c.totalMinor).toBe("5000001");
    expect(c.prefixes.map(p=>p.totalMinor)).toEqual(["5000000","5000010","5000001"]);
    expect(hasError(c.plan.diagnostics)).toBe(false);
  });
  it("refuses fabricated totals, units and evidence-free terms",()=>{
    const c=compileExactValueCascade({...base,unit:"ms",basis:"one request",claimedTotalMinor:"30",terms:[
      {id:"network",label:"Network",valueMinor:"15",unit:"ms",factRef:"source"},
      {id:"compute",label:"Compute",valueMinor:"25",unit:"seconds",factRef:""},
    ]});
    expect(c.plan.diagnostics.map(d=>d.code)).toContain("cascade-total-mismatch");
    expect(c.plan.diagnostics.map(d=>d.code)).toContain("cascade-unit-mismatch");
    expect(c.plan.diagnostics.map(d=>d.code)).toContain("cascade-term-provenance");
  });
  const mk=(x:number)=>({id:"subject",x,y:0,scale:1,rotation:0,opacity:1});
  const state=(x:number,paid=true)=>({camera:{x:0,y:0,scale:1},subjects:[mk(x)],narrativePayoffShown:paid});
  it("grades loop position and velocity separately, never certifies rendered pixels",()=>{
    const perfect=inspectLoopContinuity({start:state(0),second:state(1),penultimate:state(-1),end:state(0),maxPositionError:.02,maxVelocityError:.02});
    expect(perfect.grade).toBe("motion-candidate");
    const drifting=inspectLoopContinuity({start:state(0),second:state(1),penultimate:state(-1),end:state(.5)});
    expect(drifting.grade).toBe("discontinuous");
  });
  it("honors reduced motion and reserves peak caption bounds",()=>{
    const spec={startFrame:10,endFrame:80,entryFrames:10,style:"overshoot" as const,peakScale:1.2};
    expect(evaluateCaptionImpact(spec,15).scale).toBeGreaterThan(1);
    expect(evaluateCaptionImpact(spec,15,true).scale).toBe(1);
    expect(evaluateCaptionImpact(spec,15).reserveScale).toBe(1.2);
  });
  it("integrates positive velocity into a monotone bounded native remap",()=>{
    const c=compileSpeedCurve({id:"clip",outputFrames:30,sourceIn:10,sourceOut:60,keys:[{at:0,speed:2},{at:.5,speed:.5},{at:1,speed:1}]});
    expect(hasError(c.diagnostics)).toBe(false);
    expect(c.remap[0].sourceFrame).toBe(10);
    expect(c.remap[29].sourceFrame).toBe(59);
    const frozen=compileSpeedCurve({id:"freeze",outputFrames:30,sourceIn:10,sourceOut:60,
      keys:[{at:0,speed:2},{at:1,speed:1}],freezeAt:{outputFrame:12,durationFrames:5,sourceFrame:35}});
    expect(frozen.remap.slice(12,17).every(x=>x.sourceFrame===35)).toBe(true);
    expect(frozen.diagnostics.some(d=>d.severity==="error")).toBe(false);
    for(let i=1;i<c.remap.length;i++)expect(c.remap[i].sourceFrame).toBeGreaterThanOrEqual(c.remap[i-1].sourceFrame);
  });
});

describe("existing first-slice recipe regressions",()=>{
  it("does not discard the validation errors for split, cascade, evidence and contradiction",()=>{
    expect(hasError(compileSplitScreen({...base,leftSubjectId:"x",rightSubjectId:"x",comparisonId:""}).diagnostics)).toBe(true);
    expect(hasError(compileValueCascade({...base,totalId:"total",contributorIds:[],unit:"",sourceId:""}).diagnostics)).toBe(true);
    expect(hasError(compileEvidenceSpotlight({...base,evidenceId:"",focusId:"",sourceId:"",claimId:""}).diagnostics)).toBe(true);
    expect(hasError(compileVisualContradiction({...base,familiarId:"",contradictionId:"",claimId:"",payoffId:""}).diagnostics)).toBe(true);
  });
  it("rejects impossible hook timings and out-of-range speed keys",()=>{
    expect(hasError(compileHookVariant({id:"short",fps,durationFrames:2,claimId:"c",payoffId:"p",subjectIds:["x"],strategy:"action-first"}).diagnostics)).toBe(true);
    expect(hasError(compileSpeedRamp({...base,clipId:"footage",keys:[{frame:0,sourceFrame:0},{frame:99,sourceFrame:120}]}).diagnostics)).toBe(true);
  });
  it("does not emit empty montage shots when a marker duplicates frame zero",()=>{
    const c=compileBeatMontage({...base,subjectIds:["x"],beats:[{id:"start",frame:0},{id:"mid",frame:45}]});
    expect(c.beats.map(b=>[b.startFrame,b.endFrame])).toEqual([[0,45],[45,90]]);
  });
});

import { cameraDiveToNativeTimeline, matchTransformationToCutPlan, speedCurveToNativeClip } from "../registry/motion/attention-editing-adapters";

describe("native editor bridges",()=>{
  it("compiles dive into native camera MG1 tracks",()=>{
    const native=cameraDiveToNativeTimeline(cameraSpec);
    expect(native.diagnostics.some(d=>d.severity==="error")).toBe(false);
    expect(native.timeline?.durationFrames).toBe(90);
    expect(native.timeline?.nodes.length).toBeGreaterThan(0);
  });
  it("creates native CutDirector match cut with a shared semantic subject",()=>{
    const c=matchTransformationToCutPlan({...base,semanticId:"object",mode:"match-cut",
      from:{sceneId:"a",subjectId:"item-a",rect:rect(100,100,200,200)},
      to:{sceneId:"b",subjectId:"item-b",rect:rect(100,100,200,200)}},
      {width:1080,height:1920});
    expect(c.diagnostics.filter(d=>d.severity==="error")).toEqual([]);
    expect(c.native?.transitions[0].kind).toBe("match-cut");
  });
  it("retimes native FrameAccurateClip without a second decoder or audio lane",()=>{
    const fps={num:30,den:1};
    const placement={id:"clip",source:{id:"source",width:1920,height:1080,frameCount:100,fps,licenseRef:"owned"},startFrame:0,durationFrames:30};
    const result=speedCurveToNativeClip(placement,fps,{id:"ramp",outputFrames:30,sourceIn:10,sourceOut:60,
      keys:[{at:0,speed:2},{at:.5,speed:.3},{at:1,speed:1}]});
    expect(result.diagnostics.filter(d=>d.severity==="error")).toEqual([]);
    expect(result.clip.timing?.remap).toHaveLength(30);
  });
});


import { compileNativeCameraDive3D, composeNativeEvidenceSpotlight, composeNativeSplitComparison } from "../registry/motion/attention-editing-native-extra";

describe("native 3D and evidence integrations",()=>{
 it("produces a real orbit+dolly track using the existing 3D rig",()=>{
   const start={target:[0,0,0] as const,distance:9,azimuth:0,elevation:20};
   const end={target:[0,0,0] as const,distance:3,azimuth:20,elevation:30};
   const r=compileNativeCameraDive3D({id:"dive",fps:{num:30,den:1},durationFrames:90,arrivalHoldFrames:20,start,end});
   expect(r.timeline?.nodes.length).toBe(8);
   expect(r.diagnostics.filter(d=>d.severity==="error")).toHaveLength(0);
 });
 it("composes an actual source-anchored EvidenceStage storyboard with a citation",()=>{
   const source={id:"source",kind:"text" as const,text:"The valve limits pressure.",anchors:[{id:"valve",quote:"valve"}],
     provenance:{title:"Synthetic procedure",author:"Test fixture",date:"2026-01-01",locator:"Section 1",
       rights:{status:"owned" as const,reference:"in-house"}}};
   const r=composeNativeEvidenceSpotlight({id:"proof",fps,source,anchorId:"valve",establishFrames:45,focusFrames:45,concludeFrames:45,claimText:"The device has a valve"});
   expect(r.diagnostics).toEqual([]);
   expect(r.spec?.beats.map(b=>b.kind)).toEqual(["establish","focus","conclude"]);
   expect(r.spec?.conclusion?.citations[0].anchorId).toBe("valve");
 });
 it("uses separate portrait/landscape physical comparison layouts without fabricating scales",()=>{
   const spec={id:"physical",subjects:[
      {id:"a",label:"A",size:[1,2,1] as const},{id:"b",label:"B",size:[2,3,1] as const}],
      scale:"equal" as const,dimension:"height" as const};
   const p=composeNativeSplitComparison({spec,output:{width:1080,height:1920}});
   const l=composeNativeSplitComparison({spec,output:{width:1920,height:1080}});
   expect(p.spec.layout).toBe("column");
   expect(l.spec.layout).toBe("row");
   expect(p.diagnostics.filter(d=>d.severity==="error")).toHaveLength(0);
   expect(l.diagnostics.filter(d=>d.severity==="error")).toHaveLength(0);
 });
});
