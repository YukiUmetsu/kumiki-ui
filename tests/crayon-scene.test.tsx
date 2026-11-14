import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { inspectCrayonScene, crayonCamera, crayonContactOffset, crayonWorldPoint, crayonVisiblePoint, crayonConnectorPath, crayonConnectorBendAt, crayonDrawingAt, crayonElementPlacement, crayonElementTransform } from "../registry/video/materials/crayon-scene";
import { CrayonScene } from "../registry/video/materials/crayon-scene-react";
import { crayonDemoScene } from "../src/video/crayon-scene-fixtures";
import { crayonPerformanceScene } from "../src/video/crayon-performance-fixtures";
import { crayonWalkScene } from "../src/video/crayon-walk-fixtures";
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


  for (const aspect of ["landscape","portrait"] as const) {
    it("renders original acting poses and dual-aspect performance through FilmStage in "+aspect, async()=>{
      const scene=crayonPerformanceScene(aspect);
      expect(inspectCrayonScene(scene)).toEqual([]);
      const mouth=scene.elements.find(e=>e.id==="mouth");
      const leftEye=scene.elements.find(e=>e.id==="left-eye");
      if (!mouth || mouth.kind!=="contour" || !leftEye || leftEye.kind!=="contour")
        throw new Error("Performance fixture is missing its face");
      expect(crayonDrawingAt(mouth,0).d).toBe(mouth.d);
      expect(crayonDrawingAt(mouth,82).d).not.toBe(mouth.d);
      expect(crayonDrawingAt(mouth,88).d).not.toBe(crayonDrawingAt(mouth,82).d);
      expect(crayonDrawingAt(leftEye,102).d).not.toBe(leftEye.d);
      expect(crayonDrawingAt(leftEye,106).d).toBe(leftEye.d);
      const at=(frame:number,reducedMotion=false)=>renderToStaticMarkup(
        <CrayonScene spec={scene} frame={frame} reducedMotion={reducedMotion}/>);
      const speech=at(88),smile=at(176),reduced=at(12,true);
      expect(speech).toContain('data-km-crayon-element="mouth"');
      expect(speech).toContain('data-km-crayon-camera=""');
      expect(smile).not.toBe(speech);
      expect(at(88)).toBe(speech);
      at(269);at(0);at(102);
      expect(at(88)).toBe(speech);
      expect(reduced).toContain('data-km-crayon-frame="12"');
      expect(crayonDrawingAt(mouth,0,true,270).d).toBe(mouth.d);
      expect(speech).toContain(aspect==="portrait"?'viewBox="0 0 540 960"':'viewBox="0 0 960 540"');
      const film:FilmDocument={schemaVersion:1,id:"crayon-actor-"+aspect,fps:{num:30,den:1},
        drift:0,outputs:[{id:aspect,width:scene.width,height:scene.height}],
        scenes:[{id:"performance",recipeId:"slot",durationFrames:270,
          content:{slot:"crayon-scene",label:"Original acting",props:{scene}}}]};
      const compiled=compileFilm(film,{outputId:aspect});
      expect(compiled.ok).toBe(true);
      if (!compiled.ok) return;
      const slots=await loadFilmSlots(compiled.film);
      const html=renderToStaticMarkup(<>{slots(
        {slot:"crayon-scene",label:"Original acting",props:{scene}},
        {frame:118,fps:{num:30,den:1},durationFrames:270,
          width:scene.width,height:scene.height,reducedMotion:false},
      )}</>);
      expect(html).toContain('data-km-crayon-element="mouth"');
    });
  }

  it("rejects malformed, unknown, ambiguous and unsorted performance pose cues",()=>{
    const scene=crayonPerformanceScene("landscape");
    const mouth=scene.elements.find(n=>n.id==="mouth");
    if (!mouth || mouth.kind!=="contour") throw new Error("missing mouth");
    const invalid=(patch:Partial<typeof mouth>)=>
      inspectCrayonScene({...scene,elements:[{...mouth,parentId:undefined,...patch}]}).join(" ");
    expect(invalid({poses:undefined})).toMatch(/poses/);
    expect(invalid({poseCues:undefined})).toMatch(/poseCues/);
    expect(invalid({poses:[{id:"smile",d:"M0 0L1 1"},{id:"smile",d:"M0 0L2 2"}]})).toMatch(/unique slug/);
    expect(invalid({poses:[{id:"base",d:"M0 0L1 1"}]})).toMatch(/not base/);
    expect(invalid({poses:[{id:"oh",d:"<script>"}]})).toMatch(/bounded SVG path/);
    expect(invalid({poseCues:[{frame:20,pose:"mbp"},{frame:19,pose:"oh"}]})).toMatch(/sorted/);
    expect(invalid({poseCues:[{frame:270,pose:"mbp"}]})).toMatch(/within scene/);
    expect(invalid({poseCues:[{frame:14,pose:"not-drawn"}]})).toMatch(/not a declared pose/);
    expect(invalid({drawings:[{frame:18,d:"M0 0L1 1"}]})).toMatch(/cannot be combined/);
  });


  it("maps local points exactly through ancestor translation, scale, rotation, and pivots",()=>{
    const base=crayonDemoScene("city","landscape");
    const root={...base.elements[0],id:"rig-root",screenSpace:false,parentId:undefined,
      placement:{x:100,y:50,rotate:90}};
    const child={...base.elements[1],id:"rig-foot",screenSpace:false,parentId:"rig-root",
      placement:{x:5,y:0,scale:2,rotate:90}};
    const scene={...base,elements:[child,root]};
    expect(inspectCrayonScene(scene)).toEqual([]);
    const point=crayonWorldPoint(scene,child,0,{x:10,y:0});
    expect(point.x).toBeCloseTo(80,7);
    expect(point.y).toBeCloseTo(55,7);
  });

  for(const aspect of ["landscape","portrait"] as const){
    it("locks alternating grounded feet while the character walks in "+aspect,async()=>{
      const scene=crayonWalkScene(aspect);
      expect(inspectCrayonScene(scene)).toEqual([]);
      const back=scene.elements.find(e=>e.id==="foot-back");
      const front=scene.elements.find(e=>e.id==="foot-front");
      if(!back||!front)throw new Error("missing walking feet");
      for(const [node,starts] of [[back,[0,94,214]],[front,[0,156]]] as const){
        for(const start of starts){
          const contact=node.contacts!.find(x=>x.start===start)!;
          const expected=crayonWorldPoint(scene,node,contact.start,contact.anchor);
          for(const frame of [start,Math.floor((start+contact.end)/2),contact.end]){
            const actual=crayonWorldPoint(scene,node,frame,contact.anchor);
            const correction=crayonContactOffset(scene,node,frame);
            if(!correction)throw new Error("missing contact correction");
            expect(actual.x+correction.x).toBeCloseTo(expected.x,6);
            expect(actual.y+correction.y).toBeCloseTo(expected.y,6);
          }
        }
      }
      expect(crayonContactOffset(scene,back,65)).toBeNull();
      expect(crayonContactOffset(scene,front,124)).toBeNull();
      expect(crayonContactOffset(scene,back,215,true))
        .toEqual(crayonContactOffset(scene,back,269,true));
      const mid=renderToStaticMarkup(<CrayonScene spec={scene} frame={156}/>);
      renderToStaticMarkup(<CrayonScene spec={scene} frame={269}/>);
      renderToStaticMarkup(<CrayonScene spec={scene} frame={0}/>);
      expect(renderToStaticMarkup(<CrayonScene spec={scene} frame={156}/>)).toEqual(mid);
      expect(mid).toContain('data-km-crayon-contact="planted"');
      expect(mid).toContain('data-km-crayon-element="flower-petals"');
      const film:FilmDocument={schemaVersion:1,id:"crayon-walk-"+aspect,fps:{num:30,den:1},
        drift:0,outputs:[{id:aspect,width:scene.width,height:scene.height}],
        scenes:[{id:"walk",recipeId:"slot",durationFrames:270,
          content:{slot:"crayon-scene",label:"Walk",props:{scene}}}]};
      const compiled=compileFilm(film,{outputId:aspect});
      expect(compiled.ok).toBe(true);
      if(!compiled.ok)return;
      const slots=await loadFilmSlots(compiled.film);
      const html=renderToStaticMarkup(<>{slots(
        {slot:"crayon-scene",label:"Walk",props:{scene}},
        {frame:156,fps:{num:30,den:1},durationFrames:270,
          width:scene.width,height:scene.height,reducedMotion:false},
      )}</>);
      expect(html).toContain('data-km-crayon-element="foot-back"');
    });
  }

  it("rejects invalid foot contacts, overlapping stances and illegal anchors",()=>{
    const scene=crayonWalkScene("landscape");
    const foot=scene.elements.find(e=>e.id==="foot-back");
    if(!foot)throw new Error("missing foot");
    const invalid=(contacts:unknown,screenSpace=false)=>
      inspectCrayonScene({...scene,elements:[{...foot,parentId:undefined,screenSpace,contacts}]}).join(" ");
    expect(invalid([{start:7,end:12,anchor:{x:0,y:0}},{start:12,end:30,anchor:{x:0,y:0}}])).toMatch(/non-overlapping/);
    expect(invalid([{start:0,end:270,anchor:{x:0,y:0}}])).toMatch(/within duration/);
    expect(invalid([{start:0,end:12,anchor:{x:Infinity,y:0}}])).toMatch(/finite/);
    expect(invalid([{start:0,end:12,anchor:{x:0,y:0}}],true)).toMatch(/world-space/);
    expect(invalid([])).toMatch(/1..16/);
    expect(invalid([{start:15,end:4,anchor:{x:0,y:0}}])).toMatch(/sorted/);
    const parent={...foot,id:"contact-root",parentId:undefined,contacts:[
      {start:0,end:30,anchor:{x:0,y:0}}]};
    const child={...foot,id:"contact-child",parentId:"contact-root",contacts:[
      {start:20,end:50,anchor:{x:0,y:0}}]};
    expect(inspectCrayonScene({...scene,elements:[parent,child]}).join(" "))
      .toMatch(/overlap ancestor/);
  });

  it("inherits a single planted parent contact through a held child",()=>{
    const base=crayonWalkScene("landscape");
    const parent=base.elements.find(n=>n.id==="foot-back");
    if(!parent)throw new Error("missing foot");
    const child={...parent,id:"held-ribbon",parentId:"foot-back",contacts:undefined};
    const scene={...base,elements:[...base.elements,child]};
    expect(inspectCrayonScene(scene)).toEqual([]);
    expect(crayonContactOffset(scene,child,105)).toEqual(crayonContactOffset(scene,parent,105));
    expect(crayonContactOffset(scene,child,185)).toBeNull();
    expect(crayonElementTransform(scene,child,105))
      .toMatch(/^translate\(/);
  });


  for(const aspect of ["landscape","portrait"] as const){
    it("links planted and swinging legs to the correct visible anchors in "+aspect,()=>{
      const scene=crayonWalkScene(aspect);
      expect(inspectCrayonScene(scene)).toEqual([]);
      const leg=scene.elements.find(n=>n.id==="leg-back");
      const foot=scene.elements.find(n=>n.id==="foot-back");
      const hip=scene.elements.find(n=>n.id==="body");
      if(!leg||leg.kind!=="connector"||!foot||!hip)
        throw new Error("missing connector rig");
      const point=(frame:number)=>crayonVisiblePoint(scene,foot,frame,leg.to.anchor);
      const fixed=point(94);
      const planted=point(156);
      expect(planted.x).toBeCloseTo(fixed.x,5);
      expect(planted.y).toBeCloseTo(fixed.y,5);
      expect(crayonConnectorBendAt(leg,65)).toBe(crayonConnectorBendAt(leg,64));
      expect(crayonConnectorBendAt(leg,65)).toBeLessThan(-25);
      expect(crayonConnectorBendAt(leg,95)).toBeCloseTo(crayonConnectorBendAt(leg,94),5);
      expect(crayonConnectorBendAt(leg,0,true,270)).toBeCloseTo(-5,5);
      const d=crayonConnectorPath(scene,leg,124);
      const start=crayonVisiblePoint(scene,hip,124,leg.from.anchor);
      const end=point(124);
      expect(d).toBe("M"+start.x+" "+start.y+
        " Q"+d.split(" Q")[1].split(" ").slice(0,2).join(" ")+
        " "+end.x+" "+end.y);
      expect(crayonConnectorPath(scene,leg,124)).toBe(d);
      expect(crayonConnectorPath(scene,leg,70)).not.toEqual(d);
      crayonConnectorPath(scene,leg,269);
      crayonConnectorPath(scene,leg,0);
      expect(crayonConnectorPath(scene,leg,124)).toBe(d);
      expect(crayonConnectorPath(scene,leg,0,true)).toBe(crayonConnectorPath(scene,leg,269,true));
      const markup=renderToStaticMarkup(<CrayonScene spec={scene} frame={124}/>);
      expect(markup).toContain('data-km-crayon-element="leg-back"');
      expect(markup).toContain('data-km-crayon-kind="connector"');
      expect(markup).toContain('data-km-crayon-line=""');
    });
  }

  it("rejects unsafe connector references and incompatible local transforms",()=>{
    const scene=crayonWalkScene("landscape");
    const joint=scene.elements.find(n=>n.id==="leg-back");
    if(!joint || joint.kind!=="connector")throw new Error("missing joint");
    const invalid=(patch:Partial<typeof joint>)=>
      inspectCrayonScene({...scene,elements:scene.elements.map(n=>n.id===joint.id?{...joint,...patch}:n)}).join(" ");
    expect(invalid({from:{elementId:"does-not-exist",anchor:{x:0,y:0}}})).toMatch(/world-space non-connector/);
    expect(invalid({from:{elementId:"leg-front",anchor:{x:0,y:0}}})).toMatch(/world-space non-connector/);
    expect(invalid({to:{elementId:"head",anchor:{x:Infinity,y:0}}})).toMatch(/bounded drawing anchor/);
    expect(invalid({to:{elementId:"javascript:bad",anchor:{x:0,y:0}}})).toMatch(/bounded drawing anchor/);
    expect(invalid({width:-1})).toMatch(/width out of bounds/);
    expect(invalid({bend:Infinity})).toMatch(/bend/);
    expect(invalid({bendKeys:[{frame:10,bend:3},{frame:9,bend:8}]})).toMatch(/bendKeys/);
    expect(invalid({bendKeys:[{frame:270,bend:3}]})).toMatch(/bendKeys/);
    expect(invalid({bendKeys:[{frame:12,bend:Infinity}]})).toMatch(/bendKeys/);
    expect(invalid({screenSpace:true})).toMatch(/world-space/);
    expect(invalid({parentId:"body"})).toMatch(/cannot inherit/);
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
