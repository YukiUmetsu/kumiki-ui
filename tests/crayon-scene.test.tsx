import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { inspectCrayonScene, crayonCamera, crayonElementPlacement } from "../registry/video/materials/crayon-scene";
import { CrayonScene } from "../registry/video/materials/crayon-scene-react";
import { crayonDemoScene } from "../src/video/crayon-scene-fixtures";
import { compileFilm, type FilmDocument } from "../registry/video/film-document";
import { loadFilmSlots } from "../src/film/film-slots";

describe("CRAYON1 data-driven scene grammar",()=>{
  for(const subject of ["water-cycle","city","numbers"] as const) {
    for(const aspect of ["landscape","portrait"] as const) {
      it("accepts independently composed "+subject+" / "+aspect+" with no specialized renderer",async()=>{
        const scene=crayonDemoScene(subject,aspect);
        expect(inspectCrayonScene(scene)).toEqual([]);
        const render=(frame:number,reduce=false)=>renderToStaticMarkup(
          <CrayonScene spec={scene} frame={frame} reducedMotion={reduce}/>);
        const first=render(0),mid=render(145),last=render(239);
        expect(first).toContain('data-km-crayon-scene="');
        expect(mid).toContain('data-km-crayon-wax=""');
        expect(mid).not.toEqual(first);
        expect(last).not.toEqual(mid);
        expect(render(145)).toEqual(mid);
        expect(render(239)).toEqual(last);
        expect(render(0,true)).toContain('data-km-crayon-wax=""');
        expect(last).toContain('data-km-crayon-lettering="headline"');
        expect(mid).toContain('data-km-crayon-camera=""');
        expect(last).toContain(aspect==="portrait"?'viewBox="0 0 540 960"':'viewBox="0 0 960 540"');

        const film:FilmDocument={schemaVersion:1,id:"crayon-scene-fixture",fps:{num:30,den:1},
          drift:0,outputs:[{id:aspect,width:scene.width,height:scene.height}],
          scenes:[{id:"illustration",recipeId:"slot",durationFrames:240,
            content:{slot:"crayon-scene",label:"Native crayon scene",props:{scene}}}]};
        const compiled=compileFilm(film,{outputId:aspect});
        expect(compiled.ok).toBe(true);
        if(!compiled.ok)return;
        const slot=await loadFilmSlots(compiled.film);
        const html=renderToStaticMarkup(<>{slot(
          {slot:"crayon-scene",label:"Material",props:{scene}},
          {frame:122,fps:{num:30,den:1},durationFrames:240,width:scene.width,height:scene.height,reducedMotion:false},
        )}</>);
        expect(html).toContain('data-km-crayon-frame="122"');
      });
    }
  }

  it("rejects bad schema, unsafe path syntax, duplicate IDs, runaway geometries and unsupported colors",()=>{
    const s=crayonDemoScene("city","landscape");
    expect(inspectCrayonScene({...s,version:2})).toContain("version must be 1");
    expect(inspectCrayonScene({...s,elements:[s.elements[0],s.elements[0]]}).join(" ")).toMatch(/unique slug/);
    expect(inspectCrayonScene({...s,paper:"url(https://evil.test)"}).join(" ")).toMatch(/hex color/);
    const region=s.elements.find(e=>e.kind==="wax");
    if(!region||region.kind!=="wax")throw new Error("Fixture missing region");
    expect(inspectCrayonScene({...s,elements:[{...region,d:"<script>bad</script>"}]}).join(" ")).toMatch(/bounded SVG path/);
    expect(inspectCrayonScene({...s,elements:[{...region,bounds:{x:0,y:0,width:10000,height:50}}]}).join(" ")).toMatch(/bounds/);
    expect(inspectCrayonScene({...s,camera:[{frame:240,focusX:0,focusY:0,zoom:8}]}).join(" ")).toMatch(/camera/);
    expect(()=>renderToStaticMarkup(<CrayonScene spec={{...s,width:2}} frame={100}/>)).toThrow(/Invalid CRAYON1/);
    expect(()=>renderToStaticMarkup(<CrayonScene spec={s} frame={-1}/>)).toThrow(/nonnegative/);
  });

  it("camera and moving objects are seek-stable with authored holds",()=>{
    const s=crayonDemoScene("water-cycle","landscape");
    const a=crayonCamera(s,50),b=crayonCamera(s,239);
    crayonCamera(s,0);
    expect(crayonCamera(s,50)).toEqual(a);
    expect(crayonCamera(s,0,true)).toEqual(b);
    const cloud=s.elements.find(e=>e.id==="cloud");
    if(!cloud)throw new Error("missing cloud");
    const at=crayonElementPlacement(cloud,80);
    crayonElementPlacement(cloud,0);
    crayonElementPlacement(cloud,239);
    expect(crayonElementPlacement(cloud,80)).toEqual(at);
    const hold={...cloud,poseCadence:2 as const};
    expect(crayonElementPlacement(hold,80)).toEqual(crayonElementPlacement(hold,81));
    expect(crayonElementPlacement(cloud,0,true)).toEqual(crayonElementPlacement(cloud,239));
  });
  it("fails on wrong FilmStage output dimensions",async()=>{
    const scene=crayonDemoScene("city","landscape");
    const slots=await loadFilmSlots({scenes:[]});
    expect(()=>renderToStaticMarkup(<>{slots(
      {slot:"crayon-scene",label:"Wrong aspect",props:{scene}},
      {frame:0,fps:{num:30,den:1},durationFrames:240,width:540,height:960,reducedMotion:false},
    )}</>)).toThrow(/dimensions must match/);
  });
});
