import {createElement} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {describe,expect,it} from "vitest";
import {validateCharacterDefinition} from "../registry/character/validate";
import {
  normalizeFigurePoint,figureRatios,compareFigureRatios,validateFigureReference,
} from "../registry/character/figure-proportion-study";
import {
  SHANSHUI_TEACHER_MESHES,SHANSHUI_LEGACY_PUPPET_MESH,
  teacherHeadRatio,teacherLandmark,
} from "../src/video/ink-shanshui-teacher-mesh";
import {shanshuiFaceAssets} from "../src/video/ink-shanshui-face-plates";
import {makeShanshuiScholar,shanshuiScholarInstance,InkShanshuiFilm} from
  "../src/video/ink-shanshui-film";
import {SHANSHUI_SCENES,DEFAULT_SHANSHUI} from "../registry/video/ink-shanshui";

describe("teacher-grounded Chinese ink scholar proportion meshes",()=>{
  it("honors all three ORIGINAL reference-image dimensions without embedding pixels",()=>{
    expect(SHANSHUI_TEACHER_MESHES["misty-hermit"].source)
      .toMatchObject({width:1280,height:720});
    expect(SHANSHUI_TEACHER_MESHES["river-scholar"].source)
      .toMatchObject({width:1672,height:941});
    expect(SHANSHUI_TEACHER_MESHES["mountain-trail"].source)
      .toMatchObject({width:1672,height:941});
    for(const scene of SHANSHUI_SCENES){
      const t=SHANSHUI_TEACHER_MESHES[scene];
      expect(validateFigureReference(t)).toEqual([]);
      expect(t.regions.skull).toBeDefined();
      expect(t.regions.hair).toBeDefined();
      expect(t.regions["sleeve-screen-left"]).toBeDefined();
      expect(t.regions["sleeve-screen-right"]).toBeDefined();
      expect(t.regions.robe).toBeDefined();
      expect(t.regions.nose).toBeDefined();
      expect(t.regions.mouth).toBeDefined();
      expect(t.regions["eye-screen-left"]).toBeDefined();
      expect(t.regions["brow-screen-left"]).toBeDefined();
      expect(t.occluded["knee-left"]).toMatch(/robe/i);
      expect(t.landmarks["knee-left"]).toBeUndefined();
      expect(t.landmarks["ankle-right"]).toBeUndefined();
      expect(Object.keys(t.landmarks).length).toBeGreaterThan(30);
      for(const item of Object.values(t.landmarks)){
        expect(item.tolerancePx).toBeGreaterThan(0);
      }
      expect(teacherLandmark(scene,"chin")).not.toBeNull();
      expect(teacherLandmark(scene,"knee-left")).toBeNull();
      const norm=normalizeFigurePoint(t,t.landmarks["chin"]!.point);
      expect(norm.y).toBeGreaterThan(0);
      expect(norm.y).toBeLessThan(1);
    }
    expect(validateFigureReference(SHANSHUI_LEGACY_PUPPET_MESH)).toEqual([]);
  });
  it("preserves three different identities, not identical faces with new palette values",()=>{
    const old=SHANSHUI_TEACHER_MESHES["misty-hermit"];
    const reader=SHANSHUI_TEACHER_MESHES["river-scholar"];
    const walker=SHANSHUI_TEACHER_MESHES["mountain-trail"];
    expect(old.pose).toMatch(/Older scholar/);
    expect(reader.pose).toMatch(/scroll/);
    expect(walker.pose).toMatch(/Young traveler/);
    const headRatios=SHANSHUI_SCENES.map(teacherHeadRatio);
    expect(new Set(headRatios.map(x=>x.toFixed(3))).size).toBe(3);
    expect(teacherHeadRatio("river-scholar"))
      .toBeLessThan(teacherHeadRatio("misty-hermit"));
    expect(teacherHeadRatio("river-scholar"))
      .toBeLessThan(teacherHeadRatio("mountain-trail"));
    expect(figureRatios(reader).some(x=>x.value===null)).toBe(true);
    expect(figureRatios(walker).some(x=>x.value===null)).toBe(true);
    const audit=compareFigureRatios(reader,SHANSHUI_LEGACY_PUPPET_MESH);
    expect(audit.find(x=>x.id==="head-to-height")?.status).toBe("review-required");
    expect(audit.find(x=>x.id==="shin-length")?.status).toBe("unobservable");
    expect(audit.find(x=>x.id==="shin-length")?.student).toBeNull();
    expect(()=>compareFigureRatios(reader,SHANSHUI_LEGACY_PUPPET_MESH,2))
      .toThrow(RangeError);
  });
  it("validates and flags corrupt, invented or contradictory landmark data",()=>{
    const teacher=SHANSHUI_TEACHER_MESHES["river-scholar"];
    expect(validateFigureReference({...teacher,
      occluded:{...teacher.occluded,chin:"pretend hidden"}}))
      .toContain("chin is simultaneously measured and occluded.");
    expect(validateFigureReference({...teacher,
      landmarks:{...teacher.landmarks,chin:{
        point:{x:2000,y:350},confidence:"clear",tolerancePx:-1,
      }}})).toContain("Invalid landmark chin.");
    expect(()=>normalizeFigurePoint(teacher,{x:NaN,y:12})).toThrow(RangeError);
    expect(compareFigureRatios(teacher,teacher).filter(x=>x.status==="review-required"))
      .toEqual([]);
  });
  for(const scene of SHANSHUI_SCENES){
    it(scene+" uses actual teacher head ratio and genuinely different face artwork",()=>{
      const definition=makeShanshuiScholar(.9,.85,scene);
      const instance=shanshuiScholarInstance(scene,.7);
      expect(validateCharacterDefinition(definition)
        .filter(x=>x.severity==="error")).toEqual([]);
      expect(instance.revision).toEqual(definition.revision);
      // A common head scale distorted the painted jaw and hairline.
      // Width and height are now fitted independently from the FACE region,
      // while the hair, brow, eye and mouth keep their own source Y anchors.
      const teacher=SHANSHUI_TEACHER_MESHES[scene];
      const teacherFace=teacher.regions.face!;
      const factor=291/teacher.figure.height;
      const head=definition.parts.find(p=>p.id==="head");
      expect(head?.rest?.scaleX).toBeCloseTo(teacherFace.width*factor/60,7);
      expect(head?.rest?.scaleY).toBeCloseTo(teacherFace.height*factor/77,7);
      for(const name of ["hair","brows","eyes","pupil-left","pupil-right","mouth"]){
        const rest=definition.parts.find(p=>p.id===name)?.rest;
        expect(rest).toBeDefined();
        expect(rest?.y).toBeTypeOf("number");
      }
      expect(definition.capabilities).toContain("teacher-measured-proportions");
      const face=shanshuiFaceAssets(scene);
      expect(definition.assets.face).toEqual(face.face);
      expect(definition.assets.hair).toEqual(face.hair);
      expect(definition.assets["eyes-open"]).toEqual(face["eyes-open"]);
      expect(definition.assets.brow).toEqual(face.brow);
      expect(definition.assets["mouth-rest"]).toEqual(face["mouth-rest"]);
      const beard=definition.assets.beard;
      expect(beard.kind).toBe("shapes");
      if(beard.kind!=="shapes")throw new Error("Expected vector beard.");
      expect(beard.shapes.length>0).toBe(scene==="misty-hermit");
      const html=renderToStaticMarkup(createElement(InkShanshuiFilm,{
        frame:180,controls:{...DEFAULT_SHANSHUI,scene},clothAmount:.7,
      }));
      expect(html).toContain('data-km-shanshui-scene="'+scene+'"');
      expect(html).toContain('data-km-ink-character-part="head"');
      expect(html).toContain('data-km-ink-character-part="eyes"');
      expect(html).toEqual(renderToStaticMarkup(createElement(InkShanshuiFilm,{
        frame:180,controls:{...DEFAULT_SHANSHUI,scene},clothAmount:.7,
      })));
    });
  }
  it("does not confuse a pupil or a mouth variant with a new character rig",()=>{
    const hermit=makeShanshuiScholar(1,1,"misty-hermit");
    const reader=makeShanshuiScholar(1,1,"river-scholar");
    const walker=makeShanshuiScholar(1,1,"mountain-trail");
    expect(hermit.parts.map(p=>p.id)).toEqual(reader.parts.map(p=>p.id));
    expect(reader.parts.map(p=>p.id)).toEqual(walker.parts.map(p=>p.id));
    expect(hermit.assets.face).not.toEqual(reader.assets.face);
    expect(reader.assets.face).not.toEqual(walker.assets.face);
    expect(reader.assets.hair).not.toEqual(walker.assets.hair);
    expect(reader.parts.find(p=>p.id==="head")?.rest?.scaleY)
      .toBeLessThan(hermit.parts.find(p=>p.id==="head")!.rest!.scaleY!);
  });
});
