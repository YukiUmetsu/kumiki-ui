import {describe,it,expect} from "vitest";
import {renderToStaticMarkup} from "react-dom/server";
import {createElement} from "react";
import {InkAnatomicalPortrait} from "../src/video/ink-anatomical-portrait";
import {InkAnatomicalStandingFigure,inkStandingPoseAt,
  INK_STANDING_FIGURE_WIDTH,INK_STANDING_FIGURE_HEIGHT,
} from "../src/video/ink-anatomical-standing-figure";
import {InkAnatomicalPortraitFilm} from "../src/video/ink-anatomical-portrait-film";

describe("Chinese ink ANAT2 original independent full standing scholar",()=>{
  it("preserves the native ANAT1 upper image in unzoomed 540x620 source coordinates",()=>{
    const source=renderToStaticMarkup(createElement(InkAnatomicalPortrait,
      {character:"scholar",view:"source",headScale:.48,transparentPaper:true}));
    expect(source).toContain('viewBox="0 0 540 620"');
    expect(source).toContain('data-ink-view="source"');
    expect(source).toContain('data-ink-transparent-paper="true"');
    expect(source).not.toContain('data-km-ink-paper="true"');
    expect((source.match(/data-km-ink-native-robe-brush=/g)||[])).toHaveLength(4);
  });
  it("draws truly separate scholar and elder ankle-length cotton robes while retaining 468-point face and registered INK1 upper/lower brush marks",()=>{
    for(const character of ["scholar","elder"] as const){
      const sheet=renderToStaticMarkup(createElement(InkAnatomicalStandingFigure,
        {character,emotion:"sad",detail:1,frame:12,headScale:.48}));
      expect(INK_STANDING_FIGURE_WIDTH).toBe(540);
      expect(INK_STANDING_FIGURE_HEIGHT).toBe(1080);
      expect(sheet).toContain('viewBox="0 0 540 1080"');
      expect(sheet).toContain('data-km-ink-standing-figure="'+character+'"');
      expect(sheet).toContain('data-km-ink-standing-physical="source-540x1080"');
      expect(sheet).toContain('data-km-ink-standing-ground="soles-fixed"');
      expect(sheet).toContain('data-km-ink-garment-structure="overlapping-cotton-ankle-robe"');
      expect(sheet).toContain('data-km-ink-joined-folds="torso-to-ankle"');
      expect(sheet).toContain('data-ink-transparent-paper="true"');
      expect((sheet.match(/data-km-ink-native-robe-brush=/g)||[])).toHaveLength(4);
      expect((sheet.match(/data-km-ink-standing-pressure=/g)||[])).toHaveLength(6);
      expect((sheet.match(/data-km-ink-garment-flow=/g)||[])).toHaveLength(82);
      expect((sheet.match(/data-km-ink-garment-dry-lift=/g)||[])).toHaveLength(46);
      expect((sheet.match(/data-km-ink-joined-robe-line=/g)||[])).toHaveLength(24);
      expect((sheet.match(/data-km-ink-frontal-glaze=/g)||[])).toHaveLength(13);
      expect((sheet.match(/data-km-ink-bamboo-node=/g)||[])).toHaveLength(10);
      expect((sheet.match(/data-km-ink-hand-finger=/g)||[])).toHaveLength(4);
      expect(sheet).toContain('data-km-ink-hand-opposed-thumb="true"');
      expect(sheet).toContain('data-km-ink-foot="0"');
      expect(sheet).toContain('data-km-ink-foot="1"');
      expect(sheet).not.toMatch(/(?:NaN|Infinity|undefined)/);
    }
  });
  it("removes the straight 612px source bust cutoff with shared paper-gradient cotton absorption instead of deleting strokes",()=>{
    const figure=renderToStaticMarkup(createElement(InkAnatomicalStandingFigure,
      {character:"scholar",emotion:"neutral",frame:12,detail:1}));
    const silk=renderToStaticMarkup(createElement(InkAnatomicalPortrait,
      {character:"scholar",emotion:"neutral",view:"source",transparentPaper:true}));
    expect(figure).toContain('data-km-ink-standing-seam="paper-wicked-continuous"');
    expect(figure).toContain('data-km-ink-costume-material="cotton"');
    expect(figure).toContain('upper-robe-contact');
    expect(figure).toContain('upper-robe-release');
    expect(figure).toContain('gradientUnits="userSpaceOnUse"');
    expect(figure).toContain('stop-opacity=".18"');
    expect(silk).toContain('data-km-ink-costume-material="silk"');
    expect((figure.match(/data-km-ink-native-robe-brush=/g)||[])).toHaveLength(4);
    expect((figure.match(/data-km-ink-standing-pressure=/g)||[])).toHaveLength(6);
    expect((figure.match(/data-km-ink-sleeve-loading=/g)||[])).toHaveLength(12);
    expect((figure.match(/data-km-ink-cloth-pressure=/g)||[])).toHaveLength(17);
    expect((figure.match(/data-km-ink-frontal-glaze=/g)||[])).toHaveLength(13);
  });
  it("keeps the same editable 1080px original paths in the full, paper seam, hand and foot microscopes",()=>{
    const views=["full","waist","grip","hem"] as const;
    const images=views.map(camera=>renderToStaticMarkup(createElement(
      InkAnatomicalStandingFigure,{character:"elder",camera,frame:54,detail:1})));
    const boxes=["0 0 540 1080","65 425 420 305",
      "87 535 100 134","158 855 290 196"];
    images.forEach((image,i)=>{
      expect(image).toContain('viewBox="'+boxes[i]+'"');
      expect(image).toContain('data-km-ink-standing-camera="'+views[i]+'"');
      expect((image.match(/data-km-ink-standing-bristle=/g)||[]).length).toBeGreaterThan(40);
      expect((image.match(/data-km-ink-bamboo-node=/g)||[])).toHaveLength(10);
      expect((image.match(/data-km-ink-beard-fibre=/g)||[])).toHaveLength(93);
      expect((image.match(/data-km-ink-hand-finger=/g)||[])).toHaveLength(4);
      expect(image).not.toMatch(/(?:NaN|Infinity|undefined)/);
    });
    expect(()=>renderToStaticMarkup(createElement(
      InkAnatomicalStandingFigure,{camera:"invalid" as "full"}))).toThrow(RangeError);
  });
  it("keeps both sandal anchors exactly stationary through the complete frame cycle and reverse seeks",()=>{
    const sampled=[95,0,72,12,42,95].map(frame=>renderToStaticMarkup(
      createElement(InkAnatomicalStandingFigure,{frame,character:"scholar",detail:.5})));
    const feet=sampled.map(s=>s.split('data-km-ink-fixed-feet="true"')[1]
      ?.split('data-km-ink-garment-structure=')[0]);
    expect(feet.every(Boolean)).toBe(true);
    expect(new Set(feet).size).toBe(1);
    expect(sampled[0]).toBe(sampled[5]);
    expect(inkStandingPoseAt(0).sleeve).toBe(0);
    expect(inkStandingPoseAt(24).sleeve).not.toBe(0);
    expect(inkStandingPoseAt(48,true)).toEqual(inkStandingPoseAt(0,true));
    expect(inkStandingPoseAt(95,true)).toEqual({breathe:0,sleeve:0,staff:0});
  });
  it("renders a true standing native 960x540 actor behind foreground while keeping old bust comparison",()=>{
    const standing=renderToStaticMarkup(createElement(InkAnatomicalPortraitFilm,
      {frame:12,character:"elder",figureMode:"standing"}));
    const bust=renderToStaticMarkup(createElement(InkAnatomicalPortraitFilm,
      {frame:12,character:"elder",figureMode:"bust"}));
    expect(standing).toContain('data-ink-actor-mode="standing"');
    expect(standing).toContain('data-km-ink-standing-figure="elder"');
    expect(standing).toContain('data-km-ink-standing-paper="transparent"');
    expect(standing).toContain('data-km-shanshui-frame="108"');
    expect(standing).toContain('data-ink-cue="1.0000"');
    expect(standing).not.toContain('data-km-ink-standing-paper-ground=');
    expect(bust).toContain('data-ink-actor-mode="bust"');
    expect(bust).not.toContain('data-km-ink-standing-figure=');
    expect((standing.match(/data-km-ink-standing-pressure=/g)||[])).toHaveLength(6);
    expect((bust.match(/data-km-ink-native-robe-brush=/g)||[])).toHaveLength(4);
  });
  it("rejects invalid native frame and pigment detail instead of constructing inconsistent moving feet",()=>{
    for(const frame of [-1,96,1.25,NaN,Infinity])
      expect(()=>inkStandingPoseAt(frame)).toThrow(RangeError);
    for(const detail of [-1,.2,NaN,Infinity])
      expect(()=>renderToStaticMarkup(createElement(InkAnatomicalStandingFigure,
        {detail}))).toThrow(RangeError);
  });
});
