import { describe, expect, it } from "vitest";
import { inkExampleSpec } from "../src/video/ink-wash-demo";
import { configureInkSpec, DEFAULT_INK_MATERIAL } from "../src/video/ink-film-config";
import {
  assertInkStrokeOverrides, configureInkStrokes, DEFAULT_INK_STROKE_TUNING,
} from "../src/video/ink-stroke-controls";

const base=configureInkSpec(inkExampleSpec("landscape","landscape",47),DEFAULT_INK_MATERIAL);
const id=base.strokes[0].id;

describe("Film Looks per-stroke ink authoring",()=>{
  it("edits only the selected immutable stroke, and allows frame-exact reverse seeking",()=>{
    const tuning={...DEFAULT_INK_STROKE_TUNING,
      width:1.7,tone:1.3,water:.5,load:.8,drag:.9,offsetX:22,offsetY:-8,startOffset:12};
    const result=configureInkStrokes(base,{[id]:tuning});
    expect(result).not.toBe(base);
    expect(result.strokes[0]).not.toBe(base.strokes[0]);
    expect(result.strokes[1]).toBe(base.strokes[1]);
    expect(result.strokes[0].width).toBeCloseTo(base.strokes[0].width*1.7);
    expect(result.strokes[0].points[0].x).toBeCloseTo(base.strokes[0].points[0].x+22);
    expect(result.strokes[0].points[0].y).toBeCloseTo(base.strokes[0].points[0].y-8);
    expect(result.strokes[0].startFrame).toBe(base.strokes[0].startFrame+12);
    expect(base.strokes[0].points[0].x).not.toBe(result.strokes[0].points[0].x);
    expect(configureInkStrokes(base,{[id]:tuning})).toEqual(result);
  });
  it("preserves unmodified output exactly",()=>{
    expect(configureInkStrokes(base,{}).strokes).toEqual(base.strokes);
    expect(configureInkStrokes(base,{}).paper).toEqual(base.paper);
  });
  it("rejects unknown, malformed and unbounded edits before rendering",()=>{
    expect(()=>assertInkStrokeOverrides(base,{"not-real":DEFAULT_INK_STROKE_TUNING})).toThrow(RangeError);
    for(const invalid of [
      {...DEFAULT_INK_STROKE_TUNING,width:Infinity},
      {...DEFAULT_INK_STROKE_TUNING,tone:NaN},
      {...DEFAULT_INK_STROKE_TUNING,offsetX:120},
      {...DEFAULT_INK_STROKE_TUNING,startOffset:2.3},
      {...DEFAULT_INK_STROKE_TUNING,load:-1},
      {...DEFAULT_INK_STROKE_TUNING,extra:8},
    ]){
      expect(()=>configureInkStrokes(base,{[id]:invalid})).toThrow(RangeError);
    }
  });
  it("adjusts landscape and portrait studies with stable mark identities",()=>{
    for(const aspect of ["landscape","portrait"] as const){
      const spec=inkExampleSpec("bamboo",aspect);
      const stem=spec.strokes.find(s=>s.id==="culm-1")!;
      const edited=configureInkStrokes(spec,{"culm-1":{...DEFAULT_INK_STROKE_TUNING,water:.1,drag:1}});
      expect(edited.strokes.find(s=>s.id==="culm-1")!.water).toBeCloseTo(stem.water*.1);
      expect(edited.strokes.length).toBe(spec.strokes.length);
    }
  });
});
