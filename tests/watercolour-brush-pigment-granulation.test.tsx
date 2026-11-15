import {describe,expect,it} from "vitest";
import {renderToStaticMarkup} from "react-dom/server";
import {WatercolourSurface} from "../registry/video/watercolour-brush-react";
import {inspectPaintSurface} from "../registry/video/watercolour-brush";
import {paintExampleSpec} from "../src/video/watercolour-brush-demo";

/** Material test. A naturally painted portrait still requires artistic
 * reference review; these cases only prove the real WM1 pigment path.
 */
describe("WM1 opt-in paper-granulated pigment",()=>{
  const original=paintExampleSpec("landscape","wild-iris");
  it("keeps all old artwork unchanged by default",()=>{
    expect(inspectPaintSurface(original)).toEqual([]);
    const html=renderToStaticMarkup(<WatercolourSurface spec={original}
      frame={400}/>);
    expect(html).toContain('data-km-pigment-granulation="0"');
    expect(html).not.toContain("sediment-grain");
    expect(html).not.toContain("data-km-granulated-deposition");
  });
  it("adds granular sediment only inside physical WM1 pressure ribbons",()=>{
    const spec={...original,pigmentGranulation:.8};
    expect(inspectPaintSurface(spec)).toEqual([]);
    const html=renderToStaticMarkup(<WatercolourSurface spec={spec}
      frame={400}/>);
    expect(html).toContain('data-km-pigment-granulation="0.8"');
    expect(html).toContain('data-km-granulated-deposition=""');
    expect(html).toContain("sediment-grain");
    expect(html).toContain("paper-grain");
    expect(html).toContain("<feColorMatrix");
    expect(html).toContain('<feComposite');
    expect(html).toContain('data-km-deposition=""');
    expect(html).toContain('data-km-brush-stroke="');
    expect(html).toContain('data-km-wm1-pigment-pass=""');
    expect(html).toContain("maskUnits");
    const early=renderToStaticMarkup(<WatercolourSurface spec={spec}
      frame={0}/>);
    expect(early).not.toContain('data-km-deposition=""');
  });
  it("rejects negative, infinite, NaN and oversized material strength",()=>{
    for(const pigmentGranulation of [-1,1.001,Infinity,NaN]){
      const bad={...original,pigmentGranulation};
      expect(inspectPaintSurface(bad).map(e=>e.path)).toContain(
        "/pigmentGranulation");
    }
    expect(inspectPaintSurface({...original,pigmentGranulation:0})).toEqual([]);
  });
  it("leaves pressure, pigment timing and paper reserve source authored",()=>{
    const withGranule={...original,pigmentGranulation:.95,
      reservePaths:["M320 200 L335 210 L318 218 Z"]};
    const html=renderToStaticMarkup(<WatercolourSurface spec={withGranule}
      frame={380} transparentPaper/>);
    expect(html).toContain("paper-reserves");
    expect(html).toContain("sediment-grain");
    expect(html).not.toContain('data-km-paper-tooth=""');
    expect(html).toContain('data-km-paper-reserve-count="1"');
  });
});
