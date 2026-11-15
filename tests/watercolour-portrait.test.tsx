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
      expect(html).toContain('result="granuleTint"');
      expect(html).toContain('operator="arithmetic"');
      expect(html).toContain('data-km-watercolour-edge-pooling="opaque-face-volume"');
      expect(html).not.toContain("NaN");
      expect(html).not.toContain("Infinity");
      expect(html).not.toMatch(/<(?:ellipse|circle)\b/);
      const splash=renderToStaticMarkup(<WatercolourIllustration spec={s} frame={0}/>);
      expect(splash).not.toContain('data-km-watercolour-part="opaque-face-volume"');
      expect(html).not.toEqual(splash);
    });
  }

  it("bounds source-controlled granulation without changing the original film schema",()=>{
    const art=watercolorPortraitSpec("portrait");
    expect(art.paper.granulation).toBeGreaterThan(.5);
    expect(inspectWatercolourArtwork({...art,paper:{...art.paper,granulation:4}}))
      .toContain("/paper/granulation");
    expect(inspectWatercolourArtwork({...art,paper:{...art.paper,granulation:0}}))
      .toEqual([]);
  });

  it("uses opaque underpainting for real human skin rather than multiplying dark hair through it",()=>{
    const art=watercolorPortraitSpec("portrait");
    const find=(id:string,parts:typeof art.parts):typeof art.parts[number]|null=>{
      for(const p of parts){
        if(p.id===id)return p;
        if(p.kind==="group"){
          const child=find(id,p.children);
          if(child)return child;
        }
      }
      return null;
    };
    for(const id of ["opaque-face-volume","neck-volume","near-sclera","far-sclera",
      "opaque-coat","hair-opaque-back"]){
      const part=find(id,art.parts);
      expect(part?.kind).toBe("path");
      if(part?.kind==="path")expect(part.composite).toBe("normal");
    }
    const face=find("opaque-face-volume",art.parts);
    if(face?.kind!=="path")throw new Error("Missing face paint");
    expect(face.opacity).toBeGreaterThan(.98);
    const xml=renderToStaticMarkup(<WatercolourIllustration spec={art} frame={255}/>);
    expect(xml).toContain('data-km-watercolour-composite="normal"');
    const unsafe={...face,composite:"screen"} as unknown as typeof face;
    expect(inspectWatercolourArtwork({...art,parts:[unsafe]}))
      .toContain("/parts/0/composite");
  });

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
      if(output==="portrait"){
        expect(y(60)).toBeLessThan(120); // head fills the editorial close-up
        expect(y(783)).toBeLessThan(960); // coat naturally reaches canvas edge
        expect(k.scale).toBeGreaterThan(1.15);
      }
    }
  });

  it("contains both irises within hand-authored eyelids and renders radial skin washes",()=>{
    for(const output of ["portrait","landscape"] as const){
      const spec=watercolorPortraitSpec(output);
      expect(inspectWatercolourArtwork(spec)).toEqual([]);
      const markup=renderToStaticMarkup(<WatercolourIllustration spec={spec} frame={255}/>);
      expect(markup).toContain('data-km-watercolour-part="near-iris-gaze"');
      expect(markup).toContain('data-km-watercolour-part="near-eye-aperture"');
      expect(markup).toContain('data-km-watercolour-part="far-eye-aperture"');
      expect(markup).toContain('data-km-watercolour-part="far-iris-gaze"');
      expect(markup).toMatch(/<clipPath id="[^"]+-clip-near-eye-aperture"/);
      expect(markup).toMatch(/<clipPath id="[^"]+-clip-far-eye-aperture"/);
      expect(markup).toContain("<radialGradient");
      expect(markup).toContain('data-km-watercolour-part="warm-near-cheek"');
      expect(markup).toContain('data-km-watercolour-edge-softness="1"');
      expect(markup).toContain("-soft-3)");
    }
  });

  it("bounds edge softness, radial lighting modes and secure eye clip paths",()=>{
    const original=watercolorPortraitSpec("portrait");
    const stroke={
      kind:"path" as const,id:"material-proof",
      path:"M10 10 Q20 2 30 10 Z",
      fill:"#E2B5A9",technique:"wash" as const,
      wash:{highlight:"#F9DBCF",shadow:"#AE868A",
        gradient:"radial" as const,edgeSoftness:.8},
    };
    expect(inspectWatercolourArtwork({...original,parts:[stroke]})).toEqual([]);
    expect(inspectWatercolourArtwork({...original,
      parts:[{...stroke,wash:{...stroke.wash,edgeSoftness:1.3}}]}))
      .toContain("/parts/0/wash/edgeSoftness");
    expect(inspectWatercolourArtwork({...original,
      parts:[{...stroke,wash:{...stroke.wash,gradient:"conic"}} as unknown as typeof stroke]}))
      .toContain("/parts/0/wash/gradient");
    const group={
      kind:"group" as const,id:"eye-clip",
      clipPath:"M0 0 L1 0 L1 1 Z",
      children:[stroke],
    };
    expect(inspectWatercolourArtwork({...original,parts:[group]})).toEqual([]);
    expect(inspectWatercolourArtwork({...original,parts:[{
      ...group,clipPath:'M0 0 " onload=alert(1)'}]}))
      .toContain("/parts/0/clipPath");
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
