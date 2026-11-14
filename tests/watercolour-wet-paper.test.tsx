import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { WatercolourWetPaper } from "../registry/video/watercolour-wet-paper-react";
import { evaluateWetPaper, inspectWetPaper } from "../registry/video/watercolour-wet-paper";
import { wetPaperDemo } from "../src/video/watercolour-wet-paper-demo";

describe("WM4 conservative watercolor pigment field", () => {
  const scene=wetPaperDemo("landscape");

  it("preflights bounded artboard, timed drops and physics budgets", () => {
    expect(inspectWetPaper(scene)).toEqual([]);
    const invalid={...scene,cellSize:12,width:8192,height:8192,drops:[{
      ...scene.drops[0],x:-1,pigment:"red",water:3,startFrame:-1,
    }]};
    const paths=inspectWetPaper(invalid).map(i=>i.path);
    expect(paths).toEqual(expect.arrayContaining([
      "/cellSize","/drops/0","/drops/0/pigment",
      "/drops/0/water","/drops/0/startFrame",
    ]));
    expect(() => evaluateWetPaper(invalid,0)).toThrow(RangeError);
    expect(() => evaluateWetPaper(scene,-1)).toThrow(RangeError);
  });

  it("starts with unpainted paper, then spreads 7 original pigments on one field", () => {
    const blank=evaluateWetPaper(scene,0);
    expect(blank.totalPigment).toBe(0);
    expect(blank.cells).toEqual([]);
    const wet=evaluateWetPaper(scene,186);
    expect(wet.totalPigment).toBeGreaterThan(0);
    expect(wet.wetness).toBeGreaterThan(0);
    expect(wet.settled).toBe(false);
    expect(wet.cells.length).toBeGreaterThan(50);
    const sourceColors=new Set(scene.drops.map(d=>d.pigment.toUpperCase()));
    expect(wet.cells.some(c=>!sourceColors.has(c.pigment))).toBe(true);
    expect(wet.cells.every(c=>c.opacity>=0 && c.opacity<=1)).toBe(true);
    expect(wet.cells.every(c=>/^#[0-9A-F]{6}$/.test(c.pigment))).toBe(true);
  });

  it("conserves pigment mass while mobile pigment becomes paper sediment", () => {
    const first=scene.drops[0].startFrame;
    const afterFirst=evaluateWetPaper(scene,first);
    const late=evaluateWetPaper(scene,180);
    const dry=evaluateWetPaper(scene,999);
    expect(afterFirst.totalPigment).toBeCloseTo(65*scene.drops[0].load,6);
    const expected=65*scene.drops.reduce((sum,d)=>sum+d.load,0);
    expect(late.totalPigment).toBeCloseTo(expected,5);
    expect(dry.totalPigment).toBeCloseTo(expected,5);
    expect(dry.wetness).toBe(0);
    expect(dry.settled).toBe(true);
    expect(dry.cells.every(cell=>cell.sediment===1)).toBe(true);
  });

  it("seeking backward or far past the dry frame cannot redraw the pigment", () => {
    const frame=evaluateWetPaper(scene,203);
    evaluateWetPaper(scene,999);
    evaluateWetPaper(scene,0);
    expect(evaluateWetPaper(scene,203)).toEqual(frame);
    const dry=evaluateWetPaper(scene,999);
    expect(evaluateWetPaper(scene,10000)).toEqual(dry);
    expect(evaluateWetPaper(scene,0,true)).toEqual(dry);
    const fine={...scene,cellSize:20};
    expect(evaluateWetPaper(fine,203).columns).toBeGreaterThan(frame.columns);
    expect(evaluateWetPaper({...scene,seed:scene.seed+1},203).cells)
      .not.toEqual(frame.cells);
  });

  it("keeps the material in paper coordinates in landscape, portrait and transparent mode", () => {
    for(const output of ["landscape","portrait"] as const){
      const spec=wetPaperDemo(output);
      expect(inspectWetPaper(spec)).toEqual([]);
      const html=renderToStaticMarkup(<WatercolourWetPaper spec={spec} frame={220}/>);
      expect(html).toContain('data-km-wet-paper=""');
      expect(html).toContain('data-km-wet-pigment-field=""');
      expect(html).toContain('data-km-pigment-cell=""');
      expect(html).toContain("feDisplacementMap");
      expect(html).toContain("feGaussianBlur");
      expect(html).toContain(output==="landscape"?"0 0 960 540":"0 0 540 960");
      const transparent=renderToStaticMarkup(
        <WatercolourWetPaper spec={spec} frame={220} transparentPaper/>);
      expect(transparent).not.toContain('data-km-wet-paper-fibres=""');
      const dry=renderToStaticMarkup(
        <WatercolourWetPaper spec={spec} frame={0} reducedMotion/>);
      expect(dry).toContain('data-km-wet-paper-phase="dry"');
    }
  });

  it("flow is a material parameter rather than a global overlay filter", () => {
    const paper=evaluateWetPaper({...scene,flow:0},186);
    const flowing=evaluateWetPaper({...scene,flow:1},186);
    expect(flowing.totalPigment).toBeCloseTo(paper.totalPigment,5);
    expect(flowing.cells).not.toEqual(paper.cells);
    expect(flowing.columns*flowing.rows).toBeLessThanOrEqual(4096);
  });
});
