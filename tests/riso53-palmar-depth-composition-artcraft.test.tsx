import {describe,expect,it} from "vitest";
import {renderToStaticMarkup} from "react-dom/server";
import {createElement} from "react";
import {evaluateRisoCharacter,inspectRisoCharacter} from "../registry/video/riso-character";
import {RisoCharacterInk} from "../registry/video/riso-character-react";
import {COURIER} from "../src/video/riso-character-demo";
import {PAPER_ARTIST,evaluateRisoHumanEnsemble} from "../src/video/riso-human-ensemble";
import {inspectRiso43PrintDepth} from "../src/video/riso43-physical-paper-depth";
import {inspectRiso44PrintedIndexContact} from "../src/video/riso44-source-index-paper-contact";
import {inspectRiso33HandFan} from "../src/video/riso33-hand-negative-space";
import {
 RISO53_PALMAR_OVERLAP,riso53InspectSourceDepth,
 riso53OccludedFingerSourceIds,riso53ReorderPalmarInk,
} from "../src/video/riso53-palmar-depth-composition";

const subjects=[
  {actor:COURIER,active:"right",inactive:"left"} as const,
  {actor:PAPER_ARTIST,active:"left",inactive:"right"} as const,
];

describe("RISO53: real cupped support-finger ink depth, no added RGB mask",()=>{
  it("nine original RED support bones print BEFORE carpal palm; real index and thumb remain AFTER",()=>{
    expect(RISO53_PALMAR_OVERLAP.redSupportSourceCount).toBe(9);
    for(const {actor,active,inactive} of subjects){
      expect(inspectRisoCharacter(actor,["red","blue"])).toEqual([]);
      const order=riso53InspectSourceDepth(actor.parts,actor.id as "courier"|"paper-artist");
      expect(order.complete).toBe(true);
      expect(order.farRedBehind).toBe(9);
      expect(order.indexSourceAbovePalm).toBe(true);
      expect(order.thumbSourceAbovePalm).toBe(true);
      expect(order.originalSupportIds).toEqual(riso53OccludedFingerSourceIds(active));
      const palmAt=actor.parts.findIndex(p=>p.id===active+"-glove");
      const sourceIds=riso53OccludedFingerSourceIds(active);
      for(const id of sourceIds){
        const part=actor.parts.find(p=>p.id===id)!;
        expect(part.joint).toBeDefined();
        expect(part.paint).toBe("solid");
        expect(part.plate).toBe("red");
        expect(actor.parts.findIndex(p=>p.id===id)).toBeLessThan(palmAt);
      }
      // Do not recompose unused original other hand or its ink.
      const inertIds=riso53OccludedFingerSourceIds(inactive);
      const inertPalmAt=actor.parts.findIndex(p=>p.id===inactive+"-glove");
      for(const id of inertIds){
        expect(actor.parts.findIndex(p=>p.id===id)).toBeGreaterThan(inertPalmAt);
      }
    }
  });

  it("is a repeatable source-only permutation that preserves every original paint and stroke",()=>{
    for(const {actor} of subjects){
      const orig=actor.parts;
      const newOrder=riso53ReorderPalmarInk(orig,actor.id as "courier"|"paper-artist");
      expect(newOrder.map(p=>p.id)).toEqual(orig.map(p=>p.id));
      expect(newOrder).toEqual(orig);
      const before=new Map(orig.map(p=>[p.id,p]));
      for(const part of newOrder){
        expect(part).toBe(before.get(part.id));
      }
      expect(new Set(newOrder.map(p=>p.id)).size).toBe(orig.length);
      expect(newOrder.filter(p=>p.plate==="red")).toHaveLength(
        orig.filter(p=>p.plate==="red").length);
      expect(newOrder.filter(p=>p.plate==="blue")).toHaveLength(
        orig.filter(p=>p.plate==="blue").length);
    }
  });

  it("renders the actual 2-ink source ordered inside the original RisoCharacterInk plate",()=>{
    for(const {actor,active} of subjects){
      const html=renderToStaticMarkup(createElement(RisoCharacterInk,{
        spec:actor,frame:160,plateId:"red",
        paint:{solid:"#D65641",dots:"url(#red)"},
      }));
      const p=html.indexOf('data-km-riso-part="'+active+'-glove"');
      const i=html.indexOf('data-km-riso-part="'+active+'-glove-index"');
      const t=html.indexOf('data-km-riso-part="'+active+'-glove-thumb"');
      expect(p).toBeGreaterThan(0);
      expect(i).toBeGreaterThan(p);
      expect(t).toBeGreaterThan(p);
      for(const id of riso53OccludedFingerSourceIds(active)){
        const at=html.indexOf('data-km-riso-part="'+id+'"');
        expect(at,id).toBeGreaterThan(0);
        expect(at,id).toBeLessThan(p);
      }
      const blue=renderToStaticMarkup(createElement(RisoCharacterInk,{
        spec:actor,frame:160,plateId:"blue",
        paint:{solid:"#255B8E",dots:"url(#blue)"},
      }));
      for(const digit of ["middle","ring","pinky"]){
        expect(blue).toContain('data-km-riso-part="'+active+"-glove-"+digit+'-nail"');
      }
    }
  });

  it("keeps every live ANAT1 finger, strict source gap and genuine index-over/thumb-under paper in 16:9/9:16",()=>{
    for(const {actor,active} of subjects){
      for(let frame=0;frame<240;frame+=2){
        const pose=evaluateRisoCharacter(actor,frame);
        expect(pose.parts).toHaveLength(actor.parts.length);
        const ink=inspectRiso43PrintDepth(actor,frame,active);
        expect(ink.originalThumbIPBehindPaper).toBe(true);
        expect(ink.aboveHasNoThumbOrSupport).toBe(true);
        expect(ink.underRedIds.length).toBeGreaterThanOrEqual(11);
        const fan=inspectRiso33HandFan(actor,frame,active);
        expect(fan.minimumAxisGap).toBeGreaterThan(3);
      }
    }
    for(const aspect of ["landscape","portrait"] as const)
    for(const frame of [160,166]){
      const film=evaluateRisoHumanEnsemble(frame,aspect);
      for(const {actor,active} of subjects){
        const grip=inspectRiso44PrintedIndexContact(actor,frame,active,
          actor.id==="courier"?film.first:film.second,film.sheet);
        expect(grip.redIndexAreaTouchesPaper).toBe(true);
        expect(grip.thumbUnderPaper).toBe(true);
      }
    }
  });
});
