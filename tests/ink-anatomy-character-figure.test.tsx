import {describe,expect,it} from "vitest";
import type {HumanFrame} from "../registry/anatomy/anatomy-view";
import {JOINTS} from "../registry/anatomy/anatomy-pose";
import {evaluateInkBrush,inspectInkBrush} from "../registry/video/ink-brush";
import {
  buildInkRobeBrushSpec,buildInkRobePaths,createInkAnatomyPose,
} from "../src/video/ink-anatomy-character-figure";

const frame={
  width:460,height:840,floorY:804,
  bounds:{x0:142,y0:32,x1:318,y1:808},
  landmarks:{
    suprasternale:[230,215],vertex:[230,42],menton:[230,122],
    "zygion.L":[210,86],"zygion.R":[250,86],pronasale:[230,95],
  },
  joints:{
    "upperarm.L":{head:[187,215],tail:[164,318]},
    "forearm.L":{head:[164,318],tail:[168,432]},
    "wrist.L":{head:[168,432],tail:[165,452]},
    "upperarm.R":{head:[273,215],tail:[296,320]},
    "forearm.R":{head:[296,320],tail:[288,426]},
    "wrist.R":{head:[288,426],tail:[292,446]},
    "thigh.L":{head:[205,430],tail:[204,620]},
    "thigh.R":{head:[255,430],tail:[256,620]},
    "foot.L":{head:[204,752],tail:[181,790]},
    "foot.R":{head:[256,752],tail:[279,790]},
  },
} as unknown as HumanFrame;

describe("ANAT4 anatomy-led Chinese ink full figure",()=>{
  it("poses a real articulated five-finger grip with opposed thumb for both props",()=>{
    for(const prop of ["staff","pipe"] as const){
      const pose=createInkAnatomyPose(prop);
      expect(pose["thumb-cmc.R"]?.abduct).toBeGreaterThan(0);
      expect(pose["thumb-mcp.R"]?.flex).toBeGreaterThan(0);
      expect(pose["thumb-ip.R"]?.flex).toBeGreaterThan(0);
      for(const finger of [2,3,4,5]){
        expect(pose[`finger${finger}-mcp.R`]?.flex).toBeGreaterThan(0);
        expect(pose[`finger${finger}-pip.R`]?.flex).toBeGreaterThan(0);
        expect(pose[`finger${finger}-dip.R`]?.flex).toBeGreaterThan(0);
      }
      for(const [joint,angles] of Object.entries(pose)){
        const base=joint.replace(/\.(L|R)$/,"");
        const definition=JOINTS.find(x=>x.id===base);
        expect(definition, joint).toBeDefined();
        for(const [dof,value] of Object.entries(angles)){
          const range=definition!.dofs[dof as keyof typeof definition.dofs];
          expect(range, joint+" "+dof).toBeDefined();
          expect(value).toBeGreaterThanOrEqual(range!.min);
          expect(value).toBeLessThanOrEqual(range!.max);
        }
      }
    }
  });

  it("derives connected robe, cuffs, headwear and prop geometry from posed body landmarks",()=>{
    for(const character of ["scholar","elder"] as const){
      const prop=character==="elder"?"pipe":"staff";
      const geometry=buildInkRobePaths(frame,character,prop);
      expect(geometry.body).toMatch(/^M/);
      expect(geometry.sleeves.every(path=>path.startsWith("M"))).toBe(true);
      expect(geometry.collar).toContain("M");
      expect(geometry.cap).toContain("Z");
      expect(geometry.prop.path).toContain("M");
      expect(geometry.anchors.hem[0][1]).toBeLessThan(frame.floorY);
      expect(Object.values(geometry.anchors).flat(2).every(Number.isFinite)).toBe(true);
      if(character==="elder")expect(geometry.beard).toContain("Z");
      else expect(geometry.beard).toBe("");
    }
  });

  it("creates valid pressure-varied INK1 folds from the anatomy frame",()=>{
    const spec=buildInkRobeBrushSpec(frame,"scholar");
    expect(spec.strokes.length).toBeGreaterThanOrEqual(8);
    expect(inspectInkBrush(spec)).toEqual([]);
    const marks=evaluateInkBrush(spec,1,true);
    expect(marks).toHaveLength(spec.strokes.length);
    expect(marks.every(mark=>mark.outline.length>0&&mark.core.length>0)).toBe(true);
    expect(marks.some(mark=>mark.gaps.length>0)).toBe(true);
  });
});
