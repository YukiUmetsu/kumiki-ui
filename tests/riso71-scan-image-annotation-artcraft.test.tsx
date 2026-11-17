import {describe,expect,it} from "vitest";
import {renderToStaticMarkup} from "react-dom/server";
import {riso71TargetKeys,riso71DisplayToSourcePixel,
  riso71BuildScanMeasurements} from "../registry/video/riso-scan-image-annotation";
import {RisoScanImageAnnotator} from "../src/video/riso71-scan-image-annotator";
import {inspectRisoScanProof,risoPrintRegistrationTargets}
  from "../registry/video/riso-scan-proof";
import type {RisoProofPoint} from "../registry/video/riso-scan-proof";
import {riso68OriginalMasters,riso68PaperProfile}
  from "../src/video/riso-master-separation-studio";
import {risoExampleSpec} from "../src/video/riso-print-demo";

function fixture(){
  const spec=risoExampleSpec("landscape",66);
  const masters=riso68OriginalMasters("landscape",160,66);
  const layout=riso68PaperProfile("landscape",{marks:"crop-and-register"});
  const target=risoPrintRegistrationTargets(spec,masters,layout);
  const [w,h]=layout.sheetMm;
  const angle=13*Math.PI/180,scale=9.5;
  const toPx=([x,y]:RisoProofPoint):RisoProofPoint=>[
    450+scale*(x*Math.cos(angle)-y*Math.sin(angle)),
    145+scale*(x*Math.sin(angle)+y*Math.cos(angle)),
  ];
  const points:Record<string,RisoProofPoint>={};
  const corners=([[0,0],[w,0],[w,h],[0,h]] as const);
  for(const [i,id] of ["top-left","top-right","bottom-right","bottom-left"].entries())
    points["paper:"+id]=toPx(corners[i]);
  for(const plate of spec.plates)for(const id of ["top","bottom","left","right"] as const){
    const q=target[id];
    points[plate.id+":"+id]=toPx([
      q[0]+(plate.id==="red"?1.4:0),
      q[1]+(plate.id==="red"?-.55:0),
    ]);
  }
  return {spec,masters,layout,points};
}
describe("RISO71 authentic scan-image pixel annotation without changing film masters",()=>{
  it("scales natural image pixels independently of displayed CSS zoom",()=>{
    const box={left:100,top:200,width:1200,height:800};
    expect(riso71DisplayToSourcePixel(700,600,box,3600,2400))
      .toEqual([1800,1200]);
    expect(riso71DisplayToSourcePixel(100,200,box,3600,2400))
      .toEqual([0,0]);
    expect(riso71DisplayToSourcePixel(1300,1000,box,3600,2400))
      .toEqual([3600,2400]);
    expect(()=>riso71DisplayToSourcePixel(99,200,box,3600,2400))
      .toThrow(/outside/);
    expect(()=>riso71DisplayToSourcePixel(100,200,box,0,2400))
      .toThrow(/geometry/);
  });
  it("demands exact four PAPER corners and all four cross centers on each declared drum",()=>{
    const keys=riso71TargetKeys(["blue","red"]);
    expect(keys).toHaveLength(12);
    expect(keys.slice(0,4)).toEqual([
      "paper:top-left","paper:top-right","paper:bottom-right","paper:bottom-left",
    ]);
    expect(keys.slice(4,8)).toEqual([
      "blue:top","blue:bottom","blue:left","blue:right",
    ]);
    expect(()=>riso71TargetKeys(["blue","blue"])).toThrow(/unique/);
    const {points}=fixture();
    const missing={...points};delete missing["red:bottom"];
    expect(()=>riso71BuildScanMeasurements(["blue","red"],missing,3600,3000))
      .toThrow(/red:bottom/);
    const outside={...points,"red:bottom":[3700,3] as const};
    expect(()=>riso71BuildScanMeasurements(["blue","red"],outside,3600,3000))
      .toThrow(/red:bottom/);
  });
  it("transfers operator-picked IMAGE pixels to the existing strict paper-only affine measurement",()=>{
    const {spec,masters,layout,points}=fixture();
    const preserved=JSON.stringify(masters);
    const readings=riso71BuildScanMeasurements(["blue","red"],points,3600,3000);
    expect(readings.kind).toBe("physical-scan");
    expect(readings.corners.map(c=>c.id)).toEqual([
      "top-left","top-right","bottom-right","bottom-left",
    ]);
    expect(readings.plates.map(p=>p.plateId)).toEqual(["blue","red"]);
    const report=inspectRisoScanProof(spec,masters,layout,readings,1.75);
    expect(report.evidence).toBe("operator-measured");
    expect(report.scannerCornerMaxErrorMm).toBeLessThan(1e-7);
    expect(report.plates[0].worstMm).toBeLessThan(1e-7);
    expect(report.plates[1].meanDeltaMm[0]).toBeCloseTo(1.4,7);
    expect(report.plates[1].meanDeltaMm[1]).toBeCloseTo(-.55,7);
    expect(report.relativePairMm[0].meanDeltaMm[0]).toBeCloseTo(1.4,7);
    expect(report.withinDeclaredTolerance).toBe(true);
    expect(JSON.stringify(masters)).toBe(preserved);
  });
  it("rejects folded or zero-area paper outlines rather than approving fake scan registration",()=>{
    const {points}=fixture();
    const swapped={...points,
      "paper:top-right":points["paper:bottom-left"],
      "paper:bottom-left":points["paper:top-right"]};
    expect(()=>riso71BuildScanMeasurements(["blue","red"],swapped,3600,3000))
      .toThrow(/corner order/);
    const same={...points,"paper:bottom-left":points["paper:top-left"]};
    expect(()=>riso71BuildScanMeasurements(["blue","red"],same,3600,3000))
      .toThrow(/corner order/);
    expect(()=>riso71BuildScanMeasurements(["blue","red"],points,0,3000))
      .toThrow(/dimensions/);
  });
  it("server-side Storybook shows honest empty image state with no fake scan",()=>{
    const html=renderToStaticMarkup(<RisoScanImageAnnotator
      plateIds={["blue","red"]} resetKey="landscape:160:66:crop-and-register"
      onChange={()=>{}}/>);
    expect(html).toContain('data-km-riso71-image-study=""');
    expect(html).toContain('data-km-riso71-count="0"');
    expect(html).toContain('data-km-riso71-total="12"');
    expect(html).toContain("No physical scan image loaded");
    expect(html).not.toMatch(/<img |<canvas|<filter|<foreignObject/);
  });
});
