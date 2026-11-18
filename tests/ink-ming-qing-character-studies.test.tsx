import {createElement} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {describe,expect,it} from "vitest";
import {
  buildMingQingPortraitGeometry,InkMingQingCharacterStudy,
  INK_MING_QING_CHARACTERS,INK_MING_QING_EXPRESSIONS,
} from "../src/video/ink-ming-qing-character-studies";
import type {InkMingQingCharacterStudyProps} from "../src/video/ink-ming-qing-character-studies";

const render=(props:unknown)=>renderToStaticMarkup(
  createElement(InkMingQingCharacterStudy,props as InkMingQingCharacterStudyProps),
);

describe("ANAT5 original Ming/Qing Chinese ink character studies",()=>{
  it("builds three independent source-informed identities from ANAT1",()=>{
    expect(INK_MING_QING_CHARACTERS).toEqual(["scholar","writer","attendant"]);
    const scholar=buildMingQingPortraitGeometry("scholar","neutral",.8);
    const writer=buildMingQingPortraitGeometry("writer","neutral",.8);
    const attendant=buildMingQingPortraitGeometry("attendant","neutral",.8);
    expect([scholar.sourceObjectId,writer.sourceObjectId,attendant.sourceObjectId])
      .toEqual(["55.37","2024.180","2024.180"]);
    expect(scholar.sourceReferences).toHaveLength(2);
    expect(writer.sourceReferences).toHaveLength(2);
    expect(attendant.sourceReferences.some(x=>x.includes("F1916.135"))).toBe(true);
    expect(new Set([scholar.faceWidthMm,writer.faceWidthMm,attendant.faceWidthMm]).size).toBeGreaterThan(1);
    expect(new Set([scholar.mouthWidthMm,writer.mouthWidthMm,attendant.mouthWidthMm]).size).toBeGreaterThan(1);
    expect(scholar.beardFiberCount).toBeGreaterThan(40);
    expect(writer.beardFiberCount).toBe(0);
    expect(attendant.beardFiberCount).toBe(0);
    expect(writer.hairStyle).not.toBe(attendant.hairStyle);
    expect(scholar.features.length).toBeGreaterThan(6);
    expect(writer.landmarks).toHaveProperty("pronasale");
    expect(attendant.features.every(x=>x.d.length>0)).toBe(true);
  });

  it("uses EXPR1 landmark deformation for six expressions on each identity",()=>{
    expect(INK_MING_QING_EXPRESSIONS).toEqual(["neutral","smile","sad","surprise","fear","angry"]);
    for(const character of INK_MING_QING_CHARACTERS){
      const neutral=buildMingQingPortraitGeometry(character,"neutral",0);
      for(const emotion of INK_MING_QING_EXPRESSIONS){
        const geometry=buildMingQingPortraitGeometry(character,emotion,.9);
        const svg=render({character,emotion,intensity:.9,detail:1});
        expect(svg).toContain('data-km-anat1-source="468-point-face-mesh"');
        expect(svg).toContain('data-km-expr1-emotion="'+emotion+'"');
        expect(svg).toContain('data-km-ink-anat5-source-object="'+geometry.sourceObjectId+'"');
        expect((svg.match(/data-km-anat1-feature=/g)||[]).length).toBeGreaterThan(6);
        expect((svg.match(/data-km-expr1-mark=/g)||[]).length).toBeGreaterThan(0);
        expect(svg).not.toMatch(/(?:NaN|Infinity|undefined)/);
      }
      const smile=buildMingQingPortraitGeometry(character,"smile",1);
      expect(smile.expression.mouthCorner).toBeGreaterThan(neutral.expression.mouthCorner);
    }
  });

  it("keeps source-specific identity layers separate",()=>{
    const scholar=render({character:"scholar",emotion:"neutral",detail:1});
    const writer=render({character:"writer",emotion:"neutral",detail:1});
    const attendant=render({character:"attendant",emotion:"neutral",detail:1});
    expect(scholar).toContain('data-km-ink-anat5-hair-style="tall-scholar-cap"');
    expect(writer).toContain('data-km-ink-anat5-hair-style="pinned-writer-coil"');
    expect(attendant).toContain('data-km-ink-anat5-hair-style="attendant-double-pin"');
    expect((scholar.match(/data-km-ink-anat5-beard-fiber=/g)||[]).length).toBeGreaterThan(40);
    expect((writer.match(/data-km-ink-anat5-hair-fiber=/g)||[]).length).toBeGreaterThan(20);
    expect((attendant.match(/data-km-ink-anat5-hair-fiber=/g)||[]).length).toBeGreaterThan(20);
    expect(scholar).not.toEqual(writer);
    expect(writer).not.toEqual(attendant);
  });


  it("preserves source-specific facial anatomy and independent material structures",()=>{
    const scholar=render({character:"scholar",emotion:"neutral",detail:1});
    const writer=render({character:"writer",emotion:"neutral",detail:1});
    const attendant=render({character:"attendant",emotion:"neutral",detail:1});
    for(const svg of [scholar,writer,attendant]){
      expect(svg).toContain('data-km-ink-anat5-source-references=');
      expect((svg.match(/data-km-ink-anat5-eye-aperture=/g)||[])).toHaveLength(2);
      expect((svg.match(/data-km-ink-anat5-eye-lid-fold=/g)||[])).toHaveLength(2);
      expect((svg.match(/data-km-ink-anat5-nostril=/g)||[])).toHaveLength(2);
      expect((svg.match(/data-km-ink-anat5-philtrum=/g)||[])).toHaveLength(2);
      expect((svg.match(/data-km-ink-anat5-brow-fiber=/g)||[])).toHaveLength(28);
      expect((svg.match(/data-km-ink-anat5-paper-thread=/g)||[])).toHaveLength(72);
      expect((svg.match(/data-km-ink-anat5-paper-pigment-speck=/g)||[])).toHaveLength(28);
      expect((svg.match(/data-km-ink-anat5-ear-helix=/g)||[])).toHaveLength(2);
      expect(svg).toContain('data-km-ink-anat5-lip-volume="vermilion-border"');
      expect(svg).toContain('data-km-ink-anat5-nose-bridge-wash="true"');
    }
    expect(scholar).toContain('data-km-ink-anat5-cap-front-panel="woven-black-cloth"');
    expect((scholar.match(/data-km-ink-anat5-cap-weave=/g)||[])).toHaveLength(11);
    expect((scholar.match(/data-km-ink-anat5-beard-substrate=/g)||[])).toHaveLength(2);
    expect((scholar.match(/data-km-ink-anat5-moustache-substrate=/g)||[])).toHaveLength(2);
    expect((writer.match(/data-km-ink-anat5-collar-motif=/g)||[])).toHaveLength(18);
    expect(writer).toContain('data-km-ink-anat5-writer-hair-ornament="floral-coil"');
    expect((writer.match(/data-km-ink-anat5-earring=/g)||[])).toHaveLength(1);
    expect((attendant.match(/data-km-ink-anat5-collar-motif=/g)||[])).toHaveLength(18);
    expect(attendant).toContain('data-km-ink-anat5-attendant-hair-pins="paired-coils"');
    expect((attendant.match(/data-km-ink-anat5-earring=/g)||[])).toHaveLength(1);
  });

  it("rejects invalid identities, expressions and non-finite controls",()=>{
    expect(()=>render({character:"unknown"})).toThrow(RangeError);
    expect(()=>render({emotion:"unknown"})).toThrow(RangeError);
    expect(()=>render({intensity:NaN})).toThrow(RangeError);
    expect(()=>render({intensity:1.1})).toThrow(RangeError);
    expect(()=>render({detail:.1})).toThrow(RangeError);
  });
});
