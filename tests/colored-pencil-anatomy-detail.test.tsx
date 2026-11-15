import { describe, expect, it } from "vitest";
import { inspectPencilScene } from "../registry/video/colored-pencil-scene";
import { evaluatePencilActorRegions } from "../registry/video/colored-pencil-actor";
import {
  KINGFISHER_PERCHING_FEET, KINGFISHER_FOLDED_WING_AXES,
  KINGFISHER_COVERT_AXES, vaneTracts,
} from "../src/video/colored-pencil-anatomy-detail";
import { pencilCharacterScene } from "../src/video/colored-pencil-character-rebuild";
import { pencilWildlifeScene } from "../src/video/colored-pencil-wildlife";

const bezier=(a:readonly number[],t:number):readonly[number,number]=>{
  const q=1-t;
  return [q*q*a[0]+2*q*t*a[2]+t*t*a[4],
    q*q*a[1]+2*q*t*a[3]+t*t*a[5]];
};

describe("ArtCraft coloured-pencil anatomical fidelity contract",()=>{
  it("connects six short tarsus/anterior/hallux masses, not a cartoon two-prong Y",()=>{
    const toes=KINGFISHER_PERCHING_FEET;
    expect((toes.path.match(/M/g)??[])).toHaveLength(6);
    expect((toes.path.match(/Z/g)??[])).toHaveLength(6);
    expect(toes.details).toHaveLength(5);
    expect(toes.bounds).toEqual([98,178,72,51]);
    expect(toes.contactY).toBeGreaterThanOrEqual(215);
    expect(toes.contactY).toBeLessThanOrEqual(222);
    expect(toes.details.filter(t=>t.path.includes("Q")).length).toBe(5);
    expect(toes.details.some(t=>t.width<.6)).toBe(true);
    expect(toes.path).not.toMatch(/NaN|Infinity/);
  });

  it("roots every barb on its own curved rachis at four known shaft parameters",()=>{
    const tracks=vaneTracts(KINGFISHER_FOLDED_WING_AXES,"#C7DAD8",226);
    expect(tracks).toHaveLength(7);
    const again=vaneTracts(KINGFISHER_FOLDED_WING_AXES,"#C7DAD8",226);
    expect(tracks).toEqual(again);
    for(const [i,t]of tracks.entries()){
      const groups=[...t.path.matchAll(/M(-?\d+\.\d+) (-?\d+\.\d+) Q(-?\d+\.\d+) (-?\d+\.\d+) (-?\d+\.\d+) (-?\d+\.\d+)/g)];
      expect(groups).toHaveLength(9); // rachis + 4 opposing vane pairs
      const a=KINGFISHER_FOLDED_WING_AXES[i];
      const first=groups[0].slice(1).map(Number);
      expect(first[0]).toBeCloseTo(a[0],2);
      expect(first[1]).toBeCloseTo(a[1],2);
      expect(first[4]).toBeCloseTo(a[4],2);
      expect(first[5]).toBeCloseTo(a[5],2);
      for(const [k,u]of [.25,.43,.61,.78].entries()){
        const [x,y]=bezier(a,u);
        for(const part of groups.slice(1+k*2,3+k*2)){
          expect(Math.abs(Number(part[1])-x)).toBeLessThan(.011);
          expect(Math.abs(Number(part[2])-y)).toBeLessThan(.011);
        }
      }
      expect(t.path).not.toMatch(/NaN|Infinity/);
      expect(t.startFrame).toBe(226+i*2);
    }
    expect(vaneTracts(KINGFISHER_COVERT_AXES,"#CBE7DB",229)).toHaveLength(4);
  });

  it("rejects degenerate and unbounded feather axes before generating invalid SVG",()=>{
    expect(()=>vaneTracts([],"#FFFFFF")).toThrow(RangeError);
    expect(()=>vaneTracts(KINGFISHER_FOLDED_WING_AXES,"red")).toThrow(RangeError);
    expect(()=>vaneTracts([[0,0,0,0,0,0,3]],"#FFFFFF")).toThrow(RangeError);
    expect(()=>vaneTracts([[0,0,0,0,18,25,11]],"#FFFFFF")).toThrow(RangeError);
    expect(()=>vaneTracts(KINGFISHER_COVERT_AXES,"#FFFFFF",400)).toThrow(RangeError);
  });

  for(const aspect of ["landscape","portrait"] as const){
    it("integrates keratin feet and articulated covert barbs in "+aspect+" film",()=>{
      const wildlife=pencilWildlifeScene({aspect,detail:"full"});
      const scene=pencilCharacterScene(aspect);
      expect(inspectPencilScene(wildlife)).toEqual([]);
      expect(inspectPencilScene(scene)).toEqual([]);
      const actors=[wildlife.actors![0],scene.actors![1]];
      for(const actor of actors){
        const feet=actor.parts.find(p=>p.id==="feet")!;
        expect(feet.region.path).toBe(KINGFISHER_PERCHING_FEET.path);
        expect(feet.region.opaqueSupport).toBe(true);
        expect(feet.region.clipDetails).toBe(true);
        expect(feet.region.layers.map(l=>l.texture))
          .toEqual(["hatch","hatch","stipple"]);
        const main=actor.parts.find(p=>p.id==="near-wing")!;
        const coverts=actor.parts.find(p=>p.id==="wing-coverts")!;
        expect(main.region.details!.some(d=>(d.path.match(/ Q/g)??[]).length===9))
          .toBe(true);
        expect(coverts.region.details!.some(d=>(d.path.match(/ Q/g)??[]).length===9))
          .toBe(true);
        const footAt=(f:number)=>evaluatePencilActorRegions(actor,f)
          .find(r=>r.id==="kingfisher-feet")!.transform;
        expect(footAt(180)).toBe(footAt(260)); // planted despite wing pose
      }
      const fox=scene.actors![0];
      // A real quadruped has a far hind and far front leg, despite the rig
      // budget grouping both planted dark limbs into one CP3 pigment region.
      expect((fox.parts.find(p=>p.id==="far-foreleg")!.region.path.match(/M/g)??[])
        .length).toBe(2);
      expect(fox.parts.find(p=>p.id==="muzzle")!.region.clipDetails).toBe(false);
      expect(fox.parts.find(p=>p.id==="muzzle")!.region.details!
        .some(d=>d.path.includes("270 124"))).toBe(true);
      expect(scene.actors!.reduce((sum,a)=>sum+a.parts.length,0)
        +scene.drawing.regions.length).toBe(24);
    });
  }
});
