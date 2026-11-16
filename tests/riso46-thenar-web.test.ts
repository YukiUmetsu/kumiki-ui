import {describe,expect,it} from "vitest";
import {COURIER} from "../src/video/riso-character-demo";
import {PAPER_ARTIST,evaluateRisoHumanEnsemble} from "../src/video/riso-human-ensemble";
import {riso46ThenarWebParts,inspectRiso46ThenarWeb}
  from "../src/video/riso46-thenar-web";
import {inspectRiso44PrintedIndexContact}
  from "../src/video/riso44-source-index-paper-contact";
import {evaluateRisoCharacter,inspectRisoCharacter}
  from "../registry/video/riso-character";

const actors=[COURIER,PAPER_ARTIST] as const;
const sides=["left","right"] as const;

describe("RISO46 ArtCraft / original sculpted thenar and moving web print",()=>{
  it("keeps both complete original actor specs valid, without a third ink plate",()=>{
    for(const actor of actors){
      expect(inspectRisoCharacter(actor,["blue","red"]),actor.id).toEqual([]);
      expect(new Set(actor.parts.map(p=>p.id)).size).toBe(actor.parts.length);
    }
  });

  it.each(actors)("live %s contains three distinct original spot-master forms per thumb",actor=>{
    for(const side of sides){
      const source=riso46ThenarWebParts(actor.id as "courier"|"paper-artist",side);
      expect(source).toHaveLength(3);
      expect(source.map(p=>p.plate).sort()).toEqual(["blue","blue","red"]);
      expect(source.every(p=>p.paint==="screen"&&
        (p.screenTone==="light"||p.screenTone==="mid"))).toBe(true);
      expect(source.filter(p=>p.joint===side+"-thumb")).toHaveLength(2);
      expect(source.filter(p=>p.joint===side+"-hand")).toHaveLength(1);
      expect(source.every(p=>p.d.match(/C/g)?.length && p.d.endsWith("Z"))).toBe(true);
      for(const part of source){
        const stamped=actor.parts.find(p=>p.id===part.id);
        expect(stamped?.d,part.id).toBe(part.d);
        expect(stamped?.joint,part.id).toBe(part.joint);
        expect(stamped?.plate,part.id).toBe(part.plate);
      }
    }
  });

  it("redraws actual proximal RED CMC contours, preserves distal opposition and partner individuality",()=>{
    const a=COURIER.parts.find(p=>p.id==="right-glove-thumb")!;
    const b=COURIER.parts.find(p=>p.id==="left-glove-thumb")!;
    expect(a.paint).toBe("solid");
    expect(b.paint).toBe("solid");
    expect(a.plate).toBe("red");
    expect(b.plate).toBe("red");
    expect((a.d.match(/C/g)??[]).length).toBeGreaterThanOrEqual(4);
    expect((b.d.match(/C/g)??[]).length).toBeGreaterThanOrEqual(4);
    expect(a.d).not.toBe(b.d);
    for(const side of sides){
      const id=side+"-glove-thumb-distal-phalanx";
      expect(COURIER.parts.find(p=>p.id===id)?.d).toBe(
        PAPER_ARTIST.parts.find(p=>p.id===id)?.d);
    }
    expect(riso46ThenarWebParts("courier","right")[0].d)
      .not.toBe(riso46ThenarWebParts("paper-artist","right")[0].d);
  });

  it("carries the source engraving through the same physical 240-cel moving joints",()=>{
    for(const actor of actors)for(const side of sides)
      for(let frame=0;frame<240;frame+=2){
        const qa=inspectRiso46ThenarWeb(actor,frame,side);
        expect(qa.sourceCount).toBe(3);
        expect(qa.redStamps).toBe(1);
        expect(qa.blueStamps).toBe(2);
        expect(qa.authoredCubicTurns).toBeGreaterThan(5);
        expect(qa.independentThumbAndPalmTransforms).toBe(true);
        expect(qa.physicalTwoInks).toEqual(["blue","red"]);
        const parts=evaluateRisoCharacter(actor,frame).parts;
        expect(parts.find(p=>p.id===side+"-glove-thumb-radial-incisions")?.transform)
          .toBe(parts.find(p=>p.id===side+"-glove-thumb-radial-volume")?.transform);
      }
  });

  it.each(["landscape","portrait"] as const)(
    "%s: native moving two-ink paper pinch and genuine over/under contact retained",
    aspect=>{
      for(const frame of [160,166,177,186,202,239]){
        const film=evaluateRisoHumanEnsemble(frame,aspect);
        const donor=inspectRiso44PrintedIndexContact(COURIER,frame,"right",
          film.first,film.sheet);
        const receiver=inspectRiso44PrintedIndexContact(PAPER_ARTIST,frame,"left",
          film.second,film.sheet);
        expect(donor.thumbUnderPaper).toBe(true);
        expect(receiver.thumbUnderPaper).toBe(true);
        expect(donor.indexRedSourceCount).toBe(3);
        expect(receiver.indexRedSourceCount).toBe(3);
        if(frame===160||frame===166){
          expect(donor.redIndexAreaTouchesPaper).toBe(true);
          expect(receiver.redIndexAreaTouchesPaper).toBe(true);
        }
      }
    });
});
