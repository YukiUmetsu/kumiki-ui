import {describe,expect,it} from "vitest";
import {renderToStaticMarkup} from "react-dom/server";
import {inspectRiso73CopyRepeatability}
  from "../registry/video/riso-two-print-run-audit";
import {Riso73TwoCopyPrintStudy}
  from "../src/video/riso73-two-print-run-studio";
import type {RisoProofPoint,RisoProofMark,RisoScanMeasurements}
  from "../registry/video/riso-scan-proof";

const sheet=[297,210] as const;
const pixelsA=[5800,4600] as const;
const pixelsB=[6300,5400] as const;
const expected:Record<RisoProofMark,RisoProofPoint>={
  top:[148,20],bottom:[148,190],left:[17,105],right:[280,105],
};
const ids=["blue","red"] as const;
const transform=(sheetNo:1|2,p:RisoProofPoint):RisoProofPoint=>{
  const angle=(sheetNo===1?6:-12)*Math.PI/180;
  const scale=sheetNo===1?12.9:15.2;
  return [850+scale*(p[0]*Math.cos(angle)-p[1]*Math.sin(angle)),
    990+scale*(p[0]*Math.sin(angle)+p[1]*Math.cos(angle))];
};
const makeCopy=(copy:1|2,drift:{blue:RisoProofPoint;red:RisoProofPoint}):{
  measurements:RisoScanMeasurements;pixels:readonly [number,number];
}=>{
  const corners=(["top-left","top-right","bottom-right","bottom-left"] as const)
    .map((id,i)=>({id,scanPx:transform(copy,
      ([[0,0],[sheet[0],0],[sheet[0],sheet[1]],[0,sheet[1]]] as const)[i])}));
  return {pixels:copy===1?pixelsA:pixelsB,measurements:{
    kind:"physical-scan",corners,plates:ids.map(plateId=>({
      plateId,marks:(["top","bottom","left","right"] as const).map(id=>({
        id,scanPx:transform(copy,[
          expected[id][0]+drift[plateId][0],
          expected[id][1]+drift[plateId][1],
        ]),
      })),
    })),
  }};
};
const first=makeCopy(1,{blue:[.2,-.1],red:[1.4,-.5]});
const second=makeCopy(2,{blue:[.6,-.2],red:[2.5,.1]});
describe("RISO73 physical two-sheet art/registration operator audit",()=>{
  it("normalizes different pixel scales, image dimensions and independent rotations on paper alone",()=>{
    const r=inspectRiso73CopyRepeatability(first,second,sheet,expected,ids);
    expect(r.evidence).toBe("two-operator-annotated-images-unverified");
    expect(r.firstPaper.paperOnly).toBe(true);
    expect(r.secondPaper.paperOnly).toBe(true);
    expect(r.firstPaper.worstPaperCornerResidualMm).toBeLessThan(1e-8);
    expect(r.secondPaper.worstPaperCornerResidualMm).toBeLessThan(1e-8);
    expect(r.plates[0].meanChangeMm[0]).toBeCloseTo(.4,8);
    expect(r.plates[0].meanChangeMm[1]).toBeCloseTo(-.1,8);
    expect(r.plates[1].meanChangeMm[0]).toBeCloseTo(1.1,8);
    expect(r.plates[1].meanChangeMm[1]).toBeCloseTo(.6,8);
    expect(r.plates[0].marks).toHaveLength(4);
    expect(r.plates[1].marks).toHaveLength(4);
    expect(r.relativeInk?.meanChangeMm[0]).toBeCloseTo(.7,8);
    expect(r.relativeInk?.meanChangeMm[1]).toBeCloseTo(.7,8);
    expect(r.withinDeclaredRepeatabilityBudget).toBe(true);
    expect(r.plates[1].worstChangeMm).toBeCloseTo(Math.hypot(1.1,.6),8);
    expect(r.relativeInk?.worstChangeMm).toBeCloseTo(Math.hypot(.7,.7),8);
  });
  it("fails declared physical repeatability budget rather than falsely certifying prints",()=>{
    const r=inspectRiso73CopyRepeatability(first,second,sheet,expected,ids,.75);
    expect(r.withinDeclaredRepeatabilityBudget).toBe(false);
    expect(r.declaredRepeatabilityBudgetMm).toBe(.75);
    expect(()=>inspectRiso73CopyRepeatability(first,second,sheet,expected,ids,0))
      .toThrow(/budget/);
  });
  it("refuses untrusted source, missing marks, changed plate order, photo framing and folded paper",()=>{
    const fake={...second,measurements:{...second.measurements,
      kind:"synthetic" as const}};
    expect(()=>inspectRiso73CopyRepeatability(first,fake,sheet,expected,ids))
      .toThrow(/requires four complete/);
    const missing={...second,measurements:{...second.measurements,
      plates:second.measurements.plates.slice(0,1)}};
    expect(()=>inspectRiso73CopyRepeatability(first,missing,sheet,expected,ids))
      .toThrow(/four complete/);
    const markedOutside={...first,measurements:{...first.measurements,
      plates:first.measurements.plates.map((p,i)=>i===0?{
        ...p,marks:p.marks.map((m,j)=>j===0?{...m,scanPx:[-1,20] as const}:m),
      }:p)}};
    expect(()=>inspectRiso73CopyRepeatability(markedOutside,second,sheet,expected,ids))
      .toThrow(/inside-image/);
    const wrongCorners={...first,measurements:{...first.measurements,
      corners:first.measurements.corners.map((c,i)=>({
        ...c,scanPx:[first.measurements.corners[0],
          first.measurements.corners[3],
          first.measurements.corners[2],
          first.measurements.corners[1]][i].scanPx,
      }))}};
    expect(()=>inspectRiso73CopyRepeatability(wrongCorners,second,sheet,expected,ids))
      .toThrow(/mirrored/);
    const perspective={...first,measurements:{...first.measurements,
      corners:first.measurements.corners.map((c,i)=>i===2?
        {...c,scanPx:[c.scanPx[0]+80,c.scanPx[1]+60] as const}:c)}};
    expect(()=>inspectRiso73CopyRepeatability(perspective,second,sheet,expected,ids))
      .toThrow(/non-affine/);
  });
  it("all eight per-color marks remain visible in paired and 3x source-photo overlay without smoothing",()=>{
    const html=renderToStaticMarkup(<Riso73TwoCopyPrintStudy
      firstPhoto={{url:"blob:source1",width:pixelsA[0],height:pixelsA[1]}}
      secondPhoto={{url:"blob:source2",width:pixelsB[0],height:pixelsB[1]}}
      firstScan={first.measurements} secondScan={second.measurements}
      sheetMm={sheet} expectedMarksMm={expected} plateIds={ids}/>);
    expect(html).toContain('data-km-riso73-valid="true"');
    expect(html).toContain('data-km-riso73-mode="paired"');
    expect(html).toContain('data-km-riso73-panel="first"');
    expect(html).toContain('data-km-riso73-panel="second"');
    expect(html).toContain('href="blob:source1"');
    expect(html).toContain('href="blob:source2"');
    expect(html).toContain('data-km-riso73-row="blue"');
    expect(html).toContain('data-km-riso73-row="red"');
    expect(html).toContain('data-km-riso73-inter-ink=""');
    expect(html.match(/data-km-riso73-mark=/g)).toHaveLength(16);
    expect(html).not.toMatch(/feGaussianBlur|<canvas|<filter|<foreignObject/);
  });
});
