import {createElement} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {describe,it,expect} from "vitest";
import {validateCharacterDefinition} from "../registry/character/validate";
import {samplePoseCorrection} from "../registry/character/authoring";
import {
  SHANSHUI_SCENES,DEFAULT_SHANSHUI,SHANSHUI_FRAMES,
  assertShanshuiControls,shanshuiAt,shanshuiRoute,shanshuiHash,
} from "../registry/video/ink-shanshui";
import {InkShanshuiStage} from "../registry/video/ink-shanshui-react";
import {InkShanshuiFilm,makeShanshuiScholar,shanshuiScholarInstance} from "../src/video/ink-shanshui-film";

describe("reusable original Chinese ink shanshui art engine",()=>{
  it("enforces bounded art controls, safe seed, recognized scene and absolute frame",()=>{
    expect(()=>assertShanshuiControls(DEFAULT_SHANSHUI)).not.toThrow();
    expect(()=>assertShanshuiControls({...DEFAULT_SHANSHUI,detail:NaN})).toThrow(RangeError);
    expect(()=>assertShanshuiControls({...DEFAULT_SHANSHUI,seed:-1})).toThrow(RangeError);
    expect(()=>assertShanshuiControls({...DEFAULT_SHANSHUI,wind:2})).toThrow(RangeError);
    expect(()=>assertShanshuiControls({...DEFAULT_SHANSHUI,scene:"unknown" as never})).toThrow(RangeError);
    expect(()=>shanshuiAt(DEFAULT_SHANSHUI,-1)).toThrow(RangeError);
    expect(()=>shanshuiAt(DEFAULT_SHANSHUI,SHANSHUI_FRAMES)).toThrow(RangeError);
    expect(shanshuiHash(71,91)).toEqual(shanshuiHash(71,91));
    expect(shanshuiHash(71,91)).not.toEqual(shanshuiHash(72,91));
    expect(shanshuiHash(71,91)).toBeGreaterThanOrEqual(0);
    expect(shanshuiHash(71,91)).toBeLessThanOrEqual(1);
  });
  for(const scene of SHANSHUI_SCENES){
    it(scene+" has distinct walk blocking, stable absolute-frame environment and ink objects",()=>{
      const controls={...DEFAULT_SHANSHUI,scene};
      const route=shanshuiRoute(scene);
      expect(route.instanceId).toBe("shanshui-scholar");
      expect(route.waypoints).toHaveLength(4);
      expect(route.waypoints[3].frame).toBe(SHANSHUI_FRAMES-1);
      const a=shanshuiAt(controls,80),b=shanshuiAt(controls,180);
      expect(shanshuiAt(controls,80)).toEqual(a);
      expect(a.cameraZoom).not.toEqual(b.cameraZoom);
      expect(a.birdX).not.toEqual(b.birdX);
      expect(a.scholarX).not.toEqual(b.scholarX);
      expect(shanshuiAt(controls,80,true).frame).toBe(SHANSHUI_FRAMES-1);
      expect(shanshuiAt(controls,80,true).breeze).toBe(0);
      const pngIndependent=renderToStaticMarkup(createElement(InkShanshuiStage,{
        frame:125,controls,
      }));
      expect(pngIndependent).toContain('data-km-shanshui-scene="'+scene+'"');
      expect(pngIndependent).toContain('data-km-shanshui-frame="125"');
      expect(pngIndependent).toContain('data-km-shanshui-mountains=""');
      expect(pngIndependent).toContain('data-km-shanshui-birds=""');
      expect(pngIndependent).toContain('data-km-shanshui-rock=""');
      expect(pngIndependent).toEqual(renderToStaticMarkup(createElement(InkShanshuiStage,{
        frame:125,controls,
      })));
      if(scene==="river-scholar"){
        expect(pngIndependent).toContain('data-km-shanshui-water=""');
        expect(pngIndependent).toContain('data-km-shanshui-willow=""');
        expect(pngIndependent).toContain('data-km-shanshui-bridge=""');
      }else {
        expect(pngIndependent).toContain('data-km-shanshui-pine=""');
        expect(pngIndependent).toContain('data-km-shanshui-bamboo=""');
      }
      const sparse=renderToStaticMarkup(createElement(InkShanshuiStage,{
        frame:125,controls:{...controls,detail:0},
      }));
      expect(pngIndependent.length).toBeGreaterThan(sparse.length+1500);
    });
  }
  it("preserves articulated knee, hair, face and garment ancestry with warm original costume art",()=>{
    const scholar=makeShanshuiScholar();
    const issues=validateCharacterDefinition(scholar);
    expect(issues.filter(d=>d.severity==="error")).toEqual([]);
    for(const part of ["near-thigh","near-shin","far-thigh","far-shin","eyes","mouth",
      "hem-flow","robe-outer","sash-tail","hair-band","sleeve-paint"]){
      expect(scholar.parts.some(p=>p.id===part)).toBe(true);
    }
    expect(scholar.palette.wash).toBe("#c6ad8c");
    expect(scholar.assets["scholar-flowing-hem"]).toMatchObject({kind:"shapes"});
    expect(makeShanshuiScholar()).toEqual(scholar);
    expect(scholar.parts.find(p=>p.id==="hair-band")).toMatchObject({parent:"head"});
    expect(scholar.parts.find(p=>p.id==="hem-flow")).toMatchObject({parent:"body"});
  });
  it("samples gait, cloth and trailing fabric from shared canonical constraints",()=>{
    const moving=shanshuiScholarInstance("mountain-trail",.85);
    const still=shanshuiScholarInstance("mountain-trail",0);
    expect(moving.instanceId).toBe("shanshui-scholar");
    const corrections=moving.corrections??{};
    for(const part of ["near-thigh","near-shin","far-thigh","far-shin",
      "hem-drape","near-cuff","far-cuff","hem-flow","sash-tail"]){
      expect(corrections[part]?.length).toBeGreaterThan(20);
    }
    const a=samplePoseCorrection(corrections,"near-thigh",65);
    const b=samplePoseCorrection(corrections,"near-thigh",85);
    expect(a).not.toEqual(b);
    expect(samplePoseCorrection(still.corrections??{},"hem-flow",75).rotation).toBe(0);
    expect(()=>shanshuiScholarInstance("mountain-trail",1.5)).toThrow(RangeError);
  });
  it("renders a real posed scholar between background and foreground with no artwork texture imports",()=>{
    const controls={...DEFAULT_SHANSHUI,scene:"mountain-trail" as const};
    const rich=renderToStaticMarkup(createElement(InkShanshuiFilm,{frame:178,controls}));
    expect(rich).toContain('data-km-shanshui-scene="mountain-trail"');
    expect(rich).toContain('data-km-ink-character-frame="178"');
    expect(rich).toContain('data-km-ink-character-part="body"');
    expect(rich).toContain('data-km-shanshui-foreground=""');
    expect(rich).toContain("foreignObject");
    expect(rich).not.toContain("<image ");
    expect(rich).not.toContain("data:image/");
    const empty=renderToStaticMarkup(createElement(InkShanshuiFilm,{
      frame:178,controls,showScholar:false,
    }));
    expect(empty).not.toContain("data-km-ink-character-frame");
    expect(empty.length).toBeLessThan(rich.length);
  });
});
