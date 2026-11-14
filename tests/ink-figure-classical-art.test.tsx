import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { InkFigureStroke } from "../registry/video/ink-figure-craft";
import { inkFigureCraftShapes, DEFAULT_INK_FIGURE_CRAFT } from "../registry/video/ink-figure-craft";
import { evaluateCharacter } from "../registry/character/evaluate";
import { validateCharacterDefinition } from "../registry/character/validate";
import { INK_TRAVELLER } from "../src/video/ink-wash-performer";
import { INK_APPRENTICE } from "../src/video/ink-wash-apprentice";
import {
  makeClassicalInkFigure, INK_TRAVELLER_FOLDS, INK_APPRENTICE_FOLDS,
} from "../src/video/ink-figure-classical-art";
import { inkDuet } from "../src/video/ink-wash-ensemble-demo";
import { InkEnsemble } from "../registry/video/ink-wash-ensemble-react";

describe("INK6 classical figure brushwork", () => {
  const orchid: InkFigureStroke = {
    id: "wind-sleeve", kind: "orchid-leaf",
    points: [{x:15,y:10,pressure:.01},{x:25,y:40,pressure:.8},{x:34,y:60,pressure:.02}],
    width:12,tone:.6,water:.35,detailMin:.4,
  };
  const reed: InkFigureStroke = {
    id: "bent-reed",kind:"broken-reed",
    points: [{x:10,y:10,pressure:.06},{x:20,y:30,pressure:.6},
      {x:24,y:37,pressure:.1},{x:40,y:44,pressure:.05}],
    width:3,tone:.7,water:.16,detailMin:.55,
  };
  it("renders pressure-swollen orchid and separated broken-reed brushes deterministically", () => {
    const marks = inkFigureCraftShapes([orchid,reed]);
    expect(marks).toHaveLength(4); // pale wash + ink orchid, two interrupted ink touches
    expect(marks[0].opacity).toBeLessThan(.5);
    expect(marks.filter(s=>s.fill==="$shadow")).toHaveLength(3);
    expect(marks[2].d).not.toEqual(marks[3].d);
    expect(marks).toEqual(inkFigureCraftShapes([orchid,reed]));
    expect(inkFigureCraftShapes([orchid,reed],{...DEFAULT_INK_FIGURE_CRAFT,detail:.45}))
      .toHaveLength(2);
    expect(inkFigureCraftShapes([orchid,reed],{...DEFAULT_INK_FIGURE_CRAFT,detail:0}))
      .toHaveLength(0);
    expect(()=>inkFigureCraftShapes([{...reed,points:reed.points.slice(0,3)}])).toThrow(RangeError);
    for(const shape of marks){
      expect(shape.type).toBe("path");
      expect(shape.d).not.toMatch(/NaN|Infinity|<|>/);
    }
  });
  for(const [role,original] of [["master",INK_TRAVELLER],["apprentice",INK_APPRENTICE]] as const){
    it(role+" preserves acting identity while adding animated part-native craftsmanship", () => {
      const painted=makeClassicalInkFigure(original,role);
      expect(validateCharacterDefinition(painted).filter(d=>d.severity==="error")).toEqual([]);
      expect(painted.characterId).toEqual(original.characterId);
      expect(painted.revision).not.toEqual(original.revision);
      expect(painted.parts).toBe(original.parts);
      expect(painted.anchors).toBe(original.anchors);
      expect(painted.actions).toBe(original.actions);
      expect(painted.speech).toBe(original.speech);
      expect(painted.blink).toBe(original.blink);
      for(const name of ["robe","sleeve-near","sleeve-far","hair"] as const){
        const source=original.assets[name],result=painted.assets[name];
        expect(result.kind).toBe("shapes");
        if(source.kind!=="shapes"||result.kind!=="shapes")throw Error("expected artwork");
        expect(result.shapes.length).toBeGreaterThan(source.shapes.length);
        expect(result.provenance).toBe(source.provenance);
      }
      const plain=makeClassicalInkFigure(original,role,{...DEFAULT_INK_FIGURE_CRAFT,detail:0});
      expect(plain.assets.robe).toEqual(original.assets.robe);
      expect(painted.assets.robe).not.toEqual(original.assets.robe);
      expect(makeClassicalInkFigure(original,role)).toEqual(painted);
      // No shared object changes when the demo changes density or seeds.
      expect(original.assets.robe).toEqual(plain.assets.robe);
    });
  }
  it("reuses the director's actual master fold atlas, with separate apprentice art", () => {
    expect(INK_TRAVELLER_FOLDS.robe.length).toBeGreaterThan(8);
    expect(INK_APPRENTICE_FOLDS.robe.length).toBeGreaterThan(8);
    expect(INK_APPRENTICE_FOLDS["chin-trace"]).toBeDefined();
    expect(INK_APPRENTICE_FOLDS["sleeve-near"]).not.toEqual(INK_TRAVELLER_FOLDS["sleeve-near"]);
  });
  for(const aspect of ["landscape","portrait"] as const){
    it("exports independent painted characters in "+aspect+" with exact frame determinism", () => {
      const duet=inkDuet(aspect);
      expect(duet.cast).toHaveLength(2);
      expect(new Set(duet.cast.map(item=>item.definition.characterId)).size).toBe(2);
      for(const member of duet.cast){
        expect(member.instance.revision).toEqual(member.definition.revision);
        const pose=evaluateCharacter(member.definition,member.instance,member.cues,188);
        expect(pose.diagnostics.filter(d=>d.severity==="error")).toEqual([]);
        expect(evaluateCharacter(member.definition,member.instance,member.cues,188)).toEqual(pose);
      }
      const screen=renderToStaticMarkup(createElement(InkEnsemble,{
        ...duet,frame:188,showGrounding:false,
      }));
      expect(screen).toContain('data-km-character-presenter=""');
      expect(screen).toContain('data-km-ink-character-part="body"');
      expect(screen).toContain('data-km-ink-character-part="hair"');
      expect(screen).toEqual(renderToStaticMarkup(createElement(InkEnsemble,{
        ...duet,frame:188,showGrounding:false,
      })));
      const simple=inkDuet(aspect,{...DEFAULT_INK_FIGURE_CRAFT,detail:0});
      expect(screen.length).toBeGreaterThan(renderToStaticMarkup(createElement(InkEnsemble,{
        ...simple,frame:188,showGrounding:false,
      })).length);
    });
  }
});
