import {describe,it,expect} from "vitest";
import {renderToStaticMarkup} from "react-dom/server";
import {WaxRegion} from "../registry/video/materials/crayon-react";
import {inspectCrayonScene} from "../registry/video/materials/crayon-scene";
import type {CrayonUnderpaintField} from "../registry/video/materials/crayon-scene";
import {crayonAdultFaceStudy} from "../src/video/crayon-artcraft-adult-face-fixtures";
const field:CrayonUnderpaintField={x:.25,y:.65,radiusX:.3,radiusY:.21,color:"#74514a",strength:.75};
const draw=(fields?:readonly CrayonUnderpaintField[],coverage:"open"|"opaque"="opaque")=>
  renderToStaticMarkup(<svg><WaxRegion
    d="M0 0Q100 -30 160 70Q120 170 0 100Z"
    bounds={{x:-10,y:-40,width:190,height:230}}
    colors={["#cf947a","#9a6871","#f0c6aa"]}
    underpaintGradient={{light:"#dfb8a0",shadow:"#725658",focusX:.3,focusY:.4,radius:1.1}}
    underpaintFields={fields} underpaintTooth={coverage==="opaque"?.3:0}
    coverage={coverage}
    seed={912} pressure={.8} spacing={8} frame={159} first={1} last={159}
    tooth="tooth" reduced={false} markStrength={.4}/></svg>);
describe("CRAYON1 source-authored physical wax underpaint",()=>{
  it("paints transparent-edged field into original volume, below wax tooth",()=>{
    const html=draw([field,{...field,x:.7,color:"#d9a788",strength:.33}]);
    expect(html).toContain('data-km-crayon-underpaint-fields="2"');
    expect((html.match(/data-km-crayon-underpaint-field="[0-9]"/g)??[])).toHaveLength(2);
    expect(html).toContain('stop-color="#74514a"');
    expect(html).toContain('stop-opacity="0"');
    expect(html).toContain('data-km-crayon-underpaint-gradient=""');
    expect(html.indexOf('data-km-crayon-underpaint-fields')).toBeLessThan(
      html.indexOf('data-km-crayon-underpaint-grain'));
    expect(html).toContain('data-km-crayon-paper-contact-wax');
    expect(draw([field])).toBe(draw([field]));
  });
  it("retains historical unchanged gradient and full wax when not opted in",()=>{
    expect(draw()).not.toContain('data-km-crayon-underpaint-fields');
    expect(draw()).toContain('data-km-crayon-underpaint="opaque"');
  });
  it("fails closed on unsupported field material, malformed source or transparent mask",()=>{
    for(const bad of [
      {...field,x:-.1},{...field,y:1.1},{...field,radiusX:0},
      {...field,radiusY:1.1},{...field,strength:NaN},
      {...field,strength:1.1},{...field,color:"red"},
    ]){
      const original=crayonAdultFaceStudy("portrait");
      const changed={...original,elements:original.elements.map(x=>
        x.id==="adult-face"?{...x,underpaintFields:[bad]}:x)};
      expect(inspectCrayonScene(changed).join(" ")).toMatch(/underpaintFields/);
      expect(()=>draw([bad as CrayonUnderpaintField])).toThrow(/underpaintFields/);
    }
    expect(()=>draw([])).toThrow(/underpaintFields/);
    expect(()=>draw([field],"open")).toThrow();
  });
});
