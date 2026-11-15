import {createElement} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {describe,expect,it} from "vitest";
import {inspectRisoCharacter,evaluateRisoCharacter} from "../registry/video/riso-character";
import {inspectRisoCharacterMesh,evaluateRisoCharacterMesh} from "../registry/video/riso-proportion-mesh";
import {risoPointInContour,selectRisoSourceContour} from "../registry/video/riso-path-geometry";
import {RisoCharacterInk} from "../registry/video/riso-character-react";
import {COURIER} from "../src/video/riso-character-demo";
import {evaluateRisoTransferSheet,RisoTransferSheetPlate} from "../registry/video/riso-transfer-sheet";
import {PAPER_ARTIST,RISO_PAPER_ARTIST_SHEET,evaluateRisoHumanEnsemble} from "../src/video/riso-human-ensemble";

describe("RISO14 second authored human / joint-anchored exchange",()=>{
  it("builds a distinct human source model with actual mesh-linked head and hand regions",()=>{
    expect(inspectRisoCharacter(PAPER_ARTIST,["blue","red"])).toEqual([]);
    expect(inspectRisoCharacterMesh(PAPER_ARTIST,RISO_PAPER_ARTIST_SHEET)).toEqual([]);
    expect(PAPER_ARTIST.id).not.toBe(COURIER.id);
    expect(PAPER_ARTIST.parts.length).toBeGreaterThan(42);
    const byId=new Map(PAPER_ARTIST.parts.map(p=>[p.id,p]));
    for(const id of ["hair-back","hair-fringe","face","face-outline","eye-left","eye-right",
      "nose-bridge","mouth","scarf","coat-waist-pleats","coat","right-glove-thumb",
      "right-glove-index","left-glove-ring"]){
      expect(byId.has(id),id).toBe(true);
    }
    // Identity genuinely differs in major source-visible parts; we share
    // armature and multi-digit primitives, not the Courier's face or coat art.
    for(const id of ["face","face-outline","coat","mouth"]){
      expect(byId.get(id)!.d,id).not.toBe(COURIER.parts.find(p=>p.id===id)!.d);
    }
    expect(byId.get("face")!.knockoutOnly).toBe(true);
    expect(RISO_PAPER_ARTIST_SHEET.missingViews).toContain("three-quarter");
    expect(PAPER_ARTIST.parts.every(p=>(p.opacity??1)===1)).toBe(true);
  });

  it("roots each copied finger in the actor's own palm and keeps expression states separate",()=>{
    const joints=new Map(PAPER_ARTIST.joints.map(j=>[j.id,j]));
    for(const side of ["left","right"]){
      const palm=selectRisoSourceContour(PAPER_ARTIST.parts.find(p=>p.id===side+"-glove")!.d);
      for(const digit of ["index","middle","ring","thumb"]){
        const joint=joints.get(side+"-"+digit)!;
        expect(joint.parent).toBe(side+"-hand");
        expect(risoPointInContour([joint.x,joint.y],palm),side+"-"+digit).toBe(true);
      }
    }
    const frame=(at:number)=>new Map(evaluateRisoCharacter(PAPER_ARTIST,at).parts.map(p=>[p.id,p]));
    expect(frame(78).get("eye-left")!.d).not.toBe(frame(46).get("eye-left")!.d);
    expect(frame(160).get("mouth")!.d).not.toBe(frame(198).get("mouth")!.d);
    for(const at of [0,46,78,160,198,239]){
      const mesh=evaluateRisoCharacterMesh(PAPER_ARTIST,RISO_PAPER_ARTIST_SHEET,at,{maxEdgeLength:12});
      expect(mesh.headUnit).toBeGreaterThan(40);
      expect(mesh.regions.find(r=>r.id==="face")!.triangleArea).toBeGreaterThan(100);
      expect(mesh.regions.find(r=>r.id==="left-glove-index")!.triangleArea).toBeGreaterThan(0);
      expect(mesh.measurements.every(m=>m.distance>0)).toBe(true);
    }
  });

  it("two human actors use independent red/blue opaque spot inks",()=>{
    for(const spec of [COURIER,PAPER_ARTIST]){
      for(const plateId of ["blue","red"]){
        const html=renderToStaticMarkup(createElement(RisoCharacterInk,{
          spec,frame:160,plateId,paint:{solid:"#225D90",dots:"url(#riso-dot)"},
        }));
        expect(html).toContain('data-km-riso-character="'+spec.id+'"');
        expect(html).toContain('data-km-riso-paper-clearance="face"');
        expect(html).toContain('data-km-riso-ink-segment');
        if(plateId==="red")expect(html).toContain('data-km-riso-part="mouth"');
      }
    }
  });

  it("the shared print sheet contacts both evaluated hand anchors without teleports",()=>{
    for(const aspect of ["landscape","portrait"] as const){
      const start=evaluateRisoHumanEnsemble(126,aspect);
      expect(start.progress).toBe(0);
      expect(start.sheet).toBe("");
      const before=evaluateRisoHumanEnsemble(142,aspect);
      expect(before.progress).toBeGreaterThan(0);
      expect(before.progress).toBeLessThan(1);
      const contact=evaluateRisoHumanEnsemble(160,aspect);
      expect(contact.progress).toBe(1);
      expect(contact.propEnd.x).toBeCloseTo(contact.receiver.x,8);
      expect(contact.propEnd.y).toBeCloseTo(contact.receiver.y,8);
      expect(contact.source.x).not.toBe(contact.receiver.x);
      // The physical paper contour is now rotated around both hand anchors.
      // Its ink and knockout must use this one evaluated silhouette.
      expect(contact.sheet).toBe(contact.printDetails.outline);
      expect(contact.sheet).toMatch(/^M.+Z$/);
      expect(evaluateRisoHumanEnsemble(160,aspect)).toEqual(contact);
      evaluateRisoHumanEnsemble(198,aspect);
      expect(evaluateRisoHumanEnsemble(160,aspect)).toEqual(contact);
      expect(contact.source.x).toBeGreaterThan(-20);
      expect(contact.receiver.x).toBeLessThan(contact.width+20);
    }
    for(const frame of [-1,240,1.5,NaN]){
      expect(()=>evaluateRisoHumanEnsemble(frame)).toThrow(RangeError);
    }
  });

  it("prints hand-bound ephemera on independently testable opaque spot plates",()=>{
    const absent=evaluateRisoTransferSheet({x:100,y:200},{x:100,y:200},0);
    expect(absent.border).toBe("");
    expect(absent.postmark).toBe("");
    const lead=evaluateRisoHumanEnsemble(126);
    expect(lead.printDetails.border).toBe("");
    const at160=evaluateRisoHumanEnsemble(160);
    const geometry=at160.printDetails;
    expect(geometry.border).toMatch(/^M/);
    expect(geometry.fold).toMatch(/^M/);
    expect(geometry.ruling).toHaveLength(3);
    expect(geometry.postmark).toMatch(/^M/);
    expect(geometry.hatching).toMatch(/^M/);
    expect(evaluateRisoHumanEnsemble(160).printDetails).toEqual(geometry);
    for(const d of [geometry.border,geometry.fold,geometry.postmark,geometry.hatching,...geometry.ruling]){
      expect(d).not.toMatch(/NaN|Infinity|undefined/);
      expect(d).not.toMatch(/<|>|script|url/);
    }
    const paint={solid:"#255B8E",dots:"url(#riso-screen)"};
    const print=(plateId:"blue"|"red",detail=true)=>renderToStaticMarkup(
      createElement(RisoTransferSheetPlate,{outline:at160.sheet,geometry,paint,plateId,detail}));
    expect(print("blue")).toContain("data-km-riso-transfer-inset");
    expect(print("blue")).toContain("data-km-riso-transfer-fold");
    expect(print("red")).toContain("data-km-riso-transfer-postmark");
    expect(print("red")).toContain("data-km-riso-transfer-print-grain");
    expect(print("blue",false)).not.toContain("data-km-riso-transfer-inset");
    expect(print("red",false)).not.toContain("data-km-riso-transfer-postmark");
    expect(print("blue")).not.toContain("opacity=");
    expect(print("red")).not.toContain("opacity=");
    expect(renderToStaticMarkup(createElement(RisoTransferSheetPlate,{
      outline:"",geometry:absent,paint,plateId:"blue"}))).toBe("");
    for(const bad of [-.1,1.1,NaN,Infinity]){
      expect(()=>evaluateRisoTransferSheet({x:0,y:0},{x:120,y:0},bad)).toThrow(RangeError);
    }
  });
});
