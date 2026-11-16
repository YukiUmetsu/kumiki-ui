import {describe,expect,it} from "vitest";
import {scrollReaderFacePortrait} from "../src/video/ink-shanshui-reader-face";
import {inkReaderExpressionStudy,READER_INK_EMOTIONS} from
  "../src/video/ink-shanshui-reader-expression";
const shapes=(assets:ReturnType<typeof scrollReaderFacePortrait>,name:string)=>{
  const asset=assets[name];
  if(asset.kind!=="shapes")throw Error("Expected SVG shape layer");
  return asset.shapes;
};
describe("EXPR1 anatomy-driven Chinese-ink reader",()=>{
  it("preserves every neutral production asset including independently rigged eyes and visemes",()=>{
    const baseline=scrollReaderFacePortrait(1);
    expect(inkReaderExpressionStudy("neutral",1,1).assets).toEqual(baseline);
    expect(inkReaderExpressionStudy("smile",0,1).assets).toEqual(baseline);
    expect(READER_INK_EMOTIONS).toEqual([
      "neutral","smile","sad","angry","surprise"]);
  });
  it("moves existing authored brow fibres while retaining their count and all eye/ear/crown detail",()=>{
    const baseline=scrollReaderFacePortrait(1);
    const smile=inkReaderExpressionStudy("smile",1,1);
    const sad=inkReaderExpressionStudy("sad",1,1);
    const angry=inkReaderExpressionStudy("angry",1,1);
    for(const sample of [smile,sad,angry]){
      expect(shapes(sample.assets,"brow")).toHaveLength(shapes(baseline,"brow").length);
      expect(sample.assets.hair).toEqual(baseline.hair);
      expect(sample.assets["reader-ear"]).toEqual(baseline["reader-ear"]);
      expect(sample.assets["pupil-left"]).toEqual(baseline["pupil-left"]);
      expect(sample.assets["pupil-right"]).toEqual(baseline["pupil-right"]);
      expect(sample.assets["eyes-closed"]).toEqual(baseline["eyes-closed"]);
      expect(sample.assets["mouth-aa"]).toEqual(baseline["mouth-aa"]);
      expect(shapes(sample.assets,"brow").every(s=>
        s.type==="path"&&!/NaN|Infinity|undefined/.test(s.d))).toBe(true);
    }
    // AU 6 + AU 12 (Duchenne smile) moves cheeks and mouth, not brows.
    expect(shapes(smile.assets,"brow")).toEqual(shapes(baseline,"brow"));
    expect(shapes(sad.assets,"brow")).not.toEqual(shapes(baseline,"brow"));
    expect(shapes(sad.assets,"brow")).not.toEqual(shapes(angry.assets,"brow"));
    expect(shapes(smile.assets,"face").length)
      .toBeGreaterThan(shapes(baseline,"face").length);
    expect(smile.features.cheekRaise).toBeGreaterThan(0);
    expect(smile.activeCreases.some(id=>id.startsWith("crows-feet"))).toBe(true);
    expect(angry.activeCreases.some(id=>id.startsWith("glabella"))).toBe(true);
    expect(sad.features.mouthCorner).toBeLessThan(0);
    expect(shapes(sad.assets,"mouth-rest"))
      .not.toEqual(shapes(baseline,"mouth-rest"));
  });
  it("produces visibly distinct consecutive EXPR1 smile and surprise keyframes, without switching viseme topology",()=>{
    for(const emotion of ["smile","sad","angry","surprise"] as const){
      const frames=[0,.25,.5,.75,1].map(t=>
        inkReaderExpressionStudy(emotion,t,1));
      // The actual production lip cel changes with EVERY keyframe, not
      // an immediate full-intensity smile pasted on at the first sample.
      const mouthPaths=frames.map(f=>shapes(f.assets,"mouth-rest")
        .map(s=>s.type==="path"?s.d:"").join("|"));
      expect(new Set(mouthPaths).size).toBe(5);
      const eyelids=frames.map(f=>shapes(f.assets,"eyes-soft")
        .map(s=>s.type==="path"?s.d:"").join("|"));
      expect(new Set(eyelids).size).toBeGreaterThanOrEqual(3);
      expect(frames[0].assets).toEqual(scrollReaderFacePortrait(1));
      expect(frames.every(f=>f.lids==="soft"&&f.mouth==="rest")).toBe(true);
      const original=scrollReaderFacePortrait(1);
      for(const frame of frames){
        expect(frame.assets["eyes-open"]).toEqual(original["eyes-open"]);
        expect(frame.assets["eyes-closed"]).toEqual(original["eyes-closed"]);
        expect(frame.assets["mouth-smile"]).toEqual(original["mouth-smile"]);
        expect(frame.assets.hair).toEqual(original.hair);
        expect(frame.assets.face.kind).toBe("shapes");
      }
    }
    const heights=[0,.25,.5,.75,1].map(t=>
      shapes(inkReaderExpressionStudy("surprise",t).assets,"mouth-rest").length);
    expect(heights[0]).toBeLessThan(heights[4]);
    expect(heights.slice(1).every(x=>x===heights[4])).toBe(true);
  });
  it("maps muscle-expression prototypes onto the original lids and five viseme assets",()=>{
    const smile=inkReaderExpressionStudy("smile",.8);
    const surprise=inkReaderExpressionStudy("surprise",.8);
    const angry=inkReaderExpressionStudy("angry",.8);
    // EXPR1 now morphs the one source soft-lid/rest-mouth cel continuously.
    // AU jaw drop uses an additional opening that grows from zero.
    expect(smile.mouth).toBe("rest");
    expect(surprise.mouth).toBe("rest");
    expect(surprise.lids).toBe("soft");
    expect(angry.mouth).toBe("rest");
    expect(angry.lids).toBe("soft");
    expect(smile).toEqual(inkReaderExpressionStudy("smile",.8));
    expect(()=>inkReaderExpressionStudy("sad",NaN)).toThrow(RangeError);
    expect(()=>inkReaderExpressionStudy("smile",1.1)).toThrow(RangeError);
    expect(()=>inkReaderExpressionStudy("smile",.4,-.1)).toThrow(RangeError);
    expect(()=>inkReaderExpressionStudy("missing" as never,.5)).toThrow(RangeError);
  });
});
