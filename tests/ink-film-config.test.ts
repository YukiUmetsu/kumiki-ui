import { describe, expect, it } from "vitest";
import { inkExampleSpec } from "../src/video/ink-wash-demo";
import {
  DEFAULT_INK_MATERIAL, DEFAULT_INK_CAMERA, DEFAULT_INK_REVEAL,
  configureInkSpec, configureInkCamera, configureInkLayer, assertInkMaterialControls,
} from "../src/video/ink-film-config";
import { inkHoldFrame, inspectInkWash, inkOutline } from "../registry/video/ink-wash";

describe("Film Looks native authoring controls",()=>{
  it("preserves IDs, source points and provenance while changing real pigment geometry",()=>{
    const base=inkExampleSpec("bamboo","landscape");
    const tuned=configureInkSpec(base,{...DEFAULT_INK_MATERIAL,
      strokeWidth:1.7,pressure:1.3,grain:.93,absorption:.82,drawTime:1.25,
      ink:"#142c26",paper:"#f0eee1",orientation:"oblique",
    });
    expect(inspectInkWash(tuned)).toEqual([]);
    expect(tuned.strokes.map(s=>s.id)).toEqual(base.strokes.map(s=>s.id));
    expect(tuned.strokes[0].width).toBeGreaterThan(base.strokes[0].width);
    expect(tuned.strokes[0].points[0]).not.toBe(base.strokes[0].points[0]);
    expect(tuned.strokes[0].brush).toBe("oblique");
    expect(tuned.paper).toBe("#f0eee1");
    expect(inkOutline(tuned.strokes[0],tuned.seed,1))
      .not.toBe(inkOutline(base.strokes[0],base.seed,1));
    expect(inkHoldFrame(tuned)).toBeGreaterThan(inkHoldFrame(base));
    expect(base.strokes[0].width).toBeLessThan(tuned.strokes[0].width);
  });
  it("keeps camera keyframes monotonic with native pan and zoom",()=>{
    const camera=configureInkCamera({keyframes:[
      {frame:0,x:0,y:0,zoom:1},{frame:90,x:-16,y:8,zoom:1.05},
    ]},{...DEFAULT_INK_CAMERA,zoom:1.4,panX:22,panY:-15});
    expect(camera.keyframes.map(k=>k.frame)).toEqual([0,90]);
    expect(camera.keyframes[0]).toEqual({frame:0,x:22,y:-15,zoom:1.4});
    expect(camera.keyframes[1].x).toBe(6);
    expect(configureInkCamera(undefined,DEFAULT_INK_CAMERA).keyframes).toHaveLength(1);
  });
  it("tunes matte direction, duration, parallax without changing film onset or IDs",()=>{
    const base={id:"hero",startFrame:12,durationFrames:80,reveal:"bloom" as const,parallax:.55};
    const result=configureInkLayer(base,{...DEFAULT_INK_REVEAL,
      kind:"brush",duration:.5,parallax:1.5},120);
    expect(result).toMatchObject({id:"hero",startFrame:12,durationFrames:40,
      reveal:"brush",parallax:.8250000000000001});
    expect(configureInkLayer(base,{kind:"instant",duration:3,parallax:0},120))
      .toMatchObject({durationFrames:108,parallax:0,reveal:"instant"});
  });
  it("rejects invalid colors, NaN, Infinity, scales and unsupported settings",()=>{
    for(const c of [
      {...DEFAULT_INK_MATERIAL,ink:"url(javascript:evil)"},
      {...DEFAULT_INK_MATERIAL,grain:Infinity},
      {...DEFAULT_INK_MATERIAL,pressure:NaN},
      {...DEFAULT_INK_MATERIAL,seed:-7},
      {...DEFAULT_INK_MATERIAL,drawTime:0},
      {...DEFAULT_INK_MATERIAL,orientation:"spray" as never},
    ])expect(()=>assertInkMaterialControls(c)).toThrow(RangeError);
    expect(()=>configureInkCamera(undefined,{zoom:0,panX:0,panY:0})).toThrow(RangeError);
    expect(()=>configureInkLayer({id:"t",startFrame:0,durationFrames:5,reveal:"brush"},
      {...DEFAULT_INK_REVEAL,kind:"bad" as never},100)).toThrow(RangeError);
  });
  it("does not drift or accumulate pigment after any shuffled seeks",()=>{
    const spec=configureInkSpec(inkExampleSpec("landscape","portrait"),
      {...DEFAULT_INK_MATERIAL,strokeWidth:1.5,drawTime:.5});
    const s=spec.strokes.find(x=>x.width>8)!;
    const held=inkOutline(s, spec.seed,1);
    [0,.1,.9,.2,.7,.03,1].forEach(progress=>inkOutline(s,spec.seed,progress));
    expect(inkOutline(s,spec.seed,1)).toBe(held);
    expect(inkHoldFrame(spec)).toBeGreaterThan(0);
  });
});
