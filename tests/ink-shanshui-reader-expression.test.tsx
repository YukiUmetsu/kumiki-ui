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
  it("maps muscle-expression prototypes onto the original lids and five viseme assets",()=>{
    const smile=inkReaderExpressionStudy("smile",.8);
    const surprise=inkReaderExpressionStudy("surprise",.8);
    const angry=inkReaderExpressionStudy("angry",.8);
    expect(smile.mouth).toBe("smile");
    expect(surprise.mouth).toBe("oh");
    expect(surprise.lids).toBe("open");
    expect(angry.mouth).toBe("mm");
    expect(angry.lids).toBe("soft");
    expect(smile).toEqual(inkReaderExpressionStudy("smile",.8));
    expect(()=>inkReaderExpressionStudy("sad",NaN)).toThrow(RangeError);
    expect(()=>inkReaderExpressionStudy("smile",1.1)).toThrow(RangeError);
    expect(()=>inkReaderExpressionStudy("smile",.4,-.1)).toThrow(RangeError);
    expect(()=>inkReaderExpressionStudy("missing" as never,.5)).toThrow(RangeError);
  });
});
