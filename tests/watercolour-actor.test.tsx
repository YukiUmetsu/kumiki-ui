import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { WatercolourActor } from "../registry/video/watercolour-actor-react";
import { inspectWatercolourActorTrack, watercolourActorAt } from "../registry/video/watercolour-actor";
import { validateCharacterDefinition } from "../registry/character/validate";
import { evaluateCharacter } from "../registry/character/evaluate";
import { TRAVELLER, TRAVELLER_CUES, travellerTrack, PaintedTravellerPage } from "../src/video/watercolour-actor-demo";
import { WATERCOLOUR_ACTOR_FILM } from "../src/video/watercolour-actor-film";
import { compileFilm } from "../registry/video/film-document";
import { loadFilmSlots } from "../src/film/film-slots";
import portable from "../examples/film/watercolour-character.film.json";

const instance={
  instanceId:"traveller",characterId:TRAVELLER.characterId,revision:TRAVELLER.revision,seed:83,
  targets:{viewer:{x:180,y:117}},
};
const material={granulation:.72,bleed:.42,tooth:.81,seed:97};
describe("WM3 watercolor character performing on original painted paper",()=>{
  it("validates source character art, speech/expression channels and stage paths",()=>{
    expect(validateCharacterDefinition(TRAVELLER).filter(d=>d.severity==="error")).toEqual([]);
    expect(TRAVELLER.parts.length).toBeGreaterThanOrEqual(12);
    expect(TRAVELLER.actions["step-left"]).toBeDefined();
    expect(TRAVELLER.actions["step-right"]).toBeDefined();
    expect(TRAVELLER.actions.wave).toBeDefined();
    expect(TRAVELLER.speech?.visemes.A).toBe("open");
    for(const aspect of ["landscape","portrait"] as const){
      const track=travellerTrack(aspect);
      expect(inspectWatercolourActorTrack(track)).toEqual([]);
      expect(track.keys[track.keys.length-1].x).toBeLessThan(track.stage.width);
    }
  });
  it("samples grounded steps, body tilt and held final stance without accumulated drift",()=>{
    const track={...travellerTrack("landscape"),keys:[
      {frame:0,x:100,y:400,scale:1,facing:"right" as const,stepsToNext:1},
      {frame:40,x:300,y:400,scale:1,facing:"left" as const},
    ]};
    expect(inspectWatercolourActorTrack(track)).toEqual([]);
    const first=watercolourActorAt(track,0),raised=watercolourActorAt(track,10);
    const down=watercolourActorAt(track,20),end=watercolourActorAt(track,40);
    expect(first.grounded).toBe(true);
    expect(raised.lift).toBeGreaterThan(0);
    expect(raised.grounded).toBe(false);
    expect(raised.shadowScale).toBeLessThan(1);
    expect(down.grounded).toBe(true);
    expect(end.facing).toBe("left");
    expect(watercolourActorAt(track,39).facing).toBe("right");
    expect(end.lift).toBe(0);
    const held = watercolourActorAt(track,500);
    // Stage is static after the final placement key, while existing rig channels
    // may continue breathing/blinking at their own absolute character frame.
    expect({...held,rigFrame:end.rigFrame}).toEqual(end);
    expect(held.rigFrame).toBe(500);
    const sample=watercolourActorAt(track,13);
    watercolourActorAt(track,37);watercolourActorAt(track,2);
    expect(watercolourActorAt(track,13)).toEqual(sample);
    expect(watercolourActorAt(track,0,true).x).toBe(end.x);
    expect(watercolourActorAt(track,0,true).lift).toBe(0);
    expect(()=>watercolourActorAt(track,-1)).toThrow(RangeError);
  });
  it("supports on twos, deterministic leg actions, facial expressions, eye blinks and speech",()=>{
    const track=travellerTrack("landscape");
    expect(watercolourActorAt(track,205).rigFrame).toBe(204);
    const pose=evaluateCharacter(TRAVELLER,instance,TRAVELLER_CUES,334);
    expect(Object.keys(pose.parts)).toEqual(expect.arrayContaining(["leg-left","leg-right","eyes","mouth","arm-right"]));
    expect(pose.diagnostics.filter(d=>d.severity==="error")).toEqual([]);
    const markup=renderToStaticMarkup(<WatercolourActor track={track} definition={TRAVELLER}
      instance={instance} cues={TRAVELLER_CUES} frame={334} watercolourMaterial={material}
      label="Painted traveller performing"/>);
    expect(markup).toContain('data-km-watercolour-actor="traveller"');
    expect(markup).toContain('data-km-watercolour-character-part=""');
    expect(markup).toContain('data-km-character-presenter=""');
    expect(markup).toContain('data-part="mouth"');
    expect(markup).toContain('data-part="eyes"');
    expect(markup).toContain("feTurbulence");
    expect(markup).toContain("feGaussianBlur");
    expect(markup).toContain("Painted traveller performing");
    const reduced=renderToStaticMarkup(<WatercolourActor track={track} definition={TRAVELLER}
      instance={instance} cues={TRAVELLER_CUES} frame={0} reducedMotion
      watercolourMaterial={material} label="Quiet traveller"/>);
    expect(reduced).toContain('data-km-watercolour-contact="grounded"');
    expect(()=>renderToStaticMarkup(<WatercolourActor track={track} definition={TRAVELLER}
      instance={instance} cues={TRAVELLER_CUES} frame={0}
      watercolourMaterial={{...material,tooth:2}} label="Invalid"/>)).toThrow(RangeError);
    expect(inspectWatercolourActorTrack({...track,keys:track.keys.slice().reverse()})).toContain("/keys/1");
  });
  it("renders the original painted environment and reusable performance in both aspects",()=>{
    for(const output of ["landscape","portrait"] as const){
      const markup=renderToStaticMarkup(<PaintedTravellerPage output={output} frame={330}/>);
      expect(markup).toContain("data-km-watercolour-actor");
      expect(markup).toContain("data-km-painted-composition");
      expect(markup).toContain("Every journey");
      expect(markup).toContain("data-km-watercolour-character-part");
    }
  });
  it("exports portable FD1 through the exact production-slot API, not Storybook-only markup",async()=>{
    expect(portable).toEqual(WATERCOLOUR_ACTOR_FILM);
    for(const outputId of ["landscape","portrait"] as const){
      const compiled=compileFilm(portable,{outputId});
      expect(compiled.ok).toBe(true);
      if(!compiled.ok)continue;
      expect(compiled.film.durationFrames).toBe(430);
      const loader=await loadFilmSlots(compiled.film);
      const scene=renderToStaticMarkup(<>{loader(
        {slot:"watercolour-actor",label:"Painted character",props:{}},
        {frame:336,fps:{num:30,den:1},durationFrames:430,
          width:compiled.film.width,height:compiled.film.height,reducedMotion:false},
      )}</>);
      expect(scene).toContain("data-km-character-presenter");
      expect(scene).toContain("data-km-watercolour-character-part");
    }
  });
});
