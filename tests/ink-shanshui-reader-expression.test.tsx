import {describe,expect,it} from "vitest";
import {scrollReaderFacePortrait} from "../src/video/ink-shanshui-reader-face";
import {inkReaderExpressionStudy,READER_INK_EMOTIONS} from
  "../src/video/ink-shanshui-reader-expression";
import {inkReaderCueFrame,readerInkCueWeight,READER_INK_CUE} from
  "../src/video/ink-shanshui-expression-cue";
import {readerInkGaze,readerInkEyeApertures,READER_INK_GAZE_LIMITS} from
  "../src/video/ink-shanshui-reader-gaze";
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
      // Sadness prototype moves AU1/4 brows and AU15 lips, not lids.
      if(emotion!=="sad")expect(new Set(eyelids).size).toBeGreaterThanOrEqual(3);
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
  it("eases 96 source frames with 12-frame attack, 48-frame hold and 24-frame release",()=>{
    expect(READER_INK_CUE.fps).toBe(24);
    expect([0,6,12,24,60,72,84,96].map(readerInkCueWeight))
      .toEqual([0,.5,1,1,1,.5,0,0]);
    expect(()=>readerInkCueWeight(-1)).toThrow(RangeError);
    expect(()=>readerInkCueWeight(97)).toThrow(RangeError);
    expect(()=>readerInkCueWeight(.5)).toThrow(RangeError);
    expect(()=>readerInkCueWeight(NaN)).toThrow(RangeError);
    expect(()=>inkReaderCueFrame("smile",1.2,12)).toThrow(RangeError);
  });
  it("keeps continuous facial expression poses in original source assets across a film cue",()=>{
    const original=scrollReaderFacePortrait(1);
    for(const emotion of ["smile","sad","angry","surprise"] as const){
      const frames=[0,3,6,9,12,24,60,66,72,78,84,96].map(frame=>
        inkReaderCueFrame(emotion,1,frame));
      expect(frames[0].assets).toEqual(original);
      expect(frames[frames.length-2].assets).toEqual(original);
      expect(frames[frames.length-1].assets).toEqual(original);
      expect(frames[4]).toEqual(inkReaderExpressionStudy(emotion,1,1));
      expect(frames[8]).toEqual(inkReaderExpressionStudy(emotion,.5,1));
      for(const pose of frames){
        expect(pose.assets.hair).toEqual(original.hair);
        expect(pose.assets["reader-ear"]).toEqual(original["reader-ear"]);
        expect(pose.assets["pupil-left"]).toEqual(original["pupil-left"]);
        expect(pose.assets["eyes-closed"]).toEqual(original["eyes-closed"]);
        for(const name of ["face","eyes-soft","mouth-rest","brow"]){
          const paths=shapes(pose.assets,name);
          expect(paths.every(shape=>shape.type==="path"&&
            !/NaN|Infinity|undefined/.test(shape.d))).toBe(true);
        }
      }
      if(emotion==="sad"){
        const brows=frames.slice(0,5).map(f=>
          shapes(f.assets,"brow").map(p=>p.type==="path"?p.d:"").join("|"));
        expect(new Set(brows).size).toBe(5);
      }
      if(emotion==="smile"){
        const lips=frames.slice(0,5).map(f=>
          shapes(f.assets,"mouth-rest").map(p=>p.type==="path"?p.d:"").join("|"));
        expect(new Set(lips).size).toBe(5);
      }
    }
  });

  it("uses ANAT1-compatible orbicularis lower-lid lift and levator upper-lid opening",()=>{
    const original=scrollReaderFacePortrait(1);
    const smile=inkReaderExpressionStudy("smile",.9,1);
    const surprised=inkReaderExpressionStudy("surprise",.9,1);
    const lids=(assets:ReturnType<typeof scrollReaderFacePortrait>)=>
      shapes(assets,"eyes-soft").map(s=>s.type==="path"?s.d:"");
    const baseline=lids(original),smiling=lids(smile.assets),wide=lids(surprised.assets);
    expect(smiling).toHaveLength(baseline.length);
    expect(wide).toHaveLength(baseline.length);
    // The native lower tarsal crease at x126.3, y109 must travel
    // toward the orbital center when AU6 raises the malar region.
    const tarsal=baseline.findIndex(d=>d.includes("Q126.3 109 "));
    expect(tarsal).toBeGreaterThanOrEqual(0);
    const eyeY=(d:string)=>{
      const match=d.match(/Q126\.3 ([0-9.]+)/);
      if(!match)throw Error("Source ANAT1 lower eyelid not found");
      return Number(match[1]);
    };
    expect(eyeY(smiling[tarsal])).toBeLessThan(eyeY(baseline[tarsal]));
    const opening=baseline.findIndex(d=>d.includes("C123.7 103.7 "));
    expect(opening).toBeGreaterThanOrEqual(0);
    const upperY=(d:string)=>{
      const match=d.match(/C123\.7 ([0-9.]+)/);
      if(!match)throw Error("Source ANAT1 upper aperture missing");
      return Number(match[1]);
    };
    expect(upperY(wide[opening])).toBeLessThan(upperY(baseline[opening]));
    // No mirrored synthetic face: original lids and independent pupils
    // remain exact assets whenever expression intensity reaches zero.
    expect(inkReaderExpressionStudy("smile",0,1).assets).toEqual(original);
    expect(smile.assets["eyes-open"]).toEqual(original["eyes-open"]);
    expect(smile.assets["eyes-closed"]).toEqual(original["eyes-closed"]);
    expect(smile.assets["pupil-left"]).toEqual(original["pupil-left"]);
    expect(smile.assets["pupil-right"]).toEqual(original["pupil-right"]);
  });

  it("keeps original near/far ANAT1 iris detail at neutral and bounds asymmetric gaze",()=>{
    const unchanged=scrollReaderFacePortrait(1);
    const neutral=readerInkGaze(0,0);
    expect(neutral).toEqual({near:{x:0,y:0},far:{x:0,y:0}});
    const right=readerInkGaze(1,1);
    const left=readerInkGaze(-1,-1);
    expect(right.near.x).toBeGreaterThan(right.far.x);
    expect(right.near.y).toBeGreaterThan(right.far.y);
    expect(right.near.x).toBeCloseTo(READER_INK_GAZE_LIMITS.near.x);
    expect(right.far.y).toBeCloseTo(READER_INK_GAZE_LIMITS.far.y);
    expect(left.near.x).toBe(-right.near.x);
    expect(left.far.y).toBe(-right.far.y);
    expect(unchanged).toEqual(scrollReaderFacePortrait(1));
    for(const [x,y] of [[NaN,0],[0,Infinity],[-1.01,0],[0,1.01]]){
      expect(()=>readerInkGaze(x,y)).toThrow(RangeError);
    }
  });
  it("clips original iris strokes to the authored dynamic near/far eyelid paint, not a generic oval",()=>{
    const original=scrollReaderFacePortrait(1);
    for(const lids of ["open","soft"] as const){
      const windows=readerInkEyeApertures(original,lids);
      expect(windows).not.toBeNull();
      const shapes=original["eyes-"+lids];
      if(shapes.kind!=="shapes")throw Error("eyes must be paths");
      const [near,far]=shapes.shapes;
      expect(near.type).toBe("path");
      expect(far.type).toBe("path");
      if(near.type!=="path"||far.type!=="path")continue;
      expect(windows).toEqual({near:near.d,far:far.d});
      expect(windows?.near).not.toEqual(windows?.far);
    }
    const expanded=inkReaderExpressionStudy("surprise",1,1);
    const contracted=inkReaderExpressionStudy("smile",1,1);
    expect(readerInkEyeApertures(expanded.assets,"soft")).not.toEqual(
      readerInkEyeApertures(contracted.assets,"soft"));
    expect(readerInkEyeApertures(original,"closed")).toBeNull();
    expect(original["pupil-left"]).toEqual(scrollReaderFacePortrait(1)["pupil-left"]);
    expect(original["pupil-right"]).toEqual(scrollReaderFacePortrait(1)["pupil-right"]);
  });

});
