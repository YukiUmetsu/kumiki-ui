import {describe,it,expect} from "vitest";
import {renderToStaticMarkup} from "react-dom/server";
import {createElement} from "react";
import {InkAnatomicalPortrait,inkPortraitAnatomy,INK_PORTRAIT_EMOTIONS,
  INK_PORTRAIT_CHARACTERS} from "../src/video/ink-anatomical-portrait";

describe("Chinese ink ANAT2: independent anatomically rebuilt figures",()=>{
  it("is two genuinely different measured ANAT1 faces, not one rescaled source head",()=>{
    const a=inkPortraitAnatomy("scholar"),b=inkPortraitAnatomy("elder");
    expect(a.measurements.zyZy).not.toEqual(b.measurements.zyZy);
    expect(a.measurements.alAl).not.toEqual(b.measurements.alAl);
    expect(a.measurements.nGn).not.toEqual(b.measurements.nGn);
    expect(a.posed.vertices).not.toEqual(b.posed.vertices);
    expect(INK_PORTRAIT_CHARACTERS).toEqual(["scholar","elder"]);
  });
  it("returns precisely the neutral face for 0% action unit intensity",()=>{
    for(const character of INK_PORTRAIT_CHARACTERS){
      const neutral=inkPortraitAnatomy(character,"neutral");
      for(const emotion of INK_PORTRAIT_EMOTIONS){
        expect(inkPortraitAnatomy(character,emotion,0).posed.vertices)
          .toEqual(neutral.posed.vertices);
      }
    }
  });
  it("moves the actual mouth, brow, cheeks and eyelids via EXPR1",()=>{
    const base=inkPortraitAnatomy("scholar","neutral");
    const smile=inkPortraitAnatomy("scholar","smile",1);
    const sad=inkPortraitAnatomy("scholar","sad",1);
    const angry=inkPortraitAnatomy("scholar","angry",1);
    const surprise=inkPortraitAnatomy("scholar","surprise",1);
    expect(smile.features.cheekRaise).toBeGreaterThan(base.features.cheekRaise);
    expect(smile.features.mouthCorner).toBeGreaterThan(0);
    expect(sad.features.mouthCorner).toBeLessThan(0);
    expect(sad.features.browInner).toBeGreaterThan(0);
    expect(angry.features.browInner).toBeLessThan(0);
    expect(surprise.features.eyeOpen).toBeGreaterThan(1);
    expect(surprise.features.jaw).toBeGreaterThan(0);
    expect(smile.expressionMarks.some(m=>m.id.startsWith("crows-feet"))).toBe(true);
    expect(angry.expressionMarks.some(m=>m.id.startsWith("glabella"))).toBe(true);
  });
  it("retains many separate contour and wash passes at both zoom levels",()=>{
    for(const character of INK_PORTRAIT_CHARACTERS){
      for(const view of ["bust","face"] as const){
        const svg=renderToStaticMarkup(createElement(InkAnatomicalPortrait,
          {character,emotion:"smile",intensity:1,detail:1,view}));
        expect(svg).toContain('data-ink-character="'+character+'"');
        expect(svg).toContain('data-km-ink-anatomy-washes="true"');
        expect(svg).toContain('data-km-ink-ear="near"');
        expect(svg).toContain('data-km-ink-brow="L"');
        expect(svg).toContain('data-km-ink-brow="R"');
        expect(svg).toContain('data-km-ink-costume="'+character+'"');
        expect(svg).toContain('data-km-ink-mouth-line="true"');
        expect((svg.match(/<path /g)||[]).length).toBeGreaterThan(140);
        expect(svg).not.toMatch(/(?:NaN|Infinity|undefined)/);
        expect(svg).toContain('clipPath');
        expect(svg).toContain('feTurbulence');
      }
    }
  });
  it("does not collapse eye, lip or crease topology when expression keyframes advance",()=>{
    const poses=[0,.25,.5,.75,1].map(t=>
      renderToStaticMarkup(createElement(InkAnatomicalPortrait,
        {character:"elder",emotion:"surprise",intensity:t})));
    const faceInk=poses.map(s=>s.match(/data-km-ink-mouth-line="true" d="([^"]+)/)?.[1]);
    expect(new Set(faceInk).size).toBe(5);
    for(const p of poses){
      expect((p.match(/data-km-ink-eye=/g)||[])).toHaveLength(2);
      expect((p.match(/data-km-ink-brow=/g)||[])).toHaveLength(2);
      expect(p).not.toMatch(/(?:NaN|Infinity|undefined)/);
    }
  });
  it("rejects invalid emotion and intensity instead of producing a broken SVG",()=>{
    expect(()=>inkPortraitAnatomy("scholar","surprise",NaN)).toThrow(RangeError);
    expect(()=>inkPortraitAnatomy("scholar","sad",-1)).toThrow(RangeError);
    expect(()=>inkPortraitAnatomy("elder","angry",2)).toThrow(RangeError);
  });
});
