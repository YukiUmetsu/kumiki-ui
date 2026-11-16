import {describe,it,expect} from "vitest";
import {
  emptyHeadAnnotations, annotatedPoint, annotatedTone,
  clientToNativePoint, compileHeadAnnotationManifest,
  removeHeadAnnotation,nudgeHeadAnnotation,
} from "../src/video/colored-pencil-head-annotation";
import {HEAD_FIDELITY_LANDMARK_IDS,HEAD_FIDELITY_TONES} from
  "../src/video/colored-pencil-head-fidelity";

const source={width:1280,height:960},output={width:960,height:540};

describe("ArtCraft standalone head-only photo/source annotation atlas",()=>{
  it("maps pointer coordinates to native image pixels, never viewport CSS coordinates",()=>{
    const rect={left:140,top:90,width:640,height:480};
    expect(clientToNativePoint({clientX:300,clientY:210},rect,source))
      .toEqual({x:320,y:240});
    expect(clientToNativePoint({clientX:70,clientY:890},rect,source))
      .toEqual({x:0,y:960});
    expect(clientToNativePoint({clientX:140,clientY:90},rect,source))
      .toEqual({x:0,y:0});
    expect(()=>clientToNativePoint({clientX:0,clientY:0},
      {...rect,width:0},source)).toThrow(/dimensions/i);
  });

  it("nudges only the selected original-image annotation in native pixels, preserving tone areas",()=>{
    let state=emptyHeadAnnotations();
    state=annotatedPoint(state,"source","cranial-apex",{x:220,y:30},source);
    state=annotatedPoint(state,"output","cranial-apex",{x:112,y:60},output);
    state=annotatedTone(state,"source","highlight",
      {x:20,y:20},{x:50,y:50},source);
    state=annotatedTone(state,"source","light",
      {x:60,y:20},{x:90,y:50},source);
    state=annotatedTone(state,"output","highlight",
      {x:30,y:40},{x:70,y:80},output);
    const moved=nudgeHeadAnnotation(state,"source","landmark",
      "cranial-apex",{x:1,y:-10},source);
    expect(moved.source.landmarks[0]).toEqual({
      id:"cranial-apex",x:221,y:20,
    });
    expect(moved.output).toEqual(state.output);
    expect(state.source.landmarks[0].x).toBe(220);
    const box=nudgeHeadAnnotation(moved,"source","tone",
      "highlight",{x:4,y:3},source);
    expect(box.source.tones.find(t=>t.id==="highlight")!.rect).toEqual({
      x:24,y:23,width:30,height:30,
    });
    expect(box.source.tones.find(t=>t.id==="light")).toEqual(
      state.source.tones.find(t=>t.id==="light"));
    expect(box.output).toEqual(state.output);
    expect(()=>nudgeHeadAnnotation(box,"source","tone",
      "highlight",{x:12,y:0},source)).toThrow(/overlap/i);
    expect(()=>nudgeHeadAnnotation(box,"source","landmark",
      "cranial-apex",{x:0,y:-30},source)).toThrow(/bounds/i);
    expect(()=>nudgeHeadAnnotation(box,"source","landmark",
      "cranial-apex",{x:.5,y:0},source)).toThrow(/integer/i);
    expect(()=>nudgeHeadAnnotation(box,"output","landmark",
      "parietal-near",{x:1,y:0},output)).toThrow(/place/i);
    expect(nudgeHeadAnnotation(box,"source","tone",
      "highlight",{x:0,y:0},source)).toBe(box);
  });

  it("tracks 18 independently placed head-only landmarks for each ORIGINAL image",()=>{
    let state=emptyHeadAnnotations();
    for(let i=0;i<HEAD_FIDELITY_LANDMARK_IDS.length;i++){
      const id=HEAD_FIDELITY_LANDMARK_IDS[i];
      state=annotatedPoint(state,"source",id,{x:100+i*20,y:90+i*7},source);
      state=annotatedPoint(state,"output",id,{x:80+i*14,y:50+i*8},output);
    }
    expect(state.source.landmarks).toHaveLength(18);
    expect(state.output.landmarks).toHaveLength(18);
    expect(state.source.landmarks[5].x).not.toBe(state.output.landmarks[5].x);
    expect(emptyHeadAnnotations().source.landmarks).toEqual([]);
    const replaced=annotatedPoint(state,"source","parietal-near",
      {x:244,y:133},source);
    expect(replaced.source.landmarks).toHaveLength(18);
    expect(replaced.output.landmarks).toEqual(state.output.landmarks);
    expect(state.source.landmarks.find(v=>v.id==="parietal-near")!.x)
      .not.toBe(244);
    expect(()=>annotatedPoint(state,"output","orbit-near" as never,
      {x:1,y:2},output)).toThrow(/unknown/i);
  });

  it("rejects overlapping/invalid tone boxes without corrupting other-side annotations",()=>{
    let state=emptyHeadAnnotations();
    state=annotatedTone(state,"source","highlight",
      {x:12,y:15},{x:80,y:75},source);
    state=annotatedTone(state,"output","highlight",
      {x:20,y:30},{x:95,y:93},output);
    expect(state.source.tones).toHaveLength(1);
    expect(()=>annotatedTone(state,"source","light",
      {x:25,y:30},{x:90,y:100},source)).toThrow(/overlap/i);
    expect(()=>annotatedTone(state,"source","light",
      {x:100,y:100},{x:102,y:101},source)).toThrow(/at least 3/i);
    expect(()=>annotatedTone(state,"source","light",
      {x:-3,y:7},{x:50,y:50},source)).toThrow(/bounds/i);
    expect(state.output.tones).toHaveLength(1);
  });

  it("removes exactly the chosen source-side landmark or tone without touching native-image data",()=>{
    let state=emptyHeadAnnotations();
    state=annotatedPoint(state,"source","cranial-apex",{x:220,y:30},source);
    state=annotatedPoint(state,"source","parietal-near",{x:200,y:90},source);
    state=annotatedPoint(state,"output","cranial-apex",{x:100,y:40},output);
    state=annotatedTone(state,"source","highlight",
      {x:10,y:15},{x:80,y:85},source);
    state=annotatedTone(state,"output","highlight",
      {x:10,y:15},{x:80,y:85},output);

    const afterPoint=removeHeadAnnotation(state,"source","landmark","cranial-apex");
    expect(afterPoint.source.landmarks.map(x=>x.id)).toEqual(["parietal-near"]);
    expect(afterPoint.output).toEqual(state.output);
    expect(state.source.landmarks).toHaveLength(2);
    const afterTone=removeHeadAnnotation(afterPoint,"source","tone","highlight");
    expect(afterTone.source.tones).toEqual([]);
    expect(afterTone.output.tones).toEqual(state.output.tones);
    expect(removeHeadAnnotation(afterTone,"source","landmark","cranial-apex"))
      .toEqual(afterTone);
    expect(()=>removeHeadAnnotation(state,"source","landmark","iris" as never))
      .toThrow(/unknown/i);
    expect(()=>removeHeadAnnotation(state,"output","tone","iris" as never))
      .toThrow(/unknown/i);
  });

  it("exports only independently authored 18+5 pixel annotations and cited source metadata",()=>{
    let state=emptyHeadAnnotations();
    for(let i=0;i<HEAD_FIDELITY_LANDMARK_IDS.length;i++){
      const id=HEAD_FIDELITY_LANDMARK_IDS[i];
      state=annotatedPoint(state,"source",id,
        {x:120+i*20,y:90+i*11},source);
      state=annotatedPoint(state,"output",id,
        {x:80+i*14,y:50+i*7},output);
    }
    for(let i=0;i<HEAD_FIDELITY_TONES.length;i++){
      const id=HEAD_FIDELITY_TONES[i];
      state=annotatedTone(state,"source",id,
        {x:10+i*135,y:680},{x:60+i*135,y:730},source);
      state=annotatedTone(state,"output",id,
        {x:10+i*135,y:430},{x:60+i*135,y:485},output);
    }
    expect(()=>compileHeadAnnotationManifest(state,{
      url:"",license:"CC-BY-4.0",credit:"Photographer",
    })).toThrow(/https/i);
    expect(()=>compileHeadAnnotationManifest(state,{
      url:"https://commons.wikimedia.org/wiki/File:Example.jpg",
      license:"unknown",credit:"Photographer",
    })).toThrow(/license/i);
    expect(()=>compileHeadAnnotationManifest(state,{
      url:"https://",license:"CC-BY-4.0",credit:"Photographer",
    })).toThrow(/https/i);
    const evidence=compileHeadAnnotationManifest(state,{
      url:"https://commons.wikimedia.org/wiki/File:Example.jpg",
      license:"CC-BY-4.0",credit:"Photographer",
    });
    expect(evidence.source.license).toBe("CC-BY-4.0");
    expect(evidence.sourceLandmarks).toHaveLength(18);
    expect(evidence.outputLandmarks).toHaveLength(18);
    expect(evidence.sourceTones).toHaveLength(5);
    expect(evidence.outputTones).toHaveLength(5);
    expect("sha256" in evidence.source).toBe(false);
    expect("meanRgb" in evidence.sourceTones[0]).toBe(false);
    expect("image" in evidence).toBe(false);
    expect(state.output.landmarks).toHaveLength(18);
  });

  it("fails closed with an incomplete pair of images or missing tone values",()=>{
    let state=emptyHeadAnnotations();
    state=annotatedPoint(state,"source","cranial-apex",
      {x:100,y:55},source);
    expect(()=>compileHeadAnnotationManifest(state,{
      url:"https://example.org/source.jpg",
      license:"CC0-1.0",credit:"Photographer",
    })).toThrow(/18/i);
  });
});
