import {describe,it,expect} from "vitest";
import {existsSync} from "node:fs";
import {resolve} from "node:path";
import {renderToStaticMarkup} from "react-dom/server";
import {compileFilm} from "../registry/video/film-document";
import {loadFilmSlots} from "../src/film/film-slots";
import {WATERCOLOUR_ART_DIRECTOR_FILM} from "../src/video/watercolour-art-director-film";
import {WATERCOLOUR_PORTRAIT_REFERENCES,WATERCOLOUR_PORTRAIT_GATE}
  from "../src/video/watercolour-portrait-reference-data";

describe("Rejected watercolor portrait retirement and reference rebuild gate",()=>{
  it("removes the disapproved source figures, Storybook pages and portable films",()=>{
    for(const path of [
      "src/video/watercolour-portrait-demo.ts",
      "src/video/watercolour-portrait-ensemble.ts",
      "src/video/watercolour-portrait.stories.tsx",
      "src/video/watercolour-portrait-ensemble.stories.tsx",
      "src/video/watercolour-portrait-film.ts",
      "src/video/watercolour-portrait-ensemble-film.ts",
      "examples/film/watercolour-portrait.film.json",
      "examples/film/watercolour-portrait-ensemble.film.json",
    ])expect(existsSync(resolve(process.cwd(),path))).toBe(false);
  });
  it("supplies usable, uniquely identified, credited external masterwork studies",()=>{
    const works=WATERCOLOUR_PORTRAIT_REFERENCES;
    expect(works.length).toBeGreaterThanOrEqual(6);
    expect(new Set(works.map(x=>x.id)).size).toBe(works.length);
    expect(new Set(works.map(x=>x.artist)).size).toBeGreaterThanOrEqual(4);
    expect(works.filter(x=>x.priority==="primary").length).toBeGreaterThanOrEqual(4);
    expect(works.filter(x=>x.imageUrl).length).toBeGreaterThanOrEqual(4);
    for(const r of works){
      expect(r.sourceUrl).toMatch(/^https:\/\//);
      if(r.imageUrl)expect(r.imageUrl).toMatch(/^https:\/\//);
      expect(r.observed.length).toBeGreaterThan(100);
      expect(r.construction.length).toBeGreaterThan(110);
      expect(r.negativeControl.length).toBeGreaterThan(45);
      expect(r.rightsNote).toMatch(/rights|copyright|Contemporary|museum/i);
    }
    expect(WATERCOLOUR_PORTRAIT_GATE.status).toBe("rejected-rebuild-required");
    expect(WATERCOLOUR_PORTRAIT_GATE.rejectedPortraitIds).toEqual(["sitter-a","sitter-b"]);
    expect(WATERCOLOUR_PORTRAIT_GATE.minimumEvidence.length).toBeGreaterThanOrEqual(5);
  });
  it("rejects historical failed faces from production film slots while retaining watercolor wetlands",async()=>{
    const compiled=compileFilm(WATERCOLOUR_ART_DIRECTOR_FILM,{outputId:"landscape"});
    expect(compiled.ok).toBe(true);
    if(!compiled.ok)return;
    const slot=await loadFilmSlots(compiled.film);
    const ctx={frame:260,fps:{num:30,den:1},durationFrames:360,
      width:compiled.film.width,height:compiled.film.height,reducedMotion:false};
    for(const invalid of ["person-portrait","unknown","sitter-a"]){
      expect(()=>slot({slot:"watercolour-illustration",label:"withdrawn",
        props:{subject:invalid}},ctx)).toThrow(/retired/i);
    }
    expect(()=>slot({slot:"watercolour-portrait-ensemble",label:"withdrawn",
      props:{seed:83}},ctx)).toThrow(/retired/i);
    const wetland=renderToStaticMarkup(<>{slot({
      slot:"watercolour-illustration",label:"wetland",
      props:{subject:"heron-wetland",seed:83},
    },ctx)}</>);
    expect(wetland).toContain('data-km-watercolour-part="great-blue-heron"');
    expect(wetland).not.toContain("rebuilt-human-sitter");
  });
});
