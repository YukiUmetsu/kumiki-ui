import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { evaluateWetPaper, insideWetPaintArea, inspectWetPaper } from "../registry/video/watercolour-wet-paper";
import { WatercolourWetPaper } from "../registry/video/watercolour-wet-paper-react";
import { WatercolourMasterStudyPage, watercolourStudySpec, watercolourSubjectSpec, WATERCOLOUR_STUDIES } from "../src/video/watercolour-master-studies";

describe("WM5 artist-built subject masks and real drying-front transport",()=>{
  for(const study of WATERCOLOUR_STUDIES){
    it(study+": preserves pigment mass strictly within subject silhouettes",()=>{
      const spec=watercolourSubjectSpec(study,83);
      expect(inspectWetPaper(spec)).toEqual([]);
      expect(spec.paintAreas!.length).toBeGreaterThan(2);
      expect(spec.edgePooling).toBeGreaterThan(0);
      const wet=evaluateWetPaper(spec,200),dry=evaluateWetPaper(spec,999);
      const expected=65*spec.drops.reduce((sum,d)=>sum+d.load,0);
      expect(wet.totalPigment).toBeCloseTo(expected,4);
      expect(dry.totalPigment).toBeCloseTo(expected,4);
      expect(dry.settled).toBe(true);
      expect(dry.cells.length).toBeGreaterThan(4);
      expect(dry.cells.every(cell=>insideWetPaintArea(cell.x+cell.width/2,
        cell.y+cell.height/2,spec.paintAreas!))).toBe(true);
      expect(dry.cells.every(cell=>cell.sediment===1)).toBe(true);
      const html=renderToStaticMarkup(<WatercolourWetPaper spec={spec} frame={325} transparentPaper/>);
      expect(html).toContain('data-km-wet-paper-region-count="'+spec.paintAreas!.length+'"');
      expect(html).toContain('clip-path="url(#');
      expect(html).toContain("<clipPath");
      expect(html).toContain("<polygon");
      expect(html).not.toContain('data-km-wet-paper-fibres');
    });
  }

  it("prevents water and pigment from crossing disjoint paper silhouettes",()=>{
    const areas=[
      [{x:100,y:120},{x:230,y:120},{x:230,y:260},{x:100,y:260}],
      [{x:590,y:120},{x:730,y:120},{x:730,y:260},{x:590,y:260}],
    ];
    const base=watercolourSubjectSpec("courtyard");
    const spec={...base,paintAreas:areas,drops:[
      {id:"isolated-rose",x:160,y:180,radius:38,pigment:"#AC5264",
        load:.9,water:1,startFrame:4},
    ],edgePooling:1,flow:1};
    expect(inspectWetPaper(spec)).toEqual([]);
    const result=evaluateWetPaper(spec,400);
    expect(result.totalPigment).toBeCloseTo(58.5,5);
    expect(result.cells.length).toBeGreaterThan(3);
    expect(result.cells.every(c=>c.x+c.width/2<300)).toBe(true);
  });

  it("changes pigment pooling at drying edges without creating mass",()=>{
    const original=watercolourSubjectSpec("estuary");
    const noPool={...original,edgePooling:0};
    const pooled={...original,edgePooling:1};
    const a=evaluateWetPaper(noPool,186),b=evaluateWetPaper(pooled,186);
    expect(a.totalPigment).toBeCloseTo(b.totalPigment,6);
    expect(a.cells).not.toEqual(b.cells);
    expect(evaluateWetPaper(pooled,186)).toEqual(b);
    expect(evaluateWetPaper(pooled,100000).cells).toEqual(evaluateWetPaper(pooled,999).cells);
  });

  it("rejects degenerate, out-of-bounds, excessively complex shapes and pooling",()=>{
    const spec=watercolourSubjectSpec("courtyard");
    const invalid=[
      {...spec,edgePooling:1.1},
      {...spec,paintAreas:[[{x:2,y:2},{x:2,y:2},{x:2,y:2}]]},
      {...spec,paintAreas:[[{x:-1,y:2},{x:5,y:2},{x:5,y:6}]]},
      {...spec,paintAreas:Array.from({length:49},()=>[
        {x:1,y:2},{x:4,y:2},{x:3,y:8},
      ])},
    ];
    for(const value of invalid)expect(inspectWetPaper(value).length).toBeGreaterThan(0);
  });

  it("binds both paper fields to same frame, paint style and canonical art transform",()=>{
    for(const output of ["landscape","portrait"] as const){
      const spec=watercolourStudySpec("botanical",output,106);
      const html=renderToStaticMarkup(<WatercolourMasterStudyPage study="botanical"
        spec={spec} frame={195}/>);
      expect(html.match(/data-km-wet-paper=""/g)??[]).toHaveLength(2);
      expect(html).toContain('data-km-subject-pigment=""');
      expect(html).toContain('data-km-wet-paper-region-count="24"');
      expect(html).toContain("data-km-wet-paper-pigment=");
      if(output==="portrait")expect(html).toContain("translate(-280 275) scale(.85)");
    }
  });
  it("offers an art-only, high-coverage composition for two video aspect ratios",()=>{
    for(const output of ["landscape","portrait"] as const){
      const spec=watercolourStudySpec("estuary",output);
      const html=renderToStaticMarkup(<WatercolourMasterStudyPage
        study="estuary" spec={spec} frame={360} artOnly/>);
      expect(html).toContain("data-km-subject-pigment");
      expect((html.match(/data-km-wet-paper=""/g)??[]).length).toBe(2);
      expect(html).not.toContain("WATERCOLOUR / ORIGINAL STUDIES");
      expect(html).toContain(output==="portrait"?
        "translate(-1410 -293) scale(2.22)":"translate(-447 -159) scale(1.46)");
    }
  });

});
