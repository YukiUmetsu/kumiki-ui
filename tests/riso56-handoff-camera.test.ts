import {describe,it,expect} from "vitest";
import {evaluateRisoHumanEnsemble} from "../src/video/riso-human-ensemble";
import {COURIER} from "../src/video/riso-character-demo";
import {PAPER_ARTIST} from "../src/video/riso-human-ensemble";
import {inspectRiso44PrintedIndexContact} from "../src/video/riso44-source-index-paper-contact";
import {
  RISO56_CAMERA_BEAT,evaluateRiso56HandoffCamera,
  riso56ProjectPoint,riso56ProjectPlacement,riso56CameraMatrix,
} from "../src/video/riso56-handoff-camera";
import {evaluateRisoCharacter} from "../registry/video/riso-character";

const aspects=["landscape","portrait"] as const;
const frames=[0,46,92,142,144,148,154,156,160,166,177,180,186,189,198,202,207,220,239] as const;
const calc=(frame:number,aspect:typeof aspects[number],enable=true)=>{
  const state=evaluateRisoHumanEnsemble(frame,aspect);
  return {state,camera:evaluateRiso56HandoffCamera(
    frame,aspect,state.source,state.receiver,enable)};
};
describe("RISO56 ArtCraft: cinematic two-real-human printed paper contact framing",()=>{
  it("keeps 16:9/9:16 stage identity before and after shot, with actual smooth physical source camera",()=>{
    expect(RISO56_CAMERA_BEAT.enter).toBe(142);
    for(const aspect of aspects){
      const lens=aspect==="landscape"?
        RISO56_CAMERA_BEAT.landscapeMaxZoom:
        RISO56_CAMERA_BEAT.portraitMaxZoom;
      for(const frame of frames){
        const {state,camera}=calc(frame,aspect);
        expect(camera.width).toBe(state.width);
        expect(camera.height).toBe(state.height);
        expect(camera.zoom).toBeGreaterThanOrEqual(1);
        expect(camera.zoom).toBeLessThanOrEqual(lens);
        expect(camera.beat).toBeGreaterThanOrEqual(0);
        expect(camera.beat).toBeLessThanOrEqual(1);
        expect(riso56CameraMatrix(camera)).toMatch(/^matrix\([\d\.\-]+ 0 0 [\d\.\-]+ [\d\.\-]+ [\d\.\-]+\)$/);
        if(frame<=142||frame>=207){
          expect(camera.zoom).toBe(1);
          expect(camera.tx).toBe(0);
          expect(camera.ty).toBe(0);
          expect(riso56CameraMatrix(camera)).toBe("matrix(1 0 0 1 0 0)");
          expect(riso56ProjectPlacement(state.first,camera)).toEqual(state.first);
          expect(riso56ProjectPlacement(state.second,camera)).toEqual(state.second);
          expect(riso56ProjectPoint(state.source,camera)).toEqual(state.source);
          expect(riso56ProjectPoint(state.receiver,camera)).toEqual(state.receiver);
        }
        if(frame>=160&&frame<=180){
          expect(camera.beat).toBe(1);
          expect(camera.zoom).toBe(lens);
          const source=riso56ProjectPoint(state.source,camera);
          const receiver=riso56ProjectPoint(state.receiver,camera);
          const margin=aspect==="portrait"?15:45;
          for(const anchor of [source,receiver]){
            expect(anchor.x).toBeGreaterThan(margin);
            expect(anchor.x).toBeLessThan(state.width-margin);
            expect(anchor.y).toBeGreaterThan(20);
            expect(anchor.y).toBeLessThan(state.height-20);
          }
          const projectedSource=riso56ProjectPlacement(state.first,camera);
          const projectedReceiver=riso56ProjectPlacement(state.second,camera);
          expect(projectedSource.scale).toBeCloseTo(state.first.scale*lens,5);
          expect(projectedReceiver.scale).toBeCloseTo(state.second.scale*lens,5);
          expect(projectedSource.x).toBeLessThan(projectedReceiver.x);
        }
        const fallback=calc(frame,aspect,false);
        expect(fallback.camera.zoom).toBe(1);
        expect(fallback.camera.tx).toBe(0);
        expect(fallback.camera.ty).toBe(0);
        expect(fallback.camera.frame).toBe(frame);
      }
    }
  });
  it("uses one lens for ALL physical RISO2 materials and never mutates living source anatomy or original paper grip",()=>{
    for(const aspect of aspects)for(const frame of [0,142,156,160,166,177,202,239]){
      const {state,camera}=calc(frame,aspect);
      const before=[...COURIER.parts,...PAPER_ARTIST.parts].map(p=>[p.id,p.d,p.plate,p.paint]);
      const worldSheet=state.sheet,ink=state.printDetails;
      const head1=evaluateRisoCharacter(COURIER,frame);
      const head2=evaluateRisoCharacter(PAPER_ARTIST,frame);
      const transformed=[riso56ProjectPlacement(state.first,camera),
        riso56ProjectPlacement(state.second,camera)];
      expect(transformed.every(p=>Number.isFinite(p.scale)&&p.scale>0)).toBe(true);
      // Scene model, source plate vectors and same one sheet belong to
      // original ANAT1; camera is a pure presentation transform.
      expect(state.sheet).toBe(worldSheet);
      expect(state.printDetails).toBe(ink);
      expect([...COURIER.parts,...PAPER_ARTIST.parts].map(p=>[p.id,p.d,p.plate,p.paint]))
        .toEqual(before);
      expect(head1.parts.some(p=>p.plate==="red")).toBe(true);
      expect(head2.parts.some(p=>p.plate==="blue")).toBe(true);
      if(frame===160||frame===166){
        for(const [spec,side,place] of [
          [COURIER,"right",state.first],
          [PAPER_ARTIST,"left",state.second],
        ] as const){
          const hand=inspectRiso44PrintedIndexContact(spec,frame,side,place,worldSheet);
          expect(hand.redIndexAreaTouchesPaper).toBe(true);
          expect(hand.thumbUnderPaper).toBe(true);
          const palm=riso56ProjectPoint(
            side==="right"?state.source:state.receiver,camera);
          expect(Number.isFinite(palm.x)&&Number.isFinite(palm.y)).toBe(true);
        }
      }
    }
  });
  it("has no single-frame jumping lens or independent camera clock",()=>{
    for(const aspect of aspects){
      let old=evaluateRiso56HandoffCamera(0,aspect,{x:200,y:300},{x:600,y:300});
      for(let frame=1;frame<240;frame++){
        const next=evaluateRiso56HandoffCamera(frame,aspect,{x:200,y:300},{x:600,y:300});
        expect(Math.abs(next.zoom-old.zoom)).toBeLessThan(.11);
        expect(Math.abs(next.tx-old.tx)).toBeLessThan(56);
        expect(Math.abs(next.ty-old.ty)).toBeLessThan(30);
        old=next;
      }
    }
  });
  it("rejects out-of-bounds frames and bad camera anchors before rendering stencil",()=>{
    expect(()=>evaluateRiso56HandoffCamera(240,"landscape",{x:0,y:0},{x:4,y:5})).toThrow();
    expect(()=>evaluateRiso56HandoffCamera(160,"portrait",{x:NaN,y:0},{x:4,y:5})).toThrow();
    expect(()=>evaluateRiso56HandoffCamera(160,"landscape",{x:0,y:0},{x:4,y:5},"bad" as never)).toThrow();
  });
});
