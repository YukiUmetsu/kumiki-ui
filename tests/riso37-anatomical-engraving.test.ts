import {describe,expect,it} from "vitest";
import {flattenRisoSvgPath,risoContourSignedArea} from "../registry/video/riso-path-geometry";
import {inspectRisoCharacter,evaluateRisoCharacter} from "../registry/video/riso-character";
import {COURIER} from "../src/video/riso-character-demo";
import {PAPER_ARTIST} from "../src/video/riso-human-ensemble";
import {riso31FingerParts} from "../src/video/riso31-finger-phalanges";
import {riso32ThumbInkParts} from "../src/video/riso32-thumb-ip";
import {inspectRiso36RedFingerSilhouettes} from "../src/video/riso36-red-silhouette-gate";
import {refineRiso37SourceEngraving,riso37ProximalPressureStrands} from "../src/video/riso37-anatomical-engraving";

const actors=[COURIER,PAPER_ARTIST] as const;
const sides=["left","right"] as const;
const digits=["index","middle","ring","pinky"] as const;
const frames=[0,46,96,126,144,156,160,166,178,186,198,239] as const;
describe("RISO37 ArtCraft / physical hand ink master and source-geometry craftsmanship",()=>{
  it("replaces broad fixed palm bar with four individually contoured MCP arches",()=>{
    for(const actor of actors)for(const side of sides){
      const p=actor.parts.find(p=>p.id===side+"-glove-knuckle-arc")!;
      expect(p.joint).toBe(side+"-palm-surface");
      expect(p.plate).toBe("blue");
      expect(p.paint).toBe("solid");
      const curves=flattenRisoSvgPath(p.d,.15);
      expect(curves.length).toBe(4);
      for(const shape of curves){
        expect(shape.closed).toBe(true);
        expect(shape.points.length).toBeGreaterThan(5);
        expect(Math.abs(risoContourSignedArea(shape.points))).toBeGreaterThan(.08);
        expect(Math.abs(risoContourSignedArea(shape.points))).toBeLessThan(4.5);
      }
      const wrist=actor.parts.find(p=>p.id===side+"-glove-wrist-crease")!;
      expect(wrist.paint).toBe("screen");
      expect(wrist.screenTone).toBe("mid");
      expect(flattenRisoSvgPath(wrist.d,.15)).toHaveLength(2);
      // Neither of the original solid black triangular glove highlights may
      // survive in the new palm: both are new source curved, screened marks.
      const wristDetail=actor.parts.find(p=>p.id===side+"-glove-detail")!;
      const thumbWeb=actor.parts.find(p=>p.id===side+"-glove-thumb-fold")!;
      expect(wristDetail.paint).toBe("screen");
      expect(wristDetail.screenTone).toBe("mid");
      expect(wristDetail.joint).toBe(side+"-hand");
      expect(flattenRisoSvgPath(wristDetail.d,.15)).toHaveLength(4);
      expect(thumbWeb.paint).toBe("screen");
      expect(thumbWeb.screenTone).toBe("mid");
      expect(thumbWeb.joint).toBe(side+"-hand");
      expect(flattenRisoSvgPath(thumbWeb.d,.15)).toHaveLength(2);
      const thenar=actor.parts.find(p=>p.id===side+"-glove-thenar-fold")!;
      expect(thenar.joint).toBe(side+"-palm-surface");
      expect(thenar.screenTone).toBe("mid");
      expect(flattenRisoSvgPath(thenar.d,.15)).toHaveLength(2);
    }
  });
  it("keeps each original moving knuckle and nail on its real articulated phalanx",()=>{
    for(const actor of actors)for(const side of sides)for(const digit of digits){
      const src=actor.parts;
      const nail=src.find(p=>p.id===side+"-glove-"+digit+"-nail")!;
      const pip=src.find(p=>p.id===side+"-glove-"+digit+"-joint-crease")!;
      const dip=src.find(p=>p.id===side+"-glove-"+digit+"-dip-crease")!;
      const tendon=src.find(p=>p.id===side+"-glove-"+digit+"-dorsal-plane")!;
      expect(nail.joint).toBe(side+"-"+digit+"-dip");
      expect(pip.joint).toBe(side+"-"+digit+"-pip");
      expect(dip.joint).toBe(side+"-"+digit+"-dip");
      expect(tendon.joint).toBe(side+"-"+digit);
      expect(nail.paint).toBe("screen");
      expect(nail.screenTone).toBe("mid");
      expect(dip.paint).toBe("screen");
      expect(dip.screenTone).toBe("light");
      expect(pip.paint).toBe("solid");
      expect(tendon.paint).toBe("screen");
      expect(tendon.screenTone).toBe("light");
      expect(flattenRisoSvgPath(pip.d,.15)).toHaveLength(3);
      expect(flattenRisoSvgPath(dip.d,.15)).toHaveLength(3);
      expect(flattenRisoSvgPath(nail.d,.15)).toHaveLength(2);
      expect(flattenRisoSvgPath(tendon.d,.15)).toHaveLength(2);
      for(const p of [pip,dip,nail,tendon]){
        expect(p.plate).toBe("blue");
        for(const c of flattenRisoSvgPath(p.d,.15)){
          expect(c.closed,p.id).toBe(true);
          expect(Math.abs(risoContourSignedArea(c.points)),p.id).toBeGreaterThan(.001);
        }
      }
    }
  });
  it("leaves all original connected vermilion phalanx paths untouched",()=>{
    for(const actor of actors)for(const side of sides){
      for(const digit of digits){
        for(const expected of riso31FingerParts(side,digit)){
          const actual=actor.parts.find(p=>p.id===expected.id)!;
          expect(actual.joint).toBe(expected.joint);
          expect(actual.d).toBe(expected.d);
          expect(actual.plate).toBe("red");
          expect(actual.paint).toBe("solid");
        }
      }
      for(const expected of riso32ThumbInkParts(side)){
        const actual=actor.parts.find(p=>p.id===expected.id)!;
        expect(actual.d).toBe(expected.d);
        expect(actual.joint).toBe(expected.joint);
      }
    }
  });
  it("rejects source-nail stickers and detached decorative tendons",()=>{
    const base={id:"left-glove-index-nail",joint:"left-index-dip",plate:"blue" as const,
      paint:"solid" as const,d:"M0 0 L3 0 L3 1 Z"};
    const drawn=refineRiso37SourceEngraving(base,"courier","left");
    expect(drawn.joint).toBe(base.joint);
    expect(drawn.d).not.toEqual(base.d);
    expect(drawn.paint).toBe("screen");
    for(const side of sides){
      const source=riso37ProximalPressureStrands("paper-artist",side);
      expect(source.length).toBe(4);
      expect(new Set(source.map(p=>p.id)).size).toBe(4);
      expect(source.every(p=>p.joint===p.id.replace("-glove-","-").replace("-dorsal-plane",""))).toBe(true);
    }
  });
  it.each(actors)("%s: original rig remains valid throughout handoff and both hands",actor=>{
    expect(inspectRisoCharacter(actor)).toEqual([]);
    for(const frame of frames){
      const posed=evaluateRisoCharacter(actor,frame);
      for(const side of sides){
        const pressure=posed.parts.filter(p=>p.id.startsWith(side+"-glove-")&&
          (p.id.endsWith("-dorsal-plane")||p.id.endsWith("-nail")||
          p.id.endsWith("-joint-crease")||p.id.endsWith("-dip-crease")));
        expect(pressure.length).toBeGreaterThanOrEqual(16);
        expect(pressure.every(p=>p.plate==="blue"&&p.transform.startsWith("matrix("))).toBe(true);
        const red=inspectRiso36RedFingerSilhouettes(actor,frame,side);
        expect(red.sourcePartCount).toBe(12);
        expect(Number.isFinite(red.minimumDistalGap)).toBe(true);
      }
    }
  });
});
