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
        expect(svg).toContain('feGaussianBlur');
        expect((svg.match(/data-km-ink-frontal-glaze=/g)||[])).toHaveLength(13);
        expect((svg.match(/data-km-ink-wet-malar=/g)||[])).toHaveLength(4);
        expect((svg.match(/data-km-ink-cloth-pressure=/g)||[])).toHaveLength(17);
        expect((svg.match(/data-km-ink-cloth-dry-lift=/g)||[])).toHaveLength(11);
        expect(svg).toContain('clipPath');
        expect(svg).toContain('hair-crown');
        expect(svg).not.toContain('stroke-width="0"');
      }
    }
  });
  it("does not collapse eye, lip or crease topology when expression keyframes advance",()=>{
    const poses=[0,.25,.5,.75,1].map(t=>
      renderToStaticMarkup(createElement(InkAnatomicalPortrait,
        {character:"elder",emotion:"surprise",intensity:t})));
    const faceInk=poses.map(s=>{
      const element=s.match(/<path[^>]*data-km-ink-mouth-line="true"[^>]*>/)?.[0];
      return element?.match(/\bd="([^"]+)"/)?.[1];
    });
    expect(faceInk.every(Boolean)).toBe(true);
    expect(new Set(faceInk).size).toBe(5);
    for(const p of poses){
      expect((p.match(/data-km-ink-eye=/g)||[])).toHaveLength(2);
      expect((p.match(/data-km-ink-brow=/g)||[])).toHaveLength(2);
      expect(p).not.toMatch(/(?:NaN|Infinity|undefined)/);
    }
  });
  it("keeps the elder's split beard and hair attached to authored support, not a rectangular stamp",()=>{
    const a=renderToStaticMarkup(createElement(InkAnatomicalPortrait,
      {character:"elder",emotion:"neutral",detail:1}));
    const b=renderToStaticMarkup(createElement(InkAnatomicalPortrait,
      {character:"scholar",emotion:"neutral",detail:1}));
    expect((a.match(/data-km-ink-beard-lock=/g)||[])).toHaveLength(5);
    expect((b.match(/data-km-ink-beard-lock=/g)||[])).toHaveLength(0);
    expect(a).toContain('data-km-ink-hair="elder"');
    expect(b).toContain('data-km-ink-hair="scholar"');
    expect((a.match(/clip-path="url\(#ink-a2-/g)||[]).length).toBeGreaterThan(2);
  });
  it("retains historical head-to-robe scale and independent aged orbital/beard relief",()=>{
    const scholar=renderToStaticMarkup(createElement(InkAnatomicalPortrait,
      {character:"scholar",emotion:"smile",detail:1,view:"bust"}));
    const elder=renderToStaticMarkup(createElement(InkAnatomicalPortrait,
      {character:"elder",emotion:"sad",detail:1,view:"face"}));
    for(const s of [scholar,elder]){
      expect(s).toContain('data-km-ink-anatomic-bust-ratio=".69"');
      expect(s).toContain('translate(83.7 130.2) scale(.69)');
      expect(s).toContain('data-km-ink-face-sculpt="lower-third-continuous"');
      expect(s).toContain('data-km-ink-hair=');
      expect(s).not.toMatch(/(?:NaN|Infinity|undefined)/);
    }
    expect(elder).toContain('data-km-ink-age-anatomy="orbital-temporal-volume"');
    expect((elder.match(/data-km-ink-age-frontal=/g)||[])).toHaveLength(4);
    expect((elder.match(/data-km-ink-age-eye=/g)||[])).toHaveLength(2);
    expect(elder).toContain('data-km-ink-beard-substrate="organic"');
    expect((elder.match(/data-km-ink-beard-lock=/g)||[])).toHaveLength(5);
    expect(scholar).not.toContain('data-km-ink-beard-substrate=');
    expect(scholar).not.toContain('data-km-ink-age-anatomy=');
    expect(scholar).toContain('viewBox="0 95 540 525"');
    expect(elder).toContain('viewBox="100 112 345 419"');
  });
  it("draws 4 physically variable-width INK1 calligraphy gestures on independently wrapped robes",()=>{
    const a=renderToStaticMarkup(createElement(InkAnatomicalPortrait,
      {character:"scholar",emotion:"neutral",detail:1}));
    const b=renderToStaticMarkup(createElement(InkAnatomicalPortrait,
      {character:"elder",emotion:"smile",detail:1}));
    for(const svg of [a,b]){
      expect((svg.match(/data-km-ink-native-robe-brush=/g)||[])).toHaveLength(4);
      expect((svg.match(/data-km-ink-brush-pressure="INK1-variable-width"/g)||[]))
        .toHaveLength(4);
      expect(svg).toContain('data-km-ink-native-robe-brush="left-wrap"');
      expect(svg).toContain('data-km-ink-native-robe-brush="right-wrap"');
      expect(svg).toContain('data-km-ink-native-robe-brush="sleeve-left"');
      expect(svg).toContain('data-km-ink-native-robe-brush="sleeve-right"');
      expect((svg.match(/maskUnits="userSpaceOnUse"/g)||[])).toHaveLength(4);
      // INK1's authored tangent bristles are all retained: no 1-in-4
      // sampling shortcut can silently flatten the material at 3x.
      expect((svg.match(/data-km-ink-robe-bristle=/g)||[]).length)
        .toBeGreaterThan(30);
      expect(svg).not.toMatch(/(?:NaN|Infinity|undefined)/);
    }
    expect(a).toContain('data-km-ink-collar="late-ming-scholar-crossed"');
    expect(b).toContain('data-km-ink-collar="elder-overlapping-soft-wrap"');
    expect(a).not.toEqual(b);
  });
  it("rejects invalid emotion and intensity instead of producing a broken SVG",()=>{
    expect(()=>inkPortraitAnatomy("scholar","surprise",NaN)).toThrow(RangeError);
    expect(()=>inkPortraitAnatomy("scholar","sad",-1)).toThrow(RangeError);
    expect(()=>inkPortraitAnatomy("elder","angry",2)).toThrow(RangeError);
  });
});
