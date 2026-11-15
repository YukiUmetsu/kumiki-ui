import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { inspectWetPaper, evaluateWetPaper } from "../registry/video/watercolour-wet-paper";
import { WATERCOLOUR_STUDIES, watercolourStudySpec, WatercolourMasterStudyPage } from "../src/video/watercolour-master-studies";
import { WATERCOLOUR_MASTER_STUDIES_FILM } from "../src/video/watercolour-master-studies-film";
import { compileFilm } from "../registry/video/film-document";
import { loadFilmSlots } from "../src/film/film-slots";
import fixture from "../examples/film/watercolour-master-studies.film.json";
import fullCanvasFilm from "../examples/film/watercolour-master-studies-art-only.film.json";

describe("reference-informed original watercolor craftsmanship studies",()=>{
  for(const output of ["landscape","portrait"] as const){
    for(const study of WATERCOLOUR_STUDIES){
      it("preflights "+output+"/"+study+" reserves, material and linework",()=>{
        const spec=watercolourStudySpec(study,output);
        expect(inspectWetPaper(spec)).toEqual([]);
        expect(spec.reservePaths?.length).toBeGreaterThan(0);
        expect(spec.drops.some(d=>d.path?.length && d.path.length>=2)).toBe(true);
        expect(spec.drops.flatMap(d=>d.path??[]).every(q=>q.pressure>0 && q.pressure<=1)).toBe(true);
        const html=renderToStaticMarkup(
          <WatercolourMasterStudyPage study={study} spec={spec} frame={320}/>);
        expect(html).toContain('data-km-wet-paper=""');
        expect(html).toContain('data-km-wet-pigment-field=""');
        expect(html).toContain("-reserves)");
        expect(html).toContain("WATERCOLOUR / ORIGINAL STUDIES");
        expect(html).toContain(output==="landscape"?"0 0 960 540":"0 0 540 960");
        expect(html).not.toContain("NaN");
        expect(html).not.toContain("Infinity");
        const dry=renderToStaticMarkup(
          <WatercolourMasterStudyPage study={study} spec={spec} frame={0} reducedMotion/>);
        expect(dry).toContain('data-km-wet-paper-phase="dry"');
      });
    }
  }

  it("reserves untouched paper instead of overwriting it with opaque white pigment",()=>{
    const spec=watercolourStudySpec("estuary","landscape");
    expect(spec.reservePaths?.length).toBeGreaterThanOrEqual(10);
    const bad={...spec,reservePaths:["<script>alert(1)</script>"]};
    expect(inspectWetPaper(bad).map(x=>x.path)).toContain("/reservePaths");
    const many={...spec,reservePaths:Array.from({length:33},()=> "M1 1 H2 V2 Z")};
    expect(inspectWetPaper(many).map(x=>x.path)).toContain("/reservePaths");
    const first=evaluateWetPaper(spec,208);
    expect(evaluateWetPaper(spec,208)).toEqual(first);
    expect(evaluateWetPaper(spec,999).settled).toBe(true);
  });

  it("shares the original 42-second three-chapter film with both production outputs",async()=>{
    expect(fixture).toEqual(WATERCOLOUR_MASTER_STUDIES_FILM);
    for(const outputId of ["landscape","portrait"] as const){
      const compiled=compileFilm(fixture,{outputId});
      expect(compiled.ok).toBe(true);
      if(!compiled.ok)continue;
      expect(compiled.film.durationFrames).toBe(1260);
      const render=await loadFilmSlots(compiled.film);
      for(const study of WATERCOLOUR_STUDIES){
        const html=renderToStaticMarkup(<>{render({
          slot:"watercolour-master-study",label:study,props:{study},
        },{frame:380,fps:{num:30,den:1},durationFrames:420,
          width:compiled.film.width,height:compiled.film.height,reducedMotion:false})}</>);
        expect(html).toContain("data-km-wet-paper");
        expect(html).toContain("WATERCOLOUR / ORIGINAL STUDIES");
      }
    }
  });
  it("exports full-canvas films from portable 3-chapter slot props in both aspects",async()=>{
    expect(fullCanvasFilm.scenes).toHaveLength(3);
    for(const outputId of ["landscape","portrait"] as const){
      const result=compileFilm(fullCanvasFilm,{outputId});
      expect(result.ok).toBe(true);
      if(!result.ok)continue;
      expect(result.film.durationFrames).toBe(1260);
      const slots=await loadFilmSlots(result.film);
      const html=renderToStaticMarkup(<>{slots({
        slot:"watercolour-master-study",label:"full-painting",props:{
          study:"courtyard",artOnly:true,
        },
      },{frame:340,fps:{num:30,den:1},durationFrames:420,
        width:result.film.width,height:result.film.height,reducedMotion:false})}</>);
      expect(html).toContain("data-km-subject-pigment");
      expect(html).not.toContain("WATERCOLOUR / ORIGINAL STUDIES");
    }
  });

});
