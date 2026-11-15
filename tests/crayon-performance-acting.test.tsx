import {describe,expect,it} from "vitest";
import {renderToStaticMarkup} from "react-dom/server";
import {crayonPerformanceScene} from "../src/video/crayon-performance-fixtures";
import {CrayonScene} from "../registry/video/materials/crayon-scene-react";
import {
  crayonContactOffset,crayonDrawingAt,crayonElementTransform,inspectCrayonScene,
} from "../registry/video/materials/crayon-scene";

describe("original crayon performance: grounded secondary acting",()=>{
 for(const aspect of ["landscape","portrait"] as const){
  const scene=crayonPerformanceScene(aspect);
  const get=(id:string)=>{const node=scene.elements.find(x=>x.id===id);
    if(!node)throw Error("missing performance node "+id);return node;};
  it("keeps unique, opaque and serializable authored actor geometry in "+aspect,()=>{
    expect(inspectCrayonScene(scene)).toEqual([]);
    for(const id of ["body","head","tail","left-ear","right-ear",
      "scarf-tail","foot-front","foot-back"]){
      const node=get(id);
      expect(node.kind).toBe("wax");
      if(node.kind==="wax")expect(node.coverage).toBe("opaque");
    }
  });
  it("keeps inner ears and textile stitch attached to articulated parents in "+aspect,()=>{
    expect(get("left-ear-inner").parentId).toBe("left-ear");
    expect(get("right-ear-inner").parentId).toBe("right-ear");
    expect(get("scarf-tail-stitch").parentId).toBe("scarf-tail");
    for(const id of ["left-ear","right-ear","scarf-tail"]){
      const node=get(id);
      expect(node.motionLagFrames).toBeGreaterThanOrEqual(3);
      expect(node.motion?.length).toBeGreaterThan(4);
      expect(crayonElementTransform(scene,node,104)).not.toEqual(
        crayonElementTransform(scene,node,184));
    }
    expect(crayonElementTransform(scene,get("left-ear-inner"),118))
      .toContain(crayonElementTransform(scene,get("left-ear"),118).slice(0,22));
  });
  it("uses different drawings for emotional brow poses and pinned toe plants in "+aspect,()=>{
    const left=get("brow-left"),right=get("brow-right");
    if(left.kind!=="contour"||right.kind!=="contour")throw Error("missing acting");
    expect(crayonDrawingAt(left,85).poseId).toBe("wonder");
    expect(crayonDrawingAt(right,176).poseId).toBe("smile");
    expect(crayonDrawingAt(left,220).poseId).toBe("concern");
    expect(crayonDrawingAt(left,0).d).not.toBe(crayonDrawingAt(left,90).d);
    for(const id of ["foot-front","foot-back"]){
      const foot=get(id);
      expect(foot.contacts?.[0]).toMatchObject({start:0,end:269});
      const rest=crayonContactOffset(scene,foot,0);
      const compress=crayonContactOffset(scene,foot,68);
      expect(rest).not.toEqual(compress);
    }
    const html=renderToStaticMarkup(<CrayonScene spec={scene} frame={176}/>);
    expect(html).toContain('data-km-crayon-element="brow-left"');
    expect(html).toContain('data-km-crayon-element="scarf-tail-stitch"');
    expect(html).toContain('data-km-crayon-contact="');
    expect(html).toContain('data-km-crayon-underpaint="opaque"');
    expect(renderToStaticMarkup(<CrayonScene spec={scene} frame={176}/>)).toBe(html);
  });
 }
});
