import {describe,it,expect} from "vitest";
import {renderToStaticMarkup} from "react-dom/server";
import {createElement} from "react";
import {InkZengJingScholarHead,inkZengJingExpressionFeatures} from "../src/video/ink-zengjing-scholar-head";
import {InkAnatomicalStandingFigure,inkStandingPoseAt,
  INK_STANDING_FIGURE_WIDTH,INK_STANDING_FIGURE_HEIGHT,
} from "../src/video/ink-anatomical-standing-figure";
import {InkAnatomicalPortraitFilm} from "../src/video/ink-anatomical-portrait-film";

describe("Chinese ink ZJ1 reference-redrawn standing scholar",()=>{
  it("builds a new Zeng Jing mogu head from its own anatomy, not the earlier ANAT1 mesh",()=>{
    const head=renderToStaticMarkup(createElement(InkZengJingScholarHead,
      {character:"scholar",emotion:"neutral",detail:1,headScale:.48}));
    expect(head).toContain('data-km-ink-zengjing-head="scholar"');
    expect(head).toContain('data-km-ink-zengjing-method="mogu-aotufa"');
    expect(head).toContain('data-km-ink-face-source="independent-zj1-not-anat1"');
    expect((head.match(/data-km-zj1-face-plane=/g)||[]).length).toBeGreaterThanOrEqual(8);
    expect((head.match(/data-km-zj1-eye=/g)||[])).toHaveLength(2);
    expect((head.match(/data-km-zj1-brow=/g)||[])).toHaveLength(2);
    expect((head.match(/data-km-zj1-ear=/g)||[])).toHaveLength(2);
    expect(head).toContain('data-km-zj1-nasal-anatomy="bridge-tip-alar"');
    expect(head).toContain('data-km-zj1-mouth="anatomical"');
    expect(head).toContain('data-km-zj1-headwear="ming-soft-black-gauze"');
    expect(head).not.toContain('data-ink-view=');
    expect(head).not.toContain('data-km-ink-face-mesh=');
  });
  it("exposes the new ZJ1 elder beard as independently inspectable rooted fibers",()=>{
    const elder=renderToStaticMarkup(createElement(InkZengJingScholarHead,
      {character:"elder",emotion:"neutral",detail:1,headScale:.48}));
    const scholar=renderToStaticMarkup(createElement(InkZengJingScholarHead,
      {character:"scholar",emotion:"neutral",detail:1,headScale:.48}));
    expect(elder).toContain('data-km-zj1-facial-hair="elder"');
    expect((elder.match(/data-km-zj1-beard-fibre=/g)||[])).toHaveLength(31);
    expect(scholar).not.toContain("data-km-zj1-beard-fibre=");
  });
  it("maps the shared ANAT1 human-face measurements and EXPR1 FACS action units into the ZJ1 painting language",()=>{
    const neutral=inkZengJingExpressionFeatures("scholar","neutral");
    const smile=inkZengJingExpressionFeatures("scholar","smile");
    const sad=inkZengJingExpressionFeatures("scholar","sad");
    const angry=inkZengJingExpressionFeatures("scholar","angry");
    const surprise=inkZengJingExpressionFeatures("scholar","surprise");
    expect(smile.cheekRaise).toBeGreaterThan(neutral.cheekRaise);
    expect(smile.mouthCorner).toBeGreaterThan(neutral.mouthCorner);
    expect(sad.mouthCorner).toBeLessThan(neutral.mouthCorner);
    expect(angry.eyeOpen).toBeLessThan(neutral.eyeOpen);
    expect(surprise.eyeOpen).toBeGreaterThan(neutral.eyeOpen);
    expect(surprise.mouthOpen).toBeGreaterThan(0);
    expect(()=>inkZengJingExpressionFeatures("scholar","neutral",1.1)).toThrow(RangeError);
  });
  it("changes eye, brow and mouth geometry across five independently authored expressions",()=>{
    const draw=(emotion:"neutral"|"smile"|"sad"|"angry"|"surprise")=>
      renderToStaticMarkup(createElement(InkZengJingScholarHead,
        {character:"scholar",emotion,intensity:1,detail:1}));
    const neutral=draw("neutral"),smile=draw("smile"),sad=draw("sad"),
      angry=draw("angry"),surprise=draw("surprise");
    const brow=(s:string)=>s.match(/<path d="M244 [^"]+" stroke="#[^"]+" stroke-width="[^"]+"/)?.[0];
    expect(brow(sad)).not.toEqual(brow(neutral));
    expect(brow(angry)).not.toEqual(brow(neutral));
    expect(smile).not.toEqual(neutral);
    expect(surprise).toContain('data-km-zj1-mouth="anatomical"');
    expect(new Set([neutral,smile,sad,angry,surprise]).size).toBe(5);
  });
  it("draws two complete original standing identities with connected white cotton and source-native INK1 detail",()=>{
    for(const character of ["scholar","elder"] as const){
      const sheet=renderToStaticMarkup(createElement(InkAnatomicalStandingFigure,
        {character,emotion:"sad",detail:1,frame:12,headScale:.48}));
      expect(INK_STANDING_FIGURE_WIDTH).toBe(540);
      expect(INK_STANDING_FIGURE_HEIGHT).toBe(1080);
      expect(sheet).toContain('viewBox="0 0 540 1080"');
      expect(sheet).toContain('data-km-ink-standing-figure="'+character+'"');
      expect(sheet).toContain('data-km-ink-standing-head="independent-zj1-mogu"');
      expect(sheet).toContain('data-km-ink-standing-scroll-proportion="zengjing-portrait-2.16"');
      expect(sheet).toContain('data-km-ink-zengjing-head="'+character+'"');
      expect(sheet).toContain('data-km-ink-standing-physical="source-540x1080"');
      expect(sheet).toContain('data-km-ink-standing-ground="soles-fixed"');
      expect(sheet).toContain('data-km-ink-garment-structure="overlapping-cotton-ankle-robe"');
      expect(sheet).toContain('data-km-ink-joined-folds="torso-to-ankle"');
      expect(sheet).not.toContain('data-ink-view=');
      expect(sheet).not.toContain('data-km-ink-standing-seam=');
      expect(sheet).not.toContain('upper-robe-contact');
      expect((sheet.match(/data-km-ink-standing-pressure=/g)||[])).toHaveLength(6);
      expect((sheet.match(/data-km-ink-garment-flow=/g)||[])).toHaveLength(82);
      expect((sheet.match(/data-km-ink-garment-dry-lift=/g)||[])).toHaveLength(46);
      expect((sheet.match(/data-km-ink-joined-robe-line=/g)||[])).toHaveLength(24);
      expect((sheet.match(/data-km-ink-bamboo-node=/g)||[])).toHaveLength(10);
      expect((sheet.match(/data-km-ink-hand-finger=/g)||[])).toHaveLength(4);
      expect(sheet).toContain('data-km-ink-grip-kinematics="opposed-thumb-on-source-bamboo"');
      expect(sheet).toContain('data-km-ink-hand-palm="metacarpal-volume"');
      expect((sheet.match(/data-km-ink-hand-phalange=/g)||[])).toHaveLength(4);
      expect((sheet.match(/data-km-ink-grip-nail=/g)||[])).toHaveLength(4);
      expect((sheet.match(/data-km-ink-hand-skin-fibre=/g)||[])).toHaveLength(14);
      expect((sheet.match(/data-km-ink-foot=/g)||[])).toHaveLength(2);
      expect(sheet.indexOf('data-km-ink-garment-structure='))
        .toBeLessThan(sheet.indexOf('data-km-ink-fixed-feet='));
      expect(sheet.indexOf('data-km-ink-bamboo-staff="continuous"'))
        .toBeLessThan(sheet.indexOf('data-km-ink-grip-kinematics='));
      expect(sheet).not.toMatch(/(?:NaN|Infinity|undefined)/);
    }
  });
  it("keeps the same editable original geometry in 1x, face, robe, grip and foot microscopes",()=>{
    const views=["full","face","waist","grip","hem"] as const;
    const images=views.map(camera=>renderToStaticMarkup(createElement(
      InkAnatomicalStandingFigure,{character:"elder",camera,frame:54,detail:1})));
    const boxes=["0 0 540 1080","215 340 110 175","65 485 420 220",
      "87 585 100 80","158 840 290 100"];
    images.forEach((image,i)=>{
      expect(image).toContain('viewBox="'+boxes[i]+'"');
      expect(image).toContain('data-km-ink-standing-camera="'+views[i]+'"');
      expect((image.match(/data-km-ink-standing-bristle=/g)||[]).length).toBeGreaterThan(40);
      expect((image.match(/data-km-ink-bamboo-node=/g)||[])).toHaveLength(10);
      expect((image.match(/data-km-zj1-facial-hair=/g)||[])).toHaveLength(1);
      expect((image.match(/data-km-ink-hand-finger=/g)||[])).toHaveLength(4);
      expect(image).not.toMatch(/(?:NaN|Infinity|undefined)/);
    });
    expect(()=>renderToStaticMarkup(createElement(
      InkAnatomicalStandingFigure,{camera:"invalid" as "full"}))).toThrow(RangeError);
  });
  it("keeps both visible sandal anchors exactly stationary through the complete frame cycle and reverse seeks",()=>{
    const sampled=[95,0,72,12,42,95].map(frame=>renderToStaticMarkup(
      createElement(InkAnatomicalStandingFigure,{frame,character:"scholar",detail:.5})));
    const feet=sampled.map(s=>s.split('data-km-ink-fixed-feet="true"')[1]
      ?.split('data-km-ink-joined-folds=')[0]);
    expect(feet.every(Boolean)).toBe(true);
    expect(new Set(feet).size).toBe(1);
    expect(sampled[0]).toBe(sampled[5]);
    expect(inkStandingPoseAt(0).sleeve).toBe(0);
    expect(inkStandingPoseAt(24).sleeve).not.toBe(0);
    expect(inkStandingPoseAt(48,true)).toEqual(inkStandingPoseAt(0,true));
    expect(inkStandingPoseAt(95,true)).toEqual({breathe:0,sleeve:0,staff:0});
  });
  it("renders the original full standing scholar in the optional native 960x540 film while keeping bust comparison",()=>{
    const standing=renderToStaticMarkup(createElement(InkAnatomicalPortraitFilm,
      {frame:12,character:"elder",figureMode:"standing"}));
    const bust=renderToStaticMarkup(createElement(InkAnatomicalPortraitFilm,
      {frame:12,character:"elder",figureMode:"bust"}));
    expect(standing).toContain('data-ink-actor-mode="standing"');
    expect(standing).toContain('data-km-ink-standing-figure="elder"');
    expect(standing).toContain('data-km-ink-zengjing-head="elder"');
    expect(standing).toContain('data-km-shanshui-frame="108"');
    expect(standing).toContain('data-ink-cue="1.0000"');
    expect(bust).toContain('data-ink-actor-mode="bust"');
    expect(bust).not.toContain('data-km-ink-standing-figure=');
    expect((standing.match(/data-km-ink-standing-pressure=/g)||[])).toHaveLength(6);
    expect((bust.match(/data-km-ink-native-robe-brush=/g)||[])).toHaveLength(4);
  });
  it("rejects invalid native frame and pigment detail",()=>{
    for(const frame of [-1,96,1.25,NaN,Infinity])
      expect(()=>inkStandingPoseAt(frame)).toThrow(RangeError);
    for(const detail of [-1,.2,NaN,Infinity])
      expect(()=>renderToStaticMarkup(createElement(InkAnatomicalStandingFigure,
        {detail}))).toThrow(RangeError);
    for(const intensity of [-.1,1.1,NaN,Infinity])
      expect(()=>renderToStaticMarkup(createElement(InkAnatomicalStandingFigure,
        {intensity}))).toThrow(RangeError);
    for(const headScale of [.2,.9,NaN,Infinity])
      expect(()=>renderToStaticMarkup(createElement(InkAnatomicalStandingFigure,
        {headScale}))).toThrow(RangeError);
  });
});
