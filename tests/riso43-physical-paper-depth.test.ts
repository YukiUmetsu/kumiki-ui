import {describe,expect,it} from "vitest";
import {COURIER} from "../src/video/riso-character-demo";
import {PAPER_ARTIST,evaluateRisoHumanEnsemble} from "../src/video/riso-human-ensemble";
import {riso43FrontIndexIds,inspectRiso43PrintDepth,RISO43_DEPTH_REFERENCE}
  from "../src/video/riso43-physical-paper-depth";
import {inspectRiso41InkPressure} from "../src/video/riso41-contact-pressure";
import {inspectRiso36RedFingerSilhouettes} from "../src/video/riso36-red-silhouette-gate";
import {evaluateRisoCharacter,inspectRisoCharacter} from "../registry/video/riso-character";

const actors=[COURIER,PAPER_ARTIST] as const;
const sides=["left","right"] as const;
const cels=[0,46,126,142,156,160,166,177,178,186,202,220,239];
describe("RISO43 ArtCraft / actual paper between red index and opposed thumb",()=>{
  it("prints only articulated source INDEX above the sheet: 3 red+3 cobalt, no fake sticker",()=>{
    expect(RISO43_DEPTH_REFERENCE.medium).toMatch(/two RisoPrint spot masters/);
    for(const side of sides){
      const ids=riso43FrontIndexIds(side);
      expect(ids).toHaveLength(6);
      expect(new Set(ids).size).toBe(6);
      expect(ids).toEqual([
        side+"-glove-index",side+"-glove-index-middle-phalanx",
        side+"-glove-index-distal-phalanx",
        side+"-glove-index-nail",side+"-glove-index-joint-crease",
        side+"-glove-index-dip-crease",
      ]);
      expect(ids.every(id=>id.includes("-index")&&!id.includes("-thumb"))).toBe(true);
    }
  });
  it.each(actors)("%s original source retains thumb and 3 support digits BEHIND real paper",actor=>{
    expect(inspectRisoCharacter(actor)).toEqual([]);
    for(const side of sides){
      const allParts=actor.parts.length;
      for(const frame of cels){
        const pose=evaluateRisoCharacter(actor,frame);
        const x=inspectRiso43PrintDepth(actor,frame,side);
        expect(x.aboveRedIds).toHaveLength(3);
        expect(x.aboveBlueIds).toHaveLength(3);
        expect(x.underRedIds.length).toBeGreaterThanOrEqual(11);
        expect(x.originalThumbIPBehindPaper).toBe(true);
        expect(x.aboveHasNoThumbOrSupport).toBe(true);
        expect(x.physicallyPrintedOriginalParts).toBe(pose.parts.length);
        expect(pose.parts.length).toBe(allParts);
        for(const partId of [...x.aboveIds,...x.underRedIds]){
          const original=actor.parts.find(p=>p.id===partId);
          const printed=pose.parts.find(p=>p.id===partId);
          expect(printed?.d,partId).toBe(original?.d);
          expect(printed?.plate).toBe(original?.plate);
        }
        // This depth-order pass does not simplify, remove or replace a
        // single original red/fine cobalt registered source part.
        expect(inspectRiso43PrintDepth(actor,frame,side)).toEqual(x);
      }
    }
  });
  it("retains actual connected index/thumb pressure and physically printed sheet during transfer",()=>{
    for(const aspect of ["landscape","portrait"] as const){
      for(const frame of [160,166,177,186,202,239]){
        const state=evaluateRisoHumanEnsemble(frame,aspect);
        const receiver=inspectRiso41InkPressure(PAPER_ARTIST,frame,"left");
        expect(state.sheet).toMatch(/^M.+Z$/);
        expect(state.receiverInk.inkGap).toBeCloseTo(receiver.inkGap,6);
        expect(state.artistGrip.paperAnchor).toEqual(state.receiver);
        if(frame>=202){
          expect(state.owner).toBe("receiver");
          expect(state.sourceTouching).toBe(false);
          expect(state.receiverTouching).toBe(true);
        }
      }
    }
  });
  it.each(actors)("%s has independent blue/red originals and the existing 12 detailed printed phalanges",actor=>{
    for(const side of sides){
      const ink=inspectRiso43PrintDepth(actor,side==="right"?160:166,side);
      const face=inspectRiso36RedFingerSilhouettes(actor,side==="right"?160:166,side);
      expect(face.sourcePartCount).toBe(12);
      expect(ink.underRedIds).toContain(side+"-glove-thumb-distal-phalanx");
      expect(ink.underRedIds).toContain(side+"-glove-middle-middle-phalanx");
      expect(ink.underRedIds).toContain(side+"-glove-ring-distal-phalanx");
      expect(ink.underRedIds).toContain(side+"-glove-pinky-distal-phalanx");
    }
  });
});
