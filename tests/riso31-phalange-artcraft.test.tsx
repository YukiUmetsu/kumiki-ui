import {describe,it,expect} from "vitest";
import {HAND_POSES,JOINTS} from "../registry/anatomy/anatomy-pose";
import {evaluateRisoCharacter,inspectRisoCharacter} from "../registry/video/riso-character";
import {COURIER} from "../src/video/riso-character-demo";
import {PAPER_ARTIST,evaluateRisoHumanEnsemble,RISO_PAPER_ARTIST_SHEET} from "../src/video/riso-human-ensemble";
import {RISO_COURIER_SHEET} from "../src/video/riso-character-mesh-sheets";
import {risoHandArtcraftParts,RISO30_GRIP_FOREGROUND_IDS,layoutRisoHandArtcraft} from "../src/video/riso-hand-artcraft";
import {
  RISO31_ANAT1_REFERENCE,RISO31_GEOMETRY,riso31FingerParts,riso31PhalanxJoints,
  riso31SegmentIds,riso31Inspect,RISO39_INDEX_OPPOSITION,
} from "../src/video/riso31-finger-phalanges";

const actors=[COURIER,PAPER_ARTIST] as const;
const sides=["left","right"] as const;
const fingers=["index","middle","ring","pinky"] as const;
const angle=(v:number)=>((v+540)%360)-180;

describe("RISO31 ArtCraft / actual PIP+DIP printed phalanx animation",()=>{
  it("derives clinical PIP and DIP flexion from the installed Kumiki ANAT1 hand framework",()=>{
    expect(RISO31_ANAT1_REFERENCE.referenceIndexPip).toBe(HAND_POSES.pinch(".R")["finger2-pip.R"]?.flex);
    expect(RISO31_ANAT1_REFERENCE.referenceIndexDip).toBe(HAND_POSES.pinch(".R")["finger2-dip.R"]?.flex);
    expect(RISO31_ANAT1_REFERENCE.pipMaximum).toBe(JOINTS.find(j=>j.id==="finger2-pip")?.dofs.flex?.max);
    expect(RISO31_ANAT1_REFERENCE.dipMaximum).toBe(JOINTS.find(j=>j.id==="finger2-dip")?.dofs.flex?.max);
    expect(RISO31_ANAT1_REFERENCE.projectedPinchFactor).toBeGreaterThan(0);
    expect(RISO31_ANAT1_REFERENCE.projectedPinchFactor).toBeLessThan(.6);
    expect(RISO31_ANAT1_REFERENCE.projection).toMatch(/2D/);
  });
  it("both real hands have 8 new per-side joints + 8 original first, middle and distal source ink regions",()=>{
    for(const side of sides){
      const names=riso31PhalanxJoints(side);
      expect(names).toHaveLength(8);
      expect(new Set(names.map(n=>n.id)).size).toBe(8);
      expect(riso31SegmentIds(side)).toHaveLength(8);
      for(const digit of fingers){
        const g=RISO31_GEOMETRY[digit];
        expect(g.proximal+g.intermediate+g.distal).toBeGreaterThan(13);
        expect(g.proximal+g.intermediate+g.distal).toBeLessThan(23);
        const joints=names.filter(n=>n.id===side+"-"+digit+"-pip"||n.id===side+"-"+digit+"-dip");
        expect(joints).toHaveLength(2);
        expect(joints[0].parent).toBe(side+"-"+digit);
        expect(joints[1].parent).toBe(side+"-"+digit+"-pip");
        expect(joints[0].y).toBe(g.proximal);
        expect(joints[1].y).toBe(g.intermediate);
        for(const j of joints){
          expect(j.keys!.map(k=>k.frame)).toEqual([...j.keys!.map(k=>k.frame)].sort((a,b)=>a-b));
          expect(j.keys![j.keys!.length-1]?.frame).toBe(239);
          expect(j.keys!.every(k=>Math.abs(k.rotate??0)<=RISO31_ANAT1_REFERENCE.pipMaximum)).toBe(true);
        }
        const source=riso31FingerParts(side,digit);
        expect(source).toHaveLength(3);
        expect(source.map(p=>p.joint)).toEqual([side+"-"+digit,side+"-"+digit+"-pip",side+"-"+digit+"-dip"]);
        expect(source.map(p=>p.id)).toEqual([
          side+"-glove-"+digit,
          side+"-glove-"+digit+"-middle-phalanx",
          side+"-glove-"+digit+"-distal-phalanx",
        ]);
        expect(source.every(p=>p.plate==="red"&&p.paint==="solid"&&!p.knockoutOnly)).toBe(true);
        expect(source.every(p=>p.d.includes("C")&&p.d.includes("Q")&&p.d.endsWith("Z"))).toBe(true);
      }
    }
  });
  it.each(actors)("%s: clinical source lengths stay explicit and projected finger lengths are bounded throughout 240 cels",spec=>{
    expect(inspectRisoCharacter(spec)).toEqual([]);
    expect(spec.durationFrames).toBe(240);
    for(const side of sides){
      for(let frame=0;frame<240;frame+=2){
        const inspected=riso31Inspect(spec,frame,side);
        expect(inspected).toHaveLength(4);
        for(const sample of inspected){
          // RISO48 preserves canonical real ANAT1 source lengths in
          // RISO31_GEOMETRY. Only the receiver's three ulnar supporting
          // fingers now project shorter in the live 2D camera after f146.
          // Do not fake equality of true length and visible 3/4 projection.
          const projected=sample.digit!=="index"&&frame>=148&&(
            (spec.id==="paper-artist"&&side==="left")||
            (spec.id==="courier"&&side==="right"&&frame<205));
          if(projected){
            expect(sample.rootLength).toBeLessThan(sample.expectedProximal-.005);
            expect(sample.rootLength).toBeGreaterThan(sample.expectedProximal*.58);
            expect(sample.intermediateLength).toBeLessThan(sample.expectedIntermediate-.005);
            expect(sample.intermediateLength).toBeGreaterThan(sample.expectedIntermediate*.58);
          }else{
            expect(sample.rootLength).toBeCloseTo(sample.expectedProximal,3);
            expect(sample.intermediateLength).toBeCloseTo(sample.expectedIntermediate,3);
          }
          expect(sample.exactRedSource).toBe(true);
          expect(sample.phalanxPathCount).toBe(3);
          expect(spec.parts.some(p=>p.id===sample.distalPartId)).toBe(true);
          expect(spec.parts.some(p=>p.joint===sample.pip&&p.plate==="red")).toBe(true);
          expect(spec.parts.some(p=>p.joint===sample.dip&&p.plate==="red")).toBe(true);
        }
      }
      const original=risoHandArtcraftParts(spec.id as "courier"|"paper-artist",side);
      // RISO37 added five retained source-engraving parts to the old RISO30
      // 18-piece hand: preserve every path, do not drop ink to fit old tests.
      expect(original).toHaveLength(23);
      expect(original.filter(p=>p.id.endsWith("-nail")&&p.id.includes("thumb")===false)
        .every(p=>p.joint.endsWith("-dip"))).toBe(true);
      expect(original.filter(p=>p.id.endsWith("-joint-crease"))
        .every(p=>p.joint.endsWith("-pip"))).toBe(true);
      expect(original.filter(p=>p.id.endsWith("-dip-crease"))
        .every(p=>p.joint.endsWith("-dip"))).toBe(true);
      // RISO32 added a genuine moving thumb-IP crease to the original
      // four PIP + four DIP blue overprints: do not delete the ninth mark.
      expect(RISO30_GRIP_FOREGROUND_IDS(side).filter(id=>id.includes("crease"))).toHaveLength(9);
    }
  });
  it.each(actors)("%s: drawing has genuine finger bend, not just red hatching on rigid finger sticks",spec=>{
    for(const side of sides){
      const rest=evaluateRisoCharacter(spec,0);
      const atContact=evaluateRisoCharacter(spec,side==="left"?166:160);
      const get=(pose:typeof rest,id:string)=>{
        const joint=pose.joints.find(j=>j.id===id);
        if(!joint)throw new Error("Missing real finger pivot "+id);
        return joint;
      };
      for(const digit of fingers){
        const root=side+"-"+digit,pip=root+"-pip",dip=root+"-dip";
        const before=angle(get(rest,pip).angle-get(rest,root).angle);
        const after=angle(get(atContact,pip).angle-get(atContact,root).angle);
        const tipBefore=angle(get(rest,dip).angle-get(rest,pip).angle);
        const tipAfter=angle(get(atContact,dip).angle-get(atContact,pip).angle);
        expect(Math.abs(before),root+" opening had mysterious bend").toBeLessThan(.02);
        expect(Math.abs(tipBefore)).toBeLessThan(.02);
        expect(Math.abs(after),root+" PIP does not bend").toBeGreaterThan(4);
        expect(Math.abs(tipAfter),root+" DIP does not bend").toBeGreaterThan(1);
        // RISO39 genuinely opposes the index at its clinically bounded
        // pinch; the 2016-era <50° generic RISO31 cap is obsolete.
        // The 3 supporting digits remain independently bounded at <70%.
        if(digit==="index"){
          expect(Math.abs(after)).toBeCloseTo(RISO39_INDEX_OPPOSITION.fullProjectedPipFlex,2);
          expect(Math.abs(tipAfter)).toBeCloseTo(RISO39_INDEX_OPPOSITION.fullProjectedDipFlex,2);
        }else{
          expect(Math.abs(after)).toBeLessThan(RISO31_ANAT1_REFERENCE.pipMaximum*.7);
          expect(Math.abs(tipAfter)).toBeLessThan(RISO31_ANAT1_REFERENCE.dipMaximum*.7);
        }
      }
    }
  });
  it("source mesh and filmed paper foreground register all segmented, independently print-ready shapes",()=>{
    for(const spec of actors){
      const mesh=spec.id==="courier"?RISO_COURIER_SHEET:RISO_PAPER_ARTIST_SHEET;
      for(const side of sides){
        for(const digit of fingers){
          const ids=riso31FingerParts(side,digit).map(p=>p.id);
          for(const id of ids)expect(spec.parts.some(p=>p.id===id)).toBe(true);
          // The original Artist source sheet derives its metadata from live
          // source anatomy; PIP/DIP prints must be HANDS, not torso scraps.
          expect(mesh.regions.find(r=>r.parts.includes(ids[1]))?.category).toBe("hand");
          expect(mesh.regions.find(r=>r.parts.includes(ids[2]))?.category).toBe("hand");
        }
      }
    }
    for(const aspect of ["landscape","portrait"] as const){
      const intro=evaluateRisoHumanEnsemble(0,aspect);
      const contact=evaluateRisoHumanEnsemble(160,aspect);
      const settled=evaluateRisoHumanEnsemble(239,aspect);
      expect(intro.owner).toBe("source");
      expect(settled.owner).toBe("receiver");
      expect(intro.width).toBe(aspect==="landscape"?960:540);
      expect(Number.isFinite(contact.paperStart.x)&&Number.isFinite(contact.receiver.y)).toBe(true);
      expect(evaluateRisoCharacter(COURIER,160).ik.every(chain=>chain.reachable)).toBe(true);
      expect(evaluateRisoHumanEnsemble(160,aspect)).toEqual(contact);
    }
  });
  it.each(actors)("%s: camera fits each posed real DIP contour in both hands without hiding fifth fingertip",spec=>{
    for(const side of sides){
      for(let frame=0;frame<240;frame+=4){
        const pose=evaluateRisoCharacter(spec,frame);
        const crop=layoutRisoHandArtcraft(pose,side,6.2,446,482);
        expect(crop.marginX).toBeGreaterThanOrEqual(35);
        expect(crop.marginY).toBeGreaterThanOrEqual(34);
        expect(crop.scale).toBeGreaterThan(1);
      }
    }
  });
});
