import {describe,it,expect} from "vitest";
import {renderToStaticMarkup} from "react-dom/server";
import {WatercolourIllustration,inspectWatercolourArtwork,watercolourArtPoseAt}
  from "../registry/video/watercolour-illustration";
import type {WatercolourArtPart} from "../registry/video/watercolour-illustration";
import {inspectWetPaper} from "../registry/video/watercolour-wet-paper";
import {watercolorPortraitSpec,PORTRAIT_LANDMARKS,PORTRAIT_SUBJECTS}
  from "../src/video/watercolour-portrait-demo";
import {WATERCOLOUR_PORTRAIT_FILM} from "../src/video/watercolour-portrait-film";
import {compileFilm} from "../registry/video/film-document";
import {loadFilmSlots} from "../src/film/film-slots";
import fixture from "../examples/film/watercolour-portrait.film.json";

const allParts=(part:WatercolourArtPart):WatercolourArtPart[]=>
  part.kind==="group" ? [part,...part.children.flatMap(allParts)] : [part];
const render=(subject:typeof PORTRAIT_SUBJECTS[number],frame=256)=>
  renderToStaticMarkup(<WatercolourIllustration
    spec={watercolorPortraitSpec("portrait",83,subject)} frame={frame}/>);

describe("WC13 reference-led watercolor character reconstruction",()=>{
  for(const subject of PORTRAIT_SUBJECTS){
    for(const output of ["landscape","portrait"] as const){
      it("builds anatomically layered original "+subject+" in "+output,()=>{
        const art=watercolorPortraitSpec(output,83,subject);
        expect(art.width).toBe(output==="portrait"?540:960);
        expect(art.height).toBe(output==="portrait"?960:540);
        expect(inspectWatercolourArtwork(art)).toEqual([]);
        expect(inspectWetPaper(art.wetPaper!)).toEqual([]);
        const all=art.parts.flatMap(allParts);
        const ids=all.map(x=>x.id);
        expect(new Set(ids).size).toBe(ids.length);
        for(const essential of [
          "rebuilt-human-"+subject,"face-foundation","living-facial-anatomy",
          "neck-with-collarbone-planes","opaque-neck","clothing-opaque-base",
          "near-eye","far-eye","near-iris","far-iris","near-upper-lid",
          "nose-dorsum-reserve","upper-lip-broken-wash",
          "lower-lip-transparent","directional-hair-overpainting",
          "hair-foundation","hair-broken-directional-bristles",
        ])expect(ids).toContain(essential);
        const html=renderToStaticMarkup(<WatercolourIllustration spec={art} frame={256}/>);
        expect(html).not.toContain("NaN");
        expect(html).not.toContain("Infinity");
        expect(html).toContain('data-km-watercolour-composite="normal"');
        expect(html).toContain('data-km-watercolour-optical-glaze="face-foundation"');
        expect(html).toContain('data-km-watercolour-edge-pooling="face-foundation"');
        expect(html).toContain('result="granuleTint"');
        expect(html).toContain('operator="arithmetic"');
        expect(html).not.toMatch(/<(?:ellipse|circle)\b/);
        const early=renderToStaticMarkup(<WatercolourIllustration spec={art} frame={0}/>);
        expect(early).not.toContain('data-km-watercolour-part="face-foundation"');
        expect(html).not.toEqual(early);
      });
    }
  }
  it("replaces the earlier sitter silhouettes with visually distinct anatomy",()=>{
    const first=watercolorPortraitSpec("portrait",83,"sitter-a");
    const second=watercolorPortraitSpec("portrait",83,"sitter-b");
    const a=first.parts.flatMap(allParts),b=second.parts.flatMap(allParts);
    expect(a.some(x=>x.id==="left-fringe-root")).toBe(false);
    expect(b.some(x=>x.id==="mature-cheek-crease")).toBe(true);
    expect(a.some(x=>x.id==="mature-cheek-crease")).toBe(false);
    expect(b.some(x=>x.id==="salt-pepper-beard-with-volume")).toBe(true);
    expect(a.some(x=>x.id==="salt-pepper-beard-with-volume")).toBe(false);
    const firstHair=a.find(x=>x.id==="hair-foundation");
    const secondHair=b.find(x=>x.id==="hair-foundation");
    expect(firstHair?.kind).toBe("path");
    expect(secondHair?.kind).toBe("path");
    if(firstHair?.kind==="path"&&secondHair?.kind==="path")
      expect(firstHair.path).not.toBe(secondHair.path);
  });
  it("preserves opaque skin, neck, clothing and hair without transparent ghosting",()=>{
    for(const subject of PORTRAIT_SUBJECTS){
      const art=watercolorPortraitSpec("portrait",83,subject);
      const all=art.parts.flatMap(allParts);
      for(const id of ["face-foundation","opaque-neck","clothing-opaque-base",
        "hair-foundation","near-sclera","far-sclera"]){
        const part=all.find(p=>p.id===id);
        expect(part?.kind).toBe("path");
        if(part?.kind==="path"){
          expect(part.composite).toBe("normal");
          expect(part.opacity).toBeGreaterThan(.97);
        }
      }
      expect(inspectWatercolourArtwork({...art,paper:{...art.paper,granulation:4}}))
        .toContain("/paper/granulation");
    }
  });
  it("maintains source-space anatomy and ratio-specific camera coverage",()=>{
    expect(PORTRAIT_LANDMARKS.nearEye.x).toBeLessThan(PORTRAIT_LANDMARKS.farEye.x);
    expect(PORTRAIT_LANDMARKS.nearEye.y).toBeLessThan(PORTRAIT_LANDMARKS.mouth.y);
    expect(PORTRAIT_LANDMARKS.chin.y).toBeGreaterThan(PORTRAIT_LANDMARKS.mouth.y);
    for(const output of ["portrait","landscape"] as const){
      const art=watercolorPortraitSpec(output);
      const root=art.parts[0];
      if(root.kind!=="group")throw new Error("Missing art direction");
      const framing=root.children.find(x=>x.id==="portrait-framing");
      if(framing?.kind!=="group")throw new Error("Missing framing");
      const k=framing.keys?.[0];
      if(!k)throw new Error("Missing camera key");
      const X=(x:number)=>k.x+x*k.scale,Y=(y:number)=>k.y+y*k.scale;
      expect(X(PORTRAIT_LANDMARKS.nearEye.x)).toBeGreaterThan(10);
      expect(X(PORTRAIT_LANDMARKS.farEye.x)).toBeLessThan(art.width-10);
      expect(Y(PORTRAIT_LANDMARKS.crown.y)).toBeGreaterThan(0);
      expect(Y(PORTRAIT_LANDMARKS.chin.y)).toBeLessThan(art.height-50);
      if(output==="portrait")expect(k.scale).toBeGreaterThan(1.1);
    }
  });
  it("clips gaze into eye apertures and blinks in deterministic exact frames",()=>{
    for(const subject of PORTRAIT_SUBJECTS){
      const opened=render(subject,169),closed=render(subject,186),returned=render(subject,212);
      expect(opened).toContain('data-km-watercolour-part="near-open-eye"');
      expect(closed).not.toContain('data-km-watercolour-part="near-open-eye"');
      expect(closed).toContain('data-km-watercolour-part="near-closed-eye"');
      expect(returned).toContain('data-km-watercolour-part="near-open-eye"');
      expect(returned).not.toContain('data-km-watercolour-part="near-closed-eye"');
      expect(returned).toMatch(/<clipPath id="[^"]+-clip-near-eye-inset"/);
      expect(returned).toMatch(/<clipPath id="[^"]+-clip-far-eye-inset"/);
      expect(returned).toContain("<radialGradient");
      expect(returned).toContain('data-km-watercolour-edge-softness="0.97"');
      expect(render(subject,255)).toEqual(render(subject,255));
      expect(render(subject,255)).not.toEqual(render(subject,290));
      const root=watercolorPortraitSpec("portrait",83,subject).parts[0];
      expect(watercolourArtPoseAt(root,255)).toEqual(watercolourArtPoseAt(root,255));
    }
  });
  it("validates editable authoring and rejects malformed values",()=>{
    const art=watercolorPortraitSpec("portrait");
    expect(()=>watercolorPortraitSpec("portrait",83,"invalid" as "sitter-a")).toThrow(RangeError);
    const part={kind:"path" as const,id:"proof",path:"M0 0 Q15 0 25 20 Z",
      technique:"wash" as const,fill:"#C99B87",
      wash:{highlight:"#F2D5BC",shadow:"#956A61",
        gradient:"radial" as const,edgeSoftness:.7}};
    expect(inspectWatercolourArtwork({...art,parts:[part]})).toEqual([]);
    expect(inspectWatercolourArtwork({...art,parts:[{
      ...part,wash:{...part.wash,edgeSoftness:2},
    }]})).toContain("/parts/0/wash/edgeSoftness");
    const unsafe={...part,composite:"screen"} as unknown as WatercolourArtPart;
    expect(inspectWatercolourArtwork({...art,parts:[unsafe]}))
      .toContain("/parts/0/composite");
  });
  it("compiles and renders both sitters through the actual 12-second film slot",async()=>{
    expect(fixture).toEqual(WATERCOLOUR_PORTRAIT_FILM);
    for(const outputId of ["portrait","landscape"] as const){
      const compiled=compileFilm(fixture,{outputId});
      expect(compiled.ok).toBe(true);
      if(!compiled.ok)continue;
      expect(compiled.film.durationFrames).toBe(360);
      const slot=await loadFilmSlots(compiled.film);
      const ctx={frame:256,fps:{num:30,den:1},durationFrames:360,
        width:compiled.film.width,height:compiled.film.height,reducedMotion:false};
      for(const sitter of PORTRAIT_SUBJECTS){
        const markup=renderToStaticMarkup(<>{slot(
          {slot:"watercolour-illustration",label:"Portrait",
            props:{subject:"person-portrait",seed:83,sitter}},ctx)}</>);
        expect(markup).toContain('data-km-watercolour-part="rebuilt-human-'+sitter+'"');
        expect(markup).not.toContain('data-km-watercolour-part="great-blue-heron"');
      }
      expect(()=>slot({slot:"watercolour-illustration",label:"Invalid",
        props:{subject:"person-portrait",sitter:"unknown"}},ctx)).toThrow(RangeError);
      expect(()=>slot({slot:"watercolour-illustration",label:"Unsafe",
        props:{subject:"file://unsafe"}},ctx)).toThrow(RangeError);
    }
  });
});
