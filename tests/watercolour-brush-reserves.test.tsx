import {describe,it,expect} from "vitest";
import {renderToStaticMarkup} from "react-dom/server";
import {WatercolourSurface} from "../registry/video/watercolour-brush-react";
import {inspectPaintSurface} from "../registry/video/watercolour-brush";
import {paintExampleSpec} from "../src/video/watercolour-brush-demo";
import {experimentalWatercolourEyeBrush}
  from "../src/video/experimental/watercolour-eye-brush-study";

describe("True WM1 paper reserves, separate from WM4 masks",()=>{
  it("preserves real unpainted white through every layer of pressure-brush paint",()=>{
    const spec=paintExampleSpec("landscape","wild-iris");
    const withReserve={...spec,reservePaths:[
      "M345 212 Q354 202 361 211 L355 220 Z",
      "M465 266 L480 266 L475 279 Z",
    ]};
    expect(inspectPaintSurface(withReserve)).toEqual([]);
    const html=renderToStaticMarkup(<WatercolourSurface spec={withReserve}
      frame={600}/>);
    expect(html).toContain('data-km-paper-reserve-count="2"');
    expect(html).toContain("paper-reserves");
    expect(html).toContain("<mask");
    expect(html).toContain('fill="#000"');
    expect(html).toContain('data-km-wm1-pigment-pass=""');
    expect(html).toContain('data-km-deposition=""');
  });
  it("does not change older WM1 examples when no white reserves are specified",()=>{
    const spec=paintExampleSpec("landscape","wild-iris");
    expect(inspectPaintSurface(spec)).toEqual([]);
    const html=renderToStaticMarkup(<WatercolourSurface spec={spec} frame={500}/>);
    expect(html).toContain('data-km-paper-reserve-count="0"');
    expect(html).not.toContain('id="paper-reserves"');
  });
  it("fails closed for malformed, too many, script or unsafe reserve paths",()=>{
    const spec=paintExampleSpec("landscape","wild-iris");
    for(const invalid of ["<script>alert(1)</script>","javascript:alert(1)",
      "M10 20 L20 21\" onclick=\"alert(1)"]) {
      expect(inspectPaintSurface({...spec,reservePaths:[invalid]})
        .map(x=>x.path)).toContain("/reservePaths");
    }
    expect(inspectPaintSurface({...spec,
      reservePaths:Array.from({length:33},()=> "M10 20 L25 20 Z"),
    }).map(x=>x.path)).toContain("/reservePaths");
  });
  it("aligns WC19 WM1 eye highlights with the WM4 wet-pigment reserves",()=>{
    const {brush,wet}=experimentalWatercolourEyeBrush();
    expect(brush.reservePaths).toEqual(wet.reservePaths);
    expect(brush.reservePaths?.length).toBeGreaterThanOrEqual(3);
    expect(inspectPaintSurface(brush)).toEqual([]);
    const markup=renderToStaticMarkup(<WatercolourSurface spec={brush} frame={420}
      transparentPaper/>);
    expect(markup).toContain('data-km-paper-reserve-count="3"');
  });
});
