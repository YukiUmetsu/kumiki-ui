import {describe,it,expect} from "vitest";
import {COURIER} from "../src/video/riso-character-demo";
import {PAPER_ARTIST,evaluateRisoHumanEnsemble} from "../src/video/riso-human-ensemble";
import {RISO31_GEOMETRY,riso31Inspect} from "../src/video/riso31-finger-phalanges";
import {RISO48_RECEIVER_PROJECTION} from "../src/video/riso48-projected-support";
import {RISO49_DONOR_PROJECTION} from "../src/video/riso49-donor-projection";
import {RISO54_RAY_PROJECTION,inspectRiso54SourceRay} from "../src/video/riso54-camera-ray-audit";
import {inspectRiso33HandFan} from "../src/video/riso33-hand-negative-space";
import {inspectRiso36RedFingerSilhouettes} from "../src/video/riso36-red-silhouette-gate";
import {inspectRiso44PrintedIndexContact} from "../src/video/riso44-source-index-paper-contact";
import {evaluateRisoCharacter,inspectRisoCharacter} from "../registry/video/riso-character";

const actors=[
  {spec:COURIER,active:"right",inactive:"left"} as const,
  {spec:PAPER_ARTIST,active:"left",inactive:"right"} as const,
];
const supports=["middle","ring","pinky"] as const;
describe("RISO54 view-ray anatomical grip: 3D bone length vs printed 2D stations",()=>{
  it("preserves all true ANAT1 3D source lengths and bounds 6 projected live support-bone stations",()=>{
    expect(RISO54_RAY_PROJECTION.smallest2DTo3DBoneRatio).toBeGreaterThan(.38);
    expect(RISO54_RAY_PROJECTION.estimatedSourceRayDegrees).toEqual([62,68]);
    for(const {spec,active,inactive} of actors){
      expect(inspectRisoCharacter(spec,["red","blue"])).toEqual([]);
      const before=inspectRiso54SourceRay(spec,0),at=inspectRiso54SourceRay(spec,160);
      const later=inspectRiso54SourceRay(spec,166);
      expect(before.originalClinical3DBoneSegments).toBe(6);
      expect(before.segments.map(s=>s.ratio)).toEqual([1,1,1,1,1,1]);
      expect(at.originalClinical3DBoneSegments).toBe(6);
      expect(at.ratioMin).toBeGreaterThan(.385);
      expect(at.ratioMax).toBeLessThan(.46);
      expect(at.ratioMean).toBeGreaterThan(.39);
      expect(at.ratioMean).toBeLessThan(.45);
      expect(at.estimatedIncidenceMeanDegrees).toBeGreaterThan(62);
      expect(at.estimatedIncidenceMeanDegrees).toBeLessThan(68);
      expect(later.ratioMean).toBeGreaterThan(.385);
      expect(later.ratioMean).toBeLessThan(.46);
      for(const segment of at.segments){
        const source=RISO31_GEOMETRY[segment.digit];
        expect(segment.length3D).toBe(segment.stage==="pip"?
          source.proximal:source.intermediate);
        expect(segment.length2D).toBeLessThan(segment.length3D*.46);
        expect(segment.ratio).toBeGreaterThan(.385);
        expect(segment.estimatedRayDeg).toBeGreaterThan(62);
        expect(segment.estimatedRayDeg).toBeLessThan(68);
      }
      const index=riso31Inspect(spec,160,active).find(s=>s.digit==="index")!;
      expect(index.rootLength).toBeCloseTo(index.expectedProximal,3);
      expect(index.intermediateLength).toBeCloseTo(index.expectedIntermediate,3);
      const untouched=riso31Inspect(spec,160,inactive);
      for(const s of untouched){
        expect(s.rootLength).toBeCloseTo(s.expectedProximal,3);
        expect(s.intermediateLength).toBeCloseTo(s.expectedIntermediate,3);
      }
    }
  });

  it("all individual actor/digit projected bone stations match the authored clinical-length cosine",()=>{
    for(const {spec} of actors){
      const projection=spec.id==="courier"?RISO49_DONOR_PROJECTION:RISO48_RECEIVER_PROJECTION;
      const source=inspectRiso54SourceRay(spec,160);
      for(const digit of supports)for(const stage of ["pip","dip"] as const){
        const g=RISO31_GEOMETRY[digit];
        const original=stage==="pip"?g.proximal:g.intermediate;
        const authored=projection[digit][stage];
        const measured=source.segments.find(s=>s.digit===digit&&s.stage===stage)!;
        expect(measured.length2D).toBeCloseTo(original+authored,5);
        expect(measured.length2D).toBeGreaterThan(1.6);
        expect(Math.acos(measured.ratio)*180/Math.PI)
          .toBeCloseTo(measured.estimatedRayDeg,5);
      }
    }
  });

  it("keeps every real red + blue printed phalanx, 3-unit centerline and actual two-aspect paper index contact",()=>{
    for(const {spec,active} of actors){
      for(let frame=0;frame<240;frame+=2){
        const ray=inspectRiso54SourceRay(spec,frame);
        const frameSpec=evaluateRisoCharacter(spec,frame);
        expect(ray.ratioMin).toBeGreaterThan(.385);
        expect(ray.ratioMax).toBeLessThanOrEqual(1.001);
        expect(inspectRiso33HandFan(spec,frame,active).minimumAxisGap).toBeGreaterThan(3);
        expect(inspectRiso36RedFingerSilhouettes(spec,frame,active).sourcePartCount).toBe(12);
        for(const digit of supports){
          const names=[active+"-glove-"+digit,
            active+"-glove-"+digit+"-middle-phalanx",
            active+"-glove-"+digit+"-distal-phalanx"];
          expect(frameSpec.parts.filter(p=>names.includes(p.id)&&p.plate==="red"))
            .toHaveLength(3);
          expect(frameSpec.parts.find(p=>p.id===active+"-glove-"+digit+"-nail")?.plate)
            .toBe("blue");
        }
      }
    }
    for(const aspect of ["landscape","portrait"] as const)
      for(const frame of [160,166]){
        const film=evaluateRisoHumanEnsemble(frame,aspect);
        for(const {spec,active} of actors){
          const state=inspectRiso44PrintedIndexContact(spec,frame,active,
            spec.id==="courier"?film.first:film.second,film.sheet);
          expect(state.redIndexAreaTouchesPaper).toBe(true);
          expect(state.thumbUnderPaper).toBe(true);
        }
      }
  });
});
