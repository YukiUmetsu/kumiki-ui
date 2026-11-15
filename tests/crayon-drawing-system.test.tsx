import {describe,it,expect} from "vitest";
import {renderToStaticMarkup} from "react-dom/server";
import {CrayonScene} from "../registry/video/materials/crayon-scene-react";
import {inspectCrayonScene} from "../registry/video/materials/crayon-scene";
import type {CrayonSceneSpec} from "../registry/video/materials/crayon-scene";
import {crayonDirectionalStrokes,inspectCrayonDrawingPlan} from "../registry/video/materials/crayon-art-direction";
import {crayonBotanicalDrawing} from "../src/video/crayon-drawing-system-fixtures";
import studioMeta,{CrayonDrawingStudio,FourPassWaxConstruction,VerticalDrawingStudy}
  from "../src/video/crayon-drawing-system.stories";

const params=(aspect:"landscape"|"portrait",detail=1)=>({
  aspect,detail,pressure:.88,paperTooth:.78,
});
describe("strict native Crayon drawing grammar",()=>{
  it("keeps one original Material drawing page in the existing Storybook folder",()=>{
    expect(studioMeta.title).toBe("Video production/Film Looks/Crayon/Materials/Drawing System");
    expect(studioMeta.tags).toContain("!dev");
    expect(studioMeta.id).toBe("video-crayon-drawing-system");
    expect(VerticalDrawingStudy.args?.aspect).toBe("portrait");
    expect(FourPassWaxConstruction.args??{}).toEqual({});
  });
  for(const aspect of ["landscape","portrait"] as const){
    for(const detail of [.2,1]){
      it("validates source geometry, opacity, phases, contours, and attachments: "+aspect+"/"+detail,()=>{
        const {scene,plan}=crayonBotanicalDrawing(params(aspect,detail));
        expect(inspectCrayonScene(scene)).toEqual([]);
        expect(inspectCrayonDrawingPlan(scene,plan)).toEqual([]);
        expect(scene.elements.length).toBeLessThan(240);
        expect(scene.elements.filter(n=>n.kind==="contour").length).toBeGreaterThan(20*detail);
        const nodes=new Map(scene.elements.map(n=>[n.id,n]));
        const pear=nodes.get("pear-body"),leaf=nodes.get("leaf-body");
        expect(pear?.kind==="wax"&&pear.coverage).toBe("opaque");
        expect(leaf?.parentId).toBe("pear-body");
        expect(nodes.get("pear-blush")?.parentId).toBe("pear-body");
        expect(nodes.get("pear-blush")?.kind).toBe("wax");
        expect(plan.subjects[0].attachments).toHaveLength(2);
        const html=renderToStaticMarkup(<CrayonScene spec={scene} frame={239}/>);
        expect(html).toContain('data-km-crayon-underpaint="opaque"');
        expect(html).toContain('data-km-crayon-clipped-to="pear-body"');
        expect(html).toContain('data-km-crayon-element="leaf-body"');
        expect(html).not.toContain('data-km-crayon-lettering=');
      });
    }
    it("provides a responsive, descriptive SVG workbench at "+aspect,()=>{
      const html=renderToStaticMarkup(<CrayonDrawingStudio {...params(aspect)}
        startFrame={239} playbackRate={1} loop={false}/>);
      expect(html).toContain('data-km-crayon-drawing-studio=""');
      expect(html).toContain('data-km-crayon-drawing-status=""');
      expect(html).toContain("Structure passes");
      expect(html).toContain("Directional finishing");
      expect(html).toContain('data-km-crayon-scene="crayon-botanical-drawing-'+aspect+'"');
      expect(html).not.toContain("Requires correction");
    });
  }
  it("rejects uncovered, transparent, detached and incorrectly ordered art",()=>{
    const {scene,plan}=crayonBotanicalDrawing(params("landscape"));
    const first=plan.subjects[0];
    const broken={...plan,subjects:[{...first,attachments:[{
      ...first.attachments[0],
      to:{...first.attachments[0].to,point:{x:300,y:200}},
    }]}]};
    expect(inspectCrayonDrawingPlan(scene,broken)).toContain(
      "botanical-subject: attachment[0]: attachment is disconnected");
    const noLeaf={...plan,subjects:[{...first,
      parts:first.parts.filter(p=>p.nodeId!=="leaf-body")}]};
    expect(inspectCrayonDrawingPlan(scene,noLeaf).some(x=>x.includes("untracked scene element leaf-body"))).toBe(true);
    const transparent:CrayonSceneSpec={...scene,elements:scene.elements.map(n=>
      n.id==="pear-body"&&n.kind==="wax"?{...n,coverage:"open" as const}:n)};
    expect(inspectCrayonDrawingPlan(transparent,plan).some(x=>x.includes("root must be"))).toBe(true);
    const unclipped:CrayonSceneSpec={...scene,elements:scene.elements.map(n=>
      n.id==="pear-blush"&&n.kind==="wax"?{...n,clipToParent:false}:n)};
    expect(inspectCrayonDrawingPlan(unclipped,plan).some(x=>x.includes("glaze must be open"))).toBe(true);
    const late:CrayonSceneSpec={...scene,elements:scene.elements.map(n=>
      n.id==="leaf-body"?{...n,timing:{start:128,end:235}}:n)};
    expect(inspectCrayonDrawingPlan(late,plan).some(x=>x.includes("construction phase"))).toBe(true);
    const primitive:CrayonSceneSpec={...scene,elements:scene.elements.map(n=>
      n.id==="pear-body"&&n.kind==="wax"?{...n,d:"M0 0L1 0L0 1Z"}:n)};
    expect(inspectCrayonDrawingPlan(primitive,plan).some(x=>x.includes("insufficient authored curves"))).toBe(true);
  });
  it("returns reproducible tangent-led width-modulated strokes and rejects invalid controls",()=>{
    const guide=[
      {x:0,y:0},{x:25,y:-30},{x:65,y:50},{x:110,y:32},
    ] as const;
    const options={prefix:"grain",parentId:"solid",seed:28,count:16,guide,
      spread:22,length:12,width:1.7,pressure:.83,color:"#b17766" as const,
      startFrame:161,endFrame:237};
    const a=crayonDirectionalStrokes(options),b=crayonDirectionalStrokes(options);
    expect(a).toEqual(b);
    expect(crayonDirectionalStrokes({...options,seed:29})).not.toEqual(a);
    expect(new Set(a.map(x=>x.id)).size).toBe(a.length);
    expect(new Set(a.map(x=>x.width)).size).toBeGreaterThan(6);
    expect(a.every(x=>x.kind==="contour"&&x.clipToParent&&
      x.parentId==="solid"&&x.d.includes("Q"))).toBe(true);
    for(const change of [
      {...options,pressure:NaN},{...options,count:1000},
      {...options,guide:[guide[0],guide[0],guide[0],guide[0]] as const},
      {...options,spread:-1},{...options,color:"#123" as "#123456"},
    ])expect(()=>crayonDirectionalStrokes(change)).toThrow(RangeError);
    expect(()=>crayonBotanicalDrawing({...params("landscape"),detail:1.1})).toThrow();
    expect(()=>crayonBotanicalDrawing({...params("portrait"),pressure:-.1})).toThrow();
  });
});
