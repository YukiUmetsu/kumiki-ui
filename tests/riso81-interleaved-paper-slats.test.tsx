import {describe,expect,it} from "vitest";
import {renderToStaticMarkup} from "react-dom/server";
import {evaluateRisoSlatReveal,risoSlatProgress} from "../registry/video/riso-slat-reveal";
import {RisoSlatTheatre} from "../registry/video/riso-slat-reveal-react";
import {risoExampleArtworks,risoExampleSpec} from "../src/video/riso-print-demo";
import {risoSecondSheetArtworks} from "../src/video/riso-print-demo-alt";
import {RISO81_SLAT_FILM} from "../src/video/riso81-slat-film";
import {compileFilm} from "../registry/video/film-document";

const cover={spec:risoExampleSpec("landscape",23),artworks:risoExampleArtworks("landscape")};
const insert={spec:risoExampleSpec("landscape",38),artworks:risoSecondSheetArtworks("landscape")};
const base={
  width:960,height:540,axis:"horizontal" as const,direction:"down" as const,
  count:12,progress:.5,seed:81,overlapMm:.32,paperThicknessMm:.24,
  slotClearanceMm:.08,interleaveDepthMm:.42,
};
const markup=(progress:number,axis:"horizontal"|"vertical"="horizontal")=>
  renderToStaticMarkup(<RisoSlatTheatre cover={cover} insert={insert}
    axis={axis} direction={axis==="horizontal"?"down":"right"}
    count={12} progress={progress} seed={81} overlapMm={.32}
    paperThicknessMm={.24} slotClearanceMm={.08} interleaveDepthMm={.42}/>);

describe("RISO81 interleaved original-paper slats",()=>{
  it("reconstructs the second complete image from source-ordered strips with a shared pull translation",()=>{
    const start=evaluateRisoSlatReveal({...base,progress:0});
    const middle=evaluateRisoSlatReveal({...base,progress:.5});
    const end=evaluateRisoSlatReveal({...base,progress:1});
    expect(start.slats).toHaveLength(12);
    expect(start.slats.every(s=>s.exposure===0)).toBe(true);
    expect(end.slats.every(s=>s.exposure===1)).toBe(true);
    expect(start.slats.every(s=>s.translation[0]===0&&s.translation[1]===-start.travel)).toBe(true);
    expect(end.slats.every(s=>s.translation[0]===0&&s.translation[1]===0)).toBe(true);
    expect(middle.slats.every(s=>s.translation[0]===0&&s.translation[1]===middle.translation[1])).toBe(true);
    expect(end.slats.map(s=>s.slotOrder)).toEqual(Array.from({length:12},(_,i)=>i));
    expect(end.slats.map(s=>s.lane)).toEqual(Array.from({length:12},(_,i)=>(i%2) as 0|1));
    expect(end.slats[0].y).toBe(0);
    expect(end.slats.at(-1)!.y+end.slats.at(-1)!.height).toBe(540);
    expect(end.slats.slice(1).every((s,i)=>end.slats[i].y<s.y)).toBe(true);
    expect(end.slats[1].y).toBeLessThan(end.slats[0].y+end.slats[0].height);
    expect(end.slots).toHaveLength(11);
    expect(end.slots.every((s,i)=>i===0||s.center>end.slots[i-1].center)).toBe(true);
    expect(end.collisionClearanceMm).toBeGreaterThanOrEqual(0);
    expect(end.orderPreserved).toBe(true);
    expect(end.collisionFree).toBe(true);
    expect(end.sourceRegistrationFixed).toBe(true);
  });

  it("supports all four compatible travel directions without reversing source slot order",()=>{
    const cases=[
      {axis:"horizontal" as const,direction:"down" as const,expected:[0,-1]},
      {axis:"horizontal" as const,direction:"up" as const,expected:[0,1]},
      {axis:"vertical" as const,direction:"right" as const,expected:[-1,0]},
      {axis:"vertical" as const,direction:"left" as const,expected:[1,0]},
    ];
    for(const c of cases){
      const result=evaluateRisoSlatReveal({...base,axis:c.axis,direction:c.direction,progress:0});
      expect(result.slats.every(s=>s.slotOrder===s.index)).toBe(true);
      expect(result.slats.every(s=>s.lane===s.index%2)).toBe(true);
      expect(result.translation[0]*c.expected[0]+result.translation[1]*c.expected[1]).toBeGreaterThan(0);
      expect(result.slats.every(s=>s.translation[0]===result.translation[0]&&
        s.translation[1]===result.translation[1])).toBe(true);
    }
  });

  it("bounds travel, paper lap, slot clearance and alternating depth before any geometry is emitted",()=>{
    expect(()=>evaluateRisoSlatReveal({...base,count:3})).toThrow(/4–24 slats/);
    expect(()=>evaluateRisoSlatReveal({...base,axis:"horizontal",direction:"left"})).toThrow(/perpendicular/);
    expect(()=>evaluateRisoSlatReveal({...base,overlapMm:4})).toThrow(/collision clearance/);
    expect(()=>evaluateRisoSlatReveal({...base,travel:500})).toThrow(/collision clearance/);
    expect(()=>evaluateRisoSlatReveal({...base,slotClearanceMm:.8})).toThrow(/collision clearance/);
    expect(()=>evaluateRisoSlatReveal({...base,interleaveDepthMm:.2})).toThrow(/collision clearance/);
    expect(()=>evaluateRisoSlatReveal({...base,paperThicknessMm:1.3})).toThrow(/collision clearance/);
    expect(()=>evaluateRisoSlatReveal({...base,progress:1.01})).toThrow(/progress 0..1/);
  });

  it("uses absolute seek-safe 24fps progress and completes under reduced motion",()=>{
    expect(risoSlatProgress(36,36,144)).toBe(0);
    expect(risoSlatProgress(108,36,144)).toBe(.5);
    expect(risoSlatProgress(180,36,144)).toBe(1);
    expect(risoSlatProgress(36,36,144,true)).toBe(1);
    expect(risoSlatProgress(18,36,144)).toBe(0);
    expect(()=>risoSlatProgress(-1,0,144)).toThrow(/integer frames/);
  });

  it("renders original cover plus independent printed strips, real slot lines and cellulose cut edges",()=>{
    const html=markup(.5);
    expect(html.match(/data-km-riso-print=/g)).toHaveLength(13);
    expect(html.match(/data-km-riso81-slat=/g)).toHaveLength(12);
    expect(html.match(/data-km-riso81-slot=/g)).toHaveLength(11);
    expect(html.match(/data-km-riso81-fibre=/g)).toHaveLength(288);
    expect(html.match(/data-km-riso81-leading-bevel=/g)).toHaveLength(12);
    expect(html).toContain('data-km-riso81-source-registration-fixed="true"');
    expect(html).toContain('data-km-riso81-lane="0"');
    expect(html).toContain('data-km-riso81-lane="1"');
    expect(html).toContain('data-km-riso81-pull-rail=""');
    expect(html).not.toMatch(/feGaussianBlur|<canvas|<foreignObject/);
  });

  it("preserves source masters and exact end stops in horizontal and vertical print layouts",()=>{
    for(const axis of ["horizontal","vertical"] as const){
      const held=markup(0,axis),revealed=markup(1,axis);
      const count=(s:string)=>s.match(/data-km-riso-print=/g)?.length??0;
      expect(count(held)).toBe(13);
      expect(count(revealed)).toBe(13);
      expect(held.match(/data-km-riso81-original-printed-strip=/g)).toHaveLength(12);
      expect(revealed.match(/data-km-riso81-original-printed-strip=/g)).toHaveLength(12);
      expect(held).toContain('data-km-riso81-progress="0"');
      expect(revealed).toContain('data-km-riso81-progress="1"');
      expect(revealed).toContain('data-km-riso81-common-translation="0,0"');
    }
  });

  it("compiles the original landscape and portrait FilmStage deliverables",()=>{
    expect(compileFilm(RISO81_SLAT_FILM,{outputId:"landscape"}).ok).toBe(true);
    expect(compileFilm(RISO81_SLAT_FILM,{outputId:"portrait"}).ok).toBe(true);
  });
});
