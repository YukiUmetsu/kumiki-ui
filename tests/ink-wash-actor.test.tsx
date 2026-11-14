import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { evaluateInkActor, inspectInkActor } from "../registry/video/ink-wash-actor";
import { InkWashActor } from "../registry/video/ink-wash-actor-react";
import type { InkActorCue, InkActorRig } from "../registry/video/ink-wash-actor";
import { INK_TRAVELER_RIG, INK_TRAVELER_CUES, InkTraveler } from "../src/video/ink-wash-actor-demo";
import { InkWashScene } from "../registry/video/ink-wash-story-react";
import type { InkShot } from "../registry/video/ink-wash-story";
import type { InkWashSpec } from "../registry/video/ink-wash";

const rig = INK_TRAVELER_RIG;
const cues = INK_TRAVELER_CUES;
const at = (frame:number, reduced=false)=>evaluateInkActor(rig,cues,frame,reduced);

describe("INK3 multi-channel material-native character performance", () => {
  it("retains explicit stable character identity, rig revision, separate facial parts and nested pivots",()=>{
    expect(inspectInkActor(rig,cues)).toEqual([]);
    expect(new Set(rig.parts.map(p=>p.id)).size).toBe(rig.parts.length);
    expect(rig.parts.find(p=>p.role==="mouth")?.parent).toBe("neck");
    expect(rig.parts.find(p=>p.role==="eyes")?.parent).toBe("neck");
    const a=at(0),b=at(198);
    expect([a.id,a.revision]).toEqual([b.id,b.revision]);
  });

  it("compounds gaze, gesture, speech and blink without trampling different semantic parts",()=>{
    const s=at(134);
    expect(s.activeCueIds).toEqual(expect.arrayContaining(["looking-at-viewer","presenting","speaking","blink-during-speech"]));
    expect(s.poses["right-arm"].rotation).not.toBe(0);
    expect(s.poses["neck"].rotation).not.toBe(0);
    expect(s.viseme).not.toBe("closed");
    expect(s.blink).toBe(true);
    const silent=at(205);
    expect(silent.viseme).toBe("closed");
    expect(silent.poses["right-arm"].rotation).toBe(0);
    expect(silent.blink).toBe(false);
  });

  it("keeps the film stable under reverse and shuffled absolute-frame seeks",()=>{
    const settled=at(196);
    [0,240,84,17,148,134,11,196].forEach(f=>at(f));
    expect(at(196)).toEqual(settled);
    expect(at(133).sampledFrame).toBe(132);
    expect(at(132)).toEqual({...at(133),frame:132});
    expect(at(240).root).toEqual(at(220).root);
    expect(at(0).activeCueIds).toEqual([]);
    expect(at(999).viseme).toBe("closed");
  });

  it("supports reduced motion, completed walking endpoint and independent static actor art",()=>{
    const end=at(0,true);
    expect(end.root[0]).toBe(69);
    expect(end.blink).toBe(false);
    expect(end.viseme).toBe("closed");
    expect(end.poses["right-arm"].rotation).toBe(0);
    expect(end.poses["left-leg"].rotation).toBe(0);
    const html=renderToStaticMarkup(createElement(InkTraveler,{frame:140}));
    expect(html).toContain('data-km-ink-actor="traveler-ink-study"');
    expect(html).toContain('data-km-ink-actor-part="eyes"');
    expect(html).toContain('data-km-ink-actor-part="mouth"');
    expect(html).toContain('data-km-ink-actor-viseme="');
    expect(html).toContain("<path");
  });

  it("prevents invalid animations, invisible/missing joints, ambiguous overlap and malformed visemes",()=>{
    expect(()=>at(-1)).toThrow(RangeError);
    expect(()=>at(.25)).toThrow(RangeError);
    const overlap=[...cues,{id:"duplicate-gesture",kind:"gesture",arm:"right-arm",gesture:"raise",startFrame:140,durationFrames:20}] as InkActorCue[];
    expect(inspectInkActor(rig,overlap)).toContainEqual(expect.objectContaining({path:"/cues/7"}));
    const bad:InkActorCue={id:"bad",kind:"speech",startFrame:0,durationFrames:20,
      visemes:[{frame:6,shape:"open"},{frame:4,shape:"round"}]};
    expect(inspectInkActor(rig,[bad]).some(i=>i.path.includes("visemes"))).toBe(true);
    const noFace:InkActorRig={...rig,parts:rig.parts.filter(x=>x.role!=="mouth")};
    expect(inspectInkActor(noFace,[bad]).some(i=>i.path.includes("mouth"))).toBe(true);
    const cyclic:InkActorRig={...rig,parts:rig.parts.map(p=>
      p.id==="neck"?{...p,parent:"eyes"}:p)};
    expect(inspectInkActor(cyclic,[]).some(i=>i.message.includes("Cyclic"))).toBe(true);
    expect(inspectInkActor({...rig,cadence:4 as 2},[]).some(i=>i.path.includes("cadence"))).toBe(true);
  });

  it("renders a fully author-supplied art callback, not a hardcoded character",()=>{
    const small:InkActorRig={id:"shape-figure",revision:"artist-2",width:300,height:300,cadence:1,
      parts:[{id:"shape",role:"detail",pivot:[150,150]}]};
    const html=renderToStaticMarkup(createElement(InkWashActor,{rig:small,cues:[],frame:14,
      "aria-label":"Any licensed actor",
      renderPart:()=>createElement("circle",{cx:150,cy:150,r:35,fill:"#242d28"})}));
    expect(html).toContain("Any licensed actor");
    expect(html).toContain('data-km-ink-actor="shape-figure"');
    expect(html).toContain('data-km-ink-actor-revision="artist-2"');
    expect(html).toContain("<circle");
  });

  it("compiles into the existing INK2 scene with all actor parts, not a new timeline",()=>{
    const shot:InkShot={id:"actor-shot",label:"Original acting scene",durationFrames:240,
      layers:[{id:"actor",startFrame:0,durationFrames:1,reveal:"instant"}]};
    const spec:InkWashSpec={version:1,width:960,height:540,paper:"#f1eee1",ink:"#29322f",
      seed:72,grain:.25,absorption:.7,strokes:[]};
    const html=renderToStaticMarkup(createElement(InkWashScene,{shot,spec,frame:135,
      renderLayer:()=>createElement(InkTraveler,{frame:135})}));
    expect(html).toContain("data-km-ink-scene");
    expect(html).toContain("data-km-ink-media");
    expect(html).toContain("data-km-ink-actor");
  });
});
