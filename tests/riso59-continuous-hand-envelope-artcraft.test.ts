import {describe,expect,it} from "vitest";
import {evaluateRisoCharacter,inspectRisoCharacter}
  from "../registry/video/riso-character";
import {flattenRisoSvgPath,risoContourSignedArea}
  from "../registry/video/riso-path-geometry";
import {COURIER} from "../src/video/riso-character-demo";
import {PAPER_ARTIST} from "../src/video/riso-human-ensemble";
import {RISO59_HAND_ENVELOPE,riso59PreviewContact}
  from "../src/video/riso59-continuous-hand-envelope";

const original=[
  {actor:"courier" as const,spec:COURIER,side:"right" as const,inactive:"left"},
  {actor:"paper-artist" as const,spec:PAPER_ARTIST,side:"left" as const,inactive:"right"},
];

describe("RISO59: independent ANAT1 continuous support-crest physical-print candidate",()=>{
  it("reconstructs THREE distinct living 3D PIP soft tissue crests, bounded without actor crossover",()=>{
    for(const {actor,spec,side} of original){
      const a=riso59PreviewContact(spec,actor);
      expect(a.side).toBe(side);
      expect(a.crestShifts.map(x=>x.digit)).toEqual(["middle","ring","pinky"]);
      expect(a.crestShifts.every(x=>Number.isFinite(x.clinicalDepth)&&
        x.distance>0&&x.distance<=RISO59_HAND_ENVELOPE.maximumCrestMove)).toBe(true);
      expect(a.crestShifts.some(x=>x.distance>=.1)).toBe(true);
      expect(new Set(a.crestShifts.map(x=>x.dx+","+x.dy)).size).toBe(3);
      expect(()=>riso59PreviewContact(spec,actor==="courier"?"paper-artist":"courier"))
        .toThrow(/actor/);
    }
    expect(RISO59_HAND_ENVELOPE.previewOnly).toBe(true);
  });

  it("sculpts the same ONE 16-cubic C1 red original source instead of adding a sticker",()=>{
    for(const {actor,spec,side} of original){
      const candidate=riso59PreviewContact(spec,actor);
      const originalIds=spec.parts.map(p=>p.id);
      expect(candidate.spec.parts.map(p=>p.id)).toEqual(originalIds);
      expect(candidate.changedPartIds).toHaveLength(4);
      expect(new Set(candidate.changedPartIds).size).toBe(4);
      expect(inspectRisoCharacter(candidate.spec,["red","blue"])).toEqual([]);
      const originalPalm=spec.parts.find(p=>p.id===side+"-glove")!;
      const nextPalm=candidate.spec.parts.find(p=>p.id===side+"-glove")!;
      expect(nextPalm.d).toBe(originalPalm.d);
      expect(nextPalm.plate).toBe("red");
      expect(nextPalm.pathKeys?.map(k=>k.frame)).toEqual([0,146,160,180,205,239]);
      expect(nextPalm.pathKeys?.[0].d).toBe(originalPalm.d);
      expect(nextPalm.pathKeys?.[2].d).toBe(candidate.contactContour);
      expect((candidate.contactContour.match(/C/g)??[])).toHaveLength(16);
      const shape=flattenRisoSvgPath(candidate.contactContour,.12);
      expect(shape).toHaveLength(1);
      expect(shape[0].closed).toBe(true);
      expect(Math.abs(risoContourSignedArea(shape[0].points))).toBeGreaterThan(80);
      expect(candidate.contactContour).toMatch(/^M[-\d. ]+ C/);
      expect(candidate.contactContour).not.toMatch(/<|foreignObject|image|opacity|NaN|Infinity/);
    }
  });

  it("preserves actor identity, all original bones and detailed two-ink plates across animation",()=>{
    for(const {actor,spec,side,inactive} of original){
      const result=riso59PreviewContact(spec,actor);
      for(const frame of [0,126,144,154,156,160,166,178,205,239]){
        const prior=evaluateRisoCharacter(spec,frame);
        const next=evaluateRisoCharacter(result.spec,frame);
        expect(next.parts).toHaveLength(prior.parts.length);
        for(const part of prior.parts){
          const actual=next.parts.find(p=>p.id===part.id)!;
          expect(actual.plate).toBe(part.plate);
          expect(actual.paint).toBe(part.paint);
          expect(actual.transform).toBe(part.transform);
          if(frame===0||!result.changedPartIds.includes(part.id))
            expect(actual.d).toBe(part.d);
        }
        expect(next.parts.filter(p=>p.plate==="red"&&p.paint==="solid"&&
          new RegExp("^"+side+"-glove-(index|middle|ring|pinky)(?:-middle-phalanx|-distal-phalanx)?$").test(p.id)))
          .toHaveLength(RISO59_HAND_ENVELOPE.protectedRedPhalanges);
        expect(next.parts.filter(p=>p.id.startsWith(inactive+"-glove")))
          .toEqual(prior.parts.filter(p=>p.id.startsWith(inactive+"-glove")));
      }
      const live=evaluateRisoCharacter(result.spec,160);
      for(const id of result.changedPartIds){
        const candidate=live.parts.find(p=>p.id===id)!;
        const baseline=evaluateRisoCharacter(spec,160).parts.find(p=>p.id===id)!;
        expect(candidate.d).not.toBe(baseline.d);
        if(id.includes("web-reserve"))expect(candidate.knockoutOnly).toBe(true);
      }
      // The production spec never silently receives an unapproved test skin.
      expect(spec.parts.find(p=>p.id===side+"-glove")!.pathKeys?.[2].d)
        .not.toBe(result.contactContour);
    }
  },10000);
});
