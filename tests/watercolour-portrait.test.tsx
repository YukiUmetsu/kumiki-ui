import {describe,it,expect} from "vitest";
import {renderToStaticMarkup} from "react-dom/server";
import {WatercolourIllustration,inspectWatercolourArtwork,watercolourArtPoseAt}
  from "../registry/video/watercolour-illustration";
import {inspectWetPaper} from "../registry/video/watercolour-wet-paper";
import {watercolorPortraitSpec,PORTRAIT_LANDMARKS}
  from "../src/video/watercolour-portrait-demo";
import {WATERCOLOUR_PORTRAIT_FILM} from "../src/video/watercolour-portrait-film";
import {compileFilm} from "../registry/video/film-document";
import {loadFilmSlots} from "../src/film/film-slots";
import fixture from "../examples/film/watercolour-portrait.film.json";

describe("WC11 original watercolour human portrait",()=>{
  for(const output of ["landscape","portrait"] as const){
    it("constructs coherent facial parts, opaque skin and optical watercolor in "+output,()=>{
      const s=watercolorPortraitSpec(output);
      expect(s.width).toBe(output==="portrait"?540:960);
      expect(s.height).toBe(output==="portrait"?960:540);
      expect(inspectWatercolourArtwork(s)).toEqual([]);
      expect(inspectWetPaper(s.wetPaper!)).toEqual([]);
      const html=renderToStaticMarkup(<WatercolourIllustration spec={s} frame={255}/>);
      for(const id of [
        "original-person-portrait","opaque-face-volume","subtle-head-pose",
        "near-eye-orbit","far-eye-orbit","near-upper-lid","far-lower-lid",
        "near-iris","far-pupil","nose-bridge-light","nose-tip",
        "upper-lip","lower-lip","neck-volume","hair-opaque-back",
        "left-lapel","right-lapel","rooted-shoulders-and-clothing",
      ]) expect(html).toContain('data-km-watercolour-part="'+id+'"');
      expect(html).toContain('data-km-watercolour-optical-glaze="opaque-face-volume"');
      expect(html).toContain('data-km-watercolour-edge-pooling="opaque-face-volume"');
      expect(html).not.toContain("NaN");
      expect(html).not.toContain("Infinity");
      expect(html).not.toMatch(/<(?:ellipse|circle)\b/);
      const splash=renderToStaticMarkup(<WatercolourIllustration spec={s} frame={0}/>);
      expect(splash).not.toContain('data-km-watercolour-part="opaque-face-volume"');
      expect(html).not.toEqual(splash);
    });
  }

  it("keeps original portrait within both native aspect ratios and eyes on the face",()=>{
    const near=PORTRAIT_LANDMARKS.nearEye,far=PORTRAIT_LANDMARKS.farEye;
    const mouth=PORTRAIT_LANDMARKS.mouth;
    expect(near.x).toBeLessThan(far.x);
    expect(near.y).toBeLessThan(mouth.y);
    expect(far.y).toBeLessThan(mouth.y);
    for(const output of ["portrait","landscape"] as const){
      const spec=watercolorPortraitSpec(output);
      const root=spec.parts[0];
      if(root.kind!=="group")throw new Error("Missing viewport root");
      const presentation=root.children.find(x=>x.id==="portrait-framing");
      if(!presentation||presentation.kind!=="group")throw new Error("Missing portrait transform");
      const k=presentation.keys?.[0];
      if(!k)throw new Error("Missing portrait placement");
      const x=(value:number)=>k.x+k.scale*value;
      const y=(value:number)=>k.y+k.scale*value;
      expect(x(175)).toBeGreaterThan(10);
      expect(x(418)).toBeLessThan(spec.width-10);
      expect(y(60)).toBeGreaterThan(0);
      expect(y(432)).toBeLessThan(spec.height-50);
      if(output==="portrait")expect(y(783)).toBeLessThan(920);
    }
  });

  it("blinks, changes gaze and subtly turns the head with deterministic frame keys",()=>{
    const spec=watercolorPortraitSpec("portrait");
    const at=(frame:number)=>renderToStaticMarkup(
      <WatercolourIllustration spec={spec} frame={frame}/>);
    const open=at(169),closed=at(185),returned=at(203);
    expect(open).toContain('data-km-watercolour-part="near-open-eyelids"');
    expect(closed).not.toContain('data-km-watercolour-part="near-open-eyelids"');
    expect(closed).toContain('data-km-watercolour-part="near-closed-lids"');
    expect(returned).toContain('data-km-watercolour-part="near-open-eyelids"');
    expect(returned).not.toContain('data-km-watercolour-part="near-closed-lids"');
    expect(at(255)).toEqual(at(255));
    expect(at(255)).not.toEqual(at(300));
    const root=spec.parts[0];
    if(root.kind!=="group")return;
    expect(watercolourArtPoseAt(root,255)).toEqual(watercolourArtPoseAt(root,255));
  });

  it("exports a 12-second portable dual-ratio portrait via the production slot",async()=>{
    expect(fixture).toEqual(WATERCOLOUR_PORTRAIT_FILM);
    for(const outputId of ["portrait","landscape"] as const){
      const compiled=compileFilm(fixture,{outputId});
      expect(compiled.ok).toBe(true);
      if(!compiled.ok)continue;
      expect(compiled.film.durationFrames).toBe(360);
      const render=await loadFilmSlots(compiled.film);
      const ctx={frame:255,fps:{num:30,den:1},durationFrames:360,
        width:compiled.film.width,height:compiled.film.height,reducedMotion:false};
      const xml=renderToStaticMarkup(<>{render(
        {slot:"watercolour-illustration",label:"Portrait",props:{subject:"person-portrait",seed:83}},ctx)}</>);
      expect(xml).toContain('data-km-watercolour-part="opaque-face-volume"');
      expect(xml).not.toContain('data-km-watercolour-part="great-blue-heron"');
      expect(()=>render({slot:"watercolour-illustration",label:"invalid",
        props:{subject:"file://unsafe",seed:83}},ctx)).toThrow(RangeError);
      const old=renderToStaticMarkup(<>{render(
        {slot:"watercolour-illustration",label:"Original",props:{seed:83}},ctx)}</>);
      expect(old).toContain('data-km-watercolour-part="great-blue-heron"');
    }
  });
});
