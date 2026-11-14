import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { evaluateCharacter } from "../registry/character/evaluate";
import { validateCharacterDefinition } from "../registry/character/validate";
import { CharacterPresenter } from "../registry/character/character-presenter-react";
import { assertInkActorTrack, inkActorAt } from "../registry/video/ink-wash-character";
import { InkCharacter } from "../registry/video/ink-wash-character-react";
import { INK_TRAVELLER, TRAVELLER_CUES, TRAVELLER_INSTANCE, TRAVELLER_TRACK } from "../src/video/ink-wash-performer";
import { InkPerformanceFilm } from "../src/video/ink-wash-character.stories";

describe("INK3 character-first, authored-pigment performance",()=>{
  it("uses the canonical approved character rig with all part references and original art valid",()=>{
    const issues=validateCharacterDefinition(INK_TRAVELLER);
    expect(issues.filter(x=>x.severity==="error")).toEqual([]);
    expect(INK_TRAVELLER.parts.length).toBeGreaterThanOrEqual(15);
    expect(INK_TRAVELLER.capabilities).toEqual(expect.arrayContaining([
      "blink","gaze","speech","acting","layered-ink",
    ]));
  });
  it("places feet on a deterministic paper-space track across all keyframe boundaries",()=>{
    expect(()=>assertInkActorTrack(TRAVELLER_TRACK)).not.toThrow();
    const start=inkActorAt(TRAVELLER_TRACK,0),end=inkActorAt(TRAVELLER_TRACK,350);
    expect(start.x).toBe(250);
    expect(end.x).toBe(587);
    const mid=inkActorAt(TRAVELLER_TRACK,55);
    expect(mid.x).toBeGreaterThan(250);
    expect(mid.x).toBeLessThan(560);
    expect(inkActorAt(TRAVELLER_TRACK,130)).toEqual(
      inkActorAt(TRAVELLER_TRACK,130));
    expect(inkActorAt(TRAVELLER_TRACK,130,true)).toEqual(end);
  });
  it("rejects invalid staging IDs, duplicate frames, NaN, and unsafe scale",()=>{
    const base=TRAVELLER_TRACK;
    expect(()=>assertInkActorTrack({...base,keys:[]})).toThrow(RangeError);
    expect(()=>assertInkActorTrack({...base,keys:[base.keys[0],base.keys[0]]})).toThrow(RangeError);
    expect(()=>assertInkActorTrack({...base,id:"not valid"})).toThrow(RangeError);
    expect(()=>assertInkActorTrack({...base,keys:[{frame:0,x:0,y:0,scale:Infinity}]})).toThrow(RangeError);
    expect(()=>inkActorAt(base,-1)).toThrow(RangeError);
  });
  it("samples walk, gesture, voice, and bow independently without accumulating mutable state",()=>{
    for (const frame of [12,42,72,104,153,180,200,276,298,325]){
      const actual=evaluateCharacter(INK_TRAVELLER,TRAVELLER_INSTANCE,TRAVELLER_CUES,frame);
      const again=evaluateCharacter(INK_TRAVELLER,TRAVELLER_INSTANCE,TRAVELLER_CUES,frame);
      expect(actual).toEqual(again);
      expect(actual.diagnostics.filter(x=>x.severity==="error")).toEqual([]);
    }
    const talking=evaluateCharacter(INK_TRAVELLER,TRAVELLER_INSTANCE,TRAVELLER_CUES,188);
    expect(["aa","oh","mm"]).toContain(talking.parts.mouth.variant);
    const after=evaluateCharacter(INK_TRAVELLER,TRAVELLER_INSTANCE,TRAVELLER_CUES,248);
    expect(["rest","smile",undefined]).toContain(after.parts.mouth.variant);
  });
  it("keeps standard flat character visuals unchanged unless ink material is explicitly requested",()=>{
    const props={definition:INK_TRAVELLER,instance:TRAVELLER_INSTANCE,cues:TRAVELLER_CUES,
      frame:194,label:"Author-approved ink puppet",reducedMotion:false};
    const flat=renderToStaticMarkup(createElement(CharacterPresenter,props));
    const ink=renderToStaticMarkup(createElement(CharacterPresenter,
      {...props,inkMaterial:{seed:31,grain:.8,absorption:.85}}));
    expect(flat).not.toContain("data-km-ink-character-shape");
    expect(ink).toContain("data-km-ink-character-shape");
    expect(ink).toContain("feDisplacementMap");
    expect(ink).toContain("feGaussianBlur");
    expect(flat).toContain('data-km-character-presenter=""');
    expect(ink).toContain('data-km-character-presenter=""');
    expect(()=>renderToStaticMarkup(createElement(CharacterPresenter,
      {...props,inkMaterial:{seed:-1,grain:.8,absorption:.5}}))).toThrow(RangeError);
  });
  it("renders a figure with the same absolute frame across placement and expression",()=>{
    const props={definition:INK_TRAVELLER,instance:TRAVELLER_INSTANCE,
      cues:TRAVELLER_CUES,track:TRAVELLER_TRACK,frame:188,
      label:"Ink traveller"};
    const html=renderToStaticMarkup(createElement(InkCharacter,props));
    expect(html).toContain('data-km-ink-character="scholar-staging"');
    expect(html).toContain('data-km-ink-character-frame="188"');
    expect(html).toContain('data-km-character-presenter=""');
    expect(html).toBe(renderToStaticMarkup(createElement(InkCharacter,props)));
    expect(()=>renderToStaticMarkup(createElement(InkCharacter,
      {...props,track:{...TRAVELLER_TRACK,instanceId:"different"}}))).toThrow(RangeError);
  });
  it("composes approved articulated character with painted ground, fixed text and a matte in both formats",()=>{
    for(const aspect of ["landscape","portrait"] as const) {
      const film=renderToStaticMarkup(createElement(InkPerformanceFilm,{frame:188,aspect}));
      expect(film).toContain('data-km-ink-scene=""');
      expect(film).toContain("A look, a greeting, and a voice.");
      expect(film).toContain("scholar-staging");
      expect(film).toContain('data-km-ink-paint=""');
      expect(film).toContain('data-km-ink-reading-plane=""');
    }
  });
});
