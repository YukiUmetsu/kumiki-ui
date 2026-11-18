import {createElement} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {describe,expect,it} from "vitest";
import {
  buildSourceLedPortraitGeometry,InkSourceLedCharacterPortrait,
  INK_SOURCE_LED_CHARACTERS,INK_SOURCE_LED_EXPRESSIONS,
} from "../src/video/ink-source-led-character-portraits";
import type {InkSourceLedCharacterPortraitProps} from "../src/video/ink-source-led-character-portraits";

const render=(props:unknown)=>renderToStaticMarkup(
  createElement(InkSourceLedCharacterPortrait,props as InkSourceLedCharacterPortraitProps),
);

describe("ANAT6 source-led Ming/Qing Chinese-ink character redraws",()=>{
  it("builds three independent source-informed identities from ANAT1 topology",()=>{
    expect(INK_SOURCE_LED_CHARACTERS).toEqual(["scholar","shepherd","zhong-kui"]);
    const scholar=buildSourceLedPortraitGeometry("scholar","neutral",.8);
    const shepherd=buildSourceLedPortraitGeometry("shepherd","neutral",.8);
    const zhongKui=buildSourceLedPortraitGeometry("zhong-kui","neutral",.8);
    expect([scholar.sourceObjectId,shepherd.sourceObjectId,zhongKui.sourceObjectId])
      .toEqual(["CMA 1979.27.2.19","Tsinghua Su Wu · 1874","Met 2002.208.2"]);
    expect([scholar.headwear,shepherd.headwear,zhongKui.headwear])
      .toEqual(["scholar-cap","wrapped-hood","loose-hair"]);
    expect([scholar.beardStyle,shepherd.beardStyle,zhongKui.beardStyle])
      .toEqual(["pointed","long","full"]);
    expect(new Set([scholar.faceWidthMm,shepherd.faceWidthMm,zhongKui.faceWidthMm]).size).toBeGreaterThan(1);
    expect(new Set([scholar.noseWidthMm,shepherd.noseWidthMm,zhongKui.noseWidthMm]).size).toBeGreaterThan(1);
    expect(scholar.beardFiberCount).toBeGreaterThan(50);
    expect(shepherd.beardFiberCount).toBeGreaterThan(scholar.beardFiberCount);
    expect(zhongKui.beardFiberCount).toBeGreaterThan(shepherd.beardFiberCount);
    expect(scholar.features.length).toBeGreaterThan(8);
    expect(shepherd.landmarks).toHaveProperty("pronasale");
    expect(zhongKui.outline).toContain("C");
  });

  it("uses EXPR1 connected facial deformation across all six expressions",()=>{
    expect(INK_SOURCE_LED_EXPRESSIONS).toEqual(["neutral","smile","sad","angry","surprise","fear"]);
    for(const character of INK_SOURCE_LED_CHARACTERS){
      const neutral=buildSourceLedPortraitGeometry(character,"neutral",0);
      for(const emotion of INK_SOURCE_LED_EXPRESSIONS){
        const geometry=buildSourceLedPortraitGeometry(character,emotion,.9);
        const svg=render({character,emotion,intensity:.9,detail:1});
        expect(svg).toContain('data-km-anat1-source="468-point-face-mesh"');
        expect(svg).toContain('data-km-expr1-emotion="'+emotion+'"');
        expect(svg).toContain('data-km-ink-anat6-source-object="'+geometry.sourceObjectId+'"');
        expect((svg.match(/data-km-anat1-feature=/g)||[]).length).toBeGreaterThan(8);
        expect((svg.match(/data-km-expr1-mark=/g)||[]).length).toBeGreaterThan(0);
        expect((svg.match(/data-km-ink-anat6-beard-fiber=/g)||[]).length).toBeGreaterThan(30);
        expect(svg).not.toMatch(/(?:NaN|Infinity|undefined)/);
      }
      const smile=buildSourceLedPortraitGeometry(character,"smile",1);
      expect(smile.expression.mouthCorner).toBeGreaterThan(neutral.expression.mouthCorner);
      const surprise=buildSourceLedPortraitGeometry(character,"surprise",1);
      expect(surprise.expression.mouthOpen).toBeGreaterThan(neutral.expression.mouthOpen);
    }
  });

  it("keeps headwear, beard, facial planes and robe construction distinct",()=>{
    const scholar=render({character:"scholar",emotion:"neutral",detail:1});
    const shepherd=render({character:"shepherd",emotion:"neutral",detail:1});
    const zhongKui=render({character:"zhong-kui",emotion:"neutral",detail:1});
    expect(scholar).toContain('data-km-ink-anat6-headwear="scholar-cap"');
    expect(shepherd).toContain('data-km-ink-anat6-headwear="wrapped-hood"');
    expect(zhongKui).toContain('data-km-ink-anat6-headwear="loose-hair"');
    expect(scholar).toContain('data-km-ink-anat6-beard="pointed"');
    expect(shepherd).toContain('data-km-ink-anat6-beard="long"');
    expect(zhongKui).toContain('data-km-ink-anat6-beard="full"');
    expect((scholar.match(/data-km-ink-anat6-robe-fold=/g)||[]).length).toBe(10);
    expect((shepherd.match(/data-km-ink-anat6-robe-fold=/g)||[]).length).toBe(12);
    expect((zhongKui.match(/data-km-ink-anat6-robe-fold=/g)||[]).length).toBe(14);
    expect(scholar).not.toEqual(shepherd);
    expect(shepherd).not.toEqual(zhongKui);
  });

  it("rejects unknown identities, expressions and invalid controls",()=>{
    expect(()=>render({character:"unknown"})).toThrow(RangeError);
    expect(()=>render({emotion:"unknown"})).toThrow(RangeError);
    expect(()=>render({intensity:NaN})).toThrow(RangeError);
    expect(()=>render({intensity:1.1})).toThrow(RangeError);
    expect(()=>render({detail:.1})).toThrow(RangeError);
    expect(()=>render({yaw:36})).toThrow(RangeError);
    expect(()=>buildSourceLedPortraitGeometry("scholar","neutral",.8,36)).toThrow(RangeError);
  });
});
