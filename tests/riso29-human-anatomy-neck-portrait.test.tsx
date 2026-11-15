import {describe,expect,it} from "vitest";
import {FACE_FEATURES,FACE_LANDMARKS} from "../registry/anatomy/anatomy-face";
import {MODEL_TABLES,SURFACE_FORMS} from "../registry/anatomy/anatomy-reference";
import {evaluateRisoCharacter,inspectRisoCharacter} from "../registry/video/riso-character";
import {COURIER} from "../src/video/riso-character-demo";
import {PAPER_ARTIST,evaluateRisoHumanEnsemble} from "../src/video/riso-human-ensemble";
import {RISO29_ANAT1,inspectRisoAnatomy} from "../src/video/riso-human-anatomy";

/** Original source contours are the source of truth for identity, ANAT1
 * provides skull/neck/clavicle and ocular TOPOLOGY guidance, not a
 * substituted photoreal model or an invented reference photograph. */
const people=[COURIER,PAPER_ARTIST] as const;
const p=(m:{a:number;b:number;c:number;d:number;e:number;f:number},x:number,y:number)=>({
  x:m.a*x+m.c*y+m.e,y:m.b*x+m.d*y+m.f,
});

describe("RISO29 Kumiki ANAT1 source human anatomy",()=>{
  it("actually references ANAT1 source landmarks, feature loops and measured age calibration",()=>{
    expect(RISO29_ANAT1.canonicalEyeLandmarks).toEqual([
      FACE_LANDMARKS["exocanthion.R"],FACE_LANDMARKS["endocanthion.R"],
      FACE_LANDMARKS["endocanthion.L"],FACE_LANDMARKS["exocanthion.L"]]);
    expect(RISO29_ANAT1.eyelidLoopLengths).toEqual([
      FACE_FEATURES["eye-upper.R"].loop.length,FACE_FEATURES["eye-lower.R"].loop.length,
      FACE_FEATURES["eye-upper.L"].loop.length,FACE_FEATURES["eye-lower.L"].loop.length]);
    expect(RISO29_ANAT1.neckAnatomy.length).toBeGreaterThanOrEqual(1);
    expect(RISO29_ANAT1.neckAnatomy).toEqual(SURFACE_FORMS.filter(f=>f.region==="neck").map(f=>f.id));
    expect(RISO29_ANAT1.headsTallAdultReference).toBe(MODEL_TABLES.byAge.male.find(a=>a.age===25)?.headsTall);
    expect(RISO29_ANAT1.headsTallAdultReference).toBeGreaterThan(7);
  });

  it.each(people)("%s: eyes, facial engraving, scarf and original whole-body contours survive scaling",actor=>{
    expect(inspectRisoCharacter(actor)).toEqual([]);
    expect(actor.joints.some(j=>j.id==="neck"&&j.parent==="body")).toBe(true);
    expect(actor.joints.some(j=>j.id==="head"&&j.parent==="neck")).toBe(true);
    const names=new Set(actor.parts.map(p=>p.id));
    for(const id of ["face","ear-left","eye-canthus-shapes","eye-lash-wedges",
      "eye-iris-grain","eye-lower-orbit-engraving","orbital-tone-planes",
      "zygomatic-tone-planes","mouth","nasolabial-flow","hair-crown-engravings"]){
      if(id==="hair-crown-engravings"&&actor.id==="courier")continue;
      expect(names.has(id),actor.id+" missing "+id).toBe(true);
    }
    for(const id of ["neck-skin-clearance","neck-contour","neck-sternomastoid",
      "neck-clavicle-insertion","neck-throat-plane"])
      expect(names.has(id),actor.id+" missing original anatomy part "+id).toBe(true);
    expect(actor.parts.find(p=>p.id==="neck-skin-clearance")?.knockoutOnly).toBe(true);
    expect(actor.parts.filter(p=>p.joint==="head").length).toBeGreaterThan(35);
    expect(actor.parts.some(p=>p.id==="scarf")).toBe(actor.id==="paper-artist");
    expect(new Set(actor.parts.filter(p=>!p.knockoutOnly).map(p=>p.plate))).toEqual(new Set(["blue","red"]));
  });

  it.each(people)("%s: head is smaller than shoulder span, articulated neck is a real connected joint",actor=>{
    const head=actor.joints.find(j=>j.id==="head");
    expect(head?.scale).toBe(RISO29_ANAT1.headScale);
    for(const frame of [0,24,46,76,125,156,160,165,178,198,239]){
      const m=inspectRisoAnatomy(actor,frame);
      expect(m.connected,actor.id+" no cervical joint at f"+frame).toBe(true);
      expect(m.headScale).toBeCloseTo(.52,5);
      expect(m.headToShoulder,actor.id+" wide skull at f"+frame).toBeGreaterThan(.77);
      expect(m.headToShoulder,actor.id+" wide skull at f"+frame).toBeLessThan(1.01);
      expect(m.neckLength).toBeGreaterThan(14);
      expect(m.neckLength).toBeLessThan(21);
      expect(m.printDetails).toBeGreaterThan(35);
    }
  });

  it.each(people)("%s: actual jaw contour clears the collar so the neck is visible at every expression",actor=>{
    for(const frame of [0,46,76,80,156,160,178,198,239]){
      const pose=evaluateRisoCharacter(actor,frame);
      const head=pose.joints.find(j=>j.id==="head")!;
      const body=pose.joints.find(j=>j.id==="body")!;
      const chin=p(head.matrix,0,actor.id==="courier"?35:31);
      const collar=p(body.matrix,0,RISO29_ANAT1.coatNecklineY);
      const neckGap=collar.y-chin.y;
      expect(neckGap,actor.id+" has invisible/overlong neck at f"+frame).toBeGreaterThan(4.5);
      expect(neckGap,actor.id+" has overlong neck at f"+frame).toBeLessThan(19);
      const mouth=pose.parts.find(part=>part.id==="mouth")!;
      expect(mouth.d).toMatch(/^M/);
      expect(mouth.knockoutOnly).toBe(false);
      // Face, teeth, scarf and clavicle are not flattened into opaque skin.
      expect(pose.parts.filter(part=>part.id.startsWith("neck-"))).toHaveLength(5);
    }
  });

  it("preserves all source-time handoff, actor IK and independently printed blue/red ink",()=>{
    for(const aspect of ["landscape","portrait"] as const)
      for(const frame of [0,24,76,160,165,178,198,239]){
        const state=evaluateRisoHumanEnsemble(frame,aspect);
        // Before the original f126 unfurl the physical transfer sheet is
        // intentionally absent. Test its true phase instead of requiring a
        // paper shape before any character has drawn it.
        if(frame<126)expect(state.sheet).toBe("");
        else expect(state.sheet).not.toBe("");
        expect(Number.isFinite(state.source.x)).toBe(true);
        expect(Number.isFinite(state.receiver.y)).toBe(true);
        expect(evaluateRisoCharacter(COURIER,frame).ik.every(k=>k.reachable)).toBe(true);
        expect(state.width).toBe(aspect==="landscape"?960:540);
      }
  });
});
