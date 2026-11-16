import {describe,expect,it} from "vitest";
import {evaluateRisoCharacter,inspectRisoCharacter} from "../registry/video/riso-character";
import {COURIER,COURIER_BASE_JOINTS} from "../src/video/riso-character-demo";
import {PAPER_ARTIST,evaluateRisoHumanEnsemble} from "../src/video/riso-human-ensemble";
import {riso31Inspect} from "../src/video/riso31-finger-phalanges";
import {RISO49_DONOR_PROJECTION,riso49ProjectedDonorPivot} from "../src/video/riso49-donor-projection";
import {inspectRiso33HandFan} from "../src/video/riso33-hand-negative-space";
import {inspectRiso36RedFingerSilhouettes} from "../src/video/riso36-red-silhouette-gate";
import {inspectRiso43PrintDepth} from "../src/video/riso43-physical-paper-depth";
import {inspectRiso44PrintedIndexContact} from "../src/video/riso44-source-index-paper-contact";

const supports=["middle","ring","pinky"] as const;
const phases=["pip","dip"] as const;
describe("RISO49 — Courier original 3/4 donor support, original print and human identity",()=>{
  it("changes only the six original right PIP/DIP stations; no new or flattened ink",()=>{
    expect(COURIER.joints).toHaveLength(COURIER_BASE_JOINTS.length);
    expect(inspectRisoCharacter(COURIER)).toEqual([]);
    expect(inspectRisoCharacter(PAPER_ARTIST)).toEqual([]);
    for(const original of COURIER_BASE_JOINTS){
      const changed=COURIER.joints.find(j=>j.id===original.id)!;
      const drawn=riso49ProjectedDonorPivot(original);
      if(!/^right-(middle|ring|pinky)-(pip|dip)$/.test(original.id)){
        expect(drawn).toBeNull();
        expect(changed).toEqual(original);
        continue;
      }
      expect(changed).toEqual(drawn);
      expect(changed.parent).toBe(original.parent);
      expect(changed.x).toBe(original.x);
      expect(changed.y).toBe(original.y);
      for(let i=0;i<(original.keys??[]).length;i++){
        const before=original.keys![i],after=changed.keys![i];
        expect(after.frame).toBe(before.frame);
        expect(after.rotate).toBe(before.rotate);
        expect(after.x).toBe(before.x);
        expect(after.easing).toBe(before.easing);
        if(before.frame<160||before.frame>=205)
          expect(after.y??0).toBe(before.y??0);
        else expect(after.y??0).toBeLessThan(before.y??0);
      }
    }
    expect(RISO49_DONOR_PROJECTION.quality).toContain("no photo-aligned");
  });

  it("physically foreshortens only donor support digits at contact while second actor remains original",()=>{
    const donorAt=riso31Inspect(COURIER,160,"right");
    const receiverAt=riso31Inspect(PAPER_ARTIST,160,"right");
    const donorRest=riso31Inspect(COURIER,0,"right");
    for(const digit of supports){
      const a=donorAt.find(x=>x.digit===digit)!;
      const b=receiverAt.find(x=>x.digit===digit)!;
      const r=donorRest.find(x=>x.digit===digit)!;
      expect(a.rootLength).toBeLessThan(r.rootLength-1.1);
      expect(a.intermediateLength).toBeLessThan(r.intermediateLength-1.0);
      expect(a.rootLength).toBeGreaterThan(r.rootLength*.56);
      expect(a.intermediateLength).toBeGreaterThan(r.intermediateLength*.56);
      expect(b.rootLength).toBeCloseTo(r.rootLength,3);
      expect(b.intermediateLength).toBeCloseTo(r.intermediateLength,3);
      expect(a.exactRedSource).toBe(true);
      expect(a.phalanxPathCount).toBe(3);
      for(const stage of phases){
        const source=COURIER.joints.find(j=>j.id==="right-"+digit+"-"+stage)!;
        expect(source.parent).toBe("right-"+digit+(stage==="dip"?"-pip":""));
      }
    }
    const index=donorAt.find(x=>x.digit==="index")!;
    const iRest=donorRest.find(x=>x.digit==="index")!;
    expect(index.rootLength).toBeCloseTo(iRest.rootLength,3);
    expect(index.intermediateLength).toBeCloseTo(iRest.intermediateLength,3);
    for(const side of ["left","right"] as const)
      for(const frame of [0,144,156,160,166,178,186,205,239]){
        const red=inspectRiso36RedFingerSilhouettes(COURIER,frame,side);
        expect(red.sourcePartCount).toBe(12);
        expect(red.pairs).toHaveLength(3);
      }
  });

  it("all 2-frame original red fingers preserve actual 3-unit paper-white corridors",()=>{
    for(const actor of [COURIER,PAPER_ARTIST] as const)
      for(const side of ["left","right"] as const)
        for(let frame=0;frame<240;frame+=2){
          const fan=inspectRiso33HandFan(actor,frame,side);
          expect(fan.intersectingAxisPairs,actor.id+"/"+side+"/"+frame).toEqual([]);
          expect(fan.minimumAxisGap,actor.id+"/"+side+"/"+frame).toBeGreaterThan(3);
        }
  });

  it.each(["landscape","portrait"] as const)("real index above paper, thumb/support below in %s",aspect=>{
    for(const frame of [160,166]){
      const state=evaluateRisoHumanEnsemble(frame,aspect);
      const donor=inspectRiso44PrintedIndexContact(COURIER,frame,"right",state.first,state.sheet);
      const receiver=inspectRiso44PrintedIndexContact(PAPER_ARTIST,frame,"left",state.second,state.sheet);
      expect(donor.redIndexAreaTouchesPaper).toBe(true);
      expect(receiver.redIndexAreaTouchesPaper).toBe(true);
      expect(donor.thumbUnderPaper).toBe(true);
      expect(receiver.thumbUnderPaper).toBe(true);
      const z=inspectRiso43PrintDepth(COURIER,frame,"right");
      expect(z.originalThumbIPBehindPaper).toBe(true);
      expect(z.aboveHasNoThumbOrSupport).toBe(true);
      const pose=evaluateRisoCharacter(COURIER,frame);
      const bone=pose.parts.find(p=>p.id==="right-glove-middle-distal-phalanx");
      expect(bone?.plate).toBe("red");
      expect(bone?.transform).toMatch(/^matrix\(/);
    }
  });
});
