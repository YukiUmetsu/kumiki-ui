import {describe,expect,it} from "vitest";
import {evaluateRisoCharacter,inspectRisoCharacter} from "../registry/video/riso-character";
import {RISO_HANDOFF_DEFAULTS} from "../registry/video/riso-prop-handoff";
import {COURIER} from "../src/video/riso-character-demo";
import {
  PAPER_ARTIST,RISO_ENSEMBLE_FILM_FPS,RISO_ENSEMBLE_MOTION_BEATS,
  clampRisoEnsembleFilmFrame,evaluateRisoHumanEnsemble,
} from "../src/video/riso-human-ensemble";

const distance=(a:{x:number;y:number},b:{x:number;y:number})=>
  Math.hypot(a.x-b.x,a.y-b.y);
const rounded=(n:number)=>Number(n.toFixed(6));

describe("RISO27 ArtCraft original two-human 24fps film continuity",()=>{
  it("the source film has a 10-second deterministic 24fps frame contract",()=>{
    expect(COURIER.durationFrames).toBe(240);
    expect(PAPER_ARTIST.durationFrames).toBe(240);
    expect(RISO_ENSEMBLE_FILM_FPS).toBe(24);
    expect(COURIER.durationFrames/RISO_ENSEMBLE_FILM_FPS).toBe(10);
    expect(COURIER.cadence).toBe(2);
    expect(PAPER_ARTIST.cadence).toBe(2);
    expect(inspectRisoCharacter(COURIER)).toEqual([]);
    expect(inspectRisoCharacter(PAPER_ARTIST)).toEqual([]);
    expect(clampRisoEnsembleFilmFrame(239)).toBe(239);
    expect(clampRisoEnsembleFilmFrame(240)).toBe(239);
    expect(clampRisoEnsembleFilmFrame(-10)).toBe(0);
    expect(()=>clampRisoEnsembleFilmFrame(NaN)).toThrow();
    expect(()=>clampRisoEnsembleFilmFrame(.2)).toThrow();
  });

  it("nine original-source acting beats are distinct, ordered and touch all phase transitions",()=>{
    const beats=RISO_ENSEMBLE_MOTION_BEATS;
    expect(beats.map(b=>b.frame)).toEqual([0,76,126,144,160,178,190,202,239]);
    expect(new Set(beats.map(b=>b.label)).size).toBe(beats.length);
    for(const beat of beats){
      expect(beat.label.length).toBeGreaterThan(3);
      expect(beat.intent.length).toBeGreaterThan(5);
      expect(evaluateRisoHumanEnsemble(beat.frame).frame).toBe(beat.frame);
    }
  });

  it.each(["landscape","portrait"] as const)("%s: every one of 240 evaluated frames finite and phase-bound",aspect=>{
    let lastProgress=-1,lastRelease=-1;
    for(let f=0;f<240;f++){
      const state=evaluateRisoHumanEnsemble(f,aspect);
      expect(state.width).toBe(aspect==="portrait"?540:960);
      expect(state.height).toBe(aspect==="portrait"?960:540);
      expect(state.progress).toBeGreaterThanOrEqual(0);
      expect(state.progress).toBeLessThanOrEqual(1);
      expect(state.releaseProgress).toBeGreaterThanOrEqual(0);
      expect(state.releaseProgress).toBeLessThanOrEqual(1);
      expect(state.progress+1e-8).toBeGreaterThanOrEqual(lastProgress);
      expect(state.releaseProgress+1e-8).toBeGreaterThanOrEqual(lastRelease);
      lastProgress=state.progress;lastRelease=state.releaseProgress;
      for(const p of [state.source,state.receiver,state.paperStart,state.paperEnd]){
        expect(Number.isFinite(p.x)).toBe(true);
        expect(Number.isFinite(p.y)).toBe(true);
        expect(Math.abs(p.x)).toBeLessThan(state.width*1.5);
        expect(Math.abs(p.y)).toBeLessThan(state.height*1.5);
      }
      expect(state.sourceContactPressure).toBeGreaterThanOrEqual(0);
      expect(state.sourceContactPressure).toBeLessThanOrEqual(1);
      expect(state.receiverContactPressure).toBeGreaterThanOrEqual(0);
      expect(state.receiverContactPressure).toBeLessThanOrEqual(1);
      const phase=f<RISO_HANDOFF_DEFAULTS.contactFrame?"unfurl":
        f<RISO_HANDOFF_DEFAULTS.releaseStart?"shared":
          f<RISO_HANDOFF_DEFAULTS.releaseEnd?"release":"received";
      expect(state.phase).toBe(phase);
      const owner=phase==="unfurl"?"source":phase==="received"?"receiver":"both";
      expect(state.owner).toBe(owner);
      if(f>=RISO_HANDOFF_DEFAULTS.releaseEnd){
        expect(state.sourceTouching).toBe(false);
        expect(state.sourceGrip).toBe(0);
        expect(state.sourceContactPressure).toBe(0);
        expect(state.receiverGrip).toBe(1);
        expect(state.receiverTouching).toBe(true);
        expect(distance(state.paperEnd,state.receiver)).toBe(0);
      }
      expect(state.printDetails).toBeDefined();
      if(f>0&&f<240-1){
        const again=evaluateRisoHumanEnsemble(f,aspect);
        expect(again).toEqual(state);
      }
    }
  });

  it.each(["landscape","portrait"] as const)("%s: handoff end is receiver-relative and release has no jump",aspect=>{
    const release=RISO_HANDOFF_DEFAULTS.releaseEnd;
    const atEnd=evaluateRisoHumanEnsemble(release,aspect);
    const before=evaluateRisoHumanEnsemble(release-1,aspect);
    expect(distance(before.paperStart,atEnd.paperStart)).toBeLessThan(8);
    expect(distance(before.paperEnd,atEnd.paperEnd)).toBeLessThan(8);
    for(const f of [release,release+1,release+10,239]){
      const now=evaluateRisoHumanEnsemble(f,aspect);
      expect(rounded(now.paperStart.x-now.receiver.x))
        .toBe(rounded(atEnd.paperStart.x-atEnd.receiver.x));
      expect(rounded(now.paperStart.y-now.receiver.y))
        .toBe(rounded(atEnd.paperStart.y-atEnd.receiver.y));
    }
    // Strong distinction from a loop: last state does not describe opening.
    const end=evaluateRisoHumanEnsemble(239,aspect);
    const beginning=evaluateRisoHumanEnsemble(0,aspect);
    expect(end.owner).toBe("receiver");
    expect(beginning.owner).toBe("source");
    expect(distance(end.paperStart,beginning.paperStart)).toBeGreaterThan(20);
  });

  it("source faces and costume stay the SAME actors across blink, speech and settle",()=>{
    for(const spec of [COURIER,PAPER_ARTIST]){
      const original=new Map(spec.parts.map(part=>[part.id,part.d]));
      const faceParts=spec.parts.filter(part=>part.joint==="head");
      expect(faceParts.length).toBeGreaterThan(35);
      const frames=[0,76,78,80,126,159,160,178,198,202,239];
      for(const f of frames){
        const pose=evaluateRisoCharacter(spec,f);
        const names=new Set(pose.parts.map(part=>part.id));
        expect(names.size).toBe(spec.parts.length);
        for(const id of original.keys())expect(names.has(id),id).toBe(true);
        for(const region of ["ear-left","face-outline","zygomatic-tone-planes"]){
          expect(pose.parts.find(part=>part.id===region)?.d).toBe(original.get(region));
        }
      }
    }
  });

  it("exact-seek replay and interleaved actor evaluation give identical transfer geometry",()=>{
    for(const aspect of ["landscape","portrait"] as const){
      const a=[126,160,190,202,239,0,160,126,202].map(f=>evaluateRisoHumanEnsemble(f,aspect));
      expect(a[1]).toEqual(a[6]);
      expect(a[0]).toEqual(a[7]);
      expect(a[3]).toEqual(a[8]);
      expect(evaluateRisoHumanEnsemble(239,aspect)).toEqual(a[4]);
    }
  });
});
