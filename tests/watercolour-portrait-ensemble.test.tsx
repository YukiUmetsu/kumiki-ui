import {describe,it,expect} from "vitest";
import {renderToStaticMarkup} from "react-dom/server";
import {WatercolourIllustration,inspectWatercolourArtwork}
  from "../registry/video/watercolour-illustration";
import type {WatercolourArtPart} from "../registry/video/watercolour-illustration";
import {inspectWetPaper} from "../registry/video/watercolour-wet-paper";
import {
  watercolorPortraitSpec,SITTER_LANDMARKS,
} from "../src/video/watercolour-portrait-demo";
import {
  watercolorPortraitEnsembleSpec,inspectPortraitCast,DEFAULT_PORTRAIT_CAST,
} from "../src/video/watercolour-portrait-ensemble";
import {WATERCOLOUR_PORTRAIT_ENSEMBLE_FILM}
  from "../src/video/watercolour-portrait-ensemble-film";
import {compileFilm} from "../registry/video/film-document";
import {loadFilmSlots} from "../src/film/film-slots";
import film from "../examples/film/watercolour-portrait-ensemble.film.json";

const all=(p:WatercolourArtPart):WatercolourArtPart[] =>
  p.kind==="group" ? [p,...p.children.flatMap(all)] : [p];
const asSvg=(output:"landscape"|"portrait",frame:number)=>
  renderToStaticMarkup(<WatercolourIllustration
    spec={watercolorPortraitEnsembleSpec(output)} frame={frame}/>);

describe("WC14 watercolor identity and multi-character film",()=>{
  it("rebuilds actual distinct sitter geometry, not recolored copies",()=>{
    const adult=watercolorPortraitSpec("portrait",83,"sitter-a");
    const mature=watercolorPortraitSpec("portrait",83,"sitter-b");
    expect(SITTER_LANDMARKS["sitter-a"].nearEye.x)
      .not.toBe(SITTER_LANDMARKS["sitter-b"].nearEye.x);
    expect(SITTER_LANDMARKS["sitter-a"].farEye.y)
      .not.toBe(SITTER_LANDMARKS["sitter-b"].farEye.y);
    const a=adult.parts.flatMap(all),b=mature.parts.flatMap(all);
    for(const id of ["face-foundation","nose-dorsum-reserve","nose-tip-form",
      "upper-lip-broken-wash","lower-lip-transparent","lower-jaw-turn"]){
      const one=a.find(p=>p.id===id),two=b.find(p=>p.id===id);
      expect(one?.kind).toBe("path");
      expect(two?.kind).toBe("path");
      if(one?.kind==="path"&&two?.kind==="path")
        expect(one.path).not.toEqual(two.path);
    }
    expect(inspectWatercolourArtwork(adult)).toEqual([]);
    expect(inspectWatercolourArtwork(mature)).toEqual([]);
  });
  for(const output of ["portrait","landscape"] as const){
    it("passes full material/source validator with distinct eyes in "+output,()=>{
      const scene=watercolorPortraitEnsembleSpec(output);
      expect(scene.width).toBe(output==="landscape"?960:540);
      expect(scene.height).toBe(output==="landscape"?540:960);
      expect(inspectWatercolourArtwork(scene)).toEqual([]);
      expect(inspectWetPaper(scene.wetPaper!)).toEqual([]);
      const entries=scene.parts.flatMap(all),ids=entries.map(p=>p.id);
      expect(new Set(ids).size).toBe(ids.length);
      for(const id of ["a-face-foundation","b-face-foundation",
        "a-near-eye-inset","b-near-eye-inset",
        "a-hair-foundation","b-hair-foundation","a-opaque-neck",
        "b-opaque-neck","b-salt-pepper-beard-with-volume"])
        expect(ids).toContain(id);
      const svg=asSvg(output,256);
      expect(svg).not.toContain("NaN");
      expect(svg).not.toContain("Infinity");
      expect(svg).toContain('data-km-watercolour-part="a-face-foundation"');
      expect(svg).toContain('data-km-watercolour-part="b-face-foundation"');
      expect(svg).toContain('data-km-watercolour-composite="normal"');
      expect(svg).toContain('data-km-watercolour-optical-glaze="a-face-foundation"');
      expect(svg).toContain('result="soft-paper-grain"');
      expect(svg).toContain('result="soft-grain-tint"');
      expect(svg).toContain('in="soft-pigment" in2="soft-grain-tint"');
      // Lost-edge washes must have paper-locked tooth instead of becoming
      // uniformly smooth gradients; no change to the original alpha.

      expect(svg).toMatch(/<clipPath id="[^"]+-clip-a-near-eye-inset"/);
      expect(svg).toMatch(/<clipPath id="[^"]+-clip-b-near-eye-inset"/);
    });
  }
  it("can disable softened-wash granulation without changing character opacity",()=>{
    const spec=watercolorPortraitEnsembleSpec("landscape");
    const smooth={...spec,paper:{...spec.paper,granulation:0}};
    expect(inspectWatercolourArtwork(smooth)).toEqual([]);
    const html=renderToStaticMarkup(<WatercolourIllustration spec={smooth} frame={255}/>);
    expect(html).not.toContain('result="soft-grain-tint"');
    for(const id of ["a-face-foundation","b-face-foundation"]){
      expect(html).toContain('data-km-watercolour-part="'+id+'"');
    }
    expect(html).toContain('data-km-watercolour-composite="normal"');
  });
  it("does not synchronize eyelid closures when a second actor is offset",()=>{
    const at=(frame:number)=>asSvg("landscape",frame);
    const firstBlink=at(185);
    expect(firstBlink).toContain('data-km-watercolour-part="a-near-closed-eye"');
    expect(firstBlink).not.toContain('data-km-watercolour-part="b-near-closed-eye"');
    expect(firstBlink).toContain('data-km-watercolour-part="b-near-open-eye"');
    const secondBlink=at(231);
    expect(secondBlink).not.toContain('data-km-watercolour-part="a-near-closed-eye"');
    expect(secondBlink).toContain('data-km-watercolour-part="b-near-closed-eye"');
    expect(at(255)).toBe(at(255));
    expect(at(255)).not.toBe(at(299));
  });
  it("validates user-authored 1–3-person ensembles and prevents cross-actor ID collisions",()=>{
    const one=[{...DEFAULT_PORTRAIT_CAST.landscape[0]}];
    const two=DEFAULT_PORTRAIT_CAST.landscape.map(c=>({...c}));
    const three=[...two,{...one[0],id:"third",x:250,delayFrames:85}];
    for(const cast of [one,two,three]){
      expect(inspectPortraitCast(cast)).toEqual([]);
      expect(inspectWatercolourArtwork(watercolorPortraitEnsembleSpec("landscape",72,cast)))
        .toEqual([]);
    }
    expect(inspectPortraitCast(null)).toContain("/cast");
    expect(inspectPortraitCast([])).toContain("/cast");
    expect(inspectPortraitCast([...two,{...one[0],id:"a"},
      {...one[0],id:"b"}])).toContain("/cast");
    expect(inspectPortraitCast([{...one[0],id:"left"} ,{...one[0]}]))
      .toContain("/cast/1/id");
    expect(inspectPortraitCast([{...one[0],scale:0}])).toContain("/cast/0/scale");
    expect(inspectPortraitCast([{...one[0],x:Infinity}])).toContain("/cast/0/x");
    expect(inspectPortraitCast([{...one[0],sitter:"unsafe"}])).toContain("/cast/0/sitter");
    expect(inspectPortraitCast([{...one[0],unexpected:"bad"}])).toContain("/cast/0/extra");
    expect(()=>watercolorPortraitEnsembleSpec("landscape",83,
      [{...one[0],delayFrames:-4}])).toThrow(RangeError);
    expect(()=>watercolorPortraitEnsembleSpec("landscape",-3)).toThrow(RangeError);
  });
  it("exports same validated dual-ratio artwork through production film slot",async()=>{
    expect(film).toEqual(WATERCOLOUR_PORTRAIT_ENSEMBLE_FILM);
    for(const outputId of ["landscape","portrait"] as const){
      const compiled=compileFilm(film,{outputId});
      expect(compiled.ok).toBe(true);
      if(!compiled.ok)continue;
      expect(compiled.film.durationFrames).toBe(360);
      const slot=await loadFilmSlots(compiled.film);
      const ctx={frame:256,fps:{num:30,den:1},durationFrames:360,
        width:compiled.film.width,height:compiled.film.height,reducedMotion:false};
      const svg=renderToStaticMarkup(<>{slot({
        slot:"watercolour-portrait-ensemble",label:"Two sitters",props:{seed:83},
      },ctx)}</>);
      expect(svg).toContain('data-km-watercolour-part="a-face-foundation"');
      expect(svg).toContain('data-km-watercolour-part="b-face-foundation"');
      expect(()=>slot({
        slot:"watercolour-portrait-ensemble",label:"Invalid cast",
        props:{cast:[{id:"bad",sitter:"file:///unsafe",x:0,y:0,scale:1,delayFrames:0}]},
      },ctx)).toThrow(RangeError);
    }
  });
});
