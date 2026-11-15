import {describe,expect,it} from "vitest";
import {renderToStaticMarkup} from "react-dom/server";
import {inspectPaintSurface,evaluatePaintStroke,sampleBrushCenterline} from "../registry/video/watercolour-brush";
import {inspectWetPaper,evaluateWetPaper} from "../registry/video/watercolour-wet-paper";
import {
  WC19_EYE_GESTURES,WC19_EYE_LANDMARKS,experimentalWatercolourEyeBrush,
} from "../src/video/experimental/watercolour-eye-brush-study";
import {ExperimentalWatercolourEyeBrushPage}
  from "../src/video/experimental/watercolour-eye-brush-page";

describe("WC19 — actual natural-media eye study, not a gradient vector painting",()=>{
  const study=experimentalWatercolourEyeBrush(83);
  it("has a real WM1 pressure brush for every painted structural layer",()=>{
    expect(inspectPaintSurface(study.brush)).toEqual([]);
    expect(study.brush.medium).toBe("watercolour");
    expect(study.brush.strokes.length).toBeGreaterThanOrEqual(95);
    expect(study.brush.strokes.length).toBeLessThanOrEqual(120);
    expect(new Set(study.brush.strokes.map(s=>s.id)).size)
      .toBe(study.brush.strokes.length);
    expect(new Set(WC19_EYE_GESTURES.map(s=>s.layer))).toEqual(new Set([
      "atmosphere","hair","skin","brow","orbit","sclera",
      "iris","lid","lashes","micro",
    ]));
    for(const stroke of study.brush.strokes){
      const points=stroke.points;
      expect(points.length).toBeGreaterThanOrEqual(3);
      expect(Math.max(...points.map(p=>p.pressure))-
        Math.min(...points.map(p=>p.pressure))).toBeGreaterThan(.3);
      expect(sampleBrushCenterline(stroke).length).toBeGreaterThan(points.length);
      expect(stroke.drawFrames).toBeGreaterThan(0);
      expect(stroke.dryFrames).toBeGreaterThan(0);
    }
    expect(study.brush.strokes.some(s=>s.water>.8&&s.dryBrush<.2)).toBe(true);
    expect(study.brush.strokes.some(s=>s.water<.3&&s.dryBrush>.7)).toBe(true);
  });
  it("runs real WM4 guided pigment deposits with paper-reserve masks",()=>{
    expect(inspectWetPaper(study.wet)).toEqual([]);
    expect(study.wet.paintAreas?.length).toBeGreaterThan(0);
    expect(study.wet.reservePaths?.length).toBeGreaterThanOrEqual(3);
    expect(study.wet.drops.length).toBeGreaterThanOrEqual(9);
    expect(study.wet.drops.every(d=>
      (d.path?.length??0)>=3&&d.water>=.5)).toBe(true);
    const wet=evaluateWetPaper(study.wet,130);
    const dry=evaluateWetPaper(study.wet,999);
    expect(wet.totalPigment).toBeGreaterThan(0);
    expect(dry.settled).toBe(true);
    expect(dry.totalPigment).toBeCloseTo(wet.totalPigment,5);
    expect(dry.cells.some(c=>c.sediment>0)).toBe(true);
  });
  it("preserves eye landmark asymmetry and source-connected iris/lid hierarchy",()=>{
    expect(WC19_EYE_LANDMARKS.outerCanthus.x)
      .toBeLessThan(WC19_EYE_LANDMARKS.irisCenter.x);
    expect(WC19_EYE_LANDMARKS.irisCenter.x)
      .toBeLessThan(WC19_EYE_LANDMARKS.innerCanthus.x);
    expect(WC19_EYE_LANDMARKS.upperLidApex.y)
      .toBeLessThan(WC19_EYE_LANDMARKS.irisCenter.y);
    expect(WC19_EYE_LANDMARKS.lowerLidBowl.y)
      .toBeGreaterThan(WC19_EYE_LANDMARKS.irisCenter.y);
    expect(WC19_EYE_GESTURES.filter(g=>g.layer==="iris").length)
      .toBeGreaterThan(18);
    expect(WC19_EYE_GESTURES.filter(g=>g.layer==="lashes").length)
      .toBeGreaterThan(20);
    expect(WC19_EYE_GESTURES.filter(g=>g.layer==="hair").length)
      .toBeGreaterThan(10);
  });
  it("actually renders pressure deposition, blooming, physically wet paper and dry fibers",()=>{
    const markup=renderToStaticMarkup(<ExperimentalWatercolourEyeBrushPage frame={420}/>);
    expect(markup).toContain('data-km-watercolour-eye-status="unapproved"');
    expect(markup).toContain('data-km-wet-paper=""');
    expect(markup).toContain('data-km-wet-pigment-field=""');
    expect(markup).toContain('data-km-watercolour=""');
    expect(markup).toContain('data-km-paint-medium="watercolour"');
    expect(markup).toContain('data-km-brush-stroke="iris-olive-main"');
    expect(markup).toContain('data-km-brush-stroke="lid-upper-dark-core"');
    expect(markup).toContain('data-km-brush-stroke="lash-upper-0"');
    expect(markup).toContain("data-km-deposition");
    expect(markup).toContain("data-km-wet-spread");
    expect(markup).toContain("data-km-pigment-cell");
    expect(markup).not.toContain("NaN");
    expect(markup).not.toContain("Infinity");
    const early=renderToStaticMarkup(<ExperimentalWatercolourEyeBrushPage frame={26}/>);
    expect(early).not.toContain('data-km-brush-stroke="pupil-dark-core"');
    expect(early.length).toBeLessThan(markup.length);
  });
  it("is deterministic under random frame seeking and fails closed on invalid seeds",()=>{
    const s=study.brush.strokes[20];
    const sample=evaluatePaintStroke(s,182);
    evaluatePaintStroke(s,650);evaluatePaintStroke(s,9);
    expect(evaluatePaintStroke(s,182)).toEqual(sample);
    expect(experimentalWatercolourEyeBrush(83)).toEqual(study);
    expect(()=>experimentalWatercolourEyeBrush(-1)).toThrow(RangeError);
    expect(()=>experimentalWatercolourEyeBrush(2147483648)).toThrow(RangeError);
  });
});
