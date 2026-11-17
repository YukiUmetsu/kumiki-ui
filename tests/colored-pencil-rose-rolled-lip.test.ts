import {describe,expect,it} from "vitest";
import {ROSE_LIP_BANDS,roseRolledLipTraces} from "../src/video/colored-pencil-rose-rolled-lip";
import {pencilObjectStudyDrawing} from "../src/video/colored-pencil-object-studies";
import {inspectPencilFoundationDrawing} from "../registry/video/colored-pencil-foundation";

const draw=(enabled:boolean,aspect:"landscape"|"portrait"="landscape")=>
  pencilObjectStudyDrawing({subject:"rose",aspect,seed:291,roseLipStudy:enabled});

describe("CP-F1 source-native rolled rose petal lips",()=>{
  it("has individually authored, stable and safely bounded curves",()=>{
    expect(ROSE_LIP_BANDS).toHaveLength(7);
    expect(new Set(ROSE_LIP_BANDS.map(x=>x.id)).size).toBe(7);
    // Optical shadow and local highlight vary by real petal plane; a
    // universally stamped three-colour outline would erase lamina depth.
    expect(new Set(ROSE_LIP_BANDS.map(b=>b.pigments.join(":"))).size).toBe(7);
    for(const b of ROSE_LIP_BANDS){
      expect(b.pigments).toHaveLength(3);
      expect(b.nibs).toHaveLength(3);
      expect(b.nibs.every(n=>Number.isFinite(n)&&n>0&&n<1.2)).toBe(true);
      const traces=roseRolledLipTraces(b.id);
      expect(traces.map(t=>t.color)).toEqual(b.pigments);
      expect(traces.map(t=>t.width)).toEqual(b.nibs);
      expect(traces).toHaveLength(3);
      expect(traces.map(t=>t.id)).toEqual([
        "rose-lip-"+b.id+"-occlusion",
        "rose-lip-"+b.id+"-return",
        "rose-lip-"+b.id+"-dry",
      ]);
      for(const trace of traces){
        expect(trace.path).toMatch(/^M/);
        expect(trace.path).not.toMatch(/NaN|Infinity/);
        expect(trace.width).toBeGreaterThan(0);
        expect(trace.opacity).toBeGreaterThan(0);
      }
      expect(roseRolledLipTraces(b.id)).toEqual(traces);
    }
    expect(()=>roseRolledLipTraces("nonexistent")).toThrow(RangeError);
  });

  it.each(["landscape","portrait"] as const)(
    "preserves original regions and the default artwork in %s",aspect=>{
      const baseline=draw(false,aspect);
      const study=draw(true,aspect);
      expect(baseline).toEqual(pencilObjectStudyDrawing({
        subject:"rose",aspect,seed:291,
      }));
      expect(study.regions.map(r=>r.id)).toEqual(baseline.regions.map(r=>r.id));
      expect(study.regions.length).toBe(baseline.regions.length);
      expect(inspectPencilFoundationDrawing(study)).toEqual([]);
      expect(inspectPencilFoundationDrawing(baseline)).toEqual([]);
      for(const [i,region] of study.regions.entries()){
        const original=baseline.regions[i];
        expect(region.path).toBe(original.path);
        expect(region.layers).toEqual(original.layers);
        expect(region.bounds).toEqual(original.bounds);
        const extras=(region.details??[]).filter(t=>t.id?.startsWith("rose-lip-"));
        expect(extras).toHaveLength(
          ROSE_LIP_BANDS.some(b=>b.id===region.id)?3:0);
      }
    }
  );

  it("does not leak rose curl marks to unrelated surfaces or studies",()=>{
    for(const subject of ["glass","architecture","fabric"] as const){
      const baseline=pencilObjectStudyDrawing({subject,aspect:"landscape"});
      const enabled=pencilObjectStudyDrawing({
        subject,aspect:"landscape",roseLipStudy:true});
      expect(enabled).toEqual(baseline);
    }
    expect(()=>pencilObjectStudyDrawing({
      subject:"rose",aspect:"landscape",roseLipStudy:1 as never,
    })).toThrow(RangeError);
  });
});
