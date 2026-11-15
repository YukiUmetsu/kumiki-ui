import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { sampleRisoIKTarget, sampleRisoFootRoll, solveRisoTwoBone } from "../registry/video/riso-rig-ik";
import { inspectRisoCharacter, evaluateRisoCharacter } from "../registry/video/riso-character";
import { RisoCharacterInk } from "../registry/video/riso-character-react";
import { COURIER, PAPER_BIRD, risoPerformanceSpec } from "../src/video/riso-character-demo";

const evalAt = (frame: number, disableIK = false) =>
  evaluateRisoCharacter(COURIER, frame, { disableIK });
const diag = (frame: number, id: string) =>
  evalAt(frame).ik.find(item => item.id === id)!;
describe("RISO3 two-bone rigging and planted-foot animation", () => {
  it("keeps exact bone lengths when solving reachable target and chooses knee bend", () => {
    const hip = {x: 0,y:0}, knee = {x:0,y:40}, ankle = {x:0,y:76},
      target = {x:20,y:60};
    const left = solveRisoTwoBone(hip,knee,ankle,target,1);
    const right = solveRisoTwoBone(hip,knee,ankle,target,-1);
    expect(left.reachable).toBe(true);
    expect(left.error).toBeLessThan(1e-4);
    expect(Math.hypot(left.knee.x,left.knee.y)).toBeCloseTo(40,5);
    expect(Math.hypot(left.ankle.x-left.knee.x,left.ankle.y-left.knee.y)).toBeCloseTo(36,5);
    expect(left.knee.x).not.toBeCloseTo(right.knee.x,3);
    expect(left.ankle.x).toBeCloseTo(right.ankle.x,5);
  });
  it("clamps unreachable targets without NaN/teleporting bones", () => {
    const result = solveRisoTwoBone({x:0,y:0},{x:0,y:30},{x:0,y:60},{x:1000,y:400},1);
    expect(result.reachable).toBe(false);
    expect(result.error).toBeGreaterThan(800);
    expect(Math.hypot(result.ankle.x,result.ankle.y)).toBeLessThan(60.01);
    expect(Object.values(result.knee).every(Number.isFinite)).toBe(true);
    expect(() => solveRisoTwoBone({x:0,y:0},{x:0,y:0},{x:0,y:1},{x:0,y:1},1)).toThrow(/lengths/);
  });
  it("holds stance targets at identical paper coordinates while actor root travels", () => {
    const left = COURIER.ik![0].target, right = COURIER.ik![1].target;
    const targetLeft = sampleRisoIKTarget(left,0);
    const targets = [0,10,20,30].map(n=>sampleRisoIKTarget(left,n));
    for (const t of targets) expect(t).toEqual(targetLeft);
    const hip0 = evalAt(0).joints.find(j=>j.id==="left-leg")!;
    const hip36 = evalAt(36).joints.find(j=>j.id==="left-leg")!;
    expect(hip36.x-hip0.x).toBeGreaterThan(20);
    for (const n of [0,10,20,36,66,78,92,120]) {
      const foot = diag(n,"left-foot-lock");
      const desired = sampleRisoIKTarget(left,Math.floor(n/2)*2);
      expect(Math.abs(foot.ankle.x-desired.x)).toBeLessThan(.001);
      expect(Math.abs(foot.ankle.y-desired.y)).toBeLessThan(.001);
      expect(foot.error).toBeLessThan(.001);
    }
    expect(sampleRisoIKTarget(right,0).y).toBe(0);
    expect(sampleRisoIKTarget(left,42).y).toBeLessThan(-5);
    expect(sampleRisoIKTarget(left,198).y).toBe(0);
    expect(sampleRisoIKTarget(right,198).y).toBe(0);
    expect(sampleRisoIKTarget(left,230)).toEqual(sampleRisoIKTarget(left,198));
  });
  it("articulates the knee and keeps boots level instead of rotating one rigid stick", () => {
    for(const n of [0,12,30,46,80,112,160,198,239]) {
      const frame = evalAt(n);
      const leg = frame.ik.find(c=>c.id==="left-foot-lock")!;
      expect(leg.ankle.y).toBeLessThanOrEqual(.001);
      const ankle = frame.joints.find(j=>j.id==="left-ankle")!;
      const printFrame=Math.floor(n/(COURIER.cadence??1))*(COURIER.cadence??1);
      expect(ankle.angle).toBeCloseTo(sampleRisoFootRoll(COURIER.ik![0].target,printFrame),3);
      const right = frame.joints.find(j=>j.id==="right-ankle")!;
      expect(right.angle).toBeCloseTo(sampleRisoFootRoll(COURIER.ik![1].target,printFrame),3);
    }
    const normal = evalAt(42);
    const fk = evalAt(42,true);
    expect(normal.ik).toHaveLength(3);
    expect(fk.ik).toHaveLength(0);
    const knee = (frame: typeof normal) => frame.joints.find(j=>j.id==="left-knee")!;
    expect(Math.hypot(knee(normal).x-knee(fk).x,knee(normal).y-knee(fk).y)).toBeGreaterThan(3);
    expect(normal.parts.find(p=>p.id==="left-boot")!.transform).not.toBe(fk.parts.find(p=>p.id==="left-boot")!.transform);
  });
  it("rolls a raised shoe toe-down then toe-up, but has zero pitch during foot contact", () => {
    const left=COURIER.ik![0].target;
    expect(sampleRisoFootRoll(left,10)).toBe(0);
    expect(sampleRisoFootRoll(left,35)).toBeGreaterThan(9);
    expect(sampleRisoFootRoll(left,47)).toBeLessThan(-9);
    expect(sampleRisoFootRoll(left,66)).toBe(0);
    expect(sampleRisoFootRoll(left,198)).toBe(0);
    expect(sampleRisoFootRoll(left,239)).toBe(0);
    expect(sampleRisoFootRoll({...left,kind:"walk",footRoll:0} as typeof left,45)).toBe(0);
  });
  it("follows a swinging satchel grip without breaking elbow topology or paper frame seeking", () => {
    const grip = COURIER.ik!.find(c => c.id === "satchel-handhold")!;
    expect(grip.target.kind).toBe("follow");
    for (const frame of [0, 22, 46, 79, 112, 142, 166, 198, 238]) {
      const pose = evalAt(frame), hold = pose.ik.find(c=>c.id==="satchel-handhold")!;
      const satchel=pose.joints.find(j=>j.id==="satchel")!;
      const radians=satchel.angle*Math.PI/180;
      const local=grip.target as {kind:"follow";joint:string;x:number;y:number};
      const at={x:satchel.x+Math.cos(radians)*local.x-Math.sin(radians)*local.y,
        y:satchel.y+Math.sin(radians)*local.x+Math.cos(radians)*local.y};
      expect(hold.requested.x).toBeCloseTo(at.x,3);
      expect(hold.requested.y).toBeCloseTo(at.y,3);
      expect(hold.reachable).toBe(true);
      expect(hold.error).toBeLessThan(.001);
      const wrist=pose.joints.find(j=>j.id==="right-hand")!;
      expect(Math.hypot(wrist.x-hold.requested.x,wrist.y-hold.requested.y)).toBeLessThan(.001);
    }
    const sample=evalAt(142);
    evalAt(0);evalAt(190);evalAt(17);
    expect(evalAt(142)).toEqual(sample);
  });
  it("rejects circular prop-follow targets and nonexistent attachment joints", () => {
    const replacement=(target:{kind:"follow";joint:string;x:number;y:number}) =>
      ({...COURIER,ik:COURIER.ik!.map(c=>c.id==="satchel-handhold"?{...c,target}:c)});
    expect(inspectRisoCharacter(replacement({kind:"follow",joint:"right-hand",x:1,y:2}))
      .some(x=>x.path.endsWith("/target"))).toBe(true);
    expect(inspectRisoCharacter(replacement({kind:"follow",joint:"no-such-prop",x:1,y:2}))
      .some(x=>x.path.endsWith("/target"))).toBe(true);
    // Following the other leg's IK-controlled ankle would make output depend
    // on the order in which constraints were evaluated.
    expect(inspectRisoCharacter(replacement({kind:"follow",joint:"left-ankle",x:0,y:0}))
      .some(x=>x.path.endsWith("/target"))).toBe(true);
    expect(inspectRisoCharacter(replacement({kind:"follow",joint:"satchel",x:Infinity,y:2}))
      .some(x=>x.path.endsWith("/target"))).toBe(true);
  });
  it("returns identical frames after a shuffled seek and reduced-motion is the final held cel", () => {
    const a=evalAt(96);
    evalAt(201);evalAt(0);evalAt(4);evalAt(238);
    expect(evalAt(96)).toEqual(a);
    expect(evaluateRisoCharacter(COURIER, 0, {reducedMotion:true})).toEqual(evalAt(239));
    expect(evalAt(239)).toEqual(evalAt(238));
    expect(evaluateRisoCharacter(PAPER_BIRD,10).ik).toHaveLength(0);
  });
  it("rejects invalid IK chains, shared joints, target values and malformed gait timing", () => {
    const malformed = { ...COURIER, ik: COURIER.ik!.map((ik,i)=>i?ik:{...ik,mid:"head"}) };
    expect(inspectRisoCharacter(malformed).some(x=>x.path.endsWith("/chain"))).toBe(true);
    const duplicate = { ...COURIER, ik:[COURIER.ik![0],COURIER.ik![0]] };
    expect(inspectRisoCharacter(duplicate).some(x=>/id|chain/.test(x.path))).toBe(true);
    const badGait = { ...COURIER, ik: COURIER.ik!.map((ik,i)=>i?ik:{
      ...ik,target:{ ...ik.target,kind:"walk" as const,cycleFrames:2,stanceFrames:3 }
    })};
    expect(inspectRisoCharacter(badGait).some(x=>x.path.endsWith("/target"))).toBe(true);
    const keyed = { ...COURIER, ik: COURIER.ik!.map((ik,i)=>i?ik:{
      ...ik,target:{kind:"keys" as const,keys:[{frame:20,x:0,y:0},{frame:10,x:0,y:0}]}
    }) };
    expect(inspectRisoCharacter(keyed).some(x=>x.path.includes("/target/keys/"))).toBe(true);
  });
  it("renders optional rig diagnostics on the blue plate only, never in production art", () => {
    const p = risoPerformanceSpec("landscape").plates;
    const make=(plate: "blue"|"red",showRig:boolean)=>renderToStaticMarkup(createElement(
      RisoCharacterInk, {spec:COURIER,frame:42,plateId:plate,
        paint:{solid:p[plate==="blue"?0:1].color,dots:"#888888"},showRig}
    ));
    expect(make("blue",false)).not.toContain("data-km-riso-rig-diagnostics");
    const debug=make("blue",true);
    expect(debug).toContain('data-km-riso-joint="left-knee"');
    expect(debug).toContain('data-km-riso-foot-target="left-foot-lock"');
    expect(debug).toContain('data-km-riso-foot-target="right-foot-lock"');
    expect(make("red",true)).not.toContain("data-km-riso-rig-diagnostics");
  });
});
