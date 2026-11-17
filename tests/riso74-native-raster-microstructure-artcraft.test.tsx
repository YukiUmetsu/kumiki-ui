import {describe,expect,it} from "vitest";
import {renderToStaticMarkup} from "react-dom/server";
import {inspectRiso74NaturalPixelDensity,inspectRiso74RasterPatch,
  riso74PatchToNaturalPixelMatrix}
  from "../registry/video/riso-scan-native-pixel-evidence";
import {createRiso72PaperAffine}
  from "../registry/video/riso-paper-photo-affine";
import {Riso74NativePixelEvidencePanel}
  from "../src/video/riso74-native-pixel-evidence-studio";

const sheet=[297,210] as const;
const affine=(pxPerMm:number,rotation=0,asymmetry=1)=>{
  const a=rotation*Math.PI/180;
  const scan=([x,y]:readonly [number,number])=>[
    5000+pxPerMm*x*Math.cos(a)-pxPerMm*asymmetry*y*Math.sin(a),
    3200+pxPerMm*x*Math.sin(a)+pxPerMm*asymmetry*y*Math.cos(a),
  ] as const;
  const corners=(["top-left","top-right","bottom-right","bottom-left"] as const)
    .map((id,i)=>({id,scanPx:scan(
      ([[0,0],[sheet[0],0],[sheet[0],sheet[1]],[0,sheet[1]]] as const)[i])}));
  return createRiso72PaperAffine({corners},sheet,[16000,16000]);
};
const makeRgba=(width:number,height:number,pixel:(x:number,y:number)=>[
  number,number,number,number])=>{
  const data=new Uint8ClampedArray(width*height*4);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    data.set(pixel(x,y),(y*width+x)*4);
  }
  return {width,height,data};
};
describe("RISO74 source-photo native pixels and honest Risograph microstructure evidence",()=>{
  it("correctly rejects 3x browser zoom as a substitute for 300ppi native scan",()=>{
    const p=affine(1.71,13);
    const e=inspectRiso74NaturalPixelDensity(p);
    expect(e.paperOnly).toBe(true);
    expect(e.minimumEffectivePpi).toBeCloseTo(43.434,2);
    expect(e.microdetail).toBe("insufficient-under-300ppi");
    expect(e.crossFeedPixelsPerMm).toBeCloseTo(1.71,6);
    expect(e.feedPixelsPerMm).toBeCloseTo(1.71,6);
    expect(e.anisotropyRatio).toBeCloseTo(1,6);
  });
  it("only calls 600PPI-and-greater when WORST ORIGINAL paper direction meets 600PPI",()=>{
    expect(inspectRiso74NaturalPixelDensity(affine(24,24)).microdetail)
      .toBe("600ppi-or-greater");
    expect(inspectRiso74NaturalPixelDensity(affine(12,45)).microdetail)
      .toBe("limited-300-to-599ppi");
    const stretched=inspectRiso74NaturalPixelDensity(affine(24,13,.35));
    expect(stretched.minimumEffectivePpi).toBeCloseTo(24*.35*25.4,3);
    expect(stretched.microdetail).toBe("insufficient-under-300ppi");
    expect(stretched.anisotropyRatio).toBeCloseTo(1/.35,6);
    expect(()=>inspectRiso74NaturalPixelDensity({paperOnly:true,
      sheetToPixel:[0,0,0,0,0,0]})).toThrow(/nonsingular/);
    expect(()=>inspectRiso74NaturalPixelDensity({paperOnly:true,
      sheetToPixel:[1,0,0,-1,0,0]})).toThrow(/nonsingular/);
  });
  it("maps the original 64x64 photographic sampling window through paper mm with no ink alignment",()=>{
    const p=affine(12,0);
    const actual=riso74PatchToNaturalPixelMatrix(p,[148.5,105],4,64);
    const pixelToMm=p.pixelToSheet;
    expect(actual[0]).toBeCloseTo(16*pixelToMm[0],8);
    expect(actual[3]).toBeCloseTo(16*pixelToMm[3],8);
    const middlePx=[p.sheetToPixel[0]*148.5+p.sheetToPixel[2]*105+
      p.sheetToPixel[4],
      p.sheetToPixel[1]*148.5+p.sheetToPixel[3]*105+p.sheetToPixel[5]];
    expect(actual[0]*middlePx[0]+actual[2]*middlePx[1]+actual[4])
      .toBeCloseTo(32,8);
    expect(actual[1]*middlePx[0]+actual[3]*middlePx[1]+actual[5])
      .toBeCloseTo(32,8);
    expect(()=>riso74PatchToNaturalPixelMatrix(p,[0,0],4,64))
      .toThrow(/inside/);
    expect(()=>riso74PatchToNaturalPixelMatrix(p,[148,100],0,64))
      .toThrow(/finite physical/);
  });
  it("measures RGB, luma, physical dot contrast and luminance variation without any artistic-looking filter",()=>{
    const checker=makeRgba(16,16,(x)=>x%2===0?
      [0,0,0,255]:[255,255,255,255]);
    const stats=inspectRiso74RasterPatch(checker);
    expect(stats.sampleGridPoints).toBe(256);
    expect(stats.meanRgb).toEqual([127.5,127.5,127.5]);
    expect(stats.meanLuma).toBeCloseTo(127.5,6);
    expect(stats.lumaStandardDeviation).toBeCloseTo(127.5,6);
    expect(stats.horizontalContrast).toBeCloseTo(255,6);
    expect(stats.verticalContrast).toBeCloseTo(0,6);
    expect(stats.source).toBe("operator-owned-photo-no-color-calibration");
    const white=inspectRiso74RasterPatch(makeRgba(16,16,()=>[250,250,250,255]));
    expect(white.lumaStandardDeviation).toBe(0);
    expect(white.horizontalContrast).toBe(0);
  });
  it("rejects invalid buffers and absent alpha as unknown/non-paper image data",()=>{
    expect(()=>inspectRiso74RasterPatch(makeRgba(16,16,()=>[5,5,5,0])))
      .toThrow(/transparent/);
    expect(()=>inspectRiso74RasterPatch({width:16,height:16,
      data:new Uint8ClampedArray(16)})).toThrow(/exact/);
    expect(()=>inspectRiso74RasterPatch({width:0,height:20,
      data:new Uint8ClampedArray(0)})).toThrow(/exact/);
    expect(()=>inspectRiso74RasterPatch(makeRgba(300,16,
      ()=>[255,0,0,255]))).toThrow(/exact/);
  });
  it("renders honest low-source-resolution gate and two original photo crops without rasterizing source art",()=>{
    const proof=affine(1.7,0);
    const html=renderToStaticMarkup(<Riso74NativePixelEvidencePanel
      firstPhoto={{url:"blob:first",width:16000,height:16000}}
      secondPhoto={{url:"blob:second",width:16000,height:16000}}
      firstPaper={proof} secondPaper={proof} sheetMm={sheet}/>);
    expect(html).toContain('data-km-riso74-resolution="insufficient"');
    expect(html).toContain('data-km-riso74-loaded="false"');
    expect(html).toContain("Insufficient native pixels");
    expect(html).toContain('data-km-riso74-ppi="1"');
    expect(html).toContain('data-km-riso74-ppi="2"');
    expect(html).toContain('href="blob:first"');
    expect(html).toContain('href="blob:second"');
    expect(html).toContain('image-rendering:pixelated');
    expect(html).not.toMatch(/feGaussianBlur|<filter|<canvas|<foreignObject/);
  });
});
