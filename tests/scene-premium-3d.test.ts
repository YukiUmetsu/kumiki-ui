import { describe, expect, it } from "vitest";
import { Mesh, MeshPhysicalMaterial } from "three";
import { DEMO_SCENES } from "../src/components/video/scene-template-fixtures";
import { createCutawayHero } from "../src/components/video/scene-cutaway-3d";
import { createPhysicalGlassAsset, physicalGlassPose } from "../src/components/video/scene-glass-3d";

describe("Actual premium mesh stage contracts",()=>{
  it("assembles unique semantic cutaway layers as solid, named 3D meshes",()=>{
    const spec=DEMO_SCENES["layered-cutaway"];
    const hero=createCutawayHero(spec);
    try {
      expect(hero.parts.size).toBeGreaterThanOrEqual(spec.content.layers.length);
      for(const layer of spec.content.layers){
        const part=hero.parts.get(layer.id);
        expect(part).toBeInstanceOf(Mesh);
        expect((part as Mesh).geometry.type).toContain("BoxGeometry");
      }
    } finally {hero.dispose();}
  });
  it("explodes real 3D layers deterministically and restores exact earlier poses",()=>{
    const hero=createCutawayHero(DEMO_SCENES["layered-cutaway"]);
    try{
      const first=hero.parts.get("shell") as Mesh;
      const third=hero.parts.get("center") as Mesh;
      expect(first).toBeDefined();
      hero.pose?.({id:"explode",frame:0,fps:30});
      const start=[first.position.y,third.position.y];
      hero.pose?.({id:"explode",frame:90,fps:30});
      expect(first.position.y).toBeGreaterThan(start[0]+.5);
      expect(third.position.y).toBeCloseTo(start[1],6);
      hero.pose?.({id:"explode",frame:0,fps:30});
      expect([first.position.y,third.position.y]).toEqual(start);
    } finally{hero.dispose();}
  });
  it("constructs real transmissive dielectric material, not backdrop blur",()=>{
    const spec=DEMO_SCENES["glass-data-reveal"];
    const hero=createPhysicalGlassAsset(spec);
    try{
      const panes=spec.content.panels.map(panel=>hero.parts.get("optical-pane-"+panel.id));
      expect(panes).toHaveLength(spec.content.panels.length);
      for(const pane of panes){
        expect(pane).toBeInstanceOf(Mesh);
        const material=(pane as Mesh).material as MeshPhysicalMaterial;
        expect(material.transmission).toBeGreaterThan(.8);
        expect(material.ior).toBeGreaterThan(1.3);
        expect(material.thickness).toBeGreaterThan(0);
      }
    }finally{hero.dispose();}
  });
  it("moves panes with independently staggered, seekable 3D trajectories",()=>{
    const hero=createPhysicalGlassAsset(DEMO_SCENES["glass-data-reveal"]);
    try {
      const first=hero.parts.get("optical-pane-stats") as Mesh;
      const second=hero.parts.get("optical-pane-meaning") as Mesh;
      hero.pose?.({id:"introduce",frame:0,fps:30});
      const start=first.position.clone();
      hero.pose?.({id:"introduce",frame:36,fps:30});
      expect(first.position.x).not.toBeCloseTo(start.x);
      expect(first.position.z).not.toBeCloseTo(start.z);
      expect(physicalGlassPose(36,0).progress).toBeGreaterThan(physicalGlassPose(36,1).progress);
      hero.pose?.({id:"introduce",frame:119,fps:30});
      const complete=first.position.clone();
      hero.pose?.({id:"introduce",frame:0,fps:30});
      expect(first.position.x).toBeCloseTo(start.x);
      expect(first.position.y).toBeCloseTo(start.y);
      hero.pose?.({id:"introduce",frame:119,fps:30});
      expect(first.position.distanceTo(complete)).toBeCloseTo(0);
      expect(second.position.x).toBeCloseTo(0,2);
    }finally{hero.dispose();}
  });
});
