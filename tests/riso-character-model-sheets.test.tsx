import {createElement} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {describe,expect,it} from "vitest";
import {RisoCharacterModelSheet,risoSheetViewBox} from "../registry/video/riso-character-sheet-react";
import {evaluateRisoCharacterMesh,inspectRisoCharacterMesh} from "../registry/video/riso-proportion-mesh";
import {COURIER,PAPER_BIRD} from "../src/video/riso-character-demo";
import {evaluateRisoCharacter} from "../registry/video/riso-character";
import {RISO_COURIER_SHEET,RISO_PAPER_BIRD_SHEET} from "../src/video/riso-character-mesh-sheets";

const cases=[
  {spec:COURIER,sheet:RISO_COURIER_SHEET},
  {spec:PAPER_BIRD,sheet:RISO_PAPER_BIRD_SHEET},
] as const;
describe("Source-anchored Riso character proportional construction sheets",()=>{
  for(const {spec,sheet} of cases){
    it(`${spec.id}: every authored component is mapped into a named 2D mesh`,()=>{
      expect(inspectRisoCharacterMesh(spec,sheet)).toEqual([]);
      const mapped=new Set(sheet.regions.flatMap(r=>r.parts));
      expect(spec.parts.filter(p=>!mapped.has(p.id)).map(p=>p.id)).toEqual([]);
      expect(new Set(sheet.regions.map(r=>r.id)).size).toBe(sheet.regions.length);
      expect(sheet.view).toBe("authored-2d");
      expect(sheet.missingViews).toContain("back");
      expect(sheet.missingViews).toContain("true-side");
      const mesh=evaluateRisoCharacterMesh(spec,sheet,sheet.poses[0].frame);
      expect(mesh.headUnit).toBeGreaterThan(40);
      expect(mesh.headUnit).toBeLessThan(110);
      expect(mesh.regions).toHaveLength(sheet.regions.length);
      for(const r of mesh.regions){
        expect(r.triangles.length).toBeGreaterThanOrEqual(1);
        expect(r.sourceContourPoints).toBeGreaterThan(2);
        expect(r.contourArea).toBeGreaterThan(0);
        expect(r.triangleArea).toBeGreaterThan(0);
        expect(r.widthInHeads).toBeGreaterThan(0);
        expect(r.heightInHeads).toBeGreaterThan(0);
        expect(r.outline.every(p=>p.every(Number.isFinite))).toBe(true);
        expect(r.landmarks.every(p=>p.at.every(Number.isFinite))).toBe(true);
        expect(r.bounds.width).toBeGreaterThan(0);
        expect(r.bounds.height).toBeGreaterThan(0);
      }
    });
    it(`${spec.id}: mesh is fully frame-seekable and independent of query history`,()=>{
      const f=sheet.poses[1].frame;
      const first=evaluateRisoCharacterMesh(spec,sheet,f);
      evaluateRisoCharacterMesh(spec,sheet,sheet.poses[2].frame);
      evaluateRisoCharacterMesh(spec,sheet,0);
      expect(evaluateRisoCharacterMesh(spec,sheet,f)).toEqual(first);
      const old=evaluateRisoCharacterMesh(spec,sheet,sheet.poses[0].frame);
      expect(first.overallBounds).not.toEqual(old.overallBounds);
    });
    it(`${spec.id}: print sheet retains original ink art under construction lines`,()=>{
      const markup=renderToStaticMarkup(createElement(RisoCharacterModelSheet,{
        spec,sheet,frame:sheet.poses[1].frame,showMesh:true,showLabels:false,
        selectedRegion:sheet.headRegion,
      }));
      expect(markup).toContain(`data-km-riso-model-sheet="${spec.id}"`);
      expect(markup).toContain("data-km-riso-sheet-full-view");
      expect(markup).toContain("data-km-riso-sheet-head-view");
      expect(markup).toContain(`data-km-riso-mesh-region="${sheet.headRegion}"`);
      expect(markup).toContain(`data-km-riso-focused-region="${sheet.headRegion}"`);
      expect(markup).toContain(`data-km-riso-character-knockout="${spec.id}"`);
      expect(markup).toContain("CHARACTER CONSTRUCTION");
      expect(markup).toContain("UNAUTHORED VIEWS");
      expect(markup).toContain("data-km-riso-sheet-pose");
      expect(markup).toContain("data-km-riso-mesh-triangle");
      expect(markup).toContain('data-km-riso-selected-source-detail=""');
      expect(markup).toContain('data-km-riso-selected-source-triangle=""');
      expect(markup).toContain("Actual source outline");
      if(spec.id==="paper-bird"){
        expect(markup).toContain('data-km-riso-wing-detail="left-wing"');
        expect(markup).toContain('data-km-riso-wing-detail="right-wing"');
        expect(markup).toContain('data-km-riso-wing-cage="right-wing"');
      } else {
        expect(markup).not.toContain("data-km-riso-wing-detail");
      }
    });
  }
  it("Courier has separate left/right eyes and eyebrows, hair, mouth, nose, sleeves, legs and boots",()=>{
    const ids=new Set(RISO_COURIER_SHEET.regions.map(r=>r.id));
    for(const id of ["brow-left","brow-right","eye-left","eye-right","nose","mouth",
      "hair-mass","head-shape","sleeve-left","sleeve-right","forearm-left",
      "forearm-right","thigh-left","thigh-right","shin-left","shin-right",
      "boot-left","boot-right","satchel"]){
      expect(ids.has(id),id).toBe(true);
    }
    expect(COURIER.parts.filter(p=>p.id.endsWith("-eyebrow"))).toHaveLength(2);
    const blink=evaluateRisoCharacterMesh(COURIER,RISO_COURIER_SHEET,78);
    const speak=evaluateRisoCharacterMesh(COURIER,RISO_COURIER_SHEET,160);
    expect(blink.regions.find(r=>r.id==="brow-left")).toBeDefined();
    expect(speak.regions.find(r=>r.id==="brow-right")).toBeDefined();
  });
  it("Bird is not assigned invented human eyebrows, sleeves or legs",()=>{
    const ids=RISO_PAPER_BIRD_SHEET.regions.map(r=>r.id);
    expect(ids).toEqual(["head","eye","beak","body","left-wing","right-wing","tail"]);
    expect(RISO_PAPER_BIRD_SHEET.regions.some(r=>r.category==="sleeve")).toBe(false);
  });
  it("IK-solved thigh and sleeve cage vertices move between pose frames",()=>{
    const start=evaluateRisoCharacterMesh(COURIER,RISO_COURIER_SHEET,0);
    const swing=evaluateRisoCharacterMesh(COURIER,RISO_COURIER_SHEET,46);
    for(const id of ["thigh-left","shin-left","sleeve-left","forearm-right"]){
      const r=start.regions.find(r=>r.id===id)!;
      const moved=swing.regions.find(r=>r.id===id)!;
      expect(r.triangles.length).toBeGreaterThan(6);
      expect(moved.triangles.length).toBeGreaterThan(6);
      expect(r.sourceContourPoints).toBeGreaterThan(8);
      expect(moved.sourceContourPoints).toBeGreaterThan(8);
      expect(r.outline).not.toEqual(moved.outline);
      // The inspector must now follow the exact ink-skin contour, not a cage
      // interpolated separately from the final printed source.
      const print=evaluateRisoCharacter(COURIER,46).parts.find(p=>p.id===r.parts[0])!;
      expect(print.transform).toBe("matrix(1 0 0 1 0 0)");
    }
  });
  it("RISO7 source contours are not the former rectangles",()=>{
    for(const {spec,sheet} of cases){
      expect(sheet.regions.every(r=>r.contour===undefined)).toBe(true);
      const report=evaluateRisoCharacterMesh(spec,sheet,sheet.poses[1].frame);
      const characters=spec.id==="courier"?
        ["head-shape","hair-mass","cap","eye-left","eye-right","mouth","coat-shell","sleeve-left","thigh-right","satchel"]:
        ["head","eye","beak","body","left-wing","right-wing","tail"];
      for(const id of characters){
        const r=report.regions.find(p=>p.id===id)!;
        expect(r.sourceContourPoints,id).toBeGreaterThanOrEqual(3);
        expect(r.referenceBounds.width,id).toBeGreaterThan(0);
        expect(r.triangleArea,id).toBeGreaterThan(.8*r.contourArea);
        expect(r.triangleArea,id).toBeLessThan(1.2*r.contourArea);
      }
    }
  });
  it("calculates real Riso facial landmarks and proportions, including separate eye islands",()=>{
    const report=evaluateRisoCharacterMesh(COURIER,RISO_COURIER_SHEET,198);
    const left=report.regions.find(r=>r.id==="eye-left")!;
    const right=report.regions.find(r=>r.id==="eye-right")!;
    expect(left.bounds.x+left.bounds.width).toBeLessThan(right.bounds.x);
    expect(left.referenceBounds.width).toBeLessThan(20);
    expect(right.referenceBounds.width).toBeLessThan(20);
    expect(report.measurements.find(m=>m.id==="interocular")!.distanceInHeads).toBeGreaterThan(.15);
    expect(report.measurements.find(m=>m.id==="nose-mouth")!.distance).toBeGreaterThan(5);
    expect(report.measurements.find(m=>m.id==="brow-eye-left")!.distanceInHeads).toBeGreaterThan(0);
    expect(report.measurements.every(m=>Number.isFinite(m.distanceInHeads))).toBe(true);
    const bird=evaluateRisoCharacterMesh(PAPER_BIRD,RISO_PAPER_BIRD_SHEET,84);
    expect(bird.measurements.map(m=>m.id)).toContain("wing-span");
    expect(bird.regions.find(r=>r.id==="right-wing")!.sourceContourPoints).toBeGreaterThan(10);
  });
  it("guards fabricated mesh coordinates, wrong attachment and missing head anchors",()=>{
    const copy=RISO_COURIER_SHEET;
    const invalid=[
      {...copy,headRegion:"not-present"},
      {...copy,regions:[{...copy.regions[0],contour:[[0,0],[0,0],[0,0]]},...copy.regions.slice(1)]},
      {...copy,regions:[{...copy.regions[0],tipJoint:"right-knee"},...copy.regions.slice(1)]},
    ];
    for(const sheet of invalid) {
      // This shape is deliberately invalid; the public inspector must diagnose it.
      expect(inspectRisoCharacterMesh(COURIER,sheet as typeof copy).length).toBeGreaterThan(0);
    }
  });
  it("fits measurement guides without asymmetric stretch",()=>{
    expect(risoSheetViewBox({x:0,y:0,width:200,height:80},200,200,10).split(" "))
      .toHaveLength(4);
    expect(risoSheetViewBox({x:-20,y:-20,width:100,height:150},300,150))
      .not.toContain("Infinity");
  });
});
