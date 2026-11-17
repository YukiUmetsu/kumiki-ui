import {describe,expect,it} from "vitest";
import {
  ROSE_PHYSICAL_FOLDS,inspectRosePhysicalFolds,physicalFoldUndersideDetails,
  physicalFoldFaceDetails,
} from "../src/video/colored-pencil-rose-physical-folds";
import {pencilObjectStudyDrawing} from "../src/video/colored-pencil-object-studies";
import {inspectPencilFoundationDrawing} from "../registry/video/colored-pencil-foundation";

const rose=(aspect:"landscape"|"portrait",vol=false,calyx=false,leaves=false,
  lamina=false,lips=false,seed=291)=>
  pencilObjectStudyDrawing({subject:"rose",aspect,seed,
    rosePhysicalFolds:vol,roseCalyxStudy:calyx,rosePinnateStudy:leaves,
    roseLaminaStudy:lamina,roseLipStudy:lips});

describe("FLORA1 rose physically separate rolled petal laminae",()=>{
  it("authors five independent nonzero-area front/underturn source contours",()=>{
    expect(inspectRosePhysicalFolds()).toEqual([]);
    expect(ROSE_PHYSICAL_FOLDS).toHaveLength(5);
    expect(new Set(ROSE_PHYSICAL_FOLDS.map(f=>f.id)).size).toBe(5);
    for(const fold of ROSE_PHYSICAL_FOLDS){
      expect(fold.face).toMatch(/^M.* Z$/);
      expect(fold.underside).toMatch(/^M.* Z$/);
      expect(fold.face).not.toBe(fold.underside);
      expect(fold.face.split(/[CQ]/).length).toBeGreaterThan(4);
      expect(fold.undersideBounds[2]*fold.undersideBounds[3]).toBeGreaterThan(1000);
      const details=physicalFoldUndersideDetails(fold);
      expect(details).toHaveLength(4);
      for(const t of details){
        expect(t.path).toMatch(/^M/);
        expect(t.id?.length).toBeLessThanOrEqual(40);
        expect(t.startFrame).toBeGreaterThanOrEqual(160);
        expect(t.startFrame).toBeLessThanOrEqual(280);
        expect(t.opacity).toBeGreaterThan(0);
      }
    }
  });
  it("sculpts nonvertical S-curve frontal edges with original optical detail intact",()=>{
    const left=ROSE_PHYSICAL_FOLDS.find(f=>f.id==="petal-front-left")!;
    const right=ROSE_PHYSICAL_FOLDS.find(f=>f.id==="petal-front-right")!;
    expect(left.face).toContain("C230 250 233 259 237 269");
    expect(right.face).toContain("C240 257 249 242 256 226");
    expect(left.face.split("C").length).toBeGreaterThan(6);
    expect(right.face.split("C").length).toBeGreaterThan(6);
    expect(left.hinge).toBe(left.face.slice(0,left.hinge.length));
    expect(right.hinge).toBe(right.face.slice(0,right.hinge.length));
    expect(physicalFoldFaceDetails(left).map(t=>t.id))
      .toEqual(["rf-front-left-crease","rf-front-left-return"]);
    expect(physicalFoldFaceDetails(right).map(t=>t.id))
      .toEqual(["rf-front-right-crease","rf-front-right-return"]);
    for(const fold of [left,right]){
      const traces=physicalFoldFaceDetails(fold);
      expect(traces).toHaveLength(2);
      expect(traces.map(t=>t.startFrame).every(n=>n>=200&&n<=270)).toBe(true);
      expect(traces.every(t=>t.opacity!==undefined&&t.opacity>0&&t.opacity<1))
        .toBe(true);
    }
    expect(ROSE_PHYSICAL_FOLDS.filter(f=>!f.id.startsWith("petal-front-"))
      .every(f=>physicalFoldFaceDetails(f).length===0)).toBe(true);
  });
  it.each(["landscape","portrait"] as const)(
    "rebuilds precisely the five keyed petal silhouettes without erasing other art in %s",aspect=>{
      const original=rose(aspect);
      const volume=rose(aspect,true);
      expect(original).toEqual(pencilObjectStudyDrawing({subject:"rose",aspect,seed:291}));
      expect(original.regions).toHaveLength(11);
      expect(volume.regions).toHaveLength(16);
      expect(inspectPencilFoundationDrawing(volume)).toEqual([]);
      const sources=new Set(ROSE_PHYSICAL_FOLDS.map(f=>f.id));
      for(const region of original.regions){
        const next=volume.regions.find(r=>r.id===region.id);
        expect(next).toBeDefined();
        if(!sources.has(region.id)){
          expect(next).toEqual(region);
        }else{
          const keyed=ROSE_PHYSICAL_FOLDS.find(f=>f.id===region.id)!;
          expect(next?.path).toBe(keyed.face);
          expect(next?.path).not.toBe(region.path);
          expect(next?.bounds).toEqual(keyed.faceBounds);
          expect(next?.layers.map(l=>l.seed)).toEqual(region.layers.map(l=>l.seed));
          expect(next?.details?.slice(0,region.details?.length??0))
            .toEqual(region.details??[]);
          expect(next?.details?.slice(region.details?.length??0))
            .toEqual(physicalFoldFaceDetails(keyed));
          const underside=volume.regions.find(r=>r.id==="rose-turn-"+region.id);
          expect(underside).toBeDefined();
          expect(underside?.path).toBe(keyed.underside);
          expect(underside?.bounds).toEqual(keyed.undersideBounds);
          expect(underside?.details?.length).toBe(4);
          const idx=volume.regions.findIndex(r=>r.id===region.id);
          expect(volume.regions[idx-1]?.id).toBe("rose-turn-"+region.id);
        }
      }
    });
  it("can combine with existing five-sepal, compound leaf, fibres and optical lips",()=>{
    const without=rose("landscape",false,true,true,true,true);
    const combined=rose("landscape",true,true,true,true,true);
    expect(without.regions).toHaveLength(30);
    expect(combined.regions).toHaveLength(35);
    expect(inspectPencilFoundationDrawing(combined)).toEqual([]);
    for(const original of without.regions.filter(r=>
      !ROSE_PHYSICAL_FOLDS.some(f=>f.id===r.id)))
      expect(combined.regions.find(r=>r.id===original.id)).toEqual(original);
    for(const fold of ROSE_PHYSICAL_FOLDS){
      const region=combined.regions.find(r=>r.id===fold.id);
      expect(region?.details?.some(t=>t.id?.startsWith("rose-lam-"))).toBe(true);
      expect(region?.details?.some(t=>t.id?.startsWith("rose-lip-"))).toBe(true);
    }
  });
  it("is independently deterministic and remains OFF for every other subject",()=>{
    for(const seed of [0,291,2147483000])
      expect(rose("portrait",true,true,true,true,true,seed))
        .toEqual(rose("portrait",true,true,true,true,true,seed));
    for(const subject of ["glass","architecture","fabric"] as const){
      const options={subject,aspect:"landscape" as const,seed:291};
      expect(pencilObjectStudyDrawing({...options,rosePhysicalFolds:true}))
        .toEqual(pencilObjectStudyDrawing(options));
    }
    expect(()=>pencilObjectStudyDrawing({
      subject:"rose",aspect:"portrait",rosePhysicalFolds:1 as never,
    })).toThrow(RangeError);
  });
});
