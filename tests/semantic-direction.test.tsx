import { describe,expect,it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { directionFromStoryboard,evaluateSemanticTransfer,semanticSampleFrames } from "../registry/motion/semantic-direction";
import { createStoryboard } from "../registry/motion/storyboard";
import type { SemanticDirectionScene } from "../registry/motion/semantic-direction";
import { SemanticTransferSvg } from "../registry/motion/semantic-transfer-svg";
import { validateExplainerComposition } from "../registry/visual/explainer-preflight";
import { layoutSemanticLabels } from "../registry/visual/semantic-labels";

const a={x:50,y:70,width:100,height:80},b={x:440,y:80,width:100,height:80};
const scene:SemanticDirectionScene={
  id:"general-process",width:900,height:500,durationFrames:120,
  elements:[
    {id:"input",semanticId:"example-request",role:"subject",bounds:a},
    {id:"output",semanticId:"example-result",role:"subject",bounds:b},
    {id:"badge",semanticId:"label-for-result",role:"label",bounds:{x:680,y:95,width:130,height:30},
      text:"Result"},
  ],
  beats:[{id:"process",range:{startFrame:0,endFrame:120},
    claim:"A request becomes a result",visualChange:"Move the named request into the processor",
    focusId:"input"}],
  transfers:[{id:"request",semanticId:"example-request",intent:"transport",
    fromId:"input",toId:"output",range:{startFrame:30,endFrame:90},fadeFrames:8}],
  camera:[{id:"stay",kind:"hold",targetId:"input",
    reason:"Keep the transformation legible",range:{startFrame:0,endFrame:120}}],
};
const flow=scene.transfers![0];
describe("semantic animation contracts",()=>{
  it("hides all transfer geometry outside the causal event",()=>{
    expect(evaluateSemanticTransfer(flow,0,a,b).visible).toBe(false);
    expect(evaluateSemanticTransfer(flow,29,a,b).visible).toBe(false);
    expect(evaluateSemanticTransfer(flow,30,a,b)).toMatchObject({
      visible:true,progress:0,opacity:1,from:{x:150,y:110},to:{x:440,y:120},
    });
    expect(evaluateSemanticTransfer(flow,60,a,b).progress).toBeCloseTo(.5);
    expect(evaluateSemanticTransfer(flow,89,a,b).opacity).toBeLessThan(.15);
    expect(evaluateSemanticTransfer(flow,90,a,b).visible).toBe(false);
    // Absolute-seek behavior never depends on the previous frame.
    expect(evaluateSemanticTransfer(flow,60,a,b)).toEqual(evaluateSemanticTransfer(flow,60,a,b));
  });
  it("renders no idle path and retains semantic data identity in SVG",()=>{
    const props={frame:0,transfer:flow,fromBounds:a,toBounds:b,color:"#70e5dd"};
    expect(renderToStaticMarkup(createElement(SemanticTransferSvg,props))).toBe("");
    const active=renderToStaticMarkup(createElement(SemanticTransferSvg,{...props,frame:60}));
    expect(active).toContain('data-km-semantic-transfer="request"');
    expect(active).toContain('data-semantic-id="example-request"');
    expect(active).toContain("stroke-dasharray=");
    expect(renderToStaticMarkup(createElement(SemanticTransferSvg,{...props,frame:90}))).toBe("");
  });
  it("samples boundaries, midpoints and last frames without rendering a film",()=>{
    expect(semanticSampleFrames(scene)).toEqual([0,30,60,89,119]);
  });
  it("inspects static bounds by default instead of passing with zero inspected frames",()=>{
    const clipped:SemanticDirectionScene={...scene,elements:scene.elements.map(e=>
      e.id==="badge"?{...e,bounds:{x:850,y:95,width:130,height:30}}:e),
    };
    const result=validateExplainerComposition(clipped);
    expect(result.ok).toBe(false);
    expect(result.inspectedFrames).toBeGreaterThan(0);
    expect(result.diagnostics).toContainEqual(expect.objectContaining({
      code:"label-clipped",frame:0,elements:["badge"],
    }));
    expect(validateExplainerComposition(clipped,{samples:[]}).ok).toBe(false);
  });
  it("samples a caption's own visibility boundaries without a full-frame scan",()=>{
    const withEntrance:SemanticDirectionScene={...scene,elements:scene.elements.map(e=>
      e.id==="badge"?{...e,visible:{startFrame:40,endFrame:80}}:e),
    };
    expect(semanticSampleFrames(withEntrance)).toEqual([0,30,40,60,79,89,119]);
    const result=validateExplainerComposition(withEntrance);
    expect(result.inspectedFrames).toBe(7);
    expect(result.ok).toBe(true);
  });
  it("rejects duplicate keyframes and invalid supplied geometry instead of ignoring them",()=>{
    const result=validateExplainerComposition(scene,{samples:[
      {frame:40,bounds:{ghost:{x:0,y:0,width:1,height:1}},
        cameraFocus:{ghost:{x:100,y:100}},cameraPose:[0,NaN]},
      {frame:40},
      {frame:60,bounds:{badge:{x:300,y:20,width:NaN,height:20}}},
    ]});
    expect(result.ok).toBe(false);
    expect(result.inspectedFrames).toBe(2);
    expect(result.diagnostics.map(d=>d.code)).toEqual(expect.arrayContaining([
      "sample-bounds","sample-camera-pose","sample-camera-focus",
      "sample-frame-duplicate","label-clipped",
    ]));
  });
  it("accepts clean authored geometry and semantic timings",()=>{
    const res=validateExplainerComposition(scene,{samples:[
      {frame:0,cameraPose:[0,1,2]},
      {frame:60,cameraPose:[0,1,2]},
      {frame:119,cameraPose:[0,1,2]},
    ]});
    expect(res.ok).toBe(true);
    expect(res.inspectedFrames).toBe(3);
    expect(res.diagnostics).toEqual([]);
  });
  it("reports collisions and clipping with specific frame+semantic IDs",()=>{
    const res=validateExplainerComposition(scene,{samples:[{
      frame:60,bounds:{badge:{x:455,y:90,width:120,height:32}},
    }]});
    expect(res.ok).toBe(false);
    expect(res.diagnostics).toContainEqual(expect.objectContaining({
      code:"label-obscures-subject",frame:60,elements:["badge","output"],
    }));
    const edge=validateExplainerComposition(scene,{samples:[{
      frame:40,bounds:{badge:{x:870,y:90,width:120,height:32}},
    }]});
    expect(edge.diagnostics.some(d=>d.code==="label-clipped")).toBe(true);
  });
  it("fails malformed scenes, nameless decorative movements and invalid camera intentions",()=>{
    const broken:SemanticDirectionScene={...scene,
      beats:[{...scene.beats[0],claim:"",focusId:"unknown"}],
      transfers:[{...flow,semanticId:"",fromId:"unknown",range:{startFrame:80,endFrame:60}}],
      camera:[{...scene.camera![0],reason:""}],
    };
    const res=validateExplainerComposition(broken);
    expect(res.ok).toBe(false);
    expect(res.diagnostics.map(d=>d.code)).toEqual(expect.arrayContaining([
      "beat-invalid","transfer-invalid","camera-intent-invalid",
    ]));
  });
  it("detects redundant simultaneous labels without expensive text similarity",()=>{
    const redundant:SemanticDirectionScene={...scene,
      elements:[...scene.elements,{id:"repeat",role:"label",semanticId:"unrelated",
        bounds:{x:680,y:160,width:130,height:30},text:"result"}],
    };
    const res=validateExplainerComposition(redundant,{samples:[{frame:10}]});
    expect(res.diagnostics.some(d=>d.code==="duplicate-label")).toBe(true);
  });
  it("warns when concurrent text exceeds a configurable cognitive budget",()=>{
    const crowded:SemanticDirectionScene={...scene,elements:[
      ...scene.elements,
      {id:"extra-1",semanticId:"one",role:"label",bounds:{x:300,y:20,width:90,height:20},text:"Input"},
      {id:"extra-2",semanticId:"two",role:"label",bounds:{x:430,y:20,width:90,height:20},text:"Output"},
    ]};
    const warning=validateExplainerComposition(crowded,{
      maxConcurrentLabels:2,samples:[{frame:15}],
    });
    expect(warning.ok).toBe(true);
    expect(warning.diagnostics).toContainEqual(expect.objectContaining({
      code:"scene-cognitive-load",severity:"warning",frame:15,
    }));
    const permissive=validateExplainerComposition(crowded,{
      maxConcurrentLabels:Infinity,samples:[{frame:15}],
    });
    expect(permissive.diagnostics.some(x=>x.code==="scene-cognitive-load")).toBe(false);
  });
  it("flags camera focus reversal and unauthorized camera motion during holds",()=>{
    const focused:SemanticDirectionScene={...scene,camera:[{
      id:"inspect",kind:"focus",targetId:"input",reason:"Inspect evidence",
      screenTarget:{x:450,y:260},range:{startFrame:0,endFrame:110},
    }]};
    const samples=[
      {frame:0,cameraFocus:{input:{x:150,y:260}}},
      {frame:40,cameraFocus:{input:{x:350,y:260}}},
      {frame:80,cameraFocus:{input:{x:210,y:260}}},
    ];
    expect(validateExplainerComposition(focused,{samples}).diagnostics.some(
      d=>d.code==="camera-reverses-focus")).toBe(true);
    expect(validateExplainerComposition(scene,{samples:[
      {frame:0,cameraPose:[0,1,2]},{frame:60,cameraPose:[0,1.1,2]},
    ]}).diagnostics.some(d=>d.code==="camera-hold-drift")).toBe(true);
  });
});

describe("measured semantic label placement",()=>{
  it("anchors a label to its target and avoids unrelated objects",()=>{
    const result=layoutSemanticLabels({viewport:{width:900,height:500},
      subjects:[{id:"request",bounds:a},{id:"result",bounds:b}],
      labels:[
        {id:"result-caption",targetId:"result",width:135,height:28,preferred:["left","below"]},
        {id:"request-caption",targetId:"request",width:145,height:28},
      ],
    });
    expect(result.ok).toBe(true);
    expect(result.placed).toHaveLength(2);
    const label=result.placed.find(x=>x.id==="result-caption")!;
    expect(label.bounds.x).toBeGreaterThanOrEqual(12);
    expect(label.bounds.y).toBeGreaterThanOrEqual(12);
    expect(["left","below"]).toContain(label.side);
  });
  it("reports unplaceable content instead of clipping or hiding it",()=>{
    const result=layoutSemanticLabels({viewport:{width:240,height:100},
      subjects:[{id:"only",bounds:{x:70,y:20,width:100,height:60}}],
      labels:[{id:"long",targetId:"only",width:180,height:45}]});
    expect(result).toMatchObject({ok:false,unplaced:["long"],placed:[]});
  });
  it("rejects malformed placement preferences and nondeterministic priorities",()=>{
    const base={viewport:{width:900,height:500},
      subjects:[{id:"request",bounds:a}]};
    expect(()=>layoutSemanticLabels({...base,
      labels:[{id:"broken-priority",targetId:"request",
        width:100,height:25,priority:NaN}],
    })).toThrow(/Invalid/);
    expect(()=>layoutSemanticLabels({...base,
      labels:[{id:"broken-side",targetId:"request",
        width:100,height:25,preferred:["right","diagonal" as "right"]}],
    })).toThrow(/Invalid/);
  });
  it("rejects duplicate identities rather than silently changing layout",()=>{
    expect(()=>layoutSemanticLabels({viewport:{width:400,height:300},subjects:[
      {id:"one",bounds:a},{id:"one",bounds:b}],labels:[],
    })).toThrow(/duplicate/);
  });
});

it("adapts existing Storyboard scenes into the same semantic preflight contracts", () => {
  const board=createStoryboard({
    id:"from-storyboard",title:"Request becomes result",
    shots:[{
      id:"request-beat",sceneRef:"process",startFrame:0,durationFrames:120,
      claim:"See a request processed",visualObjective:"Deliver the named input to the output",
      focusTarget:"input",onScreenLabels:["Request"],
    }],
  });
  const planned=directionFromStoryboard(board,{
    width:900,height:500,elements:scene.elements,
    transfers:scene.transfers,camera:scene.camera,
  });
  expect(planned.beats).toEqual([{
    id:"request-beat",range:{startFrame:0,endFrame:120},
    claim:"See a request processed",
    visualChange:"Deliver the named input to the output",focusId:"input",
  }]);
  expect(validateExplainerComposition(planned).ok).toBe(true);
});
