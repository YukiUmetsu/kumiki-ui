import {describe,expect,it} from "vitest";
import {evaluateRisoCharacter,inspectRisoCharacter} from "../registry/video/riso-character";
import {sampleRisoFootRoll,sampleRisoIKTarget} from "../registry/video/riso-rig-ik";
import {COURIER} from "../src/video/riso-character-demo";
import {evaluateRisoHumanEnsemble} from "../src/video/riso-human-ensemble";

/**
 * RISO28 / ArtCraft: the original 2-ink courier arrives, plants BOTH boots,
 * and keeps them grounded while the torso transfers weight to the recipient.
 * These are the production source rig targets, not a screenshot-only proxy.
 */
function feet(){
  const left=COURIER.ik?.find(chain=>chain.id==="left-foot-lock")?.target;
  const right=COURIER.ik?.find(chain=>chain.id==="right-foot-lock")?.target;
  if(!left||left.kind!=="walk"||!right||right.kind!=="walk")
    throw new Error("Both authored courier foot targets must be walking IK");
  return {left,right};
}
const at=(frame:number,side:"left"|"right")=>{
  const j=evaluateRisoCharacter(COURIER,frame).joints.find(j=>j.id===side+"-ankle");
  if(!j)throw new Error("Missing original "+side+" boot");
  return {x:j.x,y:j.y};
};
const gap=(a:{x:number;y:number},b:{x:number;y:number})=>Math.hypot(a.x-b.x,a.y-b.y);

describe("RISO28 original courier grounded arrival",()=>{
  it("keeps the full authored 2-spot-print source, independent anatomy and 240-frame film",()=>{
    expect(COURIER.durationFrames).toBe(240);
    expect(COURIER.cadence).toBe(2);
    expect(inspectRisoCharacter(COURIER)).toEqual([]);
    expect(COURIER.parts.some(p=>p.id==="left-boot-detail"&&p.plate==="red")).toBe(true);
    expect(COURIER.parts.some(p=>p.id==="right-boot"&&p.plate==="blue")).toBe(true);
    expect(COURIER.parts.filter(p=>p.joint==="head").length).toBeGreaterThan(35);
  });

  it("enters upright on loaded legs instead of the original airborne-looking squat",()=>{
    const first=evaluateRisoCharacter(COURIER,0);
    const hip=(side:"left"|"right")=>first.joints.find(j=>j.id===side+"-leg");
    const boot=(side:"left"|"right")=>first.joints.find(j=>j.id===side+"-ankle");
    for(const side of ["left","right"] as const){
      const h=hip(side),b=boot(side);
      expect(h).toBeDefined();
      expect(b).toBeDefined();
      // Original f0 hip-to-shoe projection was only 62 units of the 76-unit
      // limb and posed as a deep, implausible opening squat. Preserve the
      // same 40+36 bone segments while beginning weight-bearing and upright.
      expect(b!.y-h!.y,side+" knee is folded on first cel").toBeGreaterThan(70);
      expect(Math.abs(b!.x-h!.x)).toBeLessThan(1);
    }
    expect(evaluateRisoCharacter(COURIER,0)).toEqual(first);
  });

  it("never flies with both boots lifted through original walk source",()=>{
    const {left,right}=feet();
    expect(left.cycleFrames).toBe(54);
    expect(right.cycleFrames).toBe(54);
    expect(left.phaseFrames??0).toBe(0);
    expect(right.phaseFrames).toBe(27);
    for(let frame=0;frame<=165;frame++){
      const l=sampleRisoIKTarget(left,frame),r=sampleRisoIKTarget(right,frame);
      expect(Math.abs(l.y-left.groundY)<1e-5 || Math.abs(r.y-right.groundY)<1e-5,
        "both feet airborne at source frame "+frame).toBe(true);
      expect(l.y).toBeLessThanOrEqual(left.groundY+1e-5);
      expect(r.y).toBeLessThanOrEqual(right.groundY+1e-5);
    }
  });

  it("has no unreachable or clamped IK feet in ANY printed source cel",()=>{
    // Rejected intermediate RISO28 candidate: right stance x203 at f136
    // exceeded full 40+36 bone length by 8.6 units until the hip was moved.
    // A nominal 'foot planted' target is insufficient without real joint reach.
    for(let frame=0;frame<240;frame++){
      const pose=evaluateRisoCharacter(COURIER,frame);
      for(const id of ["left-foot-lock","right-foot-lock"]){
        const contact=pose.ik.find(c=>c.id===id);
        expect(contact,id+" missing at f"+frame).toBeDefined();
        expect(contact?.reachable,id+" beyond actual bone reach at f"+frame).toBe(true);
        expect(contact!.error,id+" clips physical boot at f"+frame).toBeLessThan(.02);
      }
    }
  });

  it("RISO29 taller original leg skins keep their exact physical two-bone lengths in every printed cel",()=>{
    for(let frame=0;frame<240;frame+=2){
      const pose=evaluateRisoCharacter(COURIER,frame);
      for(const side of ["left","right"] as const){
        const hip=pose.joints.find(j=>j.id===side+"-leg")!;
        const knee=pose.joints.find(j=>j.id===side+"-knee")!;
        const ankle=pose.joints.find(j=>j.id===side+"-ankle")!;
        const contact=pose.ik.find(j=>j.id===side+"-foot-lock")!;
        expect(contact.reachable,side+" shoe fell out of reach f"+frame).toBe(true);
        expect(contact.error,side+" shoe slips f"+frame).toBeLessThan(.02);
        expect(gap(hip,knee),side+" thigh changed length f"+frame).toBeCloseTo(55,3);
        expect(gap(knee,ankle),side+" shin changed length f"+frame).toBeCloseTo(52,3);
      }
    }
  });

  it("plants the actual final 2-foot stance by frame 162 and never slides thereafter",()=>{
    const {left,right}=feet();
    expect(left.endFrame).toBe(165);
    expect(right.endFrame).toBe(165);
    for(const [target,x] of [[left,173],[right,203]] as const){
      for(let frame=162;frame<240;frame++){
        expect(sampleRisoIKTarget(target,frame).x).toBeCloseTo(x,6);
        expect(sampleRisoIKTarget(target,frame).y).toBeCloseTo(0,6);
        expect(sampleRisoFootRoll(target,frame)).toBe(0);
      }
    }
    for(const side of ["left","right"] as const){
      const plant=at(165,side);
      for(const frame of [165,166,178,190,198,201,202,239]){
        expect(gap(at(frame,side),plant),
          side+" original foot slipped at "+frame).toBeLessThan(.1);
      }
    }
  });

  it.each(["landscape","portrait"] as const)(
    "%s: planted original boots and paper-contact handoff remain continuous",aspect=>{
      const first=evaluateRisoHumanEnsemble(165,aspect);
      const scale=first.first.scale;
      for(const frame of [165,166,178,190,198,201,202,239]){
        const now=evaluateRisoHumanEnsemble(frame,aspect);
        expect(now.first).toEqual(first.first);
        for(const side of ["left","right"] as const){
          const p=at(165,side),q=at(frame,side);
          expect(gap({x:first.first.x+p.x*scale,y:first.first.y+p.y*scale},
            {x:now.first.x+q.x*scale,y:now.first.y+q.y*scale})).toBeLessThan(.12);
        }
        expect(now.sheet).toBeTruthy();
        expect(Number.isFinite(now.source.x)).toBe(true);
        expect(Number.isFinite(now.paperEnd.x)).toBe(true);
      }
      expect(evaluateRisoHumanEnsemble(239,aspect).owner).toBe("receiver");
      expect(evaluateRisoHumanEnsemble(0,aspect).owner).toBe("source");
    });
});
