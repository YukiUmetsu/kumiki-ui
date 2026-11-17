import {describe,expect,it} from "vitest";
import {roseLaminaFibres,ROSE_LAMINA_AXES} from
  "../src/video/colored-pencil-rose-lamina";
import {pencilObjectStudyDrawing} from
  "../src/video/colored-pencil-object-studies";
import {inspectPencilFoundationDrawing} from
  "../registry/video/colored-pencil-foundation";

const drawing=(aspect:"landscape"|"portrait",enabled=false,seed=291)=>
  pencilObjectStudyDrawing({subject:"rose",aspect,roseLaminaStudy:enabled,seed});

describe("ArtCraft pencil botanical lamina: opt-in, anatomy-first microfibres",()=>{
  it("is seeded, independently addressable, material-specific and bounded",()=>{
    const ids=ROSE_LAMINA_AXES.map(a=>a.id);
    expect(new Set(ids).size).toBe(7);
    for(const axis of ROSE_LAMINA_AXES){
      const a=roseLaminaFibres(axis.id,291);
      expect(a).toHaveLength(4);
      expect(roseLaminaFibres(axis.id,291)).toEqual(a);
      expect(roseLaminaFibres(axis.id,292)).not.toEqual(a);
      expect(a.map(t=>t.id)).toEqual([
        "rose-lam-"+axis.id+"-cool-shadow",
        "rose-lam-"+axis.id+"-carmine",
        "rose-lam-"+axis.id+"-rose-veil",
        "rose-lam-"+axis.id+"-cuticle-light",
      ]);
      expect(a.map(t=>t.startFrame)).toEqual([169,203,234,260]);
      for(const trace of a){
        expect(trace.path.length).toBeGreaterThan(2300);
        expect(trace.path.length).toBeLessThan(12000);
        expect((trace.path.match(/M/g)??[]).length).toBeGreaterThan(64);
        expect(trace.path).not.toMatch(/NaN|Infinity|<image|filter|url\(/);
        expect(trace.width).toBeGreaterThan(0);
        expect(trace.opacity).toBeGreaterThan(0);
        expect(trace.opacity).toBeLessThan(.5);
      }
    }
    expect(()=>roseLaminaFibres("petal-disconnected",291)).toThrow(RangeError);
    expect(()=>roseLaminaFibres("heart",-1)).toThrow(RangeError);
    expect(()=>roseLaminaFibres("heart",1.5)).toThrow(RangeError);
  });
  it("preserves every original region, shape, layer, underpaint and trace on A/B",()=>{
    for(const aspect of ["landscape","portrait"] as const){
      const baseline=drawing(aspect);
      const off=pencilObjectStudyDrawing({
        subject:"rose",aspect,roseLaminaStudy:false,seed:291});
      expect(baseline).toEqual(off);
      const optin=drawing(aspect,true);
      expect(inspectPencilFoundationDrawing(baseline)).toEqual([]);
      expect(inspectPencilFoundationDrawing(optin)).toEqual([]);
      expect(optin.regions.map(r=>r.id)).toEqual(baseline.regions.map(r=>r.id));
      expect(optin.regions.length).toBe(baseline.regions.length);
      for(let i=0;i<baseline.regions.length;i++){
        const old=baseline.regions[i],now=optin.regions[i];
        expect(now.path).toBe(old.path);
        expect(now.bounds).toEqual(old.bounds);
        expect(now.layers).toEqual(old.layers);
        expect(now.contour).toEqual(old.contour);
        expect(now.craft).toEqual(old.craft);
        expect(now.transform).toBe(old.transform);
        const added=ROSE_LAMINA_AXES.some(axis=>axis.id===old.id);
        expect(now.details?.slice(0,old.details?.length??0))
          .toEqual(old.details??[]);
        if(added){
          expect((now.details?.length??0)-(old.details?.length??0)).toBe(4);
          expect(now.clipDetails).toBe(true);
        }else expect(now).toEqual(old);
      }
    }
  });
  it("keeps all non-botanical subjects exactly unchanged, and rejects invalid input",()=>{
    for(const subject of ["glass","architecture","fabric"] as const){
      for(const aspect of ["landscape","portrait"] as const){
        const base=pencilObjectStudyDrawing({subject,aspect});
        const study=pencilObjectStudyDrawing({subject,aspect,roseLaminaStudy:true});
        expect(study).toEqual(base);
      }
    }
    expect(()=>pencilObjectStudyDrawing({
      subject:"rose",aspect:"landscape",roseLaminaStudy:"true" as never,
    })).toThrow(/boolean/);
  });
});
