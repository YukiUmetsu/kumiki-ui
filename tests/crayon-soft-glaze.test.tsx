import {describe,expect,it} from "vitest";
import {renderToStaticMarkup} from "react-dom/server";
import {CrayonScene} from "../registry/video/materials/crayon-scene-react";
import {WaxRegion} from "../registry/video/materials/crayon-react";
import {inspectCrayonScene} from "../registry/video/materials/crayon-scene";
import {crayonAdultFaceStudy} from "../src/video/crayon-artcraft-adult-face-fixtures";

const face=crayonAdultFaceStudy("landscape");
function region(coverage:"open"|"opaque",blendRadius:number){
  return renderToStaticMarkup(<svg><WaxRegion
    d="M0 0Q90 -30 120 35Q90 110 0 60Z"
    bounds={{x:-5,y:-35,width:135,height:150}}
    colors={["#bda192","#886c76","#edc7a7"]}
    coverage={coverage} blendRadius={blendRadius}
    seed={89} pressure={.5} tooth="glaze-tooth" frame={119}
    first={1} last={118} reduced={false}/></svg>);
}
describe("medium-native artistically blended crayon pigment",()=>{
  it("preserves the old stroke renderer byte-for-byte with zero blending",()=>{
    const before=region("open",0);
    expect(before).toContain('data-km-crayon-coverage="open"');
    expect(before).not.toContain("data-km-crayon-soft-glaze");
    expect(before).not.toContain("<feGaussianBlur");
    expect(region("opaque",0)).toContain('data-km-crayon-underpaint="opaque"');
  });
  it("feathers only soft tonal wax, not the solid human silhouette",()=>{
    const html=region("open",9);
    expect(html).toContain('data-km-crayon-soft-glaze="9"');
    expect(html).toContain('stdDeviation="9"');
    expect(html).toContain('filterUnits="userSpaceOnUse"');
    expect(html).not.toContain('data-km-crayon-underpaint="opaque"');
    expect(html).toContain('data-km-crayon-wax=""');
    expect(html).toContain('data-km-crayon-mark-strength="1"');
    expect(()=>region("open",-1)).toThrow(/blendRadius/);
    expect(html).toEqual(region("open",9));
    expect(()=>region("opaque",8)).toThrow(/blendRadius/);
    expect(()=>region("open",19)).toThrow(/blendRadius/);
    expect(()=>region("open",NaN)).toThrow(/blendRadius/);
    const minimal=renderToStaticMarkup(<svg><WaxRegion
      d="M0 0Q30 0 30 30Q0 30 0 0Z"
      bounds={{x:0,y:0,width:30,height:30}}
      colors={["#bda192","#886c76","#edc7a7"]}
      seed={89} pressure={.5} tooth="glaze-tooth"
      frame={119} first={1} last={118} reduced={false}
      coverage="opaque" markStrength={0}/></svg>);
    expect(minimal).toContain('data-km-crayon-underpaint="opaque"');
    expect(minimal).toContain('data-km-crayon-mark-strength="0"');
  });
  it("constrains soft glazes to the same editable source face at both aspect ratios",()=>{
    for(const aspect of ["landscape","portrait"] as const){
      const scene=crayonAdultFaceStudy(aspect);
      expect(inspectCrayonScene(scene)).toEqual([]);
      const blur=scene.elements.filter(x=>x.kind==="wax"&&x.blendRadius);
      expect(blur.length).toBeGreaterThanOrEqual(9);
      const byId=new Map(scene.elements.map(x=>[x.id,x]));
      // Later anatomy passes (#276 neck planes, eye apertures, lips…) clip
      // each glaze to the exact part it shades, so the parent is no longer
      // always the face. What must hold: every soft glaze is open wax,
      // clipped to a solid opaque part of this one character, and that
      // part's chain reaches the coat silhouette (never scenery or nothing).
      for(const node of blur){
        if(node.kind!=="wax")continue;
        expect(node.coverage).toBe("open");
        expect(node.clipToParent).toBe(true);
        const parent=byId.get(node.parentId??"");
        expect(parent,node.id).toBeDefined();
        if(parent?.kind==="wax")expect(parent.coverage,node.id).toBe("opaque");
        const chain:string[]=[];
        for(let at=parent;at;at=byId.get(at.parentId??""))chain.push(at.id);
        expect(chain,node.id).toContain("coat-silhouette");
      }
      expect(blur.filter(x=>x.parentId==="adult-face").length).toBeGreaterThanOrEqual(9);
      expect(blur.find(x=>x.id==="neck-lateral-turn")?.parentId).toBe("neck-under-jaw");
      const full=renderToStaticMarkup(<CrayonScene spec={scene} frame={299}/>);
      expect(full).toContain('data-km-crayon-soft-glaze="');
      expect(full).toContain('data-km-crayon-anatomical-mask="adult-face"');
      expect(full).toContain('data-km-crayon-clipped-to="adult-face"');
      expect(full).toContain('data-km-crayon-underpaint="opaque"');
    }
  });
  it("rejects malformed source data before it reaches the renderer",()=>{
    const first=face.elements.find(x=>x.id==="temple-cool");
    if(first?.kind!=="wax")throw new Error("Missing tonal region");
    const rewrite=(changes:Partial<typeof first>)=>({
      ...face,elements:face.elements.map(x=>x.id===first.id?{...first,...changes}:x),
    });
    expect(inspectCrayonScene(rewrite({blendRadius:18.01})).join(";")).toMatch(/blendRadius/);
    expect(inspectCrayonScene(rewrite({markStrength:-.01})).join(";")).toMatch(/markStrength/);
    expect(inspectCrayonScene(rewrite({markStrength:1.01})).join(";")).toMatch(/markStrength/);
    expect(inspectCrayonScene(rewrite({coverage:"opaque"})).join(";")).toMatch(/blendRadius/);
    expect(inspectCrayonScene(rewrite({clipToParent:true,parentId:undefined})).join(";")).toMatch(/clipToParent/);
  });
});
