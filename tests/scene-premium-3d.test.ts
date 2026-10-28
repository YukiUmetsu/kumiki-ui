import { describe, expect, it } from "vitest";
import { Mesh, MeshPhysicalMaterial } from "three";
import { DEMO_SCENES } from "../src/components/video/scene-template-fixtures";
import { createCutawayHero } from "../src/components/video/scene-cutaway-3d";
import { createPhysicalGlassAsset, physicalGlassPose } from "../src/components/video/scene-glass-3d";
import { paperCurlPose, deformPaperVertex, deformPaperPositions } from "../registry/craft/paper-curl";
import { createBookHero3D } from "../src/components/video/scene-book-3d";

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
  it("paper remains fixed at spine and bends at the interior, independent of seek order",()=>{
    const flat=paperCurlPose(0,0,24);
    const mid=paperCurlPose(12,0,24);
    const end=paperCurlPose(24,0,24);
    expect(flat.curl).toBeCloseTo(0);
    expect(mid.curl).toBeGreaterThan(.9);
    expect(end.curl).toBeCloseTo(0);
    expect(mid.angleRadians).toBeCloseTo(Math.PI/2);
    const width=2;
    const spine=deformPaperVertex(0,0,width,mid);
    const interior=deformPaperVertex(1,0,width,mid);
    expect(spine[0]).toBe(0);
    expect(spine[2]).toBeCloseTo(0);
    expect(interior[2]).toBeGreaterThan(.2);
    const rest=new Float32Array([0,0,0,1,0,0,2,0,0]);
    const out=new Float32Array(rest.length);
    deformPaperPositions(rest,out,width,mid);
    expect(out[5]).toBeGreaterThan(.2);
    deformPaperPositions(rest,out,width,flat);
    expect([...out]).toEqual([...rest]);
    deformPaperPositions(rest,out,width,mid);
    expect(out[5]).toBeGreaterThan(.2);
  });
  it("physical book has distinct page faces, mesh curvature and deterministic turn poses",()=>{
    const spec=DEMO_SCENES["page-turn-story"];
    const book=createBookHero3D(spec);
    try{
      const front=book.parts.get("turning-front-page") as Mesh;
      const back=book.parts.get("turning-back-page") as Mesh;
      expect(front.geometry).toBe(back.geometry);
      expect(front.material).not.toBe(back.material);
      expect(front.geometry.attributes.position.count).toBeGreaterThan(500);
      book.pose?.({id:"turn-pages",frame:0,fps:30});
      expect(front.parent?.visible).toBe(false);
      book.pose?.({id:"turn-pages",frame:54,fps:30});
      expect(front.parent?.visible).toBe(true);
      const vertices=new Float32Array(front.geometry.attributes.position.array);
      const angle=front.parent!.rotation.y;
      expect(Math.abs(angle)).toBeGreaterThan(.1);
      book.pose?.({id:"turn-pages",frame:119,fps:30});
      book.pose?.({id:"turn-pages",frame:54,fps:30});
      expect(front.parent!.rotation.y).toBeCloseTo(angle);
      expect([...front.geometry.attributes.position.array]).toEqual([...vertices]);
      book.pose?.({id:"static",frame:54,fps:30});
      expect(front.parent?.visible).toBe(false);
    }finally{book.dispose();}
  });

});
