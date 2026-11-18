import {createElement} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {describe,expect,it} from "vitest";
import {buildSourceLedPortraitGeometry,InkSourceLedCharacterPortrait,INK_SOURCE_LED_CHARACTERS,INK_SOURCE_LED_EXPRESSIONS} from "../src/video/ink-source-led-character-portraits";
import type {InkSourceLedCharacterPortraitProps,InkSourceLedExpression} from "../src/video/ink-source-led-character-portraits";
const render=(props:unknown)=>renderToStaticMarkup(createElement(InkSourceLedCharacterPortrait,props as InkSourceLedCharacterPortraitProps));
describe("ANAT6 source-led Ming/Qing Chinese-ink character redraws",()=>{
 it("builds four distinct identities from museum references and ANAT1",()=>{
  expect(INK_SOURCE_LED_CHARACTERS).toEqual(["scholar","shepherd","zhong-kui","lady"]);
  const all=INK_SOURCE_LED_CHARACTERS.map(c=>buildSourceLedPortraitGeometry(c,"neutral",.8));
  expect(all.map(g=>g.sourceObjectId)).toEqual(["CMA 1979.27.2.19","Tsinghua Su Wu · 1874","Met 2002.208.2","Met 52.177.5"]);
  expect(all.map(g=>g.headwear)).toEqual(["scholar-cap","wrapped-hood","loose-hair","pinned-hair"]);
  expect(all.map(g=>g.beardStyle)).toEqual(["pointed","long","full","none"]);
  expect(new Set(all.map(g=>g.faceWidthMm)).size).toBeGreaterThan(2);
  expect(new Set(all.map(g=>g.noseWidthMm)).size).toBeGreaterThan(2);
  expect(all[3].beardFiberCount).toBe(0);
  expect(all[3].landmarks).toHaveProperty("earRootL");
  expect(all[3].eyeOpenings).toHaveLength(2);
  expect(all[3].mouthOutline).toContain("C");
 });
 it("uses connected EXPR1 deformation for eight expression states",()=>{
  expect(INK_SOURCE_LED_EXPRESSIONS).toEqual(["neutral","smile","sad","angry","surprise","fear","disgust","contempt"]);
  for(const character of INK_SOURCE_LED_CHARACTERS){
   const neutral=buildSourceLedPortraitGeometry(character,"neutral",0);
   for(const emotion of INK_SOURCE_LED_EXPRESSIONS){
    const g=buildSourceLedPortraitGeometry(character,emotion,.9);
    const svg=render({character,emotion,intensity:.9,detail:1});
    expect(svg).toContain('data-km-anat1-source="468-point-face-mesh"');
    expect(svg).toContain('data-km-expr1-emotion="'+emotion+'"');
    expect(svg).toContain('data-km-expr1-nearest-emotion="'+g.expressionMatch+'"');
    expect((svg.match(/data-km-anat1-feature=/g)||[]).length).toBeGreaterThan(8);
    expect((svg.match(/data-km-expr1-mark=/g)||[]).length).toBeGreaterThan(0);
    expect((svg.match(/data-km-anat1-eye-opening=/g)||[]).length).toBe(2);
    expect(svg).toContain('data-km-anat1-mouth-shape="true"');
    expect(svg).not.toMatch(/(?:NaN|Infinity|undefined)/);
   }
   expect(buildSourceLedPortraitGeometry(character,"smile",1).expression.mouthCorner).toBeGreaterThan(neutral.expression.mouthCorner);
   expect(buildSourceLedPortraitGeometry(character,"surprise",1).expression.mouthOpen).toBeGreaterThan(neutral.expression.mouthOpen);
  }
 });
 it("blends EXPR1 weights over a 12-frame transition",()=>{
  const a=buildSourceLedPortraitGeometry("lady","smile",1,0,"neutral",0);
  const b=buildSourceLedPortraitGeometry("lady","smile",1,0,"neutral",.5);
  const z=buildSourceLedPortraitGeometry("lady","smile",1,0,"neutral",1);
  expect(a.expression.mouthCorner).toBeCloseTo(0,4);
  expect(b.expression.mouthCorner).toBeGreaterThan(a.expression.mouthCorner);
  expect(b.expression.mouthCorner).toBeLessThan(z.expression.mouthCorner);
  expect(z.expression.mouthCorner).toBeGreaterThan(b.expression.mouthCorner);
  expect([a.transitionProgress,b.transitionProgress,z.transitionProgress]).toEqual([0,.5,1]);
 });
 it("does not render facial hair on the lady and includes source-specific ornaments",()=>{
  const lady=render({character:"lady",emotion:"neutral",detail:1});
  expect(lady).toContain('data-km-ink-anat6-headwear="pinned-hair"');
  expect(lady).toContain('data-km-ink-anat6-beard="none"');
  expect(lady).toContain('data-km-ink-anat6-flower="peony"');
  expect((lady.match(/data-km-ink-anat6-earring=/g)||[]).length).toBe(2);
  expect((lady.match(/data-km-ink-anat6-ear-part=/g)||[]).length).toBe(10);
  expect((lady.match(/data-km-ink-anat6-brow-fiber=/g)||[]).length).toBeGreaterThanOrEqual(8);
  expect(lady).toContain('data-km-ink-anat6-sleeve-cuffs="true"');
  expect((lady.match(/data-km-ink-anat6-cuff-flower=/g)||[]).length).toBe(12);
  expect(lady).toContain('data-km-ink-anat6-fan-ornament="true"');
  expect(lady).toContain('data-km-ink-anat6-fan-hands="true"');
  expect(lady).toContain('data-km-ink-anat6-folded-fan="true"');
  expect(lady).not.toContain("data-km-ink-anat6-beard-fiber=");
  expect(lady).not.toContain('data-km-ink-anat6-moustache="true"');
 });
 it("rejects invalid identities, expressions and numeric controls",()=>{
  expect(()=>render({character:"unknown"})).toThrow(RangeError);
  expect(()=>render({emotion:"unknown"})).toThrow(RangeError);
  expect(()=>render({intensity:NaN})).toThrow(RangeError);
  expect(()=>render({intensity:1.1})).toThrow(RangeError);
  expect(()=>render({detail:.1})).toThrow(RangeError);
  expect(()=>render({yaw:36})).toThrow(RangeError);
  expect(()=>render({transitionProgress:NaN})).toThrow(RangeError);
  expect(()=>render({transitionProgress:1.1})).toThrow(RangeError);
  expect(()=>buildSourceLedPortraitGeometry("scholar","neutral",.8,36)).toThrow(RangeError);
  expect(()=>buildSourceLedPortraitGeometry("scholar","neutral",.8,0,"unknown" as InkSourceLedExpression)).toThrow(RangeError);
 });
});
