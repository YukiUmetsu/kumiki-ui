import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { validateCharacterDefinition } from "../registry/character/validate";
import { samplePoseCorrection } from "../registry/character/authoring";
import { InkDirectorFilm, INK_WALKING_TRAVELLER, inkDirectorGait,
  inkDirectorInstance, inkDirectorRoute } from "../src/video/ink-actor-director-demo";
import { inkWalkAt, inkRouteAt, bakeInkActorTrack } from "../registry/video/ink-actor-director";

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
    expect(stop.x).toBe(hold.x);
    expect(stop.y).toBe(hold.y);
    expect(stop.vx).toBe(0);
    expect(stop.vy).toBe(0);
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
