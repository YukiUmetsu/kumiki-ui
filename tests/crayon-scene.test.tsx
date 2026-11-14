import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { inspectCrayonScene, crayonCamera, crayonDrawingAt, crayonElementPlacement, crayonElementTransform } from "../registry/video/materials/crayon-scene";
import { CrayonScene } from "../registry/video/materials/crayon-scene-react";
import { crayonDemoScene } from "../src/video/crayon-scene-fixtures";
import { compileFilm, type FilmDocument } from "../registry/video/film-document";
import { loadFilmSlots } from "../src/film/film-slots";
import portable from "../examples/film/crayon-scene-three-subjects.film.json";

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
  it("renders three unrelated serialized proof subjects from one FilmDocument in both aspects", async()=>{
    for(const aspect of ["landscape","portrait"] as const) {
      const compiled=compileFilm(portable,{outputId:aspect});
      expect(compiled.ok).toBe(true);
      if(!compiled.ok) continue;
      expect(compiled.film.durationFrames).toBe(540);
      expect(compiled.film.scenes).toHaveLength(3);
      const slot=await loadFilmSlots(compiled.film);
      for(const part of portable.scenes) {
        const html=renderToStaticMarkup(<>{slot(
          {slot:"crayon-scene",label:"Generic film",props:part.content.props},
          {frame:179,fps:{num:30,den:1},durationFrames:180,
            width:aspect==="landscape"?960:540,height:aspect==="landscape"?540:960,reducedMotion:false},
        )}</>);
        expect(html).toContain('data-km-crayon-scene="');
        expect(html).toContain('data-km-crayon-wax=""');
      }
    }
  });


  it("supports deterministic articulated chains, pivot rotation and preserved draw order",()=>{
    const base=crayonDemoScene("city","landscape");
    const root={...base.elements[0],id:"actor-root",placement:{x:20,y:40},
      motion:[{frame:0,x:0,y:0,rotate:0},{frame:100,x:80,y:0,rotate:30}],pivot:{x:8,y:12}};
    const arm={...base.elements[1],id:"actor-arm",parentId:"actor-root",
      placement:{x:12,y:14},pivot:{x:4,y:5},
      motion:[{frame:0,x:0,y:0,rotate:0},{frame:100,x:0,y:0,rotate:-60}]};
    const prop={...base.elements[2],id:"held-prop",parentId:"actor-arm",placement:{x:6,y:8}};
    const scene={...base,elements:[prop,root,arm]};
    expect(inspectCrayonScene(scene)).toEqual([]);
    const a=crayonElementTransform(scene,prop,50);
    crayonElementTransform(scene,prop,100);
    crayonElementTransform(scene,prop,0);
    expect(crayonElementTransform(scene,prop,50)).toBe(a);
    expect(a.split("rotate(")).toHaveLength(4);
    expect(a).toContain("translate(8 12)");
    const html=renderToStaticMarkup(<CrayonScene spec={scene} frame={50}/>);
    expect(html.indexOf('data-km-crayon-element="held-prop"'))
      .toBeLessThan(html.indexOf('data-km-crayon-element="actor-root"'));
    expect(crayonElementTransform(scene,prop,0,true))
      .toBe(crayonElementTransform(scene,prop,239,true));
  });

  it("rejects missing/cyclic parent links, screen boundary crossing and bad pivots",()=>{
    const base=crayonDemoScene("city","landscape");
    const a={...base.elements[0],id:"rig-a",parentId:"rig-b"};
    const b={...base.elements[1],id:"rig-b",parentId:"rig-a"};
    expect(inspectCrayonScene({...base,elements:[a,b]}).join(" ")).toMatch(/cycle/);
    expect(inspectCrayonScene({...base,elements:[{...a,parentId:"not-here"}]}).join(" ")).toMatch(/does not exist/);
    expect(inspectCrayonScene({...base,elements:[{...a,parentId:undefined,pivot:{x:Infinity,y:0}}]}).join(" ")).toMatch(/pivot/);
    expect(inspectCrayonScene({...base,elements:[{...a,parentId:undefined,screenSpace:true},{...b,screenSpace:false}]}).join(" ")).toMatch(/screenSpace/);
  });


  it("selects original replacement drawings on held frames independently of seek order",()=>{
    const scene=crayonDemoScene("city","landscape");
    const eye=scene.elements.find(n=>n.id==="bird-eye");
    if(!eye || eye.kind!=="contour")throw new Error("missing authored eye");
    expect(inspectCrayonScene(scene)).toEqual([]);
    expect(crayonDrawingAt(eye,139).index).toBe(0);
    expect(crayonDrawingAt(eye,140).index).toBe(1);
    expect(crayonDrawingAt(eye,145).index).toBe(1);
    expect(crayonDrawingAt(eye,146).index).toBe(2);
    expect(crayonDrawingAt(eye,202).index).toBe(3);
    crayonDrawingAt(eye,208);
    crayonDrawingAt(eye,0);
    expect(crayonDrawingAt(eye,202).index).toBe(3);
    expect(crayonDrawingAt(eye,0,true,scene.durationFrames).index).toBe(4);
    const wing=scene.elements.find(n=>n.id==="bird-wing");
    if(!wing || wing.kind!=="wax")throw new Error("missing wing redraw");
    expect(crayonDrawingAt(wing,109).index).toBe(0);
    expect(crayonDrawingAt(wing,110)).toMatchObject({index:1,bounds:{x:-49,y:-68,width:74,height:86}});
    expect(crayonDrawingAt(wing,156).index).toBe(2);
    const wingOpen=renderToStaticMarkup(<CrayonScene spec={scene} frame={110}/>);
    expect(wingOpen).toContain('data-km-crayon-drawing="1"');
    const before=renderToStaticMarkup(<CrayonScene spec={scene} frame={139}/>);
    const closed=renderToStaticMarkup(<CrayonScene spec={scene} frame={140}/>);
    const reopened=renderToStaticMarkup(<CrayonScene spec={scene} frame={146}/>);
    expect(before).toContain('data-km-crayon-element="bird-eye"');
    expect(closed).toContain('data-km-crayon-drawing="1"');
    expect(reopened).toContain('data-km-crayon-drawing="2"');
    expect(before).not.toEqual(closed);
    expect(renderToStaticMarkup(<CrayonScene spec={scene} frame={140}/>)).toBe(closed);
  });

  it("rejects malformed replacement paths, ordering, missing wax bounds and excessive keys",()=>{
    const scene=crayonDemoScene("city","landscape");
    const eye=scene.elements.find(n=>n.id==="bird-eye");
    const wing=scene.elements.find(n=>n.id==="bird-wing");
    if(!eye || eye.kind!=="contour" || !wing || wing.kind!=="wax")throw new Error("missing bird");
    const invalid=(node:typeof eye | typeof wing)=>
      inspectCrayonScene({...scene,elements:[node]}).join(" ");
    expect(invalid({...eye,drawings:[{frame:20,d:"M0 0L1 1"},{frame:19,d:"M0 0L2 2"}]})).toMatch(/sorted/);
    expect(invalid({...eye,drawings:[{frame:0,d:"M0 0"}]})).toMatch(/frame/);
    expect(invalid({...eye,drawings:[{frame:24,d:"<script>"}]})).toMatch(/bounded SVG path/);
    expect(invalid({...wing,drawings:[{frame:20,d:"M0 0L10 0Z",bounds:{x:0,y:0,width:0,height:4}}]})).toMatch(/bounds/);
    expect(invalid({...eye,drawings:Array.from({length:49},(_,i)=>({frame:i+1,d:"M0 0L1 1"}))})).toMatch(/1..48/);
    expect(()=>crayonDrawingAt(eye,-1)).toThrow(/nonnegative/);
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
