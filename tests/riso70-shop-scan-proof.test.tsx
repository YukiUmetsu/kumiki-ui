import {describe,expect,it} from "vitest";
import {renderToStaticMarkup} from "react-dom/server";
import {inspectRisoShopJob} from "../registry/video/riso-shop-profile";
import type {RisoShopProfile} from "../registry/video/riso-shop-profile";
import {createRisoScanTemplate,inspectRisoScanProof,risoPrintRegistrationTargets,
  simulateRisoScanProof} from "../registry/video/riso-scan-proof";
import type {RisoScanMeasurements} from "../registry/video/riso-scan-proof";
import {riso68OriginalMasters,riso68PaperProfile}
  from "../src/video/riso-master-separation-studio";
import {riso70IllustrativeProfile,RisoShopProofStudio}
  from "../src/video/riso-shop-proof-studio";
import {risoExampleSpec} from "../src/video/riso-print-demo";
import {serializeRisoSeparationPdf} from "../registry/video/riso-press-pdf";

const setup=(aspect:"landscape"|"portrait"="landscape",frame=160)=>{
  const spec=risoExampleSpec(aspect,66),
    masters=riso68OriginalMasters(aspect,frame,66),
    layout=riso68PaperProfile(aspect,{marks:"crop-and-register"});
  const profile=riso70IllustrativeProfile({top:10,right:8,bottom:8,left:8});
  return {spec,masters,layout,profile};
};
describe("RISO70 explicit machine policies and PAPER-corner scanned proof",()=>{
  it("supports original 2-plate native pressure/paper geometry in both physical orientations",()=>{
    for(const aspect of ["landscape","portrait"] as const){
      const {spec,masters,layout,profile}=setup(aspect);
      const report=inspectRisoShopJob(spec,masters,layout,profile,{format:"pdf"});
      expect(report.compatible,report.issues.map(x=>x.code).join(",")).toBe(true);
      expect(report.inspectedInkContours).toBe(8);
      expect(report.inspectedMarks).toBe(16);
      expect(report.shopId).toBe("illustrative-custom-a4");
      expect(report.profileSource).toBe("operator-entered");
      expect(report.printableMm).toEqual({
        x:8,y:10,width:layout.sheetMm[0]-16,
        height:layout.sheetMm[1]-18,
      });
      expect(masters.reduce((s,p)=>s+p.shapes.reduce((t,x)=>
        t+(x.dryPaths?.length??0),0),0)).toBeGreaterThan(400);
    }
  });
  it("blocks asymmetric feed leading-edge margins and physical mark collisions",()=>{
    const {spec,masters,layout,profile}=setup("landscape");
    const impossible:RisoShopProfile={...profile,
      unprintableMm:{top:30,right:8,bottom:8,left:8}};
    const report=inspectRisoShopJob(spec,masters,layout,impossible,{format:"pdf"});
    expect(report.compatible).toBe(false);
    expect(report.issues.map(x=>x.code)).toContain("mark-outside-press");
    const impossibleRight={...profile,
      unprintableMm:{top:12,right:40,bottom:8,left:8}};
    const report2=inspectRisoShopJob(spec,masters,layout,impossibleRight,{format:"pdf"});
    expect(report2.issues.some(x=>x.code==="trim-bleed-outside-press")).toBe(true);
  });
  it("refuses undeclared sheet orientations, source file formats, physical DPI and marks",()=>{
    const {spec,masters,layout,profile}=setup();
    const check=(p:RisoShopProfile,opts:{format:"pdf"|"tiff";dpi?:300|600})=>
      inspectRisoShopJob(spec,masters,layout,p,opts).issues.map(x=>x.code);
    expect(check({...profile,sheetSizesMm:[[210,297]]},{format:"pdf"}))
      .toContain("sheet-not-supported");
    expect(check({...profile,fileFormat:"tiff"},{format:"pdf"}))
      .toContain("format-not-supported");
    expect(check({...profile,tiffPpi:[600]},{format:"tiff",dpi:300}))
      .toContain("ppi-not-supported");
    expect(check({...profile,marks:"none"},{format:"pdf"}))
      .toContain("marks-policy");
    expect(check({...profile,minBleedMm:4},{format:"pdf"}))
      .toContain("bleed-policy");
    expect(check(profile,{format:"tiff",dpi:600})).toEqual([]);
  });
  it("rejects invented invalid printer profiles rather than applying silent defaults",()=>{
    const {spec,masters,layout,profile}=setup();
    const run=(p:RisoShopProfile)=>inspectRisoShopJob(spec,masters,layout,p,
      {format:"pdf"});
    expect(()=>run({...profile,unprintableMm:{...profile.unprintableMm,top:NaN}}))
      .toThrow(RangeError);
    expect(()=>run({...profile,sheetSizesMm:[]})).toThrow(RangeError);
    expect(()=>run({...profile,provenance:"vendor-published"}))
      .toThrow(/HTTPS URL/);
    expect(()=>run({...profile,tiffPpi:[1200 as 300]})).toThrow(RangeError);
    expect(()=>run({...profile,minBleedMm:5,maxBleedMm:3}))
      .toThrow(RangeError);
    expect(()=>inspectRisoShopJob(spec,masters,layout,profile,
      {format:"tiff"})).toThrow(RangeError);
  });
  it("uses identical original geometric physical register centers on all drums",()=>{
    const {spec,masters,layout}=setup();
    const p=risoPrintRegistrationTargets(spec,masters,layout);
    expect(Object.keys(p)).toEqual(["top","bottom","left","right"]);
    expect(p.top[0]).toBe(p.bottom[0]);
    expect(p.left[1]).toBe(p.right[1]);
    const l=riso68PaperProfile("landscape",{marks:"none"});
    expect(()=>risoPrintRegistrationTargets(spec,masters,l)).toThrow(/requires/);
    const template=createRisoScanTemplate(spec,masters,layout);
    expect(template.kind).toBe("physical-scan");
    expect(template.corners).toHaveLength(4);
    expect(template.plates.map(p=>p.plateId)).toEqual(["blue","red"]);
    expect(template.plates[0].marks.every(m=>m.scanPx===null)).toBe(true);
    expect(template.plates[1].marks).toHaveLength(4);
  });
  it("eliminates synthetic scan paper rotation/scale without hiding genuine per-drum registration",()=>{
    const {spec,masters,layout}=setup();
    const readings=simulateRisoScanProof(spec,masters,layout,[1.3,-.7],
      {scanRotationDegrees:23,scanPixelsPerMm:15});
    const report=inspectRisoScanProof(spec,masters,layout,readings,1.75);
    expect(report.evidence).toBe("simulation-only");
    expect(report.scannerCornerMaxErrorMm).toBeLessThan(1e-8);
    expect(report.withinDeclaredTolerance).toBe(true);
    expect(report.plates[0].worstMm).toBeLessThan(1e-8);
    expect(report.plates[1].meanDeltaMm[0]).toBeCloseTo(1.3,7);
    expect(report.plates[1].meanDeltaMm[1]).toBeCloseTo(-.7,7);
    expect(report.relativePairMm[0].meanDeltaMm[0]).toBeCloseTo(1.3,7);
    expect(report.relativePairMm[0].meanDeltaMm[1]).toBeCloseTo(-.7,7);
    expect(report.relativePairMm[0].worstMm).toBeCloseTo(Math.hypot(1.3,.7),7);
  });
  it("flags real individual and relative drift against operator-declared tolerance",()=>{
    const {spec,masters,layout}=setup();
    const measurements=simulateRisoScanProof(spec,masters,layout,[2.5,1.8]);
    const result=inspectRisoScanProof(spec,masters,layout,measurements,1.5);
    expect(result.withinDeclaredTolerance).toBe(false);
    expect(result.plates[1].worstMm).toBeCloseTo(Math.hypot(2.5,1.8),7);
    expect(result.relativePairMm[0].worstMm).toBeGreaterThan(3);
  });
  it("refuses missing physical observations, fake corners, duplicated IDs and mirrored sheets",()=>{
    const {spec,masters,layout}=setup();
    const p=simulateRisoScanProof(spec,masters,layout,[.2,.1]);
    const inspect=(x:RisoScanMeasurements)=>inspectRisoScanProof(
      spec,masters,layout,x,1.5);
    const unfilled=createRisoScanTemplate(spec,masters,layout);
    expect(()=>inspect(unfilled as unknown as RisoScanMeasurements))
      .toThrow(/four observed PAPER corners/);
    expect(()=>inspect({...p,corners:p.corners.slice(1)}))
      .toThrow(/four observed PAPER corners/);
    expect(()=>inspect({...p,plates:p.plates.slice(1)}))
      .toThrow(/four observed PAPER corners/);
    expect(()=>inspect({...p,plates:[p.plates[1],p.plates[0]]}))
      .toThrow(/four observed PAPER corners/);
    expect(()=>inspect({...p,corners:[...p.corners.slice(0,3),
      {...p.corners[3],scanPx:p.corners[0].scanPx}]}))
      .toThrow(/degenerate|singular|calibration exceeds/);
  });
  it("blocks perspective-warped scans by independent PAPER-corner residual",()=>{
    const {spec,masters,layout}=setup();
    const p=simulateRisoScanProof(spec,masters,layout,[.3,.2]);
    const corrupted:RisoScanMeasurements={...p,
      corners:p.corners.map((c,i)=>i===2?{
        ...c,scanPx:[c.scanPx[0]+120,c.scanPx[1]-80],
      }:c)};
    expect(()=>inspectRisoScanProof(spec,masters,layout,corrupted,1.5))
      .toThrow(/calibration exceeds/);
  });
  it("operator-supplied physical readings are reported as input, never certified",()=>{
    const {spec,masters,layout}=setup();
    const fake=simulateRisoScanProof(spec,masters,layout,[.5,.1]);
    const input={...fake,kind:"physical-scan" as const};
    const report=inspectRisoScanProof(spec,masters,layout,input,1.5);
    expect(report.evidence).toBe("operator-measured");
    expect(report.withinDeclaredTolerance).toBe(true);
    // This labels only caller-declared provenance; no tool can verify the scan is real.
    expect(Object.keys(report)).not.toContain("certified");
    expect(Object.keys(report)).not.toContain("pressApproved");
  });
  it("is frame-seek stable and leaves both PDF ink masters unchanged",()=>{
    const a=setup("portrait",33);
    const before=serializeRisoSeparationPdf(a.spec,a.masters,a.layout,"red");
    setup("portrait",181);
    const back=setup("portrait",33);
    expect(serializeRisoSeparationPdf(back.spec,back.masters,back.layout,"red"))
      .toEqual(before);
    expect(inspectRisoShopJob(back.spec,back.masters,back.layout,back.profile,
      {format:"pdf"}).compatible).toBe(true);
  });
  it("SSR Storybook offers two original native physical master sources and honest scan state",()=>{
    const page=renderToStaticMarkup(<RisoShopProofStudio/>);
    expect(page).toContain('data-km-riso70-studio=""');
    expect(page).toContain('data-km-riso70-aspect="landscape"');
    expect(page).toContain('data-km-riso70-ready="true"');
    expect(page).toContain('data-km-riso70-proof="simulation-only"');
    expect(page).toContain('data-km-riso70-native="blue"');
    expect(page).toContain('data-km-riso70-native="red"');
    expect(page).toContain('data-km-riso70-relative-pair=""');
    expect(page.match(/fill-rule="evenodd"/g)).toHaveLength(8);
    expect(page).not.toMatch(/<image|<foreignObject|<script|feMorphology/);
  });
});
