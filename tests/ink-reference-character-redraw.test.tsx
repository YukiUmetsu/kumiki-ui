import {createElement} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {describe,expect,it} from "vitest";
import {
  InkReferenceCharacterRedraw,INK_REFERENCE_EXPRESSIONS,
} from "../src/video/ink-reference-character-redraw";
import type {InkReferenceCharacterRedrawProps} from "../src/video/ink-reference-character-redraw";

const render=(props:unknown)=>
  renderToStaticMarkup(createElement(InkReferenceCharacterRedraw,props as InkReferenceCharacterRedrawProps));

describe("ANAT3 reference-led Chinese ink character redraw",()=>{
  it("projects the ANAT1 facial topology and feature curves into native ink source space",()=>{
    const svg=render({character:"scholar",emotion:"neutral",detail:1});
    expect(svg).toContain('data-km-ink-reference-redraw="ANAT3"');
    expect(svg).toContain('data-km-anat1-source="468-point-face-mesh"');
    expect(svg).toContain('data-km-anat1-landmarks="35"');
    expect((svg.match(/data-km-anat1-feature=/g)||[]).length).toBeGreaterThan(6);
    expect(svg).toContain('data-km-ink-reference-wash-planes="forehead-orbit-malar-nose-jaw"');
    expect(svg).not.toMatch(/(?:NaN|Infinity|undefined)/);
  });

  it("keeps the scholar and elder as distinct source-led identities, not recolors",()=>{
    const scholar=render({character:"scholar",emotion:"neutral",detail:1});
    const elder=render({character:"elder",emotion:"neutral",detail:1});
    expect(scholar).toContain('data-km-ink-reference-source="LOC-1903-cph-3a44343"');
    expect(elder).toContain('data-km-ink-reference-source="LOC-1860-LCCN2011660679"');
    expect(scholar).toContain('data-km-anat1-shape="source-informed-landmark-morph"');
    const width=(svg:string)=>Number(svg.match(/data-km-anat1-face-width-mm="([^"]+)"/)?.[1]);
    expect(Math.abs(width(scholar)-width(elder))).toBeGreaterThan(1);
    expect((scholar.match(/data-km-ink-moustache-fiber=/g)||[])).toHaveLength(22);
    expect((elder.match(/data-km-ink-beard-fiber=/g)||[])).toHaveLength(72);
    expect(scholar).not.toContain('data-km-ink-reference-beard=');
    expect(elder).not.toContain('data-km-ink-reference-moustache=');
    expect(scholar).not.toEqual(elder);
  });

  it("uses EXPR1 deformation, gaze and crease marks for every supported expression",()=>{
    for(const emotion of INK_REFERENCE_EXPRESSIONS){
      const svg=render({character:"elder",emotion,intensity:.85,detail:1});
      expect(svg).toContain('data-km-expr1-emotion="'+emotion+'"');
      expect(svg).toContain('data-km-expr1-nearest=');
      expect((svg.match(/data-km-expr1-mark=/g)||[]).length).toBeGreaterThan(0);
      expect((svg.match(/data-km-anat1-iris=/g)||[])).toHaveLength(2);
      expect(svg).not.toMatch(/(?:NaN|Infinity|undefined)/);
    }
    expect(render({character:"scholar",emotion:"smile",intensity:1}))
      .not.toEqual(render({character:"scholar",emotion:"neutral",intensity:0}));
  });

  it("rejects invalid identity, expression and non-finite controls",()=>{
    expect(()=>render({character:"unknown"})).toThrow(RangeError);
    expect(()=>render({emotion:"unknown"})).toThrow(RangeError);
    expect(()=>render({intensity:NaN})).toThrow(RangeError);
    expect(()=>render({detail:.1})).toThrow(RangeError);
  });
});
