import {describe,expect,it} from "vitest";
import {COURIER} from "../src/video/riso-character-demo";
import {PAPER_ARTIST,evaluateRisoHumanEnsemble} from "../src/video/riso-human-ensemble";
import {evaluateRiso40PaperGrip} from "../src/video/riso40-paper-fingertip-contact";
import {inspectRiso39OpposedPaperPinch} from "../src/video/riso39-opposed-paper-pinch";
import {evaluateRisoCharacter} from "../registry/video/riso-character";
import {riso36WorldContour} from "../src/video/riso36-red-silhouette-gate";
import {selectRisoSourceContour} from "../registry/video/riso-path-geometry";

const actors=[COURIER,PAPER_ARTIST] as const;
const sides=["right","left"] as const;
const aspects=["landscape","portrait"] as const;

describe("RISO40 real letter-contact geometry / original film FK/IK rig",()=>{
  it("projects actual thumb/IP and index/DIP source bones with exact stage scaling",()=>{
    const stage={x:145,y:350,scale:1.075};
    for(const actor of actors)for(const side of sides){
      for(const frame of [0,46,126,142,156,160,166,177,186,202,239]){
        const m=evaluateRiso40PaperGrip(actor,frame,side,stage);
        const source=inspectRiso39OpposedPaperPinch(actor,frame,side);
        expect(m.tipDistance).toBeCloseTo(source.tipDistance*stage.scale,5);
        expect(m.thumbTip.x).toBeCloseTo(stage.x+source.thumbTip.x*stage.scale,5);
        expect(m.indexTip.y).toBeCloseTo(stage.y+source.indexTip.y*stage.scale,5);
        expect(m.paperAnchor.x).toBeCloseTo((m.thumbTip.x+m.indexTip.x)/2,7);
        expect(m.paperAnchor.y).toBeCloseTo((m.thumbTip.y+m.indexTip.y)/2,7);
        expect(m.anchorToRoot).toBeGreaterThan(0);
        expect(evaluateRiso40PaperGrip(actor,frame,side,stage)).toEqual(m);
      }
    }
    expect(()=>evaluateRiso40PaperGrip(COURIER,160,"right",
      {x:0,y:0,scale:0})).toThrow(RangeError);
  });

  it.each(aspects)("prints the same source paper through actual donor and receiver pads (%s)",aspect=>{
    const p=evaluateRisoHumanEnsemble(160,aspect);
    const donor=evaluateRiso40PaperGrip(COURIER,160,"right",p.first);
    const receiver=evaluateRiso40PaperGrip(PAPER_ARTIST,160,"left",p.second);
    expect(p.donorGrip).toEqual(donor);
    expect(p.artistGrip).toEqual(receiver);
    expect(p.paperStart).toEqual(donor.paperAnchor);
    expect(p.paperEnd).toEqual(receiver.paperAnchor);
    expect(p.source).toEqual(donor.paperAnchor);
    expect(p.receiver).toEqual(receiver.paperAnchor);
    // At f160 both hands own the same actual sheet. Neither original body
    // nor 16:9/9:16 stage should fake a sheet-to-wrist connection.
    expect(p.sourceTouching).toBe(true);
    expect(p.receiverTouching).toBe(true);
    // RISO41: a letter merely arriving at the hand root is insufficient
    // for a pressed wrinkle. The actual original red-pad gap is the
    // independent source of print pressure, not a hardcoded 100% signal.
    expect(p.sourceContactPressure).toBeCloseTo(p.donorInk.pressure,6);
    expect(p.receiverContactPressure).toBeCloseTo(p.receiverInk.pressure,6);
    expect(p.donorInk.inkGap).toBeLessThan(1.5);
    expect(p.receiverInk.inkGap).toBeLessThan(3.0);
    expect(p.sourceContactPressure).toBeGreaterThan(0);
    expect(p.receiverContactPressure).toBeGreaterThan(0);
    expect(donor.tipDistance).toBeLessThan(12*p.first.scale);
    expect(receiver.tipDistance).toBeLessThan(12*p.second.scale);
    expect(donor.anchorToRoot).toBeGreaterThan(5*p.first.scale);
    expect(receiver.anchorToRoot).toBeGreaterThan(5*p.second.scale);
    expect(p.sheet).toMatch(/^M.+Z$/);
  });

  it.each(aspects)("owns paper at actual moving receiver fingerpads after donor release (%s)",aspect=>{
    for(const frame of [160,166,177,178,186,198,202,220,239]){
      const p=evaluateRisoHumanEnsemble(frame,aspect);
      const r=evaluateRiso40PaperGrip(PAPER_ARTIST,frame,"left",p.second);
      expect(p.receiver).toEqual(r.paperAnchor);
      expect(p.paperEnd).toEqual(r.paperAnchor);
      if(frame>=202){
        expect(p.owner).toBe("receiver");
        expect(p.sourceTouching).toBe(false);
      }
      // Hold/release source always derives from original joints, not the
      // previous frame or an independent sheet motion track.
      expect(evaluateRisoHumanEnsemble(frame,aspect)).toEqual(p);
    }
  });

  it.each(aspects)("received letter stays above planted shoes, not through the floor (%s)",aspect=>{
    for(const frame of [202,239]){
      const p=evaluateRisoHumanEnsemble(frame,aspect);
      const sheetBottom=Math.max(...selectRisoSourceContour(p.sheet,undefined,.35).map(pt=>pt[1]));
      const bootBottoms=([COURIER,PAPER_ARTIST] as const).map((actor,i)=>{
        const stage=i===0?p.first:p.second;
        const source=evaluateRisoCharacter(actor,frame);
        return Math.max(...source.parts.filter(part=>
          part.id==="left-boot"||part.id==="right-boot").flatMap(part=>
          riso36WorldContour(part.d,part.transform,.35).map(pt=>stage.y+pt[1]*stage.scale)));
      });
      const groundBaseline=Math.max(...bootBottoms);
      expect(sheetBottom,aspect+" f"+frame+" letter penetrating foot-ground line")
        .toBeLessThan(groundBaseline+1);
    }
  });

  it.each(aspects)("paper stays continuous at two-frame cadence and can be scrubbed randomly (%s)",aspect=>{
    let previous=evaluateRisoHumanEnsemble(126,aspect);
    for(let frame=128;frame<=238;frame+=2){
      const p=evaluateRisoHumanEnsemble(frame,aspect);
      const receiver=evaluateRiso40PaperGrip(PAPER_ARTIST,frame,"left",p.second);
      // During unfurl, the physical tip advances from donor toward the
      // moving receiver. It only REACHES her original pad when progress=1
      // at f160; an early full-tip contact assertion would contradict the
      // actual 126–160 frame handoff motion.
      const intended=p.progress<1
        ?{x:p.source.x+(receiver.paperAnchor.x-p.source.x)*p.progress,
          y:p.source.y+(receiver.paperAnchor.y-p.source.y)*p.progress}
        :receiver.paperAnchor;
      expect(Math.hypot(p.paperEnd.x-intended.x,
        p.paperEnd.y-intended.y),aspect+" f"+frame).toBeLessThan(.00001);
      const step=Math.hypot(p.paperEnd.x-previous.paperEnd.x,
        p.paperEnd.y-previous.paperEnd.y);
      // This is a bound against disconnected paper jumps; a single source
      // actor can legitimately reach farther in 2 frames at 24 FPS.
      expect(step,aspect+" frame "+frame).toBeLessThan(30);
      previous=p;
    }
    const f160=evaluateRisoHumanEnsemble(160,aspect);
    evaluateRisoHumanEnsemble(239,aspect);
    expect(evaluateRisoHumanEnsemble(160,aspect)).toEqual(f160);
  });
});
