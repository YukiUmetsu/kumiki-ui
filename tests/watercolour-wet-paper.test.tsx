import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { WatercolourWetPaper, watercolourPigmentFootprint } from "../registry/video/watercolour-wet-paper-react";
import { evaluateWetPaper, inspectWetPaper } from "../registry/video/watercolour-wet-paper";
import { wetPaperDemo } from "../src/video/watercolour-wet-paper-demo";
import { WATERCOLOUR_WET_PAPER_FILM } from "../src/video/watercolour-wet-paper-film";
import { compileFilm } from "../registry/video/film-document";
import { loadFilmSlots } from "../src/film/film-slots";
import portable from "../examples/film/watercolour-wet-paper.film.json";

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

  it("exports a portable, two-aspect FilmStage production slot at exact frame", async () => {
    expect(portable).toEqual(WATERCOLOUR_WET_PAPER_FILM);
    for(const outputId of ["landscape","portrait"] as const) {
      const compiled=compileFilm(portable,{outputId});
      expect(compiled.ok).toBe(true);
      if(!compiled.ok)continue;
      expect(compiled.film.durationFrames).toBe(420);
      const render=await loadFilmSlots(compiled.film);
      const html=renderToStaticMarkup(<>{render(
        {slot:"watercolour-wet-paper",label:"Wet paper"},
        {frame:210,fps:{num:30,den:1},durationFrames:420,
          width:compiled.film.width,height:compiled.film.height,reducedMotion:false},
      )}</>);
      expect(html).toContain("data-km-wet-paper");
      expect(html).toContain("Water carries colour");
    }
  });

  it("keeps optical paint strength comparable across coarse and fine paper grids",()=>{
    // Numerical transport uses different lattices; optical mass must nevertheless
    // be normalized to physical paper area rather than number of cells.
    const drop={...scene.drops[0],startFrame:0};
    const base={...scene,flow:0,drops:[drop]};
    const centerOpacity=(cellSize:number)=>{
      const state=evaluateWetPaper({...base,cellSize},70);
      let near=state.cells[0],best=Infinity;
      for(const c of state.cells){
        const d=Math.hypot(c.x+c.width/2-drop.x,c.y+c.height/2-drop.y);
        if(d<best){near=c;best=d;}
      }
      return near.opacity;
    };
    const coarse=centerOpacity(32),fine=centerOpacity(16);
    expect(coarse).toBeGreaterThan(0.05);
    expect(fine).toBeGreaterThan(0.05);
    expect(fine/coarse).toBeGreaterThan(.6);
    expect(fine/coarse).toBeLessThan(1.6);
  });

  it("deposits a pressure-guided brush wash without changing total pigment mass",()=>{
    const drop={...scene.drops[0],startFrame:0,
      path:[{x:380,y:280,pressure:.15},{x:510,y:300,pressure:.9},
        {x:690,y:310,pressure:.34}]};
    const brush={...scene,drops:[drop]};
    expect(inspectWetPaper(brush)).toEqual([]);
    const result=evaluateWetPaper(brush,125);
    expect(result.totalPigment).toBeCloseTo(65*drop.load,5);
    expect(result.cells.length).toBeGreaterThan(10);
    expect(result.cells).not.toEqual(evaluateWetPaper({...brush,
      drops:[{...drop,path:undefined}]},125).cells);
    expect(inspectWetPaper({...brush,drops:[{...drop,path:[
      {x:-1,y:0,pressure:1},{x:4,y:5,pressure:0},
    ]}]}).map(x=>x.path)).toContain("/drops/0/path");
  });

  it("breaks rectangular wet-cell tiling into deterministic interlocking curves",()=>{
    const spec={...scene,cellSize:20};
    const state=evaluateWetPaper(spec,190);
    const first=state.cells[0];
    const shape=watercolourPigmentFootprint(first,spec.seed);
    expect(shape).toMatch(/^M/);
    expect(shape).toContain(" Q");
    expect(shape.endsWith("Z")).toBe(true);
    expect(watercolourPigmentFootprint(first,spec.seed)).toBe(shape);
    expect(watercolourPigmentFootprint(first,spec.seed+1)).not.toBe(shape);
    expect(shape).not.toMatch(/NaN|Infinity/);
    const html=renderToStaticMarkup(<WatercolourWetPaper spec={spec} frame={190}/>);
    expect(html).toContain('data-km-edge-density=');
    expect(html).toContain('data-km-pigment-cell="" d="M');
  });

  it("flow is a material parameter rather than a global overlay filter", () => {
    const paper=evaluateWetPaper({...scene,flow:0},186);
    const flowing=evaluateWetPaper({...scene,flow:1},186);
    expect(flowing.totalPigment).toBeCloseTo(paper.totalPigment,5);
    expect(flowing.cells).not.toEqual(paper.cells);
    expect(flowing.columns*flowing.rows).toBeLessThanOrEqual(4096);
  });
});
