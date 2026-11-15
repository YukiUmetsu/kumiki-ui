import {describe,it,expect} from "vitest";
import {renderToStaticMarkup} from "react-dom/server";
import {CrayonScene} from "../registry/video/materials/crayon-scene-react";
import {inspectCrayonScene} from "../registry/video/materials/crayon-scene";
import type {CrayonSceneSpec} from "../registry/video/materials/crayon-scene";
import {crayonDirectionalStrokes,inspectCrayonDrawingPlan} from "../registry/video/materials/crayon-art-direction";
import type {CrayonDrawingPlan} from "../registry/video/materials/crayon-art-direction";
import {crayonBotanicalDrawing} from "../src/video/crayon-drawing-system-fixtures";
import studioMeta,{CrayonDrawingStudio,FourPassWaxConstruction,VerticalDrawingStudy,crayonDrawingInspectionSpec}
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
    expect(studioMeta.argTypes?.inspection).toBeDefined();
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
        // Light is built from stacked, individually curved wax planes.
        for(const part of ["stalk-well","pear-belly-umbra","pear-cool-turn",
          "pear-raking-light","pear-blush-glimmer","pear-reflected-glow"]){
          const wax=nodes.get(part);
          if(wax?.kind!=="wax")throw new Error("Missing studied volume: "+part);
          expect(wax.coverage).toBe("open");
          expect(wax.clipToParent).toBe(true);
          expect(wax.parentId).toBe("pear-body");
          expect(wax.blendRadius).toBeGreaterThan(0);
          expect(wax.d).toMatch(/[CQ]/);
        }
        const body=nodes.get("pear-body");
        if(body?.kind!=="wax")throw new Error("Missing fruit volume");
        expect((body.d.match(/[CQ]/g)??[]).length).toBeGreaterThanOrEqual(8);
        const vein=nodes.get("leaf-main-vein");
        expect(vein?.kind).toBe("contour");
        if(vein?.kind==="contour")
          expect((vein.d.match(/[CQ]/g)??[]).length).toBeGreaterThanOrEqual(5);
        expect(plan.subjects[0].attachments).toHaveLength(2);
        expect(plan.ambientIds).toContain("fruit-contact-umbra");
        expect(nodes.get("fruit-contact-umbra")?.kind).toBe("wax");
        const leafMidrib=nodes.get("leaf-midrib-undertone");
        expect(leafMidrib?.parentId).toBe("leaf-body");
        for(const group of ["pear-chromatic-scumble","pear-blush-broken-wax",
          "leaf-second-pass","pear-light-binder","pear-cool-binder"]){
          const marks=scene.elements.filter(node=>node.id.startsWith(group+"-"));
          expect(marks.length).toBeGreaterThanOrEqual(Math.round(17*detail));
          expect(marks.every(n=>n.kind==="contour"&&n.clipToParent&&
            n.opacity!==undefined&&n.opacity<.5)).toBe(true);
        }
        const html=renderToStaticMarkup(<CrayonScene spec={scene} frame={239}/>);
        expect(html).toContain('data-km-crayon-underpaint="opaque"');
        expect(html).toContain('data-km-crayon-clipped-to="pear-body"');
        expect(html).toContain('data-km-crayon-element="leaf-body"');
        expect(html).not.toContain('data-km-crayon-lettering=');
      });
    }
    it("keeps macro reviews source-native and identical in wax geometry at "+aspect,()=>{
      const {scene}=crayonBotanicalDrawing(params(aspect));
      expect(crayonDrawingInspectionSpec(scene,"full")).toBe(scene);
      for(const inspection of ["surface","stalk-leaf","contact"] as const){
        const framed=crayonDrawingInspectionSpec(scene,inspection);
        expect(framed.seed).toBe(scene.seed);
        expect(framed.elements).toBe(scene.elements);
        expect(framed.durationFrames).toBe(scene.durationFrames);
        expect(inspectCrayonScene(framed)).toEqual([]);
        expect(framed.camera?.[0].zoom).toBeGreaterThan(2);
        expect(framed.camera?.[1].frame).toBe(239);
        const html=renderToStaticMarkup(<CrayonDrawingStudio {...params(aspect)}
          startFrame={239} playbackRate={1} loop={false} inspection={inspection}/>);
        expect(html).toContain('data-km-crayon-inspection="'+inspection+'"');
        expect(html).toContain('data-km-crayon-element="pear-body"');
        expect(html).toContain("Structure passes");
      }
    });
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
    expect(inspectCrayonDrawingPlan(scene,broken).some(x=>
      x.includes("attachment is disconnected"))).toBe(true);
    // A final-frame-only check misses a leaf that separates then reconnects.
    const drifting:CrayonSceneSpec={...scene,elements:scene.elements.map(n=>
      n.id==="leaf-body"?{...n,motion:[
        {frame:0,x:0,y:0},{frame:120,x:75,y:0},{frame:239,x:0,y:0},
      ]}:n)};
    expect(inspectCrayonScene(drifting)).toEqual([]);
    expect(inspectCrayonDrawingPlan(drifting,plan).some(x=>
      x.includes("disconnected at frame"))).toBe(true);
    const noLeaf={...plan,subjects:[{...first,
      parts:first.parts.filter(p=>p.nodeId!=="leaf-body")}]};
    expect(inspectCrayonDrawingPlan(scene,noLeaf).some(x=>x.includes("untracked scene element leaf-body"))).toBe(true);
    const transparent:CrayonSceneSpec={...scene,elements:scene.elements.map(n=>
      n.id==="pear-body"&&n.kind==="wax"?
      {...n,coverage:"open" as const,underpaintGradient:undefined}:n)};
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
  it("does not accept a touchpoint from a different subject merely because its world position matches",()=>{
    const {scene,plan}=crayonBotanicalDrawing(params("landscape"));
    const original=scene.elements.find(n=>n.id==="pear-body");
    if(original?.kind!=="wax")throw new Error("Missing source fruit");
    const second={...original,id:"second-fruit"};
    const copied:CrayonSceneSpec={...scene,elements:[...scene.elements,second]};
    const bad:CrayonDrawingPlan={...plan,subjects:[...plan.subjects,{
      id:"second-subject",kind:"object",rootId:"second-fruit",
      parts:[{nodeId:"second-fruit",role:"solid",phase:"blocking",minCurves:6}],
      attachments:[{
        from:{nodeId:"second-fruit",point:{x:-17,y:-139}},
        to:{nodeId:"pear-body",point:{x:-17,y:-139}},
        tolerance:1,
      }],
    }]};
    expect(inspectCrayonScene(copied)).toEqual([]);
    expect(inspectCrayonDrawingPlan(copied,bad)).toContain(
      "second-subject: attachment[0]: anchors must belong to this subject");
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
