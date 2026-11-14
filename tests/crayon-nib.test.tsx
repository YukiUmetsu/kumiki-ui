import {describe,expect,it} from "vitest";
import {renderToStaticMarkup} from "react-dom/server";
import {crayonMarks,crayonNibPath} from "../registry/video/materials/crayon";
import {WaxRegion,Paper} from "../registry/video/materials/crayon-react";
import {inspectCrayonScene} from "../registry/video/materials/crayon-scene";
import {crayonDemoScene} from "../src/video/crayon-scene-fixtures";

const bounds={x:-22,y:-33,width:140,height:115};
const mark=crayonMarks(bounds,{seed:91,pressure:.81,spacing:9})[3];
function sample(style:"rounded"|"tapered",frame=88){
  return renderToStaticMarkup(<svg>
    <Paper width={220} height={220} seed={19} tooth="nibtest" strength={.7}/>
    <WaxRegion d="M0 0H100V100H0Z" bounds={{x:0,y:0,width:100,height:100}}
      colors={["#df8559","#904f59","#edaf7c"]}
      seed={99} pressure={.86} tooth="nibtest"
      frame={frame} first={0} last={120} reduced={false}
      nibStyle={style} coverage="opaque"/>
  </svg>);
}
describe("CRAYON1 pressure-sensitive nib contact",()=>{
  it("draws actual pressure-shaped filled ribbons, not uniform stroked paths",()=>{
    const complete=crayonNibPath(mark);
    expect(complete).toContain("Z");
    expect(complete.split("Z").length-1).toBe(mark.nibArcs.length);
    expect(complete).toMatch(/^M[-0-9.]+ [-0-9.]+L/);
    expect(complete).not.toContain("NaN");
    expect(complete).not.toContain("Infinity");
    expect(crayonNibPath(mark)).toBe(complete);
    expect(crayonNibPath(mark,0)).toBe("");
    expect(crayonNibPath(mark,.32).length).toBeLessThan(complete.length);
    expect(crayonNibPath(mark,1)).toBe(complete);
  });
  it("preserves absolute-frame material stability, reduced-motion, and legacy rendering",()=>{
    const curved=sample("tapered");
    const classic=sample("rounded");
    expect(curved).toContain('data-km-crayon-nib="tapered"');
    expect(classic).toContain('data-km-crayon-nib="rounded"');
    expect(curved).toContain('data-km-crayon-underpaint="opaque"');
    expect(curved).toBe(sample("tapered"));
    sample("tapered",17);
    sample("tapered",119);
    expect(sample("tapered")).toBe(curved);
    expect(classic).not.toEqual(curved);
    expect(()=>crayonNibPath(mark,-.01)).toThrow();
    expect(()=>crayonNibPath(mark,1.01)).toThrow();
    expect(()=>crayonNibPath(mark,Number.NaN)).toThrow();
  });
  it("validates source-authored nib styles without changing existing scenes",()=>{
    const scene=crayonDemoScene("city","landscape");
    const wax=scene.elements.find(n=>n.kind==="wax");
    if(!wax || wax.kind!=="wax")throw new Error("fixture lacks wax");
    expect(inspectCrayonScene(scene)).toEqual([]);
    const revised={...scene,elements:scene.elements.map(n=>n.id===wax.id
      ? {...wax,nibStyle:"rounded" as const}:n)};
    expect(inspectCrayonScene(revised)).toEqual([]);
    const invalid={...scene,elements:scene.elements.map(n=>n.id===wax.id
      ? {...wax,nibStyle:"non-wax"}:n)};
    expect(inspectCrayonScene(invalid).join(" ")).toContain(".nibStyle");
    expect(()=>sample("broken" as "tapered")).toThrow(/nib style/);
  });
});
