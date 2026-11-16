import {describe,expect,it} from "vitest";
import {evaluateRisoCharacter} from "../registry/video/riso-character";
import {COURIER} from "../src/video/riso-character-demo";
import {PAPER_ARTIST,evaluateRisoHumanEnsemble} from "../src/video/riso-human-ensemble";
import {riso46ThenarSource,RISO46_THENAR_TOPOLOGY} from "../src/video/riso46-thenar-source";
import {riso43FrontIndexIds,inspectRiso43PrintDepth} from "../src/video/riso43-physical-paper-depth";
import {inspectRiso44PrintedIndexContact} from "../src/video/riso44-source-index-paper-contact";

const actors=[COURIER,PAPER_ARTIST] as const;
const sides=["left","right"] as const;
const stages=[0,126,144,154,156,160,166,186,205,239] as const;

describe("RISO46 ArtCraft source-built thenar web and preserved physical print depth",()=>{
  it("locates source geometry at the original thumb CMC and index MCP, with actual curved contours",()=>{
    for(const side of sides){
      const p=riso46ThenarSource("courier",side);
      const handed=side==="right"?1:-1;
      expect(p.thumbCmc.x).toBeCloseTo(7.1*handed,5);
      expect(p.thumbCmc.y).toBe(-3);
      expect(p.indexMcp.x).toBeCloseTo(6*handed,5);
      expect(p.indexMcp.y).toBe(5);
      expect(RISO46_THENAR_TOPOLOGY.projection).toContain("NOT validated");
      expect(p.red.match(/C/g)?.length).toBeGreaterThanOrEqual(9);
      expect(p.blue.match(/C/g)?.length).toBeGreaterThanOrEqual(5);
      expect(p.plateCount).toBe(2);
    }
  });

  it("prints independent two-actor originals without deleting original physical ink or detail",()=>{
    for(const side of sides){
      const courier=riso46ThenarSource("courier",side);
      const artist=riso46ThenarSource("paper-artist",side);
      expect(courier.red).not.toBe(artist.red);
      expect(courier.blue).not.toBe(artist.blue);
      for(const actor of actors){
        const source=riso46ThenarSource(actor.id as "courier"|"paper-artist",side);
        const red=actor.parts.find(p=>p.id===side+"-glove-thenar-plane")!;
        const blue=actor.parts.find(p=>p.id===side+"-glove-thenar-fold")!;
        expect(red).toBeDefined();
        expect(blue).toBeDefined();
        expect(red.plate).toBe("red");
        expect(red.joint).toBe(side+"-palm-surface");
        expect(red.paint).toBe("screen");
        expect(red.d).toContain(source.red);
        expect(red.d.length).toBeGreaterThan(source.red.length);
        expect(blue.plate).toBe("blue");
        expect(blue.joint).toBe(side+"-palm-surface");
        expect(blue.paint).toBe("screen");
        expect(blue.d).toContain(source.blue);
        expect(blue.d.length).toBeGreaterThan(source.blue.length);
      }
    }
  });

  it("the paired source ink moves with the same live palm and stays behind the opaque page",()=>{
    for(const actor of actors)for(const side of sides){
      const prior=actor.parts.length;
      for(const frame of stages){
        const pose=evaluateRisoCharacter(actor,frame);
        const red=pose.parts.find(p=>p.id===side+"-glove-thenar-plane")!;
        const blue=pose.parts.find(p=>p.id===side+"-glove-thenar-fold")!;
        expect(red.transform).toMatch(/^matrix\(/);
        expect(red.transform).toBe(blue.transform);
        expect(red.plate).toBe("red");
        expect(blue.plate).toBe("blue");
        expect(pose.parts).toHaveLength(prior);
        const depth=inspectRiso43PrintDepth(actor,frame,side);
        expect(depth.underRedIds).toContain(red.id);
        expect(depth.aboveIds).not.toContain(red.id);
        expect(depth.aboveIds).not.toContain(blue.id);
        expect(riso43FrontIndexIds(side)).not.toContain(red.id);
        expect(depth.originalThumbIPBehindPaper).toBe(true);
      }
    }
  });

  it.each(["landscape","portrait"] as const)("original red index still touches paper and thumb remains below (%s)",aspect=>{
    for(const frame of [160,166]){
      const state=evaluateRisoHumanEnsemble(frame,aspect);
      const first=inspectRiso44PrintedIndexContact(COURIER,frame,"right",state.first,state.sheet);
      const receiver=inspectRiso44PrintedIndexContact(PAPER_ARTIST,frame,"left",state.second,state.sheet);
      expect(first.thumbUnderPaper).toBe(true);
      expect(receiver.thumbUnderPaper).toBe(true);
      expect(first.redIndexAreaTouchesPaper).toBe(true);
      expect(receiver.redIndexAreaTouchesPaper).toBe(true);
    }
  });
});
