import {describe,it,expect} from "vitest";
import {renderToStaticMarkup} from "react-dom/server";
import {WaxRegion,crayonPaperTintedWaxBase}
  from "../registry/video/materials/crayon-react";

/** Real wax value layering must not be flattened to one paper/pigment mix
 * when the authored region supplies a real local light/shadow hierarchy.
 */
const source={
  d:"M4 8Q36 -5 76 14Q87 48 53 69Q10 67 4 8Z",
  bounds:{x:0,y:0,width:84,height:75},
  colors:["#bb9389","#6b5359","#e6ba9d"] as const,
  seed:438,paperSeed:412,tooth:"crayon-volume-unit",
  paperColor:"#f3e5d3",pressure:.79,
  frame:250,first:1,last:245,reduced:false,
  spacing:6.2,nibStyle:"dry" as const,
  strokeOrder:"patches" as const,markLength:"long" as const,
  coverage:"opaque" as const,deposition:"stroke-built" as const,
  underpaintTooth:.38,markStrength:.45,
  underpaintGradient:{
    light:"#f6c9ad" as const,shadow:"#654b55" as const,
    focusX:.32,focusY:.27,radius:1.14,
  },
};
const render=(props:Parameters<typeof WaxRegion>[0])=>
  renderToStaticMarkup(<svg><WaxRegion {...props}/></svg>);

describe("ArtCraft stroke-built crayon volumetric underpainting",()=>{
  it("keeps physical paper-tinted light, mid and shadow beneath explicit wax",()=>{
    const html=render(source);
    expect(html).toContain('data-km-crayon-coverage="opaque"');
    expect(html).toContain('data-km-crayon-deposition="stroke-built"');
    expect(html).toContain('data-km-crayon-volume-burnish="wax"');
    expect(html).toContain('data-km-crayon-pressure-tinted="true"');
    expect(html).toContain('data-km-crayon-underpaint-gradient=""');
    expect(html).toContain('data-km-crayon-underpaint="opaque"');
    expect(html).toContain('data-km-crayon-undercoat-pits=""');
    expect(html).toContain('data-km-crayon-dry-ribbons=""');
    expect(html).toContain('data-km-crayon-paper-base="'+
      crayonPaperTintedWaxBase(source.colors[0],source.paperColor,source.pressure)+'"');
    const stops=[
      crayonPaperTintedWaxBase(source.underpaintGradient.light,
        source.paperColor,source.pressure),
      crayonPaperTintedWaxBase(source.colors[0],
        source.paperColor,source.pressure),
      crayonPaperTintedWaxBase(source.underpaintGradient.shadow,
        source.paperColor,source.pressure),
    ];
    for(const c of stops)expect(html).toContain(c);
    expect(new Set(stops).size).toBe(3);
    expect(html).toBe(render(source));
  });
  it("does not create phantom volume in flat stroke-built or change smooth wax",()=>{
    const flat=render({...source,underpaintGradient:undefined});
    expect(flat).not.toContain('data-km-crayon-volume-burnish="wax"');
    expect(flat).not.toContain('data-km-crayon-underpaint-gradient=""');
    expect(flat).toContain(crayonPaperTintedWaxBase(
      source.colors[0],source.paperColor,source.pressure));
    const smooth=render({...source,deposition:"smooth"});
    expect(smooth).toContain('data-km-crayon-underpaint-gradient=""');
    expect(smooth).not.toContain('data-km-crayon-pressure-tinted="true"');
    expect(smooth).not.toContain('data-km-crayon-volume-burnish="wax"');
    expect(smooth).toContain("#f6c9ad");
  });
  it("retains pressure dependency and opaque featherless contact",()=>{
    const high=render(source),low=render({...source,pressure:.25});
    expect(high).not.toBe(low);
    expect(high).toContain(crayonPaperTintedWaxBase(
      source.underpaintGradient.light,source.paperColor,.79));
    expect(low).toContain(crayonPaperTintedWaxBase(
      source.underpaintGradient.light,source.paperColor,.25));
    expect(low).toContain('data-km-crayon-underpaint="opaque"');
  });
});
