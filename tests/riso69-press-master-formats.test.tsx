import {renderToStaticMarkup} from "react-dom/server";
import {describe,expect,it} from "vitest";
import {risoSvgPathToPdfOperators,serializeRisoSeparationPdf}
  from "../registry/video/riso-press-pdf";
import {measureRisoTiffRaster,encodeRisoGrayscaleTiff}
  from "../registry/video/riso-press-tiff";
import {inspectRisoSeparation} from "../registry/video/riso-separation-master";
import {riso68OriginalMasters,riso68PaperProfile}
  from "../src/video/riso-master-separation-studio";
import {RisoPressDeliveryStudio,riso69Filename}
  from "../src/video/riso-press-delivery-studio";
import {risoExampleSpec} from "../src/video/riso-print-demo";

const setup=(aspect:"landscape"|"portrait"="landscape",frame=160,seed=66)=>{
  const spec=risoExampleSpec(aspect,seed),
    masters=riso68OriginalMasters(aspect,frame,seed),
    layout=riso68PaperProfile(aspect);
  return {spec,masters,layout};
};
const decode=(b:Uint8Array)=>new TextDecoder("utf-8").decode(b);
function tiffTags(data:Uint8Array){
  const v=new DataView(data.buffer,data.byteOffset,data.byteLength);
  expect(data[0]).toBe(73);expect(data[1]).toBe(73);
  expect(v.getUint16(2,true)).toBe(42);
  const start=v.getUint32(4,true),count=v.getUint16(start,true);
  const map=new Map<number,{type:number,count:number,value:number}>();
  for(let i=0;i<count;i++){
    const at=start+2+i*12,type=v.getUint16(at+2,true);
    map.set(v.getUint16(at,true),{type,count:v.getUint32(at+4,true),
      value:type===3?v.getUint16(at+8,true):v.getUint32(at+8,true)});
  }
  return {map,v};
}
describe("RISO69 exact original grayscale vector PDF and one-channel TIFF",()=>{
  it("converts exact SVG quadratic to algebraically equivalent PDF cubic (no sampling)",()=>{
    const q=risoSvgPathToPdfOperators("M0 0 Q5 10 10 0 Z");
    expect(q).toContain("3.33333 6.66667 6.66667 6.66667 10 0 c");
    expect(q).toContain("h");
    expect(risoSvgPathToPdfOperators("m0 0 q5 10 10 0 z")).toBe(q);
    expect(risoSvgPathToPdfOperators("M0 0 H20 V10 L0 10 Z"))
      .toContain("20 10 l");
    expect(risoSvgPathToPdfOperators("M0 0 C0 10 10 10 10 0 Z"))
      .toContain("0 10 10 10 10 0 c");
    for(const bad of ["M0 0 A5 5 0 0 0 10 0 Z","M0 0 L10 10",
      "<script>alert(1)</script>","M0 0 Z 5","M0 NaN L10 0 Z"]){
      expect(()=>risoSvgPathToPdfOperators(bad)).toThrow(RangeError);
    }
  });
  it("emits real independent PDF bytes, correct full sheet points and XREF offsets",()=>{
    for(const aspect of ["landscape","portrait"] as const){
      const {spec,masters,layout}=setup(aspect);
      const report=inspectRisoSeparation(spec,masters,layout);
      expect(report.ready).toBe(true);
      const a=serializeRisoSeparationPdf(spec,masters,layout,"blue");
      const b=serializeRisoSeparationPdf(spec,masters,layout,"red");
      const blue=decode(a),red=decode(b);
      expect(blue.startsWith("%PDF-1.4")).toBe(true);
      expect(red.startsWith("%PDF-1.4")).toBe(true);
      expect(blue).not.toBe(red);
      expect(blue).toContain("/Type /Page ");
      expect(blue).toContain("/Count 1");
      const points=layout.sheetMm.map(mm=>String(Number((mm*72/25.4).toFixed(5))));
      expect(blue).toContain("/MediaBox [0 0 "+points.join(" ")+"]");
      const xref=Number(blue.match(/startxref\n(\d+)\n%%EOF/)?.[1]);
      expect(blue.slice(xref,xref+4)).toBe("xref");
      expect(red.slice(Number(red.match(/startxref\n(\d+)\n%%EOF/)?.[1]),
        Number(red.match(/startxref\n(\d+)\n%%EOF/)?.[1])+4)).toBe("xref");
      expect(blue.match(/f\*/g)).toHaveLength(4);
      expect(red.match(/f\*/g)).toHaveLength(4);
      for(const pdf of [blue,red]){
        expect(pdf).not.toMatch(/\/DeviceRGB|\/Image\b|\/Font\b|\/SMask\b|\/ExtGState\b/);
        expect(pdf).toContain("0 g");
        expect(pdf).toContain("0.22 g");
        // Original source is Q and is not approximated by L lines in PDF.
        expect((pdf.match(/ c\n/g)||[]).length).toBeGreaterThan(500);
      }
    }
  });
  it("never bakes source color / simulated register drift into PDF masters",()=>{
    const {spec,masters,layout}=setup();
    const one=serializeRisoSeparationPdf(spec,masters,layout,"blue");
    const altered={...spec,plates:spec.plates.map(p=>({...p,color:"#F100CC",
      opacity:.22,registration:[9,-8] as const}))};
    const two=serializeRisoSeparationPdf(altered,masters,layout,"blue");
    expect(two).toEqual(one);
    expect(decode(two)).not.toContain("F100CC");
  });
  it("preserves identical physical crop and register marks between source PDFs",()=>{
    const {spec,masters,layout}=setup();
    const marked={...layout,marks:"crop-and-register" as const};
    const blue=decode(serializeRisoSeparationPdf(spec,masters,marked,"blue"));
    const red=decode(serializeRisoSeparationPdf(spec,masters,marked,"red"));
    const lines=(s:string)=>{const start=s.lastIndexOf("\n0 G\n");return s.slice(start,s.indexOf("\nQ\n",start)+3);};
    expect(lines(blue)).toBe(lines(red));
    expect(lines(blue).match(/ l S/g)).toHaveLength(16);
    expect(lines(blue)).toContain("0.2 w");
  });
  it("blocks invalid geometry, missing plates and unsupported path features",()=>{
    const {spec,masters,layout}=setup();
    expect(()=>serializeRisoSeparationPdf(spec,masters,{
      ...layout,safeMm:40,
    },"blue")).toThrow(/blocked/);
    expect(()=>serializeRisoSeparationPdf(spec,masters,layout,"unknown"))
      .toThrow(/ID/);
    const ellipse=masters.map((p,i)=>i?p:{...p,shapes:[
      {...p.shapes[0],outerPath:"M100 100 A10 10 0 1 0 120 100 Z"},
      ...p.shapes.slice(1),
    ]});
    expect(()=>serializeRisoSeparationPdf(spec,ellipse,layout,"blue"))
      .toThrow(/only finite SVG|unsupported/);
  });
  it("measures true A4 300/600dpi pixel dimensions with finite memory budget",()=>{
    for(const aspect of ["landscape","portrait"] as const){
      const layout=riso68PaperProfile(aspect);
      for(const dpi of [300,600] as const){
        const d=measureRisoTiffRaster(layout,dpi);
        expect(d.width).toBe(Math.round(layout.sheetMm[0]*dpi/25.4));
        expect(d.height).toBe(Math.round(layout.sheetMm[1]*dpi/25.4));
        expect(d.pixelCount).toBe(d.width*d.height);
        expect(d.pixelCount).toBeLessThan(40000001);
      }
    }
    expect(()=>measureRisoTiffRaster(riso68PaperProfile("landscape"),
      1200 as 300)).toThrow(RangeError);
    expect(()=>measureRisoTiffRaster({...riso68PaperProfile("landscape"),
      sheetMm:[600,600]},600)).toThrow(RangeError);
  });
  it("encodes byte-exact real TIFF IFD, single-channel K and rational resolution",()=>{
    const pixels=Uint8Array.of(0,255,128,32,16,240);
    const d={width:3,height:2,pixelCount:6,dpi:300 as const,
      sheetMm:[.254,.1693] as const};
    const t=encodeRisoGrayscaleTiff(pixels,d);
    const {map,v}=tiffTags(t);
    expect(map.size).toBe(14);
    for(const [id,value] of [[256,3],[257,2],[258,8],[259,1],
      [262,1],[277,1],[278,2],[279,6],[296,2]] as const)
      expect(map.get(id)?.value).toBe(value);
    expect(map.get(273)?.value).toBe(198);
    expect(map.get(282)?.type).toBe(5);
    expect(v.getUint32(map.get(282)!.value,true)).toBe(300);
    expect(v.getUint32(map.get(282)!.value+4,true)).toBe(1);
    expect(v.getUint32(map.get(283)!.value,true)).toBe(300);
    expect([...t.slice(map.get(273)!.value)]).toEqual([...pixels]);
    expect(t.length).toBe(198+pixels.length);
  });
  it("uses the selected 600 PPI in both TIFF resolution axes",()=>{
    const d={width:2,height:2,pixelCount:4,dpi:600 as const,
      sheetMm:[.08466,.08466] as const};
    const {map,v}=tiffTags(encodeRisoGrayscaleTiff(
      Uint8Array.of(255,127,0,255),d));
    expect(v.getUint32(map.get(282)!.value,true)).toBe(600);
    expect(v.getUint32(map.get(283)!.value,true)).toBe(600);
    expect(map.get(262)?.value).toBe(1);
  });
  it("rejects RGB / incorrect sample counts and unsafe format selection",()=>{
    const d={width:3,height:2,pixelCount:6,dpi:300 as const,
      sheetMm:[.254,.1693] as const};
    expect(()=>encodeRisoGrayscaleTiff(Uint8Array.of(0,0,0),d))
      .toThrow(RangeError);
    expect(()=>encodeRisoGrayscaleTiff(new Uint8Array(18),d))
      .toThrow(RangeError);
    expect(riso69Filename("riso-960x540-blue-2362a0-K.svg","pdf",300))
      .toBe("riso-960x540-blue-2362a0-K.pdf");
    expect(riso69Filename("riso-960x540-red-dd593d-K.svg","tiff",600))
      .toMatch(/-K-600ppi\.tif$/);
    expect(()=>riso69Filename("../../harm.svg","pdf",300)).toThrow(RangeError);
  });
  it("seeks original source frame backwards with exactly same PDF geometry",()=>{
    const a=setup("portrait",48,66);
    const first=serializeRisoSeparationPdf(a.spec,a.masters,a.layout,"blue");
    setup("portrait",190,66);
    const b=setup("portrait",48,66);
    expect(serializeRisoSeparationPdf(b.spec,b.masters,b.layout,"blue")).toEqual(first);
    const c=setup("portrait",190,66);
    expect(serializeRisoSeparationPdf(c.spec,c.masters,c.layout,"blue")).not.toEqual(first);
  },20000); // RISO69 source reconstruction on busy native-render CI can exceed Vitest's 5s default.
  it("Storybook renders original independent masters, format and safe margins",()=>{
    const html=renderToStaticMarkup(<RisoPressDeliveryStudio/>);
    expect(html).toContain('data-km-riso69-studio=""');
    expect(html).toContain('data-km-riso69-format="pdf"');
    expect(html).toContain('data-km-riso69-ready="true"');
    expect(html).toContain('data-km-riso69-panel="blue"');
    expect(html).toContain('data-km-riso69-panel="red"');
    expect(html).toContain('data-km-riso69-preview="blue"');
    expect(html).toContain('data-km-riso69-preview="red"');
    expect(html.match(/fill-rule="evenodd"/g)).toHaveLength(8);
    expect(html).not.toMatch(/<image|<foreignObject|feMorphology|feGaussianBlur/);
  });
});
