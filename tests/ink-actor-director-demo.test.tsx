import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { validateCharacterDefinition } from "../registry/character/validate";
import { samplePoseCorrection } from "../registry/character/authoring";
import { InkDirectorFilm, INK_WALKING_TRAVELLER, inkDirectorGait,
  inkDirectorInstance, inkDirectorRoute, inkDirectorBackdrop, makeInkWalkingTraveller, INK_TRAVELLER_FOLDS } from "../src/video/ink-actor-director-demo";
import { inkWalkAt, inkRouteAt, bakeInkActorTrack, auditInkWalkContacts } from "../registry/video/ink-actor-director";

describe("INK4 authored character and cinematic stage",()=>{
  it("preserves approved facial identity, expression variants, audio cues, props and real knee joints",()=>{
    const issues=validateCharacterDefinition(INK_WALKING_TRAVELLER);
    expect(issues.filter(x=>x.severity==="error")).toEqual([]);
    expect(INK_WALKING_TRAVELLER.parts.filter(p=>p.id.endsWith("thigh"))).toHaveLength(2);
    expect(INK_WALKING_TRAVELLER.parts.filter(p=>p.id.endsWith("shin"))).toHaveLength(2);
    expect(INK_WALKING_TRAVELLER.parts.some(p=>p.id==="mouth")).toBe(true);
    expect(INK_WALKING_TRAVELLER.parts.some(p=>p.id==="eyes")).toBe(true);
    expect(INK_WALKING_TRAVELLER.speech?.visemes).toBeDefined();
    expect(INK_WALKING_TRAVELLER.actions.step).toBeUndefined();
  });
  it("adds artist-authored part-local pressure folds while preserving the approved rig",()=>{
    const bare=makeInkWalkingTraveller({detail:0,contrast:.85,seed:83});
    const crafted=makeInkWalkingTraveller({detail:1,contrast:1.25,seed:83});
    expect(Object.keys(crafted.assets).sort()).toEqual(Object.keys(bare.assets).sort());
    expect(crafted.parts).toEqual(bare.parts);
    expect(crafted.actions).toEqual(bare.actions);
    expect(Object.keys(INK_TRAVELLER_FOLDS)).toContain("robe");
    const source=bare.assets.robe,costume=crafted.assets.robe;
    expect(source.kind).toBe("shapes");
    expect(costume.kind).toBe("shapes");
    if(source.kind==="shapes"&&costume.kind==="shapes"){
      expect(costume.shapes.length).toBeGreaterThan(source.shapes.length+8);
      expect(costume.shapes.some(s=>s.type==="path"&&s.opacity!==undefined&&s.opacity<1)).toBe(true);
    }
    expect(validateCharacterDefinition(crafted).filter(x=>x.severity==="error")).toEqual([]);
    for(const aspect of ["landscape","portrait"] as const) {
      const sparse=renderToStaticMarkup(createElement(InkDirectorFilm,{frame:135,aspect,foldDetail:0}));
      const rich=renderToStaticMarkup(createElement(InkDirectorFilm,{frame:135,aspect,foldDetail:1,foldContrast:1.2}));
      expect(rich.length).toBeGreaterThan(sparse.length);
      expect(rich).toContain('data-km-ink-character-part="body"');
    }
  });
  it("uses 218 absolute-frame correction keys per part then eases back to the source rest rig",()=>{
    const instance=inkDirectorInstance("landscape");
    const keys=instance.corrections?.["far-thigh"]??[];
    expect(keys.length).toBeGreaterThan(200);
    expect(keys.length).toBeLessThanOrEqual(512);
    expect(samplePoseCorrection(instance.corrections??{},"far-thigh",100)).toHaveProperty("rotation");
    expect(samplePoseCorrection(instance.corrections??{},"far-thigh",240).rotation).toBeCloseTo(0,5);
    const state=inkWalkAt(inkDirectorGait("landscape"),100);
    expect(state.left.hipAngle).not.toBe(state.right.hipAngle);
    expect(state.sleeveLeftAngle).not.toBe(state.armLeftAngle);
    const track=bakeInkActorTrack(inkDirectorRoute("landscape"));
    expect(track.instanceId).toBe(instance.instanceId);
    expect(inkRouteAt(inkDirectorRoute("landscape"),110).vx).toBeGreaterThan(0);
    const stop=inkRouteAt(inkDirectorRoute("landscape"),230);
    const hold=inkRouteAt(inkDirectorRoute("landscape"),320);
    expect(stop.x).toBeCloseTo(hold.x,8);
    expect(stop.y).toBeCloseTo(hold.y,8);
    expect(stop.vx).toBe(0);
    expect(stop.vy).toBe(0);
  });
  it("establishes a fully painted, stage-grounded world before the first walk frame",()=>{
    for(const aspect of ["landscape","portrait"] as const) {
      const spec=inkDirectorBackdrop(aspect);
      const ground=spec.strokes.filter(s=>s.id.startsWith("traveler-ground-"));
      expect(ground).toHaveLength(3);
      expect(ground.every(s=>s.points.length>=3)).toBe(true);
      const markup=renderToStaticMarkup(createElement(InkDirectorFilm,{frame:0,aspect}));
      expect(markup).toContain('data-km-ink-scene-frame="0"');
      expect(markup).toContain('data-km-ink-paint-frame="419"');
      expect(markup).toContain('data-km-ink-stroke="traveler-ground-edge"');
      expect(markup).toContain('data-km-ink-part-bleed="0.00"');
    }
  });
  it("keeps original traveler stance contacts inside inverse-kinematic reach in both aspects",()=>{
    for(const aspect of ["landscape","portrait"] as const){
      const audit=auditInkWalkContacts(inkDirectorGait(aspect),.5);
      expect(audit.maxError).toBeLessThanOrEqual(.5);
      expect(audit.violations).toEqual([]);
    }
  });
  for(const aspect of ["landscape","portrait"] as const){
    it("renders a natural film stage and independent character performance in "+aspect,()=>{
      const render=(frame:number)=>renderToStaticMarkup(createElement(InkDirectorFilm,{frame,aspect}));
      const start=render(0),walking=render(125),end=render(419);
      expect(start).toContain('data-km-ink-scene=""');
      expect(end).toContain("Across a quiet valley");
      expect(end).toContain('data-km-character-presenter=""');
      expect(end).toContain('data-km-ink-character="ink-traveler-continuous"');
      expect(end).toContain('data-part="far-thigh"');
      expect(end).toContain('data-part="near-shin"');
      expect(end).toContain('data-km-ink-reading-plane=""');
      expect(start).not.toEqual(walking);
      expect(walking).not.toEqual(end);
      expect(render(419)).toEqual(end);
      expect(renderToStaticMarkup(createElement(InkDirectorFilm,{frame:0,aspect,reducedMotion:true})))
        .toContain('data-km-ink-scene=""');
    });
  }
});
