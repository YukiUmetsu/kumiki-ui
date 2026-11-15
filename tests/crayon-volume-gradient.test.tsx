import {describe,expect,it} from "vitest";
import {renderToStaticMarkup} from "react-dom/server";
import {WaxRegion} from "../registry/video/materials/crayon-react";
import {CrayonScene} from "../registry/video/materials/crayon-scene-react";
import {inspectCrayonScene} from "../registry/video/materials/crayon-scene";
import type {CrayonVolumeGradient} from "../registry/video/materials/crayon-scene";
import {crayonAdultFaceStudy} from "../src/video/crayon-artcraft-adult-face-fixtures";
import {crayonDemoScene} from "../src/video/crayon-scene-fixtures";

const lighting:CrayonVolumeGradient={light:"#f4cfb3",shadow:"#865e68",focusX:.31,focusY:.21,radius:1.1};
const swatch=(gradient?:typeof lighting,coverage:"opaque"|"open"="opaque")=>
  renderToStaticMarkup(<svg><WaxRegion
    d="M0 0Q100 -30 160 70Q120 170 0 100Z"
    bounds={{x:-10,y:-40,width:190,height:230}}
    colors={["#cf947a","#9a6871","#f0c6aa"]}
    underpaintGradient={gradient} coverage={coverage}
    seed={912} pressure={.8} spacing={8}
    frame={159} first={1} last={159} tooth="test-tooth" reduced={false}
    markStrength={.4}/></svg>);

describe("Crayon1 medium-native three-pigment volume",()=>{
  it("adds graduated opaque pigment without ever blurring silhouette",()=>{
    const html=swatch(lighting);
    expect(html).toContain('data-km-crayon-underpaint-gradient=""');
    expect(html).toContain('gradientUnits="objectBoundingBox"');
    expect(html).toContain('stop-color="#f4cfb3"');
    expect(html).toContain('stop-color="#865e68"');
    expect(html).toContain('data-km-crayon-underpaint="opaque"');
    expect(html).toContain('data-km-crayon-mark-strength="0.4"');
    expect(html).not.toContain('data-km-crayon-soft-glaze');
    expect(html).toEqual(swatch(lighting));
  });
  it("preserves the legacy solid underpaint for every unspecified field",()=>{
    expect(swatch()).not.toContain('data-km-crayon-underpaint-gradient=""');
    expect(swatch()).toContain('data-km-crayon-underpaint="opaque"');
    const old=crayonDemoScene("water-cycle","landscape");
    expect(inspectCrayonScene(old)).toEqual([]);
    expect(renderToStaticMarkup(<CrayonScene spec={old} frame={239}/>))
      .not.toContain('data-km-crayon-underpaint-gradient=""');
  });
  it("source and runtime reject invalid or translucent underpaint gradients",()=>{
    for(const invalid of [
      {...lighting,radius:1.51},
      {...lighting,focusX:-.01},
      {...lighting,focusY:NaN},
      {...lighting,light:"red"},
    ]){
      expect(()=>swatch(invalid as typeof lighting)).toThrow(/underpaintGradient/);
    }
    expect(()=>swatch(lighting,"open")).toThrow(/underpaintGradient/);
    const scene=crayonAdultFaceStudy("portrait");
    const edit=(changes:Record<string,unknown>)=>({...scene,
      elements:scene.elements.map(x=>x.id==="adult-face"?{...x,...changes}:x)});
    expect(inspectCrayonScene(scene)).toEqual([]);
    expect(inspectCrayonScene(edit({underpaintGradient:{...lighting,radius:2}})).join(" "))
      .toMatch(/underpaintGradient/);
    expect(inspectCrayonScene(edit({underpaintGradient:{...lighting,shadow:"foo"}})).join(" "))
      .toMatch(/underpaintGradient/);
    expect(inspectCrayonScene(edit({coverage:"open"})).join(" "))
      .toMatch(/underpaintGradient/);
  });
  it("renders lit face, hair and garment while keeping eye sclera in shade",()=>{
    for(const aspect of ["landscape","portrait"] as const){
      const scene=crayonAdultFaceStudy(aspect);
      expect(inspectCrayonScene(scene)).toEqual([]);
      const nodes=new Map(scene.elements.map(x=>[x.id,x]));
      for(const id of ["adult-face","hair-back","coat-silhouette",
        "left-eye-aperture","right-eye-aperture"]){
        const shape=nodes.get(id);
        if(shape?.kind!=="wax")throw new Error("missing "+id);
        expect(shape.coverage).toBe("opaque");
        expect(shape.underpaintGradient?.light).toMatch(/^#[0-9a-f]{6}$/i);
        expect(shape.underpaintGradient?.shadow).toMatch(/^#[0-9a-f]{6}$/i);
      }
      const html=renderToStaticMarkup(<CrayonScene spec={scene} frame={299}/>);
      expect(html.split('data-km-crayon-underpaint-gradient=""').length-1)
        .toBeGreaterThanOrEqual(5);
      expect(html).toContain('data-km-crayon-scene="crayon-artcraft-adult-face-'+aspect+'"');
    }
  });
});
