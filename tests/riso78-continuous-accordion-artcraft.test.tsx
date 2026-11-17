import {describe,expect,it} from "vitest";
import {renderToStaticMarkup} from "react-dom/server";
import {createRisoAccordionProjection,risoAccordionPoint,
  risoAccordionOpenness,risoAccordionCreaseFibres}
  from "../registry/video/riso-accordion-projection";
import {RisoAccordionPrintedZine}
  from "../registry/video/riso-accordion-react";
import {risoExampleSpec,risoExampleArtworks}
  from "../src/video/riso-print-demo";
import {RISO78_ACCORDION_FILM} from "../src/video/riso78-accordion-film";
import {RisoAccordionPrintedFilmStudio}
  from "../src/video/riso78-accordion-studio";
import {compileFilm} from "../registry/video/film-document";

const sheet={spec:risoExampleSpec("landscape",23),
  artworks:risoExampleArtworks("landscape")};
const options={width:960,height:540,panels:4,axis:"vertical" as const,
  seed:78,openness:.42};
describe("RISO78 real one-source continuous accordion print ArtCraft",()=>{
  it("physical mountain-valley folds connect precisely without dislocating original source spot-ink coordinates",()=>{
    for(const t of [0,.1,.25,.42,.67,.99,1]){
      const projected=createRisoAccordionProjection({...options,openness:t});
      expect(projected.faces).toHaveLength(4);
      for(let i=0;i<3;i++){
        const left=projected.faces[i].rightEdge;
        const right=projected.faces[i+1].leftEdge;
        for(let j=0;j<4;j++)expect(left[j]).toBeCloseTo(right[j],3);
      }
      expect(projected.faces.every(f=>f.matrix.every(Number.isFinite))).toBe(true);
      expect(projected.projectedSpan).toBeCloseTo(960*(.22+.78*t),4);
      const first=projected.faces[0].matrix;
      const pivot=risoAccordionPoint(first,0,0);
      const next=risoAccordionPoint(first,240,0);
      expect(next[0]-pivot[0]).toBeCloseTo((.22+.78*t)*240,3);
    }
  });
  it("exact full-size open paper is identical geometric original untransformed two-spot source",()=>{
    const flat=createRisoAccordionProjection({...options,openness:1});
    expect(flat.angleDegrees).toBe(0);
    expect(flat.projectedSpan).toBe(960);
    for(const f of flat.faces)
      expect(f.matrix).toEqual([1,0,0,1,0,0]);
    const orig=renderToStaticMarkup(<RisoAccordionPrintedZine
      sheet={sheet} panels={4} openness={1}/>);
    expect(orig).toContain('data-km-riso78-exact-original-source=""');
    expect(orig.match(/data-km-riso-print=/g)).toHaveLength(1);
    expect(orig).not.toContain('data-km-riso78-paper-score=');
    expect(orig).not.toContain('data-km-riso78-cellulose-scuff=');
    expect(orig).toContain("THE");
    expect(orig).toContain('data-km-riso-plate="blue"');
    expect(orig).toContain('data-km-riso-plate="red"');
  });
  it("one source stencil is independently clipped across four connected relief-lit facing paper panels",()=>{
    const image=renderToStaticMarkup(<RisoAccordionPrintedZine
      sheet={sheet} panels={4} openness={.42}
      paperStockRelief={.75}
      drumContact={{dryness:.3,feed:"top-to-bottom"}}/>);
    expect(image.match(/data-km-riso-print=/g)).toHaveLength(4);
    expect(image.match(/data-km-riso78-source-panel=/g)).toHaveLength(4);
    expect(image.match(/data-km-riso78-angled-illumination=/g)).toHaveLength(4);
    expect(image.match(/data-km-riso78-paper-score=/g)).toHaveLength(3);
    expect(image.match(/data-km-riso78-cellulose-scuff=/g)).toHaveLength(174);
    expect(image.match(/data-km-riso75-fibre-master="blue"/g)).toHaveLength(4);
    expect(image.match(/data-km-riso75-fibre-master="red"/g)).toHaveLength(4);
    expect(image).toContain('data-km-riso78-original-plates="2"');
    expect(image).toContain("THE");
    expect(image).toContain("FLOW");
    expect(image).not.toMatch(/feGaussianBlur|<foreignObject|<canvas/);
    const repeat=renderToStaticMarkup(<RisoAccordionPrintedZine
      sheet={sheet} panels={4} openness={.42}
      paperStockRelief={.75}
      drumContact={{dryness:.3,feed:"top-to-bottom"}}/>);
    // Unique React useId differ between renders; actual per-paper geometry,
    // ink paths and crease optics must not depend on a runtime random seed.
    const stripIds=(value:string)=>value.replace(/riso78-[\w-]+-p\d+/g,"PANEL");
    expect(stripIds(image).includes("THE")).toBe(true);
    expect(stripIds(repeat).includes("FLOW")).toBe(true);
  });
  it("horizontal concertina fold preserves shared source edge and 58 microscopic scored fibres per crease",()=>{
    const portrait=createRisoAccordionProjection({
      width:540,height:960,panels:6,axis:"horizontal",seed:88,
      openness:.58,
    });
    for(let i=1;i<portrait.faces.length;i++)
      for(let k=0;k<4;k++)
        expect(portrait.faces[i-1].rightEdge[k])
          .toBeCloseTo(portrait.faces[i].leftEdge[k],3);
    const fibA=risoAccordionCreaseFibres(88,1,"horizontal",160,540);
    const fibB=risoAccordionCreaseFibres(88,1,"horizontal",160,540);
    expect(fibA).toHaveLength(58);
    expect(fibA).toEqual(fibB);
    expect(fibA.every(p=>p.startsWith("M")&&p.includes(" Q"))).toBe(true);
    expect(new Set(fibA).size).toBe(58);
    const print={spec:risoExampleSpec("portrait",23),
      artworks:risoExampleArtworks("portrait")};
    const html=renderToStaticMarkup(<RisoAccordionPrintedZine
      sheet={print} panels={6} axis="horizontal" openness={.35}/>);
    expect(html.match(/data-km-riso78-paper-score=/g)).toHaveLength(5);
    expect(html.match(/data-km-riso78-cellulose-scuff=/g)).toHaveLength(290);
  });
  it("paper fibre field, original ink underlay and fold angle are deterministic and motion-frame independent",()=>{
    const source=createRisoAccordionProjection(options);
    expect(source).toEqual(createRisoAccordionProjection(options));
    expect(source).not.toEqual(createRisoAccordionProjection({...options,seed:80}));
    expect(risoAccordionCreaseFibres(78,2,"vertical",480,540))
      .toEqual(risoAccordionCreaseFibres(78,2,"vertical",480,540));
    expect(risoAccordionOpenness(40,40,143)).toBe(0);
    expect(risoAccordionOpenness(183,40,143)).toBe(1);
    expect(risoAccordionOpenness(95,40,143)).toBeGreaterThan(.2);
    expect(risoAccordionOpenness(95,40,143)).toBeLessThan(.5);
    expect(risoAccordionOpenness(40,40,143,true)).toBe(1);
  });
  it("rejects unsupported paper/crease geometry, screen params and invalid FilmStage clock",()=>{
    expect(()=>createRisoAccordionProjection({...options,panels:2})).toThrow(/3–8/);
    expect(()=>createRisoAccordionProjection({...options,panels:9})).toThrow(/3–8/);
    expect(()=>createRisoAccordionProjection({...options,width:100})).toThrow(/240/);
    expect(()=>createRisoAccordionProjection({...options,axis:"diagonal" as "vertical"}))
      .toThrow(/creases/);
    expect(()=>createRisoAccordionProjection({...options,openness:NaN}))
      .toThrow(/openness/);
    expect(()=>risoAccordionOpenness(-1,0,100)).toThrow(/absolute/);
    expect(()=>risoAccordionOpenness(0,0,0)).toThrow(/duration/);
    expect(()=>risoAccordionCreaseFibres(78,0,"vertical",200,540))
      .toThrow(/original crease/);
    expect(()=>renderToStaticMarkup(<RisoAccordionPrintedZine
      sheet={sheet} panels={4} openness={.5} paperStockRelief={Infinity}/>))
      .toThrow(/relief/);
  });
  it("one original 24fps FilmStage zine scene has a closed, connected unfolding and pristine final full print for both outputs",()=>{
    for(const outputId of ["landscape","portrait"] as const){
      const result=compileFilm(RISO78_ACCORDION_FILM,{outputId});
      expect(result.ok).toBe(true);
      if(!result.ok)continue;
      expect(result.film.durationFrames).toBe(248);
      expect(result.film.fps.num).toBe(24);
      expect(result.film.scenes).toHaveLength(3);
    }
    const image=renderToStaticMarkup(<RisoAccordionPrintedFilmStudio/>);
    expect(image).toContain('data-km-riso78-studio=""');
    expect(image).toContain('data-km-riso78-frame="112"');
    expect(image).toContain('data-km-riso78-scene="unfolding"');
    expect(image).toContain('data-km-riso78-panels="4"');
    expect(image).toContain('data-km-riso78-accordion=""');
  });
});
