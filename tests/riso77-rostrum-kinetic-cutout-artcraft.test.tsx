import {describe,expect,it} from "vitest";
import {renderToStaticMarkup} from "react-dom/server";
import {assertRisoCutoutContour,evaluateRisoRostrumCutout}
  from "../registry/video/riso-rostrum-paper";
import {RisoRostrumStage} from "../registry/video/riso-rostrum-react";
import {RisoRostrumCollageStudio,riso77OriginalCutoutLayers}
  from "../src/video/riso77-rostrum-studio";
import {risoExampleSpec,risoExampleArtworks}
  from "../src/video/riso-print-demo";
import {RISO77_ROSTRUM_FILM} from "../src/video/riso77-rostrum-film";
import {compileFilm} from "../registry/video/film-document";

const clip={id:"test-cutout",pivot:[200,150] as const,
  entryOffset:[-425,-130] as const,entryAngleDegrees:-26,
  depthMm:4.8};
describe("RISO77 source-faithful rostrum print cutouts and handmade paper layer motion",()=>{
  it("on-twos 24fps printed paper stop motion is exact and frame-independent of ink",()=>{
    const options={exposureFrames:2 as const,light:[1,1.2] as const,
      camera:[0,0] as const};
    const a=evaluateRisoRostrumCutout(clip,61,0,143,0,options);
    const hold=evaluateRisoRostrumCutout(clip,60,0,143,0,options);
    const change=evaluateRisoRostrumCutout(clip,62,0,143,0,options);
    expect(a).toEqual(hold);
    expect(change).not.toEqual(a);
    expect(a.frameSample).toBe(60);
    expect(a.fixedPaperRegistration).toBe(true);
    expect(a.liftMm).toBeGreaterThan(clip.depthMm);
    const final=evaluateRisoRostrumCutout(clip,143,0,143,0,options);
    expect(final.frameSample).toBe(143);
    expect(final.progress).toBe(1);
    expect(final.translation).toEqual([0,0]);
    expect(final.angleDegrees).toBe(0);
    expect(final.liftMm).toBe(4.8);
    expect(final.shadowOpacity).toBeGreaterThan(.055);
  });
  it("independent depth-sort, original rotation and source-native lamp, parallax and paper lift",()=>{
    const initial=evaluateRisoRostrumCutout(clip,0,0,143,0);
    expect(initial.translation).toEqual([-425,-130]);
    expect(initial.angleDegrees).toBe(-26);
    const contact=evaluateRisoRostrumCutout(clip,80,0,143,0);
    const alteredLamp=evaluateRisoRostrumCutout(clip,80,0,143,0,{
      light:[-1.5,2],
    });
    expect(contact.translation).toEqual(alteredLamp.translation);
    expect(contact.shadowOffset).not.toEqual(alteredLamp.shadowOffset);
    const tracked=evaluateRisoRostrumCutout(clip,80,0,143,0,{
      camera:[90,-50],
    });
    expect(tracked.translation).not.toEqual(contact.translation);
    expect(tracked.angleDegrees).toBe(contact.angleDegrees);
    expect(tracked.progress).toBe(contact.progress);
    expect(tracked.shadowOffset).toEqual(contact.shadowOffset);
    const reduced=evaluateRisoRostrumCutout(clip,0,0,143,0,{
      reducedMotion:true,
    });
    expect(reduced.progress).toBe(1);
    expect(reduced.translation).toEqual([0,0]);
  });
  it("on-ones, twos, threes and fours have different intentional held poses",()=>{
    for(const steps of [1,2,3,4] as const){
      const a=evaluateRisoRostrumCutout(clip,64,0,143,0,{
        exposureFrames:steps,
      });
      expect(a.frameSample).toBe(Math.floor(64/steps)*steps);
      expect(a.progress).toBeGreaterThan(0);
      expect(a.progress).toBeLessThan(1);
    }
    const early=evaluateRisoRostrumCutout(clip,36,0,143,0);
    const second=evaluateRisoRostrumCutout(clip,36,0,143,1);
    const third=evaluateRisoRostrumCutout(clip,36,0,143,2);
    expect(early.progress).toBeGreaterThan(second.progress);
    expect(second.progress).toBeGreaterThan(third.progress);
  });
  it("invalid physical geometry, lighting, source SVG path and frame bounds fail closed",()=>{
    expect(()=>evaluateRisoRostrumCutout({...clip,id:"/bad"},1,0,143,0))
      .toThrow(/unique slug/);
    expect(()=>evaluateRisoRostrumCutout({...clip,depthMm:-1},1,0,143,0))
      .toThrow(/paper depth/);
    expect(()=>evaluateRisoRostrumCutout({...clip,entryAngleDegrees:360},1,0,143,0))
      .toThrow(/angle/);
    expect(()=>evaluateRisoRostrumCutout(clip,-1,0,143,0)).toThrow(/absolute/);
    expect(()=>evaluateRisoRostrumCutout(clip,20,0,0,0)).toThrow(/duration/);
    expect(()=>evaluateRisoRostrumCutout(clip,20,0,143,12)).toThrow(/paper planes/);
    expect(()=>evaluateRisoRostrumCutout(clip,20,0,143,0,{light:[99,0]}))
      .toThrow(/bounded/);
    expect(()=>assertRisoCutoutContour("M0 0 L1 1 Z")).toThrow(/closed SVG/);
    expect(()=>assertRisoCutoutContour("M0 0 L20 0 L20 20 L0 20"))
      .toThrow(/closed SVG/);
    expect(()=>assertRisoCutoutContour("M0 0 H80 V50 H0 Z"));
  });
  it("the three semantically cut originals maintain exact individually printed spot masters, original paper texture and registered two-ink layers",()=>{
    for(const aspect of ["landscape","portrait"] as const){
      const sheet={
        spec:risoExampleSpec(aspect,23),
        artworks:risoExampleArtworks(aspect),
      };
      const cutouts=riso77OriginalCutoutLayers(aspect);
      expect(cutouts).toHaveLength(3);
      for(const entry of cutouts){
        assertRisoCutoutContour(entry.contour);
        expect(entry.sheet.spec.plates).toHaveLength(2);
        expect(entry.sheet.spec.width).toBe(sheet.spec.width);
        expect(entry.sheet.spec.height).toBe(sheet.spec.height);
      }
      const html=renderToStaticMarkup(<RisoRostrumStage
        base={sheet} cutouts={cutouts} frame={80} startFrame={0}
        durationFrames={143} exposureFrames={2}
        drumContact={{dryness:.3,feed:"top-to-bottom"}}/>);
      expect(html).toContain('data-km-riso77-rostrum=""');
      expect(html).toContain('data-km-riso77-paper-planes="3"');
      expect(html.match(/data-km-riso77-plane=/g)).toHaveLength(3);
      expect(html.match(/data-km-riso77-original-paper-outline=/g)).toHaveLength(3);
      expect(html.match(/data-km-riso77-paper-edge=/g)).toHaveLength(3);
      expect(html.match(/data-km-riso77-cast-shadow=/g)).toHaveLength(3);
      expect(html.match(/data-km-riso-print=/g)).toHaveLength(4);
      expect(html.match(/data-km-riso75-fibre-master="blue"/g)).toHaveLength(4);
      expect(html.match(/data-km-riso75-fibre-master="red"/g)).toHaveLength(4);
      expect(html).toContain("FOLLOW");
      expect(html).toContain("THE");
      expect(html).not.toMatch(/feGaussianBlur|<foreignObject|<canvas/);
      // Both cuts of the same second print share its one, fixed ink master.
      expect(cutouts[0].sheet).toBe(cutouts[1].sheet);
      expect(cutouts[1].sheet).toBe(cutouts[2].sheet);
    }
  });
  it("paper planes are physically back-to-front sorted, and no image motion data touches original source artwork",()=>{
    const base={spec:risoExampleSpec("landscape",23),
      artworks:risoExampleArtworks("landscape")};
    const layers=[...riso77OriginalCutoutLayers("landscape")].reverse();
    const html=renderToStaticMarkup(<RisoRostrumStage
      base={base} cutouts={layers} frame={143}
      startFrame={0} durationFrames={143}/>);
    const first=html.indexOf('data-km-riso77-plane="typographic-arch"');
    const second=html.indexOf('data-km-riso77-plane="river-ring-window"');
    const third=html.indexOf('data-km-riso77-plane="letterpress-footer"');
    expect(first).toBeGreaterThan(-1);
    expect(first).toBeLessThan(second);
    expect(second).toBeLessThan(third);
    expect(html).toContain('data-km-riso77-unchanged-base=""');
    expect(html).toContain('data-km-riso77-layer-progress="1"');
  });
  it("existing FilmStage compiles the 24fps three-act source with correct 16:9 and 9:16 original film outputs",()=>{
    for(const aspect of ["landscape","portrait"] as const){
      const r=compileFilm(RISO77_ROSTRUM_FILM,{outputId:aspect});
      expect(r.ok).toBe(true);
      if(!r.ok)continue;
      expect(r.film.durationFrames).toBe(252);
      expect(r.film.scenes).toHaveLength(3);
      expect(r.film.fps.num).toBe(24);
    }
    const html=renderToStaticMarkup(<RisoRostrumCollageStudio/>);
    expect(html).toContain('data-km-riso77-studio=""');
    expect(html).toContain('data-km-riso77-scene="mounting"');
    expect(html).toContain('data-km-riso77-exposure="2"');
    expect(html).toContain('data-km-riso77-paper-planes="3"');
    expect(html).not.toContain("unknown original paper slot");
  });
});
