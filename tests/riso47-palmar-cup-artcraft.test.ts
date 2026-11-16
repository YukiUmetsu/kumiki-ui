import {describe,expect,it} from "vitest";
import {flattenRisoSvgPath,risoContourSignedArea} from "../registry/video/riso-path-geometry";
import {evaluateRisoCharacter,inspectRisoCharacter} from "../registry/video/riso-character";
import {COURIER} from "../src/video/riso-character-demo";
import {PAPER_ARTIST,evaluateRisoHumanEnsemble} from "../src/video/riso-human-ensemble";
import {riso47PalmContour,RISO47_PALM_RECONSTRUCTION} from "../src/video/riso47-palmar-cup";
import {inspectRiso33HandFan} from "../src/video/riso33-hand-negative-space";
import {inspectRiso43PrintDepth} from "../src/video/riso43-physical-paper-depth";
import {inspectRiso44PrintedIndexContact} from "../src/video/riso44-source-index-paper-contact";
import {inspectRiso42SupportingDigits} from "../src/video/riso42-support-digits-gesture";

const actors=[COURIER,PAPER_ARTIST] as const;
const sides=["left","right"] as const;

describe("RISO47 source-authored real palm silhouette and tucked support",()=>{
  it("gives each existing hand an original closed positive metacarpal and thumb buttress, not a raster mask",()=>{
    expect(RISO47_PALM_RECONSTRUCTION.medium).toContain("red Risograph");
    for(const actor of actors)for(const side of sides){
      const path=riso47PalmContour(actor.id as "courier"|"paper-artist",side);
      const part=actor.parts.find(p=>p.id===side+"-glove")!;
      expect(part).toBeDefined();
      expect(part.joint).toBe(side+"-hand");
      expect(part.plate).toBe("red");
      expect(part.paint).toBe("solid");
      expect(part.d).toBe(path);
      expect(path.match(/C/g)?.length).toBeGreaterThanOrEqual(14);
      const contours=flattenRisoSvgPath(path,.15);
      expect(contours).toHaveLength(1);
      expect(contours[0].closed).toBe(true);
      expect(contours[0].points.length).toBeGreaterThan(30);
      expect(Math.abs(risoContourSignedArea(contours[0].points))).toBeGreaterThan(180);
    }
    for(const side of sides)
      expect(riso47PalmContour("courier",side)).not.toBe(riso47PalmContour("paper-artist",side));
    for(const actor of ["courier","paper-artist"] as const)
      expect(riso47PalmContour(actor,"left")).not.toBe(riso47PalmContour(actor,"right"));
  });

  it("retains existing ANAT1 finger skeleton, original two plates and all physical engravings",()=>{
    for(const actor of actors){
      expect(inspectRisoCharacter(actor)).toEqual([]);
      for(const side of sides){
        expect(actor.parts.filter(p=>p.id.startsWith(side+"-glove-")).length).toBeGreaterThanOrEqual(36);
        for(const id of ["thenar-plane","thenar-fold","knuckle-arc","thumb-nail","index-nail"]){
          const p=actor.parts.find(p=>p.id===side+"-glove-"+id);
          expect(p,actor.id+"/"+side+"/"+id).toBeDefined();
          expect(p?.d.length).toBeGreaterThan(30);
        }
        expect(new Set(actor.parts.filter(p=>p.id.startsWith(side+"-glove")).map(p=>p.plate)))
          .toEqual(new Set(["red","blue"]));
      }
    }
  });

  it("keeps source print rig and 240-frame original letter depth while support fingers fold",()=>{
    for(const actor of actors)for(const side of sides){
      for(const frame of [0,92,144,154,156,160,166,177,186,198,239]){
        const pose=evaluateRisoCharacter(actor,frame);
        const palm=pose.parts.find(p=>p.id===side+"-glove")!;
        expect(palm.transform).toMatch(/^matrix\(/);
        expect(palm.plate).toBe("red");
        const depth=inspectRiso43PrintDepth(actor,frame,side);
        expect(depth.aboveIds).not.toContain(palm.id);
        expect(depth.originalThumbIPBehindPaper).toBe(true);
        const support=inspectRiso42SupportingDigits(actor,frame,side);
        expect(support.movingRedSourceCount).toBe(9);
        expect(inspectRiso33HandFan(actor,frame,side).minimumAxisGap).toBeGreaterThan(3);
      }
    }
    for(const aspect of ["landscape","portrait"] as const)
      for(const frame of [160,166]){
        const film=evaluateRisoHumanEnsemble(frame,aspect);
        for(const [actor,side,placement] of [
          [COURIER,"right",film.first],
          [PAPER_ARTIST,"left",film.second],
        ] as const){
          const ink=inspectRiso44PrintedIndexContact(actor,frame,side,placement,film.sheet);
          expect(ink.redIndexAreaTouchesPaper).toBe(true);
          expect(ink.thumbUnderPaper).toBe(true);
        }
      }
  });
});
