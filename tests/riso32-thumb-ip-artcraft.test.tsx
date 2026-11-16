import {describe,expect,it} from "vitest";
import {HAND_POSES,JOINTS} from "../registry/anatomy/anatomy-pose";
import {evaluateRisoCharacter,inspectRisoCharacter} from "../registry/video/riso-character";
import {evaluateRisoCharacterMesh} from "../registry/video/riso-proportion-mesh";
import {COURIER} from "../src/video/riso-character-demo";
import {PAPER_ARTIST,RISO_PAPER_ARTIST_SHEET,evaluateRisoHumanEnsemble} from "../src/video/riso-human-ensemble";
import {RISO_COURIER_SHEET} from "../src/video/riso-character-mesh-sheets";
import {RISO32_THUMB_ANAT1,RISO32_THUMB_GEOMETRY,riso32ThumbDistalId,inspectRiso32ThumbIp} from "../src/video/riso32-thumb-ip";
import {RISO30_GRIP_FOREGROUND_IDS,layoutRisoHandArtcraft} from "../src/video/riso-hand-artcraft";
import {inspectRiso33HandFan} from "../src/video/riso33-hand-negative-space";

const actors=[COURIER,PAPER_ARTIST] as const;
const sides=["left","right"] as const;
const frames=[0,46,96,126,144,160,166,178,186,198,205,239];

describe("RISO32 ArtCraft: thumb IP truly articulates as separate physical ink",()=>{
  it("takes flexion from installed ANAT1, not a decorative visual constant",()=>{
    expect(RISO32_THUMB_ANAT1.clinicalFlexMaximum).toBe(
      JOINTS.find(j=>j.id==="thumb-ip")!.dofs.flex!.max);
    expect(RISO32_THUMB_ANAT1.clinicalFistFlex).toBe(HAND_POSES.fist(".R")["thumb-ip.R"].flex);
    expect(RISO32_THUMB_ANAT1.projectionFactor).toBeGreaterThan(0);
    expect(RISO32_THUMB_ANAT1.projectionFactor).toBeLessThan(.5);
    expect(RISO32_THUMB_GEOMETRY.overlap).toBeGreaterThan(1);
  });

  it.each(actors)("%s: preserves two-ink source anatomy in both handed actors",actor=>{
    expect(inspectRisoCharacter(actor)).toEqual([]);
    for(const side of sides){
      const root=actor.joints.find(j=>j.id===side+"-thumb")!;
      const ip=actor.joints.find(j=>j.id===side+"-thumb-ip")!;
      expect(ip.parent).toBe(root.id);
      expect(Math.hypot(ip.x,ip.y)).toBeCloseTo(RISO32_THUMB_GEOMETRY.rootLength,5);
      const proximal=actor.parts.find(p=>p.id===side+"-glove-thumb")!;
      const distal=actor.parts.find(p=>p.id===riso32ThumbDistalId(side))!;
      expect(proximal.joint).toBe(root.id);
      expect(distal.joint).toBe(ip.id);
      expect(proximal.d).toMatch(/^M/);
      expect(distal.d).toMatch(/^M/);
      expect(proximal.d.trim()).toMatch(/Z$/);
      expect(distal.d.trim()).toMatch(/Z$/);
      expect(proximal.plate).toBe("red");
      expect(distal.paint).toBe("solid");
      const details=actor.parts.filter(p=>p.id.startsWith(side+"-glove-thumb"));
      expect(details.find(p=>p.id===side+"-glove-thumb-nail")?.joint).toBe(ip.id);
      expect(details.find(p=>p.id===side+"-glove-thumb-ip-crease")?.joint).toBe(ip.id);
      expect(details.find(p=>p.id===side+"-glove-thumb-ip-crease")?.screenTone).toBe("light");
      expect(RISO30_GRIP_FOREGROUND_IDS(side)).toContain(side+"-glove-thumb-ip-crease");
    }
  });

  it.each(actors)("%s: actual source bones, nail plate and 240-frame animation are independent",actor=>{
    for(const side of sides){
      const initial=inspectRiso32ThumbIp(actor,0,side);
      const contact=inspectRiso32ThumbIp(actor,side==="right"?160:166,side);
      expect(Math.abs(contact.ipLocalAngle)).toBeGreaterThan(Math.abs(initial.ipLocalAngle)+5);
      expect(Math.abs(contact.ipLocalAngle)).toBeLessThanOrEqual(
        RISO32_THUMB_ANAT1.clinicalFistFlex*RISO32_THUMB_ANAT1.projectionFactor+.1);
      for(let frame=0;frame<240;frame+=2){
        const inspect=inspectRiso32ThumbIp(actor,frame,side);
        expect(inspect.independentRedSegments,actor.id+"/"+side+"/"+frame).toBe(true);
        expect(inspect.rootToIp).toBeCloseTo(RISO32_THUMB_GEOMETRY.rootLength,4);
        expect(Math.abs(inspect.ipLocalAngle)).toBeLessThan(20);
        expect(inspect.distalId).toBe(riso32ThumbDistalId(side));
      }
      for(const frame of frames){
        const source=evaluateRisoCharacter(actor,frame);
        const crop=layoutRisoHandArtcraft(source,side,6.2,446,482);
        expect(crop.marginX,actor.id+"/"+side+"/"+frame+" cropped horizontally").toBeGreaterThan(0);
        expect(crop.marginY,actor.id+"/"+side+"/"+frame+" cropped vertically").toBeGreaterThan(0);
        const ipInk=source.parts.find(p=>p.id===riso32ThumbDistalId(side))!;
        expect(ipInk.opacity).toBe(1);
        expect(ipInk.knockoutOnly).toBe(false);
      }
    }
  });

  it.each(actors)("%s: source-derived mesh regions include both original thumb segments",actor=>{
    const sheet=actor.id==="courier"?RISO_COURIER_SHEET:RISO_PAPER_ARTIST_SHEET;
    for(const side of sides){
      // Courier uses named anatomical mesh guides; the Paper Artist
      // intentionally derives one source region per authored ink part.
      const id=actor.id==="courier"?"glove-"+side+"-thumb-ip":riso32ThumbDistalId(side);
      expect(sheet.regions.some(r=>r.id===id)).toBe(true);
      const posed=evaluateRisoCharacterMesh(actor,sheet,160,{maxEdgeLength:6});
      expect(posed.regions.find(r=>r.id===id)).toBeDefined();
    }
  });

  it.each(actors)("%s: anatomically fanned moving digits do not cross each other at paper pinch",actor=>{
    for(const side of sides){
      // Even though all four fingers flex, the paper-white interdigit tunnels
      // must not be replaced with a self-intersecting 25-degree index sweep.
      const at=side==="right"?160:166;
      const sample=inspectRiso33HandFan(actor,at,side);
      expect(sample.intersectingAxisPairs,actor.id+"/"+side+" crossed finger axes").toEqual([]);
      expect(sample.minimumAxisGap,actor.id+"/"+side+" finger centerlines collapsed").toBeGreaterThan(3);
      expect(sample.minimumTipGap,actor.id+"/"+side+" fingertips collapse").toBeGreaterThan(4);
      for(const pair of sample.pairs){
        expect(pair.tipDistance).toBeGreaterThan(4);
        expect(pair.minimumAxisGap).toBeGreaterThan(3);
      }
    }
  });

  it.each(actors)("%s: underprinted wrist is an actual connected source stencil, not alpha paint",actor=>{
    for(const side of sides){
      const mask=actor.parts.find(p=>p.id===side+"-wrist-underprint-clearance");
      expect(mask?.joint).toBe(side+"-hand");
      expect(mask?.knockoutOnly).toBe(true);
      expect(mask?.d).toMatch(/^M.*Z$/);
      expect(mask?.opacity??1).toBe(1);
    }
  });

  it("preserves independent physical letter ownership and both 16:9 / 9:16 source envelopes",()=>{
    for(const aspect of ["landscape","portrait"] as const){
      for(const frame of frames){
        const ensemble=evaluateRisoHumanEnsemble(frame,aspect);
        expect(ensemble.width).toBe(aspect==="landscape"?960:540);
        // Anticipation is keyed; no assumption that every transitional
        // f144 frame must still have a blank contour.
        if([0,46,126].includes(frame))expect(ensemble.sheet).toBe("");
        if(frame>=160)expect(ensemble.sheet).not.toBe("");
        expect(Number.isFinite(ensemble.source.x)).toBe(true);
        expect(Number.isFinite(ensemble.receiver.y)).toBe(true);
        expect(evaluateRisoCharacter(COURIER,frame).ik.every(j=>j.reachable)).toBe(true);
      }
    }
  });
});
