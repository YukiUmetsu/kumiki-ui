import {describe,expect,it} from "vitest";
import {evaluateCharacter} from "../registry/character/evaluate";
import {validateCharacterDefinition} from "../registry/character/validate";
import {inkRouteAt,inkWalkAt,auditInkWalkContacts} from
  "../registry/video/ink-actor-director";
import {SHANSHUI_SCENES} from "../registry/video/ink-shanshui";
import {SHANSHUI_TEACHER_MESHES} from "../src/video/ink-shanshui-teacher-mesh";
import {
  shanshuiBodyAssets,shanshuiBodyFit,shanshuiFittedRoute,
  bakeShanshuiGroundedShoes,bakeShanshuiWalkingHem,
} from "../src/video/ink-shanshui-full-body";
import {makeShanshuiScholar,shanshuiScholarInstance} from
  "../src/video/ink-shanshui-film";
import {inkDirectorGait} from "../src/video/ink-actor-director-demo";

describe("entire-body, reference-projected shanshui figures",()=>{
  it("calibrates height, width, shoulders, waist, hem and BOTH sleeves from the same source",()=>{
    const refs=SHANSHUI_SCENES.map(scene=>shanshuiBodyFit(scene));
    expect(new Set(refs.map(f=>f.stageScale.toFixed(2))).size).toBe(3);
    expect(refs[1].sourceFigureRatio).toBeLessThan(refs[0].sourceFigureRatio);
    for(const scene of SHANSHUI_SCENES){
      const figure=SHANSHUI_TEACHER_MESHES[scene],fit=shanshuiBodyFit(scene);
      expect(fit.sourceFigureRatio).toBeCloseTo(
        figure.figure.width/figure.figure.height,2);
      expect(fit.stageScale).toBeCloseTo(
        figure.figure.height/figure.source.height*540/291,2);
      expect(fit.sourceShoulderRatio).toBeGreaterThan(.12);
      expect(fit.sourceWaistRatio).toBeGreaterThan(.1);
      expect(fit.sourceHemRatio).toBeGreaterThan(.15);
      expect(fit.sourceSleeveRatio).toBeGreaterThan(.2);
      expect(fit.anchors.leftWaist.y).toBeGreaterThan(fit.anchors.leftShoulder.y);
      expect(fit.anchors.leftHem.y).toBeGreaterThan(fit.anchors.leftWaist.y);
      expect(fit.anchors.rightHem.y).toBeGreaterThan(fit.anchors.rightWaist.y);
      expect(fit.anchors.leftFoot.y).toBeGreaterThan(fit.anchors.leftHem.y);
      expect(fit.anchors.nearHand).not.toEqual(fit.anchors.farHand);
      const route=shanshuiFittedRoute(scene);
      const final=route.waypoints[route.waypoints.length-1];
      expect(final.x).toBeCloseTo(fit.stageCenterX,1);
      expect(final.y).toBeCloseTo(fit.stageFootY,1);
      expect(final.scale).toBeCloseTo(fit.stageScale,2);
    }
  });
  it("replaces every generic body sprite with original opaque source geometry",()=>{
    for(const scene of SHANSHUI_SCENES){
      const def=makeShanshuiScholar(.95,.88,scene);
      expect(validateCharacterDefinition(def)
        .filter(d=>d.severity==="error")).toEqual([]);
      const original=shanshuiBodyAssets(scene);
      for(const name of ["robe","collar","belt","sleeve-near","sleeve-far",
        "hand-near","hand-far","scroll","near-upper","far-upper",
        "near-lower","far-lower","shoe-left","shoe-right"]){
        expect(def.assets[name]).toEqual(original[name]);
      }
      const body=def.assets.robe;
      if(body.kind!=="shapes")throw new Error("Source fit requires vector robe.");
      expect(body.shapes.length).toBeGreaterThanOrEqual(3);
      expect(body.shapes[0].type).toBe("path");
      if(body.shapes[0].type==="path"){
        expect(body.shapes[0].fill).toBe("$linen");
        expect(body.shapes[0].opacity).toBe(1);
      }
      for(const id of ["shoe-left","shoe-right","body","head","collar","sash",
        "far-sleeve","near-sleeve","near-hand","far-hand","hem-drape"]){
        expect(def.parts.some(p=>p.id===id)).toBe(true);
      }
      expect(def.capabilities).toContain("full-figure-source-fit");
      expect(def.capabilities).toContain("world-planted-shoes");
      expect(def.palette.linen).toBe("#d9c0a0");
      expect(def.anchors?.hand).toMatchObject({
        part:"near-hand",at:shanshuiBodyFit(scene).anchors.nearHand,
      });
      if(scene==="river-scholar"){
        const scroll=def.assets.scroll;
        if(scroll.kind!=="shapes")throw new Error("Expected scroll vector");
        expect(scroll.shapes.length).toBeGreaterThan(0);
      }else {
        const scroll=def.assets.scroll;
        if(scroll.kind!=="shapes")throw new Error("Expected scroll vector");
        expect(scroll.shapes).toEqual([]);
      }
    }
  });
  it("uses opaque connected finger silhouettes for both reader scroll grips",()=>{
    const reader=shanshuiBodyAssets("river-scholar");
    const fallback=shanshuiBodyAssets("misty-hermit");
    for(const name of ["hand-near","hand-far"]){
      const grip=reader[name],old=fallback[name];
      if(grip.kind!=="shapes"||old.kind!=="shapes")
        throw Error("Hand art must be inspectable vector shapes");
      expect(grip.shapes.length).toBeGreaterThanOrEqual(7);
      expect(grip.shapes.length).toBeGreaterThan(old.shapes.length);
      const silhouette=grip.shapes[0];
      expect(silhouette).toMatchObject({
        type:"path",fill:"$skin",opacity:1,
      });
      if(silhouette.type!=="path")throw Error("Reader hand is not a path");
      expect(silhouette.d.endsWith(" Z")).toBe(true);
      expect(grip.shapes.filter(x=>x.type==="path"&&x.fill==="none").length)
        .toBeGreaterThan(4);
      for(const shape of grip.shapes){
        if(shape.type!=="path")throw Error("Reader grip must be authored paths");
        expect(shape.d).not.toMatch(/NaN|Infinity|undefined/);
      }
    }
    const model=makeShanshuiScholar(.9,.9,"river-scholar");
    expect(validateCharacterDefinition(model).filter(x=>x.severity==="error"))
      .toEqual([]);
    for(const name of ["near-hand","far-hand"]){
      expect(model.parts.find(part=>part.id===name)).toBeDefined();
    }
  });

  it("animates separate opaque hem planes from grounded gait and settles at rest",()=>{
    for(const scene of SHANSHUI_SCENES){
      const fit=shanshuiBodyFit(scene),assets=shanshuiBodyAssets(scene);
      const model=makeShanshuiScholar(1,.9,scene);
      const moving=shanshuiScholarInstance(scene,1);
      const still=shanshuiScholarInstance(scene,0);
      expect(model.capabilities).toContain("independent-opaque-walking-hem");
      for(const id of ["hem-panel-left","hem-panel-right"]){
        const asset=assets[id];
        if(asset.kind!=="shapes")throw Error("Split hem requires SVG art");
        expect(asset.shapes.length).toBeGreaterThanOrEqual(4);
        expect(asset.shapes[0]).toMatchObject({
          type:"path",fill:"$linen",opacity:1,
        });
        expect(model.parts.find(p=>p.id===id)).toMatchObject({
          parent:"body",channel:"body",asset:id,
        });
        const keys=moving.corrections?.[id]??[];
        const resting=still.corrections?.[id]??[];
        expect(keys.length).toBeGreaterThan(100);
        expect(resting.length).toEqual(keys.length);
        expect(resting.every(k=>Object.values(k.pose).every(v=>v===0))).toBe(true);
        expect(keys[keys.length-1].pose).toMatchObject({
          x:0,y:0,rotation:0,
        });
        for(const key of keys){
          expect(Object.values(key.pose).every(v=>
            typeof v==="number"&&Number.isFinite(v))).toBe(true);
          expect(Math.abs(key.pose.x??0)).toBeLessThan(8);
          expect(Math.abs(key.pose.y??0)).toBeLessThan(3);
          expect(Math.abs(key.pose.rotation??0)).toBeLessThan(7);
        }
        const mid=keys.filter(k=>k.frame>=40&&k.frame<=130);
        expect(new Set(mid.map(k=>(k.pose.x??0).toFixed(2))).size)
          .toBeGreaterThan(5);
      }
      expect(moving.corrections?.["hem-panel-left"])
        .not.toEqual(moving.corrections?.["hem-panel-right"]);
      const plan={
        ...inkDirectorGait("landscape"),route:shanshuiFittedRoute(scene),
        startFrame:0,endFrame:154,cycleFrames:26,footLift:5.5,bodyBob:1,
        footSeparation:Math.abs(fit.anchors.rightFoot.x-fit.anchors.leftFoot.x)/2,
        hipHeight:65,upperLength:51,lowerLength:49,
      };
      expect(bakeShanshuiWalkingHem(plan,fit,1))
        .toEqual(bakeShanshuiWalkingHem(plan,fit,1));
      expect(()=>bakeShanshuiWalkingHem(plan,fit,NaN)).toThrow(RangeError);
      expect(()=>bakeShanshuiWalkingHem(plan,fit,1.1)).toThrow(RangeError);
      expect(()=>bakeShanshuiWalkingHem(plan,fit,1,100)).toThrow(RangeError);
      expect(validateCharacterDefinition(model)
        .filter(d=>d.severity==="error")).toEqual([]);
    }
  });

  it("plants actual shoe art anchors at the world-locked gait targets at every sampled pose",()=>{
    for(const scene of SHANSHUI_SCENES){
      const definition=makeShanshuiScholar(.9,.9,scene);
      const instance=shanshuiScholarInstance(scene,0);
      const fit=shanshuiBodyFit(scene);
      const route=shanshuiFittedRoute(scene);
      const gait=inkDirectorGait("landscape");
      const plan={
        ...gait,route,startFrame:0,endFrame:154,cycleFrames:26,
        footLift:5.5,bodyBob:1,
        footSeparation:Math.abs(fit.anchors.rightFoot.x-fit.anchors.leftFoot.x)/2,
        hipHeight:65,upperLength:51,lowerLength:49,
        parts:{
          leftUpper:gait.parts.leftUpper,leftLower:gait.parts.leftLower,
          rightUpper:gait.parts.rightUpper,rightLower:gait.parts.rightLower,
          torso:"body",head:"head",
        },
      };
      const audit=auditInkWalkContacts(plan,.5,2);
      expect(audit.violations).toEqual([]);
      expect(bakeShanshuiGroundedShoes(plan,fit,299))
        .toEqual(bakeShanshuiGroundedShoes(plan,fit,299));
      for(const frame of [0,60,90,122,154,200,299]){
        const actor=evaluateCharacter(definition,instance,[],frame);
        const stage=inkRouteAt(route,frame);
        const walking=inkWalkAt(plan,frame);
        for(const [name,foot] of [
          ["shoe-left",walking.left],["shoe-right",walking.right],
        ] as const){
          const expected={
            x:133+(foot.x-stage.x)/stage.scale,
            y:340+(foot.y-stage.y)/stage.scale,
          };
          const actual=actor.anchors[name];
          expect(actual).toBeDefined();
          // Final renderer is a true vector asset attached to this pose anchor.
          expect(Math.hypot(expected.x-actual.x,expected.y-actual.y))
            .toBeLessThan(.2);
        }
      }
    }
  });
});
