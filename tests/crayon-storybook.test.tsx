import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { crayonHash, crayonMarks, crayonProgress } from "../registry/video/materials/crayon";
import { CrayonStorybook } from "../registry/video/materials/crayon-react";
import { compileFilm } from "../registry/video/film-document";
import { loadFilmSlots } from "../src/film/film-slots";
import { CRAYON_STORYBOOK_FILM } from "../src/video/crayon-storybook-film";
import portable from "../examples/film/crayon-storybook.film.json";

describe("material-native wax-crayon storybook", () => {
  it("deposits finite reproducible pressure-varying marks, with no mutable random source", () => {
    const bounds = {x:-20,y:-30,width:230,height:175};
    const options = {seed:41,pressure:.8,spacing:8};
    const marks = crayonMarks(bounds, options);
    expect(marks.length).toBeGreaterThan(30);
    expect(marks).toEqual(crayonMarks(bounds, options));
    expect(marks).not.toEqual(crayonMarks(bounds, {...options, seed:42}));
    expect(marks.every(mark=>mark.width>0 && mark.d.startsWith("M ") && mark.tone>=0 && mark.tone<3)).toBe(true);
    expect(new Set(marks.map(mark=>mark.width.toFixed(2))).size).toBeGreaterThan(10);
    expect(marks.some(mark => (mark.d.match(/ M /g) ?? []).length >= 3)).toBe(true); // short hand-lifted rubbings

    expect(crayonHash(32,1,2)).toBe(crayonHash(32,1,2));
  });

  it("evaluates a wax gesture by absolute frame, stable under reversed seeks and reduced motion", () => {
    expect(crayonProgress(0,0,100)).toBe(0);
    expect(crayonProgress(100,0,100)).toBe(1);
    expect(crayonProgress(200,0,100)).toBe(1);
    expect(crayonProgress(0,0,100,0,1,true)).toBe(1);
    const mid = crayonProgress(55,0,100,1,5);
    crayonProgress(100,0,100,4,5);
    crayonProgress(5,0,100,0,5);
    expect(crayonProgress(55,0,100,1,5)).toBe(mid);
    expect(crayonProgress(55,0,100,1,5)).toBeGreaterThan(0);
    expect(crayonProgress(55,0,100,4,5)).toBe(0);
  });

  it("rejects malformed stroke parameters instead of hanging or overflowing the renderer", () => {
    expect(()=>crayonMarks({x:0,y:0,width:10,height:0},{seed:1,pressure:.8})).toThrow(RangeError);
    expect(()=>crayonMarks({x:0,y:0,width:20,height:20},{seed:1.5,pressure:.8})).toThrow(/seed/);
    expect(()=>crayonMarks({x:0,y:0,width:20,height:20},{seed:1,pressure:1.2})).toThrow(/pressure/);
    expect(()=>crayonMarks({x:0,y:0,width:20,height:20},{seed:1,pressure:.8,spacing:1})).toThrow(/spacing/);
    expect(()=>crayonMarks({x:0,y:0,width:4096,height:4096},{seed:1,pressure:.8,spacing:4})).toThrow(/stroke budget/);
    expect(()=>crayonProgress(Number.NaN,0,100)).toThrow(RangeError);
    expect(()=>crayonProgress(1,100,100)).toThrow(RangeError);
  });

  for(const aspect of ["landscape","portrait"] as const) for(const story of ["lantern","garden"] as const) {
    it("renders physical paper and layered wax in "+aspect+" / "+story+" at exact frames", () => {
      const render = (frame:number,seed=23,reducedMotion=false,paperTooth=.58) => renderToStaticMarkup(
        <CrayonStorybook frame={frame} story={story} aspect={aspect} seed={seed}
          reducedMotion={reducedMotion} paperTooth={paperTooth} />);
      const first = render(0);
      const mid = render(236);
      const end = render(419);
      expect(mid).toContain('data-km-crayon-wax=""');
      expect(mid).toContain('data-km-crayon-region=""');
      expect(end).toContain('data-km-crayon-paper=""');
      expect(end).toContain('stroke-dasharray="100"');
      expect(end).toContain('data-km-crayon-title=""');
      expect(end).toContain(aspect==="portrait"?'viewBox="0 0 540 960"':'viewBox="0 0 960 540"');
      expect(mid).not.toBe(first);
      expect(end).not.toBe(mid);
      expect(render(236)).toBe(mid);
      expect(render(419)).toBe(end);
      expect(render(236,24)).not.toBe(mid);
      expect(render(0,23,true)).toContain('stroke-dasharray="100"');
      expect(render(419,23,false,0)).not.toBe(end);
    });
  }

  it("preserves the existing FilmStage timeline with portable, dual-aspect proof and renderable slots", async () => {
    expect(portable).toEqual(CRAYON_STORYBOOK_FILM);
    for(const aspect of ["landscape","portrait"] as const) {
      const compiled = compileFilm(portable,{outputId:aspect});
      expect(compiled.ok).toBe(true);
      if(!compiled.ok) continue;
      expect(compiled.film.durationFrames).toBe(420);
      expect(compiled.film.scenes.map(scene=>scene.id)).toEqual(["sky-and-paper","the-trail","the-lantern"]);
      const renderSlot = await loadFilmSlots(compiled.film);
      const html = renderToStaticMarkup(<>{renderSlot(
        {slot:"crayon-storybook",label:"Wax drawing",props:{offsetFrame:270}},
        {frame:90,fps:{num:30,den:1},durationFrames:150,
          width:aspect==="portrait"?540:960,height:aspect==="portrait"?960:540,reducedMotion:false},
      )}</>);
      expect(html).toContain('data-km-crayon-storybook=""');
      expect(html).toContain('data-km-crayon-frame="360"');
      expect(()=>renderToStaticMarkup(<>{renderSlot(
        {slot:"crayon-storybook",label:"Invalid",props:{story:"missing"}},
        {frame:0,fps:{num:30,den:1},durationFrames:120,width:960,height:540,reducedMotion:false},
      )}</>)).toThrow(/story must be/);
    }
  });

  it("rejects invalid public props", () => {
    expect(()=>renderToStaticMarkup(<CrayonStorybook frame={-1}/>)).toThrow(/frame/);
    expect(()=>renderToStaticMarkup(<CrayonStorybook frame={1} pressure={2}/>)).toThrow(/pressure/);
    expect(()=>renderToStaticMarkup(<CrayonStorybook frame={1} paperTooth={-1}/>)).toThrow(/paperTooth/);
  });
});
