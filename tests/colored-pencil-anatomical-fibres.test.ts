import {describe,expect,it} from "vitest";
import {anatomicalFibreTraces,pencilFibreNames} from "../src/video/colored-pencil-anatomical-fibres";
import {pencilCharacterScene} from "../src/video/colored-pencil-character-rebuild";
import {inspectPencilScene} from "../registry/video/colored-pencil-scene";
import {evaluatePencilActorRegions,inspectPencilActors} from "../registry/video/colored-pencil-actor";
import {inspectPencilDrawing} from "../registry/video/colored-pencil";
import type {PencilActorSpec} from "../registry/video/colored-pencil-actor";

const field={
  id:"guard-fur",axis:[13,17,39,38,72,57] as const,
  spread:9,length:8,count:180,seed:4917,
  palette:["#5E403A","#AC785B","#EFD0A4"] as const,
};
const tracks=(actor:PencilActorSpec)=>actor.parts.flatMap(part=>part.detailTracks??[]);

describe("ArtCraft independent anatomical pencil fibre performance",()=>{
  it("roots three opaque-part-local pigment families on hand-authored growth curves",()=>{
    const output=anatomicalFibreTraces(field);
    expect(output).toHaveLength(3);
    expect(output.map(x=>x.id)).toEqual(pencilFibreNames("guard-fur"));
    expect(output).toEqual(anatomicalFibreTraces(field));
    expect(output.map(x=>x.path)).not.toEqual(anatomicalFibreTraces({...field,seed:4918}).map(x=>x.path));
    expect(output.every(x=>x.path.startsWith("M")&&x.path.includes(" Q"))).toBe(true);
    expect(output.every(x=>x.width>=.2&&x.width<1&&x.opacity!>=0.5)).toBe(true);
    expect(output.every(x=>x.path.length<12000&&!/NaN|Infinity/.test(x.path))).toBe(true);
    const independent=output.map(x=>(x.path.match(/ M|^M/g)??[]).length);
    expect(independent.reduce((a,b)=>a+b,0)).toBe(180);
    expect(new Set(output.map(x=>x.color)).size).toBe(3);
  });

  it("rejects nonfinite seeds, degenerate anatomical curves and unbounded SVG complexity",()=>{
    expect(()=>anatomicalFibreTraces({...field,axis:[0,0,0,0,0,0]})).toThrow(RangeError);
    expect(()=>anatomicalFibreTraces({...field,spread:100})).toThrow(RangeError);
    expect(()=>anatomicalFibreTraces({...field,seed:-1})).toThrow(RangeError);
    expect(()=>anatomicalFibreTraces({...field,count:999})).toThrow(RangeError);
    expect(()=>anatomicalFibreTraces({...field,palette:["#ZZZZZZ","#235679","#345678"]})).toThrow(RangeError);
    expect(()=>anatomicalFibreTraces({...field,id:"../invalid"})).toThrow(RangeError);
  });

  for(const aspect of ["landscape","portrait"] as const){
    it("poses only annotated pencil lines, retaining authored silhouettes and 24-region budget in "+aspect,()=>{
      const scene=pencilCharacterScene(aspect);
      expect(inspectPencilScene(scene)).toEqual([]);
      expect(scene.actors).toHaveLength(2);
      const actors=scene.actors!;
      expect(actors.map(a=>a.parts.length)).toEqual([12,11]);
      const attached=actors.flatMap(tracks);
      expect(attached).toHaveLength(21); // 7 authored patches * 3 pigment colours
      expect(scene.drawing.regions.length+actors.reduce((sum,a)=>sum+a.parts.length,0))
        .toBe(24);
      const fo=actors[0],bird=actors[1];
      const before=evaluatePencilActorRegions(fo,187);
      const after=evaluatePencilActorRegions(fo,216);
      const headIndex=fo.parts.findIndex(p=>p.id==="head");
      expect(before[headIndex].path).toBe(after[headIndex].path);
      expect(before[headIndex].layers).toEqual(after[headIndex].layers);
      const first=before[headIndex].details?.find(t=>t.id==="brow-fur-body");
      const later=after[headIndex].details?.find(t=>t.id==="brow-fur-body");
      expect(first?.path).toBe(later?.path);
      expect(first?.transform).toMatch(/rotate\(/);
      expect(first?.transform).not.toBe(later?.transform);
      const rewind=evaluatePencilActorRegions(fo,187)[headIndex].details?.find(t=>t.id==="brow-fur-body");
      expect(rewind).toEqual(first);
      const staticActor={...fo,parts:fo.parts.map(p=>({...p,detailTracks:undefined}))};
      const fixed=evaluatePencilActorRegions(staticActor,187)[headIndex].details?.find(t=>t.id==="brow-fur-body");
      expect(fixed?.transform).toBeUndefined();
      const birdIndex=bird.parts.findIndex(p=>p.id==="near-wing");
      const birdA=evaluatePencilActorRegions(bird,174)[birdIndex];
      const birdB=evaluatePencilActorRegions(bird,192)[birdIndex];
      const markA=birdA.details?.find(t=>t.id==="folded-primaries-shadow");
      const markB=birdB.details?.find(t=>t.id==="folded-primaries-shadow");
      expect(markA?.path).toBe(markB?.path);
      expect(markA?.transform).not.toBe(markB?.transform);
      expect(markA?.transform?.includes("rotate(")).toBe(true);
      expect(evaluatePencilActorRegions(bird,192)[birdIndex]).toEqual(birdB);
      const reduced=evaluatePencilActorRegions(bird,192,true)[birdIndex];
      expect(reduced.details?.find(t=>t.id==="folded-primaries-shadow")?.transform)
        .toBe(evaluatePencilActorRegions(bird,318)[birdIndex]
          .details?.find(t=>t.id==="folded-primaries-shadow")?.transform);
    });
  }

  it("rejects missing or duplicated trace references and unsafe transforms",()=>{
    const scene=pencilCharacterScene("landscape"),actor=scene.actors![0];
    const partIndex=actor.parts.findIndex(p=>p.detailTracks?.length);
    const original=actor.parts[partIndex];
    expect(partIndex).toBeGreaterThanOrEqual(0);
    const bad={...actor,parts:actor.parts.map((p,i)=>i!==partIndex?p:{
      ...p,detailTracks:[{...original.detailTracks![0],id:"does-not-exist"}],
    })};
    expect(inspectPencilActors([bad]).join(" ")).toContain("must match");
    const duplicate={...actor,parts:actor.parts.map((p,i)=>i!==partIndex?p:{
      ...p,detailTracks:[original.detailTracks![0],original.detailTracks![0]],
    })};
    expect(inspectPencilActors([duplicate]).join(" ")).toContain("unique identifier");
    const transformed={...original.region,
      details:[...(original.region.details??[]),{
        ...original.region.details![0],transform:"translate(1,0) onload(alert(1))",
      }]};
    expect(inspectPencilDrawing({
      version:1,width:960,height:960,seed:0,paper:"#FFFCF8",paperTooth:.5,
      regions:[transformed],
    }).join(" ")).toContain("details");
  });
});


describe("ArtCraft authored contour refinement guard",()=>{
  it("keeps more anatomical curved landmarks than simplified first-generation cartoon blocks",()=>{
    for(const aspect of ["landscape","portrait"] as const){
      const scene=pencilCharacterScene(aspect);
      expect(inspectPencilScene(scene)).toEqual([]);
      const fox=scene.actors![0],bird=scene.actors![1];
      const region=(actor:typeof fox,id:string)=>{
        const match=actor.parts.find(p=>p.id===id);
        expect(match).toBeDefined();
        return match!.region;
      };
      const ruff=region(fox,"ruff");
      const muzzle=region(fox,"muzzle");
      const tailTip=region(fox,"tail-tip");
      const head=region(bird,"head");
      const cheek=region(bird,"cheek");
      const beak=region(bird,"beak");
      const coverts=region(bird,"wing-coverts");
      // New growth-compatible volumes: curved ruff/collar, tapered muzzle,
      // irregular tail-tip, non-spherical crown, folded/curved coverts.
      expect((ruff.path.match(/[CQ]/g)??[]).length).toBeGreaterThanOrEqual(10);
      expect((muzzle.path.match(/[CQ]/g)??[]).length).toBeGreaterThanOrEqual(6);
      expect((head.path.match(/[CQ]/g)??[]).length).toBeGreaterThanOrEqual(6);
      expect((coverts.path.match(/[CQ]/g)??[]).length).toBeGreaterThanOrEqual(8);
      expect((beak.path.match(/[CQ]/g)??[]).length).toBeGreaterThanOrEqual(4);
      expect((tailTip.path.match(/[CQ]/g)??[]).length).toBeGreaterThanOrEqual(8);
      expect(cheek.path.startsWith("M99 102")).toBe(true);
      expect(tailTip.layers[0].color).not.toBe("#E7D0B7");
      expect(fox.parts.flatMap(p=>p.detailTracks??[])).toHaveLength(9);
      expect(bird.parts.flatMap(p=>p.detailTracks??[])).toHaveLength(12);
      expect(scene.drawing.regions.length+fox.parts.length+bird.parts.length).toBe(24);
    }
  });
});
