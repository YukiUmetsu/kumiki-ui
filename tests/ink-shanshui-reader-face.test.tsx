import {describe,expect,it} from "vitest";
import {createElement} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {validateCharacterDefinition} from "../registry/character/validate";
import {SHANSHUI_SCENES,DEFAULT_SHANSHUI} from
  "../registry/video/ink-shanshui";
import {scrollReaderFacePortrait,READER_FACE_LANDMARKS} from
  "../src/video/ink-shanshui-reader-face";
import {shanshuiFaceAssets} from "../src/video/ink-shanshui-face-plates";
import {shanshuiBodyFit,shanshuiBodyAssets} from
  "../src/video/ink-shanshui-full-body";
import {makeShanshuiScholar,shanshuiScholarInstance,InkShanshuiFilm} from
  "../src/video/ink-shanshui-film";
const allVector=(assets:ReturnType<typeof scrollReaderFacePortrait>)=>
  Object.values(assets).every(x=>x.kind==="shapes");
const paths=(assets:ReturnType<typeof scrollReaderFacePortrait>,key:string)=>{
  const a=assets[key];if(a.kind!=="shapes")throw Error("Expected shapes");
  return a.shapes;
};
describe("one-part-at-a-time: scroll reader three-quarter FACE only",()=>{
  it("reconstructs an opaque tapered face with a separately delineated ear and nose",()=>{
    const art=scrollReaderFacePortrait(1);
    expect(allVector(art)).toBe(true);
    const face=paths(art,"face");
    expect(face.length).toBeGreaterThan(18);
    expect(face[0].type).toBe("path");
    // Anatomy, not drawing order: ear contours are separate foreground
    // or background lines and may legitimately gain extra strokes.
    const jaw=face.find(x=>x.type==="path"&&x.d.includes("141.6 140.5"));
    expect(jaw).toBeDefined();
    expect(jaw?.fill).toBe("$skin");
    expect(jaw?.opacity).toBe(1);
    expect(face[0].type==="path"&&face[0].d.includes("117.2 94.9")).toBe(true);
    // The ink-pressure sampler expands the nose bridge into a closed
    // contour, while this fine nostril accent remains a direct path.
    expect(face.some(x=>x.type==="path"&&x.d.includes("M149.4 116.7")))
      .toBe(true);
    const labels=READER_FACE_LANDMARKS.map(v=>v.name);
    expect(labels).toContain("exposed-ear");
    expect(labels).toContain("earlobe");
    expect(labels).toContain("nose-tip");
    expect(labels).toContain("chin");
    expect(new Set(labels).size).toEqual(labels.length);
    for(const pt of READER_FACE_LANDMARKS){
      expect(pt.x).toBeGreaterThan(0);
      expect(pt.x).toBeLessThan(260);
      expect(pt.y).toBeGreaterThan(0);
      expect(pt.y).toBeLessThan(340);
    }
    expect(READER_FACE_LANDMARKS.find(x=>x.name==="chin")!.y)
      .toBeGreaterThan(READER_FACE_LANDMARKS.find(x=>x.name==="nose-tip")!.y);
  });
  it("preserves an asymmetric, foreshortened near/far eye and five speaking visemes",()=>{
    const plate=scrollReaderFacePortrait(.8);
    const eyelids=["eyes-open","eyes-soft","eyes-closed"] as const;
    expect(new Set(eyelids.map(x=>JSON.stringify(paths(plate,x)))).size).toBe(3);
    const near=READER_FACE_LANDMARKS.filter(x=>x.name.startsWith("near-eye"));
    const far=READER_FACE_LANDMARKS.filter(x=>x.name.startsWith("far-eye"));
    expect(Math.abs(near[1].x-near[0].x))
      .toBeGreaterThan(Math.abs(far[1].x-far[0].x));
    const visemes=["mouth-rest","mouth-aa","mouth-oh","mouth-mm","mouth-smile"];
    expect(new Set(visemes.map(k=>JSON.stringify(paths(plate,k)))).size).toBe(5);
    expect(paths(plate,"beard")).toEqual([]);
    expect(paths(plate,"pupil-left").length).toBeGreaterThan(0);
    expect(paths(plate,"pupil-right").length).toBeGreaterThan(0);
  });
  it("adds selective anatomy and hair folds at higher detail without scaling the head",()=>{
    const low=scrollReaderFacePortrait(.1);
    const high=scrollReaderFacePortrait(1);
    for(const id of ["face","hair","brow","eyes-open","mouth-rest"]){
      expect(paths(high,id).length).toBeGreaterThan(paths(low,id).length);
    }
    expect(high).toEqual(scrollReaderFacePortrait(1));
    expect(()=>scrollReaderFacePortrait(-.1)).toThrow(RangeError);
    expect(()=>scrollReaderFacePortrait(1.2)).toThrow(RangeError);
    expect(()=>scrollReaderFacePortrait(NaN)).toThrow(RangeError);
    expect(shanshuiFaceAssets("river-scholar",1)).toEqual(high);
    const head=shanshuiBodyFit("river-scholar").headRest;
    expect(makeShanshuiScholar(1,.88,"river-scholar").parts
      .find(x=>x.id==="head")?.rest).toEqual(head);
  });
  it("changes ONLY the reader's facial image assets; full garment, hand and rig remain identical",()=>{
    for(const scene of SHANSHUI_SCENES){
      const model=makeShanshuiScholar(1,.89,scene);
      const instance=shanshuiScholarInstance(scene);
      expect(validateCharacterDefinition(model)
        .filter(d=>d.severity==="error")).toEqual([]);
      expect(model.revision).toEqual(instance.revision);
      for(const [key,bodyAsset] of Object.entries(shanshuiBodyAssets(scene)))
        expect(model.assets[key]).toEqual(bodyAsset);
      expect(model.parts.some(x=>x.id==="near-hand")).toBe(true);
      expect(model.parts.some(x=>x.id==="far-sleeve")).toBe(true);
    }
    // The hermit and walker remain on the preceding, separate face designs.
    const hermit=shanshuiFaceAssets("misty-hermit");
    const walker=shanshuiFaceAssets("mountain-trail");
    expect(paths(hermit,"face")[0]).toMatchObject({
      type:"path",d:expect.stringContaining("M113 75 Q123 64"),
    });
    expect(paths(walker,"face")[0]).toMatchObject({
      type:"path",d:expect.stringContaining("M112 77 Q123 65"),
    });
    expect(paths(hermit,"beard").length).toBeGreaterThan(0);
    expect(paths(walker,"beard")).toEqual([]);
    const reader=makeShanshuiScholar(1,.89,"river-scholar");
    expect(reader.assets.face).toEqual(scrollReaderFacePortrait(1).face);
    expect(reader.assets["eyes-open"]).toEqual(scrollReaderFacePortrait(1)["eyes-open"]);
    expect(reader.assets.hair).toEqual(scrollReaderFacePortrait(1).hair);
    expect(reader.assets["mouth-smile"]).toEqual(scrollReaderFacePortrait(1)["mouth-smile"]);
    for(const frame of [50,125,210]){
      const props={frame,controls:{...DEFAULT_SHANSHUI,scene:"river-scholar" as const,detail:1}};
      const markup=renderToStaticMarkup(createElement(InkShanshuiFilm,props));
      expect(markup).toContain('data-km-shanshui-scene="river-scholar"');
      expect(markup).toContain('data-km-ink-character-part="head"');
      expect(markup).toEqual(renderToStaticMarkup(createElement(InkShanshuiFilm,props)));
    }
  });
});
